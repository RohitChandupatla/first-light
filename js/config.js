/**
 * FIRST LIGHT — Configuration
 * All tunables live here. No magic values elsewhere.
 */
export const COLLECTIONS = ['Portraiture', 'Cinematic Film', 'On Location', 'Commissioned'];

export const DB = {
  NAME: 'firstlight',
  VERSION: 1,
  STORES: { PLATES: 'plates', SETTINGS: 'settings' },
};

export const MEDIA = {
  THUMB_MAX_PX: 1400,
  THUMB_QUALITY: 0.86,
  POSTER_QUALITY: 0.82,
};

/** Editorial monograph rhythm — repeats every 7 plates. */
export const GRID_SPANS = ['c7 wide', 'c5 tall', 'c4 tall', 'c4 tall', 'c4 tall', 'c5 tall', 'c7 wide'];

export const DEFAULT_SETTINGS = {
  stmt: 'I work in the hour most people sleep through. First light is unrepeatable—soft, low, and fleeting. Whether still or in motion, everything I make chases that same attention.',
  note: 'The studio works across portraiture, on-location, and short film. Every frame is developed by hand and delivered as a finished piece, not a proof. Based in Dallas; happy to travel for the right story.',
  hero: 'Photography and film for people who care how their story is told. Shot on location, developed by hand, delivered with intention.',
  email: '',
  ig: '',
  base: 'Dallas, TX',
  kit: 'Bodies: Sony A7 IV\nGlass: 16-35  · 50 · 85 · 100-400mm\nDevelop: DaVinci · Photoshop · Lightroom\nFormats: Stills · 4K 24fps\nBased: Dallas, TX',
};

/** Placeholder plates shown only until the first real publish. */
export function demoPlates() {
  const bg = [
    'radial-gradient(120% 90% at 70% 15%,rgba(201,154,110,.5),transparent 55%),linear-gradient(160deg,#3a3d44,#0f1116)',
    'radial-gradient(100% 80% at 20% 90%,rgba(124,147,168,.4),transparent 60%),linear-gradient(200deg,#2b3038,#14171d)',
    'radial-gradient(120% 120% at 80% 80%,rgba(169,118,78,.45),transparent 55%),linear-gradient(140deg,#33302c,#15140f)',
    'radial-gradient(90% 90% at 50% 10%,rgba(236,234,227,.14),transparent 55%),linear-gradient(180deg,#23262d,#0f1115)',
    'radial-gradient(120% 90% at 15% 20%,rgba(201,154,110,.4),transparent 55%),linear-gradient(120deg,#3b3630,#16140f)',
    'radial-gradient(100% 100% at 85% 30%,rgba(124,147,168,.45),transparent 55%),linear-gradient(220deg,#2a2f37,#111318)',
    'linear-gradient(to top,rgba(201,154,110,.35),transparent 45%),linear-gradient(180deg,#262a31,#0e1014)',
  ];
  const rows = [
    ['Blue Hour, Studio No. 3', 'Portraiture', 'image', 'A portrait made in the last cold minutes before sunrise.'],
    ['Marfa, Before Sunrise', 'On Location', 'image', 'Empty highway, high desert, the sky just warming.'],
    ['The Long Drive — still', 'Cinematic Film', 'video', 'A frame from a short film about leaving.'],
    ['Ren, in Window Light', 'Portraiture', 'image', 'Natural light only — the ten soft minutes.'],
    ["Maker's Hands", 'Commissioned', 'image', 'Commissioned detail work for a craft studio.'],
    ['Coast Road, First Fog', 'On Location', 'image', 'Fog rolling off the water at first light.'],
    ['Dawn Sequence — frame 118', 'Cinematic Film', 'video', 'The closing frame of a dawn sequence.'],
  ];
  return rows.map(([title, collection, type, story], i) => ({
    demo: true, id: `demo${i}`, title, collection, type, story,
    bg: bg[i], gear: 'Sony A7 IV', location: 'Dallas, TX',
  }));
}
