/* Diashow — Datenmodell einer Diashow und der aktuelle Arbeitsstand.
 *
 * Gespeichert wird nur eine kleine JSON-Datei in _DIASHOWS mit Verweisen
 * (Pfad relativ zum Stammordner) – nie Bildkopien.
 */
import { uid, load, save } from './util.js';
import { kindOf } from './media.js';
import { PRESETS } from './render.js';

/** Standard-Wasserzeichen für neu hinzugefügte Dias (Wunsch 31.10.2026): Wicki-Logo oben rechts. */
export const DEF_WM = { path: 'app:img/wicki-logo.png', pos: 'tr', size: 10, op: 0.85 };

export const TRANSITIONS = ['fade', 'slide', 'zoom', 'wipe', 'cube', 'black', 'circle'];

export function defaultSettings() {
  return { mode: 'auto', dur: 6, trDur: 1.0, order: 'fixed', loop: true, kenburns: true, captions: true, pool: [...TRANSITIONS], fit: 'contain', defWm: true, autoCap: 'off', portraitBg: true };
}
export function newShow(name = '') {
  return { app: 'diashow', format: 1, name, created: new Date().toISOString(), modified: null, settings: defaultSettings(), slides: [] };
}

/** Aktueller Arbeitsstand (eine Diashow), mit Beobachtern und Entwurfs-Sicherung. */
export const cur = { show: load('diashow.draft', null) || newShow(), dirty: load('diashow.dirty', false), file: load('diashow.file', null), mtime: load('diashow.mtime', 0) };
cur.show.settings = { ...defaultSettings(), ...(cur.show.settings || {}) };
const subs = new Set();
export const onChange = (fn) => { subs.add(fn); return () => subs.delete(fn); };
let saveTimer = null;
export function changed(dirty = true, what = 'all') {
  if (dirty) cur.dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { save('diashow.draft', cur.show); save('diashow.dirty', cur.dirty); save('diashow.file', cur.file); save('diashow.mtime', cur.mtime); }, 300);
  for (const fn of subs) fn(what);
}

export const slideKey = (path, page) => (page ? `${path}#${page}` : path);
const keyIndex = () => new Map(cur.show.slides.filter((s) => s.type === 'file').map((s, i) => [slideKey(s.path, s.page), s]));
export function hasSlide(path, page) { return cur.show.slides.some((s) => s.type === 'file' && s.path === path && (s.page || 0) === (page || 0)); }
export function countPages(path) { return cur.show.slides.filter((s) => s.type === 'file' && s.path === path && s.page).length; }
export function addSlide(path, page) {
  if (hasSlide(path, page)) return;
  const s = { id: uid(), type: 'file', path, page: page || undefined, kind: kindOf(path), cap: '', note: '', dur: null, tr: '', sound: false };
  if (cur.show.settings.defWm) s.wm = { ...(cur.show.settings.wmDefault || DEF_WM) };
  cur.show.slides.push(s);
}
export function removeSlide(path, page) {
  cur.show.slides = cur.show.slides.filter((s) => !(s.type === 'file' && s.path === path && (s.page || 0) === (page || 0)));
}
export function toggleSlide(path, page) {
  if (hasSlide(path, page)) removeSlide(path, page); else addSlide(path, page);
  changed(true, 'slides');
}
export function addTitle(at, text, sub = '') {
  const s = { id: uid(), type: 'title', cap: text, sub, note: '', dur: null, tr: '', ts: { ...PRESETS.black } };
  cur.show.slides.splice(at == null ? cur.show.slides.length : at, 0, s);
  changed(true, 'slides');
  return s;
}
export function addMap(at, track, cap = '') {
  const s = { id: uid(), type: 'map', track, cap, note: '', dur: null, tr: '', map: { style: 'osm', color: '#e8590c', width: 4, anim: true } };
  cur.show.slides.splice(at == null ? cur.show.slides.length : at, 0, s);
  changed(true, 'slides');
  return s;
}
export function setShow(obj, file, mtime = 0) {
  const s = { ...newShow(), ...obj };
  s.settings = { ...defaultSettings(), ...(obj.settings || {}) };
  s.slides = (obj.slides || []).map((x) => ({ id: x.id || uid(), cap: '', note: '', dur: null, tr: '', sound: false, ...x, kind: x.type === 'file' ? kindOf(x.path) : undefined }));
  cur.show = s; cur.file = file || null; cur.mtime = mtime; cur.dirty = false;
  changed(false);
}
export function toJSON() {
  const s = cur.show;
  return {
    app: 'diashow', format: 1, name: s.name, created: s.created, modified: new Date().toISOString(),
    settings: s.settings,
    slides: s.slides.map((x) => {
      const o = {};
      for (const [k, v] of Object.entries(x)) {
        if (k === 'kind' || k.startsWith('_') || v == null || v === '' || v === false) continue;
        if (k === 'sound' && x.kind !== 'video') continue;
        o[k] = v;
      }
      return o;
    }),
  };
}
export { keyIndex };
