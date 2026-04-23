// ══════════════════════════════════════════════
//  HEXGEN.JS  v2
//  data/hexgen.json  +  data/species.json
// ══════════════════════════════════════════════

let HEX = null;
let SPECIES_LIST = [];

Promise.all([
    fetch('data/hexgen.json').then(r => r.json()),
    fetch('data/species.json').then(r => r.json())
]).then(([hex, sp]) => {
    HEX = hex;
    SPECIES_LIST = sp.species || [];
    buildModTables();
    loadHistory();
}).catch(err => console.error('Data load failed:', err));

// ── Helpers ─────────────────────────────────────
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const rnd = n => Math.floor(Math.random() * n);
const pickArr = arr => arr[rnd(arr.length)];

const RARITY_WEIGHT = {
    'now': 100, 'common': 30, 'common below ground': 20,
    'uncommon': 16, 'rare': 8, 'very rare': 4,
    'legendary': 2, 'unique': 1
};

function weightedPick(arr, weightFn) {
    const pool = [];
    arr.forEach(item => {
        const w = Math.floor((weightFn ? weightFn(item) : (item.weight || 1)) * 10);
        for (let i = 0; i < w; i++) pool.push(item);
    });
    return pool.length ? pool[rnd(pool.length)] : arr[rnd(arr.length)];
}

// Like weightedPick but multiplies the weight of whichever item matches preferVal.
// preferKey is the property to match on (e.g. 'name', 'pl').
const JOURNEY_BIAS = 3;
function weightedPickBiased(arr, weightFn, preferKey, preferVal) {
    if (preferVal == null) return weightedPick(arr, weightFn);
    const pool = [];
    arr.forEach(item => {
        const w = Math.floor((weightFn ? weightFn(item) : (item.weight || 1)) * 10);
        const bias = item[preferKey] === preferVal ? JOURNEY_BIAS : 1;
        for (let i = 0; i < w * bias; i++) pool.push(item);
    });
    return pool.length ? pool[rnd(pool.length)] : arr[rnd(arr.length)];
}

function rarityWeight(s) {
    return RARITY_WEIGHT[(s.rarity || '').toLowerCase()] || 5;
}

function formatSpecies(s) {
    const name = s.name || 'Unknown';
    const lineage = s.lineage || '';
    const option = s.option || '';
    if (option && lineage) return `${cap(option)} ${name}`;
    if (lineage && lineage.toLowerCase() !== name.toLowerCase()) return `${cap(lineage)} ${name}`;
    return name;
}

// ── Population tier logic ────────────────────────
// tier 0 = barren, 1–2 = nomadic/homestead, 3–4 = hamlet/village,
// 5–6 = town/small city, 7–8 = large city, 9–10 = metropolis
// collapsed = treat as tier 3 counts but lock temperament to Collapsed

function popCounts(pop) {
    if (pop.collapsed) return { features: 2, resources: 2, species: 2, forceTemperament: 'Collapsed' };
    const t = pop.tier || 0;
    //            t: 0  1  2  3  4  5  6  7  8  9  10
    const F = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
    const R = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5];
    const S = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
    const idx = Math.min(Math.max(t, 0), 10);
    return {
        features: F[idx],
        resources: R[idx],
        species: S[idx],
        forceTemperament: t === 0 ? 'Uninhabited' : null
    };
}

function pickUnique(arr, count, weightFn) {
    const results = [];
    const used = new Set();
    let tries = 0;
    while (results.length < count && tries < 50) {
        const pick = weightedPick(arr, weightFn);
        if (!used.has(pick.name)) {
            used.add(pick.name);
            results.push(pick.name);
        }
        tries++;
    }
    return results;
}

// ── Local persistence ────────────────────────────
const STORAGE_KEY = 'hexgen-history';
let hexHistory = [];

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function saveHistory() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hexHistory)); } catch(e) {}
}

function addEntry(type, data) {
    const entry = { id: genId(), type, data };
    hexHistory.unshift(entry);
    saveHistory();
    return entry.id;
}

function removeEntry(id) {
    hexHistory = hexHistory.filter(e => e.id !== id);
    saveHistory();
}

// ── Roll a full hex ──────────────────────────────
// prevHex: optional previous hex object for journey bias
function rollHex(terrain, prevHex) {
    const t = (!terrain || terrain === 'all') ? 'all' : terrain;
    const envTable = HEX.environments[t] || HEX.environments.all;
    const p = prevHex || null;

    const lord = weightedPickBiased(HEX.lords, null, 'name', p?.lord).name;
    const env = weightedPickBiased(envTable, null, 'name', p?.env).name;
    const enemy = weightedPickBiased(HEX.enemies, null, 'name', p?.enemy).name;
    const population = weightedPickBiased(HEX.populations, null, 'name', p?.population);
    const counts = popCounts(population);
    const temperament = counts.forceTemperament || weightedPickBiased(HEX.temperaments, null, 'name', p?.temperament).name;
    const food = weightedPickBiased(HEX.foods, null, 'name', p?.food).name;

    const features = counts.features > 0 ? pickUnique(HEX.features, counts.features) : [];
    const resources = counts.resources > 0 ? pickUnique(HEX.resources, counts.resources) : [];
    const species = counts.species > 0
        ? Array.from({ length: counts.species }, () => formatSpecies(weightedPick(SPECIES_LIST, rarityWeight)))
        : [];

    const pl = weightedPickBiased(HEX.powerLevels, item => item.weight, 'pl', p?.pl).pl;

    return { lord, env, enemy, population: population.name, temperament, food, features, resources, species, pl, terrain: t };
}

// ── Build a single hex card ──────────────────────
function buildHexCard(hex, hexNum, entryId) {
    const card = document.createElement('div');
    card.className = 'hex-result-card';

    const isBarren = hex.features.length === 0;
    const lordColor = hex.lord === 'No Scarab Influence' ? '#666' : 'var(--gold)';

    const featuresHTML = hex.features.length
        ? hex.features.map(f => `<span class="hex-tag tag-feature">${f}</span>`).join('')
        : '<span class="hex-tag tag-empty">No features</span>';

    const resourcesHTML = hex.resources.length
        ? hex.resources.map(r => `<span class="hex-tag tag-resource">${r}</span>`).join('')
        : '<span class="hex-tag tag-empty">None</span>';

    const speciesHTML = hex.species.length
        ? hex.species.map(s => `<span class="hex-tag tag-species">${s}</span>`).join('')
        : '<span class="hex-tag tag-empty">None</span>';

    const enemyHTML = hex.enemy !== 'None'
        ? `<div class="hex-mod-row"><span class="mod-key">Enemy</span><span class="mod-val enemy-val">${hex.enemy}</span><span class="hex-divider"></span><span class="mod-key">PL</span><span class="mod-val pl-val">${hex.pl}</span></div>`
        : `<div class="hex-mod-row"><span class="mod-key">PL</span><span class="mod-val pl-val">${hex.pl}</span></div>`;

    const numLabel = hexNum != null ? `<span class="hex-num">Hex ${hexNum}</span>` : '';

    card.innerHTML = `
        <div class="hex-card-inner ${isBarren ? 'void-card' : ''}">
            <div class="hex-terrain-label">
                ${numLabel}
                <span class="hex-env" style="color:${lordColor}">${hex.lord}</span>
            </div>
            <div class="hex-title">${hex.env}</div>
            <div class="hex-mods">
                <div class="hex-mod-row hex-mod-row--species">
                    <span class="mod-key">Size</span>
                    <span class="mod-val">${hex.population}</span>
                    <span class="hex-divider"></span>
                    <div class="hex-tags hex-tags--inline">${speciesHTML}</div>
                </div>
                <div class="hex-mod-row">
                    <span class="mod-key">Food</span>
                    <span class="mod-val">${hex.food}</span>
                    <span class="hex-divider"></span>
                    <span class="mod-key">Mood</span>
                    <span class="mod-val">${hex.temperament}</span>
                </div>
                ${enemyHTML}
            </div>
            <div class="hex-tag-section">
                <div class="tag-group-label">Resources</div>
                <div class="hex-tags">${resourcesHTML}</div>
            </div>
            <div class="hex-tag-section">
                <div class="tag-group-label">Features</div>
                <div class="hex-tags">${featuresHTML}</div>
            </div>
            <button class="delete-hex">x</button>
        </div>`;

    card.querySelector('.delete-hex').addEventListener('click', () => {
        if (entryId) removeEntry(entryId);
        card.remove();
    });
    return card;
}

// ── Build a journey (travel mode) — paginated ───
function buildJourney(terrain, hexCount, savedData, entryId) {
    const hexes = savedData ? savedData.hexes : (() => {
        const h = [];
        for (let i = 0; i < hexCount; i++) h.push(rollHex(terrain, h[i - 1] || null));
        return h;
    })();
    const count = hexes.length;
    const connectors = savedData ? savedData.connectors
        : Array.from({ length: count - 1 }, () => pickArr(HEX.travelConnectors));
    let page = 0;

    const wrap = document.createElement('div');
    wrap.className = 'journey-wrap';

    const header = document.createElement('div');
    header.className = 'journey-header';
    header.innerHTML = `<span class="journey-title">Journey</span> <span class="journey-meta">${count} hex${count > 1 ? 'es' : ''} &middot; ~${count} week${count > 1 ? 's' : ''} travel &middot; ${cap(terrain)}</span>
        <button class="delete-hex journey-del">Remove Journey</button>`;
    wrap.appendChild(header);

    const pageArea = document.createElement('div');
    pageArea.className = 'journey-page-area';
    wrap.appendChild(pageArea);

    function render() {
        pageArea.innerHTML = '';

        const card = buildHexCard(hexes[page], page + 1);
        card.querySelector('.delete-hex').style.display = 'none';
        pageArea.appendChild(card);

        if (page < count - 1) {
            const connBlock = document.createElement('div');
            connBlock.className = 'journey-connector-block';
            connBlock.innerHTML = `<div class="travel-connector"><span class="connector-arrow">&#8595;</span><em>${connectors[page]}</em></div>`;
            pageArea.appendChild(connBlock);
        }

        const nav = document.createElement('div');
        nav.className = 'journey-nav';
        if (page > 0) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'button journey-nav-btn';
            prevBtn.textContent = '← Back';
            prevBtn.addEventListener('click', () => { page--; render(); });
            nav.appendChild(prevBtn);
        }
        const counter = document.createElement('span');
        counter.className = 'journey-page-counter';
        counter.textContent = `${page + 1} / ${count}`;
        nav.appendChild(counter);
        if (page < count - 1) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'button journey-nav-btn';
            nextBtn.textContent = 'Next →';
            nextBtn.addEventListener('click', () => { page++; render(); });
            nav.appendChild(nextBtn);
        }
        pageArea.appendChild(nav);
    }

    render();
    header.querySelector('.journey-del').addEventListener('click', () => {
        if (entryId) removeEntry(entryId);
        wrap.remove();
    });
    return wrap;
}

// ── Events ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const historyEl = document.getElementById('hex-history');
    const terrain = () => document.getElementById('terrain-pick').value;

    document.getElementById('roll-hex-btn').addEventListener('click', () => {
        if (!HEX) return;
        const hex = rollHex(terrain());
        const id = addEntry('hex', hex);
        historyEl.prepend(buildHexCard(hex, null, id));
    });

    document.getElementById('roll-travel-btn').addEventListener('click', () => {
        if (!HEX) return;
        const n = Math.min(Math.max(parseInt(document.getElementById('travel-hexes').value) || 4, 1), 12);
        const t = terrain();
        const hexes = [];
        for (let i = 0; i < n; i++) hexes.push(rollHex(t, hexes[i - 1] || null));
        const connectors = Array.from({ length: n - 1 }, () => pickArr(HEX.travelConnectors));
        const journeyData = { hexes, connectors, terrain: t, count: n };
        const id = addEntry('journey', journeyData);
        historyEl.prepend(buildJourney(t, n, journeyData, id));
    });

    document.getElementById('clear-hexes').addEventListener('click', () => {
        historyEl.innerHTML = '';
        hexHistory = [];
        saveHistory();
    });
});

function loadHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        hexHistory = JSON.parse(saved);
    } catch(e) { hexHistory = []; return; }

    const historyEl = document.getElementById('hex-history');
    if (!historyEl) return;
    [...hexHistory].reverse().forEach(entry => {
        if (entry.type === 'hex') {
            historyEl.prepend(buildHexCard(entry.data, null, entry.id));
        } else if (entry.type === 'journey') {
            historyEl.prepend(buildJourney(entry.data.terrain, entry.data.count, entry.data, entry.id));
        }
    });
}

// ── Modifier tables ─────────────────────────────
function buildModTables() {
    const fill = (id, arr, cols) => {
        const tbody = document.getElementById(id);
        if (!tbody || !arr) return;
        arr.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = cols.map(c => `<td>${item[c] ?? ''}</td>`).join('');
            tbody.appendChild(tr);
        });
    };
    fill('t-pl', HEX?.powerLevels, ['pl', 'weight']);
    fill('t-lords', HEX?.lords, ['name', 'weight']);
    fill('t-enemies', HEX?.enemies, ['name', 'weight']);
    fill('t-pops', HEX?.populations, ['name', 'tier', 'weight']);
    fill('t-temps', HEX?.temperaments, ['name', 'weight']);
    fill('t-features', HEX?.features, ['name', 'weight']);
    fill('t-foods', HEX?.foods, ['name', 'weight']);
    fill('t-resources', HEX?.resources, ['name', 'weight']);

    // Species grouped by lineage
    const speciesTbody = document.getElementById('t-species');
    if (speciesTbody && SPECIES_LIST.length) {
        const grouped = {};
        SPECIES_LIST.forEach(s => {
            const g = s.lineage || 'Other';
            if (!grouped[g]) grouped[g] = [];
            grouped[g].push(s);
        });
        Object.entries(grouped).forEach(([group, members]) => {
            const hdr = document.createElement('tr');
            hdr.innerHTML = `<td colspan="3" style="background:var(--theme-dark);color:var(--gold);font-weight:bold;padding:4px 8px;">${group}</td>`;
            speciesTbody.appendChild(hdr);
            members.forEach(s => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${formatSpecies(s)}</td><td>${s.rarity || ''}</td><td>${s.origin || ''}</td>`;
                speciesTbody.appendChild(tr);
            });
        });
    }
}

function showTab(name, btn) {
    document.querySelectorAll('.raw-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.raw-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    btn.classList.add('active');
}