/* Boot. Wires the modules together and paints the first frame. */

import { toast } from './dom.js';
import { state, ui, computed } from './state.js';
import { initView, setRenderer, requestDraw } from './view.js';
import { draw } from './render.js';
import { computeLight } from './lighting.js';
import { initToolbar, setTool, updateZoomLbl, setLayerJumpHook } from './toolbar.js';
import { initTools } from './tools.js';
import { initLayers, renderLayers } from './layers.js';
import { initProps } from './props.js';
import { loadGlossary, initGlossary } from './glossary.js';
import { initChat, addMsg, now, renderSpeakers } from './chat.js';
import { initJournal, renderJournal } from './journal.js';
import { initRoster, renderRoster } from './roster.js';
import { initSheet, renderRail } from './sheet.js';
import { initTables } from './tables.js';
import { initTheme } from './theme.js';
import { initSettings } from './settings.js';
import { initNotify } from './notify.js';
import {
  initNarrator, renderMonsters, renderGens, ensureMonsters, ensureGens,
} from './narrator.js';
import { initDock, applyDockMode } from './dock.js';
import {
  initScenes, initMapDrop, renderSceneBar, setSceneSwitchHook, syncSceneChrome,
  backdropChanged, removeBackdrop,
} from './scenes.js';
import { renderMapPanel } from './mappanel.js';
import { setBackdropHooks } from './tools.js';
import { showMonsterCard, hideMonsterCard } from './monstercard.js';
import { showTokenCard, characterFor, hideTokenCard } from './tokencard.js';
import { setTokenPlacedHook } from './monsters.js';
import { showPopFor, setCardBackHook, hidePop } from './props.js';
import { initInitiative, renderInit } from './initiative.js';
import { hideGroupCard } from './groupcard.js';
import { initTabs } from './tabs.js';
import { initSidebarResize } from './sidebar.js';
import { load as loadData } from './data.js';
import { initPersistence } from './persistence.js';
import { initAutosave, restore, clearLocal } from './autosave.js';
import { applySessionChrome, applySessionState, connectRoom, session } from './session.js';
import { setActiveCharacter } from './sheet.js';

const PLAYER_WELCOME = 'Welcome to the table. Your character is in the rail on the right; click a check to roll it. '
  + 'Double-click the map to ping. Shift-drag to measure.';

const WELCOME = 'Welcome to the table. Build rooms with the Rooms tool, drop tokens, and watch the light follow them. '
  + 'Double-click the map to ping. Shift-drag to measure.';

/* The four narrator windows. dock.js owns how a window behaves; this is the
   only place that knows which panel goes in which, so neither the dock nor the
   panels have to import each other. */
const ICONS = {
  init: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h11M4 18h7"/><circle cx="19.5" cy="12" r="1.6"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
  monsters: '<svg viewBox="0 0 24 24"><path d="M5 10a7 7 0 0114 0v4.5c0 1-.8 1.8-1.8 1.8H16l-1 3H9l-1-3H6.8A1.8 1.8 0 015 14.5z"/><circle cx="9.3" cy="11" r="1.3"/><circle cx="14.7" cy="11" r="1.3"/><path d="M11 15h2"/></svg>',
  gens: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="10" height="10" rx="2"/><rect x="10.5" y="10.5" width="10" height="10" rx="2"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
};

function wireWindows() {
  initDock([
    {
      key: 'init', title: 'Initiative', icon: ICONS.init,
      elId: 'initbar', render: () => renderInit(),
    },
    {
      key: 'layers', title: 'Layers', icon: ICONS.layers,
      elId: 'layersPanel', narratorOnly: true, render: () => renderLayers(),
    },
    {
      key: 'map', title: 'Map', icon: ICONS.map,
      elId: 'winMap', bodyId: 'winMapBody', narratorOnly: true,
      render: body => renderMapPanel(body),
    },
    {
      key: 'monsters', title: 'Monster book', icon: ICONS.monsters,
      elId: 'winMonsters', bodyId: 'winMonstersBody', narratorOnly: true,
      render: body => renderMonsters(body), ensure: ensureMonsters,
    },
    {
      key: 'gens', title: 'Generators', icon: ICONS.gens,
      elId: 'winGens', bodyId: 'winGensBody', narratorOnly: true,
      render: body => renderGens(body), ensure: ensureGens,
    },
  ]);
}

async function boot() {
  applySessionChrome();
  initTheme(() => requestDraw());   // the map has its own palette per theme
  setRenderer(draw);
  initView();

  initToolbar();
  initTools();
  initLayers();
  initProps();
  initChat();
  initTables();
  initSettings();
  initJournal();
  initRoster();
  initSheet();
  initInitiative();
  initTabs();
  initNotify();
  initNarrator();
  initScenes();
  initMapDrop(document.getElementById('stage'));
  /* Moving the map is tools.js's job; saving it and refreshing the scene's
     preview is the scene's. Neither imports the other. */
  setBackdropHooks({ moved: backdropChanged, removed: removeBackdrop });
  wireWindows();
  // A monster token opens its panel on landing, so it can be named at once.
  setTokenPlacedHook(showPopFor);
  // A tool that changes the active layer repaints the layers panel.
  setLayerJumpHook(() => renderLayers());
  /* Every panel that reads the map has to be told the map changed underneath
     it. scenes.js cannot reach these itself without importing half the app. */
  setSceneSwitchHook(() => {
    renderLayers();
    renderInit();
    syncSceneChrome();
    updateZoomLbl();
    hidePop(); hideTokenCard(); hideMonsterCard(); hideGroupCard();
    ui.backdrop = false;
  });
  // Style opens from a card, so it needs a way back to the one it came from.
  setCardBackHook(it => {
    if (characterFor(it)) showTokenCard(it);
    else if (it.monster) showMonsterCard(it);
  });
  initSidebarResize();
  initPersistence();

  // The glossary feeds the Rules tab, the check tooltips on character cards
  // and the hover terms in chat, so it loads before the first render pass.
  try {
    await loadGlossary();
    initGlossary();
  } catch (err) {
    console.error(err);
    toast('The glossary could not be loaded');
  }

  // Shared Check20 data. The sheet needs it, but the table is usable without
  // it, so a failure here is a warning rather than a broken boot.
  try {
    await loadData('conditions');
  } catch (err) {
    console.warn('Check20 data failed to load:', err);
    toast('Some Check20 data could not be loaded');
  }

  // A table kept in localStorage between reloads. It replays through the same
  // migrations as a loaded file, so it must come after the data is ready.
  // Applying one re-renders every panel itself.
  const restored = restore();

  renderSceneBar();
  if (!restored) {
    renderLayers();
    renderJournal();
    renderRoster();
    renderSpeakers();
    renderInit();
  }
  renderRail();
  applySessionState({ setActiveCharacter, renderRoster, renderSpeakers });
  // Player mode is decided after the table is restored, and it hides windows.
  applyDockMode();

  // A handle for poking at the table from the devtools console.
  window.gaslight = { state, ui, computed, draw, computeLight, requestDraw, clearLocal, session };

  // The restored table brings its own chat log; do not greet twice.
  if (restored) toast('Restored your last table');
  else addMsg({ type: 'sys', text: session.room && session.mode === 'player' ? PLAYER_WELCOME : WELCOME, time: now() });
  setTool('select');
  updateZoomLbl();
  computeLight();
  requestDraw();
  initAutosave();
  connectRoom();
}

boot();
