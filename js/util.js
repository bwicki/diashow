/* Diashow — kleine Helfer: DOM, localStorage, IndexedDB, Meldungen, Dialoge. */
import { t } from './i18n.js';

export const $ = (id) => document.getElementById(id);

/** h('div.cls#id', {attr}, ...children) – kompakter DOM-Baukasten (wie in ops). */
export function h(spec, attrs, ...children) {
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  const [tag, ...rest] = spec.split(/(?=[.#])/);
  const el = document.createElement(tag || 'div');
  for (const r of rest) { if (r[0] === '.') { if (r.length > 1) el.classList.add(r.slice(1)); } else if (r[0] === '#') el.id = r.slice(1); }
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value' && el.tagName === 'TEXTAREA') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string' && k !== 'value') el[k] = v;
    else el.setAttribute(k, v === true ? (k.startsWith('aria-') ? 'true' : '') : v);
  }
  return append(el, children);
}
export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const uid = () => Math.random().toString(36).slice(2, 10);

export const load = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } };
export const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* egal */ } };

/* ---------- IndexedDB: Ordner-Handle, Vorschaubilder, umgewandelte HEIC ---------- */
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('diashow', 1);
    r.onupgradeneeded = () => { const d = r.result; for (const s of ['kv', 'thumbs', 'conv']) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
export async function idbGet(store, key) {
  try { const d = await db(); return await new Promise((res, rej) => { const q = d.transaction(store).objectStore(store).get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch { return undefined; }
}
export async function idbSet(store, key, val) {
  try { const d = await db(); await new Promise((res, rej) => { const tx = d.transaction(store, 'readwrite'); tx.objectStore(store).put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e) { console.warn('idb', e); }
}
export async function idbClear(store) {
  try { const d = await db(); await new Promise((res) => { const tx = d.transaction(store, 'readwrite'); tx.objectStore(store).clear(); tx.oncomplete = res; tx.onerror = res; }); } catch { /* egal */ }
}

/* ---------- Meldungen: Protokoll hinter dem Symbol in der Kopfzeile.
   Meldungen bleiben im Protokoll stehen und sind kopierbar (Konvention aller Apps);
   das Symbol zeigt die Zahl ungelesener Meldungen, bei Fehlern rot. ---------- */
let unread = 0; let unreadErr = false;
export function msg(text, level = 'info') {
  const box = $('msgs'); if (!box) { console.log(text); return; }
  const time = new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const full = `${time} ${text}`;
  const row = h('div.msg.' + level, [
    h('span.msg-t', full),
    h('button.btn.mini', { type: 'button', title: t('copy'), onclick: () => { navigator.clipboard?.writeText(row.querySelector('.msg-t').textContent).catch(() => {}); } }, t('copy')),
    h('button.btn.mini', { type: 'button', title: t('close'), onclick: () => { row.remove(); updMsgs(); } }, '✕'),
  ]);
  box.prepend(row);   // neueste oben
  if (!logOpen()) { unread++; if (level === 'err' || level === 'warn') unreadErr = true; }
  updMsgs();
  return row;
}
const logOpen = () => !$('logPanel')?.classList.contains('hidden');
export function updMsgs() {
  const box = $('msgs'); if (!box) return;
  const n = box.querySelectorAll('.msg').length;
  const e = $('logEmpty'); if (e) e.hidden = n > 0;
  const b = $('logBadge'); if (b) { b.hidden = unread === 0; b.textContent = unread > 99 ? '99+' : String(unread); b.classList.toggle('err', unreadErr); }
}
export function toggleLog(force) {
  const p = $('logPanel'); if (!p) return;
  const open = force ?? p.classList.contains('hidden');
  p.classList.toggle('hidden', !open);
  if (open) { unread = 0; unreadErr = false; updMsgs(); }
}
export function clearMsgs() { const box = $('msgs'); if (box) box.replaceChildren(); unread = 0; unreadErr = false; updMsgs(); }
export function copyAllMsgs() {
  const txt = [...document.querySelectorAll('#msgs .msg-t')].map((e) => e.textContent).reverse().join('\n');
  navigator.clipboard?.writeText(txt).catch(() => {});
}

/** Modaler Dialog. buttons: [{label, value, primary}] – Promise mit value (null = abgebrochen). */
export function dialog(title, content, buttons = [], opts = {}) {
  return new Promise((resolve) => {
    const back = h('div.backdrop');
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey, true); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } if (e.key === 'Enter' && opts.enter !== false && e.target.tagName !== 'TEXTAREA') { const p = buttons.find((b) => b.primary); if (p) { e.preventDefault(); close(p.value === undefined ? true : p.value); } } };
    const box = h('div.dialog' + (opts.cls ? '.' + opts.cls : ''), [
      h('div.dialog-head', [h('div.section-title', title), h('button.btn.icon', { type: 'button', onclick: () => close(null), 'aria-label': t('close') }, '✕')]),
      h('div.dialog-body', content),
      h('div.dialog-foot', buttons.map((b) => h('button.btn' + (b.primary ? '.primary' : ''), { type: 'button', onclick: () => close(b.value === undefined ? true : b.value) }, b.label))),
    ]);
    back.appendChild(box); document.body.appendChild(back);
    document.addEventListener('keydown', onKey, true);
    setTimeout(() => (box.querySelector('input,select,textarea') || box.querySelector('.btn.primary'))?.focus(), 30);
  });
}

/** Begrenzte Parallelität für teure Arbeiten (Vorschaubilder, HEIC). */
export function limiter(n) {
  let active = 0; const q = [];
  const next = () => { if (active >= n || !q.length) return; active++; const { fn, res, rej } = q.shift(); fn().then(res, rej).finally(() => { active--; next(); }); };
  return (fn, front = false) => new Promise((res, rej) => { (front ? q.unshift : q.push).call(q, { fn, res, rej }); next(); });
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('de-CH') : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export const mmss = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(s % 60).padStart(2, '0'); };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
