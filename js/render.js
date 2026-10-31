/* Diashow — gemeinsame Darstellung von Titelfolien und Wasserzeichen.
 * Wird für Beamer, Referentensicht, Editor-Kacheln und Vorschau verwendet.
 * Grössen sind in cqh (Prozent der Höhe des umgebenden Rahmens) angegeben,
 * damit die Vorschau genau gleich aussieht wie der Beamer – nur kleiner.
 */
import { h } from './util.js';
import { imageBlob } from './media.js';

export const BUILTIN = [{ path: 'app:img/wicki-logo.png', name: 'Wicki Partners Ballonteam' }];

export const TITLE_DEFAULT = {
  bg: 'gradient', c1: '#10233b', c2: '#070d16', bgPath: '', dim: 0.35,
  color: '#f2f5f9', size: 9, subSize: 4.5, font: 'sans', bold: true,
  align: 'center', valign: 'middle',
  logoPath: '', logoPos: 'above', logoSize: 22,
};
export const PRESETS = {
  night: { bg: 'gradient', c1: '#10233b', c2: '#070d16', color: '#f2f5f9' },
  day: { bg: 'gradient', c1: '#ffffff', c2: '#e6eaf0', color: '#12161c' },
  amber: { bg: 'gradient', c1: '#c8801f', c2: '#7a4a0e', color: '#ffffff' },
  green: { bg: 'gradient', c1: '#1d8a56', c2: '#0c4a2d', color: '#ffffff' },
  black: { bg: 'solid', c1: '#000000', c2: '#000000', color: '#ffffff' },
  white: { bg: 'solid', c1: '#ffffff', c2: '#ffffff', color: '#12161c' },
};
export const WM_DEFAULT = { path: '', pos: 'br', size: 12, op: 0.85, plate: false, plateColor: '#ffffff', plateOp: 0.85 };
export const FONTS = {
  sans: "Inter, 'Segoe UI', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'IBM Plex Mono', Consolas, monospace",
};
export const tstyle = (s) => ({ ...TITLE_DEFAULT, ...(s.ts || {}) });

/* ---------- Logos/Bilder als URL (zwischengespeichert) ---------- */
const urls = new Map();
export function assetUrl(path) {
  if (!path) return Promise.resolve('');
  if (path.startsWith('app:')) return Promise.resolve(new URL(path.slice(4), location.href).href);
  if (!urls.has(path)) {
    const p = imageBlob(path).then((b) => URL.createObjectURL(b));
    urls.set(path, p); p.catch(() => urls.delete(path));
  }
  return urls.get(path);
}
const ready = new Map();   // path -> url, sobald geladen (für synchrones Zeichnen in der Vorführung)
export async function preloadAsset(path) { if (!path) return; const u = await assetUrl(path); ready.set(path, u); }
function setSrc(img, path) {
  if (ready.has(path)) { img.src = ready.get(path); return; }
  assetUrl(path).then((u) => { ready.set(path, u); img.src = u; }).catch(() => { img.remove(); });
}
/** Alle Logo-/Hintergrund-Pfade einer Folie. */
export function assetPaths(s) {
  const out = [];
  if (s.type === 'title') { const ts = tstyle(s); if (ts.bg === 'image' && ts.bgPath) out.push(ts.bgPath); if (ts.logoPath) out.push(ts.logoPath); }
  if (s.wm?.path) out.push(s.wm.path);
  return out;
}

/* ---------- Titelfolie ---------- */
export function titleNode(s) {
  const ts = tstyle(s);
  const bg = ts.bg === 'solid' ? ts.c1 : ts.bg === 'gradient' ? `linear-gradient(135deg, ${ts.c1}, ${ts.c2})` : '#000';
  const el = h('div.tslide', { style: { background: bg, color: ts.color, fontFamily: FONTS[ts.font] || FONTS.sans, textAlign: ts.align,
    alignItems: { left: 'flex-start', center: 'center', right: 'flex-end' }[ts.align], justifyContent: { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[ts.valign] } });
  if (ts.bg === 'image' && ts.bgPath) {
    const im = h('img.tbg', { alt: '' }); setSrc(im, ts.bgPath);
    el.append(im, h('div.tdim', { style: { background: `rgba(0,0,0,${ts.dim})` } }));
  }
  const logo = () => { const im = h('img.tlogo', { alt: '', style: { height: ts.logoSize + 'cqh' } }); setSrc(im, ts.logoPath); return im; };
  const inflow = ts.logoPath && (ts.logoPos === 'above' || ts.logoPos === 'below');
  if (ts.logoPath && inflow && ts.logoPos === 'above') el.append(logo());
  if (s.cap) el.append(h('div.ttext', { style: { fontSize: ts.size + 'cqh', fontWeight: ts.bold ? 700 : 400 } }, s.cap));
  if (s.sub) el.append(h('div.tsub', { style: { fontSize: ts.subSize + 'cqh' } }, s.sub));
  if (ts.logoPath && inflow && ts.logoPos === 'below') el.append(logo());
  if (ts.logoPath && !inflow) { const im = logo(); im.classList.add('abs', 'p-' + ts.logoPos); el.append(im); }
  return el;
}

/* ---------- Wasserzeichen ---------- */
/** Wasserzeichen: Logo in einem Rahmen, wahlweise auf farbiger Platte (für transparente Logos). */
export function wmNode(wm) {
  if (!wm?.path) return null;
  const im = h('img', { alt: '' });
  setSrc(im, wm.path);
  const box = h('div.wm', im);
  styleWm(box, wm);
  return box;
}
/** Grösse, Deckkraft, Position und Platte direkt am bestehenden Element setzen (schnell, ohne Neuaufbau). */
export function styleWm(box, wm) {
  const w = { ...WM_DEFAULT, ...wm };
  box.className = 'wm p-' + w.pos + (w.plate ? ' plate' : '');
  box.style.opacity = w.op;
  box.style.background = w.plate ? hexA(w.plateColor, w.plateOp) : 'transparent';
  const im = box.firstChild; if (im) im.style.height = w.size + 'cqh';
}
function hexA(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Ausschnitt (Bruchteile 0..1) als CSS object-view-box – das Original bleibt unverändert. */
export function cropView(c) {
  if (!c || (c.x <= 0.0005 && c.y <= 0.0005 && c.w >= 0.999 && c.h >= 0.999)) return '';
  const pc = (v) => (Math.max(0, v) * 100).toFixed(2) + '%';
  return `inset(${pc(c.y)} ${pc(1 - c.x - c.w)} ${pc(1 - c.y - c.h)} ${pc(c.x)})`;
}
