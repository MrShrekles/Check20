/* ========================
   STATE
   ======================== */
let SPECIES = [];
let DRAGON_TYPES = [];
const state = {
    speciesSlug: null,                    // current species slug
    optionKey: 'general',                 // current option key
    dragonType: localStorage.getItem('c20.dragonType') || null
};

/* ========================
   UTILS
   ======================== */
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const low = s => String(s || '').toLowerCase().trim();
const trim = s => String(s || '').replace(/\s+/g, ' ').trim();
const cap = s => String(s || '').replace(/\b\w/g, c => c.toUpperCase());
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/* ========================
   LOADERS
   ======================== */
/** Load species_new.json from common paths, then normalize lists. */
async function loadSpeciesData() {
    const paths = ['data/species_new.json', 'species_new.json'];
    for (const p of paths) {
        try {
            const res = await fetch(p);
            if (!res.ok) continue;
            const json = await res.json();
            SPECIES = normalizeSpecies(json.species || []);
            DRAGON_TYPES = normalizeDragonTypes(json.dragonTypes || []);
            return;
        } catch {/* try next */ }
    }
    console.error('[Check20] Could not load species_new.json');
}

/* Simple eligibility: explicit flags, common lineages, or name hints */
function isDragonEligible(s) {
    if (s.dragonTypeAllowed === true || s.dragonType === true) return true;
    const lin = low(s.lineage);
    if (lin === 'dragon' || lin === 'dragonkin') return true;
    return /(dragon|drake|wyrm|drakon|drakonari|kobari)/i.test(`${s.name} ${s.option} ${s.lineage}`);
}

/* Normalize species to consistent fields. */
function normalizeSpecies(arr) {
    return (arr || []).map(s => {
        // If features is an array, keep it; otherwise, build one feature from legacy fields.
        const feats = Array.isArray(s.features) ? s.features
            : ((s.feature_name || s.featureName || s.features) ? [{
                name: s.feature_name || s.featureName || 'Feature',
                // Map feature_effect → description; fall back to string features if present
                description: s.feature_effect || (typeof s.features === 'string' ? s.features : ''),
                action: s.fetAction || s.action || '',
                damage: s.fetDamage || s.damage || '',
                type: s.fetDamageType || s.damageType || s.type || ''
            }] : []);

        const out = {
            ...s,
            name: trim(s.name),
            slug: slug(s.name),
            lineage: trim(s.lineage),
            option: trim(s.option || ''),
            optionKey: low(s.option || 'general'),
            rarity: trim(s.rarity || ''),
            features: feats.map(f => ({
                name: trim(f.name || 'Feature'),
                description: trim(f.description || ''),
                action: trim(f.action || ''),
                damage: trim(f.damage || ''),
                type: trim(f.type || '')
            })),
            description: trim(s.description || '')
        };
        out.dragonEligible = isDragonEligible(out);
        return out;
    });
}

/* Normalize dragon types: split "Title (Element)" and extract one feature line. */
function normalizeDragonTypes(arr) {
    return (arr || []).map(raw => {
        const name = trim(raw.name);
        const m = name.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
        const title = trim(m?.[1] || name);
        const element = trim(m?.[2] || '');
        const cleaned = trim(String(raw.features || raw.feature || '').replace(/<\/?li>/gi, ''));
        const idx = cleaned.indexOf(':');
        const featureName = idx > -1 ? trim(cleaned.slice(0, idx)) : (cleaned ? cleaned.split(' ')[0] : 'Feature');
        const featureText = idx > -1 ? trim(cleaned.slice(idx + 1)) : trim(cleaned.replace(featureName, ''));
        return { ...raw, name, title, element, slug: slug(name), featureName, featureText };
    });
}

/** Species */
function buildSpeciesSelect() {
    const sel = document.getElementById('species');
    if (!sel) return;

    const groups = new Map();
    SPECIES
        .map(s => {
            const key = `${s.slug}::${s.optionKey || 'general'}`;
            const lin = cap(s.lineage || 'Unknown');
            const optionLabel = s.option ? cap(s.option) : '';
            const nameLabel = cap(s.name);
            const label = optionLabel
                ? `${optionLabel}: ${nameLabel}`   // Option first, both capitalized
                : `${nameLabel}`;                 // Just capitalized name
            return { key, lin, label };
        })
        .sort((a, b) => a.lin.localeCompare(b.lin) || a.label.localeCompare(b.label))
        .forEach(row => {
            if (!groups.has(row.lin)) groups.set(row.lin, []);
            groups.get(row.lin).push(row);
        });

    let html = `<option value="">Select Species</option>`;
    for (const [lin, arr] of groups) {
        html += `<optgroup label="${esc(lin)}">` +
            arr.map(r => `<option value="${esc(r.key)}">${esc(r.label)}</option>`).join('') +
            `</optgroup>`;
    }
    sel.innerHTML = html;

    if (!sel.dataset.wired) {
        sel.addEventListener('change', () => {
            const [slugPart, optPart] = (sel.value || '').split('::');
            state.speciesSlug = slugPart || null;
            state.optionKey = optPart || 'general';
            renderSpeciesBlock();
        });
        sel.dataset.wired = '1';
    }
}



/** Render features and (if eligible) dragon type picker. */
function renderSpeciesBlock() {
    const details = document.getElementById('species-details') ||
        document.querySelector('ul#species-details.feature-list');
    const subs = document.getElementById('subspecies-details');
    if (!details) return;

    // Clear if nothing selected
    if (!state.speciesSlug) {
        details.innerHTML = '';
        if (subs) subs.innerHTML = '';
        return;
    }

    const pick = SPECIES.find(s => s.slug === state.speciesSlug && (s.optionKey || 'general') === state.optionKey)
        || SPECIES.find(s => s.slug === state.speciesSlug);
    if (!pick) {
        details.innerHTML = '';
        if (subs) subs.innerHTML = '';
        return;
    }

    // Push basic fields if present
    const lang = document.getElementById('language');
    const diet = document.getElementById('diet');
    const size = document.getElementById('size');
    if (lang) lang.value = pick.language || '';
    if (diet) diet.value = pick.diet || '';
    if (size) size.value = pick.size || '';

    // Feature names + description inline; add simple pills if present
    details.innerHTML = (pick.features || []).map(f => {
        const pills = [f.action, [f.damage, f.type].filter(Boolean).join(', ')].filter(Boolean)
            .map(x => `<span class="pill">${esc(x)}</span>`).join(' ');
        const desc = f.description ? `: ${esc(f.description)}` : '';
        return `<li><strong>${esc(f.name || 'Feature')}</strong>${desc}${pills ? ' ' + pills : ''}</li>`;
    }).join('') || '';

    // Dragon type (optional)
    if (subs) subs.innerHTML = '';
    if (subs && pick.dragonEligible && DRAGON_TYPES.length) {
        subs.innerHTML = dragonTypeHTML();
        const dsel = subs.querySelector('.dragonTypeSelect');
        if (state.dragonType && !DRAGON_TYPES.some(dt => dt.slug === state.dragonType)) {
            state.dragonType = null;
            localStorage.removeItem('c20.dragonType');
        }
        if (state.dragonType) dsel.value = state.dragonType;

        dsel.addEventListener('change', () => {
            state.dragonType = dsel.value || null;
            if (state.dragonType) localStorage.setItem('c20.dragonType', state.dragonType);
            else localStorage.removeItem('c20.dragonType');
            updateDragonPreview(subs);
        });

        updateDragonPreview(subs);
    }
}

/* ========================
   DRAGON TYPE UI
   ======================== */
function dragonTypeHTML() {
    const opts = DRAGON_TYPES.map(dt => {
        const label = dt.element ? `${dt.title} (${dt.element})` : dt.title;
        const sel = state.dragonType === dt.slug ? ' selected' : '';
        return `<option value="${dt.slug}"${sel}>${esc(label)}</option>`;
    }).join('');
    return `
    <section class="dragon-type">
      <label><strong>Dragon Type</strong></label>
      <select class="dragonTypeSelect">${opts}</select>
      <div class="dragon-type-preview"></div>
    </section>`;
}

function updateDragonPreview(root) {
    const view = root.querySelector('.dragon-type-preview');
    const chosen = DRAGON_TYPES.find(dt => dt.slug === state.dragonType);
    view.innerHTML = chosen ? `
    <p class="dt-feature">
      ${chosen.element ? `<span class="pill">${esc(chosen.element)}</span>` : ''}
      <strong>${esc(chosen.featureName)}:</strong> ${esc(chosen.featureText)}
    </p>` : '';
}

/* ========================
   BOOT
   ======================== */
document.addEventListener('DOMContentLoaded', async () => {
    await loadSpeciesData();
    buildSpeciesSelect();

    // If a species is preselected in the DOM, hydrate state and render
    const sel = document.getElementById('species');
    if (sel && sel.value) {
        const [slugPart, optPart] = (sel.value || '').split('::');
        state.speciesSlug = slugPart || null;
        state.optionKey = optPart || 'general';
    }

    renderSpeciesBlock();
});
