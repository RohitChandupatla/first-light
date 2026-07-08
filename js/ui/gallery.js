/**
 * FIRST LIGHT — ui/gallery.js
 * Public-site rendering: plate grid, filters, collections,
 * hero index, studio storage stats. Read-only view over the
 * Plates repository.
 */
import { COLLECTIONS, GRID_SPANS, demoPlates } from '../config.js';
import { Plates } from '../services/data.js';
import { $, esc, fmtBytes, URLPool, mediaSrc } from '../core/dom.js';

const pool = new URLPool();
let visible = [];            // plates currently in the grid (post-filter)
let currentFilter = 'All';

export const getVisible = () => visible;
export const getFilter = () => currentFilter;

export async function setFilter(name) {
  currentFilter = name;
  await render();
}

export async function render() {
  pool.free();

  const live = await Plates.published();
  const demo = live.length === 0;
  $('demoTag').style.display = demo ? 'block' : 'none';

  const source = demo ? demoPlates() : live;
  visible = currentFilter === 'All' ? source : source.filter((p) => p.collection === currentFilter);

  renderFilters();
  renderGrid();
  renderCounts(source);
  await renderStudioStats(live);
}

function renderFilters() {
  $('filters').innerHTML = ['All', ...COLLECTIONS]
    .map((c) => `<button class="fbtn ${c === currentFilter ? 'active' : ''}" data-action="filter" data-filter="${c}">${c}</button>`)
    .join('');
}

function renderGrid() {
  const grid = $('grid');
  $('emptyNote').style.display = visible.length ? 'none' : 'block';

  grid.innerHTML = visible.map((p, i) => {
    const span = GRID_SPANS[i % GRID_SPANS.length];
    const exif = [p.gear, p.location].filter(Boolean).join(' · ') || (p.type === 'video' ? 'Film' : 'Photograph');
    const media = p.demo
      ? `<div class="photo" style="background:${p.bg}"></div>`
      : `<img class="photo" src="${mediaSrc(pool, p.thumb)}" alt="${esc(p.title)}" loading="lazy" decoding="async">`;
    return `
      <div class="plate ${span}" data-action="open-plate" data-index="${i}" role="button" tabindex="0">
        <span class="pl">Pl. ${String(i + 1).padStart(2, '0')}</span>
        <span class="type">${p.type === 'video' ? 'Film' : esc(p.collection || 'Photo')}</span>
        <div class="img">${media}${p.type === 'video' ? '<div class="playic"><span>▶</span></div>' : ''}</div>
        <div class="cap"><div><div class="exif">${esc(exif)}</div></div></div>
      </div>`;
  }).join('');
}

function renderCounts(source) {
  const counts = Object.fromEntries(COLLECTIONS.map((c) => [c, source.filter((p) => p.collection === c).length]));
  const n = source.length;

  $('workMeta').innerHTML = `Contact sheet<br>${n} plate${n !== 1 ? 's' : ''}`;
  $('colMeta').innerHTML = `${COLLECTIONS.length} series<br>${n} plates total`;

  $('colList').innerHTML = COLLECTIONS.map((c, i) => `
    <button class="col-row" data-action="open-collection" data-filter="${c}">
      <span class="cno">0${i + 1}</span><span class="cname">${c}</span>
      <span class="ccount">${counts[c]} plate${counts[c] !== 1 ? 's' : ''} →</span>
    </button>`).join('');

  $('heroToc').innerHTML = [
    `<button class="toc-row" data-action="go-section" data-target="work"><span class="name">Selected Work</span><span class="no">${n} pl.</span></button>`,
    ...COLLECTIONS.map((c) => `<button class="toc-row" data-action="open-collection" data-filter="${c}"><span class="name">${c}</span><span class="no">${counts[c]}</span></button>`),
  ].join('');
}

async function renderStudioStats(live) {
  const all = await Plates.all();
  const bytes = all.reduce((s, p) => s + (p.size || 0), 0);
  $('usageBig').textContent = all.length ? fmtBytes(bytes) : '0 MB';
  $('countBig').textContent = all.length;
  $('countSm').textContent = `${live.length} live · ${all.length - live.length} drafts`;
}
