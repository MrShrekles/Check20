// ── GEAR DOMAIN VALUES ────────────────────────────────────────────────────────
const GD = {
    weaponCategory: ['', 'melee', 'ranged', 'firearm', 'magic'],
    armorCategory:  ['', 'armor', 'shield'],
    range:      ['', 'Self', 'Melee', 'Melee, Short', 'Reach', 'Short', 'Medium', 'Long'],
    damageType: ['', 'Impact', 'Piercing', 'Slashing', 'Acid', 'Eclipse', 'Fire', 'Fluid', 'Ice', 'Lightning', 'Solar', 'Thunder', 'Toxic', 'Nature', 'Psychic', 'Vozian', 'Healing', 'Physical', 'Impact, Slashing'],
    rarity:     ['', 'common', 'uncommon', 'rare', 'very rare', 'legendary'],
    hefty:      ['yes', 'no'],
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

// ── WEAPON FORM ───────────────────────────────────────────────────────────────
function renderWeaponForm(e, idx) {
    const sel = buildSelect;
    const hasMagicFeature = e.category === 'magic' || e.featureName;
    return `
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
                        <div class="field-wrap full">
                            <label class="field-label">Check</label>
                            <input class="field-input" type="text" placeholder="e.g. Agility, Strength"
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
    return {
        name: entry.name || '(unnamed)',
        meta,
        badges: [
            cat    ? { label: cat,    color }   : null,
            rarity ? { label: rarity, color: '#7a7a7a' } : null,
        ].filter(Boolean),
    };
}

// ── REGISTER: WEAPON ──────────────────────────────────────────────────────────
registerEditor('weapon', {
    groupKey:   () => 'category',
    entryTitle: (entry) => entry.name || '(unnamed)',
    entryRow:   gearEntryRow,
    headerActions: () => '',
    newEntry: (group) => ({
        name: '', category: group || 'melee', check: '', range: '', damage: '',
        damageType: '', cost: 0, rarity: 'common', properties: '', bulk: 1, description: '',
    }),
    render: (entry, idx) => renderWeaponForm(entry, idx),
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
    render: (entry, idx) => renderArmorForm(entry, idx),
});
