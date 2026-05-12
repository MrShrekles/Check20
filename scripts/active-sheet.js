/* Active Sheet — mobile-first gameplay runner */

const DATA_BASE = window.location.pathname.includes('/active-sheet/') ? '../data/' : 'data/';

// ── CHECKS ────────────────────────────────────────────────────────────────────

const CHECKS = {
    physical: [
        { key: 'agi', label: 'Agility',   mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'cra', label: 'Crafting',  mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'ste', label: 'Stealth',   mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'str', label: 'Strength',  mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'sur', label: 'Survival',  mod: 0, bonus: 0, armorBonus: 0 },
    ],
    mental: [
        { key: 'inf', label: 'Influence',   mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'int', label: 'Intellect',   mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'lck', label: 'Luck',        mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'obs', label: 'Observation', mod: 0, bonus: 0, armorBonus: 0 },
        { key: 'spi', label: 'Spirit',      mod: 0, bonus: 0, armorBonus: 0 },
    ],
};

const CONDITION_GROUPS = {
    'Corpus':    ['Bleeding','Broken','Concussion','Coughing','Dislocation','Pinned','Prone','Slowed'],
    'Cognition': ['Blind','Charmed','Confused','Deaf','Fear'],
    'Special':   ['Intangible','Invisible'],
    'Major':     ['Constrained','Exhaustion','Exposed','Injured','Stunned','Unconscious'],
};

const CONDITION_EFFECTS = {
    'Bleeding':    'Cannot heal or recover wounds',
    'Broken':      'Physical checks: Disadvantage',
    'Concussion':  'Mental & Spell checks: Disadvantage',
    'Coughing':    'Mental checks: Disadvantage',
    'Dislocation': 'Physical checks: Disadvantage',
    'Slowed':      'Movement: Halved',
    'Pinned':      'Ranged attacks: Disadvantage',
    'Prone':       'Cannot move until source removed',
    'Blind':       'Attack rolls: Disadvantage — Attacks vs you: Advantage',
    'Charmed':     'Mental checks: Disadvantage — Cannot attack charm source',
    'Confused':    'Mental & Spell checks: Disadvantage',
    'Deaf':        'Stealth & Spell checks: Disadvantage',
    'Fear':        'Must dash or hide — Cannot approach source',
    'Intangible':  'Cannot attack — Movement: Halved',
    'Invisible':   'Attacks vs you: Disadvantage',
    'Constrained': 'Cannot make attack actions — Attacks vs you: Advantage',
    'Exhaustion':  'All checks: Disadvantage — Movement: Halved',
    'Exposed':     'Incoming damage: Doubled',
    'Injured':     'Any damage triggers Death condition',
    'Stunned':     'All checks: Disadvantage — Movement: Halved',
    'Unconscious': 'Cannot act — Vulnerable to crits & Finishers',
};

// ── STATE ─────────────────────────────────────────────────────────────────────

const state = {
    char: {
        name: '', level: 1,
        species: '', age: '', size: '', diet: '', language: '', motivation: '',
        classKey: '', pathName: '', talentName: '',
        speciesLineage:    '',
        speciesFeature:    null,  // { name, effect, action, check }
        speciesSubFeature: null,  // { name, effect }
        trinket:           '',
        wealth:            0,
        featureOverrides:  {},   // { [featureName]: { desc?: string, hideRoll?: bool } }
        theme: { a1: '', a2: '' }, // per-character dual accent colors
    },
    resources: {
        hp:       { current: 0, max: 0 },
        armor:    { current: 0, max: 0 },
        MN:       { current: 0, max: 0 },
        classRes: { current: 0, max: 0, label: 'Resource' },
    },
    checks:           structuredClone(CHECKS),
    activeConditions: new Set(),
    equipment:        [],
    progression: {
        pathChecked:   {},
        talentChecked: {},
        otherGains:    [],
        xp:            0,
    },
    chat:    [],  // [{ type: 'roll'|'msg', text, time }]
    rollLog: [],
};

// ── XP HELPERS ────────────────────────────────────────────────────────────────

function getXpSpent() {
    const p = Object.values(state.progression.pathChecked   || {}).filter(Boolean).length;
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

    const totalEl  = document.getElementById('xp-total-el');
    const spentEl  = document.getElementById('xp-spent-el');
    const availEl  = document.getElementById('xp-avail-el');
    const fillEl   = document.getElementById('xp-fill');
    const inputEl  = document.getElementById('xp-total-input');

    if (totalEl) totalEl.textContent = total;
    if (spentEl) spentEl.textContent = spent;
    if (availEl) {
        availEl.textContent = avail;
        availEl.className   = `xp-num xp-num--avail${avail >= 20 ? ' xp-num--ready' : ''}`;
    }
    if (fillEl) fillEl.style.width = total > 0 ? `${Math.min(100, (spent / total) * 100)}%` : '0%';
    // Sync input field (skip if it currently has focus to avoid clobbering typing)
    if (inputEl && document.activeElement !== inputEl) inputEl.value = total;
}

// ── EQUIPMENT CATEGORY INFERENCE ─────────────────────────────────────────────

function inferEquipCategory(name, notes) {
    const n = (name  || '').toLowerCase();
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
        const m  = notes.match(re);
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

function recalcArmorMax() {
    const total = state.equipment
        .filter(e => e.category === 'armor')
        .reduce((sum, item) => sum + armorRatingFor(item), 0);
    state.resources.armor.max     = total;
    state.resources.armor.current = Math.min(state.resources.armor.current, total || state.resources.armor.current);
    const curEl = document.getElementById('armor-current');
    const maxEl = document.getElementById('armor-max');
    if (curEl) curEl.textContent = state.resources.armor.current;
    if (maxEl) maxEl.textContent = total;
}

function recalcArmorBonuses() {
    const allChecks = [...state.checks.physical, ...state.checks.mental];
    allChecks.forEach(c => { c.armorBonus = 0; });
    state.equipment.filter(e => e.category === 'armor').forEach(item => {
        const mods = parseArmorMods(item.notes || '');
        Object.entries(mods).forEach(([key, val]) => {
            const chk = allChecks.find(c => c.key === key);
            if (chk) chk.armorBonus += val;
        });
    });
    recalcArmorMax();
    renderQuickChecks();
    saveState();
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
let classOptData  = {};
let weaponsData   = [];
let armorData     = [];

async function loadClassData() {
    try {
        const [baseRes, optRes] = await Promise.all([
            fetch(DATA_BASE + 'classes.json'),
            fetch(DATA_BASE + 'class-new.json'),
        ]);
        const baseJson = await baseRes.json();
        const optJson  = await optRes.json();
        classBaseData = baseJson?.classes || [];
        classOptData  = optJson?.classes  || {};
        populateClassSelect();
        if (state.char.classKey) {
            populatePathTalentSelects(state.char.classKey);
            renderClassView();
            renderProgression();
        }
    } catch (e) { console.warn('Could not load class data', e); }
}

async function loadWeapons() {
    try {
        const [wRes, aRes] = await Promise.all([
            fetch(DATA_BASE + 'weapons.json'),
            fetch(DATA_BASE + 'armor.json'),
        ]);
        weaponsData = await wRes.json();
        armorData   = await aRes.json();

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
    const entries   = getClassEntries(className);
    const pathSel   = document.getElementById('path-select');
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

const DAMAGE_TYPES = ['Impact','Piercing','Slashing','Solar','Acid','Eclipse','Fire','Ice','Lightning','Thunder','Toxic','Fluid','Nature','Psychic','Vozian','Healing'];
const RANGES       = ['Melee','Reach','Short','Medium','Long','Visible'];

function parseWeaponData(item) {
    if (item.damage !== undefined) return item; // already structured
    const notes = item.notes || '';
    const dmgMatch  = notes.match(/(\d+d\d+[!]?(?:[+-]\d+)?)/i);
    const damage    = dmgMatch ? dmgMatch[1] : '';
    const damageType = DAMAGE_TYPES.find(t => notes.includes(t)) || '';
    const range      = RANGES.find(r => notes.includes(r)) || '';
    const foundChecks = ['Agility','Crafting','Influence','Intellect','Luck','Observation','Spirit','Stealth','Strength','Survival'].filter(c => notes.includes(c));
    const check      = foundChecks.join(', ');
    const isHefty    = /hefty|heavy/i.test(notes);
    const isLight    = /\blight\b/i.test(notes);
    const properties = isHefty ? 'Hefty' : isLight ? 'Light' : '—';
    return { ...item, damage, damageType, range, check, properties, desc: item.desc || item.notes || '' };
}

let weaponModalItem  = null;
let weaponModalIndex = -1;

function openWeaponModal(itemIndex) {
    const raw = state.equipment[itemIndex];
    if (!raw) return;
    const w = parseWeaponData(raw);
    weaponModalItem  = w;
    weaponModalIndex = itemIndex;

    document.getElementById('wm-name').textContent = w.name;
    document.getElementById('wm-sub').textContent  = [w.properties, w.range].filter(x => x && x !== '—').join(' · ');
    document.getElementById('wm-damage').textContent   = w.damage     || '—';
    document.getElementById('wm-dmg-type').textContent = w.damageType || '—';
    document.getElementById('wm-range').textContent    = w.range      || '—';
    document.getElementById('wm-weight').textContent   = w.properties || '—';
    document.getElementById('wm-crit').value  = w.critRange   || 20;
    document.getElementById('wm-bonus').value = w.attackBonus || 0;

    const descEl = document.getElementById('wm-desc');
    descEl.value = w.flavor || '';

    // Check chips from state
    const chipsEl   = document.getElementById('wm-check-chips');
    const checkList = w.check ? w.check.split(',').map(s => s.trim()).filter(Boolean) : [];
    const matched   = [...state.checks.physical, ...state.checks.mental]
        .filter(c => checkList.some(n => n.toLowerCase() === c.label.toLowerCase()));

    if (matched.length) {
        chipsEl.innerHTML = matched.map((c, i) => {
            const total = c.mod + (c.bonus || 0) + (c.armorBonus || 0);
            return `<button class="drawer-check-chip${i === 0 ? ' is-sel' : ''}"
                type="button" data-check-mod="${total}" data-check-label="${c.label}">
                ${c.label} ${fmtSigned(total)}</button>`;
        }).join('');
    } else {
        chipsEl.innerHTML = `<span style="font-size:12px;color:var(--muted)">No check specified</span>`;
    }

    // Reset roll seg to flat
    document.querySelectorAll('#wm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
    document.querySelector('#wm-roll-seg [data-seg="flat"]')?.classList.add('is-sel');

    document.getElementById('weapon-modal').hidden = false;
}

function closeWeaponModal() {
    if (weaponModalIndex >= 0 && state.equipment[weaponModalIndex]) {
        state.equipment[weaponModalIndex].flavor =
            document.getElementById('wm-desc')?.value?.trim() || '';
        saveState();
    }
    document.getElementById('weapon-modal').hidden = true;
    weaponModalItem  = null;
    weaponModalIndex = -1;
}

function bindWeaponModal() {
    document.getElementById('wm-close')?.addEventListener('click', closeWeaponModal);
    document.getElementById('wm-scrim')?.addEventListener('click', closeWeaponModal);

    document.getElementById('wm-check-chips')?.addEventListener('click', e => {
        const chip = e.target.closest('.drawer-check-chip');
        if (!chip) return;
        document.querySelectorAll('#wm-check-chips .drawer-check-chip').forEach(c => c.classList.remove('is-sel'));
        chip.classList.add('is-sel');
    });

    document.getElementById('wm-roll-seg')?.addEventListener('click', e => {
        const btn = e.target.closest('.roll-seg-btn');
        if (!btn) return;
        document.querySelectorAll('#wm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
        btn.classList.add('is-sel');
    });

    document.getElementById('wm-roll')?.addEventListener('click', () => {
        if (!weaponModalItem) return;
        const selChip    = document.querySelector('#wm-check-chips .drawer-check-chip.is-sel');
        const checkMod   = selChip ? parseInt(selChip.dataset.checkMod,   10) : 0;
        const checkLabel = selChip ? selChip.dataset.checkLabel : 'Check';
        const rollType   = document.querySelector('#wm-roll-seg .roll-seg-btn.is-sel')?.dataset.seg || 'flat';
        const atkBonus   = parseInt(document.getElementById('wm-bonus')?.value || '0', 10) || 0;

        const r = () => Math.floor(Math.random() * 20) + 1;
        let d20, rollNote;
        if (rollType === 'adv') { const a=r(),b=r(); d20=Math.max(a,b); rollNote=`adv(${a},${b})`; }
        else if (rollType === 'dis') { const a=r(),b=r(); d20=Math.min(a,b); rollNote=`dis(${a},${b})`; }
        else { d20=r(); rollNote=`d20(${d20})`; }

        pushChatWeaponAttack({
            weapon:      weaponModalItem,
            checkLabel,
            checkMod,
            attackBonus: atkBonus,
            rollNote,
            d20Total:    d20 + checkMod + atkBonus,
            damageRoll:  weaponModalItem.damage ? rollDiceNotation(weaponModalItem.damage) : null,
            rollType,
            conditions:  [...state.activeConditions],
        });
        closeWeaponModal();
    });
}

function pushChatWeaponAttack({ weapon, checkLabel, checkMod, attackBonus, rollNote, d20Total, damageRoll, rollType, conditions }) {
    state.chat.unshift({
        type:        'weapon-attack',
        time:        chatTimestamp(),
        charName:    state.char.name || '',
        weaponName:  weapon.name,
        checkLabel,  checkMod, attackBonus,
        rollNote,    d20Total,
        damageRoll,
        damage:      weapon.damage,
        damageType:  weapon.damageType,
        range:       weapon.range,
        desc:        weapon.desc || '',
        rollType,
        conditions:  [...(conditions || [])],
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
}

function renderWeaponAttackEntry(entry) {
    const nat      = naturalRoll(entry.rollNote);
    const resClass = nat === 20 ? 'chat-res--nat20' : nat === 1 ? 'chat-res--nat1' : '';
    const typeLbl  = entry.rollType === 'adv' ? '· Adv' : entry.rollType === 'dis' ? '· Dis' : '';
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
        ${entry.desc ? `${expandableDesc(entry.desc)}` : ''}
        ${condHtml}
    </div>`;
}

// ── FEATURE ROLL MODAL ────────────────────────────────────────────────────────

const frm = { feature: null };

function openFeatureRollModal({ name, tags, desc }) {
    const checkTag    = tags.find(t => t.startsWith('Check:'));
    const checkLabel  = checkTag ? checkTag.replace('Check:', '').trim() : '';
    const displayTags = tags.filter(t => !t.startsWith('Check:') && !t.startsWith('Dmg:'));

    const dmgTag = tags.find(t => t.startsWith('Dmg:'));
    let damageNotation = '', damageType = '';
    if (dmgTag) {
        const dmgStr    = dmgTag.slice(4).trim();
        const diceMatch = dmgStr.match(/(\d+d\d+[!]?(?:[+-]\d+)?)/i);
        if (diceMatch) damageNotation = diceMatch[1];
        damageType = DAMAGE_TYPES.find(t => dmgStr.toLowerCase().includes(t.toLowerCase())) || '';
    }
    if (!damageNotation) {
        const parsed = parseDiceFromText(desc);
        if (parsed.length) damageNotation = parsed[0].notation;
    }

    frm.feature = { name, tags, checkLabel, displayTags };

    document.getElementById('frm-name').textContent         = name;
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
    document.getElementById('frm-dmg-type').value     = damageType;
    document.getElementById('frm-desc-input').value   = desc || '';
    document.getElementById('frm-bonus').value         = 0;

    document.querySelectorAll('#frm-roll-seg .roll-seg-btn').forEach(b => b.classList.remove('is-sel'));
    document.querySelector('#frm-roll-seg [data-seg="flat"]')?.classList.add('is-sel');

    // Hide the unused results area and send button — rolling goes straight to chat
    document.getElementById('frm-results').hidden = true;
    document.getElementById('frm-send').hidden    = true;
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
        const selChip  = document.querySelector('#frm-check-chips .drawer-check-chip.is-sel');
        const checkMod = selChip ? parseInt(selChip.dataset.checkMod, 10) : 0;
        const checkLbl = selChip ? selChip.dataset.checkLabel : 'Check';
        const rollType = document.querySelector('#frm-roll-seg .roll-seg-btn.is-sel')?.dataset.seg || 'flat';
        const bonus    = parseInt(document.getElementById('frm-bonus')?.value || '0', 10) || 0;
        const notation = document.getElementById('frm-dmg-notation')?.value?.trim() || '';
        const dmgType  = document.getElementById('frm-dmg-type')?.value?.trim() || '';
        const desc     = document.getElementById('frm-desc-input')?.value?.trim() || '';

        const r = () => Math.floor(Math.random() * 20) + 1;
        let d20, rollNote;
        if (rollType === 'adv')      { const a=r(),b=r(); d20=Math.max(a,b); rollNote=`adv(${a},${b})`; }
        else if (rollType === 'dis') { const a=r(),b=r(); d20=Math.min(a,b); rollNote=`dis(${a},${b})`; }
        else                         { d20=r(); rollNote=`d20(${d20})`; }

        const total     = d20 + checkMod + bonus;
        const diceRolls = notation ? [rollDiceNotation(notation)] : [];
        const allTags   = [
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
        const dmgType  = document.getElementById('frm-dmg-type')?.value?.trim() || '';
        const desc     = document.getElementById('frm-desc-input')?.value?.trim() || '';
        const dmg      = rollDiceNotation(notation);
        dmg.type       = dmgType;

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

// ── SETTINGS & THEME ──────────────────────────────────────────────────────────

const COLOR_PRESETS = [
    { name: 'Steel',   color: '#6b9cc8' },
    { name: 'Void',    color: '#9b72cf' },
    { name: 'Ember',   color: '#c4622d' },
    { name: 'Neon',    color: '#4dba94' },
    { name: 'Crimson', color: '#c43250' },
    { name: 'Gold',    color: '#c9a227' },
    { name: 'Acid',    color: '#89bf50' },
    { name: 'Frost',   color: '#7fc4d4' },
];

// Keep THEMES for applyTheme default fallback
const THEMES = [{ a1: COLOR_PRESETS[0].color, a2: COLOR_PRESETS[2].color }];

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return { r, g, b };
}

function applyTheme() {
    const t    = state.char.theme || {};
    const def  = THEMES[0];
    const a1   = t.a1 || t.accent || def.a1;
    const a2   = t.a2 || def.a2;
    const c1   = hexToRgb(a1), c2 = hexToRgb(a2);
    const root = document.documentElement;
    root.style.setProperty('--accent',      a1);
    root.style.setProperty('--accent-dim',  `rgba(${c1.r},${c1.g},${c1.b},0.18)`);
    root.style.setProperty('--accent-mid',  `rgba(${c1.r},${c1.g},${c1.b},0.38)`);
    root.style.setProperty('--accent2',     a2);
    root.style.setProperty('--accent2-dim', `rgba(${c2.r},${c2.g},${c2.b},0.18)`);
    root.style.setProperty('--accent2-mid', `rgba(${c2.r},${c2.g},${c2.b},0.38)`);

    // Sync swatch selection
    const current = JSON.stringify({ a1, a2 });
    document.querySelectorAll('.theme-pair-btn').forEach(btn =>
        btn.classList.toggle('is-sel',
            JSON.stringify({ a1: btn.dataset.a1, a2: btn.dataset.a2 }) === current));
}

function swatchRow(key, selected) {
    return `<div class="color-row" data-theme-key="${key}">
        ${COLOR_PRESETS.map(p =>
            `<button class="color-swatch${p.color === selected ? ' is-sel' : ''}"
                type="button" data-color="${p.color}" title="${p.name}"
                style="background:${p.color}"></button>`
        ).join('')}
    </div>`;
}

function openSettings() {
    const container = document.getElementById('theme-swatches');
    if (container) {
        const t   = state.char.theme || {};
        const ca1 = t.a1 || t.accent || THEMES[0].a1;
        const ca2 = t.a2 || THEMES[0].a2;
        container.innerHTML = `
            <div class="wm-label" style="margin-bottom:6px">Primary</div>
            ${swatchRow('a1', ca1)}
            <div class="wm-label" style="margin:12px 0 6px">Secondary</div>
            ${swatchRow('a2', ca2)}`;
    }
    // Reset the reset-confirmation state each time panel opens
    document.getElementById('reset-confirm').hidden      = true;
    document.getElementById('btn-reset-char').hidden     = false;
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

    document.getElementById('theme-swatches')?.addEventListener('click', e => {
        const btn = e.target.closest('.color-swatch');
        if (!btn) return;
        const row   = btn.closest('.color-row');
        const key   = row?.dataset.themeKey;
        const color = btn.dataset.color;
        const t     = state.char.theme || {};
        const a1    = t.a1 || t.accent || THEMES[0].a1;
        const a2    = t.a2 || THEMES[0].a2;
        setTheme(key === 'a1' ? color : a1, key === 'a2' ? color : a2);
        row.querySelectorAll('.color-swatch').forEach(s =>
            s.classList.toggle('is-sel', s === btn));
    });

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
        const res  = await fetch(DATA_BASE + 'species_new.json');
        const json = await res.json();
        allSpeciesData = json?.species || [];
    } catch (e) { console.warn('Could not load species data', e); }
}

// Picker internal state
const sp = { level: 'lineage', lineage: '', option: '', selName: '', selObj: null };

function spShowLevel(level) {
    ['lineage','option','species'].forEach(l =>
        document.getElementById(`sp-lv-${l}`).hidden = l !== level
    );
    sp.level = level;
    const backBtn  = document.getElementById('sp-back');
    const titleEl  = document.getElementById('sp-title');
    const confirm_ = document.getElementById('sp-confirm');
    backBtn.hidden = level === 'lineage';
    titleEl.textContent =
        level === 'lineage' ? 'Choose Lineage' :
        level === 'option'  ? sp.lineage :
        sp.option || sp.lineage;
    confirm_.disabled = !sp.selObj;
}

function spBuildLineageGrid() {
    const lineages = [...new Set(allSpeciesData.map(s => s.lineage))].sort();
    document.getElementById('sp-lineage-grid').innerHTML = lineages.map(l => {
        const count   = allSpeciesData.filter(s => s.lineage === l).length;
        const options = [...new Set(allSpeciesData.filter(s => s.lineage === l).map(s => s.option))];
        const sub     = options.length > 1 ? `${options.length} types` : (options[0] || '');
        return `<button class="sp-card${l === sp.lineage ? ' is-sel' : ''}"
                    type="button" data-sp-lineage="${l}">
                    <div class="sp-card-name">${l}</div>
                    <div class="sp-card-meta">${sub} · ${count} species</div>
                </button>`;
    }).join('');
}

function spEnterLineage(lineage) {
    sp.lineage = lineage;
    sp.option  = '';
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
                <span class="sp-species-name">${s.name}</span>
                <span class="sp-species-rarity">${s.rarity || ''}</span>
            </div>
            ${s.feature_name ? `<div class="sp-species-trait">${s.feature_name}</div>` : ''}
        </button>`).join('');
    spRenderDetail();
}

function spRenderDetail() {
    const el = document.getElementById('sp-species-detail');
    const s  = sp.selObj;
    if (!el) return;
    if (!s) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `
        <div class="sp-detail-name">${s.name}</div>
        <p class="sp-detail-desc">${s.description.slice(0, 200)}…</p>
        <div class="sp-detail-facts">
            ${s.size     ? `<span>Size: ${s.size}</span>`         : ''}
            ${s.diet     ? `<span>Diet: ${s.diet}</span>`         : ''}
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
    state.char.species         = s.name;
    state.char.speciesLineage  = s.lineage || '';
    state.char.size            = s.size    || state.char.size;
    state.char.diet            = s.diet    || state.char.diet;
    state.char.language        = s.language || state.char.language;
    state.char.speciesFeature  = s.feature_name ? {
        name:   s.feature_name,
        effect: s.feature_effect || '',
        action: s.fetAction || 'Passive',
        check:  s.fetCheck  || '',
    } : null;
    state.char.speciesSubFeature = s['sub-fet-name'] ? {
        name:   s['sub-fet-name'],
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
    const subEl  = document.getElementById('bio-species-sub');
    if (nameEl) nameEl.textContent = state.char.species || '—';
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
        sp.selObj  = allSpeciesData.find(s => s.name === sp.selName) || null;
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
            if (target === 'other') renderSpeciesView();
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
    const sf  = state.char.speciesFeature;
    const ssf = state.char.speciesSubFeature;
    el.innerHTML = `
        <div class="species-display-head">
            <span class="species-display-name">${state.char.species}</span>
            <span class="species-display-meta">${[state.char.speciesLineage, state.char.size].filter(Boolean).join(' · ')}</span>
        </div>
        ${sf  ? renderStepCard({ name: sf.name,  description: sf.effect,  action: sf.action, check: sf.check }) : ''}
        ${ssf ? renderStepCard({ name: ssf.name, description: ssf.effect, action: 'Passive' })                  : ''}`;
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
    const base    = classBaseData.find(c => c.name === state.char.classKey) || {};
    const entries = getClassEntries(state.char.classKey);
    const pathEntry   = state.char.pathName   ? entries.find(e => e.name === state.char.pathName)   : null;
    const talentEntry = state.char.talentName ? entries.find(e => e.name === state.char.talentName) : null;

    const pathInit   = pathEntry?.path?.steps?.filter(s => Number(s.step) === 0)   || [];
    const talentInit = talentEntry?.talent?.steps?.filter(s => Number(s.step) === 0) || [];

    // Progression non-zero steps — unlocked ones appear under their own section
    const pathProgSteps   = pathEntry?.path?.steps?.filter(s => Number(s.step) !== 0)   || [];
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
              name:        f.name,
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
            ${state.char.classKey   ? `<span class="feature-badge">${state.char.classKey}</span>`   : ''}
            ${state.char.pathName   ? `<span class="feature-badge">${state.char.pathName}</span>`   : ''}
            ${state.char.talentName ? `<span class="feature-badge">${state.char.talentName}</span>` : ''}
        </div>
        ${sectionBlock('class',  `Class — ${state.char.classKey}`,   classCards)}
        ${sectionBlock('path',   `Path — ${state.char.pathName}`,     pathCards)}
        ${sectionBlock('talent', `Talent — ${state.char.talentName}`, talentCards)}`;
}

function esc(str) { return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function renderStepCard(s) {
    const name     = s?.name || '';
    const override = state.char.featureOverrides?.[name] || {};
    const desc     = override.desc !== undefined ? override.desc : (s?.description || '');
    const hideRoll = override.hideRoll || false;
    const check    = s?.check || '';
    const tags     = [];
    if (s?.action)   tags.push(s.action);
    if (s?.check)    tags.push(`Check: ${s.check}`);
    if (s?.range)    tags.push(`Range: ${s.range}`);
    if (s?.damage !== undefined && s.damage !== '') tags.push(`Dmg: ${s.damage}${s.damageType ? ` (${s.damageType})` : ''}`);

    const isPassive   = (s?.action || '').toLowerCase() === 'passive' || (!s?.action && !check);
    const extraTags   = tags.filter(t => !t.startsWith('Check:')).join('|');

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
                    data-check="${esc(check)}">🎲</button>` : ''}
                <button class="step-action-btn" type="button" title="Send to chat"
                    data-action="chat"
                    data-name="${esc(name)}"
                    data-desc="${esc(desc)}">💬</button>
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
    const pathEl   = document.getElementById('path-progression-list');
    const talentEl = document.getElementById('talent-progression-list');
    if (!pathEl || !talentEl) return;

    const entries     = getClassEntries(state.char.classKey);
    const pathEntry   = state.char.pathName   ? entries.find(e => e.name === state.char.pathName)   : null;
    const talentEntry = state.char.talentName ? entries.find(e => e.name === state.char.talentName) : null;

    const pathSteps   = pathEntry?.path?.steps?.filter(s => Number(s.step) !== 0)   || [];
    const talentSteps = talentEntry?.talent?.steps?.filter(s => Number(s.step) !== 0) || [];

    pathEl.innerHTML   = pathSteps.length
        ? pathSteps.map((s, i) => renderProgStep(s, i, 'path')).join('')
        : '<p class="empty-hint">Select a path in Features</p>';

    talentEl.innerHTML = talentSteps.length
        ? talentSteps.map((s, i) => renderProgStep(s, i, 'talent')).join('')
        : '<p class="empty-hint">Select a talent in Features</p>';

    updateXpDisplay();
}

function renderProgStep(s, index, type) {
    const checked    = type === 'path'
        ? !!state.progression.pathChecked[index]
        : !!state.progression.talentChecked[index];
    const canAfford  = getXpAvailable() >= 20;

    // Path: previous step must be unlocked first
    const prevOk = type !== 'path' || index === 0 || !!state.progression.pathChecked[index - 1];
    const outOfOrder = type === 'path' && !checked && !prevOk;
    const locked     = !checked && (!canAfford || outOfOrder);

    let badge;
    if (checked)          badge = '<span class="prog-badge prog-badge--done">✓ Unlocked</span>';
    else if (outOfOrder)  badge = '<span class="prog-badge prog-badge--locked">🔒 Unlock previous first</span>';
    else if (!canAfford)  badge = '<span class="prog-badge prog-badge--locked">🔒 20 XP</span>';
    else                  badge = '<span class="prog-badge prog-badge--cost">20 XP</span>';

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
    const el = document.getElementById('other-gains-list');
    if (!el) return;
    el.innerHTML = state.progression.otherGains.length
        ? state.progression.otherGains.map((g, i) => `
            <div class="row">
                <span class="check-row-label">${g}</span>
                <button class="check-adj" data-remove-gain="${i}" style="color:#ff6060" aria-label="Remove">✕</button>
            </div>`).join('')
        : '<p class="empty-hint">Items gained during play</p>';
}

// ── EQUIPMENT ─────────────────────────────────────────────────────────────────

let equipTab              = 'all';
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
        el.innerHTML = `<p class="empty-hint">${
            state.equipment.length ? `No ${equipTab} items` : 'No equipment added'
        }</p>`;
        return;
    }

    el.innerHTML = visible.map(item => {
        const i      = state.equipment.indexOf(item);
        const cat    = item.category || 'gear';
        const catLabel = `<span class="equip-cat-badge equip-cat-${cat}">${cat}</span>`;
        const isArmor  = cat === 'armor';
        const isWeapon = cat === 'weapon';

        const rollBtn = item.hideRoll ? '' : isWeapon
            ? `<button class="step-action-btn" type="button" title="Attack"
                    data-action="weapon-roll" data-equip-index="${i}">🎲</button>`
            : `<button class="step-action-btn" type="button" title="Roll"
                    data-action="roll" data-name="${esc(item.name)}"
                    data-desc="${esc(item.notes||'')}" data-tag="${esc(cat)}" data-check="">🎲</button>`;

        const editBtn = isArmor
            ? `<button class="step-action-btn step-edit-trigger" type="button" title="Edit"
                    data-action="edit-equip" data-equip-index="${i}">✎</button>`
            : '';

        return `<div class="row" data-equip-row="${i}">
            <div class="equip-info">
                <div class="equip-row-name">${item.name} ${catLabel}</div>
                ${item.notes  ? `<div class="equip-row-notes">${item.notes}</div>` : ''}
                ${item.flavor ? `<div class="equip-row-notes" style="color:var(--muted)">${item.flavor}</div>` : ''}
            </div>
            <div class="equip-row-actions">
                ${rollBtn}
                <button class="step-action-btn" type="button" title="Send to chat"
                    data-action="chat" data-name="${esc(item.name)}"
                    data-desc="${esc(item.flavor || item.notes || '')}">💬</button>
                ${editBtn}
                <button class="step-action-btn" type="button" style="color:#ff6060"
                    data-action="del-equip" data-equip-index="${i}" aria-label="Remove">✕</button>
            </div>
        </div>`;
    }).join('');
}

// ── CHAT ──────────────────────────────────────────────────────────────────────

function chatTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

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

function pushChatFeature({ name, tags, desc }) {
    state.chat.unshift({
        type: 'feature', time: chatTimestamp(),
        charName:  state.char.name || '',
        name,
        tags:      tags || [],
        desc:      desc || '',
        diceRolls: parseDiceFromText(desc),
    });
    if (state.chat.length > 100) state.chat.length = 100;
    saveState();
    setActivePanel('chat');
}

// Extract the natural die value from a rollNote string
function naturalRoll(rollNote) {
    if (!rollNote) return null;
    const nums = rollNote.match(/\d+/g)?.map(Number);
    if (!nums?.length) return null;
    if (rollNote.startsWith('adv')) return Math.max(...nums);
    if (rollNote.startsWith('dis')) return Math.min(...nums);
    return nums[0];
}

function expandableDesc(desc) {
    if (!desc) return '';
    const isLong = desc.length > 160;
    return `<div class="chat-desc-body${isLong ? ' is-clamped' : ''}">
        <p class="chat-feat-desc">${desc}</p>
    </div>${isLong ? `<button class="chat-expand-btn" type="button">▼ Show more</button>` : ''}`;
}


function renderRollEntry(entry) {
    const fc        = entry.featureContext;
    const nat       = naturalRoll(entry.rollNote);
    const resClass  = nat === 20 ? 'chat-res--nat20' : nat === 1 ? 'chat-res--nat1' : '';
    const typeLabel = entry.rollType === 'adv' ? '· Adv' : entry.rollType === 'dis' ? '· Dis' : '';
    const condHtml  = entry.conditions?.length
        ? `<div class="chat-roll-cond">${entry.conditions.join(' · ')}</div>` : '';
    const charLabel = entry.charName ? `${entry.charName} · ` : '';

    // Feature roll — structured card with check + optional damage column
    if (fc) {
        const fcDice      = fc.diceRolls?.length ? fc.diceRolls : parseDiceFromText(fc.desc);
        const checkTag    = fc.tags?.find(t => t.startsWith('Check:'));
        const checkLabel  = checkTag ? checkTag.replace('Check: ', '') : (entry.label || 'Check');
        const displayTags = fc.tags?.filter(t => !t.startsWith('Check:')) || [];
        const tagsHtml    = displayTags.length
            ? `<div class="chat-feat-tags">${displayTags.map(t => `<span class="chat-feat-tag">${t}</span>`).join('')}</div>` : '';
        const borderClass = entry.rollType === 'adv' ? 'chat-roll--adv'
                          : entry.rollType === 'dis' ? 'chat-roll--dis' : '';
        const modStr = entry.mod !== 0 ? ` ${fmtSigned(entry.mod)}` : '';
        return `<div class="chat-roll-card ${borderClass}">
            <div class="chat-card-head">
                <span class="chat-card-title">⚡ ${charLabel}${fc.name}</span>
                <span class="chat-time">${entry.time}</span>
            </div>
            ${tagsHtml}
            <div class="chat-attack-row">
                <div class="chat-attack-block">
                    <div class="chat-attack-label">${checkLabel.toUpperCase()}</div>
                    <div class="chat-roll-result ${resClass}">${entry.total}</div>
                    <div class="chat-roll-breakdown">${entry.rollNote}${modStr}${typeLabel ? ` ${typeLabel}` : ''}</div>
                </div>
                ${fcDice.length ? `<div class="chat-attack-block">
                    <div class="chat-attack-label">DAMAGE</div>
                    ${diceChipsHtml(fcDice)}
                </div>` : ''}
            </div>
            ${fc.desc ? expandableDesc(fc.desc) : ''}
            ${condHtml}
        </div>`;
    }

    // Plain stat roll (no feature context)
    const borderClass = entry.rollType === 'adv' ? 'chat-roll--adv'
                      : entry.rollType === 'dis' ? 'chat-roll--dis' : '';
    const modStr = entry.mod !== 0 ? ` ${fmtSigned(entry.mod)}` : '';
    return `<div class="chat-roll-card ${borderClass}">
        <div class="chat-card-head">
            <span class="chat-card-title">${charLabel}${entry.label || 'Roll'}</span>
            <span class="chat-time">${entry.time}</span>
        </div>
        <div class="chat-roll-result ${resClass}">${entry.total}</div>
        <div class="chat-roll-breakdown">${entry.rollNote}${modStr}${typeLabel ? ` ${typeLabel}` : ''}</div>
        ${condHtml}
    </div>`;
}

function renderFeatureEntry(entry) {
    const tagsHtml = entry.tags?.length
        ? `<div class="chat-feat-tags">${entry.tags.map(t => `<span class="chat-feat-tag">${t}</span>`).join('')}</div>` : '';
    return `<div class="chat-feat-card">
        <div class="chat-card-head">
            <span class="chat-card-title">⚡ ${entry.name || ''}</span>
            <span class="chat-time">${entry.time}</span>
        </div>
        ${tagsHtml}
        ${diceChipsHtml(entry.diceRolls)}
        ${expandableDesc(entry.desc)}
    </div>`;
}

function renderChat() {
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
            char:             state.char,
            resources:        state.resources,
            checks:           state.checks,
            activeConditions: [...state.activeConditions],
            equipment:        state.equipment,
            progression:      state.progression,
            chat:             state.chat.slice(0, 50),
        }));
    } catch (_) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.char)      Object.assign(state.char,      d.char);
        if (d.resources) {
            Object.keys(d.resources).forEach(k => {
                if (state.resources[k]) Object.assign(state.resources[k], d.resources[k]);
            });
        }
        if (d.checks) {
            ['physical','mental'].forEach(g => {
                if (!d.checks[g]) return;
                d.checks[g].forEach(saved => {
                    const live = state.checks[g].find(c => c.key === saved.key);
                    if (live) {
                        live.mod        = saved.mod        ?? 0;
                        live.bonus      = saved.bonus      ?? 0;
                        live.armorBonus = saved.armorBonus ?? 0;
                    }
                });
            });
        }
        if (Array.isArray(d.activeConditions)) state.activeConditions = new Set(d.activeConditions);
        if (Array.isArray(d.equipment))        state.equipment   = d.equipment;
        if (d.progression) Object.assign(state.progression,      d.progression);
        if (Array.isArray(d.chat))             state.chat        = d.chat;
    } catch (_) {}
}

// ── DOM CACHE ─────────────────────────────────────────────────────────────────

const els = {};

function cacheEls() {
    els.panels = {
        play:        document.getElementById('panel-play'),
        actions:     document.getElementById('panel-actions'),
        progression: document.getElementById('panel-progression'),
        chat:        document.getElementById('panel-chat'),
    };
    els.navBtns  = Array.from(document.querySelectorAll('.nav-btn'));
    els.fabRoll  = document.getElementById('fab-roll');

    els.hpCur    = document.getElementById('hp-current');
    els.hpMax    = document.getElementById('hp-max');
    els.armorCur = document.getElementById('armor-current');
    els.armorMax = document.getElementById('armor-max');
    els.MNCur    = document.getElementById('MN-current');
    els.MNMax    = document.getElementById('MN-max');
    els.classResCur = document.getElementById('classRes-current');
    els.classResMax = document.getElementById('classRes-max');

    els.conditionsRow = document.getElementById('conditions-row');
    els.quickChecks   = document.getElementById('quick-checks');

    els.rollDrawer = document.getElementById('roll-drawer');
    els.rollLabel  = document.getElementById('roll-label');
    els.rollMod    = document.getElementById('roll-mod');
    els.btnRoll    = document.getElementById('btn-roll');
    els.mainLog    = document.getElementById('roll-log');

    els.btnClearConditions = document.getElementById('btn-clear-conditions');
    els.btnClearLog        = document.getElementById('btn-clear-log');

    els.hpMaxInput    = document.getElementById('hp-max-input');
    els.MNMaxInput    = document.getElementById('MN-max-input');

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
    if (key === 'chat') renderChat();
}

// ── RESOURCES ─────────────────────────────────────────────────────────────────

function bindResources() {
    // Play panel: hp + armor
    document.querySelector('.resource-grid')?.addEventListener('click', e => {
        const btn  = e.target.closest('.pill-btn');
        const pill = e.target.closest('.resource-pill');
        if (!btn || !pill) return;
        const res    = state.resources[pill.dataset.resource];
        const action = btn.dataset.action;
        if (!res) return;
        if (action === 'inc') res.current = Math.min(res.current + 1, res.max);
        if (action === 'dec') res.current = Math.max(res.current - 1, 0);
        syncUI();
        saveState();
    });

    // Features panel: MN + classRes
    document.getElementById('panel-actions')?.addEventListener('click', e => {
        const btn  = e.target.closest('.pill-btn');
        const pill = e.target.closest('.resource-pill');
        if (!btn || !pill || !state.resources[pill.dataset.resource]) return;
        const res = state.resources[pill.dataset.resource];
        if (btn.dataset.action === 'inc') res.current = Math.min(res.current + 1, res.max);
        if (btn.dataset.action === 'dec') res.current = Math.max(res.current - 1, 0);
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
                else        { state.activeConditions.add(name);    b.setAttribute('aria-pressed', 'true'); }
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
    ['physical','mental'].forEach(group => {
        const header = document.createElement('div');
        header.className = 'checks-group-label';
        header.textContent = group === 'physical' ? 'Physical' : 'Mental';
        els.quickChecks.appendChild(header);
        const grid = document.createElement('div');
        grid.className = 'quick-grid';
        state.checks[group].forEach(chk => {
            const armor    = chk.armorBonus || 0;
            const manual   = chk.bonus      || 0;
            const total    = chk.mod + manual + armor;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'quick-btn';
            b.innerHTML = `
                <span class="qb-label">${chk.label}</span>
                <span class="qb-nums">
                    <small class="qb-stat">${fmtSigned(chk.mod)}</small>
                    ${manual !== 0 ? `<small class="qb-bonus">${fmtSigned(manual)}</small>` : ''}
                    ${armor  !== 0 ? `<small class="qb-bonus qb-armor">${fmtSigned(armor)}</small>` : ''}
                </span>`;
            b.addEventListener('click', () => {
                els.rollLabel.value = `${chk.label} Check`;
                els.rollMod.value   = total;
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
    els.fabRoll.addEventListener('click', () => {
        els.rollLabel.value  = 'Roll';
        els.rollMod.value    = 0;
        openDrawer();
    });

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
        const label  = (els.rollLabel.value || 'Roll').trim();
        const mod    = Number(els.rollMod.value || 0);
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
            rollType:   selSeg,
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
        const btn = e.target.closest('.chat-expand-btn');
        if (!btn) return;
        const body = btn.previousElementSibling;
        if (!body) return;
        const collapsed = body.classList.toggle('is-clamped');
        btn.textContent = collapsed ? '▼ Show more' : '▲ Show less';
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
}

function sendChatMsg() {
    const input = document.getElementById('chat-msg-input');
    const text  = input?.value.trim();
    if (!text) return;
    pushChat(text, 'msg');
    if (input) input.value = '';
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
    const checkChipsEl  = document.getElementById('drawer-check-chips');
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
    const condBox  = document.getElementById('drawer-conditions');
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

    els.rollDrawer.inert = false;
    els.rollDrawer.removeAttribute('aria-hidden');
    els.rollDrawer.classList.add('is-open');
    setTimeout(() => els.rollLabel?.focus(), 0);
}

function closeDrawer() {
    if (els.rollDrawer.contains(document.activeElement)) {
        els.fabRoll?.focus();
    }
    els.rollDrawer.classList.remove('is-open');
    els.rollDrawer.setAttribute('aria-hidden', 'true');
    els.rollDrawer.inert = true;
}

// ── SECTION EDITORS ───────────────────────────────────────────────────────────

function bindSectionEditors() {
    document.querySelectorAll('.gear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const editor  = document.getElementById(btn.dataset.editor);
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
}

function populateEditor(editorId) {
    if (editorId === 'health-editor') {
        els.hpMaxInput.value = state.resources.hp.max;
    }
    if (editorId === 'equip-editor') setEquipCat('gear');
    if (editorId === 'checks-editor') syncEditCheckInputs();
    if (editorId === 'class-editor') {
        populateClassSelect();
        if (state.char.classKey) populatePathTalentSelects(state.char.classKey);
        const classSel = document.getElementById('class-select');
        if (classSel) classSel.onchange = () => populatePathTalentSelects(classSel.value);
    }
    if (editorId === 'res-editor') {
        const labelInput = document.getElementById('class-res-label-input');
        const maxInput   = document.getElementById('class-res-max-input');
        if (labelInput) labelInput.value = state.resources.classRes.label;
        if (maxInput)   maxInput.value   = state.resources.classRes.max;
        if (els.MNMaxInput) els.MNMaxInput.value = state.resources.MN.max;
    }
}

function saveEditor(target) {
    if (target === 'health') {
        state.resources.hp.max     = clampNum(els.hpMaxInput.value);
        state.resources.hp.current = Math.min(state.resources.hp.current, state.resources.hp.max);
        saveState(); syncUI();
    }
    if (target === 'checks') {
        allChecks().forEach(chk => {
            const modEl = document.getElementById(`edit-mod-${chk.key}`);
            const bonEl = document.getElementById(`edit-bon-${chk.key}`);
            if (modEl) chk.mod   = Number(modEl.value) || 0;
            if (bonEl) chk.bonus = Number(bonEl.value) || 0;
        });
        calcDerived();
        saveState();
        renderQuickChecks();
        syncUI();
    }
    if (target === 'class') {
        const classVal  = document.getElementById('class-select')?.value  || '';
        const pathVal   = document.getElementById('path-select')?.value   || '';
        const talentVal = document.getElementById('talent-select')?.value || '';

        const classChanged = classVal !== state.char.classKey;
        if (classChanged) {
            state.progression.pathChecked   = {};
            state.progression.talentChecked = {};
        }
        state.char.classKey   = classVal;
        state.char.pathName   = pathVal;
        state.char.talentName = talentVal;

        // Auto-load starting equipment when class first selected
        if (classChanged && classVal) {
            const classData = classBaseData.find(c => c.name === classVal);
            if (classData?.equipment?.length) {
                classData.equipment.forEach(item => {
                    if (!state.equipment.some(e => e.name === item.name)) {
                        const cat   = inferEquipCategory(item.name, item.description || '');
                        const entry = { name: item.name, notes: item.description || '', category: cat };
                        if (cat === 'weapon') Object.assign(entry, parseWeaponData(entry));
                        state.equipment.push(entry);
                    }
                });
                renderEquipment();
            }
        }

        saveState(); renderClassView(); renderProgression();
    }
    if (target === 'equipment') {
        const nameInput  = document.getElementById('equip-name-input');
        const notesInput = document.getElementById('equip-notes-input');
        const name = nameInput?.value.trim();
        if (name) {
            const weapon   = weaponsData.find(w => w.name.toLowerCase() === name.toLowerCase());
            const armor    = armorData.find(a => a.name.toLowerCase() === name.toLowerCase());
            const notes    = notesInput?.value.trim()
                || (weapon ? `${weapon.damage} ${weapon.damageType} · ${weapon.range}` : '')
                || (armor  ? `${armor.armor} Armor${armor.checkBonus ? '; ' + armor.checkBonus : ''}` : '');
            const category = armor ? 'armor' : newEquipCat;
            const entry    = { name: weapon?.name || armor?.name || name, notes, category };
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
            if (nameInput)  nameInput.value  = '';
            if (notesInput) notesInput.value = '';
            setEquipCat('gear');
            if (category === 'armor') { recalcArmorBonuses(); renderEquipment(); }
            else { saveState(); renderEquipment(); }
        }
        return true;
    }
    if (target === 'classres') {
        const label  = document.getElementById('class-res-label-input')?.value.trim() || 'Resource';
        const max    = clampNum(document.getElementById('class-res-max-input')?.value);
        const mnMax  = clampNum(els.MNMaxInput?.value);
        state.resources.classRes.label   = label;
        state.resources.classRes.max     = max;
        state.resources.classRes.current = Math.min(state.resources.classRes.current, max);
        state.resources.MN.max           = mnMax;
        state.resources.MN.current       = Math.min(state.resources.MN.current, mnMax);
        const display = document.getElementById('class-res-label-display');
        if (display) display.textContent = label;
        saveState(); syncUI();
    }
    if (target === 'gain') {
        const input = document.getElementById('gain-input');
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
            char:             state.char,
            resources:        state.resources,
            checks:           state.checks,
            activeConditions: [...state.activeConditions],
            equipment:        state.equipment,
            progression:      state.progression,
        }, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${state.char.name || 'character'}-active-sheet.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    els.btnSaveBio?.addEventListener('click', () => {
        state.char.name       = document.getElementById('char-name')?.value.trim()       || '';
        state.char.level      = clampNum(document.getElementById('char-level')?.value)   || 1;
        state.char.age        = document.getElementById('char-age')?.value.trim()        || '';
        state.char.size       = document.getElementById('char-size')?.value.trim()       || '';
        state.char.diet       = document.getElementById('char-diet')?.value.trim()       || '';
        state.char.language   = document.getElementById('char-language')?.value.trim()   || '';
        state.char.motivation = document.getElementById('char-motivation')?.value.trim() || '';
        state.char.trinket    = document.getElementById('char-trinket')?.value.trim()    || '';
        saveState();
        syncTopbar();
        setActivePanel('play');
    });
}

function syncBioInputs() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    set('char-name',       state.char.name);
    set('char-level',      state.char.level);
    set('char-age',        state.char.age);
    set('char-size',       state.char.size);
    set('char-diet',       state.char.diet);
    set('char-language',   state.char.language);
    set('char-motivation', state.char.motivation);
    set('char-trinket',    state.char.trinket);
    syncSpeciesDisplay();
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
        const cb    = e.target.closest('.prog-checkbox');
        if (!cb) return;
        const type  = cb.dataset.progType;
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

        if (type === 'path')   state.progression.pathChecked[index]   = cb.checked;
        if (type === 'talent') state.progression.talentChecked[index] = cb.checked;

        saveState();
        renderProgression();
        renderClassView();
    });

    document.getElementById('other-gains-list')?.addEventListener('click', e => {
        const btn = e.target.closest('[data-remove-gain]');
        if (!btn) return;
        state.progression.otherGains.splice(Number(btn.dataset.removeGain), 1);
        saveState(); renderOtherGains();
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
            row.innerHTML = `<div class="equip-edit-form">
                <div class="step-edit-title">${item.name}</div>
                <div class="equip-edit-grid">
                    <label class="field">
                        <span class="field-label">Armor Rating</span>
                        <input type="number" class="equip-edit-rating" value="${item.armorRating || 0}" min="0" />
                    </label>
                    <label class="field">
                        <span class="field-label">Check Bonuses</span>
                        <input type="text" class="equip-edit-notes" value="${esc(item.notes || '')}" placeholder="e.g. Stealth +1" />
                    </label>
                </div>
                <label class="field">
                    <span class="field-label">Description / Flavor</span>
                    <textarea class="step-edit-desc equip-edit-desc" rows="2">${item.flavor || ''}</textarea>
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
            item.armorRating = parseInt(row.querySelector('.equip-edit-rating')?.value || '0', 10) || 0;
            item.notes       = row.querySelector('.equip-edit-notes')?.value?.trim() || '';
            item.flavor      = row.querySelector('.equip-edit-desc')?.value?.trim()  || '';
            item.hideRoll    = row.querySelector('.equip-edit-hideroll')?.checked || false;
            recalcArmorBonuses();
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
        const name   = e.target.value.trim();
        const lower  = name.toLowerCase();
        const weapon = weaponsData.find(w => w.name.toLowerCase() === lower);
        const armor  = !weapon && armorData.find(a => a.name.toLowerCase() === lower);
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
            const card     = btn.closest('.step-card');
            if (!card) return;
            const featName = btn.dataset.featName;
            const override = state.char.featureOverrides?.[featName] || {};
            const curDesc  = override.desc !== undefined ? override.desc
                           : (card.querySelector('.step-desc')?.textContent || '');
            const curHide  = override.hideRoll || false;
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
            const card     = btn.closest('.step-card');
            if (!card) return;
            const featName = btn.dataset.featName;
            const textarea = card.querySelector('.step-edit-desc');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (!state.char.featureOverrides) state.char.featureOverrides = {};
            state.char.featureOverrides[featName] = {
                desc:     textarea?.value ?? '',
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

    // Wounds max always tracks Agility + Strength
    const wounds = agi + str;
    if (wounds > 0) {
        state.resources.hp.max     = wounds;
        state.resources.hp.current = Math.min(state.resources.hp.current || wounds, wounds);
    }

    // Speed = 30 + floor(Agility/2)*5 ft
    const speed    = 30 + Math.floor(agi / 2) * 5;
    // Low Light Vision = 30 + floor(Observation/2)*5 ft
    const lowlight = 30 + Math.floor(obs / 2) * 5;

    const speedEl    = document.getElementById('derived-speed');
    const lowlightEl = document.getElementById('derived-lowlight');
    if (speedEl)    speedEl.textContent    = `${speed} ft`;
    if (lowlightEl) lowlightEl.textContent = `${lowlight} ft`;

    // Sync the wounds display immediately
    if (els.hpMax) els.hpMax.textContent = state.resources.hp.max;
    if (els.hpCur) els.hpCur.textContent = state.resources.hp.current;
}

function syncUI() {
    els.hpCur.textContent    = state.resources.hp.current;
    els.hpMax.textContent    = state.resources.hp.max;
    els.armorCur.textContent = state.resources.armor.current;
    els.armorMax.textContent = state.resources.armor.max;
    els.MNCur.textContent    = state.resources.MN.current;
    els.MNMax.textContent    = state.resources.MN.max;
    if (els.classResCur) els.classResCur.textContent = state.resources.classRes.current;
    if (els.classResMax) els.classResMax.textContent = state.resources.classRes.max;
    const labelDisplay = document.getElementById('class-res-label-display');
    if (labelDisplay) labelDisplay.textContent = state.resources.classRes.label;
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
    const count   = parseInt(m[1]);
    const sides   = parseInt(m[2]);
    const explode = !!m[3];
    const bonus   = m[4] ? parseInt(m[4]) : 0;
    const rolls   = [];
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

function diceChipsHtml(diceRolls) {
    if (!diceRolls?.length) return '';
    return `<div class="chat-feat-dice">${
        diceRolls.map(r => {
            const detail = r.rolls.length > 1 ? ` [${r.rolls.join('+')}]` : '';
            const bonusTxt = r.bonus !== 0 ? (r.bonus > 0 ? `+${r.bonus}` : `${r.bonus}`) : '';
            return `<div class="chat-dice-chip">
                <span class="chat-dice-notation">${r.notation}</span>
                <span class="chat-dice-arrow">→</span>
                <span class="chat-dice-total">${r.total}</span>
                <span class="chat-dice-detail">${detail}${bonusTxt}</span>
            </div>`;
        }).join('')
    }</div>`;
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

function fmtSigned(n) { const v = Number(n) || 0; return v >= 0 ? `+${v}` : `${v}`; }
function clampNum(v)  { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }

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
    loadClassData();
    loadWeapons();
    recalcArmorBonuses();
    updateXpDisplay();
    // Close drawer cleanly on boot (ensure inert state matches)
    closeDrawer();
});
