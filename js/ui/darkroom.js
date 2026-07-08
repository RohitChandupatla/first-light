/**
 * FIRST LIGHT — ui/darkroom.js
 * The photographer's private workspace: bring in frames
 * (upload + staging), develop & publish (manage), and studio
 * details (settings).
 */
import { COLLECTIONS } from '../config.js';
import { Plates, Settings } from '../services/data.js';
import { makeImageThumb, makeVideoPoster } from '../services/media.js';
import { $, esc, fmtBytes, toast, URLPool, mediaSrc } from '../core/dom.js';

const stagePool = new URLPool();
const managePool = new URLPool();
let staged = [];

/* ---------------- Ingest & staging ---------------- */
export async function ingest(files) {
  const media = [...files].filter((f) => /^image\/|^video\//.test(f.type));
  if (!media.length) { toast('No photos or videos found in that drop.'); return; }

  $('progress').classList.add('active');
  let done = 0;

  for (const file of media) {
    try {
      const isVideo = file.type.startsWith('video/');
      const entry = {
        id: Plates.newId(),
        title: '',
        type: isVideo ? 'video' : 'image',
        size: file.size,
        blob: file,
        collection: COLLECTIONS[0],
        createdAt: Date.now(),
      };
      if (isVideo) {
        const { poster, duration } = await makeVideoPoster(file);
        entry.thumb = poster; entry.duration = duration;
      } else {
        entry.thumb = await makeImageThumb(file);
      }
      staged.push(entry);
    } catch {
      toast('Skipped a file that could not be read.');
    }
    done += 1;
    $('progressBar').style.width = `${(done / media.length) * 100}%`;
  }

  setTimeout(() => { $('progress').classList.remove('active'); $('progressBar').style.width = '0'; }, 500);
  $('picker').value = '';
  renderStaged();
}

export function renderStaged() {
  stagePool.free();
  $('staged').innerHTML = staged.map((p) => `
    <div class="stage-item" data-id="${p.id}">
      <img src="${mediaSrc(stagePool, p.thumb)}" alt="">
      <select data-field="collection" aria-label="Collection">
        ${COLLECTIONS.map((c) => `<option ${p.collection === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <button class="rm" data-action="stage-remove" data-id="${p.id}" title="Remove">×</button>
    </div>`).join('');

  const has = staged.length > 0;
  $('batchForm').style.display = has ? 'grid' : 'none';
  $('publishActions').style.display = has ? 'flex' : 'none';
}

export function stageUpdate(id, field, value) {
  const p = staged.find((x) => x.id === id);
  if (p) p[field] = value;
}

export function stageRemove(id) {
  staged = staged.filter((x) => x.id !== id);
  renderStaged();
}

export async function publishStaged(live) {
  if (!staged.length) return;
  const val = (id) => $(id)?.value.trim() ?? '';   // null-safe — won't crash if a field is missing
  const meta = {
    gear: val('batchGear'),
    location: val('batchLoc'),
    dateTaken: val('batchDate'),
    story: val('batchStory'),
  };
  const batch = staged.map((p) => ({ ...p, ...meta, published: live }));
  try {
    await Plates.saveMany(batch);
  } catch (e) {
    console.error('publish failed:', e);
    toast('Upload failed — see console.');
    return;
  }

  const n = staged.length;
  staged = [];
  renderStaged();
  ['batchGear', 'batchLoc', 'batchDate', 'batchStory'].forEach((id) => { const el = $(id); if (el) el.value = ''; });
  toast(live ? `Published ${n} plate${n > 1 ? 's' : ''} — live on your portfolio.` : `Saved ${n} draft${n > 1 ? 's' : ''}.`);
  if (live) switchTab('develop');
}

/* ---------------- Manage ---------------- */
export async function renderManage() {
  managePool.free();
  const all = await Plates.all();
  $('manageEmpty').style.display = all.length ? 'none' : 'block';
  $('manageList').innerHTML = all.map((p) => `
    <div class="dr-item" data-id="${p.id}">
      <img class="thumb" src="${mediaSrc(managePool, p.thumb)}" alt="">
      <div>
        <div class="nm">${esc(p.title)}</div>
        <div class="sub">${esc(p.collection || '—')} · ${p.type === 'video' ? `film ${p.duration ? `${Math.round(p.duration)}s` : ''}` : 'photo'} · ${fmtBytes(p.size)}</div>
      </div>
      <button class="status ${p.published ? 'live' : 'draft'}" data-action="plate-toggle" data-id="${p.id}">${p.published ? 'Live' : 'Draft'}</button>
      <div class="acts">
        <button class="iconbtn ${p.featured ? 'feat' : ''}" data-action="plate-feature" data-id="${p.id}">${p.featured ? '★ Featured' : '☆ Feature'}</button>
        <button class="iconbtn" data-action="plate-edit" data-id="${p.id}">Edit</button>
        <button class="iconbtn danger" data-action="plate-delete" data-id="${p.id}">Delete</button>
      </div>
    </div>`).join('');
}

export async function toggleFeature(id) {
  const p = await Plates.byId(id);
  if (!p) return;
  p.featured = !p.featured;
  await Plates.save(p);
  toast(p.featured ? 'Added to featured showcase.' : 'Removed from showcase.');
}

export async function togglePlate(id) {
  const p = await Plates.togglePublished(id);
  if (p) toast(p.published ? 'Plate is live.' : 'Plate moved to drafts.');
}

/**
 * Two-step delete: first tap arms ("Sure?"), second tap deletes.
 * No blocking dialogs — better mobile UX and avoids the Chromium
 * quirk where a native confirm() freezes IndexedDB oncomplete.
 */
export function armDelete(btn) {
  if (btn.dataset.armed) { deletePlate(btn.dataset.id); return; }
  btn.dataset.armed = '1';
  btn.textContent = 'Sure?';
  setTimeout(() => {
    if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Delete'; }
  }, 3000);
}

export async function deletePlate(id) {
  await Plates.remove(id);
  toast('Plate deleted.');
}

/** Inline editor — replaces the row, no prompt() dialogs. */
export async function openEditor(id) {
  const p = await Plates.byId(id);
  const row = document.querySelector(`.dr-item[data-id="${id}"]`);
  if (!p || !row) return;
  row.innerHTML = `
    <img class="thumb" src="${mediaSrc(managePool, p.thumb)}" alt="">
    <div class="dr-edit">
      <input type="text" value="${esc(p.title)}" data-edit="title" aria-label="Title">
      <select data-edit="collection" aria-label="Collection">
        ${COLLECTIONS.map((c) => `<option ${p.collection === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <input type="text" value="${esc(p.story || '')}" placeholder="Story / description" data-edit="story" aria-label="Story">
    </div>
    <div class="acts">
      <button class="iconbtn" data-action="edit-save" data-id="${p.id}">Save</button>
      <button class="iconbtn" data-action="edit-cancel">Cancel</button>
    </div>`;
  row.classList.add('editing');
}

export async function saveEditor(id) {
  const row = document.querySelector(`.dr-item[data-id="${id}"]`);
  const p = await Plates.byId(id);
  if (!p || !row) return;
  const val = (k) => row.querySelector(`[data-edit="${k}"]`)?.value ?? '';
  p.title = val('title').trim() || p.title;
  p.collection = val('collection');
  p.story = val('story').trim();
  await Plates.save(p);
  toast('Plate updated.');
}

/* ---------------- Settings ---------------- */
export async function loadSettingsForm() {
  const s = await Settings.load();
  $('setStmt').value = s.stmt; $('setNote').value = s.note; $('setHero').value = s.hero;
  $('setEmail').value = s.email; $('setIg').value = s.ig; $('setBase').value = s.base; $('setKit').value = s.kit;
  applySettings(s);
}

export function applySettings(s) {
  $('stmtLede').textContent = s.stmt;
  $('stmtNote').textContent = s.note;
  $('heroSub').textContent = s.hero;
  $('footBase').textContent = s.base;

  $('specsList').innerHTML = s.kit.split('\n')
    .filter((l) => l.includes(':'))
    .map((l) => {
      const i = l.indexOf(':');
      return `<div class="srow"><span class="k">${esc(l.slice(0, i).trim())}</span><span class="v">${esc(l.slice(i + 1).trim())}</span></div>`;
    }).join('');

  const ig = $('fIg'); const mail = $('fMail');
  if (s.ig) { ig.style.display = ''; ig.href = `https://instagram.com/${s.ig.replace('@', '')}`; } else ig.style.display = 'none';
  if (s.email) { mail.style.display = ''; mail.href = `mailto:${s.email}`; } else mail.style.display = 'none';
}

export async function saveSettingsForm() {
  const s = {
    stmt: $('setStmt').value, note: $('setNote').value, hero: $('setHero').value,
    email: $('setEmail').value.trim(), ig: $('setIg').value.trim(),
    base: $('setBase').value.trim(), kit: $('setKit').value,
  };
  await Settings.save(s);
  applySettings(s);
  toast('Studio details saved.');
}

/* ---------------- Tabs ---------------- */
export function switchTab(name) {
  document.querySelectorAll('.dr-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.dr-panel').forEach((p) => p.classList.toggle('active', p.id === name));
  if (name === 'develop') renderManage();
}
