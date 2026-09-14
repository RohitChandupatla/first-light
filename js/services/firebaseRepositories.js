/**
 * FIRST LIGHT — services/firebaseRepositories.js
 * Cloud backend: same interface as repositories.js.
 *   Files (originals + thumbnails) → Firebase Storage
 *   Metadata (title, collection, …) → Firestore
 *   Darkroom access               → Firebase Auth (email/password)
 *
 * Reads are public; writes require a signed-in user (enforced by
 * the security rules in SETUP-FIREBASE.md, not just the client).
 */
import { firebaseConfig } from '../firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, deleteDoc,
  query, orderBy,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import {
  getAuth, signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const bus = new EventTarget();
export const onPlatesChanged = (fn) => bus.addEventListener('plates:changed', fn);
const emit = () => bus.dispatchEvent(new Event('plates:changed'));

/* ---------------- Auth ---------------- */
let currentUser = null;
onAuthStateChanged(auth, (u) => { currentUser = u; });

export const Auth = {
  current: () => currentUser,
  ready: new Promise((res) => { const off = onAuthStateChanged(auth, () => { off(); res(); }); }),
  async signIn(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  },
  async signOut() { await fbSignOut(auth); },
  onChange: (fn) => onAuthStateChanged(auth, fn),
};

/* ---------------- helpers ---------------- */
async function uploadBlob(path, blob) {
  const r = ref(storage, path);
  await uploadBytes(r, blob);
  return getDownloadURL(r);
}

/** Firestore docs store URLs; the UI's `blob`/`thumb` fields become URL strings. */
function fromDoc(d) {
  const p = d.data();
  return { ...p, id: d.id, blob: p.fileURL, thumb: p.thumbURL };
}

function toDoc(p) {
  const { blob, thumb, ...rest } = p;
  return rest; // fileURL/thumbURL already set by save()
}

/* ---------------- Plates ---------------- */
export const Plates = {
  async all() {
    const snap = await getDocs(query(collection(db, 'plates'), orderBy('createdAt', 'desc')));
    return snap.docs.map(fromDoc);
  },
  async published() {
    return (await this.all()).filter((p) => p.published);
  },
  async byId(id) {
    const snap = await getDoc(doc(db, 'plates', id));
    return snap.exists() ? fromDoc(snap) : undefined;
  },
  async save(plate) {
    const p = { ...plate };
    if (p.blob instanceof Blob) p.fileURL = await uploadBlob(`plates/${p.id}/original`, p.blob);
    if (p.thumb instanceof Blob) p.thumbURL = await uploadBlob(`plates/${p.id}/thumb.jpg`, p.thumb);
    if (typeof p.blob === 'string') p.fileURL = p.blob;
    if (typeof p.thumb === 'string') p.thumbURL = p.thumb;
    await setDoc(doc(db, 'plates', p.id), toDoc(p));
    emit();
  },
  async saveMany(plates) {
    for (const p of plates) {
      // reuse save() but defer the event until the batch is done
      const q = { ...p };
      if (q.blob instanceof Blob) q.fileURL = await uploadBlob(`plates/${q.id}/original`, q.blob);
      if (q.thumb instanceof Blob) q.thumbURL = await uploadBlob(`plates/${q.id}/thumb.jpg`, q.thumb);
      await setDoc(doc(db, 'plates', q.id), toDoc(q));
    }
    emit();
  },
  async remove(id) {
    await deleteDoc(doc(db, 'plates', id));
    // best-effort file cleanup
    for (const path of [`plates/${id}/original`, `plates/${id}/thumb.jpg`]) {
      try { await deleteObject(ref(storage, path)); } catch { /* already gone */ }
    }
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
import { DEFAULT_SETTINGS } from '../config.js';

export const Settings = {
  async load() {
    const snap = await getDoc(doc(db, 'settings', 'main'));
    return { ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) };
  },
  async save(settings) {
    await setDoc(doc(db, 'settings', 'main'), settings, { merge: true });
  },
};
