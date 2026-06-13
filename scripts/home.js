/* Home screen — character management */

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

function renderSaves() {
    const saves   = getSaves();
    const section = document.getElementById('home-saves-section');
    const list    = document.getElementById('saves-list');
    const moreBtn = document.getElementById('saves-show-more');

    if (!saves.length) { section.hidden = true; return; }

    section.hidden = false;
    const visible = showAllSaves ? saves : saves.slice(0, SAVES_VISIBLE_LIMIT);

    list.innerHTML = visible.map(s => `
        <div class="save-entry">
            <div class="save-info">
                <span class="save-name">${s.name}</span>
                <span class="save-meta">${[s.classKey, fmtDate(s.savedAt)].filter(Boolean).join(' · ')}</span>
            </div>
            <div class="save-actions">
                <button class="save-btn save-btn--load" data-load="${s.id}" type="button">Load</button>
                <button class="save-btn save-btn--del"  data-del="${s.id}"  type="button">✕</button>
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

document.addEventListener('arc:firebase-ready', () => {
    const room = localStorage.getItem('arc-room');

    if (room) {
        document.getElementById('home-active-session').hidden    = false;
        document.getElementById('home-join-form-wrap').hidden    = true;
        document.getElementById('home-session-code').textContent = room;
    } else {
        const joinBtn   = document.getElementById('btn-join-session');
        const createBtn = document.getElementById('btn-create-room');
        if (joinBtn)   joinBtn.disabled   = false;
        if (createBtn) createBtn.disabled = false;
    }
});

function genRoomCode() {
    return Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
}

async function doCreateRoom() {
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) { showJoinStatus('Still connecting — try again.', 'error'); return; }

    showJoinStatus('Creating room…', 'info');
    const code = genRoomCode();
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', code), {
            hostUid:        arc.uid,
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
        showJoinStatus(`Room ${code} created! Loading…`, 'success');
        setTimeout(() => { window.location.href = 'active-sheet.html'; }, 800);
    } catch(e) {
        console.error('[ARC] create room failed:', e);
        showJoinStatus('Failed to create room. Try again.', 'error');
    }
}

document.getElementById('btn-create-room')?.addEventListener('click', () => {
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
    document.getElementById('home-active-session').hidden   = true;
    document.getElementById('home-join-form-wrap').hidden   = false;
    const btn = document.getElementById('btn-join-session');
    if (btn) btn.disabled = !arc?.uid;
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
    if (roomName) localStorage.setItem('arc-room-name', roomName);
    else localStorage.removeItem('arc-room-name');

    const hasCharacter = !!getActive()?.char?.name;
    const dest = hasCharacter ? 'active-sheet.html' : 'create-char.html';
    showJoinStatus(hasCharacter ? 'Joined! Loading…' : 'Joined! Let\'s build your character…', 'success');
    setTimeout(() => { window.location.href = dest; }, 700);
}

document.getElementById('btn-join-session')?.addEventListener('click', async () => {
    const input = document.getElementById('join-code-input');
    const code  = (input?.value || '').trim().toUpperCase();
    if (code.length !== 6) { showJoinStatus('Enter the 6-character room code.', 'error'); return; }

    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) { showJoinStatus('Still connecting — try again.', 'error'); return; }

    showJoinStatus('Checking room…', 'info');
    try {
        const snap = await arc.getDoc(arc.doc(arc.db, 'rooms', code));
        if (!snap.exists() || snap.data().status !== 'active') {
            showJoinStatus('Room not found. Check the code.', 'error');
            return;
        }

        const roomName   = snap.data().name       || '';
        const welcomeMsg = snap.data().welcomeMsg || '';

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

    // New character — prompt to save if active exists
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

    // Saves list — show all / show fewer toggle
    document.getElementById('saves-show-more')?.addEventListener('click', () => {
        showAllSaves = !showAllSaves;
        renderSaves();
    });

    // Saves list — load or delete
    document.getElementById('saves-list')?.addEventListener('click', e => {
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
