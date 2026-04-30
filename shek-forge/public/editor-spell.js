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
                <label class="field-label">Damage Type</label>
                <select class="field-input" onchange="updateSpellEffect(${idx},${ei},'damageType',this.value)">
                    ${buildSelect(SD.damageTypes, e.damageType || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Damage</label>
                <input class="field-input mono" type="text" placeholder="e.g. 2d6" value="${escAttr(e.damage || '')}"
                    onchange="updateSpellEffect(${idx},${ei},'damage',this.value)" oninput="markUnsaved()">
            </div>
            <div class="field-wrap">
                <label class="field-label">Area</label>
                <input class="field-input" type="text" value="${escAttr(e.area || '')}"
                    onchange="updateSpellEffect(${idx},${ei},'area',this.value)" oninput="markUnsaved()">
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
        : '<div class="extra-features-empty">No intent levels — add one below</div>';
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('spell', {

    groupKey: (data) => data?.some(e => e.origin) ? 'origin' : null,

    entryTitle: (e) => e.name || '(unnamed spell)',

    entryRow: (entry, showGroup) => ({
        name:   entry.name || '(unnamed)',
        meta:   [entry.manner, entry.transmission].filter(Boolean).join(' · '),
        badges: entry.origin ? [{ label: entry.origin, color: ORIGIN_COLORS[entry.origin] || '#7ecfff' }] : [],
    }),

    newEntry: (group) => ({
        name:         '',
        origin:       group || '',
        type:         'spell',
        manner:       '',
        transmission: '',
        effects:      [{ intent: 'Whisper', range: 'Short', target: 'Creature', area: '', duration: 'Instant', effect: '' }],
    }),

    render: (entry, idx) => {
        const fa = (k) => escAttr(entry[k] ?? '');
        const effects = entry.effects || [];

        return `
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
                    : '<div class="extra-features-empty">No intent levels — add one below</div>'}
            </div>
        </div>`;
    },
});
