/* Diashow — automatischer Bildtext aus Aufnahmedaten: Datum/Uhrzeit und Ort.
 * Ort aus den GPS-Daten des Bildes über OpenStreetMap Nominatim (nur bei Internet,
 * höchstens 1 Abfrage pro Sekunde, Ergebnis wird zwischengespeichert).
 * Konvention aller Apps: Ort mit Länderkürzel vorweg, z. B. «CH-Baden».
 */
import { idbGet, idbSet, limiter } from './util.js';
import { fileOf, kindOf } from './media.js';

let exifrP = null;
function exifr() {
  if (!exifrP) exifrP = new Promise((res, rej) => { if (window.exifr) return res(window.exifr); const s = document.createElement('script'); s.src = 'js/vendor/exifr.umd.js'; s.onload = () => res(window.exifr); s.onerror = rej; document.head.appendChild(s); });
  return exifrP;
}
const geoLimit = limiter(1);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Nur aus EXIF: Aufnahmezeit und GPS (kein Ersatz aus Dateiname/Dateidatum). Zwischengespeichert. */
const metaMem = new Map();
export function exifMeta(path) {
  if (!metaMem.has(path)) {
    metaMem.set(path, (async () => {
      const k = kindOf(path); if (k !== 'image' && k !== 'heic' && k !== 'raw') return { date: null, gps: null };
      let date = null, gps = null;
      try {
        const ex = await exifr(); const f = await fileOf(path);
        try { const r = await ex.parse(f, ['DateTimeOriginal', 'CreateDate']); const d = r?.DateTimeOriginal || r?.CreateDate; if (d instanceof Date && !isNaN(d)) date = d; } catch { /* ohne Datum */ }
        try { const g = await ex.gps(f); if (g && Number.isFinite(g.latitude) && Number.isFinite(g.longitude) && !(g.latitude === 0 && g.longitude === 0)) gps = { lat: g.latitude, lon: g.longitude }; } catch { /* ohne GPS */ }
      } catch { /* Datei nicht lesbar */ }
      return { date, gps };
    })());
  }
  return metaMem.get(path);
}
export async function placeOf(path) {
  const m = await exifMeta(path);
  if (!m.gps) return '';
  const g = { latitude: m.gps.lat, longitude: m.gps.lon };
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
