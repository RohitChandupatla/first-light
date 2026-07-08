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
