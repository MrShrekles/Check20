/* Canvas surfaces, viewport metrics and the frame scheduler.

   Nothing calls draw() directly any more: handlers call requestDraw() and at
   most one repaint happens per animation frame, however many state changes
   land in between.

   That is enough for a map that only moves when someone moves it, and wrong
   for anything that moves by itself. A glow that pulses needs a frame every
   frame, and four separate timers doing that would each repaint the whole
   canvas on their own schedule — exactly what the scheduler exists to stop.

   So there is one loop, and it runs only while something wants it:
   `animate(true)` while a pulse is on screen, `animate(false)` when the last
   one goes. `clock()` gives everything that pulses the same time base, so two
   glows on two tokens breathe together rather than drifting apart. */

import { $ } from './dom.js';

export const view = {
  cv: null, ctx: null,
  offCv: null, offCtx: null,     // scratch surface for the darkness mask
  W: 0, H: 0, DPR: 1,
};

let renderFn = () => { };
let queued = false;

/* The animation loop. `wanted` counts what is asking for it; at zero the loop
   stops and the canvas goes back to painting only on demand. */
let wanted = 0;
let looping = false;
let t0 = 0;
let now = 0;

/** Seconds since the loop started. One clock, so pulses stay in step. */
export const clock = () => now;

function tick(ts) {
  if (!wanted) { looping = false; return; }
  if (!t0) t0 = ts;
  now = (ts - t0) / 1000;
  renderFn();
  requestAnimationFrame(tick);
}

/**
 * Ask for, or give up, a continuously running canvas.
 *
 * Every caller that turns it on must turn it off again, so pass the same
 * boolean back: `animate(shouldPulse)` each time the thing is re-evaluated
 * works, as long as the caller remembers what it last asked for.
 *
 * @param {boolean} on
 */
export function animate(on) {
  wanted = Math.max(0, wanted + (on ? 1 : -1));
  if (wanted && !looping) {
    looping = true;
    t0 = 0;
    requestAnimationFrame(tick);
  }
}

/** True while the loop is running: the renderer uses it to decide whether a
    pulse should move or sit still. */
export const animating = () => wanted > 0;

/** Called once at boot so this module never has to import the renderer. */
export function setRenderer(fn) { renderFn = fn; }

/**
 * Park a floating card beside a token, kept inside the stage. Shared by the
 * character card and the monster card, which want the same placement.
 * @param {HTMLElement} card
 * @param {{x: number, y: number, size: number}} it  the token it belongs to
 * @param {{x: number, y: number}} screenPos  the token's centre, in screen space
 * @param {number} gridSize
 * @param {number} zoom
 */
export function anchorCardBeside(card, it, screenPos, gridSize, zoom) {
  const r = (it.size * gridSize / 2) * zoom;
  card.style.left = Math.min(view.W - 220, Math.max(6, screenPos.x + r + 12)) + 'px';
  card.style.top = Math.min(view.H - 210, Math.max(6, screenPos.y - 40)) + 'px';
}

export function requestDraw() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; renderFn(); });
}

/** Repaint immediately, skipping the frame queue. Only resize needs this. */
export function drawNow() { renderFn(); }

export function initView() {
  const stage = $('stage');
  view.cv = $('cv');
  view.ctx = view.cv.getContext('2d');
  view.offCv = document.createElement('canvas');
  view.offCtx = view.offCv.getContext('2d');

  const resize = () => {
    view.DPR = window.devicePixelRatio || 1;
    view.W = stage.clientWidth; view.H = stage.clientHeight;
    view.cv.width = view.W * view.DPR; view.cv.height = view.H * view.DPR;
    view.offCv.width = view.cv.width; view.offCv.height = view.cv.height;
    drawNow();
  };

  new ResizeObserver(resize).observe(stage);
  resize();
}
