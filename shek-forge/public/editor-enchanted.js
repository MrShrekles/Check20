// ── ENCHANTED TABLE EDITOR ────────────────────────────────────────────────────
// Shows all entries grouped by type - prefix, effect, damageType, check, origin,
// language. (Base item names come from weapons.json/items.json now, not a
// generic itemType placeholder list - see worldgen.js/narrator.js.)
// Edit/add/remove inline without selecting individual entries.

// ── Global helpers (called by inline onclick) ─────────────────────────────────

function updateEnchantedText(idx, value) { teSetField(idx, 'text', value); }

function updateEnchantedPrefix(idx, value) { teSetField(idx, 'prefix', value); }

function removeEnchantedEntry(idx) { teRemoveEntry(idx); }

function addEnchantedEntry(type, category) {
    const entry = { type, text: '' };
    if (category) entry.category = category;
    const sel = category
        ? `.ench-chip-input[data-cat="${category}"]`
        : `.ench-chip-input[data-type="${type}"], .ench-row-input[data-type="${type}"]`;
    teAddEntry(entry, sel);
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderEnchantedTable() {
    const TYPES  = ['prefix', 'effect', 'damageType', 'check', 'origin', 'language', 'condition', 'manner', 'transmission'];
    const LABELS = {
        prefix:       'Prefixes',
        effect:       'Effects',
        damageType:   'Damage Types',
        check:        'Checks',
        origin:       'Origins',
        language:     'Languages',
        condition:    'Conditions',
        manner:       'Manners',
        transmission: 'Transmissions',
    };

    const sections = TYPES.map(type => {
        const isLong   = type === 'effect';
        const entries  = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.type === type);

        const items = entries.map(e => isLong
            ? `<div class="ench-row">
                    <input class="ench-row-input ench-row-input--prefix" data-type="${type}" value="${escAttr(e.prefix || '')}"
                        onchange="updateEnchantedPrefix(${e._i}, this.value)"
                        oninput="markUnsaved()" placeholder="prefix…" title="Prefix used in this effect's generated item name">
                    <input class="ench-row-input" data-type="${type}" value="${escAttr(e.text)}"
                        onchange="updateEnchantedText(${e._i}, this.value)"
                        oninput="markUnsaved()" placeholder="effect text - use {type}, {check}, {origin}, {language} as placeholders">
                    <button class="ench-remove" onclick="removeEnchantedEntry(${e._i})" title="Remove">×</button>
               </div>`
            : `<div class="ench-chip">
                    <input class="ench-chip-input" data-type="${type}" value="${escAttr(e.text)}"
                        onchange="updateEnchantedText(${e._i}, this.value)"
                        oninput="markUnsaved()" placeholder="…">
                    <button class="ench-remove" onclick="removeEnchantedEntry(${e._i})" title="Remove">×</button>
               </div>`
        ).join('');

        return `
            <div class="ench-section">
                <div class="ench-section-head">
                    <h3>${LABELS[type]}</h3>
                    <button class="ench-add-btn" onclick="addEnchantedEntry('${type}')">+ Add</button>
                </div>
                <div class="ench-${isLong ? 'rows ench-rows--grid' : 'chips'}">
                    ${items || `<p class="empty-state">No ${LABELS[type].toLowerCase()} yet</p>`}
                </div>
            </div>`;
    }).join('');

    return `<div class="ench-editor">${sections}</div>`;
}

// ── Flat grid table (⊞ Table toggle) ───────────────────────────────────────────
// The grouped chip/row view above is always-on and ignores which entry is
// selected; this is a second, sortable flat-grid view of the same data,
// following the same tmRegister/tmToggle pattern as item/glossary/gear/etc.
const ENCHANTED_TYPES = ['prefix', 'effect', 'damageType', 'check', 'origin', 'language', 'condition', 'manner', 'transmission'];

const EN_COLS = [
    { label: '#',        key: null,     style: 'width:28px' },
    { label: 'Type',     key: 'type',     style: 'width:110px' },
    { label: 'Category', key: 'category', style: 'width:120px' },
    { label: 'Prefix',   key: 'prefix',   style: 'width:110px' },
    { label: 'Text',     key: 'text' },
    { label: '',         key: null,     style: 'width:44px' },
];

function enchantedCategoryOptions() {
    return [...new Set(state.data.map(e => e.category).filter(Boolean))].sort();
}

function renderEnchantedGridTable() {
    const type = 'enchanted';
    const sorted = tmSortedRows(type, state.filteredData, [], []);
    const catOpts = enchantedCategoryOptions();

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td>
                <select class="gt-input" onchange="updateField(${idx},'type',this.value);refreshGroups()">
                    ${ENCHANTED_TYPES.map(t => `<option value="${t}"${e.type === t ? ' selected' : ''}>${t}</option>`).join('')}
                </select>
            </td>
            <td><input class="gt-input" type="text" list="en-cat-opts" value="${escAttr(e.category || '')}"
                onchange="updateField(${idx},'category',this.value);refreshGroups()" oninput="markUnsaved()" placeholder="—" style="min-width:100px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.prefix || '')}"
                onchange="updateField(${idx},'prefix',this.value)" oninput="markUnsaved()" placeholder="—" style="min-width:100px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.text || '')}"
                onchange="updateField(${idx},'text',this.value)" oninput="markUnsaved()" style="min-width:260px"></td>
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-del" onclick="tmDeleteRow('${type}',${idx})" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const count = state.filteredData.length;
    const groupLabel = state.currentGroup === 'All' ? 'all types' : state.currentGroup;
    document.getElementById('fieldEditor').innerHTML = `
        <div class="gear-table-wrap">
            <div class="gear-table-topbar">
                <div>
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Enchanted')}</div>
                    <div class="entry-subtitle">${count} entries · ${escHtml(groupLabel)}</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('${type}')">← Grouped View</button>
                    <button class="btn btn-green" onclick="enchantedTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <datalist id="en-cat-opts">${catOpts.map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, EN_COLS)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function enchantedTableNewRow() {
    const group = ENCHANTED_TYPES.includes(state.currentGroup) ? state.currentGroup : 'prefix';
    state.data.push({ type: group, text: '' });
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderEnchantedGridTable();
    markUnsaved();
    updateStatus();
    setTimeout(() => {
        const row = document.querySelector(`.gear-table tbody tr[data-idx="${state.data.length - 1}"]`);
        row?.querySelector('.gt-input[type="text"]:last-of-type')?.focus();
    }, 30);
}

// ── Register ──────────────────────────────────────────────────────────────────

registerEditor('enchanted', {

    groupKey: () => 'type',

    entryTitle: (entry) => entry.text || '(empty)',

    entryRow: (entry) => {
        const typeColors = {
            prefix: '#9966cc', effect: '#cc99ff', damageType: '#ff9944',
            check: '#44aaff', origin: '#cc4d7a', language: '#33aaaa', condition: '#cc8833',
            manner: '#4488cc', transmission: '#66cc99',
        };
        return {
            name:   entry.text || '(empty)',
            meta:   entry.category ? entry.category : '',
            badges: [{ label: entry.type, color: typeColors[entry.type] || '#888' }],
        };
    },

    newEntry: (group) => ({ type: group || 'prefix', text: '' }),

    qcCount: (data) => qcCountBlankEntries(data, ['type', 'category']),

    // Show full table regardless of which entry is selected
    render: () => renderEnchantedTable(),

    headerActions: () =>
        `<span style="font-size:11px;color:#9966cc;opacity:.7">Editing all ${state.data.length} entries</span>`,

    onLoad() {
        tmRegister('enchanted', renderEnchantedGridTable);
        tmOnLoad('enchanted');
    },
});
