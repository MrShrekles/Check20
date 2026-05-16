/* Narrator companion — ARC20 */

// ── PANELS ────────────────────────────────────────────────────────────────────

const PANEL_IDS = ['chat', 'party', 'generators', 'journal', 'initiative'];

function setActivePanel(key) {
    PANEL_IDS.forEach(id => {
        const el = document.getElementById(`panel-${id}`);
        if (el) el.classList.toggle('is-active', id === key);
    });
    document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.nav === key);
    });
    if (key === 'generators') { ensureMonsters(); ensureWorld(); ensureQuest(); ensureCommerce(); ensureHex(); }
}

document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => setActivePanel(btn.dataset.nav));
});

// ── STATE ─────────────────────────────────────────────────────────────────────

const nar = {
    encounter:   [],  // { id, name, hp, maxHp, initiative }
    notes:       '',
    round:       1,
    turnIndex:   0,
    minions:     [],  // { id, name, plPhys, plMent, hp, maxHp }
    inventory:   [],  // { id, name, desc, amount, bulk }
    partyManual: [],  // { id, name, armor, woundsCur, woundsMax, mnCur, mnMax, gold }
    archived:    [],  // character IDs hidden from party view
    genMonsters:  [],  // monster names pinned to the generator tab
    genNpcs:      [],  // generated NPC objects
    genLocations: [],  // generated location objects
    genQuests:    [],  // generated quests
    genDungeons:  [],  // generated door/trap elements
    genRooms:     [],  // generated room descriptions
    genMundane:   [],  // generated mundane items
    genEnchanted: [],  // generated enchanted items
    genMedicine:  [],  // generated medicine items
    genHexes:        [],  // generated hex tiles
    journalNpcs:     [],  // { id, name, pl, phys, ment, hp, notes, equipment, narratorNotes }
    journalMonsters: [],  // { id, name, pl, phys, ment, hp, note, equipment }
    questLog:        [],  // { id, text, done }
    sessions:        [],  // { id, title, date, notes }
    theme:        {},  // { a1, a2 }
};

function closeForm(btn) {
    const d = btn?.closest('details');
    if (d) d.open = false;
}

// Scroll the done-btn into view when any <details> form opens
document.querySelectorAll('details.nar-add-form').forEach(det => {
    det.addEventListener('toggle', () => {
        if (det.open) {
            const btn = det.querySelector('.done-btn');
            if (btn) setTimeout(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        }
    });
});

function loadNar() {
    try {
        const saved = localStorage.getItem('arc-narrator');
        if (saved) Object.assign(nar, JSON.parse(saved));
    } catch {}
}

function saveNar() {
    localStorage.setItem('arc-narrator', JSON.stringify(nar));
}

// ── PARTY ─────────────────────────────────────────────────────────────────────

function renderParty() {
    const el = document.getElementById('party-list');
    if (!el) return;

    // Merge Firebase live players + manually-added players
    const liveRows = fbPlayers
        .filter(p => !nar.archived.includes(p.id))
        .map(p => ({
            id:        p.id,
            source:    'firebase',
            name:      p.name      || 'Player',
            armor:     p.armor     ?? '—',
            woundsCur: p.woundsCur ?? '—',
            woundsMax: p.woundsMax ?? '—',
            mnCur:     p.mnCur,
            mnMax:     p.mnMax,
            gold:      p.gold      ?? null,
        }));

    const manualRows = nar.partyManual
        .filter(p => !nar.archived.includes(p.id))
        .map(p => ({ ...p, source: 'manual' }));

    const rows = [...liveRows, ...manualRows];

    if (!rows.length) {
        const hint = currentRoomCode
            ? `Room <strong>${currentRoomCode}</strong> — waiting for players to join.`
            : 'No players connected. Tap <strong>Invite</strong> to create a session.';
        el.innerHTML = `<p class="empty-hint">${hint}</p>`;
        return;
    }

    el.innerHTML = rows.map((row, i) => {
        const mnVal   = (row.mnMax > 0) ? `${row.mnCur}/${row.mnMax}` : '—';
        const goldVal = row.gold != null ? row.gold : '—';
        const liveDot = row.source === 'firebase' ? '<span class="prow-live">●</span>' : '';
        return `<div class="prow">
            <span class="prow-num">P${i + 1}</span>
            <span class="prow-name">${liveDot}${row.name}</span>
            <span class="prow-stat">${row.armor}</span>
            <span class="prow-stat prow-stat--wounds">${row.woundsCur}/${row.woundsMax}</span>
            <span class="prow-stat">${mnVal}</span>
            <span class="prow-stat">${goldVal}</span>
            <button class="prow-edit-btn" data-id="${row.id}" data-name="${row.name}" data-source="${row.source}" aria-label="Edit ${row.name}">⋮</button>
        </div>`;
    }).join('');

    el.querySelectorAll('.prow-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openPlayerEdit(btn.dataset.id, btn.dataset.name, btn.dataset.source);
        });
    });
}

document.getElementById('btn-invite')?.addEventListener('click', createRoom);

document.getElementById('btn-add-player')?.addEventListener('click', function() {
    const name      = document.getElementById('pp-name')?.value.trim();
    if (!name) return;
    const armor     = parseInt(document.getElementById('pp-armor')?.value     || '0', 10);
    const woundsCur = parseInt(document.getElementById('pp-wounds-cur')?.value || '10', 10);
    const woundsMax = parseInt(document.getElementById('pp-wounds-max')?.value || '10', 10);
    const mnCur     = parseInt(document.getElementById('pp-mn-cur')?.value    || '0', 10);
    const mnMax     = parseInt(document.getElementById('pp-mn-max')?.value    || '0', 10);
    const gold      = parseInt(document.getElementById('pp-gold')?.value      || '0', 10);

    nar.partyManual.push({
        id: crypto.randomUUID(),
        name, armor, woundsCur, woundsMax,
        mnCur, mnMax: mnMax || null, gold,
    });

    document.getElementById('pp-name').value       = '';
    document.getElementById('pp-armor').value      = '0';
    document.getElementById('pp-wounds-cur').value = '10';
    document.getElementById('pp-wounds-max').value = '10';
    document.getElementById('pp-mn-cur').value     = '0';
    document.getElementById('pp-mn-max').value     = '0';
    document.getElementById('pp-gold').value       = '0';

    saveNar(); renderParty(); closeForm(this);
});

// ── PLAYER EDIT DIALOG ────────────────────────────────────────────────────────

let editingId     = null;
let editingSource = null;

function openPlayerEdit(id, name, source) {
    editingId     = id;
    editingSource = source;
    const nameEl    = document.getElementById('player-edit-name');
    const removeBtn = document.getElementById('btn-ped-remove');
    if (nameEl)    nameEl.textContent  = name;
    if (removeBtn) removeBtn.style.display = source === 'manual' ? '' : 'none';
    document.getElementById('player-edit-dialog')?.showModal();
}

function closePlayerEdit() {
    editingId     = null;
    editingSource = null;
    document.getElementById('player-edit-dialog')?.close();
}

document.getElementById('btn-ped-archive')?.addEventListener('click', () => {
    if (!editingId) return;
    if (!nar.archived.includes(editingId)) nar.archived.push(editingId);
    saveNar(); renderParty(); closePlayerEdit();
});

document.getElementById('btn-ped-remove')?.addEventListener('click', () => {
    if (!editingId || editingSource !== 'manual') return;
    nar.partyManual = nar.partyManual.filter(p => p.id !== editingId);
    saveNar(); renderParty(); closePlayerEdit();
});

document.getElementById('btn-ped-cancel')?.addEventListener('click', closePlayerEdit);

// ── MINIONS ───────────────────────────────────────────────────────────────────

function renderMinions() {
    const el = document.getElementById('minion-list');
    if (!el) return;

    if (!nar.minions.length) {
        el.innerHTML = '<p class="empty-hint">No minions or companions.</p>';
        return;
    }

    el.innerHTML = nar.minions.map(m => {
        const pct = m.maxHp > 0 ? Math.round((m.hp / m.maxHp) * 100) : 0;
        return `<div class="minion-row">
            <span class="minion-name">${m.name}</span>
            <span class="minion-pl">${m.plPhys} / ${m.plMent}</span>
            <div class="minion-hp-ctrl">
                <button class="step-action-btn" data-mn-action="dec" data-mn-id="${m.id}">−</button>
                <span class="minion-hp">${m.hp}<span class="minion-hp-max">/${m.maxHp}</span></span>
                <button class="step-action-btn" data-mn-action="inc" data-mn-id="${m.id}">+</button>
            </div>
            <button class="step-action-btn" style="color:#ff6060" data-mn-action="remove" data-mn-id="${m.id}" title="Remove">✕</button>
        </div>
        <div class="minion-hp-bar-track"><div class="minion-hp-bar-fill" style="width:${pct}%"></div></div>`;
    }).join('');

    el.querySelectorAll('[data-mn-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id     = btn.dataset.mnId;
            const action = btn.dataset.mnAction;
            const m = nar.minions.find(x => x.id === id);
            if (!m && action !== 'remove') return;
            if (action === 'dec')    m.hp = Math.max(0, m.hp - 1);
            if (action === 'inc')    m.hp = Math.min(m.maxHp, m.hp + 1);
            if (action === 'remove') nar.minions = nar.minions.filter(x => x.id !== id);
            saveNar(); renderMinions();
        });
    });
}

document.getElementById('btn-add-minion')?.addEventListener('click', function() {
    const name   = document.getElementById('mn-name')?.value.trim();
    if (!name) return;
    const plPhys = parseInt(document.getElementById('mn-pl-phys')?.value || '1', 10);
    const plMent = parseInt(document.getElementById('mn-pl-ment')?.value || '1', 10);
    const maxHp  = parseInt(document.getElementById('mn-hp')?.value      || '10', 10);

    nar.minions.push({ id: crypto.randomUUID(), name, plPhys, plMent, hp: maxHp, maxHp });

    document.getElementById('mn-name').value    = '';
    document.getElementById('mn-pl-phys').value = '1';
    document.getElementById('mn-pl-ment').value = '1';
    document.getElementById('mn-hp').value      = '10';

    saveNar(); renderMinions(); closeForm(this);
});

// ── INVENTORY ─────────────────────────────────────────────────────────────────

function renderInventory() {
    const el = document.getElementById('inventory-list');
    if (!el) return;

    const items = currentRoomCode ? fbLoot : nar.inventory;

    if (!items.length) {
        el.innerHTML = '<p class="empty-hint">No items in party inventory.</p>';
        return;
    }

    el.innerHTML = items.map(item => {
        const bulkTotal = ((item.bulk || 0) * (item.amount || 1)).toFixed(1).replace(/\.0$/, '');
        return `<div class="inv-row">
            <div class="inv-name-col">
                <span class="inv-name">${item.name}</span>
                ${item.desc ? `<span class="inv-desc">${item.desc}</span>` : ''}
            </div>
            <span class="inv-amount">×${item.amount}</span>
            <span class="inv-bulk">${bulkTotal} bulk</span>
            <button class="inv-claim-btn" data-inv-id="${item.id}">Claim</button>
        </div>`;
    }).join('');

    el.querySelectorAll('.inv-claim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = btn.dataset.invId;
            if (currentRoomCode) {
                claimLootItem(id);
            } else {
                const item = nar.inventory.find(x => x.id === id);
                if (!item) return;
                item.amount = Math.max(0, item.amount - 1);
                if (item.amount === 0) nar.inventory = nar.inventory.filter(x => x.id !== id);
                saveNar(); renderInventory();
            }
        });
    });
}

async function claimLootItem(id) {
    const arc  = window.__arc;
    if (!arc?.db || !currentRoomCode) return;
    const item = fbLoot.find(x => x.id === id);
    if (!item) return;
    try {
        if (item.amount <= 1) {
            await arc.deleteDoc(arc.doc(arc.db, 'rooms', currentRoomCode, 'loot', id));
        } else {
            await arc.updateDoc(arc.doc(arc.db, 'rooms', currentRoomCode, 'loot', id), {
                amount: item.amount - 1,
            });
        }
    } catch(e) { console.error('[ARC] claimLoot failed:', e); }
}

document.getElementById('btn-add-inventory')?.addEventListener('click', async function() {
    const name = document.getElementById('inv-name')?.value.trim();
    if (!name) return;
    const desc   = document.getElementById('inv-desc')?.value.trim()   || '';
    const amount = parseInt(document.getElementById('inv-amount')?.value || '1', 10);
    const bulk   = parseFloat(document.getElementById('inv-bulk')?.value || '1');

    if (currentRoomCode) {
        const arc = window.__arc;
        if (arc?.db) {
            try {
                const id = crypto.randomUUID();
                await arc.setDoc(arc.doc(arc.db, 'rooms', currentRoomCode, 'loot', id), {
                    name, desc, amount, bulk, addedAt: arc.serverTimestamp(),
                });
            } catch(e) { console.error('[ARC] addLoot failed:', e); }
        }
    } else {
        nar.inventory.push({ id: crypto.randomUUID(), name, desc, amount, bulk });
        saveNar(); renderInventory();
    }

    document.getElementById('inv-name').value   = '';
    document.getElementById('inv-desc').value   = '';
    document.getElementById('inv-amount').value = '1';
    document.getElementById('inv-bulk').value   = '1';

    closeForm(this);
});

// ── INITIATIVE ────────────────────────────────────────────────────────────────

const EVENT_SUBTYPES = {
    environmental:  { label: 'Env',     color: '#4dba94' },
    reinforcements: { label: 'Reinf',   color: '#c9a227' },
    hazard:         { label: 'Hazard',  color: '#c43250' },
    npc:            { label: 'NPC',     color: '#9b72cf' },
    custom:         { label: 'Event',   color: '#7fc4d4' },
};

function sortedEncounter() {
    return [...nar.encounter].sort((a, b) => b.initiative - a.initiative);
}

function encTime(round) {
    return ((round - 1) * 10 / 60).toFixed(2);
}

function renderEncounter() {
    const listEl   = document.getElementById('encounter-list');
    const turnBar  = document.getElementById('enc-turn-bar');
    const roundEl  = document.getElementById('enc-round');
    const timeEl   = document.getElementById('enc-time');
    const activeEl = document.getElementById('enc-active-name');
    if (!listEl) return;

    const sorted = sortedEncounter();

    if (!sorted.length) {
        listEl.innerHTML = '<p class="empty-hint">No one in initiative. Add combatants below.</p>';
        if (turnBar) turnBar.hidden = true;
        if (roundEl) roundEl.textContent = nar.round;
        if (timeEl)  timeEl.textContent  = encTime(nar.round);
        return;
    }

    const activeTurn = nar.turnIndex % sorted.length;
    const activeName = sorted[activeTurn]?.hidden ? '???' : (sorted[activeTurn]?.name || '—');
    if (turnBar)  turnBar.hidden = false;
    if (roundEl)  roundEl.textContent = nar.round;
    if (timeEl)   timeEl.textContent  = encTime(nar.round);
    if (activeEl) activeEl.textContent = activeName;

    listEl.innerHTML = sorted.map((c, i) => {
        const isActive = i === activeTurn;
        const type = c.type || 'enemy';

        if (type === 'player') {
            return `<div class="enc-card enc-card--player${isActive ? ' enc-card--active' : ''}">
                <div class="enc-card-row">
                    <span class="enc-init-badge">${c.initiative}</span>
                    <span class="enc-type-badge enc-type--player">Player</span>
                    <span class="enc-name">${c.name}</span>
                    <button class="step-action-btn" style="color:#ff6060;margin-left:auto" data-enc-action="remove" data-enc-id="${c.id}">✕</button>
                </div>
            </div>`;
        }

        if (type === 'event') {
            const sub = EVENT_SUBTYPES[c.subType] || EVENT_SUBTYPES.custom;
            const display = c.hidden
                ? `<span class="enc-type-badge" style="background:rgba(100,100,100,0.25);color:#888">🔒 Hidden</span><span class="enc-name" style="color:var(--muted)">???</span>`
                : `<span class="enc-type-badge" style="background:${sub.color}22;color:${sub.color}">${sub.label}</span><span class="enc-name">${c.name}</span>`;
            return `<div class="enc-card enc-card--event${isActive ? ' enc-card--active' : ''}">
                <div class="enc-card-row">
                    <span class="enc-init-badge">${c.initiative}</span>
                    ${display}
                    <button class="step-action-btn" style="color:#ff6060;margin-left:auto" data-enc-action="remove" data-enc-id="${c.id}">✕</button>
                </div>
                ${c.note && !c.hidden ? `<div class="enc-event-note">${c.note}</div>` : ''}
                ${c.hidden ? `<div class="enc-event-note enc-event-note--hidden">🔒 ${c.name}${c.note ? ' — ' + c.note : ''}</div>` : ''}
            </div>`;
        }

        // Enemy / Monster
        const pct = (c.maxHp || 0) > 0 ? Math.round(((c.hp ?? c.maxHp) / c.maxHp) * 100) : 0;
        const hp  = c.hp ?? c.maxHp ?? 0;
        return `<div class="enc-card${isActive ? ' enc-card--active' : ''}">
            <div class="enc-card-row">
                <span class="enc-init-badge">${c.initiative}</span>
                <span class="enc-type-badge enc-type--enemy">Enemy</span>
                <span class="enc-name">${c.name}</span>
                <div class="enc-hp-row">
                    <button class="step-action-btn" data-enc-action="dec5" data-enc-id="${c.id}">−5</button>
                    <button class="step-action-btn" data-enc-action="dec"  data-enc-id="${c.id}">−</button>
                    <span class="enc-hp">${hp}<span class="enc-hp-max">/${c.maxHp ?? 0}</span></span>
                    <button class="step-action-btn" data-enc-action="inc"  data-enc-id="${c.id}">+</button>
                    <button class="step-action-btn" style="color:#ff6060" data-enc-action="remove" data-enc-id="${c.id}">✕</button>
                </div>
            </div>
            <div class="enc-hp-bar-track"><div class="enc-hp-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-enc-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id     = btn.dataset.encId;
            const action = btn.dataset.encAction;
            const c = nar.encounter.find(x => x.id === id);
            if (!c && action !== 'remove') return;
            if (action === 'dec')    c.hp = Math.max(0, (c.hp ?? c.maxHp) - 1);
            if (action === 'dec5')   c.hp = Math.max(0, (c.hp ?? c.maxHp) - 5);
            if (action === 'inc')    c.hp = Math.min(c.maxHp, (c.hp ?? c.maxHp) + 1);
            if (action === 'remove') nar.encounter = nar.encounter.filter(x => x.id !== id);
            saveNar(); renderEncounter();
        });
    });
}

// Type select: show/hide relevant fields
document.getElementById('enc-type-select')?.addEventListener('change', function () {
    const type = this.value;
    document.getElementById('enc-subtype-field').hidden  = type !== 'event';
    document.getElementById('enc-hp-field').hidden       = type !== 'enemy';
    document.getElementById('enc-note-field').hidden     = type !== 'event';
    document.getElementById('enc-hidden-field').hidden   = type !== 'event';
});

document.getElementById('btn-add-creature')?.addEventListener('click', function() {
    const name = document.getElementById('enc-name-input')?.value.trim();
    if (!name) return;
    const type    = document.getElementById('enc-type-select')?.value || 'enemy';
    const init    = parseInt(document.getElementById('enc-init-input')?.value || '0', 10);
    const entry   = { id: crypto.randomUUID(), name, type, initiative: init };

    if (type === 'enemy') {
        const hp = parseInt(document.getElementById('enc-hp-input')?.value || '10', 10);
        entry.hp = hp; entry.maxHp = hp;
    }
    if (type === 'event') {
        entry.subType = document.getElementById('enc-subtype-select')?.value || 'custom';
        entry.note    = document.getElementById('enc-note-input')?.value.trim() || '';
        entry.hidden  = document.getElementById('enc-hidden-check')?.checked || false;
    }

    nar.encounter.push(entry);
    document.getElementById('enc-name-input').value  = '';
    document.getElementById('enc-hp-input').value    = '10';
    document.getElementById('enc-init-input').value  = '0';
    document.getElementById('enc-note-input').value  = '';
    if (document.getElementById('enc-hidden-check')) document.getElementById('enc-hidden-check').checked = false;
    saveNar(); renderEncounter(); closeForm(this);
});

document.getElementById('btn-next-turn')?.addEventListener('click', () => {
    const sorted = sortedEncounter();
    if (!sorted.length) return;
    nar.turnIndex++;
    if (nar.turnIndex >= sorted.length) { nar.turnIndex = 0; nar.round++; }
    saveNar(); renderEncounter();
});

document.getElementById('btn-clear-encounter')?.addEventListener('click', () => {
    nar.encounter = []; nar.turnIndex = 0; nar.round = 1;
    saveNar(); renderEncounter();
});

// ── END SESSION ───────────────────────────────────────────────────────────────

async function endSession() {
    const arc  = window.__arc;
    const code = currentRoomCode;
    if (!code || !arc?.db) return;

    if (!confirm(`End session ${code}? This removes all players from the room.`)) return;

    try {
        // Mark room closed
        await arc.updateDoc(arc.doc(arc.db, 'rooms', code), { status: 'closed' });

        // Delete all player docs in batch
        const playerSnap = await arc.getDocs(arc.collection(arc.db, 'rooms', code, 'players'));
        if (!playerSnap.empty) {
            const batch = arc.writeBatch(arc.db);
            playerSnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    } catch(e) { console.error('[ARC] endSession failed:', e); }

    // Clean up narrator side
    if (partyUnsubscribe)  { partyUnsubscribe();  partyUnsubscribe  = null; }
    if (lootUnsubscribe)   { lootUnsubscribe();   lootUnsubscribe   = null; }
    if (roomUnsubscribe)   { roomUnsubscribe();   roomUnsubscribe   = null; }
    if (chatUnsubscribe)   { chatUnsubscribe();   chatUnsubscribe   = null; }

    currentRoomCode = null;
    localStorage.removeItem('arc-narrator-room');
    fbPlayers = []; fbLoot = []; fbGold = 0; fbSharedChat = [];

    // Reset UI
    const badge   = document.getElementById('room-code-badge');
    const goldRow = document.getElementById('party-gold-row');
    const invite  = document.getElementById('btn-invite');
    if (badge)   { badge.hidden = true; badge.textContent = ''; }
    if (goldRow) goldRow.hidden = true;
    if (invite)  invite.textContent = 'Invite';

    renderParty(); renderInventory(); renderNarChat();
}

// ── JOURNAL ───────────────────────────────────────────────────────────────────

function migrateOldNotes() {
    if (nar.notes && nar.sessions.length === 0) {
        nar.sessions.push({ id: crypto.randomUUID(), title: 'Previous Notes', date: '', notes: nar.notes });
        nar.notes = '';
    }
}

function stat(val) { return val != null && val !== '' ? val : '—'; }

// ── Journal: NPCs ──

function renderJournalNpcs() {
    const el = document.getElementById('journal-npc-list');
    if (!el) return;
    if (!nar.journalNpcs.length) { el.innerHTML = '<p class="empty-hint">No saved NPCs.</p>'; return; }
    el.innerHTML = nar.journalNpcs.map((n, i) => `
        <div class="jrow" id="jnpc-${n.id}">
            <span class="jrow-num">N${i + 1}</span>
            <span class="jrow-name">${n.name}</span>
            <span class="jrow-stat">${stat(n.pl)}</span>
            <span class="jrow-stat">${stat(n.phys)}</span>
            <span class="jrow-stat">${stat(n.ment)}</span>
            <span class="jrow-stat">${stat(n.hp)}</span>
            <button class="jrow-view-btn" data-jnpc-toggle="${n.id}">V</button>
        </div>
        <div class="jrow-detail" id="jnpc-det-${n.id}" hidden>
            ${n.notes      ? `<div class="jrow-det-row"><span class="gen-npc-label">Notes</span><span>${n.notes}</span></div>` : ''}
            ${n.equipment  ? `<div class="jrow-det-row"><span class="gen-npc-label">Equipment</span><span>${n.equipment}</span></div>` : ''}
            ${n.narratorNotes ? `<div class="jrow-det-row"><span class="gen-npc-label">Narrator</span><span>${n.narratorNotes}</span></div>` : ''}
            <button class="gen-mon-remove" style="margin-top:4px" data-jnpc-remove="${n.id}">Remove</button>
        </div>`).join('');

    el.querySelectorAll('[data-jnpc-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const det = document.getElementById(`jnpc-det-${btn.dataset.jnpcToggle}`);
            if (det) det.hidden = !det.hidden;
        });
    });
    el.querySelectorAll('[data-jnpc-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            nar.journalNpcs = nar.journalNpcs.filter(x => x.id !== btn.dataset.jnpcRemove);
            saveNar(); renderJournalNpcs();
        });
    });
}

document.getElementById('btn-add-jnpc')?.addEventListener('click', function() {
    const name = document.getElementById('jnpc-name')?.value.trim();
    if (!name) return;
    nar.journalNpcs.push({
        id: crypto.randomUUID(), name,
        pl:   document.getElementById('jnpc-pl')?.value   || '',
        phys: document.getElementById('jnpc-phys')?.value || '',
        ment: document.getElementById('jnpc-ment')?.value || '',
        hp:   document.getElementById('jnpc-hp')?.value   || '',
        notes:         document.getElementById('jnpc-notes')?.value.trim() || '',
        equipment:     document.getElementById('jnpc-equip')?.value.trim() || '',
        narratorNotes: document.getElementById('jnpc-nar')?.value.trim()   || '',
    });
    ['jnpc-name','jnpc-pl','jnpc-phys','jnpc-ment','jnpc-hp','jnpc-notes','jnpc-equip','jnpc-nar'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    saveNar(); renderJournalNpcs(); closeForm(this);
});

// ── Journal: Monsters ──

function renderJournalMonsters() {
    const el = document.getElementById('journal-monster-list');
    if (!el) return;
    if (!nar.journalMonsters.length) { el.innerHTML = '<p class="empty-hint">No saved monsters.</p>'; return; }
    el.innerHTML = nar.journalMonsters.map((m, i) => `
        <div class="jrow" id="jmon-${m.id}">
            <span class="jrow-num">M${i + 1}</span>
            <span class="jrow-name">${m.name}</span>
            <span class="jrow-stat">${stat(m.pl)}</span>
            <span class="jrow-stat">${stat(m.phys)}</span>
            <span class="jrow-stat">${stat(m.ment)}</span>
            <span class="jrow-stat">${stat(m.hp)}</span>
            <button class="jrow-view-btn" data-jmon-toggle="${m.id}">V</button>
        </div>
        <div class="jrow-detail" id="jmon-det-${m.id}" hidden>
            ${m.note      ? `<div class="jrow-det-row"><span class="gen-npc-label">Note</span><span>${m.note}</span></div>` : ''}
            ${m.equipment ? `<div class="jrow-det-row"><span class="gen-npc-label">Equipment</span><span>${m.equipment}</span></div>` : ''}
            <button class="gen-mon-remove" style="margin-top:4px" data-jmon-remove="${m.id}">Remove</button>
        </div>`).join('');

    el.querySelectorAll('[data-jmon-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const det = document.getElementById(`jmon-det-${btn.dataset.jmonToggle}`);
            if (det) det.hidden = !det.hidden;
        });
    });
    el.querySelectorAll('[data-jmon-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            nar.journalMonsters = nar.journalMonsters.filter(x => x.id !== btn.dataset.jmonRemove);
            saveNar(); renderJournalMonsters();
        });
    });
}

document.getElementById('btn-add-jmon')?.addEventListener('click', function() {
    const name = document.getElementById('jmon-name')?.value.trim();
    if (!name) return;
    nar.journalMonsters.push({
        id: crypto.randomUUID(), name,
        pl:   document.getElementById('jmon-pl')?.value   || '',
        phys: document.getElementById('jmon-phys')?.value || '',
        ment: document.getElementById('jmon-ment')?.value || '',
        hp:   document.getElementById('jmon-hp')?.value   || '',
        note:      document.getElementById('jmon-note')?.value.trim()  || '',
        equipment: document.getElementById('jmon-equip')?.value.trim() || '',
    });
    ['jmon-name','jmon-pl','jmon-phys','jmon-ment','jmon-hp','jmon-note','jmon-equip'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    saveNar(); renderJournalMonsters(); closeForm(this);
});

// ── Journal: Quest Log ──

function renderQuestLog() {
    const el = document.getElementById('journal-quest-list');
    if (!el) return;
    if (!nar.questLog.length) { el.innerHTML = '<p class="empty-hint">No quests tracked.</p>'; return; }
    el.innerHTML = nar.questLog.map(q => `
        <div class="jquest-row">
            <input type="checkbox" class="jquest-check" data-qid="${q.id}" ${q.done ? 'checked' : ''} />
            <span class="jquest-text${q.done ? ' jquest-done' : ''}">${q.text}</span>
            <button class="gen-mon-remove" data-quest-remove="${q.id}">✕</button>
        </div>`).join('');

    el.querySelectorAll('.jquest-check').forEach(cb => {
        cb.addEventListener('change', () => {
            const q = nar.questLog.find(x => x.id === cb.dataset.qid);
            if (q) { q.done = cb.checked; saveNar(); renderQuestLog(); }
        });
    });
    el.querySelectorAll('[data-quest-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            nar.questLog = nar.questLog.filter(x => x.id !== btn.dataset.questRemove);
            saveNar(); renderQuestLog();
        });
    });
}

document.getElementById('btn-add-jquest')?.addEventListener('click', function() {
    const text = document.getElementById('jquest-text')?.value.trim();
    if (!text) return;
    nar.questLog.push({ id: crypto.randomUUID(), text, done: false });
    document.getElementById('jquest-text').value = '';
    saveNar(); renderQuestLog(); closeForm(this);
});

// ── Journal: Sessions ──

function renderSessions() {
    const el = document.getElementById('journal-session-list');
    if (!el) return;
    if (!nar.sessions.length) { el.innerHTML = '<p class="empty-hint">No sessions recorded.</p>'; return; }
    el.innerHTML = nar.sessions.map(s => `
        <div class="jsess-card">
            <div class="jsess-head">
                <span class="jsess-title">${s.title || 'Untitled Session'}</span>
                <span class="jsess-date">${s.date || ''}</span>
                <button class="jrow-view-btn" data-sess-toggle="${s.id}">V</button>
                <button class="gen-mon-remove" data-sess-remove="${s.id}">✕</button>
            </div>
            <div class="jsess-notes" id="jsess-notes-${s.id}" hidden>${s.notes ? s.notes.replace(/\n/g,'<br>') : ''}</div>
        </div>`).join('');

    el.querySelectorAll('[data-sess-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const det = document.getElementById(`jsess-notes-${btn.dataset.sessToggle}`);
            if (det) det.hidden = !det.hidden;
        });
    });
    el.querySelectorAll('[data-sess-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            nar.sessions = nar.sessions.filter(x => x.id !== btn.dataset.sessRemove);
            saveNar(); renderSessions();
        });
    });
}

document.getElementById('btn-add-jsess')?.addEventListener('click', function() {
    const title = document.getElementById('jsess-title')?.value.trim() || 'Untitled Session';
    const date  = document.getElementById('jsess-date')?.value  || '';
    const notes = document.getElementById('jsess-notes')?.value || '';
    nar.sessions.push({ id: crypto.randomUUID(), title, date, notes });
    ['jsess-title','jsess-date','jsess-notes'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    saveNar(); renderSessions(); closeForm(this);
});

// ── STICKY ROLL BAR ───────────────────────────────────────────────────────────

function rollD20(mod, type) {
    const r1 = Math.ceil(Math.random() * 20);
    let roll = r1;
    if (type === 'adv') { const r2 = Math.ceil(Math.random() * 20); roll = Math.max(r1, r2); }
    if (type === 'dis') { const r2 = Math.ceil(Math.random() * 20); roll = Math.min(r1, r2); }
    return { roll, total: roll + mod };
}


// Dice roll button
document.getElementById('btn-nar-dice-roll')?.addEventListener('click', () => {
    const sides = parseInt(document.getElementById('nar-dice-type')?.value  || '20', 10);
    const count = Math.max(1, parseInt(document.getElementById('nar-dice-count')?.value || '1', 10));
    const bonus = parseInt(document.getElementById('nar-dice-bonus')?.value || '0', 10);
    const rolls  = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
    const total  = rolls.reduce((s, r) => s + r, 0) + bonus;
    const sidesLabel = sides === 100 ? '%' : sides;
    const label  = `${count}d${sidesLabel}${bonus !== 0 ? (bonus > 0 ? '+' + bonus : bonus) : ''}`;
    const note   = count > 1 ? `[${rolls.join('+')}]${bonus !== 0 ? (bonus > 0 ? '+' + bonus : bonus) : ''}` : (bonus !== 0 ? String(bonus > 0 ? '+' + bonus : bonus) : '');
    const resultEl = document.getElementById('nar-roll-result');
    if (resultEl) {
        resultEl.hidden    = false;
        resultEl.className = 'nar-roll-result';
        resultEl.innerHTML = `
            <div class="nar-roll-label">${label}</div>
            <div class="nar-roll-num">${total}</div>
            ${note ? `<div class="nar-roll-sub">${note}</div>` : ''}
        `;
    }
    postToSharedChat({ type: 'dice', label, total, rolls, bonus: 0, notation: label });
});

// ── GENERATORS: MONSTER ───────────────────────────────────────────────────────

let GEN_MONSTERS    = [];
let monstersLoaded  = false;

async function ensureMonsters() {
    if (monstersLoaded) return;
    try {
        const res = await fetch('../data/monsterbook.json');
        GEN_MONSTERS = await res.json();
        monstersLoaded = true;
        renderGenMonsterList();
    } catch(e) { console.error('Failed to load monsterbook.json', e); }
}

function monsterHp(m) { return (m.pl ?? 1) * 5; }

function getMonster(name) { return GEN_MONSTERS.find(m => m.name === name) || null; }

function addGenMonster(name) {
    if (!name) return;
    if (!nar.genMonsters.includes(name)) nar.genMonsters.push(name);
    saveNar(); renderGenMonsterList();
}

function removeGenMonster(name) {
    nar.genMonsters = nar.genMonsters.filter(n => n !== name);
    saveNar(); renderGenMonsterList();
}

function renderGenMonsterList() {
    const el = document.getElementById('gen-mon-list');
    if (!el) return;

    if (!nar.genMonsters.length) {
        el.innerHTML = '<p class="empty-hint">No monsters added. Search or tap Random.</p>';
        return;
    }

    el.innerHTML = nar.genMonsters.map((name, i) => {
        const m = getMonster(name);
        if (!m) return `<div class="gen-mon-card">
            <div class="gen-mon-head">
                <div class="gen-mon-info"><span class="gen-mon-name">${name}</span></div>
                <button class="gen-mon-remove" data-remove="${name}">✕</button>
            </div></div>`;

        const hp  = monsterHp(m);
        const cid = `gmc-${i}`;

        const moveParts = [
            m.walk  && `Walk ${m.walk}`,
            m.fly   && `Fly ${m.fly}`,
            m.swim  && `Swim ${m.swim}`,
            m.climb && `Climb ${m.climb}`,
        ].filter(Boolean);

        const meleeAtk  = m.melee_attack  || m.melee  || null;
        const rangedAtk = m.ranged_attack || m.ranged || null;
        const fmtAtk = (atk, label) => {
            if (!atk?.name) return '';
            const dmg = [atk.damage, atk.damage_type || atk.type].filter(Boolean).join(' ');
            return `<div class="gen-mon-atk"><span class="gen-mon-atk-label">${label}</span> ${atk.name}${dmg ? ' — ' + dmg : ''}</div>`;
        };

        // Main feature + additional features[]
        const allFeats = [];
        if (m.feature_name) allFeats.push({ name: m.feature_name, type: m.feature_type || '', range: m.feature_range || '', effect: m.feature_effect || '' });
        if (Array.isArray(m.features)) m.features.forEach(f => {
            if (f.name && f.name !== m.feature_name) allFeats.push({ name: f.name, type: f.type || '', range: f.range || '', effect: f.effect || '' });
        });

        const featsHtml = allFeats.map(f => `
            <div class="gen-mon-feature">
                <div class="gen-mon-feature-head">
                    <span class="gen-mon-feature-name">${f.name}</span>
                    <span class="gen-mon-feature-type">${[f.type, f.range].filter(Boolean).join(' · ')}</span>
                </div>
                <p class="gen-mon-feature-effect">${f.effect}</p>
            </div>`).join('');

        return `<div class="gen-mon-card" id="${cid}">
            <div class="gen-mon-head">
                <div class="gen-mon-info">
                    <span class="gen-mon-name">${m.name}</span>
                    <span class="gen-mon-group">${m._group || m.origin || ''}</span>
                </div>
                <div class="gen-mon-stats">
                    <span>PL <strong>${m.pl ?? '—'}</strong></span>
                    <span>HP <strong>${hp}</strong></span>
                    <span>Ph <strong>${m.check_physical ?? 0}</strong></span>
                    <span>Mt <strong>${m.check_mental ?? 0}</strong></span>
                </div>
                <div class="gen-mon-card-btns">
                    <button class="gen-mon-toggle" data-cid="${cid}">▾</button>
                    <button class="gen-mon-remove" data-remove="${m.name}">✕</button>
                </div>
            </div>
            <div class="gen-mon-expanded" id="${cid}-exp" hidden>
                <div class="gen-mon-meta">${[m.size, m.origin, m.rarity, m.environment, m.behavior].filter(Boolean).join(' · ')}</div>
                ${m.motivation ? `<div class="gen-mon-motivation">Motivation: ${m.motivation}</div>` : ''}
                ${moveParts.length ? `<div class="gen-mon-move">${moveParts.join(' / ')}</div>` : ''}
                ${m.description ? `<div class="gen-mon-desc">${m.description}</div>` : ''}
                ${featsHtml}
                <div class="gen-mon-attacks">${fmtAtk(meleeAtk, 'Melee')}${fmtAtk(rangedAtk, 'Ranged')}</div>
                <button class="done-btn" data-add-init="${m.name}" data-hp="${hp}">+ Add to Initiative</button>
            </div>
        </div>`;
    }).join('');

    el.querySelectorAll('.gen-mon-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const exp = document.getElementById(btn.dataset.cid + '-exp');
            if (!exp) return;
            exp.hidden = !exp.hidden;
            btn.textContent = exp.hidden ? '▾' : '▴';
        });
    });

    el.querySelectorAll('.gen-mon-remove').forEach(btn => {
        btn.addEventListener('click', () => removeGenMonster(btn.dataset.remove));
    });

    el.querySelectorAll('[data-add-init]').forEach(btn => {
        btn.addEventListener('click', () => {
            const hp = parseInt(btn.dataset.hp, 10);
            nar.encounter.push({ id: crypto.randomUUID(), name: btn.dataset.addInit, hp, maxHp: hp, initiative: 0 });
            saveNar(); renderEncounter();
            setActivePanel('initiative');
        });
    });
}

// Search
document.getElementById('gen-mon-search')?.addEventListener('input', function () {
    const q       = this.value.trim().toLowerCase();
    const resultsEl = document.getElementById('gen-mon-results');
    if (!resultsEl) return;
    if (!q || !GEN_MONSTERS.length) { resultsEl.hidden = true; return; }

    const matches = GEN_MONSTERS.filter(m => m.name.toLowerCase().includes(q)).slice(0, 8);
    if (!matches.length) { resultsEl.hidden = true; return; }

    resultsEl.hidden = false;
    resultsEl.innerHTML = matches.map(m =>
        `<button class="gen-search-result" data-name="${m.name}">
            <span class="gen-search-name">${m.name}</span>
            <span class="gen-search-meta">${[m._group, `PL ${m.pl}`].filter(Boolean).join(' · ')}</span>
        </button>`
    ).join('');

    resultsEl.querySelectorAll('.gen-search-result').forEach(btn => {
        btn.addEventListener('click', () => {
            addGenMonster(btn.dataset.name);
            document.getElementById('gen-mon-search').value = '';
            resultsEl.hidden = true;
        });
    });
});

document.getElementById('btn-gen-mon-random')?.addEventListener('click', () => {
    if (!GEN_MONSTERS.length) { ensureMonsters(); return; }
    const m = GEN_MONSTERS[Math.floor(Math.random() * GEN_MONSTERS.length)];
    addGenMonster(m.name);
});

// ── GENERATORS: NPC & LOCATION ────────────────────────────────────────────────

let GEN_WORLD    = null;
let GEN_SPECIES  = null;
let worldLoaded  = false;

const LOYALTY_TABLE = ['Loyal', 'Friendly', 'Neutral', 'Wary', 'Suspicious', 'Hostile', 'Conflicted', 'Opportunistic'];

async function ensureWorld() {
    if (worldLoaded) return;
    try {
        const [world, species] = await Promise.all([
            fetch('../data/worldbuilding.json').then(r => r.json()),
            fetch('../data/species_new.json').then(r => r.json()),
        ]);
        GEN_WORLD   = world;
        GEN_SPECIES = species;
        worldLoaded = true;
        renderGenNpcList();
        renderGenLocList();
    } catch(e) { console.error('Failed to load world data', e); }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function rarityWeight(s) {
    switch ((s.rarity || '').toLowerCase()) {
        case 'common':    return 30;
        case 'uncommon':  return 16;
        case 'rare':      return 8;
        case 'very rare': return 4;
        case 'legendary': return 2;
        case 'unique':    return 1;
        default:          return 5;
    }
}

function weightedPick(list, weightFn) {
    const pool = [];
    list.forEach(item => { for (let i = 0; i < Math.floor(weightFn(item) * 10); i++) pool.push(item); });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : pick(list);
}

function genNpcName() {
    const n = GEN_WORLD.names;
    let name = pick(n.start) + pick(n.core) + pick(n.end);
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatSpeciesName(s) {
    const name   = s.name    || 'Unknown';
    const lineage = s.lineage || '';
    const option  = s.option  || '';
    if (option && lineage) return `${option.charAt(0).toUpperCase() + option.slice(1)} ${name}`;
    if (lineage && lineage.toLowerCase() !== name.toLowerCase()) return `${lineage.charAt(0).toUpperCase() + lineage.slice(1)} ${name}`;
    return name;
}

function generateNpc() {
    if (!GEN_WORLD || !GEN_SPECIES) return null;
    const species = weightedPick(GEN_SPECIES.species, rarityWeight);
    let speciesName = formatSpeciesName(species);
    if (['kobari','drakonari'].includes(species.name?.toLowerCase()) && GEN_SPECIES.dragonTypes?.length) {
        speciesName += ` (${pick(GEN_SPECIES.dragonTypes).name})`;
    }
    const affinity = pick(GEN_WORLD.affinities);
    const habitat  = pick(GEN_WORLD.habitats);
    return {
        id:         crypto.randomUUID(),
        name:       genNpcName(),
        species:    speciesName,
        faction:    affinity,
        habitat,
        religion:   pick(GEN_WORLD.gods),
        item:       pick(GEN_WORLD.signatureItems),
        motivation: pick(GEN_WORLD.motivations),
        loyalty:    pick(LOYALTY_TABLE),
    };
}

function generateLocation() {
    if (!GEN_WORLD) return null;
    return {
        id:       crypto.randomUUID(),
        location: pick(GEN_WORLD.locations),
        area:     pick(GEN_WORLD.habitats),
        person:   pick(GEN_WORLD.people),
        conflict: pick(GEN_WORLD.conflicts),
        object:   pick(GEN_WORLD.objects),
    };
}

function npcToJournalText(n) {
    return `\n--- NPC: ${n.name} ---\nSpecies: ${n.species}\nFaction: ${n.faction} from ${n.habitat}\nReligion: ${n.religion}\nItem: ${n.item}\nMotivation: ${n.motivation}\nLoyalty: ${n.loyalty}\n`;
}

function locationToJournalText(l) {
    return `\n--- Location: ${l.location} ---\nArea: ${l.area}\nPerson: ${l.person}\nConflict: ${l.conflict}\nObject: ${l.object}\n`;
}

function saveNpcToJournal(n) {
    nar.journalNpcs.push({
        id: crypto.randomUUID(),
        name:          n.name,
        pl: '', phys: '', ment: '', hp: '',
        notes:         `${n.species} · ${n.faction}`,
        equipment:     n.item || '',
        narratorNotes: `${n.motivation} · ${n.loyalty}`,
    });
    saveNar(); renderJournalNpcs();
    setActivePanel('journal');
}

function appendToJournal(text) {
    nar.sessions.push({ id: crypto.randomUUID(), title: 'Generator Note', date: '', notes: text.trim() });
    saveNar(); renderSessions();
}

function renderGenNpcList() {
    const el = document.getElementById('gen-npc-list');
    if (!el) return;
    if (!nar.genNpcs.length) {
        el.innerHTML = '<p class="empty-hint">Tap Generate to create an NPC.</p>';
        return;
    }
    el.innerHTML = nar.genNpcs.map(n => `
        <div class="gen-npc-card" id="gnpc-${n.id}">
            <div class="gen-npc-head">
                <div class="gen-npc-info">
                    <span class="gen-npc-name">${n.name}</span>
                    <span class="gen-npc-species">${n.species}</span>
                </div>
                <div class="gen-npc-tags">
                    <span class="gen-npc-faction">${n.faction}</span>
                    <span class="gen-npc-loyalty">${n.loyalty}</span>
                </div>
                <div class="gen-npc-btns">
                    <button class="gen-mon-toggle" data-npc-toggle="${n.id}">▾</button>
                    <button class="gen-npc-journal" data-npc-id="${n.id}" title="Save to Journal">＋J</button>
                    <button class="gen-mon-remove" data-npc-remove="${n.id}">✕</button>
                </div>
            </div>
            <div class="gen-npc-expanded" id="gnpc-exp-${n.id}" hidden>
                <div class="gen-npc-row"><span class="gen-npc-label">Religion</span><span>${n.religion}</span></div>
                <div class="gen-npc-row"><span class="gen-npc-label">From</span><span>${n.habitat}</span></div>
                <div class="gen-npc-row"><span class="gen-npc-label">Item</span><span>${n.item}</span></div>
                <div class="gen-npc-row"><span class="gen-npc-label">Motivation</span><span>${n.motivation}</span></div>
            </div>
        </div>`).join('');

    el.querySelectorAll('[data-npc-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const exp = document.getElementById(`gnpc-exp-${btn.dataset.npcToggle}`);
            if (!exp) return;
            exp.hidden = !exp.hidden;
            btn.textContent = exp.hidden ? '▾' : '▴';
        });
    });
    el.querySelectorAll('[data-npc-journal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = nar.genNpcs.find(x => x.id === btn.dataset.npcId);
            if (n) saveNpcToJournal(n);
        });
    });
    el.querySelectorAll('[data-npc-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            nar.genNpcs = nar.genNpcs.filter(x => x.id !== btn.dataset.npcRemove);
            saveNar(); renderGenNpcList();
        });
    });
}

function renderGenLocList() {
    const el = document.getElementById('gen-loc-list');
    if (!el) return;
    if (!nar.genLocations.length) {
        el.innerHTML = '<p class="empty-hint">Tap Generate to create a location.</p>';
        return;
    }
    el.innerHTML = nar.genLocations.map(l => `
        <div class="gen-npc-card">
            <div class="gen-npc-head">
                <div class="gen-npc-info">
                    <span class="gen-npc-name">${l.location}</span>
                    <span class="gen-npc-species">${l.area}</span>
                </div>
                <div class="gen-npc-btns">
                    <button class="gen-mon-toggle" data-loc-toggle="${l.id}">▾</button>
                    <button class="gen-npc-journal" data-loc-id="${l.id}" title="Save to Journal">＋J</button>
                    <button class="gen-mon-remove" data-loc-remove="${l.id}">✕</button>
                </div>
            </div>
            <div class="gen-npc-expanded" id="gloc-exp-${l.id}" hidden>
                <div class="gen-npc-row"><span class="gen-npc-label">Person</span><span>${l.person}</span></div>
                <div class="gen-npc-row"><span class="gen-npc-label">Conflict</span><span>${l.conflict}</span></div>
                <div class="gen-npc-row"><span class="gen-npc-label">Object</span><span>${l.object}</span></div>
            </div>
        </div>`).join('');

    el.querySelectorAll('[data-loc-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const exp = document.getElementById(`gloc-exp-${btn.dataset.locToggle}`);
            if (!exp) return;
            exp.hidden = !exp.hidden;
            btn.textContent = exp.hidden ? '▾' : '▴';
        });
    });
    el.querySelectorAll('[data-loc-journal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const l = nar.genLocations.find(x => x.id === btn.dataset.locId);
            if (l) appendToJournal(locationToJournalText(l));
        });
    });
    el.querySelectorAll('[data-loc-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            nar.genLocations = nar.genLocations.filter(x => x.id !== btn.dataset.locRemove);
            saveNar(); renderGenLocList();
        });
    });
}

// NPC Gen sub-tabs
let npcActiveTab = 'npc';
document.getElementById('npc-gen-seg')?.querySelectorAll('[data-npc-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        npcActiveTab = btn.dataset.npcTab;
        document.getElementById('npc-gen-seg').querySelectorAll('[data-npc-tab]').forEach(b =>
            b.classList.toggle('is-sel', b === btn));
        document.getElementById('gen-npc-panel').hidden = (npcActiveTab !== 'npc');
        document.getElementById('gen-loc-panel').hidden = (npcActiveTab !== 'location');
    });
});

document.getElementById('btn-gen-npc')?.addEventListener('click', () => {
    if (!worldLoaded) { ensureWorld(); return; }
    if (npcActiveTab === 'npc') {
        const npc = generateNpc();
        if (npc) { nar.genNpcs.unshift(npc); saveNar(); renderGenNpcList(); }
    } else {
        const loc = generateLocation();
        if (loc) { nar.genLocations.unshift(loc); saveNar(); renderGenLocList(); }
    }
});

// ── GENERATORS: QUEST ─────────────────────────────────────────────────────────

let GEN_QUEST  = null;
let GEN_TRAPS  = null;
let questLoaded = false;

async function ensureQuest() {
    if (questLoaded) return;
    try {
        const [quest, traps] = await Promise.all([
            fetch('../data/quest.json').then(r => r.json()),
            fetch('../data/traps.json').then(r => r.json()),
        ]);
        const byType = (arr, type) => arr.filter(x => x.type === type);
        GEN_QUEST = {
            givers:  byType(quest, 'giver'),
            targets: byType(quest, 'target'),
            twists:  byType(quest, 'twist'),
            rewards: byType(quest, 'reward'),
        };
        GEN_TRAPS = {
            doors: byType(traps, 'door'),
            locks: byType(traps, 'lock'),
            traps: byType(traps, 'trap'),
        };
        questLoaded = true;
        renderGenQuestList(); renderGenDungeonList(); renderGenRoomsList();
    } catch(e) { console.error('Failed to load quest/traps data', e); }
}

function generateQuest() {
    if (!GEN_QUEST) return null;
    return {
        id:     crypto.randomUUID(),
        giver:  pick(GEN_QUEST.givers).text,
        target: pick(GEN_QUEST.targets).text,
        twist:  pick(GEN_QUEST.twists).text,
        reward: pick(GEN_QUEST.rewards).text,
    };
}

function generateDungeon() {
    if (!GEN_TRAPS) return null;
    const door = pick(GEN_TRAPS.doors);
    const lock = pick(GEN_TRAPS.locks);
    const trap = Math.random() < 0.6 ? pick(GEN_TRAPS.traps) : null;
    return { id: crypto.randomUUID(), door: door.text, lockName: lock.name, lockKey: lock.key, lockHint: lock.hint, trap };
}

function generateRoom() {
    if (!GEN_WORLD) return null;
    return {
        id:       crypto.randomUUID(),
        location: pick(GEN_WORLD.locations),
        object:   pick(GEN_WORLD.objects),
        person:   pick(GEN_WORLD.people),
        conflict: pick(GEN_WORLD.conflicts),
    };
}

function questToJournalText(q) {
    return `\n--- Quest ---\nGiver: ${q.giver}\nTarget: ${q.target}\nTwist: ${q.twist}\nReward: ${q.reward}\n`;
}

function makeGenCard(rows, onRemove, onJournal) {
    const id = crypto.randomUUID();
    return { id, rows, onRemove, onJournal };
}

function renderQuestCards(listId, items, rowsFn, journalFn) {
    const el = document.getElementById(listId);
    if (!el) return;
    if (!items.length) {
        el.innerHTML = '<p class="empty-hint">Tap Generate.</p>';
        return;
    }
    el.innerHTML = items.map(item => {
        const rows = rowsFn(item);
        return `<div class="gen-quest-card">
            <div class="gen-quest-rows">
                ${rows.map(([label, val]) => `
                <div class="gen-npc-row">
                    <span class="gen-npc-label">${label}</span>
                    <span>${val}</span>
                </div>`).join('')}
            </div>
            <div class="gen-quest-actions">
                ${journalFn ? `<button class="gen-npc-journal" data-item-id="${item.id}" data-journal="1">＋J</button>` : ''}
                <button class="gen-mon-remove" data-item-remove="${item.id}">✕</button>
            </div>
        </div>`;
    }).join('');

    if (journalFn) {
        el.querySelectorAll('[data-journal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = items.find(x => x.id === btn.dataset.itemId);
                if (item) appendToJournal(journalFn(item));
            });
        });
    }
    el.querySelectorAll('[data-item-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.itemRemove;
            if (listId === 'gen-quest-list')   { nar.genQuests   = nar.genQuests.filter(x => x.id !== id);   saveNar(); renderGenQuestList(); }
            if (listId === 'gen-dungeon-list') { nar.genDungeons = nar.genDungeons.filter(x => x.id !== id); saveNar(); renderGenDungeonList(); }
            if (listId === 'gen-rooms-list')   { nar.genRooms    = nar.genRooms.filter(x => x.id !== id);    saveNar(); renderGenRoomsList(); }
        });
    });
}

function renderGenQuestList() {
    renderQuestCards('gen-quest-list', nar.genQuests,
        q => [['Giver', q.giver], ['Target', q.target], ['Twist', q.twist], ['Reward', q.reward]],
        questToJournalText);
}

function renderGenDungeonList() {
    renderQuestCards('gen-dungeon-list', nar.genDungeons,
        d => [
            ['Door', d.door],
            ['Lock', `${d.lockName} — ${d.lockKey}`],
            ['Hint', d.lockHint],
            ...(d.trap ? [['Trap', `${d.trap.name} (${d.trap.dmg})`], ['Effect', d.trap.effect]] : []),
        ],
        null);
}

function renderGenRoomsList() {
    renderQuestCards('gen-rooms-list', nar.genRooms,
        r => [['Room', r.location], ['Object', r.object], ['Person', r.person], ['Hook', r.conflict]],
        r => `\n--- Room ---\n${r.location}\nObject: ${r.object}\nPerson: ${r.person}\nHook: ${r.conflict}\n`);
}

// Quest sub-tab switching
let questActiveTab = 'quest';
document.getElementById('quest-gen-seg')?.querySelectorAll('[data-quest-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        questActiveTab = btn.dataset.questTab;
        document.getElementById('quest-gen-seg').querySelectorAll('[data-quest-tab]').forEach(b =>
            b.classList.toggle('is-sel', b === btn));
        document.getElementById('gen-quest-panel').hidden   = questActiveTab !== 'quest';
        document.getElementById('gen-dungeon-panel').hidden = questActiveTab !== 'dungeon';
        document.getElementById('gen-rooms-panel').hidden   = questActiveTab !== 'rooms';
    });
});

document.getElementById('btn-gen-quest')?.addEventListener('click', () => {
    if (questActiveTab === 'quest') {
        if (!questLoaded) { ensureQuest(); return; }
        const q = generateQuest();
        if (q) { nar.genQuests.unshift(q); saveNar(); renderGenQuestList(); }
    } else if (questActiveTab === 'dungeon') {
        if (!questLoaded) { ensureQuest(); return; }
        const d = generateDungeon();
        if (d) { nar.genDungeons.unshift(d); saveNar(); renderGenDungeonList(); }
    } else {
        if (!worldLoaded) { ensureWorld(); return; }
        const r = generateRoom();
        if (r) { nar.genRooms.unshift(r); saveNar(); renderGenRoomsList(); }
    }
});

// ── GENERATORS: COMMERCE ─────────────────────────────────────────────────────

let GEN_ITEMS    = null;
let GEN_ENCHGEN  = null;
let GEN_MEDICINE = null;
let commerceLoaded = false;

async function ensureCommerce() {
    if (commerceLoaded) return;
    try {
        const [items, enchgen, medicine] = await Promise.all([
            fetch('../data/items.json').then(r => r.json()),
            fetch('../data/enchantedgen.json').then(r => r.json()),
            fetch('../data/medicine.json').then(r => r.json()),
        ]);
        GEN_ITEMS = items;
        const byType = (arr, key, val) => arr.filter(x => (x.type || x.category) === val);
        GEN_ENCHGEN = {
            prefixes:    enchgen.filter(x => x.type === 'prefix').map(x => x.text),
            effects:     enchgen.filter(x => x.type === 'effect').map(x => x.text),
            damageTypes: enchgen.filter(x => x.type === 'damageType').map(x => x.text),
            checks:      enchgen.filter(x => x.type === 'check').map(x => x.text),
            itemTypes:   enchgen.filter(x => x.type === 'itemType').map(x => x.text),
        };
        GEN_MEDICINE = {
            prefixes:   medicine.filter(x => x.category === 'prefix').map(x => x.value),
            bases:      medicine.filter(x => x.category === 'base').map(x => x.value),
            suffixes:   medicine.filter(x => x.category === 'suffix').map(x => x.value),
            templates:  medicine.filter(x => x.category === 'desc_templates').map(x => x.value),
            flavors:    medicine.filter(x => x.category === 'flavor').map(x => x.value),
            makers:     medicine.filter(x => x.category === 'maker').map(x => x.value),
            places:     medicine.filter(x => x.category === 'place').map(x => x.value),
            symbols:    medicine.filter(x => x.category === 'symbol').map(x => x.value),
            effects:    medicine.filter(x => x.category === 'effects').map(x => x.value),
        };
        commerceLoaded = true;
        renderGenMundaneList(); renderGenEnchantedList(); renderGenMedicineList();
    } catch(e) { console.error('Failed to load commerce data', e); }
}

function generateMundane() {
    if (!GEN_ITEMS) return null;
    const item = pick(GEN_ITEMS);
    return { id: crypto.randomUUID(), ...item };
}

function generateEnchanted() {
    if (!GEN_ENCHGEN) return null;
    const prefix = pick(GEN_ENCHGEN.prefixes);
    const itemType = pick(GEN_ENCHGEN.itemTypes);
    let effect = pick(GEN_ENCHGEN.effects);
    effect = effect.replace('{type}', pick(GEN_ENCHGEN.damageTypes));
    effect = effect.replace('{check}', pick(GEN_ENCHGEN.checks));
    return { id: crypto.randomUUID(), name: `${prefix} ${itemType}`, effect };
}

function generateMedicine() {
    if (!GEN_MEDICINE) return null;
    const name = `${pick(GEN_MEDICINE.prefixes)} ${pick(GEN_MEDICINE.bases)} ${pick(GEN_MEDICINE.suffixes)}`;
    let desc = pick(GEN_MEDICINE.templates)
        .replace('{flavor}',  pick(GEN_MEDICINE.flavors))
        .replace('{maker}',   pick(GEN_MEDICINE.makers))
        .replace('{place}',   pick(GEN_MEDICINE.places))
        .replace('{symbol}',  pick(GEN_MEDICINE.symbols));
    const effect = pick(GEN_MEDICINE.effects);
    return { id: crypto.randomUUID(), name, desc, effect };
}

function renderCommerceList(listId, items, rowsFn, removeKey) {
    const el = document.getElementById(listId);
    if (!el) return;
    if (!items.length) { el.innerHTML = '<p class="empty-hint">Tap Generate to roll an item.</p>'; return; }
    el.innerHTML = items.map(item => `
        <div class="gen-quest-card">
            <div class="gen-quest-rows">${rowsFn(item).map(([label, val]) => `
                <div class="gen-npc-row">
                    <span class="gen-npc-label">${label}</span>
                    <span>${val}</span>
                </div>`).join('')}
            </div>
            <div class="gen-quest-actions">
                <button class="gen-mon-remove" data-com-remove="${item.id}" data-com-list="${removeKey}">✕</button>
            </div>
        </div>`).join('');
    el.querySelectorAll('[data-com-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.comRemove;
            if (btn.dataset.comList === 'mundane')   { nar.genMundane   = nar.genMundane.filter(x => x.id !== id);   saveNar(); renderGenMundaneList(); }
            if (btn.dataset.comList === 'enchanted') { nar.genEnchanted = nar.genEnchanted.filter(x => x.id !== id); saveNar(); renderGenEnchantedList(); }
            if (btn.dataset.comList === 'medicine')  { nar.genMedicine  = nar.genMedicine.filter(x => x.id !== id);  saveNar(); renderGenMedicineList(); }
        });
    });
}

function renderGenMundaneList() {
    renderCommerceList('gen-mundane-list', nar.genMundane, item => [
        ['Item', item.name],
        ['Type', item.category],
        ...(item.description ? [['Desc', item.description]] : []),
        ...(item.cost != null ? [['Cost', `${item.cost}g`]] : []),
        ...(item.bulk != null ? [['Bulk', item.bulk]] : []),
    ], 'mundane');
}

function renderGenEnchantedList() {
    renderCommerceList('gen-enchanted-list', nar.genEnchanted, item => [
        ['Item', item.name],
        ['Effect', item.effect],
    ], 'enchanted');
}

function renderGenMedicineList() {
    renderCommerceList('gen-medicine-list', nar.genMedicine, item => [
        ['Item', item.name],
        ['Desc', item.desc],
        ['Effect', item.effect],
    ], 'medicine');
}

// Commerce sub-tab switching
let commerceActiveTab = 'mundane';
document.getElementById('commerce-gen-seg')?.querySelectorAll('[data-com-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
        commerceActiveTab = btn.dataset.comTab;
        document.getElementById('commerce-gen-seg').querySelectorAll('[data-com-tab]').forEach(b =>
            b.classList.toggle('is-sel', b === btn));
        document.getElementById('gen-mundane-panel').hidden   = commerceActiveTab !== 'mundane';
        document.getElementById('gen-enchanted-panel').hidden = commerceActiveTab !== 'enchanted';
        document.getElementById('gen-medicine-panel').hidden  = commerceActiveTab !== 'medicine';
    });
});

document.getElementById('btn-gen-commerce')?.addEventListener('click', () => {
    if (!commerceLoaded) { ensureCommerce(); return; }
    if (commerceActiveTab === 'mundane') {
        const i = generateMundane();
        if (i) { nar.genMundane.unshift(i); saveNar(); renderGenMundaneList(); }
    } else if (commerceActiveTab === 'enchanted') {
        const i = generateEnchanted();
        if (i) { nar.genEnchanted.unshift(i); saveNar(); renderGenEnchantedList(); }
    } else {
        const i = generateMedicine();
        if (i) { nar.genMedicine.unshift(i); saveNar(); renderGenMedicineList(); }
    }
});

// ── GENERATORS: HEX ──────────────────────────────────────────────────────────

let GEN_HEX      = null;
let HEX_SPECIES  = null;
let hexLoaded    = false;

async function ensureHex() {
    if (hexLoaded) return;
    try {
        const [hex, sp] = await Promise.all([
            fetch('../data/hexgen.json').then(r => r.json()),
            fetch('../data/species_new.json').then(r => r.json()),
        ]);
        GEN_HEX     = hex;
        HEX_SPECIES = sp.species || [];
        hexLoaded   = true;
        renderGenHexList();
    } catch(e) { console.error('Failed to load hex data', e); }
}

const HEX_RARITY = { 'now':100,'common':30,'common below ground':20,'uncommon':16,'rare':8,'very rare':4,'legendary':2,'unique':1 };
function hexRarityW(s) { return HEX_RARITY[(s.rarity||'').toLowerCase()] || 5; }

function hexWeightedPick(arr, wFn) {
    const pool = [];
    arr.forEach(item => { const w = Math.floor((wFn ? wFn(item) : (item.weight||1)) * 10); for (let i=0;i<w;i++) pool.push(item); });
    return pool.length ? pool[Math.floor(Math.random()*pool.length)] : arr[Math.floor(Math.random()*arr.length)];
}

function hexPickUnique(arr, count) {
    const results = [], used = new Set();
    let tries = 0;
    while (results.length < count && tries < 50) {
        const p = hexWeightedPick(arr, i => i.weight || 1);
        if (!used.has(p.name)) { used.add(p.name); results.push(p.name); }
        tries++;
    }
    return results;
}

function hexPopCounts(pop) {
    if (pop.collapsed) return { features:2, resources:2, species:2, forceTemperament:'Collapsed' };
    const t = pop.tier || 0;
    const F=[0,1,1,2,2,3,3,4,4,5,5], R=[0,1,1,2,2,2,3,3,4,4,5], S=[0,1,1,2,2,3,3,4,4,5,5];
    const idx = Math.min(Math.max(t,0),10);
    return { features:F[idx], resources:R[idx], species:S[idx], forceTemperament: t===0?'Uninhabited':null };
}

function hexFormatSpecies(s) {
    const name=s.name||'Unknown', lineage=s.lineage||'', option=s.option||'';
    if (option && lineage) return `${option.charAt(0).toUpperCase()+option.slice(1)} ${name}`;
    if (lineage && lineage.toLowerCase()!==name.toLowerCase()) return `${lineage.charAt(0).toUpperCase()+lineage.slice(1)} ${name}`;
    return name;
}

function generateHex(terrain) {
    if (!GEN_HEX) return null;
    const t = (!terrain || terrain==='all') ? 'all' : terrain;
    const envTable = GEN_HEX.environments[t] || GEN_HEX.environments.all;

    const lord       = hexWeightedPick(GEN_HEX.lords,       i=>i.weight).name;
    const env        = hexWeightedPick(envTable,             i=>i.weight).name;
    const enemy      = hexWeightedPick(GEN_HEX.enemies,     i=>i.weight).name;
    const population = hexWeightedPick(GEN_HEX.populations, i=>i.weight);
    const counts     = hexPopCounts(population);
    const temperament= counts.forceTemperament || hexWeightedPick(GEN_HEX.temperaments, i=>i.weight).name;
    const pl         = hexWeightedPick(GEN_HEX.powerLevels, i=>i.weight).pl;

    const features  = counts.features  > 0 ? hexPickUnique(GEN_HEX.features,  counts.features)  : [];
    const resources = counts.resources > 0 ? hexPickUnique(GEN_HEX.resources, counts.resources) : [];
    const species   = counts.species   > 0
        ? Array.from({length: counts.species}, () => hexFormatSpecies(hexWeightedPick(HEX_SPECIES, hexRarityW)))
        : [];

    return { id: crypto.randomUUID(), lord, env, enemy, population: population.name, temperament, pl, features, resources, species, terrain: t };
}

function renderGenHexList() {
    const el = document.getElementById('gen-hex-list');
    if (!el) return;
    if (!nar.genHexes.length) { el.innerHTML = '<p class="empty-hint">Tap Roll Hex to generate a hex tile.</p>'; return; }

    el.innerHTML = nar.genHexes.map((h, i) => {
        const featStr = h.features.length  ? h.features.join(', ')  : 'None';
        const resStr  = h.resources.length ? h.resources.join(', ') : 'None';
        const spStr   = h.species.length   ? h.species.join(', ')   : 'None';
        const rows = [
            ['Env', h.env],
            ['Lord', h.lord],
            ['Pop', `${h.population} · ${h.temperament}`],
            ...(h.enemy !== 'None' ? [['Enemy', `${h.enemy} (PL ${h.pl})`]] : [['PL', h.pl]]),
            ['Features', featStr],
            ['Resources', resStr],
            ['Species', spStr],
        ];
        return `<div class="gen-quest-card">
            <div class="gen-npc-row" style="margin-bottom:4px">
                <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Hex ${nar.genHexes.length - i}</span>
            </div>
            <div class="gen-quest-rows">${rows.map(([label, val]) => `
                <div class="gen-npc-row">
                    <span class="gen-npc-label">${label}</span>
                    <span>${val}</span>
                </div>`).join('')}
            </div>
            <div class="gen-quest-actions">
                <button class="gen-mon-remove" data-hex-remove="${h.id}">✕</button>
            </div>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-hex-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
            nar.genHexes = nar.genHexes.filter(x => x.id !== btn.dataset.hexRemove);
            saveNar(); renderGenHexList();
        });
    });
}

// Terrain seg
let hexTerrain = 'all';
document.getElementById('hex-terrain-seg')?.querySelectorAll('[data-terrain]').forEach(btn => {
    btn.addEventListener('click', () => {
        hexTerrain = btn.dataset.terrain;
        document.getElementById('hex-terrain-seg').querySelectorAll('[data-terrain]').forEach(b =>
            b.classList.toggle('is-sel', b === btn));
    });
});

document.getElementById('btn-gen-hex')?.addEventListener('click', () => {
    if (!hexLoaded) { ensureHex(); return; }
    const h = generateHex(hexTerrain);
    if (h) { nar.genHexes.unshift(h); saveNar(); renderGenHexList(); }
});

// ── FIREBASE: SHARED CHAT ─────────────────────────────────────────────────────

function listenToSharedChat(code) {
    if (chatUnsubscribe) chatUnsubscribe();
    const arc = window.__arc;
    const q   = arc.query(
        arc.collection(arc.db, 'rooms', code, 'chat'),
        arc.orderBy('postedAt', 'desc'),
        arc.limit(60)
    );
    chatUnsubscribe = arc.onSnapshot(q, snap => {
        fbSharedChat = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderNarChat();
    }, err => console.error('[ARC] chat listener:', err));
}

async function postToSharedChat(entry) {
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid || !currentRoomCode) return;
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', currentRoomCode, 'chat', crypto.randomUUID()), {
            ...entry,
            author:     'Narrator',
            uid:        arc.uid,
            isNarrator: true,
            postedAt:   arc.serverTimestamp(),
        });
    } catch(e) { console.error('[ARC] postChat failed:', e); }
}

function renderNarChat() {
    const el = document.getElementById('nar-chat-log');
    if (!el) return;
    if (!fbSharedChat.length) {
        el.innerHTML = '<li class="empty-hint" style="list-style:none">No messages yet.</li>';
        return;
    }
    el.innerHTML = fbSharedChat.map(m => buildSharedChatCard(m)).join('');
}

function buildSharedChatCard(m) {
    const isNar  = m.isNarrator;
    const isRoll = ['roll','dice','weapon-attack'].includes(m.type);
    const badge  = isNar
        ? `<div class="shared-author shared-author--nar">◆ Narrator</div>`
        : `<div class="shared-author">${m.author || 'Player'}</div>`;

    // Narrator cards get tinted class based on type
    const narClass = isNar ? (isRoll ? ' scard--nar-roll' : ' scard--nar-text') : '';

    let cardHtml = '';
    if (m.type === 'weapon-attack') {
        cardHtml = renderWeaponAttackEntry(m);
    } else if (m.type === 'roll' && m.total !== undefined) {
        cardHtml = renderRollEntry(m);
    } else if (m.type === 'feature') {
        cardHtml = renderFeatureEntry(m);
    } else if (m.type === 'dice') {
        cardHtml = renderDiceEntry(m);
    } else if (m.type === 'recovery') {
        cardHtml = renderRecoveryEntry(m);
    } else {
        cardHtml = `<div class="chat-entry--msg"><span class="chat-time">${m.time || ''}</span><span class="chat-text">${m.text || ''}</span></div>`;
    }

    return `<li class="${narClass.trim()}">${badge}${cardHtml}</li>`;
}

// Narrator chat input
document.getElementById('btn-nar-send')?.addEventListener('click', () => {
    const input = document.getElementById('nar-chat-input');
    const text  = input?.value.trim();
    if (!text) return;
    postToSharedChat({ type: 'msg', text });
    input.value = '';
});
document.getElementById('nar-chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-nar-send')?.click();
});

// ── SETTINGS & THEME ─────────────────────────────────────────────────────────

const NAR_DEFAULT_A1 = '#6b9cc8';
const NAR_DEFAULT_A2 = '#c4622d';

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function hexToHue(hex) {
    if (!hex || hex.length < 7) return 0;
    const { r, g, b } = hexToRgb(hex);
    const r1 = r/255, g1 = g/255, b1 = b/255;
    const max = Math.max(r1,g1,b1), min = Math.min(r1,g1,b1), d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === r1)      h = ((g1 - b1) / d + 6) % 6;
    else if (max === g1) h = (b1 - r1)  / d + 2;
    else                 h = (r1 - g1)  / d + 4;
    return Math.round(h * 60);
}

function hslToHex(h, s = 65, l = 60) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function applyTheme() {
    const t  = nar.theme || {};
    const a1 = t.a1 || NAR_DEFAULT_A1;
    const a2 = t.a2 || NAR_DEFAULT_A2;
    const c1 = hexToRgb(a1), c2 = hexToRgb(a2);
    const root = document.documentElement;
    root.style.setProperty('--accent',      a1);
    root.style.setProperty('--accent-dim',  `rgba(${c1.r},${c1.g},${c1.b},0.18)`);
    root.style.setProperty('--accent-mid',  `rgba(${c1.r},${c1.g},${c1.b},0.38)`);
    root.style.setProperty('--accent2',     a2);
    root.style.setProperty('--accent2-dim', `rgba(${c2.r},${c2.g},${c2.b},0.18)`);
    root.style.setProperty('--accent2-mid', `rgba(${c2.r},${c2.g},${c2.b},0.38)`);
}

function setTheme(a1, a2) {
    nar.theme = { a1, a2 };
    applyTheme();
    saveNar();
}

function openSettings() {
    const container = document.getElementById('theme-swatches');
    if (container) {
        const a1 = nar.theme?.a1 || NAR_DEFAULT_A1;
        const a2 = nar.theme?.a2 || NAR_DEFAULT_A2;
        container.innerHTML = `
            <div class="wm-label" style="margin-bottom:6px">Primary</div>
            <div class="theme-slider-row">
                <input type="range" class="hue-slider" id="hue-a1" min="0" max="359" value="${hexToHue(a1)}" />
                <span class="hue-preview" id="prev-a1" style="background:${a1}"></span>
            </div>
            <div class="wm-label" style="margin:12px 0 6px">Secondary</div>
            <div class="theme-slider-row">
                <input type="range" class="hue-slider" id="hue-a2" min="0" max="359" value="${hexToHue(a2)}" />
                <span class="hue-preview" id="prev-a2" style="background:${a2}"></span>
            </div>`;

        ['a1', 'a2'].forEach(key => {
            document.getElementById(`hue-${key}`)?.addEventListener('input', function() {
                const hex  = hslToHex(parseInt(this.value));
                const prev = document.getElementById(`prev-${key}`);
                if (prev) prev.style.background = hex;
                const cur1 = nar.theme?.a1 || NAR_DEFAULT_A1;
                const cur2 = nar.theme?.a2 || NAR_DEFAULT_A2;
                setTheme(key === 'a1' ? hex : cur1, key === 'a2' ? hex : cur2);
            });
        });
    }
    document.getElementById('nar-reset-confirm').hidden = true;
    document.getElementById('btn-reset-nar').hidden     = false;
    document.getElementById('settings-modal').hidden    = false;
}

function closeSettings() {
    document.getElementById('settings-modal').hidden = true;
}

document.getElementById('btn-end-session')?.addEventListener('click', () => { closeSettings(); endSession(); });
document.getElementById('btn-settings')?.addEventListener('click', openSettings);
document.getElementById('settings-close')?.addEventListener('click', closeSettings);
document.getElementById('settings-scrim')?.addEventListener('click', closeSettings);

document.getElementById('btn-reset-nar')?.addEventListener('click', () => {
    document.getElementById('btn-reset-nar').hidden     = true;
    document.getElementById('nar-reset-confirm').hidden = false;
});

document.getElementById('btn-nar-reset-cancel')?.addEventListener('click', () => {
    document.getElementById('nar-reset-confirm').hidden = true;
    document.getElementById('btn-reset-nar').hidden     = false;
});

document.getElementById('btn-nar-reset-confirm')?.addEventListener('click', () => {
    nar.encounter     = [];
    nar.round         = 1;
    nar.turnIndex     = 0;
    nar.minions       = [];
    nar.inventory     = [];
    nar.partyManual   = [];
    nar.archived      = [];
    nar.genMonsters   = [];
    nar.genNpcs       = [];
    nar.genLocations  = [];
    nar.genQuests     = [];
    nar.genDungeons   = [];
    nar.genRooms      = [];
    nar.genMundane    = [];
    nar.genEnchanted  = [];
    nar.genMedicine   = [];
    nar.genHexes         = [];
    nar.journalNpcs      = [];
    nar.journalMonsters  = [];
    nar.questLog         = [];
    nar.sessions         = [];
    saveNar();
    renderParty(); renderMinions(); renderInventory(); renderEncounter();
    renderGenMonsterList(); renderGenNpcList(); renderGenLocList();
    renderGenQuestList(); renderGenDungeonList(); renderGenRoomsList();
    renderGenMundaneList(); renderGenEnchantedList(); renderGenMedicineList();
    renderGenHexList();
    renderJournalNpcs(); renderJournalMonsters(); renderQuestLog(); renderSessions();
    closeSettings();
});

// ── FIREBASE: ROOM ────────────────────────────────────────────────────────────

let fbPlayers        = [];
let fbLoot           = [];
let fbGold           = 0;
let fbSharedChat     = [];
let currentRoomCode  = localStorage.getItem('arc-narrator-room') || null;
let partyUnsubscribe = null;
let lootUnsubscribe  = null;
let roomUnsubscribe  = null;
let chatUnsubscribe  = null;

document.addEventListener('arc:firebase-ready', () => {
    if (currentRoomCode) restoreRoom(currentRoomCode);
});

function genRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function createRoom() {
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) { alert('Still connecting — try again in a moment.'); return; }

    const code = genRoomCode();
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', code), {
            narratorUid: arc.uid,
            createdAt:   arc.serverTimestamp(),
            status:      'active',
        });
        currentRoomCode = code;
        localStorage.setItem('arc-narrator-room', code);
        showRoomBadge(code);
        listenToPlayers(code);
        listenToLoot(code);
        listenToRoomDoc(code);
        listenToSharedChat(code);
    } catch(e) { console.error('[ARC] createRoom failed:', e); alert('Failed to create room.'); }
}

async function restoreRoom(code) {
    const arc = window.__arc;
    if (!arc?.db) return;
    try {
        const snap = await arc.getDoc(arc.doc(arc.db, 'rooms', code));
        if (snap.exists() && snap.data().status === 'active') {
            showRoomBadge(code);
            listenToPlayers(code);
            listenToLoot(code);
            listenToRoomDoc(code);
            listenToSharedChat(code);
        } else {
            localStorage.removeItem('arc-narrator-room');
            currentRoomCode = null;
        }
    } catch(e) { console.error('[ARC] restoreRoom failed:', e); }
}

function listenToPlayers(code) {
    if (partyUnsubscribe) partyUnsubscribe();
    const arc = window.__arc;
    partyUnsubscribe = arc.onSnapshot(
        arc.collection(arc.db, 'rooms', code, 'players'),
        snap => { fbPlayers = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderParty(); },
        err => console.error('[ARC] players listener error:', err)
    );
}

function listenToLoot(code) {
    if (lootUnsubscribe) lootUnsubscribe();
    const arc = window.__arc;
    lootUnsubscribe = arc.onSnapshot(
        arc.collection(arc.db, 'rooms', code, 'loot'),
        snap => { fbLoot = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderInventory(); },
        err => console.error('[ARC] loot listener error:', err)
    );
}

function listenToRoomDoc(code) {
    if (roomUnsubscribe) roomUnsubscribe();
    const arc = window.__arc;
    roomUnsubscribe = arc.onSnapshot(
        arc.doc(arc.db, 'rooms', code),
        snap => {
            fbGold = snap.data()?.gold ?? 0;
            const valEl = document.getElementById('party-gold-val');
            if (valEl) valEl.textContent = fbGold;
        },
        err => console.error('[ARC] room doc listener error:', err)
    );
}

async function adjustGold(delta) {
    const arc = window.__arc;
    if (!arc?.db || !currentRoomCode) return;
    const newGold = Math.max(0, fbGold + delta);
    try {
        await arc.updateDoc(arc.doc(arc.db, 'rooms', currentRoomCode), { gold: newGold });
    } catch(e) { console.error('[ARC] adjustGold failed:', e); }
}

// Gold controls
document.getElementById('party-gold-row')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-gold]');
    if (btn) adjustGold(parseInt(btn.dataset.gold, 10));
});

function showRoomBadge(code) {
    const badge     = document.getElementById('room-code-badge');
    const inviteBtn = document.getElementById('btn-invite');
    const goldRow   = document.getElementById('party-gold-row');
    if (badge)     { badge.textContent = code; badge.hidden = false; }
    if (inviteBtn) inviteBtn.textContent = 'New Room';
    if (goldRow)   goldRow.hidden = false;
}

document.getElementById('room-code-badge')?.addEventListener('click', () => {
    if (!currentRoomCode) return;
    navigator.clipboard.writeText(currentRoomCode).then(() => {
        const badge = document.getElementById('room-code-badge');
        const orig  = badge.textContent;
        badge.textContent = 'Copied!';
        setTimeout(() => { badge.textContent = orig; }, 1500);
    });
});

// ── INIT ──────────────────────────────────────────────────────────────────────

loadNar();
migrateOldNotes();
applyTheme();
renderParty();
renderMinions();
renderInventory();
renderEncounter();
renderGenNpcList();
renderGenLocList();
renderGenQuestList();
renderGenDungeonList();
renderGenRoomsList();
renderGenMundaneList();
renderGenEnchantedList();
renderGenMedicineList();
renderGenHexList();
renderJournalNpcs();
renderJournalMonsters();
renderQuestLog();
renderSessions();
