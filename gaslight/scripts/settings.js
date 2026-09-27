/* The settings menu, top right.

   Two kinds of setting sit in here, stored differently:

     per viewer   the theme, in localStorage — your screen, your choice
     per table    state.settings, saved with the table, so the narrator sets it
                  once for the room

   Dark is the standard, which is why the theme lives in here rather than on
   the toolbar. Players see the appearance half only; the rest is the
   narrator's call for the room. */

import { $ } from './dom.js';
import { state, SETTING_DEFAULTS } from './state.js';
import { renderInit } from './initiative.js';
import {
  applyTheme, currentTheme, applyTextSize, currentTextSize, TEXT_SIZES,
} from './theme.js';
import { isPlayerMode } from './session.js';
import { saveTable, loadTable } from './persistence.js';
import { requestDraw } from './view.js';

export const settings = () => (state.settings ||= { ...SETTING_DEFAULTS });

let open = false;

function appearanceGroup() {
  return `
    <div class="setgroup">
      <h4>Appearance</h4>
      <div class="setrow">
        <label>Theme</label>
        <div class="subtabs setseg">
          <button type="button" data-theme="dark" class="${currentTheme() === 'dark' ? 'on' : ''}">Dark</button>
          <button type="button" data-theme="light" class="${currentTheme() === 'light' ? 'on' : ''}">Light</button>
        </div>
      </div>
      <div class="setrow">
        <label>Text size</label>
        <div class="subtabs setseg">
          ${TEXT_SIZES.map(([label, v]) => `
            <button type="button" data-fs="${v}"
              class="${Math.abs(currentTextSize() - v) < .001 ? 'on' : ''}">${label}</button>`).join('')}
        </div>
      </div>
      <p class="sethint">Scales every word in the app — chat, the sheet, the
        monster book. Panels keep their width, so a larger size fits fewer
        words on a line. The map is not affected; use the zoom for that.</p>
      <p class="sethint">Both are yours alone, kept in this browser.</p>
    </div>`;
}

/* The table as a file.

   These were two buttons in the top bar, which made them look like something
   you reach for during play. You do not: the autosave writes every two seconds
   and the table comes back on its own. A file is for moving a table to another
   machine, or keeping a copy before you do something drastic. */
function fileGroup() {
  return `
    <div class="setgroup">
      <h4>This table</h4>
      <div class="setrow">
        <button class="tbbtn" data-file="save">Save to a file</button>
        <button class="tbbtn" data-file="load">Load a file</button>
      </div>
      <p class="sethint">Your table is kept in this browser as you play, so
        these are for moving it somewhere else or keeping a copy before
        something drastic. A local map does not travel with the file — the
        scene will open without it on another machine.</p>
    </div>`;
}

function rollingGroup() {
  const s = settings();
  return `
    <div class="setgroup">
      <h4>Rolling</h4>
      <label class="setcheck">
        <input type="checkbox" data-set="autoRollTables" ${s.autoRollTables ? 'checked' : ''}>
        <span>Roll damage tables automatically</span>
      </label>
      <label class="setcheck">
        <input type="checkbox" data-set="askBeforeRoll" ${s.askBeforeRoll ? 'checked' : ''}>
        <span>Ask before rolling</span>
      </label>
      <label class="setcheck">
        <input type="checkbox" data-set="groupEnemyTurns" ${s.groupEnemyTurns ? 'checked' : ''}>
        <span>The opposition takes one turn</span>
      </label>
      <p class="sethint">Every monster acts together at the highest of their
        rolls, the way the companion app runs it, instead of eight separate
        turns to click through. Off, each one takes its own.</p>
      <p class="sethint">A tray opens first: the modifier plus anything temporary,
        Advantage or Disadvantage whatever the sheet says, and the damage, which
        you can edit for a buff. Enter rolls. Off, a click rolls straight away.</p>
      <div class="setrow${s.autoRollTables ? '' : ' off'}">
        <label>From</label>
        <input type="number" data-set="autoRollAt" min="2" max="6" value="${s.autoRollAt}"
          ${s.autoRollTables ? '' : 'disabled'}>
        <span class="setunit">successes up</span>
      </div>
      <p class="sethint">A hit rolls one table per success beyond the first. Left off,
        the card offers a button instead. Set for this table, so it holds for the room.</p>
    </div>`;
}

function render() {
  const pop = $('settingsPop');
  pop.innerHTML = appearanceGroup() + (isPlayerMode() ? '' : rollingGroup() + fileGroup());

  pop.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
    applyTheme(b.dataset.theme);
    try { localStorage.setItem('gaslight.theme', b.dataset.theme); } catch { /* private mode */ }
    requestDraw();
    render();
  }));

  pop.querySelectorAll('[data-file]').forEach(b => b.addEventListener('click', () => {
    setOpen(false);
    if (b.dataset.file === 'save') saveTable(); else loadTable();
  }));

  pop.querySelectorAll('[data-fs]').forEach(b => b.addEventListener('click', () => {
    applyTextSize(b.dataset.fs);
    render();
  }));

  pop.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => {
    const key = el.dataset.set;
    settings()[key] = el.type === 'checkbox' ? el.checked : Math.max(2, Math.min(6, +el.value || 2));
    render();
    /* Grouping the opposition changes the length of the played order, so the
       order has to be rebuilt and the turn index clamped against the new one.
       Without this the panel says one thing and the order plays another until
       something else happens to repaint it. */
    if (key === 'groupEnemyTurns') { renderInit(); requestDraw(); }
  }));
}

function setOpen(next) {
  open = next;
  $('settingsPop').hidden = !open;
  $('settingsBtn').setAttribute('aria-expanded', String(open));
  if (open) render();
}

export function initSettings() {
  settings();
  $('settingsBtn').addEventListener('click', e => { e.stopPropagation(); setOpen(!open); });
  $('settingsPop').addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => { if (open) setOpen(false); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setOpen(false); });
}
