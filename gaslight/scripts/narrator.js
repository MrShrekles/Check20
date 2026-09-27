/* The monster book and the generators.

   These were a slide-out rail on the left edge: tabs down the side, one panel
   at a time, half the map covered while it was open. Now each is a window
   (see dock.js), so the book can sit beside the order, either can be folded to
   a line, and either can be dragged off the river to float over the map.

   What is left here is what was always this module's own: which sub tab each
   one is showing, and the head that names it. */

import { $, esc } from './dom.js';
import { get } from './data.js';
import { renderIfOpen, revealWin } from './dock.js';
import {
  renderMonstersPanel, monsterTabs, ensureMonsterData, initMonsters, resetMonsterBrowser,
  focusMonster,
} from './monsters.js';
import {
  renderGeneratorsPanel, generatorTabs, ensureGeneratorData, initGenerators, resetGenerators,
} from './generators.js';

const subTab = { monsters: 'book', gens: 'loot' };

const TABBED = {
  monsters: { tabs: () => monsterTabs(), render: t => renderMonstersPanel(t) },
  gens: { tabs: () => generatorTabs(), render: t => renderGeneratorsPanel(t) },
};

function subTabBar(sec) {
  const bar = document.createElement('div');
  bar.className = 'subtabs';
  bar.innerHTML = TABBED[sec].tabs().map(([k, label]) =>
    `<button type="button" data-sub="${k}" class="${k === subTab[sec] ? 'on' : ''}">${label}</button>`).join('');
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-sub]');
    if (!b || b.dataset.sub === subTab[sec]) return;
    subTab[sec] = b.dataset.sub;
    if (sec === 'monsters') resetMonsterBrowser();
    renderSection(sec);
  });
  return bar;
}

/** Fill one window's body. Called by dock.js when it opens, and on a change. */
export function renderSection(sec, body = null) {
  const host = body || $(sec === 'monsters' ? 'winMonstersBody' : 'winGensBody');
  if (!host) return;
  const keep = host.scrollTop;
  host.innerHTML = '';
  host.appendChild(subTabBar(sec));
  host.appendChild(TABBED[sec].render(subTab[sec]));
  host.scrollTop = keep;
}

export const renderMonsters = body => renderSection('monsters', body);
export const renderGens = body => renderSection('gens', body);

/* Both panels call one callback when something inside them changes, and it
   has to repaint whichever of the two is actually open. */
const repaint = () => renderIfOpen('monsters', 'gens');

/** Open the monster book at one monster: what a token on the map asks for. */
export function showMonster(name) {
  const go = () => {
    subTab.monsters = focusMonster(name);
    renderSection('monsters');
  };
  revealWin('monsters');
  if (get('monsterbook')) go();
  else ensureMonsterData().then(go).catch(() => { });
}

export function initNarrator() {
  initMonsters(repaint);
  initGenerators(repaint);
}

/** Called by dock.js the first time each window opens. */
export const ensureMonsters = () => { resetMonsterBrowser(); return ensureMonsterData(); };
export const ensureGens = () => { resetGenerators(); return ensureGeneratorData(); };

/** The section heading each window's body used to carry in its own head. */
export const sectionName = sec => esc(sec === 'monsters' ? 'Monster book' : 'Generators');
