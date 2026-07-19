// ── SPELL EDITOR ──────────────────────────────────────────────────────────────

const ORIGIN_COLORS = {
    Arcane:    '#a070f0',
    Basic:     '#b0b0b0',
    Celestial: '#f0d060',
    Chaos:     '#f06030',
    Chrono:    '#40d0c0',
    Crystal:   '#70d8f8',
    Dragon:    '#e04848',
    Elemental: '#e08830',
    Fey:       '#e060c0',
    Life:      '#60d060',
    Nature:    '#80c040',
    Tech:      '#4090e0',
    Vozian:    '#9040d0',
};

const SD = {
    origins:       ['', 'Arcane', 'Basic', 'Celestial', 'Chaos', 'Chrono', 'Crystal', 'Dragon', 'Elemental', 'Fey', 'Life', 'Nature', 'Tech', 'Vozian'],
    manners:       ['', 'Decay', 'Discern', 'Domineer', 'Manifest'],
    transmissions: ['', 'Aether', 'Astral', 'Corpus', 'Elemental', 'Material'],
    intents:       ['', 'Light Whisper', 'Whisper', 'Surge', 'Shout', 'Roar', 'Storm', 'Cataclysm'],
    ranges:        ['', 'Self', 'Melee', 'Reach', 'Short', 'Medium', 'Long'],
    targets:       ['', 'Self', 'Creature', 'Area', 'Object', 'Point'],
    durations:     ['', 'Instant', 'Until end of next turn', 'Until end of your next turn', '1 minute', '10 minutes', '1 hour', '8 hours', '24 hours', '1 week', '1 month', 'Permanent'],
    damageTypes:   ['', 'None', 'Impact', 'Piercing', 'Slashing', 'Acid', 'Eclipse', 'Fire', 'Fluid', 'Ice', 'Lightning', 'Solar', 'Thunder', 'Toxic', 'Nature', 'Psychic', 'Vozian', 'Healing'],
};

const INTENT_COSTS_S = { 'light whisper': 0, 'whisper': 1, 'surge': 3, 'shout': 6, 'roar': 9, 'storm': 12, 'cataclysm': 24 };

// ── QUALITY CHECK ─────────────────────────────────────────────────────────────
function spellQCFields(entry) {
    return (entry.effects || []).map((e, ei) =>
        ({ label: e.intent || `Effect ${ei + 1}`, get: en => (en.effects || [])[ei]?.effect }));
}
function spellQCAnalyze(entry) {
    return qcAnalyzeProse(entry, 'spell', entry.name || '(unnamed)', spellQCFields(entry));
}

// ── EFFECT CRUD ───────────────────────────────────────────────────────────────
function addSpellEffect(idx) {
    if (!state.data[idx].effects) state.data[idx].effects = [];
    state.data[idx].effects.push({ intent: 'Whisper', range: 'Short', target: 'Creature', area: '', duration: 'Instant', effect: '' });
    markUnsaved();
    renderSpellEffects(idx);
}

function removeSpellEffect(idx, ei) {
    state.data[idx].effects?.splice(ei, 1);
    markUnsaved();
    renderSpellEffects(idx);
}

function updateSpellEffect(idx, ei, key, value) {
    if (!state.data[idx].effects?.[ei]) return;
    state.data[idx].effects[ei][key] = value;
    markUnsaved();
}

function renderSpellEffectRow(idx, ei, e) {
    const intentCost = INTENT_COSTS_S[String(e.intent || '').toLowerCase()] ?? '?';
    return `
    <div class="extra-feature" id="spell-effect-${idx}-${ei}">
        <div class="extra-feature-header">
            <span style="font-weight:600;color:var(--gold)">${escHtml(e.intent || 'Effect')}</span>
            <span class="pl-bubble" style="margin-left:6px">
                <span class="pl-seg pl-seg-mt"><strong>MN</strong> ${intentCost}</span>
            </span>
            <button class="extra-feature-delete" onclick="removeSpellEffect(${idx},${ei})">✕</button>
        </div>
        <div class="field-grid">
            <div class="field-wrap">
                <label class="field-label">Intent</label>
                <select class="field-input" onchange="
                    updateSpellEffect(${idx},${ei},'intent',this.value);
                    updateSpellEffect(${idx},${ei},'cost', INTENT_COSTS_S[this.value.toLowerCase()] ?? 0);
                    renderSpellEffects(${idx})">
                    ${buildSelect(SD.intents, e.intent || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Range</label>
                <select class="field-input" onchange="updateSpellEffect(${idx},${ei},'range',this.value)">
                    ${buildSelect(SD.ranges, e.range || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Target</label>
                <select class="field-input" onchange="updateSpellEffect(${idx},${ei},'target',this.value)">
                    ${buildSelect(SD.targets, e.target || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Area</label>
                <input class="field-input" type="text" placeholder="e.g. 10ft cone" value="${escAttr(e.area || '')}"
                    onchange="updateSpellEffect(${idx},${ei},'area',this.value)" oninput="markUnsaved()">
            </div>
            <div class="field-wrap">
                <label class="field-label">Damage</label>
                <input class="field-input mono" type="text" placeholder="e.g. 2d6" value="${escAttr(e.damage || '')}"
                    onchange="updateSpellEffect(${idx},${ei},'damage',this.value)" oninput="markUnsaved()">
            </div>
            <div class="field-wrap">
                <label class="field-label">Damage Type</label>
                <select class="field-input" onchange="updateSpellEffect(${idx},${ei},'damageType',this.value)">
                    ${buildSelect(SD.damageTypes, e.damageType || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Duration</label>
                <select class="field-input" onchange="updateSpellEffect(${idx},${ei},'duration',this.value)">
                    ${buildSelect(SD.durations, e.duration || '')}
                </select>
            </div>
            <div class="field-wrap full">
                <label class="field-label">Effect</label>
                <textarea class="field-input" rows="3" data-quick-build="feature"
                    onchange="updateSpellEffect(${idx},${ei},'effect',this.value)"
                    oninput="markUnsaved()">${escHtml(e.effect || '')}</textarea>
            </div>
        </div>
    </div>`;
}

function renderSpellEffects(idx) {
    const el = document.getElementById(`spell-effects-${idx}`);
    if (!el) return;
    const effects = state.data[idx].effects || [];
    el.innerHTML = effects.length
        ? effects.map((e, ei) => renderSpellEffectRow(idx, ei, e)).join('')
        : '<div class="extra-features-empty">No intent levels - add one below</div>';
}

// ── SPELL TABLE ───────────────────────────────────────────────────────────────
const GT_SPELL_COLS = [
    { label: '#',            key: null,         style: 'width:28px' },
    { label: 'Name',         key: 'name' },
    { label: 'Origin',       key: 'origin' },
    { label: 'Manner',       key: 'manner' },
    { label: 'Transmission', key: 'transmission' },
    { label: 'Effects',      key: null,         style: 'width:60px' },
    { label: '',             key: null,         style: 'width:56px' },
];

function renderSpellTable() {
    const type = 'spell';
    const sel = buildSelect;
    const sorted = tmSortedRows(type, state.filteredData, [], []);

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        const effectCount = (e.effects || []).length;
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td><input class="gt-input gt-input-name" type="text" value="${escAttr(e.name||'')}"
                onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'origin',this.value);refreshGroups()">
                ${sel(SD.origins, e.origin)}</select></td>
            <td><select class="gt-input" onchange="updateField(${idx},'manner',this.value)">
                ${sel(SD.manners, e.manner)}</select></td>
            <td><select class="gt-input" onchange="updateField(${idx},'transmission',this.value)">
                ${sel(SD.transmissions, e.transmission)}</select></td>
            <td><span class="gt-effect-count">${effectCount}</span></td>
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('spell',${idx})" title="Edit effects &amp; full form">✎</button>
                    <button class="gt-btn gt-btn-del" onclick="tmDeleteRow('spell',${idx})" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const count = state.filteredData.length;
    const groupLabel = state.currentGroup === 'All' ? 'all origins' : state.currentGroup;
    document.getElementById('fieldEditor').innerHTML = `
        <div class="gear-table-wrap">
            <div class="gear-table-topbar">
                <div>
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Spells')}</div>
                    <div class="entry-subtitle">${count} spells · ${escHtml(groupLabel)} · ✎ to edit effects &amp; full form</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('spell')">← Form View</button>
                    <button class="btn btn-green" onclick="spellTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, GT_SPELL_COLS)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function spellTableNewRow() {
    const editor = EDITORS['spell'];
    const group = state.currentGroup !== 'All' ? state.currentGroup : '';
    const entry = editor.newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderSpellTable();
    markUnsaved();
    updateStatus();
    setTimeout(() => {
        const newIdx = state.data.length - 1;
        const row = document.querySelector(`.gear-table tbody tr[data-idx="${newIdx}"]`);
        if (row) {
            const inp = row.querySelector('.gt-input-name');
            if (inp) { row.scrollIntoView({ block: 'center' }); inp.focus(); inp.select(); }
        }
    }, 30);
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('spell', {

    groupKey: (data) => data?.some(e => e.origin) ? 'origin' : null,

    entryTitle: (e) => e.name || '(unnamed spell)',

    entryRow: (entry, showGroup) => {
        const issueCount = spellQCAnalyze(entry).length;
        return {
            name:   entry.name || '(unnamed)',
            meta:   [entry.manner, entry.transmission].filter(Boolean).join(' · '),
            badges: [
                entry.origin ? { label: entry.origin, color: ORIGIN_COLORS[entry.origin] || '#7ecfff' } : null,
                issueCount > 0 ? { label: `⚠ ${issueCount}`, color: '#cc7733' } : null,
            ].filter(Boolean),
        };
    },

    newEntry: (group) => ({
        name:         '',
        origin:       group || '',
        type:         'spell',
        manner:       '',
        transmission: '',
        effects:      [{ intent: 'Whisper', range: 'Short', target: 'Creature', area: '', duration: 'Instant', effect: '' }],
    }),

    qcCount: (data) => data.reduce((n, e) => n + spellQCAnalyze(e).length, 0),

    render: (entry, idx) => {
        const fa = (k) => escAttr(entry[k] ?? '');
        const effects = entry.effects || [];

        return `
        ${qcRenderPanel(spellQCAnalyze(entry), 'spell', entry.name || '(unnamed)')}

        <div class="forge-section">
            <div class="section-header">Identity</div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap full">
                        <label class="field-label">Name</label>
                        <input class="field-input" type="text" value="${fa('name')}"
                            onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Origin</label>
                        <select class="field-input" onchange="updateField(${idx},'origin',this.value)">
                            ${buildSelect(SD.origins, entry.origin || '')}
                        </select>
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Manner</label>
                        <select class="field-input" onchange="updateField(${idx},'manner',this.value)">
                            ${buildSelect(SD.manners, entry.manner || '')}
                        </select>
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Transmission</label>
                        <select class="field-input" onchange="updateField(${idx},'transmission',this.value)">
                            ${buildSelect(SD.transmissions, entry.transmission || '')}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="forge-section">
            <div class="section-header section-header-split">
                <span>Intent Levels</span>
                <button class="btn-section-add" onclick="addSpellEffect(${idx})">+ Add</button>
            </div>
            <div class="extra-features-list" id="spell-effects-${idx}">
                ${effects.length
                    ? effects.map((e, ei) => renderSpellEffectRow(idx, ei, e)).join('')
                    : '<div class="extra-features-empty">No intent levels - add one below</div>'}
            </div>
        </div>`;
    },

    onLoad() {
        tmRegister('spell', renderSpellTable);
        tmOnLoad('spell');
    },
});
