// editor-class.js — path & talent editor for class-new.json

// ── DOMAIN VALUES ─────────────────────────────────────────────────────────────
const CD = {
    classes:     ['tank', 'professional', 'support', 'merchant', 'mage'],
    origins:     ['', 'arcane', 'tech', 'nature', 'celestial', 'chrono', 'crystal', 'dragon', 'elemental', 'fey', 'life', 'vozian', 'chaos', 'basic'],
    actions:     ['', 'Resource', 'Action', 'Half Action', 'Off-Action', 'Passive', 'Special', 'Upgrade', 'Domineer', 'Manifest', 'Decay'],
    ranges:      ['', 'Self', 'Touch', 'Melee', 'Reach', 'Short', 'Medium', 'Long', 'Area', 'Known'],
    damageTypes: ['', 'Impact', 'Piercing', 'Slashing', 'Acid', 'Eclipse', 'Fire', 'Fluid', 'Ice', 'Lightning', 'Solar', 'Thunder', 'Toxic', 'Nature', 'Psychic', 'Vozian', 'Healing'],
};

const CD_ORIGIN_COLORS = {
    arcane: '#00aaaa', tech: '#4466dd', nature: '#1b7a41', celestial: '#c87800',
    chrono: '#8a5408', crystal: '#aa2222', dragon: '#ff5500', elemental: '#275c65',
    fey: '#aa44aa', life: '#6b2a6a', vozian: '#7a3aaa', chaos: '#7a5030', basic: '#555',
};

// ── AUTOCOMPLETE SCANNER ──────────────────────────────────────────────────────
function classUnique(field) {
    const vals = new Set();
    for (const entry of state.data) {
        for (const branch of ['path', 'talent']) {
            for (const step of (entry[branch]?.steps || [])) {
                const v = step[field];
                if (v && String(v).trim()) vals.add(String(v).trim());
            }
        }
    }
    return [...vals].sort();
}

// ── STEP HELPERS ──────────────────────────────────────────────────────────────
function classRemoveStep(entryIdx, branch, stepIdx) {
    const steps = state.data[entryIdx]?.[branch]?.steps;
    if (!Array.isArray(steps)) return;
    steps.splice(stepIdx, 1);
    steps.forEach((s, i) => { s.step = i; });
    markUnsaved();
    renderEditor();
}

function classAddStep(entryIdx, branch) {
    const entry = state.data[entryIdx];
    if (!entry?.[branch]) entry[branch] = { steps: [] };
    if (!Array.isArray(entry[branch].steps)) entry[branch].steps = [];
    const steps = entry[branch].steps;
    steps.push({
        step: steps.length,
        name: '', action: '', check: '', range: '',
        description: '', duration: '', damage: '', damageType: '', armor: '', condition: '',
    });
    markUnsaved();
    renderEditor();
    requestAnimationFrame(() => {
        document.querySelector('.extra-features-list:last-of-type .extra-feature:last-child')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

// ── STEP RENDERER ─────────────────────────────────────────────────────────────
function renderClassStep(step, si, idx, branch, durId, condId) {
    const pp    = key => escAttr(`${branch}.steps.${si}.${key}`);
    const sel   = (opts, val) => opts.map(o =>
        `<option value="${escAttr(o)}"${o === (val ?? '') ? ' selected' : ''}>${escHtml(o) || '—'}</option>`
    ).join('');
    const isTalent = branch === 'talent';

    return `<div class="extra-feature">
        <div class="extra-feature-header">
            <span class="class-step-num">${step.step ?? si}</span>
            <input class="extra-feature-name field-input class-step-name" type="text"
                value="${escAttr(step.name || '')}"
                onchange="updateField(${idx},'${pp('name')}',this.value)" oninput="markUnsaved()"
                placeholder="Step name...">
            <select class="field-input class-step-action" style="width:120px;flex-shrink:0;"
                onchange="updateField(${idx},'${pp('action')}',this.value)">
                ${sel(CD.actions, step.action)}
            </select>
            <button class="extra-feature-delete"
                onclick="classRemoveStep(${idx},'${branch}',${si})">✕</button>
        </div>
        <div class="extra-feature-body">
            <div class="field-flex">
                <div class="field-wrap fw-md">
                    <label class="field-label">Check</label>
                    <input class="field-input" type="text" placeholder="Strength, Agility"
                        value="${escAttr(step.check || '')}"
                        onchange="updateField(${idx},'${pp('check')}',this.value)" oninput="markUnsaved()">
                </div>
                <div class="field-wrap fw-sm">
                    <label class="field-label">Range</label>
                    <select class="field-input"
                        onchange="updateField(${idx},'${pp('range')}',this.value)">
                        ${sel(CD.ranges, step.range)}
                    </select>
                </div>
                <div class="field-wrap fw-lg">
                    <label class="field-label">Duration</label>
                    <input class="field-input" type="text" placeholder="Until end of turn"
                        list="${durId}" value="${escAttr(step.duration || '')}"
                        onchange="updateField(${idx},'${pp('duration')}',this.value)" oninput="markUnsaved()">
                </div>
                <div class="field-wrap fw-sm">
                    <label class="field-label">Condition</label>
                    <input class="field-input" type="text" placeholder="Stunned"
                        list="${condId}" value="${escAttr(step.condition || '')}"
                        onchange="updateField(${idx},'${pp('condition')}',this.value)" oninput="markUnsaved()">
                </div>
                <div class="field-wrap fw-xs">
                    <label class="field-label">Damage</label>
                    <input class="field-input mono" type="text" placeholder="1d6"
                        value="${escAttr(String(step.damage ?? ''))}"
                        onchange="updateField(${idx},'${pp('damage')}',this.value)" oninput="markUnsaved()">
                </div>
                <div class="field-wrap fw-sm">
                    <label class="field-label">Damage Type</label>
                    <select class="field-input"
                        onchange="updateField(${idx},'${pp('damageType')}',this.value)">
                        ${sel(CD.damageTypes, step.damageType)}
                    </select>
                </div>
                <div class="field-wrap fw-xs">
                    <label class="field-label">Armor</label>
                    <input class="field-input mono" type="text" placeholder="10"
                        value="${escAttr(String(step.armor ?? ''))}"
                        onchange="updateField(${idx},'${pp('armor')}',this.value)" oninput="markUnsaved()">
                </div>
                <div class="field-wrap fw-full">
                    <label class="field-label">Description</label>
                    <textarea class="field-input" rows="3"
                        onchange="updateField(${idx},'${pp('description')}',this.value)"
                        oninput="markUnsaved()">${escHtml(step.description || '')}</textarea>
                </div>
            </div>
        </div>
    </div>`;
}

// ── BRANCH SECTION (path or talent) ──────────────────────────────────────────
function renderClassBranch(entry, idx, branch) {
    const steps  = entry[branch]?.steps || [];
    const label  = branch.charAt(0).toUpperCase() + branch.slice(1);

    const durId  = `cd-dur-${idx}-${branch}`;
    const condId = `cd-cond-${idx}-${branch}`;

    const durOpts  = classUnique('duration').map(v  => `<option value="${escAttr(v)}">`).join('');
    const condOpts = classUnique('condition').map(v => `<option value="${escAttr(v)}">`).join('');
    const datalists = `<datalist id="${durId}">${durOpts}</datalist>
                       <datalist id="${condId}">${condOpts}</datalist>`;

    const items = steps.length
        ? steps.map((s, si) => renderClassStep(s, si, idx, branch, durId, condId)).join('')
        : `<div class="extra-features-empty">No steps — click + Step to add one</div>`;

    return `<div class="forge-section">
        <div class="section-header section-header-split">
            <span>${label}
                <span style="opacity:0.4;font-size:9px;letter-spacing:0;">[${steps.length} steps]</span>
            </span>
            <button class="btn-section-add" onclick="classAddStep(${idx},'${branch}')">+ Step</button>
        </div>
        ${datalists}
        <div class="extra-features-list">${items}</div>
    </div>`;
}

// ── MAIN RENDER ───────────────────────────────────────────────────────────────
function renderClassEntry(entry, idx) {
    const sel = (opts, val) => opts.map(o =>
        `<option value="${escAttr(o)}"${o === (val ?? '') ? ' selected' : ''}>${escHtml(o) || '—'}</option>`
    ).join('');

    const identitySection = `<div class="forge-section">
        <div class="section-header">Identity</div>
        <div class="section-body">
            <div class="field-flex">
                <div class="field-wrap fw-lg">
                    <label class="field-label">Name</label>
                    <input class="field-input"
                        style="font-family:'Cinzel',serif;letter-spacing:0.04em;"
                        type="text" value="${escAttr(entry.name || '')}"
                        onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
                </div>
                <div class="field-wrap fw-sm">
                    <label class="field-label">Class</label>
                    <select class="field-input"
                        onchange="updateField(${idx},'class',this.value);updateField(${idx},'_group',this.value);refreshGroups()">
                        ${sel(CD.classes, entry.class)}
                    </select>
                </div>
                <div class="field-wrap fw-sm">
                    <label class="field-label">Origin</label>
                    <select class="field-input"
                        onchange="updateField(${idx},'origin',this.value)">
                        ${sel(CD.origins, entry.origin)}
                    </select>
                </div>
                <div class="field-wrap fw-full">
                    <label class="field-label">Description</label>
                    <textarea class="field-input" rows="3"
                        onchange="updateField(${idx},'desc',this.value)"
                        oninput="markUnsaved()">${escHtml(entry.desc || '')}</textarea>
                </div>
            </div>
        </div>
    </div>`;

    return identitySection
        + renderClassBranch(entry, idx, 'path')
        + renderClassBranch(entry, idx, 'talent');
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('class', {
    groupKey: () => '_group',

    entryTitle: entry => entry.name || '(unnamed)',

    entryRow: (entry) => {
        const pathSteps   = entry.path?.steps?.length   ?? 0;
        const talentSteps = entry.talent?.steps?.length ?? 0;
        const origin      = entry.origin || '';
        const color       = CD_ORIGIN_COLORS[origin] || '#666';
        return {
            name:   entry.name || '(unnamed)',
            meta:   `${pathSteps}p · ${talentSteps}t`,
            badges: origin ? [{ label: origin, color }] : [],
        };
    },

    headerActions: (entry) => {
        const cls    = entry.class || '';
        const origin = entry.origin || '';
        const color  = CD_ORIGIN_COLORS[origin] || '#666';
        if (!cls && !origin) return '';
        return `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;padding:4px 10px;
                    border:1px solid var(--border);border-radius:2px;color:${color};
                    align-self:center;letter-spacing:0.08em;text-transform:uppercase;">
                    ${escHtml(cls)}${origin ? ' · ' + origin : ''}
                </div>`;
    },

    render: renderClassEntry,

    newEntry: (group) => ({
        _group: group || 'tank',
        class:  group || 'tank',
        name:   '',
        origin: '',
        desc:   '',
        path:   { steps: [{ step: 0, name: '', action: 'Resource', check: '', range: '', description: '', duration: '', damage: '', damageType: '', armor: '', condition: '' }] },
        talent: { steps: [] },
    }),
});
