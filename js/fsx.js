/* Diashow — Zugriff auf den freigegebenen Stammordner (File System Access API).
 * Pfade sind immer relativ zum Stammordner, mit «/» getrennt, z. B.
 * «260901 GB26/von Nicole/IMG_1234.jpg». Es wird nichts kopiert; Dateien
 * werden direkt aus der Dropbox gelesen. Nur Diashow-Dateien in _DIASHOWS
 * werden geschrieben.
 */
import { idbGet, idbSet } from './util.js';

export const SHOWDIR = '_DIASHOWS';
export const state = { root: null, perm: 'none' };   // perm: none | prompt | granted | unsupported
const dirCache = new Map();   // path -> {dirs:[], files:[{name,path,size,mtime}]}
const handleCache = new Map(); // dir path -> FileSystemDirectoryHandle

export const supported = () => typeof window.showDirectoryPicker === 'function';

export async function init() {
  if (!supported()) { state.perm = 'unsupported'; return state; }
  const h = await idbGet('kv', 'root');
  if (!h) { state.perm = 'none'; return state; }
  state.root = h;
  try { state.perm = (await h.queryPermission({ mode: 'readwrite' })) === 'granted' ? 'granted' : 'prompt'; } catch { state.perm = 'prompt'; }
  return state;
}
/** Muss aus einem Klick heraus aufgerufen werden. */
export async function requestPermission() {
  if (!state.root) return false;
  try { state.perm = (await state.root.requestPermission({ mode: 'readwrite' })) === 'granted' ? 'granted' : 'prompt'; } catch { state.perm = 'prompt'; }
  return state.perm === 'granted';
}
export async function pickRoot() {
  const h = await window.showDirectoryPicker({ id: 'diashow-root', mode: 'readwrite' });
  state.root = h; state.perm = 'granted'; dirCache.clear(); handleCache.clear();
  await idbSet('kv', 'root', h);
  return h;
}
export const rootName = () => state.root?.name || '';
export const ready = () => state.perm === 'granted' && !!state.root;
export function invalidate(path) { if (path == null) { dirCache.clear(); handleCache.clear(); } else dirCache.delete(path); }

const join = (a, b) => (a ? a + '/' + b : b);
export const parentOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
export const baseName = (p) => p.slice(p.lastIndexOf('/') + 1);

export async function dirHandle(path, create = false) {
  if (!path) return state.root;
  if (handleCache.has(path)) return handleCache.get(path);
  let h = state.root;
  for (const part of path.split('/')) h = await h.getDirectoryHandle(part, { create });
  handleCache.set(path, h);
  return h;
}
export async function fileHandle(path) {
  const d = await dirHandle(parentOf(path));
  return d.getFileHandle(baseName(path));
}
export async function getFile(path) { return (await fileHandle(path)).getFile(); }

/** Ein Ordner: Unterordner und Dateien (sortiert). Ergebnis wird zwischengespeichert. */
export async function listDir(path) {
  if (dirCache.has(path)) return dirCache.get(path);
  const d = await dirHandle(path);
  const dirs = []; const files = [];
  for await (const [name, h] of d.entries()) {
    if (name.startsWith('.') || name.startsWith('~$') || name === 'desktop.ini') continue;
    if (h.kind === 'directory') { dirs.push(name); handleCache.set(join(path, name), h); }
    else files.push({ name, path: join(path, name), h });
  }
  const coll = new Intl.Collator('de', { numeric: true, sensitivity: 'base' });
  dirs.sort(coll.compare); files.sort((a, b) => coll.compare(a.name, b.name));
  const r = { dirs, files };
  dirCache.set(path, r);
  return r;
}

/** Alle Dateien unterhalb von path (rekursiv). onProgress(nDirs, nFiles). */
export async function walk(path, onProgress, skip = (p) => false) {
  const out = []; let nd = 0;
  async function rec(p) {
    if (skip(p)) return;
    const { dirs, files } = await listDir(p); nd++;
    out.push(...files);
    onProgress?.(nd, out.length);
    for (const d of dirs) await rec(join(p, d));
  }
  await rec(path);
  return out;
}

/** Datei nach Name im ganzen Stammordner suchen (für verschobene Bilder). */
export async function findByName(name, onProgress) {
  const all = await walk('', onProgress, (p) => p === SHOWDIR);
  const low = name.toLowerCase();
  return all.filter((f) => f.name.toLowerCase() === low).map((f) => f.path);
}

/* ---------- Diashow-Dateien ---------- */
export async function listShows() {
  let d; try { d = await dirHandle(SHOWDIR, true); } catch { return []; }
  const out = [];
  for await (const [name, h] of d.entries()) {
    if (h.kind !== 'file' || !name.toLowerCase().endsWith('.diashow.json')) continue;
    try { const f = await h.getFile(); out.push({ name: name.replace(/\.diashow\.json$/i, ''), file: name, mtime: f.lastModified, size: f.size }); } catch { /* egal */ }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}
export async function readShow(file) {
  const d = await dirHandle(SHOWDIR, true);
  const f = await (await d.getFileHandle(file)).getFile();
  return JSON.parse(await f.text());
}
export async function writeShow(name, obj) {
  const d = await dirHandle(SHOWDIR, true);
  const file = safeName(name) + '.diashow.json';
  const fh = await d.getFileHandle(file, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(obj, null, 1));
  await w.close();
  invalidate(SHOWDIR);
  return { file, mtime: (await fh.getFile()).lastModified };
}
/** Änderungszeit einer Diashow-Datei (0, wenn es sie nicht gibt). */
export async function showMtime(file) {
  try { const d = await dirHandle(SHOWDIR, true); return (await (await d.getFileHandle(file)).getFile()).lastModified; } catch { return 0; }
}
export async function showExists(name) {
  try { const d = await dirHandle(SHOWDIR, true); await d.getFileHandle(safeName(name) + '.diashow.json'); return true; } catch { return false; }
}
export async function deleteShow(file) { const d = await dirHandle(SHOWDIR, true); await d.removeEntry(file); invalidate(SHOWDIR); }
export const safeName = (n) => String(n || 'Diashow').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 120) || 'Diashow';

/** Logo von ausserhalb des Stammordners einmalig nach _DIASHOWS/Logos kopieren. */
export async function copyToLogos(file) {
  const d = await dirHandle(SHOWDIR + '/Logos', true);
  const name = safeName(file.name);
  const fh = await d.getFileHandle(name, { create: true });
  const w = await fh.createWritable(); await w.write(file); await w.close();
  invalidate(SHOWDIR + '/Logos');
  return SHOWDIR + '/Logos/' + name;
}
