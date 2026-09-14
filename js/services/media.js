/**
 * FIRST LIGHT — services/media.js
 * Every upload produces three assets:
 *   blur    — ~32px JPEG data URI. Instant loading state, never a "bad photo".
 *   display — high-quality resize for grid & carousel. Sharp on retina.
 *   full    — the untouched original, used in the lightbox.
 * Step-down scaling keeps the display asset genuinely crisp.
 */
import { MEDIA } from '../config.js';

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => { img._url = u; resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('image load failed')); };
    img.src = u;
  });
}

function resizeTo(img, targetMax, quality) {
  let sw = img.width, sh = img.height;
  const scale = Math.min(1, targetMax / Math.max(sw, sh));
  const tw = Math.round(sw * scale), th = Math.round(sh * scale);

  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  canvas.width = sw; canvas.height = sh;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0);

  while (sw > tw * 2 && sh > th * 2) {
    const nw = Math.max(tw, Math.round(sw / 2));
    const nh = Math.max(th, Math.round(sh / 2));
    const next = document.createElement('canvas');
    next.width = nw; next.height = nh;
    const nctx = next.getContext('2d');
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = 'high';
    nctx.drawImage(canvas, 0, 0, nw, nh);
    canvas = next; sw = nw; sh = nh;
  }

  const out = document.createElement('canvas');
  out.width = tw; out.height = th;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(canvas, 0, 0, tw, th);

  return new Promise((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality);
  });
}

function blurFromCanvasSource(src, w, h) {
  const scale = Math.min(1, MEDIA.BLUR_PX / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', MEDIA.BLUR_QUALITY);
}

export async function processImage(file) {
  const img = await loadImage(file);
  try {
    const blur = blurFromCanvasSource(img, img.width, img.height);
    const grid = await resizeTo(img, MEDIA.GRID_MAX_PX, MEDIA.GRID_QUALITY);
    const display = await resizeTo(img, MEDIA.DISPLAY_MAX_PX, MEDIA.DISPLAY_QUALITY);
    return { blur, grid, display, width: img.width, height: img.height };
  } finally {
    if (img._url) URL.revokeObjectURL(img._url);
  }
}

/** Legacy name kept for compatibility — returns the display asset. */
export async function makeImageThumb(file) {
  const { grid } = await processImage(file);
  return grid;
}

export function makeVideoPoster(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    const u = URL.createObjectURL(file);
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = u;
    v.onloadedmetadata = () => { v.currentTime = Math.min(1.2, (v.duration || 2) / 3); };
    v.onseeked = () => {
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(v, 0, 0);
      const blur = blurFromCanvasSource(c, c.width, c.height);
      const duration = v.duration, w = v.videoWidth, h = v.videoHeight;
      URL.revokeObjectURL(u);
      c.toBlob(
        (b) => (b ? resolve({ poster: b, blur, duration, width: w, height: h })
                  : reject(new Error('poster failed'))),
        'image/jpeg', MEDIA.POSTER_QUALITY,
      );
    };
    v.onerror = () => { URL.revokeObjectURL(u); reject(new Error('video load failed')); };
  });
}
