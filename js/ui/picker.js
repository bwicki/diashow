/* Diashow — Logo-/Bildauswahl für Titelfolien und Wasserzeichen.
 * Eingebaute Logos, zuletzt verwendete und «Aus Ordner wählen …». Liegt die
 * gewählte Datei ausserhalb des Stammordners, wird sie (klein, einmalig) nach
 * _DIASHOWS/Logos kopiert, damit die Diashow-Datei sie wiederfindet.
 */
import { t } from '../i18n.js';
import { h, load, save, dialog, msg } from '../util.js';
import * as fsx from '../fsx.js';
import { BUILTIN, assetUrl } from '../render.js';

const RECENT = 'diashow.logos';
export function rememberLogo(path) {
  if (!path || path.startsWith('app:')) return;
  const r = load(RECENT, []).filter((p) => p !== path); r.unshift(path); save(RECENT, r.slice(0, 16));
}
const label = (p) => BUILTIN.find((b) => b.path === p)?.name || fsx.baseName(p);

/** Liefert den Pfad (relativ zum Stammordner oder «app:…») oder null. */
export async function pickImage(title, current) {
  let chosen = current || null;
  const grid = h('div.picker');
  const item = (path) => {
    const b = h('button.pick' + (path === chosen ? '.on' : ''), { type: 'button', title: path, onclick: () => { chosen = path; grid.querySelectorAll('.pick').forEach((x) => x.classList.toggle('on', x === b)); } },
      h('div.pimg'), h('span', label(path)));
    assetUrl(path).then((u) => b.querySelector('.pimg').append(h('img', { src: u, alt: '' }))).catch(() => b.classList.add('bad'));
    return b;
  };
  const recents = load(RECENT, []);
  grid.append(...BUILTIN.map((x) => item(x.path)), ...recents.map(item));
  const fromFolder = h('button.btn', { type: 'button', onclick: async () => {
    const p = await chooseFile(); if (!p) return;
    rememberLogo(p); chosen = p;
    grid.querySelectorAll('.pick').forEach((x) => x.classList.remove('on'));
    const b = item(p); b.classList.add('on'); grid.prepend(b);
  } }, t('pickFromFolder'));
  const r = await dialog(title, [h('p.note', t('pickHint')), grid, h('div.row-actions', fromFolder)], [{ label: t('cancel'), value: null }, { label: t('pickUse'), value: 'ok', primary: true }], { enter: false, cls: 'wide' });
  if (r !== 'ok' || !chosen) return null;
  rememberLogo(chosen);
  return chosen;
}

async function chooseFile() {
  let handle;
  try {
    [handle] = await window.showOpenFilePicker({ startIn: fsx.state.root || 'pictures', types: [{ description: t('images'), accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.heic', '.heif'] } }] });
  } catch (e) { if (e?.name !== 'AbortError') msg(String(e?.message || e), 'err'); return null; }
  let parts = null;
  try { parts = await fsx.state.root.resolve(handle); } catch { /* ausserhalb */ }
  if (parts) return parts.join('/');
  try {
    const f = await handle.getFile();
    const p = await fsx.copyToLogos(f);
    msg(t('logoCopied', { p }));
    return p;
  } catch (e) { msg(t('logoCopyFail') + ' ' + (e?.message || e), 'err'); return null; }
}

/** Trajektorien-Datei (GPX, IGC, KML) wählen; ausserhalb des Stammordners → Kopie nach _DIASHOWS/Tracks. */
export async function chooseTrack() {
  let handle;
  try {
    [handle] = await window.showOpenFilePicker({ startIn: fsx.state.root || 'documents', types: [{ description: 'GPX / IGC / KML', accept: { 'application/octet-stream': ['.gpx', '.igc', '.kml'] } }] });
  } catch (e) { if (e?.name !== 'AbortError') msg(String(e?.message || e), 'err'); return null; }
  let parts = null;
  try { parts = await fsx.state.root.resolve(handle); } catch { /* ausserhalb */ }
  if (parts) return parts.join('/');
  try { const p = await fsx.copyToLogos(await handle.getFile(), 'Tracks'); msg(t('trackCopied', { p })); return p; }
  catch (e) { msg(t('logoCopyFail') + ' ' + (e?.message || e), 'err'); return null; }
}

/** Musikdateien wählen (mehrere); ausserhalb des Stammordners → Kopie nach _DIASHOWS/Musik. Liefert Pfade. */
export async function chooseAudio() {
  let handles;
  try {
    handles = await window.showOpenFilePicker({ multiple: true, startIn: fsx.state.root || 'music', types: [{ description: t('musicFiles'), accept: { 'audio/*': ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.oga', '.opus', '.flac', '.weba'] } }] });
  } catch (e) { if (e?.name !== 'AbortError') msg(String(e?.message || e), 'err'); return []; }
  const out = [];
  for (const handle of handles) {
    let parts = null;
    try { parts = await fsx.state.root.resolve(handle); } catch { /* ausserhalb */ }
    if (parts) { out.push(parts.join('/')); continue; }
    try { const p = await fsx.copyToLogos(await handle.getFile(), 'Musik'); msg(t('musicCopied', { p })); out.push(p); }
    catch (e) { msg(t('logoCopyFail') + ' ' + (e?.message || e), 'err'); }
  }
  return out;
}
