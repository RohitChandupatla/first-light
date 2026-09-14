/**
 * FIRST LIGHT — ui/carousel.js
 * Featured showcase at the top of the gallery.
 */
import { $, esc, URLPool, mediaSrc } from '../core/dom.js';

const pool = new URLPool();
let slides = [];
let idx = 0;
let timer = null;
const INTERVAL = 5000;

let onSlideClick = () => {};
export function onClick(fn) { onSlideClick = fn; }

export function render(featured) {
  pool.free();
  slides = featured;
  const wrap = $('carousel');
  if (!wrap) return;

  if (!slides.length) { wrap.style.display = 'none'; stop(); return; }
  wrap.style.display = 'block';
  idx = 0;

  wrap.innerHTML = `
    <div class="car-track" id="carTrack">
      ${slides.map((p, i) => `
        <div class="car-slide ${i === 0 ? 'active' : ''}" data-i="${i}">
          ${p.type === 'video'
            ? `<div class="car-bg" style="background-image:url('${mediaSrc(pool, p.thumb)}')"></div>
               <video class="car-media" muted loop playsinline preload="metadata" poster="${mediaSrc(pool, p.thumb)}"><source src="${mediaSrc(pool, p.blob)}"></video>`
            : `<div class="car-bg" style="background-image:url('${mediaSrc(pool, p.blob || p.thumb)}')"></div>
               <img class="car-media" src="${mediaSrc(pool, p.blob || p.thumb)}" alt="${esc(p.title || '')}" onload="this.classList.add('loaded')">`}
        </div>`).join('')}
    </div>
    ${slides.length > 1 ? `
      <button class="car-nav prev" data-car="prev" aria-label="Previous">‹</button>
      <button class="car-nav next" data-car="next" aria-label="Next">›</button>
      <div class="car-dots" id="carDots">
        ${slides.map((_, i) => `<button class="car-dot ${i === 0 ? 'on' : ''}" data-car-dot="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}
      </div>` : ''}
  `;

  bindOnce(wrap);
  play();
}

function show(n) {
  if (!slides.length) return;
  idx = (n + slides.length) % slides.length;
  const track = $('carTrack');
  if (!track) return;
  track.querySelectorAll('.car-slide').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
    const v = el.querySelector('video');
    if (v) { if (i === idx) { v.play().catch(() => {}); } else { v.pause(); } }
  });
  const dots = $('carDots');
  if (dots) dots.querySelectorAll('.car-dot').forEach((d, i) => d.classList.toggle('on', i === idx));
}

const next = () => show(idx + 1);
const prev = () => show(idx - 1);

function play() { stop(); if (slides.length > 1) timer = setInterval(next, INTERVAL); }
function stop() { if (timer) { clearInterval(timer); timer = null; } }

let bound = false;
function bindOnce(wrap) {
  wrap.onclick = (e) => {
    const nav = e.target.closest('[data-car]');
    if (nav) { nav.dataset.car === 'next' ? next() : prev(); play(); return; }
    const dot = e.target.closest('[data-car-dot]');
    if (dot) { show(Number(dot.dataset.carDot)); play(); return; }
    const slide = e.target.closest('.car-slide');
    if (slide) onSlideClick(slides[Number(slide.dataset.i)]);
  };
  wrap.onmouseenter = stop;
  wrap.onmouseleave = play;

  if (bound) return;
  bound = true;

  document.addEventListener('keydown', (e) => {
    if ($('lb')?.classList.contains('active')) return;
    if (!slides.length) return;
    if (e.key === 'ArrowRight') { next(); play(); }
    if (e.key === 'ArrowLeft') { prev(); play(); }
  });

  let x0 = 0, tracking = false;
  wrap.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; tracking = true; stop(); }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    if (!tracking) return; tracking = false;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) (dx < 0 ? next() : prev());
    play();
  }, { passive: true });
}