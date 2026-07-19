// ── DUPLICATE ─────────────────────────────────────────────────────────────────
function duplicateWeapon(idx) {
    const original = state.data[idx];
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.name = (original.name || 'Weapon') + ' (Copy)';
    state.data.splice(idx + 1, 0, copy);
    state.filteredData = getVisibleData();
    state.currentIndex = idx + 1;
    renderGroupSelector(); renderEntryList(); renderEditor(); markUnsaved(); updateStatus();
    showToast(`Duplicated "${original.name || 'entry'}"`, 'success');
}

// ── GEAR TABLE ────────────────────────────────────────────────────────────────
const GT_WEAPON_COLS = [
    { label: '#',          key: null,         style: 'width:28px' },
    { label: 'Name',       key: 'name' },
    { label: 'Category',   key: 'category' },
    { label: 'Range',      key: 'range' },
    { label: 'Damage',     key: 'damage' },
    { label: 'Type',       key: 'damageType' },
    { label: 'Check',      key: 'check' },
    { label: 'Cost',       key: 'cost' },
    { label: 'Rarity',     key: 'rarity' },
    { label: 'Properties', key: 'properties' },
    { label: 'Bulk',       key: 'bulk',       style: 'width:52px' },
    { label: '',           key: null,         style: 'width:56px' },
];

const GT_ARMOR_COLS = [
    { label: '#',          key: null,          style: 'width:28px' },
    { label: 'Name',       key: 'name' },
    { label: 'Category',   key: 'category' },
    { label: 'Armor',      key: 'armor',       style: 'width:52px' },
    { label: 'Cost',       key: 'cost' },
    { label: 'Rarity',     key: 'rarity' },
    { label: 'Hefty',      key: 'hefty' },
    { label: 'Move Pen.',  key: 'movePenalty' },
    { label: 'Properties', key: 'properties' },
    { label: 'Bulk',       key: 'bulk',        style: 'width:52px' },
    { label: '',           key: null,          style: 'width:56px' },
];

function renderGearTable() {
    const type = state.fileType;
    const sel = buildSelect;
    const isWeapon = type === 'weapon';
    const cols = isWeapon ? GT_WEAPON_COLS : GT_ARMOR_COLS;
    const sorted = tmSortedRows(type, state.filteredData, ['cost', 'bulk', 'armor'], ['rarity']);

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        const typeCols = isWeapon ? `
            <td><select class="gt-input" onchange="updateField(${idx},'category',this.value);refreshGroups()">
                ${sel(GD.weaponCategory, e.category)}</select></td>
            <td><select class="gt-input" onchange="updateField(${idx},'range',this.value)">
                ${sel(GD.range, e.range)}</select></td>
            <td><input class="gt-input gt-input-mono" type="text" value="${escAttr(e.damage||'')}"
                onchange="updateField(${idx},'damage',this.value)" oninput="markUnsaved()" style="width:68px"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'damageType',this.value)">
                ${sel(GD.damageType, e.damageType)}</select></td>
            <td><input class="gt-input gt-input-mono" type="text" value="${escAttr(e.check||'')}"
                onchange="updateField(${idx},'check',this.value)" oninput="markUnsaved()" style="min-width:90px"></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.cost??0}"
                onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()" style="width:58px"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'rarity',this.value)">
                ${sel(GD.rarity, e.rarity)}</select></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.properties||'')}"
                onchange="updateField(${idx},'properties',this.value)" oninput="markUnsaved()" style="min-width:80px"></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.bulk??1}"
                onchange="updateField(${idx},'bulk',parseFloat(this.value)||1)" oninput="markUnsaved()" style="width:44px"></td>` : `
            <td><select class="gt-input" onchange="updateField(${idx},'category',this.value);refreshGroups()">
                ${sel(GD.armorCategory, e.category)}</select></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.armor??0}"
                onchange="updateField(${idx},'armor',parseFloat(this.value)||0)" oninput="markUnsaved()" style="width:44px"></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.cost??0}"
                onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()" style="width:58px"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'rarity',this.value)">
                ${sel(GD.rarity, e.rarity)}</select></td>
            <td><select class="gt-input" onchange="updateField(${idx},'hefty',this.value)">
                ${sel(GD.hefty, e.hefty)}</select></td>
            <td><input class="gt-input gt-input-mono" type="text" value="${escAttr(e.movePenalty||'')}"
                onchange="updateField(${idx},'movePenalty',this.value)" oninput="markUnsaved()" style="width:64px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.properties||'')}"
                onchange="updateField(${idx},'properties',this.value)" oninput="markUnsaved()" style="min-width:80px"></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.bulk??1}"
                onchange="updateField(${idx},'bulk',parseFloat(this.value)||1)" oninput="markUnsaved()" style="width:44px"></td>`;
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td><input class="gt-input gt-input-name" type="text" value="${escAttr(e.name||'')}"
                onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()"></td>
            ${typeCols}
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('${type}',${idx})" title="Edit description &amp; more">✎</button>
                    <button class="gt-btn gt-btn-del" onclick="tmDeleteRow('${type}',${idx})" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const count = state.filteredData.length;
    const groupLabel = state.currentGroup === 'All' ? 'all categories' : state.currentGroup;
    const label = isWeapon ? 'Weapons' : 'Armor';
    document.getElementById('fieldEditor').innerHTML = `
        <div class="gear-table-wrap">
            <div class="gear-table-topbar">
                <div>
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || label)}</div>
                    <div class="entry-subtitle">${count} ${label.toLowerCase()} · ${escHtml(groupLabel)} · ✎ to edit description &amp; full form</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('${type}')">← Form View</button>
                    <button class="btn btn-green" onclick="gearTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, cols)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function gearTableNewRow() {
    const type = state.fileType;
    const editor = EDITORS[type];
    const group = state.currentGroup !== 'All' ? state.currentGroup : (type === 'armor' ? 'armor' : 'melee');
    const entry = editor.newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderGearTable();
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

// ── GEAR DOMAIN VALUES ────────────────────────────────────────────────────────
const GD = {
    weaponCategory: ['', 'melee', 'ranged', 'firearm', 'magic'],
    armorCategory:  ['', 'armor', 'shield'],
    range:      ['', 'Self', 'Melee', 'Melee, Short', 'Reach', 'Short', 'Medium', 'Long'],
    damageType: ['', 'Impact', 'Piercing', 'Slashing', 'Acid', 'Eclipse', 'Fire', 'Fluid', 'Ice', 'Lightning', 'Solar', 'Thunder', 'Toxic', 'Nature', 'Psychic', 'Vozian', 'Healing', 'Physical', 'Impact, Slashing'],
    rarity:     ['', 'common', 'uncommon', 'rare', 'very rare', 'legendary'],
    hefty:      ['yes', 'no'],
    checks:     ['', 'Strength', 'Agility', 'Intellect', 'Survival', 'Observation', 'Crafting', 'Spirit', 'Mental', 'Physical', 'Stealth', 'Performance', 'Provoke', 'Medicine'],
};

const WEAPON_CATEGORY_COLORS = {
    melee:   '#4a9ade',
    ranged:  '#44aacc',
    firearm: '#cccc44',
    magic:   '#aa66cc',
    armor:   '#88aacc',
    shield:  '#aaccaa',
};

// ── TAG FIELD ─────────────────────────────────────────────────────────────────
function renderTagField(idx, tags) {
    const items = (tags || []).map((t, ti) => `
        <div class="tag-item">
            <div class="tag-item-text">${escHtml(t)}</div>
            <div class="tag-item-delete" onclick="removeTag(${idx},${ti})">✕</div>
        </div>`).join('');
    return `
        <div class="tag-field" id="tag-field-${idx}">
            <div id="tag-items-${idx}">${items}</div>
            <div class="tag-add" onclick="showTagAdd(${idx})">+ Add tag</div>
            <div class="tag-new-input" id="tag-new-${idx}" style="display:none;">
                <input class="tag-new-text" type="text" placeholder="New tag..." id="tag-input-${idx}">
                <button class="tag-new-confirm" onclick="confirmTag(${idx})">✓</button>
                <button class="tag-new-cancel" onclick="hideTagAdd(${idx})">✕</button>
            </div>
        </div>`;
}
function showTagAdd(idx) {
    const r = document.getElementById(`tag-new-${idx}`);
    const i = document.getElementById(`tag-input-${idx}`);
    if (r) { r.style.display = 'flex'; i && i.focus(); }
}
function hideTagAdd(idx) {
    const r = document.getElementById(`tag-new-${idx}`);
    if (r) r.style.display = 'none';
}
function confirmTag(idx) {
    const input = document.getElementById(`tag-input-${idx}`);
    if (!input || !input.value.trim()) return hideTagAdd(idx);
    if (!state.data[idx].tags) state.data[idx].tags = [];
    state.data[idx].tags.push(input.value.trim());
    markUnsaved();
    renderEditor();
}
function removeTag(idx, ti) {
    if (!state.data[idx].tags) return;
    state.data[idx].tags.splice(ti, 1);
    markUnsaved();
    renderEditor();
}

// ── QUALITY CHECK ─────────────────────────────────────────────────────────────
function gearQCFields(entry) {
    const fields = [{ label: 'Description', get: e => e.description }];
    if ('featureEffect' in entry) fields.push({ label: 'Magic Feature Effect', get: e => e.featureEffect });
    return fields;
}
function gearQCAnalyze(entry, ns) {
    return qcAnalyzeProse(entry, ns, entry.name || '(unnamed)', gearQCFields(entry));
}

// ── WEAPON FORM ───────────────────────────────────────────────────────────────
function renderWeaponForm(e, idx) {
    const sel = buildSelect;
    const hasMagicFeature = e.category === 'magic' || e.featureName;
    return `
        ${qcRenderPanel(gearQCAnalyze(e, 'weapon'), 'weapon', e.name || '(unnamed)')}

        <div class="forge-section">
            <div class="section-header">Name</div>
            <div class="section-body">
                <input class="field-input" style="font-size:13px;font-family:'Cinzel',serif;letter-spacing:0.04em;" type="text"
                    value="${escAttr(e.name || '')}" onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
            </div>
        </div>
        <div class="section-pair">
            <div class="forge-section">
                <div class="section-header">Identity</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Category</label>
                            <select class="field-input" onchange="updateField(${idx},'category',this.value);refreshGroups()">
                                ${sel(GD.weaponCategory, e.category)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Rarity</label>
                            <select class="field-input" onchange="updateField(${idx},'rarity',this.value)">
                                ${sel(GD.rarity, e.rarity)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Cost</label>
                            <input class="field-input mono" type="number" min="0" value="${e.cost ?? 0}"
                                onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Bulk</label>
                            <input class="field-input mono" type="number" min="0" value="${e.bulk ?? 1}"
                                onchange="updateField(${idx},'bulk',parseFloat(this.value)||1)" oninput="markUnsaved()">
                        </div>
                    </div>
                </div>
            </div>
            <div class="forge-section">
                <div class="section-header">Combat</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Range</label>
                            <select class="field-input" onchange="updateField(${idx},'range',this.value)">
                                ${sel(GD.range, e.range)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Damage</label>
                            <input class="field-input mono" type="text" placeholder="e.g. 1d6"
                                value="${escAttr(e.damage || '')}" onchange="updateField(${idx},'damage',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap full">
                            <label class="field-label">Damage Type</label>
                            <select class="field-input" onchange="updateField(${idx},'damageType',this.value)">
                                ${sel(GD.damageType, e.damageType)}
                            </select>
                        </div>
                        <datalist id="gw-check-opts-${idx}">${GD.checks.filter(Boolean).map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
                        <div class="field-wrap full">
                            <label class="field-label">Check</label>
                            <input class="field-input" type="text" list="gw-check-opts-${idx}" placeholder="e.g. Physical, Mental"
                                value="${escAttr(e.check || '')}" onchange="updateField(${idx},'check',this.value)" oninput="markUnsaved()">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Properties</div>
            <div class="section-body">
                <input class="field-input" type="text" placeholder="e.g. 1 Hand, Light"
                    value="${escAttr(e.properties || '')}" onchange="updateField(${idx},'properties',this.value)" oninput="markUnsaved()">
            </div>
        </div>
        ${hasMagicFeature ? `
        <div class="forge-section">
            <div class="section-header">Magic Feature</div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap full">
                        <label class="field-label">Feature Name</label>
                        <input class="field-input" type="text" value="${escAttr(e.featureName || '')}"
                            onchange="updateField(${idx},'featureName',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap full">
                        <label class="field-label">Effect</label>
                        <textarea class="field-input" rows="3"
                            onchange="updateField(${idx},'featureEffect',this.value)"
                            oninput="markUnsaved()">${escHtml(e.featureEffect || '')}</textarea>
                    </div>
                </div>
            </div>
        </div>` : ''}
        <div class="forge-section">
            <div class="section-header">Description</div>
            <div class="section-body">
                <textarea class="field-input" rows="4"
                    onchange="updateField(${idx},'description',this.value)"
                    oninput="markUnsaved()">${escHtml(e.description || '')}</textarea>
            </div>
        </div>`;
}

// ── ARMOR FORM ────────────────────────────────────────────────────────────────
function renderArmorForm(e, idx) {
    const sel = buildSelect;
    return `
        ${qcRenderPanel(gearQCAnalyze(e, 'armor'), 'armor', e.name || '(unnamed)')}

        <div class="forge-section">
            <div class="section-header">Name</div>
            <div class="section-body">
                <input class="field-input" style="font-size:13px;font-family:'Cinzel',serif;letter-spacing:0.04em;" type="text"
                    value="${escAttr(e.name || '')}" onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
            </div>
        </div>
        <div class="section-pair">
            <div class="forge-section">
                <div class="section-header">Identity</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Category</label>
                            <select class="field-input" onchange="updateField(${idx},'category',this.value);refreshGroups()">
                                ${sel(GD.armorCategory, e.category)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Rarity</label>
                            <select class="field-input" onchange="updateField(${idx},'rarity',this.value)">
                                ${sel(GD.rarity, e.rarity)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Cost</label>
                            <input class="field-input mono" type="number" min="0" value="${e.cost ?? 0}"
                                onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Bulk</label>
                            <input class="field-input mono" type="number" min="0" value="${e.bulk ?? 1}"
                                onchange="updateField(${idx},'bulk',parseFloat(this.value)||1)" oninput="markUnsaved()">
                        </div>
                    </div>
                </div>
            </div>
            <div class="forge-section">
                <div class="section-header">Defense</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Armor Value</label>
                            <input class="field-input mono" type="number" min="0" value="${e.armor ?? 0}"
                                onchange="updateField(${idx},'armor',parseFloat(this.value)||0)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Hefty</label>
                            <select class="field-input" onchange="updateField(${idx},'hefty',this.value)">
                                ${sel(GD.hefty, e.hefty)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Move Penalty</label>
                            <input class="field-input mono" type="text" placeholder="e.g. -5"
                                value="${escAttr(String(e.movePenalty ?? ''))}" onchange="updateField(${idx},'movePenalty',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Properties</label>
                            <input class="field-input" type="text"
                                value="${escAttr(e.properties || '')}" onchange="updateField(${idx},'properties',this.value)" oninput="markUnsaved()">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="section-pair">
            <div class="forge-section">
                <div class="section-header">Check Penalty</div>
                <div class="section-body">
                    <input class="field-input" type="text" placeholder="e.g. Stealth -1, Magic -1"
                        value="${escAttr(e.checkPenalty || '')}" onchange="updateField(${idx},'checkPenalty',this.value)" oninput="markUnsaved()">
                </div>
            </div>
            <div class="forge-section">
                <div class="section-header">Check Bonus</div>
                <div class="section-body">
                    <input class="field-input" type="text" placeholder="e.g. Stealth +1"
                        value="${escAttr(e.checkBonus || '')}" onchange="updateField(${idx},'checkBonus',this.value)" oninput="markUnsaved()">
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Tags</div>
            <div class="section-body" style="padding:0;">
                ${renderTagField(idx, e.tags || [])}
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Description</div>
            <div class="section-body">
                <textarea class="field-input" rows="4"
                    onchange="updateField(${idx},'description',this.value)"
                    oninput="markUnsaved()">${escHtml(e.description || '')}</textarea>
            </div>
        </div>`;
}

// ── SHARED ENTRY ROW HELPER ───────────────────────────────────────────────────
function gearEntryRow(entry, showGroup) {
    const cat    = entry.category || '';
    const color  = WEAPON_CATEGORY_COLORS[cat] || '#888';
    const rarity = entry.rarity || '';
    const meta   = entry.damage
        ? `${entry.damage}${entry.damageType ? ' · ' + entry.damageType : ''}`
        : entry.armor != null ? `Armor ${entry.armor}` : '';
    const issueCount = gearQCAnalyze(entry, state.fileType === 'armor' ? 'armor' : 'weapon').length;
    return {
        name: entry.name || '(unnamed)',
        meta,
        badges: [
            cat    ? { label: cat,    color }   : null,
            rarity ? { label: rarity, color: '#7a7a7a' } : null,
            issueCount > 0 ? { label: `⚠ ${issueCount}`, color: '#cc7733' } : null,
        ].filter(Boolean),
    };
}

// ── REGISTER: WEAPON ──────────────────────────────────────────────────────────
registerEditor('weapon', {
    groupKey:   () => 'category',
    entryTitle: (entry) => entry.name || '(unnamed)',
    entryRow:   gearEntryRow,
    headerActions: (entry, idx) => `<button class="btn btn-ghost" onclick="duplicateWeapon(${idx})" title="Duplicate this weapon">⧉ Duplicate</button>`,
    newEntry: (group) => ({
        name: '', category: group || 'melee', check: '', range: '', damage: '',
        damageType: '', cost: 0, rarity: 'common', properties: '', bulk: 1, description: '',
    }),
    qcCount: (data) => data.reduce((n, e) => n + gearQCAnalyze(e, 'weapon').length, 0),
    render: (entry, idx) => renderWeaponForm(entry, idx),
    onLoad() {
        tmRegister('weapon', renderGearTable);
        tmOnLoad('weapon');
    },
});

// ── REGISTER: ARMOR ───────────────────────────────────────────────────────────
registerEditor('armor', {
    groupKey:   () => 'category',
    entryTitle: (entry) => entry.name || '(unnamed)',
    entryRow:   gearEntryRow,
    headerActions: () => '',
    newEntry: (group) => ({
        name: '', category: group || 'armor', armor: 0, movePenalty: '',
        checkPenalty: '', checkBonus: '', hefty: 'no', bulk: 1,
        cost: 0, rarity: 'common', properties: '', description: '', tags: [],
    }),
    qcCount: (data) => data.reduce((n, e) => n + gearQCAnalyze(e, 'armor').length, 0),
    render: (entry, idx) => renderArmorForm(entry, idx),
    onLoad() {
        tmRegister('armor', renderGearTable);
        tmOnLoad('armor');
    },
});
