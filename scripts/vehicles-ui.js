/* ─── vehicles-ui.js ─────────────────────────────────────────────────────── */

const capFirstVeh = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const debounceVeh = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

document.addEventListener('vehicles-ready', () => {
    wireVehicleUI();
    buildVehicleCategoryTabs(VEHICLES_ALL);
    buildVehicleRarityFilters(VEHICLES_ALL);
    refreshVehicleFilterButtons();
    applyVehicleFilters();
});

function wireVehicleUI() {
    const q = document.getElementById('vehicle-search');
    const clr = document.getElementById('vehicle-clear');

    const filterToggle = document.getElementById('vehicle-filter-toggle');
    const filterPanel  = document.getElementById('vehicle-filter-panel');
    filterToggle?.addEventListener('click', () => {
        const open = filterPanel.classList.toggle('open');
        filterToggle.classList.toggle('open', open);
    });

    q?.addEventListener('input', debounceVeh(() => {
        vehicleState.q = q.value.toLowerCase();
        applyVehicleFilters();
    }, 120));

    clr?.addEventListener('click', () => {
        vehicleState.q = ''; if (q) q.value = '';
        Object.values(vehicleState.exclude).forEach(set => set.clear());
        refreshVehicleFilterButtons();
        applyVehicleFilters();
    });

    document.getElementById('vehicle-collapse-all')?.addEventListener('click', () => {
        document.querySelectorAll('#vehicle-sections .spell-row').forEach(r => {
            r.classList.remove('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▶';
        });
    });

    document.getElementById('vehicle-expand-all')?.addEventListener('click', () => {
        document.querySelectorAll('#vehicle-sections .spell-row').forEach(r => {
            r.classList.add('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▼';
        });
    });

    initCodexSize();
}

/* ── Category tabs (All / Automobiles / Airships / ...) ── */
function buildVehicleCategoryTabs(items) {
    const container = document.getElementById('lineage-tabs');
    if (!container) return;

    const cats = [...new Set(items.map(e => e.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    frag.appendChild(makeVehicleTab('All', 'all'));
    cats.forEach(c => frag.appendChild(makeVehicleTab(VEHICLE_CATEGORY_LABEL[c] || capFirstVeh(c), c)));
    container.appendChild(frag);

    setActiveVehicleTab('all');
}

function makeVehicleTab(label, key) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.textContent = label;
    btn.dataset.category = key;
    btn.addEventListener('click', () => {
        vehicleState.selectedCategory = key;
        setActiveVehicleTab(key);
        applyVehicleFilters();
    });
    return btn;
}

function setActiveVehicleTab(key) {
    document.querySelectorAll('#lineage-tabs .tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === key);
    });
}

/* ── Rarity filters (isolate-toggle pills) ── */
function buildVehicleRarityFilters(items) {
    const group = document.querySelector('#vehicle-filter-panel .filter-group[data-key="rarity"]');
    if (!group) return;

    const rarities = [...new Set(items.map(e => e.rarityKey).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    vehicleState.filterUniverse.rarity = new Set(rarities);

    const frag = document.createDocumentFragment();
    const h = document.createElement('h4');
    h.textContent = 'Rarity';
    frag.appendChild(h);

    rarities.forEach(val => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'toggle-btn active';
        btn.textContent = capFirstVeh(val); btn.dataset.key = 'rarity'; btn.dataset.value = val;
        btn.addEventListener('click', () => {
            isolateVehicleToggle('rarity', val);
            applyVehicleFilters(); refreshVehicleFilterButtons();
        });
        frag.appendChild(btn);
    });

    group.innerHTML = '';
    group.appendChild(frag);
}

function refreshVehicleFilterButtons() {
    document.querySelectorAll('#vehicle-filter-panel .toggle-btn').forEach(btn => {
        const key = btn.dataset.key, val = btn.dataset.value;
        const active = !vehicleState.exclude[key]?.has(val);
        btn.classList.toggle('active', active);
        btn.classList.toggle('dim', !active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function isolateVehicleToggle(key, val) {
    const all = vehicleState.filterUniverse[key];
    const ex = vehicleState.exclude[key];
    const allActive = ex.size === 0;
    const isolatedTo = (ex.size === all.size - 1) ? [...all].find(v => !ex.has(v)) : null;

    if (allActive) {
        ex.clear(); all.forEach(v => { if (v !== val) ex.add(v); });
    } else if (isolatedTo === val) {
        ex.clear();
    } else {
        ex.clear(); all.forEach(v => { if (v !== val) ex.add(v); });
    }
}

/* ── Filter pip ── */
function updateVehicleFilterPip() {
    const hasFilters = !!vehicleState.q || vehicleState.exclude.rarity.size > 0;
    document.getElementById('vehicle-filter-toggle')?.classList.toggle('has-filters', hasFilters);
}

/* ── Apply filters ── */
function applyVehicleFilters() {
    const filtered = VEHICLES_ALL.filter(e => {
        if (vehicleState.selectedCategory !== 'all' && e.category !== vehicleState.selectedCategory) return false;
        if (e.rarityKey && vehicleState.exclude.rarity.has(e.rarityKey)) return false;
        if (vehicleState.q && !e.searchKey.includes(vehicleState.q)) return false;
        return true;
    });

    updateVehicleFilterPip();
    renderVehicles(filtered);
}
