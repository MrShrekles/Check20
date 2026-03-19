// ══════════════════════════════════════════════
//  HEXGEN.JS
//  Location data:  data/hexgen.json
//  Species data:   data/species.json  (species_new.json in your repo)
// ══════════════════════════════════════════════

let HEX = null;
let SPECIES_LIST = [];

Promise.all([
    fetch('data/hexgen.json').then(r => r.json()),
    fetch('data/species.json').then(r => r.json())
]).then(([hex, speciesData]) => {
    HEX = hex;
    SPECIES_LIST = speciesData.species || [];
    buildRawTables();
    buildModTables();
}).catch(err => console.error('Data load failed:', err));

// ── Rarity weights (mirrors npcGenerator) ──────
const RARITY_WEIGHT = {
    'now': 100, 'common': 30, 'common below ground': 20,
    'uncommon': 16, 'rare': 8, 'very rare': 4,
    'legendary': 2, 'unique': 1
};

function rarityWeight(s) {
    return RARITY_WEIGHT[(s.rarity || '').toLowerCase()] || 5;
}

// ── Generic weighted picker ─────────────────────
function weightedPick(arr, weightFn) {
    const pool = [];
    arr.forEach(item => {
        const w = Math.floor((weightFn ? weightFn(item) : (item.weight || 1)) * 10);
        for (let i = 0; i < w; i++) pool.push(item);
    });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : arr[Math.floor(Math.random() * arr.length)];
}

// ── Format species display name ─────────────────
function formatSpecies(s) {
    const name = s.name || 'Unknown';
    const lineage = s.lineage || '';
    const option = s.option || '';
    if (option && lineage) return `${cap(option)} ${name}`;
    if (lineage && lineage.toLowerCase() !== name.toLowerCase()) return `${cap(lineage)} ${name}`;
    return name;
}

const cap = str => str.charAt(0).toUpperCase() + str.slice(1);

// ── Roll a location entry ───────────────────────
const TERRAINS = ['desert', 'mountain', 'city'];

function rollLocation(terrain) {
    const t = terrain === 'all' ? TERRAINS[Math.floor(Math.random() * 3)] : terrain;
    return { ...weightedPick(HEX[t]), _terrain: t };
}

// ── Roll a species from the full species list ───
function rollSpecies(hintName) {
    if (hintName) {
        const key = hintName.toLowerCase().replace(/[\s-]+/g, '_');
        const match = SPECIES_LIST.find(s =>
            s.name.toLowerCase().replace(/\s+/g, '_') === key ||
            formatSpecies(s).toLowerCase().replace(/\s+/g, '_').includes(key)
        );
        if (match && Math.random() < 0.6) return match;
    }
    return weightedPick(SPECIES_LIST, rarityWeight);
}

// ── Roll modifiers ──────────────────────────────
function rollModifiers(hints = {}) {
    const species = rollSpecies(hints.species);

    let origin;
    if (hints.origin) {
        const match = HEX.origins.find(o => o.name.toLowerCase() === hints.origin.toLowerCase());
        if (match && Math.random() < 0.6) origin = match.name;
    }
    if (!origin && species.origin && Math.random() < 0.4) {
        const sOrigin = species.origin.split(',')[0].trim();
        const match = HEX.origins.find(o => o.name.toLowerCase() === sOrigin.toLowerCase());
        if (match) origin = match.name;
    }
    if (!origin) origin = weightedPick(HEX.origins).name;

    const threat = hints.threat
        ? (HEX.threats.find(t => t.name.toLowerCase().includes(hints.threat.toLowerCase())) || weightedPick(HEX.threats)).name
        : weightedPick(HEX.threats).name;

    return { species, origin, threat };
}

// ── Build card DOM ──────────────────────────────
function buildCard(terrain, locData, modData) {
    const card = document.createElement('div');
    card.className = 'hex-result-card';

    const terrainLabel = cap(terrain);

    if (locData && locData.type === 'void') {
        card.innerHTML = `
            <div class="hex-card-inner void-card">
                <div class="hex-terrain-label">${terrainLabel}</div>
                <div class="hex-title void-title">${locData.title}</div>
                <button class="delete-hex">x</button>
            </div>`;
        card.querySelector('.delete-hex').addEventListener('click', () => card.remove());
        return card;
    }

    let titleHTML = '';
    let descHTML = '';
    if (locData) {
        const badge = locData.type ? `<span class="hex-type-badge badge-${locData.type}">${locData.type}</span>` : '';
        titleHTML = `
            <div class="hex-terrain-label">${terrainLabel} ${badge}</div>
            <div class="hex-title">${locData.title}</div>`;
        if (locData.desc) {
            descHTML = `<div class="hex-desc">${locData.desc}</div>`;
        }
    }

    let modHTML = '';
    if (modData) {
        const speciesName = formatSpecies(modData.species);
        const rows = [];
        rows.push(`<div class="hex-mod-row"><span class="mod-key">Origin</span> <span class="mod-val">${modData.origin}</span></div>`);
        rows.push(`<div class="hex-mod-row"><span class="mod-key">Species</span> <span class="mod-val">${speciesName}</span></div>`);
        if (modData.threat && modData.threat !== 'None') {
            rows.push(`<div class="hex-mod-row"><span class="mod-key">Threat</span> <span class="mod-val">${modData.threat}</span></div>`);
        }
        modHTML = `<div class="hex-mods">${rows.join('')}</div>`;
    }

    card.innerHTML = `
        <div class="hex-card-inner">
            ${titleHTML}
            ${descHTML}
            ${modHTML}
            <button class="delete-hex">x</button>
        </div>`;

    card.querySelector('.delete-hex').addEventListener('click', () => card.remove());
    return card;
}

// ── Events ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const history = document.getElementById('hex-history');
    const terrain = () => document.getElementById('terrain-pick').value;

    document.getElementById('roll-all-btn').addEventListener('click', () => {
        if (!HEX) return;
        const loc = rollLocation(terrain());
        const mods = rollModifiers(loc.hints || {});
        history.prepend(buildCard(loc._terrain || terrain(), loc, mods));
    });

    document.getElementById('roll-loc-btn').addEventListener('click', () => {
        if (!HEX) return;
        const loc = rollLocation(terrain());
        history.prepend(buildCard(loc._terrain || terrain(), loc, null));
    });

    document.getElementById('roll-mod-btn').addEventListener('click', () => {
        if (!HEX || !SPECIES_LIST.length) return;
        const t = terrain() === 'all' ? TERRAINS[Math.floor(Math.random() * 3)] : terrain();
        history.prepend(buildCard(t, null, rollModifiers()));
    });
    
    document.getElementById('clear-hexes').addEventListener('click', () => {
        history.innerHTML = '';
    });
});

// ── Raw table rendering ─────────────────────────
function buildRawTables() {
    ['desert', 'mountain', 'city'].forEach(t => {
        const container = document.getElementById('raw-' + t);
        if (!container || !HEX[t]) return;
        const table = document.createElement('table');
        table.className = 'hex-table';
        table.innerHTML = '<thead><tr><th>W</th><th>Title</th><th>Type</th><th>Description</th></tr></thead>';
        const tbody = document.createElement('tbody');
        HEX[t].forEach(entry => {
            const tr = document.createElement('tr');
            if (entry.type === 'void') tr.className = 'void-row';
            tr.innerHTML = `
                <td>${entry.weight || 1}</td>
                <td>${entry.title}</td>
                <td><span class="hex-type-badge badge-${entry.type}">${entry.type}</span></td>
                <td>${entry.desc || ''}</td>`;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    });
}

function buildModTables() {
    const origTbody = document.getElementById('t-origin');
    if (origTbody && HEX?.origins) {
        HEX.origins.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${o.name}</td><td>${o.weight || 1}</td>`;
            origTbody.appendChild(tr);
        });
    }

    const threatTbody = document.getElementById('t-threat');
    if (threatTbody && HEX?.threats) {
        HEX.threats.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${t.name}</td><td>${t.weight || 1}</td>`;
            threatTbody.appendChild(tr);
        });
    }

    const speciesTbody = document.getElementById('t-species');
    if (speciesTbody && SPECIES_LIST.length) {
        const grouped = {};
        SPECIES_LIST.forEach(s => {
            const group = s.lineage || 'Other';
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(s);
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

function showRaw(name, btn) {
    document.querySelectorAll('.raw-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.raw-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('raw-' + name).classList.add('active');
    btn.classList.add('active');
}