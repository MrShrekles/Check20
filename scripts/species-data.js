/* =========================
   species-data.js
   State, constants, data fetching & normalization
   ========================= */

const RARITY_ORDER = ["common", "uncommon", "rare", "very rare", "legendary", "mythic"];
const rarityRank = r => {
    const i = RARITY_ORDER.indexOf(String(r || '').toLowerCase());
    return i === -1 ? 999 : i;
};
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let SPECIES = [];

const state = {
    q: '',
    selectedLineage: 'all',
    exclude: { option: new Set() },
    sort: 'name',
    collapsed: new Set(),
    filterUniverse: { option: new Set() },
    selectedId: null,
};

async function loadSpecies() {
    const tryPaths = ['data/species_new.json', 'species_new.json'];
    for (const p of tryPaths) {
        try {
            const res = await fetch(p);
            if (!res.ok) continue;
            const json = await res.json();
            SPECIES = normalizeSpecies(json.species || []);
            return;
        } catch { }
    }
    console.error('Could not load species_new.json');
}

function normalizeSpecies(arr) {
    const low = v => typeof v === 'string' ? v.trim().toLowerCase() : v;
    return (arr || []).map(src => {
        const o = { ...src };
        o.name = (o.name || '').trim();
        o.slug = slug(o.name);
        o.lineage = (o.lineage || '').trim();
        o.lineageKey = low(o.lineage);
        o.option = (o.option || '').trim();
        o.optionKey = low(o.option);
        o.rarity = (o.rarity || '').trim();
        o.rarityKey = low(o.rarity);
        o.region = (o.region || '').trim();
        o.regionList = o.region ? String(o.region).split(',').map(x => x.trim()).filter(Boolean) : [];
        o.regionKeys = o.regionList.map(x => x.toLowerCase());
        o.size = String(o.size || '').trim();

        let features = Array.isArray(o.features) ? o.features : null;
        if (!features) {
            const flatFeature = {
                name: o.feature_name || o.featureName || o.fetName || 'Feature',
                description: o.feature_effect || o.featureEffect || o.fetEffect || '',
                action: o.fetAction || o.action || '',
                damage: o.fetDamage || o.damage || '',
                type: o.fetDamagetype || o.fetDamageType || o.damageType || o.type || ''
            };
            const hasAny = Object.values(flatFeature).some(v => (v ?? '').toString().trim().length);
            features = hasAny ? [flatFeature] : [];

            const subName = (o['sub-fet-name'] || '').toString().trim();
            const subEffect = (o['sub-fet-effect'] || '').toString().trim();
            if (subName || subEffect) {
                features.push({
                    name: subName || 'Feature',
                    description: subEffect,
                    action: '',
                    damage: '',
                    type: ''
                });
            }
        }
        o.features = features.map(f => ({
            name: (f.name ?? '').toString().trim() || 'Feature',
            description: (f.description ?? '').toString().trim(),
            action: (f.action ?? '').toString().trim(),
            damage: (f.damage ?? '').toString().trim(),
            type: (f.type ?? '').toString().trim(),
            options: Array.isArray(f.options) ? f.options : []
        }));

        // normalize images to always be an array
        if (o.images && !Array.isArray(o.images)) {
            let src = o.images;
            if (src && !/\.\w{2,4}$/.test(src)) src += '.jpg';
            o.images = [src];
        }
        if (!o.images || !o.images.length) {
            const placeholder = (typeof PLACEHOLDER_MAP !== 'undefined')
                ? PLACEHOLDER_MAP?.[o.lineage]?.[o.option]
                : null;
            o.images = [placeholder || `assets/species/${o.slug}.jpg`];
        }
        return o;
    });
}