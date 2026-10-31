/* Diashow — Schritt 3: Vorführen.
 *
 * Beamer: dieses Fenster geht im Vollbild auf den zweiten Bildschirm
 * (Window Management API, einmalige Erlaubnis «Fensterverwaltung»).
 * Referentensicht: zweites Fenster (presenter.html) auf dem Laptop-Bildschirm,
 * das von hier aus gefüllt und gesteuert wird (gleicher Ursprung).
 * Klicker (z. B. Logitech Presenter) senden Bild↑/Bild↓, F5/Esc und «.»/B.
 */
import { t } from '../i18n.js';
import { $, h, clear, msg, mmss, load, save } from '../util.js';
import * as fsx from '../fsx.js';
import { imageBlob, fileOf, probeVideo, thumb } from '../media.js';
import { cur, slideKey, TRANSITIONS } from '../show.js';

const prep = new Map();          // slideKey -> {ok, type, url, duration, err}
let prepSig = ''; let preparing = null;
const scr = { details: null, beamer: load('diashow.beamerLabel', null), withRef: load('diashow.withRef', true) };
let root = null; let run = null; let refWin = null; let lastKey = ''; let reported = '';

export const isRunning = () => !!run;

/* =================================================================== Vorbereitung */
function items() { return cur.show.slides; }
function signature() { return items().map((s) => s.type === 'title' ? 't' : slideKey(s.path, s.page)).join('\n'); }
async function prepare(onProg) {
  const sig = signature();
  if (sig === prepSig && !preparing) return;
  if (preparing) { await preparing; if (sig === prepSig) return; }
  preparing = (async () => {
    const list = items(); let n = 0;
    for (const s of list) {
      n++;
      if (s.type !== 'file') { onProg?.(n, list.length); continue; }
      const k = slideKey(s.path, s.page);
      if (prep.get(k)?.ok) { onProg?.(n, list.length); continue; }
      try {
        if (s.kind === 'video') {
          const f = await fileOf(s.path); const url = URL.createObjectURL(f);
          const p = await probeVideo(url);
          prep.set(k, p.ok ? { ok: true, type: 'video', url, duration: p.duration } : { ok: false, err: t('videoUnplayable') });
        } else {
          const b = await imageBlob(s.path, s.page, s.kind);
          prep.set(k, { ok: true, type: 'image', url: URL.createObjectURL(b) });
        }
      } catch (e) {
        let err = String(e?.message || e);
        try { await fileOf(s.path); } catch { err = t('fileMissing'); }
        prep.set(k, { ok: false, err });
      }
      onProg?.(n, list.length);
    }
    prepSig = sig;
  })();
  try { await preparing; } finally { preparing = null; }
}
function problems() {
  return items().map((s, i) => ({ s, i, p: s.type === 'file' ? prep.get(slideKey(s.path, s.page)) : { ok: true } })).filter((x) => x.p && !x.p.ok);
}

/* =================================================================== Bildschirme */
async function detectScreens(ask) {
  if (!('getScreenDetails' in window)) return;
  if (!ask) { try { const q = await navigator.permissions.query({ name: 'window-management' }); if (q.state !== 'granted') return; } catch { return; } }
  try {
    scr.details = await window.getScreenDetails();
    scr.details.onscreenschange = () => { if (root?.classList.contains('on') && !run) renderPresent(root); };
  } catch (e) { msg(t('screensDenied'), 'warn'); }
}
function screenLabel(s, i) { return `${i + 1}: ${s.label || t('screen')} · ${s.width}×${s.height}${s.isPrimary ? ' · ' + t('primary') : ''}`; }
function beamerScreen() {
  const d = scr.details; if (!d || d.screens.length < 2) return null;
  const list = d.screens;
  return list.find((s, i) => screenLabel(s, i) === scr.beamer) || list.find((s) => s !== d.currentScreen) || null;
}

/* =================================================================== Ansicht */
export async function renderPresent(el) {
  root = el; clear(el); el.classList.add('pad');
  await detectScreens(false);
  const n = items().length;
  const progress = h('div.prog', h('i', { style: { width: '0%' } }));
  const status = h('div.note', t('preparing'));
  const probBox = h('div.probs');
  const d = scr.details; const multi = (d && d.screens.length > 1) || window.screen.isExtended;
  const bs = beamerScreen();

  const startBtn = h('button.btn.primary.big', { type: 'button', disabled: !n, onclick: () => start() }, '▶ ' + t('startShow'));
  const refBtn = h('button.btn', { type: 'button', disabled: !n, onclick: () => openRef(true) }, t('openRef'));

  el.append(h('div.play', [
    h('div.card', [
      h('div.card-head', h('div.section-title', t('prepTitle'))),
      h('div.card-body', [
        h('p', t('prepText', { n, name: cur.show.name || t('unnamed') })),
        progress, status, probBox,
      ]),
    ]),
    h('div.card', [
      h('div.card-head', h('div.section-title', t('screensTitle'))),
      h('div.card-body', [
        !('getScreenDetails' in window) ? h('p.note', t('screensNoApi')) : null,
        d ? h('div', d.screens.map((s, i) => h('label.check', h('input', { type: 'radio', name: 'beamer', checked: s === bs, disabled: d.screens.length < 2, onchange: () => { scr.beamer = screenLabel(s, i); save('diashow.beamerLabel', scr.beamer); } }),
          screenLabel(s, i) + (s === d.currentScreen ? ' · ' + t('thisScreen') : '') + (s === bs ? ' · ' + t('beamer') : '')))) : null,
        d && d.screens.length < 2 ? h('p.warn', t('oneScreen')) : null,
        !d && 'getScreenDetails' in window ? h('div.row-actions', [h('button.btn', { type: 'button', onclick: async () => { await detectScreens(true); renderPresent(el); } }, t('detectScreens')), h('span.note', multi ? t('multiDetected') : t('extendHint'))]) : null,
        h('label.check', h('input', { type: 'checkbox', checked: scr.withRef, onchange: (e) => { scr.withRef = e.target.checked; save('diashow.withRef', scr.withRef); } }), t('withRef')),
        h('p.note', { html: t('screensHint') }),
      ]),
    ]),
    h('div.card', [
      h('div.card-head', h('div.section-title', t('startTitle'))),
      h('div.card-body', [
        h('div.row-actions', [refBtn, startBtn]),
        h('p.note', { html: t('startHint') }),
        h('div.keytest', [h('span.lbl', t('keyTest')), h('span#keyTest.mono', lastKey || t('keyTestHint'))]),
        h('p.note', { html: t('keysHelp') }),
      ]),
    ]),
  ]));
  if (!n) { status.textContent = t('noSlides'); return; }
  await prepare((i, k) => { progress.firstChild.style.width = Math.round(i / k * 100) + '%'; status.textContent = t('prepN', { i, k }); });
  progress.firstChild.style.width = '100%';
  const probs = problems();
  status.textContent = probs.length ? t('prepDoneProbs', { n: n - probs.length, k: n, p: probs.length }) : t('prepDone', { n });
  status.className = probs.length ? 'warn' : 'ok';
  clear(probBox).append(...probs.map((x) => h('div.prob', `${t('slide')} ${x.i + 1}: ${fsx.baseName(x.s.path)}${x.s.page ? ' · ' + t('pageN', { p: x.s.page }) : ''} – ${x.p.err}`)));
  if (reported !== prepSig) { reported = prepSig; for (const x of probs) msg(`${t('slide')} ${x.i + 1}: ${x.s.path} – ${x.p.err}`, 'warn'); }
}

/* =================================================================== Start / Ende */
function buildList() {
  const S = cur.show.settings;
  let list = items().map((s) => {
    if (s.type === 'title') return { s, type: 'title' };
    const p = prep.get(slideKey(s.path, s.page));
    return p?.ok ? { s, type: p.type, url: p.url, duration: p.duration } : null;
  }).filter(Boolean);
  if (S.order === 'random') {
    const head = list[0]?.type === 'title' ? [list.shift()] : [];
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    list = [...head, ...list];
  }
  return list;
}
async function start(from = 0) {
  if (run) return;
  if (preparing || signature() !== prepSig) { msg(t('stillPreparing'), 'warn'); return; }
  const list = buildList();
  if (!list.length) { msg(t('noPlayable'), 'err'); return; }
  const stage = $('stage');
  stage.hidden = false; clear(stage);
  stage.append(h('div.black#blackOv'), h('div.hud#hud'));
  const bs = beamerScreen();
  // Reihenfolge wichtig: zuerst Vollbild anfordern, dann (gleicher Klick) das Begleitfenster öffnen.
  let fsP;
  try { fsP = stage.requestFullscreen(bs ? { screen: bs, navigationUI: 'hide' } : { navigationUI: 'hide' }); } catch (e) { fsP = Promise.reject(e); }
  if (scr.withRef && bs && !(refWin && !refWin.closed)) openRef(false);
  try { await fsP; } catch (e) { msg(t('fsFail') + ' ' + (e?.message || e), 'warn'); }
  const S = cur.show.settings;
  run = { list, i: -1, auto: S.mode === 'auto', paused: false, black: false, t0: Date.now(), slideT0: Date.now(), timer: null, layer: null, lastTr: null, ended: false, S };
  window.addEventListener('keydown', onKey, true);
  stage.onclick = () => next();
  stage.oncontextmenu = (e) => { e.preventDefault(); prev(); };
  run.tick = setInterval(updRef, 250);
  goTo(from, 1);
  if (scr.withRef && bs && !(refWin && !refWin.closed)) msg(t('refBlocked'), 'warn');
  attachRef();
}
function stop() {
  if (!run) return;
  clearTimeout(run.timer); clearInterval(run.tick);
  window.removeEventListener('keydown', onKey, true);
  const stage = $('stage');
  stage.querySelectorAll('video').forEach((v) => v.pause());
  clear(stage); stage.hidden = true;
  run = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (refWin && !refWin.closed) renderRefIdle();
  if (root?.classList.contains('on')) renderPresent(root);
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && run) stop(); });

/* =================================================================== Ablauf */
function slideSeconds(it) { return it.s.dur || (it.type === 'video' ? null : run.S.dur); }
function schedule() {
  clearTimeout(run.timer); run.timer = null;
  const it = run.list[run.i]; if (!it || run.ended) return;
  if (!run.auto || run.paused) return;
  const sec = slideSeconds(it);
  if (sec) run.timer = setTimeout(() => next(true), (sec + run.S.trDur) * 1000);
}
function next(fromTimer) {
  if (!run) return;
  if (run.ended) { if (!fromTimer) end(); return; }
  if (run.i >= run.list.length - 1) { if (run.S.loop) goTo(0, 1); else showEnd(); return; }
  goTo(run.i + 1, 1);
}
function prev() { if (!run) return; if (run.ended) { run.ended = false; goTo(run.list.length - 1, -1); return; } if (run.i > 0) goTo(run.i - 1, -1); }
function togglePause() {
  if (!run) return;
  if (!run.auto) { run.auto = true; run.paused = false; } else run.paused = !run.paused;
  const v = run.layer?.querySelector('video');
  if (v) { if (run.paused) v.pause(); else v.play().catch(() => {}); }
  schedule(); updRef(true);
}
function toggleBlack() { if (!run) return; run.black = !run.black; $('blackOv').classList.toggle('on', run.black); updRef(true); }
function end() { if (document.fullscreenElement) document.exitFullscreen().catch(() => stop()); else stop(); }
function showEnd() {
  run.ended = true; clearTimeout(run.timer);
  const old = run.layer; const L = h('div.layer.endl', h('div.endtxt', t('endOfShow')));
  $('stage').insertBefore(L, $('blackOv'));
  L.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800 });
  if (old) { old.querySelector('video')?.pause(); setTimeout(() => old.remove(), 820); }
  run.layer = L; updRef(true);
}

function pickTr(s) {
  if (s.tr) return s.tr;
  const pool = run.S.pool.filter((x) => TRANSITIONS.includes(x));
  const cand = pool.filter((x) => x !== run.lastTr);
  const list = cand.length ? cand : (pool.length ? pool : ['fade']);
  return list[Math.floor(Math.random() * list.length)];
}
function makeLayer(it) {
  const S = run.S; const s = it.s;
  const L = h('div.layer');
  if (it.type === 'title') L.append(h('div.tslide', h('div.ttext', s.cap || '')));
  else if (it.type === 'image') L.append(h('div.kb', h('img', { src: it.url, alt: '', draggable: false, style: { objectFit: S.fit } })));
  else {
    const v = h('video', { src: it.url, playsInline: true, preload: 'auto', style: { objectFit: S.fit } });
    v.muted = !s.sound;
    v.onended = () => { if (run && run.list[run.i] === it && run.auto && !run.paused && !it.s.dur) next(true); };
    L.append(v);
  }
  if (S.captions && s.cap && it.type !== 'title') L.append(h('div.cap', s.cap));
  return L;
}
async function goTo(i, dir) {
  if (!run) return;
  run.ended = false;
  const it = run.list[i]; if (!it) return;
  const seq = (run.seq = (run.seq || 0) + 1);
  const L = makeLayer(it);
  const img = L.querySelector('img');
  if (img) { try { await Promise.race([img.decode(), new Promise((r) => setTimeout(r, 2500))]); } catch { /* zeigt trotzdem */ } }
  if (!run || seq !== run.seq) return;
  const stage = $('stage'); const old = run.layer;
  stage.insertBefore(L, $('blackOv'));
  run.i = i; run.slideT0 = Date.now(); run.layer = L;
  const tr = pickTr(it.s); run.lastTr = tr;
  const D = Math.round(run.S.trDur * 1000);
  const fx = effects(tr, dir);
  const opt = { duration: D, easing: 'ease-in-out', fill: 'both' };
  L.animate(fx[0], opt);
  if (old) {
    if (fx[1]) old.animate(fx[1], opt);
    old.style.zIndex = fx[2] ? 2 : 0;   // Effekte, bei denen das alte Bild oben weggeht
    old.querySelector('video')?.pause();
    setTimeout(() => old.remove(), D + 60);
  }
  const v = L.querySelector('video');
  if (v) { v.currentTime = 0; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); }
  if (img && run.S.kenburns && it.s.kind !== 'pdf') kenBurns(L.querySelector('.kb'), (slideSeconds(it) || 8) + run.S.trDur);
  schedule(); preload(i); updRef(true);
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
  for (const k of [1, 2]) { const it = run.list[(i + k) % run.list.length]; if (it?.type === 'image') { const im = new Image(); im.src = it.url; im.decode?.().catch(() => {}); } }
}

/* =================================================================== Tasten / Klicker */
const KEYS = {
  next: ['ArrowRight', 'PageDown', 'ArrowDown', 'Enter', 'n', 'N'],
  prev: ['ArrowLeft', 'PageUp', 'ArrowUp', 'Backspace', 'p', 'P'],
  pause: [' ', 'k', 'K'],
  black: ['b', 'B', '.', 'w', 'W'],
  first: ['Home'], last: ['End'],
};
const actionOf = (k) => Object.keys(KEYS).find((a) => KEYS[a].includes(k));
function onKey(e) {
  if (!run) return;
  if (e.key === 'F5' || (e.key === 'F5' && e.shiftKey)) { e.preventDefault(); return; }   // Logitech «Start»: kein Neuladen
  if (e.key === 'Escape') { e.preventDefault(); end(); return; }
  const a = actionOf(e.key); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  if (a === 'next') next(); else if (a === 'prev') prev(); else if (a === 'pause') togglePause(); else if (a === 'black') toggleBlack();
  else if (a === 'first') goTo(0, -1); else if (a === 'last') goTo(run.list.length - 1, 1);
}
// Klicker-Test und F5-Start in der Vorführen-Ansicht (ohne laufende Diashow)
document.addEventListener('keydown', (e) => {
  if (run || !root?.classList.contains('on') || document.querySelector('.backdrop')) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const a = actionOf(e.key);
  lastKey = `${e.key === ' ' ? 'Leertaste' : e.key}${e.shiftKey ? ' (+Shift)' : ''} → ${a ? t('act_' + a) : (e.key === 'F5' ? t('act_start') : e.key === 'Escape' ? t('act_end') : '–')}`;
  const kt = $('keyTest'); if (kt) kt.textContent = lastKey;
  if (e.key === 'F5') { e.preventDefault(); start(); }
  else if (a) e.preventDefault();
});

/* =================================================================== Referentensicht */
function openRef(focus) {
  const d = scr.details; const here = d?.currentScreen;
  const geo = here ? `left=${here.availLeft},top=${here.availTop},width=${here.availWidth},height=${here.availHeight}` : 'width=1280,height=800';
  try { refWin = window.open('presenter.html', 'diashow-ref', 'popup,' + geo); } catch { refWin = null; }
  if (!refWin) { msg(t('refBlocked'), 'warn'); return null; }
  if (focus) refWin.focus();
  return refWin;
}
// presenter.html ruft dies beim Laden auf
window.__diashowAttach = (w) => { refWin = w; attachRef(); };
function attachRef() {
  if (!refWin || refWin.closed || !refWin.document.getElementById('ref')) return;
  if (!refWin.__keys) { refWin.addEventListener('keydown', (e) => { if (run) onKey(e); }, true); refWin.__keys = true; }
  refWin.document.title = t('refTitle') + ' – ' + (cur.show.name || 'Diashow');
  if (run) renderRef(); else renderRefIdle();
}
function renderRefIdle() {
  if (!refWin || refWin.closed) return;
  const R = refWin.document.getElementById('ref'); if (!R) return;
  clear(R).append(h('div.ref-idle', [h('h1', cur.show.name || 'Diashow'), h('p', run ? '' : t('refIdle')), h('p.note', { html: t('keysHelp') })]));
}
let refStripFor = null;
function renderRef() {
  const R = refWin.document.getElementById('ref'); if (!R) return;
  clear(R).append(
    h('div.ref-cur', [h('div.ref-lbl#rLbl'), h('div.ref-box#rCur')]),
    h('div.ref-side', [
      h('div.ref-lbl', t('next')), h('div.ref-box.small#rNext'),
      h('div.ref-clock', [h('div', h('b#rEl', '00:00'), h('span', t('elapsed'))), h('div', h('b#rRem', '–'), h('span', t('slideRemain'))), h('div', h('b#rNow', '--:--'), h('span', t('clock')))]),
      h('div.ref-lbl', t('note')), h('div.ref-note#rNote'),
      h('div.ref-ctl', [
        h('button.btn', { type: 'button', onclick: () => prev() }, '◀'),
        h('button.btn#rPause', { type: 'button', onclick: () => togglePause() }, '⏸'),
        h('button.btn', { type: 'button', onclick: () => next() }, '▶'),
        h('button.btn#rBlack', { type: 'button', onclick: () => toggleBlack() }, t('blackBtn')),
        h('button.btn#rSound', { type: 'button', onclick: () => { const v = run?.layer?.querySelector('video'); if (v) { v.muted = !v.muted; updRef(true); } } }, '🔊'),
        h('button.btn', { type: 'button', onclick: () => end() }, t('endBtn')),
      ]),
      h('p.note', { html: t('keysHelp') }),
    ]),
    h('div.ref-strip#rStrip'),
  );
  refStripFor = null;
  updRef(true);
}
function refImg(it) {
  if (!it) return h('div.ref-empty', '–');
  if (it.type === 'title') return h('div.tslide.mini', h('div.ttext', it.s.cap || ''));
  if (it.type === 'image') return h('img', { src: it.url, alt: '' });
  const box = h('div.ref-vid', h('span', '▶ ' + t('video')));
  thumb(it.s.path).then((r) => box.prepend(h('img', { src: r.url, alt: '' }))).catch(() => {});
  return box;
}
function updRef(full) {
  if (!run || !refWin || refWin.closed) return;
  const D = refWin.document; const g = (id) => D.getElementById(id);
  if (!g('rCur')) { if (D.getElementById('ref')) renderRef(); return; }
  const it = run.list[run.i]; const nx = run.ended ? null : run.list[run.i + 1] || (run.S.loop ? run.list[0] : null);
  const now = Date.now();
  g('rEl').textContent = mmss((now - run.t0) / 1000);
  g('rNow').textContent = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  const v = run.layer?.querySelector('video');
  let rem = '–';
  if (v && v.duration) rem = mmss(v.duration - v.currentTime);
  else if (it && run.auto && !run.paused) { const sec = slideSeconds(it); if (sec) rem = mmss(sec + run.S.trDur - (now - run.slideT0) / 1000); }
  g('rRem').textContent = run.paused ? t('paused') : (run.auto ? rem : t('manual'));
  if (!full) return;
  g('rLbl').textContent = run.ended ? t('endOfShow') : `${t('nowOnBeamer')} · ${run.i + 1} / ${run.list.length}` + (run.black ? ' · ' + t('blackActive') : '');
  g('rCur').replaceChildren(run.ended ? h('div.ref-empty', t('endOfShow')) : refImg(it));
  g('rNext').replaceChildren(refImg(nx));
  g('rNote').textContent = it?.s.note || '–';
  g('rPause').textContent = run.auto && !run.paused ? '⏸ ' + t('auto') : '▶ ' + t('auto');
  g('rBlack').classList.toggle('on', run.black);
  g('rSound').hidden = !v; if (v) g('rSound').textContent = v.muted ? '🔇 ' + t('soundOff') : '🔊 ' + t('soundOn');
  // Leiste aller Dias
  const strip = g('rStrip');
  if (refStripFor !== run.list) {
    refStripFor = run.list;
    clear(strip);
    run.list.forEach((x, i) => {
      const c = h('button.rs', { type: 'button', title: `${i + 1}`, onclick: () => goTo(i, i >= run.i ? 1 : -1) }, h('span', String(i + 1)));
      if (x.type === 'title') c.append(h('em', (x.s.cap || '').slice(0, 30))); else thumb(x.s.path, x.s.page).then((r) => c.prepend(h('img', { src: r.url, alt: '' }))).catch(() => {});
      strip.append(c);
    });
  }
  strip.querySelectorAll('.rs').forEach((c, i) => c.classList.toggle('on', i === run.i));
  strip.children[run.i]?.scrollIntoView({ block: 'nearest', inline: 'center' });
}
