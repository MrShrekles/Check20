/* Drag handle that widens the sidebar so the full character sheet fits beside
   the map. The width is a per-viewer preference, so it lives in localStorage
   rather than in the saved table. */

import { $ } from './dom.js';

const KEY = 'gaslight.sideWidth';
const DEFAULT_W = 318;
const MIN_W = 260;

/** Leave at least this much of the stage visible. */
const MIN_STAGE = 420;

const maxWidth = () => Math.max(MIN_W, window.innerWidth - MIN_STAGE);

function setWidth(px) {
  const w = Math.round(Math.min(maxWidth(), Math.max(MIN_W, px)));
  document.documentElement.style.setProperty('--side-w', w + 'px');
  return w;
}

function remember(w) {
  try { localStorage.setItem(KEY, String(w)); } catch { /* private mode */ }
}

export function initSidebarResize() {
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (stored) setWidth(+stored || DEFAULT_W);

  const grip = $('sidegrip');
  let startX = 0, startW = 0;

  grip.addEventListener('pointerdown', e => {
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    grip.classList.add('dragging');
    document.body.classList.add('resizing-side');
    startX = e.clientX;
    startW = $('stage').parentElement.querySelector('.side').getBoundingClientRect().width;
  });

  grip.addEventListener('pointermove', e => {
    if (!grip.classList.contains('dragging')) return;
    // The sidebar is on the right, so dragging left widens it.
    setWidth(startW - (e.clientX - startX));
  });

  const end = () => {
    if (!grip.classList.contains('dragging')) return;
    grip.classList.remove('dragging');
    document.body.classList.remove('resizing-side');
    const w = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--side-w'), 10);
    remember(w);
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);

  grip.addEventListener('dblclick', () => remember(setWidth(DEFAULT_W)));

  // Keep the stage usable when the window shrinks.
  window.addEventListener('resize', () => {
    const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--side-w'), 10);
    if (cur > maxWidth()) setWidth(cur);
  });
}
