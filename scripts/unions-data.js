/* ─── unions-data.js ────────────────────────────────────────────────────────
   Loads data/unions.json and exposes UNIONS_DATA + UNIONS_MAP globally.
   ─────────────────────────────────────────────────────────────────────────── */

let UNIONS_DATA = [];
let UNIONS_MAP  = new Map();

async function loadUnions() {
    const res  = await fetch('data/unions.json');
    const raw  = await res.json();

    UNIONS_DATA = raw.map(u => ({
        ...u,
        slug:      u.slug || u.name.toLowerCase().replace(/\s+/g, '-'),
        searchKey: [
            u.name,
            u.tagline,
            u.desc,
            u.opposition,
            u.location,
            ...(u.names  || []),
            ...(u.leaders || []).map(l => `${l.name} ${l.desc}`),
            ...(u.goods  || []).map(g => `${g.name} ${g.desc}`),
            ...(u.merchantFeatures || []).map(f => `${f.name} ${f.desc}`),
            ...(u.infoAccess || []).map(i => `${i.name} ${i.desc}`),
            ...(u.factions || []).map(f => f.name),
        ].join(' ').toLowerCase(),
    }));

    UNIONS_DATA.forEach(u => UNIONS_MAP.set(u.slug, u));

    document.dispatchEvent(new Event('unions-ready'));
}

document.addEventListener('DOMContentLoaded', loadUnions);
