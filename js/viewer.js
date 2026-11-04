/* Diashow — Betrachter für geteilte Diashows (share.html, Link diashow.wicki.aero/s/<id>).
 *
 * Passwort → Token (12 h) → Manifest. Bilder kommen fertig aufbereitet (Logo eingebrannt),
 * Titel- und Karten-Folien werden wie in der App gezeichnet, Videos mit Logo-Überlagerung.
 * Kein Download-Knopf, kein Kontextmenü auf den Bildern. Ein Aufruf zählt einmal pro Browser-Tab.
 */
import { h } from './util.js';
import { titleNode, wmNode } from './render.js';
import { mountMap } from './track.js';
import { capNode } from './caption.js';
import { Music, musicFor } from './music.js';
import { APP } from './version.js';

const API = (() => { try { return JSON.parse(localStorage.getItem('diashow.api')) || APP.api; } catch { return APP.api; } })();
const $ = (id) => document.getElementById(id);
const id = (location.hash.slice(1) || new URLSearchParams(location.search).get('id') || '').replace(/[^a-z0-9]/g, '');
const EN = !/^de\b/i.test(navigator.language || 'de');
const T = EN
  ? { pw: 'Password', view: '▶ View', wrong: 'Wrong password.', gone: 'This link does not exist (any more).', net: 'No connection to the server.', expired: 'Session expired – please enter the password again.', end: 'End of slideshow', again: '↻ Play again', loading: 'Loading …', hint: 'Keys: ← → · Space pause · F full screen', notPlay: 'This video cannot be played in this browser.' }
  : { pw: 'Passwort', view: '▶ Ansehen', wrong: 'Passwort falsch.', gone: 'Diesen Link gibt es nicht (mehr).', net: 'Keine Verbindung zum Server.', expired: 'Sitzung abgelaufen – bitte Passwort erneut eingeben.', end: 'Ende der Diashow', again: '↻ Nochmals abspielen', loading: 'Wird geladen …', hint: 'Tasten: ← → · Leertaste Pause · F Vollbild', notPlay: 'Dieses Video lässt sich in diesem Browser nicht abspielen.' };
const TRANSITIONS = ['fade', 'slide', 'zoom', 'wipe', 'cube', 'black', 'circle'];
const sk = 'diashow.share.' + id;
let tok = null; let man = null; let run = null; let doneSent = false;

const fileUrl = (name) => `${API}/api/s/${id}/f/${encodeURIComponent(name)}?t=${encodeURIComponent(tok)}`;

/* ---------- Zugang ---------- */
function gateMsg(text) { const e = $('gErr'); e.textContent = text; e.hidden = !text; }
async function init() {
  $('gLbl').textContent = T.pw; $('gBtn').textContent = T.view; $('gNote').textContent = T.hint;
  document.documentElement.lang = EN ? 'en' : 'de';
  if (!id) { gateMsg(T.gone); $('gForm').hidden = true; return; }
  try {
    const r = await fetch(`${API}/api/s/${id}`);
    if (r.status === 404) { gateMsg(T.gone); $('gForm').querySelector('input').disabled = true; $('gBtn').disabled = true; return; }
    const j = await r.json(); $('gTitle').textContent = j.title; document.title = j.title;
  } catch { gateMsg(T.net); }
  $('gForm').onsubmit = (e) => { e.preventDefault(); open($('gPw').value); };
  $('gPw').focus();
}
async function open(password) {
  gateMsg(''); $('gBtn').disabled = true; $('gBtn').textContent = T.loading;
  try {
    let again = null; try { again = sessionStorage.getItem(sk); } catch { /* egal */ }
    const r = await fetch(`${API}/api/s/${id}/open`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, again }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { gateMsg(r.status === 403 ? T.wrong : r.status === 404 ? T.gone : j.error || T.net); return; }
    tok = j.token; man = j.manifest;
    try { sessionStorage.setItem(sk, tok); } catch { /* egal */ }
    document.title = j.title;
    $('gate').hidden = true;
    start();
  } catch { gateMsg(T.net); }
  finally { $('gBtn').disabled = false; $('gBtn').textContent = T.view; }
}

/* ---------- Abspielen ---------- */
function prepItem(x) {
  const s = { ...x, cap: x.cap || '', wm: x.wm?.path ? { ...x.wm, path: fileUrl(x.wm.path) } : undefined };
  if (x.t === 'title') s.ts = { ...x.ts, bgPath: x.ts?.bgPath ? fileUrl(x.ts.bgPath) : '', logoPath: x.ts?.logoPath ? fileUrl(x.ts.logoPath) : '' };
  return { s, type: x.t === 'img' ? 'image' : x.t, url: x.file ? fileUrl(x.file) : '' };
}
function start() {
  const S = { dur: 6, trDur: 1, order: 'fixed', loop: false, kenburns: true, captions: true, pool: TRANSITIONS, fit: 'contain', portraitBg: true, ...(man.settings || {}) };
  let list = man.slides.map(prepItem);
  if (S.order === 'random') {
    const head = list[0]?.type === 'title' ? [list.shift()] : [];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    list = [...head, ...list];
  }
  run = { list, i: -1, S, paused: false, layer: null, timer: null, lastTr: null, ended: false, muted: false };
  const SM = S.music || null;
  const anyMusic = (SM?.list?.length) || list.some((x) => x.type === 'title' && x.s.music?.mode === 'list' && x.s.music.list?.length);
  if (anyMusic) run.music = new Music({ urlOf: async (n) => fileUrl(n), vol: SM?.vol ?? 0.7, fade: SM?.fade ?? 2, onChange: () => updBar() });
  $('bMusic').hidden = !run.music;
  $('bMusic').onclick = (e) => { e.stopPropagation(); run.music?.setMuted(!run.music.muted); updBar(); };
  const stage = $('stage');
  stage.oncontextmenu = (e) => e.preventDefault();
  stage.onclick = () => next();
  $('bar').hidden = false; $('bTitle').textContent = man.title || '';
  $('bPrev').onclick = (e) => { e.stopPropagation(); prev(); };
  $('bNext').onclick = (e) => { e.stopPropagation(); next(); };
  $('bPlay').onclick = (e) => { e.stopPropagation(); togglePause(); };
  $('bFs').onclick = (e) => { e.stopPropagation(); toggleFs(); };
  $('bSound').onclick = (e) => { e.stopPropagation(); run.muted = !run.muted; const v = run.layer?.querySelector('video'); if (v) { v.muted = run.muted || !curItem()?.s.sound; run.music?.duck(!v.muted); } updBar(); };
  document.addEventListener('keydown', onKey);
  document.addEventListener('dragstart', (e) => e.preventDefault());
  // Touch: wischen
  let tx = null;
  stage.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) { e.preventDefault(); if (dx < 0) next(); else prev(); } }, { passive: false });
  // Steuerleiste und Mauszeiger nach kurzer Ruhe ausblenden
  let idle = null;
  const wake = () => { document.body.classList.add('awake'); clearTimeout(idle); idle = setTimeout(() => document.body.classList.remove('awake'), 2500); };
  document.addEventListener('mousemove', wake); document.addEventListener('touchstart', wake, { passive: true }); wake();
  try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {}); } catch { /* egal */ }
  // Bildschirm wach halten, solange die Diashow läuft
  const wl = () => { try { navigator.wakeLock?.request('screen').catch(() => {}); } catch { /* egal */ } };
  wl(); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wl(); });
  goTo(0, 1);
}
const curItem = () => run?.list[run.i];
function slideSeconds(it) { return it.s.dur || (it.type === 'video' ? null : it.type === 'map' ? Math.max(run.S.dur, 12) : run.S.dur); }
function schedule() {
  clearTimeout(run.timer); run.timer = null;
  const it = curItem(); if (!it || run.ended || run.paused) return;
  const sec = slideSeconds(it);
  if (sec) run.timer = setTimeout(() => next(true), (sec + run.S.trDur) * 1000);
}
function next() {
  if (!run) return;
  if (run.ended) { run.ended = false; goTo(0, 1); return; }
  if (run.i >= run.list.length - 1) { if (run.S.loop) goTo(0, 1); else showEnd(); return; }
  goTo(run.i + 1, 1);
}
function prev() { if (!run) return; if (run.ended) { run.ended = false; goTo(run.list.length - 1, -1); return; } if (run.i > 0) goTo(run.i - 1, -1); }
function togglePause() {
  run.paused = !run.paused;
  const v = run.layer?.querySelector('video'); if (v) { if (run.paused) v.pause(); else v.play().catch(() => {}); }
  run.music?.hold(run.paused);
  schedule(); updBar();
}
function toggleFs() { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen?.().catch(() => {}); }
function onKey(e) {
  if (!run || e.ctrlKey || e.altKey || e.metaKey) return;
  const k = e.key;
  if (['ArrowRight', 'PageDown', 'ArrowDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'PageUp', 'ArrowUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
  else if (k === ' ') { e.preventDefault(); togglePause(); }
  else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFs(); }
  else if (k === 'Home') { e.preventDefault(); goTo(0, -1); }
  else if (k === 'End') { e.preventDefault(); goTo(run.list.length - 1, 1); }
}
function markDone() {
  if (doneSent) return; doneSent = true;
  fetch(`${API}/api/s/${id}/done?t=${encodeURIComponent(tok)}`, { method: 'POST', keepalive: true }).catch(() => {});
}
function showEnd() {
  run.ended = true; clearTimeout(run.timer);
  run.music?.stop(3);
  const old = run.layer;
  const L = h('div.layer.endl', h('div.sv-end', [h('div.endtxt', T.end), h('button.btn.big', { type: 'button', onclick: (e) => { e.stopPropagation(); run.ended = false; goTo(0, 1); } }, T.again)]));
  $('stage').insertBefore(L, $('blackOv'));
  L.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800 });
  if (old) { old.querySelector('video')?.pause(); setTimeout(() => { old._map?.stop(); old.remove(); }, 820); }
  run.layer = L; updBar();
}
function pickTr(s) {
  if (s.tr) return s.tr;
  const pool = (run.S.pool || []).filter((x) => TRANSITIONS.includes(x));
  const cand = pool.filter((x) => x !== run.lastTr);
  const l = cand.length ? cand : (pool.length ? pool : ['fade']);
  return l[Math.floor(Math.random() * l.length)];
}
function makeLayer(it) {
  const S = run.S; const s = it.s;
  const L = h('div.layer');
  if (it.type === 'title') L.append(titleNode(s));
  else if (it.type === 'map') L.append(h('div.mapwrap'), s.cap ? h('div.maptitle', s.cap) : null);
  else if (it.type === 'image') {
    const portrait = s.w && s.h ? s.h > s.w : false;
    if (S.portraitBg && S.fit === 'contain' && (portrait || !s.w)) L.append(h('div.pbg', h('img', { src: it.url, alt: '', draggable: false })));
    L.append(h('div.kb', h('img', { src: it.url, alt: '', draggable: false, style: { objectFit: S.fit } })));
  } else {
    const v = h('video', { src: it.url, playsInline: true, preload: 'auto', disablePictureInPicture: true, style: { objectFit: S.fit } });
    v.setAttribute('controlslist', 'nodownload noplaybackrate');
    if (s.crop) { const c = s.crop; v.style.objectViewBox = `inset(${c.y * 100}% ${(1 - c.x - c.w) * 100}% ${(1 - c.y - c.h) * 100}% ${c.x * 100}%)`; }
    v.muted = run.muted || !s.sound;
    v.onended = () => { if (run && curItem() === it && !run.paused && !s.dur) next(); };
    v.onerror = () => { L.append(h('div.sv-err', T.notPlay)); if (!run.paused) { clearTimeout(run.timer); run.timer = setTimeout(() => { if (curItem() === it) next(); }, 3000); } };
    L.append(v);
  }
  if (S.captions && s.cap && it.type !== 'title' && it.type !== 'map') {
    // Ecke und Schriftfarbe hat die App beim Teilen bestimmt (ältere Links: unten rechts, hell)
    L.append(capNode(s.cap, { auto: !!s.auto, corner: s.corner || 'br', tone: s.tone || 'light', liftForWm: 0 }));
  }
  if (it.type !== 'image') { const w = wmNode(s.wm); if (w) L.append(w); }   // Bilder: Logo bereits eingebrannt
  return L;
}
async function goTo(i, dir) {
  if (!run) return;
  run.ended = false;
  const it = run.list[i]; if (!it) return;
  const seq = (run.seq = (run.seq || 0) + 1);
  const L = makeLayer(it);
  const img = L.querySelector('.kb img');
  if (img) {
    try { await Promise.race([img.decode(), new Promise((r) => setTimeout(r, 4000))]); } catch { /* zeigt trotzdem */ }
    if (img.naturalWidth && !it.s.w && img.naturalHeight <= img.naturalWidth) L.querySelector('.pbg')?.remove();
  }
  if (!run || seq !== run.seq) return;
  const stage = $('stage'); const old = run.layer;
  stage.insertBefore(L, $('blackOv'));
  run.i = i; run.layer = L;
  const tr = pickTr(it.s); run.lastTr = tr;
  const D = Math.round(run.S.trDur * 1000);
  const fx = effects(tr, dir); const opt = { duration: D, easing: 'ease-in-out', fill: 'both' };
  L.animate(fx[0], opt);
  if (old) {
    if (fx[1]) old.animate(fx[1], opt);
    old.style.zIndex = fx[2] ? 2 : 0;
    old.querySelector('video')?.pause();
    const oldMap = old._map;
    setTimeout(() => { oldMap?.stop(); old.remove(); }, D + 60);
  }
  if (it.type === 'map') mountMap(L.querySelector('.mapwrap'), it.s, (slideSeconds(it) || 12) * 0.75).then((c) => { L._map = c; }).catch(() => {});
  const v = L.querySelector('video');
  if (v) { v.currentTime = 0; if (!run.paused) v.play().catch(() => { v.muted = true; v.play().catch(() => {}); run.music?.duck(false); updBar(); }); }
  if (run.music) {
    const mf = musicFor(run.list, i, run.S.music?.list || []);
    run.music.resume(); run.music.setList(mf.key, mf.paths);
    run.music.duck(!!v && !v.muted);
    if (v) v.addEventListener('ended', () => { if (run?.layer === L) run.music?.duck(false); });   // Video fertig → Musik wieder ein
  }
  if (img && run.S.kenburns && !it.s.pdf) kenBurns(L.querySelector('.kb'), (slideSeconds(it) || 8) + run.S.trDur);
  if (i === run.list.length - 1) markDone();
  schedule(); preload(i); updBar();
}
function effects(tr, dir) {
  const d = dir < 0 ? -1 : 1;
  switch (tr) {
    case 'slide': return [[{ transform: `translateX(${d * 100}%)` }, { transform: 'translateX(0)' }], [{ transform: 'translateX(0)' }, { transform: `translateX(${-d * 100}%)` }]];
    case 'zoom': return [[{ transform: 'scale(1.35)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.8)', opacity: 0 }]];
    case 'wipe': return [[{ clipPath: d > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0)' }], null];
    case 'cube': return [[{ transform: `translateX(${d * 50}%) translateZ(-50vw) rotateY(${d * 90}deg) translateX(${d * 50}%)` }, { transform: 'translateX(0) translateZ(0) rotateY(0) translateX(0)' }],
      [{ transform: 'translateX(0) translateZ(0) rotateY(0) translateX(0)' }, { transform: `translateX(${-d * 50}%) translateZ(-50vw) rotateY(${-d * 90}deg) translateX(${-d * 50}%)` }]];
    case 'black': return [[{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], [{ opacity: 1 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }], true];
    case 'circle': return [[{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }], null];
    default: return [[{ opacity: 0 }, { opacity: 1 }], null];
  }
}
function kenBurns(el, sec) {
  if (!el) return;
  const z = 1.06 + Math.random() * 0.08; const x = (Math.random() * 2 - 1) * 3; const y = (Math.random() * 2 - 1) * 2;
  const a = { transform: 'scale(1) translate(0,0)' }; const b = { transform: `scale(${z}) translate(${x}%,${y}%)` };
  el.animate(Math.random() < 0.5 ? [a, b] : [b, a], { duration: sec * 1000, easing: 'linear', fill: 'both' });
}
function preload(i) {
  for (const k of [1, 2, 3]) { const it = run.list[(i + k) % run.list.length]; if (it?.type === 'image') { const im = new Image(); im.src = it.url; } }
}
function updBar() {
  if (!run) return;
  $('bPos').textContent = run.ended ? '' : `${run.i + 1} / ${run.list.length}`;
  $('bPlay').textContent = run.paused ? '▶︎ Auto' : '⏸';
  if (run.music) $('bMusic').textContent = run.music.muted ? '🔇♪' : '♪';
  const v = run.layer?.querySelector('video');
  $('bSound').hidden = !v || !curItem()?.s.sound;
  if (v) $('bSound').textContent = v.muted ? '🔇' : '🔊';
}

// Abgelaufenes Token (nach 12 h): Bild lädt nicht → zurück zum Passwort
document.addEventListener('error', (e) => {
  if (!run || !(e.target instanceof HTMLImageElement) || !e.target.src.startsWith(API)) return;
  fetch(e.target.src, { method: 'HEAD' }).then((r) => { if (r.status === 401) { try { sessionStorage.removeItem(sk); } catch { /* egal */ } location.reload(); } }).catch(() => {});
}, true);

window.addEventListener('hashchange', () => location.reload());
init();
