/* Diashow — Einstieg: Kopfzeile, Navigation, Menü, Öffnen/Speichern, Ordnerzugriff. */
import { APP } from './version.js';
import { t, lang, setLang } from './i18n.js';
import { $, h, clear, append, load, save, msg, copyAllMsgs, dialog, idbClear, fmtDateTime, esc } from './util.js';
import * as fsx from './fsx.js';
import { cur, onChange, changed, newShow, setShow, toJSON } from './show.js';
import { renderLibrary } from './ui/library.js';
import { renderEditor } from './ui/editor.js';
import { renderPresent, isRunning } from './ui/present.js';

const VIEWS = ['lib', 'ed', 'play'];
let view = load('diashow.view', 'lib');
if (!VIEWS.includes(view)) view = 'lib';

/* ---------- Kopfzeile ---------- */
function renderHeader() {
  document.title = (cur.show.name ? cur.show.name + ' – ' : '') + 'Diashow';
  $('title').textContent = t('appName');
  $('eyebrow').textContent = t('eyebrow');
  $('appVersion').textContent = 'v' + APP.version;
  $('appVersion').onclick = about;
  const n = cur.show.slides.length;
  append(clear($('subtitle')), [
    h('span', t('showLabel') + ': '), h('b', cur.show.name || t('unnamed')),
    cur.dirty ? h('span.dirty', { title: t('unsaved') }, ' ● ' + t('unsaved')) : null,
    h('span.dim', ` · ${n} ${t('slidesN')}`),
  ]);
  const nav = clear($('mainnav'));
  VIEWS.forEach((v, i) => nav.appendChild(h('a' + (v === view ? '.on' : ''), { href: '#' + v, onclick: (e) => { e.preventDefault(); go(v); } }, `${i + 1} · ${t('nav_' + v)}`, v === 'ed' && n ? h('span.count', String(n)) : null)));
  const tools = clear($('tools'));
  tools.append(
    h('button.btn', { type: 'button', onclick: newShowDlg, title: t('newTip') }, t('new')),
    h('button.btn', { type: 'button', onclick: openDlg }, t('open')),
    h('button.btn.primary', { type: 'button', onclick: () => saveShow(false) }, t('save')),
  );
}
function renderMenu() {
  const m = clear($('menu'));
  const item = (label, fn) => h('button', { type: 'button', onclick: () => { m.classList.add('hidden'); fn(); } }, label);
  m.append(
    item(t('saveAs'), () => saveShow(true)),
    item(t('changeRoot'), changeRoot),
    h('div.sep'),
    item(lang() === 'de' ? 'English' : 'Deutsch', () => { setLang(lang() === 'de' ? 'en' : 'de'); renderAll(); }),
    item(t('theme'), () => { const th = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = th; save('diashow.theme', th); }),
    item(t('clearCache'), async () => { await idbClear('thumbs'); await idbClear('conv'); msg(t('cacheCleared')); }),
    h('div.sep'),
    item(t('about'), about),
  );
}
$('menuBtn').onclick = (e) => { e.stopPropagation(); renderMenu(); $('menu').classList.toggle('hidden'); };
document.addEventListener('click', (e) => { if (!$('menu').contains(e.target)) $('menu').classList.add('hidden'); });
$('msgAll').onclick = copyAllMsgs;

/* ---------- Ansichten ---------- */
export function go(v) {
  if (isRunning()) return;
  view = v; save('diashow.view', v);
  history.replaceState(null, '', '#' + v);
  renderAll();
}
function renderAll() {
  renderHeader();
  $('msgAll').textContent = t('copyAll');
  for (const v of VIEWS) $('v-' + v).classList.toggle('on', v === view);
  const el = $('v-' + view);
  if (!fsx.ready() && view !== 'play') return renderAccess(el);
  if (view === 'lib') renderLibrary(el);
  if (view === 'ed') renderEditor(el);
  if (view === 'play') { if (!fsx.ready()) return renderAccess(el); renderPresent(el); }
}
onChange((what) => { renderHeader(); if (what === 'reload') renderAll(); });
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v) && v !== view) go(v); });

/* ---------- Ordnerzugriff ---------- */
function renderAccess(el) {
  clear(el).classList.add('pad');
  const st = fsx.state.perm;
  const box = h('div.card.access', [
    h('div.card-head', h('div.section-title', t('accessTitle'))),
    h('div.card-body', [
      st === 'unsupported' ? h('p.err', t('accessUnsupported')) : null,
      h('p', t('accessText1')),
      h('p.note', { html: t('accessText2') }),
      st === 'prompt' ? h('p', [t('accessAgain') + ' ', h('b', fsx.rootName())]) : null,
      h('div.row-actions', [
        st === 'prompt' ? h('button.btn.primary', { type: 'button', onclick: async () => { if (await fsx.requestPermission()) { renderAll(); } } }, t('accessAllow')) : null,
        st !== 'unsupported' ? h('button.btn' + (st === 'prompt' ? '' : '.primary'), { type: 'button', onclick: changeRoot }, st === 'prompt' ? t('accessOther') : t('accessPick')) : null,
      ]),
    ]),
  ]);
  el.append(box);
}
async function changeRoot() {
  try { await fsx.pickRoot(); msg(t('rootSet', { n: fsx.rootName() })); renderAll(); }
  catch (e) { if (e?.name !== 'AbortError') msg(t('rootFail') + ' ' + (e?.message || e), 'err'); }
}

/* ---------- Neu / Öffnen / Speichern ---------- */
async function confirmDiscard() {
  if (!cur.dirty || !cur.show.slides.length) return true;
  const r = await dialog(t('discardTitle'), h('p', t('discardText')), [{ label: t('cancel'), value: null }, { label: t('saveFirst'), value: 'save' }, { label: t('discard'), value: 'discard', primary: true }]);
  if (r === 'save') return saveShow(false);
  return r === 'discard';
}
async function newShowDlg() {
  if (!(await confirmDiscard())) return;
  setShow(newShow(), null); changed(false, 'reload'); go('lib');
}
async function openDlg() {
  if (!fsx.ready()) return go('lib');
  let shows = [];
  try { shows = await fsx.listShows(); } catch (e) { msg(t('openFail') + ' ' + e.message, 'err'); return; }
  if (!shows.length) { await dialog(t('open'), h('p', t('noShows', { d: fsx.rootName() + '/' + fsx.SHOWDIR })), [{ label: 'OK', primary: true }]); return; }
  let chosen = null;
  const list = h('div.showlist', shows.map((s) => h('button.showitem', { type: 'button', onclick: (e) => { chosen = s; list.querySelectorAll('.showitem').forEach((x) => x.classList.toggle('on', x === e.currentTarget)); } },
    h('span.n', s.name), h('span.m', fmtDateTime(s.mtime)))));
  const r = await dialog(t('openTitle'), [h('p.note', fsx.rootName() + ' / ' + fsx.SHOWDIR), list], [{ label: t('cancel'), value: null }, { label: t('open'), value: 'open', primary: true }], { enter: false });
  if (r !== 'open' || !chosen) return;
  if (!(await confirmDiscard())) return;
  try {
    const obj = await fsx.readShow(chosen.file);
    if (obj.app !== 'diashow') throw new Error(t('notAShow'));
    setShow(obj, chosen.file, chosen.mtime); changed(false, 'reload');
    msg(t('opened', { n: obj.name || chosen.name, k: obj.slides?.length || 0 }));
    go('ed');
  } catch (e) { msg(t('openFail') + ' ' + (e?.message || e), 'err'); }
}
export async function saveShow(as) {
  if (!fsx.ready()) { msg(t('needRoot'), 'err'); return false; }
  let name = cur.show.name;
  if (as || !name) {
    const inp = h('input', { type: 'text', value: name || '', placeholder: t('namePh') });
    const r = await dialog(t('saveTitle'), [h('label.lbl', t('name')), inp, h('p.note', t('saveHint', { d: fsx.rootName() + ' / ' + fsx.SHOWDIR }))], [{ label: t('cancel'), value: null }, { label: t('save'), value: 'ok', primary: true }]);
    if (r !== 'ok') return false;
    name = inp.value.trim(); if (!name) return false;
    if ((as || !cur.file) && await fsx.showExists(name)) {
      const ow = await dialog(t('overwriteTitle'), h('p', t('overwriteText', { n: name })), [{ label: t('cancel'), value: null }, { label: t('overwrite'), value: 'ok', primary: true }]);
      if (ow !== 'ok') return false;
    }
  }
  cur.show.name = name;
  // Schutz: Datei wurde seit dem Öffnen/letzten Speichern anderswo geändert (anderer Rechner, anderes Fenster, Claude)
  const target = fsx.safeName(name) + '.diashow.json';
  if (target === cur.file) {
    const disk = await fsx.showMtime(target);
    if (disk && cur.mtime && disk > cur.mtime + 2000) {
      const r = await dialog(t('conflictTitle'), h('p', t('conflictText', { n: name, d: fmtDateTime(disk) })), [{ label: t('cancel'), value: null }, { label: t('overwrite'), value: 'ok', primary: true }]);
      if (r !== 'ok') return false;
    }
  }
  try {
    const { file, mtime } = await fsx.writeShow(name, toJSON());
    cur.file = file; cur.mtime = mtime; cur.dirty = false; changed(false);
    msg(t('saved', { f: fsx.SHOWDIR + '/' + file }));
    return true;
  } catch (e) { msg(t('saveFail') + ' ' + (e?.message || e), 'err'); return false; }
}

function about() {
  dialog(t('about'), h('div.about', [
    h('p', h('b', `${APP.name} ${APP.version}`), ` · ${APP.date}`),
    h('p', { html: t('aboutText') }),
    h('p', h('a', { href: APP.repo, target: '_blank', rel: 'noopener' }, APP.repo)),
    h('p.note', { html: t('aboutLibs') }),
  ]), [{ label: 'OK', primary: true }]);
}

window.addEventListener('beforeunload', (e) => { if (cur.dirty && cur.show.slides.length) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveShow(e.shiftKey); } });

/* ---------- Start ---------- */
(async function start() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { type: 'module' }).catch(() => {});
  const hv = location.hash.slice(1); if (VIEWS.includes(hv)) view = hv;
  await fsx.init();
  renderAll();
  if (fsx.state.perm === 'unsupported') msg(t('accessUnsupported'), 'err');
})();
export { renderAll };
