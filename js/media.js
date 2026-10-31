/* Diashow — Medien: Erkennen, Vorschaubilder, Anzeige-Fassung, Aufnahmedatum.
 *
 * - JPG/PNG/WebP/GIF/AVIF/BMP: direkt.
 * - HEIC/HEIF (iPhone): Chrome kann sie nicht anzeigen → Umwandlung mit heic2any
 *   (lokal, im Browser); das Ergebnis wird in IndexedDB zwischengespeichert.
 * - RAW (CR2, NEF, ARW, DNG …): eingebettetes JPEG-Vorschaubild. Ist die Datei in
 *   Wahrheit ein JPEG (umbenannt), wird sie direkt gezeigt.
 * - PDF: einzelne Seiten werden mit pdf.js gerendert.
 * - Video (MP4, MOV, M4V, WebM): Abspielbarkeit hängt vom Codec ab (iPhone-MOV = HEVC).
 */
import { idbGet, idbSet, limiter } from './util.js';
import { getFile } from './fsx.js';

const EXT = {
  image: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'avif', 'bmp'],
  heic: ['heic', 'heif'],
  raw: ['cr2', 'cr3', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'pef', 'srw'],
  pdf: ['pdf'],
  video: ['mp4', 'mov', 'm4v', 'webm'],
};
export const extOf = (name) => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '');
export function kindOf(name) {
  const e = extOf(name);
  for (const [k, list] of Object.entries(EXT)) if (list.includes(e)) return k;
  return null;
}
export const isVisualKind = (k) => k === 'image' || k === 'heic' || k === 'raw' || k === 'pdf';

/* ---------- Bibliotheken bei Bedarf laden (liegen im Repo, offline verfügbar) ---------- */
const scripts = new Map();
function loadScript(src) {
  if (!scripts.has(src)) scripts.set(src, new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Laden fehlgeschlagen: ' + src)); document.head.appendChild(s); }));
  return scripts.get(src);
}
async function heic2any() { await loadScript('js/vendor/heic2any.min.js'); return window.heic2any; }
async function pdfjs() {
  await loadScript('js/vendor/pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('js/vendor/pdf.worker.min.js', location.href).href;
  return window.pdfjsLib;
}
async function exifr() { await loadScript('js/vendor/exifr.umd.js'); return window.exifr; }

/* ---------- Datei-Infos ---------- */
const fileMemo = new Map();
export async function fileOf(path) {
  if (fileMemo.has(path)) return fileMemo.get(path);
  const f = await getFile(path);
  fileMemo.set(path, f);
  return f;
}
export function forget(path) { fileMemo.delete(path); }
const keyOf = (path, f, page) => `${path}|${page || 0}|${f.size}|${f.lastModified}`;

async function sniffJpeg(f) {
  const b = new Uint8Array(await f.slice(0, 3).arrayBuffer());
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

/* ---------- Umwandlungen ---------- */
const heicLimit = limiter(1);
async function heicToJpeg(path, f) {
  const k = 'heic|' + keyOf(path, f);
  const hit = await idbGet('conv', k); if (hit) return hit;
  if (await sniffJpeg(f)) return f;
  const conv = await heicLimit(async () => { const fn = await heic2any(); const r = await fn({ blob: f, toType: 'image/jpeg', quality: 0.9 }); return Array.isArray(r) ? r[0] : r; });
  await idbSet('conv', k, conv);
  return conv;
}
async function rawPreview(path, f) {
  if (await sniffJpeg(f)) return f;
  const k = 'raw|' + keyOf(path, f);
  const hit = await idbGet('conv', k); if (hit) return hit;
  const buf = new Uint8Array(await f.arrayBuffer());
  const starts = [];
  for (let i = 0; i < buf.length - 3 && starts.length < 12; i++) if (buf[i] === 0xff && buf[i + 1] === 0xd8 && buf[i + 2] === 0xff) starts.push(i);
  let best = null; let bestW = 0;
  for (const s of starts) {
    try { const blob = new Blob([buf.subarray(s)], { type: 'image/jpeg' }); const bm = await createImageBitmap(blob); if (bm.width > bestW) { bestW = bm.width; best = s; } bm.close(); } catch { /* kein gültiges JPEG */ }
  }
  if (best == null) throw new Error('kein eingebettetes Vorschaubild');
  const out = new Blob([buf.slice(best)], { type: 'image/jpeg' });
  await idbSet('conv', k, out);
  return out;
}
const pdfDocs = new Map();
async function pdfDoc(path) {
  if (!pdfDocs.has(path)) pdfDocs.set(path, (async () => { const lib = await pdfjs(); const f = await fileOf(path); return lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; })());
  return pdfDocs.get(path);
}
export async function pdfPages(path) { return (await pdfDoc(path)).numPages; }
async function pdfPageBlob(path, page, width, quality = 0.9) {
  const doc = await pdfDoc(path);
  const p = await doc.getPage(page);
  const vp0 = p.getViewport({ scale: 1 });
  const vp = p.getViewport({ scale: width / vp0.width });
  const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await p.render({ canvasContext: ctx, viewport: vp }).promise;
  return new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
}

/** Bild-Blob in Originalgrösse (für Grossansicht und Vorführung). */
export async function imageBlob(path, page, kind = kindOf(path)) {
  const f = await fileOf(path);
  if (kind === 'heic') return heicToJpeg(path, f);
  if (kind === 'raw') return rawPreview(path, f);
  if (kind === 'pdf') {
    const k = 'pdf|' + keyOf(path, f, page);
    const hit = await idbGet('conv', k); if (hit) return hit;
    const b = await pdfPageBlob(path, page || 1, 2560);
    await idbSet('conv', k, b);
    return b;
  }
  return f;
}

/* ---------- Vorschaubilder ---------- */
const TW = 520;
const thumbLimit = limiter(3);
const thumbMem = new Map();
/** Vorschaubild plus Qualitätskennzahlen: Originalgrösse, Schärfe, Wahrnehmungs-Hash. */
async function shrink(blob) {
  const bm = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const w = bm.width, hgt = bm.height;
  const tw = Math.min(TW, w), th = Math.max(1, Math.round(hgt * tw / w));
  const c = new OffscreenCanvas(tw, th); const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'medium'; ctx.drawImage(bm, 0, 0, tw, th);
  bm.close();
  const q = analyse(c);
  return { blob: await c.convertToBlob({ type: 'image/jpeg', quality: 0.8 }), w, h: hgt, ...q };
}
/* Schärfe: Varianz des Laplace-Operators auf einer 400 px breiten Graustufenfassung (Heuristik).
   Hash: dHash 64 bit (9×8 Graustufen, Vergleich benachbarter Pixel) für Doubletten. */
function analyse(src) {
  const W = Math.min(400, src.width), H = Math.max(1, Math.round(src.height * W / src.width));
  const a = new OffscreenCanvas(W, H); const ax = a.getContext('2d', { willReadFrequently: true }); ax.drawImage(src, 0, 0, W, H);
  const d = ax.getImageData(0, 0, W, H).data; const g = new Float32Array(W * H);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; const l = g[i - W] + g[i + W] + g[i - 1] + g[i + 1] - 4 * g[i];
    sum += l; sum2 += l * l; n++;
  }
  const sharp = n ? sum2 / n - (sum / n) ** 2 : 0;
  const b = new OffscreenCanvas(9, 8); const bx = b.getContext('2d', { willReadFrequently: true }); bx.drawImage(src, 0, 0, 9, 8);
  const e = bx.getImageData(0, 0, 9, 8).data; let hash = '';
  for (let y = 0; y < 8; y++) { let byte = 0; for (let x = 0; x < 8; x++) { const p = (y * 9 + x) * 4, q = p + 4; const l1 = e[p] + e[p + 1] + e[p + 2], l2 = e[q] + e[q + 1] + e[q + 2]; byte = (byte << 1) | (l1 > l2 ? 1 : 0); } hash += byte.toString(16).padStart(2, '0'); }
  return { sharp: Math.round(sharp), hash };
}

/* ---------- Qualitätshinweise ---------- */
export const QUALITY = { minLong: 1600, minShort: 900, badLong: 1000, blur: 60 };
/** Hinweise aus einem Vorschau-Datensatz: lowres ('warn'|'bad'), blur (true). */
export function qualityFlags(rec) {
  const f = {};
  if (rec?.w && rec?.h) {
    const L = Math.max(rec.w, rec.h), S = Math.min(rec.w, rec.h);
    if (L < QUALITY.badLong) f.lowres = 'bad'; else if (L < QUALITY.minLong || S < QUALITY.minShort) f.lowres = 'warn';
  }
  if (rec?.sharp != null && rec.sharp < QUALITY.blur) f.blur = true;
  return f;
}
export function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0; for (let i = 0; i < a.length; i += 2) { let x = parseInt(a.substr(i, 2), 16) ^ parseInt(b.substr(i, 2), 16); while (x) { d += x & 1; x >>= 1; } }
  return d;
}
function videoFrame(file) {
  return new Promise((res, rej) => {
    const v = document.createElement('video'); const url = URL.createObjectURL(file);
    const done = (fn, x) => { clearTimeout(to); v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); fn(x); };
    const to = setTimeout(() => done(rej, new Error('timeout')), 15000);
    v.muted = true; v.preload = 'auto'; v.playsInline = true;
    v.onloadedmetadata = () => { if (!v.videoWidth) return done(rej, new Error('codec')); v.currentTime = Math.min(1, (v.duration || 2) / 3); };
    v.onseeked = () => {
      const w = Math.min(TW, v.videoWidth); const hgt = Math.round(v.videoHeight * w / v.videoWidth);
      const c = document.createElement('canvas'); c.width = w; c.height = hgt; c.getContext('2d').drawImage(v, 0, 0, w, hgt);
      c.toBlob((b) => done(res, { blob: b, duration: v.duration, w: v.videoWidth, h: v.videoHeight }), 'image/jpeg', 0.8);
    };
    v.onerror = () => done(rej, new Error('codec'));
    v.src = url;
  });
}
/** Liefert {url, w, h, duration?} oder wirft (z. B. Video-Codec nicht unterstützt). */
export async function thumb(path, page, front = false) {
  const kind = kindOf(path);
  const f = await fileOf(path);
  const k = 't3|' + keyOf(path, f, page);
  if (thumbMem.has(k)) return thumbMem.get(k);
  const p = (async () => {
    let rec = await idbGet('thumbs', k);
    if (!rec) {
      rec = await thumbLimit(async () => {
        if (kind === 'video') { const r = await videoFrame(f); return { blob: r.blob, duration: r.duration, w: r.w, h: r.h }; }
        if (kind === 'pdf') return { blob: await pdfPageBlob(path, page || 1, TW, 0.8), pages: await pdfPages(path) };
        return shrink(await imageBlob(path, page, kind));
      }, front);
      await idbSet('thumbs', k, rec);
    }
    return { ...rec, size: f.size, url: URL.createObjectURL(rec.blob) };
  })();
  thumbMem.set(k, p);
  p.catch(() => thumbMem.delete(k));
  return p;
}

/* ---------- Aufnahmedatum: EXIF → Dateiname → Änderungsdatum ---------- */
const dateMem = new Map();
export function dateFromName(name) {
  let m = name.match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})(?:[ _T-]|\s+at\s+)?(\d{2})[.:\-_ ]?(\d{2})[.:\-_ ]?(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  m = name.match(/(\d{2})\.(\d{2})\.(\d{2}),?\s+(\d{2})[ .:](\d{2})[ .:](\d{2})/);   // «Video 29.08.26, 03 46 04»
  if (m) return new Date(2000 + +m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]);
  m = name.match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return new Date(+m[1], +m[2] - 1, +m[3], 12);
  return null;
}
export async function dateOf(path) {
  if (dateMem.has(path)) return dateMem.get(path);
  const p = (async () => {
    const kind = kindOf(path); const f = await fileOf(path);
    const k = 'd|' + keyOf(path, f);
    const hit = await idbGet('kv', k); if (hit) return new Date(hit);
    let d = null;
    if (kind === 'image' || kind === 'heic' || kind === 'raw') {
      try { const ex = await exifr(); const r = await ex.parse(f, ['DateTimeOriginal', 'CreateDate']); d = r?.DateTimeOriginal || r?.CreateDate || null; } catch { /* kein EXIF */ }
    }
    if (!(d instanceof Date) || isNaN(d)) d = dateFromName(path.slice(path.lastIndexOf('/') + 1));
    if (!d) d = new Date(f.lastModified);
    await idbSet('kv', k, d.getTime());
    return d;
  })();
  dateMem.set(path, p);
  return p;
}

/** Prüft, ob ein Video in diesem Browser abspielbar ist (Codec). */
export function probeVideo(url) {
  return new Promise((res) => {
    const v = document.createElement('video'); v.muted = true; v.preload = 'metadata';
    const to = setTimeout(() => fin(false), 12000);
    const fin = (ok) => { clearTimeout(to); const d = v.duration; v.removeAttribute('src'); v.load(); res(ok ? { ok: true, duration: d } : { ok: false }); };
    v.onloadedmetadata = () => fin(v.videoWidth > 0);
    v.onerror = () => fin(false);
    v.src = url;
  });
}
