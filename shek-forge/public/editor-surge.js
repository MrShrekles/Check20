// ── SURGE / ROLL TABLE EDITOR (surges.json) ──────────────────────────────────
// One entry per die result: { table, roll, text }. Because a surge table is read
// as a grid rather than a set of records, this editor opens straight into table
// mode - the per-entry form is still there for long rewrites, but the table is
// the point. Grouping is by `table` so several roll tables can share one file.

// ── TABLE VIEW ───────────────────────────────────────────────────────────────
const GT_SURGE_COLS = [
    { label: '#',     key: null,    style: 'width:28px' },
    { label: 'Roll',  key: 'roll',  style: 'width:70px' },
    { label: 'Result', key: 'text' },
    { label: 'Table', key: 'table', style: 'width:150px' },
    { label: '',      key: null,    style: 'width:56px' },
];

// A d100 table is only usable if every face is covered exactly once, so the
// coverage of the current group is worth surfacing above the grid.
function surgeCoverage(entries) {
    const rolls = entries.map(e => Number(e.roll)).filter(n => Number.isFinite(n));
    if (!rolls.length) return { max: 0, dupes: [], gaps: [] };
    const max = Math.max(...rolls);
    const seen = new Map();
    rolls.forEach(r => seen.set(r, (seen.get(r) || 0) + 1));
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([r]) => r).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i <= max; i++) if (!seen.has(i)) gaps.push(i);
    return { max, dupes, gaps };
}

function surgeCoverageLabel(entries) {
    const { max, dupes, gaps } = surgeCoverage(entries);
    if (!max) return '';
    const parts = [`d${max}`];
    if (gaps.length) parts.push(`⚠ ${gaps.length} gap${gaps.length > 1 ? 's' : ''}: ${gaps.slice(0, 8).join(', ')}${gaps.length > 8 ? '…' : ''}`);
    if (dupes.length) parts.push(`⚠ duplicate roll${dupes.length > 1 ? 's' : ''}: ${dupes.slice(0, 8).join(', ')}${dupes.length > 8 ? '…' : ''}`);
    if (!gaps.length && !dupes.length) parts.push('✓ no gaps or duplicates');
    return parts.join(' · ');
}

function renderSurgeTable() {
    const type = 'surge';
    // Default to roll order: an unsorted surge table is just noise.
    const sort = tmGetSort(type);
    const sorted = sort.col
        ? tmSortedRows(type, state.filteredData, ['roll'], [])
        : [...state.filteredData].sort((a, b) => (Number(a.roll) || 0) - (Number(b.roll) || 0));

    const tables = [...new Set(state.data.map(e => e.table).filter(Boolean))].sort();
    const { dupes } = surgeCoverage(state.filteredData);
    const dupeSet = new Set(dupes);

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        const issues = surgeQCAnalyze(e).length;
        const dupe = dupeSet.has(Number(e.roll));
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td><input class="gt-input gt-input-mono" type="number" min="1" value="${escAttr(e.roll ?? '')}"
                ${dupe ? 'style="border-color:#cc5544"' : ''} title="${dupe ? 'Duplicate roll number' : 'Die result'}"
                onchange="surgeSetRoll(${idx},this.value)" oninput="markUnsaved()"></td>
            <td><textarea class="gt-input" rows="2" style="resize:vertical;min-width:320px"
                onchange="updateField(${idx},'text',this.value)" oninput="markUnsaved()">${escHtml(e.text || '')}</textarea></td>
            <td><input class="gt-input" type="text" list="gt-surge-tables" value="${escAttr(e.table || '')}"
                onchange="updateField(${idx},'table',this.value);refreshGroups()" oninput="markUnsaved()"></td>
            <td>
                <div class="gt-actions">
                    ${issues ? `<span class="gt-flag" title="${escAttr(surgeQCAnalyze(e).map(i => i.label).join(' · '))}">⚠</span>` : ''}
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('surge',${idx})" title="Edit full form">✎</button>
                    <button class="gt-btn gt-btn-del" onclick="tmDeleteRow('surge',${idx})" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const count = state.filteredData.length;
    const groupLabel = state.currentGroup === 'All' ? 'all tables' : state.currentGroup;
    const coverage = state.currentGroup === 'All' ? '' : surgeCoverageLabel(state.filteredData);

    document.getElementById('fieldEditor').innerHTML = `
        <div class="gear-table-wrap">
            <datalist id="gt-surge-tables">${tables.map(t => `<option value="${escAttr(t)}">`).join('')}</datalist>
            <div class="gear-table-topbar">
                <div>
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Surges')}</div>
                    <div class="entry-subtitle">${count} results · ${escHtml(groupLabel)}${coverage ? ' · ' + escHtml(coverage) : ''}</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('surge')">← Form View</button>
                    <button class="btn btn-green" onclick="surgeTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, GT_SURGE_COLS)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

// Rolls are stored as numbers so sorting and gap detection stay honest.
function surgeSetRoll(idx, value) {
    const n = parseInt(value, 10);
    updateField(idx, 'roll', Number.isFinite(n) ? n : '');
    renderSurgeTable();
}

function surgeTableNewRow() {
    const group = state.currentGroup !== 'All' ? state.currentGroup : (state.data[0]?.table || '');
    const entry = EDITORS['surge'].newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderSurgeTable();
    markUnsaved();
    updateStatus();
    setTimeout(() => {
        const row = document.querySelector(`.gear-table tbody tr[data-idx="${state.data.length - 1}"]`);
        if (row) {
            const ta = row.querySelector('textarea.gt-input');
            if (ta) { row.scrollIntoView({ block: 'center' }); ta.focus(); }
        }
    }, 30);
}

// ── QUALITY CHECK ─────────────────────────────────────────────────────────────
function surgeQCFields() {
    return [{ label: 'Result', get: e => e.text, required: true }];
}
function surgeQCAnalyze(entry) {
    const label = `${entry.table || 'Table'} ${entry.roll ?? '?'}`;
    return qcAnalyzeProse(entry, 'surge', label, surgeQCFields());
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('surge', {

    groupKey: () => 'table',

    entryTitle: (e) => `${e.roll ?? '?'}. ${e.text || '(empty)'}`,

    entryRow: (entry) => {
        const text = entry.text || '';
        const issueCount = surgeQCAnalyze(entry).length;
        return {
            name:   String(entry.roll ?? '?'),
            meta:   text.length > 70 ? text.slice(0, 70) + '…' : text,
            badges: [
                entry.table  ? { label: entry.table, color: '#8a4a1e' } : null,
                issueCount   ? { label: `⚠ ${issueCount}`, color: '#cc7733' } : null,
            ].filter(Boolean),
        };
    },

    // Next unused face in this table, so adding rows fills the die in order.
    newEntry: (group) => {
        const table = group || '';
        const used = new Set(state.data.filter(e => e.table === table).map(e => Number(e.roll)));
        let roll = 1;
        while (used.has(roll)) roll++;
        return { table, roll, text: '' };
    },

    qcCount: (data) => data.reduce((n, e) => n + surgeQCAnalyze(e).length, 0),

    onLoad() {
        tmRegister('surge', renderSurgeTable);
        tmOnLoad('surge');
        // A roll table is a grid first and a record set second - open it as one.
        tmOpenInTableMode('surge');
    },

    render: (entry, idx) => `
        ${qcRenderPanel(surgeQCAnalyze(entry), 'surge', `${entry.table || 'Table'} ${entry.roll ?? '?'}`)}

        <div class="forge-section">
            <div class="section-header">Roll</div>
            <div class="section-body">
                <div class="field-row">
                    <div class="field-group" style="max-width:120px">
                        <label class="field-label">Result</label>
                        <input class="field-input" type="number" min="1" value="${escAttr(entry.roll ?? '')}"
                            onchange="updateField(${idx},'roll',parseInt(this.value,10)||'')">
                    </div>
                    <div class="field-group">
                        <label class="field-label">Table</label>
                        <input class="field-input" type="text" list="gt-surge-tables-form" value="${escAttr(entry.table || '')}"
                            onchange="updateField(${idx},'table',this.value);refreshGroups()">
                        <datalist id="gt-surge-tables-form">
                            ${[...new Set(state.data.map(e => e.table).filter(Boolean))].sort()
                                .map(t => `<option value="${escAttr(t)}">`).join('')}
                        </datalist>
                    </div>
                </div>
            </div>
        </div>

        <div class="forge-section">
            <div class="section-header">Effect</div>
            <div class="section-body">
                <textarea class="field-input" rows="5"
                    onchange="updateField(${idx},'text',this.value)"
                    oninput="markUnsaved()">${escHtml(entry.text || '')}</textarea>
            </div>
        </div>`,
});
