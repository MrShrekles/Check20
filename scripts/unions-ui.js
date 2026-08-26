/* ─── unions-ui.js ──────────────────────────────────────────────────────────
   Search, sort, expand/collapse, and size controls for the unions codex page.
   ─────────────────────────────────────────────────────────────────────────── */

let _currentUnions = [];

function applyFilters() {
    const q    = (document.getElementById('unions-search')?.value || '').toLowerCase().trim();
    const sort = document.getElementById('unions-sort')?.value || 'name';

    let filtered = _currentUnions.filter(u =>
        !q || u.searchKey.includes(q)
    );

    filtered.sort((a, b) => {
        if (sort === 'opposition') return a.opposition.localeCompare(b.opposition);
        return a.name.localeCompare(b.name);
    });

    renderUnions(filtered);
}

document.addEventListener('unions-ready', () => {
    _currentUnions = UNIONS_DATA;

    const search  = document.getElementById('unions-search');
    const sort    = document.getElementById('unions-sort');
    const expand  = document.getElementById('unions-expand-all');
    const collapse = document.getElementById('unions-collapse-all');

    search?.addEventListener('input',  applyFilters);
    sort?.addEventListener('change',   applyFilters);

    expand?.addEventListener('click', () => {
        document.querySelectorAll('#unions-sections .spell-row').forEach(row => {
            row.classList.add('open');
            const arrow = row.querySelector('.spell-row-arrow');
            if (arrow) arrow.textContent = '▼';

            /* Trigger faction render if not done yet */
            const factList = row.querySelector('.union-factions-list');
            if (factList && !factList.dataset.rendered) {
                const slug = factList.dataset.slug;
                const u = UNIONS_MAP?.get(slug);
                if (u?.factions?.length) {
                    factList.dataset.rendered = '1';
                    u.factions.forEach(f => {
                        const fRow = document.createElement('div');
                        fRow.className = 'spell-row union-faction-row';
                        fRow.style.setProperty('--row-accent', u.color);
                        fRow.innerHTML = `<div class="spell-row-head">
                            <span class="spell-row-arrow">▶</span>
                            <span class="spell-row-name">${f.name}</span>
                        </div><div class="spell-row-detail">${f.desc || ''}</div>`;
                        fRow.querySelector('.spell-row-head').addEventListener('click', () => {
                            const o = fRow.classList.toggle('open');
                            fRow.querySelector('.spell-row-arrow').textContent = o ? '▼' : '▶';
                        });
                        factList.appendChild(fRow);
                    });
                }
            }
        });
    });

    collapse?.addEventListener('click', () => {
        document.querySelectorAll('#unions-sections .spell-row').forEach(row => {
            row.classList.remove('open');
            const arrow = row.querySelector('.spell-row-arrow');
            if (arrow) arrow.textContent = '▶';
        });
    });

    initCodexSize();
    applyFilters();
});
