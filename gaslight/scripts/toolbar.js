/* Top bar, contextual sub bars and zoom. */

import { state, TOOL_LAYER, layerForKind } from './state.js';
import { $, toast } from './dom.js';
import { view, requestDraw } from './view.js';
import { s2w } from './geometry.js';
import { computeLight } from './lighting.js';
import { toolAllowed } from './session.js';

/* The tools that put something on the map. They live in a fold, because a
   narrator running a fight is not reaching for the room builder. */
const BUILD_TOOLS = new Set(['token', 'draw', 'rooms', 'lamp', 'erase']);

export function setTool(t) {
  if (!toolAllowed(t)) return;
  state.tool = t;
  document.querySelectorAll('#toolRail [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  view.cv.className = 'tool-' + t;
  $('sub-draw').classList.toggle('on', t === 'draw');
  $('sub-rooms').classList.toggle('on', t === 'rooms');

  /* A build tool chosen by its keyboard shortcut opens the fold that holds it,
     so the rail never shows Select while the map is in erase mode. */
  if (BUILD_TOOLS.has(t)) openBuildFold(true);
  $('buildBtn')?.classList.toggle('on', BUILD_TOOLS.has(t));

  /* A tool selects the layer it works on: the topmost visible, unlocked one
     of the right type. Picking Token and drawing a token onto the map layer
     was only ever an accident waiting to happen. Select and Pan touch no
     layer, so they leave the choice alone. */
  const want = TOOL_LAYER[t];
  if (!want) return;
  const kind = want === 'token' ? 'token' : 'stroke';
  const target = layerForKind(kind);
  if (target && target.id !== state.activeLayerId) {
    state.activeLayerId = target.id;
    onLayerJump?.(target);
  }
}

/* The layers panel repaints itself when a tool moves the selection. Set by
   layers.js, which owns that panel; toolbar.js must not import it, since the
   panel's own buttons call back into the toolbar. */
let onLayerJump = null;
export const setLayerJumpHook = fn => { onLayerJump = fn; };

export function updateZoomLbl() {
  $('zoomReset').textContent = Math.round(state.cam.z * 100) + '%';
}

function zoomCenter(f) {
  const { W, H } = view;
  const nz = Math.min(4, Math.max(.2, state.cam.z * f));
  const w = s2w(W / 2, H / 2);
  state.cam.x = W / 2 - w.x * nz; state.cam.y = H / 2 - w.y * nz; state.cam.z = nz;
  updateZoomLbl(); requestDraw();
}

/* The fold is remembered per browser: a narrator who spends the session
   building should not have to open it every reload. */
const FOLD_KEY = 'gaslight.buildfold';

function openBuildFold(on) {
  const fold = $('buildFold');
  if (!fold) return;
  fold.classList.toggle('open', on);
  $('buildBtn')?.setAttribute('aria-expanded', String(on));
  try { localStorage.setItem(FOLD_KEY, on ? 'open' : 'closed'); } catch { /* no store */ }
}

export function initToolbar() {
  /* One handler for the whole rail: the pointer pair and the build fold are
     two containers now, and a third would otherwise need a third binding. */
  $('toolRail').addEventListener('click', e => {
    const b = e.target.closest('[data-tool]');
    if (b) return setTool(b.dataset.tool);
    if (e.target.closest('#buildBtn')) {
      return openBuildFold(!$('buildFold').classList.contains('open'));
    }
  });

  let foldOpen = false;
  try { foldOpen = localStorage.getItem(FOLD_KEY) === 'open'; } catch { /* no store */ }
  openBuildFold(foldOpen);

  const modeGroup = (containerId, attr, key) => $(containerId).addEventListener('click', e => {
    const b = e.target.closest(`[data-${attr}]`); if (!b) return;
    state[key] = b.dataset[attr];
    $(containerId).querySelectorAll('.tool').forEach(x => x.classList.toggle('on', x === b));
  });
  modeGroup('drawModes', 'dm', 'drawMode');
  modeGroup('roomModes', 'rm', 'roomMode');

  $('snapToggle').addEventListener('click', function () {
    state.snap = !state.snap; this.classList.toggle('on', state.snap);
  });
  $('lightToggle').addEventListener('click', function () {
    state.light.enabled = !state.light.enabled;
    this.classList.toggle('on', state.light.enabled);
    computeLight(); requestDraw();
  });
  $('dimRange').addEventListener('input', function () {
    state.light.dim = +this.value / 100; requestDraw();
  });
  $('pvToggle').addEventListener('click', function () {
    state.playerView = !state.playerView; this.classList.toggle('on', state.playerView);
    toast(state.playerView ? 'Player view: Narrator layers hidden' : 'Narrator view');
    requestDraw();
  });

  $('zoomIn').onclick = () => zoomCenter(1.2);
  $('zoomOut').onclick = () => zoomCenter(1 / 1.2);
  $('zoomReset').onclick = () => { state.cam = { x: 0, y: 0, z: 1 }; updateZoomLbl(); requestDraw(); };
}
