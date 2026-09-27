/* The landing page: choose to narrate or to play, then pick a room.

   Accounts are the website's. Sign-in goes through ArcAuth (scripts/auth-gate.js)
   and Firestore through window.__arc (scripts/firebase.js). ArcAuth.require()
   is deliberately not used: it assumes it is running on companion/home.html
   and would redirect to a home.html that does not exist at the site root.

   The view lives in the URL hash (#narrator, #player) so Back works. */

import { initTheme } from './theme.js';
import {
  firebaseReady, connected, fetchMyRooms, getRoom, createRoom, updateRoom,
  joinAsPlayer, rememberNarratorRoom, normaliseCode, isValidCode,
  activeSheetCharacterName, tableUrl, sheetUrl,
} from './rooms.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let ready = false;           // firebase.js has reported, one way or the other
let pendingRoom = null;      // the room a player is about to enter
let editingCode = null;      // the narrator room open for editing

const auth = () => window.ArcAuth;

/* ---- views ---- */

const VIEWS = { pick: 'viewPick', narrator: 'viewNarrator', player: 'viewPlayer' };

function show(view) {
  if (!VIEWS[view]) view = 'pick';
  for (const [k, id] of Object.entries(VIEWS)) $(id).hidden = k !== view;
  const want = view === 'pick' ? '' : `#${view}`;
  if (location.hash !== want) history.replaceState(null, '', want || location.pathname);
  if (view === 'narrator') loadRooms();
  if (view === 'player') setTimeout(() => $('joinCode').focus(), 0);
}

function go(view) {
  if (view !== 'pick') history.pushState(null, '', `#${view}`);
  show(view);
}

/* ---- account ---- */

function renderAccount() {
  const signedIn = !!auth()?.isSignedIn();
  $('accountOut').hidden = signedIn;
  $('accountIn').hidden = !signedIn;
  if (signedIn) {
    $('accName').textContent = auth().displayName() || 'Signed in';
    $('accState').textContent = !ready ? 'Connecting…' : connected() ? '' : 'Offline';
    $('accState').className = 'accstate' + (ready && !connected() ? ' off' : '');
  }
  // Signed in but not connected still counts as locked for room actions.
  const usable = signedIn && connected();
  document.querySelectorAll('[data-needs-account]').forEach(el => el.classList.toggle('locked', !usable));
  document.querySelectorAll('[data-gate]').forEach(el => {
    el.hidden = usable;
    if (!usable && signedIn && ready) el.textContent = 'You are offline. Rooms need a connection; the table itself still opens without one.';
  });
}

async function signIn() {
  const btn = $('signInBtn');
  btn.disabled = true;
  try {
    await auth().signInWithGoogle();
  } catch (e) {
    console.error('[gaslight] sign in failed:', e);
    alert(e?.code === 'auth/unauthorized-domain'
      ? 'This address is not on the Firebase project\'s authorised domains. Open the app from localhost, or add this host in the Firebase console under Authentication → Settings.'
      : 'Sign in did not complete.');
  } finally {
    btn.disabled = false;
    renderAccount();
    if (!$('viewNarrator').hidden) loadRooms();
  }
}

/* ---- narrator ---- */

const fmtWhen = r => {
  const ms = r.lastActivityAt?.toMillis?.() || r.createdAt?.toMillis?.();
  return ms ? new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

async function loadRooms() {
  const list = $('roomList');
  if (!connected()) { list.innerHTML = ''; return; }
  list.innerHTML = '<div class="empty">Loading your rooms…</div>';
  let rooms;
  try { rooms = await fetchMyRooms(); } catch (e) {
    console.error('[gaslight] rooms failed:', e);
    list.innerHTML = '<div class="empty err">Your rooms could not be loaded.</div>';
    return;
  }
  if (!rooms.length) {
    list.innerHTML = '<div class="empty">No rooms yet. Create one above.</div>';
    return;
  }
  list.innerHTML = '';
  for (const r of rooms) list.appendChild(roomRow(r));
}

function roomRow(r) {
  const row = document.createElement('div');
  row.className = 'roomrow' + (editingCode === r.code ? ' editing' : '');

  if (editingCode === r.code) {
    row.innerHTML = `
      <div class="formgrid">
        <label>Name <input data-f="name" maxlength="60" value="${esc(r.name || '')}"></label>
        <label>Welcome message <textarea data-f="welcome" maxlength="400" rows="2">${esc(r.welcomeMsg || '')}</textarea></label>
        <div class="formacts">
          <button class="lbtn primary small" data-act="save" type="button">Save</button>
          <button class="lbtn ghost small" data-act="cancel" type="button">Cancel</button>
          <span class="status"></span>
        </div>
      </div>`;
    row.querySelector('[data-act=cancel]').onclick = () => { editingCode = null; loadRooms(); };
    row.querySelector('[data-act=save]').onclick = async () => {
      const status = row.querySelector('.status');
      status.textContent = 'Saving…'; status.className = 'status';
      try {
        await updateRoom(r.code, {
          name: row.querySelector('[data-f=name]').value,
          welcomeMsg: row.querySelector('[data-f=welcome]').value,
        });
        editingCode = null;
        loadRooms();
      } catch (e) {
        console.error('[gaslight] room save failed:', e);
        status.textContent = 'Could not save.'; status.className = 'status err';
      }
    };
    return row;
  }

  row.innerHTML = `
    <div class="roommain">
      <b>${esc(r.name || 'Untitled room')}</b>
      <span class="roommeta">
        <button class="codechip" data-act="copy" type="button" title="Copy the code for your players">${esc(r.code)}</button>
        ${fmtWhen(r) ? `<span>${esc(fmtWhen(r))}</span>` : ''}
      </span>
      ${r.welcomeMsg ? `<p>${esc(r.welcomeMsg)}</p>` : ''}
    </div>
    <div class="roomacts">
      <button class="lbtn ghost small" data-act="edit" type="button">Edit</button>
      <button class="lbtn primary small" data-act="enter" type="button">Enter</button>
    </div>`;
  row.querySelector('[data-act=edit]').onclick = () => { editingCode = r.code; loadRooms(); };
  row.querySelector('[data-act=enter]').onclick = () => enterAsNarrator(r.code);
  row.querySelector('[data-act=copy]').onclick = async e => {
    try { await navigator.clipboard.writeText(r.code); e.target.textContent = 'Copied'; }
    catch { e.target.textContent = r.code; }
    setTimeout(() => { e.target.textContent = r.code; }, 1200);
  };
  return row;
}

function enterAsNarrator(code) {
  // narrator.html resumes the same room from this key.
  rememberNarratorRoom(code);
  location.href = tableUrl(code, 'narrator');
}

async function onCreateRoom(e) {
  e.preventDefault();
  const status = $('newRoomStatus');
  const btn = $('newRoomBtn');
  btn.disabled = true;
  status.textContent = 'Creating…'; status.className = 'status';
  try {
    const code = await createRoom({ name: $('newRoomName').value, welcomeMsg: $('newRoomWelcome').value });
    $('newRoomName').value = ''; $('newRoomWelcome').value = '';
    status.textContent = `Room ${code} is ready.`; status.className = 'status ok';
    await loadRooms();
  } catch (err) {
    console.error('[gaslight] create room failed:', err);
    status.textContent = 'The room could not be created.'; status.className = 'status err';
  } finally {
    btn.disabled = false;
  }
}

/* ---- player ---- */

function joinStatus(text, kind = '') {
  $('joinStatus').textContent = text;
  $('joinStatus').className = 'status' + (kind ? ' ' + kind : '');
}

async function onFindRoom(e) {
  e.preventDefault();
  const code = normaliseCode($('joinCode').value);
  $('joinCode').value = code;
  if (!isValidCode(code)) return joinStatus('Room codes are six letters and numbers.', 'err');
  if (!connected()) return joinStatus('Not connected yet. Try again in a moment.', 'err');

  joinStatus('Looking for the room…');
  let room;
  try { room = await getRoom(code); } catch (err) {
    console.error('[gaslight] room lookup failed:', err);
    return joinStatus('Could not reach the room. Check your connection.', 'err');
  }
  if (!room) return joinStatus(`There is no room ${code}. Check the code with your narrator.`, 'err');
  if (room.status === 'closed') return joinStatus('That room has been closed by its narrator.', 'err');

  joinStatus('');
  pendingRoom = room;
  $('joinPanel').hidden = true;
  $('entry').hidden = false;
  $('entryName').textContent = room.name || `Room ${room.code}`;
  $('entryCode').textContent = room.code;
  $('entryMsg').textContent = room.welcomeMsg || '';
  $('entryMsg').hidden = !room.welcomeMsg;
  $('entryNarrator').textContent = room.narratorUid ? '' : 'No narrator has opened this room yet. You can still go in and wait.';
  const charName = activeSheetCharacterName();
  $('entryChar').innerHTML = charName
    ? `Playing as <b>${esc(charName)}</b>`
    : 'No character on this device yet. The sheet will walk you through making one.';
}

async function enterAsPlayer(where) {
  if (!pendingRoom) return;
  const buttons = document.querySelectorAll('[data-enter]');
  buttons.forEach(b => { b.disabled = true; });
  try {
    await joinAsPlayer(pendingRoom);
    location.href = where === 'table' ? tableUrl(pendingRoom.code, 'player') : sheetUrl();
  } catch (err) {
    console.error('[gaslight] join failed:', err);
    buttons.forEach(b => { b.disabled = false; });
    $('entryChar').textContent = 'Joining failed. Check your connection and try again.';
  }
}

function cancelEntry() {
  pendingRoom = null;
  $('entry').hidden = true;
  $('joinPanel').hidden = false;
  $('joinCode').focus();
}

/* ---- boot ---- */

function wire() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    if (b.dataset.go === 'pick') { history.pushState(null, '', location.pathname); show('pick'); }
    else go(b.dataset.go);
  });
  window.addEventListener('popstate', () => show(location.hash.slice(1) || 'pick'));

  $('signInBtn').onclick = signIn;
  $('signOutBtn').onclick = async () => { await auth().signOutNow(); renderAccount(); loadRooms(); };
  $('newRoomForm').addEventListener('submit', onCreateRoom);
  $('refreshRooms').onclick = loadRooms;
  $('joinForm').addEventListener('submit', onFindRoom);
  $('joinCode').addEventListener('input', e => { e.target.value = normaliseCode(e.target.value); });
  document.querySelectorAll('[data-enter]').forEach(b => { b.onclick = () => enterAsPlayer(b.dataset.enter); });
  $('entryCancel').onclick = cancelEntry;

  for (const evt of ['arc:auth-changed', 'arc:signed-out']) {
    document.addEventListener(evt, () => {
      renderAccount();
      if (!$('viewNarrator').hidden) loadRooms();
    });
  }
}

wire();
initTheme();
renderAccount();
show(location.hash.slice(1) || 'pick');

firebaseReady().then(() => {
  ready = true;
  renderAccount();
  if (!$('viewNarrator').hidden) loadRooms();
});
