/**
 * FIRST LIGHT — core/db.js
 * Thin Promise wrapper over IndexedDB with a transparent
 * in-memory fallback (e.g. sandboxed iframes). Callers never
 * know which backend they're on.
 */
import { DB } from '../config.js';

let db = null;
let memoryMode = false;
const mem = { [DB.STORES.PLATES]: new Map(), [DB.STORES.SETTINGS]: new Map() };

export function isMemoryMode() { return memoryMode; }

export function open() {
  return new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(DB.NAME, DB.VERSION); }
    catch { memoryMode = true; return resolve(); }

    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(DB.STORES.PLATES)) d.createObjectStore(DB.STORES.PLATES, { keyPath: 'id' });
      if (!d.objectStoreNames.contains(DB.STORES.SETTINGS)) d.createObjectStore(DB.STORES.SETTINGS, { keyPath: 'key' });
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(); };
    req.onerror = () => { memoryMode = true; resolve(); };
  });
}

function txDone(store, mode, work) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const result = work(t.objectStore(store));
    t.oncomplete = () => resolve(result?.result);
    t.onerror = () => reject(t.error);
  });
}

export async function getAll(store) {
  if (memoryMode) return [...mem[store].values()];
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, record) {
  if (memoryMode) { mem[store].set(record.id ?? record.key, record); return; }
  return txDone(store, 'readwrite', (s) => s.put(record));
}

export async function remove(store, key) {
  if (memoryMode) { mem[store].delete(key); return; }
  return txDone(store, 'readwrite', (s) => s.delete(key));
}

export async function get(store, key) {
  if (memoryMode) return mem[store].get(key);
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
