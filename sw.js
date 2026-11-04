/* Diashow — Service Worker (PWA, offline-fähig).
 * App-Hülle inkl. Bibliotheken wird beim Installieren vorgeladen; Cache-Name aus
 * js/version.js (neue Version → neuer Cache, alte werden gelöscht).
 * Statische Dateien: Netz zuerst (damit Updates sofort ankommen), offline aus dem Cache.
 * Bilder kommen nie über das Netz – sie werden direkt aus dem lokalen Ordner gelesen.
 */
import { APP } from './js/version.js';

const CACHE = APP.cache;
const SHELL = [
  './', 'index.html', 'presenter.html', 'manifest.webmanifest', 'css/base.css', 'css/app.css', 'img/wicki-logo.png',
  'icons/favicon.svg', 'icons/favicon.ico', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/version.js', 'js/i18n.js', 'js/util.js', 'js/fsx.js', 'js/media.js', 'js/show.js', 'js/app.js',
  'js/render.js', 'js/track.js', 'js/geo.js', 'js/ui/share.js', 'js/caption.js', 'js/music.js', 'js/ui/library.js', 'js/ui/editor.js', 'js/ui/present.js', 'js/ui/picker.js', 'js/ui/crop.js',
  'js/vendor/heic2any.min.js', 'js/vendor/pdf.min.js', 'js/vendor/pdf.worker.min.js', 'js/vendor/exifr.umd.js', 'js/vendor/leaflet/leaflet.js', 'js/vendor/leaflet/leaflet.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).catch(() => null).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin) return;
  // no-cache: immer beim Server nachfragen (sonst mischt der Browser-Cache alte und neue Programmteile)
  e.respondWith((req.mode === 'navigate' ? fetch(req) : fetch(req, { cache: 'no-cache' })).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then((c) => c || caches.match('index.html'))));
});
