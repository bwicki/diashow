/* Diashow — Zuschneiden (Ausschnitt). Das Original bleibt unverändert; gespeichert
 * wird nur der Ausschnitt als Bruchteile {x, y, w, h} in der Diashow-Datei.
 */
import { t } from '../i18n.js';
import { h, dialog } from '../util.js';
import { imageBlob } from '../media.js';

const RATIOS = [['free', null], ['16:9', 16 / 9], ['4:3', 4 / 3], ['3:2', 3 / 2], ['1:1', 1]];

/** Liefert den neuen Ausschnitt, null (= ganzes Bild) oder undefined (abgebrochen). */
export async function cropDialog(s) {
  const blob = await imageBlob(s.path, s.page, s.kind);
  const url = URL.createObjectURL(blob);
  const img = h('img', { src: url, alt: '' });
  await img.decode().catch(() => {});
  const IW = img.naturalWidth || 1, IH = img.naturalHeight || 1;
  let c = s.crop ? { ...s.crop } : { x: 0, y: 0, w: 1, h: 1 };
  let ratio = null;
  const sel = h('div.cropsel', ['nw', 'ne', 'sw', 'se'].map((k) => h('div.hd.' + k, { dataset: { k } })));
  const boxEl = h('div.cropbox', img, sel);
  const info = h('span.note');
  // Bildfläche innerhalb der Box (object-fit: contain)
  const area = () => { const r = boxEl.getBoundingClientRect(); const s0 = Math.min(r.width / IW, r.height / IH); const w = IW * s0, hh = IH * s0; return { x: (r.width - w) / 2, y: (r.height - hh) / 2, w, h: hh, r }; };
  const draw = () => {
    const a = area();
    Object.assign(sel.style, { left: a.x + c.x * a.w + 'px', top: a.y + c.y * a.h + 'px', width: c.w * a.w + 'px', height: c.h * a.h + 'px' });
    info.textContent = `${Math.round(c.w * IW)} × ${Math.round(c.h * IH)} px`;
  };
  const clamp = () => { c.w = Math.min(1, Math.max(0.05, c.w)); c.h = Math.min(1, Math.max(0.05, c.h)); c.x = Math.min(1 - c.w, Math.max(0, c.x)); c.y = Math.min(1 - c.h, Math.max(0, c.y)); };
  const applyRatio = () => {
    if (!ratio) return;
    // Seitenverhältnis in Pixeln: (w*IW)/(h*IH) = ratio
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    let w = c.w, hh = (c.w * IW) / ratio / IH;
    if (hh > 1) { hh = 1; w = (ratio * IH) / IW; }
    c = { x: cx - w / 2, y: cy - hh / 2, w, h: hh }; clamp();
  };
  let drag = null;
  sel.addEventListener('pointerdown', (e) => { e.preventDefault(); sel.setPointerCapture(e.pointerId); drag = { k: e.target.dataset.k || 'move', x0: e.clientX, y0: e.clientY, c0: { ...c } }; });
  sel.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const a = area(); const dx = (e.clientX - drag.x0) / a.w, dy = (e.clientY - drag.y0) / a.h; const o = drag.c0;
    if (drag.k === 'move') c = { ...o, x: o.x + dx, y: o.y + dy };
    else {
      let x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h;
      if (drag.k.includes('w')) x0 += dx; if (drag.k.includes('e')) x1 += dx;
      if (drag.k.includes('n')) y0 += dy; if (drag.k.includes('s')) y1 += dy;
      let w = Math.max(0.05, x1 - x0), hh = Math.max(0.05, y1 - y0);
      if (ratio) { hh = (w * IW) / ratio / IH; if (drag.k.includes('n')) y0 = y1 - hh; }
      c = { x: drag.k.includes('w') ? x1 - w : x0, y: drag.k.includes('n') ? y0 : y0, w, h: hh };
    }
    clamp(); draw();
  });
  sel.addEventListener('pointerup', () => { drag = null; });
  const ratioBtns = RATIOS.map(([l, r]) => h('button.chip' + (r === ratio ? '.on' : ''), { type: 'button', onclick: (e) => { ratio = r; e.currentTarget.parentNode.querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); applyRatio(); draw(); } }, l === 'free' ? t('cropFree') : l));
  const bar = h('div.cropbar', [h('span.lbl', t('cropRatio')), ...ratioBtns, h('span.sp'), h('button.btn.mini', { type: 'button', onclick: () => { c = { x: 0, y: 0, w: 1, h: 1 }; draw(); } }, t('cropReset')), info]);
  const ro = new ResizeObserver(draw); ro.observe(boxEl);
  const r = await dialog(t('cropTitle'), [bar, boxEl, h('p.note', t('cropHint'))], [{ label: t('cancel'), value: null }, { label: t('pickUse'), value: 'ok', primary: true }], { cls: 'xwide', enter: false });
  ro.disconnect(); URL.revokeObjectURL(url);
  if (r !== 'ok') return undefined;
  if (c.x <= 0.001 && c.y <= 0.001 && c.w >= 0.999 && c.h >= 0.999) return null;
  return { x: +c.x.toFixed(4), y: +c.y.toFixed(4), w: +c.w.toFixed(4), h: +c.h.toFixed(4) };
}
