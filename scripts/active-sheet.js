/* Active Sheet — mobile-first gameplay runner */

// ── CHECKS ────────────────────────────────────────────────────────────────────

const CHECKS = {
    physical: [
        { key: 'agi', label: 'Agility',   mod: 0 },
        { key: 'cra', label: 'Crafting',  mod: 0 },
        { key: 'ste', label: 'Stealth',   mod: 0 },
        { key: 'str', label: 'Strength',  mod: 0 },
        { key: 'sur', label: 'Survival',  mod: 0 },
    ],
    mental: [
        { key: 'inf', label: 'Influence',   mod: 0 },
        { key: 'int', label: 'Intellect',   mod: 0 },
        { key: 'lck', label: 'Luck',        mod: 0 },
        { key: 'obs', label: 'Observation', mod: 0 },
        { key: 'spi', label: 'Spirit',      mod: 0 },
    ],
};

const CONDITION_GROUPS = {
    'Corpus':    ['Bleeding','Broken','Concussion','Coughing','Dislocation','Pinned','Prone','Slowed'],
    'Cognition': ['Blind','Charmed','Confused','Deaf','Fear'],
    'Special':   ['Intangible','Invisible'],
    'Major':     ['Constrained','Exhaustion','Exposed','Injured','Stunned','Unconscious'],
};

// ── STATE ─────────────────────────────────────────────────────────────────────

const state = {
    char: {
        name: '', level: 1,
        species: '', age: '', size: '', diet: '', language: '', motivation: '',
        classKey: '', pathName: '', talentName: '',
    },
    resources: {
        hp:       { current: 0, max: 0 },
        armor:    { current: 0, max: 0 },
        MN:       { current: 0, max: 0 },
        classRes: { current: 0, max: 0, label: 'Resource' },
    },
    checks:           structuredClone(CHECKS),
    activeConditions: new Set(),
    equipment:        [],   // [{ name, notes }]
    progression: {
        pathChecked:   {},  // { index: bool }
        talentChecked: {},  // { index: bool }
        otherGains:    [],  // [string]
    },
    rollLog:     [],
    miniRollLog: [],
};

// ── CLASS DATA ────────────────────────────────────────────────────────────────

let classBaseData = [];  // from classes.json → .classes array
let classOptData  = {};  // from class-new.json → .classes object

async function loadClassData() {
    try {
        const [baseRes, optRes] = await Promise.all([
            fetch('data/classes.json'),
            fetch('data/class-new.json'),
        ]);
        const baseJson = await baseRes.json();
        const optJson  = await optRes.json();
        classBaseData = baseJson?.classes || [];
        classOptData  = optJson?.classes  || {};
        populateClassSelect();
        if (state.char.classKey) {
            populatePathTalentSelects(state.char.classKey);
            renderClassView();
            renderProgression();
        }
    } catch (e) { console.warn('Could not load class data', e); }
}

function getClassEntries(className) {
    const key = (className || '').toLowerCase();
    const entries = classOptData[key];
    return Array.isArray(entries) ? entries : [];
}

function populateClassSelect() {
    const sel = document.getElementById('class-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Class —</option>' +
        classBaseData.map(c =>
            `<option value="${c.name}"${c.name === state.char.classKey ? ' selected' : ''}>${c.name}</option>`
        ).join('');
}

function populatePathTalentSelects(className) {
    const entries   = getClassEntries(className);
    const pathSel   = document.getElementById('path-select');
    const talentSel = document.getElementById('talent-select');

    if (pathSel) {
        const paths = entries.filter(e => Array.isArray(e?.path?.steps) && e.path.steps.length);
        pathSel.innerHTML = '<option value="">— Select Path —</option>' +
            paths.map(e =>
                `<option value="${e.name}"${e.name === state.char.pathName ? ' selected' : ''}>${e.name}</option>`
            ).join('');
    }
    if (talentSel) {
        const talents = entries.filter(e => Array.isArray(e?.talent?.steps) && e.talent.steps.length);
        talentSel.innerHTML = '<option value="">— Select Talent —</option>' +
            talents.map(e =>
                `<option value="${e.name}"${e.name === state.char.talentName ? ' selected' : ''}>${e.name}</option>`
            ).join('');
    }
}

// ── CLASS VIEW (Features panel) ───────────────────────────────────────────────

function renderClassView() {
    const el = document.getElementById('class-view');
    if (!el) return;
    if (!state.char.classKey) {
        el.innerHTML = '<p class="empty-hint">Tap ⚙ to select your class, path & talent</p>';
        return;
    }
    const base    = classBaseData.find(c => c.name === state.char.classKey) || {};
    const entries = getClassEntries(state.char.classKey);
    const pathEntry   = state.char.pathName   ? entries.find(e => e.name === state.char.pathName)   : null;
    const talentEntry = state.char.talentName ? entries.find(e => e.name === state.char.talentName) : null;

    const pathInit   = pathEntry?.path?.steps?.filter(s => Number(s.step) === 0)   || [];
    const talentInit = talentEntry?.talent?.steps?.filter(s => Number(s.step) === 0) || [];

    el.innerHTML = `
        <div class="class-badges">
            ${state.char.classKey   ? `<span class="feature-badge">${state.char.classKey}</span>`   : ''}
            ${state.char.pathName   ? `<span class="feature-badge">${state.char.pathName}</span>`   : ''}
            ${state.char.talentName ? `<span class="feature-badge">${state.char.talentName}</span>` : ''}
        </div>
        ${pathInit.length   ? `<div class="step-group-label">Path — ${state.char.pathName}</div>${pathInit.map(renderStepCard).join('')}`     : ''}
        ${talentInit.length ? `<div class="step-group-label">Talent — ${state.char.talentName}</div>${talentInit.map(renderStepCard).join('')}` : ''}
        ${base.features?.length ? `<div class="step-group-label">Class Features</div><ul class="step-list">
            ${base.features.map(f => `<li><strong>${f.name}:</strong> ${Array.isArray(f.description) ? f.description.join(' ') : (f.description || '')}</li>`).join('')}
        </ul>` : ''}`;
}

function renderStepCard(s) {
    const tags = [];
    if (s?.action)   tags.push(s.action);
    if (s?.check)    tags.push(`Check: ${s.check}`);
    if (s?.range)    tags.push(`Range: ${s.range}`);
    if (s?.damage !== undefined && s.damage !== '') tags.push(`Dmg: ${s.damage}${s.damageType ? ` (${s.damageType})` : ''}`);
    return `<div class="step-card">
        <div class="step-card-head">
            <strong>${s?.name || ''}</strong>
            ${tags.length ? `<div class="step-tags">${tags.map(t => `<span class="step-tag">${t}</span>`).join('')}</div>` : ''}
        </div>
        ${s?.description ? `<p class="step-desc">${s.description}</p>` : ''}
    </div>`;
}

// ── PROGRESSION PANEL ─────────────────────────────────────────────────────────

function renderProgression() {
    const pathEl   = document.getElementById('path-progression-list');
    const talentEl = document.getElementById('talent-progression-list');
    if (!pathEl || !talentEl) return;

    const entries     = getClassEntries(state.char.classKey);
    const pathEntry   = state.char.pathName   ? entries.find(e => e.name === state.char.pathName)   : null;
    const talentEntry = state.char.talentName ? entries.find(e => e.name === state.char.talentName) : null;

    const pathSteps   = pathEntry?.path?.steps?.filter(s => Number(s.step) !== 0)   || [];
    const talentSteps = talentEntry?.talent?.steps?.filter(s => Number(s.step) !== 0) || [];

    pathEl.innerHTML   = pathSteps.length
        ? pathSteps.map((s, i) => renderProgStep(s, i, 'path')).join('')
        : '<p class="empty-hint">Select a path in Features</p>';

    talentEl.innerHTML = talentSteps.length
        ? talentSteps.map((s, i) => renderProgStep(s, i, 'talent')).join('')
        : '<p class="empty-hint">Select a talent in Features</p>';
}

function renderProgStep(s, index, type) {
    const checked = type === 'path'
        ? !!state.progression.pathChecked[index]
        : !!state.progression.talentChecked[index];
    return `<div class="prog-step${checked ? ' prog-step--done' : ''}">
        <label class="prog-check-label">
            <input type="checkbox" class="prog-checkbox" data-prog-type="${type}" data-prog-index="${index}"${checked ? ' checked' : ''}>
        </label>
        <div class="prog-step-body">
            <div class="prog-step-name">${s?.name || 'Unnamed'}</div>
            ${s?.description ? `<p class="step-desc">${s.description}</p>` : ''}
        </div>
    </div>`;
}

function renderOtherGains() {
    const el = document.getElementById('other-gains-list');
    if (!el) return;
    el.innerHTML = state.progression.otherGains.length
        ? state.progression.otherGains.map((g, i) => `
            <div class="row">
                <span class="check-row-label">${g}</span>
                <button class="check-adj" data-remove-gain="${i}" style="color:#ff6060" aria-label="Remove">✕</button>
            </div>`).join('')
        : '<p class="empty-hint">Items gained during play</p>';
}

// ── EQUIPMENT ─────────────────────────────────────────────────────────────────

function renderEquipment() {
    const el = document.getElementById('equip-list');
    if (!el) return;
    el.innerHTML = state.equipment.length
        ? state.equipment.map((item, i) => `
            <div class="row">
                <div>
                    <span class="check-row-label">${item.name}</span>
                    ${item.notes ? `<span class="meta" style="margin-left:6px">${item.notes}</span>` : ''}
                </div>
                <button class="check-adj" data-remove-equip="${i}" style="color:#ff6060" aria-label="Remove">✕</button>
            </div>`).join('')
        : '<p class="empty-hint">No equipment added</p>';
}

// ── PERSISTENCE ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'arc-active-sheet';

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            char:             state.char,
            resources:        state.resources,
            checks:           state.checks,
            activeConditions: [...state.activeConditions],
            equipment:        state.equipment,
            progression:      state.progression,
        }));
    } catch (_) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.char)      Object.assign(state.char,      d.char);
        if (d.resources) {
            Object.keys(d.resources).forEach(k => {
                if (state.resources[k]) Object.assign(state.resources[k], d.resources[k]);
            });
        }
        if (d.checks) {
            ['physical','mental'].forEach(g => {
                if (!d.checks[g]) return;
                d.checks[g].forEach(saved => {
                    const live = state.checks[g].find(c => c.key === saved.key);
                    if (live) live.mod = saved.mod ?? 0;
                });
            });
        }
        if (Array.isArray(d.activeConditions)) state.activeConditions = new Set(d.activeConditions);
        if (Array.isArray(d.equipment))  state.equipment  = d.equipment;
        if (d.progression) Object.assign(state.progression, d.progression);
    } catch (_) {}
}

// ── DOM CACHE ─────────────────────────────────────────────────────────────────

const els = {};

function cacheEls() {
    els.panels = {
        play:        document.getElementById('panel-play'),
        bio:         document.getElementById('panel-bio'),
        actions:     document.getElementById('panel-actions'),
        progression: document.getElementById('panel-progression'),
    };
    els.navBtns  = Array.from(document.querySelectorAll('.nav-btn'));
    els.fabRoll  = document.getElementById('fab-roll');

    els.hpCur    = document.getElementById('hp-current');
    els.hpMax    = document.getElementById('hp-max');
    els.armorCur = document.getElementById('armor-current');
    els.armorMax = document.getElementById('armor-max');
    els.MNCur    = document.getElementById('MN-current');
    els.MNMax    = document.getElementById('MN-max');
    els.classResCur = document.getElementById('classRes-current');
    els.classResMax = document.getElementById('classRes-max');

    els.conditionsRow = document.getElementById('conditions-row');
    els.quickChecks   = document.getElementById('quick-checks');
    els.checksList    = document.getElementById('checks-list');

    els.rollDrawer = document.getElementById('roll-drawer');
    els.rollLabel  = document.getElementById('roll-label');
    els.rollMod    = document.getElementById('roll-mod');
    els.btnRoll    = document.getElementById('btn-roll');
    els.miniLog    = document.getElementById('mini-roll-log');
    els.mainLog    = document.getElementById('roll-log');

    els.btnClearConditions = document.getElementById('btn-clear-conditions');
    els.btnClearLog        = document.getElementById('btn-clear-log');
    els.btnClearMiniLog    = document.getElementById('btn-clear-mini-log');

    els.hpMaxInput    = document.getElementById('hp-max-input');
    els.armorMaxInput = document.getElementById('armor-max-input');
    els.MNMaxInput    = document.getElementById('MN-max-input');

    els.btnSaveBio = document.getElementById('btn-save-bio');
}

// ── NAV ───────────────────────────────────────────────────────────────────────

function bindNav() {
    els.navBtns.forEach(btn =>
        btn.addEventListener('click', () => setActivePanel(btn.dataset.nav))
    );
}

function setActivePanel(key) {
    Object.entries(els.panels).forEach(([k, el]) => el?.classList.toggle('is-active', k === key));
    els.navBtns.forEach(b => b.classList.toggle('is-active', b.dataset.nav === key));
}

// ── RESOURCES ─────────────────────────────────────────────────────────────────

function bindResources() {
    document.querySelector('.resource-grid')?.addEventListener('click', e => {
        const btn  = e.target.closest('.pill-btn');
        const pill = e.target.closest('.resource-pill');
        if (!btn || !pill) return;
        const res    = state.resources[pill.dataset.resource];
        const action = btn.dataset.action;
        if (!res) return;
        if (action === 'inc') res.current = Math.min(res.current + 1, res.max);
        if (action === 'dec') res.current = Math.max(res.current - 1, 0);
        syncUI();
        saveState();
    });

    // Features panel resource pill (classRes)
    document.getElementById('panel-actions')?.addEventListener('click', e => {
        const btn  = e.target.closest('.pill-btn');
        const pill = e.target.closest('.resource-pill');
        if (!btn || !pill || !state.resources[pill.dataset.resource]) return;
        const res = state.resources[pill.dataset.resource];
        if (btn.dataset.action === 'inc') res.current = Math.min(res.current + 1, res.max);
        if (btn.dataset.action === 'dec') res.current = Math.max(res.current - 1, 0);
        syncUI();
        saveState();
    });
}

// ── CONDITIONS ────────────────────────────────────────────────────────────────

function renderConditions() {
    els.conditionsRow.innerHTML = '';
    Object.entries(CONDITION_GROUPS).forEach(([group, names]) => {
        const header = document.createElement('div');
        header.className = 'conditions-group-label';
        header.textContent = group;
        els.conditionsRow.appendChild(header);
        const row = document.createElement('div');
        row.className = 'chip-row';
        names.forEach(name => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip';
            b.textContent = name;
            b.setAttribute('aria-pressed', state.activeConditions.has(name) ? 'true' : 'false');
            b.addEventListener('click', () => {
                const active = state.activeConditions.has(name);
                if (active) { state.activeConditions.delete(name); b.setAttribute('aria-pressed', 'false'); }
                else        { state.activeConditions.add(name);    b.setAttribute('aria-pressed', 'true'); }
                saveState();
            });
            row.appendChild(b);
        });
        els.conditionsRow.appendChild(row);
    });
    els.btnClearConditions.addEventListener('click', () => {
        state.activeConditions.clear();
        saveState();
        renderConditions();
    });
}

// ── CHECKS ────────────────────────────────────────────────────────────────────

function allChecks() { return [...state.checks.physical, ...state.checks.mental]; }

function renderQuickChecks() {
    els.quickChecks.innerHTML = '';
    ['physical','mental'].forEach(group => {
        const header = document.createElement('div');
        header.className = 'checks-group-label';
        header.textContent = group === 'physical' ? 'Physical' : 'Mental';
        els.quickChecks.appendChild(header);
        const grid = document.createElement('div');
        grid.className = 'quick-grid';
        state.checks[group].forEach(chk => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'quick-btn';
            b.innerHTML = `<span>${chk.label}</span><small>${fmtSigned(chk.mod)}</small>`;
            b.addEventListener('click', () => {
                els.rollLabel.value = `${chk.label} Check`;
                els.rollMod.value   = chk.mod;
                openDrawer();
            });
            grid.appendChild(b);
        });
        els.quickChecks.appendChild(grid);
    });
    els.btnClearLog.addEventListener('click', () => { state.rollLog = []; renderLogs(); });
}

function syncEditCheckInputs() {
    allChecks().forEach(chk => {
        const input = document.getElementById(`edit-mod-${chk.key}`);
        if (input) input.value = chk.mod;
    });
}

// ── ROLL DRAWER ───────────────────────────────────────────────────────────────

function bindDrawer() {
    els.fabRoll.addEventListener('click', () => { els.rollLabel.value = 'Roll'; els.rollMod.value = 0; openDrawer(); });
    els.rollDrawer.addEventListener('click', e => { if (e.target.matches('[data-drawer-close]')) closeDrawer(); });
    Array.from(document.querySelectorAll('.toggle-btn')).forEach(btn =>
        btn.addEventListener('click', () => btn.classList.toggle('is-on'))
    );
    els.btnRoll.addEventListener('click', () => {
        const label = (els.rollLabel.value || 'Roll').trim();
        const mod   = Number(els.rollMod.value || 0);
        const d20   = 1 + Math.floor(Math.random() * 20);
        const total = d20 + mod;
        const line  = `${label}: d20(${d20}) ${fmtSigned(mod)} = ${total}`;
        pushRollLog(line); pushMiniLog(line); renderLogs();
    });
    els.btnClearMiniLog.addEventListener('click', () => { state.miniRollLog = []; renderLogs(); });
}

function openDrawer()  { els.rollDrawer.classList.add('is-open');    els.rollDrawer.setAttribute('aria-hidden','false'); setTimeout(() => els.rollLabel?.focus(), 0); }
function closeDrawer() { els.rollDrawer.classList.remove('is-open'); els.rollDrawer.setAttribute('aria-hidden','true'); }

// ── SECTION EDITORS ───────────────────────────────────────────────────────────

function bindSectionEditors() {
    document.querySelectorAll('.gear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const editor  = document.getElementById(btn.dataset.editor);
            if (!editor) return;
            const opening = !editor.classList.contains('is-open');
            document.querySelectorAll('.section-editor.is-open').forEach(e => e.classList.remove('is-open'));
            document.querySelectorAll('.gear-btn.is-active').forEach(b => b.classList.remove('is-active'));
            if (opening) {
                populateEditor(btn.dataset.editor);
                editor.classList.add('is-open');
                btn.classList.add('is-active');
            }
        });
    });

    document.querySelectorAll('.done-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const kept = saveEditor(btn.dataset.save);
            if (!kept) {
                btn.closest('.section-editor').classList.remove('is-open');
                document.querySelectorAll('.gear-btn.is-active').forEach(b => b.classList.remove('is-active'));
            }
        });
    });
}

function populateEditor(editorId) {
    if (editorId === 'health-editor') {
        els.hpMaxInput.value    = state.resources.hp.max;
        els.armorMaxInput.value = state.resources.armor.max;
        els.MNMaxInput.value    = state.resources.MN.max;
    }
    if (editorId === 'checks-editor') syncEditCheckInputs();
    if (editorId === 'class-editor') {
        populateClassSelect();
        if (state.char.classKey) populatePathTalentSelects(state.char.classKey);
        const classSel = document.getElementById('class-select');
        if (classSel) classSel.onchange = () => populatePathTalentSelects(classSel.value);
    }
    if (editorId === 'res-editor') {
        const labelInput = document.getElementById('class-res-label-input');
        const maxInput   = document.getElementById('class-res-max-input');
        if (labelInput) labelInput.value = state.resources.classRes.label;
        if (maxInput)   maxInput.value   = state.resources.classRes.max;
    }
}

// Returns true if editor should stay open (equipment add pattern)
function saveEditor(target) {
    if (target === 'health') {
        state.resources.hp.max    = clampNum(els.hpMaxInput.value);
        state.resources.armor.max = clampNum(els.armorMaxInput.value);
        state.resources.MN.max    = clampNum(els.MNMaxInput.value);
        ['hp','armor','MN'].forEach(k => {
            state.resources[k].current = Math.min(state.resources[k].current, state.resources[k].max);
        });
        saveState(); syncUI();
    }
    if (target === 'checks') {
        allChecks().forEach(chk => {
            const input = document.getElementById(`edit-mod-${chk.key}`);
            if (input) chk.mod = Number(input.value) || 0;
        });
        saveState(); renderQuickChecks();
    }
    if (target === 'class') {
        const classVal  = document.getElementById('class-select')?.value  || '';
        const pathVal   = document.getElementById('path-select')?.value   || '';
        const talentVal = document.getElementById('talent-select')?.value || '';
        if (classVal !== state.char.classKey) {
            state.progression.pathChecked   = {};
            state.progression.talentChecked = {};
        }
        state.char.classKey   = classVal;
        state.char.pathName   = pathVal;
        state.char.talentName = talentVal;
        saveState(); renderClassView(); renderProgression();
    }
    if (target === 'equipment') {
        const nameInput  = document.getElementById('equip-name-input');
        const notesInput = document.getElementById('equip-notes-input');
        const name = nameInput?.value.trim();
        if (name) {
            state.equipment.push({ name, notes: notesInput?.value.trim() || '' });
            if (nameInput)  nameInput.value  = '';
            if (notesInput) notesInput.value = '';
            saveState(); renderEquipment();
        }
        return true; // keep editor open for adding more
    }
    if (target === 'classres') {
        const label = document.getElementById('class-res-label-input')?.value.trim() || 'Resource';
        const max   = clampNum(document.getElementById('class-res-max-input')?.value);
        state.resources.classRes.label  = label;
        state.resources.classRes.max    = max;
        state.resources.classRes.current = Math.min(state.resources.classRes.current, max);
        const display = document.getElementById('class-res-label-display');
        if (display) display.textContent = label;
        saveState(); syncUI();
    }
    if (target === 'gain') {
        const input = document.getElementById('gain-input');
        const val = input?.value.trim();
        if (val) {
            state.progression.otherGains.push(val);
            if (input) input.value = '';
            saveState(); renderOtherGains();
        }
        return true; // keep open
    }
    return false;
}

// ── BIO ───────────────────────────────────────────────────────────────────────

function bindBio() {
    els.btnSaveBio?.addEventListener('click', () => {
        state.char.name       = document.getElementById('char-name')?.value.trim()       || '';
        state.char.level      = clampNum(document.getElementById('char-level')?.value)   || 1;
        state.char.species    = document.getElementById('char-species')?.value.trim()    || '';
        state.char.age        = document.getElementById('char-age')?.value.trim()        || '';
        state.char.size       = document.getElementById('char-size')?.value.trim()       || '';
        state.char.diet       = document.getElementById('char-diet')?.value.trim()       || '';
        state.char.language   = document.getElementById('char-language')?.value.trim()   || '';
        state.char.motivation = document.getElementById('char-motivation')?.value.trim() || '';
        saveState();
        setActivePanel('play');
    });
}

function syncBioInputs() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('char-name',       state.char.name);
    set('char-level',      state.char.level);
    set('char-species',    state.char.species);
    set('char-age',        state.char.age);
    set('char-size',       state.char.size);
    set('char-diet',       state.char.diet);
    set('char-language',   state.char.language);
    set('char-motivation', state.char.motivation);
}

// ── PROGRESSION INTERACTIONS ──────────────────────────────────────────────────

function bindProgressionPanel() {
    document.getElementById('panel-progression')?.addEventListener('change', e => {
        const cb = e.target.closest('.prog-checkbox');
        if (!cb) return;
        const type  = cb.dataset.progType;
        const index = Number(cb.dataset.progIndex);
        if (type === 'path')   state.progression.pathChecked[index]   = cb.checked;
        if (type === 'talent') state.progression.talentChecked[index] = cb.checked;
        cb.closest('.prog-step')?.classList.toggle('prog-step--done', cb.checked);
        saveState();
    });

    document.getElementById('other-gains-list')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-remove-gain]');
        if (!btn) return;
        state.progression.otherGains.splice(Number(btn.dataset.removeGain), 1);
        saveState(); renderOtherGains();
    });

    document.getElementById('equip-list')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-remove-equip]');
        if (!btn) return;
        state.equipment.splice(Number(btn.dataset.removeEquip), 1);
        saveState(); renderEquipment();
    });
}

// ── SYNC ──────────────────────────────────────────────────────────────────────

function syncUI() {
    els.hpCur.textContent    = state.resources.hp.current;
    els.hpMax.textContent    = state.resources.hp.max;
    els.armorCur.textContent = state.resources.armor.current;
    els.armorMax.textContent = state.resources.armor.max;
    els.MNCur.textContent    = state.resources.MN.current;
    els.MNMax.textContent    = state.resources.MN.max;
    if (els.classResCur) els.classResCur.textContent = state.resources.classRes.current;
    if (els.classResMax) els.classResMax.textContent = state.resources.classRes.max;
    const labelDisplay = document.getElementById('class-res-label-display');
    if (labelDisplay) labelDisplay.textContent = state.resources.classRes.label;
    renderLogs();
}

// ── LOGS ──────────────────────────────────────────────────────────────────────

function renderLogs() {
    if (els.mainLog) {
        els.mainLog.innerHTML = '';
        state.rollLog.slice(0, 8).forEach(line => {
            const li = document.createElement('li'); li.textContent = line; els.mainLog.appendChild(li);
        });
    }
    if (els.miniLog) {
        els.miniLog.innerHTML = '';
        state.miniRollLog.slice(0, 10).forEach(line => {
            const li = document.createElement('li'); li.textContent = line; els.miniLog.appendChild(li);
        });
    }
}

function pushRollLog(line) { state.rollLog.unshift(line); if (state.rollLog.length > 20) state.rollLog.length = 20; }
function pushMiniLog(line) { state.miniRollLog.unshift(line); if (state.miniRollLog.length > 20) state.miniRollLog.length = 20; }

// ── UTILS ─────────────────────────────────────────────────────────────────────

function fmtSigned(n) { const v = Number(n) || 0; return v >= 0 ? `+${v}` : `${v}`; }
function clampNum(v)  { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }

// ── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    cacheEls();
    bindNav();
    bindResources();
    renderConditions();
    renderQuickChecks();
    bindDrawer();
    bindBio();
    bindSectionEditors();
    bindProgressionPanel();
    syncUI();
    syncBioInputs();
    renderEquipment();
    renderOtherGains();
    loadClassData();
});
