/* ─── class-codex-data.js ────────────────────────────────────────────────────
   Flattens data/class-new.json (paths + talents per class) and data/classes.json
   (base class blurb, features, equipment) into a single row list for the codex
   renderer. One entry per path/talent, plus one "core" entry per class.
   ───────────────────────────────────────────────────────────────────────── */

let CLASS_ALL   = [];   // path/talent rows
let CLASS_CORES = {};   // classKey -> base class object

const classState = {
    q: '',
    selectedClass: 'all',
    sort: 'origin',
    exclude: { origin: new Set(), kind: new Set() },
    filterUniverse: { origin: new Set(), kind: new Set() },
};

const CLASS_ORDER = ['tank', 'professional', 'support', 'merchant', 'mage'];
const CLASS_KIND_LABEL = { path: 'Paths', talent: 'Talents' };

const capFirstClass = s => s ? s[0].toUpperCase() + s.slice(1) : s;

function classKey(name) {
    return String(name || '').trim().toLowerCase();
}

function buildClassEntry(clsKey, entry, kind) {
    const steps = entry[kind]?.steps || [];
    return {
        classKey:  clsKey,
        classLabel: capFirstClass(clsKey),
        name:      entry.name,
        origin:    entry.origin || 'none',
        originKey: classKey(entry.origin),
        desc:      entry.desc || '',
        kind,                                   // 'path' | 'talent'
        kindLabel: kind === 'path' ? 'Path' : 'Talent',
        steps,
        searchKey: [
            entry.name, entry.origin, entry.desc, clsKey, kind,
            ...steps.flatMap(s => [s.name, s.description, s.action, s.check, s.condition])
        ].filter(Boolean).join(' ').toLowerCase(),
    };
}

async function loadClassCodex() {
    let base = [], opts = {};
    try {
        const [baseRes, optRes] = await Promise.all([
            fetch('data/classes.json'),
            fetch('data/class-new.json'),
        ]);
        base = (await baseRes.json()).classes || [];
        opts = (await optRes.json()).classes || {};
    } catch (err) {
        console.error('Error loading class data:', err);
        return;
    }

    CLASS_CORES = {};
    base.forEach(c => { CLASS_CORES[classKey(c.name)] = c; });

    const keys = Object.keys(opts).filter(k => k !== 'specializations');
    keys.sort((a, b) => {
        const ia = CLASS_ORDER.indexOf(a), ib = CLASS_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    CLASS_ALL = [];
    keys.forEach(k => {
        (opts[k] || []).forEach(entry => {
            if (entry.path?.steps?.length)   CLASS_ALL.push(buildClassEntry(k, entry, 'path'));
            if (entry.talent?.steps?.length) CLASS_ALL.push(buildClassEntry(k, entry, 'talent'));
        });
    });

    classState.classOrder = keys;
    document.dispatchEvent(new Event('class-codex-ready'));
}

document.addEventListener('DOMContentLoaded', loadClassCodex);
