/* ─── enchanted-ui.js ────────────────────────────────────────────────────── */

let _encTypeFilter  = 'all';
let _encCheckFilter = new Set();
let _progData       = [];
let _progSearch     = '';
let _progOrigin     = '';
let _progType       = '';

/* ── Enchanted item filters ── */
function applyEncFilters() {
    const q = (document.getElementById('enchanted-search')?.value || '').toLowerCase().trim();

    const filtered = ENCHANTED_DATA.filter(item => {
        const matchType  = _encTypeFilter === 'all' || item.type === _encTypeFilter;
        const matchCheck = _encCheckFilter.size === 0 || item.checks.some(c => _encCheckFilter.has(c));
        const matchQ     = !q || item.searchKey.includes(q);
        return matchType && matchCheck && matchQ;
    });

    renderEnchanted(filtered);
}

/* ── Progression item filters ── */
function applyProgFilters() {
    const q = _progSearch.toLowerCase().trim();

    const filtered = _progData.filter(item => {
        const matchOrigin = !_progOrigin || item.origin === _progOrigin;
        const matchType   = !_progType   || item.type   === _progType;
        const matchQ      = !q || item._search.includes(q);
        return matchOrigin && matchType && matchQ;
    });

    renderProgression(filtered);
}

/* ── Page tab switching ── */
function initPageTabs() {
    document.querySelectorAll('.enc-page-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.enc-page-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.enc-page-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`panel-${btn.dataset.page}`)?.classList.add('active');
        });
    });
}

/* ── Boot ── */
document.addEventListener('enchanted-ready', async () => {
    initPageTabs();

    /* ── Enchanted type tabs ── */
    document.querySelectorAll('.enc-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.enc-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _encTypeFilter = btn.dataset.filter;
            applyEncFilters();
        });
    });

    /* ── Enchanted check filter chips ── */
    const allChecks  = [...new Set(ENCHANTED_DATA.flatMap(i => i.checks))].sort();
    const filterWrap = document.getElementById('enchanted-check-filter');
    if (filterWrap && allChecks.length) {
        filterWrap.innerHTML = allChecks.map(c =>
            `<button class="enc-check-chip" data-check="${c}">${c}</button>`
        ).join('');
        filterWrap.addEventListener('click', e => {
            const btn = e.target.closest('.enc-check-chip');
            if (!btn) return;
            const c = btn.dataset.check;
            if (_encCheckFilter.has(c)) { _encCheckFilter.delete(c); btn.classList.remove('active'); }
            else                         { _encCheckFilter.add(c);    btn.classList.add('active');    }
            applyEncFilters();
        });
    }

    document.getElementById('enchanted-search')?.addEventListener('input', applyEncFilters);

    document.getElementById('enchanted-expand-all')?.addEventListener('click', () => {
        document.querySelectorAll('#enchanted-sections .spell-row').forEach(r => {
            if (!r.classList.contains('open')) r.querySelector('.enc-row-head')?.click();
        });
    });
    document.getElementById('enchanted-collapse-all')?.addEventListener('click', () => {
        document.querySelectorAll('#enchanted-sections .spell-row.open').forEach(r => {
            r.classList.remove('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▶';
        });
    });

    initCodexSize();
    applyEncFilters();

    /* ── Load progression items ── */
    try {
        const data = await fetch('data/progression.json').then(r => r.json());
        _progData = (data.progression_items || []).map(item => ({
            ...item,
            _search: [
                item.name, item.type, item.origin, item.desc,
                item.itemFeature?.name, item.itemFeature?.desc,
                ...(item.steps || []).map(s => `${s.name} ${s.description}`)
            ].filter(Boolean).join(' ').toLowerCase(),
        }));

        /* Populate origin filter dropdown */
        const origins = [...new Set(_progData.map(i => i.origin))].sort();
        const originSel = document.getElementById('prog-origin-filter');
        if (originSel) {
            origins.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o; opt.textContent = o;
                originSel.appendChild(opt);
            });
            originSel.addEventListener('change', () => {
                _progOrigin = originSel.value;
                applyProgFilters();
            });
        }

        document.getElementById('prog-type-filter')?.addEventListener('change', e => {
            _progType = e.target.value;
            applyProgFilters();
        });

        document.getElementById('prog-search')?.addEventListener('input', e => {
            _progSearch = e.target.value;
            applyProgFilters();
        });

        document.getElementById('prog-expand-all')?.addEventListener('click', () => {
            document.querySelectorAll('#prog-sections .spell-row').forEach(r => {
                if (!r.classList.contains('open')) r.querySelector('.prog-row-head')?.click();
            });
        });
        document.getElementById('prog-collapse-all')?.addEventListener('click', () => {
            document.querySelectorAll('#prog-sections .spell-row.open').forEach(r => {
                r.classList.remove('open');
                const a = r.querySelector('.spell-row-arrow');
                if (a) a.textContent = '▶';
            });
        });

        applyProgFilters();
    } catch(e) {
        console.error('Failed to load progression.json', e);
    }
});
