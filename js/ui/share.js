/* Diashow — Phase 2: Diashow über einen Link teilen.
 *
 * Ablauf «Teilen»: jedes Dia wird hier im Browser aufbereitet (Ausschnitt, längste Seite
 * höchstens 2560 px, Wasserzeichen eingebrannt, als JPEG neu kodiert → keine EXIF-/GPS-Daten)
 * und zum Worker «diashow-api» hochgeladen (R2). Videos gehen unverändert hoch, ihr Logo
 * legt der Betrachter darüber. Titel- und Karten-Folien gehen als Daten mit.
 * Ein Link = eine Diashow = ein eigenes Passwort, ohne Ablaufdatum.
 * Erneutes Teilen unter demselben Link lädt nur geänderte Dias hoch (Name aus Inhalt + Einstellungen).
 */
import { t } from '../i18n.js';
import { h, dialog, msg, load, save, fmtDateTime, limiter } from '../util.js';
import { cur } from '../show.js';
import { imageBlob, fileOf, extOf, kindOf } from '../media.js';
import { assetUrl, tstyle, WM_DEFAULT } from '../render.js';
import { loadTrack } from '../track.js';
import { autoCaption } from '../geo.js';
import { APP } from '../version.js';

const MAXPX = 2560;
const RENDER_V = 'r1';                 // ändern, wenn sich die Aufbereitung ändert → alles neu
const CHUNK = 20 * 1024 * 1024;        // Teilgrösse für grosse Videos (R2: alle Teile gleich gross)
const VIDEO_CT = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };

export const apiBase = () => load('diashow.api', null) || APP.api;
export function shareLink(id) {
  if (location.hostname === 'diashow.wicki.aero') return `https://diashow.wicki.aero/s/${id}`;
  return new URL('share.html#' + id, location.href).href;
}
const mb = (n) => (n / 1048576).toLocaleString('de-CH', { maximumFractionDigits: 1 }) + ' MB';

/* ---------- Server ---------- */
async function askKey(again) {
  const inp = h('input', { type: 'password', autocomplete: 'off', placeholder: 'ds-…' });
  const r = await dialog(t('shKeyTitle'), [again ? h('p.err', t('shKeyBad')) : null, h('p', t('shKeyText')), inp], [{ label: t('cancel'), value: null }, { label: 'OK', value: 'ok', primary: true }]);
  if (r !== 'ok' || !inp.value.trim()) return null;
  save('diashow.upkey', inp.value.trim());
  return inp.value.trim();
}
async function api(path, opt = {}, retry = true) {
  let key = load('diashow.upkey', null) || (await askKey(false));
  if (!key) throw new Error(t('shNoKey'));
  const r = await fetch(apiBase() + path, { ...opt, headers: { Authorization: 'Bearer ' + key, ...(opt.json ? { 'Content-Type': 'application/json' } : {}), ...(opt.headers || {}) }, body: opt.json ? JSON.stringify(opt.json) : opt.body });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) {
    save('diashow.upkey', null);
    if (retry && (await askKey(true))) return api(path, opt, false);
    throw new Error(t('shKeyBad'));
  }
  if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
  return j;
}
/** Liste ohne Rückfrage (für das Menü): null, wenn kein Schlüssel hinterlegt oder offline. */
export async function quickList() {
  const key = load('diashow.upkey', null); if (!key) return null;
  try {
    const r = await fetch(apiBase() + '/api/shares', { headers: { Authorization: 'Bearer ' + key } });
    return r.ok ? (await r.json()).shares : null;
  } catch { return null; }
}

/* ---------- Hilfen ---------- */
async function sha(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16); }
function loadImg(url) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Bild nicht ladbar')); im.src = url; }); }
function hexA(hex, a) { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return `rgba(255,255,255,${a})`; const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
const toJpeg = (cv) => new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('JPEG'))), 'image/jpeg', 0.88));

/** Wasserzeichen wie auf dem Beamer einbrennen: Grösse in % der Höhe eines 16:9-Rahmens um das Bild. */
async function burnWm(ctx, W, H, wm0) {
  const w = { ...WM_DEFAULT, ...wm0 };
  const img = await loadImg(await assetUrl(w.path));
  const F = Math.min(H, W * 9 / 16);
  let lh = (w.size / 100) * F; let lw = (img.naturalWidth / img.naturalHeight) * lh;
  const maxW = 0.45 * F * 16 / 9; if (lw > maxW) { lw = maxW; lh = lw * img.naturalHeight / img.naturalWidth; }
  const px = w.plate ? 0.016 * F : 0, py = w.plate ? 0.012 * F : 0;
  const bw = Math.ceil(lw + 2 * px), bh = Math.ceil(lh + 2 * py), m = 0.04 * F;
  const x = w.pos[1] === 'l' ? m : w.pos[1] === 'r' ? W - m - bw : (W - bw) / 2;
  const y = w.pos[0] === 't' ? m : H - m - bh;
  const tmp = document.createElement('canvas'); tmp.width = bw; tmp.height = bh;
  const c = tmp.getContext('2d');
  if (w.plate) { c.fillStyle = hexA(w.plateColor, w.plateOp); c.beginPath(); c.roundRect(0, 0, bw, bh, 0.012 * F); c.fill(); }
  c.drawImage(img, px, py, lw, lh);
  ctx.save(); ctx.globalAlpha = w.op;
  if (!w.plate) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 0.012 * F; }
  ctx.drawImage(tmp, x, y); ctx.restore();
}
/** Bild-Dia → JPEG (Ausschnitt, ≤ 2560 px, Logo eingebrannt, ohne Metadaten). */
async function renderImage(blob, crop, wm) {
  const bmp = await createImageBitmap(blob);
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const sx = c.x * bmp.width, sy = c.y * bmp.height, sw = c.w * bmp.width, sh = c.h * bmp.height;
  const k = Math.min(1, MAXPX / Math.max(sw, sh));
  const W = Math.max(1, Math.round(sw * k)), H = Math.max(1, Math.round(sh * k));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, W, H);
  bmp.close?.();
  if (wm?.path) await burnWm(ctx, W, H, wm);
  return { blob: await toJpeg(cv), w: W, h: H };
}

/* ---------- Hochladen ---------- */
async function putFile(id, name, blob, ct, onBytes) {
  if (blob.size <= CHUNK) {
    await api(`/api/shares/${id}/f/${name}`, { method: 'PUT', body: blob, headers: { 'Content-Type': ct } });
    onBytes(blob.size); return;
  }
  const { uid } = await api(`/api/shares/${id}/mpu/${name}?action=create&ct=${encodeURIComponent(ct)}`, { method: 'POST' });
  const parts = [];
  try {
    for (let n = 1, off = 0; off < blob.size; n++, off += CHUNK) {
      const piece = blob.slice(off, off + CHUNK);
      const r = await api(`/api/shares/${id}/mpu/${name}?action=part&n=${n}&uid=${encodeURIComponent(uid)}`, { method: 'POST', body: piece });
      parts.push(r.part); onBytes(piece.size);
    }
    await api(`/api/shares/${id}/mpu/${name}?action=complete&uid=${encodeURIComponent(uid)}`, { method: 'POST', json: { parts } });
  } catch (e) {
    api(`/api/shares/${id}/mpu/${name}?action=abort&uid=${encodeURIComponent(uid)}`, { method: 'POST' }).catch(() => {});
    throw e;
  }
}

/** Datei nur einmal hochladen, auch wenn mehrere Dias sie gleichzeitig brauchen (z. B. dasselbe Logo). */
function once(ctx, name, fn) {
  ctx.used.add(name);
  if (ctx.have.has(name)) return Promise.resolve();
  if (!ctx.pending.has(name)) ctx.pending.set(name, fn().then(() => { ctx.uploaded++; ctx.log.push(name); }));
  return ctx.pending.get(name);
}
/** Aus einem Dia den Manifest-Eintrag bauen und – falls nötig – die Datei hochladen. */
async function prepareSlide(s, ctx) {
  const S = cur.show.settings;
  const base = { dur: s.dur || undefined, tr: s.tr || undefined };
  const asset = async (path, photo) => {
    if (!path) return '';
    const url = await assetUrl(path);
    const blob = await (await fetch(url)).blob();
    const key = await sha([RENDER_V, 'a', path, blob.size].join('|'));
    if (photo) {
      const name = `a-${key}.jpg`;
      await once(ctx, name, async () => { const r = await renderImage(blob, null, null); await putFile(ctx.id, name, r.blob, 'image/jpeg', ctx.bytes); });
      return name;
    }
    const ext = /png/.test(blob.type) ? 'png' : /svg/.test(blob.type) ? 'svg' : /webp/.test(blob.type) ? 'webp' : 'jpg';
    const name = `a-${key}.${ext}`;
    await once(ctx, name, () => putFile(ctx.id, name, blob, blob.type || 'image/png', ctx.bytes));
    return name;
  };
  const wmData = async (wm) => (wm?.path ? { ...WM_DEFAULT, ...wm, path: await asset(wm.path, false) } : undefined);

  if (s.type === 'title') {
    const ts = tstyle(s);
    return { t: 'title', ...base, cap: s.cap || '', sub: s.sub || '', ts: { ...ts, bgPath: ts.bg === 'image' ? await asset(ts.bgPath, true) : '', logoPath: await asset(ts.logoPath, false) }, wm: await wmData(s.wm) };
  }
  if (s.type === 'map') {
    const tr = await loadTrack(s.track);
    let pts = tr.pts; if (pts.length > 1500) { const k = Math.ceil(pts.length / 1500); pts = pts.filter((_, i) => i % k === 0 || i === pts.length - 1); }
    return { t: 'map', ...base, cap: s.cap || '', map: s.map, pts: pts.map((p) => [+p.lat.toFixed(5), +p.lon.toFixed(5)]) };
  }
  const kind = s.kind || kindOf(s.path);
  let cap = s.cap || ''; let auto = false;
  if (!cap && (S.autoCap || 'off') !== 'off') { try { cap = await autoCaption(s.path, S.autoCap); auto = !!cap; } catch { /* ohne */ } }
  if (kind === 'video') {
    const f = await fileOf(s.path);
    const ext = extOf(s.path); const ct = VIDEO_CT[ext] || f.type || 'video/mp4';
    const name = `v-${await sha([RENDER_V, s.path, f.size, f.lastModified].join('|'))}.${ext === 'mov' ? 'mov' : ext}`;
    await once(ctx, name, () => putFile(ctx.id, name, f, ct, ctx.bytes));
    return { t: 'video', ...base, file: name, cap, auto: auto || undefined, sound: !!s.sound, crop: s.crop, wm: await wmData(s.wm) };
  }
  // Bild (auch HEIC, RAW, PDF-Seite)
  const f = await fileOf(s.path);
  const key = await sha([RENDER_V, s.path, s.page || 0, f.size, f.lastModified, JSON.stringify(s.crop || null), JSON.stringify(s.wm || null)].join('|'));
  const name = `i-${key}.jpg`;
  let w = ctx.dims.get(name)?.w, hh = ctx.dims.get(name)?.h;
  await once(ctx, name, async () => {
    const r = await renderImage(await imageBlob(s.path, s.page, kind), s.crop, s.wm);
    await putFile(ctx.id, name, r.blob, 'image/jpeg', ctx.bytes);
    ctx.dims.set(name, { w: r.w, h: r.h });
  });
  w = ctx.dims.get(name)?.w; hh = ctx.dims.get(name)?.h;
  return { t: 'img', ...base, file: name, w, h: hh, pdf: kind === 'pdf' || undefined, cap, auto: auto || undefined };
}

/* ---------- Teilen-Dialog ---------- */
export async function shareDialog() {
  const slides = cur.show.slides;
  if (!slides.length) { msg(t('noSlides'), 'warn'); return; }
  let list;
  try { list = (await api('/api/shares')).shares; } catch (e) { msg(t('shFail') + ' ' + e.message, 'err'); return; }
  const links = load('diashow.shareFor', {});            // Diashow-Datei → Link-ID (Vorauswahl)
  const prevId = links[cur.file || cur.show.name] && list.some((x) => x.id === links[cur.file || cur.show.name]) ? links[cur.file || cur.show.name] : '';
  const sel = h('select', [h('option', { value: '' }, t('shNewLink')), ...list.map((x) => h('option', { value: x.id, selected: x.id === prevId }, `${x.title} · ${fmtDateTime(x.updated)}`))]);
  const title = h('input', { type: 'text', value: cur.show.name || '' });
  const pw = h('input', { type: 'text', autocomplete: 'off', placeholder: t('shPwPh') });
  const pwRow = h('div', [h('label.lbl', t('shPw')), pw, h('p.note', t('shPwHint'))]);
  const upd = () => { pwRow.hidden = !!sel.value; if (sel.value) title.value = list.find((x) => x.id === sel.value)?.title || title.value; };
  sel.onchange = upd; upd();
  const vids = slides.filter((s) => s.type === 'file' && (s.kind || kindOf(s.path)) === 'video').length;
  const r = await dialog(t('shTitle'), [
    h('label.lbl', t('shTarget')), sel,
    h('label.lbl', t('shName')), title,
    pwRow,
    h('p.note', { html: t('shWhat', { n: slides.length, v: vids }) }),
  ], [{ label: t('cancel'), value: null }, { label: t('shStart'), value: 'ok', primary: true }], { enter: false });
  if (r !== 'ok') return;
  if (!title.value.trim()) { msg(t('shNoTitle'), 'warn'); return; }
  if (!sel.value && pw.value.trim().length < 4) { msg(t('shPwShort'), 'warn'); return; }
  await runShare(sel.value, title.value.trim(), pw.value.trim());
}

async function runShare(existing, title, password) {
  const bar = h('div.prog', h('i', { style: { width: '0%' } }));
  const st = h('div.note', t('shPreparing'));
  let cancelled = false;
  const back = h('div.backdrop', h('div.dialog', [
    h('div.dialog-head', h('div.section-title', t('shTitle') + ' – ' + title)),
    h('div.dialog-body', [bar, st, h('p.note', t('shKeepOpen'))]),
    h('div.dialog-foot', h('button.btn', { type: 'button', onclick: () => { cancelled = true; st.textContent = t('shCancelling'); } }, t('cancel'))),
  ]));
  document.body.append(back);
  const t0 = Date.now();
  try {
    let id = existing; let have = []; let prevMan = null;
    if (id) ({ have, manifest: prevMan } = await api(`/api/shares/${id}/begin`, { method: 'POST', json: { title } }));
    else id = (await api('/api/shares', { method: 'POST', json: { title, password } })).id;
    const links = load('diashow.shareFor', {}); links[cur.file || cur.show.name] = id; save('diashow.shareFor', links);
    const ctx = { id, have: new Set(have.map((x) => x.name)), used: new Set(), uploaded: 0, sent: 0, dims: new Map((prevMan?.slides || []).filter((x) => x.file).map((x) => [x.file, { w: x.w, h: x.h }])) };
    ctx.bytes = (n) => { ctx.sent += n; };
    ctx.log = []; ctx.pending = new Map();
    const slides = cur.show.slides; const out = new Array(slides.length); let done = 0; const errs = [];
    const lim = limiter(3);
    await Promise.all(slides.map((s, i) => lim(async () => {
      if (cancelled) return;
      try { out[i] = await prepareSlide(s, ctx); }
      catch (e) { errs.push(`${t('slide')} ${i + 1}: ${s.path || s.track || s.cap || ''} – ${e?.message || e}`); }
      done++;
      bar.firstChild.style.width = Math.round(done / slides.length * 100) + '%';
      st.textContent = t('shProg', { i: done, n: slides.length, u: ctx.uploaded, mb: mb(ctx.sent) });
    })));
    if (cancelled) { back.remove(); msg(t('shCancelled'), 'warn'); return; }
    const S = cur.show.settings;
    const manifest = {
      v: 1, title, app: APP.version, created: new Date().toISOString(),
      settings: { dur: S.dur, trDur: S.trDur, order: S.order, loop: S.loop, kenburns: S.kenburns, captions: S.captions, pool: S.pool, fit: S.fit, portraitBg: S.portraitBg },
      slides: out.filter(Boolean),
    };
    st.textContent = t('shPublishing');
    const pub = await api(`/api/shares/${id}/publish`, { method: 'POST', json: { manifest } });
    back.remove();
    for (const e of errs) msg(e, 'warn');
    msg(t('shDone', { n: manifest.slides.length, u: ctx.uploaded, mb: mb(pub.bytes), s: Math.round((Date.now() - t0) / 1000) }));
    await resultDialog(id, title, existing ? null : password, errs.length);
  } catch (e) {
    back.remove();
    msg(t('shFail') + ' ' + (e?.message || e), 'err');
  }
}

async function copyText(s) { try { await navigator.clipboard.writeText(s); msg(t('shCopied')); } catch { msg(s); } }
async function resultDialog(id, title, password, nErr) {
  const link = shareLink(id);
  const txt = password ? `${title}\n${link}\n${t('shPw')}: ${password}` : `${title}\n${link}`;
  await dialog(t('shReady'), [
    nErr ? h('p.warn', t('shSomeErr', { n: nErr })) : null,
    h('p', t('shReadyText')),
    h('div.sharelink', [h('input', { type: 'text', readOnly: true, value: link, onclick: (e) => e.target.select() }), h('button.btn', { type: 'button', onclick: () => copyText(link) }, t('copy'))]),
    password ? h('p', [t('shPw') + ': ', h('b.mono', password)]) : h('p.note', t('shPwKept')),
    h('div.row-actions', [
      h('button.btn', { type: 'button', onclick: () => copyText(txt) }, t('shCopyAll')),
      h('a.btn', { href: link, target: '_blank', rel: 'noopener' }, t('shOpen')),
    ]),
  ], [{ label: 'OK', primary: true }]);
}

/* ---------- Verwaltung + Statistik ---------- */
export async function manageDialog() {
  let list;
  try { list = (await api('/api/shares')).shares; } catch (e) { msg(t('shFail') + ' ' + e.message, 'err'); return; }
  const body = h('div.sharemgr');
  const render = () => {
    const total = list.reduce((a, x) => a + (x.views || 0), 0);
    body.replaceChildren(
      h('p', t('shTotal', { n: list.length, v: total })),
      list.length ? h('table.sharetab', [
        h('thead', h('tr', [h('th', t('shName')), h('th.num', t('shViews')), h('th.num', t('shCompleted')), h('th', t('shLast')), h('th.num', t('slidesN')), h('th', '')])),
        h('tbody', list.map((x) => h('tr', [
          h('td', [h('b', x.title), h('div.note', `${fmtDateTime(x.updated)} · ${mb(x.bytes || 0)}${x.status !== 'ready' ? ' · ' + t('shIncomplete') : ''}`)]),
          h('td.num', h('b', String(x.views || 0))),
          h('td.num', String(x.completed || 0)),
          h('td', x.last_view ? fmtDateTime(x.last_view) : '–'),
          h('td.num', String(x.n_slides || 0)),
          h('td.acts', [
            h('button.btn.mini', { type: 'button', onclick: () => copyText(shareLink(x.id)), title: shareLink(x.id) }, t('shCopyLink')),
            h('button.btn.mini', { type: 'button', onclick: () => statsDialog(x) }, t('shStats')),
            h('button.btn.mini', { type: 'button', onclick: () => pwDialog(x) }, t('shChangePw')),
            h('button.btn.mini', { type: 'button', onclick: async () => { if (await delDialog(x)) { list = list.filter((y) => y !== x); render(); } } }, t('shDelete')),
          ]),
        ]))),
      ]) : h('p.note', t('shNone')),
      h('p.note', { html: t('shStatsHint') }),
      h('div.row-actions', [h('button.btn.mini', { type: 'button', onclick: () => { save('diashow.upkey', null); msg(t('shKeyForgot')); } }, t('shForgetKey'))]),
    );
  };
  render();
  await dialog(t('shManage'), body, [{ label: t('close'), primary: true }], { cls: 'xwide' });
}
async function statsDialog(x) {
  let s; try { s = await api(`/api/shares/${x.id}/stats`); } catch (e) { msg(e.message, 'err'); return; }
  await dialog(t('shStats') + ' – ' + x.title, [
    h('p', t('shStatsSum', { v: s.views, c: x.completed || 0, l: s.last_view ? fmtDateTime(s.last_view) : '–' })),
    s.days.length ? h('table.sharetab', [h('thead', h('tr', [h('th', t('shDay')), h('th.num', t('shViews')), h('th.num', t('shCompleted'))])),
      h('tbody', s.days.map((d) => h('tr', [h('td', new Date(d.day + 'T12:00').toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })), h('td.num', String(d.views)), h('td.num', String(d.completed || 0))])))]) : h('p.note', t('shNoViews')),
  ], [{ label: 'OK', primary: true }]);
}
async function pwDialog(x) {
  const pw = h('input', { type: 'text', autocomplete: 'off' });
  const r = await dialog(t('shChangePw') + ' – ' + x.title, [h('label.lbl', t('shPwNew')), pw, h('p.note', t('shPwHint'))], [{ label: t('cancel'), value: null }, { label: 'OK', value: 'ok', primary: true }]);
  if (r !== 'ok') return;
  if (pw.value.trim().length < 4) { msg(t('shPwShort'), 'warn'); return; }
  try { await api(`/api/shares/${x.id}`, { method: 'PATCH', json: { password: pw.value.trim() } }); msg(t('shPwChanged', { n: x.title })); }
  catch (e) { msg(e.message, 'err'); }
}
async function delDialog(x) {
  const r = await dialog(t('shDelete'), h('p', t('shDelText', { n: x.title, v: x.views || 0 })), [{ label: t('cancel'), value: null }, { label: t('shDelete'), value: 'ok', primary: true }]);
  if (r !== 'ok') return false;
  try { await api(`/api/shares/${x.id}`, { method: 'DELETE' }); msg(t('shDeleted', { n: x.title })); return true; }
  catch (e) { msg(e.message, 'err'); return false; }
}
