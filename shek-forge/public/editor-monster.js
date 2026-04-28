// ── MONSTER DOMAIN VALUES ─────────────────────────────────────────────────────
const MD = {
    size:            ['', 'Tiny', 'Small', 'Medium', 'Large', 'Giant', 'Monolithic'],
    rarity:          ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    behavior:        ['', 'Aggressive', 'Trickster', 'Mindless', 'Neutral', 'Cowardly', 'Territorial', 'Pack Hunter', 'Solitary', 'Social'],
    origin:          ['', 'Celestial', 'Vozian', 'Nature', 'Dragon', 'Arcane', 'Chaos', 'Basic', 'Chrono', 'Life', 'Tech', 'Crystal', 'Elemental'],
    featureType:     ['', 'Action', 'Half Action', 'Off Action', 'Non-Action', 'Special', 'Press On', 'Long Rest', 'Start of turn', 'End of turn', 'Passive'],
    featureRange:    ['', 'Self', 'Melee', 'Reach', 'Short', 'Medium', 'Long'],
    featureDuration: ['', 'Instant', 'Until end of their next turn', 'Until end of your next turn', '1 minute', '1 hour', 'Permanent'],
    featureDamage:   ['', 'Impact', 'Piercing', 'Slashing', 'Acid', 'Eclipse', 'Fire', 'Fluid', 'Ice', 'Lightning', 'Solar', 'Thunder', 'Toxic', 'Nature', 'Psychic', 'Vozian', 'Healing'],
    baseType:        ['', 'Animaton', 'Aquatic', 'Arcaniform', 'celestial', 'Chrono', 'Construct', 'Crystaline', 'Demon (Ordealis)', 'denizen', 'Dragon', 'Elemental', 'Fairy', 'Insect', 'Knight', 'Leech', 'Lich', 'Machinal', 'Mimic', 'Motron', 'Mythic', 'Ooze', 'Predator', 'Prey', 'Rot', 'Rust', 'Shifter', 'Siren', 'Undead', 'Vampire', 'Vehicle'],
};

// ── MONSTER SCHEMA MAPS ───────────────────────────────────────────────────────
const M_SCHEMA = {
    monsterbook: {
        groupKey: '_group', walkKey: 'walk',
        featureNameKey: 'feature_name', featureTypeKey: 'feature_type',
        featureRangeKey: 'feature_range', featureEffectKey: 'feature_effect',
        featureDurationKey: 'feature_duration', featureDamageKey: 'feature_damage',
        hasLore: true, hasMotivation: true, hasBaseType: false,
    },
    monstertype: {
        groupKey: 'baseType', walkKey: 'movement',
        featureNameKey: 'featureName', featureTypeKey: 'featureAction',
        featureRangeKey: 'featureRange', featureEffectKey: 'featureEffect',
        featureDurationKey: 'featureDuration', featureDamageKey: 'featureDamage',
        hasLore: false, hasMotivation: false, hasBaseType: true,
    }
};

function getMonsterSchema() {
    const e = state.data && state.data[0];
    if (!e) return M_SCHEMA.monsterbook;
    if ('feature_name' in e || 'walk' in e || 'feature_effect' in e) return M_SCHEMA.monsterbook;
    return M_SCHEMA.monstertype;
}

// ── MOVEMENT ──────────────────────────────────────────────────────────────────
function stepMovement(entryIndex, key, delta) {
    const newVal = Math.max(0, (parseFloat(state.data[entryIndex][key]) || 0) + delta);
    setNestedProperty(state.data[entryIndex], key, newVal);
    markUnsaved();
    const inp = document.getElementById(`move-${key}-${entryIndex}`);
    if (inp) inp.value = newVal;
}

// ── PL / PHYSICAL / MENTAL ────────────────────────────────────────────────────
function updatePL(idx, value) {
    const pl   = Math.max(1, Math.round(value));
    const phys = Math.min(state.data[idx].check_physical ?? 0, pl);
    state.data[idx].pl = pl;
    state.data[idx].check_physical = phys;
    state.data[idx].check_mental   = pl - phys;
    markUnsaved();
    syncPLDisplay(idx);
}
function updatePhysical(idx, value) {
    const pl   = state.data[idx].pl ?? 6;
    const phys = Math.max(0, Math.min(pl, Math.round(value)));
    state.data[idx].check_physical = phys;
    state.data[idx].check_mental   = pl - phys;
    markUnsaved();
    syncPLDisplay(idx);
}
function updateMental(idx, value) {
    const pl   = state.data[idx].pl ?? 6;
    const ment = Math.max(0, Math.min(pl, Math.round(value)));
    state.data[idx].check_mental   = ment;
    state.data[idx].check_physical = pl - ment;
    markUnsaved();
    syncPLDisplay(idx);
}
function stepPL(idx, delta)       { updatePL(idx,       (state.data[idx].pl             ?? 6) + delta); }
function stepPhysical(idx, delta) { updatePhysical(idx, (state.data[idx].check_physical ?? 0) + delta); }
function stepMental(idx, delta)   { updateMental(idx,   (state.data[idx].check_mental   ?? 0) + delta); }
function syncPLDisplay(idx) {
    const { pl, check_physical: phys, check_mental: ment } = state.data[idx];
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set(`pl-input-${idx}`, pl);
    set(`pl-physical-${idx}`, phys);
    set(`pl-mental-${idx}`, ment);
    const plEl = document.getElementById(`pl-input-${idx}`);
    const sumEl = plEl?.closest('.field-wrap')?.querySelector('.pl-sum');
    if (sumEl) { sumEl.textContent = `${phys} + ${ment} = ${phys + ment} / ${pl}`; sumEl.classList.toggle('pl-sum-warn', phys + ment !== pl); }
}

// ── WEAPON AUTOCOMPLETE ───────────────────────────────────────────────────────
function matchDamageType(raw) {
    if (!raw) return '';
    const key = raw.toLowerCase().replace(/[^a-z]/g, '');
    return MD.featureDamage.find(o => o.toLowerCase().replace(/[^a-z]/g, '') === key) || raw;
}
function filterWeapons(input, idx, attackKey) {
    markUnsaved();
    updateField(idx, `${attackKey}.name`, input.value);
    const q = input.value.toLowerCase().trim();
    const list = document.getElementById(`ac-${attackKey}-${idx}`);
    if (!list) return;
    const pool = attackKey === 'melee_attack' ? state.weapons.melee : state.weapons.ranged;
    const hits = q ? pool.filter(w => w.name.toLowerCase().includes(q)) : pool;
    if (!hits.length) { list.classList.remove('open'); return; }
    list.innerHTML = hits.slice(0, 12).map(w => `
        <div class="autocomplete-item" onmousedown="applyWeapon(${idx}, '${attackKey}', ${pool.indexOf(w)})">
            <span class="autocomplete-item-name">${escHtml(w.name)}</span>
            <span class="autocomplete-item-meta">${escHtml(w.damage || '')} · ${escHtml(w.damageType || '')}</span>
        </div>`).join('');
    list.classList.add('open');
}
function applyWeapon(idx, attackKey, weaponIdx) {
    const pool = attackKey === 'melee_attack' ? state.weapons.melee : state.weapons.ranged;
    const w = pool[weaponIdx];
    if (!w) return;
    const dmgType = matchDamageType(w.damageType);
    setNestedProperty(state.data[idx], `${attackKey}.name`, w.name);
    setNestedProperty(state.data[idx], `${attackKey}.damage`, w.damage || '');
    setNestedProperty(state.data[idx], `${attackKey}.damage_type`, dmgType);
    markUnsaved();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set(`atk-name-${attackKey}-${idx}`,   w.name);
    set(`atk-damage-${attackKey}-${idx}`, w.damage || '');
    set(`atk-type-${attackKey}-${idx}`,   dmgType);
    closeAutocomplete(`${attackKey}-${idx}`, 0);
}
function closeAutocomplete(id, delay = 150) {
    setTimeout(() => { const el = document.getElementById(`ac-${id}`); if (el) el.classList.remove('open'); }, delay);
}
document.addEventListener('click', e => {
    if (!e.target.closest('.autocomplete-wrap'))
        document.querySelectorAll('.autocomplete-list.open').forEach(el => el.classList.remove('open'));
});

// ── EXTRA FEATURES ────────────────────────────────────────────────────────────
function renderExtraFeature(idx, fi, f) {
    return `
    <div class="extra-feature">
        <div class="extra-feature-header">
            <input class="field-input extra-feature-name" type="text" placeholder="Feature name..."
                value="${escAttr(f.name || '')}"
                onchange="updateExtraFeature(${idx},${fi},'name',this.value)" oninput="markUnsaved()">
            <button class="extra-feature-delete" onclick="removeExtraFeature(${idx},${fi})">✕</button>
        </div>
        <div class="field-grid extra-feature-body">
            <div class="field-wrap">
                <label class="field-label">Action Type</label>
                <select class="field-input" onchange="updateExtraFeature(${idx},${fi},'type',this.value)">
                    ${buildSelect(MD.featureType, f.type || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Range</label>
                <select class="field-input" onchange="updateExtraFeature(${idx},${fi},'range',this.value)">
                    ${buildSelect(MD.featureRange, f.range || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Damage Type</label>
                <select class="field-input" onchange="updateExtraFeature(${idx},${fi},'damage',this.value)">
                    ${buildSelect(MD.featureDamage, f.damage || '')}
                </select>
            </div>
            <div class="field-wrap">
                <label class="field-label">Duration</label>
                <select class="field-input" onchange="updateExtraFeature(${idx},${fi},'duration',this.value)">
                    ${buildSelect(MD.featureDuration, f.duration || '')}
                </select>
            </div>
            <div class="field-wrap full">
                <label class="field-label">Effect</label>
                <textarea class="field-input" rows="3" data-quick-build="feature"
                    onchange="updateExtraFeature(${idx},${fi},'effect',this.value)"
                    oninput="markUnsaved()">${escHtml(f.effect || '')}</textarea>
            </div>
        </div>
    </div>`;
}
function renderExtraFeaturesList(idx) {
    const el = document.getElementById(`extra-features-${idx}`);
    if (!el) return;
    const features = state.data[idx].features || [];
    el.innerHTML = features.length
        ? features.map((f, fi) => renderExtraFeature(idx, fi, f)).join('')
        : '<div class="extra-features-empty">No additional features</div>';
}
function addExtraFeature(idx) {
    if (!state.data[idx].features) state.data[idx].features = [];
    state.data[idx].features.push({ name: '', type: '', range: '', effect: '', duration: '', damage: '' });
    markUnsaved();
    renderExtraFeaturesList(idx);
}
function removeExtraFeature(idx, fi) {
    if (!state.data[idx].features) return;
    state.data[idx].features.splice(fi, 1);
    markUnsaved();
    renderExtraFeaturesList(idx);
}
function updateExtraFeature(idx, fi, key, value) {
    if (!state.data[idx].features?.[fi]) return;
    state.data[idx].features[fi][key] = value;
    markUnsaved();
}

// ── ROLL20 EXPORT ─────────────────────────────────────────────────────────────
function stripEmojiPrefix(str) { return (str || '').replace(/^[^\w]+/, '').trim(); }
function normalizeAction(val) {
    if (!val) return 'Action';
    const valid = ['Action','Half Action','Off Action','Non-Action','Special','Press On','Long Rest','Start of turn','End of turn','Passive'];
    return valid.find(v => v.toLowerCase() === val.toLowerCase()) || 'Action';
}
function normalizeRange(val) {
    if (!val) return 'Melee';
    const valid = ['Self','Melee','Reach','Short','Medium','Long'];
    return valid.find(v => v.toLowerCase() === val.toLowerCase()) || 'Melee';
}
function copyForRoll20(idx, btn) {
    const entry = state.data[idx];
    if (!entry) return;
    const sch = getMonsterSchema();
    const melee  = entry.melee_attack  || {};
    const ranged = entry.ranged_attack || {};
    const packet = {
        name: entry.name || 'Unknown Monster', size: entry.size || '',
        type: stripEmojiPrefix(entry.origin || ''), description: entry.description || '',
        environment: entry.environment || '', behavior: entry.behavior || '', motivation: entry.motivation || '',
        pl: entry.pl ?? 1, check_physical: entry.check_physical ?? 0, check_mental: entry.check_mental ?? 0,
        move_walk: entry[sch.walkKey] ?? 0, move_fly: entry.fly ?? 0, move_swim: entry.swim ?? 0, move_climb: entry.climb ?? 0,
        melee:  { name: melee.name  || '', damage: melee.damage  || '1d6', type: stripEmojiPrefix(melee.damage_type  || ''), equipped: !!melee.equipped },
        ranged: { name: ranged.name || '', damage: ranged.damage || '1d6', type: stripEmojiPrefix(ranged.damage_type || ''), equipped: !!ranged.equipped },
        feature: {
            name: entry[sch.featureNameKey] || '', action: normalizeAction(entry[sch.featureTypeKey] || ''),
            range: normalizeRange(entry[sch.featureRangeKey] || ''), effect: entry[sch.featureEffectKey] || '',
            damage: stripEmojiPrefix(entry[sch.featureDamageKey] || ''),
        },
        spells:           Array.isArray(entry.spells) ? entry.spells : [],
        spell_points_max: (entry.check_mental ?? 0) * 2,
    };
    const cmd = `!importmonster ${JSON.stringify(packet)}`;
    const flashBtn = () => {
        if (!btn) return;
        btn.textContent = '✓ Copied!';
        btn.classList.replace('btn-roll20', 'btn-roll20-copied');
        btn.disabled = true;
        setTimeout(() => { btn.textContent = '⬡ Roll20'; btn.classList.replace('btn-roll20-copied', 'btn-roll20'); btn.disabled = false; }, 2000);
    };
    const fallback = () => { const el = document.createElement('textarea'); el.value = cmd; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); flashBtn(); };
    if (navigator.clipboard) navigator.clipboard.writeText(cmd).then(flashBtn).catch(fallback); else fallback();
}

// ── MONSTER SPELLS ────────────────────────────────────────────────────────────
let spellsData = [];
const INTENT_COSTS = { 'light whisper':0,'whisper':1,'surge':3,'shout':6,'roar':9,'storm':12,'cataclysm':24 };

async function loadSpellsData() {
    if (spellsData.length) return;
    try {
        const res = await fetch('/api/file/spells.json');
        const json = await res.json();
        spellsData = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
    } catch (e) { console.warn('[forge] Could not load spells.json', e); }
}

function spellCost(intent) {
    return INTENT_COSTS[String(intent || '').toLowerCase()] ?? '';
}

function renderMonsterSpell(idx, si, s) {
    const effects = (s.effects || []).map((e, ei) => `
        <div class="extra-feature-body field-grid" style="padding:4px 0 2px 8px;border-left:2px solid var(--border)">
            <div class="field-wrap">
                <label class="field-label">Intent</label>
                <input class="field-input" type="text" value="${escAttr(e.intent || '')}"
                    onchange="updateMonsterSpellEffect(${idx},${si},${ei},'intent',this.value)" oninput="markUnsaved()">
            </div>
            <div class="field-wrap">
                <label class="field-label">SP Cost</label>
                <input class="field-input" type="number" min="0" value="${e.cost ?? spellCost(e.intent)}"
                    onchange="updateMonsterSpellEffect(${idx},${si},${ei},'cost',+this.value)" oninput="markUnsaved()" style="width:60px">
            </div>
            <div class="field-wrap">
                <label class="field-label">Range</label>
                <input class="field-input" type="text" value="${escAttr(e.range || '')}"
                    onchange="updateMonsterSpellEffect(${idx},${si},${ei},'range',this.value)" oninput="markUnsaved()">
            </div>
            <div class="field-wrap">
                <label class="field-label">Damage</label>
                <input class="field-input" type="text" placeholder="e.g. 2d6" value="${escAttr(e.damage || '')}"
                    onchange="updateMonsterSpellEffect(${idx},${si},${ei},'damage',this.value)" oninput="markUnsaved()">
            </div>
            <div class="field-wrap">
                <label class="field-label">Type</label>
                <select class="field-input" onchange="updateMonsterSpellEffect(${idx},${si},${ei},'type',this.value)">
                    ${buildSelect(MD.featureDamage, e.type || '')}
                </select>
            </div>
            <div class="field-wrap full">
                <label class="field-label">Effect</label>
                <textarea class="field-input" rows="2" data-quick-build="feature"
                    onchange="updateMonsterSpellEffect(${idx},${si},${ei},'effect',this.value)"
                    oninput="markUnsaved()">${escHtml(e.effect || '')}</textarea>
            </div>
        </div>`).join('');

    return `
    <div class="extra-feature" id="mspell-${idx}-${si}">
        <div class="extra-feature-header">
            <span style="font-weight:600;color:var(--gold)">${escHtml(s.name || 'Spell')}</span>
            <span style="font-size:0.75em;opacity:0.5;margin-left:6px">${escHtml([s.manner, s.transmission].filter(Boolean).join(' · '))}</span>
            <button class="extra-feature-delete" onclick="removeMonsterSpell(${idx},${si})">✕</button>
        </div>
        ${effects}
        <button class="btn btn-ghost" style="font-size:10px;margin-top:4px"
            onclick="addMonsterSpellEffect(${idx},${si})">+ Intent Level</button>
    </div>`;
}

function renderMonsterSpellsList(idx) {
    const el = document.getElementById(`monster-spells-${idx}`);
    if (!el) return;
    const spells = state.data[idx].spells || [];
    el.innerHTML = spells.length
        ? spells.map((s, si) => renderMonsterSpell(idx, si, s)).join('')
        : '<div class="extra-features-empty">No spells — use search to add</div>';
}

function removeMonsterSpell(idx, si) {
    if (!state.data[idx].spells) return;
    state.data[idx].spells.splice(si, 1);
    markUnsaved();
    renderMonsterSpellsList(idx);
}

function updateMonsterSpellEffect(idx, si, ei, key, value) {
    const s = state.data[idx].spells?.[si];
    if (!s?.effects?.[ei]) return;
    s.effects[ei][key] = value;
    markUnsaved();
}

function addMonsterSpellEffect(idx, si) {
    const s = state.data[idx].spells?.[si];
    if (!s) return;
    if (!s.effects) s.effects = [];
    s.effects.push({ intent: 'Whisper', cost: 1, range: 'Short', damage: '', type: '', effect: '' });
    markUnsaved();
    renderMonsterSpellsList(idx);
}

function openSpellPicker(idx) {
    loadSpellsData().then(() => {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.zIndex = '200';

        const box = document.createElement('div');
        box.className = 'dialog-box';
        box.style.cssText = 'max-width:520px;max-height:80vh;display:flex;flex-direction:column;gap:8px';

        box.innerHTML = `
            <div class="dialog-title">Add Spell</div>
            <input type="text" id="spell-picker-search" class="field-input"
                placeholder="Search spells…" autocomplete="off"
                style="width:100%;box-sizing:border-box">
            <div id="spell-picker-list" style="overflow-y:auto;max-height:380px;display:flex;flex-direction:column;gap:4px"></div>
            <div class="dialog-actions">
                <button class="btn btn-ghost" onclick="this.closest('.dialog-overlay').remove()">Cancel</button>
            </div>`;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const input = box.querySelector('#spell-picker-search');
        const list  = box.querySelector('#spell-picker-list');

        function renderList(q) {
            const filtered = spellsData.filter(s =>
                !q || s.name.toLowerCase().includes(q.toLowerCase())
            );
            list.innerHTML = filtered.slice(0, 40).map(s => `
                <div class="entry-row" style="cursor:pointer;padding:6px 10px;border-radius:4px" data-name="${escAttr(s.name)}">
                    <div class="entry-row-name">${escHtml(s.name)}</div>
                    <div class="entry-row-meta">${escHtml([s.manner, s.transmission, s.origin].filter(Boolean).join(' · '))}
                        — ${(s.effects||[]).map(e=>escHtml(e.intent)).join(', ')}</div>
                </div>`).join('');
            list.querySelectorAll('.entry-row').forEach(row => {
                row.addEventListener('click', () => {
                    const spell = spellsData.find(s => s.name === row.dataset.name);
                    if (!spell) return;
                    if (!state.data[idx].spells) state.data[idx].spells = [];
                    state.data[idx].spells.push({
                        name:         spell.name,
                        manner:       spell.manner || '',
                        transmission: spell.transmission || '',
                        effects:      (spell.effects || []).map(e => ({
                            intent: e.intent,
                            cost:   spellCost(e.intent),
                            range:  e.range  || '',
                            damage: '',
                            type:   '',
                            effect: e.effect || '',
                        })),
                    });
                    markUnsaved();
                    renderMonsterSpellsList(idx);
                    overlay.remove();
                });
            });
        }

        renderList('');
        input.addEventListener('input', () => renderList(input.value));
        requestAnimationFrame(() => input.focus());
    });
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('monster', {

    groupKey: (data) => {
        const e = data && data[0];
        if (!e) return '_group';
        return ('feature_name' in e || 'walk' in e) ? '_group' : 'baseType';
    },

    entryTitle: (entry) => entry.name || '(unnamed)',

    entryRow: (entry, showGroup) => {
        const sch = getMonsterSchema();
        const group = entry[sch.groupKey] || '';
        const rarityColor = { Common:'#888', Uncommon:'#55aa55', Rare:'#5588cc', Epic:'#aa55cc', Legendary:'#cc8822' };
        return {
            name: entry.name || '(unnamed)',
            meta: [entry.size, entry.origin].filter(Boolean).join(' · '),
            badges: [
                showGroup && group ? { label: group, color: '#7a7a7a' } : null,
                entry.rarity ? { label: entry.rarity, color: rarityColor[entry.rarity] || '#888' } : null,
            ].filter(Boolean),
        };
    },

    headerActions: (entry, idx) =>
        `<button class="btn btn-roll20" onclick="copyForRoll20(${idx}, this)">⬡ Roll20</button>`,

    newEntry: (group) => {
        const sch = getMonsterSchema();
        const e = { name: '' };
        if (sch.hasBaseType) e.baseType = group || ''; else e._group = group || '';
        e.origin = ''; e.size = ''; e.rarity = ''; e.environment = ''; e.behavior = ''; e.description = '';
        if (sch.hasLore) { e.lore = ''; e.motivation = ''; e.pl = 6; e.check_physical = 3; e.check_mental = 3; }
        e[sch.walkKey] = 0; e.fly = 0; e.swim = 0; e.climb = 0;
        e[sch.featureNameKey] = ''; e[sch.featureTypeKey] = ''; e[sch.featureRangeKey] = '';
        e[sch.featureEffectKey] = ''; e[sch.featureDurationKey] = ''; e[sch.featureDamageKey] = '';
        if (sch.hasLore) {
            const blank = { name: '', equipped: false, damage: '', damage_type: '' };
            e.melee_attack = { ...blank }; e.ranged_attack = { ...blank }; e.spell = { ...blank };
            e.features = []; e.art = '';
        }
        return e;
    },

    render: (entry, idx) => {
        const sch = getMonsterSchema();
        const sel = buildSelect;
        const fa  = (key) => escAttr(String(entry[key] ?? ''));
        const fh  = (key) => escHtml(String(entry[key] ?? ''));

        const walkVal          = entry[sch.walkKey]          ?? 0;
        const featureNameVal   = entry[sch.featureNameKey]   ?? '';
        const featureTypeVal   = entry[sch.featureTypeKey]   ?? '';
        const featureRangeVal  = entry[sch.featureRangeKey]  ?? '';
        const featureEffectVal = entry[sch.featureEffectKey] ?? '';
        const featureDurVal    = entry[sch.featureDurationKey] ?? '';
        const featureDmgVal    = entry[sch.featureDamageKey] ?? '';

        const groupKey   = sch.hasBaseType ? 'baseType' : '_group';
        const groupLabel = sch.hasBaseType ? 'Base Type' : 'Group';
        const groupField = `
            <div class="field-wrap">
                <label class="field-label">${groupLabel}</label>
                <input class="field-input" type="text" value="${escAttr(entry[groupKey] ?? '')}"
                    onchange="updateField(${idx},'${groupKey}',this.value);refreshGroups()" oninput="markUnsaved()">
            </div>`;

        const plBlock = sch.hasLore ? (() => {
            const pl = entry.pl ?? 6, phys = entry.check_physical ?? 3, ment = entry.check_mental ?? 3;
            return `
            <div class="field-wrap full">
                <div class="pl-row">
                    <div class="pl-cell">
                        <label class="field-label">Power Level</label>
                        <div class="movement-stepper">
                            <button class="step-btn" onclick="stepPL(${idx},-1)">−</button>
                            <input id="pl-input-${idx}" class="field-input mono" type="number" min="1" value="${pl}"
                                onchange="updatePL(${idx},parseFloat(this.value)||6)" oninput="markUnsaved()">
                            <button class="step-btn" onclick="stepPL(${idx},1)">+</button>
                        </div>
                    </div>
                    <div class="pl-cell">
                        <label class="field-label">Physical</label>
                        <div class="movement-stepper">
                            <button class="step-btn" onclick="stepPhysical(${idx},-1)">−</button>
                            <input id="pl-physical-${idx}" class="field-input mono" type="number" min="0" value="${phys}"
                                onchange="updatePhysical(${idx},parseFloat(this.value)||0)" oninput="markUnsaved()">
                            <button class="step-btn" onclick="stepPhysical(${idx},1)">+</button>
                        </div>
                    </div>
                    <div class="pl-cell">
                        <label class="field-label">Mental</label>
                        <div class="movement-stepper">
                            <button class="step-btn" onclick="stepMental(${idx},-1)">−</button>
                            <input id="pl-mental-${idx}" class="field-input mono" type="number" min="0" value="${ment}"
                                onchange="updateMental(${idx},parseFloat(this.value)||0)" oninput="markUnsaved()">
                            <button class="step-btn" onclick="stepMental(${idx},1)">+</button>
                        </div>
                    </div>
                </div>
                <div class="pl-sum ${phys + ment === pl ? '' : 'pl-sum-warn'}">${phys} + ${ment} = ${phys + ment} / ${pl}</div>
            </div>`;
        })() : '';

        const attacksBlock = sch.hasLore ? `
            <div class="forge-section">
                <div class="section-header">Attacks</div>
                <div class="section-body" style="padding:0;">
                    ${[{key:'melee_attack',label:'Melee',ac:true},{key:'ranged_attack',label:'Ranged',ac:true},{key:'spell',label:'Spell',ac:false}]
                        .map(({ key, label, ac }) => {
                            const atk = entry[key] || {};
                            const nameInput = ac
                                ? `<div class="autocomplete-wrap">
                                    <input id="atk-name-${key}-${idx}" class="field-input attack-name" type="text" placeholder="Name..."
                                        value="${escAttr(atk.name || '')}"
                                        oninput="filterWeapons(this,${idx},'${key}')"
                                        onblur="closeAutocomplete('${key}-${idx}')">
                                    <div class="autocomplete-list" id="ac-${key}-${idx}"></div>
                                   </div>`
                                : `<input id="atk-name-${key}-${idx}" class="field-input attack-name" type="text" placeholder="Name..."
                                    value="${escAttr(atk.name || '')}"
                                    onchange="updateField(${idx},'${key}.name',this.value)" oninput="markUnsaved()">`;
                            return `
                            <div class="attack-row">
                                <div class="attack-label">${label}</div>
                                <label class="attack-equipped">
                                    <input type="checkbox" ${atk.equipped ? 'checked' : ''}
                                        onchange="updateField(${idx},'${key}.equipped',this.checked)">
                                    <span>Equipped</span>
                                </label>
                                ${nameInput}
                                <input id="atk-damage-${key}-${idx}" class="field-input attack-damage mono" type="text" placeholder="e.g. 2d6"
                                    value="${escAttr(atk.damage || '')}"
                                    onchange="updateField(${idx},'${key}.damage',this.value)" oninput="markUnsaved()">
                                <select id="atk-type-${key}-${idx}" class="field-input attack-type"
                                    onchange="updateField(${idx},'${key}.damage_type',this.value)">
                                    ${sel(MD.featureDamage, atk.damage_type || '')}
                                </select>
                            </div>`;
                        }).join('')}
                </div>
            </div>` : '';

        return `
            <div class="forge-section">
                <div class="section-header">Name</div>
                <div class="section-body">
                    <input class="field-input" style="font-size:13px;font-family:'Cinzel',serif;letter-spacing:0.04em;"
                        type="text" value="${fa('name')}"
                        onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
                </div>
            </div>

            <div class="section-pair">
                <div class="forge-section">
                    <div class="section-header">Identity</div>
                    <div class="section-body">
                        <div class="field-grid">
                            ${groupField}
                            <div class="field-wrap">
                                <label class="field-label">Origin</label>
                                <select class="field-input" onchange="updateField(${idx},'origin',this.value)">
                                    ${sel(MD.origin, entry.origin)}
                                </select>
                            </div>
                            <div class="field-wrap">
                                <label class="field-label">Size</label>
                                <select class="field-input" onchange="updateField(${idx},'size',this.value)">
                                    ${sel(MD.size, entry.size)}
                                </select>
                            </div>
                            <div class="field-wrap">
                                <label class="field-label">Rarity</label>
                                <select class="field-input" onchange="updateField(${idx},'rarity',this.value)">
                                    ${sel(MD.rarity, entry.rarity)}
                                </select>
                            </div>
                            ${plBlock}
                        </div>
                    </div>
                </div>
                <div class="forge-section">
                    <div class="section-header">Environment & Behavior</div>
                    <div class="section-body">
                        <div class="field-grid">
                            <div class="field-wrap">
                                <label class="field-label">Environment</label>
                                <input class="field-input" type="text" list="env-options" value="${fa('environment')}"
                                    onchange="updateField(${idx},'environment',this.value)" oninput="markUnsaved()">
                            </div>
                            <div class="field-wrap">
                                <label class="field-label">Behavior</label>
                                <select class="field-input" onchange="updateField(${idx},'behavior',this.value)">
                                    ${sel(MD.behavior, entry.behavior)}
                                </select>
                            </div>
                            ${sch.hasMotivation ? `
                            <div class="field-wrap full">
                                <label class="field-label">Motivation</label>
                                <input class="field-input" type="text" value="${fa('motivation')}"
                                    onchange="updateField(${idx},'motivation',this.value)" oninput="markUnsaved()">
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <div class="forge-section">
                <div class="section-header">Movement</div>
                <div class="section-body">
                    <div class="movement-row">
                        ${[
                            { icon:'🚶', label:'Walk',  key: sch.walkKey },
                            { icon:'✈',  label:'Fly',   key: 'fly'   },
                            { icon:'🏊', label:'Swim',  key: 'swim'  },
                            { icon:'🧗', label:'Climb', key: 'climb' },
                        ].map(({ icon, label, key }) => `
                        <div class="movement-cell">
                            <div class="movement-icon">${icon}</div>
                            <label class="movement-label">${label}</label>
                            <div class="movement-stepper">
                                <button class="step-btn" onclick="stepMovement(${idx},'${key}',-5)">−</button>
                                <input id="move-${key}-${idx}" class="field-input mono" type="number" min="0" step="5" value="${entry[key] ?? 0}"
                                    onchange="updateField(${idx},'${key}',parseFloat(this.value)||0)" oninput="markUnsaved()">
                                <button class="step-btn" onclick="stepMovement(${idx},'${key}',5)">+</button>
                            </div>
                        </div>`).join('')}
                    </div>
                </div>
            </div>

            ${attacksBlock}

            <div class="forge-section">
                <div class="section-header">Main Feature</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Feature Name</label>
                            <input class="field-input" type="text" value="${escAttr(featureNameVal)}"
                                onchange="updateField(${idx},'${sch.featureNameKey}',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Action Type</label>
                            <select class="field-input" onchange="updateField(${idx},'${sch.featureTypeKey}',this.value)">
                                ${sel(MD.featureType, featureTypeVal)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Range</label>
                            <select class="field-input" onchange="updateField(${idx},'${sch.featureRangeKey}',this.value)">
                                ${sel(MD.featureRange, featureRangeVal)}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Damage Type</label>
                            <select class="field-input" onchange="updateField(${idx},'${sch.featureDamageKey}',this.value)">
                                ${sel(MD.featureDamage, featureDmgVal)}
                            </select>
                        </div>
                        <div class="field-wrap full">
                            <label class="field-label">Duration</label>
                            <select class="field-input" onchange="updateField(${idx},'${sch.featureDurationKey}',this.value)">
                                ${sel(MD.featureDuration, featureDurVal)}
                            </select>
                        </div>
                        <div class="field-wrap full">
                            <label class="field-label">Effect</label>
                            <textarea class="field-input" rows="4" data-quick-build="feature"
                                onchange="updateField(${idx},'${sch.featureEffectKey}',this.value)"
                                oninput="markUnsaved()">${escHtml(featureEffectVal)}</textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div class="forge-section">
                <div class="section-header section-header-split">
                    <span>Additional Features</span>
                    <button class="btn-section-add" onclick="addExtraFeature(${idx})">+ Add</button>
                </div>
                <div class="extra-features-list" id="extra-features-${idx}">
                    ${(entry.features?.length)
                        ? entry.features.map((f, fi) => renderExtraFeature(idx, fi, f)).join('')
                        : '<div class="extra-features-empty">No additional features</div>'}
                </div>
            </div>

            <div class="forge-section">
                <div class="section-header section-header-split">
                    <span>Spells <span style="font-size:0.75em;opacity:0.5">(SP: ${((entry.check_mental ?? 0) * 2)} max)</span></span>
                    <button class="btn-section-add" onclick="openSpellPicker(${idx})">+ Add</button>
                </div>
                <div class="extra-features-list" id="monster-spells-${idx}">
                    ${(() => {
                        const spells = entry.spells || [];
                        return spells.length
                            ? spells.map((s, si) => renderMonsterSpell(idx, si, s)).join('')
                            : '<div class="extra-features-empty">No spells — use search to add</div>';
                    })()}
                </div>
            </div>

            <div class="forge-section">
                <div class="section-header">Narrative</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Description</label>
                            <textarea class="field-input" rows="5"
                                onchange="updateField(${idx},'description',this.value)"
                                oninput="markUnsaved()">${fh('description')}</textarea>
                        </div>
                        ${sch.hasLore ? `
                        <div class="field-wrap">
                            <label class="field-label">Lore</label>
                            <textarea class="field-input" rows="5"
                                onchange="updateField(${idx},'lore',this.value)"
                                oninput="markUnsaved()">${fh('lore')}</textarea>
                        </div>` : ''}
                    </div>
                </div>
            </div>`;
    },
});
