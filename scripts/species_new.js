/* =========================
   Species Browser (Check20)
   ========================= */

/* ====== State ====== */
let SPECIES = [];
const state = {
    q: '',
    exclude: { lineage: new Set(), option: new Set(), rarity: new Set(), region: new Set() },
    sort: 'name',
    collapsed: new Set(),                       // lineage names (case-sensitive)
    filterUniverse: { lineage: new Set(), option: new Set(), rarity: new Set(), region: new Set() }
};

const RARITY_ORDER = ["common", "uncommon", "rare", "very rare", "legendary", "mythic"];
const rarityRank = r => {
    const i = RARITY_ORDER.indexOf(String(r || '').toLowerCase());
    return i === -1 ? 999 : i;
};

/* ====== Boot ====== */
document.addEventListener('DOMContentLoaded', async () => {
    restoreCollapsed();
    wireUI();
    await loadSpecies();          // loads species_new.json only
    buildFilters(SPECIES);        // build buttons & record universes
    hydrateFromURL();             // apply URL -> state (after buttons exist)
    refreshFilterButtons();       // reflect URL state on buttons
    applyFilters();               // initial render
});

/* ====== Data ====== */
async function loadSpecies() {
    const tryPaths = ['data/species_new.json', 'species_new.json'];
    for (const p of tryPaths) {
        try {
            const r = await fetch(p, { cache: 'no-store' });
            if (!r.ok) continue;
            const raw = await r.json();
            SPECIES = normalizeSpecies(raw.species || raw || []);
            return;
        } catch { }
    }
    console.error('Could not load species_new.json');
}

function normalizeSpecies(arr) {
    const low = v => typeof v === 'string' ? v.trim().toLowerCase() : v;
    return arr.map(s => {
        const o = { ...s };
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

        // Build features[] from either existing array or flat keys
        let features = Array.isArray(o.features) ? o.features : null;
        if (!features) {
            const flatFeature = {
                name: s.feature_name || s.featureName || s.fetName || 'Feature',
                description: s.feature_effect || s.featureEffect || s.fetEffect || '',
                action: s.fetAction || s.action || '',
                damage: s.fetDamage || s.damage || '',
                type: s.fetDamagetype || s.fetDamageType || s.damageType || s.type || ''
            };
            const hasAny = Object.values(flatFeature).some(v => (v ?? '').toString().trim().length);
            features = hasAny ? [flatFeature] : [];
        }
        o.features = features.map(f => ({
            name: (f.name ?? '').toString().trim() || 'Feature',
            description: (f.description ?? '').toString().trim(),
            action: (f.action ?? '').toString().trim(),
            damage: (f.damage ?? '').toString().trim(),
            type: (f.type ?? '').toString().trim(),
            options: Array.isArray(f.options) ? f.options : []
        }));

        // Images: explicit or default by slug
        if (!o.images || !o.images.length) {
            const placeholder = (typeof PLACEHOLDER_MAP !== 'undefined')
                ? PLACEHOLDER_MAP?.[o.lineage]?.[o.option]
                : null;
            o.images = [placeholder || `assets/species/${o.slug}.jpg`];
        }

        return o;
    });
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

/* ====== UI wiring ====== */
function wireUI() {
    const q = document.getElementById('species-search');
    const sort = document.getElementById('species-sort');
    const clr = document.getElementById('species-clear');

    q?.addEventListener('input', debounce(() => {
        state.q = q.value.toLowerCase();
        syncURL(); applyFilters();
    }, 120));

    sort?.addEventListener('change', () => {
        state.sort = sort.value;
        syncURL(); applyFilters();
    });

    clr?.addEventListener('click', () => {
        state.q = ''; if (q) q.value = '';
        Object.values(state.exclude).forEach(set => set.clear()); // all active
        refreshFilterButtons();
        syncURL(); applyFilters();
    });

    // Global collapsers
    document.getElementById('collapse-all')?.addEventListener('click', () => {
        state.collapsed = new Set([...document.querySelectorAll('.lineage-section')]
            .map(s => s.dataset.lineageLabel));
        persistCollapsed();
        document.querySelectorAll('.lineage-section').forEach(s => s.classList.add('collapsed'));
    });
    document.getElementById('expand-all')?.addEventListener('click', () => {
        state.collapsed.clear();
        persistCollapsed();
        document.querySelectorAll('.lineage-section').forEach(s => s.classList.remove('collapsed'));
    });

    // Lightbox: event delegation so we don’t bind per-card
    ensureLightbox();
    document.addEventListener('click', (e) => {
        const img = e.target.closest('img.cover');
        if (!img) return;
        openLightbox(img.currentSrc || img.src, img.alt);
    });
}

/* ====== Filters ====== */
function buildFilters(items) {
    const uniq = { lineage: new Set(), option: new Set(), rarity: new Set(), region: new Set() };
    items.forEach(s => {
        if (s.lineageKey) uniq.lineage.add(s.lineageKey);
        if (s.optionKey) uniq.option.add(s.optionKey);
        if (s.rarityKey) uniq.rarity.add(s.rarityKey);
        s.regionKeys.forEach(r => uniq.region.add(r));
    });

    // store universes
    for (const k of Object.keys(uniq)) state.filterUniverse[k] = new Set(uniq[k]);

    document.querySelectorAll('.filter-group').forEach(group => {
        const key = group.dataset.key; // lineage|option|rarity|region
        const vals = [...(uniq[key] || [])].sort((a, b) => a.localeCompare(b));
        // build buttons
        const frag = document.createDocumentFragment();
        const h = document.createElement('h4'); h.textContent = capFirst(key);
        frag.appendChild(h);

        vals.forEach(val => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'toggle-btn active';
            btn.textContent = capFirst(val); btn.dataset.key = key; btn.dataset.value = val;
            btn.addEventListener('click', () => {
                isolateToggle(key, val);
                syncURL(); applyFilters(); refreshFilterButtons();
            });
            frag.appendChild(btn);
        });

        group.innerHTML = '';
        group.appendChild(frag);
    });
}

function refreshFilterButtons() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        const key = btn.dataset.key, val = btn.dataset.value;
        const active = !state.exclude[key].has(val);
        btn.classList.toggle('active', active);
        btn.classList.toggle('dim', !active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

/**
 * Isolate behavior (per group):
 * - All active -> click val => isolate val (exclude all others)
 * - Isolated to val -> click val => clear excludes (back to all active)
 * - Isolated to other -> click val => switch isolate to val
 */
function isolateToggle(key, val) {
    const all = state.filterUniverse[key];
    const ex = state.exclude[key];

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

/* ====== Apply + Render ====== */
function applyFilters() {
    let out = SPECIES.filter(s => {
        if (state.q) {
            const hay = [
                s.name, s.lineage, s.option, s.rarity, s.region, s.size, s.description,
                ...(s.features || []).flatMap(f => [f.name, f.description, f.action, f.damage, f.type, ...(f.options || []).map(o => o.name || o.effect || '')])
            ].join(' ').toLowerCase();
            if (!hay.includes(state.q)) return false;
        }
        if (s.lineageKey && state.exclude.lineage.has(s.lineageKey)) return false;
        if (s.optionKey && state.exclude.option.has(s.optionKey)) return false;
        if (s.rarityKey && state.exclude.rarity.has(s.rarityKey)) return false;
        if (s.regionKeys.length && s.regionKeys.some(r => state.exclude.region.has(r))) return false;
        return true;
    });

    // sort
    out.sort((a, b) => {
        if (state.sort === 'rarity') return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name);
        if (state.sort === 'lineage') return a.lineage.localeCompare(b.lineage) || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
    });

    const countEl = document.getElementById('species-count');
    if (countEl) countEl.textContent = `${out.length} result${out.length === 1 ? '' : 's'}`;

    renderGrid(out);
}

function renderGrid(list) {
    const wrap = document.getElementById('species-sections');
    if (!wrap) return;
    wrap.innerHTML = '';

    // group by lineage
    const byLineage = list.reduce((m, s) => {
        const L = s.lineage || 'Other';
        (m[L] ||= []).push(s);
        return m;
    }, {});

    const lineageNames = Object.keys(byLineage).sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return a.localeCompare(b);
    });

    const outerFrag = document.createDocumentFragment();

    lineageNames.forEach(L => {
        const sec = document.createElement('section');
        sec.className = 'lineage-section';
        sec.dataset.lineage = L.toLowerCase();
        sec.dataset.lineageLabel = L; // used by collapse-all

        // header with twisty + count; click toggles collapse
        const header = document.createElement('div');
        header.className = 'lineage-header';
        header.innerHTML = `
      <span class="twisty">▸</span>
      <h2 style="margin:0">${escapeHTML(L)}</h2>
      <span class="count">(${byLineage[L].length})</span>
    `;
        header.addEventListener('click', () => {
            const now = !isCollapsed(L);
            setCollapsed(L, now);
            sec.classList.toggle('collapsed', now);
            if (!now) sec.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
        sec.appendChild(header);

        // initial collapse state
        sec.classList.toggle('collapsed', isCollapsed(L));

        // group by option within lineage
        const byOption = byLineage[L].reduce((m, s) => {
            const O = s.option || 'General';
            (m[O] ||= []).push(s);
            return m;
        }, {});
        const optionNames = Object.keys(byOption).sort((a, b) => a.localeCompare(b));

        optionNames.forEach(O => {
            const oh = document.createElement('div');
            oh.className = 'option-header';
            oh.innerHTML = `<h3>${escapeHTML(O)} <small style="opacity:.6">(${byOption[O].length})</small></h3>`;
            sec.appendChild(oh);

            const grid = document.createElement('div');
            grid.className = 'lineage-grid';

            const gridFrag = document.createDocumentFragment();
            byOption[O].forEach(s => gridFrag.appendChild(renderCard(s)));
            grid.appendChild(gridFrag);

            sec.appendChild(grid);
        });

        outerFrag.appendChild(sec);
    });

    wrap.appendChild(outerFrag);
}

function renderCard(s) {
    const el = document.createElement('article');
    el.className = 'species-card';
    const cover = s.images?.[0] || `assets/species/${s.slug}.jpg`;

    const chips = [
        s.rarity && `<span class="chip">${escapeHTML(s.rarity)}</span>`,
        ...(s.regionList || []).map(r => `<span class="chip">${escapeHTML(r)}</span>`)
    ].filter(Boolean).join('');

    const pf = (s.features && s.features[0]) ? s.features[0] : null;

    el.innerHTML = `
    <img class="cover" loading="lazy" src="${cover}" alt="${escapeHTML(s.name)}">
    <header><h3>${escapeHTML(s.name)}</h3></header>
    <div class="species-meta">${chips}</div>
    <div class="species-body collapsed">${escapeHTML(s.description || '')}</div>
    <a class="read-more" role="button">Read full</a>
    ${pf ? renderFeatureLine(pf) : ''}
  `;

    // Description toggle
    const body = el.querySelector('.species-body');
    const btn = el.querySelector('.read-more');
    const toggle = () => {
        const isCollapsed = body.classList.toggle('collapsed');
        btn.textContent = isCollapsed ? 'Read full' : 'Show less';
    };
    btn.addEventListener('click', toggle);

    // Auto-expand short blurbs
    if ((s.description || '').length < 220) {
        body.classList.remove('collapsed');
        btn.style.display = 'none';
    }

    return el;
}

/* ====== Feature block ====== */
function renderFeatureLine(f) {
    const name = (f.name || 'Feature').trim();
    const action = (f.action || '').toString().trim();
    const dmg = (f.damage || '').toString().trim();
    const dtype = (f.type || '').toString().trim();
    const effect = (f.description || '').toString().trim();

    const actionPill = action ? `<span class="feature-pill pill-action">${escapeHTML(action)}</span>` : '';
    const dmgBits = [dmg, dtype].filter(Boolean).join(', ');
    const dmgPill = dmgBits ? `<span class="feature-pill pill-dmg">${escapeHTML(dmgBits)}</span>` : '';

    return `
    <div class="feature-line">
      <div class="feature-name">${escapeHTML(name)}</div>
      <div class="feature-pills">${actionPill} ${dmgPill}</div>
      <div class="feature-effect">${escapeHTML(effect)}</div>
    </div>
  `;
}

/* ====== Collapse state helpers ====== */
function isCollapsed(lineage) { return state.collapsed.has(lineage); }
function setCollapsed(lineage, val) {
    if (val) state.collapsed.add(lineage); else state.collapsed.delete(lineage);
    persistCollapsed();
}
function persistCollapsed() {
    try { sessionStorage.setItem('species_collapsed', JSON.stringify([...state.collapsed])); } catch { }
}
function restoreCollapsed() {
    try {
        const raw = sessionStorage.getItem('species_collapsed');
        if (raw) state.collapsed = new Set(JSON.parse(raw));
    } catch { }
}

/* ====== URL sync ====== */
function hydrateFromURL() {
    const params = new URLSearchParams(location.search);
    state.q = (params.get('q') || '').toLowerCase();
    state.sort = params.get('sort') || 'name';

    // reset excludes then reapply from URL
    for (const key of Object.keys(state.exclude)) state.exclude[key].clear();
    for (const key of Object.keys(state.exclude)) {
        const v = params.getAll(key);
        v.forEach(x => state.exclude[key].add(x.toLowerCase()));
    }

    const q = document.getElementById('species-search');
    const sort = document.getElementById('species-sort');
    if (q) q.value = state.q;
    if (sort) sort.value = state.sort;
}

function syncURL() {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.sort && state.sort !== 'name') params.set('sort', state.sort);
    for (const [k, set] of Object.entries(state.exclude)) {
        [...set].forEach(v => params.append(k, v));
    }
    history.replaceState({}, '', '?' + params.toString());
}

/* ====== Utils ====== */
function capFirst(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); } }
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

/* ====== Lightbox ====== */
function ensureLightbox() {
    if (document.getElementById('img-lightbox')) return;
    const box = document.createElement('div');
    box.id = 'img-lightbox';
    box.innerHTML = `<span class="close" aria-label="Close">✕</span><img alt="">`;
    document.body.appendChild(box);

    const close = () => { box.classList.remove('open'); document.body.classList.remove('stop-scroll'); };
    box.addEventListener('click', (e) => { if (e.target === box || e.target.classList.contains('close')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function openLightbox(src, alt = '') {
    const box = document.getElementById('img-lightbox');
    const img = box.querySelector('img');
    img.src = src; img.alt = alt;
    box.classList.add('open');
    document.body.classList.add('stop-scroll');
}
