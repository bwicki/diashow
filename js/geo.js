/* Diashow — automatischer Bildtext aus Aufnahmedaten: Datum/Uhrzeit und Ort.
 * Ort aus den GPS-Daten des Bildes über OpenStreetMap Nominatim (nur bei Internet,
 * höchstens 1 Abfrage pro Sekunde, Ergebnis wird zwischengespeichert).
 * Konvention aller Apps: Ort mit Länderkürzel vorweg, z. B. «CH-Baden».
 */
import { idbGet, idbSet, limiter } from './util.js';
import { dateOf, fileOf, kindOf } from './media.js';

let exifrP = null;
function exifr() {
  if (!exifrP) exifrP = new Promise((res, rej) => { if (window.exifr) return res(window.exifr); const s = document.createElement('script'); s.src = 'js/vendor/exifr.umd.js'; s.onload = () => res(window.exifr); s.onerror = rej; document.head.appendChild(s); });
  return exifrP;
}
const geoLimit = limiter(1);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function placeOf(path) {
  const k = kindOf(path); if (k !== 'image' && k !== 'heic' && k !== 'raw') return '';
  let g = null;
  try { g = await (await exifr()).gps(await fileOf(path)); } catch { return ''; }
  if (!g || !Number.isFinite(g.latitude)) return '';
  const key = `geo|${g.latitude.toFixed(2)}|${g.longitude.toFixed(2)}`;
  const hit = await idbGet('kv', key); if (hit != null) return hit;
  if (!navigator.onLine) return '';
  return geoLimit(async () => {
    try {
      const u = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=de&lat=${g.latitude}&lon=${g.longitude}`;
      const r = await fetch(u, { headers: { Accept: 'application/json' } });
      const j = await r.json(); const a = j.address || {};
      const name = a.city || a.town || a.village || a.municipality || a.county || a.state || '';
      const cc = (a.country_code || '').toUpperCase();
      const out = name ? (cc ? cc + '-' : '') + name : '';
      await idbSet('kv', key, out);
      await wait(1100);
      return out;
    } catch { return ''; }
  });
}
/** Text gemäss Einstellung: date | datetime | datetimeplace. */
export async function autoCaption(path, mode) {
  if (!mode || mode === 'off') return '';
  let d = null; try { d = await dateOf(path); } catch { /* egal */ }
  const parts = [];
  if (d) parts.push(d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  if (d && mode !== 'date') parts.push(d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }));
  if (mode === 'datetimeplace') { const p = await placeOf(path); if (p) parts.push(p); }
  return parts.join(' · ');
}
