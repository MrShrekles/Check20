/* ─── vehicles-data.js ───────────────────────────────────────────────────── */
let VEHICLES_ALL = [];

const vehicleState = {
    q: '',
    selectedCategory: 'all',
    exclude: { rarity: new Set() },
    collapsed: new Set(),
    filterUniverse: { rarity: new Set() },
};

async function loadVehicles() {
    const res  = await fetch('data/vehicles.json');
    const json = await res.json();

    VEHICLES_ALL = (json.vehicles || []).map(e => ({
        ...e,
        rarityKey: (e.rarity || '').toLowerCase(),
        searchKey: [
            e.name, e.subtitle, e.category, e.rarity, e.desc,
            ...(e.features || []).flatMap(f => [f.name, f.effect])
        ].filter(Boolean).join(' ').toLowerCase(),
    }));

    document.dispatchEvent(new Event('vehicles-ready'));
}

document.addEventListener('DOMContentLoaded', loadVehicles);
