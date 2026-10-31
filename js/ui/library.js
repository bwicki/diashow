/* Diashow — Schritt 1: Bilder auswählen (Ordnerbaum, grosse Vorschau, Klickbox, Grossansicht). */
import { t } from '../i18n.js';
import { $, h, clear, load, save, msg, dialog, fmtDate, mmss } from '../util.js';
import * as fsx from '../fsx.js';
import { kindOf, extOf, thumb, dateOf, imageBlob, pdfPages, fileOf, qualityFlags, hamming } from '../media.js';
import { cur, hasSlide, toggleSlide, addSlide, countPages, changed, onChange } from '../show.js';
import { go } from '../app.js';

const st = {
  path: load('diashow.lib.path', ''),
  open: new Set(load('diashow.lib.open', [''])),
  sub: load('diashow.lib.sub', true),
  sort: load('diashow.lib.sort', 'folder'),
  filter: load('diashow.lib.filter', 'all'),
  size: load('diashow.lib.size', 240),
  list: [],
  q: new Map(),     // Pfad -> {flags, hash, size, dup:[Pfade]} für Qualitätshinweise
  bad: new Set(),   // Pfade, die nicht darstellbar sind (z. B. Video-Codec)
};
const persist = () => { save('diashow.lib.path', st.path); save('diashow.lib.open', [...st.open]); save('diashow.lib.sub', st.sub); save('diashow.lib.sort', st.sort); save('diashow.lib.filter', st.filter); save('diashow.lib.size', st.size); };

let root = null; let gridEl = null; let io = null; let token = 0;

export function renderLibrary(el) {
  root = el; clear(el); el.classList.remove('pad');
  el.append(h('div.lib', [
    h('aside.tree', [
      h('div.rootbox', [h('div.lbl', t('rootFolder')), h('div.rootname', '📁 ' + fsx.rootName())]),
      h('div.tree-nodes#treeNodes'),
    ]),
    h('div.libmain', [h('div.toolbar#libBar'), h('div.grid#grid')]),
    h('div.tray#tray'),
  ]));
  gridEl = $('grid');
  gridEl.style.setProperty('--tw', st.size + 'px');
  renderTree(); renderBar(); renderTray(); loadGrid();
}
onChange((what) => { if (root?.classList.contains('on') && what === 'slides') { renderTray(); refreshTiles(); } });

/* ---------- Ordnerbaum ---------- */
async function renderTree() {
  const box = $('treeNodes'); if (!box) return;
  const frag = document.createDocumentFragment();
  async function node(path, depth) {
    const name = path ? fsx.baseName(path) : fsx.rootName();
    let sub = [];
    try { sub = (await fsx.listDir(path)).dirs; } catch { /* gesperrt */ }
    const isOpen = st.open.has(path);
    const sel = cur.show.slides.filter((s) => s.type === 'file' && (path === '' || s.path.startsWith(path + '/'))).length;
    const n = h('div.node' + (path === st.path ? '.on' : '') + (path === fsx.SHOWDIR ? '.dim' : ''), { style: { paddingLeft: 8 + depth * 14 + 'px' }, title: path || fsx.rootName() },
      h('span.tw', { onclick: (e) => { e.stopPropagation(); if (!sub.length) return; isOpen ? st.open.delete(path) : st.open.add(path); persist(); renderTree(); } }, sub.length ? (isOpen ? '▾' : '▸') : ''),
      h('span.nm', name), sel ? h('span.selc', String(sel)) : null);
    n.onclick = () => { st.path = path; st.open.add(path); persist(); renderTree(); renderBar(); loadGrid(); };
    frag.appendChild(n);
    if (isOpen) for (const d of sub) await node(path ? path + '/' + d : d, depth + 1);
  }
  await node('', 0);
  clear(box).appendChild(frag);
}

/* ---------- Werkzeugleiste ---------- */
function renderBar() {
  const bar = $('libBar'); if (!bar) return;
  const sel = (id, val, opts, fn) => h('select#' + id, { onchange: (e) => fn(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
  clear(bar).append(
    h('div.crumbs', (st.path || fsx.rootName()).split('/').join(' › ')),
    h('span.sp'),
    h('label.ctl', t('sort'), sel('lSort', st.sort, [['folder', t('byFolder')], ['date', t('byDate')]], (v) => { st.sort = v; persist(); loadGrid(); })),
    h('label.ctl', t('show'), sel('lFilter', st.filter, [['all', t('fAll')], ['img', t('fImg')], ['pdf', t('fPdf')], ['video', t('fVideo')]], (v) => { st.filter = v; persist(); loadGrid(); })),
    h('label.ctl', h('input', { type: 'checkbox', checked: st.sub, onchange: (e) => { st.sub = e.target.checked; persist(); loadGrid(); } }), t('subfolders')),
    h('label.ctl', t('size'), h('input', { type: 'range', min: 140, max: 520, value: st.size, oninput: (e) => { st.size = +e.target.value; gridEl.style.setProperty('--tw', st.size + 'px'); }, onchange: persist })),
    h('span.qlegend', { title: t('qLegendTip') }, h('span.qf.lowres.warn', '▦'), t('qL1'), h('span.qf.blur', '◌'), t('qL2'), h('span.qf.dup', '⧉'), t('qL3')),
    h('button.btn', { type: 'button', onclick: selectAll }, t('selectAll')),
    h('button.btn.icon', { type: 'button', title: t('reload'), onclick: () => { fsx.invalidate(); renderTree(); loadGrid(); } }, '↻'),
  );
}

/* ---------- Am Ende eines Ordners: weiter im nächsten Ordner des Baums ---------- */
async function folderOrder() {
  const out = [];
  async function rec(p) { out.push(p); let d = []; try { d = (await fsx.listDir(p)).dirs; } catch { /* gesperrt */ } for (const x of d) { const c = p ? p + '/' + x : x; if (c !== fsx.SHOWDIR) await rec(c); } }
  await rec('');
  return out;
}
async function nextFolder() {
  const order = await folderOrder();
  const inside = (p) => st.sub && st.path !== '' && p.startsWith(st.path + '/');
  let i = order.indexOf(st.path);
  for (let k = i + 1; k < order.length; k++) {
    const p = order[k];
    if (inside(p)) continue;
    const prev = st.path;
    st.path = p;
    await loadGrid(true);
    if (st.list.length) {
      // Baum bis zum neuen Ordner aufklappen
      let a = ''; for (const part of p.split('/')) { st.open.add(a); a = a ? a + '/' + part : part; }
      st.open.add(p); persist(); renderTree(); renderBar();
      closeLb(); openLb(0); flash(t('lbNextFolder', { f: p.split('/').join(' › ') }));
      return true;
    }
    st.path = prev;
  }
  await loadGrid(true);
  return false;
}

/* ---------- Raster ---------- */
async function loadGrid(quiet) {
  const my = ++token;
  if (!quiet) clear(gridEl).append(h('div.loading', t('loading')));
  let files;
  try {
    files = (st.sub && st.path !== '') ? await fsx.walk(st.path, (d, f) => { if (my === token && !quiet) gridEl.firstChild.textContent = t('loadingN', { d, f }); }, (p) => p === fsx.SHOWDIR && st.path !== fsx.SHOWDIR) : (await fsx.listDir(st.path)).files;
  } catch (e) { if (my === token) clear(gridEl).append(h('p.err', t('listFail') + ' ' + (e?.message || e))); return; }
  if (my !== token) return;
  let list = files.map((f) => ({ path: f.path, name: f.name, kind: kindOf(f.name) }));
  const hidden = list.filter((f) => !f.kind).length;
  list = list.filter((f) => f.kind);
  if (st.filter === 'img') list = list.filter((f) => f.kind !== 'pdf' && f.kind !== 'video');
  if (st.filter === 'pdf') list = list.filter((f) => f.kind === 'pdf');
  if (st.filter === 'video') list = list.filter((f) => f.kind === 'video');
  if (st.sort === 'date') {
    let n = 0;
    await Promise.all(list.map(async (f) => { try { f.date = await dateOf(f.path); } catch { f.date = new Date(0); } n++; if (my === token && !quiet && n % 10 === 0) gridEl.firstChild.textContent = t('readingDates', { n, k: list.length }); }));
    if (my !== token) return;
    list.sort((a, b) => a.date - b.date);
  }
  st.list = list; st.q = new Map();
  renderGrid(hidden);
}
function groupOf(f) {
  if (st.sort === 'date') return f.date && f.date.getTime() ? f.date.toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '–';
  const rel = fsx.parentOf(f.path);
  return rel === st.path ? (st.path ? fsx.baseName(st.path) : fsx.rootName()) : rel.slice(st.path ? st.path.length + 1 : 0);
}
function renderGrid(hidden) {
  clear(gridEl);
  io?.disconnect();
  io = new IntersectionObserver((ents) => { for (const e of ents) if (e.isIntersecting) { io.unobserve(e.target); fillThumb(e.target); } }, { root: gridEl, rootMargin: '800px' });
  if (!st.list.length) { gridEl.append(h('p.empty', st.path === '' ? t('pickFolder') : t('emptyFolder'))); return; }
  let last = null; let gi = 0;
  st.list.forEach((f, i) => {
    const g = groupOf(f);
    if (g !== last) { const cnt = st.list.filter((x) => groupOf(x) === g).length; gridEl.append(h('div.ghead', h('span', g), h('span.dim', `${cnt}`))); last = g; gi++; }
    gridEl.append(tile(f, i));
  });
  if (hidden) gridEl.append(h('p.note.gfoot', t('hiddenFiles', { n: hidden })));
}
function tile(f, i) {
  const el = h('div.tile', { dataset: { i, path: f.path } }, [
    h('div.ph', h('span', extOf(f.name).toUpperCase())),
    f.kind === 'pdf' ? null : h('button.cb', { type: 'button', title: t('select'), onclick: (e) => { e.stopPropagation(); if (st.bad.has(f.path)) return; toggleSlide(f.path); } }),
    h('span.badge2', extOf(f.name).toUpperCase()),
    h('div.meta', h('span.nm', f.name), f.date ? h('span', fmtDate(f.date)) : null),
  ]);
  el.onclick = () => openLb(i);
  markTile(el, f);
  io.observe(el);
  return el;
}
function markTile(el, f) {
  if (f.kind === 'pdf') { const n = countPages(f.path); el.classList.toggle('sel', n > 0); el.querySelector('.badge2').textContent = 'PDF' + (n ? ' · ' + t('pagesSel', { n }) : ''); }
  else el.classList.toggle('sel', hasSlide(f.path));
  el.classList.toggle('bad', st.bad.has(f.path));
}
function refreshTiles() { gridEl?.querySelectorAll('.tile').forEach((el) => { const f = st.list[+el.dataset.i]; if (f) markTile(el, f); }); }
async function fillThumb(el) {
  const f = st.list[+el.dataset.i]; if (!f) return;
  try {
    const r = await thumb(f.path, f.kind === 'pdf' ? 1 : undefined);
    const img = h('img', { src: r.url, alt: '', loading: 'lazy', draggable: false });
    el.querySelector('.ph').replaceWith(img);
    if (f.kind === 'video' && r.duration) el.querySelector('.badge2').textContent = extOf(f.name).toUpperCase() + ' · ' + mmss(r.duration);
    if (f.kind === 'pdf' && r.pages) el.querySelector('.meta .nm').textContent = `${f.name} · ${r.pages} ${t('pagesN')}`;
    noteQuality(f, r);
  } catch (e) {
    const ph = el.querySelector('.ph');
    if (f.kind === 'video') { st.bad.add(f.path); markTile(el, f); if (ph) ph.innerHTML = `<span>${t('videoUnplayable')}</span>`; el.title = t('videoUnplayableTip'); }
    else if (ph) { ph.innerHTML = `<span>${t('noPreview')}</span>`; el.title = String(e?.message || e); }
  }
}
/* ---------- Qualitätshinweise: Auflösung, Schärfe, Doubletten ---------- */
const isPhoto = (f) => f.kind === 'image' || f.kind === 'heic' || f.kind === 'raw';
function noteQuality(f, r) {
  if (!isPhoto(f)) return;
  const q = { flags: qualityFlags(r), hash: r.hash, size: r.size, w: r.w, h: r.h, sharp: r.sharp, dup: [] };
  // mit allen bereits analysierten Bildern dieser Ansicht vergleichen
  for (const [p, o] of st.q) {
    if (!o.hash || !q.hash) continue;
    const d = hamming(o.hash, q.hash);
    if (d <= 4 || (o.size === q.size && d <= 10)) { o.dup.push(f.path); q.dup.push(p); paintFlags(p); }
  }
  st.q.set(f.path, q);
  paintFlags(f.path);
}
function flagList(path) {
  const q = st.q.get(path); if (!q) return [];
  const out = [];
  if (q.flags.lowres) out.push({ cls: 'lowres ' + q.flags.lowres, icon: '▦', tip: t('qLowres', { w: q.w, h: q.h }) + (q.flags.lowres === 'bad' ? ' ' + t('qLowresBad') : '') });
  if (q.flags.blur) out.push({ cls: 'blur', icon: '◌', tip: t('qBlur', { v: q.sharp }) });
  if (q.dup.length) out.push({ cls: 'dup', icon: '⧉', tip: t('qDup', { n: q.dup.map((p) => fsx.baseName(p)).slice(0, 4).join(', ') + (q.dup.length > 4 ? ' …' : '') }) });
  return out;
}
function paintFlags(path) {
  const el = gridEl?.querySelector(`.tile[data-path="${CSS.escape(path)}"]`); if (!el) return;
  el.querySelector('.qflags')?.remove();
  const fl = flagList(path); if (!fl.length) return;
  el.append(h('div.qflags', fl.map((x) => h('span.qf.' + x.cls.split(' ').join('.'), { title: x.tip }, x.icon))));
}
function selectAll() {
  let n = 0;
  for (const f of st.list) if (f.kind !== 'pdf' && !st.bad.has(f.path) && !hasSlide(f.path)) { addSlide(f.path); n++; }
  changed(true, 'slides');
  msg(t('addedN', { n }));
}

/* ---------- Ablage unten ---------- */
let trayToken = 0;
async function renderTray() {
  const tr = $('tray'); if (!tr) return;
  const my = ++trayToken;
  const slides = cur.show.slides.filter((s) => s.type === 'file');
  const strip = h('div.strip');
  clear(tr).append(
    h('b', t('selectedN', { n: slides.length })), strip,
    h('button.btn', { type: 'button', disabled: !slides.length, onclick: clearSel }, t('clearSel')),
    h('button.btn.primary', { type: 'button', onclick: () => go('ed') }, t('toEditor')),
  );
  for (const s of slides.slice(-24).reverse()) {
    const d = h('div.mini'); strip.appendChild(d);
    thumb(s.path, s.page).then((r) => { if (my === trayToken) d.appendChild(h('img', { src: r.url, alt: '' })); }).catch(() => {});
  }
}
async function clearSel() {
  const r = await dialog(t('clearSel'), h('p', t('clearSelQ')), [{ label: t('cancel'), value: null }, { label: t('clearSel'), value: 'ok', primary: true }]);
  if (r !== 'ok') return;
  cur.show.slides = cur.show.slides.filter((s) => s.type !== 'file');
  changed(true, 'slides');
}

/* ---------- Grossansicht ---------- */
let lb = null;
function openLb(i) {
  closeLb();
  lb = { i, url: null, el: h('div.lb') };
  document.body.appendChild(lb.el);
  document.addEventListener('keydown', lbKey, true);
  renderLb();
}
function closeLb() {
  if (!lb) return;
  if (lb.url) URL.revokeObjectURL(lb.url);
  lb.el.querySelectorAll('video').forEach((v) => v.pause());
  lb.el.remove(); lb = null;
  document.removeEventListener('keydown', lbKey, true);
}
function lbKey(e) {
  if (!lb) return;
  if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
  else if (e.key === 'Enter') { e.preventDefault(); selectNext(); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); skip(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); skip(-1); }
  else if (e.key === ' ') { e.preventDefault(); toggleCur(); }
}
const curPage = (f) => (f.kind === 'pdf' ? (lb.page || 1) : undefined);
function curSelected() { const f = st.list[lb.i]; return hasSlide(f.path, curPage(f)); }
function toggleCur() { const f = st.list[lb.i]; if (st.bad.has(f.path)) return; toggleSlide(f.path, curPage(f)); renderLb(true); }
function step(d) { if (!lb) return; lb.i = (lb.i + d + st.list.length) % st.list.length; lb.page = 1; renderLb(); }
/** Weiter ohne Auswahl; bei PDF zuerst seitenweise. */
async function skip(d) {
  const f = st.list[lb.i];
  if (f.kind === 'pdf') {
    let n = 1; try { n = await pdfPages(f.path); } catch { /* egal */ }
    const p = (lb.page || 1) + d;
    if (p >= 1 && p <= n) { lb.page = p; renderLb(); return; }
  }
  step(d);
}
/** Auswählen (falls noch nicht) und gleich das nächste Bild bzw. die nächste PDF-Seite öffnen. */
async function selectNext() {
  if (!lb) return;
  const f = st.list[lb.i];
  if (!st.bad.has(f.path) && !hasSlide(f.path, curPage(f))) toggleSlide(f.path, curPage(f));
  const last = lb.i === st.list.length - 1;
  let lastPage = true;
  if (f.kind === 'pdf') { try { lastPage = (lb.page || 1) >= await pdfPages(f.path); } catch { /* egal */ } }
  if (last && lastPage) { renderLb(true); if (!(await nextFolder())) flash(t('lbLast')); return; }
  skip(1);
}
function flash(text) { const n = lb?.el.querySelector('.lb-flash'); if (!n) return; n.textContent = text; n.classList.add('on'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('on'), 2500); }
function actions(f) {
  const bad = st.bad.has(f.path); const sel = !bad && hasSlide(f.path, curPage(f));
  return h('div.lb-act', [
    h('button.btn', { type: 'button', onclick: () => skip(-1), title: '←' }, '‹ ' + t('lbBack')),
    sel ? h('span.lb-state', '✓ ' + t('lbIsSel')) : null,
    sel ? h('button.btn', { type: 'button', onclick: toggleCur, title: t('lbSpace') }, t('lbDeselect')) : null,
    h('button.btn.primary.big', { type: 'button', disabled: bad, onclick: selectNext, title: 'Enter' }, sel ? t('lbNext') : '✓ ' + t('lbSelectNext')),
    h('button.btn', { type: 'button', onclick: () => skip(1), title: '→' }, t('lbSkip') + ' ›'),
    h('span.lb-flash'),
  ]);
}
async function renderLb(onlyHead) {
  const f = st.list[lb.i]; const my = lb;
  const head = h('div.lb-top', [
    h('b', f.name + (f.kind === 'pdf' ? ' · ' + t('pageN', { p: lb.page || 1 }) : '')), h('span.dim', fsx.parentOf(f.path) || fsx.rootName()), h('span.dim.lbdate'),
    ...flagList(f.path).map((x) => h('span.qtxt.' + x.cls.split(' ').join('.'), x.icon + ' ' + x.tip)),
    h('span.sp'),
    h('span.dim.mono', `${lb.i + 1} / ${st.list.length}`),
    h('button.btn', { type: 'button', onclick: closeLb }, t('closeEsc')),
  ]);
  if (onlyHead && lb.el.firstChild) {
    lb.el.firstChild.replaceWith(head); fillDate(f, head);
    lb.el.querySelector('.lb-act')?.replaceWith(actions(f));
    renderPdfStrip(f); return;
  }
  if (lb.url) { URL.revokeObjectURL(lb.url); lb.url = null; }
  const stage = h('div.lb-stage', [h('div.loading', t('loading'))]);
  const bot = h('div.lb-bot', [actions(f), h('div.lb-sub', h('span.note', t('lbHint')))]);
  clear(lb.el).append(head, stage, bot, h('button.lb-nav.l', { type: 'button', onclick: () => skip(-1) }, '‹'), h('button.lb-nav.r', { type: 'button', onclick: () => skip(1) }, '›'));
  fillDate(f, head);
  try {
    let node;
    if (f.kind === 'video') {
      const file = await fileOf(f.path); lb.url = URL.createObjectURL(file);
      node = h('video', { src: lb.url, controls: true, autoplay: true, playsInline: true });
      node.onerror = () => { st.bad.add(f.path); stage.replaceChildren(h('p.err', t('videoUnplayableTip'))); renderLb(true); };
    } else {
      if (f.kind === 'pdf') { lb.page = lb.page || 1; renderPdfStrip(f); }
      const blob = await imageBlob(f.path, curPage(f), f.kind);
      if (my !== lb) return;
      lb.url = URL.createObjectURL(blob);
      node = h('img', { src: lb.url, alt: f.name });
    }
    if (my !== lb) return;
    stage.replaceChildren(node);
  } catch (e) { if (my === lb) stage.replaceChildren(h('p.err', t('noPreview') + ': ' + (e?.message || e))); }
  prefetch(lb.i + 1);
}
/** Nächstes Bild schon vorbereiten (HEIC-Umwandlung, PDF-Seite), damit «Auswählen & weiter» ohne Warten geht. */
function prefetch(i) {
  const f = st.list[i % st.list.length]; if (!f || f.kind === 'video') return;
  imageBlob(f.path, f.kind === 'pdf' ? 1 : undefined, f.kind).catch(() => {});
}
async function fillDate(f, head) { try { const d = await dateOf(f.path); const s = head.querySelector('.lbdate'); if (s) s.textContent = d.toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' }); } catch { /* egal */ } }
async function renderPdfStrip(f) {
  if (!lb || f.kind !== 'pdf') return;
  const bot = lb.el.querySelector('.lb-bot');
  let n = 1; try { n = await pdfPages(f.path); } catch (e) { bot.replaceChildren(h('p.err', String(e?.message || e))); return; }
  const strip = h('div.pages');
  bot.querySelector('.lb-sub')?.replaceChildren(h('div.note', t('pdfHint')), strip);
  for (let p = 1; p <= n; p++) {
    const pg = h('div.pg' + (hasSlide(f.path, p) ? '.sel' : '') + (p === lb.page ? '.cur' : ''), { title: t('pageN', { p }) },
      h('button.cb', { type: 'button', onclick: (e) => { e.stopPropagation(); toggleSlide(f.path, p); renderLb(true); } }), h('span.pn', String(p)));
    pg.onclick = () => { lb.page = p; renderLb(); };
    strip.appendChild(pg);
    thumb(f.path, p).then((r) => pg.prepend(h('img', { src: r.url, alt: '' }))).catch(() => {});
  }
}
