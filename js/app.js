/**
 * FIRST LIGHT — app.js
 * Bootstrap + controller. One delegated click handler routes
 * every [data-action]; views stay dumb, repositories own data.
 */
import * as db from './core/db.js';
import { $, toast } from './core/dom.js';
import { onPlatesChanged, Auth } from './services/data.js';
import * as Gallery from './ui/gallery.js';
import * as Lightbox from './ui/lightbox.js';
import * as Darkroom from './ui/darkroom.js';

/* ---------------- View routing ---------------- */
function renderDarkroomGate() {
  const authed = !Auth || Auth.current();
  $('drLogin').style.display = authed ? 'none' : 'block';
  $('drWork').style.display = authed ? 'block' : 'none';
  $('logoutBtn').style.display = (Auth && Auth.current()) ? '' : 'none';
  $('drStatus').textContent = authed
    ? 'Bring in new frames, develop the details, and decide what the world sees.'
    : 'Sign in to manage your portfolio. Visitors never see this area.';
  if (authed) Darkroom.renderManage();
}

async function openDarkroom() {
  $('site').style.display = 'none';
  $('darkroom').classList.add('active');
  window.scrollTo(0, 0);
  if (Auth) await Auth.ready;   // wait for restored session before gating
  renderDarkroomGate();
}

async function doLogin() {
  const err = $('loginErr');
  err.textContent = '';
  try {
    await Auth.signIn($('loginEmail').value.trim(), $('loginPass').value);
    renderDarkroomGate();
    toast('Welcome back.');
  } catch (e) {
    err.textContent = 'Sign-in failed — check email and password.';
  }
}

async function doLogout() {
  await Auth.signOut();
  renderDarkroomGate();
  toast('Signed out.');
}
function showSite() {
  $('darkroom').classList.remove('active');
  $('site').style.display = 'block';
}
function goSection(id) {
  showSite();
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }));
}

/* ---------------- Delegated actions ---------------- */
const actions = {
  'open-darkroom': () => openDarkroom(),
  'show-site': () => showSite(),
  'go-section': (el) => goSection(el.dataset.target),
  'open-collection': (el) => { Gallery.setFilter(el.dataset.filter); goSection('work'); },
  'filter': (el) => Gallery.setFilter(el.dataset.filter),
  'open-plate': (el) => Lightbox.open(Number(el.dataset.index)),
  'lb-close': () => Lightbox.close(),
  'lb-prev': () => Lightbox.step(-1),
  'lb-next': () => Lightbox.step(1),
  'dr-tab': (el) => Darkroom.switchTab(el.dataset.tab),
  'picker-open': () => $('picker').click(),
  'stage-remove': (el) => Darkroom.stageRemove(el.dataset.id),
  'publish-live': () => Darkroom.publishStaged(true),
  'publish-draft': () => Darkroom.publishStaged(false),
  'plate-toggle': (el) => Darkroom.togglePlate(el.dataset.id),
  'plate-edit': (el) => Darkroom.openEditor(el.dataset.id),
  'plate-delete': (el) => Darkroom.armDelete(el),
  'edit-save': (el) => Darkroom.saveEditor(el.dataset.id),
  'edit-cancel': () => Darkroom.renderManage(),
  'save-settings': () => Darkroom.saveSettingsForm(),
  'login': () => doLogin(),
  'logout': () => doLogout(),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el); }
});

// Keyboard "Enter" opens plates (grid items are role=button)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const el = e.target.closest('[data-action="open-plate"]');
  if (el) Lightbox.open(Number(el.dataset.index));
});

// Staged-row inline edits (event delegation on change)
$('staged').addEventListener('change', (e) => {
  const field = e.target.dataset.field;
  const row = e.target.closest('[data-id]');
  if (field && row) Darkroom.stageUpdate(row.dataset.id, field, e.target.value);
});

/* ---------------- Upload wiring ---------------- */
$('picker').addEventListener('change', (e) => Darkroom.ingest(e.target.files));
const dz = $('dropzone');
['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
dz.addEventListener('drop', (e) => Darkroom.ingest(e.dataTransfer.files));

/* ---------------- Reactive re-render ---------------- */
onPlatesChanged(async () => {
  await Gallery.render();
  if ($('darkroom').classList.contains('active')) Darkroom.renderManage();
});

/* ---------------- Scroll reveal ---------------- */
function bindReveals() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

/* ---------------- Boot ---------------- */
(async function boot() {
  await db.open();
  if (db.isMemoryMode()) {
    $('drStatus').textContent = 'Note: this environment cannot persist between sessions — open via a local server or normal browser for full persistence.';
  }
  await Darkroom.loadSettingsForm();
  await Gallery.render();
  Lightbox.bind();
  bindReveals();

  // Console/dev API — handy for debugging & tests, not used by the UI.
  window.__FL = { Gallery, Lightbox, Darkroom, openDarkroom, showSite };
})();
