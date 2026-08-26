/* =========================
   species-codex-render.js
   Expandable-row (codex UI) rendering for species
   ========================= */

const SPECIES_LINEAGE_COLORS = {
    apex:       '#7a3090',
    chitnari:   '#507030',
    corebound:  '#8c6020',
    dragon:     '#802020',
    goblijjin:  '#405020',
    grazer:     '#507a30',
    human:      '#605040',
    jotun:      '#304080',
    realmsplit: '#502060',
    shifter:    '#406060',
    strigoi:    '#601010',
    symbiotes:  '#208050',
};

function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function linkifyDesc(text) {
    if (!text) return '';
    return escapeHTML(text)
        .replace(/\[([^\]]+)\]/g, (match, name) => {
            const god = (typeof GOD_MAP !== 'undefined') && GOD_MAP.get(name.toLowerCase());
            if (god) return `<span class="god-ref" data-god="${escapeHTML(name.toLowerCase())}">${escapeHTML(name)}</span>`;
            return match;
        })
        .replace(/\n\n+/g, '<br><br>')
        .replace(/\n/g, '<br>');
}

/* ── Collapse / expand all rows (supplements species-ui.js which targets .lineage-section) ── */
document.addEventListener('DOMContentLoaded', () => {
    const container = () => document.getElementById('species-sections');

    document.getElementById('collapse-all')?.addEventListener('click', () => {
        container()?.querySelectorAll('.spell-row.open').forEach(r => {
            r.classList.remove('open');
            const arr = r.querySelector('.spell-row-arrow');
            if (arr) arr.textContent = '▶';
        });
    });

    document.getElementById('expand-all')?.addEventListener('click', () => {
        container()?.querySelectorAll('.spell-row').forEach(r => {
            r.classList.add('open');
            const arr = r.querySelector('.spell-row-arrow');
            if (arr) arr.textContent = '▼';
        });
    });

    initCodexSize();
});

/* ── Main render ── */
function renderGrid(items) {
    const container = document.getElementById('species-sections');
    if (!container) return;

    // Two-level grouping: lineage → option
    const lineageMap = new Map();
    items.forEach(s => {
        const lKey = s.lineageKey || 'other';
        if (!lineageMap.has(lKey)) lineageMap.set(lKey, { label: s.lineage || lKey, options: new Map() });

        const oKey = s.optionKey || '__none__';
        const lg = lineageMap.get(lKey);
        if (!lg.options.has(oKey)) lg.options.set(oKey, { label: s.option || '', items: [] });
        lg.options.get(oKey).items.push(s);
    });

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    lineageMap.forEach(({ label: lineageLabel, options }) => {
        const total = [...options.values()].reduce((n, o) => n + o.items.length, 0);

        const grid = document.createElement('div');
        grid.className = 'spell-grid';

        // Major lineage header
        const lHdr = document.createElement('div');
        lHdr.className = 'spell-group-header';
        lHdr.textContent = `${lineageLabel}  (${total})`;
        grid.appendChild(lHdr);

        // Minor option sub-groups
        options.forEach(({ label: optionLabel, items: optionItems }) => {
            if (optionLabel) {
                const oHdr = document.createElement('div');
                oHdr.className = 'species-option-header';
                oHdr.textContent = `${optionLabel}  (${optionItems.length})`;
                grid.appendChild(oHdr);
            }
            optionItems.forEach(s => grid.appendChild(renderSpeciesRow(s)));
        });

        frag.appendChild(grid);
    });

    container.appendChild(frag);
}

function renderSpeciesRow(s) {
    const row = document.createElement('div');
    row.className = 'spell-row';
    row.dataset.slug = s.slug;
    const accentColor = SPECIES_LINEAGE_COLORS[(s.lineageKey || '').toLowerCase()];
    if (accentColor) row.style.setProperty('--row-accent', accentColor);

    const displayName = s.name.replace(/\s*\([^)]*\)/g, '').trim();
    const rarityClass = `rarity-${(s.rarityKey || '').replace(/\s+/g, '-')}`;
    const cover = s.images?.[0] || `assets/species/${s.slug}.jpg`;

    const desc = s.description || {};
    const physical     = typeof desc === 'string' ? desc : (desc.physical !== '[TBD]'     ? desc.physical     || '' : '');
    const environment  = typeof desc === 'string' ? '' :  (desc.environment !== '[TBD]'   ? desc.environment  || '' : '');
    const culture      = typeof desc === 'string' ? '' :  (desc.culture     !== '[TBD]'   ? desc.culture      || '' : '');
    const lore         = typeof desc === 'string' ? '' :  (desc.lore        !== '[TBD]'   ? desc.lore         || '' : '');

    const featureHtml = (s.features || []).map(f => {
        const action = f.action ? `<span class="intent-cost">${escapeHTML(f.action)}</span>` : '';
        const dmg    = f.damage ? ` <em class="intent-meta">${escapeHTML(f.damage)}</em>` : '';
        const body   = f.description || f.effect || '';
        const opts   = (f.options || []).map(o =>
            `<p class="intent-effect intent-meta">• ${linkifyDesc(o.name || o.effect || '')}</p>`
        ).join('');
        return `<div class="spell-intent-block">
            <div class="spell-intent-header">
                <span class="intent-name">${escapeHTML(f.name || '')}${dmg}</span>${action}
            </div>
            ${body ? `<p class="intent-effect">${linkifyDesc(body)}</p>` : ''}${opts}
        </div>`;
    }).join('');

    const regionLabel = s.regionList?.join(', ') || '';

    const metaItems = [
        s.diet      && `<span><strong>Diet</strong>${escapeHTML(s.diet)}</span>`,
        s.lifespan  && `<span><strong>Lifespan</strong>${escapeHTML(String(s.lifespan))}</span>`,
        s.language  && `<span><strong>Language</strong>${escapeHTML(s.language)}</span>`,
        regionLabel && `<span><strong>Region</strong>${escapeHTML(regionLabel)}</span>`,
    ].filter(Boolean).join('');

    row.innerHTML = `
        <div class="spell-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${escapeHTML(displayName)}</span>
            <div class="spell-row-tags species-row-tags">
                ${s.option ? `<span class="origin">${escapeHTML(s.option)}</span>` : ''}
                ${s.origin ? `<span class="species-origin-tag">${escapeHTML(s.origin)}</span>` : ''}
                ${s.rarity ? `<span class="chip chip-rarity ${rarityClass}">${escapeHTML(s.rarity)}</span>` : ''}
            </div>
            ${regionLabel ? `<span class="spell-row-cost">${escapeHTML(regionLabel)}</span>` : ''}
        </div>
        <div class="spell-row-detail">
            <img src="${cover}" class="species-row-cover cover" alt="${escapeHTML(s.name)}"
                 data-slug="${escapeHTML(s.slug)}"
                 onerror="this.src=''; this.style.display='none'">
            ${metaItems ? `<div class="species-row-meta">${metaItems}</div>` : ''}
            <div class="species-row-text">
                ${physical    ? `<p class="intent-effect">${linkifyDesc(physical)}</p>` : ''}
                ${environment ? `<p class="intent-meta"><strong>Environment</strong> ${linkifyDesc(environment)}</p>` : ''}
                ${culture     ? `<p class="intent-meta"><strong>Culture</strong> ${linkifyDesc(culture)}</p>` : ''}
                ${lore        ? `<p class="intent-meta"><strong>Lore</strong> ${linkifyDesc(lore)}</p>` : ''}
            </div>
            ${featureHtml}
        </div>`;

    row.querySelector('.spell-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
    });

    return row;
}
