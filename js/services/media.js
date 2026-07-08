/**
 * FIRST LIGHT — services/media.js
 * Client-side media processing: resized JPEG thumbnails for
 * photos, poster-frame capture for videos. Pure functions,
 * no app state.
 */
import { MEDIA } from '../config.js';

export function makeImageThumb(file, max = MEDIA.THUMB_MAX_PX) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('thumb encode failed'))), 'image/jpeg', MEDIA.THUMB_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(u); reject(new Error('image load failed')); };
    img.src = u;
  });
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
      c.getContext('2d').drawImage(v, 0, 0);
      URL.revokeObjectURL(u);
      c.toBlob(
        (b) => (b ? resolve({ poster: b, duration: v.duration }) : reject(new Error('poster failed'))),
        'image/jpeg', MEDIA.POSTER_QUALITY,
      );
    };
    v.onerror = () => { URL.revokeObjectURL(u); reject(new Error('video load failed')); };
  });
}
