/* How this table was opened: offline, as a room's narrator, or as a player.

   table.html                          offline, full tools (the default)
   table.html?room=ABC123&mode=narrator  a room's narrator, full tools
   table.html?room=ABC123&mode=player    a player: the map in player view,
                                         their own character, no build tools

   Firebase is only loaded when there is a room, so the offline table never
   touches the network.

   Not yet built: the map itself does not sync. Until it does, a player sees
   whatever is on this browser's own player table, not the narrator's map. */

import { $, esc, toast } from './dom.js';
import { state } from './state.js';
import { requestDraw } from './view.js';
import { fromActiveSheet } from './character.js';
import { activeSheetState, normaliseCode, isValidCode } from './rooms.js';

/* Read at import time, so it has to survive being imported without a browser:
   the rules tests reach this module through chat.js, and a bare `location`
   would throw before a single assertion ran. Everything else here is inside a
   function and only ever called from the page. */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const rawRoom = normaliseCode(params.get('room'));

export const session = {
  room: isValidCode(rawRoom) ? rawRoom : null,
  mode: params.get('mode') === 'player' ? 'player' : 'narrator',
  roomName: '',
};

export const isPlayerMode = () => !!session.room && session.mode === 'player';

/* The tools a player keeps. Everything else edits the narrator's map. */
/* A player measures too. Asking the narrator "how far is that" is the most
   common question at a table and the least interesting one to answer out loud,
   and the ruler tells them nothing the map does not already show them. */
export const PLAYER_TOOLS = new Set(['select', 'pan', 'ruler']);
export const toolAllowed = t => !isPlayerMode() || PLAYER_TOOLS.has(t);

/** A player's character always carries this id, so it is found and replaced
    on each visit rather than duplicated. */
export const PLAYER_CHAR_ID = 'player';

/** The storage key autosave should use: a player's table is kept apart from
    the narrator's, which matters most when both are tested in one browser. */
export const autosaveKey = () => isPlayerMode() ? 'gaslight.player' : 'gaslight.autosave';

/** Called before the first render. Sets up anything that changes the layout. */
export function applySessionChrome() {
  document.body.classList.toggle('mode-player', isPlayerMode());
  document.body.classList.toggle('in-room', !!session.room);
  if (!session.room) return;

  const badge = $('roomBadge');
  badge.hidden = false;
  badge.innerHTML = `
    <span class="rbmode">${isPlayerMode() ? 'Player' : 'Narrator'}</span>
    <button class="rbcode" type="button" title="Copy the room code">${esc(session.room)}</button>
    <span class="rbname" id="rbName"></span>
    <a class="rbleave" href="index.html" title="Back to the lobby">Leave</a>`;
  badge.querySelector('.rbcode').onclick = async e => {
    try { await navigator.clipboard.writeText(session.room); toast('Room code copied'); }
    catch { toast(`Room ${session.room}`); }
    e.target.blur();
  };
}

/** Called after the table state is restored. Player mode takes over here. */
export function applySessionState({ setActiveCharacter, renderRoster, renderSpeakers }) {
  if (!isPlayerMode()) return;

  // Players see what players see: narrator layers hidden, full darkness.
  state.playerView = true;
  $('pvToggle')?.classList.add('on');

  // Their own character, read from active-sheet on this device.
  const imported = fromActiveSheet(activeSheetState(), { id: PLAYER_CHAR_ID });
  if (imported) {
    const i = state.chars.findIndex(c => c.id === PLAYER_CHAR_ID);
    if (i >= 0) {
      // Keep the colour they chose here, but take the sheet as the source of truth.
      imported.color = state.chars[i].color || imported.color;
      state.chars[i] = imported;
    } else {
      state.chars.unshift(imported);
    }
    for (const it of state.items) if (it.charId === PLAYER_CHAR_ID) it.name = imported.name;
    renderRoster();
    renderSpeakers();
    setActiveCharacter(imported);
    $('speaker').value = imported.name;
  } else {
    toast('No character on this device yet. Make one in the sheet app, then come back.');
  }
  requestDraw();
}

/** Fetch the room's name for the badge. Best effort; the badge works without it. */
export async function connectRoom() {
  if (!session.room) return;
  try {
    // Listener first: firebase.js can fire its ready event the moment it loads.
    const ready = new Promise(resolve => {
      const t = setTimeout(() => resolve(false), 8000);
      document.addEventListener('arc:firebase-ready', () => { clearTimeout(t); resolve(true); }, { once: true });
    });
    await import('../../scripts/firebase.js');
    if (!(await ready) || !window.__arc?.uid) {
      document.getElementById('rbName').textContent = 'offline';
      document.getElementById('rbName').classList.add('off');
      return;
    }
    const { getRoom } = await import('./rooms.js');
    const room = await getRoom(session.room);
    if (!room) {
      document.getElementById('rbName').textContent = 'room not found';
      document.getElementById('rbName').classList.add('off');
      return;
    }
    session.roomName = room.name || '';
    document.getElementById('rbName').textContent = room.name || '';
    if (room.name) document.title = `${room.name} · Gaslight Table`;
  } catch (err) {
    console.warn('[gaslight] could not reach the room:', err);
    document.getElementById('rbName').textContent = 'offline';
    document.getElementById('rbName').classList.add('off');
  }
}
