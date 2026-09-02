/* Home screen - character management */

const ACTIVE_KEY   = 'arc-active-sheet';
const SAVES_KEY    = 'arc-saves';
const ACTIVE_SAVE_ID_KEY = 'arc-active-save-id';
const SAVES_VISIBLE_LIMIT = 3;
let showAllSaves = false;

// ── STORAGE HELPERS ───────────────────────────────────────────────────────────

function getActive() {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); }
    catch { return null; }
}

function getSaves() {
    try { return JSON.parse(localStorage.getItem(SAVES_KEY) || '[]'); }
    catch { return []; }
}

function setSaves(arr) {
    localStorage.setItem(SAVES_KEY, JSON.stringify(arr));
}

function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── SAVE CURRENT CHARACTER ────────────────────────────────────────────────────

function saveCurrentToSlot(existingId = null) {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        const name = data.char?.name || 'Unnamed';
        const id   = existingId || localStorage.getItem(ACTIVE_SAVE_ID_KEY) || `save_${Date.now()}`;

        localStorage.setItem(`arc-save-${id}`, raw);
        localStorage.setItem(ACTIVE_SAVE_ID_KEY, id);

        const saves = getSaves().filter(s => s.id !== id);
        saves.unshift({
            id,
            name,
            classKey: data.char?.classKey || '',
            savedAt:  Date.now(),
        });
        setSaves(saves);
        // Cloud sync rides on deliberate saves, not on every debounce - the free
        // tier's write budget is small and a save is the natural checkpoint.
        window.ArcCloud?.push(id, raw, Date.now());
        return id;
    } catch { return null; }
}

// ── LOAD A SAVE SLOT ──────────────────────────────────────────────────────────

function loadSave(id) {
    const raw = localStorage.getItem(`arc-save-${id}`);
    if (!raw) { alert('Save not found.'); return; }
    localStorage.setItem(ACTIVE_KEY, raw);
    localStorage.setItem(ACTIVE_SAVE_ID_KEY, id);
    window.location.href = 'active-sheet.html';
}

// ── DELETE A SAVE SLOT ────────────────────────────────────────────────────────

function deleteSave(id) {
    window.ArcCloud?.remove(id);
    localStorage.removeItem(`arc-save-${id}`);
    setSaves(getSaves().filter(s => s.id !== id));
    if (localStorage.getItem(ACTIVE_SAVE_ID_KEY) === id) {
        localStorage.removeItem(ACTIVE_SAVE_ID_KEY);
    }
    renderAll();
}

// ── RENDER ────────────────────────────────────────────────────────────────────

function renderAll() {
    renderCurrent();
    renderSaves();
}

function renderCurrent() {
    const data       = getActive();
    const section    = document.getElementById('home-current');
    const nameEl     = document.getElementById('home-char-name');
    const metaEl     = document.getElementById('home-char-meta');

    if (!data || !data.char?.name) {
        section.hidden = true;
        return;
    }

    section.hidden = false;
    nameEl.textContent = data.char.name;
    const parts = [data.char.classKey, data.char.species].filter(Boolean);
    metaEl.textContent = parts.join(' · ');
}

// What the cloud holds that this device does not, refreshed after sign-in.
let cloudState = { cloudOnly: [], localOnly: [], newerInCloud: [] };

function renderSaves() {
    const saves   = getSaves();
    const section = document.getElementById('home-saves-section');
    const list    = document.getElementById('saves-list');
    const moreBtn = document.getElementById('saves-show-more');

    const cloudOnly = cloudState.cloudOnly;
    if (!saves.length && !cloudOnly.length) { section.hidden = true; return; }

    section.hidden = false;
    const visible = showAllSaves ? saves : saves.slice(0, SAVES_VISIBLE_LIMIT);
    const newerIds = new Set(cloudState.newerInCloud.map(c => c.id));

    list.innerHTML = visible.map(s => `
        <div class="save-entry">
            <div class="save-info">
                <span class="save-name">${s.name}</span>
                <span class="save-meta">${[s.classKey, fmtDate(s.savedAt)].filter(Boolean).join(' · ')}</span>
                ${newerIds.has(s.id) ? `<span class="save-conflict">A newer copy is in your account.
                    <button class="save-link-btn" data-cloud-load="${s.id}" type="button">Use that one</button></span>` : ''}
            </div>
            <div class="save-actions">
                <button class="save-btn save-btn--load" data-load="${s.id}" type="button">Load</button>
                <button class="save-btn save-btn--del"  data-del="${s.id}"  type="button">✕</button>
            </div>
        </div>`).join('')
        // Characters that exist in the account but not on this device - the
        // whole point of signing in.
        + cloudOnly.map(c => `
        <div class="save-entry save-entry--cloud">
            <div class="save-info">
                <span class="save-name">☁ ${c.name}</span>
                <span class="save-meta">${[c.classKey, fmtDate(c.savedAt), 'in your account'].filter(Boolean).join(' · ')}</span>
            </div>
            <div class="save-actions">
                <button class="save-btn save-btn--load" data-cloud-load="${c.id}" type="button">Download</button>
            </div>
        </div>`).join('');

    if (moreBtn) {
        if (saves.length > SAVES_VISIBLE_LIMIT) {
            moreBtn.hidden = false;
            moreBtn.textContent = showAllSaves ? 'Show fewer' : `Show all (${saves.length})`;
        } else {
            moreBtn.hidden = true;
        }
    }
}

// ── EVENTS ────────────────────────────────────────────────────────────────────

// ── FIREBASE: JOIN SESSION ────────────────────────────────────────────────────

function showJoinStatus(msg, type) {
    const el = document.getElementById('join-status');
    if (!el) return;
    el.textContent = msg;
    el.className   = `home-join-status home-join-status--${type}`;
    el.hidden      = false;
}

// Pre-fill room code from ?room= share link before Firebase is ready
(function () {
    const param = new URLSearchParams(window.location.search).get('room');
    if (param) {
        const input = document.getElementById('join-code-input');
        if (input) input.value = param.toUpperCase().slice(0, 6);
    }
})();

function syncSessionSection() {
    const room = localStorage.getItem('arc-room');
    const activeEl   = document.getElementById('home-active-session');
    const joinWrapEl = document.getElementById('home-join-form-wrap');
    if (!activeEl || !joinWrapEl) return;

    if (room) {
        activeEl.hidden    = false;
        joinWrapEl.hidden  = true;
        document.getElementById('home-session-code').textContent = room;
    } else {
        activeEl.hidden   = true;
        joinWrapEl.hidden = false;
        // Left enabled whether or not you are signed in: the handlers explain
        // what is needed, which teaches more than a button that does nothing.
        const joinBtn   = document.getElementById('btn-join-session');
        const createBtn = document.getElementById('btn-create-room');
        if (joinBtn)   joinBtn.disabled   = false;
        if (createBtn) createBtn.disabled = false;
    }
}

document.addEventListener('arc:firebase-ready', syncSessionSection);

// Mobile PWAs (iOS/Android WebView) restore this page from the back-forward
// cache on "Back" without re-running scripts or repainting - state can go
// stale and static content can fail to repaint until a full reload.
// Resync state and force a reflow to fix both.
window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    renderAll();
    syncSessionSection();
    document.body.style.display = 'none';
    void document.body.offsetHeight;
    document.body.style.display = '';
});

function genRoomCode() {
    return Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
}

async function doCreateRoom() {
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) { showJoinStatus('Still connecting - try again.', 'error'); return; }

    showJoinStatus('Creating room…', 'info');
    const code = genRoomCode();
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', code), {
            narratorUid:    arc.uid,
            createdAt:      arc.serverTimestamp(),
            lastActivityAt: arc.serverTimestamp(),
            status:         'active',
        });

        // Write player entry
        const active = (() => { try { return JSON.parse(localStorage.getItem('arc-active-sheet') || 'null'); } catch { return null; } })();
        const c = active?.char || {}, r = active?.resources || {};
        await arc.setDoc(arc.doc(arc.db, 'rooms', code, 'players', arc.uid), {
            name: c.name || 'Player', armor: r.armor?.current ?? 0,
            woundsCur: r.hp?.current ?? 0, woundsMax: r.hp?.max ?? 0,
            mnCur: r.MN?.current ?? 0, mnMax: r.MN?.max ?? 0,
            gold: c.gold ?? 0, updatedAt: arc.serverTimestamp(),
        }, { merge: true });

        localStorage.setItem('arc-room', code);
        document.dispatchEvent(new CustomEvent('arc:room-changed'));
        showJoinStatus(`Room ${code} created! Loading…`, 'success');
        setTimeout(() => { window.location.href = 'active-sheet.html'; }, 800);
    } catch(e) {
        console.error('[ARC] create room failed:', e);
        showJoinStatus('Failed to create room. Try again.', 'error');
    }
}

document.getElementById('btn-create-room')?.addEventListener('click', () => {
    if (!requireAccount('create a room')) return;
    const existing = localStorage.getItem('arc-room');
    if (existing) {
        document.getElementById('confirm-room-code').textContent = existing;
        document.getElementById('home-create-confirm').hidden = false;
    } else {
        doCreateRoom();
    }
});

document.getElementById('btn-create-confirm-yes')?.addEventListener('click', () => {
    document.getElementById('home-create-confirm').hidden = true;
    doCreateRoom();
});

document.getElementById('btn-create-confirm-no')?.addEventListener('click', () => {
    document.getElementById('home-create-confirm').hidden = true;
});

// Rejoin existing session
document.getElementById('btn-rejoin-session')?.addEventListener('click', () => {
    const hasCharacter = !!getActive()?.char?.name;
    window.location.href = hasCharacter ? 'active-sheet.html' : 'create-char.html';
});

// Leave session
document.getElementById('btn-leave-session')?.addEventListener('click', async () => {
    const room = localStorage.getItem('arc-room');
    const arc  = window.__arc;

    if (room && arc?.db && arc?.uid) {
        try {
            await arc.deleteDoc(arc.doc(arc.db, 'rooms', room, 'players', arc.uid));

            // Departure announcement
            const active     = (() => { try { return JSON.parse(localStorage.getItem('arc-active-sheet') || 'null'); } catch { return null; } })();
            const playerName = active?.char?.name || 'A player';
            const roomName   = localStorage.getItem('arc-room-name') || '';
            const text = roomName ? `${playerName} has left ${roomName}.` : `${playerName} has left the session.`;
            arc.setDoc(arc.doc(arc.db, 'rooms', room, 'chat', crypto.randomUUID()), {
                type: 'system', text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                postedAt: arc.serverTimestamp(),
            }).catch(() => {});
        } catch(e) { console.error('[ARC] leave failed:', e); }
    }

    localStorage.removeItem('arc-room');
    localStorage.removeItem('arc-room-name');
    document.dispatchEvent(new CustomEvent('arc:room-changed'));
    document.getElementById('home-active-session').hidden   = true;
    document.getElementById('home-join-form-wrap').hidden   = false;
    const btn = document.getElementById('btn-join-session');
    if (btn) btn.disabled = false;
    showJoinStatus('Left session.', 'info');
});

let _pendingJoin = null;

async function completeJoin(code, roomName) {
    const arc    = window.__arc;
    const active = (() => { try { return JSON.parse(localStorage.getItem('arc-active-sheet') || 'null'); } catch { return null; } })();
    const c = active?.char      || {};
    const r = active?.resources || {};
    const playerName = c.name || 'A player';

    await arc.setDoc(arc.doc(arc.db, 'rooms', code, 'players', arc.uid), {
        name:      playerName,
        armor:     r.armor?.current  ?? 0,
        woundsCur: r.hp?.current     ?? 0,
        woundsMax: r.hp?.max         ?? 0,
        mnCur:     r.MN?.current     ?? 0,
        mnMax:     r.MN?.max         ?? 0,
        gold:      c.gold            ?? 0,
        updatedAt: arc.serverTimestamp(),
    }, { merge: true });

    arc.updateDoc(arc.doc(arc.db, 'rooms', code), { lastActivityAt: arc.serverTimestamp() }).catch(() => {});

    // Arrival announcement in shared chat
    const arrivalText = roomName
        ? `${playerName} has entered ${roomName}.`
        : `${playerName} has joined the session.`;
    arc.setDoc(arc.doc(arc.db, 'rooms', code, 'chat', crypto.randomUUID()), {
        type:     'system',
        text:     arrivalText,
        time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        postedAt: arc.serverTimestamp(),
    }).catch(() => {});

    localStorage.setItem('arc-room', code);
    document.dispatchEvent(new CustomEvent('arc:room-changed'));
    if (roomName) localStorage.setItem('arc-room-name', roomName);
    else localStorage.removeItem('arc-room-name');

    const hasCharacter = !!getActive()?.char?.name;
    const dest = hasCharacter ? 'active-sheet.html' : 'create-char.html';
    showJoinStatus(hasCharacter ? 'Joined! Loading…' : 'Joined! Let\'s build your character…', 'success');
    setTimeout(() => { window.location.href = dest; }, 700);
}

document.getElementById('btn-join-session')?.addEventListener('click', async () => {
    if (!requireAccount('join a room')) return;
    const input = document.getElementById('join-code-input');
    const code  = (input?.value || '').trim().toUpperCase();
    if (code.length !== 6) { showJoinStatus('Enter the 6-character room code.', 'error'); return; }

    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) { showJoinStatus('Still connecting - try again.', 'error'); return; }

    showJoinStatus('Checking room…', 'info');
    try {
        const snap = await arc.getDoc(arc.doc(arc.db, 'rooms', code));

        if (!snap.exists()) {
            offerToStartRoom(code);
            return;
        }
        if (snap.data().status === 'closed') {
            showJoinStatus('That campaign has been closed by its narrator.', 'error');
            return;
        }

        const roomName   = snap.data().name       || '';
        const welcomeMsg = snap.data().welcomeMsg || '';

        // The room is real and open, it just has nobody running it yet. Let them
        // in to wait rather than turning them away.
        if (!snap.data().narratorUid) {
            showJoinStatus('Room found - no narrator is connected yet. Joining anyway.', 'info');
        }

        if (roomName || welcomeMsg) {
            _pendingJoin = { code, roomName };
            document.getElementById('entry-room-name').textContent = roomName || `Room ${code}`;
            const msgEl = document.getElementById('entry-room-msg');
            if (msgEl) { msgEl.textContent = welcomeMsg; msgEl.hidden = !welcomeMsg; }
            document.getElementById('home-join-section').hidden = true;
            document.getElementById('home-entry-screen').hidden = false;
            return;
        }

        await completeJoin(code, roomName);
    } catch(e) {
        console.error('[ARC] join failed:', e);
        showJoinStatus('Connection error. Try again.', 'error');
    }
});

document.getElementById('btn-enter-room')?.addEventListener('click', async () => {
    if (!_pendingJoin) return;
    const { code, roomName } = _pendingJoin;
    _pendingJoin = null;
    document.getElementById('home-entry-screen').hidden = true;
    document.getElementById('home-join-section').hidden = false;
    showJoinStatus('Joining…', 'info');
    try {
        await completeJoin(code, roomName);
    } catch(e) {
        console.error('[ARC] join failed:', e);
        document.getElementById('home-join-form-wrap').hidden = false;
        showJoinStatus('Connection error. Try again.', 'error');
    }
});

// ── CHARACTER MANAGEMENT ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    renderAll();

    // Save current to slot
    document.getElementById('btn-save-current')?.addEventListener('click', () => {
        const id = saveCurrentToSlot();
        if (id) {
            const btn = document.getElementById('btn-save-current');
            btn.textContent = '✓ Saved';
            setTimeout(() => { btn.textContent = 'Save'; }, 1500);
            renderSaves();
            document.getElementById('home-saves-section').hidden = false;
        }
    });

    // Continue with active character
    document.getElementById('btn-continue')?.addEventListener('click', () => {
        window.location.href = 'active-sheet.html';
    });

    // New character - prompt to save if active exists
    document.getElementById('btn-new')?.addEventListener('click', () => {
        const data = getActive();
        if (data?.char?.name) {
            const choice = confirm(`Save "${data.char.name}" before starting a new character?`);
            if (choice) saveCurrentToSlot();
        }
        localStorage.removeItem(ACTIVE_KEY);
        localStorage.removeItem(ACTIVE_SAVE_ID_KEY);
        window.location.href = 'create-char.html';
    });

    // Import from file
    document.getElementById('btn-import')?.addEventListener('click', () => {
        document.getElementById('file-load')?.click();
    });

    document.getElementById('file-load')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                localStorage.setItem(ACTIVE_KEY, JSON.stringify(data));
                localStorage.removeItem(ACTIVE_SAVE_ID_KEY);
                renderAll();
            } catch {
                alert('Invalid save file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Saves list - show all / show fewer toggle
    document.getElementById('saves-show-more')?.addEventListener('click', () => {
        showAllSaves = !showAllSaves;
        renderSaves();
    });

    // Saves list - load or delete
    document.getElementById('saves-list')?.addEventListener('click', e => {
        const cloudBtn = e.target.closest('[data-cloud-load]');
        if (cloudBtn) { downloadFromCloud(cloudBtn.dataset.cloudLoad); return; }

        const loadBtn = e.target.closest('[data-load]');
        if (loadBtn) {
            const data = getActive();
            if (data?.char?.name) {
                if (confirm(`Switch to this character? Save "${data.char.name}" first?`)) {
                    saveCurrentToSlot();
                }
            }
            loadSave(loadBtn.dataset.load);
            return;
        }
        const delBtn = e.target.closest('[data-del]');
        if (delBtn) {
            const saves = getSaves();
            const s     = saves.find(x => x.id === delBtn.dataset.del);
            if (s && confirm(`Delete "${s.name}"? This cannot be undone.`)) {
                deleteSave(delBtn.dataset.del);
            }
        }
    });
});


/* ── ACCOUNT ──────────────────────────────────────────────────────────────────
 * Sign-in is an upgrade, not a wall. Solo play - building a character, running
 * a sheet, the reference panels - never comes through here. Only the things
 * that touch other people do: rooms, shared chat, cloud saves.
 *
 * Sign-in executes on this page and nowhere else. On iOS PWAs the flow is a
 * redirect, which reloads the page; doing that from a live sheet would drop a
 * player out of a fight, so other pages send you here with ?next= and we send
 * you back afterwards.
 */

function accountMsg(text, isError) {
    const el = document.getElementById('sign-in-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className   = 'home-account-msg' + (isError ? ' home-account-msg--error' : '');
    el.hidden      = !text;
}

function renderAccount() {
    const outEl = document.getElementById('home-account-out');
    const inEl  = document.getElementById('home-account-in');
    if (!outEl || !inEl) return;

    const signedIn = window.ArcAuth?.isSignedIn();
    outEl.hidden = !!signedIn;
    inEl.hidden  = !signedIn;

    if (signedIn) {
        const nameEl = document.getElementById('home-account-name');
        if (nameEl) nameEl.textContent = window.ArcAuth.displayName() || 'you';
    }
}

/* Called by the room actions. Returns true to proceed. */
function requireAccount(action) {
    if (window.ArcAuth?.isSignedIn()) return true;
    accountMsg(`Sign in to ${action}. Everything you do on your own works without an account.`, false);
    document.getElementById('home-account')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
}

document.getElementById('btn-sign-in')?.addEventListener('click', async () => {
    // Signing in is the one thing here that genuinely cannot work offline.
    if (navigator.onLine === false) {
        accountMsg('Signing in needs a connection. Everything solo works offline - come back when you have signal.', true);
        return;
    }
    if (!window.__arc?.auth) {
        accountMsg('Still connecting - try again in a moment.', true);
        return;
    }

    accountMsg('Opening Google…', false);
    try {
        const user = await window.ArcAuth.signInWithGoogle();
        if (!user) return;                    // redirect flow - page is navigating away
        accountMsg('', false);
        renderAccount();
        await afterSignIn();
    } catch (e) {
        console.error('[ARC] sign-in failed:', e);
        accountMsg(e?.code === 'auth/popup-closed-by-user'
            ? 'Sign-in cancelled.'
            : 'Sign-in failed - try again.', true);
    }
});

document.getElementById('btn-sign-out')?.addEventListener('click', async () => {
    if (!confirm('Sign out? Characters saved on this device stay here.')) return;
    await window.ArcAuth.signOutNow();
    renderAccount();
    syncSessionSection();
    accountMsg('Signed out.', false);
});

// ── DISPLAY NAME ─────────────────────────────────────────────────────────────

function openDisplayNameDialog(prefill) {
    const dlg   = document.getElementById('displayname-dialog');
    const input = document.getElementById('displayname-input');
    if (!dlg || !input || dlg.open) return;
    input.value = prefill || window.ArcAuth?.displayName() || '';
    dlg.showModal();
    input.focus();
}

document.getElementById('btn-account-rename')?.addEventListener('click', () => openDisplayNameDialog());

document.getElementById('btn-displayname-save')?.addEventListener('click', async () => {
    const input = document.getElementById('displayname-input');
    const ok    = await window.ArcAuth.setDisplayName(input?.value);
    if (!ok) { input?.focus(); return; }
    document.getElementById('displayname-dialog')?.close();
    renderAccount();
});

document.getElementById('displayname-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-displayname-save')?.click();
});

/* Runs once after a successful sign-in, whichever flow got us here. The popup
 * flow reaches this from the click handler AND from arc:auth-changed, so the
 * latch matters: showModal() on an already-open dialog throws. */
let _afterSignInDone = false;
async function afterSignIn() {
    if (_afterSignInDone) return;
    _afterSignInDone = true;
    renderAccount();
    syncSessionSection();

    if (window.ArcAuth.needsDisplayName()) {
        openDisplayNameDialog(window.__arc?.user?.displayName || '');
        return;                                // ?next= is handled after they name themselves
    }
    returnToNext();
}

/* Send the player back to whatever page bounced them here. */
function returnToNext() {
    const next = new URLSearchParams(location.search).get('next');
    if (!next) return;
    // Same-directory pages only - never bounce to an arbitrary URL.
    if (!/^[\w.-]+\.html([?#].*)?$/.test(next)) return;
    location.href = next;
}

document.getElementById('displayname-dialog')?.addEventListener('close', returnToNext);

// A page that needed an account sent us here - say which, so the ask makes sense.
(function () {
    const why = new URLSearchParams(location.search).get('why');
    if (why) accountMsg(`Sign in to ${why}. Everything you do on your own works without an account.`, false);
})();

document.addEventListener('arc:sign-in-required', e => requireAccount(e.detail?.reason || 'do that'));

// Paint from the local flag immediately - no waiting on Firebase, so this is
// correct offline too. Firebase confirms or corrects it when it resolves.
renderAccount();

document.addEventListener('arc:auth-changed', ({ detail }) => {
    renderAccount();
    // A redirect sign-in lands here rather than in the click handler.
    if (detail?.signedIn && new URLSearchParams(location.search).has('next')) afterSignIn();
});


/* ── CLOUD CHARACTERS ─────────────────────────────────────────────────────────
 * localStorage remains the source of truth for the live sheet. This only adds
 * reach: characters saved on one device show up on another. Signed out or
 * offline, every call is a no-op and the page behaves exactly as before.
 */

async function refreshCloud() {
    if (!window.ArcCloud?.available()) {
        cloudState = { cloudOnly: [], localOnly: [], newerInCloud: [] };
        renderSaves();
        return;
    }
    cloudState = await window.ArcCloud.diff();
    renderSaves();
}

/* Pull a character down. Never silently replaces a local copy - if one exists
 * and differs, the player is asked, because a character quietly rolled back is
 * the fastest way to lose trust in the whole feature. */
async function downloadFromCloud(id) {
    if (!id) return;

    const existing = getSaves().find(s => s.id === id);
    if (existing && !confirm(
        `Replace this device's copy of "${existing.name}" with the one from your account?`)) return;

    const raw = await window.ArcCloud.get(id);
    if (!raw) { alert('Could not reach your account - try again when you have a connection.'); return; }

    let meta;
    try { meta = JSON.parse(raw); } catch { alert('That saved character could not be read.'); return; }

    localStorage.setItem(`arc-save-${id}`, raw);
    const saves = getSaves().filter(x => x.id !== id);
    saves.unshift({
        id,
        name:     meta.char?.name     || 'Unnamed',
        classKey: meta.char?.classKey || '',
        savedAt:  Date.now(),
    });
    setSaves(saves);

    await refreshCloud();
    renderAll();
}

/* First sign-in: offer to lift what is already on this device into the account.
 * Local -> cloud only. Nothing is overwritten, nothing is reconciled. */
async function offerLocalUpload() {
    if (!window.ArcCloud?.available()) return;

    const localOnly = cloudState.localOnly;
    if (!localOnly.length) return;

    const n = localOnly.length;
    if (!confirm(`Add ${n} character${n === 1 ? '' : 's'} from this device to your account?`)) return;

    const { pushed, failed } = await window.ArcCloud.uploadAllLocal();
    accountMsg(failed
        ? `Added ${pushed}. ${failed} could not be uploaded - they are still safe on this device.`
        : `Added ${pushed} character${pushed === 1 ? '' : 's'} to your account.`, !!failed);
    await refreshCloud();
}

document.addEventListener('arc:auth-changed', async ({ detail }) => {
    if (!detail?.signedIn) { await refreshCloud(); return; }
    window.ArcCloud?.ensureUserDoc(detail.displayName);
    await refreshCloud();
    await offerLocalUpload();
});


/* A code that matches no room. Rather than a dead end, offer the thing the
 * player probably wants next - their own table. */
function offerToStartRoom(code) {
    const box = document.getElementById('home-room-missing');
    if (!box) { showJoinStatus('That room does not exist. Check the code.', 'error'); return; }
    document.getElementById('missing-room-code').textContent = code;
    box.hidden = false;
    showJoinStatus('', 'info');
    document.getElementById('join-status').hidden = true;
}

document.getElementById('btn-missing-dismiss')?.addEventListener('click', () => {
    document.getElementById('home-room-missing').hidden = true;
});

document.getElementById('btn-missing-narrate')?.addEventListener('click', () => {
    // Narrator Mode owns room creation - naming, welcome message, the lot.
    window.location.href = 'narrator.html?new=1';
});
