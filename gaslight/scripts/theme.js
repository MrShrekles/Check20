/* Dark and light.

   The CSS side is just the palette: styles/base.css redefines the same
   variables under :root[data-theme="light"], so every rule keeps working.
   The canvas cannot read CSS variables cheaply per frame, so the map's colours
   live here as two plain objects and the renderer asks for the current one.

   The choice is a per-viewer preference, so it lives in localStorage rather
   than in the saved table. table.html and index.html set data-theme from an
   inline script in <head>, before first paint, so there is no flash. */

const KEY = 'gaslight.theme';

/* ---- text size ----

   The same kind of thing as the theme and kept beside it: a per-viewer
   preference in localStorage, applied to :root before first paint by the
   inline script in each page's head so nothing reflows on boot.

   It is one number, `--fs`, and every font-size in the stylesheets is written
   as calc(Npx * var(--fs)). Panels do not get wider, so the largest step fits
   fewer words on a line — which is the trade, and it is the right one for
   reading a spell out at arm's length. */

const FS_KEY = 'gaslight.textsize';

export const TEXT_SIZES = [
  ['Small', .9],
  ['Normal', 1],
  ['Large', 1.12],
  ['Larger', 1.26],
];

const clampFs = v => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1.4, Math.max(.85, n)) : 1;
};

export function currentTextSize() {
  try { return clampFs(localStorage.getItem(FS_KEY) ?? 1); } catch { return 1; }
}

export function applyTextSize(v) {
  const n = clampFs(v);
  document.documentElement.style.setProperty('--fs', String(n));
  try { localStorage.setItem(FS_KEY, String(n)); } catch { /* private mode */ }
  return n;
}

const MAPS = {
  dark: {
    grid: 'rgba(76,110,110,0.14)',
    room: 'rgba(47,79,79,0.22)',
    wall: '#d9b382',
    doorOpen: '#2f4f4f',
    doorShut: '#af8000',
    doorMark: '#ffd700',
    fog: '#04070a',
    fogAlphaPlayer: .97,
    tokenEdge: 'rgba(10,10,10,.85)',
    tokenInner: 'rgba(255,250,240,.35)',
    tokenInk: '#0a0a0a',
    tokenInkLight: '#fffaf0',
    plate: 'rgba(10,10,10,.78)',
    plateInk: '#f0e5c5',
    accent: '#ffd700',
    narrator: '#a45e3b',
    roomAdd: 'rgba(76,110,110,.4)',
    roomAddLine: '#4c6e6e',
    roomCut: 'rgba(164,94,59,.4)',
    roomCutLine: '#a45e3b',
    label: 'rgba(10,10,10,.85)',
  },
  light: {
    grid: 'rgba(70,95,90,0.20)',
    room: 'rgba(120,150,142,0.26)',
    wall: '#6b5a3c',
    doorOpen: '#9fb3ad',
    doorShut: '#8a6a00',
    doorMark: '#7a5c00',
    fog: '#404b50',
    fogAlphaPlayer: .9,
    tokenEdge: 'rgba(40,32,20,.75)',
    tokenInner: 'rgba(255,255,255,.45)',
    tokenInk: '#241d12',
    tokenInkLight: '#fffaf0',
    plate: 'rgba(250,245,232,.88)',
    plateInk: '#3a3020',
    accent: '#a8821a',
    narrator: '#8c4a2b',
    roomAdd: 'rgba(90,130,122,.35)',
    roomAddLine: '#5c7a72',
    roomCut: 'rgba(140,74,43,.3)',
    roomCutLine: '#8c4a2b',
    label: 'rgba(250,245,232,.9)',
  },
};

let current = 'dark';

/** The map palette for the theme in use. */
export const mapPalette = () => MAPS[current];

export const currentTheme = () => current;

function store(name) {
  try { localStorage.setItem(KEY, name); } catch { /* private mode */ }
}

export function applyTheme(name) {
  current = name === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = current;
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = current === 'light' ? '☾' : '☀';
    btn.title = current === 'light' ? 'Switch to dark' : 'Switch to light';
    btn.setAttribute('aria-label', btn.title);
  }
  return current;
}

/** Read what the inline <head> script already applied, and wire the toggle. */
export function initTheme(onChange = () => { }) {
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  applyTheme(document.documentElement.dataset.theme || stored || 'dark');

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    applyTheme(current === 'dark' ? 'light' : 'dark');
    store(current);
    onChange(current);
  });
}
