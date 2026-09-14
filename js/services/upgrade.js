/**
 * FIRST LIGHT — services/upgrade.js
 * One-time migration: regenerates the 2048px display asset and the
 * inline blur placeholder for plates uploaded before the new pipeline.
 *
 * Runs in the browser, inside the Darkroom, while you are signed in —
 * Storage rules require an authenticated user, so this is the only
 * place it can work. Safe to re-run: plates that already have both
 * assets are skipped, and originals are never modified.
 */
import { Plates } from './data.js';
import { processImage } from './media.js';

/**
 * A plate needs upgrading when it is missing the assets the current
 * pipeline produces: the inline blur placeholder, a display asset, or
 * the stored dimensions used to reserve layout space.
 */
export function needsUpgrade(p) {
  if (!p.blur) return true;
  if (!p.display) return true;
  if (!p.grid) return true;
  if (p.type !== 'video' && (!p.width || !p.height)) return true;
  return false;
}

export async function findOutdated() {
  const all = await Plates.all();
  return all.filter(needsUpgrade);
}

/**
 * Get the stored file back as a Blob so it can be re-processed.
 * Cloud backend stores a URL string; local backend stores the Blob itself.
 */
async function asBlob(source) {
  if (source instanceof Blob) return source;
  if (typeof source !== 'string') throw new Error('unreadable source');
  const res = await fetch(source, { mode: 'cors' });
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  return res.blob();
}

/**
 * Upgrade every outdated plate, reporting progress.
 * onProgress({ done, total, title, status })
 */
export async function upgradeAll(onProgress = () => {}) {
  const targets = await findOutdated();
  const total = targets.length;
  let done = 0;
  const failures = [];

  for (const plate of targets) {
    const label = plate.title || plate.collection || plate.id;
    try {
      // Videos: only the poster needs a blur — rebuild it from the poster image.
      const sourceURL = plate.type === 'video'
        ? (plate.thumb || plate.display)
        : (plate.blob || plate.display || plate.thumb);
      if (!sourceURL) throw new Error('no source file');

      const file = await asBlob(sourceURL);
      const { blur, grid, display, width, height } = await processImage(file);

      const updated = { ...plate, blur, width, height };
      if (plate.type === 'video') {
        // keep the existing poster + video file untouched
        updated.display = plate.display || plate.thumb;
        updated.grid = plate.grid || plate.thumb;
        updated.thumb = plate.thumb;
        updated.blob = plate.blob;
      } else {
        updated.display = display;   // Blob → uploaded by save()
        updated.grid = grid;
        updated.thumb = grid;
        updated.blob = plate.blob;   // string URL → preserved as-is
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
