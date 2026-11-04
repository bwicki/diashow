/* Diashow — Bildtext: automatischer Text aus den Aufnahmedaten (Ort, Datum, Zeit) und
 * Schriftfarbe nach Helligkeit des Bildes hinter dem Text.
 *
 * Einstellungen der Diashow (settings):
 *   autoCap   'off' | 'on'   (ältere Werte 'date' | 'datetime' | 'datetimeplace' werden übernommen)
 *   capFields { place, date, time }
 *   capNoGps  'show' | 'hide'   Dias ohne GPS: Datum/Zeit trotzdem zeigen oder gar nichts
 *   capPos    'br' | 'bl' | 'tr' | 'tl'
 * Pro Dia: capTone 'auto' | 'light' (helle Schrift) | 'dark' (dunkle Schrift).
 * Datum und Zeit nur aus EXIF – nie aus Dateiname oder Dateidatum (wäre bei WhatsApp/Dropbox oft falsch).
 */
import { h } from './util.js';
import { exifMeta, placeOf } from './geo.js';

export const CAP_POS = ['tl', 'tr', 'bl', 'br'];

/** Einstellungen vereinheitlichen (auch alte Diashow-Dateien). */
export function capCfg(S) {
  const legacy = S.autoCap && S.autoCap !== 'off' && S.autoCap !== 'on' ? S.autoCap : null;
  const on = !!S.autoCap && S.autoCap !== 'off';
  const fields = S.capFields || (legacy
    ? { place: legacy === 'datetimeplace', date: true, time: legacy !== 'date' }
    : { place: true, date: true, time: true });
  return { on, fields: { place: !!fields.place, date: !!fields.date, time: !!fields.time }, noGps: S.capNoGps || 'show', pos: CAP_POS.includes(S.capPos) ? S.capPos : 'br' };
}
/** Alte Einstellung in die neue Form bringen (einmal beim Öffnen). */
export function migrateCap(S) {
  const l = S.autoCap;
  if (l && l !== 'off' && l !== 'on') { S.capFields = { place: l === 'datetimeplace', date: true, time: l !== 'date' }; S.autoCap = 'on'; }
  return S;
}
export const capSig = (S) => JSON.stringify(capCfg(S));

/** Text aus den Aufnahmedaten, z. B. «CH-Baden · 29.08.2026 · 08:16»; '' wenn nichts passt. */
export async function autoText(path, S) {
  const c = capCfg(S);
  if (!c.on || !path) return '';
  const m = await exifMeta(path);
  if (!m.gps && c.noGps === 'hide') return '';
  const parts = [];
  if (c.fields.place && m.gps) { const p = await placeOf(path); if (p) parts.push(p); }
  if (m.date && c.fields.date) parts.push(m.date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  if (m.date && c.fields.time) parts.push(m.date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }));
  return parts.join(' · ');
}

/** Ecke des automatischen Bildtexts; steht das Logo in derselben Ecke, weicht der Text zur anderen Seite aus. */
export function capCorner(S, s) {
  const p = capCfg(S).pos;
  const w = s?.wm?.path ? (s.wm.pos || 'br') : '';
  return w === p ? p[0] + (p[1] === 'r' ? 'l' : 'r') : p;
}
/** Bereich des Textes als Bruchteile der Bildfläche [x0, y0, x1, y1]. */
export function capRegion(auto, corner) {
  if (!auto) return [0.1, 0.8, 0.9, 0.95];
  const x = corner[1] === 'r' ? [0.55, 0.97] : [0.03, 0.45];
  const y = corner[0] === 'b' ? [0.88, 0.98] : [0.02, 0.12];
  return [x[0], y[0], x[1], y[1]];
}

/** Helligkeit hinter dem Text messen → 'dark' (dunkle Schrift) oder 'light' (helle Schrift).
 *  src: ImageBitmap oder geladenes <img>; Fläche wie auf dem Beamer (Seitenverhältnis ar, contain/cover, Hochformat-Hintergrund). */
export function measureTone(src, { crop, fit = 'contain', portraitBg = true, ar = 16 / 9, region }) {
  const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
  if (!iw || !ih) return 'light';
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const sx = c.x * iw, sy = c.y * ih, sw = c.w * iw, sh = c.h * ih;
  const W = 192, H = Math.round(W / ar);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const place = (cover) => { const k = cover ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh); const dw = sw * k, dh = sh * k; return [(W - dw) / 2, (H - dh) / 2, dw, dh]; };
  if (fit === 'contain' && portraitBg) { x.drawImage(src, sx, sy, sw, sh, ...place(true)); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 0, W, H); }
  x.drawImage(src, sx, sy, sw, sh, ...place(fit === 'cover'));
  const [a, b, e, f] = region;
  const rx = Math.floor(a * W), ry = Math.floor(b * H), rw = Math.max(1, Math.floor((e - a) * W)), rh = Math.max(1, Math.floor((f - b) * H));
  let d; try { d = x.getImageData(rx, ry, rw, rh).data; } catch { return 'light'; }
  let sum = 0, bright = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    sum += l; if (l > 0.72) bright++;
  }
  // helle Fläche oder viele sehr helle Stellen (Himmel, Schnee) → dunkle Schrift
  return sum / n > 0.58 || bright / n > 0.45 ? 'dark' : 'light';
}

/** Bildtext-Element für Beamer, Vorschau und Betrachter. */
export function capNode(text, { auto, corner, tone, liftForWm }) {
  const el = h('div.cap' + (auto ? '.auto.at-' + corner : '') + (tone === 'dark' ? '.dark' : ''), text);
  if (liftForWm) el.style.bottom = `calc(5% + ${liftForWm + 5}cqh)`;
  return el;
}
