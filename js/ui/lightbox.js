/**
 * FIRST LIGHT — ui/lightbox.js
 * Full-screen viewer for photos & film. Keyboard on desktop,
 * swipe gestures on touch (left/right = navigate, down = close)
 * with live drag feedback for a native-app feel.
 */
import { $, esc, fmtBytes, URLPool } from '../core/dom.js';
import { getVisible } from './gallery.js';

const pool = new URLPool();
let cur = 0;

export function open(index) {
  cur = index;
  paint();
  $('lb').classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function close() {
  $('lb').classList.remove('active');
  document.body.style.overflow = '';
  $('lbMediaHolder').innerHTML = '';   // detaches <video> → stops playback
  pool.free();
}

export function step(n) {
  const plates = getVisible();
  if (!plates.length) return;
  cur = (cur + n + plates.length) % plates.length;
  paint();
}

export const isOpen = () => $('lb').classList.contains('active');

function paint() {
  const plates = getVisible();
  const p = plates[cur];
  if (!p) return;

  pool.free();
  const holder = $('lbMediaHolder');
  holder.innerHTML = '';

  let media;
  if (p.demo) {
    media = document.createElement('div');
    media.className = 'media';
    media.style.cssText = `width:min(100%,1000px);aspect-ratio:3/2;background:${p.bg}`;
  } else if (p.type === 'video') {
    media = document.createElement('video');
    media.className = 'media';
    media.controls = true;
    media.playsInline = true;
    media.preload = 'metadata';
    media.src = pool.url(p.blob);
    media.poster = pool.url(p.thumb);
  } else {
    media = document.createElement('img');
    media.className = 'media';
    media.alt = p.title;
    media.decoding = 'async';
    media.src = pool.url(p.blob);
  }
  holder.appendChild(media);

  $('lbpl').textContent = `Plate ${String(cur + 1).padStart(2, '0')} / ${String(plates.length).padStart(2, '0')}`;
  $('lbtitle').textContent = p.title;
  $('lbdesc').textContent = p.story || '';

  const rows = [
    ['Series', p.collection],
    ['Shot on', p.gear],
    ['Location', p.location],
    ['Date', p.dateTaken],
    ['Type', p.type === 'video' ? `Film${p.duration ? ` · ${Math.round(p.duration)}s` : ''}` : 'Photograph'],
    ['Size', p.size ? fmtBytes(p.size) : null],
  ].filter(([, v]) => v);
  $('lbexif').innerHTML = rows
    .map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`)
    .join('');
}

/* ---------------- Input bindings ---------------- */
export function bind() {
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  // Swipe gestures with drag feedback (passive listeners — never block scroll)
  const stage = document.querySelector('.lb .stage');
  let x0 = 0, y0 = 0, dx = 0, dy = 0, tracking = false;

  stage.addEventListener('touchstart', (e) => {
    if (e.target.closest('video')) return;      // let video controls own their touches
    const t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY; dx = 0; dy = 0; tracking = true;
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    dx = t.clientX - x0; dy = t.clientY - y0;
    const media = stage.querySelector('.media');
    if (media && Math.abs(dx) > Math.abs(dy)) {
      media.style.transform = `translateX(${dx * 0.4}px)`;
      media.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.4));
    }
  }, { passive: true });

  stage.addEventListener('touchend', () => {
    if (!tracking) return;
    tracking = false;
    const media = stage.querySelector('.media');
    if (media) { media.style.transform = ''; media.style.opacity = ''; }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });
}
