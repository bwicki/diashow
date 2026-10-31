/* Diashow — Schritt 2: Diashow bearbeiten.
 * Reihenfolge, Mehrfachauswahl (Ctrl/Shift-Klick), Dia-Einstellungen,
 * Titelfolien-Editor (Farben, Schrift, Logo, Hintergrundbild) und Wasserzeichen.
 */
import { t } from '../i18n.js';
import { $, h, clear, append, msg, dialog, mmss } from '../util.js';
import * as fsx from '../fsx.js';
import { thumb, dateOf, fileOf, forget, kindOf } from '../media.js';
import { cur, changed, onChange, addTitle, TRANSITIONS } from '../show.js';
import { titleNode, wmNode, tstyle, PRESETS, WM_DEFAULT, BUILTIN } from '../render.js';
import { pickImage } from './picker.js';
import { go } from '../app.js';

let root = null; let selId = null; let dragId = null; let anchor = null;
const multi = new Set();      // Mehrfachauswahl (enthält immer selId)
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
    h('button.btn', { type: 'button', onclick: () => { const i = idx(selId); const s = addTitle(i < 0 ? 0 : i, t('titleDefault')); selectOnly(s.id); changed(true, 'slides'); } }, t('addTitle')),
    h('button.btn', { type: 'button', onclick: selectAllSlides }, t('selectAllSlides')),
    h('button.btn', { type: 'button', onclick: shuffle }, t('shuffleOnce')),
    h('button.btn', { type: 'button', onclick: sortByDate }, t('sortDate')),
    h('button.btn', { type: 'button', onclick: () => go('lib') }, t('addImages')),
  );
}
const idx = (id) => cur.show.slides.findIndex((s) => s.id === id);
const box = () => $('slides');
const selected = () => cur.show.slides.filter((s) => multi.has(s.id));
function selectOnly(id) { selId = id; anchor = id; multi.clear(); if (id) multi.add(id); }
function selectAllSlides() { multi.clear(); cur.show.slides.forEach((s) => multi.add(s.id)); markSel(); renderSide(); }
function markSel() { box()?.querySelectorAll('.sl').forEach((x) => { x.classList.toggle('on', multi.has(x.dataset.id)); x.classList.toggle('prim', x.dataset.id === selId); }); }

/* ---------- Dia-Raster ---------- */
function renderSlides() {
  const b = box(); if (!b) return;
  const sl = cur.show.slides;
  for (const id of [...multi]) if (idx(id) < 0) multi.delete(id);
  if (selId && idx(selId) < 0) selId = null;
  if (!selId && sl.length) selectOnly(sl[0].id);
  if (selId) multi.add(selId);
  clear(b);
  if (!sl.length) { b.append(h('p.empty', t('noSlides'))); return; }
  sl.forEach((s, i) => b.append(card(s, i)));
  markSel();
}
function thContent(s) {
  const n = [];
  if (s.type === 'title') n.push(titleNode(s)); else n.push(h('div.ph'));
  const w = wmNode(s.wm); if (w) n.push(w);
  return n;
}
function card(s, i) {
  const trName = s.tr ? t('tr_' + s.tr) : t('random');
  const dur = s.dur ? s.dur + ' s' : '';
  const el = h('div.sl' + (s.type === 'title' ? '.title' : '') + (missing.has(s.id) ? '.missing' : ''), { draggable: true, dataset: { id: s.id } }, [
    h('div.th', [
      h('div.thc', thContent(s)),
      h('span.num', String(i + 1)),
      h('span.trb', trName + (dur ? ' · ' + dur : '')),
      s.kind === 'video' ? h('span.vb', s.sound ? '🔊' : '🔇') : null,
      s.wm?.path ? h('span.wmb', { title: t('watermark') }, '©') : null,
    ]),
    h('div.inf', h('span.nm', s.type === 'title' ? t('titleSlide') : fsx.baseName(s.path) + (s.page ? ' · ' + t('pageN', { p: s.page }) : '')), h('span.dim', s.type === 'title' ? '' : (fsx.parentOf(s.path).split('/').pop() || ''))),
    s.cap && s.type !== 'title' ? h('div.capl', s.cap) : null,
  ]);
  el.onclick = (e) => {
    if (e.ctrlKey || e.metaKey) { if (multi.has(s.id) && multi.size > 1) { multi.delete(s.id); if (selId === s.id) selId = [...multi][0]; } else { multi.add(s.id); selId = s.id; } anchor = s.id; }
    else if (e.shiftKey && anchor) { const a = idx(anchor), b = idx(s.id); multi.clear(); for (let k = Math.min(a, b); k <= Math.max(a, b); k++) multi.add(cur.show.slides[k].id); selId = s.id; }
    else selectOnly(s.id);
    markSel(); renderSide();
  };
  el.ondragstart = (e) => { dragId = s.id; el.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.id); };
  el.ondragend = () => { el.classList.remove('drag'); box().querySelectorAll('.over').forEach((x) => x.classList.remove('over', 'after')); };
  el.ondragover = (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); el.classList.add('over'); el.classList.toggle('after', e.clientX > r.left + r.width / 2); };
  el.ondragleave = () => el.classList.remove('over', 'after');
  el.ondrop = (e) => {
    e.preventDefault(); const after = el.classList.contains('after'); el.classList.remove('over', 'after');
    if (!dragId || dragId === s.id) return;
    // gezogenes Dia – bei Mehrfachauswahl alle markierten – vor/nach das Ziel setzen
    const moving = multi.has(dragId) && multi.size > 1 ? selected() : [cur.show.slides[idx(dragId)]];
    if (moving.some((m) => m.id === s.id)) return;
    cur.show.slides = cur.show.slides.filter((x) => !moving.includes(x));
    let to = idx(s.id); if (after) to++;
    cur.show.slides.splice(to, 0, ...moving); changed(true, 'slides');
  };
  if (s.type === 'file') {
    thumb(s.path, s.page).then((r) => { el.querySelector('.ph')?.replaceWith(h('img', { src: r.url, alt: '', draggable: false })); if (s.kind === 'video' && r.duration) s._dur = r.duration; missing.delete(s.id); el.classList.remove('missing'); })
      .catch(async () => {
        try { await fileOf(s.path); el.querySelector('.ph')?.replaceChildren(h('span', s.kind === 'video' ? t('videoUnplayable') : t('noPreview'))); }
        catch { missing.add(s.id); el.classList.add('missing'); el.querySelector('.ph')?.replaceChildren(h('span', t('fileMissing'))); if (s.id === selId) renderSide(); }
      });
  }
  return el;
}
/** Nur die Vorschau einer Kachel neu zeichnen (beim Tippen im Titel-Editor). */
function refreshCard(s) {
  const el = box()?.querySelector(`[data-id="${s.id}"] .thc`); if (!el) return;
  const img = el.querySelector(':scope > img:not(.wm)');
  clear(el); append(el, s.type === 'title' ? [titleNode(s)] : [img || h('div.ph')]);
  const w = wmNode(s.wm); if (w) el.append(w);
}

/* ---------- Seitenleiste ---------- */
const field = (label, input) => h('div.f', h('label', label), input);
const row = (label, ctl) => h('div.srow', h('span', label), ctl);
const sel = (opts, val, fn) => h('select', { onchange: (e) => fn(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
const chk = (label, val, fn) => h('label.srow.check', h('span', label), h('input', { type: 'checkbox', checked: val, onchange: (e) => { fn(e.target.checked); changed(true, 'meta'); } }));
const range = (min, max, stepv, val, fn, fmt = (v) => v) => { const out = h('span.rv', fmt(val)); return h('span.rng', h('input', { type: 'range', min, max, step: stepv, value: val, oninput: (e) => { const v = +e.target.value; out.textContent = fmt(v); fn(v); } }), out); };
const color = (val, fn) => h('input.col', { type: 'color', value: val, oninput: (e) => fn(e.target.value) });
const seg = (val, opts, fn) => h('div.seg', opts.map(([v, l]) => h('button' + (v === val ? '.on' : ''), { type: 'button', onclick: (e) => { fn(v); e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); } }, l)));
const logoLabel = (p) => (p ? (BUILTIN.find((b) => b.path === p)?.name || fsx.baseName(p)) : t('none'));

function renderSide() {
  const side = $('edSide'); if (!side) return;
  const scroll = side.scrollTop;
  clear(side);
  const sels = selected();
  if (sels.length > 1) renderMulti(side, sels);
  else {
    const s = cur.show.slides[idx(selId)];
    side.append(h('div.section-title', t('selSlide')));
    if (!s) side.append(h('p.note', t('noSel')));
    else renderSingle(side, s);
  }
  renderWhole(side);
  side.scrollTop = scroll;
}

function preview(s) {
  const pv = h('div.pv');
  const fill = () => {
    clear(pv);
    if (s.type === 'title') pv.append(titleNode(s));
    else { const im = h('img', { alt: '' }); pv.append(im); thumb(s.path, s.page).then((r) => { im.src = r.url; }).catch(() => {}); }
    const w = wmNode(s.wm); if (w) pv.append(w);
  };
  fill(); pv._fill = fill;
  return pv;
}

function renderSingle(side, s) {
  const S = cur.show.settings;
  const pv = preview(s);
  const upd = () => { changed(true, 'meta'); pv._fill(); refreshCard(s); };
  side.append(pv);
  if (s.type === 'file') side.append(h('div.path', (fsx.rootName() + '/' + s.path).split('/').join(' › ')));
  if (missing.has(s.id)) side.append(h('div.missbox', [h('p.err', t('fileMissingLong')), h('button.btn', { type: 'button', onclick: () => relocate(s) }, t('searchByName'))]));

  if (s.type === 'title') renderTitleEditor(side, s, upd);
  else append(side, [
    field(t('caption'), h('input', { type: 'text', value: s.cap || '', placeholder: t('captionPh'), oninput: (e) => { s.cap = e.target.value; changed(true, 'meta'); }, onchange: renderSlides })),
  ]);
  append(side, [
    field(t('note'), h('textarea', { rows: 2, value: s.note || '', placeholder: t('notePh'), oninput: (e) => { s.note = e.target.value; changed(true, 'meta'); } })),
    field(t('duration'), sel([['', s.kind === 'video' ? t('untilEnd') : t('standard') + ` (${S.dur} s)`], ...DURS.map((d) => [String(d), d + ' s'])], s.dur ? String(s.dur) : '', (v) => { s.dur = v ? +v : null; changed(true, 'slides'); })),
    field(t('transition'), sel([['', t('random')], ...TRANSITIONS.map((x) => [x, t('tr_' + x)])], s.tr || '', (v) => { s.tr = v; changed(true, 'slides'); })),
    s.kind === 'video' ? h('label.check', h('input', { type: 'checkbox', checked: !!s.sound, onchange: (e) => { s.sound = e.target.checked; changed(true, 'slides'); } }), t('videoSound')) : null,
    s.kind === 'video' ? h('p.note', t('videoNote')) : null,
  ]);
  renderWatermark(side, [s], () => { pv._fill(); refreshCard(s); });
  append(side, [
    h('div.row-actions.mt', [
      h('button.btn', { type: 'button', onclick: () => moveSel(-1), title: t('moveLeft') }, '◀'),
      h('button.btn', { type: 'button', onclick: () => moveSel(1), title: t('moveRight') }, '▶'),
      s.type === 'title' ? h('button.btn', { type: 'button', onclick: () => duplicate(s) }, t('duplicate')) : null,
      h('span.sp'),
      h('button.btn', { type: 'button', onclick: removeSel }, t('remove')),
    ]),
    s.type === 'file' ? h('p.note.crop', t('cropLater')) : null,
  ]);
}

/* ---------- Titelfolien-Editor ---------- */
function renderTitleEditor(side, s, upd) {
  const ts = () => (s.ts = s.ts || {});
  const st = tstyle(s);
  const set = (k, v) => { ts()[k] = v; upd(); };
  const bgRow = h('div');
  const drawBg = () => {
    const cs = tstyle(s);
    clear(bgRow);
    if (cs.bg === 'gradient') bgRow.append(row(t('colors'), h('span.inline', color(cs.c1, (v) => set('c1', v)), color(cs.c2, (v) => set('c2', v)))));
    if (cs.bg === 'solid') bgRow.append(row(t('color'), color(cs.c1, (v) => set('c1', v))));
    if (cs.bg === 'image') bgRow.append(
      row(t('bgImage'), h('span.inline', h('span.small', logoLabel(cs.bgPath)), h('button.btn.mini', { type: 'button', onclick: async () => { const p = await pickImage(t('bgImage'), cs.bgPath); if (p) { set('bgPath', p); drawBg(); } } }, t('choose')))),
      row(t('darken'), range(0, 0.8, 0.05, cs.dim, (v) => set('dim', v), (v) => Math.round(v * 100) + ' %')));
  };
  drawBg();
  append(side, [
    h('div.section-title.mt', t('titleEditor')),
    field(t('titleText'), h('textarea', { rows: 3, value: s.cap || '', oninput: (e) => { s.cap = e.target.value; upd(); } })),
    field(t('subtitle'), h('textarea', { rows: 2, value: s.sub || '', placeholder: t('subtitlePh'), oninput: (e) => { s.sub = e.target.value; upd(); } })),
    h('div.lbl.mt', t('presets')),
    h('div.chips', Object.entries(PRESETS).map(([k, p]) => h('button.chip.preset', { type: 'button', style: { background: p.bg === 'solid' ? p.c1 : `linear-gradient(135deg, ${p.c1}, ${p.c2})`, color: p.color, borderColor: '#97a1b0' }, onclick: () => { Object.assign(ts(), p); upd(); renderSide(); } }, t('preset_' + k)))),
    h('div.lbl.mt', t('background')),
    row(t('bgType'), seg(st.bg, [['gradient', t('bgGradient')], ['solid', t('bgSolid')], ['image', t('bgImageShort')]], (v) => { set('bg', v); drawBg(); })),
    bgRow,
    h('div.lbl.mt', t('font')),
    row(t('textColor'), color(st.color, (v) => set('color', v))),
    row(t('textSize'), range(3, 20, 0.5, st.size, (v) => set('size', v))),
    row(t('subSize'), range(2, 10, 0.5, st.subSize, (v) => set('subSize', v))),
    row(t('fontFamily'), sel([['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono']], st.font, (v) => set('font', v))),
    chk(t('bold'), st.bold, (v) => set('bold', v)),
    row(t('alignH'), seg(st.align, [['left', '⟸'], ['center', '≡'], ['right', '⟹']], (v) => set('align', v))),
    row(t('alignV'), seg(st.valign, [['top', t('top')], ['middle', t('middle')], ['bottom', t('bottom')]], (v) => set('valign', v))),
    h('div.lbl.mt', t('logo')),
    row(t('logo'), h('span.inline', h('span.small', logoLabel(st.logoPath)),
      h('button.btn.mini', { type: 'button', onclick: async () => { const p = await pickImage(t('logo'), st.logoPath); if (p) { set('logoPath', p); renderSide(); } } }, t('choose')),
      st.logoPath ? h('button.btn.mini', { type: 'button', onclick: () => { set('logoPath', ''); renderSide(); } }, '✕') : null)),
    st.logoPath ? row(t('position'), sel([['above', t('pos_above')], ['below', t('pos_below')], ['tl', t('pos_tl')], ['tc', t('pos_tc')], ['tr', t('pos_tr')], ['bl', t('pos_bl')], ['bc', t('pos_bc')], ['br', t('pos_br')]], st.logoPos, (v) => set('logoPos', v))) : null,
    st.logoPath ? row(t('logoSize'), range(5, 60, 1, st.logoSize, (v) => set('logoSize', v))) : null,
  ]);
}

/* ---------- Wasserzeichen (ein oder mehrere Dias) ---------- */
function renderWatermark(side, list, redraw) {
  const first = list.find((x) => x.wm?.path)?.wm;
  const w = { ...WM_DEFAULT, ...(first || {}) };
  const n = list.filter((x) => x.wm?.path).length;
  const apply = (patch) => { for (const s of list) { s.wm = { ...WM_DEFAULT, ...(s.wm || {}), ...patch }; if (!s.wm.path) delete s.wm; } changed(true, 'meta'); for (const s of list) refreshCard(s); redraw?.(); };
  append(side, [
    h('div.section-title.mt', t('watermark') + (list.length > 1 ? ` · ${t('wmOnN', { n, k: list.length })}` : '')),
    row(t('logo'), h('span.inline', h('span.small', first ? logoLabel(first.path) : t('none')),
      h('button.btn.mini', { type: 'button', onclick: async () => { const p = await pickImage(t('watermark'), first?.path); if (p) { apply({ path: p }); renderSide(); } } }, t('choose')),
      first ? h('button.btn.mini', { type: 'button', title: t('wmRemove'), onclick: () => { for (const s of list) delete s.wm; changed(true, 'meta'); list.forEach(refreshCard); renderSide(); } }, '✕') : null)),
    first ? row(t('position'), sel([['tl', t('pos_tl')], ['tc', t('pos_tc')], ['tr', t('pos_tr')], ['c', t('pos_c')], ['bl', t('pos_bl')], ['bc', t('pos_bc')], ['br', t('pos_br')]], w.pos, (v) => apply({ pos: v }))) : null,
    first ? row(t('logoSize'), range(4, 40, 1, w.size, (v) => apply({ size: v }))) : null,
    first ? row(t('opacity'), range(0.1, 1, 0.05, w.op, (v) => apply({ op: v }), (v) => Math.round(v * 100) + ' %')) : null,
    h('p.note', t('wmHint')),
  ]);
}

/* ---------- Mehrfachauswahl ---------- */
function renderMulti(side, list) {
  append(side, [
    h('div.section-title', t('multiSel', { n: list.length })),
    h('p.note', t('multiHint')),
    field(t('duration'), sel([['', t('noChange')], ['std', t('standard')], ...DURS.map((d) => [String(d), d + ' s'])], '', (v) => { if (!v) return; for (const s of list) s.dur = v === 'std' ? null : +v; changed(true, 'slides'); })),
    field(t('transition'), sel([['', t('noChange')], ['rnd', t('random')], ...TRANSITIONS.map((x) => [x, t('tr_' + x)])], '', (v) => { if (!v) return; for (const s of list) s.tr = v === 'rnd' ? '' : v; changed(true, 'slides'); })),
  ]);
  renderWatermark(side, list);
  side.append(h('div.row-actions.mt', [h('button.btn', { type: 'button', onclick: () => { selectOnly(selId); markSel(); renderSide(); } }, t('selectNone')), h('span.sp'), h('button.btn', { type: 'button', onclick: removeSel }, t('removeN', { n: list.length }))]));
}

/* ---------- Ganze Diashow ---------- */
function renderWhole(side) {
  const S = cur.show.settings;
  const segR = (val, opts, fn) => seg(val, opts, (v) => { fn(v); changed(true, 'meta'); });
  append(side, [
    h('div.section-title.mt', t('wholeShow')),
    row(t('advance'), segR(S.mode, [['auto', t('auto')], ['manual', t('manual')]], (v) => { S.mode = v; })),
    row(t('defDur'), sel(DURS.map((d) => [String(d), d + ' s']), String(S.dur), (v) => { S.dur = +v; changed(true, 'slides'); })),
    row(t('trDur'), sel([['0.5', '0.5 s'], ['0.8', '0.8 s'], ['1', '1.0 s'], ['1.5', '1.5 s'], ['2', '2.0 s']], String(S.trDur), (v) => { S.trDur = +v; changed(true, 'meta'); })),
    row(t('playOrder'), segR(S.order, [['fixed', t('asAbove')], ['random', t('randomOrder')]], (v) => { S.order = v; })),
    row(t('fit'), segR(S.fit, [['contain', t('fitContain')], ['cover', t('fitCover')]], (v) => { S.fit = v; })),
    chk(t('loop'), S.loop, (v) => { S.loop = v; }),
    chk(t('kenburns'), S.kenburns, (v) => { S.kenburns = v; }),
    chk(t('captions'), S.captions, (v) => { S.captions = v; }),
    chk(t('defWm'), S.defWm, (v) => { S.defWm = v; }),
    h('div.lbl.mt', t('pool')),
    h('div.chips', TRANSITIONS.map((x) => h('button.chip' + (S.pool.includes(x) ? '.on' : ''), { type: 'button', onclick: () => { S.pool = S.pool.includes(x) ? S.pool.filter((y) => y !== x) : [...S.pool, x]; if (!S.pool.length) S.pool = ['fade']; changed(true, 'meta'); renderSide(); } }, t('tr_' + x)))),
    h('p.note', t('poolHint')),
    h('p.note', t('totalTime', { t: mmss(totalSeconds()) })),
  ]);
}
function totalSeconds() {
  const S = cur.show.settings;
  return cur.show.slides.reduce((a, s) => a + (s.dur || (s.kind === 'video' ? (s._dur || S.dur) : S.dur)), 0);
}

/* ---------- Aktionen ---------- */
function moveSel(d) {
  const i = idx(selId); const j = i + d; const sl = cur.show.slides;
  if (i < 0 || j < 0 || j >= sl.length) return;
  [sl[i], sl[j]] = [sl[j], sl[i]]; changed(true, 'slides');
  box().querySelector(`[data-id="${selId}"]`)?.scrollIntoView({ block: 'nearest' });
}
function removeSel() {
  const first = Math.min(...[...multi].map(idx).filter((i) => i >= 0));
  cur.show.slides = cur.show.slides.filter((s) => !multi.has(s.id));
  const next = cur.show.slides[Math.min(first, cur.show.slides.length - 1)];
  selectOnly(next?.id || null);
  changed(true, 'slides');
}
function duplicate(s) {
  const c = JSON.parse(JSON.stringify(s)); c.id = Math.random().toString(36).slice(2, 10);
  cur.show.slides.splice(idx(s.id) + 1, 0, c); selectOnly(c.id); changed(true, 'slides');
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAllSlides(); }
  if (e.key === 'Escape' && multi.size > 1) { selectOnly(selId); markSel(); renderSide(); }
});
