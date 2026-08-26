/* ─── class-codex-ui.js ──────────────────────────────────────────────────────
   Toolbar, class tabs, origin/type filters for class-codex.html.
   Mirrors the curses-ui.js pattern.
   ───────────────────────────────────────────────────────────────────────── */

const debounceClass = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

document.addEventListener('class-codex-ready', () => {
    wireClassUI();
    buildClassTabs();
    buildClassFilters();
    refreshClassFilterButtons();
    applyClassFilters();
});

function wireClassUI() {
    const q    = document.getElementById('class-search');
    const sort = document.getElementById('class-sort');
    const clr  = document.getElementById('class-clear');

    const filterToggle = document.getElementById('class-filter-toggle');
    const filterPanel  = document.getElementById('class-filter-panel');
    filterToggle?.addEventListener('click', () => {
        const open = filterPanel.classList.toggle('open');
        filterToggle.classList.toggle('open', open);
    });

    q?.addEventListener('input', debounceClass(() => {
        classState.q = q.value.toLowerCase();
        applyClassFilters();
    }, 120));

    sort?.addEventListener('change', () => {
        classState.sort = sort.value;
        applyClassFilters();
    });

    clr?.addEventListener('click', () => {
        classState.q = ''; if (q) q.value = '';
        Object.values(classState.exclude).forEach(set => set.clear());
        refreshClassFilterButtons();
        applyClassFilters();
    });

    document.getElementById('class-collapse-all')?.addEventListener('click', () => setAllClassRows(false));
    document.getElementById('class-expand-all')?.addEventListener('click', () => setAllClassRows(true));

    initCodexSize();
}

function setAllClassRows(open) {
    document.querySelectorAll('#class-sections .spell-row').forEach(r => {
        r.classList.toggle('open', open);
        const a = r.querySelector('.spell-row-arrow');
        if (a) a.innerHTML = open ? '&#9660;' : '&#9654;';
    });
}

/* ── Class tabs (All / Tank / Professional / ...) ── */
function buildClassTabs() {
    const container = document.getElementById('lineage-tabs');
    if (!container) return;

    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    frag.appendChild(makeClassTab('All', 'all'));
    (classState.classOrder || CLASS_ORDER).forEach(k =>
        frag.appendChild(makeClassTab(capFirstClass(k), k))
    );
    container.appendChild(frag);

    setActiveClassTab('all');
}

function makeClassTab(label, key) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.textContent = label;
    btn.dataset.class = key;
    btn.addEventListener('click', () => {
        classState.selectedClass = key;
        setActiveClassTab(key);
        applyClassFilters();
        document.querySelector('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return btn;
}

function setActiveClassTab(key) {
    document.querySelectorAll('#lineage-tabs .tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.class === key);
    });
}

/* ── Filter pills: Type (path/talent) and Origin ── */
function buildClassFilters() {
    buildClassFilterGroup('kind', ['path', 'talent'], k => k === 'path' ? 'Path' : 'Talent', false);

    const origins = [...new Set(CLASS_ALL.map(e => e.originKey).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    buildClassFilterGroup('origin', origins, capFirstClass, true);
}

function buildClassFilterGroup(key, values, labelFn, colored) {
    const group = document.querySelector(`#class-filter-panel .filter-group[data-key="${key}"]`);
    if (!group) return;

    classState.filterUniverse[key] = new Set(values);

    const frag = document.createDocumentFragment();
    const h = document.createElement('h4');
    h.textContent = key === 'kind' ? 'Type' : 'Origin';
    frag.appendChild(h);

    values.forEach(val => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'toggle-btn active' + (colored ? ' origin-pill' : '');
        btn.textContent = labelFn(val);
        btn.dataset.key = key;
        btn.dataset.value = val;
        if (colored) btn.style.setProperty('--pill-accent', originColor(val));
        btn.addEventListener('click', () => {
            isolateClassToggle(key, val);
            applyClassFilters();
            refreshClassFilterButtons();
        });
        frag.appendChild(btn);
    });

    group.innerHTML = '';
    group.appendChild(frag);
}

function refreshClassFilterButtons() {
    document.querySelectorAll('#class-filter-panel .toggle-btn').forEach(btn => {
        const active = !classState.exclude[btn.dataset.key]?.has(btn.dataset.value);
        btn.classList.toggle('active', active);
        btn.classList.toggle('dim', !active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

// Click isolates to that value; clicking the isolated value again restores all.
function isolateClassToggle(key, val) {
    const all = classState.filterUniverse[key];
    const ex  = classState.exclude[key];
    const isolatedTo = (ex.size === all.size - 1) ? [...all].find(v => !ex.has(v)) : null;

    if (isolatedTo === val) {
        ex.clear();
    } else {
        ex.clear();
        all.forEach(v => { if (v !== val) ex.add(v); });
    }
}

function updateClassFilterPip() {
    const hasFilters = !!classState.q
        || classState.exclude.origin.size > 0
        || classState.exclude.kind.size > 0;
    document.getElementById('class-filter-toggle')?.classList.toggle('has-filters', hasFilters);
}

function applyClassFilters() {
    const filtered = CLASS_ALL.filter(e => {
        if (classState.selectedClass !== 'all' && e.classKey !== classState.selectedClass) return false;
        if (classState.exclude.kind.has(e.kind)) return false;
        if (e.originKey && classState.exclude.origin.has(e.originKey)) return false;
        if (classState.q && !e.searchKey.includes(classState.q)) return false;
        return true;
    });

    updateClassFilterPip();
    renderClassCodex(filtered);
}
