// ── VEHICLE EDITOR (vehicles.json) ────────────────────────────────────────────

// ── DUPLICATE ─────────────────────────────────────────────────────────────────
function duplicateVehicle(idx) {
    const original = state.data[idx];
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.name = (original.name || 'Vehicle') + ' (Copy)';
    state.data.splice(idx + 1, 0, copy);
    state.filteredData = getVisibleData();
    state.currentIndex = idx + 1;
    renderGroupSelector(); renderEntryList(); renderEditor(); markUnsaved(); updateStatus();
    showToast(`Duplicated "${original.name || 'entry'}"`, 'success');
}

// ── DOMAIN VALUES ─────────────────────────────────────────────────────────────
const VEH_RARITY = ['', 'common', 'uncommon', 'rare', 'very rare', 'legendary'];
// Suggested tiers - formula tying PL to an exact ft/mph value isn't locked in yet,
// so speedTier + PL are stored as free-form/numeric scaffolding for now.
const VEH_SPEED_TIERS = ['Slow', 'Normal', 'Fast', 'Very Fast', 'Blazing'];
function vehCategoryOptions() {
    return [...new Set(state.data.map(e => e.category).filter(Boolean))].sort();
}
function vehSpeedTierOptions() {
    return [...new Set([...VEH_SPEED_TIERS, ...state.data.map(e => e.stats?.speedTier).filter(Boolean)])];
}
function vehSpeedOptions() {
    return [...new Set(state.data.map(e => e.stats?.speed).filter(Boolean))].sort();
}

// ── FEATURES ARRAY (name + effect) ────────────────────────────────────────────
function vehAddFeature(idx) {
    if (!Array.isArray(state.data[idx].features)) state.data[idx].features = [];
    state.data[idx].features.push({ name: '', effect: '' });
    markUnsaved();
    renderEditor();
}
function vehRemoveFeature(idx, fi) {
    state.data[idx].features.splice(fi, 1);
    markUnsaved();
    renderEditor();
}
function renderVehicleFeatures(idx, features) {
    const items = (features || []).map((f, fi) => `
        <div class="extra-feature">
            <div class="extra-feature-header">
                <input class="field-input" style="font-weight:600;" type="text" placeholder="Feature name"
                    value="${escAttr(f.name || '')}"
                    onchange="updateField(${idx},'features.${fi}.name',this.value)" oninput="markUnsaved()">
                <button class="extra-feature-delete" onclick="vehRemoveFeature(${idx},${fi})">✕</button>
            </div>
            <div class="extra-feature-body">
                <textarea class="field-input" rows="2" placeholder="Effect"
                    onchange="updateField(${idx},'features.${fi}.effect',this.value)"
                    oninput="markUnsaved()">${escHtml(f.effect || '')}</textarea>
            </div>
        </div>`).join('');
    return `<div class="forge-section">
        <div class="section-header section-header-split">
            <span>Features <span style="opacity:0.4;font-size:9px;letter-spacing:0;">[${(features || []).length}]</span></span>
            <button class="btn-section-add" onclick="vehAddFeature(${idx})">+ Add</button>
        </div>
        <div class="extra-features-list">
            ${items || '<div class="extra-features-empty">No features yet</div>'}
        </div>
    </div>`;
}

// ── VEHICLE FORM ──────────────────────────────────────────────────────────────
function renderVehicleForm(e, idx) {
    const catOpts = vehCategoryOptions();
    const tierOpts = vehSpeedTierOptions();
    const speedOpts = vehSpeedOptions();
    const s = e.stats || {};
    return `
        <div class="forge-section">
            <div class="section-header">Name</div>
            <div class="section-body">
                <input class="field-input field-input-name" type="text"
                    value="${escAttr(e.name || '')}" onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
            </div>
        </div>
        <div class="section-pair">
            <div class="forge-section">
                <div class="section-header">Identity</div>
                <div class="section-body">
                    <div class="field-grid">
                        <datalist id="veh-cat-opts-${idx}">${catOpts.map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
                        <div class="field-wrap">
                            <label class="field-label">Category</label>
                            <input class="field-input" type="text" list="veh-cat-opts-${idx}"
                                value="${escAttr(e.category || '')}" onchange="updateField(${idx},'category',this.value);refreshGroups()" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Subtitle</label>
                            <input class="field-input" type="text"
                                value="${escAttr(e.subtitle || '')}" onchange="updateField(${idx},'subtitle',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Rarity</label>
                            <select class="field-input" onchange="updateField(${idx},'rarity',this.value)">
                                ${buildSelect(VEH_RARITY, e.rarity)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Cost</label>
                            <input class="field-input mono" type="number" min="0" value="${e.cost ?? 0}"
                                onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Color</label>
                            <input class="field-input mono" type="text" placeholder="#rrggbb"
                                value="${escAttr(e.color || '')}" onchange="updateField(${idx},'color',this.value)" oninput="markUnsaved()">
                        </div>
                    </div>
                </div>
            </div>
            <div class="forge-section">
                <div class="section-header">Stats</div>
                <div class="section-body">
                    <div class="field-grid">
                        <datalist id="veh-speed-opts-${idx}">${speedOpts.map(v => `<option value="${escAttr(v)}">`).join('')}</datalist>
                        <div class="field-wrap">
                            <label class="field-label">Speed</label>
                            <input class="field-input" type="text" list="veh-speed-opts-${idx}" placeholder="e.g. 60 ft (40 mph)"
                                value="${escAttr(s.speed || '')}" onchange="updateField(${idx},'stats.speed',this.value)" oninput="markUnsaved()">
                        </div>
                        <datalist id="veh-tier-opts-${idx}">${tierOpts.map(v => `<option value="${escAttr(v)}">`).join('')}</datalist>
                        <div class="field-wrap">
                            <label class="field-label">Speed Tier</label>
                            <input class="field-input" type="text" list="veh-tier-opts-${idx}" placeholder="e.g. Fast"
                                value="${escAttr(s.speedTier || '')}" onchange="updateField(${idx},'stats.speedTier',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">PL</label>
                            <input class="field-input mono" type="number" min="0" placeholder="—" value="${s.pl ?? ''}"
                                onchange="updateField(${idx},'stats.pl',this.value===''?null:(parseFloat(this.value)||0))" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Capacity</label>
                            <input class="field-input" type="text" placeholder="e.g. 4 passengers"
                                value="${escAttr(s.capacity || '')}" onchange="updateField(${idx},'stats.capacity',this.value)" oninput="markUnsaved()">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Description</div>
            <div class="section-body">
                <textarea class="field-input" rows="3"
                    onchange="updateField(${idx},'desc',this.value)"
                    oninput="markUnsaved()">${escHtml(e.desc || '')}</textarea>
            </div>
        </div>
        ${renderVehicleFeatures(idx, e.features)}`;
}

// ── VEHICLE TABLE ─────────────────────────────────────────────────────────────
const VEH_COLS = [
    { label: '#',           key: null,          style: 'width:28px' },
    { label: 'Name',        key: 'name' },
    { label: 'Category',    key: 'category' },
    { label: 'Subtitle',    key: 'subtitle' },
    { label: 'Rarity',      key: 'rarity' },
    { label: 'Cost',        key: 'cost',        style: 'width:64px' },
    { label: 'Speed',       key: null },
    { label: 'Speed Tier',  key: null,          style: 'width:100px' },
    { label: 'PL',          key: null,          style: 'width:48px' },
    { label: 'Capacity',    key: null },
    { label: '',            key: null,          style: 'width:56px' },
];

function renderVehicleTable() {
    const type = 'vehicle';
    const sorted = tmSortedRows(type, state.filteredData, ['cost'], ['rarity']);
    const catOpts = vehCategoryOptions();
    const tierOpts = vehSpeedTierOptions();
    const speedOpts = vehSpeedOptions();

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        const s = e.stats || {};
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td><input class="gt-input gt-input-name" type="text" value="${escAttr(e.name || '')}"
                onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()"></td>
            <td><input class="gt-input" type="text" list="veh-cat-opts" value="${escAttr(e.category || '')}"
                onchange="updateField(${idx},'category',this.value);refreshGroups()" oninput="markUnsaved()" style="min-width:100px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.subtitle || '')}"
                onchange="updateField(${idx},'subtitle',this.value)" oninput="markUnsaved()" style="min-width:140px"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'rarity',this.value)">
                ${buildSelect(VEH_RARITY, e.rarity)}</select></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" value="${e.cost ?? 0}"
                onchange="updateField(${idx},'cost',parseFloat(this.value)||0)" oninput="markUnsaved()" style="width:56px"></td>
            <td><input class="gt-input" type="text" list="veh-speed-opts" value="${escAttr(s.speed || '')}"
                onchange="updateField(${idx},'stats.speed',this.value)" oninput="markUnsaved()" style="min-width:110px"></td>
            <td><input class="gt-input" type="text" list="veh-tier-opts" value="${escAttr(s.speedTier || '')}"
                onchange="updateField(${idx},'stats.speedTier',this.value)" oninput="markUnsaved()" style="width:90px"></td>
            <td><input class="gt-input gt-input-mono" type="number" min="0" placeholder="—" value="${s.pl ?? ''}"
                onchange="updateField(${idx},'stats.pl',this.value===''?null:(parseFloat(this.value)||0))" oninput="markUnsaved()" style="width:40px"></td>
            <td><input class="gt-input" type="text" value="${escAttr(s.capacity || '')}"
                onchange="updateField(${idx},'stats.capacity',this.value)" oninput="markUnsaved()" style="min-width:120px"></td>
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('${type}',${idx})" title="Edit full form">✎</button>
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
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Vehicles')}</div>
                    <div class="entry-subtitle">${count} vehicles · ${escHtml(groupLabel)} · ✎ to edit description &amp; features</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('${type}')">← Form View</button>
                    <button class="btn btn-green" onclick="vehicleTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <datalist id="veh-cat-opts">${catOpts.map(c => `<option value="${escAttr(c)}">`).join('')}</datalist>
            <datalist id="veh-speed-opts">${speedOpts.map(v => `<option value="${escAttr(v)}">`).join('')}</datalist>
            <datalist id="veh-tier-opts">${tierOpts.map(v => `<option value="${escAttr(v)}">`).join('')}</datalist>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, VEH_COLS)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function vehicleTableNewRow() {
    const editor = EDITORS.vehicle;
    const group = state.currentGroup !== 'All' ? state.currentGroup : '';
    const entry = editor.newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderVehicleTable();
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

// ── SHARED ENTRY ROW HELPER ────────────────────────────────────────────────────
function vehicleEntryRow(entry) {
    const s = entry.stats || {};
    return {
        name: entry.name || '(unnamed)',
        meta: entry.subtitle || s.speed || '',
        badges: [
            entry.category ? { label: entry.category, color: '#4c8a6e' } : null,
            entry.rarity ? { label: entry.rarity, color: '#7a7a7a' } : null,
        ].filter(Boolean),
    };
}

// ── REGISTER: VEHICLE ─────────────────────────────────────────────────────────
registerEditor('vehicle', {
    groupKey:   () => 'category',
    entryTitle: (entry) => entry.name || '(unnamed)',
    entryRow:   vehicleEntryRow,
    headerActions: (entry, idx) => `<button class="btn btn-ghost" onclick="duplicateVehicle(${idx})" title="Duplicate this vehicle">⧉ Duplicate</button>`,
    newEntry: (group) => ({
        name: '', category: group || '', subtitle: '', rarity: 'common', cost: 0, color: '#4c6e6e',
        stats: { speed: '', speedTier: '', pl: null, capacity: '' },
        desc: '', features: [],
    }),
    render: (entry, idx) => renderVehicleForm(entry, idx),
    onLoad() {
        tmRegister('vehicle', renderVehicleTable);
        tmOnLoad('vehicle');
    },
});
