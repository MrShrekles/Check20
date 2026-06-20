/* Character Creation Wizard */

const DATA_BASE = window.location.pathname.includes('/active-sheet/') ? '../data/' : 'data/';
const IMG_BASE  = window.location.pathname.includes('/active-sheet/') ? '../assets/species/' : 'assets/species/';
const titleCase = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/ \w/g, c => c.toUpperCase()) : '';
const slugify   = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const STORAGE_KEY  = 'arc-active-sheet';
// Base limits - Professional class gets +5 points and max 15 per stat
const BASE_POINTS = 20;
const BASE_MAX    = 10;

function classLimits() {
    return wiz.classKey === 'Professional'
        ? { total: BASE_POINTS + 5, max: 15 }
        : { total: BASE_POINTS,     max: BASE_MAX };
}

const STEPS = ['class', 'path', 'species', 'stats', 'details', 'review'];
const LABELS = {
    class:   'Choose Class',
    path:    'Path & Talent',
    species: 'Choose Species',
    stats:   'Allocate Stats',
    details: 'Starting Details',
    review:  'Name & Begin',
};

// Wizard state
const wiz = {
    stepIdx:     0,
    classKey:    '',
    pathName:    '',
    talentName:  '',
    speciesName: '',
    speciesObj:  null,
    activeLineage: '',
    activeOption:  '',
    stats:      { agi:0, cra:0, ste:0, str:0, sur:0, inf:0, int:0, lck:0, obs:0, spi:0 },
    wealth:       0,
    wealthRolled: false,
    age:          '',
    size:         '',
    motivation:   '',
    trinket:      '',
    extraEquip: '',
    name:         '',
};

const EQUIPMENT_LIST = [
    "A bandolier of shotgun shells, a gun cleaning kit, a holster for quick draw",
    "Brewing equipment, a selection of rare herbs and magical ingredients, a few bottles of 'moonshine'",
    "A book of abyssal texts, a set of writing tools and ink, a small collection of scrolls and manuscripts, and a silver holy symbol",
    "Collection jars (for the leeches), a medical kit (with basic supplies)",
    "A grappling hook (for scaling trees and buildings), a water-skin, and a small first-aid kit",
    "A ledger, a set of fine writing implements, and a collection of valuable coins from various nations",
    "A set of tattooing tools, a sketchbook, and a few magical inks with unique properties",
    "A set of wooden stakes, a vial of holy water, and a guide to supernatural creatures",
    "A whetstone, a set of weapon maintenance tools, and a training manual",
    "Acrobat's tools, a small makeup kit, and a set of costume props",
    "Animal handling tools, a portable cage, and a collection of treats for animals",
    "Bedroll, a map of the region, and a signal whistle",
    "Elemental gemstones, a collection of scrolls detailing elemental spells, and a small bound elemental creature",
    "Golem maintenance kit, a manual on golem anatomy, and a small golem-making kit",
    "Healer's kit, a wooden staff, and a collection of potions",
    "Light hammer, a flask filled with liquor, and a lighter",
    "Mechanics' tools, a portable workshop, and a few spare parts",
    "Musical instrument with intricate carvings, Performer's Flourish (+1 Influence)",
    "Old miner's helmet (with functioning lantern), a collection of precious stones",
    "Rope, grappling hook, and lockpicks in a compact pouch",
    "Ruined spellbook, a magical focus, and a pouch of magical reagents",
    "Scale, a ledger, and a set of merchant's tools, Additional 50 gp",
    "Thieves' tools, a collapsible grappling hook, and a set of lockpicks",
    "A sturdy belt with multiple pouches, a canvas bag, and a small pocket knife",
    "A small pouch of magical components, a spellbook, and a scroll case",
    "Handcuffs, a notepad, and a magnifying glass in a leather case",
    "Enchanted makeup kit, a mirror, and a small case of various potions",
    "Pocket watch, a city map, a book on city architecture",
    "A portable taco-making kit, a book on taco divination, exotic taco ingredients",
    "A set of cheese-making tools, a selection of fine cheeses, an intelligent cheese",
];

const TRINKET_LIST = [
    "Shotgun shell that was once shot at you, kept as a lucky charm",
    "A broken practice weapon, a reminder of past failures and determination to improve",
    "A tarnished silver badge that once belonged to a criminal you captured",
    "A pocket watch with a cryptic inscription on the back",
    "A coin from the organization you once worked for, stamped with a mysterious emblem",
    "A broken amulet, once a symbol of divine authority",
    "A taco charm, said to bring good luck",
    "A small enchanted vial containing your former essence",
    "A small intricately carved figurine of your original form",
    "A small token of protection, given to you by a friend before your exile",
    "A silver medallion bearing the symbol of your order",
    "A small enchanted crystal that changes color and emits faint elemental energy",
    "A small ornate box containing a mysterious abyssal artifact",
    "A dried flower from a rare and dangerous plant you once grew",
    "A spent bullet casing from the first spirit you ever bound to a weapon",
    "A favorite soda spoon, slightly bent but still useful",
    "A small intricately carved bone used to mix inks",
    "A miniature shoe charm, said to bring good luck to its owner",
    "A small perfectly aged cheese that seems to have a personality of its own",
    "An old miner's whistle, said to ward off evil spirits",
    "An old railroad spike, a reminder of your first day on the job",
    "A tiny perfectly articulated golem hand, a memento from a successful repair job",
    "A small doll, a reminder of your desire to change",
    "A leech preserved in a small glass vial",
    "A mysterious key with an emblem of an unknown organization",
    "A small unmarked box that contains an unknown substance",
    "A playing card with an ever-shifting face",
    "A small intricately carved figurine of a mythical creature you once cared for",
    "A lucky coin, said to bring fortune to those who carry it",
    "A small charm in the shape of your favorite animal from the menagerie",
    "A poster from one of your most memorable performances",
    "A small worn carving of a caravan, a gift from a grateful merchant",
    "A broken chain, a symbol of your newfound freedom from the arena",
    "A golden pocket watch, engraved with your family's crest",
    "A small intricate clockwork contraption you built as a testament to your skill",
    "A small vial of 'holy water' that's actually infused with dark energy",
    "A small carved wooden ship you found among the cargo",
    "A cowbell, a memento from your favorite dairy cow",
    "A badge from your old fire department, bearing the symbol of a phoenix",
    "A small worn key that once opened the door to your old guardhouse",
    "A recipe for a particularly potent brew, passed down through generations",
    "A small stone from the foundation of the city's oldest building",
    "A set of vampire fangs you've replaced",
    "A screw from a piece of celestial machinery",
    "An old makeup case containing a mysterious magical substance",
    "A small enchanted stone that emits a faint eerie glow",
    "A glass orb that glows slightly when held, no known origin",
    "A small mechanical bird that occasionally chirps despite lacking visible power sources",
    "A book with blank pages that sometimes display faint writing",
    "A stone that is always warm to the touch",
    "A wooden puzzle box that has never been opened",
    "A mirror shard that shows a mysterious shadow in the reflection",
    "An old compass that points to something other than magnetic north",
    "A handkerchief embroidered with an unfamiliar coat of arms",
    "A piece of driftwood shaped like a sea creature",
    "A candle that cannot be lit - emits a faint sweet smell when warm",
    "A deck of cards where all the kings are missing",
    "A bell that makes no sound when rung",
    "A diary written in an unknown language",
    "A set of old locksmith tools with one pick inexplicably bent",
    "A whistle that only animals can hear",
    "A locket that refuses to open - sounds like something is moving inside",
    "A piece of chalk that writes on air",
    "A feather that falls like a stone when dropped",
    "A glove that absorbs light, making the hand invisible when worn",
    "A bottle of ink that changes color daily",
    "A monocle that shows an arcane symbol when looking at the moon",
    "A scarf that cannot get wet",
    "A comb that makes hair stand on end when used",
    "A matchbox with matches that light when snapped",
    "A pebble that skips on dry land",
    "A coin that always lands on its edge",
    "A key that gets colder as it approaches locks",
    "A nail that never rusts",
    "A tooth from an unknown beast - vibrates slightly in thunderstorms",
    "A map with a place that no one can find",
    "A hat that always returns to its owner when lost",
    "A small box that hums a melody at night",
    "A painting of a door that seems to change in detail",
    "A soap that never lathers",
    "A button that detaches and reattaches itself from clothes",
    "A quill that only writes in rhymes",
    "A pair of glasses that show constellations at night",
    "A bookmark that prevents the book from ever finishing",
    "A flask that doubles the taste of any liquid inside",
    "A lantern with a flame that flickers in the presence of spirits",
    "A spoon that makes any meal taste delicious",
    "A pair of boots that leave footprints of a different creature",
    "A whistle that only works at sunrise and sunset",
    "A ring that feels heavier with lies",
    "A bottle that refills with sea water",
    "A glove that softly glows in the presence of magic",
    "A brush that paints only in shades of blue",
    "A belt that always fits the wearer perfectly",
    "A scarf that smells like the forest after rain",
    "A yarn ball that never tangles",
    "A small statue that slowly turns towards the nearest gold",
    "A pen that writes on its own when left alone",
    "A coin that jumps slightly when near treasure",
    "A feather that acts as a magnet for paper",
];

// Loaded data
let classBaseData   = [];
let classOptData    = {};
let allSpecies      = [];
let worldMotivations = [];
let worldObjects     = [];

// ── DATA ──────────────────────────────────────────────────────────────────────

async function loadData() {
    try {
        const [cBase, cOpt, spec, world] = await Promise.all([
            fetch(DATA_BASE + 'classes.json'),
            fetch(DATA_BASE + 'class-new.json'),
            fetch(DATA_BASE + 'species.json'),
            fetch(DATA_BASE + 'worldbuilding.json'),
        ]);
        const bj = await cBase.json();
        const oj = await cOpt.json();
        const sj = await spec.json();
        const wj = await world.json();
        classBaseData    = bj?.classes      || [];
        classOptData     = oj?.classes      || {};
        allSpecies       = sj?.species      || [];
        worldMotivations = wj?.motivations  || [];
        worldObjects     = wj?.objects      || [];
        // Pre-load armor data so buildAndSave() can store armorRating on equipment
        fetch(DATA_BASE + 'armor.json').then(r => r.json()).then(d => { window._armorData = d; }).catch(() => {});
        renderClassGrid();
    } catch (e) { console.error('create-char: data load failed', e); }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function currentStep() { return STEPS[wiz.stepIdx]; }

function goTo(idx) {
    document.getElementById(`step-${currentStep()}`)?.classList.remove('is-active');
    wiz.stepIdx = Math.max(0, Math.min(STEPS.length - 1, idx));
    const id = currentStep();
    document.getElementById(`step-${id}`)?.classList.add('is-active');

    document.getElementById('wiz-step-label').textContent = LABELS[id];
    document.getElementById('wiz-back').hidden = wiz.stepIdx === 0;
    document.getElementById('wiz-next').textContent =
        wiz.stepIdx === STEPS.length - 1 ? 'Begin Adventure →' : 'Next →';

    const pct = (wiz.stepIdx / (STEPS.length - 1)) * 100;
    document.getElementById('wiz-progress-fill').style.width = `${pct}%`;

    clearError();
    if (id === 'path')    renderPathStep();
    if (id === 'species') renderSpeciesStep();
    if (id === 'stats')   renderBuildGuide();
    if (id === 'details') renderDetailsStep();
    if (id === 'review')  renderReview();
}

function validate() {
    const id = currentStep();
    if (id === 'class')   return wiz.classKey   ? true : err('Select a class to continue.');
    if (id === 'path')    return (wiz.pathName && wiz.talentName) ? true : err('Select both a path and a talent.');
    if (id === 'species') return wiz.speciesName ? true : err('Select a species to continue.');
    if (id === 'stats') {
        if (pointsLeft() < 0) return err(`You've spent too many points. Remove ${-pointsLeft()} point(s).`);
        return true;
    }
    if (id === 'review') {
        wiz.name = document.getElementById('wiz-name')?.value.trim() || '';
        return wiz.name ? true : err('Enter a character name.');
    }
    return true;
}

function err(msg) {
    const el = document.getElementById('wiz-error');
    el.textContent = msg;
    el.hidden = false;
    return false;
}
function clearError() {
    const el = document.getElementById('wiz-error');
    if (el) el.hidden = true;
}

// ── STEP 1: CLASS ─────────────────────────────────────────────────────────────

function renderClassGrid() {
    const grid = document.getElementById('class-grid');
    if (!grid) return;
    grid.innerHTML = classBaseData.map(c => `
        <button class="class-card${c.name === wiz.classKey ? ' is-sel' : ''}"
                type="button" data-class="${c.name}">
            <div class="class-card-name">${c.name}</div>
            <p class="class-card-desc">${c.description.slice(0, 110)}…</p>
        </button>`).join('');
}

// ── STEP 2: PATH & TALENT ─────────────────────────────────────────────────────

function getEntries(className) {
    const entries = classOptData[(className || '').toLowerCase()];
    return Array.isArray(entries) ? entries : [];
}

function renderPathStep() {
    const entries  = getEntries(wiz.classKey);
    const paths    = entries.filter(e => Array.isArray(e?.path?.steps)   && e.path.steps.length);
    const talents  = entries.filter(e => Array.isArray(e?.talent?.steps) && e.talent.steps.length);
    const pathSel  = document.getElementById('wiz-path-select');
    const talSel   = document.getElementById('wiz-talent-select');

    pathSel.innerHTML = '<option value="">- Select Path -</option>' +
        paths.map(e => `<option value="${e.name}"${e.name === wiz.pathName ? ' selected' : ''}>${e.name}</option>`).join('');
    talSel.innerHTML  = '<option value="">- Select Talent -</option>' +
        talents.map(e => `<option value="${e.name}"${e.name === wiz.talentName ? ' selected' : ''}>${e.name}</option>`).join('');

    updatePathPreview();
}

function updatePathPreview() {
    const entries = getEntries(wiz.classKey);
    const preview = document.getElementById('path-preview');
    if (!preview) return;
    const parts = [];

    if (wiz.pathName) {
        const pe = entries.find(e => e.name === wiz.pathName);
        const init = pe?.path?.steps?.filter(s => Number(s.step) === 0) || [];
        if (init.length) parts.push(`<div class="preview-label">Starting Path Feature</div>` +
            init.map(s => `<div class="preview-feat"><strong>${s.name}</strong>${s.description ? ` - ${s.description}` : ''}</div>`).join(''));
    }
    if (wiz.talentName) {
        const te = entries.find(e => e.name === wiz.talentName);
        const init = te?.talent?.steps?.filter(s => Number(s.step) === 0) || [];
        if (init.length) parts.push(`<div class="preview-label">Starting Talent Feature</div>` +
            init.map(s => `<div class="preview-feat"><strong>${s.name}</strong>${s.description ? ` - ${s.description}` : ''}</div>`).join(''));
    }
    preview.innerHTML = parts.join('');
}

// ── STEP 3: SPECIES - drill-down navigation ───────────────────────────────────

function showSpecLevel(level) {
    ['lineage','option','species'].forEach(l =>
        document.getElementById(`spec-lv-${l}`).hidden = l !== level
    );
}

function renderSpeciesStep() {
    buildLineageGrid();
    showSpecLevel('lineage');
}

function buildLineageGrid() {
    const lineages = [...new Set(allSpecies.map(s => s.lineage))].sort();
    document.getElementById('lineage-grid').innerHTML = lineages.map(l => {
        const count   = allSpecies.filter(s => s.lineage === l).length;
        const options = [...new Set(allSpecies.filter(s => s.lineage === l).map(s => s.option))];
        const sub     = options.length > 1 ? `${options.length} types` : (options[0] || '');
        return `<button class="lineage-card${l === wiz.activeLineage ? ' is-sel' : ''}"
                    type="button" data-lineage="${l}">
                    <div class="lineage-card-name">${l}</div>
                    <div class="lineage-card-meta">${sub} · ${count} species</div>
                </button>`;
    }).join('');
}

function enterLineage(lineage) {
    wiz.activeLineage = lineage;
    wiz.activeOption  = '';
    document.querySelectorAll('.lineage-card').forEach(c =>
        c.classList.toggle('is-sel', c.dataset.lineage === lineage));

    const options = [...new Set(
        allSpecies.filter(s => s.lineage === lineage).map(s => s.option)
    )].sort();

    if (options.length > 1) {
        document.getElementById('spec-lineage-label').textContent = lineage;
        buildOptionGrid(options);
        showSpecLevel('option');
    } else {
        wiz.activeOption = options[0] || '';
        buildSpeciesGrid();
        updateSpecBack();
        showSpecLevel('species');
    }
}

function buildOptionGrid(options) {
    document.getElementById('option-grid').innerHTML = options.map(o => {
        const count = allSpecies.filter(s => s.lineage === wiz.activeLineage && s.option === o).length;
        return `<button class="lineage-card${o === wiz.activeOption ? ' is-sel' : ''}"
                    type="button" data-option="${o}">
                    <div class="lineage-card-name">${o}</div>
                    <div class="lineage-card-meta">${count} species</div>
                </button>`;
    }).join('');
}

function enterOption(option) {
    wiz.activeOption = option;
    document.querySelectorAll('[data-option]').forEach(c =>
        c.classList.toggle('is-sel', c.dataset.option === option));
    buildSpeciesGrid();
    updateSpecBack();
    showSpecLevel('species');
}

function updateSpecBack() {
    const btn = document.getElementById('spec-back-to-option');
    const options = [...new Set(allSpecies.filter(s => s.lineage === wiz.activeLineage).map(s => s.option))];
    if (btn) btn.textContent = options.length > 1
        ? `← ${wiz.activeOption}`
        : `← ${wiz.activeLineage}`;
}

function buildSpeciesGrid() {
    const visible = allSpecies.filter(s =>
        s.lineage === wiz.activeLineage &&
        (!wiz.activeOption || s.option === wiz.activeOption)
    );
    document.getElementById('species-grid').innerHTML = visible.map(s => `
        <button class="species-card${s.name === wiz.speciesName ? ' is-sel' : ''}"
                type="button" data-species="${s.name}">
            <img class="species-card-img" src="${IMG_BASE}${slugify(s.name)}.jpg" alt=""
                 onerror="this.style.display='none'">
            <div class="species-card-head">
                <span class="species-name">${titleCase(s.name)}</span>
                <span class="species-rarity">${s.rarity || ''}</span>
            </div>
            ${s.feature_name ? `<div class="species-trait">${s.feature_name}</div>` : ''}
        </button>`).join('');
    renderSpeciesDetail();
}

function renderSpeciesDetail() {
    const detail = document.getElementById('species-detail');
    const s = wiz.speciesObj;
    if (!detail) return;
    if (!s) { detail.hidden = true; return; }
    detail.hidden = false;
    detail.innerHTML = `
        <img class="species-detail-img" src="${IMG_BASE}${slugify(s.name)}.jpg" alt="${titleCase(s.name)}"
             onerror="this.style.display='none'">
        <div class="species-detail-name">${titleCase(s.name)}</div>
        <p class="species-detail-desc">${(() => {
            const d = s.description;
            const text = typeof d === 'string' ? d : (d?.physical || d?.environment || '');
            return text.slice(0, 280) + (text.length > 280 ? '…' : '');
        })()}</p>
        <div class="species-detail-facts">
            ${s.size     ? `<span>Size: ${s.size}</span>` : ''}
            ${s.diet     ? `<span>Diet: ${s.diet}</span>` : ''}
            ${s.language ? `<span>Language: ${s.language}</span>` : ''}
            ${s.region   ? `<span>Region: ${s.region}</span>` : ''}
        </div>
        ${s.feature_name ? `<div class="species-detail-feat">
            <span class="feat-action">${s.fetAction || 'Passive'}</span>
            <strong>${s.feature_name}</strong>
            <p>${s.feature_effect}</p>
        </div>` : ''}
        ${s['sub-fet-name'] ? `<div class="species-detail-feat species-detail-feat--sub">
            <strong>${s['sub-fet-name']}</strong>
            <p>${s['sub-fet-effect']}</p>
        </div>` : ''}`;
}

// ── STEP 5: STARTING DETAILS ──────────────────────────────────────────────────

function renderDetailsStep() {
    const wEl = document.getElementById('detail-wealth');
    const mEl = document.getElementById('detail-motivation');
    const tEl = document.getElementById('detail-trinket');
    const aEl = document.getElementById('detail-age');
    const xEl = document.getElementById('detail-extra-equip');
    if (wEl) wEl.value = wiz.wealth     || '';
    if (mEl) mEl.value = wiz.motivation || '';
    if (tEl) tEl.value = wiz.trinket    || '';
    if (aEl) aEl.value = wiz.age        || '';
    if (xEl) xEl.value = wiz.extraEquip || '';

    // Wealth button - lock after first roll
    const rollWealthBtn = document.getElementById('roll-wealth');
    if (rollWealthBtn) {
        rollWealthBtn.disabled    = wiz.wealthRolled;
        rollWealthBtn.textContent = wiz.wealthRolled ? 'Rolled' : '🎲 Roll 1d100+50';
    }

    // Size dropdown - populate from species height range or fallback to standard sizes
    const sEl = document.getElementById('detail-size');
    if (sEl) {
        const sizeStr = wiz.speciesObj?.size || '';
        const parts   = sizeStr.split('-').map(Number).filter(Boolean);
        sEl.innerHTML = '';
        if (parts.length >= 2) {
            const lo = Math.min(...parts), hi = Math.max(...parts);
            for (let i = lo; i <= hi; i++) {
                const opt = document.createElement('option');
                opt.value = `${i} ft`; opt.textContent = `${i} ft`;
                if (wiz.size === `${i} ft` || String(wiz.size) === String(i)) opt.selected = true;
                sEl.appendChild(opt);
            }
        } else if (sizeStr) {
            const opt = document.createElement('option');
            opt.value = sizeStr; opt.textContent = sizeStr; opt.selected = true;
            sEl.appendChild(opt);
        } else {
            ['Small', 'Medium', 'Large', 'Huge'].forEach(s => {
                const opt = document.createElement('option');
                opt.value = s; opt.textContent = s;
                if (wiz.size === s) opt.selected = true;
                sEl.appendChild(opt);
            });
        }
        if (!wiz.size && sEl.options.length) wiz.size = sEl.options[0].value;
    }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] || ''; }

// ── STEP 4: STATS ─────────────────────────────────────────────────────────────

const STAT_KEYS = ['agi','cra','ste','str','sur','inf','int','lck','obs','spi'];

const CHECK_KEY = {
    agility:'agi', crafting:'cra', stealth:'ste', strength:'str', survival:'sur',
    influence:'inf', intellect:'int', luck:'lck', observation:'obs', spirit:'spi',
};

// The 10 investable Physical + Mental checks
const VALID_STAT_CHECKS = new Set([
    'Agility','Crafting','Stealth','Strength','Survival',
    'Influence','Intellect','Luck','Observation','Spirit',
]);

// Heuristic: does this description describe an enemy rolling, not you?
const _ENEMY_SAVE_RX = /\b(?:enemies|opponents?|targets?|each creature|all creatures|must make|succeed on|creatures?\s+(?:within|in|around|that)|they make|creature makes?|affected creatures?|hostile)\b/i;

function isEnemyFacingCheck(step) {
    // Explicit tag always wins
    if (step.checkType === 'enemy')     return true;
    if (step.checkType === 'self')      return false;
    if (step.checkType === 'contested') return false; // you roll it too — show in ally section
    // Fallback: heuristic on description
    return step.description ? _ENEMY_SAVE_RX.test(step.description) : false;
}

function renderBuildGuide() {
    const el = document.getElementById('build-guide');
    if (!el) return;

    const entries     = classOptData[(wiz.classKey || '').toLowerCase()] || [];
    const pathEntry   = wiz.pathName   ? entries.find(e => e.name === wiz.pathName)   : null;
    const talentEntry = wiz.talentName ? entries.find(e => e.name === wiz.talentName) : null;

    const allSteps = [
        ...(pathEntry?.path?.steps    || []).map(s => ({ ...s, source: wiz.pathName })),
        ...(talentEntry?.talent?.steps || []).map(s => ({ ...s, source: wiz.talentName })),
    ].filter(s => s.name && s.check && VALID_STAT_CHECKS.has(s.check) && s.checkType !== 'unneeded');

    if (!allSteps.length) { el.hidden = true; return; }

    const yourChecks  = allSteps.filter(s => !isEnemyFacingCheck(s));
    const enemySaves  = allSteps.filter(s =>  isEnemyFacingCheck(s));

    const rowHtml = (s, isEnemy) => {
        const isContested = s.checkType === 'contested';
        const checkCls = isEnemy ? 'guide-feat-check guide-feat-check--enemy' : 'guide-feat-check';
        const checkLbl = isEnemy
            ? `${s.check} <span class="guide-feat-save-note">enemy saves</span>`
            : isContested
                ? `${s.check} <span class="guide-feat-save-note guide-feat-save-note--contested">vs enemy</span>`
                : s.check;
        const inner = `
            <span class="guide-feat-left">
                <span class="guide-feat-name">${s.name}</span>
                <span class="${checkCls}">${checkLbl}</span>
            </span>`;
        return s.description
            ? `<details class="guide-feat-row guide-feat-row--expand${isEnemy ? ' guide-feat-row--enemy' : ''}">
                <summary class="guide-feat-summary">${inner}</summary>
                <p class="guide-feat-desc">${s.description}</p>
               </details>`
            : `<div class="guide-feat-row${isEnemy ? ' guide-feat-row--enemy' : ''}">${inner}</div>`;
    };

    el.hidden = false;
    el.innerHTML = `
        ${yourChecks.length ? `
        <div class="guide-feat-label">Ally checks — invest in these</div>
        <div class="guide-feat-list">
            ${yourChecks.map(s => rowHtml(s, false)).join('')}
        </div>` : ''}

        ${enemySaves.length ? `
        <div class="guide-feat-label guide-feat-label--enemy">Enemy checks — no stat investment needed</div>
        <div class="guide-feat-list guide-feat-list--enemy">
            ${enemySaves.map(s => rowHtml(s, true)).join('')}
        </div>` : ''}`;
}

function pointsSpent()  { return STAT_KEYS.reduce((n, k) => n + wiz.stats[k], 0); }
function pointsLeft()   { return classLimits().total - pointsSpent(); }

function refreshStats() {
    STAT_KEYS.forEach(k => {
        const el = document.getElementById(`sv-${k}`);
        if (el) el.textContent = wiz.stats[k];
    });
    const countEl = document.getElementById('points-count');
    if (countEl) {
        const left = pointsLeft();
        countEl.textContent = left;
        countEl.classList.remove('points-count--over', 'points-count--exact', 'points-count--remaining');
        countEl.classList.add(left < 0 ? 'points-count--over' : left === 0 ? 'points-count--exact' : 'points-count--remaining');
    }
    // Update class-specific pool display
    const lim = classLimits();
    const totalEl = document.getElementById('points-total');
    if (totalEl) totalEl.textContent = lim.total;
}

function adjustStat(key, delta) {
    const next = wiz.stats[key] + delta;
    if (next < 0 || next > classLimits().max) return;
    if (delta > 0 && pointsLeft() <= 0) return;
    wiz.stats[key] = next;
    refreshStats();
}


// ── STEP 5: REVIEW ────────────────────────────────────────────────────────────

function renderReview() {
    document.getElementById('wiz-name').value = wiz.name;
    const s = wiz.speciesObj;
    const statsLine = STAT_KEYS
        .filter(k => wiz.stats[k] > 0)
        .map(k => {
            const labels = { agi:'Agi', cra:'Cra', ste:'Ste', str:'Str', sur:'Sur',
                             inf:'Inf', int:'Int', lck:'Lck', obs:'Obs', spi:'Spi' };
            return `${labels[k]} ${wiz.stats[k]}`;
        }).join(' · ');

    document.getElementById('review-card').innerHTML = `
        <div class="review-row"><span class="review-lbl">Class</span><strong>${wiz.classKey}</strong></div>
        ${wiz.pathName   ? `<div class="review-row"><span class="review-lbl">Path</span><strong>${wiz.pathName}</strong></div>` : ''}
        ${wiz.talentName ? `<div class="review-row"><span class="review-lbl">Talent</span><strong>${wiz.talentName}</strong></div>` : ''}
        ${s ? `<div class="review-row"><span class="review-lbl">Species</span><strong>${titleCase(s.name)}</strong> <span class="review-sub">${s.lineage}</span></div>` : ''}
        <div class="review-row"><span class="review-lbl">Stats</span><span class="review-stats">${statsLine || '-'}</span></div>
        <div class="review-row"><span class="review-lbl">Points</span><span class="review-points${pointsLeft() < 0 ? ' review-points--over' : ''}">
            ${pointsSpent()} / ${classLimits().total} used${pointsLeft() > 0 ? ` (${pointsLeft()} unspent)` : ''}
        </span></div>
        ${wiz.wealth     ? `<div class="review-row"><span class="review-lbl">Wealth</span><strong>${wiz.wealth} gp</strong></div>` : ''}
        ${wiz.trinket    ? `<div class="review-row"><span class="review-lbl">Trinket</span><span>${wiz.trinket}</span></div>` : ''}
        ${wiz.motivation ? `<div class="review-row"><span class="review-lbl">Motivation</span><span class="review-stats">${wiz.motivation.slice(0,80)}${wiz.motivation.length > 80 ? '…' : ''}</span></div>` : ''}`;
}

// ── EQUIPMENT CATEGORY INFERENCE ──────────────────────────────────────────────

function inferEquipCategory(name, notes) {
    const n = (name  || '').toLowerCase();
    const d = (notes || '').toLowerCase();
    if (d.includes('armor:') || n.includes('armor') || n.includes('shield') || n.includes('cloak') || n.includes('robes')) return 'armor';
    if (/\dd\d/.test(d) || /\dd\d/.test(n)) return 'weapon';
    return 'gear';
}

// ── BUILD & SAVE ──────────────────────────────────────────────────────────────

function buildAndSave() {
    const s = wiz.speciesObj;
    const classData = classBaseData.find(c => c.name === wiz.classKey);
    const equipment = (classData?.equipment || []).map(e => {
        const cat = inferEquipCategory(e.name, e.description || '');
        // Look up armor rating from loaded data so active-sheet can sum it immediately
        const armorMatch = cat === 'armor'
            ? (window._armorData || []).find(a => a.name.toLowerCase() === e.name.toLowerCase())
            : null;
        return {
            name:        e.name,
            notes:       e.description || '',
            category:    cat,
            armorRating: armorMatch?.armor || 0,
        };
    });

    // Additional equipment from Step 5 textarea
    (wiz.extraEquip || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(name => {
        equipment.push({ name, notes: '', category: inferEquipCategory(name, ''), armorRating: 0 });
    });

    // Species features are stored in char.speciesFeature - no longer duplicated in otherGains
    const otherGains = [];

    const state = {
        char: {
            name:       wiz.name.trim(),
            level:      1,
            species:    s?.name      || '',
            age:        String(wiz.age  || ''),
            size:       wiz.size     || s?.size || '',
            diet:       s?.diet      || '',
            language:   s?.language  || '',
            motivation: wiz.motivation || '',
            trinket:    wiz.trinket    || '',
            wealth:     wiz.wealth     || 0,
            classKey:   wiz.classKey,
            pathName:   wiz.pathName,
            talentName: wiz.talentName,
            speciesLineage:    s?.lineage || '',
            speciesFeature:    s?.feature_name ? {
                name:   s.feature_name,
                effect: s.feature_effect || '',
                action: s.fetAction || 'Passive',
                check:  s.fetCheck  || '',
            } : null,
            speciesSubFeature: s?.['sub-fet-name'] ? {
                name:   s['sub-fet-name'],
                effect: s['sub-fet-effect'] || '',
            } : null,
        },
        resources: {
            hp:       { current: 0, max: 0 },
            armor:    { current: 0, max: 0 },
            MN:       { current: 0, max: 0 },
            classRes: { current: 0, max: 0, label: 'Resource' },
        },
        checks: {
            physical: [
                { key: 'agi', label: 'Agility',   mod: wiz.stats.agi },
                { key: 'cra', label: 'Crafting',  mod: wiz.stats.cra },
                { key: 'ste', label: 'Stealth',   mod: wiz.stats.ste },
                { key: 'str', label: 'Strength',  mod: wiz.stats.str },
                { key: 'sur', label: 'Survival',  mod: wiz.stats.sur },
            ],
            mental: [
                { key: 'inf', label: 'Influence',   mod: wiz.stats.inf },
                { key: 'int', label: 'Intellect',   mod: wiz.stats.int },
                { key: 'lck', label: 'Luck',        mod: wiz.stats.lck },
                { key: 'obs', label: 'Observation', mod: wiz.stats.obs },
                { key: 'spi', label: 'Spirit',      mod: wiz.stats.spi },
            ],
        },
        activeConditions: [],
        equipment,
        progression: { pathChecked: {}, talentChecked: {}, otherGains, xp: 0 },
        chat:    [],
        rollLog: [],
    };

    if (typeof arcTrack === 'function') {
        arcTrack('char_created', {
            classKey:    wiz.classKey,
            pathName:    wiz.pathName,
            talentName:  wiz.talentName,
            speciesName: wiz.speciesName,
            stats:       { ...wiz.stats },
        });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.location.href = 'active-sheet.html';
}

// ── EVENTS ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    document.getElementById('wiz-back').addEventListener('click', () => goTo(wiz.stepIdx - 1));

    document.getElementById('wiz-next').addEventListener('click', () => {
        if (!validate()) return;
        if (currentStep() === 'review') { buildAndSave(); return; }
        goTo(wiz.stepIdx + 1);
    });

    // Class selection
    document.getElementById('class-grid').addEventListener('click', e => {
        const card = e.target.closest('[data-class]');
        if (!card) return;
        if (card.dataset.class !== wiz.classKey) { wiz.pathName = ''; wiz.talentName = ''; }
        wiz.classKey = card.dataset.class;
        document.querySelectorAll('.class-card').forEach(c =>
            c.classList.toggle('is-sel', c.dataset.class === wiz.classKey));
        clearError();
    });

    // Path / talent selects
    document.getElementById('wiz-path-select').addEventListener('change', e => {
        wiz.pathName = e.target.value;
        updatePathPreview();
    });
    document.getElementById('wiz-talent-select').addEventListener('change', e => {
        wiz.talentName = e.target.value;
        updatePathPreview();
    });

    // Species - lineage grid
    document.getElementById('lineage-grid').addEventListener('click', e => {
        const card = e.target.closest('[data-lineage]');
        if (card) enterLineage(card.dataset.lineage);
    });

    // Species - option grid
    document.getElementById('option-grid').addEventListener('click', e => {
        const card = e.target.closest('[data-option]');
        if (card) enterOption(card.dataset.option);
    });

    // Species - back buttons
    document.getElementById('spec-back-to-lineage').addEventListener('click', () => {
        showSpecLevel('lineage');
    });
    document.getElementById('spec-back-to-option').addEventListener('click', () => {
        const options = [...new Set(allSpecies.filter(s => s.lineage === wiz.activeLineage).map(s => s.option))];
        if (options.length > 1) showSpecLevel('option');
        else showSpecLevel('lineage');
    });

    // Species - species cards
    document.getElementById('species-grid').addEventListener('click', e => {
        const card = e.target.closest('[data-species]');
        if (!card) return;
        wiz.speciesName = card.dataset.species;
        wiz.speciesObj  = allSpecies.find(s => s.name === wiz.speciesName) || null;
        document.querySelectorAll('.species-card').forEach(c =>
            c.classList.toggle('is-sel', c.dataset.species === wiz.speciesName));
        renderSpeciesDetail();
        clearError();
    });

    // Stat steppers
    document.querySelector('.stats-two-col').addEventListener('click', e => {
        const btn = e.target.closest('.stat-adj');
        if (!btn) return;
        const row = btn.closest('.stat-row');
        if (!row) return;
        adjustStat(row.dataset.key, Number(btn.dataset.adj));
    });


    // Starting Details - delegated roll buttons (robust against DOM timing)
    document.querySelector('.wiz-body')?.addEventListener('click', e => {
        const btn = e.target.closest('[id^="roll-"]');
        if (!btn) return;

        if (btn.id === 'roll-wealth') {
            if (wiz.wealthRolled) return;
            const roll = Math.floor(Math.random() * 100) + 51; // 51–150
            wiz.wealth = roll;
            wiz.wealthRolled = true;
            const el = document.getElementById('detail-wealth');
            if (el) { el.value = roll; el.dispatchEvent(new Event('input')); }
            btn.disabled = true;
            btn.textContent = `Rolled (${roll}g)`;
        }

        if (btn.id === 'roll-age') {
            const raw      = wiz.speciesObj?.lifespan ?? '60-90';
            const parts    = String(raw).split('-').map(Number).filter(Boolean);
            const maxAge   = parts.length ? Math.max(...parts) : 90;
            const minAge   = parts.length > 1 ? Math.min(...parts) : Math.floor(maxAge * 0.25);
            const low      = Math.max(1, Math.floor(minAge * 0.20));
            const roll     = Math.floor(Math.random() * (maxAge - low + 1)) + low;
            wiz.age        = roll;
            const el = document.getElementById('detail-age');
            if (el) { el.value = roll; el.dispatchEvent(new Event('input')); }
        }

        if (btn.id === 'roll-motivation') {
            const result = pick(worldMotivations);
            wiz.motivation = result;
            const el = document.getElementById('detail-motivation');
            if (el) { el.value = result; }
        }

        if (btn.id === 'roll-trinket') {
            const result = pick(TRINKET_LIST);
            wiz.trinket = result;
            const el = document.getElementById('detail-trinket');
            if (el) { el.value = result; }
        }

        if (btn.id === 'roll-extra-equip') {
            const result = pick(EQUIPMENT_LIST);
            wiz.extraEquip = result;
            const el = document.getElementById('detail-extra-equip');
            if (el) { el.value = result; }
        }
    });

    // Sync typed values back to wiz
    document.getElementById('detail-wealth')?.addEventListener('change', e => {
        wiz.wealth = parseInt(e.target.value, 10) || 0;
    });
    document.getElementById('detail-age')?.addEventListener('change', e => {
        wiz.age = parseInt(e.target.value, 10) || '';
    });
    document.getElementById('detail-size')?.addEventListener('change', e => {
        wiz.size = e.target.value;
    });
    document.getElementById('detail-motivation')?.addEventListener('input', e => {
        wiz.motivation = e.target.value;
    });
    document.getElementById('detail-trinket')?.addEventListener('input', e => {
        wiz.trinket = e.target.value.trim();
    });
    document.getElementById('detail-extra-equip')?.addEventListener('input', e => {
        wiz.extraEquip = e.target.value;
    });

    document.getElementById('wiz-name').addEventListener('input', e => {
        wiz.name = e.target.value.trim();
    });
});
