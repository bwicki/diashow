/* Diashow — Karten-Folie mit Trajektorie.
 * Liest GPX, IGC und KML aus dem Stammordner, zeichnet die Trajektorie auf einer
 * Karte (Leaflet, OpenStreetMap oder Satellit) und lässt sie während der Folie
 * Schritt für Schritt entstehen. Ohne Internet bleibt die Karte grau, die
 * Trajektorie wird trotzdem gezeichnet.
 */
import { h } from './util.js';
import { getFile } from './fsx.js';

export const MAP_DEFAULT = { style: 'osm', color: '#e8590c', width: 4, anim: true };
const cache = new Map();

/* ---------- Einlesen ---------- */
export async function loadTrack(path) {
  if (!cache.has(path)) {
    const p = (async () => { const f = await getFile(path); return parseTrack(await f.text(), path); })();
    cache.set(path, p); p.catch(() => cache.delete(path));
  }
  return cache.get(path);
}
export function parseTrack(text, name = '') {
  const ext = name.toLowerCase().split('.').pop();
  let pts = [];
  if (ext === 'igc' || /^B\d{6}\d{7}[NS]\d{8}[EW]/m.test(text)) {
    for (const l of text.split(/\r?\n/)) {
      const m = /^B(\d{2})(\d{2})(\d{2})(\d{2})(\d{5})([NS])(\d{3})(\d{5})([EW])[AV](\d{5})(\d{5})/.exec(l);
      if (!m) continue;
      let lat = +m[4] + +m[5] / 60000; if (m[6] === 'S') lat = -lat;
      let lon = +m[7] + +m[8] / 60000; if (m[9] === 'W') lon = -lon;
      pts.push({ lat, lon, ele: +m[11] || +m[10], t: (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) });
    }
  } else {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const tp = doc.querySelectorAll('trkpt, rtept');
    if (tp.length) {
      tp.forEach((n) => { const ele = n.querySelector('ele'); const tm = n.querySelector('time'); pts.push({ lat: +n.getAttribute('lat'), lon: +n.getAttribute('lon'), ele: ele ? +ele.textContent : null, t: tm ? Date.parse(tm.textContent) / 1000 : null }); });
    } else {
      // KML: <coordinates>lon,lat,alt …</coordinates> bzw. gx:coord
      doc.querySelectorAll('coordinates').forEach((c) => c.textContent.trim().split(/\s+/).forEach((x) => { const [lon, lat, ele] = x.split(',').map(Number); if (Number.isFinite(lat)) pts.push({ lat, lon, ele: ele ?? null }); }));
      doc.querySelectorAll('coord').forEach((c) => { const [lon, lat, ele] = c.textContent.trim().split(/\s+/).map(Number); if (Number.isFinite(lat)) pts.push({ lat, lon, ele }); });
    }
  }
  pts = pts.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && !(p.lat === 0 && p.lon === 0));
  if (pts.length < 2) throw new Error('Keine Trajektorie in der Datei gefunden.');
  // für flüssige Animation auf höchstens 2500 Punkte ausdünnen
  if (pts.length > 2500) { const k = Math.ceil(pts.length / 2500); pts = pts.filter((_, i) => i % k === 0 || i === pts.length - 1); }
  let dist = 0; for (let i = 1; i < pts.length; i++) dist += hav(pts[i - 1], pts[i]);
  return { pts, dist };
}
function hav(a, b) { const R = 6371, r = Math.PI / 180; const dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

/* ---------- Kleines Vorschaubild (Kachel, Referentensicht) ---------- */
export function trackThumb(tr, w = 480, hgt = 270, color = '#e8590c') {
  const c = document.createElement('canvas'); c.width = w; c.height = hgt;
  const x = c.getContext('2d'); x.fillStyle = '#1b2a3a'; x.fillRect(0, 0, w, hgt);
  const P = project(tr.pts, w, hgt, 18);
  x.strokeStyle = color; x.lineWidth = 3; x.lineJoin = 'round'; x.beginPath();
  P.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
  x.fillStyle = '#3fbf7f'; x.beginPath(); x.arc(P[0][0], P[0][1], 5, 0, 7); x.fill();
  x.fillStyle = '#ff5f56'; x.beginPath(); x.arc(P.at(-1)[0], P.at(-1)[1], 5, 0, 7); x.fill();
  return c;
}
function project(pts, w, hgt, pad) {
  const merc = (p) => [p.lon, Math.log(Math.tan(Math.PI / 4 + p.lat * Math.PI / 360)) * 180 / Math.PI];
  const m = pts.map(merc);
  const xs = m.map((p) => p[0]), ys = m.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((w - 2 * pad) / ((x1 - x0) || 1e-6), (hgt - 2 * pad) / ((y1 - y0) || 1e-6));
  const ox = (w - (x1 - x0) * s) / 2, oy = (hgt - (y1 - y0) * s) / 2;
  return m.map(([a, b]) => [ox + (a - x0) * s, hgt - (oy + (b - y0) * s)]);
}

/* ---------- Leaflet bei Bedarf laden ---------- */
let leafletP = null;
function leaflet() {
  if (!leafletP) leafletP = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'js/vendor/leaflet/leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'js/vendor/leaflet/leaflet.js'; s.onload = () => res(window.L); s.onerror = rej; document.head.appendChild(s);
  });
  return leafletP;
}
const TILES = {
  osm: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap'],
  sat: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', '© Esri, Maxar, Earthstar'],
  topo: ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', '© OpenTopoMap, OpenStreetMap'],
};

/** Karte in ein Element zeichnen; animSec > 0 lässt die Trajektorie über diese Zeit entstehen. Liefert {stop}. */
export async function mountMap(el, s, animSec) {
  const L = await leaflet();
  const tr = s.pts ? { pts: s.pts.map(([lat, lon]) => ({ lat, lon })) } : await loadTrack(s.track);   // geteilt: Punkte im Manifest
  const o = { ...MAP_DEFAULT, ...(s.map || {}) };
  const div = h('div.mapbox'); el.prepend(div);
  const map = L.map(div, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, fadeAnimation: false });
  if (o.style !== 'plain') { const [u, a] = TILES[o.style] || TILES.osm; L.tileLayer(u, { attribution: a, maxZoom: 17, crossOrigin: true }).addTo(map); }
  const ll = tr.pts.map((p) => [p.lat, p.lon]);
  const bounds = L.latLngBounds(ll);
  map.fitBounds(bounds, { padding: [60, 60], animate: false });
  L.circleMarker(ll[0], { radius: 7, color: '#fff', weight: 2, fillColor: '#3fbf7f', fillOpacity: 1 }).addTo(map);
  const line = L.polyline([], { color: o.color, weight: o.width, opacity: 0.95, lineJoin: 'round' }).addTo(map);
  const head = L.circleMarker(ll[0], { radius: 6, color: '#fff', weight: 2, fillColor: o.color, fillOpacity: 1 }).addTo(map);
  let raf = 0; let stopped = false;
  const finish = () => { line.setLatLngs(ll); head.setLatLng(ll.at(-1)); L.circleMarker(ll.at(-1), { radius: 7, color: '#fff', weight: 2, fillColor: '#ff5f56', fillOpacity: 1 }).addTo(map); };
  if (o.anim && animSec > 0) {
    const t0 = performance.now(); const D = animSec * 1000;
    const step = (now) => {
      if (stopped) return;
      const k = Math.min(1, (now - t0) / D); const n = Math.max(1, Math.round(k * (ll.length - 1)));
      line.setLatLngs(ll.slice(0, n + 1)); head.setLatLng(ll[n]);
      if (k < 1) raf = requestAnimationFrame(step); else finish();
    };
    raf = requestAnimationFrame(step);
  } else finish();
  // Grösse erst nach dem Einblenden bekannt → neu einpassen
  setTimeout(() => { map.invalidateSize(); map.fitBounds(bounds, { padding: [60, 60], animate: false }); }, 60);
  return { stop: () => { stopped = true; cancelAnimationFrame(raf); map.remove(); }, dist: tr.dist };
}
