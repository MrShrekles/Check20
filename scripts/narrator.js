/* Narrator companion — ARC20 */

// ── PANELS ────────────────────────────────────────────────────────────────────

const PANEL_IDS = ['party', 'encounter', 'npcs', 'nar-notes'];

function setActivePanel(key) {
    PANEL_IDS.forEach(id => {
        const el = document.getElementById(`panel-${id}`);
        if (el) el.classList.toggle('is-active', id === key);
    });
    document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.nav === key);
    });
    if (key === 'nar-notes') saveNotes();
}

document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => setActivePanel(btn.dataset.nav));
});

// ── STATE ─────────────────────────────────────────────────────────────────────

const nar = {
    encounter: [],  // { id, name, hp, maxHp, initiative }
    npcs:      [],  // { id, name, hp, maxHp, notes }
    notes:     '',
    round:     1,
    turnIndex: 0,
};

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

    const index = (() => { try { return JSON.parse(localStorage.getItem('arc-saves') || '[]'); } catch { return []; } })();

    if (!index.length) {
        el.innerHTML = '<p class="empty-hint">No saved characters found in this browser.</p>';
        return;
    }

    el.innerHTML = index.map(entry => {
        let d = null;
        try { d = JSON.parse(localStorage.getItem(`arc-save-${entry.id}`) || 'null'); } catch {}
        if (!d) return '';

        const c   = d.char      || {};
        const r   = d.resources || {};
        const hp  = r.hp    || { current: 0, max: 0 };
        const arm = r.armor || { current: 0, max: 0 };
        const mn  = r.MN    || { current: 0, max: 0 };

        const hpPct  = hp.max  > 0 ? Math.round((hp.current  / hp.max)  * 100) : 0;
        const armPct = arm.max > 0 ? Math.round((arm.current / arm.max) * 100) : 0;

        return `<div class="party-card">
            <div class="party-card-header">
                <span class="party-card-name">${c.name || 'Unnamed'}</span>
                <span class="party-card-meta">${[c.classKey, c.speciesLineage].filter(Boolean).join(' · ')}</span>
            </div>
            <div class="party-card-bars">
                <div class="party-bar-row">
                    <span class="party-bar-label">Wounds</span>
                    <div class="party-bar-track"><div class="party-bar-fill party-bar-fill--hp" style="width:${hpPct}%"></div></div>
                    <span class="party-bar-val">${hp.current}/${hp.max}</span>
                </div>
                <div class="party-bar-row">
                    <span class="party-bar-label">Armor</span>
                    <div class="party-bar-track"><div class="party-bar-fill party-bar-fill--arm" style="width:${armPct}%"></div></div>
                    <span class="party-bar-val">${arm.current}/${arm.max}</span>
                </div>
                ${mn.max > 0 ? `<div class="party-bar-row">
                    <span class="party-bar-label">MN</span>
                    <div class="party-bar-track"><div class="party-bar-fill party-bar-fill--mn" style="width:${mn.max > 0 ? Math.round((mn.current/mn.max)*100) : 0}%"></div></div>
                    <span class="party-bar-val">${mn.current}/${mn.max}</span>
                </div>` : ''}
            </div>
        </div>`;
    }).filter(Boolean).join('') || '<p class="empty-hint">Could not load character data.</p>';
}

document.getElementById('btn-refresh-party')?.addEventListener('click', renderParty);

// ── ENCOUNTER ─────────────────────────────────────────────────────────────────

function sortedEncounter() {
    return [...nar.encounter].sort((a, b) => b.initiative - a.initiative);
}

function renderEncounter() {
    const listEl   = document.getElementById('encounter-list');
    const turnBar  = document.getElementById('enc-turn-bar');
    const roundEl  = document.getElementById('enc-round');
    const activeEl = document.getElementById('enc-active-name');
    if (!listEl) return;

    const sorted = sortedEncounter();

    if (!sorted.length) {
        listEl.innerHTML = '<p class="empty-hint">No creatures in encounter.</p>';
        if (turnBar) turnBar.hidden = true;
        return;
    }

    const activeTurn = nar.turnIndex % sorted.length;
    if (turnBar)  turnBar.hidden = false;
    if (roundEl)  roundEl.textContent  = nar.round;
    if (activeEl) activeEl.textContent = sorted[activeTurn]?.name || '—';

    listEl.innerHTML = sorted.map((c, i) => {
        const isActive = i === activeTurn;
        const pct = c.maxHp > 0 ? Math.round((c.hp / c.maxHp) * 100) : 0;
        return `<div class="enc-card${isActive ? ' enc-card--active' : ''}">
            <div class="enc-card-row">
                <span class="enc-init-badge">${c.initiative}</span>
                <span class="enc-name">${c.name}</span>
                <div class="enc-hp-row">
                    <button class="step-action-btn" data-enc-action="dec5" data-enc-id="${c.id}" title="−5 HP">−5</button>
                    <button class="step-action-btn" data-enc-action="dec"  data-enc-id="${c.id}" title="−1 HP">−</button>
                    <span class="enc-hp">${c.hp}<span class="enc-hp-max">/${c.maxHp}</span></span>
                    <button class="step-action-btn" data-enc-action="inc"  data-enc-id="${c.id}" title="+1 HP">+</button>
                    <button class="step-action-btn" style="color:#ff6060" data-enc-action="remove" data-enc-id="${c.id}" title="Remove">✕</button>
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
            if (action === 'dec')    c.hp = Math.max(0, c.hp - 1);
            if (action === 'dec5')   c.hp = Math.max(0, c.hp - 5);
            if (action === 'inc')    c.hp = Math.min(c.maxHp, c.hp + 1);
            if (action === 'remove') nar.encounter = nar.encounter.filter(x => x.id !== id);
            saveNar(); renderEncounter();
        });
    });
}

document.getElementById('btn-add-creature')?.addEventListener('click', () => {
    const name = document.getElementById('enc-name-input')?.value.trim();
    const hp   = parseInt(document.getElementById('enc-hp-input')?.value  || '10', 10);
    const init = parseInt(document.getElementById('enc-init-input')?.value || '0', 10);
    if (!name) return;
    nar.encounter.push({ id: crypto.randomUUID(), name, hp, maxHp: hp, initiative: init });
    document.getElementById('enc-name-input').value  = '';
    document.getElementById('enc-hp-input').value    = '10';
    document.getElementById('enc-init-input').value  = '0';
    saveNar(); renderEncounter();
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

// ── NPCS ──────────────────────────────────────────────────────────────────────

function renderNpcTrackers() {
    const el = document.getElementById('npc-tracker-list');
    if (!el) return;

    if (!nar.npcs.length) {
        el.innerHTML = '<p class="empty-hint">No NPCs tracked.</p>';
        return;
    }

    el.innerHTML = nar.npcs.map(n => {
        const pct = n.maxHp > 0 ? Math.round((n.hp / n.maxHp) * 100) : 0;
        return `<div class="enc-card">
            <div class="enc-card-row">
                <div class="enc-name-col">
                    <span class="enc-name">${n.name}</span>
                    ${n.notes ? `<span class="enc-notes">${n.notes}</span>` : ''}
                </div>
                <div class="enc-hp-row">
                    <button class="step-action-btn" data-npc-action="dec5" data-npc-id="${n.id}" title="−5 HP">−5</button>
                    <button class="step-action-btn" data-npc-action="dec"  data-npc-id="${n.id}" title="−1 HP">−</button>
                    <span class="enc-hp">${n.hp}<span class="enc-hp-max">/${n.maxHp}</span></span>
                    <button class="step-action-btn" data-npc-action="inc"  data-npc-id="${n.id}" title="+1 HP">+</button>
                    <button class="step-action-btn" style="color:#ff6060" data-npc-action="remove" data-npc-id="${n.id}" title="Remove">✕</button>
                </div>
            </div>
            <div class="enc-hp-bar-track"><div class="enc-hp-bar-fill enc-hp-bar-fill--npc" style="width:${pct}%"></div></div>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-npc-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id     = btn.dataset.npcId;
            const action = btn.dataset.npcAction;
            const n = nar.npcs.find(x => x.id === id);
            if (!n && action !== 'remove') return;
            if (action === 'dec')    n.hp = Math.max(0, n.hp - 1);
            if (action === 'dec5')   n.hp = Math.max(0, n.hp - 5);
            if (action === 'inc')    n.hp = Math.min(n.maxHp, n.hp + 1);
            if (action === 'remove') nar.npcs = nar.npcs.filter(x => x.id !== id);
            saveNar(); renderNpcTrackers();
        });
    });
}

document.getElementById('btn-add-npc-tracker')?.addEventListener('click', () => {
    const name  = document.getElementById('npc-t-name-input')?.value.trim();
    const hp    = parseInt(document.getElementById('npc-t-hp-input')?.value  || '10', 10);
    const notes = document.getElementById('npc-t-notes-input')?.value.trim() || '';
    if (!name) return;
    nar.npcs.push({ id: crypto.randomUUID(), name, hp, maxHp: hp, notes });
    document.getElementById('npc-t-name-input').value  = '';
    document.getElementById('npc-t-hp-input').value    = '10';
    document.getElementById('npc-t-notes-input').value = '';
    saveNar(); renderNpcTrackers();
});

document.getElementById('btn-clear-npcs')?.addEventListener('click', () => {
    if (!nar.npcs.length) return;
    nar.npcs = []; saveNar(); renderNpcTrackers();
});

// ── NOTES ─────────────────────────────────────────────────────────────────────

function saveNotes() {
    const el = document.getElementById('nar-notes');
    if (el) { nar.notes = el.value; saveNar(); }
}

function loadNotes() {
    const el = document.getElementById('nar-notes');
    if (el) el.value = nar.notes || '';
}

document.getElementById('btn-save-nar-notes')?.addEventListener('click', saveNotes);

// ── ROLL DRAWER ───────────────────────────────────────────────────────────────

function rollD20(mod, type) {
    const r1 = Math.ceil(Math.random() * 20);
    let roll = r1;
    if (type === 'adv') { const r2 = Math.ceil(Math.random() * 20); roll = Math.max(r1, r2); }
    if (type === 'dis') { const r2 = Math.ceil(Math.random() * 20); roll = Math.min(r1, r2); }
    return { roll, total: roll + mod };
}

const rollDrawer = document.getElementById('roll-drawer');

document.getElementById('fab-roll')?.addEventListener('click', () => {
    rollDrawer?.removeAttribute('inert');
    rollDrawer?.setAttribute('aria-hidden', 'false');
    rollDrawer?.classList.add('is-open');
});

rollDrawer?.querySelectorAll('[data-drawer-close]').forEach(el => {
    el.addEventListener('click', () => {
        rollDrawer.setAttribute('inert', '');
        rollDrawer.setAttribute('aria-hidden', 'true');
        rollDrawer.classList.remove('is-open');
    });
});

rollDrawer?.querySelectorAll('.roll-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        rollDrawer.querySelectorAll('.roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
        btn.classList.add('is-sel');
    });
});

document.getElementById('btn-roll')?.addEventListener('click', () => {
    const label = document.getElementById('roll-label')?.value.trim() || 'Roll';
    const mod   = parseInt(document.getElementById('roll-mod')?.value || '0', 10);
    const seg   = rollDrawer?.querySelector('.roll-seg-btn.is-sel')?.dataset.seg || 'flat';
    const { roll, total } = rollD20(mod, seg);
    const resultEl = document.getElementById('nar-roll-result');
    if (resultEl) {
        const success = total >= 15;
        const successes = total >= 15 ? Math.floor((total - 10) / 5) : 0;
        resultEl.hidden = false;
        resultEl.className = `nar-roll-result${success ? ' nar-roll-result--success' : ' nar-roll-result--fail'}`;
        resultEl.innerHTML = `
            <div class="nar-roll-label">${label}</div>
            <div class="nar-roll-num">${total}</div>
            <div class="nar-roll-sub">${mod !== 0 ? `d20(${roll}) + ${mod}` : `d20`} · ${success ? `${successes} success${successes !== 1 ? 'es' : ''}` : 'Fail'}</div>
        `;
    }
});

// ── INIT ──────────────────────────────────────────────────────────────────────

loadNar();
renderParty();
renderEncounter();
renderNpcTrackers();
loadNotes();
