# Going Public — Firebase Setup (free tier)

After this, anything you publish in the Darkroom is instantly visible to
everyone at your Vercel URL. The Darkroom itself becomes login-protected —
only you can upload.

Total time: ~20 minutes. Cost: $0.

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project**
2. Name: `first-light` → disable Analytics → **Create**

## 2. Enable the three services

**Authentication**
- Build → Authentication → Get started
- Sign-in method → **Email/Password** → Enable → Save
- Users tab → **Add user** → your email + a strong password
  (this is YOUR Darkroom login)

**Firestore Database**
- Build → Firestore Database → Create database
- **Production mode** → pick a region (us-central1 is fine) → Enable

**Storage**
- Build → Storage → Get started → same region → Done

## 3. Paste the security rules

**Firestore → Rules tab** — replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /plates/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /settings/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
Click **Publish**.

**Storage → Rules tab** — replace everything with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /plates/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```
Click **Publish**.

> Meaning: anyone can VIEW your portfolio; only a signed-in user
> (you) can upload, edit, or delete. Enforced server-side.

## 4. Get your config keys

- ⚙️ Project settings → Your apps → **</> (Web)** → nickname `first-light`
  → Register → copy the `firebaseConfig` object shown.

## 5. Wire it into the code

1. Open `js/firebase-config.js` → replace the placeholder values with yours
2. Open `js/config.js` → change one line:
   ```js
   export const BACKEND = 'firebase';
   ```

## 6. Deploy

```bash
git add .
git commit -m "go live with firebase backend"
git push
```

Vercel redeploys automatically (~30s).

## 7. Use it

- Open your Vercel URL → **Darkroom** → sign in with the email/password
  from step 2 → upload → **Publish**
- Open the URL on your phone / send to a friend — your work is there.

---

## Notes

- **Free limits:** 5 GB Storage, 50K Firestore reads/day, 1 GB DB —
  plenty for a hobbyist portfolio. Keep videos reasonably sized
  (compress big 4K exports in DaVinci before uploading).
- **Local dev:** set `BACKEND = 'local'` any time to work offline
  against IndexedDB again. The UI is identical.
- **Costs nothing until it's huge.** If you ever exceed free limits,
  Firebase asks before charging (Blaze plan is opt-in).
