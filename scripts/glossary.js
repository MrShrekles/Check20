// ─── Glossary Page ────────────────────────────────────────────────────────────

const GLOSS_TABS = [
    { label: 'All',        filter: null },
    { label: 'Conditions', filter: ['condition'] },
    { label: 'Actions',    filter: ['action'] },
    { label: 'Mechanics',  filter: ['mechanic'] },
    { label: 'Checks',     filter: ['check'] },
    { label: 'Resources',  filter: ['resource'] },
    { label: 'Properties', filter: ['property'] },
    { label: 'Movement',   filter: ['range', 'movement'] },
    { label: 'Size',       filter: ['size'] },
    { label: 'World',      filter: ['setting'] },
];

const GLOSS_COLORS = {
    condition: '#8c2020',
    check:     '#205080',
    resource:  '#3a6a30',
    mechanic:  '#60402a',
    action:    '#404060',
    range:     '#2a5050',
    movement:  '#2a5050',
    size:      '#5a3a70',
    property:  '#7a4a10',
    setting:   '#306050',
};

let _data        = [];
let _typeFilter  = null;
let _searchTerm  = '';

function glossHL(text, term) {
    if (!term || !text) return text || '';
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text).replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function buildTabs() {
    const bar = document.getElementById('gloss-type-tabs');
    GLOSS_TABS.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = 'gloss-tab' + (tab.filter === null ? ' active' : '');
        btn.textContent = tab.label;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gloss-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _typeFilter = tab.filter;
            render();
        });
        bar.appendChild(btn);
    });
}

function makeCard(e, q) {
    const card = document.createElement('div');
    card.className = 'gloss-card';
    card.style.setProperty('--gc', GLOSS_COLORS[e.type] || 'var(--theme-2)');
    card.innerHTML = `
        <div class="gloss-card-head">
            <span class="gloss-term">${glossHL(e.term, q)}</span>
            <span class="gloss-badge">${capitalize(e.type)}</span>
        </div>
        <p class="gloss-def">${glossHL(e.definition || '', q)}</p>
        ${e.duration ? `<span class="gloss-duration">${e.duration}</span>` : ''}
    `;
    return card;
}

function render() {
    const container = document.getElementById('gloss-grid');
    const q = _searchTerm.toLowerCase().trim();

    const list = _data
        .filter(e => {
            const matchType = !_typeFilter || _typeFilter.includes(e.type);
            const matchQ    = !q
                || e.term.toLowerCase().includes(q)
                || (e.definition || '').toLowerCase().includes(q)
                || (e.category  || '').toLowerCase().includes(q);
            return matchType && matchQ;
        })
        .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.term.localeCompare(b.term));

    document.getElementById('gloss-count').textContent = `${list.length} entr${list.length === 1 ? 'y' : 'ies'}`;
    container.innerHTML = '';

    if (!list.length) {
        container.innerHTML = '<p class="gloss-no-results">No entries found.</p>';
        return;
    }

    // When searching, skip grouping — just show flat results
    if (q) {
        list.forEach(e => container.appendChild(makeCard(e, q)));
        return;
    }

    // Group by category
    const groups = new Map();
    list.forEach(e => {
        const key = e.category || 'Other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(e);
    });

    groups.forEach((entries, groupName) => {
        const header = document.createElement('div');
        header.className = 'gloss-group-header';
        header.innerHTML = `<span>${groupName}</span><span class="gloss-group-count">${entries.length}</span>`;
        container.appendChild(header);
        entries.forEach(e => container.appendChild(makeCard(e, q)));
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    buildTabs();

    try {
        const resp = await fetch('data/glossary.json');
        _data = await resp.json();
    } catch (err) {
        console.error('Failed to load glossary.json', err);
        _data = [];
    }

    render();

    document.getElementById('gloss-search').addEventListener('input', e => {
        _searchTerm = e.target.value;
        render();
    });
});
