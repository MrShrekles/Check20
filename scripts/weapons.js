/* ===== State ===== */
let cachedWeapons = [];
const state = {
    exclude: {
        category: new Set(),
        type: new Set(),
        range: new Set(),
        rarity: new Set(),
        properties: new Set(),
    },
};
const RARITY_ORDER = ["common", "uncommon", "rare", "very rare", "legendary", "mythic"];
// top-level (anywhere above applyFilters)
const CATEGORY_ORDER = ["melee", "ranged", "firearm", "magic"];
const categoryRank = c => {
  const i = CATEGORY_ORDER.indexOf((c || "").toLowerCase());
  return i === -1 ? 999 : i;
};


/* ===== Boot ===== */
document.addEventListener('DOMContentLoaded', () => {
    const sortSel = document.getElementById('weapons-sort-options');
    const searchInp = document.getElementById('weapons-search');
    sortSel?.addEventListener('change', applyFilters);
    searchInp?.addEventListener('input', debounce(applyFilters, 120));
    document.getElementById('clearFilters')?.addEventListener('click', clearAll);
    loadWeapons();
});

/* ===== Data load + normalize ===== */
async function loadWeapons() {
    try {
        const resp = await fetch('data/weapons.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const raw = await resp.json();
        cachedWeapons = raw.map(normalizeWeapon).filter(w => w.name);
        buildToggleFilters(cachedWeapons);
        applyFilters();
    } catch (e) {
        console.error('Failed to load weapons.json', e);
        const grid = document.getElementById('weapons-grid');
        if (grid) grid.innerHTML = `<p style="color:#f88">Failed to load weapons data.</p>`;
    }
}

function normalizeWeapon(w) {
    const c = { ...w };
    const low = s => typeof s === 'string' ? s.trim().toLowerCase() : s;

    c.name = (c.name || '').trim();
    c.category = low(c.category || '');     // canonical lower
    c.type = (c.type || '').trim();     // display
    c.typeKey = low(c.type);               // canonical lower
    c.range = low(c.range || '');        // canonical lower (may be comma list)
    c.damageType = low(c.damageType || '');   // canonical lower
    c.rarity = low(c.rarity || 'common'); // canonical lower

    c.properties = normalizeProps(toList(c.properties)); // canonical lower
    c.checks = toList(c.check).map(s => s.trim());

    c.cost = Number(c.cost) || 0;
    c.bulk = Number(c.bulk) || 0;

c.damage = c.damage ? String(c.damage).trim() : '1d4';
c.damageNum = /\d+d\d+!?/i.test(c.damage) ? dicePower(c.damage) : 0;


    c.description = c.description || '';
    c.rangeList = c.range ? c.range.split(',').map(s => s.trim()).filter(Boolean) : [];

    return c;
}

/* ===== Helpers ===== */
function toList(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
    return String(v).split(',').map(s => s.trim()).filter(Boolean);
}
function normalizeProps(list) {
    return (list || []).map(s => String(s).trim().toLowerCase()).filter(Boolean);
}
function capFirst(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function displayList(list) { return (list || []).map(capFirst).join(', '); }
function dicePower(expr) {
    const m = String(expr).toLowerCase().match(/(\d+)d(\+?\d+)(!+)?/); // fallback
    if (!m) {
        const m2 = String(expr).toLowerCase().match(/(\d+)d(\d+)(!+)?/);
        if (!m2) return 0;
        const n = +m2[1], d = +m2[2], bang2 = !!m2[3];
        return n * (d + 1) / 2 + (bang2 ? n * 0.5 : 0);
    }
    const n = +m[1], d = +m[2], bang = !!m[3];
    return n * (d + 1) / 2 + (bang ? n * 0.5 : 0);
}
function rarityRank(r) {
    const i = RARITY_ORDER.indexOf((r || '').toLowerCase());
    return i === -1 ? 999 : i;
}
function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, args), ms); }; }

/* ===== Filter buttons ===== */
function buildToggleFilters(items) {
    const groups = [...document.querySelectorAll('.filter-group')];
    const uniq = { category: new Set(), type: new Set(), range: new Set(), rarity: new Set(), properties: new Set() };
    const CATEGORY_ORDER = ["melee","ranged","firearm","magic"];
const categoryRank = c => {
  const i = CATEGORY_ORDER.indexOf((c||"").toLowerCase());
  return i === -1 ? 999 : i;
};


    items.forEach(w => {
        if (w.category) uniq.category.add(w.category);         // lower
        if (w.typeKey) uniq.type.add(w.typeKey);              // lower
        w.rangeList.forEach(r => uniq.range.add(r));            // lower
        if (w.rarity) uniq.rarity.add(w.rarity);             // lower
        w.properties.forEach(p => uniq.properties.add(p));      // lower
    });

    groups.forEach(g => {
        const key = g.dataset.key; // category|type|range|properties|rarity
        const values = [...(uniq[key] || [])].sort((a, b) => a.localeCompare(b));
        g.innerHTML = '';
        values.forEach(val => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'toggle-btn active';
            btn.textContent = capFirst(val);   // pretty
            btn.dataset.key = key;
            btn.dataset.value = val;           // canonical lower
            btn.setAttribute('aria-pressed', 'true');
            btn.addEventListener('click', () => {
                const set = state.exclude[key];
                if (set.has(val)) {
                    set.delete(val);
                    btn.classList.add('active'); btn.classList.remove('dim'); btn.setAttribute('aria-pressed', 'true');
                } else {
                    set.add(val);
                    btn.classList.remove('active'); btn.classList.add('dim'); btn.setAttribute('aria-pressed', 'false');
                }
                applyFilters();
            });
            g.appendChild(btn);
        });
    });
}

/* ===== Apply filters + render ===== */
function applyFilters() {
    const sortKey = document.getElementById('weapons-sort-options')?.value || 'name';
    const q = (document.getElementById('weapons-search')?.value || '').toLowerCase();

    const out = cachedWeapons.filter(w => {
        // text search
        if (q) {
            const hay = [
                w.name, w.description, w.damageType, w.range, w.rarity,
                ...w.properties, ...w.checks, w.type
            ].join(' ').toLowerCase();
            if (!hay.includes(q)) return false;
        }

        // excludes (all canonical lower)
        if (w.category && state.exclude.category.has(w.category)) return false;
        if (w.typeKey && state.exclude.type.has(w.typeKey)) return false;
        if (w.rarity && state.exclude.rarity.has(w.rarity)) return false;
        if (w.rangeList.length && w.rangeList.some(r => state.exclude.range.has(r))) return false;
        if (state.exclude.properties.size && w.properties.some(p => state.exclude.properties.has(p))) return false;

        return true;
    });

    var countEl = document.getElementById('weapons-count');
    if (countEl) countEl.textContent = `${out.length} item${out.length !== 1 ? 's' : ''}`;

    // sort
    out.sort((a, b) => {
        if (sortKey === 'category') {
            const r = categoryRank(a.category) - categoryRank(b.category);
            return r !== 0 ? r : String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
        }
        if (sortKey === 'rarity') return rarityRank(a.rarity) - rarityRank(b.rarity);
        if (['damageNum', 'cost', 'bulk'].includes(sortKey)) return (b[sortKey] || 0) - (a[sortKey] || 0);
        return String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''), undefined, { sensitivity: 'base' });
    });

    renderWeapons(out);
}

/* ===== Render ===== */
function renderWeapons(list) {
    const container = document.getElementById('weapons-grid');
    container.innerHTML = '';
    list.forEach(w => container.appendChild(renderCard(w)));
}

function renderCard(w) {
    const icon =
        w.category === 'melee' ? `<img src="assets/icons/sword.svg" class="weapon-icon" width="18" height="18" alt="">` :
            w.category === 'firearm' ? `<img src="assets/icons/handgun.svg" class="weapon-icon" width="18" height="18" alt="">` :
                w.category === 'ranged' ? `<img src="assets/icons/bow-arrow.svg" class="weapon-icon" width="18" height="18" alt="">` :
                    w.category === 'magic' ? `<img src="assets/icons/wand.svg" class="weapon-icon" width="18" height="18" alt="">` : `<img src="assets/icons/duck.svg" class="weapon-icon" width="18" height="18" alt="">`;


    const hasProp = (re) => w.properties.some(p => re.test(p));
    const tag = (t, cls) => `<span class="${cls}">${t}</span>`;

    const tagsHTML = `
    <div class="weapon-tags">
      ${tag(capFirst(w.category || 'weapon'), w.category || 'weapon')}
      ${hasProp(/hefty/i) ? tag('Hefty', 'hefty') : ''}
      ${hasProp(/reload/i) ? tag('Reload', 'reload') : ''}
      ${hasProp(/thrown/i) ? tag('Thrown', 'thrown') : ''}
    </div>
  `;

    const card = document.createElement('div');
    card.className = 'weapon-card';
    card.innerHTML = `
    <h4>${icon} ${w.name}</h4>
    ${tagsHTML}
    <ul class="weapon-info">
      <li class="damage"><strong>Damage:</strong> ${w.damage} ${capFirst(w.damageType) || ''}</li>
      <li><strong>Check(s):</strong> ${w.checks.join(', ') || '-'}</li>
      <li><strong>Range:</strong> ${w.rangeList.length ? displayList(w.rangeList) : 'Melee'}</li>
      <li><strong>Properties:</strong> ${displayList(w.properties) || '-'}</li>
      <li><strong>Bulk:</strong> ${w.bulk}</li>
      <li class="damage"><strong>Cost:</strong> ${w.cost} gp</li>
      <li><strong>Rarity:</strong> ${capFirst(w.rarity)}</li>
    </ul>
    ${w.featureName ? `<p><strong>${w.featureName}:</strong> ${w.featureEffect || ''}</p>` : ''}
    ${w.description ? `<p>${w.description}</p>` : ''}
    <div class="weapon-buttons">
      <button class="copy-weapon" data-macro="&{template:shek} {{name=${w.name}}} {{Range=${w.range}}} {{Damage=[[${w.damage}]] ${w.damageType}}} {{desc=${w.description}}} {{${w.featureName}=${w.featureEffect}}}">Chat Copy</button>
      <button class="copy-addweapon">Sheet Copy</button>
    </div>
  `;

    card.querySelector('.copy-weapon').addEventListener('click', e => {
        navigator.clipboard.writeText(e.target.dataset.macro);
        e.target.textContent = "Copied!";
        setTimeout(() => e.target.textContent = "Chat Copy", 1200);
    });

    card.querySelector('.copy-addweapon').addEventListener('click', e => {
        const macro = `!addweapon ${w.name}|${w.damage} ${w.damageType}|${w.category}|${w.rangeList.join(', ')}|${w.properties.join(';')}`;
        navigator.clipboard.writeText(macro).then(() => {
            const old = e.target.textContent; e.target.textContent = "Copied!";
            setTimeout(() => e.target.textContent = old, 1200);
        });
    });

    return card;
}

/* ===== Clear ===== */
function clearAll() {
    Object.values(state.exclude).forEach(set => set.clear());
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.add('active'); btn.classList.remove('dim');
        btn.setAttribute('aria-pressed', 'true');
    });
    applyFilters();
}
