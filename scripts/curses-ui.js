/* ─── curses-ui.js ───────────────────────────────────────────────────────── */

let _activeFilter = 'all';

function applyFilters() {
    const q = (document.getElementById('curse-search')?.value || '').toLowerCase().trim();

    const filtered = CURSES_ALL.filter(e => {
        const matchType   = _activeFilter === 'all' || e.type === _activeFilter;
        const matchSearch = !q || e.searchKey.includes(q);
        return matchType && matchSearch;
    });

    renderCurses(filtered);
}

document.addEventListener('curses-ready', () => {
    /* Type filter tabs */
    document.querySelectorAll('.curse-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.curse-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _activeFilter = btn.dataset.filter;
            applyFilters();
        });
    });

    /* Search */
    document.getElementById('curse-search')?.addEventListener('input', applyFilters);

    /* Expand / collapse all */
    document.getElementById('curse-expand-all')?.addEventListener('click', () => {
        document.querySelectorAll('#curse-sections .spell-row').forEach(r => {
            r.classList.add('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▼';
        });
    });

    document.getElementById('curse-collapse-all')?.addEventListener('click', () => {
        document.querySelectorAll('#curse-sections .spell-row').forEach(r => {
            r.classList.remove('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▶';
        });
    });

    initCodexSize();
    applyFilters();
});
