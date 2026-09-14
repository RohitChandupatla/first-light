/**
 * FIRST LIGHT — core/dom.js
 * Small DOM utilities. No framework, no dependencies.
 */
export const $ = (id) => document.getElementById(id);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const fmtBytes = (b) =>
  b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`;

let toastTimer;
export function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/**
 * Object-URL lifecycle manager. Each view owns a pool and
 * frees it before re-render — no leaked blobs.
 */
export class URLPool {
  #urls = [];
  url(blob) { const u = URL.createObjectURL(blob); this.#urls.push(u); return u; }
  free() { this.#urls.forEach((u) => URL.revokeObjectURL(u)); this.#urls = []; }
}

/** Media may be a Blob (local backend) or a URL string (cloud backend). */
export const mediaSrc = (pool, m) => (typeof m === 'string' ? m : pool.url(m));

/**
 * Progressive image markup. Shows the tiny blur placeholder instantly,
 * then fades in the sharp asset once decoded. The visitor never sees a
 * soft image sitting there — only a clear loading state, then full clarity.
 */
export function progressiveImg(pool, plate, { cls = '', alt = '', eager = false, size = 'grid' } = {}) {
  const asset = size === 'display' ? (plate.display || plate.grid || plate.thumb)
                                   : (plate.grid || plate.thumb || plate.display);
  const sharp = mediaSrc(pool, asset);
  const blur = plate.blur || '';
  const ratio = plate.width && plate.height ? `${plate.width} / ${plate.height}` : '';
  return `<div class="pimg ${cls}"${ratio ? ` style="aspect-ratio:${ratio}"` : ''}>
    ${blur ? `<img class="pimg-blur" src="${blur}" alt="" aria-hidden="true">` : ''}
    <img class="pimg-sharp" src="${sharp}" alt="${esc(alt)}"
         ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"
         onload="this.classList.add('ready')">
  </div>`;
}
