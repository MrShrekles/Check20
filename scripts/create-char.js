/* Character Creation Wizard */

const DATA_BASE = window.location.pathname.includes('/active-sheet/') ? '../data/' : 'data/';

const STORAGE_KEY  = 'arc-active-sheet';
// Base limits — Professional class gets +5 points and max 15 per stat
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
    wealth:     0,
    motivation: '',
    trinket:    '',
    name:       '',
};

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
            fetch(DATA_BASE + 'species_new.json'),
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

    pathSel.innerHTML = '<option value="">— Select Path —</option>' +
        paths.map(e => `<option value="${e.name}"${e.name === wiz.pathName ? ' selected' : ''}>${e.name}</option>`).join('');
    talSel.innerHTML  = '<option value="">— Select Talent —</option>' +
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
            init.map(s => `<div class="preview-feat"><strong>${s.name}</strong>${s.description ? ` — ${s.description}` : ''}</div>`).join(''));
    }
    if (wiz.talentName) {
        const te = entries.find(e => e.name === wiz.talentName);
        const init = te?.talent?.steps?.filter(s => Number(s.step) === 0) || [];
        if (init.length) parts.push(`<div class="preview-label">Starting Talent Feature</div>` +
            init.map(s => `<div class="preview-feat"><strong>${s.name}</strong>${s.description ? ` — ${s.description}` : ''}</div>`).join(''));
    }
    preview.innerHTML = parts.join('');
}

// ── STEP 3: SPECIES — drill-down navigation ───────────────────────────────────

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
            <div class="species-card-head">
                <span class="species-name">${s.name}</span>
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
        <div class="species-detail-name">${s.name}</div>
        <p class="species-detail-desc">${s.description.slice(0, 240)}…</p>
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
    if (wEl) wEl.value = wiz.wealth     || '';
    if (mEl) mEl.value = wiz.motivation || '';
    if (tEl) tEl.value = wiz.trinket    || '';
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] || ''; }

// ── STEP 4: STATS ─────────────────────────────────────────────────────────────

const STAT_KEYS = ['agi','cra','ste','str','sur','inf','int','lck','obs','spi'];

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
        countEl.style.color = left < 0 ? '#ff6060' : left === 0 ? '#60e090' : 'var(--text)';
    }
    // Reflect class-specific pool in hint
    const hintEl = document.querySelector('#step-stats .step-hint');
    if (hintEl) {
        const lim = classLimits();
        hintEl.textContent = `Max ${lim.max} per stat · ${lim.total} points total. Suggested: 10 / 5 / 3 / 2.`;
    }
}

function adjustStat(key, delta) {
    const next = wiz.stats[key] + delta;
    if (next < 0 || next > classLimits().max) return;
    if (delta > 0 && pointsLeft() <= 0) return;
    wiz.stats[key] = next;
    refreshStats();
}

function applySuggested() {
    STAT_KEYS.forEach(k => wiz.stats[k] = 0);
    // Default physical-heavy spread; user adjusts from here
    const spread = { agi: 10, str: 5, sur: 3, cra: 2 };
    Object.entries(spread).forEach(([k, v]) => wiz.stats[k] = v);
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
        ${s ? `<div class="review-row"><span class="review-lbl">Species</span><strong>${s.name}</strong> <span class="review-sub">${s.lineage}</span></div>` : ''}
        <div class="review-row"><span class="review-lbl">Stats</span><span class="review-stats">${statsLine || '—'}</span></div>
        <div class="review-row"><span class="review-lbl">Points</span><span style="color:${pointsLeft() < 0 ? '#ff6060' : 'var(--muted)'}">
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
    const equipment = (classData?.equipment || []).map(e => ({
        name:     e.name,
        notes:    e.description || '',
        category: inferEquipCategory(e.name, e.description || ''),
    }));

    // Species features are stored in char.speciesFeature — no longer duplicated in otherGains
    const otherGains = [];

    const state = {
        char: {
            name:       wiz.name.trim(),
            level:      1,
            species:    s?.name      || '',
            age:        '',
            size:       s?.size      || '',
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

    // Species — lineage grid
    document.getElementById('lineage-grid').addEventListener('click', e => {
        const card = e.target.closest('[data-lineage]');
        if (card) enterLineage(card.dataset.lineage);
    });

    // Species — option grid
    document.getElementById('option-grid').addEventListener('click', e => {
        const card = e.target.closest('[data-option]');
        if (card) enterOption(card.dataset.option);
    });

    // Species — back buttons
    document.getElementById('spec-back-to-lineage').addEventListener('click', () => {
        showSpecLevel('lineage');
    });
    document.getElementById('spec-back-to-option').addEventListener('click', () => {
        const options = [...new Set(allSpecies.filter(s => s.lineage === wiz.activeLineage).map(s => s.option))];
        if (options.length > 1) showSpecLevel('option');
        else showSpecLevel('lineage');
    });

    // Species — species cards
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

    document.getElementById('btn-suggest').addEventListener('click', applySuggested);

    // Name input live sync
    // Starting Details — roll buttons
    document.getElementById('roll-wealth')?.addEventListener('click', () => {
        const roll = Math.floor(Math.random() * 100) + 1 + 50;
        wiz.wealth = roll;
        const el = document.getElementById('detail-wealth');
        if (el) el.value = roll;
    });
    document.getElementById('roll-motivation')?.addEventListener('click', () => {
        const result = pick(worldMotivations);
        wiz.motivation = result;
        const el = document.getElementById('detail-motivation');
        if (el) el.value = result;
    });
    document.getElementById('roll-trinket')?.addEventListener('click', () => {
        const result = pick(worldObjects);
        wiz.trinket = result;
        const el = document.getElementById('detail-trinket');
        if (el) el.value = result;
    });

    // Sync typed values back to wiz
    document.getElementById('detail-wealth')?.addEventListener('change', e => {
        wiz.wealth = parseInt(e.target.value, 10) || 0;
    });
    document.getElementById('detail-motivation')?.addEventListener('input', e => {
        wiz.motivation = e.target.value;
    });
    document.getElementById('detail-trinket')?.addEventListener('input', e => {
        wiz.trinket = e.target.value.trim();
    });

    document.getElementById('wiz-name').addEventListener('input', e => {
        wiz.name = e.target.value.trim();
    });
});
