/* Floating windows, and the river they lock into.

   Initiative and Layers were two panels nailed to two corners. The monster
   book and the generators were a slide-out rail that covered half the map and
   could only ever show one of them. Four narrator tools, three different ways
   of behaving, and no way to have the book open beside the order.

   So they are all one thing now. A window has a head and a body; the head
   drags it, collapses it to a single line, and closes it. Drop it on the river
   down the left edge and it locks into the column with the others; drag it off
   and it floats wherever you left it.

   What this module does NOT do is know what is inside them. A window is
   registered with a body element and an optional render function, and it is
   main.js that says which panel is which — so the book can keep living in
   monsters.js and this file never grows an import of it. */

import { $ } from './dom.js';
import { isPlayerMode } from './session.js';

/* ---- what a window is ----

   { key, title, icon, el, body, render?, ensure?, narratorOnly? }

   `el` is the whole window, `body` the part that gets replaced on a render.
   `ensure` is for a panel whose data loads lazily: it returns a promise and the
   window renders again when it settles. */
const wins = new Map();
const order = [];

/* Where each window sits. Per browser, not per table: which corner you like
   your initiative in is about your screen, not about the campaign. */
const LAYOUT_KEY = 'gaslight.windows';
let layout = {};
try { layout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') || {}; } catch { layout = {}; }

const DEFAULTS = { open: false, collapsed: false, docked: true, x: 300, y: 80 };

/* What a narrator sees the first time, before they have arranged anything:
   the order and the layers in the river, the book and the generators shut.
   Those two are the ones you go looking for; the other two you want up. */
const FIRST_RUN = {
  init: { open: true, collapsed: false, docked: true },
  layers: { open: true, collapsed: false, docked: true },
};

const lay = key => (layout[key] ||= { ...DEFAULTS, ...(FIRST_RUN[key] || {}) });

let saveTimer = null;
function saveLayout() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* no store */ }
  }, 250);
}

/* ---- registration ---- */

/**
 * @param {object[]} defs  one per window, in the order their buttons appear
 * @param {string} defs[].key       stable id, used in the saved layout
 * @param {string} defs[].title     what the head says
 * @param {string} defs[].icon      inline SVG for the rail button
 * @param {string} defs[].elId      the window element already in the page
 * @param {string} defs[].bodyId    the part a render replaces
 * @param {Function} [defs[].render] called when it opens, and on demand
 * @param {Function} [defs[].ensure] loads what it needs, then renders again
 * @param {boolean} [defs[].narratorOnly] hidden from a player entirely
 */
export function initDock(defs) {
  for (const d of defs) {
    const el = $(d.elId);
    if (!el) continue;
    const w = { ...d, el, body: d.bodyId ? $(d.bodyId) : null };
    wins.set(d.key, w);
    order.push(d.key);
    dressWindow(w);
  }
  buildRailButtons();
  applyAll();

  /* Esc closes the top window, which is the one you were just dragging or
     typing in. Not the one whose own field has focus — a search box wants Esc
     for itself. */
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (e.target.closest?.('input, textarea, select')) return;
    const top = [...order].reverse().find(k => lay(k).open && !lay(k).collapsed);
    if (top) closeWin(top);
  });
}

/* The head every window gets, whatever is in it. The title drags, the caret
   collapses, the cross closes. */
function dressWindow(w) {
  w.el.classList.add('gwin');
  const head = document.createElement('div');
  head.className = 'gwinhead';
  head.innerHTML = `
    <span class="gwgrip" aria-hidden="true"></span>
    <h3>${w.title}</h3>
    <button class="gwbtn" data-gw="fold" title="Collapse to one line">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <button class="gwbtn" data-gw="close" title="Close (Esc)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>`;
  w.el.prepend(head);
  w.head = head;

  head.addEventListener('click', e => {
    const a = e.target.closest('[data-gw]')?.dataset.gw;
    if (a === 'close') return closeWin(w.key);
    if (a === 'fold') return toggleFold(w.key);
    // The head itself folds, the same as the caret: a one-line window is a
    // thing you poke to get back, not a thing you hunt a 4mm target on.
    if (!dragMoved) toggleFold(w.key);
  });

  head.addEventListener('pointerdown', ev => startDrag(w, ev));
}

/* ---- the rail buttons ---- */

function buildRailButtons() {
  const host = $('winButtons');
  if (!host) return;
  host.innerHTML = order.map(k => {
    const w = wins.get(k);
    return `<button class="tool winbtn" data-win="${k}" title="${w.title}"
      aria-pressed="false">${w.icon}<span>${w.title}</span></button>`;
  }).join('');
  host.addEventListener('click', e => {
    const b = e.target.closest('[data-win]');
    if (b) toggleWin(b.dataset.win);
  });
}

function syncRailButtons() {
  for (const k of order) {
    const b = document.querySelector(`[data-win="${k}"]`);
    if (!b) continue;
    const st = lay(k);
    b.classList.toggle('on', st.open);
    b.setAttribute('aria-pressed', String(st.open));
    b.hidden = !!wins.get(k).narratorOnly && isPlayerMode();
  }
}

/* ---- opening, closing, folding ---- */

export const isOpen = key => !!lay(key).open;

export function openWin(key, { fold = null } = {}) {
  const w = wins.get(key);
  if (!w) return;
  if (w.narratorOnly && isPlayerMode()) return;
  const st = lay(key);
  st.open = true;
  if (fold !== null) st.collapsed = fold;
  saveLayout();
  render(key);
  apply(w);
  syncRailButtons();
}

export function closeWin(key) {
  const w = wins.get(key);
  if (!w) return;
  lay(key).open = false;
  saveLayout();
  apply(w);
  syncRailButtons();
}

export function toggleWin(key) {
  if (!lay(key).open) return openWin(key);
  /* A window that is open but folded away is one you meant to get back to, so
     the button unfolds it rather than closing something you cannot see. */
  if (lay(key).collapsed) {
    lay(key).collapsed = false;
    saveLayout();
    return apply(wins.get(key));
  }
  closeWin(key);
}

export function toggleFold(key) {
  const st = lay(key);
  st.collapsed = !st.collapsed;
  saveLayout();
  apply(wins.get(key));
}

/** Open a window and put it in front, for a tool that has something to show. */
export function revealWin(key) {
  openWin(key, { fold: false });
  raise(key);
}

/* ---- rendering ---- */

export function render(key) {
  const w = wins.get(key);
  if (!w?.render) return;
  w.render(w.body);
  if (w.ensure && !w.ensured) {
    w.ensured = true;
    w.ensure().then(() => w.render(w.body)).catch(() => { /* the panel says so itself */ });
  }
}

/** Repaint whichever of these windows are open. Cheap to call. */
export function renderIfOpen(...keys) {
  for (const k of keys) if (lay(k).open) render(k);
}

/* ---- placement ---- */

let zTop = 30;
function raise(key) {
  const w = wins.get(key);
  if (w && !lay(key).docked) w.el.style.zIndex = String(++zTop);
}

function apply(w) {
  const st = lay(w.key);
  const river = $('river');
  w.el.hidden = !st.open || (w.narratorOnly && isPlayerMode());
  w.el.classList.toggle('collapsed', !!st.collapsed);
  w.el.classList.toggle('docked', !!st.docked);

  if (st.docked && river) {
    // Docked windows are laid out by the river, so they carry no coordinates.
    w.el.style.left = w.el.style.top = w.el.style.zIndex = '';
    if (w.el.parentElement !== river) river.appendChild(w.el);
  } else {
    const stage = $('stage');
    if (w.el.parentElement !== stage) stage.appendChild(w.el);
    w.el.style.left = st.x + 'px';
    w.el.style.top = st.y + 'px';
  }
  syncRiver();
}

function applyAll() {
  for (const k of order) {
    /* A window the saved layout says was open comes back filled. Without this
       a reload showed the monster book as an empty frame, because nothing had
       asked it to render yet. */
    if (lay(k).open) render(k);
    apply(wins.get(k));
  }
  syncRailButtons();
}

/* The river shows itself only when it is holding something, or while a window
   is being dragged over it. An empty gutter down the map is just lost map. */
function syncRiver() {
  const river = $('river');
  if (!river) return;
  const held = order.some(k => lay(k).open && lay(k).docked && !wins.get(k).el.hidden);
  river.classList.toggle('holding', held);
}

/** Player mode arrives after boot, so the rail and the windows re-evaluate. */
export function applyDockMode() { applyAll(); }

/* ---- dragging ----

   One pointer, captured on the head. Anywhere left of the river's right edge
   docks; anywhere else floats. The window is moved to the stage for the
   duration so it is never half in a flex column and half under the pointer. */

let drag = null;
let dragMoved = false;

function startDrag(w, ev) {
  if (ev.button !== 0 || ev.target.closest('[data-gw]')) return;
  const st = lay(w.key);
  const r = w.el.getBoundingClientRect();
  const stageR = $('stage').getBoundingClientRect();
  drag = {
    w, st,
    dx: ev.clientX - r.left,
    dy: ev.clientY - r.top,
    sx: ev.clientX, sy: ev.clientY,
    stageR,
  };
  dragMoved = false;
  w.head.setPointerCapture?.(ev.pointerId);
  w.head.addEventListener('pointermove', onDrag);
  w.head.addEventListener('pointerup', endDrag);
  w.head.addEventListener('pointercancel', endDrag);
}

function onDrag(ev) {
  if (!drag) return;
  const { w, stageR } = drag;
  if (!dragMoved) {
    // Measured from where the pointer went down, not per-event movement: a
    // slow drag reports a run of sub-pixel moves and would never start.
    if (Math.abs(ev.clientX - drag.sx) + Math.abs(ev.clientY - drag.sy) < 3) return;
    dragMoved = true;
    // Lift it out of the river the moment it actually moves, not before: a
    // click on the head must not undock anything.
    drag.st.docked = false;
    w.el.classList.remove('docked');
    $('stage').appendChild(w.el);
    w.el.style.zIndex = String(++zTop);
  }
  const x = ev.clientX - stageR.left - drag.dx;
  const y = ev.clientY - stageR.top - drag.dy;
  drag.st.x = Math.max(0, Math.min(stageR.width - 80, x));
  drag.st.y = Math.max(0, Math.min(stageR.height - 28, y));
  w.el.style.left = drag.st.x + 'px';
  w.el.style.top = drag.st.y + 'px';

  const over = overRiver(ev.clientX);
  $('river')?.classList.toggle('target', over);
}

const RIVER_CATCH = 26;   // px of slack past the river's edge that still docks

function overRiver(clientX) {
  const river = $('river');
  if (!river) return false;
  const r = river.getBoundingClientRect();
  return clientX <= r.right + RIVER_CATCH;
}

function endDrag(ev) {
  if (!drag) return;
  const { w } = drag;
  w.head.removeEventListener('pointermove', onDrag);
  w.head.removeEventListener('pointerup', endDrag);
  w.head.removeEventListener('pointercancel', endDrag);
  $('river')?.classList.remove('target');

  if (dragMoved) {
    if (overRiver(ev.clientX)) {
      lay(w.key).docked = true;
      dockInOrder(w, ev.clientY);
    }
    apply(w);
    saveLayout();
  }
  drag = null;
  // Let the click that follows this pointerup through, then forget the drag.
  setTimeout(() => { dragMoved = false; }, 0);
}

/* Dropped into the river, a window takes the place its own top edge asks for,
   so the column ends up in the order you arranged rather than the order you
   happened to open things. */
function dockInOrder(w, clientY) {
  const river = $('river');
  if (!river) return;
  const sibs = [...river.children].filter(c => c !== w.el && !c.hidden);
  const before = sibs.find(c => clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
  river.insertBefore(w.el, before || null);
}
