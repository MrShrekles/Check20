/* Active Sheet — mobile-first gameplay runner */

const DATA_BASE = window.location.pathname.includes('/active-sheet/') ? '../data/' : 'data/';
const titleCase = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/ \w/g, c => c.toUpperCase()) : '';

// ── CHECKS ────────────────────────────────────────────────────────────────────

const CHECKS = {
    physical: [
        { key: 'agi', label: 'Agility', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'cra', label: 'Crafting', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'ste', label: 'Stealth', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'str', label: 'Strength', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'sur', label: 'Survival', mod: 0, bonus: 0, armorBonus: 0 },
    ],
    mental: [
        { key: 'inf', label: 'Influence', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'int', label: 'Intellect', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'lck', label: 'Luck', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'obs', label: 'Observation', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'spi', label: 'Spirit', mod: 0, bonus: 0, armorBonus: 0 },
    ],
};

const CONDITION_GROUPS = {
    'Corpus': ['Bleeding', 'Broken', 'Concussion', 'Coughing', 'Dislocation', 'Pinned', 'Prone', 'Slowed'],
    'Cognition': ['Blind', 'Charmed', 'Confused', 'Deaf', 'Fear'],
    'Special': ['Intangible', 'Invisible'],
    'Major': ['Constrained', 'Exhaustion', 'Exposed', 'Injured', 'Stunned', 'Unconscious'],
};

const CONDITION_EFFECTS = {
    'Bleeding': 'Cannot heal or recover wounds',
    'Broken': 'Physical checks: Disadvantage',
    'Concussion': 'Mental & Spell checks: Disadvantage',
    'Coughing': 'Mental checks: Disadvantage',
    'Dislocation': 'Physical checks: Disadvantage',
    'Slowed': 'Movement: Halved',
    'Pinned': 'Ranged attacks: Disadvantage',
    'Prone': 'Cannot move until source removed',
    'Blind': 'Attack rolls: Disadvantage — Attacks vs you: Advantage',
    'Charmed': 'Mental checks: Disadvantage — Cannot attack charm source',
    'Confused': 'Mental & Spell checks: Disadvantage',
    'Deaf': 'Stealth & Spell checks: Disadvantage',
    'Fear': 'Must dash or hide — Cannot approach source',
    'Intangible': 'Cannot attack — Movement: Halved',
    'Invisible': 'Attacks vs you: Disadvantage',
    'Constrained': 'Cannot make attack actions — Attacks vs you: Advantage',
    'Exhaustion': 'All checks: Disadvantage — Movement: Halved',
    'Exposed': 'Incoming damage: Doubled',
    'Injured': 'Any damage triggers Death condition',
    'Stunned': 'All checks: Disadvantage — Movement: Halved',
    'Unconscious': 'Cannot act — Vulnerable to crits & Finishers',
};

// Which check keys each condition forces to Disadvantage ('all' = every check)
const CONDITION_DISADVANTAGE = {
    'Broken': ['agi', 'cra', 'ste', 'str', 'sur'],
    'Dislocation': ['agi', 'cra', 'ste', 'str', 'sur'],
    'Concussion': ['inf', 'int', 'lck', 'obs', 'spi'],
    'Coughing': ['inf', 'int', 'lck', 'obs', 'spi'],
    'Charmed': ['inf', 'int', 'lck', 'obs', 'spi'],
    'Confused': ['inf', 'int', 'lck', 'obs', 'spi'],
    'Deaf': ['ste', 'spi'],
    'Blind': 'all',
    'Exhaustion': 'all',
    'Stunned': 'all',
    'Pinned': 'all',   // ranged attacks use all checks
};

// Returns the condition name causing disadvantage for a check key, or null
function conditionDisadvantage(checkKey) {
    for (const cond of state.activeConditions) {
        const rule = CONDITION_DISADVANTAGE[cond];
        if (!rule) continue;
        if (rule === 'all' || rule.includes(checkKey)) return cond;
    }
    return null;
}

// Pre-selects Dis on a roll-seg group if any active condition penalizes the given check key
function applyConditionRollType(segSelector, chipSelector) {
    const selChip = document.querySelector(`${chipSelector} .drawer-check-chip.is-sel`);
    const checkLbl = selChip?.dataset.checkLabel?.toLowerCase() || '';
    const LABEL_KEY = {
        agility: 'agi', crafting: 'cra', stealth: 'ste', strength: 'str', survival: 'sur',
        influence: 'inf', intellect: 'int', luck: 'lck', observation: 'obs', spirit: 'spi'
    };
    const checkKey = LABEL_KEY[checkLbl] || '';
    const penalty = checkKey ? conditionDisadvantage(checkKey) : null;
    if (penalty) {
        document.querySelectorAll(`${segSelector} .roll-seg-btn`).forEach(b => b.classList.remove('is-sel'));
        document.querySelector(`${segSelector} [data-seg="dis"]`)?.classList.add('is-sel');
    }
}

// ── STATE ─────────────────────────────────────────────────────────────────────

const state = {
    char: {
        name: '', level: 1,
        species: '', age: '', size: '', diet: '', language: '', motivation: '',
        classKey: '', pathName: '', talentName: '',
        speciesLineage: '',
        speciesFeature: null,  // { name, effect, action, check }
        speciesSubFeature: null,  // { name, effect }
        trinket: '',
        wealth: 0,
        featureOverrides: {},   // { [featureName]: { desc?: string, hideRoll?: bool } }
        theme: { a1: '', a2: '' }, // per-character dual accent colors
        notes: '',   // free-form session/character notes
        npcs: [],   // [{ name, loyalty, notes }]
        favoriteSpells: [],   // spell names marked as favorites
        pressOnUsed: 0,
        longRestUsed: false,
        poUsesMax: 2,
        poResource: 1,
        poMana: 1,
        poArmor: 'd6',
        poHealing: 'd6',
        poDesc: '',
        lrDesc: '',
    },
    resources: {
        hp: { current: 0, max: 0, bonus: 0 },
        armor: { current: 0, max: 0 },
        MN: { current: 0, max: 0 },
        classRes: { current: 0, max: 0, label: 'Resource' },
        custom: [],  // [{ id, label, current, max }]
    },
    checks: structuredClone(CHECKS),
    activeConditions: new Set(),
    equipment: [],
    progression: {
        pathChecked: {},
        talentChecked: {},
        otherGains: [],
        xp: 0,
    },
    chat: [],  // [{ type: 'roll'|'msg', text, time }]
    rollLog: [],
};

// ── XP HELPERS ────────────────────────────────────────────────────────────────

function getXpSpent() {
    const p = Object.values(state.progression.pathChecked || {}).filter(Boolean).length;
    const t = Object.values(state.progression.talentChecked || {}).filter(Boolean).length;
    return (p + t) * 20;
}

function getXpAvailable() {
    return Math.max(0, (state.progression.xp || 0) - getXpSpent());
}

function updateXpDisplay() {
    const total = state.progression.xp || 0;
    const spent = getXpSpent();
    const avail = total - spent;

    const totalEl = document.getElementById('xp-total-el');
    const spentEl = document.getElementById('xp-spent-el');
    const availEl = document.getElementById('xp-avail-el');
    const fillEl = document.getElementById('xp-fill');
    const inputEl = document.getElementById('xp-total-input');

    if (totalEl) totalEl.textContent = total;
    if (spentEl) spentEl.textContent = spent;
    if (availEl) {
        availEl.textContent = avail;
        availEl.className = `xp-num xp-num--avail${avail >= 20 ? ' xp-num--ready' : ''}`;
    }
    if (fillEl) fillEl.style.width = total > 0 ? `${Math.min(100, (spent / total) * 100)}%` : '0%';
    // Sync input field (skip if it currently has focus to avoid clobbering typing)
    if (inputEl && document.activeElement !== inputEl) inputEl.value = total;
}

// ── EQUIPMENT CATEGORY INFERENCE ─────────────────────────────────────────────

function inferEquipCategory(name, notes) {
    const n = (name || '').toLowerCase();
    const d = (notes || '').toLowerCase();
    if (d.includes('armor:') || n.includes('armor') || n.includes('shield') || n.includes('cloak') || n.includes('robes')) return 'armor';
    if (/\dd\d/.test(d) || /\dd\d/.test(n)) return 'weapon';
    return 'gear';
}

// ── ARMOR CHECK BONUSES ───────────────────────────────────────────────────────

function parseArmorMods(notes) {
    // Match patterns like "Stealth +1", "Agility -2", "Strength+3" in notes text
    const result = {};
    const allChecks = [...state.checks.physical, ...state.checks.mental];
    allChecks.forEach(chk => {
        const re = new RegExp(`${chk.label}\\s*([+-]\\d+)`, 'i');
        const m = notes.match(re);
        if (m) result[chk.key] = parseInt(m[1], 10);
    });
    return result;
}

function armorRatingFor(item) {
    if (item.armorRating) return item.armorRating;
    // Look up from loaded data and cache it on the item
    const found = armorData.find(a => a.name.toLowerCase() === (item.name || '').toLowerCase());
    if (found) { item.armorRating = found.armor || 0; return item.armorRating; }
    // Fall back: parse "N Armor" from notes
    const m = (item.notes || '').match(/^(\d+)\s*Armor/i);
    return m ? parseInt(m[1], 10) : 0;
}

function recalcArmorBonuses() {
    // Recalculates check modifiers from equipped armor (e.g. Stealth penalty from heavy armor).
    // Armor max is set manually via the health editor — not derived here.
    const allChecks = [...state.checks.physical, ...state.checks.mental];
    allChecks.forEach(c => { c.armorBonus = 0; });
    state.equipment.filter(e => e.category === 'armor').forEach(item => {
        const mods = parseArmorMods(item.notes || '');
        Object.entries(mods).forEach(([key, val]) => {
            const chk = allChecks.find(c => c.key === key);
            if (chk) chk.armorBonus += val;
        });
    });
    renderQuickChecks();
    saveState();
}

const SPELL_STAT_MAP = {
    spirit: 'spi', intellect: 'int', influence: 'inf', agility: 'agi',
    crafting: 'cra', stealth: 'ste', strength: 'str', survival: 'sur',
    observation: 'obs', luck: 'lck',
};

function getSpellcastingStat() {
    if (!state.char.classKey) return null;
    const entries = getClassEntries(state.char.classKey);
    const pathEntry = state.char.pathName ? entries.find(e => e.name === state.char.pathName) : null;
    const toSearch = [
        ...(pathEntry?.path?.steps?.filter(s => Number(s.step) === 0) || []),
        ...((classBaseData.find(c => c.name === state.char.classKey)?.features) || []),
    ];
    for (const s of toSearch) {
        const raw = s.description || '';
        const text = Array.isArray(raw) ? raw.join(' ') : raw;
        const m = text.match(/(\w+) is your Spellcasting check/i);
        if (m) return SPELL_STAT_MAP[m[1].toLowerCase()] || null;
    }
    return null;
}

// Matches both "Mana" and "spellpoints / spell points" terminology
const MN_WORD = '(?:mana|spell\\s*points?)';

function calcManaMax() {
    const allChecksArr = [...state.checks.physical, ...state.checks.mental];

    // Universal rule: every 2 Spirit = 1 Mana
    const spirit = allChecksArr.find(c => c.key === 'spi');
    let total = spirit ? Math.floor((spirit.mod + (spirit.bonus || 0)) / 2) : 0;
    let statBased = false;

    if (state.char.classKey) {
        const base = classBaseData.find(c => c.name === state.char.classKey) || {};
        const entries = getClassEntries(state.char.classKey);
        const pathEntry = state.char.pathName ? entries.find(e => e.name === state.char.pathName) : null;
        const talentEntry = state.char.talentName ? entries.find(e => e.name === state.char.talentName) : null;

        function scan(desc) {
            if (!desc) return;
            const text = Array.isArray(desc) ? desc.join(' ') : String(desc);
            const fixedMatch = text.match(new RegExp(`you have (\\d+) ${MN_WORD}`, 'i'));
            if (fixedMatch) total += parseInt(fixedMatch[1], 10);
            const bonusMatch = text.match(new RegExp(`additional \\+(\\d+) ${MN_WORD}`, 'i'));
            if (bonusMatch) total += parseInt(bonusMatch[1], 10);
            const plusMatch = text.match(new RegExp(`\\+(\\d+) (?:maximum )?${MN_WORD}`, 'i'));
            if (plusMatch && !bonusMatch) total += parseInt(plusMatch[1], 10);
            if (new RegExp(`${MN_WORD} equal to your`, 'i').test(text)) statBased = true;
        }

        (base.features || []).forEach(f => scan(f.description));

        const pathSteps = pathEntry?.path?.steps || [];
        const talentSteps = talentEntry?.talent?.steps || [];
        pathSteps.filter(s => Number(s.step) === 0).forEach(s => scan(s.description));
        talentSteps.filter(s => Number(s.step) === 0).forEach(s => scan(s.description));
        pathSteps.filter(s => Number(s.step) !== 0).forEach((s, i) => {
            if (state.progression.pathChecked[i]) scan(s.description);
        });
        talentSteps.filter(s => Number(s.step) !== 0).forEach((s, i) => {
            if (state.progression.talentChecked[i]) scan(s.description);
        });

        // Mage-style: base pool = spellcasting stat value
        if (statBased) {
            const statKey = getSpellcastingStat();
            if (statKey) {
                const stat = allChecksArr.find(c => c.key === statKey);
                if (stat) total += stat.mod + (stat.bonus || 0) + (stat.armorBonus || 0);
            }
        }
    }

    if (total > 0) {
        const oldMax = state.resources.MN.max;
        state.resources.MN.max = total;
        state.resources.MN.current = state.resources.MN.current >= oldMax
            ? total
            : Math.min(state.resources.MN.current, total);
        syncUI();
        saveState();
    }

    // Show Recover button only when a spellcasting stat is detected
    const recoverBtn = document.getElementById('btn-recover-mn');
    if (recoverBtn) recoverBtn.hidden = !getSpellcastingStat();
}

function recoverMN() {
    const statKey = getSpellcastingStat();
    if (!statKey) return;

    const stat = [...state.checks.physical, ...state.checks.mental].find(c => c.key === statKey);
    if (!stat) return;

    const mod = stat.mod + (stat.bonus || 0) + (stat.armorBonus || 0);
    const d20 = Math.floor(Math.random() * 20) + 1;
    const roll = d20 + mod;
    const space = state.resources.MN.max - state.resources.MN.current;
    const gained = Math.min(roll, space);

    state.resources.MN.current = Math.min(state.resources.MN.max, state.resources.MN.current + roll);
    syncUI();
    saveState();

    state.chat.unshift({
        type: 'roll', time: chatTimestamp(),
        charName: state.char.name || '',
        label: `${stat.label} — Mana Recovery`,
        total: roll, rollNote: `d20(${d20})`, mod, rollType: 'flat',
        conditions: [...state.activeConditions],
        featureContext: {
            name: 'Mana Recovery',
            tags: [`${stat.label} Check`, gained > 0 ? `+${gained} MN` : 'Already full'],
            desc: gained > 0
                ? `Recovered ${gained} Mana — now ${state.resources.MN.current}/${state.resources.MN.max}`
                : 'Mana already at maximum.',
            diceRolls: [],
        },
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
}

function showProgError(msg) {
    const el = document.getElementById('xp-error');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2500);
}

// ── CLASS DATA ────────────────────────────────────────────────────────────────

let classBaseData = [];
let classOptData = {};
let weaponsData = [];
let armorData = [];
let damageData = {};   // loaded from damage.json — keyed by damage type name
let spellsData = [];   // loaded from spells.json
let spellFilter = 'All';
let spellSearch = '';
let spellSort = 'origin'; // 'name' | 'cost' | 'origin'

async function loadClassData() {
    try {
        const [baseRes, optRes] = await Promise.all([
            fetch(DATA_BASE + 'classes.json'),
            fetch(DATA_BASE + 'class-new.json'),
        ]);
        const baseJson = await baseRes.json();
        const optJson = await optRes.json();
        classBaseData = baseJson?.classes || [];
        classOptData = optJson?.classes || {};
        populateClassSelect();
        if (state.char.classKey) {
            populatePathTalentSelects(state.char.classKey);
            renderClassView();
            renderProgression();
            calcManaMax();
        }
    } catch (e) { console.warn('Could not load class data', e); }
}

async function loadWeapons() {
    try {
        const [wRes, aRes, dRes] = await Promise.all([
            fetch(DATA_BASE + 'weapons.json'),
            fetch(DATA_BASE + 'armor.json'),
            fetch(DATA_BASE + 'damage.json'),
        ]);
        weaponsData = await wRes.json();
        armorData = await aRes.json();
        const dj = await dRes.json();
        damageData = dj?.types || {};
        window.damageData = damageData; // expose for chat-cards.js damageTableBtnHtml
        recalcArmorBonuses(); // re-run now that armorData is available for rating lookups

        const datalist = document.createElement('datalist');
        datalist.id = 'items-datalist';
        weaponsData.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.name;
            datalist.appendChild(opt);
        });
        armorData.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.name;
            datalist.appendChild(opt);
        });
        document.body.appendChild(datalist);
        const nameInput = document.getElementById('equip-name-input');
        if (nameInput) nameInput.setAttribute('list', 'items-datalist');
    } catch (e) { console.warn('Could not load equipment data', e); }
}

function getClassEntries(className) {
    const key = (className || '').toLowerCase();
    const entries = classOptData[key];
    return Array.isArray(entries) ? entries : [];
}

function populateClassSelect() {
    const sel = document.getElementById('class-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select Class —</option>' +
        classBaseData.map(c =>
            `<option value="${c.name}"${c.name === state.char.classKey ? ' selected' : ''}>${c.name}</option>`
        ).join('');
}

function populatePathTalentSelects(className) {
    const entries = getClassEntries(className);
    const pathSel = document.getElementById('path-select');
    const talentSel = document.getElementById('talent-select');

    if (pathSel) {
        const paths = entries.filter(e => Array.isArray(e?.path?.steps) && e.path.steps.length);
        pathSel.innerHTML = '<option value="">— Select Path —</option>' +
            paths.map(e =>
                `<option value="${e.name}"${e.name === state.char.pathName ? ' selected' : ''}>${e.name}</option>`
            ).join('');
    }
    if (talentSel) {
        const talents = entries.filter(e => Array.isArray(e?.talent?.steps) && e.talent.steps.length);
        talentSel.innerHTML = '<option value="">— Select Talent —</option>' +
            talents.map(e =>
                `<option value="${e.name}"${e.name === state.char.talentName ? ' selected' : ''}>${e.name}</option>`
            ).join('');
    }
}

// ── WEAPON MODAL ──────────────────────────────────────────────────────────────

const DAMAGE_TYPES = ['Impact', 'Piercing', 'Slashing', 'Solar', 'Acid', 'Eclipse', 'Fire', 'Ice', 'Lightning', 'Thunder', 'Toxic', 'Fluid', 'Nature', 'Psychic', 'Vozian', 'Healing'];
const RANGES = ['Melee', 'Reach', 'Short', 'Medium', 'Long', 'Visible'];

function parseWeaponData(item) {
    if (item.damage !== undefined) return item; // already structured
    const notes = item.notes || '';
    const dmgMatch = notes.match(/(\d+d\d+[!]?(?:[+-]\d+)?)/i);
    const damage = dmgMatch ? dmgMatch[1] : '';
    const damageType = DAMAGE_TYPES.find(t => notes.includes(t)) || '';
    const range = RANGES.find(r => notes.includes(r)) || '';
    const foundChecks = ['Agility', 'Crafting', 'Influence', 'Intellect', 'Luck', 'Observation', 'Spirit', 'Stealth', 'Strength', 'Survival'].filter(c => notes.includes(c));
    const check = foundChecks.join(', ');
    const isHefty = /hefty|heavy/i.test(notes);
    const isLight = /\blight\b/i.test(notes);
    const properties = isHefty ? 'Hefty' : isLight ? 'Light' : '—';
    return { ...item, damage, damageType, range, check, properties, desc: item.desc || item.notes || '' };
}

let weaponModalItem = null;
let weaponModalIndex = -1;

function populateWmSelects() {
    const typeEl  = document.getElementById('wm-dmg-type-input');
    const rangeEl = document.getElementById('wm-range-input');
    if (typeEl && !typeEl.options.length) {
        typeEl.innerHTML = `<option value="">—</option>` +
            DAMAGE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    }
    if (rangeEl && !rangeEl.options.length) {
        rangeEl.innerHTML = RANGES.map(r => `<option value="${r}">${r}</option>`).join('');
    }
}

function populateWmCheckSelect(selectedCheck) {
    const el = document.getElementById('wm-check-stat-input');
    if (!el) return;
    const allChecks = [...state.checks.physical, ...state.checks.mental];
    el.innerHTML = `<option value="">— any —</option>` +
        allChecks.map(c => `<option value="${c.label}"${c.label === selectedCheck ? ' selected' : ''}>${c.label}</option>`).join('');
}

function rebuildWmCheckChips(checkLabel) {
    const chipsEl = document.getElementById('wm-check-chips');
    if (!chipsEl) return;
    const allChecks = [...state.checks.physical, ...state.checks.mental];
    const matched = checkLabel
        ? allChecks.filter(c => c.label.toLowerCase() === checkLabel.toLowerCase())
        : allChecks;
    const list = matched.length ? matched : allChecks;
    chipsEl.innerHTML = list.map((c, i) => {
        const total = c.mod + (c.bonus || 0) + (c.armorBonus || 0);
        return `<button class="drawer-check-chip${i === 0 ? ' is-sel' : ''}"
            type="button" data-check-mod="${total}" data-check-label="${c.label}">
            ${c.label} ${fmtSigned(total)}</button>`;
    }).join('');
    chipsEl.querySelectorAll('.drawer-check-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chipsEl.querySelectorAll('.drawer-check-chip').forEach(c => c.classList.remove('is-sel'));
            chip.classList.add('is-sel');
        });
    });
}

function saveWeaponToState() {
    if (weaponModalIndex < 0) return;
    const item = state.equipment[weaponModalIndex];
    if (!item) return;
    item.name        = document.getElementById('wm-name-input')?.value.trim()     || item.name;
    item.damage      = document.getElementById('wm-damage-input')?.value.trim()   || '';
    item.damageType  = document.getElementById('wm-dmg-type-input')?.value        || '';
    item.range       = document.getElementById('wm-range-input')?.value           || '';
    item.properties  = document.getElementById('wm-weight-input')?.value          || '—';
    item.check       = document.getElementById('wm-check-stat-input')?.value      || '';
    item.critRange   = parseInt(document.getElementById('wm-crit')?.value  || '20', 10);
    item.attackBonus = parseInt(document.getElementById('wm-bonus')?.value || '0',  10);
    weaponModalItem  = item;
    saveState();
    syncUI();
}

function openWeaponModal(itemIndex) {
    const raw = state.equipment[itemIndex];
    if (!raw) return;
    const w = parseWeaponData(raw);
    weaponModalItem  = w;
    weaponModalIndex = itemIndex;

    populateWmSelects();

    document.getElementById('wm-name-input').value            = w.name || '';
    document.getElementById('wm-damage-input').value          = w.damage || '';
    document.getElementById('wm-dmg-type-input').value        = w.damageType || '';
    document.getElementById('wm-range-input').value           = w.range || '';
    document.getElementById('wm-weight-input').value          = w.properties || '—';
    document.getElementById('wm-crit').value                  = w.critRange || 20;
    document.getElementById('wm-bonus').value                 = w.attackBonus || 0;

    const checkLabel = w.check ? w.check.split(',')[0].trim() : '';
    populateWmCheckSelect(checkLabel);
    rebuildWmCheckChips(checkLabel);

    document.querySelectorAll('#wm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
    document.querySelector('#wm-roll-seg [data-seg="flat"]')?.classList.add('is-sel');

    document.getElementById('weapon-modal').hidden = false;
}

function closeWeaponModal() {
    if (weaponModalIndex >= 0) saveWeaponToState();
    document.getElementById('weapon-modal').hidden = true;
    weaponModalItem = null;
    weaponModalIndex = -1;
}

function bindWeaponModal() {
    document.getElementById('wm-close')?.addEventListener('click', closeWeaponModal);
    document.getElementById('wm-scrim')?.addEventListener('click', closeWeaponModal);

    // Auto-save all edit inputs on change
    ['wm-name-input','wm-damage-input','wm-dmg-type-input','wm-range-input',
     'wm-weight-input','wm-crit','wm-bonus'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', saveWeaponToState);
    });

    // Check stat change → rebuild chips + save
    document.getElementById('wm-check-stat-input')?.addEventListener('change', function() {
        rebuildWmCheckChips(this.value);
        saveWeaponToState();
    });

    document.getElementById('wm-roll-seg')?.addEventListener('click', e => {
        const btn = e.target.closest('.roll-seg-btn');
        if (!btn) return;
        document.querySelectorAll('#wm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
        btn.classList.add('is-sel');
    });

    document.getElementById('wm-roll')?.addEventListener('click', () => {
        if (!weaponModalItem) return;
        const selChip = document.querySelector('#wm-check-chips .drawer-check-chip.is-sel');
        const checkMod = selChip ? parseInt(selChip.dataset.checkMod, 10) : 0;
        const checkLabel = selChip ? selChip.dataset.checkLabel : 'Check';
        const rollType = document.querySelector('#wm-roll-seg .roll-seg-btn.is-sel')?.dataset.seg || 'flat';
        const atkBonus = parseInt(document.getElementById('wm-bonus')?.value || '0', 10) || 0;

        const r = () => Math.floor(Math.random() * 20) + 1;
        let d20, rollNote;
        if (rollType === 'adv') { const a = r(), b = r(); d20 = Math.max(a, b); rollNote = `adv(${a},${b})`; }
        else if (rollType === 'dis') { const a = r(), b = r(); d20 = Math.min(a, b); rollNote = `dis(${a},${b})`; }
        else { d20 = r(); rollNote = `d20(${d20})`; }

        pushChatWeaponAttack({
            weapon: weaponModalItem,
            checkLabel,
            checkMod,
            attackBonus: atkBonus,
            rollNote,
            d20Total: d20 + checkMod + atkBonus,
            damageRoll: weaponModalItem.damage ? rollDiceNotation(weaponModalItem.damage) : null,
            rollType,
            conditions: [...state.activeConditions],
        });
        closeWeaponModal();
    });
}

function pushChatWeaponAttack({ weapon, checkLabel, checkMod, attackBonus, rollNote, d20Total, damageRoll, rollType, conditions }) {
    state.chat.unshift({
        type: 'weapon-attack',
        time: chatTimestamp(),
        charName: state.char.name || '',
        weaponName: weapon.name,
        checkLabel, checkMod, attackBonus,
        rollNote, d20Total,
        damageRoll,
        damage: weapon.damage,
        damageType: weapon.damageType,
        range: weapon.range,
        properties: weapon.properties && weapon.properties !== '—' ? weapon.properties : '',
        desc: weapon.flavor || '',
        rollType,
        conditions: [...(conditions || [])],
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
}

function renderWeaponAttackEntry(entry) {
    const nat = naturalRoll(entry.rollNote);
    const resClass = nat === 20 ? 'chat-res--nat20' : nat === 1 ? 'chat-res--nat1' : '';
    const typeLbl = entry.rollType === 'adv' ? '· Adv' : entry.rollType === 'dis' ? '· Dis' : '';
    const bonusTxt = entry.attackBonus ? ` ${fmtSigned(entry.attackBonus)}` : '';
    const condHtml = entry.conditions?.length
        ? `<div class="chat-roll-cond">${entry.conditions.join(' · ')}</div>` : '';

    const dmgHtml = entry.damageRoll ? `
        <div class="chat-dice-chip">
            <span class="chat-dice-notation">${entry.damageRoll.notation}</span>
            <span class="chat-dice-arrow">→</span>
            <span class="chat-dice-total">${entry.damageRoll.total}</span>
            ${entry.damageRoll.rolls.length > 1 ? `<span class="chat-dice-detail">[${entry.damageRoll.rolls.join('+')}]</span>` : ''}
        </div>
        <div class="chat-wep-meta">${[entry.damageType, entry.range].filter(Boolean).join(' · ')}</div>`
        : `<div class="chat-wep-meta">${[entry.damage, entry.damageType, entry.range].filter(Boolean).join(' · ')}</div>`;

    return `<div class="chat-roll-card chat-roll--weapon">
        <div class="chat-card-head">
            <span class="chat-card-title">⚔ ${entry.charName ? `${entry.charName} · ` : ''}${entry.weaponName}</span>
            <span class="chat-time">${entry.time}</span>
        </div>
        <div class="chat-wep-body">
            <div class="chat-wep-col">
                <div class="chat-attack-label">${entry.checkLabel}</div>
                <div class="chat-roll-result ${resClass}">${entry.d20Total}</div>
                <div class="chat-roll-breakdown">${entry.rollNote} ${fmtSigned(entry.checkMod)}${bonusTxt} ${typeLbl}</div>
            </div>
            <div class="chat-wep-col chat-wep-col--right">
                <div class="chat-attack-label">DAMAGE</div>
                ${dmgHtml}
            </div>
        </div>
        ${successHtml(entry.d20Total)}
        ${damageTableBtnHtml(entry.d20Total, entry.damageType)}
        ${entry.d20Total < 15 ? `<button class="provoke-btn" type="button"> Provoke!</button>` : ''}
        ${entry.desc ? `${expandableDesc(entry.desc)}` : ''}
        ${condHtml}
    </div>`;
}

// ── SPELLS PANEL ──────────────────────────────────────────────────────────────

async function loadSpells() {
    try {
        const res = await fetch(DATA_BASE + 'spells.json');
        spellsData = await res.json();
        renderSpellsPanel();
        renderSpellFilters();
    } catch (e) { console.warn('Could not load spells', e); }
}

function isFavorite(name) { return (state.char.favoriteSpells || []).includes(name); }
function toggleFavorite(name) {
    if (!state.char.favoriteSpells) state.char.favoriteSpells = [];
    const idx = state.char.favoriteSpells.indexOf(name);
    if (idx === -1) state.char.favoriteSpells.push(name);
    else state.char.favoriteSpells.splice(idx, 1);
    saveState();
}

function renderSpellFilters() {
    const el = document.getElementById('spell-filters');
    if (!el) return;
    const origins = ['All', ...new Set(spellsData.map(s => s.origin).filter(Boolean))].sort();
    el.innerHTML = `
        <div class="spell-filter-row">
            <button class="spell-filter-btn spell-filter-btn--fav${spellFilter === '⭐' ? ' is-active' : ''}"
                type="button" data-origin="⭐">⭐ Favs</button>
            ${origins.map(o =>
        `<button class="spell-filter-btn${o === spellFilter ? ' is-active' : ''}"
                    type="button" data-origin="${o}">${o}</button>`
    ).join('')}
        </div>
        <div class="spell-sort-row">
            <span class="spell-sort-label">Sort</span>
            <button class="spell-sort-btn${spellSort === 'name' ? ' is-active' : ''}" type="button" data-sort="name">A–Z</button>
            <button class="spell-sort-btn${spellSort === 'cost' ? ' is-active' : ''}" type="button" data-sort="cost">Cost</button>
            <button class="spell-sort-btn${spellSort === 'origin' ? ' is-active' : ''}" type="button" data-sort="origin">Origin</button>
        </div>`;
}

function castSpell(spell, intent, spendMana) {
    const cost = intent.cost || 0;
    const mnNow = state.resources.MN.current;
    const canAfford = mnNow >= cost;

    if (spendMana && cost > 0) {
        state.resources.MN.current = Math.max(0, mnNow - cost);
        syncUI();
        saveState();
    }

    const mnTag = cost === 0 ? 'Free'
        : !spendMana ? 'Without Mana'
            : canAfford ? `${cost} MN spent`
                : `⚠ ${cost} MN needed (${mnNow} available)`;

    const tags = [
        spell.transmission,
        intent.range ? `Range: ${intent.range}` : null,
        intent.duration ? `Duration: ${intent.duration}` : null,
        mnTag,
    ].filter(Boolean);

    pushChatFeature({
        name: `✨ ${spell.name} — ${intent.intent}`,
        tags,
        desc: intent.effect || '',
    });
}

function renderSpellCard(spell) {
    const fav = isFavorite(spell.name);
    const mnNow = state.resources.MN.current;
    const intents = (spell.effects || []).map(ef => {
        const hasDice = /\[\[/.test(ef.effect || '');
        const cost = ef.cost || 0;
        const canAfford = mnNow >= cost;
        const costTag = cost > 0
            ? `<span class="spell-cost${canAfford ? '' : ' spell-cost--low'}">${cost} MN</span>`
            : `<span class="spell-cost spell-cost--free">Free</span>`;

        return `<div class="spell-intent">
            <div class="spell-intent-head">
                <span class="spell-intent-name">${ef.intent}</span>
                <div class="spell-intent-tags">
                    ${costTag}
                    ${ef.range ? `<span class="step-tag">${ef.range}</span>` : ''}
                    ${ef.duration ? `<span class="step-tag">${ef.duration.trim()}</span>` : ''}
                </div>
                <button class="spell-cast-btn${canAfford || cost === 0 ? '' : ' spell-cast-btn--low'}"
                    type="button"
                    data-srm-spell="${esc(spell.name)}"
                    data-srm-intent="${esc(ef.intent)}">✨ Cast</button>
            </div>
            <p class="spell-intent-effect">${ef.effect || ''}</p>
        </div>`;
    }).join('');

    return `<div class="spell-card-row">
        <button class="spell-fav-btn${fav ? ' is-fav' : ''}" type="button"
            data-fav-spell="${esc(spell.name)}" title="${fav ? 'Unfavourite' : 'Favourite'}">${fav ? '★' : '☆'}</button>
        <details class="spell-card">
            <summary class="spell-card-head">
                <span class="spell-name">${spell.name}</span>
                <div class="spell-meta-tags">
                    ${spell.origin ? `<span class="equip-cat-badge">${spell.origin}</span>` : ''}
                    ${spell.transmission ? `<span class="equip-cat-badge">${spell.transmission}</span>` : ''}
                </div>
            </summary>
            <div class="spell-intents">${intents}</div>
        </details>
    </div>`;
}

function renderSpellsPanel() {
    const el = document.getElementById('spell-list');
    if (!el) return;
    const q = spellSearch.toLowerCase();
    const favs = state.char.favoriteSpells || [];

    let visible = spellsData.filter(s => {
        if (spellFilter === '⭐' && !favs.includes(s.name)) return false;
        if (spellFilter !== '⭐' && spellFilter !== 'All' && s.origin !== spellFilter) return false;
        if (q && !s.name.toLowerCase().includes(q) &&
            !(s.origin || '').toLowerCase().includes(q) &&
            !(s.effects || []).some(e => e.effect?.toLowerCase().includes(q))) return false;
        return true;
    });

    // Sort
    const minCost = s => Math.min(...(s.effects || [{ cost: 0 }]).map(e => e.cost || 0));
    if (spellSort === 'name') visible = [...visible].sort((a, b) => a.name.localeCompare(b.name));
    if (spellSort === 'cost') visible = [...visible].sort((a, b) => minCost(a) - minCost(b) || a.name.localeCompare(b.name));
    if (spellSort === 'origin') visible = [...visible].sort((a, b) => (a.origin || '').localeCompare(b.origin || '') || a.name.localeCompare(b.name));

    if (!visible.length) { el.innerHTML = '<p class="empty-hint">No spells found.</p>'; return; }

    if (spellSort === 'origin') {
        // Group by origin with headers
        const groups = {};
        visible.forEach(s => { const k = s.origin || 'Other'; (groups[k] = groups[k] || []).push(s); });
        el.innerHTML = Object.entries(groups).map(([origin, spells]) =>
            `<div class="spell-origin-header">${origin}</div>${spells.map(renderSpellCard).join('')}`
        ).join('');
    } else {
        el.innerHTML = visible.map(renderSpellCard).join('');
    }
}

function bindSpellsPanel() {
    document.getElementById('spell-search')?.addEventListener('input', e => {
        spellSearch = e.target.value.trim();
        renderSpellsPanel();
    });

    document.getElementById('spell-filters')?.addEventListener('click', e => {
        // Filter buttons
        const filterBtn = e.target.closest('.spell-filter-btn');
        if (filterBtn) {
            spellFilter = filterBtn.dataset.origin;
            renderSpellFilters();
            renderSpellsPanel();
            return;
        }
        // Sort buttons
        const sortBtn = e.target.closest('.spell-sort-btn');
        if (sortBtn) {
            spellSort = sortBtn.dataset.sort;
            renderSpellFilters();
            renderSpellsPanel();
        }
    });

    // Favourite toggle + spell cast modal delegation
    document.getElementById('panel-spells')?.addEventListener('click', e => {
        // Favourite star
        const favBtn = e.target.closest('[data-fav-spell]');
        if (favBtn) {
            const name = favBtn.dataset.favSpell;
            toggleFavorite(name);
            const fav = isFavorite(name);
            favBtn.textContent = fav ? '★' : '☆';
            favBtn.classList.toggle('is-fav', fav);
            favBtn.title = fav ? 'Unfavourite' : 'Favourite';
            if (spellFilter === '⭐') renderSpellsPanel();
            return;
        }

        // ✨ Cast button → open spell roll modal
        const castBtn = e.target.closest('[data-srm-spell][data-srm-intent]');
        if (castBtn) {
            const spell = spellsData.find(s => s.name === castBtn.dataset.srmSpell);
            const intent = spell?.effects?.find(ef => ef.intent === castBtn.dataset.srmIntent);
            if (spell && intent) openSpellRollModal(spell, intent);
        }
    });
}

// ── FEATURE ROLL MODAL ────────────────────────────────────────────────────────

const frm = { feature: null };

function openFeatureRollModal({ name, tags, desc }) {
    const checkTag = tags.find(t => t.startsWith('Check:'));
    const checkLabel = checkTag ? checkTag.replace('Check:', '').trim() : '';
    const displayTags = tags.filter(t => !t.startsWith('Check:') && !t.startsWith('Dmg:'));

    const dmgTag = tags.find(t => t.startsWith('Dmg:'));
    let damageNotation = '', damageType = '';
    if (dmgTag) {
        const dmgStr = dmgTag.slice(4).trim();
        const diceMatch = dmgStr.match(/(\d+d\d+[!]?(?:[+-]\d+)?)/i);
        if (diceMatch) damageNotation = diceMatch[1];
        damageType = DAMAGE_TYPES.find(t => dmgStr.toLowerCase().includes(t.toLowerCase())) || '';
    }
    if (!damageNotation) {
        const parsed = parseDiceFromText(desc);
        if (parsed.length) damageNotation = parsed[0].notation;
    }

    frm.feature = { name, tags, checkLabel, displayTags };

    document.getElementById('frm-name').textContent = name;
    document.getElementById('frm-tags-display').textContent = displayTags.join(' · ');

    const allChecksArr = [...state.checks.physical, ...state.checks.mental];
    const matched = checkLabel
        ? allChecksArr.filter(c => c.label.toLowerCase() === checkLabel.toLowerCase())
        : [];
    const toShow = matched.length ? matched : allChecksArr;
    document.getElementById('frm-check-chips').innerHTML = toShow.map((c, i) => {
        const total = c.mod + (c.bonus || 0) + (c.armorBonus || 0);
        return `<button class="drawer-check-chip${i === 0 ? ' is-sel' : ''}"
            type="button" data-check-mod="${total}" data-check-label="${c.label}">
            ${c.label} ${fmtSigned(total)}</button>`;
    }).join('');

    document.getElementById('frm-dmg-notation').value = damageNotation;
    document.getElementById('frm-dmg-type').value = damageType;
    document.getElementById('frm-desc-input').value = desc || '';
    document.getElementById('frm-bonus').value = 0;

    document.querySelectorAll('#frm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
    document.querySelector('#frm-roll-seg [data-seg="flat"]')?.classList.add('is-sel');
    // Pre-select Disadvantage if an active condition penalizes this check
    applyConditionRollType('#frm-roll-seg', '#frm-check-chips');

    // Hide the unused results area and send button — rolling goes straight to chat
    document.getElementById('frm-results').hidden = true;
    document.getElementById('frm-send').hidden = true;
    document.getElementById('frm-roll-dmg').hidden = !damageNotation;

    document.getElementById('feat-roll-modal').hidden = false;
}

function closeFeatureRollModal() {
    document.getElementById('feat-roll-modal').hidden = true;
    frm.feature = null;
}

function bindFeatureRollModal() {
    document.getElementById('frm-close')?.addEventListener('click', closeFeatureRollModal);
    document.getElementById('frm-scrim')?.addEventListener('click', closeFeatureRollModal);

    document.getElementById('frm-check-chips')?.addEventListener('click', e => {
        const chip = e.target.closest('.drawer-check-chip');
        if (!chip) return;
        document.querySelectorAll('#frm-check-chips .drawer-check-chip').forEach(c => c.classList.remove('is-sel'));
        chip.classList.add('is-sel');
        applyConditionRollType('#frm-roll-seg', '#frm-check-chips');
    });

    document.getElementById('frm-roll-seg')?.addEventListener('click', e => {
        const btn = e.target.closest('.roll-seg-btn');
        if (!btn) return;
        document.querySelectorAll('#frm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
        btn.classList.add('is-sel');
    });

    document.getElementById('frm-dmg-notation')?.addEventListener('input', () => {
        document.getElementById('frm-roll-dmg').hidden =
            !document.getElementById('frm-dmg-notation').value.trim();
    });

    // Roll Check → roll dice, build chat entry, go to chat, close
    document.getElementById('frm-roll-check')?.addEventListener('click', () => {
        if (!frm.feature) return;
        const selChip = document.querySelector('#frm-check-chips .drawer-check-chip.is-sel');
        const checkMod = selChip ? parseInt(selChip.dataset.checkMod, 10) : 0;
        const checkLbl = selChip ? selChip.dataset.checkLabel : 'Check';
        const rollType = document.querySelector('#frm-roll-seg .roll-seg-btn.is-sel')?.dataset.seg || 'flat';
        const bonus = parseInt(document.getElementById('frm-bonus')?.value || '0', 10) || 0;
        const notation = document.getElementById('frm-dmg-notation')?.value?.trim() || '';
        const dmgType = document.getElementById('frm-dmg-type')?.value?.trim() || '';
        const desc = document.getElementById('frm-desc-input')?.value?.trim() || '';

        const r = () => Math.floor(Math.random() * 20) + 1;
        let d20, rollNote;
        if (rollType === 'adv') { const a = r(), b = r(); d20 = Math.max(a, b); rollNote = `adv(${a},${b})`; }
        else if (rollType === 'dis') { const a = r(), b = r(); d20 = Math.min(a, b); rollNote = `dis(${a},${b})`; }
        else { d20 = r(); rollNote = `d20(${d20})`; }

        const total = d20 + checkMod + bonus;
        const diceRolls = notation ? [rollDiceNotation(notation)] : [];
        const allTags = [
            ...frm.feature.displayTags,
            `Check: ${checkLbl}`,
            notation ? `Dmg: ${notation}${dmgType ? ` (${dmgType})` : ''}` : null,
        ].filter(Boolean);

        state.chat.unshift({
            type: 'roll', time: chatTimestamp(),
            charName: state.char.name || '',
            label: checkLbl, total, rollNote,
            mod: checkMod + bonus, rollType,
            conditions: [...state.activeConditions],
            featureContext: { name: frm.feature.name, tags: allTags, desc, diceRolls },
        });
        if (state.chat.length > 100) state.chat.length = 100;
        saveState();
        setActivePanel('chat');
        closeFeatureRollModal();
    });

    // Roll Dmg standalone (in case there's no check — roll damage only to chat)
    document.getElementById('frm-roll-dmg')?.addEventListener('click', () => {
        if (!frm.feature) return;
        const notation = document.getElementById('frm-dmg-notation')?.value?.trim();
        if (!notation) return;
        const dmgType = document.getElementById('frm-dmg-type')?.value?.trim() || '';
        const desc = document.getElementById('frm-desc-input')?.value?.trim() || '';
        const dmg = rollDiceNotation(notation);
        dmg.type = dmgType;

        const allTags = [
            ...frm.feature.displayTags,
            `Dmg: ${notation}${dmgType ? ` (${dmgType})` : ''}`,
        ];

        state.chat.unshift({
            type: 'feature', time: chatTimestamp(),
            charName: state.char.name || '',
            name: frm.feature.name,
            tags: allTags, desc,
            diceRolls: [dmg],
        });
        if (state.chat.length > 100) state.chat.length = 100;
        saveState();
        setActivePanel('chat');
        closeFeatureRollModal();
    });
}

// ── REFERENCE PANEL ───────────────────────────────────────────────────────────

const REF_ACTIONS = [
    { group: 'Actions' },
    { name: 'Attack', desc: 'Make a melee or ranged attack against a creature or object within range.' },
    { name: 'Stealth', desc: 'Make a Stealth check. On success, you are unseen and your next attack has Advantage. Attacking, casting, or revealing yourself ends Stealth unless a feature says otherwise.' },
    { name: 'Dash', desc: 'Use your action to move again after moving, doubling your distance this turn.' },
    { name: 'Cast a Spell', desc: 'Requires sound, movement, and a Spellcasting check (usually Spirit). Spend the listed Mana cost.' },
    { name: 'Grab or Hold', desc: 'Make an opposed Strength check to impose the Pinned condition.' },
    { name: 'Administer Potion', desc: 'Give a potion to a downed ally. Drinking one yourself is a Half-Action.' },
    { group: 'Half-Actions' },
    { name: 'Disarm', desc: 'Make an opposed Strength or Agility check to disarm a creature.' },
    { name: 'Help', desc: 'Give a creature +1 to their next check this turn.' },
    { name: 'Pick Up Item', desc: 'Pick up a dropped or nearby item.' },
    { name: 'Use an Object', desc: 'Interact with levers, buttons, or similar objects.' },
    { name: 'Disengage', desc: 'Move out of a creature\'s range without provoking opportunity attacks.' },
    { name: 'Unarmed Strike', desc: 'Deals 1 BPorS damage. Can also be taken as an Off-Action.' },
    { group: 'Stances (Half-Action)' },
    { name: 'Advantage Stance', desc: 'Gain Advantage on your next attack.' },
    { name: 'Disadvantage Stance', desc: 'Give Disadvantage to enemies attacking you or allies in range.' },
    { name: 'Offensive Stance', desc: 'Use your Off-Action to Provoke.' },
    { name: 'Reaction Stance', desc: 'React to failed attacks against you.' },
    { name: 'Guard Stance', desc: 'When attacked, Provoke once without using an Off-Action. On all failed attacks, may Provoke at Disadvantage.' },
    { group: 'Off-Actions' },
    { name: 'Provoke', desc: 'Attack creatures leaving your melee range without disengaging, when they fail a check against you, or per a specific ability.' },
    { name: 'Drink', desc: 'Drink or hand off a potion.' },
    { name: 'Disrupt', desc: 'Impose Disadvantage on an enemy\'s attack with a successful check.' },
    { name: 'Block', desc: 'Reduce incoming melee damage by half using a shield.' },
    { name: 'Demoralize', desc: 'Force enemies to make a morale check with an Influence (Intimidate) roll.' },
    { group: 'Non-Actions' },
    { name: 'Switch Weapons', desc: 'Drop a weapon and draw another without spending action economy.' },
    { name: 'Stress Push', desc: 'Take 4 stress damage to gain a +3 bonus on a low roll.' },
    { name: 'Roleplay', desc: 'Briefly communicate or give orders without consequence.' },
    { group: 'Special' },
    { name: 'Called Shot', desc: 'Declare before attacking. Accept a −10 to hit. On success, inflict a condition (Bleeding, Broken, Blind, etc.) instead of normal damage.' },
    { name: 'Finisher', desc: 'Instantly eliminate a helpless, sleeping, or completely unaware target. Cannot be used on an active or aware opponent.' },
    { name: 'Surprise Turn', desc: 'Attacking from Stealth grants one extra action. Reveals your position unless an ability says otherwise.' },
];

function renderRefTables() {
    const grid = document.getElementById('ref-tables-grid');
    if (!grid || !damageData) return;
    grid.innerHTML = Object.entries(damageData).map(([type, table]) => {
        const rows = (table.entries || []).map((e, i) =>
            `<div class="ref-table-row">
                <span class="ref-table-num">${i + 1}</span>
                <span class="ref-table-entry">${e}</span>
            </div>`).join('');
        return `<details class="ref-table-card">
            <summary class="ref-table-head">
                <span class="ref-table-title">${table.icon || ''} ${type}</span>
                <button class="spell-cast-btn ref-roll-inline" type="button"
                    data-roll-table="${type}">⚄ Roll</button>
                <span class="equip-cat-badge">${table.category}</span>
            </summary>
            <div class="ref-table-entries">${rows}</div>
        </details>`;
    }).join('');
}

function renderRefConditions() {
    const el = document.getElementById('ref-conditions-list');
    if (!el) return;
    el.innerHTML = Object.entries(CONDITION_GROUPS).map(([group, names]) => `
        <div class="spell-origin-header">${group}</div>
        ${names.map(name => `
            <div class="ref-condition-row">
                <span class="ref-condition-name">${name}</span>
                <span class="ref-condition-effect">${CONDITION_EFFECTS[name] || ''}</span>
            </div>`).join('')}
    `).join('');
}

function renderRefActions() {
    const el = document.getElementById('ref-actions-list');
    if (!el) return;
    el.innerHTML = REF_ACTIONS.map(a => {
        if (a.group) return `<div class="spell-origin-header">${a.group}</div>`;
        return `<div class="ref-action-card">
            <div class="ref-action-head">
                <span class="ref-action-name">${a.name}</span>
                <button class="step-action-btn" type="button" data-action="chat"
                    data-name="${esc(a.name)}" data-desc="${esc(a.desc)}" data-check=""><img src="../assets/icons/chat.png" class="btn-icon" alt="chat"></button>
            </div>
            <div class="ref-action-desc">${a.desc}</div>
        </div>`;
    }).join('');
}

function renderRefPanel() {
    renderRefTables();
    renderRefConditions();
    renderRefActions();
}

function bindRefPanel() {
    // Sub-tab switching
    document.querySelector('.ref-tab-row')?.addEventListener('click', e => {
        const tab = e.target.closest('.ref-tab');
        if (!tab) return;
        const target = tab.dataset.refTab;
        document.querySelectorAll('.ref-tab').forEach(t => t.classList.toggle('is-active', t === tab));
        document.querySelectorAll('.ref-tab-content').forEach(c =>
            c.classList.toggle('is-active', c.id === `ref-tab-${target}`));
    });

    // Quick roll
    document.getElementById('ref-quick-roll-btn')?.addEventListener('click', () => {
        const type = document.getElementById('ref-dmg-type-sel')?.value;
        if (!type) return;
        rollAndShowRefTable(type, 'ref-quick-result');
    });

    // Per-card roll buttons (prevent details toggle)
    document.getElementById('ref-tables-grid')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-roll-table]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        rollDamageTable(btn.dataset.rollTable);
        setActivePanel('chat');
    });
}

function rollAndShowRefTable(type, resultElId) {
    const table = damageData[type];
    if (!table) return;
    const roll = Math.ceil(Math.random() * 6);
    const result = table.entries[roll - 1] || '—';

    const el = document.getElementById(resultElId);
    if (el) {
        el.hidden = false;
        el.innerHTML = `<div class="ref-quick-res-inner">
            <span class="ref-quick-num">d6 → ${roll}</span>
            <span class="ref-quick-entry">${table.icon || ''} ${type}: <strong>${result}</strong></span>
            <button class="ghost-btn" style="margin-top:6px" data-post-result="${type}|${roll}|${result}" type="button">→ Chat</button>
        </div>`;

        el.querySelector('[data-post-result]')?.addEventListener('click', () => {
            rollDamageTable(type);
        });
    }
}

// ── SPELL ROLL MODAL ──────────────────────────────────────────────────────────

// Returns check options for spell casting:
// [primary spellcasting stat (if any), Spirit (always)]
// Spirit is deduplicated if it IS the spellcasting stat.
function getSpellcastingChecks() {
    const allChecks = [...state.checks.physical, ...state.checks.mental];
    const spirit = allChecks.find(c => c.key === 'spi');
    const primaryKey = getSpellcastingStat();
    if (!primaryKey || primaryKey === 'spi') return spirit ? [spirit] : [];
    const primary = allChecks.find(c => c.key === primaryKey);
    return [primary, spirit].filter(Boolean);
}

const sfrm = { spell: null, intent: null };

function openSpellRollModal(spell, intent) {
    sfrm.spell = spell;
    sfrm.intent = intent;

    const cost = intent.cost || 0;
    const mnNow = state.resources.MN.current;

    // Header
    document.getElementById('srm-name').textContent = `✨ ${spell.name} — ${intent.intent}`;
    document.getElementById('srm-sub').textContent =
        [spell.manner, spell.transmission, spell.origin,
        cost > 0 ? `${cost} MN` : 'Free'].filter(Boolean).join(' · ');

    // Check chips: primary spellcasting stat + Spirit fallback
    const checks = getSpellcastingChecks();
    document.getElementById('srm-check-chips').innerHTML = checks.length
        ? checks.map((c, i) => {
            const total = c.mod + (c.bonus || 0) + (c.armorBonus || 0);
            return `<button class="drawer-check-chip${i === 0 ? ' is-sel' : ''}"
                type="button" data-check-mod="${total}" data-check-label="${c.label}">
                ${c.label} ${fmtSigned(total)}</button>`;
        }).join('')
        : `<span style="font-size:12px;color:var(--muted)">No check available</span>`;

    // Stat row
    const diceMatch = (intent.effect || '').match(/\[\[(\d+d\d+[!]?(?:[+-]\d+)?)\]\]/i);
    document.getElementById('srm-damage').textContent = diceMatch ? diceMatch[1] : '—';
    document.getElementById('srm-dmg-type').textContent = spell.transmission || '—';
    document.getElementById('srm-range').textContent = intent.range || '—';
    document.getElementById('srm-duration').textContent = (intent.duration || '—').trim();

    // Description
    const descEl = document.getElementById('srm-desc');
    descEl.textContent = intent.effect || '';
    descEl.style.display = intent.effect ? '' : 'none';

    // Roll type reset + condition pre-selection
    document.querySelectorAll('#srm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
    document.querySelector('#srm-roll-seg [data-seg="flat"]')?.classList.add('is-sel');
    document.getElementById('srm-bonus').value = 0;
    if (checks.length) applyConditionRollType('#srm-roll-seg', '#srm-check-chips');

    // Button labels + mana warning
    const canAfford = mnNow >= cost;
    document.getElementById('srm-roll-mana').textContent =
        cost > 0 ? `Roll + Spend ${cost} MN${canAfford ? '' : ' ⚠'}` : 'Roll (Free)';
    const warnEl = document.getElementById('srm-mana-warn');
    if (warnEl) {
        warnEl.textContent = cost === 0
            ? ''
            : !canAfford
                ? `⚠ You have ${mnNow} MN — need ${cost}`
                : '';
        warnEl.hidden = !(!canAfford && cost > 0);
    }

    document.getElementById('spell-roll-modal').hidden = false;
}

function closeSpellRollModal() {
    document.getElementById('spell-roll-modal').hidden = true;
    sfrm.spell = sfrm.intent = null;
}

function srmDoRoll(spendMana) {
    if (!sfrm.spell || !sfrm.intent) return;

    const selChip = document.querySelector('#srm-check-chips .drawer-check-chip.is-sel');
    const checkMod = selChip ? parseInt(selChip.dataset.checkMod, 10) : 0;
    const checkLbl = selChip ? selChip.dataset.checkLabel : 'Spirit';
    const rollType = document.querySelector('#srm-roll-seg .roll-seg-btn.is-sel')?.dataset.seg || 'flat';
    const bonus = parseInt(document.getElementById('srm-bonus')?.value || '0', 10) || 0;
    const cost = sfrm.intent.cost || 0;
    const mnNow = state.resources.MN.current;

    const r = () => Math.floor(Math.random() * 20) + 1;
    let d20, rollNote;
    if (rollType === 'adv') { const a = r(), b = r(); d20 = Math.max(a, b); rollNote = `adv(${a},${b})`; }
    else if (rollType === 'dis') { const a = r(), b = r(); d20 = Math.min(a, b); rollNote = `dis(${a},${b})`; }
    else { d20 = r(); rollNote = `d20(${d20})`; }

    const total = d20 + checkMod + bonus;

    if (spendMana && cost > 0) {
        state.resources.MN.current = Math.max(0, mnNow - cost);
        syncUI();
    }

    const mnTag = cost === 0 ? 'Free'
        : !spendMana ? 'Without Mana'
            : mnNow >= cost ? `${cost} MN spent`
                : `⚠ ${cost} MN (only ${mnNow} available)`;

    const diceMatch = (sfrm.intent.effect || '').match(/\[\[(\d+d\d+[!]?(?:[+-]\d+)?)\]\]/i);
    const diceRolls = diceMatch ? [rollDiceNotation(diceMatch[1])] : [];

    const allTags = [
        sfrm.spell.manner,
        sfrm.spell.transmission,
        sfrm.spell.origin,
        `Check: ${checkLbl}`,
        sfrm.intent.range ? `Range: ${sfrm.intent.range}` : null,
        sfrm.intent.duration ? `Duration: ${sfrm.intent.duration.trim()}` : null,
        mnTag,
    ].filter(Boolean);

    state.chat.unshift({
        type: 'roll', time: chatTimestamp(),
        charName: state.char.name || '',
        label: checkLbl, total, rollNote,
        mod: checkMod + bonus, rollType,
        conditions: [...state.activeConditions],
        featureContext: {
            name: `✨ ${sfrm.spell.name} — ${sfrm.intent.intent}`,
            tags: allTags,
            desc: sfrm.intent.effect || '',
            diceRolls,
        },
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
    closeSpellRollModal();
}

function bindSpellRollModal() {
    document.getElementById('srm-close')?.addEventListener('click', closeSpellRollModal);
    document.getElementById('srm-scrim')?.addEventListener('click', closeSpellRollModal);

    document.getElementById('srm-check-chips')?.addEventListener('click', e => {
        const chip = e.target.closest('.drawer-check-chip');
        if (!chip) return;
        document.querySelectorAll('#srm-check-chips .drawer-check-chip').forEach(c => c.classList.remove('is-sel'));
        chip.classList.add('is-sel');
        applyConditionRollType('#srm-roll-seg', '#srm-check-chips');
    });

    document.getElementById('srm-roll-seg')?.addEventListener('click', e => {
        const btn = e.target.closest('.roll-seg-btn');
        if (!btn) return;
        document.querySelectorAll('#srm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
        btn.classList.add('is-sel');
    });

    document.getElementById('srm-roll-mana')?.addEventListener('click', () => srmDoRoll(true));
    document.getElementById('srm-roll-free')?.addEventListener('click', () => srmDoRoll(false));
}

// ── SETTINGS & THEME ──────────────────────────────────────────────────────────

const DEFAULT_A1 = '#6b9cc8';
const DEFAULT_A2 = '#c4622d';

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function hexToHue(hex) {
    if (!hex || hex.length < 7) return 0;
    const { r, g, b } = hexToRgb(hex);
    const r1 = r/255, g1 = g/255, b1 = b/255;
    const max = Math.max(r1,g1,b1), min = Math.min(r1,g1,b1), d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === r1)      h = ((g1 - b1) / d + 6) % 6;
    else if (max === g1) h = (b1 - r1)  / d + 2;
    else                 h = (r1 - g1)  / d + 4;
    return Math.round(h * 60);
}

function hexToSL(hex) {
    if (!hex || hex.length < 7) return { s: 65, l: 60 };
    const { r, g, b } = hexToRgb(hex);
    const r1 = r/255, g1 = g/255, b1 = b/255;
    const max = Math.max(r1,g1,b1), min = Math.min(r1,g1,b1);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));
    return { s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s = 65, l = 60) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function applyTheme() {
    const t  = state.char.theme || {};
    const a1 = t.a1 || t.accent || DEFAULT_A1;
    const a2 = t.a2 || DEFAULT_A2;
    const c1 = hexToRgb(a1), c2 = hexToRgb(a2);
    const root = document.documentElement;
    root.style.setProperty('--accent',      a1);
    root.style.setProperty('--accent-dim',  `rgba(${c1.r},${c1.g},${c1.b},0.18)`);
    root.style.setProperty('--accent-mid',  `rgba(${c1.r},${c1.g},${c1.b},0.38)`);
    root.style.setProperty('--accent2',     a2);
    root.style.setProperty('--accent2-dim', `rgba(${c2.r},${c2.g},${c2.b},0.18)`);
    root.style.setProperty('--accent2-mid', `rgba(${c2.r},${c2.g},${c2.b},0.38)`);
}

function buildThemeSliders(a1, a2) {
    const sl1 = hexToSL(a1), sl2 = hexToSL(a2);
    const row = (key, hex, sl) => `
        <div class="theme-slider-row">
            <span class="theme-slider-label">H</span>
            <input type="range" class="hue-slider" id="hue-${key}" min="0" max="359" value="${hexToHue(hex)}" />
        </div>
        <div class="theme-slider-row">
            <span class="theme-slider-label">S</span>
            <input type="range" class="hue-slider" id="sat-${key}" min="0" max="100" value="${sl.s}" />
        </div>
        <div class="theme-slider-row">
            <span class="theme-slider-label">L</span>
            <input type="range" class="hue-slider" id="lit-${key}" min="0" max="100" value="${sl.l}" />
            <span class="hue-preview" id="prev-${key}" style="background:${hex}"></span>
        </div>`;
    return `
        <div class="wm-label" style="margin-bottom:6px">Primary</div>
        ${row('a1', a1, sl1)}
        <div class="wm-label" style="margin:12px 0 6px">Secondary</div>
        ${row('a2', a2, sl2)}`;
}

function wireThemeSliders(getA1, getA2, onSave) {
    function updateColor(key) {
        const h = parseInt(document.getElementById(`hue-${key}`)?.value || '210', 10);
        const s = parseInt(document.getElementById(`sat-${key}`)?.value || '65', 10);
        const l = parseInt(document.getElementById(`lit-${key}`)?.value || '60', 10);
        const hex = hslToHex(h, s, l);
        const prev = document.getElementById(`prev-${key}`);
        if (prev) prev.style.background = hex;
        onSave(key === 'a1' ? hex : getA1(), key === 'a2' ? hex : getA2());
    }
    ['a1', 'a2'].forEach(key => {
        ['hue','sat','lit'].forEach(prefix => {
            document.getElementById(`${prefix}-${key}`)?.addEventListener('input', () => updateColor(key));
        });
    });
}

function openSettings() {
    const container = document.getElementById('theme-swatches');
    if (container) {
        const t  = state.char.theme || {};
        const a1 = t.a1 || t.accent || DEFAULT_A1;
        const a2 = t.a2 || DEFAULT_A2;
        container.innerHTML = buildThemeSliders(a1, a2);
        wireThemeSliders(
            () => state.char.theme?.a1 || DEFAULT_A1,
            () => state.char.theme?.a2 || DEFAULT_A2,
            (na1, na2) => setTheme(na1, na2)
        );
    }
    document.getElementById('reset-confirm').hidden = true;
    document.getElementById('btn-reset-char').hidden = false;
    document.getElementById('settings-modal').hidden = false;
}

function closeSettings() {
    document.getElementById('settings-modal').hidden = true;
}

function setTheme(a1, a2) {
    if (!state.char.theme) state.char.theme = {};
    state.char.theme.a1 = a1;
    state.char.theme.a2 = a2;
    applyTheme();
    saveState();
}

function bindSettings() {
    document.getElementById('btn-settings')?.addEventListener('click', openSettings);
    document.getElementById('settings-close')?.addEventListener('click', closeSettings);
    document.getElementById('settings-scrim')?.addEventListener('click', closeSettings);

    document.getElementById('btn-export-settings')?.addEventListener('click', () => {
        closeSettings();
        document.getElementById('btn-export')?.click();
    });

    document.getElementById('btn-reset-char')?.addEventListener('click', () => {
        document.getElementById('reset-confirm').hidden = false;
        document.getElementById('btn-reset-char').hidden = true;
    });

    document.getElementById('btn-reset-cancel')?.addEventListener('click', () => {
        document.getElementById('reset-confirm').hidden = true;
        document.getElementById('btn-reset-char').hidden = false;
    });

    document.getElementById('btn-reset-confirm')?.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    });
}

// ── SPECIES DATA & PICKER ─────────────────────────────────────────────────────

let allSpeciesData = [];

async function loadSpeciesData() {
    if (allSpeciesData.length) return;
    try {
        const res = await fetch(DATA_BASE + 'species_new.json');
        const json = await res.json();
        allSpeciesData = json?.species || [];
    } catch (e) { console.warn('Could not load species data', e); }
}

// Picker internal state
const sp = { level: 'lineage', lineage: '', option: '', selName: '', selObj: null };

function spShowLevel(level) {
    ['lineage', 'option', 'species'].forEach(l =>
        document.getElementById(`sp-lv-${l}`).hidden = l !== level
    );
    sp.level = level;
    const backBtn = document.getElementById('sp-back');
    const titleEl = document.getElementById('sp-title');
    const confirm_ = document.getElementById('sp-confirm');
    backBtn.hidden = level === 'lineage';
    titleEl.textContent =
        level === 'lineage' ? 'Choose Lineage' :
            level === 'option' ? sp.lineage :
                sp.option || sp.lineage;
    confirm_.disabled = !sp.selObj;
}

function spBuildLineageGrid() {
    const lineages = [...new Set(allSpeciesData.map(s => s.lineage))].sort();
    document.getElementById('sp-lineage-grid').innerHTML = lineages.map(l => {
        const count = allSpeciesData.filter(s => s.lineage === l).length;
        const options = [...new Set(allSpeciesData.filter(s => s.lineage === l).map(s => s.option))];
        const sub = options.length > 1 ? `${options.length} types` : (options[0] || '');
        return `<button class="sp-card${l === sp.lineage ? ' is-sel' : ''}"
                    type="button" data-sp-lineage="${l}">
                    <div class="sp-card-name">${l}</div>
                    <div class="sp-card-meta">${sub} · ${count} species</div>
                </button>`;
    }).join('');
}

function spEnterLineage(lineage) {
    sp.lineage = lineage;
    sp.option = '';
    document.querySelectorAll('[data-sp-lineage]').forEach(c =>
        c.classList.toggle('is-sel', c.dataset.spLineage === lineage));
    const options = [...new Set(allSpeciesData.filter(s => s.lineage === lineage).map(s => s.option))].sort();
    if (options.length > 1) {
        document.getElementById('sp-option-grid').innerHTML = options.map(o => {
            const count = allSpeciesData.filter(s => s.lineage === lineage && s.option === o).length;
            return `<button class="sp-card${o === sp.option ? ' is-sel' : ''}"
                        type="button" data-sp-option="${o}">
                        <div class="sp-card-name">${o}</div>
                        <div class="sp-card-meta">${count} species</div>
                    </button>`;
        }).join('');
        spShowLevel('option');
    } else {
        sp.option = options[0] || '';
        spBuildSpeciesGrid();
        spShowLevel('species');
    }
}

function spEnterOption(option) {
    sp.option = option;
    document.querySelectorAll('[data-sp-option]').forEach(c =>
        c.classList.toggle('is-sel', c.dataset.spOption === option));
    spBuildSpeciesGrid();
    spShowLevel('species');
}

function spBuildSpeciesGrid() {
    const visible = allSpeciesData.filter(s =>
        s.lineage === sp.lineage && (!sp.option || s.option === sp.option));
    document.getElementById('sp-species-grid').innerHTML = visible.map(s => `
        <button class="sp-species-card${s.name === sp.selName ? ' is-sel' : ''}"
                type="button" data-sp-species="${s.name}">
            <div class="sp-species-head">
                <span class="sp-species-name">${titleCase(s.name)}</span>
                <span class="sp-species-rarity">${s.rarity || ''}</span>
            </div>
            ${s.feature_name ? `<div class="sp-species-trait">${s.feature_name}</div>` : ''}
        </button>`).join('');
    spRenderDetail();
}

function spRenderDetail() {
    const el = document.getElementById('sp-species-detail');
    const s = sp.selObj;
    if (!el) return;
    if (!s) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `
        <div class="sp-detail-name">${titleCase(s.name)}</div>
        <p class="sp-detail-desc">${s.description.slice(0, 200)}…</p>
        <div class="sp-detail-facts">
            ${s.size ? `<span>Size: ${s.size}</span>` : ''}
            ${s.diet ? `<span>Diet: ${s.diet}</span>` : ''}
            ${s.language ? `<span>Language: ${s.language}</span>` : ''}
        </div>
        ${s.feature_name ? `<div class="sp-detail-feat">
            <span class="sp-feat-action">${s.fetAction || 'Passive'}</span>
            <strong>${s.feature_name}</strong>
            <p>${s.feature_effect}</p>
        </div>` : ''}
        ${s['sub-fet-name'] ? `<div class="sp-detail-feat sp-detail-feat--sub">
            <strong>${s['sub-fet-name']}</strong>
            <p>${s['sub-fet-effect']}</p>
        </div>` : ''}`;
}

function openSpeciesPicker() {
    loadSpeciesData().then(() => {
        sp.lineage = ''; sp.option = ''; sp.selName = ''; sp.selObj = null;
        spBuildLineageGrid();
        spShowLevel('lineage');
        document.getElementById('sp-confirm').disabled = true;
        const overlay = document.getElementById('species-picker');
        overlay.hidden = false;
    });
}

function closeSpeciesPicker() {
    document.getElementById('species-picker').hidden = true;
}

function applySpeciesSelection() {
    const s = sp.selObj;
    if (!s) return;
    state.char.species = s.name;
    state.char.speciesLineage = s.lineage || '';
    state.char.size = s.size || state.char.size;
    state.char.diet = s.diet || state.char.diet;
    state.char.language = s.language || state.char.language;
    state.char.speciesFeature = s.feature_name ? {
        name: s.feature_name,
        effect: s.feature_effect || '',
        action: s.fetAction || 'Passive',
        check: s.fetCheck || '',
    } : null;
    state.char.speciesSubFeature = s['sub-fet-name'] ? {
        name: s['sub-fet-name'],
        effect: s['sub-fet-effect'] || '',
    } : null;
    saveState();
    syncSpeciesDisplay();
    syncBioInputs();
    renderSpeciesView();
    closeSpeciesPicker();
}

function syncSpeciesDisplay() {
    const nameEl = document.getElementById('bio-species-name');
    const subEl = document.getElementById('bio-species-sub');
    if (nameEl) nameEl.textContent = titleCase(state.char.species) || '—';
    if (subEl) {
        const parts = [state.char.speciesLineage, state.char.size].filter(Boolean);
        subEl.textContent = parts.join(' · ');
    }
}

function bindSpeciesPicker() {
    document.getElementById('btn-species-edit')?.addEventListener('click', openSpeciesPicker);
    document.getElementById('sp-close')?.addEventListener('click', closeSpeciesPicker);
    document.getElementById('sp-scrim')?.addEventListener('click', closeSpeciesPicker);

    document.getElementById('sp-back')?.addEventListener('click', () => {
        const options = [...new Set(allSpeciesData.filter(s => s.lineage === sp.lineage).map(s => s.option))];
        spShowLevel(options.length > 1 && sp.level === 'species' ? 'option' : 'lineage');
    });

    document.getElementById('sp-lineage-grid')?.addEventListener('click', e => {
        const card = e.target.closest('[data-sp-lineage]');
        if (card) spEnterLineage(card.dataset.spLineage);
    });
    document.getElementById('sp-option-grid')?.addEventListener('click', e => {
        const card = e.target.closest('[data-sp-option]');
        if (card) spEnterOption(card.dataset.spOption);
    });
    document.getElementById('sp-species-grid')?.addEventListener('click', e => {
        const card = e.target.closest('[data-sp-species]');
        if (!card) return;
        sp.selName = card.dataset.spSpecies;
        sp.selObj = allSpeciesData.find(s => s.name === sp.selName) || null;
        document.querySelectorAll('.sp-species-card').forEach(c =>
            c.classList.toggle('is-sel', c.dataset.spSpecies === sp.selName));
        spRenderDetail();
        document.getElementById('sp-confirm').disabled = false;
    });

    document.getElementById('sp-confirm')?.addEventListener('click', applySpeciesSelection);
}

// ── FEATURES PANEL TABS ───────────────────────────────────────────────────────

function bindFeatTabs() {
    document.querySelectorAll('.feat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.featTab;
            document.querySelectorAll('.feat-tab').forEach(t =>
                t.classList.toggle('is-active', t.dataset.featTab === target));
            document.querySelectorAll('.feat-tab-content').forEach(c =>
                c.classList.toggle('is-active', c.id === `feat-tab-${target}`));
            if (target === 'class') renderSpeciesView();
        });
    });

}

// ── SPECIES VIEW ──────────────────────────────────────────────────────────────

function renderSpeciesView() {
    const el = document.getElementById('species-view');
    if (!el) return;
    if (!state.char.species) {
        el.innerHTML = '<p class="empty-hint">Species features appear here after character creation.</p>';
        return;
    }
    const sf = state.char.speciesFeature;
    const ssf = state.char.speciesSubFeature;
    el.innerHTML = `
        <div class="species-display-head">
            <span class="species-display-name">${titleCase(state.char.species)}</span>
            <span class="species-display-meta">${[state.char.speciesLineage, state.char.size].filter(Boolean).join(' · ')}</span>
        </div>
        ${sf ? renderStepCard({ name: sf.name, description: sf.effect, action: sf.action, check: sf.check }) : ''}
        ${ssf ? renderStepCard({ name: ssf.name, description: ssf.effect, action: 'Passive' }) : ''}`;
}

// ── CLASS VIEW (Features panel) ───────────────────────────────────────────────

const sectionCollapsed = {};

function renderClassView() {
    const el = document.getElementById('class-view');
    if (!el) return;
    if (!state.char.classKey) {
        el.innerHTML = '<p class="empty-hint">Tap ⚙ to select your class, path & talent</p>';
        return;
    }
    const base = classBaseData.find(c => c.name === state.char.classKey) || {};
    const entries = getClassEntries(state.char.classKey);
    const pathEntry = state.char.pathName ? entries.find(e => e.name === state.char.pathName) : null;
    const talentEntry = state.char.talentName ? entries.find(e => e.name === state.char.talentName) : null;

    const pathInit = pathEntry?.path?.steps?.filter(s => Number(s.step) === 0) || [];
    const talentInit = talentEntry?.talent?.steps?.filter(s => Number(s.step) === 0) || [];

    // Progression non-zero steps — unlocked ones appear under their own section
    const pathProgSteps = pathEntry?.path?.steps?.filter(s => Number(s.step) !== 0) || [];
    const talentProgSteps = talentEntry?.talent?.steps?.filter(s => Number(s.step) !== 0) || [];

    function sectionBlock(key, label, cardsHtml) {
        if (!cardsHtml.trim()) return '';
        const collapsed = sectionCollapsed[key];
        return `<div class="step-group-label" data-section-toggle="${key}">
            <span>${label}</span><span class="section-chevron">${collapsed ? '▶' : '▼'}</span>
        </div>
        <div class="step-group-body${collapsed ? ' is-collapsed' : ''}" data-section-body="${key}">${cardsHtml}</div>`;
    }

    const classCards = base.features?.length
        ? base.features.map(f => renderStepCard({
            name: f.name,
            description: Array.isArray(f.description) ? f.description.join(' ') : (f.description || ''),
            action: null, check: '',
        })).join('')
        : '';

    const pathCards = (pathInit.length || pathProgSteps.length)
        ? pathInit.map(renderStepCard).join('') +
        pathProgSteps.map((s, i) => state.progression.pathChecked[i] ? renderStepCard(s) : '').join('')
        : '';

    const talentCards = (talentInit.length || talentProgSteps.length)
        ? talentInit.map(renderStepCard).join('') +
        talentProgSteps.map((s, i) => state.progression.talentChecked[i] ? renderStepCard(s) : '').join('')
        : '';

    el.innerHTML = `
        <div class="class-badges">
            ${state.char.classKey ? `<span class="feature-badge">${state.char.classKey}</span>` : ''}
            ${state.char.pathName ? `<span class="feature-badge">${state.char.pathName}</span>` : ''}
            ${state.char.talentName ? `<span class="feature-badge">${state.char.talentName}</span>` : ''}
        </div>
        ${sectionBlock('class', `Class — ${state.char.classKey}`, classCards)}
        ${sectionBlock('path', `Path — ${state.char.pathName}`, pathCards)}
        ${sectionBlock('talent', `Talent — ${state.char.talentName}`, talentCards)}`;
}

function esc(str) { return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function renderStepCard(s) {
    const name = s?.name || '';
    const override = state.char.featureOverrides?.[name] || {};
    const desc = override.desc !== undefined ? override.desc : (s?.description || '');
    const hideRoll = override.hideRoll || false;
    const check = s?.check || '';
    const tags = [];
    if (s?.action) tags.push(s.action);
    if (s?.check) tags.push(`Check: ${s.check}`);
    if (s?.range) tags.push(`Range: ${s.range}`);
    if (s?.damage !== undefined && s.damage !== '') tags.push(`Dmg: ${s.damage}${s.damageType ? ` (${s.damageType})` : ''}`);

    const isPassive = (s?.action || '').toLowerCase() === 'passive' || (!s?.action && !check);
    const extraTags = tags.filter(t => !t.startsWith('Check:')).join('|');

    return `<div class="step-card" data-feat-name="${esc(name)}">
        <div class="step-card-head">
            <div class="step-card-title">
                <strong>${name}</strong>
                ${tags.length ? `<div class="step-tags">${tags.map(t => `<span class="step-tag">${t}</span>`).join('')}</div>` : ''}
            </div>
            <div class="step-card-btns">
                ${!isPassive && !hideRoll ? `<button class="step-action-btn" type="button" title="Roll"
                    data-action="roll"
                    data-name="${esc(name)}"
                    data-desc="${esc(desc)}"
                    data-extra-tags="${esc(extraTags)}"
                    data-check="${esc(check)}"><img src="../assets/icons/roll.png" class="btn-icon" alt="roll"></button>` : ''}
                <button class="step-action-btn" type="button" title="Send to chat"
                    data-action="chat"
                    data-name="${esc(name)}"
                    data-desc="${esc(desc)}"><img src="../assets/icons/chat.png" class="btn-icon" alt="chat"></button>
                <button class="step-action-btn step-edit-trigger" type="button" title="Edit"
                    data-action="edit"
                    data-feat-name="${esc(name)}">✎</button>
            </div>
        </div>
        ${desc ? `<p class="step-desc">${desc}</p>` : ''}
    </div>`;
}

// ── PROGRESSION PANEL ─────────────────────────────────────────────────────────

function renderProgression() {
    const pathEl = document.getElementById('path-progression-list');
    const talentEl = document.getElementById('talent-progression-list');
    if (!pathEl || !talentEl) return;

    const entries = getClassEntries(state.char.classKey);
    const pathEntry = state.char.pathName ? entries.find(e => e.name === state.char.pathName) : null;
    const talentEntry = state.char.talentName ? entries.find(e => e.name === state.char.talentName) : null;

    const pathSteps = pathEntry?.path?.steps?.filter(s => Number(s.step) !== 0) || [];
    const talentSteps = talentEntry?.talent?.steps?.filter(s => Number(s.step) !== 0) || [];

    pathEl.innerHTML = pathSteps.length
        ? pathSteps.map((s, i) => renderProgStep(s, i, 'path')).join('')
        : '<p class="empty-hint">Select a path in Features</p>';

    talentEl.innerHTML = talentSteps.length
        ? talentSteps.map((s, i) => renderProgStep(s, i, 'talent')).join('')
        : '<p class="empty-hint">Select a talent in Features</p>';

    updateXpDisplay();
}

function renderProgStep(s, index, type) {
    const checked = type === 'path'
        ? !!state.progression.pathChecked[index]
        : !!state.progression.talentChecked[index];
    const canAfford = getXpAvailable() >= 20;

    // Path: previous step must be unlocked first
    const prevOk = type !== 'path' || index === 0 || !!state.progression.pathChecked[index - 1];
    const outOfOrder = type === 'path' && !checked && !prevOk;
    const locked = !checked && (!canAfford || outOfOrder);

    let badge;
    if (checked) badge = '<span class="prog-badge prog-badge--done">✓ Unlocked</span>';
    else if (outOfOrder) badge = '<span class="prog-badge prog-badge--locked">🔒 Unlock previous first</span>';
    else if (!canAfford) badge = '<span class="prog-badge prog-badge--locked">🔒 20 XP</span>';
    else badge = '<span class="prog-badge prog-badge--cost">20 XP</span>';

    // Path steps are permanent once checked
    const permanent = checked && type === 'path';

    return `<div class="prog-step${checked ? ' prog-step--done' : ''}${locked ? ' prog-step--locked' : ''}">
        <label class="prog-check-label">
            <input type="checkbox" class="prog-checkbox"
                data-prog-type="${type}" data-prog-index="${index}"
                ${checked ? 'checked' : ''} ${locked || permanent ? 'disabled' : ''}>
        </label>
        <div class="prog-step-body">
            <div class="prog-step-name-row">
                <span class="prog-step-name">${s?.name || 'Unnamed'}</span>
                ${badge}
            </div>
            ${s?.description ? `<p class="step-desc">${s.description}</p>` : ''}
        </div>
    </div>`;
}

function renderOtherGains() {
    const html = state.progression.otherGains.length
        ? state.progression.otherGains.map((g, i) => `
            <div class="row">
                <span class="check-row-label">${g}</span>
                <button class="check-adj" data-remove-gain="${i}" style="color:#ff6060" aria-label="Remove">✕</button>
            </div>`).join('')
        : '<p class="empty-hint">Items gained during play</p>';
    const el1 = document.getElementById('other-gains-list');
    const el2 = document.getElementById('prog-other-gains-list');
    if (el1) el1.innerHTML = html;
    if (el2) el2.innerHTML = html;
}

// ── EQUIPMENT ─────────────────────────────────────────────────────────────────

let equipTab = 'all';
let newEquipCat = 'gear';

function setEquipCat(cat) {
    newEquipCat = cat;
    document.querySelectorAll('.equip-type-btn').forEach(b =>
        b.classList.toggle('is-sel', b.dataset.cat === cat));
}

function renderEquipment() {
    const el = document.getElementById('equip-list');
    if (!el) return;
    const visible = equipTab === 'all'
        ? state.equipment
        : state.equipment.filter(e => (e.category || 'gear') === equipTab);

    if (!visible.length) {
        el.innerHTML = `<p class="empty-hint">${state.equipment.length ? `No ${equipTab} items` : 'No equipment added'
            }</p>`;
        return;
    }

    el.innerHTML = visible.map(item => {
        const i = state.equipment.indexOf(item);
        const cat = item.category || 'gear';
        const catLabel = `<span class="equip-cat-badge equip-cat-${cat}">${cat}</span>`;
        const isArmor = cat === 'armor';
        const isWeapon = cat === 'weapon';

        const rollBtn = item.hideRoll ? '' : isWeapon
            ? `<button class="step-action-btn" type="button" title="Attack"
                    data-action="weapon-roll" data-equip-index="${i}"><img src="../assets/icons/roll.png" class="btn-icon" alt="roll"></button>`
            : `<button class="step-action-btn" type="button" title="Roll"
                    data-action="roll" data-name="${esc(item.name)}"
                    data-desc="${esc(item.notes || '')}" data-tag="${esc(cat)}" data-check=""><img src="../assets/icons/roll.png" class="btn-icon" alt="roll"></button>`;

        const editBtn = `<button class="step-action-btn step-edit-trigger" type="button" title="Edit"
                    data-action="edit-equip" data-equip-index="${i}">✎</button>`;

        return `<div class="row" data-equip-row="${i}">
            <div class="equip-info">
                <div class="equip-row-name">${item.name} ${catLabel}</div>
                ${item.notes ? `<div class="equip-row-notes">${item.notes}</div>` : ''}
                ${item.flavor ? `<div class="equip-row-notes" style="color:var(--muted)">${item.flavor}</div>` : ''}
            </div>
            <div class="equip-row-actions">
                ${rollBtn}
                <button class="step-action-btn" type="button" title="Send to chat"
                    data-action="chat" data-name="${esc(item.name)}"
                    data-desc="${esc(item.flavor || item.notes || '')}"><img src="../assets/icons/chat.png" class="btn-icon" alt="chat"></button>
                ${editBtn}
                <button class="step-action-btn" type="button" style="color:#ff6060"
                    data-action="del-equip" data-equip-index="${i}" aria-label="Remove">✕</button>
            </div>
        </div>`;
    }).join('');
}

// ── CHAT ──────────────────────────────────────────────────────────────────────

// chatTimestamp is in chat-cards.js

function pushChat(text, _unused = 'msg') {
    state.chat.unshift({ type: 'msg', text, time: chatTimestamp() });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
}

function pushChatRoll({ label, total, rollNote, mod, rollType, conditions }) {
    state.chat.unshift({
        type: 'roll', time: chatTimestamp(),
        charName: state.char.name || '',
        label, total, rollNote, mod, rollType,
        conditions: [...(conditions || [])],
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
}

function pushChatRecovery({ title, gains }) {
    state.chat.unshift({
        type: 'recovery', time: chatTimestamp(),
        charName: state.char.name || '',
        title, gains,
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    renderChat();
    setActivePanel('chat');
}

function pushChatFeature({ name, tags, desc }) {
    state.chat.unshift({
        type: 'feature', time: chatTimestamp(),
        charName: state.char.name || '',
        name,
        tags: tags || [],
        desc: desc || '',
        diceRolls: parseDiceFromText(desc),
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
}

// successCount / successHtml / naturalRoll / fmtSigned / diceChipsHtml /
// expandableDesc / damageTableBtnHtml / chatTimestamp / render*Entry
// are all defined in chat-cards.js (loaded before this script).

function successCount(total) {
    return total >= 15 ? Math.floor((total - 10) / 5) : 0;
}

function rollDamageTable(damageType) {
    const table = damageData[damageType];
    if (!table) return;
    const roll = Math.ceil(Math.random() * 6);
    const result = table.entries[roll - 1] || '—';
    const condEffect = CONDITION_EFFECTS[result];
    const desc = condEffect ? `${result} — ${condEffect}` : result;
    state.chat.unshift({
        type: 'feature', time: chatTimestamp(),
        charName: state.char.name || '',
        name: `${table.icon} ${damageType} Table`,
        tags: [`Roll ${roll}`, table.category],
        desc,
        diceRolls: [],
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    renderChat();
}

// renderRollEntry / renderRecoveryEntry / renderDiceEntry / renderFeatureEntry
// are defined in chat-cards.js

function renderChat() {
    if (localStorage.getItem('arc-room') && sharedChatMsgs.length) {
        renderSharedChat();
        return;
    }
    const el = document.getElementById('chat-log');
    if (!el) return;
    el.innerHTML = '';
    if (!state.chat.length) {
        const li = document.createElement('li');
        li.className = 'chat-empty';
        li.textContent = 'No messages yet. Rolls will appear here.';
        el.appendChild(li);
        return;
    }
    state.chat.forEach(entry => {
        const li = document.createElement('li');
        if (entry.type === 'weapon-attack') {
            li.innerHTML = renderWeaponAttackEntry(entry);
        } else if (entry.type === 'roll' && entry.total !== undefined) {
            li.innerHTML = renderRollEntry(entry);
        } else if (entry.type === 'feature') {
            li.innerHTML = renderFeatureEntry(entry);
        } else if (entry.type === 'dice') {
            li.innerHTML = renderDiceEntry(entry);
        } else if (entry.type === 'recovery') {
            li.innerHTML = renderRecoveryEntry(entry);
        } else {
            // Plain message or legacy text entry
            li.className = 'chat-entry--msg';
            li.innerHTML = `<span class="chat-time">${entry.time}</span><span class="chat-text">${entry.text || ''}</span>`;
        }
        el.appendChild(li);
    });
}

// ── PERSISTENCE ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'arc-active-sheet';

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            char: state.char,
            resources: state.resources,
            checks: state.checks,
            activeConditions: [...state.activeConditions],
            equipment: state.equipment,
            progression: state.progression,
            chat: state.chat.slice(0, 50),
        }));
    } catch (_) { }
    debouncedRoomSync();
}

// ── FIREBASE: PARTY SESSION ───────────────────────────────────────────────────

let _partyUnsub = null;
let _lootUnsub  = null;
let _roomUnsub  = null;

let sharedChatMsgs = [];
let _chatUnsub     = null;

function listenToSharedChat(code) {
    if (_chatUnsub) _chatUnsub();
    const arc = window.__arc;
    const q   = arc.query(
        arc.collection(arc.db, 'rooms', code, 'chat'),
        arc.orderBy('postedAt', 'desc'),
        arc.limit(60)
    );
    let prevCount = 0;
    _chatUnsub = arc.onSnapshot(q, snap => {
        sharedChatMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderSharedChat();
        // Badge if chat tab not active and messages increased
        if (snap.docs.length > prevCount) {
            const chatPanel = document.getElementById('panel-chat');
            const notif     = document.getElementById('chat-notif');
            if (notif && !chatPanel?.classList.contains('is-active')) {
                notif.hidden = false;
            }
        }
        prevCount = snap.docs.length;
    }, err => console.error('[ARC] shared chat:', err));
}

async function broadcastChatEntry(entry) {
    const arc  = window.__arc;
    const room = localStorage.getItem('arc-room');
    if (!arc?.db || !arc?.uid || !room) return;
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', room, 'chat', crypto.randomUUID()), {
            ...entry,
            author:   state.char?.name || 'Player',
            uid:      arc.uid,
            postedAt: arc.serverTimestamp(),
        });
    } catch(e) { console.error('[ARC] broadcastChat:', e); }
}

function renderSharedChat() {
    const el = document.getElementById('chat-log');
    if (!el || !localStorage.getItem('arc-room')) return;

    el.innerHTML = '';

    if (!sharedChatMsgs.length) {
        const li = document.createElement('li');
        li.className = 'chat-empty';
        li.textContent = 'No messages yet. Rolls will appear here.';
        el.appendChild(li);
        return;
    }

    sharedChatMsgs.forEach(m => {
        const li    = document.createElement('li');
        const isMe  = m.uid === window.__arc?.uid;
        const isNar = m.isNarrator;

        // Author badge — shown for other players and narrator
        const badge = isNar
            ? `<div class="shared-author shared-author--nar">◆ Narrator</div>`
            : (!isMe ? `<div class="shared-author">${m.author || 'Player'}</div>` : '');
        if (isNar) {
            const isRoll = ['roll','dice','weapon-attack'].includes(m.type);
            li.classList.add('nar-msg', isRoll ? 'nar-msg--roll' : 'nar-msg--text');
        }

        if (m.type === 'weapon-attack') {
            li.innerHTML = badge + renderWeaponAttackEntry(m);
        } else if (m.type === 'roll' && m.total !== undefined) {
            li.innerHTML = badge + renderRollEntry(m);
        } else if (m.type === 'feature') {
            li.innerHTML = badge + renderFeatureEntry(m);
        } else if (m.type === 'dice') {
            li.innerHTML = badge + renderDiceEntry(m);
        } else if (m.type === 'recovery') {
            li.innerHTML = badge + renderRecoveryEntry(m);
        } else if (m.type === 'initiative-call') {
            li.innerHTML = renderInitiativeCallEntry(m);
        } else if (m.type === 'turn') {
            li.innerHTML = renderTurnEntry(m);
        } else {
            li.className = 'chat-entry--msg';
            li.innerHTML = `${badge}<span class="chat-time">${m.time || ''}</span><span class="chat-text">${m.text || ''}</span>`;
        }

        el.appendChild(li);
    });
}

document.addEventListener('arc:firebase-ready', () => {
    const room = localStorage.getItem('arc-room');
    if (!room) return;

    const arc = window.__arc;
    const badgeEl = document.getElementById('player-room-badge');
    if (badgeEl) badgeEl.textContent = room;
    document.getElementById('party-session-panel').hidden = false;

    // Intercept every chat push to broadcast to Firestore
    const _origUnshift = state.chat.unshift.bind(state.chat);
    state.chat.unshift = function(entry) {
        _origUnshift(entry);
        broadcastChatEntry(entry);
    };

    // Start shared chat listener
    listenToSharedChat(room);

    // Show session section in settings
    const sessSection = document.getElementById('settings-session-section');
    const sessLabel   = document.getElementById('settings-session-label');
    if (sessSection) sessSection.hidden = false;
    if (sessLabel)   sessLabel.textContent = `Room: ${room}`;

    // Leave session from settings
    document.getElementById('btn-leave-session-sheet')?.addEventListener('click', async () => {
        const arc = window.__arc;
        if (arc?.db && arc?.uid) {
            try { await arc.deleteDoc(arc.doc(arc.db, 'rooms', room, 'players', arc.uid)); } catch {}
        }
        localStorage.removeItem('arc-room');
        closeSettings();
        window.location.href = 'home.html';
    });

    // Listen to party members
    _partyUnsub = arc.onSnapshot(
        arc.collection(arc.db, 'rooms', room, 'players'),
        snap => renderPlayerParty(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );

    // Listen to loot
    _lootUnsub = arc.onSnapshot(
        arc.collection(arc.db, 'rooms', room, 'loot'),
        snap => renderPlayerLoot(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );

    // Listen to room doc for gold
    _roomUnsub = arc.onSnapshot(
        arc.doc(arc.db, 'rooms', room),
        snap => {
            const gold = snap.data()?.gold ?? 0;
            const el = document.getElementById('player-gold-val');
            if (el) el.textContent = gold;
        },
    );
});

function renderPlayerParty(players) {
    const el = document.getElementById('player-party-list');
    if (!el) return;
    if (!players.length) { el.innerHTML = '<p class="empty-hint">No other players yet.</p>'; return; }
    const myUid = window.__arc?.uid;
    el.innerHTML = players.map(p => {
        const pct = p.woundsMax > 0 ? Math.round((p.woundsCur / p.woundsMax) * 100) : 0;
        const isMe = p.id === myUid;
        return `<div class="pparty-row${isMe ? ' pparty-row--me' : ''}">
            <span class="pparty-name">${p.name}${isMe ? ' (you)' : ''}</span>
            <div class="pparty-bars">
                <div class="pparty-bar-track"><div class="pparty-bar-fill pparty-bar--hp" style="width:${pct}%"></div></div>
                <span class="pparty-val">${p.woundsCur}/${p.woundsMax}</span>
            </div>
        </div>`;
    }).join('');
}

function renderPlayerLoot(items) {
    const el = document.getElementById('player-loot-list');
    if (!el) return;
    if (!items.length) { el.innerHTML = '<p class="empty-hint">No items in party inventory.</p>'; return; }
    el.innerHTML = items.map(item => `
        <div class="inv-row">
            <div class="inv-name-col">
                <span class="inv-name">${item.name}</span>
                ${item.desc ? `<span class="inv-desc">${item.desc}</span>` : ''}
            </div>
            <span class="inv-amount">×${item.amount}</span>
            <span class="inv-bulk">${((item.bulk||0)*(item.amount||1)).toFixed(1).replace(/\.0$/,'')} bulk</span>
            <button class="inv-claim-btn" data-loot-id="${item.id}">Claim</button>
        </div>`).join('');

    el.querySelectorAll('[data-loot-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const arc  = window.__arc;
            const room = localStorage.getItem('arc-room');
            if (!arc?.db || !room) return;
            const id   = btn.dataset.lootId;
            const item = items.find(x => x.id === id);
            if (!item) return;
            try {
                if (item.amount <= 1) {
                    await arc.deleteDoc(arc.doc(arc.db, 'rooms', room, 'loot', id));
                } else {
                    await arc.updateDoc(arc.doc(arc.db, 'rooms', room, 'loot', id), { amount: item.amount - 1 });
                }
            } catch(e) { console.error('[ARC] claim loot failed:', e); }
        });
    });
}

// ── FIREBASE: CHARACTER SYNC ──────────────────────────────────────────────────

let _syncTimer = null;
function debouncedRoomSync() {
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(syncToRoom, 2000);
}

async function syncToRoom() {
    const arc  = window.__arc;
    const room = localStorage.getItem('arc-room');
    if (!arc?.db || !arc?.uid || !room) return;

    const c = state.char      || {};
    const r = state.resources || {};
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', room, 'players', arc.uid), {
            name:      c.name            || 'Player',
            armor:     r.armor?.current  ?? 0,
            woundsCur: r.hp?.current     ?? 0,
            woundsMax: r.hp?.max         ?? 0,
            mnCur:     r.MN?.current     ?? 0,
            mnMax:     r.MN?.max         ?? 0,
            gold:      c.wealth          ?? c.gold ?? 0,
            updatedAt: arc.serverTimestamp(),
        }, { merge: true });
    } catch(e) { console.error('[ARC] room sync failed:', e); }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.char) Object.assign(state.char, d.char);
        if (d.resources) {
            Object.keys(d.resources).forEach(k => {
                if (k === 'custom') {
                    if (Array.isArray(d.resources.custom)) state.resources.custom = d.resources.custom;
                } else if (state.resources[k]) {
                    Object.assign(state.resources[k], d.resources[k]);
                }
            });
        }
        if (d.checks) {
            ['physical', 'mental'].forEach(g => {
                if (!d.checks[g]) return;
                d.checks[g].forEach(saved => {
                    const live = state.checks[g].find(c => c.key === saved.key);
                    if (live) {
                        live.mod = saved.mod ?? 0;
                        live.bonus = saved.bonus ?? 0;
                        live.armorBonus = saved.armorBonus ?? 0;
                    }
                });
            });
        }
        if (Array.isArray(d.activeConditions)) state.activeConditions = new Set(d.activeConditions);
        if (Array.isArray(d.equipment)) state.equipment = d.equipment;
        if (d.progression) Object.assign(state.progression, d.progression);
        if (Array.isArray(d.chat)) state.chat = d.chat;
    } catch (_) { }
}

// ── DOM CACHE ─────────────────────────────────────────────────────────────────

const els = {};

function cacheEls() {
    els.panels = {
        play: document.getElementById('panel-play'),
        actions: document.getElementById('panel-actions'),
        spells: document.getElementById('panel-spells'),
        ref: document.getElementById('panel-ref'),
        progression: document.getElementById('panel-progression'),
        chat: document.getElementById('panel-chat'),
    };
    els.navBtns = Array.from(document.querySelectorAll('.nav-btn'));

    els.hpCur = document.getElementById('hp-current');
    els.hpMax = document.getElementById('hp-max');
    els.armorCur = document.getElementById('armor-current');
    els.armorMax = document.getElementById('armor-max');
    els.MNCur = document.getElementById('MN-current');
    els.MNMax = document.getElementById('MN-max');
    els.classResCur = document.getElementById('classRes-current');
    els.classResMax = document.getElementById('classRes-max');

    els.conditionsRow = document.getElementById('conditions-row');
    els.quickChecks = document.getElementById('quick-checks');

    els.rollDrawer = document.getElementById('roll-drawer');
    els.rollLabel = document.getElementById('roll-label');
    els.rollMod = document.getElementById('roll-mod');
    els.btnRoll = document.getElementById('btn-roll');
    els.mainLog = document.getElementById('roll-log');

    els.btnClearConditions = document.getElementById('btn-clear-conditions');
    els.btnClearLog = document.getElementById('btn-clear-log');

    // MN-max-input removed — mana max is now auto-calculated from class features

    els.btnSaveBio = document.getElementById('btn-save-bio');
    els.topbarName = document.getElementById('topbar-name');
}

// ── NAV ───────────────────────────────────────────────────────────────────────

function bindNav() {
    els.navBtns.forEach(btn =>
        btn.addEventListener('click', () => setActivePanel(btn.dataset.nav))
    );
}

function bindPlayTabs() {
    document.querySelectorAll('.play-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.playTab;
            document.querySelectorAll('.play-tab').forEach(t =>
                t.classList.toggle('is-active', t.dataset.playTab === target));
            document.querySelectorAll('.play-tab-content').forEach(c =>
                c.classList.toggle('is-active', c.id === `play-tab-${target}`));
        });
    });
}

function syncConditionsBar() {
    const bar = document.getElementById('conditions-bar');
    if (!bar) return;
    const active = [...state.activeConditions];
    bar.innerHTML = active.map(c =>
        `<span class="cond-bar-pill">${c}</span>`
    ).join('');
}

function setActivePanel(key) {
    Object.entries(els.panels).forEach(([k, el]) => el?.classList.toggle('is-active', k === key));
    els.navBtns.forEach(b => b.classList.toggle('is-active', b.dataset.nav === key));
    // play-tab-bio sits outside panel-play in the DOM; manually sync its visibility
    const bioCont = document.getElementById('play-tab-bio');
    if (bioCont) bioCont.style.display = (key === 'play') ? '' : 'none';
    if (key === 'chat') {
        renderChat();
        const notif = document.getElementById('chat-notif');
        if (notif) notif.hidden = true;
    }
    if (key === 'spells') renderSpellsPanel();
    if (key === 'ref') renderRefPanel();
}

// ── RESOURCES ─────────────────────────────────────────────────────────────────

function syncRecoveryUI() {
    const usesMax = state.char.poUsesMax || 2;
    const po = state.char.pressOnUsed || 0;
    const checksEl = document.getElementById('press-on-checks');
    if (checksEl) {
        checksEl.innerHTML = '';
        for (let i = 1; i <= usesMax; i++) {
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.className = 'rec-use-cb';
            cb.disabled = true; cb.checked = i <= po;
            checksEl.appendChild(cb);
        }
    }
    const pressBtn = document.getElementById('btn-press-on');
    if (pressBtn) { pressBtn.disabled = po >= usesMax; pressBtn.textContent = po >= usesMax ? 'Used' : 'Use'; }

    const lr = state.char.longRestUsed;
    const lrCb = document.getElementById('long-rest-1');
    if (lrCb) lrCb.checked = lr;
    const restBtn = document.getElementById('btn-long-rest');
    if (restBtn) { restBtn.disabled = lr; restBtn.textContent = lr ? 'Done' : 'Rest'; }
}

function bindRecovery() {
    // Populate config inputs from saved state
    const setInput = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    setInput('po-uses-max', state.char.poUsesMax ?? 2);
    setInput('po-resource', state.char.poResource ?? 1);
    setInput('po-mana', state.char.poMana ?? 1);
    setInput('po-armor', state.char.poArmor ?? 'd6');
    setInput('po-healing', state.char.poHealing ?? 'd6');
    if (state.char.poDesc) setInput('po-desc', state.char.poDesc);
    if (state.char.lrDesc) setInput('lr-desc', state.char.lrDesc);

    syncRecoveryUI();

    // Save config on change
    const savePoConfig = () => {
        const g = id => document.getElementById(id)?.value ?? '';
        state.char.poUsesMax = parseInt(g('po-uses-max') || '2', 10);
        state.char.poResource = parseInt(g('po-resource') || '0', 10);
        state.char.poMana = parseInt(g('po-mana') || '0', 10);
        state.char.poArmor = g('po-armor') || '';
        state.char.poHealing = g('po-healing') || '';
        state.char.poDesc = g('po-desc');
        state.char.lrDesc = g('lr-desc');
        saveState();
    };
    ['po-uses-max', 'po-resource', 'po-mana', 'po-armor', 'po-healing', 'po-desc', 'lr-desc'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            savePoConfig();
            if (id === 'po-uses-max') syncRecoveryUI();
        });
    });

    // Toggle collapse
    document.getElementById('po-toggle')?.addEventListener('click', () => {
        document.getElementById('press-on-body')?.classList.toggle('is-open');
    });
    document.getElementById('lr-toggle')?.addEventListener('click', () => {
        document.getElementById('long-rest-body')?.classList.toggle('is-open');
    });

    // ── Press On ──────────────────────────────────────────────────────────────
    let _pressOnBusy = false;
    document.getElementById('btn-press-on')?.addEventListener('click', () => {
        if (_pressOnBusy) return;
        _pressOnBusy = true;
        setTimeout(() => { _pressOnBusy = false; }, 600);
        const usesMax = state.char.poUsesMax || 2;
        if ((state.char.pressOnUsed || 0) >= usesMax) return;

        const resource = state.char.poResource ?? 1;
        const mana = state.char.poMana ?? 1;
        const armorNotation = (state.char.poArmor || 'd6').trim();
        const healNotation = (state.char.poHealing || 'd6').trim();
        const craftingMod = allChecks().find(c => c.key === 'cra')?.mod || 0;
        const resLabel = state.resources.classRes.label || 'Resource';

        const normalize = s => /^\d/.test(s) ? s : '1' + s;
        const gains = [];

        if (resource > 0) {
            state.resources.classRes.current = Math.min(state.resources.classRes.current + resource, state.resources.classRes.max);
            gains.push({ label: 'Regain', value: `${resource} ${resLabel}` });
        }
        if (mana > 0) {
            state.resources.MN.current = Math.min(state.resources.MN.current + mana, state.resources.MN.max);
            gains.push({ label: 'Recover', value: `${mana} Mana` });
        }
        if (armorNotation) {
            const r = rollDiceNotation(normalize(armorNotation));
            const total = Math.max(1, (r?.total || 0) + craftingMod);
            state.resources.armor.current = Math.min(state.resources.armor.current + total, state.resources.armor.max);
            gains.push({ label: 'Repair Armor', value: String(total), rolled: true });
        }
        if (healNotation) {
            const r = rollDiceNotation(normalize(healNotation));
            const total = r?.total || 0;
            state.resources.hp.current = Math.min(state.resources.hp.current + total, state.resources.hp.max);
            gains.push({ label: 'Healing', value: String(total), rolled: true });
        }

        state.char.pressOnUsed = (state.char.pressOnUsed || 0) + 1;
        syncUI(); saveState(); syncRecoveryUI();
        pushChatRecovery({ title: 'Press On', gains });
    });

    // ── Long Rest ─────────────────────────────────────────────────────────────
    document.getElementById('btn-long-rest')?.addEventListener('click', () => {
        if (state.char.longRestUsed) return;

        state.resources.hp.current = state.resources.hp.max;
        state.resources.MN.current = state.resources.MN.max;
        state.resources.classRes.current = state.resources.classRes.max;
        state.resources.armor.current = Math.max(state.resources.armor.current, Math.ceil(state.resources.armor.max / 2));
        state.activeConditions.clear();
        syncConditionsBar(); renderConditions();

        state.char.longRestUsed = true;
        syncUI(); saveState(); syncRecoveryUI();

        const resLabel = state.resources.classRes.label || 'Resource';
        pushChatRecovery({
            title: 'Long Rest', gains: [
                { label: 'Wounds', value: 'Full Restore' },
                { label: 'Mana', value: 'Full Restore' },
                { label: resLabel, value: 'Full Restore' },
                { label: 'Armor', value: 'Repaired to ½+' },
                { label: 'Conditions', value: 'Day Conditions Cleared' },
            ]
        });
    });

    // ── Reset Day ─────────────────────────────────────────────────────────────
    document.getElementById('btn-reset-recovery')?.addEventListener('click', () => {
        state.char.pressOnUsed = 0;
        state.char.longRestUsed = false;
        saveState(); syncRecoveryUI();
    });
}

function bindResources() {
    document.getElementById('btn-recover-mn')?.addEventListener('click', recoverMN);

    // Play panel: hp + armor
    document.querySelector('.resource-grid')?.addEventListener('click', e => {
        if (e.target.closest('#btn-recover-mn')) return; // handled separately
        const btn = e.target.closest('.pill-btn');
        const pill = e.target.closest('.resource-pill');
        if (!btn || !pill) return;
        const res = state.resources[pill.dataset.resource];
        const action = btn.dataset.action;
        if (!res) return;
        if (action === 'inc') res.current = Math.min(res.current + 2, res.max);
        if (action === 'dec') res.current = Math.max(res.current - 1, 0);
        if (action === 'inc5') res.current = Math.min(res.current + 5, res.max);
        if (action === 'dec5') res.current = Math.max(res.current - 5, 0);
        syncUI();
        saveState();
    });

    // Features panel: MN + classRes + custom
    document.getElementById('panel-actions')?.addEventListener('click', e => {
        const btn = e.target.closest('.pill-btn');
        const pill = e.target.closest('.resource-pill');
        if (!btn || !pill) return;
        const action = btn.dataset.action;
        const customId = pill.dataset.resourceCustom;
        if (customId) {
            const res = state.resources.custom.find(r => r.id === customId);
            if (!res) return;
            if (action === 'inc') res.current = Math.min(res.current + 1, res.max);
            if (action === 'dec') res.current = Math.max(res.current - 1, 0);
        } else {
            const res = state.resources[pill.dataset.resource];
            if (!res) return;
            if (action === 'inc') res.current = Math.min(res.current + 2, res.max);
            if (action === 'dec') res.current = Math.max(res.current - 1, 0);
            if (action === 'inc5') res.current = Math.min(res.current + 5, res.max);
            if (action === 'dec5') res.current = Math.max(res.current - 5, 0);
        }
        syncUI();
        saveState();
    });
}

// ── CONDITIONS ────────────────────────────────────────────────────────────────

function renderConditions() {
    els.conditionsRow.innerHTML = '';
    Object.entries(CONDITION_GROUPS).forEach(([group, names]) => {
        const header = document.createElement('div');
        header.className = 'conditions-group-label';
        header.textContent = group;
        els.conditionsRow.appendChild(header);
        const row = document.createElement('div');
        row.className = 'chip-row';
        names.forEach(name => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'chip';
            b.textContent = name;
            b.setAttribute('aria-pressed', state.activeConditions.has(name) ? 'true' : 'false');
            b.addEventListener('click', () => {
                const active = state.activeConditions.has(name);
                if (active) { state.activeConditions.delete(name); b.setAttribute('aria-pressed', 'false'); }
                else { state.activeConditions.add(name); b.setAttribute('aria-pressed', 'true'); }
                saveState();
                syncConditionsBar();
            });
            row.appendChild(b);
        });
        els.conditionsRow.appendChild(row);
    });
}

// ── CHECKS ────────────────────────────────────────────────────────────────────

function allChecks() { return [...state.checks.physical, ...state.checks.mental]; }

function renderQuickChecks() {
    els.quickChecks.innerHTML = '';
    ['physical', 'mental'].forEach(group => {
        const header = document.createElement('div');
        header.className = 'checks-group-label';
        header.textContent = group === 'physical' ? 'Physical' : 'Mental';
        els.quickChecks.appendChild(header);
        const grid = document.createElement('div');
        grid.className = 'quick-grid';
        state.checks[group].forEach(chk => {
            const armor = chk.armorBonus || 0;
            const manual = chk.bonus || 0;
            const total = chk.mod + manual + armor;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'quick-btn';
            b.innerHTML = `
                <span class="qb-label">${chk.label}</span>
                <span class="qb-nums">
                    <small class="qb-stat">${fmtSigned(chk.mod)}</small>
                    ${manual !== 0 ? `<small class="qb-bonus">${fmtSigned(manual)}</small>` : ''}
                    ${armor !== 0 ? `<small class="qb-bonus qb-armor">${fmtSigned(armor)}</small>` : ''}
                </span>`;
            b.addEventListener('click', () => {
                els.rollLabel.value = `${chk.label} Check`;
                els.rollMod.value = total;
                openDrawer();
            });
            grid.appendChild(b);
        });
        els.quickChecks.appendChild(grid);
    });
}

function syncEditCheckInputs() {
    allChecks().forEach(chk => {
        const modEl = document.getElementById(`edit-mod-${chk.key}`);
        const bonEl = document.getElementById(`edit-bon-${chk.key}`);
        if (modEl) modEl.value = chk.mod;
        if (bonEl) bonEl.value = chk.bonus ?? 0;
    });
}

// ── ROLL DRAWER ───────────────────────────────────────────────────────────────

function bindDrawer() {
    // FAB removed — roll drawer only opens via feature/weapon roll chips

    els.rollDrawer.addEventListener('click', e => {
        if (e.target.matches('[data-drawer-close]')) closeDrawer();
    });

    // Segmented roll type — mutually exclusive
    document.querySelectorAll('.roll-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
            btn.classList.add('is-sel');
        });
    });

    els.btnRoll.addEventListener('click', () => {
        const label = (els.rollLabel.value || 'Roll').trim();
        const mod = Number(els.rollMod.value || 0);
        const selSeg = document.querySelector('.roll-seg-btn.is-sel')?.dataset.seg || 'flat';

        const roll = () => 1 + Math.floor(Math.random() * 20);
        let d20, rollNote;

        if (selSeg === 'adv') {
            const a = roll(), b = roll();
            d20 = Math.max(a, b);
            rollNote = `adv(${a},${b})`;
        } else if (selSeg === 'dis') {
            const a = roll(), b = roll();
            d20 = Math.min(a, b);
            rollNote = `dis(${a},${b})`;
        } else {
            d20 = roll();
            rollNote = `d20(${d20})`;
        }

        const total = d20 + mod;
        pushChatRoll({
            label, total, rollNote, mod,
            rollType: selSeg,
            conditions: [...state.activeConditions],
        });
        pushRollLog(`${label}: ${rollNote} ${fmtSigned(mod)} = ${total}`);
        renderLogs();
        closeDrawer();
    });

    els.btnClearLog.addEventListener('click', () => { state.rollLog = []; renderLogs(); });
    els.btnClearConditions.addEventListener('click', () => {
        state.activeConditions.clear();
        saveState();
        renderConditions();
        syncConditionsBar();
    });

    // Chat
    // Expand/collapse long descriptions in chat
    document.getElementById('chat-log')?.addEventListener('click', e => {
        const provoke = e.target.closest('.provoke-btn');
        if (provoke) {
            pushChatFeature({
                name: 'Provoke!',
                tags: ['Off-Action', 'Attack'],
                desc: 'Use an Off-Action to make an attack against the target that caused this miss.',
            });
            return;
        }
        const expand = e.target.closest('.chat-expand-btn');
        if (expand) {
            const body = expand.previousElementSibling;
            if (!body) return;
            const collapsed = body.classList.toggle('is-clamped');
            expand.textContent = collapsed ? '▼ Show more' : '▲ Show less';
            return;
        }
        const tableBtn = e.target.closest('.dmg-table-btn');
        if (tableBtn) {
            const type = tableBtn.dataset.dmgType;
            const rolls = parseInt(tableBtn.dataset.rolls, 10) || 1;
            for (let i = 0; i < rolls; i++) rollDamageTable(type);
            setActivePanel('chat');
        }
        const initBtn = e.target.closest('.chat-init-roll-btn');
        if (initBtn) {
            const agiCheck = CHECKS.physical.find(c => c.key === 'agi');
            const mod   = (agiCheck?.mod || 0) + (agiCheck?.bonus || 0);
            const d20   = Math.ceil(Math.random() * 20);
            const total = d20 + mod;
            state.chat.unshift({
                type: 'roll', label: 'Initiative', charName: state.char?.name || 'Player',
                mod, rollNote: `d20(${d20})`, total, rollType: 'flat',
                conditions: [], time: chatTimestamp(),
            });
            saveState(); renderChat();
            setActivePanel('chat');
        }
    });

    document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
        state.chat = [];
        saveState();
        renderChat();
    });
    document.getElementById('btn-send-msg')?.addEventListener('click', sendChatMsg);
    document.getElementById('chat-msg-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendChatMsg();
    });

    // Emoji picker
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
    if (emojiBtn && emojiPanel) {
        emojiPanel.innerHTML = buildEmojiPanel();
        emojiBtn.addEventListener('click', e => {
            e.stopPropagation();
            emojiPanel.hidden = !emojiPanel.hidden;
        });
        emojiPanel.addEventListener('click', e => {
            const em = e.target.closest('.emoji-pick');
            if (!em) return;
            const input = document.getElementById('chat-msg-input');
            if (input) {
                const pos = input.selectionStart || input.value.length;
                input.value = input.value.slice(0, pos) + em.textContent + input.value.slice(pos);
                input.focus();
                input.setSelectionRange(pos + em.textContent.length, pos + em.textContent.length);
            }
            emojiPanel.hidden = true;
        });
        document.addEventListener('click', e => {
            if (!emojiPanel.hidden && !emojiPanel.contains(e.target) && e.target !== emojiBtn) {
                emojiPanel.hidden = true;
            }
        });
    }
}

function sendChatMsg() {
    const input = document.getElementById('chat-msg-input');
    const text = input?.value.trim();
    if (!text) return;
    pushChat(text, 'msg');
    if (input) input.value = '';
}

function bindDiceRoller() {
    const roller = document.getElementById('dice-roller');
    if (!roller) return;

    // Dice roll button
    document.getElementById('btn-dice-roll')?.addEventListener('click', () => {
        const sides = parseInt(document.getElementById('dice-type')?.value || '20', 10);
        const count = Math.max(1, parseInt(document.getElementById('dice-count')?.value || '1', 10));
        const bonus = parseInt(document.getElementById('dice-bonus')?.value || '0', 10);
        const rolls  = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
        const total  = rolls.reduce((s, r) => s + r, 0) + bonus;
        const sidesLabel = sides === 100 ? '%' : sides;
        const notation   = `${count}d${sidesLabel}${bonus !== 0 ? fmtSigned(bonus) : ''}`;
        state.chat.unshift({
            type: 'dice',
            time: chatTimestamp(),
            charName: state.char.name || '',
            notation, rolls, bonus, total,
        });
        if (state.chat.length > 100) state.chat.length = 100;
        saveState();
        renderChat();
    });
}

// Match comma-separated check names from feature data to state checks
function findChecksForFeature(checkStr) {
    if (!checkStr) return [];
    const names = checkStr.split(',').map(s => s.trim().toLowerCase());
    return [...state.checks.physical, ...state.checks.mental].filter(c =>
        names.some(n => c.label.toLowerCase() === n || n.includes(c.label.toLowerCase()))
    );
}

function openDrawer(label = null, checkStr = null) {
    if (label !== null) els.rollLabel.value = label;

    // Reset segmented control to Flat
    document.querySelectorAll('.roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
    document.querySelector('[data-seg="flat"]')?.classList.add('is-sel');

    // Populate check chips when feature has associated checks
    const checkSelectEl = document.getElementById('drawer-check-select');
    const checkChipsEl = document.getElementById('drawer-check-chips');
    if (checkSelectEl && checkChipsEl) {
        const matched = findChecksForFeature(checkStr);
        if (matched.length) {
            checkChipsEl.innerHTML = matched.map((c, i) => {
                const total = c.mod + (c.bonus || 0) + (c.armorBonus || 0);
                return `<button class="drawer-check-chip${i === 0 ? ' is-sel' : ''}"
                    type="button" data-check-mod="${total}">
                    ${c.label}<span class="dcc-val">${fmtSigned(total)}</span>
                </button>`;
            }).join('');
            checkSelectEl.hidden = false;
            els.rollMod.value = matched[0].mod + (matched[0].bonus || 0) + (matched[0].armorBonus || 0);
        } else {
            checkSelectEl.hidden = true;
        }
    }

    // Populate active condition effects
    const condBox = document.getElementById('drawer-conditions');
    const condList = document.getElementById('drawer-cond-chips');
    if (condBox && condList) {
        const active = [...state.activeConditions];
        if (active.length) {
            condList.innerHTML = active.map(name => {
                const effect = CONDITION_EFFECTS[name] || '';
                return `<div class="drawer-cond-entry">
                    <span class="drawer-cond-name">${name}</span>
                    ${effect ? `<span class="drawer-cond-effect">${effect}</span>` : ''}
                </div>`;
            }).join('');
            condBox.hidden = false;
        } else {
            condBox.hidden = true;
        }
    }

    // Pre-select Disadvantage if a condition penalizes the selected check
    applyConditionRollType('.roll-seg', '#drawer-check-chips');

    els.rollDrawer.inert = false;
    els.rollDrawer.removeAttribute('aria-hidden');
    els.rollDrawer.classList.add('is-open');
    setTimeout(() => els.rollLabel?.focus(), 0);
}

function closeDrawer() {
    if (els.rollDrawer.contains(document.activeElement)) {
    }
    els.rollDrawer.classList.remove('is-open');
    els.rollDrawer.setAttribute('aria-hidden', 'true');
    els.rollDrawer.inert = true;
}

// ── SECTION EDITORS ───────────────────────────────────────────────────────────

function bindSectionEditors() {
    document.querySelectorAll('.gear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const editor = document.getElementById(btn.dataset.editor);
            if (!editor) return;
            const opening = !editor.classList.contains('is-open');
            document.querySelectorAll('.section-editor.is-open').forEach(e => e.classList.remove('is-open'));
            document.querySelectorAll('.gear-btn.is-active').forEach(b => b.classList.remove('is-active'));
            if (opening) {
                populateEditor(btn.dataset.editor);
                editor.classList.add('is-open');
                btn.classList.add('is-active');
            }
        });
    });

    document.querySelectorAll('.done-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const kept = saveEditor(btn.dataset.save);
            if (!kept) {
                btn.closest('.section-editor').classList.remove('is-open');
                document.querySelectorAll('.gear-btn.is-active').forEach(b => b.classList.remove('is-active'));
            }
        });
    });

    document.getElementById('btn-add-custom-res')?.addEventListener('click', () => {
        const label = document.getElementById('custom-res-label-input')?.value.trim();
        const max   = clampNum(document.getElementById('custom-res-max-input')?.value);
        if (!label) return;
        state.resources.custom.push({ id: crypto.randomUUID(), label, current: max, max });
        document.getElementById('custom-res-label-input').value = '';
        document.getElementById('custom-res-max-input').value = '';
        saveState(); renderCustomResEditorList(); syncUI();
    });
}

function populateEditor(editorId) {
    if (editorId === 'health-editor') {
        const bonusEl = document.getElementById('hp-bonus-input');
        const armorMaxEl = document.getElementById('armor-max-input');
        if (bonusEl) bonusEl.value = state.resources.hp.bonus || 0;
        if (armorMaxEl) armorMaxEl.value = state.resources.armor.max || 0;
    }
    if (editorId === 'equip-editor') setEquipCat('gear');
    if (editorId === 'res-editor') renderCustomResEditorList();
    if (editorId === 'checks-editor') syncEditCheckInputs();
    if (editorId === 'class-editor') {
        populateClassSelect();
        if (state.char.classKey) populatePathTalentSelects(state.char.classKey);
        const classSel = document.getElementById('class-select');
        if (classSel) classSel.onchange = () => populatePathTalentSelects(classSel.value);
    }
    if (editorId === 'res-editor') {
        const labelInput = document.getElementById('class-res-label-input');
        const maxInput = document.getElementById('class-res-max-input');
        if (labelInput) labelInput.value = state.resources.classRes.label;
        if (maxInput) maxInput.value = state.resources.classRes.max;
        // MN max is auto-calculated — no manual input
    }
}

function saveEditor(target) {
    if (target === 'health') {
        const bonusEl = document.getElementById('hp-bonus-input');
        const armorMaxEl = document.getElementById('armor-max-input');
        state.resources.hp.bonus = clampNum(bonusEl?.value || '0');
        const newArmorMax = clampNum(armorMaxEl?.value || '0');
        state.resources.armor.max = newArmorMax;
        state.resources.armor.current = Math.min(state.resources.armor.current, newArmorMax);
        calcDerived(); saveState(); syncUI();
    }
    if (target === 'checks') {
        allChecks().forEach(chk => {
            const modEl = document.getElementById(`edit-mod-${chk.key}`);
            const bonEl = document.getElementById(`edit-bon-${chk.key}`);
            if (modEl) chk.mod = Number(modEl.value) || 0;
            if (bonEl) chk.bonus = Number(bonEl.value) || 0;
        });
        calcDerived();
        calcManaMax(); // stat-based classes (Mage) need recalc when checks change
        saveState();
        renderQuickChecks();
        syncUI();
    }
    if (target === 'class') {
        const classVal = document.getElementById('class-select')?.value || '';
        const pathVal = document.getElementById('path-select')?.value || '';
        const talentVal = document.getElementById('talent-select')?.value || '';

        const classChanged = classVal !== state.char.classKey;
        if (classChanged) {
            state.progression.pathChecked = {};
            state.progression.talentChecked = {};
        }
        state.char.classKey = classVal;
        state.char.pathName = pathVal;
        state.char.talentName = talentVal;

        // Auto-load starting equipment when class first selected
        if (classChanged && classVal) {
            const classData = classBaseData.find(c => c.name === classVal);
            if (classData?.equipment?.length) {
                classData.equipment.forEach(item => {
                    if (!state.equipment.some(e => e.name === item.name)) {
                        const cat = inferEquipCategory(item.name, item.description || '');
                        const entry = { name: item.name, notes: item.description || '', category: cat };
                        if (cat === 'weapon') Object.assign(entry, parseWeaponData(entry));
                        state.equipment.push(entry);
                    }
                });
                renderEquipment();
            }
        }

        saveState(); renderClassView(); renderProgression(); calcManaMax();
    }
    if (target === 'equipment') {
        const nameInput = document.getElementById('equip-name-input');
        const notesInput = document.getElementById('equip-notes-input');
        const name = nameInput?.value.trim();
        if (name) {
            const weapon = weaponsData.find(w => w.name.toLowerCase() === name.toLowerCase());
            const armor = armorData.find(a => a.name.toLowerCase() === name.toLowerCase());
            const notes = notesInput?.value.trim()
                || (weapon ? `${weapon.damage} ${weapon.damageType} · ${weapon.range}` : '')
                || (armor ? `${armor.armor} Armor${armor.checkBonus ? '; ' + armor.checkBonus : ''}` : '');
            const category = armor ? 'armor' : newEquipCat;
            const entry = { name: weapon?.name || armor?.name || name, notes, category };
            if (weapon) {
                Object.assign(entry, {
                    damage: weapon.damage, damageType: weapon.damageType,
                    check: weapon.check, range: weapon.range,
                    properties: weapon.properties, desc: weapon.description || '',
                    attackBonus: 0, critRange: 20,
                });
            } else if (armor) {
                Object.assign(entry, { armorRating: armor.armor || 0 });
            } else if (category === 'weapon') {
                Object.assign(entry, parseWeaponData(entry));
            }
            state.equipment.push(entry);
            if (nameInput) nameInput.value = '';
            if (notesInput) notesInput.value = '';
            setEquipCat('gear');
            if (category === 'armor') { recalcArmorBonuses(); renderEquipment(); }
            else { saveState(); renderEquipment(); }
        }
        return true;
    }
    if (target === 'classres') {
        const label = document.getElementById('class-res-label-input')?.value.trim() || 'Resource';
        const max = clampNum(document.getElementById('class-res-max-input')?.value);
        state.resources.classRes.label = label;
        state.resources.classRes.max = max;
        state.resources.classRes.current = Math.min(state.resources.classRes.current, max);
        // MN max is auto-calculated by calcManaMax() — not set manually here
        const display = document.getElementById('class-res-label-display');
        if (display) display.textContent = label;
        saveState(); syncUI();
    }
    if (target === 'gain' || target === 'prog-gain') {
        const inputId = target === 'prog-gain' ? 'prog-gain-input' : 'gain-input';
        const input = document.getElementById(inputId);
        const val = input?.value.trim();
        if (val) {
            state.progression.otherGains.push(val);
            if (input) input.value = '';
            saveState(); renderOtherGains();
        }
        return true;
    }
    return false;
}

// ── BIO ───────────────────────────────────────────────────────────────────────

function bindBio() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
        const payload = JSON.stringify({
            char: state.char,
            resources: state.resources,
            checks: state.checks,
            activeConditions: [...state.activeConditions],
            equipment: state.equipment,
            progression: state.progression,
        }, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.char.name || 'character'}-active-sheet.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    els.btnSaveBio?.addEventListener('click', () => {
        state.char.name = document.getElementById('char-name')?.value.trim() || '';
        state.char.level = clampNum(document.getElementById('char-level')?.value) || 1;
        state.char.age = document.getElementById('char-age')?.value.trim() || '';
        state.char.size = document.getElementById('char-size')?.value.trim() || '';
        state.char.diet = document.getElementById('char-diet')?.value.trim() || '';
        state.char.language = document.getElementById('char-language')?.value.trim() || '';
        state.char.motivation = document.getElementById('char-motivation')?.value.trim() || '';
        state.char.trinket = document.getElementById('char-trinket')?.value.trim() || '';
        saveState();
        syncTopbar();
        setActivePanel('play');
    });
}

function loyaltyVal(raw) {
    if (typeof raw === 'number') return Math.max(-5, Math.min(5, raw));
    const MAP = { Hostile: -5, Suspicious: -3, Wary: -1, Neutral: 0, Friendly: 2, Ally: 3, Loyal: 3, Devoted: 5 };
    return MAP[raw] ?? 0;
}
function loyaltyLabel(n) {
    if (n <= -4) return 'Hostile';
    if (n <= -2) return 'Suspicious';
    if (n === -1) return 'Wary';
    if (n === 0) return 'Neutral';
    if (n <= 2) return 'Friendly';
    if (n <= 4) return 'Loyal';
    return 'Devoted';
}
function loyaltyColor(n) {
    if (n <= -4) return '#e06060';
    if (n <= -2) return '#e89040';
    if (n === -1) return '#d4c44a';
    if (n === 0) return 'var(--muted)';
    if (n <= 2) return '#64b4dc';
    if (n <= 4) return '#6cc87a';
    return '#b080e0';
}

function renderNpcList() {
    const el = document.getElementById('npc-list');
    if (!el) return;
    const npcs = state.char.npcs || [];
    if (!npcs.length) { el.innerHTML = '<p class="empty-hint">No contacts added yet.</p>'; return; }
    el.innerHTML = npcs.map((npc, i) => {
        const n = loyaltyVal(npc.loyalty);
        const sign = n > 0 ? '+' : '';
        return `<div class="npc-entry">
            <div class="npc-info">
                <span class="npc-name">${npc.name}</span>
                <div class="npc-loyalty-row">
                    <button class="loyalty-adj loyalty-adj--sm" data-npc-loyalty="${i}" data-adj="-1" type="button">−</button>
                    <span class="npc-loyalty" style="color:${loyaltyColor(n)}">${loyaltyLabel(n)}</span>
                    <span class="loyalty-num">${sign}${n}</span>
                    <button class="loyalty-adj loyalty-adj--sm" data-npc-loyalty="${i}" data-adj="1" type="button">+</button>
                </div>
                ${npc.notes ? `<span class="npc-notes">${npc.notes}</span>` : ''}
            </div>
            <button class="step-action-btn" style="color:#ff6060" data-del-npc="${i}" type="button">✕</button>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-npc-loyalty]').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.npcLoyalty, 10);
            const adj = parseInt(btn.dataset.adj, 10);
            const npc = state.char.npcs[i];
            if (!npc) return;
            npc.loyalty = Math.max(-5, Math.min(5, loyaltyVal(npc.loyalty) + adj));
            saveState(); renderNpcList();
        });
    });
}

function bindBio() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
        const payload = JSON.stringify({
            char: state.char,
            resources: state.resources,
            checks: state.checks,
            activeConditions: [...state.activeConditions],
            equipment: state.equipment,
            progression: state.progression,
        }, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.char.name || 'character'}-active-sheet.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    els.btnSaveBio?.addEventListener('click', () => {
        state.char.name = document.getElementById('char-name')?.value.trim() || '';
        state.char.level = clampNum(document.getElementById('char-level')?.value) || 1;
        state.char.age = document.getElementById('char-age')?.value.trim() || '';
        state.char.size = document.getElementById('char-size')?.value.trim() || '';
        state.char.diet = document.getElementById('char-diet')?.value.trim() || '';
        state.char.language = document.getElementById('char-language')?.value.trim() || '';
        state.char.motivation = document.getElementById('char-motivation')?.value.trim() || '';
        state.char.trinket = document.getElementById('char-trinket')?.value.trim() || '';
        saveState();
        syncTopbar();
        setActivePanel('play');
    });

    // Notes — auto-save on blur
    document.getElementById('char-notes')?.addEventListener('blur', () => {
        state.char.notes = document.getElementById('char-notes')?.value || '';
        saveState();
    });
    document.getElementById('btn-save-notes')?.addEventListener('click', () => {
        state.char.notes = document.getElementById('char-notes')?.value || '';
        saveState();
    });

    // NPCs — loyalty stepper
    let _npcLoyalty = 0;
    function _updateNpcLoyaltyDisplay() {
        const disp = document.getElementById('npc-loyalty-display');
        const num  = document.getElementById('npc-loyalty-num');
        if (disp) { disp.textContent = loyaltyLabel(_npcLoyalty); disp.style.color = loyaltyColor(_npcLoyalty); }
        if (num)  num.textContent = `(${_npcLoyalty > 0 ? '+' : ''}${_npcLoyalty})`;
    }
    document.getElementById('npc-loyalty-dec')?.addEventListener('click', () => { _npcLoyalty = Math.max(-5, _npcLoyalty - 1); _updateNpcLoyaltyDisplay(); });
    document.getElementById('npc-loyalty-inc')?.addEventListener('click', () => { _npcLoyalty = Math.min(5,  _npcLoyalty + 1); _updateNpcLoyaltyDisplay(); });

    document.getElementById('btn-add-npc')?.addEventListener('click', () => {
        _npcLoyalty = 0; _updateNpcLoyaltyDisplay();
        document.getElementById('npc-add-form').hidden = false;
        document.getElementById('npc-name-input')?.focus();
    });
    document.getElementById('btn-npc-cancel')?.addEventListener('click', () => {
        document.getElementById('npc-add-form').hidden = true;
    });
    document.getElementById('btn-npc-save')?.addEventListener('click', () => {
        const name  = document.getElementById('npc-name-input')?.value.trim();
        const notes = document.getElementById('npc-notes-input')?.value.trim() || '';
        if (!name) return;
        if (!state.char.npcs) state.char.npcs = [];
        state.char.npcs.push({ name, loyalty: _npcLoyalty, notes });
        saveState();
        renderNpcList();
        document.getElementById('npc-add-form').hidden = true;
        document.getElementById('npc-name-input').value  = '';
        document.getElementById('npc-notes-input').value = '';
        _npcLoyalty = 0;
    });
    document.getElementById('npc-list')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-del-npc]');
        if (!btn) return;
        state.char.npcs.splice(parseInt(btn.dataset.delNpc, 10), 1);
        saveState();
        renderNpcList();
    });
}

function syncBioInputs() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    set('char-name', state.char.name);
    set('char-level', state.char.level);
    set('char-age', state.char.age);
    set('char-size', state.char.size);
    set('char-diet', state.char.diet);
    set('char-language', state.char.language);
    set('char-motivation', state.char.motivation);
    set('char-trinket', state.char.trinket);
    set('char-notes', state.char.notes);
    syncSpeciesDisplay();
    renderNpcList();
}

function syncTopbar() {
    if (els.topbarName) els.topbarName.textContent = state.char.name || '';
}

// ── PROGRESSION INTERACTIONS ──────────────────────────────────────────────────

function bindXpControls() {
    // Direct typed input — commit on blur or Enter
    const input = document.getElementById('xp-total-input');
    if (input) {
        const commit = () => {
            const val = parseInt(input.value, 10);
            if (!isNaN(val) && val >= 0) {
                state.progression.xp = val;
                saveState();
                updateXpDisplay();
                renderProgression();
            }
        };
        input.addEventListener('change', commit);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { commit(); input.blur(); } });
    }

    // Quick-add / quick-subtract buttons
    document.querySelector('.xp-stepper')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-xp-add]');
        if (!btn) return;
        state.progression.xp = Math.max(0, (state.progression.xp || 0) + Number(btn.dataset.xpAdd));
        saveState();
        updateXpDisplay();
        renderProgression();
    });
}

function bindProgressionPanel() {
    document.getElementById('panel-progression')?.addEventListener('change', e => {
        const cb = e.target.closest('.prog-checkbox');
        if (!cb) return;
        const type = cb.dataset.progType;
        const index = Number(cb.dataset.progIndex);

        if (cb.checked) {
            // XP gate
            if (getXpAvailable() < 20) {
                cb.checked = false;
                showProgError('Not enough XP — earn more to unlock this step.');
                return;
            }
            // Path: must unlock in order
            if (type === 'path' && index > 0 && !state.progression.pathChecked[index - 1]) {
                cb.checked = false;
                showProgError('Unlock the previous path step first.');
                return;
            }
        }

        if (type === 'path') state.progression.pathChecked[index] = cb.checked;
        if (type === 'talent') state.progression.talentChecked[index] = cb.checked;

        saveState();
        renderProgression();
        renderClassView();
        calcManaMax();
    });

    ['other-gains-list', 'prog-other-gains-list'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', e => {
            const btn = e.target.closest('[data-remove-gain]');
            if (!btn) return;
            state.progression.otherGains.splice(Number(btn.dataset.removeGain), 1);
            saveState(); renderOtherGains();
        });
    });

    document.getElementById('equip-list')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action } = btn.dataset;
        const idx = parseInt(btn.dataset.equipIndex ?? '-1', 10);
        const row = btn.closest('[data-equip-row]') ?? btn.closest('.row');

        // ── Delete: show inline confirm ──────────────────────────
        if (action === 'del-equip') {
            const name = state.equipment[idx]?.name || 'this item';
            row.innerHTML = `
                <div class="equip-info">
                    <div class="equip-row-name">Delete <strong>${name}</strong>?</div>
                </div>
                <div class="equip-row-actions">
                    <button class="step-edit-btn step-edit-btn--save" style="color:#ff6b6b;border-color:rgba(255,107,107,.35)"
                        data-action="del-equip-yes" data-equip-index="${idx}" type="button">Delete</button>
                    <button class="step-edit-btn step-edit-btn--cancel"
                        data-action="del-equip-no" type="button">Cancel</button>
                </div>`;
            return;
        }

        if (action === 'del-equip-yes') {
            const removed = state.equipment.splice(idx, 1)[0];
            if (removed?.category === 'armor') { recalcArmorBonuses(); renderEquipment(); }
            else { saveState(); renderEquipment(); }
            return;
        }

        if (action === 'del-equip-no') {
            renderEquipment();
            return;
        }

        // ── Armor edit: inline form ──────────────────────────────
        if (action === 'edit-equip') {
            const item = state.equipment[idx];
            if (!item) return;
            const isArmorItem = (item.category || '') === 'armor';
            const armorFields = isArmorItem ? `
                <div class="equip-edit-grid">
                    <label class="field">
                        <span class="field-label">Armor Rating</span>
                        <input type="number" class="equip-edit-rating" value="${item.armorRating || 0}" min="0" />
                    </label>
                    <label class="field">
                        <span class="field-label">Check Bonuses</span>
                        <input type="text" class="equip-edit-notes" value="${esc(item.notes || '')}" placeholder="Stealth -2, Agility -1…" />
                    </label>
                </div>` : `
                <label class="field">
                    <span class="field-label">Stats / Notes</span>
                    <input type="text" class="equip-edit-notes" value="${esc(item.notes || '')}" placeholder="1d6 Impact · Melee…" />
                </label>`;
            row.innerHTML = `<div class="equip-edit-form">
                <div class="step-edit-title">${item.name}</div>
                ${armorFields}
                <label class="field" style="margin-top:8px">
                    <span class="field-label">Description / Flavor</span>
                    <textarea class="step-edit-desc equip-edit-desc" rows="2">${esc(item.flavor || '')}</textarea>
                </label>
                <label class="step-edit-check">
                    <input type="checkbox" class="equip-edit-hideroll" ${item.hideRoll ? 'checked' : ''}> Hide roll button
                </label>
                <div class="step-edit-btns">
                    <button class="step-edit-btn step-edit-btn--save"
                        data-action="save-equip-edit" data-equip-index="${idx}" type="button">Save</button>
                    <button class="step-edit-btn step-edit-btn--cancel"
                        data-action="cancel-equip-edit" type="button">Cancel</button>
                </div>
            </div>`;
            return;
        }

        if (action === 'save-equip-edit') {
            const item = state.equipment[idx];
            if (!item) return;
            const isArmorItem = (item.category || '') === 'armor';
            if (isArmorItem) {
                item.armorRating = parseInt(row.querySelector('.equip-edit-rating')?.value || '0', 10) || 0;
                recalcArmorBonuses();
            }
            item.notes = row.querySelector('.equip-edit-notes')?.value?.trim() || '';
            item.flavor = row.querySelector('.equip-edit-desc')?.value?.trim() || '';
            item.hideRoll = row.querySelector('.equip-edit-hideroll')?.checked || false;
            saveState();
            renderEquipment();
            return;
        }

        if (action === 'cancel-equip-edit') {
            renderEquipment();
        }
    });

    // Equipment type toggle
    document.querySelector('.equip-type-toggle')?.addEventListener('click', e => {
        const btn = e.target.closest('.equip-type-btn');
        if (btn) setEquipCat(btn.dataset.cat);
    });

    // Auto-detect category + fill notes when a known item name is selected
    document.getElementById('equip-name-input')?.addEventListener('change', e => {
        const name = e.target.value.trim();
        const lower = name.toLowerCase();
        const weapon = weaponsData.find(w => w.name.toLowerCase() === lower);
        const armor = !weapon && armorData.find(a => a.name.toLowerCase() === lower);
        const notesEl = document.getElementById('equip-notes-input');
        if (weapon) {
            setEquipCat('weapon');
            if (notesEl && !notesEl.value) {
                notesEl.value = `${weapon.damage} ${weapon.damageType} · ${weapon.range}`;
            }
        } else if (armor) {
            setEquipCat('armor');
            if (notesEl && !notesEl.value) {
                notesEl.value = `${armor.armor} Armor${armor.checkBonus ? '; ' + armor.checkBonus : ''}`;
            }
        } else {
            setEquipCat(inferEquipCategory(name, notesEl?.value || ''));
        }
    });

    // Equipment category sub-tabs
    document.querySelector('.equip-tab-row')?.addEventListener('click', e => {
        const tab = e.target.closest('.equip-tab');
        if (!tab) return;
        equipTab = tab.dataset.equipTab;
        document.querySelectorAll('.equip-tab').forEach(t =>
            t.classList.toggle('is-active', t.dataset.equipTab === equipTab));
        renderEquipment();
    });

    // Shared handler for all step-action-btn (features + equipment) + section toggles
    document.addEventListener('click', e => {
        // Section collapse toggle
        const sectionToggle = e.target.closest('[data-section-toggle]');
        if (sectionToggle) {
            const key = sectionToggle.dataset.sectionToggle;
            sectionCollapsed[key] = !sectionCollapsed[key];
            renderClassView();
            return;
        }

        const btn = e.target.closest('.step-action-btn');
        if (!btn) return;
        const { action, name, desc, check } = btn.dataset;

        if (action === 'weapon-roll') {
            openWeaponModal(parseInt(btn.dataset.equipIndex, 10));
            return;
        }

        if (action === 'roll') {
            const checkTags = check ? check.split(',').map(s => s.trim()).filter(Boolean).map(s => `Check: ${s}`) : [];
            const extraTags = btn.dataset.extraTags ? btn.dataset.extraTags.split('|').filter(Boolean)
                : btn.dataset.tag ? [btn.dataset.tag] : [];
            openFeatureRollModal({ name, tags: [...extraTags, ...checkTags], desc: desc || '' });
            return;
        }

        if (action === 'chat') {
            const tags = check
                ? check.split(',').map(s => s.trim()).filter(Boolean).map(s => `Check: ${s}`)
                : [];
            pushChatFeature({ name, tags, desc });
            return;
        }

        if (action === 'edit') {
            const card = btn.closest('.step-card');
            if (!card) return;
            const featName = btn.dataset.featName;
            const override = state.char.featureOverrides?.[featName] || {};
            const curDesc = override.desc !== undefined ? override.desc
                : (card.querySelector('.step-desc')?.textContent || '');
            const curHide = override.hideRoll || false;
            card.innerHTML = `<div class="step-edit-form">
                <div class="step-edit-title">${featName}</div>
                <textarea class="step-edit-desc" rows="4">${curDesc}</textarea>
                <label class="step-edit-check">
                    <input type="checkbox" ${curHide ? 'checked' : ''}> Hide roll button
                </label>
                <div class="step-edit-btns">
                    <button class="step-action-btn step-edit-btn step-edit-btn--save"
                        data-action="save-edit" data-feat-name="${esc(featName)}" type="button">Save</button>
                    <button class="step-action-btn step-edit-btn step-edit-btn--cancel"
                        data-action="cancel-edit" type="button">Cancel</button>
                </div>
            </div>`;
            return;
        }

        if (action === 'save-edit') {
            const card = btn.closest('.step-card');
            if (!card) return;
            const featName = btn.dataset.featName;
            const textarea = card.querySelector('.step-edit-desc');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (!state.char.featureOverrides) state.char.featureOverrides = {};
            state.char.featureOverrides[featName] = {
                desc: textarea?.value ?? '',
                hideRoll: checkbox?.checked || false,
            };
            saveState();
            renderClassView();
            return;
        }

        if (action === 'cancel-edit') {
            renderClassView();
        }
    });

    // Check chip clicks inside drawer
    document.getElementById('drawer-check-chips')?.addEventListener('click', e => {
        const chip = e.target.closest('.drawer-check-chip');
        if (!chip) return;
        document.querySelectorAll('.drawer-check-chip').forEach(c => c.classList.remove('is-sel'));
        chip.classList.add('is-sel');
        els.rollMod.value = chip.dataset.checkMod;
        applyConditionRollType('.roll-seg', '#drawer-check-chips');
    });
}

// ── SYNC ──────────────────────────────────────────────────────────────────────

function calcDerived() {
    const get = key => {
        const all = [...state.checks.physical, ...state.checks.mental];
        return all.find(c => c.key === key)?.mod || 0;
    };
    const agi = get('agi');
    const str = get('str');
    const obs = get('obs');

    // Wounds max = Agility + Strength + manual bonus (class features, etc.)
    const wounds = agi + str + (state.resources.hp.bonus || 0);
    if (wounds > 0) {
        const wasBlank = state.resources.hp.max === 0 && state.resources.hp.current === 0;
        state.resources.hp.max = wounds;
        state.resources.hp.current = wasBlank
            ? wounds
            : Math.min(state.resources.hp.current, wounds);
    }

    // Speed = 30 + floor(Agility/2)*5 ft
    const speed = 30 + Math.floor(agi / 2) * 5;
    // Low Light Vision = 30 + floor(Observation/2)*5 ft
    const lowlight = 30 + Math.floor(obs / 2) * 5;

    const speedEl = document.getElementById('derived-speed');
    const lowlightEl = document.getElementById('derived-lowlight');
    if (speedEl) speedEl.textContent = `${speed} ft`;
    if (lowlightEl) lowlightEl.textContent = `${lowlight} ft`;

    // Sync the wounds display immediately
    if (els.hpMax) els.hpMax.textContent = state.resources.hp.max;
    if (els.hpCur) els.hpCur.textContent = state.resources.hp.current;
}

function renderCustomResEditorList() {
    const el = document.getElementById('custom-res-editor-list');
    if (!el) return;
    if (!state.resources.custom.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="custom-res-list">' + state.resources.custom.map(r =>
        `<div class="custom-res-row">
            <span class="custom-res-name">${r.label}</span>
            <span class="custom-res-range">(max ${r.max})</span>
            <button class="pill-del-btn" type="button" data-del-custom-res="${r.id}">✕</button>
        </div>`
    ).join('') + '</div>';
    el.querySelectorAll('[data-del-custom-res]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.resources.custom = state.resources.custom.filter(r => r.id !== btn.dataset.delCustomRes);
            saveState(); renderCustomResEditorList(); syncUI();
        });
    });
}

function renderCustomResPills() {
    const container = document.getElementById('custom-res-pills');
    if (!container) return;
    container.innerHTML = state.resources.custom.map(r => `
        <div class="resource-pill resource-pill--custom" data-resource-custom="${r.id}">
            <span class="pill-label">${r.label}</span>
            <div class="pill-value">
                <button class="pill-btn" data-action="dec" aria-label="Decrease ${r.label}">−</button>
                <output class="pill-num">${r.current}</output>
                <span class="pill-sep">/</span>
                <output class="pill-num pill-max">${r.max}</output>
                <button class="pill-btn" data-action="inc" aria-label="Increase ${r.label}">+</button>
            </div>
        </div>`).join('');
}

function syncUI() {
    els.hpCur.textContent = state.resources.hp.current;
    els.hpMax.textContent = state.resources.hp.max;
    els.armorCur.textContent = state.resources.armor.current;
    els.armorMax.textContent = state.resources.armor.max;
    els.MNCur.textContent = state.resources.MN.current;
    els.MNMax.textContent = state.resources.MN.max;
    const spMnCur = document.getElementById('spell-mn-current');
    const spMnMax = document.getElementById('spell-mn-max');
    if (spMnCur) spMnCur.textContent = state.resources.MN.current;
    if (spMnMax) spMnMax.textContent = state.resources.MN.max;
    if (els.classResCur) els.classResCur.textContent = state.resources.classRes.current;
    if (els.classResMax) els.classResMax.textContent = state.resources.classRes.max;
    const labelDisplay = document.getElementById('class-res-label-display');
    if (labelDisplay) labelDisplay.textContent = state.resources.classRes.label;
    renderCustomResPills();
    calcDerived();
    renderLogs();
}

// ── LOGS ──────────────────────────────────────────────────────────────────────

function renderLogs() {
    if (els.mainLog) {
        els.mainLog.innerHTML = '';
        state.rollLog.slice(0, 8).forEach(line => {
            const li = document.createElement('li'); li.textContent = line; els.mainLog.appendChild(li);
        });
    }
}

function pushRollLog(line) { state.rollLog.unshift(line); if (state.rollLog.length > 20) state.rollLog.length = 20; }

// ── DICE UTILITIES ────────────────────────────────────────────────────────────

function rollDiceNotation(raw) {
    const clean = raw.replace(/\[\[|\]\]/g, '').trim();
    const m = clean.match(/^(\d+)d(\d+)(!?)([+-]\d+)?$/i);
    if (!m) return null;
    const count = parseInt(m[1]);
    const sides = parseInt(m[2]);
    const explode = !!m[3];
    const bonus = m[4] ? parseInt(m[4]) : 0;
    const rolls = [];
    for (let i = 0; i < count; i++) {
        let r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        if (explode) while (r === sides) { r = Math.floor(Math.random() * sides) + 1; rolls.push(r); }
    }
    const total = rolls.reduce((a, b) => a + b, 0) + bonus;
    return { notation: clean, rolls, bonus, total };
}

function parseDiceFromText(text) {
    if (!text) return [];
    const cleaned = text.replace(/\[\[|\]\]/g, '');
    const results = [];
    const re = /\b(\d+d\d+[!]?(?:[+-]\d+)?)\b/gi;
    let m;
    while ((m = re.exec(cleaned)) !== null) {
        const r = rollDiceNotation(m[1]);
        if (r) results.push(r);
    }
    return results;
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
// diceChipsHtml / fmtSigned are in chat-cards.js
function clampNum(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }

// ── BOOT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    cacheEls();
    bindNav();
    bindResources();
    renderConditions();
    renderQuickChecks();
    bindDrawer();
    bindBio();
    bindSectionEditors();
    bindWeaponModal();
    bindFeatureRollModal();
    bindSettings();
    bindSpellsPanel();
    bindSpellRollModal();
    bindRefPanel();
    bindRecovery();
    applyTheme();
    bindPlayTabs();
    syncConditionsBar();
    bindSpeciesPicker();
    syncSpeciesDisplay();
    bindFeatTabs();
    renderSpeciesView();
    bindXpControls();
    bindProgressionPanel();
    syncUI();
    syncBioInputs();
    syncTopbar();
    renderEquipment();
    renderOtherGains();
    renderChat();
    bindDiceRoller();
    loadClassData();
    loadSpells();
    loadWeapons();     // calls recalcArmorBonuses() internally after armorData loads
    recalcArmorBonuses(); // initial pass with cached armorRating fields (before fetch)
    updateXpDisplay();
    // Close drawer cleanly on boot (ensure inert state matches)
    closeDrawer();
});
