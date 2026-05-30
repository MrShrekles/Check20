/* =========================
   species-ui.js
   Boot, wiring, tabs, option filters, URL sync, collapse persistence, lightbox
   ========================= */

/* ====== Helpers ====== */
const capFirst = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ====== Boot ====== */
document.addEventListener('DOMContentLoaded', async () => {
    restoreCollapsed();
    wireUI();
    await Promise.all([loadSpecies(), loadGods()]);
    buildLineageTabs(SPECIES);
    buildOptionFilters(SPECIES);
    hydrateFromURL();
    refreshFilterButtons();
    applyFilters();
});

/* ====== Filter pip ====== */
function updateFilterPip() {
    const hasFilters = !!state.q || state.exclude.option.size > 0;
    document.getElementById('species-filter-toggle')?.classList.toggle('has-filters', hasFilters);
}

/* ====== UI Wiring ====== */
function wireUI() {
    const q = document.getElementById('species-search');
    const sort = document.getElementById('species-sort');
    const clr = document.getElementById('species-clear');

    const filterToggle = document.getElementById('species-filter-toggle');
    const filterPanel  = document.getElementById('species-filter-panel');
    filterToggle?.addEventListener('click', () => {
        const open = filterPanel.classList.toggle('open');
        filterToggle.classList.toggle('open', open);
    });

    const SPECIES_SIZE = {
        small:  { '--card-min': '300px', '--card-body-size': '0.9rem',  '--card-header-size': '0.9rem',  '--card-lh': '1.5',  '--card-header-pad': '.45rem .6rem', '--card-meta-pad': '.3rem .6rem'  },
        medium: { '--card-min': '500px', '--card-body-size': '1rem',    '--card-header-size': '1rem',    '--card-lh': '1.6',  '--card-header-pad': '.6rem .7rem',  '--card-meta-pad': '.4rem .7rem'  },
        large:  { '--card-min': '700px', '--card-body-size': '1.08rem', '--card-header-size': '1.08rem', '--card-lh': '1.65', '--card-header-pad': '.7rem .85rem', '--card-meta-pad': '.5rem .85rem' },
    };
    const sizeBtns = document.querySelectorAll('.card-size-wrap .size-btn');
    if (sizeBtns.length) {
        const applyCardSize = key => {
            const vars = SPECIES_SIZE[key] || SPECIES_SIZE.medium;
            Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
        };
        const saved = localStorage.getItem('species_card_size') || 'medium';
        applyCardSize(saved);
        sizeBtns.forEach(b => b.classList.toggle('active', b.dataset.size === saved));
        sizeBtns.forEach(b => b.addEventListener('click', () => {
            const s = b.dataset.size;
            applyCardSize(s);
            localStorage.setItem('species_card_size', s);
            sizeBtns.forEach(x => x.classList.toggle('active', x === b));
        }));
    }

    q?.addEventListener('input', debounce(() => {
        state.q = q.value.toLowerCase();
        applyFilters();
    }, 120));

    sort?.addEventListener('change', () => {
        state.sort = sort.value;
        applyFilters();
    });

    clr?.addEventListener('click', () => {
        state.q = ''; if (q) q.value = '';
        Object.values(state.exclude).forEach(set => set.clear());
        refreshFilterButtons();
        applyFilters();
    });

    document.getElementById('collapse-all')?.addEventListener('click', () => {
        state.collapsed = new Set([...document.querySelectorAll('.lineage-section')]
            .map(s => s.dataset.lineageLabel));
        persistCollapsed();
        document.querySelectorAll('.lineage-section').forEach(s => s.classList.add('collapsed'));
        document.querySelectorAll('.option-group').forEach(g => g.classList.add('collapsed'));
    });

    document.getElementById('expand-all')?.addEventListener('click', () => {
        state.collapsed.clear();
        persistCollapsed();
        document.querySelectorAll('.lineage-section').forEach(s => s.classList.remove('collapsed'));
        document.querySelectorAll('.option-group').forEach(g => g.classList.remove('collapsed'));
    });

    wireLightbox();

    document.addEventListener('click', e => {
        const img = e.target.closest('img.cover');
        if (!img) return;
        const cardSlug = img.dataset.slug;
        const sp = SPECIES.find(s => s.slug === cardSlug);
        openLightbox(sp ? sp.images : [img.currentSrc || img.src], 0, img.alt);
    });
}

/* ====== Lineage Tabs ====== */
function buildLineageTabs(items) {
    const container = document.getElementById('lineage-tabs');
    if (!container) return;

    const lineages = [...new Set(items.map(s => s.lineage).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    frag.appendChild(makeTab('All', 'all'));
    lineages.forEach(L => frag.appendChild(makeTab(L, L.toLowerCase())));
    container.appendChild(frag);

    setActiveTab('all');
}

function makeTab(label, key) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.textContent = label;
    btn.dataset.lineage = key;
    btn.addEventListener('click', () => {
        state.selectedLineage = key;
        state.exclude.option.clear();
        setActiveTab(key);
        const pool = key === 'all' ? SPECIES : SPECIES.filter(s => s.lineageKey === key);
        buildOptionFilters(pool);
        refreshFilterButtons();
        applyFilters();
    });
    return btn;
}

function setActiveTab(key) {
    document.querySelectorAll('#lineage-tabs .tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lineage === key);
    });
}

/* ====== Option Filters ====== */
function buildOptionFilters(items) {
    const group = document.querySelector('.filter-group[data-key="option"]');
    if (!group) return;

    const options = [...new Set(items.map(s => s.optionKey).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    state.filterUniverse.option = new Set(options);

    const frag = document.createDocumentFragment();
    const h = document.createElement('h4');
    h.textContent = 'Option';
    frag.appendChild(h);

    options.forEach(val => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'toggle-btn active';
        btn.textContent = capFirst(val); btn.dataset.key = 'option'; btn.dataset.value = val;
        btn.addEventListener('click', () => {
            isolateToggle('option', val);
            applyFilters(); refreshFilterButtons();
        });
        frag.appendChild(btn);
    });

    group.innerHTML = '';
    group.appendChild(frag);
}

function refreshFilterButtons() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        const key = btn.dataset.key, val = btn.dataset.value;
        const active = !state.exclude[key]?.has(val);
        btn.classList.toggle('active', active);
        btn.classList.toggle('dim', !active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

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

/* ====== Apply filters ====== */
function applyFilters() {
    let out = SPECIES.filter(s => {
        if (state.selectedLineage !== 'all' && s.lineageKey !== state.selectedLineage) return false;

        if (state.q) {
            const hay = [
                s.name, s.lineage, s.option, s.rarity, s.region, s.size,
                s.description?.physical, s.description?.environment, s.description?.culture, s.description?.lore,
                ...(s.features || []).flatMap(f => [f.name, f.description, f.action, f.damage, f.type, ...(f.options || []).map(o => o.name || o.effect || '')])
            ].join(' ').toLowerCase();
            if (!hay.includes(state.q)) return false;
        }

        if (s.optionKey && state.exclude.option.has(s.optionKey)) return false;

        return true;
    });

    out.sort((a, b) => {
        if (state.sort === 'rarity') return rarityRank(a.rarity) - rarityRank(b.rarity) || a.name.localeCompare(b.name);
        if (state.sort === 'lineage') return a.lineage.localeCompare(b.lineage) || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
    });

    const countEl = document.getElementById('species-count');
    if (countEl) countEl.textContent = `${out.length} result${out.length === 1 ? '' : 's'}`;

    updateFilterPip();
    renderGrid(out);
}

/* ====== Collapse persistence ====== */
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

    const q = document.getElementById('species-search');
    const sort = document.getElementById('species-sort');
    if (q) q.value = state.q;
    if (sort) sort.value = state.sort;
}

/* ====== Lightbox ====== */
let _lbImages = [];
let _lbIndex = 0;

function wireLightbox() {
    const dialog = document.getElementById('species-lightbox');
    if (!dialog) return;

    dialog.querySelector('.close')?.addEventListener('click', () => closeLightbox());
    document.getElementById('lb-prev')?.addEventListener('click', () => stepLightbox(-1));
    document.getElementById('lb-next')?.addEventListener('click', () => stepLightbox(1));

    dialog.addEventListener('click', e => { if (e.target === dialog) closeLightbox(); });
    document.addEventListener('keydown', e => {
        if (!dialog.open) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') stepLightbox(-1);
        if (e.key === 'ArrowRight') stepLightbox(1);
    });
}

function openLightbox(images, index = 0, alt = '') {
    _lbImages = Array.isArray(images) ? images : [images];
    _lbIndex = index;
    updateLightboxFrame(alt);
    document.getElementById('species-lightbox')?.showModal();
    document.body.classList.add('stop-scroll');
}

function closeLightbox() {
    document.getElementById('species-lightbox')?.close();
    document.body.classList.remove('stop-scroll');
}

function stepLightbox(dir) {
    if (_lbImages.length <= 1) return;
    _lbIndex = (_lbIndex + dir + _lbImages.length) % _lbImages.length;
    updateLightboxFrame();
}

function updateLightboxFrame(alt = '') {
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    const prev = document.getElementById('lb-prev');
    const next = document.getElementById('lb-next');

    if (img) { img.src = _lbImages[_lbIndex]; if (alt) img.alt = alt; }
    if (caption) caption.textContent = _lbImages.length > 1 ? `${_lbIndex + 1} / ${_lbImages.length}` : '';

    const multi = _lbImages.length > 1;
    if (prev) prev.style.display = multi ? '' : 'none';
    if (next) next.style.display = multi ? '' : 'none';
}