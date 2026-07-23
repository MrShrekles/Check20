// ── ENCHANTED ITEM EDITOR (enchanted.json — the real magic-item catalog) ────────
// Not to be confused with editor-enchanted.js, which edits enchantedgen.json
// (the prefix/effect/check word-bank used by a procedural generator).

const ENCHANTED_ITEM_TYPES = ['Amulet', 'Armor', 'Gear', 'Item', 'Lantern', 'Weapon'];

// Same check vocabulary class/species use (editor-class.js's CD.checks), kept as
// its own list rather than importing CD directly so this editor doesn't depend
// on class-editor internals - just the shared game vocabulary.
const ENCHANTED_ITEM_CHECKS = [
    'Agility', 'Crafting', 'Influence', 'Intellect', 'Luck',
    'Observation', 'Spirit', 'Stealth', 'Strength', 'Survival', 'Mental', 'Physical',
];

// Matches data/damage.json's type keys (the same list weapons and class/species
// damage-type fields draw from).
const ENCHANTED_ITEM_DAMAGE_TYPES = [
    'Impact', 'Piercing', 'Slashing', 'Acid', 'Eclipse', 'Fire', 'Fluid', 'Ice', 'Lightning', 'Solar', 'Thunder', 'Toxic', 'Nature', 'Psychic', 'Vozian', 'Elemental', 'Healing',
];

// Same action-type vocabulary class/species use (CD.actions / SPD.fetAction).
const ENCHANTED_ITEM_ACTIONS = ['Passive', 'Action', 'Half Action', 'Off-Action', 'Resource', 'Special'];

// Same range vocabulary class/species use (CD.ranges / SPD.fetRange).
const ENCHANTED_ITEM_RANGES = ['Self', 'Melee', 'Reach', 'Short', 'Medium', 'Long', 'Area'];

// Conditions are pulled live from glossary.json (via editor-qc-shared.js's shared
// fetch/cache) instead of a hardcoded list, so this stays in sync with the
// glossary automatically - the "borrowed from framework" source for conditions.
function enchantedItemConditionOptions() {
    return [...qcGetGlossaryTermsSync().conditions].sort();
}

function enchantedItemDatalists(idSuffix) {
    return `
        <datalist id="ei-type-opts${idSuffix}">${ENCHANTED_ITEM_TYPES.map(t => `<option value="${t}">`).join('')}</datalist>
        <datalist id="ei-check-opts${idSuffix}">${ENCHANTED_ITEM_CHECKS.map(c => `<option value="${c}">`).join('')}</datalist>
        <datalist id="ei-dmg-opts${idSuffix}">${ENCHANTED_ITEM_DAMAGE_TYPES.map(d => `<option value="${d}">`).join('')}</datalist>
        <datalist id="ei-cond-opts${idSuffix}">${enchantedItemConditionOptions().map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
        <datalist id="ei-action-opts${idSuffix}">${ENCHANTED_ITEM_ACTIONS.map(a => `<option value="${a}">`).join('')}</datalist>
        <datalist id="ei-range-opts${idSuffix}">${ENCHANTED_ITEM_RANGES.map(r => `<option value="${r}">`).join('')}</datalist>`;
}

// ── DUPLICATE ────────────────────────────────────────────────────────────────
function duplicateEnchantedItem(idx) {
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

// ── QUALITY CHECK ────────────────────────────────────────────────────────────
// Reuses the shared prose analyzer (AI-wording, grammar, broken [monster] links,
// dice-syntax checks) that glossary/spell/weapon/armor already use, instead of
// reimplementing it - only the field list is specific to this data shape.
function enchantedItemQCFields(entry) {
    return [
        { label: 'Description', get: e => e.description, required: true },
        { label: 'Effect', get: e => e.effect, required: true },
        { label: 'Upgrade', get: e => e.upgrade, required: true },
    ];
}
function enchantedItemQCAnalyze(entry) {
    return qcAnalyzeProse(entry, 'enchantedItem', entry.name || '(unnamed)', enchantedItemQCFields(entry));
}

// ── FORM ─────────────────────────────────────────────────────────────────────
function renderEnchantedItemForm(e, idx) {
    return `
        ${qcRenderPanel(enchantedItemQCAnalyze(e), 'enchantedItem', e.name || '(unnamed)')}
        ${enchantedItemDatalists(`-${idx}`)}
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
                    <div class="field-wrap">
                        <label class="field-label">Type</label>
                        <input class="field-input" type="text" list="ei-type-opts-${idx}" value="${escAttr(e.type || '')}"
                            onchange="updateField(${idx},'type',this.value);refreshGroups()" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Check</label>
                        <input class="field-input" type="text" list="ei-check-opts-${idx}" value="${escAttr(e.check || '')}"
                            onchange="updateField(${idx},'check',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Action Type</label>
                        <input class="field-input" type="text" list="ei-action-opts-${idx}" value="${escAttr(e.actionType || '')}"
                            onchange="updateField(${idx},'actionType',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Range</label>
                        <input class="field-input" type="text" list="ei-range-opts-${idx}" value="${escAttr(e.range || '')}"
                            onchange="updateField(${idx},'range',this.value)" oninput="markUnsaved()">
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Combat</div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap">
                        <label class="field-label">Damage</label>
                        <input class="field-input" type="text" value="${escAttr(e.damage || '')}"
                            onchange="updateField(${idx},'damage',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Damage Type</label>
                        <input class="field-input" type="text" list="ei-dmg-opts-${idx}" value="${escAttr(e.damageType || '')}"
                            onchange="updateField(${idx},'damageType',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Armor</label>
                        <input class="field-input" type="text" value="${escAttr(e.armor || '')}"
                            onchange="updateField(${idx},'armor',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Condition</label>
                        <input class="field-input" type="text" list="ei-cond-opts-${idx}" value="${escAttr(e.condition || '')}"
                            onchange="updateField(${idx},'condition',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap fw-full">
                        <label class="field-label">Damage / Armor Notes<span style="opacity:0.4;font-size:8px;"> (freeform - dice, tiers, conditional text)</span></label>
                        <input class="field-input" type="text" value="${escAttr(e['Damage, Armor'] || '')}"
                            onchange="updateField(${idx},'Damage, Armor',this.value)" oninput="markUnsaved()">
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Description</div>
            <div class="section-body">
                <textarea class="field-input" rows="3"
                    onchange="updateField(${idx},'description',this.value)"
                    oninput="markUnsaved()">${escHtml(e.description || '')}</textarea>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Effect</div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap fw-full">
                        <label class="field-label">Effect Name<span style="opacity:0.4;font-size:8px;"> (optional - leave blank for a plain passive with no named ability)</span></label>
                        <input class="field-input field-input-name" type="text" value="${escAttr(e.effectName || '')}"
                            onchange="updateField(${idx},'effectName',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap fw-full">
                        <label class="field-label">Effect Description</label>
                        <textarea class="field-input" rows="4"
                            onchange="updateField(${idx},'effect',this.value)"
                            oninput="markUnsaved()">${escHtml(e.effect || '')}</textarea>
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Upgrade</div>
            <div class="section-body">
                <textarea class="field-input" rows="3"
                    onchange="updateField(${idx},'upgrade',this.value)"
                    oninput="markUnsaved()">${escHtml(e.upgrade || '')}</textarea>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Tags</div>
            <div class="section-body">
                ${renderTagField(idx, e.tags)}
            </div>
        </div>`;
}

// ── TABLE (⊞ Table toggle) ────────────────────────────────────────────────────
// Each column owns its own cell renderer so header order and row cells can
// never drift out of sync when reordered. '#' and the trailing actions column
// are pinned (not real data, nothing to reorder them against).
const EI_COL_DEFS = [
    {
        key: 'name', label: 'Name', cell: (e, idx) => `<input class="gt-input gt-input-name" type="text" value="${escAttr(e.name || '')}"
        onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'type', label: 'Type', style: 'width:90px', cell: (e, idx) => `<input class="gt-input" type="text" list="ei-type-opts-row" value="${escAttr(e.type || '')}"
        onchange="updateField(${idx},'type',this.value);refreshGroups()" oninput="markUnsaved()">`
    },
    {
        key: 'check', label: 'Check', style: 'width:90px', cell: (e, idx) => `<input class="gt-input" type="text" list="ei-check-opts-row" value="${escAttr(e.check || '')}"
        onchange="updateField(${idx},'check',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'actionType', label: 'Action', style: 'width:90px', cell: (e, idx) => `<input class="gt-input" type="text" list="ei-action-opts-row" value="${escAttr(e.actionType || '')}"
        onchange="updateField(${idx},'actionType',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'range', label: 'Range', style: 'width:90px', cell: (e, idx) => `<input class="gt-input" type="text" list="ei-range-opts-row" value="${escAttr(e.range || '')}"
        onchange="updateField(${idx},'range',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'damage', label: 'Damage', style: 'width:80px', cell: (e, idx) => `<input class="gt-input" type="text" value="${escAttr(e.damage || '')}"
        onchange="updateField(${idx},'damage',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'damageType', label: 'Damage Type', style: 'width:100px', cell: (e, idx) => `<input class="gt-input" type="text" list="ei-dmg-opts-row" value="${escAttr(e.damageType || '')}"
        onchange="updateField(${idx},'damageType',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'armor', label: 'Armor', style: 'width:80px', cell: (e, idx) => `<input class="gt-input" type="text" value="${escAttr(e.armor || '')}"
        onchange="updateField(${idx},'armor',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'condition', label: 'Condition', style: 'width:100px', cell: (e, idx) => `<input class="gt-input" type="text" list="ei-cond-opts-row" value="${escAttr(e.condition || '')}"
        onchange="updateField(${idx},'condition',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'description', label: 'Desc', cell: (e, idx) => `<textarea class="gt-input" rows="1" style="min-width:180px"
        onchange="updateField(${idx},'description',this.value)" oninput="markUnsaved();enchantedItemAutoGrow(this)">${escHtml(e.description || '')}</textarea>`
    },
    {
        key: 'effectName', label: 'Effect Name', style: 'width:120px', cell: (e, idx) => `<input class="gt-input gt-input-name" type="text" value="${escAttr(e.effectName || '')}"
        onchange="updateField(${idx},'effectName',this.value)" oninput="markUnsaved()">`
    },
    {
        key: 'effect', label: 'Effect', cell: (e, idx) => `<textarea class="gt-input" rows="1" style="min-width:240px"
        onchange="updateField(${idx},'effect',this.value)" oninput="markUnsaved();enchantedItemAutoGrow(this)">${escHtml(e.effect || '')}</textarea>`
    },
];

const EI_COL_ORDER_KEY = 'eiColOrder_v1';
function enchantedItemGetColOrder() {
    const defKeys = EI_COL_DEFS.map(c => c.key);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(EI_COL_ORDER_KEY)); } catch (e) { /* ignore */ }
    if (!Array.isArray(saved)) return defKeys.slice();
    const kept = saved.filter(k => defKeys.includes(k));
    const missing = defKeys.filter(k => !kept.includes(k)); // any newly-added columns land at the end
    return [...kept, ...missing];
}
function enchantedItemMoveCol(key, dir) {
    const order = enchantedItemGetColOrder();
    const i = order.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    localStorage.setItem(EI_COL_ORDER_KEY, JSON.stringify(order));
    renderEnchantedItemTable();
}

function renderEnchantedItemTable() {
    const type = 'enchantedItem';
    const sorted = tmSortedRows(type, state.filteredData, [], []);
    const order = enchantedItemGetColOrder();
    const cols = order.map(k => EI_COL_DEFS.find(c => c.key === k));
    const sort = tmGetSort(type);

    const theadCells = cols.map((c, i) => {
        const active = sort.col === c.key;
        const arrow = active ? (sort.dir === 1 ? ' ▲' : ' ▼') : '';
        const styleAttr = c.style ? ` style="${c.style}"` : '';
        return `<th${styleAttr} class="gt-th-sort${active ? ' gt-th-active' : ''}">
            <span onclick="tmSortBy('${type}','${c.key}')" title="Sort by ${c.label}">${c.label}${arrow}</span>
            <span class="gt-col-move">
                <button class="gt-col-move-btn" onclick="event.stopPropagation();enchantedItemMoveCol('${c.key}',-1)" title="Move left" ${i === 0 ? 'disabled' : ''}>◀</button>
                <button class="gt-col-move-btn" onclick="event.stopPropagation();enchantedItemMoveCol('${c.key}',1)" title="Move right" ${i === cols.length - 1 ? 'disabled' : ''}>▶</button>
            </span>
        </th>`;
    }).join('');

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        const dataCells = cols.map(c => `<td>${c.cell(e, idx)}</td>`).join('');
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            ${dataCells}
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('${type}',${idx})" title="Edit in form view">✎</button>
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
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Enchanted Items')}</div>
                    <div class="entry-subtitle">${count} items · ${escHtml(groupLabel)} · ✎ to edit full form · ◀▶ to reorder columns</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('${type}')">← Form View</button>
                    <button class="btn btn-green" onclick="enchantedItemTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            ${enchantedItemDatalists('-row')}
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr><th style="width:28px">#</th>${theadCells}<th style="width:56px"></th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    document.querySelectorAll('.gear-table textarea.gt-input').forEach(enchantedItemAutoGrow);
}

// Grows a table-cell textarea to fit its content so multi-line effect text
// doesn't get clipped behind a resize handle/scrollbar.
function enchantedItemAutoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

function enchantedItemTableNewRow() {
    const editor = EDITORS.enchantedItem;
    const group = state.currentGroup !== 'All' ? state.currentGroup : '';
    const entry = editor.newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderEnchantedItemTable();
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

// ── REGISTER ─────────────────────────────────────────────────────────────────
registerEditor('enchantedItem', {
    groupKey: () => 'type',
    entryTitle: (entry) => entry.name || '(unnamed)',
    entryRow: (entry) => ({
        name: entry.name || '(unnamed)',
        meta: entry.effectName ? `${entry.effectName} — ${entry.effect || ''}` : (entry.effect || ''),
        badges: [entry.type ? { label: entry.type, color: '#cc4d7a' } : null].filter(Boolean),
    }),
    headerActions: (entry, idx) => `<button class="btn btn-ghost" onclick="duplicateEnchantedItem(${idx})" title="Duplicate this item">⧉ Duplicate</button>`,
    newEntry: (group) => ({
        name: '', type: group || 'Item', 'Damage, Armor': '', check: '', actionType: '', range: '',
        damage: '', damageType: '', armor: '', condition: '',
        description: '', effectName: '', effect: '', upgrade: '', tags: [],
    }),
    render: (entry, idx) => renderEnchantedItemForm(entry, idx),
    qcCount: (data) => data.reduce((n, e) => n + enchantedItemQCAnalyze(e).length, 0),
    onLoad() {
        tmRegister('enchantedItem', renderEnchantedItemTable);
        tmOnLoad('enchantedItem');
    },
});
