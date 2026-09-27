/* Save and load the table as JSON, including migration of v1 files. */

import {
  state, ui, computed, peekUid, setUid, SETTING_DEFAULTS,
  SCENE_FIELDS, migrateScene,
} from './state.js';
import { $, toast } from './dom.js';
import { requestDraw } from './view.js';
import { normaliseItem } from './geometry.js';
import { computeLight, invalidateRooms } from './lighting.js';
import { paintLog, renderSpeakers } from './chat.js';
import { renderLayers } from './layers.js';
import { renderJournal } from './journal.js';
import { renderRoster } from './roster.js';
import { migrateCharacter } from './character.js';
import { renderInit } from './initiative.js';
import { hidePop } from './props.js';
import { hideTokenCard } from './tokencard.js';
import { hideMonsterCard } from './monstercard.js';
import { hideGroupCard } from './groupcard.js';
import { clearActiveCharacter } from './sheet.js';
import { updateZoomLbl } from './toolbar.js';
import { ensureScenes, syncActiveScene, renderSceneBar, syncSceneChrome } from './scenes.js';

function fileName() {
  return (state.tableName || 'table')
    .replace(/[^\w\- ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.json';
}

/** The saved shape of a table. Tool selections are session state, not part
    of it, so they are stripped here and nowhere else.

    The open scene's map is live at the top of `state`, so it is written back
    into its scene entry first — otherwise a save would carry a stale copy of
    the page you are looking at. */
export function snapshot() {
  syncActiveScene();
  return { ...state, tool: undefined, drawMode: undefined, roomMode: undefined };
}

function save() {
  const data = JSON.stringify(snapshot(), null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  a.download = fileName();
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Table saved');
}

function migrateLayers(layers) {
  for (const l of layers) {
    if (l.type === undefined) {
      l.type = l.special === 'light' ? 'custom'
        : l.name.toLowerCase().includes('token') ? 'token' : 'custom';
    }
    if (l.narrator === undefined) l.narrator = !!l.gmOnly;
  }
}

/* Brings v1 D&D-style characters and the older Check20 shell up to the
   current model. Returns a new array; the old objects are left alone. */
function migrateChars(chars) {
  return chars.map(migrateCharacter);
}

export function applyTable(d) {
  /* Two shapes. A table saved since scenes carries `scenes[]`; anything older
     is one map at the top level, and becomes a one-page table. Neither is a
     special case downstream — by the time this returns there is always a
     scene list with an open scene in it. */
  const readScene = (raw, fallback) => migrateScene(raw, fallback, normaliseItem, migrateLayers);
  const scenes = Array.isArray(d.scenes) && d.scenes.length
    ? d.scenes.map((s, i) => readScene(s, `Scene ${i + 1}`))
    : [readScene(d, d.tableName || 'Scene 1')];
  const open = scenes.find(s => s.id === d.sceneId) || scenes[0];

  Object.assign(state, {
    scenes,
    sceneId: open.id,
    chat: d.chat || [], journal: d.journal || [], chars: d.chars || [],
    init: { round: 1, ...(d.init || { list: [], turn: 0 }) },
    narrator: { monsterBook: [], tweaks: {}, ...(d.narrator || {}) },
    settings: { ...SETTING_DEFAULTS, ...(d.settings || {}) },
    tableName: d.tableName || 'Loaded table',
    playerView: false,
  });
  // The open scene's map becomes the live map.
  for (const k of SCENE_FIELDS) state[k] = open[k];
  state.chars = migrateChars(state.chars);

  /* Keep generating ids above anything the file already used — every scene's,
     not just the open one's, or a new item on page one could be handed an id
     that page three is already using. */
  const used = [];
  for (const sc of scenes) for (const x of sc.layers.concat(sc.items)) used.push(+String(x.id).slice(1) || 0);
  for (const sc of scenes) used.push(+String(sc.id).slice(1) || 0);
  setUid(Math.max(peekUid(), ...used) + 1);

  $('tableName').textContent = state.tableName;
  $('pvToggle').classList.remove('on');
  syncSceneChrome();

  paintLog();

  ui.sel.item = null; ui.sel.group = []; ui.hover = null;
  ui.temp = null; ui.drag = null; ui.measure = null; ui.pins = [];
  computed.litCells = new Set();
  hidePop(); hideTokenCard(); hideMonsterCard(); hideGroupCard();
  clearActiveCharacter(); invalidateRooms();
  ensureScenes();
  renderLayers(); renderJournal(); renderRoster(); renderSpeakers(); renderInit();
  renderSceneBar(); updateZoomLbl();
  computeLight(); requestDraw();
}

/* Save and Load used to sit in the top bar. They are a file operation on a
   table you almost never do mid-session — the 2-second autosave is what
   actually keeps your work — so they moved into the settings menu, which is
   where the other things you do once live. */
export const saveTable = () => save();
export const loadTable = () => $('loadFile').click();

export function initPersistence() {
  $('tableName').addEventListener('input', function () { state.tableName = this.textContent.trim(); });
  $('loadFile').addEventListener('change', function () {
    const f = this.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { applyTable(JSON.parse(r.result)); toast('Table loaded'); }
      catch { toast('That file could not be read'); }
    };
    r.readAsText(f);
    this.value = '';
  });
}
