/* Rooms: the live sessions narrators run and players join.

   A thin layer over the website's own Firebase module (scripts/firebase.js,
   exposed as window.__arc). Rooms here are the same documents narrator.html
   and active-sheet.html use, so a room made in one app opens in the others.

   What this module writes, and why it is allowed to (see "Firebase rooms" in
   the README for the full ownership table):
     rooms/{code}             created here (the one setDoc on a room), and
                              name / welcomeMsg / lastActivityAt updated
     rooms/{code}/players/{uid}   the joining player's own summary
     rooms/{code}/chat/{id}       the arrival announcement

   The localStorage keys match the website's, so joining here also points
   active-sheet and narrator.html at the same room. */

export const LS_PLAYER_ROOM = 'arc-room';
export const LS_PLAYER_ROOM_NAME = 'arc-room-name';
export const LS_NARRATOR_ROOM = 'arc-narrator-room';
export const LS_ACTIVE_SHEET = 'arc-active-sheet';

const arc = () => window.__arc;

/** Resolves once firebase.js has reported its first auth state, or false on
    timeout (offline, or the SDK failed to load).

    firebase.js can fire its ready event before this module is even evaluated,
    so pages set window.__arcReady from an inline listener in <head> that is
    guaranteed to be in place first. */
export function firebaseReady(timeoutMs = 8000) {
  if (window.__arcReady) return Promise.resolve(true);
  return new Promise(resolve => {
    const t = setTimeout(() => resolve(false), timeoutMs);
    document.addEventListener('arc:firebase-ready', () => { clearTimeout(t); resolve(true); }, { once: true });
  });
}

export const connected = () => !!(arc()?.db && arc()?.uid);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I
export function genRoomCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

export const normaliseCode = s => String(s || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isValidCode = s => /^[A-Z0-9]{6}$/.test(normaliseCode(s));

/** Rooms this account narrates, newest activity first. Closed rooms left out. */
export async function fetchMyRooms() {
  const a = arc();
  if (!connected()) return [];
  const snap = await a.getDocs(a.query(a.collection(a.db, 'rooms'), a.where('narratorUid', '==', a.uid)));
  const when = r => r.lastActivityAt?.toMillis?.() || r.createdAt?.toMillis?.() || 0;
  return snap.docs
    .map(d => ({ code: d.id, ...d.data() }))
    .filter(r => r.status !== 'closed')
    .sort((x, y) => when(y) - when(x));
}

/** A room document, or null if there is no such room. */
export async function getRoom(code) {
  const a = arc();
  const snap = await a.getDoc(a.doc(a.db, 'rooms', normaliseCode(code)));
  return snap.exists() ? { code: normaliseCode(code), ...snap.data() } : null;
}

/** Create a room this account narrates. Returns its code. */
export async function createRoom({ name = '', welcomeMsg = '' } = {}) {
  const a = arc();
  if (!connected()) throw new Error('not connected');
  // Six characters from 32 is a billion codes; still, never overwrite a room.
  for (let tries = 0; tries < 5; tries++) {
    const code = genRoomCode();
    if (await getRoom(code)) continue;
    // Creation is the one place a room document is written with setDoc.
    await a.setDoc(a.doc(a.db, 'rooms', code), {
      narratorUid: a.uid,
      name: name.trim(),
      welcomeMsg: welcomeMsg.trim(),
      createdAt: a.serverTimestamp(),
      lastActivityAt: a.serverTimestamp(),
      status: 'active',
    });
    return code;
  }
  throw new Error('could not find a free room code');
}

/** Rename a room or change its welcome message. Field-level, never a setDoc. */
export async function updateRoom(code, { name, welcomeMsg }) {
  const a = arc();
  const patch = {};
  if (name !== undefined) patch.name = String(name).trim();
  if (welcomeMsg !== undefined) patch.welcomeMsg = String(welcomeMsg).trim();
  await a.updateDoc(a.doc(a.db, 'rooms', normaliseCode(code)), patch);
}

export async function touchRoom(code) {
  const a = arc();
  await a.updateDoc(a.doc(a.db, 'rooms', normaliseCode(code)), { lastActivityAt: a.serverTimestamp() });
}

/* ---- the player's character, shared with active-sheet through localStorage ---- */

/** active-sheet's saved state, or null. */
export function activeSheetState() {
  try { return JSON.parse(localStorage.getItem(LS_ACTIVE_SHEET) || 'null'); } catch { return null; }
}

export const activeSheetCharacterName = () => activeSheetState()?.char?.name || '';

/**
 * Join a room as a player: publish this account's summary to the room, post
 * the arrival, and point the website's apps at the room. Mirrors completeJoin()
 * in scripts/home.js so both entry points leave the room in the same state.
 */
export async function joinAsPlayer(room) {
  const a = arc();
  const st = activeSheetState();
  const c = st?.char || {};
  const r = st?.resources || {};
  const playerName = c.name || a.user?.displayName || 'A player';

  await a.setDoc(a.doc(a.db, 'rooms', room.code, 'players', a.uid), {
    name: playerName,
    armor: r.armor?.current ?? 0,
    woundsCur: r.hp?.current ?? 0,
    woundsMax: r.hp?.max ?? 0,
    mnCur: r.MN?.current ?? 0,
    mnMax: r.MN?.max ?? 0,
    gold: c.gold ?? c.wealth ?? 0,
    updatedAt: a.serverTimestamp(),
  }, { merge: true });

  touchRoom(room.code).catch(() => { });

  a.setDoc(a.doc(a.db, 'rooms', room.code, 'chat', crypto.randomUUID()), {
    type: 'system',
    text: room.name ? `${playerName} has entered ${room.name}.` : `${playerName} has joined the session.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    postedAt: a.serverTimestamp(),
  }).catch(() => { });

  try {
    localStorage.setItem(LS_PLAYER_ROOM, room.code);
    if (room.name) localStorage.setItem(LS_PLAYER_ROOM_NAME, room.name);
    else localStorage.removeItem(LS_PLAYER_ROOM_NAME);
  } catch { /* private mode */ }
  document.dispatchEvent(new CustomEvent('arc:room-changed'));
  return playerName;
}

export function rememberNarratorRoom(code) {
  try { localStorage.setItem(LS_NARRATOR_ROOM, normaliseCode(code)); } catch { /* private mode */ }
}

/* ---- where each choice lands ---- */

export const tableUrl = (code, mode) => `table.html?room=${encodeURIComponent(code)}&mode=${mode}`;

/** active-sheet if the player has a character, otherwise straight to creation. */
export const sheetUrl = () =>
  activeSheetCharacterName() ? '../companion/active-sheet.html' : '../companion/create-char.html';
