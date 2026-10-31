/* Diashow — Schritt 2: Diashow bearbeiten (Reihenfolge, Dia-Einstellungen, Gesamteinstellungen). */
import { t } from '../i18n.js';
import { $, h, clear, append, msg, dialog, mmss } from '../util.js';
import * as fsx from '../fsx.js';
import { thumb, dateOf, fileOf, forget, kindOf } from '../media.js';
import { cur, changed, onChange, addTitle, TRANSITIONS } from '../show.js';
import { go } from '../app.js';

let root = null; let selId = null; let dragId = null;
const missing = new Set();
const DURS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 45, 60];

export function renderEditor(el) {
  root = el; clear(el); el.classList.remove('pad');
  el.append(h('div.ed', [
    h('div.edmain', [h('div.toolbar#edBar'), h('div.slides#slides')]),
    h('aside.side#edSide'),
  ]));
  renderBar(); renderSlides(); renderSide();
}
onChange((what) => { if (root?.classList.contains('on') && (what === 'slides' || what === 'reload')) { renderSlides(); renderSide(); } });

function renderBar() {
  clear($('edBar')).append(
    h('b', t('order')), h('span.note', t('orderHint')), h('span.sp'),
    h('button.btn', { type: 'button', onclick: () => { const i = idx(selId); const s = addTitle(i < 0 ? 0 : i, t('titleDefault')); selId = s.id; } }, t('addTitle')),
    h('button.btn', { type: 'button', onclick: shuffle }, t('shuffleOnce')),
    h('button.btn', { type: 'button', onclick: sortByDate }, t('sortDate')),
    h('button.btn', { type: 'button', onclick: () => go('lib') }, t('addImages')),
  );
}
const idx = (id) => cur.show.slides.findIndex((s) => s.id === id);

/* ---------- Dia-Raster ---------- */
function renderSlides() {
  const box = $('slides'); if (!box) return;
  const sl = cur.show.slides;
  if (selId && idx(selId) < 0) selId = null;
  if (!selId && sl.length) selId = sl[0].id;
  clear(box);
  if (!sl.length) { box.append(h('p.empty', t('noSlides'))); return; }
  sl.forEach((s, i) => box.append(card(s, i)));
}
function card(s, i) {
  const trName = s.tr ? t('tr_' + s.tr) : t('random');
  const dur = s.dur ? s.dur + ' s' : '';
  const el = h('div.sl' + (s.id === selId ? '.on' : '') + (s.type === 'title' ? '.title' : '') + (missing.has(s.id) ? '.missing' : ''), { draggable: true, dataset: { id: s.id } }, [
    h('div.th', [
      s.type === 'title' ? h('div.tt', s.cap || t('titleSlide')) : h('div.ph'),
      h('span.num', String(i + 1)),
      h('span.trb', trName + (dur ? ' · ' + dur : '')),
      s.kind === 'video' ? h('span.vb', s.sound ? '🔊' : '🔇') : null,
    ]),
    h('div.inf', h('span.nm', s.type === 'title' ? t('titleSlide') : fsx.baseName(s.path) + (s.page ? ' · ' + t('pageN', { p: s.page }) : '')), h('span.dim', s.type === 'title' ? '' : (fsx.parentOf(s.path).split('/').pop() || ''))),
    s.cap && s.type !== 'title' ? h('div.capl', s.cap) : null,
  ]);
  el.onclick = () => { selId = s.id; box().querySelectorAll('.sl').forEach((x) => x.classList.toggle('on', x.dataset.id === selId)); renderSide(); };
  el.ondragstart = (e) => { dragId = s.id; el.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); };
  el.ondragend = () => { el.classList.remove('drag'); box().querySelectorAll('.over').forEach((x) => x.classList.remove('over', 'after')); };
  el.ondragover = (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); el.classList.add('over'); el.classList.toggle('after', e.clientX > r.left + r.width / 2); };
  el.ondragleave = () => el.classList.remove('over', 'after');
  el.ondrop = (e) => {
    e.preventDefault(); const after = el.classList.contains('after'); el.classList.remove('over', 'after');
    const from = idx(dragId); if (from < 0 || dragId === s.id) return;
    const [m] = cur.show.slides.splice(from, 1);
    let to = idx(s.id); if (after) to++;
    cur.show.slides.splice(to, 0, m); selId = m.id; changed(true, 'slides');
  };
  if (s.type === 'file') {
    thumb(s.path, s.page).then((r) => { el.querySelector('.ph')?.replaceWith(h('img', { src: r.url, alt: '', draggable: false })); if (s.kind === 'video' && r.duration) s._dur = r.duration; missing.delete(s.id); el.classList.remove('missing'); })
      .catch(async (e) => {
        try { await fileOf(s.path); el.querySelector('.ph')?.replaceChildren(h('span', s.kind === 'video' ? t('videoUnplayable') : t('noPreview'))); }
        catch { missing.add(s.id); el.classList.add('missing'); el.querySelector('.ph')?.replaceChildren(h('span', t('fileMissing'))); if (s.id === selId) renderSide(); }
      });
  }
  return el;
}
const box = () => $('slides');

/* ---------- Seitenleiste ---------- */
function renderSide() {
  const side = $('edSide'); if (!side) return;
  const s = cur.show.slides[idx(selId)];
  const S = cur.show.settings;
  clear(side);
  side.append(h('div.section-title', t('selSlide')));
  if (!s) side.append(h('p.note', t('noSel')));
  else {
    const pv = h('div.pv');
    if (s.type === 'title') pv.append(h('div.tt', s.cap || ''));
    else thumb(s.path, s.page).then((r) => pv.append(h('img', { src: r.url, alt: '' }))).catch(() => {});
    side.append(pv);
    if (s.type === 'file') side.append(h('div.path', (fsx.rootName() + '/' + s.path).split('/').join(' › ')));
    if (missing.has(s.id)) side.append(h('div.missbox', [h('p.err', t('fileMissingLong')), h('button.btn', { type: 'button', onclick: () => relocate(s) }, t('searchByName'))]));
    append(side, [
      field(s.type === 'title' ? t('titleText') : t('caption'), s.type === 'title'
        ? h('textarea', { rows: 3, value: s.cap || '', oninput: (e) => { s.cap = e.target.value; changed(true, 'meta'); const c = box().querySelector(`[data-id="${s.id}"] .tt`); if (c) c.textContent = s.cap; pv.querySelector('.tt') && (pv.querySelector('.tt').textContent = s.cap); } })
        : h('input', { type: 'text', value: s.cap || '', placeholder: t('captionPh'), oninput: (e) => { s.cap = e.target.value; changed(true, 'meta'); }, onchange: renderSlides })),
      field(t('note'), h('textarea', { rows: 2, value: s.note || '', placeholder: t('notePh'), oninput: (e) => { s.note = e.target.value; changed(true, 'meta'); } })),
      field(t('duration'), sel([['', s.kind === 'video' ? t('untilEnd') : t('standard') + ` (${S.dur} s)`], ...DURS.map((d) => [String(d), d + ' s'])], s.dur ? String(s.dur) : '', (v) => { s.dur = v ? +v : null; changed(true, 'slides'); })),
      field(t('transition'), sel([['', t('random')], ...TRANSITIONS.map((x) => [x, t('tr_' + x)])], s.tr || '', (v) => { s.tr = v; changed(true, 'slides'); })),
      s.kind === 'video' ? h('label.check', h('input', { type: 'checkbox', checked: !!s.sound, onchange: (e) => { s.sound = e.target.checked; changed(true, 'slides'); } }), t('videoSound')) : null,
      s.kind === 'video' ? h('p.note', t('videoNote')) : null,
      h('div.row-actions', [
        h('button.btn', { type: 'button', onclick: () => moveSel(-1), title: t('moveLeft') }, '◀'),
        h('button.btn', { type: 'button', onclick: () => moveSel(1), title: t('moveRight') }, '▶'),
        h('span.sp'),
        h('button.btn', { type: 'button', onclick: () => removeSel() }, t('remove')),
      ]),
      h('p.note.crop', t('cropLater')),
    ]);
  }
  /* Ganze Diashow */
  side.append(h('div.section-title.mt', t('wholeShow')));
  const seg = (val, opts, fn) => h('div.seg', opts.map(([v, l]) => h('button' + (v === val ? '.on' : ''), { type: 'button', onclick: () => { fn(v); changed(true, 'meta'); renderSide(); } }, l)));
  side.append(
    row(t('advance'), seg(S.mode, [['auto', t('auto')], ['manual', t('manual')]], (v) => { S.mode = v; })),
    row(t('defDur'), sel(DURS.map((d) => [String(d), d + ' s']), String(S.dur), (v) => { S.dur = +v; changed(true, 'slides'); })),
    row(t('trDur'), sel([['0.5', '0.5 s'], ['0.8', '0.8 s'], ['1', '1.0 s'], ['1.5', '1.5 s'], ['2', '2.0 s']], String(S.trDur), (v) => { S.trDur = +v; changed(true, 'meta'); })),
    row(t('playOrder'), seg(S.order, [['fixed', t('asAbove')], ['random', t('randomOrder')]], (v) => { S.order = v; })),
    row(t('fit'), seg(S.fit, [['contain', t('fitContain')], ['cover', t('fitCover')]], (v) => { S.fit = v; })),
    chk(t('loop'), S.loop, (v) => { S.loop = v; }),
    chk(t('kenburns'), S.kenburns, (v) => { S.kenburns = v; }),
    chk(t('captions'), S.captions, (v) => { S.captions = v; }),
    h('div.lbl.mt', t('pool')),
    h('div.chips', TRANSITIONS.map((x) => h('button.chip' + (S.pool.includes(x) ? '.on' : ''), { type: 'button', onclick: () => { S.pool = S.pool.includes(x) ? S.pool.filter((y) => y !== x) : [...S.pool, x]; if (!S.pool.length) S.pool = ['fade']; changed(true, 'meta'); renderSide(); } }, t('tr_' + x)))),
    h('p.note', t('poolHint')),
    h('p.note', t('totalTime', { t: mmss(totalSeconds()) })),
  );
}
const field = (label, input) => h('div.f', h('label', label), input);
const row = (label, ctl) => h('div.srow', h('span', label), ctl);
const sel = (opts, val, fn) => h('select', { onchange: (e) => fn(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
const chk = (label, val, fn) => h('label.srow.check', h('span', label), h('input', { type: 'checkbox', checked: val, onchange: (e) => { fn(e.target.checked); changed(true, 'meta'); } }));
function totalSeconds() {
  const S = cur.show.settings;
  return cur.show.slides.reduce((a, s) => a + (s.dur || (s.kind === 'video' ? (s._dur || S.dur) : S.dur)), 0);
}

function moveSel(d) {
  const i = idx(selId); const j = i + d; const sl = cur.show.slides;
  if (i < 0 || j < 0 || j >= sl.length) return;
  [sl[i], sl[j]] = [sl[j], sl[i]]; changed(true, 'slides');
  box().querySelector(`[data-id="${selId}"]`)?.scrollIntoView({ block: 'nearest' });
}
function removeSel() {
  const i = idx(selId); if (i < 0) return;
  cur.show.slides.splice(i, 1);
  selId = cur.show.slides[Math.min(i, cur.show.slides.length - 1)]?.id || null;
  changed(true, 'slides');
}
function shuffle() {
  const a = cur.show.slides;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  changed(true, 'slides');
}
async function sortByDate() {
  const a = cur.show.slides; const dates = new Map();
  const m = msg(t('readingDates', { n: 0, k: a.length }));
  await Promise.all(a.map(async (s) => { if (s.type === 'file') { try { dates.set(s.id, (await dateOf(s.path)).getTime() + (s.page || 0)); } catch { dates.set(s.id, 0); } } }));
  m.remove();
  // Titelfolien bleiben vor dem jeweils folgenden Bild
  const groups = []; let pend = [];
  for (const s of a) { if (s.type === 'title') pend.push(s); else { groups.push({ d: dates.get(s.id), items: [...pend, s] }); pend = []; } }
  groups.sort((x, y) => x.d - y.d);
  cur.show.slides = [...groups.flatMap((g) => g.items), ...pend];
  changed(true, 'slides');
}
async function relocate(s) {
  const name = fsx.baseName(s.path);
  const m = msg(t('searching', { n: name }));
  let hits = [];
  try { hits = await fsx.findByName(name, (d, f) => { m.querySelector('.msg-t').textContent = t('searchingN', { n: name, d, f }); }); } catch (e) { m.remove(); msg(t('listFail') + ' ' + e.message, 'err'); return; }
  m.remove();
  if (!hits.length) { msg(t('notFound', { n: name }), 'err'); return; }
  let pick = hits[0];
  if (hits.length > 1) {
    const r = await dialog(t('searchByName'), h('div.showlist', hits.map((p) => h('button.showitem', { type: 'button', onclick: () => { pick = p; } }, p))), [{ label: t('cancel'), value: null }, { label: 'OK', value: 'ok', primary: true }], { enter: false });
    if (r !== 'ok') return;
  }
  forget(s.path);
  for (const x of cur.show.slides) if (x.path === s.path) { x.path = pick; x.kind = kindOf(pick); missing.delete(x.id); }
  msg(t('relocated', { p: pick }));
  changed(true, 'slides');
}

document.addEventListener('keydown', (e) => {
  if (!root?.classList.contains('on') || document.querySelector('.backdrop')) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'Delete') { e.preventDefault(); removeSel(); }
  if (e.key === 'ArrowLeft' && e.altKey) { e.preventDefault(); moveSel(-1); }
  if (e.key === 'ArrowRight' && e.altKey) { e.preventDefault(); moveSel(1); }
});
