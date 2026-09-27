/* Keeps the working table in localStorage so a reload picks up where you left
   off — no rebuilding a test character every time.

   This is a convenience, not the save system: Save/Load still own real files.
   It writes the same shape `snapshot()` produces, so a restore runs through
   the same migrations a loaded file does.

   Escape hatches, because a bad autosave should never trap you:
     ?fresh  in the URL boots clean without touching what is stored
     window.gaslight.clearLocal()  from the console */

import { snapshot, applyTable } from './persistence.js';
import { autosaveKey } from './session.js';
import { publishBoard } from './sync.js';

const KEY = autosaveKey();
const PERIOD_MS = 2000;      // how often a busy table is written
const IDLE_MAX_MS = 16000;   // how rarely a table nobody is touching is checked

let last = null;
let timer = null;
let warned = false;
let period = PERIOD_MS;

/* Serialising the whole table is the expensive part, and on a quiet table it
   throws the result away every time. So each unchanged check doubles the wait,
   up to a quarter of a minute, and any real change drops it straight back. */
function reschedule(ms) {
  if (ms === period && timer) return;
  period = ms;
  clearInterval(timer);
  timer = setInterval(write, period);
}

function write() {
  let data;
  try {
    data = JSON.stringify(snapshot());
  } catch (err) {
    console.warn('[gaslight] could not serialise the table:', err);
    return;
  }
  if (data === last) {
    reschedule(Math.min(IDLE_MAX_MS, period * 2));
    return;
  }
  reschedule(PERIOD_MS);

  /* The table changed, which is exactly when the room wants to hear about it.
     This is the one place in the app that already knows "something is
     different", so it is the one place sync has to be wired into — rather
     than every handler remembering to say so. publishBoard debounces again on
     its own and skips a board that has not actually moved. */
  publishBoard();
  try {
    localStorage.setItem(KEY, data);
    last = data;
  } catch (err) {
    // Quota, private mode, blocked site data. Say so once, then stay quiet.
    if (!warned) {
      warned = true;
      console.warn('[gaslight] autosave is unavailable:', err?.name || err);
    }
  }
}

export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to do */ }
  last = null;
}

/** Restore a stored table. Returns true if one was applied. */
export function restore() {
  if (new URLSearchParams(location.search).has('fresh')) return false;
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { return false; }
  if (!raw) return false;
  try {
    applyTable(JSON.parse(raw));
    last = raw;
    return true;
  } catch (err) {
    // A stored table we cannot read is worse than none: drop it.
    console.warn('[gaslight] stored table could not be restored, discarding:', err);
    clearLocal();
    return false;
  }
}

export function initAutosave() {
  clearInterval(timer);
  period = PERIOD_MS;
  timer = setInterval(write, period);
  // Catch the edits made in the last couple of seconds before the tab goes.
  addEventListener('beforeunload', write);
  addEventListener('visibilitychange', () => { if (document.hidden) write(); });
}
