/**
 * FIRST LIGHT — services/repositories.js
 * Repository pattern over core/db. UI never touches IndexedDB
 * directly; it talks to these and listens for 'plates:changed'.
 * Swapping IndexedDB → Firebase later means rewriting only
 * this file and core/db.js.
 */
import * as db from '../core/db.js';
import { DB, DEFAULT_SETTINGS } from '../config.js';

const bus = new EventTarget();
export const onPlatesChanged = (fn) => bus.addEventListener('plates:changed', fn);
const emit = () => bus.dispatchEvent(new Event('plates:changed'));

/* ---------------- Plates ---------------- */
export const Plates = {
  async all() {
    const rows = await db.getAll(DB.STORES.PLATES);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
  async published() {
    return (await this.all()).filter((p) => p.published);
  },
  async byId(id) {
    return db.get(DB.STORES.PLATES, id);
  },
  async save(plate) {
    await db.put(DB.STORES.PLATES, plate);
    emit();
  },
  async saveMany(plates) {
    for (const p of plates) await db.put(DB.STORES.PLATES, p);
    emit();
  },
  async remove(id) {
    await db.remove(DB.STORES.PLATES, id);
    emit();
  },
  async togglePublished(id) {
    const p = await this.byId(id);
    if (!p) return null;
    p.published = !p.published;
    await this.save(p);
    return p;
  },
  newId() {
    return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  },
};

/* ---------------- Settings ---------------- */
export const Settings = {
  async load() {
    const out = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const row = await db.get(DB.STORES.SETTINGS, key);
      if (row !== undefined && row !== null) out[key] = row.value;
    }
    return out;
  },
  async save(settings) {
    for (const [key, value] of Object.entries(settings)) {
      await db.put(DB.STORES.SETTINGS, { key, value });
    }
  },
};
