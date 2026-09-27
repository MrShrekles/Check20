/* The Map window: how the open scene looks.

   All of this used to live in the scene's cog, which was wrong for a reason
   worth writing down: **you cannot judge a colour wash on a page you are not
   looking at.** A cog on some other scene's card offered to set its lighting,
   its grid and its tint, and none of those changes were visible while you made
   them. So the cog now names a scene and files it, and this window styles
   whichever scene is open.

   It is a dock window like the others (see dock.js), so it lives in the river
   on the left with Layers, Initiative, the book and the generators — which is
   where the narrator's tools belong.

   This module renders and wires; `scenes.js` owns every change, because it
   owns the saving, the preview and the map store. */

import { state } from './state.js';
import { esc, safeColor } from './dom.js';
import { DEFAULT_TINT, DEFAULT_SCALE } from './state.js';
import { MAX_MAP_MB, uploadBlocker } from './storage.js';
import { imageTaints, backdropLayer } from './backdrop.js';
import { prettyBytes } from './mapstore.js';
import {
  activeScene, setSceneLight, setSceneGrid, setSceneScale,
  setSceneTint, editMap, clearMap, pickMap, linkMap, localUsage,
} from './scenes.js';
import { fitToCells, nudgeBackdrop, zoomBackdrop } from './geometry.js';
import { requestDraw } from './view.js';

/* ---- the choices on offer ----
   Stepped buttons rather than sliders throughout. A slider was unusable inside
   the draggable scene card it used to live in, and for a value with four or
   five useful settings the buttons are quicker anyway. */

const WASH_STEPS = [['None', 0], ['Hint', .15], ['Some', .3], ['Heavy', .5], ['Drowned', .7]];

const TINT_PRESETS = [
  ['None', '#20304a', 0],
  ['Night', '#16284a', .34],
  ['Dusk', '#4a2a16', .26],
  ['Cave', '#101418', .42],
  ['Sickly', '#1e3a1c', .3],
  ['Blood', '#3c0e12', .3],
  ['Frost', '#1b3a46', .3],
];

/* The picker needs a colour to show even when the scene has none, since an
   empty value means "whatever the theme says". This is what the dark theme
   draws, so the swatch starts on roughly what is already on screen. */
const THEME_GRID = '#4c6e6e';

const steps = (list, current, attr) => list.map(([label, v]) =>
  `<button class="scstep${Math.abs(current - v) < .02 ? ' on' : ''}" ${attr}="${v}">${label}</button>`).join('');

const block = (title, body) => `
  <div class="mpblock">
    <h5>${title}</h5>
    ${body}
  </div>`;

/* ---- the map itself ---- */

function mapBlock(sc) {
  const im = sc.image;
  const cloud = uploadBlocker();
  const L = backdropLayer();
  const locked = !!L?.locked;

  if (!im) {
    return block('Map', `
      <div class="mprow">
        <button class="tbbtn small" data-mp="pick">Choose an image…</button>
        <button class="tbbtn small" data-mp="link">Paste a link…</button>
      </div>
      ${cloud ? '' : '<div class="mprow"><button class="tbbtn small" data-mp="cloud">Upload to the room</button></div>'}
      <div class="mphint">Or drop one on the table. PNG, JPEG, WebP or GIF, up to
        ${MAX_MAP_MB}MB. It is kept in this browser — free, offline, no account.${localUsage.count
    ? ` Holding ${localUsage.count} map${localUsage.count === 1 ? '' : 's'}, ${prettyBytes(localUsage.bytes)}.` : ''}</div>
      ${cloud ? `<div class="mphint">${esc(cloud)}</div>` : ''}
      <div class="scprog" hidden><span></span></div>`);
  }

  const cells = Math.round(Math.max(im.w, im.h) * (im.scale || 1) / state.grid.size);
  const where = im.src === 'local' ? 'In this browser' : im.src === 'cloud' ? 'In the room' : 'Linked';

  return block(`Map <small>${im.w}×${im.h} · ${cells} cells</small>`, `
    <div class="mprow">
      <span class="mplbl">${where}${im.bytes ? ` · ${prettyBytes(im.bytes)}` : ''}</span>
    </div>
    <div class="mprow">
      <span class="mplbl">Size</span>
      <button class="scstep" data-mp="zoom:0.9" title="Smaller">&minus;</button>
      <button class="scstep" data-mp="zoom:1.1" title="Bigger">+</button>
      <button class="scstep" data-mp="fit:20">20</button>
      <button class="scstep" data-mp="fit:40">40</button>
      <button class="scstep" data-mp="fit:80">80 cells</button>
    </div>
    <div class="mprow">
      <span class="mplbl">Nudge</span>
      <button class="scstep" data-mp="nudge:-1,0">&#9664;</button>
      <button class="scstep" data-mp="nudge:1,0">&#9654;</button>
      <button class="scstep" data-mp="nudge:0,-1">&#9650;</button>
      <button class="scstep" data-mp="nudge:0,1">&#9660;</button>
      <button class="scstep" data-mp="centre">Centre</button>
    </div>
    <div class="mprow">
      <button class="tbbtn small${locked ? ' on' : ''}" data-mp="lock">${locked ? 'Locked' : 'Lock it'}</button>
      <button class="tbbtn small del" data-mp="remove">Take it off</button>
    </div>
    <div class="mphint">${locked
    ? `The map is locked, so it no longer answers the pointer — draw over it
       freely. Unlocking is here or on the <b>${esc(L?.name || 'Map')}</b> layer.`
    : `Drag the map to move it, drag a corner to resize. Lock it once it is
       placed and it stops being picked up while you draw.`}</div>
    ${im.src === 'local' ? `<div class="mphint">Kept in this browser. It is not in
      the saved table and it does not follow the file to another machine.</div>` : ''}
    ${imageTaints(im) ? `<div class="mphint warn">That host does not allow this page
      to read the image back, so this scene's preview has stopped updating. The
      map itself is fine.</div>` : ''}`);
}

/* ---- everything else about how the scene looks ---- */

function gridBlock(sc) {
  const g = sc.grid || {};
  const pct = Math.round((g.weight ?? 1) * 100);
  return block('Grid', `
    <div class="mprow">
      <button class="tbbtn small" data-mp="gridshow">${g.show === false ? 'Hidden' : 'Shown'}</button>
      <input type="number" class="scnum" data-mp-gridsize min="20" max="200" step="5"
        value="${g.size ?? 50}" title="Cell size in pixels">
      <span class="mplbl">px</span>
    </div>
    <div class="mprow">
      <span class="mplbl">Lines</span>
      <input type="color" class="mpcolor" data-mp-gridink
        value="${safeColor(g.ink || THEME_GRID)}" title="Grid colour">
      <button class="tbbtn small${g.ink ? '' : ' on'}" data-mp="gridink:"
        title="Use whatever the current theme draws">Theme</button>
    </div>
    <div class="mprow">
      <span class="mplbl">Strength</span>
      <input type="range" class="mprange" data-mp-gridweight min="5" max="100"
        value="${pct}" title="How strongly the lines are drawn">
      <span class="mpnum">${pct}%</span>
    </div>
    <div class="mphint">The grid belongs to the scene — a battlemap and a world
      map do not want the same lines. Leave it on Theme unless the map's own
      lines fight it.</div>`);
}

function scaleBlock(sc) {
  const sl = sc.scale || DEFAULT_SCALE();
  return block('Distance', `
    <div class="mprow">
      <span class="mplbl">One cell is</span>
      <input type="number" class="scnum" data-mp-per min="0.1" step="0.1" value="${sl.per}">
      <input type="text" class="scunit" data-mp-unit value="${esc(sl.unit)}"
        list="mpunits" spellcheck="false" placeholder="ft">
    </div>
    <datalist id="mpunits">
      <option value="ft"></option><option value="m"></option>
      <option value="miles"></option><option value="km"></option>
      <option value="leagues"></option><option value="squares"></option>
    </datalist>
    <div class="mphint">What the ruler measures in. Type any unit \u2014 the list is
      only the common ones. Check20's range bands are written in feet, so they
      are only named on a scene measured in feet.</div>`);
}

/* On or off, and nothing else.

   There was a five-step Dim here, and it only ever changed what the NARRATOR
   saw — a player is shown full dark whatever it was set to. Tuning a number
   the table does not share is a setting pretending to be a rule, so it is
   gone. `light.dim` keeps its default and the narrator still sees through
   their own fog. It earns a control back when darkness is worked out per
   token and both sides are looking at the same thing — see the lighting
   ticket in the README. */
function lightBlock(sc) {
  const lit = (sc.light || {}).enabled !== false;
  return block('Lighting', `
    <div class="mprow">
      <button class="tbbtn small" data-mp="light">${lit ? 'On' : 'Off'}</button>
      <span class="mplbl">${lit ? 'Rooms and darkness' : 'Outdoor — no darkness'}</span>
    </div>
    <div class="mphint">${lit
    ? `Rooms are lit by what is inside them. You see an unlit room dimly, a
       player sees it black — and that difference is the whole lighting model
       until sight is worked out per token.`
    : 'No darkness, and no rooms to build. Right for an outdoor scene.'}</div>`);
}

function washBlock(sc) {
  const tint = sc.tint || DEFAULT_TINT();
  return block('Colour', `
    <div class="mprow">
      ${TINT_PRESETS.map(([label, color, amount]) => `
        <button class="sctint${tint.amount === amount && (amount === 0 || tint.color === color) ? ' on' : ''}"
          data-mp="tint:${color}|${amount}" title="${label}">
          <span style="background:${safeColor(color)};opacity:${amount || .12}"></span>${label}</button>`).join('')}
    </div>
    <div class="mprow">
      <span class="mplbl">Wash</span>
      ${steps(WASH_STEPS, tint.amount, 'data-mp-wash')}
    </div>
    <div class="mphint">A wash over the map, under the darkness. It is scenery,
      not lighting — it never changes what a player can see.</div>`);
}

/* ---- the window ---- */

export function renderMapPanel(body) {
  if (!body) return;
  const sc = activeScene();
  if (!sc) { body.innerHTML = '<div class="mphint">No scene open.</div>'; return; }

  const keep = body.scrollTop;
  body.innerHTML = `
    <div class="mpscene">${esc(sc.name)}</div>
    ${mapBlock(sc)}
    ${gridBlock(sc)}
    ${scaleBlock(sc)}
    ${lightBlock(sc)}
    ${washBlock(sc)}`;
  body.scrollTop = keep;

  if (body.dataset.wired) return;
  body.dataset.wired = '1';

  body.addEventListener('click', e => {
    const a = e.target.closest('[data-mp]')?.dataset.mp;
    if (!a) return;
    const scene = activeScene();
    if (!scene) return;
    const [kind, arg] = a.split(':');

    if (kind === 'pick') return pickMap(scene, 'local');
    if (kind === 'cloud') return pickMap(scene, 'cloud');
    if (kind === 'link') return linkMap(scene);
    if (kind === 'remove') return clearMap(scene);
    if (kind === 'lock') {
      const L = backdropLayer();
      if (L) { L.locked = !L.locked; requestDraw(); }
      return renderMapPanel(body);
    }
    if (kind === 'zoom') return editMap(scene, im => zoomBackdrop(im, +arg));
    if (kind === 'fit') return editMap(scene, im => fitToCells(im, +arg));
    if (kind === 'centre') return editMap(scene, im => im);
    if (kind === 'nudge') {
      const [dx, dy] = arg.split(',').map(Number);
      const step = state.grid.size / 10;
      return editMap(scene, im => nudgeBackdrop(im, dx * step, dy * step));
    }
    if (kind === 'gridshow') return setSceneGrid(scene, { show: !(scene.grid?.show !== false) });
    if (kind === 'gridink') return setSceneGrid(scene, { ink: arg || '' });
    if (kind === 'light') return setSceneLight(scene, !(scene.light?.enabled !== false));
    if (kind === 'tint') {
      const [color, amount] = arg.split('|');
      return setSceneTint(scene, color, +amount);
    }
  });

  /* The stepped rows carry their value in their own attribute rather than in
     `data-mp`, so they are read here instead. */
  body.addEventListener('click', e => {
    const scene = activeScene();
    if (!scene) return;
    const wash = e.target.closest('[data-mp-wash]');
    if (wash) return setSceneTint(scene, scene.tint?.color || DEFAULT_TINT().color, +wash.dataset.mpWash);
  });

  /* The colour and the strength are dragged, so they repaint the map on every
     move and only redraw the panel when the pointer is let go — otherwise the
     control you are holding is rebuilt under your hand. */
  body.addEventListener('input', e => {
    const scene = activeScene();
    if (!scene) return;
    if (e.target.matches('[data-mp-gridink]')) {
      return setSceneGrid(scene, { ink: e.target.value }, { quiet: true });
    }
    if (e.target.matches('[data-mp-gridweight]')) {
      const pct = Math.max(5, Math.min(100, +e.target.value || 100));
      const out = e.target.parentElement.querySelector('.mpnum');
      if (out) out.textContent = pct + '%';
      return setSceneGrid(scene, { weight: pct / 100 }, { quiet: true });
    }
  });

  body.addEventListener('change', e => {
    const scene = activeScene();
    if (!scene) return;
    if (e.target.matches('[data-mp-gridink]') || e.target.matches('[data-mp-gridweight]')) {
      return renderMapPanel(body);
    }
    if (e.target.matches('[data-mp-gridsize]')) {
      return setSceneGrid(scene, { size: Math.max(20, Math.min(200, +e.target.value || 50)) });
    }
    if (e.target.matches('[data-mp-per]')) {
      return setSceneScale(scene, +e.target.value, scene.scale?.unit || 'ft');
    }
    if (e.target.matches('[data-mp-unit]')) {
      return setSceneScale(scene, scene.scale?.per ?? 5, e.target.value);
    }
  });
}
