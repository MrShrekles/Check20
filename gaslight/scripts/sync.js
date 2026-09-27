/* Two browsers, one table.

   Until now `onSnapshot` appeared nowhere in this app. The room code was a
   badge and a lobby handshake: a player joined, a line went in the chat, and
   then nothing ever streamed back. Gaslight looked multiplayer and was not.

   This is the narrator broadcasting the board and players following it.

   ── The shape ────────────────────────────────────────────────────────────

     rooms/{CODE}                      sceneId       which page is open
     rooms/{CODE}/board/{sceneId}      the board     items, layers, grid, light
     rooms/{CODE}/moves/{uid}          a player's own token, written by them

   One document per scene rather than one per item. A board is 7KB for sixty
   tokens and 34KB for twenty pencil strokes — nowhere near Firestore's 1MB
   cap for real use — and one document means one listener, one write, and no
   chance of a player seeing half an update. Heavy drawing is the thing that
   would eventually push past it; `boardTooBig()` says so out loud rather than
   letting the write fail somewhere nobody is looking.

   ── The direction ────────────────────────────────────────────────────────

   The narrator owns the board. Players read it and write exactly one thing:
   where their own token is. That asymmetry is the entire conflict-resolution
   story, and it is deliberate — two writers on one document needs merge rules,
   and a table does not need them: the narrator is the authority, which is what
   a narrator is.

   ── Why the guards are there ─────────────────────────────────────────────

   Applying a snapshot changes `state`, and changing `state` is what triggers a
   publish. Without `applying`, a narrator's write would echo off a player and
   come back. Every apply sets it, and every publish checks it. */

import { state, ui, id, setUid, peekUid, migrateScene, layerForKind } from './state.js';
import { $, toast } from './dom.js';
import { requestDraw } from './view.js';
import { normaliseItem } from './geometry.js';
import { computeLight, invalidateRooms } from './lighting.js';
import { session, isPlayerMode, PLAYER_CHAR_ID } from './session.js';

const arc = () => window.__arc;

/* Firestore's hard limit is 1MB per document. This is the point at which the
   narrator is told, with room left for the fields around the board. */
const BOARD_WARN_KB = 700;

/* A board is published after things stop moving rather than while they move.
   A drag fires a state change per frame; this turns sixty writes into one. */
const PUBLISH_MS = 450;

let applying = false;          // a snapshot is being written into state
let publishTimer = null;
let lastSent = '';             // what was last published, to skip no-op writes
let unsubs = [];
let warned = false;

export const syncing = () => unsubs.length > 0;

/* ---- what travels ----

   The board is the scene's map, not the table. Chat, the journal, the roster
   and the monster book are the narrator's own or are already synced elsewhere;
   sending them here would make every token drag rewrite the campaign. */
function boardOf() {
  return {
    items: state.items,
    layers: state.layers,
    grid: state.grid,
    light: state.light,
    tint: state.tint,
    image: state.image,
    scale: state.scale,
    name: activeSceneName(),
    at: Date.now(),
  };
}

const activeSceneName = () =>
  state.scenes.find(s => s.id === state.sceneId)?.name || 'Scene';

/* ---- narrator: publishing ---- */

export function publishBoard({ now = false } = {}) {
  if (applying || isPlayerMode() || !ready()) return;
  clearTimeout(publishTimer);
  if (now) return void write();
  publishTimer = setTimeout(write, PUBLISH_MS);
}

async function write() {
  if (applying || isPlayerMode() || !ready()) return;
  const a = arc();
  const board = boardOf();
  const json = JSON.stringify(board);

  /* A board that has not changed is not worth a write, a read for every player
     or a repaint. The `at` stamp is stripped for the comparison, or nothing
     would ever look unchanged. */
  const fingerprint = JSON.stringify({ ...board, at: 0 });
  if (fingerprint === lastSent) return;
  lastSent = fingerprint;

  if (json.length > BOARD_WARN_KB * 1024 && !warned) {
    warned = true;
    toast(`This scene is ${Math.round(json.length / 1024)}KB and nears the limit for sharing. Erase some drawing, or split it across scenes.`);
  }

  try {
    await a.setDoc(a.doc(a.db, 'rooms', session.room, 'board', state.sceneId), board);
    await a.updateDoc(a.doc(a.db, 'rooms', session.room), { sceneId: state.sceneId });
    mark('live');
  } catch (err) {
    console.warn('[gaslight] could not publish the board:', err);
    mark('offline');
  }
}

/* ---- player: following ---- */

/* ---- whose token is whose ----

   A token on the narrator's map carries `playerUid` once a player has claimed
   it. That one field is the whole link: the narrator matches a move to a
   token by it, and a player recognises their own token in an incoming board by
   it. Nothing else has to be agreed between the two sides.

   The handshake is: a player announces where their token is, the narrator
   materialises it on the board, and it comes back to everyone on the next
   publish. From then on it is the narrator's token — one object, one truth —
   and the player only ever moves it. */

const myUid = () => arc()?.uid || '';

/**
 * Write the narrator's board over this browser's open scene.
 *
 * A player's own token is the one thing they are the authority on, so their
 * position survives the write: taking the narrator's copy would drag the token
 * back under their hand every time a snapshot landed mid-move.
 */
function applyBoard(board) {
  if (!board) return;
  applying = true;
  try {
    const uid = myUid();
    const before = state.items.find(i => i.charId === PLAYER_CHAR_ID) || null;
    const sc = migrateScene({ ...board, id: state.sceneId, name: board.name },
      board.name || 'Scene', normaliseItem);

    state.items = sc.items;
    state.layers = sc.layers;
    state.activeLayerId = sc.activeLayerId;
    state.grid = sc.grid;
    state.light = sc.light;
    state.tint = sc.tint;
    state.image = sc.image;
    state.scale = sc.scale;

    if (isPlayerMode() && uid) {
      const mine = state.items.find(i => i.playerUid === uid);
      if (mine) {
        /* The narrator's copy of my token is my token. Binding it to the local
           character is what makes the sheet, the hover plate and "you may only
           move your own" work — all of which key off charId. */
        mine.charId = PLAYER_CHAR_ID;
        if (before) { mine.x = before.x; mine.y = before.y; }
      } else if (before) {
        /* The narrator has never heard of me. Keep the token I had and say
           where it is; the next board will carry it for everyone. */
        state.items.push(before);
        queueMicrotask(publishMyToken);
      }
    }

    // Anything pointing at an item is pointing at an item that is gone.
    ui.sel.item = null; ui.sel.group = []; ui.hover = null; ui.drag = null;
    ui.backdrop = false;

    const used = state.items.concat(state.layers).map(x => +String(x.id).slice(1) || 0);
    setUid(Math.max(peekUid(), ...used, 0) + 1);

    invalidateRooms();
    computeLight();
    requestDraw();
    onBoard?.();
  } finally {
    applying = false;
  }
}

/** A player tells the room where their token is, and nothing else. */
export function publishMyToken() {
  if (!isPlayerMode() || !ready()) return;
  const it = state.items.find(i => i.charId === PLAYER_CHAR_ID);
  if (!it) return;
  const a = arc();
  a.setDoc(a.doc(a.db, 'rooms', session.room, 'moves', a.uid), {
    sceneId: state.sceneId,
    x: it.x, y: it.y,
    name: it.name || '',
    color: it.color || '',
    size: it.size || 1,
    at: Date.now(),
  }).catch(err => console.warn('[gaslight] could not send your token:', err));
}

/**
 * The narrator applying a player's move.
 *
 * On a scene the narrator is not looking at, it is ignored rather than
 * queued — the player's own document holds the latest position, so switching
 * to that scene picks it up from the next snapshot anyway.
 */
function applyMove(uid, move) {
  if (!move || move.sceneId !== state.sceneId) return;
  let it = state.items.find(i => i.playerUid === uid);

  applying = true;
  try {
    if (!it) {
      /* First time this player has been seen here: give them a token rather
         than dropping the move. A player who joins should appear. */
      const layer = layerForKind('token');
      it = {
        id: id(), kind: 'token', layerId: layer?.id || state.activeLayerId,
        x: move.x, y: move.y,
        name: move.name || 'Player',
        color: move.color || '#4c6e6e',
        size: move.size || 1,
        playerUid: uid,
      };
      state.items.push(it);
      toast(`${it.name} joined the map`);
    } else {
      if (it.x === move.x && it.y === move.y) return;
      it.x = move.x; it.y = move.y;
    }
    computeLight();
    requestDraw();
    onBoard?.();
  } finally {
    applying = false;
  }
  // The rest of the table has to see it move too.
  publishBoard();
}

/* ---- the badge ---- */

function mark(stateName) {
  const el = $('rbName');
  if (!el) return;
  el.classList.toggle('off', stateName === 'offline');
  el.dataset.sync = stateName;
}

/* Set by main.js: the panels that read the board have to hear about a change
   they did not cause. */
let onBoard = null;
export const setBoardHook = fn => { onBoard = fn; };

const ready = () => !!(arc()?.db && arc()?.uid && session.room);

/* ---- starting and stopping ---- */

export function stopSync() {
  for (const u of unsubs) { try { u(); } catch { /* already gone */ } }
  unsubs = [];
  clearTimeout(publishTimer);
}

/**
 * Attach the listeners for this session.
 *
 * Called after the table is restored and Firebase has resolved, because both
 * decide what is listened to: the narrator publishes the scene they have open,
 * and a player follows whichever the narrator says.
 */
export function startSync() {
  if (!ready()) return false;
  stopSync();
  const a = arc();
  const roomRef = a.doc(a.db, 'rooms', session.room);

  if (isPlayerMode()) {
    /* A player follows the narrator's open scene, then the board on it. The
       room document says which; the board document is the map itself. */
    let boardUnsub = null;
    let following = null;

    unsubs.push(a.onSnapshot(roomRef, snap => {
      const id = snap.data()?.sceneId;
      if (!id || id === following) return;
      following = id;
      state.sceneId = id;
      boardUnsub?.();
      boardUnsub = a.onSnapshot(a.doc(a.db, 'rooms', session.room, 'board', id), s => {
        if (s.exists()) applyBoard(s.data());
      }, err => console.warn('[gaslight] board listener:', err));
      unsubs.push(() => boardUnsub?.());
    }, err => {
      console.warn('[gaslight] room listener:', err);
      mark('offline');
    }));

    mark('live');
    return true;
  }

  /* The narrator publishes what they have, then listens for players moving
     their own tokens. */
  unsubs.push(a.onSnapshot(a.collection(a.db, 'rooms', session.room, 'moves'), snap => {
    for (const change of snap.docChanges()) {
      if (change.type === 'removed') continue;
      applyMove(change.doc.id, change.doc.data());
    }
  }, err => console.warn('[gaslight] moves listener:', err)));

  publishBoard({ now: true });
  mark('live');
  return true;
}
