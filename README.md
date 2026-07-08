# First Light — Photography & Film Portfolio

A zero-dependency, offline-first portfolio app. Upload photos and videos in the
**Darkroom**, publish them, and they render in a monograph-style dark gallery —
persisted locally in your browser's IndexedDB.

## Quick start

ES modules require a local server (any of these):

```bash
# Option A — Python (built into macOS/Linux)
cd first-light
python3 -m http.server 8000
# → http://localhost:8000

# Option B — Node
npx serve .

# Option C — VS Code: install "Live Server", right-click index.html → Open with Live Server
```

Then open the **Darkroom** (top right) → drop in photos/videos → **Publish**.

## Architecture

```
first-light/
├── index.html                  Semantic shell; all behavior via data-action attributes
├── css/
│   ├── tokens.css              Design tokens — change the theme HERE only
│   ├── site.css                Base + public-site components
│   ├── views.css               Darkroom + lightbox
│   └── responsive.css          Phones → 49" ultrawide, motion prefs
└── js/
    ├── config.js               Constants, defaults, demo content
    ├── app.js                  Bootstrap + one delegated event router
    ├── core/
    │   ├── db.js               Promise wrapper over IndexedDB (+ memory fallback)
    │   └── dom.js              $, esc, toast, URLPool (object-URL lifecycle)
    ├── services/
    │   ├── media.js            Thumbnail + video-poster generation (pure)
    │   └── repositories.js     Plates & Settings repositories + change events
    └── ui/
        ├── gallery.js          Public grid, filters, collections, hero index
        ├── lightbox.js         Viewer: keyboard (desktop) + swipe (touch)
        └── darkroom.js         Ingest/staging, publish, manage, settings
```

### Patterns used

- **Repository pattern** — UI never touches IndexedDB; it calls `Plates` /
  `Settings`. To go public later, swap `core/db.js` + `repositories.js` for a
  Firebase implementation; the UI is untouched.
- **Event delegation** — one click listener routes every `[data-action]`.
  Dynamic HTML never needs re-binding.
- **Reactive re-render** — repositories emit `plates:changed`; gallery and
  manage views re-render themselves.
- **URLPool** — every view owns its object URLs and frees them before
  re-render. No blob leaks with hundreds of plates.
- **Design tokens** — one CSS file defines the entire theme.

### Mobile

- Captions always visible on touch (`@media (hover:none)`), hover choreography
  only where hover exists.
- Lightbox: swipe left/right to navigate with drag feedback, swipe down to
  close; arrows hidden on touch. All listeners `passive`.
- 42px+ touch targets throughout; `backdrop-filter` disabled on small screens
  (expensive on mobile GPUs); `playsinline` video; safe-area viewport.

## Data & privacy

Everything lives in **your browser** (IndexedDB): full-resolution originals as
blobs, generated thumbnails, and settings. Nothing is uploaded anywhere.
Clearing site data deletes your library — export/back up originals separately.

## Roadmap to a public URL (free tier)

1. Add `services/firebaseRepositories.js` implementing the same `Plates` /
   `Settings` interface against Firestore + Firebase Storage (or Cloudinary
   for image CDN/optimization).
2. Swap the import in `app.js`, `gallery.js`, `darkroom.js` (one line each).
3. `firebase deploy` — the design and UI code ship unchanged.
