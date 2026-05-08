// ── ENCHANTED TABLE EDITOR ────────────────────────────────────────────────────
// Shows all entries grouped by type — prefix, effect, damageType, check, itemType
// Edit/add/remove inline without selecting individual entries.

// ── Global helpers (called by inline onclick) ─────────────────────────────────

function updateEnchantedText(idx, value) {
    if (!state.data[idx]) return;
    state.data[idx].text = value;
    markUnsaved();
}

function removeEnchantedEntry(idx) {
    state.data.splice(idx, 1);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderEditor();
    markUnsaved();
}

function addEnchantedEntry(type, category) {
    const entry = { type, text: '' };
    if (category) entry.category = category;
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderEditor();
    markUnsaved();
    // Focus the new input after render
    setTimeout(() => {
        const inputs = document.querySelectorAll(
            category ? `.ench-chip-input[data-cat="${category}"]` : `.ench-chip-input[data-type="${type}"], .ench-row-input[data-type="${type}"]`
        );
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
}

function addEnchantedCategory() {
    const cat = window.prompt('New item category name (e.g. "shield"):');
    if (!cat || !cat.trim()) return;
    addEnchantedEntry('itemType', cat.trim().toLowerCase());
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderEnchantedTable() {
    const TYPES  = ['prefix', 'effect', 'damageType', 'check', 'itemType'];
    const LABELS = {
        prefix:     'Prefixes',
        effect:     'Effects',
        damageType: 'Damage Types',
        check:      'Checks',
        itemType:   'Item Types',
    };

    const sections = TYPES.map(type => {
        if (type === 'itemType') {
            // Group by category
            const all = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.type === 'itemType');
            const cats = [...new Set(all.map(e => e.category).filter(Boolean))].sort();

            const catBlocks = cats.map(cat => {
                const entries = all.filter(e => e.category === cat);
                const chips = entries.map(e => `
                    <div class="ench-chip">
                        <input class="ench-chip-input" data-type="itemType" data-cat="${escAttr(cat)}"
                            value="${escAttr(e.text)}"
                            onchange="updateEnchantedText(${e._i}, this.value)"
                            oninput="markUnsaved()" placeholder="item name">
                        <button class="ench-remove" onclick="removeEnchantedEntry(${e._i})" title="Remove">×</button>
                    </div>`).join('');

                return `
                    <div class="ench-cat">
                        <div class="ench-cat-label">${escHtml(cat)}</div>
                        <div class="ench-chips">
                            ${chips}
                            <button class="ench-add-chip" onclick="addEnchantedEntry('itemType','${escAttr(cat)}')">+ ${escHtml(cat)}</button>
                        </div>
                    </div>`;
            }).join('');

            return `
                <div class="ench-section">
                    <div class="ench-section-head">
                        <h3>${LABELS[type]}</h3>
                        <button class="ench-add-btn" onclick="addEnchantedCategory()">✦ New Category</button>
                    </div>
                    ${catBlocks || '<p style="color:#555;font-size:12px">No item types yet</p>'}
                </div>`;
        }

        const isLong   = type === 'effect';
        const entries  = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.type === type);

        const items = entries.map(e => isLong
            ? `<div class="ench-row">
                    <input class="ench-row-input" data-type="${type}" value="${escAttr(e.text)}"
                        onchange="updateEnchantedText(${e._i}, this.value)"
                        oninput="markUnsaved()" placeholder="effect text — use {type} and {check} as placeholders">
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
                <div class="ench-${isLong ? 'rows te-rows--wide' : 'chips'}">
                    ${items || `<p style="color:#555;font-size:12px">No ${LABELS[type].toLowerCase()} yet</p>`}
                </div>
            </div>`;
    }).join('');

    return `<div class="ench-editor">${sections}</div>`;
}

// ── Register ──────────────────────────────────────────────────────────────────

registerEditor('enchanted', {

    groupKey: () => 'type',

    entryTitle: (entry) => entry.text || '(empty)',

    entryRow: (entry) => {
        const typeColors = {
            prefix: '#9966cc', effect: '#cc99ff', damageType: '#ff9944',
            check: '#44aaff', itemType: '#44cc88',
        };
        return {
            name:   entry.text || '(empty)',
            meta:   entry.category ? entry.category : '',
            badges: [{ label: entry.type, color: typeColors[entry.type] || '#888' }],
        };
    },

    newEntry: (group) => ({ type: group || 'prefix', text: '' }),

    // Show full table regardless of which entry is selected
    render: () => renderEnchantedTable(),

    headerActions: () =>
        `<span style="font-size:11px;color:#9966cc;opacity:.7">Editing all ${state.data.length} entries</span>`,
});
