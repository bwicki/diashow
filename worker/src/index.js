/* Diashow — Cloudflare Worker «diashow-api»: geteilte Diashows (R2 + D1).
 *
 * Verwaltung (App diashow.wicki.aero, Kopfzeile «Authorization: Bearer <Upload-Schlüssel>»):
 *   GET    /api/shares                      Liste mit Aufrufzahlen
 *   POST   /api/shares        {title,password}       → {id}
 *   POST   /api/shares/:id/begin {title?}   neuer Upload unter demselben Link
 *   PUT    /api/shares/:id/f/:name          Datei (≤ 90 MB je Aufruf)
 *   POST   /api/shares/:id/mpu/:name        mehrteiliger Upload: ?action=create|part&n=&uid=|complete&uid=
 *   POST   /api/shares/:id/publish {manifest}      Freigabe, räumt alte Dateien weg
 *   PATCH  /api/shares/:id    {title?,password?}
 *   DELETE /api/shares/:id
 *   GET    /api/shares/:id/stats            Aufrufe je Tag
 * Öffentlich (Betrachter share.html):
 *   GET    /api/s/:id                       {title} oder 404
 *   POST   /api/s/:id/open {password, again?}  → {token, manifest, view}
 *   GET    /api/s/:id/f/:name?t=<token>     Datei (Range für Videos)
 *   POST   /api/s/:id/done?t=<token>        Ansicht bis zum Ende
 *
 * Der Upload-Schlüssel steht nur als SHA-256 in D1 (config.admin_hash), das
 * Signier-Geheimnis der Betrachter-Tokens in config.tok_secret. Keine Worker-Secrets nötig.
 */

const TOKEN_HOURS = 12;
const MAX_FAILS = 10, FAIL_WINDOW = 15 * 60 * 1000;
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), (c) => c.charCodeAt(0));
const ALPH = 'abcdefghijkmnpqrstuvwxyz23456789';
const newId = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPH[b % ALPH.length]).join('');
const idOk = (s) => /^[a-z0-9]{6,20}$/.test(s || '');
const nameOk = (s) => /^[A-Za-z0-9._-]{1,80}$/.test(s || '') && !s.startsWith('.');
const now = () => Date.now();

function cors(req, env) {
  const o = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(o) ? o : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization,Content-Type,Range',
    'Access-Control-Expose-Headers': 'Content-Range,Content-Length,Accept-Ranges',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
const err = (msg, status = 400) => json({ error: msg }, status);

async function sha256hex(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64u(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64u(salt), iterations: 100000 }, key, 256));
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
function same(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

const cfgCache = {};
async function cfg(env, k) {
  if (cfgCache[k]) return cfgCache[k];
  const row = await env.DB.prepare('SELECT v FROM config WHERE k=?').bind(k).first();
  if (!row) throw new Error('config.' + k + ' fehlt');
  return (cfgCache[k] = row.v);
}
async function isAdmin(req, env) {
  const m = /^Bearer\s+(.+)$/.exec(req.headers.get('Authorization') || '');
  if (!m) return false;
  return same(await sha256hex(m[1].trim()), await cfg(env, 'admin_hash'));
}
async function makeToken(env, id, view) {
  const body = b64u(enc.encode(JSON.stringify({ id, view, exp: now() + TOKEN_HOURS * 3600e3 })));
  return body + '.' + (await hmac(await cfg(env, 'tok_secret'), body));
}
async function readToken(env, t, id) {
  const [body, sig] = String(t || '').split('.');
  if (!body || !sig || !same(sig, await hmac(await cfg(env, 'tok_secret'), body))) return null;
  try { const p = JSON.parse(new TextDecoder().decode(unb64u(body))); return p.id === id && p.exp > now() ? p : null; } catch { return null; }
}

async function getShare(env, id) { return env.DB.prepare('SELECT * FROM shares WHERE id=?').bind(id).first(); }
async function listKeys(env, prefix) {
  const out = []; let cursor;
  do { const r = await env.FILES.list({ prefix, cursor }); out.push(...r.objects); cursor = r.truncated ? r.cursor : null; } while (cursor);
  return out;
}
async function setPassword(password) {
  const salt = b64u(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await pbkdf2(password, salt) };
}

// ------------------------------------------------------------ Verwaltung
async function admin(req, env, parts, url) {
  if (!(await isAdmin(req, env))) return err('Upload-Schlüssel ungültig', 401);
  const [, , id, sub, name] = parts; // api, shares, id, sub, name
  const m = req.method;
  if (!id) {
    if (m === 'GET') {
      const { results } = await env.DB.prepare('SELECT id,title,status,n_slides,bytes,created,updated,views,last_view,(SELECT COUNT(*) FROM views v WHERE v.share_id=shares.id AND v.completed=1) AS completed FROM shares ORDER BY updated DESC').all();
      return json({ shares: results });
    }
    if (m === 'POST') {
      const b = await req.json().catch(() => ({}));
      const title = String(b.title || '').trim().slice(0, 120), pw = String(b.password || '');
      if (!title) return err('Titel fehlt');
      if (pw.length < 4) return err('Passwort zu kurz (mindestens 4 Zeichen)');
      const id = newId(), p = await setPassword(pw), t = now();
      await env.DB.prepare('INSERT INTO shares (id,title,pw_hash,pw_salt,status,created,updated) VALUES (?,?,?,?,?,?,?)').bind(id, title, p.hash, p.salt, 'uploading', t, t).run();
      return json({ id });
    }
    return err('Methode', 405);
  }
  if (!idOk(id)) return err('ID', 400);
  const s = await getShare(env, id);
  if (!s) return err('Nicht gefunden', 404);
  const key = (n) => `s/${id}/${n}`;

  if (!sub) {
    if (m === 'PATCH') {
      const b = await req.json().catch(() => ({}));
      if (b.title != null) await env.DB.prepare('UPDATE shares SET title=?, updated=? WHERE id=?').bind(String(b.title).trim().slice(0, 120) || s.title, now(), id).run();
      if (b.password != null) {
        if (String(b.password).length < 4) return err('Passwort zu kurz (mindestens 4 Zeichen)');
        const p = await setPassword(String(b.password));
        await env.DB.prepare('UPDATE shares SET pw_hash=?, pw_salt=?, updated=? WHERE id=?').bind(p.hash, p.salt, now(), id).run();
      }
      return json({ ok: true });
    }
    if (m === 'DELETE') {
      const objs = await listKeys(env, `s/${id}/`);
      for (let i = 0; i < objs.length; i += 500) await env.FILES.delete(objs.slice(i, i + 500).map((o) => o.key));
      await env.DB.batch([
        env.DB.prepare('DELETE FROM shares WHERE id=?').bind(id),
        env.DB.prepare('DELETE FROM views WHERE share_id=?').bind(id),
        env.DB.prepare('DELETE FROM fails WHERE share_id=?').bind(id),
      ]);
      return json({ ok: true, deleted: objs.length });
    }
    return err('Methode', 405);
  }
  if (sub === 'begin' && m === 'POST') {
    const b = await req.json().catch(() => ({}));
    const title = b.title ? String(b.title).trim().slice(0, 120) : s.title;
    await env.DB.prepare('UPDATE shares SET title=?, updated=? WHERE id=?').bind(title, now(), id).run();
    const objs = await listKeys(env, `s/${id}/`);
    return json({ ok: true, manifest: s.manifest ? JSON.parse(s.manifest) : null, have: objs.map((o) => ({ name: o.key.slice(`s/${id}/`.length), size: o.size })) });
  }
  if (sub === 'f' && m === 'PUT') {
    if (!nameOk(name)) return err('Dateiname');
    const ct = req.headers.get('Content-Type') || 'application/octet-stream';
    await env.FILES.put(key(name), req.body, { httpMetadata: { contentType: ct }, customMetadata: { sum: url.searchParams.get('sum') || '' } });
    return json({ ok: true });
  }
  if (sub === 'mpu' && m === 'POST') {
    if (!nameOk(name)) return err('Dateiname');
    const a = url.searchParams.get('action');
    if (a === 'create') {
      const up = await env.FILES.createMultipartUpload(key(name), { httpMetadata: { contentType: url.searchParams.get('ct') || 'application/octet-stream' }, customMetadata: { sum: url.searchParams.get('sum') || '' } });
      return json({ uid: up.uploadId });
    }
    const up = env.FILES.resumeMultipartUpload(key(name), url.searchParams.get('uid'));
    if (a === 'part') {
      const n = +url.searchParams.get('n');
      const p = await up.uploadPart(n, req.body);
      return json({ part: { partNumber: p.partNumber, etag: p.etag } });
    }
    if (a === 'complete') {
      const b = await req.json();
      await up.complete(b.parts);
      return json({ ok: true });
    }
    if (a === 'abort') { await up.abort(); return json({ ok: true }); }
    return err('action');
  }
  if (sub === 'publish' && m === 'POST') {
    const b = await req.json().catch(() => null);
    const man = b && b.manifest;
    if (!man || !Array.isArray(man.slides)) return err('Manifest fehlt');
    // Alle Dateien, auf die das Manifest verweist (Dias, Logos, Titel-Hintergründe); alles andere wird entfernt
    const refs = (x) => [x.file, x.poster, x.wm && x.wm.path, x.ts && x.ts.logoPath, x.ts && x.ts.bgPath];
    const need = new Set(man.slides.flatMap(refs).filter((n) => typeof n === 'string' && nameOk(n)));
    const objs = await listKeys(env, `s/${id}/`);
    const names = new Map(objs.map((o) => [o.key.slice(`s/${id}/`.length), o.size]));
    const missing = [...need].filter((n) => !names.has(n));
    if (missing.length) return err('Dateien fehlen: ' + missing.slice(0, 5).join(', '), 409);
    const stale = objs.filter((o) => !need.has(o.key.slice(`s/${id}/`.length))).map((o) => o.key);
    for (let i = 0; i < stale.length; i += 500) await env.FILES.delete(stale.slice(i, i + 500));
    let bytes = 0; for (const n of need) bytes += names.get(n) || 0;
    await env.DB.prepare('UPDATE shares SET manifest=?, status=?, n_slides=?, bytes=?, updated=? WHERE id=?')
      .bind(JSON.stringify(man), 'ready', man.slides.length, bytes, now(), id).run();
    return json({ ok: true, bytes, removed: stale.length });
  }
  if (sub === 'stats' && m === 'GET') {
    const { results } = await env.DB.prepare("SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') AS day, COUNT(*) AS views, SUM(completed) AS completed FROM views WHERE share_id=? GROUP BY day ORDER BY day DESC LIMIT 120").bind(id).all();
    return json({ id, title: s.title, views: s.views, last_view: s.last_view, days: results });
  }
  return err('Unbekannt', 404);
}

// ------------------------------------------------------------ Betrachter
async function viewer(req, env, parts, url) {
  const [, , id, sub, name] = parts;
  if (!idOk(id)) return err('Nicht gefunden', 404);
  const s = await getShare(env, id);
  if (!s || s.status !== 'ready') return err('Nicht gefunden', 404);

  if (!sub && req.method === 'GET') return json({ title: s.title });
  if (sub === 'open' && req.method === 'POST') {
    const t = now();
    const f = await env.DB.prepare('SELECT COUNT(*) AS n FROM fails WHERE share_id=? AND ts>?').bind(id, t - FAIL_WINDOW).first();
    if (f.n >= MAX_FAILS) return err('Zu viele Fehlversuche – bitte in 15 Minuten erneut versuchen.', 429);
    const b = await req.json().catch(() => ({}));
    const ok = same(await pbkdf2(String(b.password || ''), s.pw_salt), s.pw_hash);
    if (!ok) {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO fails (share_id, ts) VALUES (?,?)').bind(id, t),
        env.DB.prepare('DELETE FROM fails WHERE ts<?').bind(t - FAIL_WINDOW),
      ]);
      return err('Passwort falsch', 403);
    }
    // Eine Ansicht = eine erfolgreiche Öffnung. Neu laden in derselben Sitzung (again) zählt nicht.
    let view = null;
    const prev = b.again ? await readToken(env, b.again, id) : null;
    if (prev) view = prev.view;
    else {
      const r = await env.DB.prepare('INSERT INTO views (share_id, ts) VALUES (?,?)').bind(id, t).run();
      view = r.meta.last_row_id;
      await env.DB.prepare('UPDATE shares SET views=views+1, last_view=? WHERE id=?').bind(t, id).run();
    }
    return json({ token: await makeToken(env, id, view), title: s.title, manifest: JSON.parse(s.manifest) });
  }
  const tok = await readToken(env, url.searchParams.get('t'), id);
  if (!tok) return err('Sitzung abgelaufen', 401);
  if (sub === 'done' && req.method === 'POST') {
    await env.DB.prepare('UPDATE views SET completed=1 WHERE rowid=? AND share_id=?').bind(tok.view, id).run();
    return json({ ok: true });
  }
  if (sub === 'f' && (req.method === 'GET' || req.method === 'HEAD') && nameOk(name)) {
    const k = `s/${id}/${name}`;
    const rh = req.headers.get('Range');
    let range;
    if (rh) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(rh);
      if (m) {
        if (m[1] === '' && m[2] !== '') range = { suffix: +m[2] };
        else if (m[1] !== '') range = m[2] !== '' ? { offset: +m[1], length: +m[2] - +m[1] + 1 } : { offset: +m[1] };
      }
    }
    const obj = req.method === 'HEAD' ? await env.FILES.head(k) : await env.FILES.get(k, range ? { range } : undefined);
    if (!obj) return err('Nicht gefunden', 404);
    const h = new Headers({
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=43200',
      'Content-Disposition': 'inline',
      'Accept-Ranges': 'bytes',
      'X-Robots-Tag': 'noindex',
      ETag: obj.httpEtag,
    });
    if (range && obj.range) {
      const off = obj.range.offset ?? (obj.size - obj.range.length);
      const len = obj.range.length ?? (obj.size - off);
      h.set('Content-Range', `bytes ${off}-${off + len - 1}/${obj.size}`);
      h.set('Content-Length', String(len));
      return new Response(obj.body, { status: 206, headers: h });
    }
    h.set('Content-Length', String(obj.size));
    return new Response(req.method === 'HEAD' ? null : obj.body, { status: 200, headers: h });
  }
  return err('Unbekannt', 404);
}

export default {
  async fetch(req, env) {
    const c = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c });
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let res;
    try {
      if (parts[0] !== 'api') res = err('Nicht gefunden', 404);
      else if (parts[1] === 'health') res = json({ ok: true, app: 'diashow-api', version: env.APP_VERSION || '' });
      else if (parts[1] === 'shares') res = await admin(req, env, parts, url);
      else if (parts[1] === 's') res = await viewer(req, env, parts, url);
      else res = err('Nicht gefunden', 404);
    } catch (e) {
      res = err('Serverfehler: ' + (e && e.message || e), 500);
    }
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(c)) h.set(k, v);
    return new Response(res.body, { status: res.status, headers: h });
  },
};
