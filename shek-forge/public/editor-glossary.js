// ── GLOSSARY EDITOR ───────────────────────────────────────────────────────────

const GLOSS_TYPES = [
    '', 'condition', 'check', 'resource', 'mechanic',
    'action', 'range', 'movement', 'size', 'property', 'setting',
];

// Suggested categories per type — shown as datalist hints
const GLOSS_CAT_HINTS = {
    condition: ['Corpus', 'Cognition', 'Special', 'Major'],
    check:     ['Physical', 'Mental'],
    resource:  ['Character', 'Social'],
    mechanic:  ['Rolls', 'Character', 'Combat'],
    action:    ['Action Economy', 'Action', 'Half-Action', 'Off-Action', 'Rest'],
    range:     ['Range'],
    movement:  ['Movement'],
    size:      ['Size'],
    property:  ['Weapon', 'Armor'],
    setting:   ['Roles', 'World', 'Character', 'Gameplay'],
};

const GLOSS_TYPE_COLORS = {
    condition: '#8c2020',
    check:     '#205080',
    resource:  '#3a6a30',
    mechanic:  '#60402a',
    action:    '#404060',
    range:     '#2a5050',
    movement:  '#2a5050',
    size:      '#5a3a70',
    property:  '#7a4a10',
    setting:   '#306050',
};

// ── DUPLICATE ─────────────────────────────────────────────────────────────────
function duplicateGlossEntry(idx) {
    const original = state.data[idx];
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.term = (original.term || 'Entry') + ' (Copy)';
    state.data.splice(idx + 1, 0, copy);
    state.filteredData = getVisibleData();
    state.currentIndex = idx + 1;
    renderGroupSelector(); renderEntryList(); renderEditor(); markUnsaved(); updateStatus();
    showToast(`Duplicated "${original.term || 'entry'}"`, 'success');
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('glossary', {

    groupKey: () => 'type',

    entryTitle: (e) => e.term || '(unnamed)',

    entryRow: (entry) => {
        const color = GLOSS_TYPE_COLORS[entry.type] || '#555';
        const def = entry.definition || '';
        return {
            name:   entry.term || '(unnamed)',
            meta:   def.length > 60 ? def.slice(0, 60) + '…' : def,
            badges: [
                entry.type     ? { label: entry.type,     color }   : null,
                entry.category ? { label: entry.category, color: '#555' } : null,
            ].filter(Boolean),
        };
    },

    headerActions: (entry, idx) =>
        `<button class="btn btn-ghost" onclick="duplicateGlossEntry(${idx})" title="Duplicate">⧉ Duplicate</button>`,

    newEntry: (group) => ({
        term: '', type: group || '', category: '', definition: '', duration: '',
    }),

    qcCount: (data) => data.filter(e => !e.term || !e.definition).length,

    render: (entry, idx) => {
        const type     = entry.type || '';
        const hints    = GLOSS_CAT_HINTS[type] || [];
        const datalist = hints.map(c => `<option value="${escAttr(c)}">`).join('');
        const showDuration = type === 'condition';

        return `
            <div class="forge-section">
                <div class="section-header">Term</div>
                <div class="section-body">
                    <input class="field-input"
                        style="font-size:13px;font-family:'Cinzel',serif;letter-spacing:0.04em;"
                        type="text"
                        value="${escAttr(entry.term || '')}"
                        placeholder="Term name…"
                        onchange="updateField(${idx},'term',this.value)"
                        oninput="markUnsaved()">
                </div>
            </div>

            <div class="section-pair">
                <div class="forge-section">
                    <div class="section-header">Type</div>
                    <div class="section-body">
                        <select class="field-input"
                            onchange="updateField(${idx},'type',this.value);refreshGroups();renderEditor()">
                            ${buildSelect(GLOSS_TYPES, type)}
                        </select>
                    </div>
                </div>
                <div class="forge-section">
                    <div class="section-header">Category</div>
                    <div class="section-body">
                        <input class="field-input" type="text"
                            list="gloss-cat-${idx}"
                            value="${escAttr(entry.category || '')}"
                            placeholder="${hints[0] || 'Category…'}"
                            onchange="updateField(${idx},'category',this.value)"
                            oninput="markUnsaved()">
                        <datalist id="gloss-cat-${idx}">${datalist}</datalist>
                    </div>
                </div>
            </div>

            <div class="forge-section">
                <div class="section-header">Definition</div>
                <div class="section-body">
                    <textarea class="field-input" rows="5"
                        placeholder="Clear, concise definition…"
                        onchange="updateField(${idx},'definition',this.value)"
                        oninput="markUnsaved()">${escHtml(entry.definition || '')}</textarea>
                </div>
            </div>

            ${showDuration ? `
            <div class="forge-section">
                <div class="section-header">Duration</div>
                <div class="section-body">
                    <input class="field-input" type="text"
                        value="${escAttr(entry.duration || '')}"
                        placeholder="e.g. Until end of next turn"
                        onchange="updateField(${idx},'duration',this.value)"
                        oninput="markUnsaved()">
                </div>
            </div>` : ''}
        `;
    },
});
