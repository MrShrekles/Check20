/* Scenes: the table's pages.

   One map was never enough. A session moves from the road to the inn to the
   cellar under it, and rebuilding the cellar every time you go back down is
   not a map, it is a chore. So a table holds several, and the bar across the
   top of the stage is how you move between them.

   The model is in `state.js` — the open scene's map lives at the top of
   `state`, the rest wait in `state.scenes`. This module owns the moving
   between them and the bar that does it.

   The preview on each card is the map as it looked when you last left it,
   captured off the live canvas at 160px and kept as a small JPEG. That is
   cheap enough to sit in the autosave and it is honest: it shows where you
   were, not a render of somewhere you have never been. */

import {
  state, ui, computed, id as newId, makeScene, SCENE_FIELDS,
  DEFAULT_TINT,
} from './state.js';
import { $, esc, toast, safeColor } from './dom.js';
import { view, requestDraw } from './view.js';
import { computeLight, invalidateRooms } from './lighting.js';
import { isPlayerMode } from './session.js';
import { revealWin, renderIfOpen } from './dock.js';
import {
  uploadSceneImage, removeSceneImage, uploadBlocker, fileBlocker,
  reportUploadError, imageSize,
} from './storage.js';
import { centreOnView, forgetImage, releaseLocal } from './backdrop.js';
import { fitToCells } from './geometry.js';
import { putMap, deleteMap, mapUsage } from './mapstore.js';

/* Set by main.js: the panels that have to be redrawn when the map underneath
   them changes. Scenes cannot import them — layers.js and initiative.js both
   sit downstream of the map, and props.js reaches back into the toolbar. */
let onSceneSwitch = () => { };
export const setSceneSwitchHook = fn => { onSceneSwitch = fn; };

export const activeScene = () =>
  state.scenes.find(s => s.id === state.sceneId) || state.scenes[0] || null;

export const sceneCount = () => state.scenes.length;

/** Write the live map back into the scene entry that owns it. */
export function syncActiveScene() {
  const sc = activeScene();
  if (!sc) return;
  for (const k of SCENE_FIELDS) sc[k] = state[k];
}

/**
 * Make sure there is at least one scene, built from whatever is live.
 * Called at boot and after a table loads, so an old single-map file becomes a
 * one-page table rather than a special case everything downstream has to know
 * about.
 */
export function ensureScenes(name = 'Scene 1') {
  if (state.scenes.length) {
    if (!activeScene()) state.sceneId = state.scenes[0].id;
    syncActiveScene();
    return;
  }
  const sc = makeScene(name);
  for (const k of SCENE_FIELDS) sc[k] = state[k];
  sc.tint = state.tint || DEFAULT_TINT();
  state.scenes = [sc];
  state.sceneId = sc.id;
}

/* ---- the preview ---- */

/**
 * The live canvas, shrunk. Returns '' rather than throwing if the canvas is
 * not up yet or the browser refuses the read, because a missing preview is a
 * grey card and a thrown error is a dead scene bar.
 */
export function captureThumb() {
  const cv = view.cv;
  if (!cv?.width || !cv?.height) return '';
  try {
    const w = 160, h = Math.max(1, Math.round(w * cv.height / cv.width));
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const c = off.getContext('2d');
    c.drawImage(cv, 0, 0, w, h);
    return off.toDataURL('image/jpeg', .55);
  } catch {
    return '';
  }
}

/* A preview costs a canvas read and a JPEG encode, so the bar does not take
   one every time it repaints. Leaving a scene always does; sitting on one
   refreshes at most this often. */
const THUMB_MIN_MS = 6000;
let lastThumb = 0;

function refreshThumb(force = false) {
  const sc = activeScene();
  if (!sc) return;
  const t = Date.now();
  if (!force && t - lastThumb < THUMB_MIN_MS) return;
  const data = captureThumb();
  if (data) { sc.thumb = data; lastThumb = t; }
}

/* ---- moving between them ---- */

export function switchScene(id) {
  if (id === state.sceneId) return;
  const to = state.scenes.find(s => s.id === id);
  if (!to) return;

  refreshThumb(true);
  syncActiveScene();

  /* Anything pointing at an item is pointing at an item on the map that is
     leaving. Selections, hovers, a half-drawn shape, the room cache — all of
     it belongs to the old page. */
  ui.sel.item = null; ui.sel.group = [];
  ui.hover = null; ui.temp = null; ui.drag = null; ui.measure = null; ui.pins = [];
  computed.litCells = new Set();

  for (const k of SCENE_FIELDS) state[k] = to[k];
  state.sceneId = to.id;
  if (!state.tint) state.tint = DEFAULT_TINT();

  invalidateRooms();
  onSceneSwitch();
  renderSceneBar();
  computeLight();
  requestDraw();
}

export function addScene(name, folder = '') {
  refreshThumb(true);
  syncActiveScene();
  const sc = makeScene(name || `Scene ${state.scenes.length + 1}`);
  // Made while a folder is open, it belongs in that folder.
  sc.folder = String(folder || '').trim();
  state.scenes.push(sc);
  switchScene(sc.id);
  toast(`${sc.name} added`);
  return sc;
}

/** A copy of the open scene, map and all, for a variant of the same room. */
export function duplicateScene() {
  refreshThumb(true);
  syncActiveScene();
  const sc = activeScene();
  if (!sc) return null;
  const copy = structuredClone({ ...sc, id: undefined });
  copy.id = newId();
  copy.name = `${sc.name} copy`;
  state.scenes.splice(state.scenes.indexOf(sc) + 1, 0, copy);
  switchScene(copy.id);
  return copy;
}

export function deleteScene(id) {
  if (state.scenes.length <= 1) return toast('A table keeps at least one scene');
  const i = state.scenes.findIndex(s => s.id === id);
  if (i < 0) return;
  const sc = state.scenes[i];
  if (!confirm(`Delete "${sc.name}" and everything on it?`)) return;
  state.scenes.splice(i, 1);
  if (state.sceneId === id) {
    // Fall to the neighbour, which is where the eye already is.
    const next = state.scenes[Math.min(i, state.scenes.length - 1)];
    state.sceneId = null;               // force switchScene past its early return
    switchScene(next.id);
  } else {
    renderSceneBar();
  }
  toast(`${sc.name} deleted`);
}

export function renameScene(id, name) {
  const sc = state.scenes.find(s => s.id === id);
  const n = String(name || '').trim();
  if (!sc || !n || n === sc.name) return;
  sc.name = n;
  renderSceneBar();
}

/** Move a scene one place along, so the bar reads in the order you play it. */
export function moveScene(id, dir) {
  const i = state.scenes.findIndex(s => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.scenes.length) return;
  [state.scenes[i], state.scenes[j]] = [state.scenes[j], state.scenes[i]];
  renderSceneBar();
}

/* ---- folders ----

   A campaign that runs long ends up with thirty pages, and thirty cards in a
   row is not a strip, it is a filing problem.

   Drag one scene onto another and they become a folder, the way the website's
   session board works in `scripts/worldgen.js` and the way Roll20 does it.
   Drop one onto an existing folder and it joins. Drag it back out to the strip
   and it is loose again.

   Underneath it is still a plain string on the scene — `''` is loose, anything
   else groups. No folder objects, no tree, nothing to clean up when the last
   scene leaves one: a folder exists exactly as long as something is filed
   under it, so a save carries no empty drawers and Firebase will have no
   second collection to keep in step. */

export const folderList = () => {
  const out = [];
  for (const sc of state.scenes) {
    const f = (sc.folder || '').trim();
    if (f && !out.includes(f)) out.push(f);
  }
  return out;
};

export const scenesIn = folder => state.scenes.filter(sc => (sc.folder || '') === folder);

/** A name no existing folder is using, for a pair that has just been grouped. */
function freshFolderName() {
  const taken = new Set(folderList());
  if (!taken.has('New folder')) return 'New folder';
  for (let n = 2; ; n++) if (!taken.has(`New folder ${n}`)) return `New folder ${n}`;
}

export function setSceneFolder(id, folder) {
  const sc = state.scenes.find(s => s.id === id);
  if (!sc) return;
  sc.folder = String(folder || '').trim();
  if (sc.folder) expandedFolders.add(sc.folder);
  renderSceneBar();
}

/**
 * A scene was dropped on something.
 *
 * On a folder it joins it; on another loose scene the two become a new folder;
 * on a scene already in one it joins that one rather than nesting, which is
 * the rule the session board uses and the reason neither ever grows a tree.
 */
export function dropSceneOn(dragId, target) {
  const sc = state.scenes.find(x => x.id === dragId);
  if (!sc) return;

  if (target.folder !== undefined) {
    if ((sc.folder || '') === target.folder) return;
    sc.folder = target.folder;
    if (target.folder) expandedFolders.add(target.folder);
  } else if (target.sceneId) {
    if (target.sceneId === dragId) return;
    const onto = state.scenes.find(x => x.id === target.sceneId);
    if (!onto) return;
    const name = onto.folder || freshFolderName();
    onto.folder = name;
    sc.folder = name;
    expandedFolders.add(name);
    /* The two sit together from now on, so put the dragged one beside the one
       it was dropped on rather than leaving it wherever it started. */
    state.scenes.splice(state.scenes.indexOf(sc), 1);
    state.scenes.splice(state.scenes.indexOf(onto) + 1, 0, sc);
  }
  renderSceneBar();
}

export function renameFolder(from, to) {
  const name = String(to || '').trim();
  if (!name || name === from) return renderSceneBar();
  for (const sc of state.scenes) if ((sc.folder || '') === from) sc.folder = name;
  expandedFolders.delete(from);
  expandedFolders.add(name);
  renderSceneBar();
}

/** Tip a folder out: its scenes go loose and the folder stops existing. */
export function ungroupFolder(name) {
  for (const sc of state.scenes) if ((sc.folder || '') === name) sc.folder = '';
  expandedFolders.delete(name);
  renderSceneBar();
}

/* ---- the bar ---- */

/* Which card has its settings open, and whether the whole bar is furled. The
   bar is furled per browser rather than per table: how much of your screen you
   give the page strip is about your screen. */
let openSettings = null;
/* How much room the local maps are taking. Read once and after every change,
   because the store is async and the panel is not. */
export let localUsage = { count: 0, bytes: 0 };
export const refreshUsage = () => mapUsage().then(u => { localUsage = u; }).catch(() => { });

/* Which folders are tipped open in the strip. Not saved: which drawers you
   have open is where you are, not what the table is. */
const expandedFolders = new Set();
const FURL_KEY = 'gaslight.scenebar';
let furled = false;
try { furled = localStorage.getItem(FURL_KEY) === 'closed'; } catch { /* no store */ }

const TINT_PRESETS = [
  ['None', '#20304a', 0],
  ['Night', '#16284a', .34],
  ['Dusk', '#4a2a16', .26],
  ['Cave', '#101418', .42],
  ['Sickly', '#1e3a1c', .3],
  ['Blood', '#3c0e12', .3],
  ['Frost', '#1b3a46', .3],
];

/* Stepped, not slid.

   These were range sliders, and a range slider inside a card that is itself
   draggable is unusable: the pointer-down that grabs the thumb starts the
   card's drag instead, so adjusting the dim dragged the scene into a folder.
   Buttons cannot be mistaken for a drag, and for a value with five useful
   settings they are quicker anyway. */
const DIM_STEPS = [['Off', 0], ['Faint', .25], ['Half', .5], ['Deep', .75], ['Black', .9]];
const WASH_STEPS = [['None', 0], ['Hint', .15], ['Some', .3], ['Heavy', .5], ['Drowned', .7]];

const stepRow = (steps, current, attr) => steps.map(([label, v]) =>
  `<button class="scstep${Math.abs(current - v) < .02 ? ' on' : ''}" ${attr}="${v}">${label}</button>`).join('');

/* Common map scales. A scene is not always a battlemap, and a ruler that
   insisted on five feet would be lying on a world map. */
/* The grid over a battlemap is a different problem from the grid over an empty
   table: the theme's is tuned for the second and is often invisible or in the
   way on the first. Theme first, because it is what almost every scene wants. */
const GRID_INKS = [
  ['Theme', ''],
  ['White', '#ffffff'],
  ['Black', '#000000'],
  ['Gold', '#af8000'],
  ['Teal', '#4c6e6e'],
];

const GRID_WEIGHTS = [['Faint', .35], ['Soft', .6], ['Normal', 1]];

const SCALE_PRESETS = [
  ['Battlemap', 5, 'ft'],
  ['Building', 10, 'ft'],
  ['Town', 50, 'ft'],
  ['Region', 1, 'mile'],
  ['World', 10, 'miles'],
];

/* What a scene IS — not what it looks like.

   Everything about how a scene looks (the map, the grid, the lighting, the
   wash, the scale) moved to the Map window on the left, for one reason: you
   cannot judge a colour wash on a page you are not looking at. A cog on a card
   for some other scene offering to set its lighting was offering a change you
   had no way to see. Now the cog names the scene and files it, and the window
   styles whichever scene is open. */
function settingsPanel(sc) {
  const live = sc.id === state.sceneId;
  return `
    <!-- The card around this is draggable, and a draggable ancestor eats the
         drag that selects text in a field. -->
    <div class="scset" data-scset draggable="false">
      <label class="scfield">Name
        <input type="text" data-scname value="${esc(sc.name)}" spellcheck="false">
      </label>

      <div class="scrow">
        <span class="sclbl">Folder</span>
        <span class="scfolderval">${sc.folder ? esc(sc.folder) : 'Loose'}</span>
        ${sc.folder ? '<button class="tbbtn small" data-scunfile title="Take it out of the folder">Take out</button>' : ''}
      </div>
      <div class="schint">Drag a card onto another to file them together, or onto
        a folder to join it. Drag it back to the strip to loosen it.</div>

      <div class="scrow">
        <span class="sclbl">Looks</span>
        ${live
      ? '<button class="tbbtn small" data-scmapwin>Map settings…</button>'
      : '<span class="scfolderval">Open it to change</span>'}
      </div>
      <div class="schint">${live
      ? 'The map, the grid, the lighting, the wash and the scale are in the Map window on the left — where you can see what you are changing.'
      : 'A scene is styled while you are looking at it. Click the preview to go there.'}</div>

      <div class="scacts">
        <button class="tbbtn small" data-scdup>Duplicate</button>
        <button class="tbbtn small" data-scleft title="Move earlier">&#9664;</button>
        <button class="tbbtn small" data-scright title="Move later">&#9654;</button>
        <button class="tbbtn small del" data-scdel>Delete</button>
      </div>
    </div>`;
}

export function renderSceneBar() {
  const bar = $('sceneBar');
  if (!bar) return;

  /* Players do not steer the table. Once the map syncs, the scene they see is
     the one the narrator opened; a picker here would only let them wander off
     it. */
  bar.hidden = isPlayerMode();
  if (bar.hidden) return;

  if (!state.scenes.length) ensureScenes();
  refreshThumb();
  bar.classList.toggle('furled', furled);

  const openSceneFolder = activeScene()?.folder || '';

  const cog = id => `<button class="sccog" data-sccog="${id}" title="Scene settings"
      aria-expanded="${openSettings === id}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.6"/><path d="M19.4 13.6a7.7 7.7 0 000-3.2l2-1.6-1.9-3.3-2.4 1a7.7 7.7 0 00-2.8-1.6L14 2.2h-4l-.3 2.7a7.7 7.7 0 00-2.8 1.6l-2.4-1L2.6 8.8l2 1.6a7.7 7.7 0 000 3.2l-2 1.6 1.9 3.3 2.4-1a7.7 7.7 0 002.8 1.6l.3 2.7h4l.3-2.7a7.7 7.7 0 002.8-1.6l2.4 1 1.9-3.3z"/></svg>
    </button>`;

  const sceneCard = (sc, inFolder = false) => `
    <div class="scenecard${sc.id === state.sceneId ? ' on' : ''}${inFolder ? ' filed' : ''}"
      data-scene="${sc.id}" draggable="true" title="${esc(sc.name)}">
      <div class="scthumb">
        ${sc.thumb ? `<img src="${sc.thumb}" alt="" draggable="false">` : '<span class="scnothumb">No preview yet</span>'}
        ${sc.tint?.amount ? `<span class="scwash" style="background:${safeColor(sc.tint.color)};opacity:${sc.tint.amount}"></span>` : ''}
      </div>
      <div class="scname"><span>${esc(sc.name)}</span>${cog(sc.id)}</div>
      ${openSettings === sc.id ? settingsPanel(sc) : ''}
    </div>`;

  /* A folder is a tile the same size as a card, because it is the same kind of
     thing in the strip: something you drop a scene on, and something you open. */
  const folderTile = name => {
    const inside = scenesIn(name);
    const open = expandedFolders.has(name);
    const live = openSceneFolder === name;
    const cover = inside.find(sc => sc.thumb)?.thumb || '';
    return `
      <div class="scfolder${open ? ' open' : ''}${live ? ' live' : ''}" data-folder="${esc(name)}">
        <div class="scthumb scfoldthumb">
          ${cover ? `<img src="${cover}" alt="" draggable="false">` : ''}
          <span class="scfoldicon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3 7.5A1.5 1.5 0 014.5 6h4l2 2.4h7A1.5 1.5 0 0119 10v7a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 013 17z"/></svg>
          </span>
          <span class="scfoldn">${inside.length}</span>
        </div>
        <div class="scname">
          <span class="scfoldname" contenteditable="true" spellcheck="false"
            data-foldname="${esc(name)}" title="Click to rename">${esc(name)}</span>
          <button class="sccog" data-foldout="${esc(name)}" title="Tip it out: every scene goes loose">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>`;
  };

  /* Walked in scene order, so the strip reads the way the table is arranged:
     a folder appears where its first scene sits, and its scenes follow it only
     while it is open. */
  const seen = new Set();
  const entries = [];
  for (const sc of state.scenes) {
    const f = sc.folder || '';
    if (!f) { entries.push(sceneCard(sc)); continue; }
    if (seen.has(f)) continue;
    seen.add(f);
    entries.push(folderTile(f));
    if (expandedFolders.has(f)) for (const kid of scenesIn(f)) entries.push(sceneCard(kid, true));
  }

  bar.innerHTML = `
    <button class="scfurl" data-scfurl title="${furled ? 'Show the scenes' : 'Hide the scene bar'}">
      <span class="scfurlcaret">&#9652;</span>
      <span class="scfurlword">Scenes</span><b>${state.scenes.length}</b>
    </button>
    <div class="scenepages${openSettings ? ' editing' : ''}">
      <div class="scenestrip" data-scloose>${entries.join('')}
        <button class="sceneadd" data-scadd title="A new, empty scene">
          <span>+</span>New scene
        </button>
      </div>
    </div>`;

  wireDrag(bar);
}

/* ---- drag and drop ----

   HTML5 drag, the same as the website's session board, because what is being
   asked is "put this on that" rather than "slide this along a list" — the
   pointer-driven reorder in reorder.js answers the other question. */

let dragScene = null;

function wireDrag(bar) {
  for (const card of bar.querySelectorAll('[data-scene]')) {
    card.addEventListener('dragstart', e => {
      dragScene = card.dataset.scene;
      e.dataTransfer.setData('text/plain', dragScene);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      dragScene = null;
      card.classList.remove('dragging');
      bar.querySelectorAll('.dropon').forEach(el => el.classList.remove('dropon'));
    });
  }

  /* A card and a folder both take a drop; the strip itself takes one too, and
     that is what loosens a scene again. */
  const targets = [...bar.querySelectorAll('[data-scene], [data-folder]'), bar.querySelector('[data-scloose]')];
  for (const el of targets) {
    if (!el) continue;
    el.addEventListener('dragover', e => {
      if (!dragScene || el.dataset.scene === dragScene) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('dropon');
    });
    el.addEventListener('dragleave', () => el.classList.remove('dropon'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('dropon');
      const id = dragScene || e.dataTransfer.getData('text/plain');
      if (!id) return;
      if (el.dataset.folder !== undefined) dropSceneOn(id, { folder: el.dataset.folder });
      else if (el.dataset.scene) dropSceneOn(id, { sceneId: el.dataset.scene });
      else dropSceneOn(id, { folder: '' });
    });
  }
}

export function initScenes() {
  ensureScenes();
  refreshUsage();

  const bar = $('sceneBar');
  if (!bar) return;

  bar.addEventListener('click', e => {
    if (e.target.closest('[data-scfurl]')) {
      furled = !furled;
      try { localStorage.setItem(FURL_KEY, furled ? 'closed' : 'open'); } catch { /* no store */ }
      return renderSceneBar();
    }
    if (e.target.closest('[data-scadd]')) return addScene();

    /* Tip a folder out. Destructive enough to ask, since the scenes survive
       but the grouping does not. */
    const out = e.target.closest('[data-foldout]');
    if (out) {
      const name = out.dataset.foldout;
      const n = scenesIn(name).length;
      if (!confirm(`Tip "${name}" out? Its ${n} scene${n === 1 ? '' : 's'} stay, the folder does not.`)) return;
      return ungroupFolder(name);
    }

    // Renaming is the field's own job; opening the drawer is the tile's.
    if (e.target.closest('[data-foldname]')) return;

    const folder = e.target.closest('[data-folder]');
    if (folder) {
      const name = folder.dataset.folder;
      if (expandedFolders.has(name)) expandedFolders.delete(name);
      else expandedFolders.add(name);
      return renderSceneBar();
    }

    const cog = e.target.closest('[data-sccog]');
    if (cog) {
      const id = cog.dataset.sccog;
      openSettings = openSettings === id ? null : id;
      refreshThumb(true);
      return renderSceneBar();
    }

    /* Inside an open settings panel every control is its own thing, so the
       card's own "go to this scene" must not fire underneath them. */
    /* A scene's cog names it, files it and moves it. Everything about how it
       LOOKS moved to the Map window, so the long list of style handlers that
       used to live here went with it. */
    const panel = e.target.closest('[data-scset]');
    if (panel) {
      const sc = state.scenes.find(s => s.id === panel.closest('[data-scene]')?.dataset.scene);
      if (!sc) return;
      if (e.target.closest('[data-scdup]')) { openSettings = null; return void duplicateScene(); }
      if (e.target.closest('[data-scdel]')) { openSettings = null; return deleteScene(sc.id); }
      if (e.target.closest('[data-scunfile]')) return setSceneFolder(sc.id, '');
      if (e.target.closest('[data-scleft]')) return moveScene(sc.id, -1);
      if (e.target.closest('[data-scright]')) return moveScene(sc.id, 1);
      if (e.target.closest('[data-scmapwin]')) {
        openSettings = null;
        renderSceneBar();
        return revealWin('map');
      }
      return;
    }

    const card = e.target.closest('[data-scene]');
    if (card) switchScene(card.dataset.scene);
  });


  bar.addEventListener('change', e => {
    const card = e.target.closest('[data-scene]');
    const sc = state.scenes.find(s => s.id === card?.dataset.scene);
    if (sc && e.target.matches('[data-scname]')) renameScene(sc.id, e.target.value);
  });

  /* A folder's name is edited in place on its tile. Enter commits, Escape puts
     it back; leaving the field commits too, because a name half-typed and
     clicked away from is still what you meant. */
  bar.addEventListener('keydown', e => {
    const f = e.target.closest('[data-foldname]');
    if (!f) return;
    if (e.key === 'Enter') { e.preventDefault(); f.blur(); }
    if (e.key === 'Escape') { f.textContent = f.dataset.foldname; f.blur(); }
  });

  bar.addEventListener('focusout', e => {
    const f = e.target.closest('[data-foldname]');
    if (f) renameFolder(f.dataset.foldname, f.textContent);
  });

  renderSceneBar();
}

/* ---- the per-scene settings, applied ----

   `light.dim` has no setter any more. It only ever changed what the narrator
   saw — a player is shown full dark whatever it was — so tuning it was a
   setting pretending to be a rule. It keeps its default; the value earns a
   control back when darkness is per token and both sides see the same thing.

   Each one writes to the scene entry, and also to the live field when that
   scene is the open one — because the live field is what the renderer reads.
   The toolbar's own Lighting toggle and dim slider stay in step through
   `syncSceneChrome()`, so the two places that show the same fact agree. */

export function setSceneLight(sc, on) {
  sc.light.enabled = on;
  if (sc.id === state.sceneId) {
    state.light.enabled = on;
    computeLight();
    requestDraw();
  }
  syncSceneChrome();
  renderSceneBar();
}


/* The grid belongs to the scene, so this writes there and mirrors it onto the
   live field and the top bar only when it IS the open scene. Room lighting is
   flood-filled per cell, so a size change has to recompute it. */
export function setSceneGrid(sc, patch, { quiet = false } = {}) {
  sc.grid = { show: true, size: 50, ink: '', weight: 1, ...(sc.grid || {}), ...patch };
  if (sc.id === state.sceneId) {
    state.grid = sc.grid;
    if (patch.size !== undefined) computeLight();
    requestDraw();
  }
  /* `quiet` is for a control being dragged: repaint the map, but leave the
     panel alone until the pointer is let go, or the slider is rebuilt under
     the hand holding it. */
  if (quiet) return;
  syncSceneChrome();
  renderSceneBar();
}

export function setSceneScale(sc, per, unit) {
  const n = Number(per);
  sc.scale = {
    per: n > 0 ? n : 5,
    unit: String(unit || 'ft').trim() || 'ft',
  };
  if (sc.id === state.sceneId) { state.scale = sc.scale; requestDraw(); }
  renderSceneBar();
}

/* ---- the map on a scene ----

   The bytes go to Cloud Storage and the scene keeps the URL. Everything here
   is best effort: signed out, offline or with the bucket unreachable, the
   table keeps working and the scene simply has no picture. */

export function setSceneImage(sc, image) {
  sc.image = image;
  if (sc.id === state.sceneId) state.image = image;
  refreshThumb(true);
  refreshUsage().then(() => { renderSceneBar(); renderIfOpen('map'); });
  renderSceneBar();
  renderIfOpen('map');
  requestDraw();
}

/** Change the placement of a map that is already there. */
export function editMap(sc, fn) {
  if (!sc.image) return;
  setSceneImage(sc, fn(sc.image));
}

/* Dragging the map on the canvas writes straight to `state.image`, which IS
   the open scene's image — so the scene entry already has it. What is left is
   the saving, the preview and repainting the strip. */
export function backdropChanged(image, { layers = false } = {}) {
  const sc = activeScene();
  if (!sc) return;
  sc.image = image;
  state.image = image;
  refreshThumb(true);
  renderSceneBar();
  renderIfOpen('map');
  if (layers) onSceneSwitch();     // a locked layer has to reach the panel
  requestDraw();
}

/** Delete key, or Remove on the backdrop card. */
export function removeBackdrop() {
  const sc = activeScene();
  if (sc) clearMap(sc);
}

export async function clearMap(sc) {
  const im = sc.image;
  if (!im) return;
  setSceneImage(sc, null);

  if (im.src === 'local') {
    releaseLocal(im.key);
    deleteMap(im.key);
  } else if (im.src === 'cloud') {
    forgetImage(im.url);
    /* The object goes too when it was ours to delete. When it was not, the
       scene still drops it — an orphan in the bucket is a job for a scheduled
       cleanup, not a reason to refuse to clear the map. */
    removeSceneImage(im.path);
  } else {
    forgetImage(im.url);
  }
  toast('Map taken off');
}

/* A dropped map arrives as a picture with no idea how big a room is, so it is
   placed forty cells wide and under the middle of the view. A 4000px image is
   eighty cells of nothing in particular; "a room" is something a narrator can
   then adjust. */
const place = info => centreOnView(fitToCells({ ...info, x: 0, y: 0, scale: 1 }, 40));

/**
 * Put a map on a scene from a file.
 *
 * `local` keeps it in this browser: free, offline, no account, and the only
 * one that works without billing enabled on the Firebase project. `cloud`
 * uploads it to the room, which needs Blaze and needs scenes to sync before
 * anyone else can see it.
 */
export async function putMapOnScene(sc, file, where = 'local') {
  const why = where === 'cloud'
    ? (uploadBlocker() || fileBlocker(file))
    : fileBlocker(file);
  if (why) return toast(why);

  const bar = $('sceneBar')?.querySelector('.scprog');
  const fill = bar?.querySelector('span');
  if (bar) bar.hidden = false;

  try {
    const { w, h } = await imageSize(file);

    if (where === 'cloud') {
      toast('Uploading the map…');
      const info = await uploadSceneImage(file, sc.id, pct => {
        if (fill) fill.style.width = pct + '%';
      });
      setSceneImage(sc, place({ src: 'cloud', ...info, bytes: file.size }));
      toast('Map uploaded. Size and nudge are in the scene cog.');
      return;
    }

    const key = await putMap(file, { name: file.name, w, h });
    setSceneImage(sc, place({ src: 'local', key, w, h, bytes: file.size }));
    toast('Map placed. Size and nudge are in the scene cog.');
  } catch (err) {
    reportUploadError(err);
  } finally {
    if (bar) bar.hidden = true;
  }
}

export function pickMap(sc, where) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/gif';
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (f) putMapOnScene(sc, f, where);
  });
  input.click();
}

/* Someone else's image, by link. Costs nothing and belongs to nobody, which
   is the trade: it is only there while their host serves it, and if that host
   sends no CORS headers this scene's preview stops updating. Both of those are
   said out loud rather than discovered. */
export async function linkMap(sc) {
  const url = prompt('Link to an image (PNG, JPEG, WebP or GIF):', '');
  if (!url) return;
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return toast('That is not a web address.');
  try {
    const { w, h } = await imageSize(clean);
    setSceneImage(sc, place({ src: 'url', url: clean, w, h }));
    toast('Map linked. It is there while that host serves it.');
  } catch {
    toast('That link could not be loaded as an image.');
  }
}

export function setSceneTint(sc, color, amount, quiet = false) {
  sc.tint = { color, amount };
  if (sc.id === state.sceneId) { state.tint = sc.tint; requestDraw(); }
  if (!quiet) { renderSceneBar(); renderIfOpen('map'); }
}

/** Push the open scene's lighting onto the controls in the Rooms sub bar.

    The grid used to be mirrored here too, from a pair of controls in the top
    bar. They are gone: the grid belongs to the scene, so it is set where the
    rest of the scene's look is set. */
export function syncSceneChrome() {
  $('lightToggle')?.classList.toggle('on', state.light.enabled !== false);
  const dim = $('dimRange');
  if (dim) dim.value = Math.round((state.light.dim ?? .55) * 100);
  renderIfOpen('map');
}

/* ---- dropping a map on the map ----

   The scene cog has a file picker, but dragging a battlemap onto the table is
   what a narrator will actually try first, so it works. Only images: anything
   else falls through to the browser, which is what you want when a stray link
   is dropped. */
export function initMapDrop(stage) {
  if (!stage) return;

  const imageIn = dt => [...(dt?.items || [])]
    .some(i => i.kind === 'file' && String(i.type).startsWith('image/'));

  stage.addEventListener('dragover', e => {
    if (isPlayerMode() || !imageIn(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    stage.classList.add('mapdrop');
  });

  stage.addEventListener('dragleave', e => {
    // Only when the pointer has actually left the stage, not a child of it.
    if (e.target === stage) stage.classList.remove('mapdrop');
  });

  stage.addEventListener('drop', e => {
    stage.classList.remove('mapdrop');
    if (isPlayerMode()) return;
    const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    const sc = activeScene();
    if (sc) putMapOnScene(sc, file, 'local');
  });
}
