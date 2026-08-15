// ── ITEM EDITOR (items.json) ───────────────────────────────────────────────────

// ── DUPLICATE ─────────────────────────────────────────────────────────────────
function duplicateItem(idx) {
    const original = state.data[idx];
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.name = (original.name || 'Item') + ' (Copy)';
    state.data.splice(idx + 1, 0, copy);
    state.filteredData = getVisibleData();
    state.currentIndex = idx + 1;
    renderGroupSelector(); renderEntryList(); renderEditor(); markUnsaved(); updateStatus();
    showToast(`Duplicated "${original.name || 'entry'}"`, 'success');
}

// ── ITEM TABLE ────────────────────────────────────────────────────────────────
const IT_COLS = [
    { label: '#', key: null, style: 'width:28px' },
    { label: 'Name', key: 'name' },
    { label: 'Category', key: 'category' },
    { label: 'Description', key: 'description' },
    { label: 'Effect', key: 'effect' },
    { label: 'Check +/-', key: 'checkBonus', style: 'width:110px' },
    { label: 'Cost', key: 'cost', style: 'width:64px' },
    { label: 'Rarity', key: 'rarity' },
    { label: 'Bulk', key: 'bulk', style: 'width:52px' },
    { label: '', key: null, style: 'width:56px' },
];

function itemCategoryOptions() {
    return [...new Set(state.data.map(e => e.category).filter(Boolean))].sort();
}

// One "Check +/-" input drives two fields, matching armor.json's split into
// checkBonus / checkPenalty. Routed by sign so you never pick the wrong box:
// "Stealth +1" -> checkBonus, "Observation -4" -> checkPenalty.
function updateItemCheckMod(idx, raw) {
    const v = String(raw || '').trim();
    const negative = /-\s*\d/.test(v);
    updateField(idx, 'checkBonus', negative ? '' : v);
    updateField(idx, 'checkPenalty', negative ? v : '');
}

function renderItemTable() {
    const type = 'item';
    const sorted = tmSortedRows(type, state.filteredData, ['cost', 'bulk'], ['rarity']);
    const catOpts = itemCategoryOptions();
    const sel = buildSelect;

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td><input class="gt-input gt-input-name" type="text" value="${escAttr(e.name || '')}"
                onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()"></td>
            <td><input class="gt-input" type="text" list="it-cat-opts" value="${escAttr(e.category || '')}"
                onchange="updateField(${idx},'category',this.value);refreshGroups()" oninput="markUnsaved()" style="min-width:110px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.description || '')}"
                onchange="updateField(${idx},'description',this.value)" oninput="markUnsaved()" style="min-width:200px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.effect || '')}" placeholder="item effect"
                onchange="updateField(${idx},'effect',this.value)" oninput="markUnsaved()" style="min-width:200px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.checkBonus || e.checkPenalty || '')}" placeholder="check bonus"
                onchange="updateItemCheckMod(${idx},this.value)" oninput="markUnsaved()" style="width:100px"></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.cost ?? 0}"
                onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()" style="width:56px"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'rarity',this.value)">
                ${sel(GD.rarity, e.rarity)}</select></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.bulk ?? ''}" placeholder="—"
                onchange="updateField(${idx},'bulk',this.value===''?null:(parseFloat(this.value)||0))" oninput="markUnsaved()" style="width:44px"></td>
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('${type}',${idx})" title="Edit in form view">✎</button>
                    <button class="gt-btn gt-btn-del" onclick="tmDeleteRow('${type}',${idx})" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const count = state.filteredData.length;
    const groupLabel = state.currentGroup === 'All' ? 'all categories' : state.currentGroup;
    document.getElementById('fieldEditor').innerHTML = `
        <div class="gear-table-wrap">
            <div class="gear-table-topbar">
                <div>
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Items')}</div>
                    <div class="entry-subtitle">${count} items · ${escHtml(groupLabel)} · ✎ to edit full form</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('${type}')">← Form View</button>
                    <button class="btn btn-green" onclick="itemTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <datalist id="it-cat-opts">${catOpts.map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, IT_COLS)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function itemTableNewRow() {
    const editor = EDITORS.item;
    const group = state.currentGroup !== 'All' ? state.currentGroup : '';
    const entry = editor.newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderItemTable();
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

// ── ITEM FORM ─────────────────────────────────────────────────────────────────
function renderItemForm(e, idx) {
    const catOpts = itemCategoryOptions();
    return `
        <div class="forge-section">
            <div class="section-header">Name</div>
            <div class="section-body">
                <input class="field-input field-input-name" type="text"
                    value="${escAttr(e.name || '')}" onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Identity</div>
            <div class="section-body">
                <div class="field-grid">
                    <datalist id="if-cat-opts-${idx}">${catOpts.map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
                    <div class="field-wrap">
                        <label class="field-label">Category</label>
                        <input class="field-input" type="text" list="if-cat-opts-${idx}"
                            value="${escAttr(e.category || '')}" onchange="updateField(${idx},'category',this.value);refreshGroups()" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Cost</label>
                        <input class="field-input mono" type="number" min="0" value="${e.cost ?? 0}"
                            onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Rarity</label>
                        <select class="field-input" onchange="updateField(${idx},'rarity',this.value)">
                            ${buildSelect(GD.rarity, e.rarity)}
                        </select>
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Bulk</label>
                        <input class="field-input mono" type="number" min="0" placeholder="none" value="${e.bulk ?? ''}"
                            onchange="updateField(${idx},'bulk',this.value===''?null:(parseFloat(this.value)||0))" oninput="markUnsaved()">
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Effect <span style="opacity:.5;font-weight:400">- rules text, leave blank for plain gear</span></div>
            <div class="section-body">
                <textarea class="field-input" rows="3" placeholder="Grants +1 bonus to Stealth."
                    onchange="updateField(${idx},'effect',this.value)"
                    oninput="markUnsaved()">${escHtml(e.effect || '')}</textarea>
                <div class="field-grid" style="margin-top:8px">
                    <div class="field-wrap">
                        <label class="field-label">Check Bonus</label>
                        <input class="field-input mono" type="text" placeholder="Check Bonus or Penalty"
                            value="${escAttr(e.checkBonus || '')}"
                            onchange="updateField(${idx},'checkBonus',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Check Penalty</label>
                        <input class="field-input mono" type="text" placeholder="Observation -4"
                            value="${escAttr(e.checkPenalty || '')}"
                            onchange="updateField(${idx},'checkPenalty',this.value)" oninput="markUnsaved()">
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Description <span style="opacity:.5;font-weight:400">- flavour only</span></div>
            <div class="section-body">
                <textarea class="field-input" rows="4"
                    onchange="updateField(${idx},'description',this.value)"
                    oninput="markUnsaved()">${escHtml(e.description || '')}</textarea>
            </div>
        </div>`;
}

// ── SHARED ENTRY ROW HELPER ────────────────────────────────────────────────────
function itemEntryRow(entry) {
    const cat = entry.category || '';
    const rarity = entry.rarity || '';
    return {
        name: entry.name || '(unnamed)',
        meta: entry.description || '',
        badges: [
            cat ? { label: cat, color: '#c8922a' } : null,
            rarity ? { label: rarity, color: '#7a7a7a' } : null,
            entry.cost != null ? { label: `${entry.cost}g`, color: '#7a7a7a' } : null,
        ].filter(Boolean),
    };
}

// ── REGISTER: ITEM ─────────────────────────────────────────────────────────────
registerEditor('item', {
    groupKey: () => 'category',
    entryTitle: (entry) => entry.name || '(unnamed)',
    entryRow: itemEntryRow,
    headerActions: (entry, idx) => `<button class="btn btn-ghost" onclick="duplicateItem(${idx})" title="Duplicate this item">⧉ Duplicate</button>`,
    newEntry: (group) => ({
        name: '', category: group || '', description: '', effect: '',
        checkBonus: '', checkPenalty: '', cost: 0, rarity: 'common', bulk: null,
    }),
    render: (entry, idx) => renderItemForm(entry, idx),
    onLoad() {
        tmRegister('item', renderItemTable);
        tmOnLoad('item');
    },
});
