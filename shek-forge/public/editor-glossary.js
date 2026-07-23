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

// ── GLOSSARY TABLE ────────────────────────────────────────────────────────────
const GT_GLOSSARY_COLS = [
    { label: '#',          key: null,         style: 'width:28px' },
    { label: 'Term',       key: 'term' },
    { label: 'Type',       key: 'type',       style: 'width:110px' },
    { label: 'Category',   key: 'category',   style: 'width:110px' },
    { label: 'Definition', key: 'definition' },
    { label: 'Duration',   key: 'duration',   style: 'width:140px' },
    { label: '',           key: null,         style: 'width:56px' },
];

function renderGlossaryTable() {
    const type = 'glossary';
    const sel = buildSelect;
    const categories = [...new Set(state.data.map(e => e.category).filter(Boolean))].sort();
    const sorted = tmSortedRows(type, state.filteredData, [], []);

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td><input class="gt-input gt-input-name" type="text" value="${escAttr(e.term||'')}"
                onchange="updateField(${idx},'term',this.value)" oninput="markUnsaved()"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'type',this.value);refreshGroups()">
                ${sel(GLOSS_TYPES, e.type)}</select></td>
            <td><input class="gt-input" type="text" list="gt-gloss-categories" value="${escAttr(e.category||'')}"
                onchange="updateField(${idx},'category',this.value)" oninput="markUnsaved()" style="min-width:90px"></td>
            <td><textarea class="gt-input" rows="2" style="resize:vertical;min-width:220px"
                onchange="updateField(${idx},'definition',this.value)" oninput="markUnsaved()">${escHtml(e.definition||'')}</textarea></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.duration||'')}"
                onchange="updateField(${idx},'duration',this.value)" oninput="markUnsaved()" style="min-width:100px"></td>
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('glossary',${idx})" title="Edit full form">✎</button>
                    <button class="gt-btn gt-btn-del" onclick="tmDeleteRow('glossary',${idx})" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const count = state.filteredData.length;
    const groupLabel = state.currentGroup === 'All' ? 'all types' : state.currentGroup;
    document.getElementById('fieldEditor').innerHTML = `
        <div class="gear-table-wrap">
            <datalist id="gt-gloss-categories">${categories.map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
            <div class="gear-table-topbar">
                <div>
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Glossary')}</div>
                    <div class="entry-subtitle">${count} entries · ${escHtml(groupLabel)} · ✎ to edit full form</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('glossary')">← Form View</button>
                    <button class="btn btn-green" onclick="glossaryTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, GT_GLOSSARY_COLS)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function glossaryTableNewRow() {
    const editor = EDITORS['glossary'];
    const group = state.currentGroup !== 'All' ? state.currentGroup : '';
    const entry = editor.newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderGlossaryTable();
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

// ── QUALITY CHECK ─────────────────────────────────────────────────────────────
function glossaryQCFields(entry) {
    return [
        { label: 'Term', get: e => e.term, required: true },
        { label: 'Definition', get: e => e.definition, required: true },
    ];
}
// Catches likely duplicate/typo pairs like "Exhaustion" vs "Exhausted" that
// exact-match duplicate detection (app.js's findDuplicates) can't see.
function glossNormalize(term) {
    return String(term || '').toLowerCase().trim().replace(/(tion|sion|ing|ed|es|s)$/, '');
}
function glossaryNearDupIssues(entry, data) {
    if (!entry.term || !entry.type) return [];
    const norm = glossNormalize(entry.term);
    if (!norm) return [];
    const matches = data.filter(e => e !== entry && e.type === entry.type && e.term && glossNormalize(e.term) === norm);
    if (!matches.length) return [];
    const ignored = qcGetIgnored('glossary');
    const key = `${entry.term}::Term::near_dup`;
    if (ignored.has(key)) return [];
    return [{
        key, fieldLabel: 'Term',
        label: 'Possible near-duplicate term',
        detail: `"${entry.term}" looks similar to ${matches.map(m => `"${m.term}"`).join(', ')} - check if these should be merged.`,
    }];
}
function glossaryQCAnalyze(entry, allData) {
    const data = allData || state.data;
    return [
        ...qcAnalyzeProse(entry, 'glossary', entry.term || '(unnamed)', glossaryQCFields(entry)),
        ...glossaryNearDupIssues(entry, data),
    ];
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('glossary', {

    groupKey: () => 'type',

    entryTitle: (e) => e.term || '(unnamed)',

    entryRow: (entry) => {
        const color = GLOSS_TYPE_COLORS[entry.type] || '#555';
        const def = entry.definition || '';
        const issueCount = glossaryQCAnalyze(entry).length;
        return {
            name:   entry.term || '(unnamed)',
            meta:   def.length > 60 ? def.slice(0, 60) + '…' : def,
            badges: [
                entry.type     ? { label: entry.type,     color }   : null,
                entry.category ? { label: entry.category, color: '#555' } : null,
                issueCount > 0 ? { label: `⚠ ${issueCount}`, color: '#cc7733' } : null,
            ].filter(Boolean),
        };
    },

    headerActions: (entry, idx) =>
        `<button class="btn btn-ghost" onclick="duplicateGlossEntry(${idx})" title="Duplicate">⧉ Duplicate</button>`,

    newEntry: (group) => ({
        term: '', type: group || '', category: '', definition: '', duration: '',
    }),

    qcCount: (data) => data.reduce((n, e) => n + glossaryQCAnalyze(e).length, 0),

    onLoad() {
        tmRegister('glossary', renderGlossaryTable);
        tmOnLoad('glossary');
    },

    render: (entry, idx) => {
        const type     = entry.type || '';
        const hints    = GLOSS_CAT_HINTS[type] || [];
        const datalist = hints.map(c => `<option value="${escAttr(c)}">`).join('');
        const showDuration = type === 'condition';

        return `
            ${qcRenderPanel(glossaryQCAnalyze(entry), 'glossary', entry.term || '(unnamed)')}

            <div class="forge-section">
                <div class="section-header">Term</div>
                <div class="section-body">
                    <input class="field-input field-input-name"
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
