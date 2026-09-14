/**
 * FIRST LIGHT — services/upgrade.js
 * One-time migration: regenerates display, grid, blur assets
 * for plates uploaded before the current pipeline.
 */
import { Plates } from './data.js';
import { processImage } from './media.js';

export function needsUpgrade(p) {
  if (!p.blur) return true;
  if (!p.grid) return true;
  if (!p.display) return true;
  if (p.type !== 'video' && (!p.width || !p.height)) return true;
  return false;
}

export async function findOutdated() {
  const all = await Plates.all();
  return all.filter(needsUpgrade);
}

async function asBlob(source) {
  if (source instanceof Blob) return source;
  if (typeof source !== 'string') throw new Error('unreadable source');
  const res = await fetch(source, { mode: 'cors' });
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  return res.blob();
}

export async function upgradeAll(onProgress = () => {}) {
  const targets = await findOutdated();
  const total = targets.length;
  let done = 0;
  const failures = [];

  for (const plate of targets) {
    const label = plate.title || plate.collection || plate.id;
    try {
      const sourceURL = plate.type === 'video'
        ? (plate.thumb || plate.display)
        : (plate.blob || plate.display || plate.thumb);
      if (!sourceURL) throw new Error('no source file');

      const file = await asBlob(sourceURL);
      const { blur, grid, display, width, height } = await processImage(file);

      const updated = { ...plate, blur, width, height };
      if (plate.type === 'video') {
        updated.display = plate.display || plate.thumb;
        updated.grid = plate.grid || plate.thumb;
        updated.thumb = plate.thumb;
        updated.blob = plate.blob;
      } else {
        updated.display = display;
        updated.grid = grid;
        updated.thumb = grid;
        updated.blob = plate.blob;
      }

      await Plates.save(updated);
      done += 1;
      onProgress({ done, total, title: label, status: 'ok' });
    } catch (err) {
      done += 1;
      failures.push({ id: plate.id, title: label, error: err.message });
      onProgress({ done, total, title: label, status: 'failed' });
    }
  }

  return { total, upgraded: total - failures.length, failures };
}