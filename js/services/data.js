/**
 * FIRST LIGHT — services/data.js
 * Backend selector. Everything above this layer imports from
 * here and never knows which backend is running.
 * Uses top-level await (supported in all modern ES-module browsers).
 */
import { BACKEND } from '../config.js';

const impl = await import(BACKEND === 'firebase' ? './firebaseRepositories.js' : './repositories.js');

export const Plates = impl.Plates;
export const Settings = impl.Settings;
export const onPlatesChanged = impl.onPlatesChanged;
/** Auth is null on the local backend (no login needed). */
export const Auth = impl.Auth ?? null;
