/* ─── curses-ui.js ───────────────────────────────────────────────────────── */

const capFirstCurse = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const debounceCurse = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

document.addEventListener('curses-ready', () => {
    wireCurseUI();
    buildCurseTypeTabs(CURSES_ALL);
    buildCurseSourceFilters(CURSES_ALL);
    refreshCurseFilterButtons();
    applyCurseFilters();
});

function wireCurseUI() {
    const q = document.getElementById('curse-search');
    const clr = document.getElementById('curse-clear');

    const filterToggle = document.getElementById('curse-filter-toggle');
    const filterPanel  = document.getElementById('curse-filter-panel');
    filterToggle?.addEventListener('click', () => {
        const open = filterPanel.classList.toggle('open');
        filterToggle.classList.toggle('open', open);
    });

    q?.addEventListener('input', debounceCurse(() => {
        curseState.q = q.value.toLowerCase();
        applyCurseFilters();
    }, 120));

    clr?.addEventListener('click', () => {
        curseState.q = ''; if (q) q.value = '';
        Object.values(curseState.exclude).forEach(set => set.clear());
        refreshCurseFilterButtons();
        applyCurseFilters();
    });

    document.getElementById('curse-collapse-all')?.addEventListener('click', () => {
        document.querySelectorAll('#curse-sections .spell-row').forEach(r => {
            r.classList.remove('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▶';
        });
    });

    document.getElementById('curse-expand-all')?.addEventListener('click', () => {
        document.querySelectorAll('#curse-sections .spell-row').forEach(r => {
            r.classList.add('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▼';
        });
    });

    initCodexSize();
}

/* ── Type tabs (All / Curses / Diseases) ── */
function buildCurseTypeTabs(items) {
    const container = document.getElementById('lineage-tabs');
    if (!container) return;

    const types = [...new Set(items.map(e => e.type).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    frag.appendChild(makeCurseTab('All', 'all'));
    types.forEach(t => frag.appendChild(makeCurseTab(CURSE_TYPE_LABEL[t] || capFirstCurse(t), t)));
    container.appendChild(frag);

    setActiveCurseTab('all');
}

function makeCurseTab(label, key) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.textContent = label;
    btn.dataset.type = key;
    btn.addEventListener('click', () => {
        curseState.selectedType = key;
        setActiveCurseTab(key);
        applyCurseFilters();
    });
    return btn;
}

function setActiveCurseTab(key) {
    document.querySelectorAll('#lineage-tabs .tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === key);
    });
}

/* ── Source filters (isolate-toggle pills) ── */
function buildCurseSourceFilters(items) {
    const group = document.querySelector('#curse-filter-panel .filter-group[data-key="source"]');
    if (!group) return;

    const sources = [...new Set(items.map(e => e.sourceKey).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    curseState.filterUniverse.source = new Set(sources);

    const frag = document.createDocumentFragment();
    const h = document.createElement('h4');
    h.textContent = 'Source';
    frag.appendChild(h);

    sources.forEach(val => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'toggle-btn active';
        btn.textContent = capFirstCurse(val); btn.dataset.key = 'source'; btn.dataset.value = val;
        btn.addEventListener('click', () => {
            isolateCurseToggle('source', val);
            applyCurseFilters(); refreshCurseFilterButtons();
        });
        frag.appendChild(btn);
    });

    group.innerHTML = '';
    group.appendChild(frag);
}

function refreshCurseFilterButtons() {
    document.querySelectorAll('#curse-filter-panel .toggle-btn').forEach(btn => {
        const key = btn.dataset.key, val = btn.dataset.value;
        const active = !curseState.exclude[key]?.has(val);
        btn.classList.toggle('active', active);
        btn.classList.toggle('dim', !active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function isolateCurseToggle(key, val) {
    const all = curseState.filterUniverse[key];
    const ex = curseState.exclude[key];
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
function updateCurseFilterPip() {
    const hasFilters = !!curseState.q || curseState.exclude.source.size > 0;
    document.getElementById('curse-filter-toggle')?.classList.toggle('has-filters', hasFilters);
}

/* ── Apply filters ── */
function applyCurseFilters() {
    const filtered = CURSES_ALL.filter(e => {
        if (curseState.selectedType !== 'all' && e.type !== curseState.selectedType) return false;
        if (e.sourceKey && curseState.exclude.source.has(e.sourceKey)) return false;
        if (curseState.q && !e.searchKey.includes(curseState.q)) return false;
        return true;
    });

    updateCurseFilterPip();
    renderCurses(filtered);
}
