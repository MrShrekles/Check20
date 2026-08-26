/* ─── vehicles-render.js ─────────────────────────────────────────────────── */

function vehEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
}

const VEHICLE_CATEGORY_LABEL = {
    automobile: 'Automobiles', airship: 'Airships', steamboat: 'Steamboats',
    train: 'Trains', biplane: 'Biplanes', walker: 'Walkers',
};

function renderVehicleStat(label, value) {
    if (value === undefined || value === null || value === '') return '';
    return `<div class="vehicle-stat">
        <span class="vehicle-stat-label">${vehEsc(label)}</span>
        <span class="vehicle-stat-value">${vehEsc(value)}</span>
    </div>`;
}

function renderVehicleFeature(f) {
    return `<div class="vehicle-feature">
        <span class="vehicle-feature-name">${vehEsc(f.name)}</span>
        <p class="vehicle-feature-effect">${vehEsc(f.effect)}</p>
    </div>`;
}

function renderVehicleRow(entry) {
    const row = document.createElement('div');
    row.className = 'spell-row';
    row.dataset.slug = entry.name.toLowerCase().replace(/\s+/g, '-');
    row.dataset.category = entry.category;
    if (entry.color) row.style.setProperty('--row-accent', entry.color);

    const rarityClass = `rarity-${(entry.rarityKey || '').replace(/\s+/g, '-')}`;
    const catTag    = `<span class="species-origin-tag">${vehEsc(entry.category)}</span>`;
    const rarityTag = entry.rarity ? `<span class="chip chip-rarity ${rarityClass}">${vehEsc(entry.rarity)}</span>` : '';
    const subtitle  = entry.subtitle ? `<span class="vehicle-subtitle">${vehEsc(entry.subtitle)}</span>` : '';
    const costTag   = (entry.cost !== undefined) ? `<span class="spell-row-cost">$${vehEsc(entry.cost)}</span>` : '';

    const statsHtml = [
        renderVehicleStat('Speed', entry.stats?.speed),
        renderVehicleStat('Handling', entry.stats?.handling),
        renderVehicleStat('Durability', entry.stats?.durability),
        renderVehicleStat('Capacity', entry.stats?.capacity),
    ].join('');

    const featuresHtml = (entry.features || []).map(renderVehicleFeature).join('');

    row.innerHTML = `
        <div class="spell-row-head">
            <span class="spell-row-arrow">▶</span>
            <span class="spell-row-name">${vehEsc(entry.name)}</span>
            ${subtitle}
            <div class="spell-row-tags species-row-tags">
                ${catTag}${rarityTag}
            </div>
            ${costTag}
        </div>
        <div class="spell-row-detail">
            <p class="vehicle-desc">${vehEsc(entry.desc)}</p>
            <div class="vehicle-stat-grid">${statsHtml}</div>
            ${featuresHtml ? `<div class="vehicle-features">${featuresHtml}</div>` : ''}
        </div>`;

    row.querySelector('.spell-row-head').addEventListener('click', () => {
        const open = row.classList.toggle('open');
        row.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
    });

    return row;
}

/* ── Main render: two-level grouping, mirrors species renderGrid ── */
function renderVehicles(items) {
    const container = document.getElementById('vehicle-sections');
    if (!container) return;

    const catMap = new Map();
    items.forEach(e => {
        const cKey = e.category || 'other';
        if (!catMap.has(cKey)) catMap.set(cKey, { label: VEHICLE_CATEGORY_LABEL[cKey] || cKey, rarities: new Map() });

        const rKey = e.rarityKey || '__none__';
        const cg = catMap.get(cKey);
        if (!cg.rarities.has(rKey)) cg.rarities.set(rKey, { label: e.rarity || '', items: [] });
        cg.rarities.get(rKey).items.push(e);
    });

    container.innerHTML = '';
    const frag = document.createDocumentFragment();

    catMap.forEach(({ label: catLabel, rarities }) => {
        const total = [...rarities.values()].reduce((n, r) => n + r.items.length, 0);

        const grid = document.createElement('div');
        grid.className = 'spell-grid';

        const cHdr = document.createElement('div');
        cHdr.className = 'spell-group-header';
        cHdr.textContent = `${catLabel}  (${total})`;
        grid.appendChild(cHdr);

        rarities.forEach(({ label: rarityLabel, items: rarityItems }) => {
            if (rarityLabel) {
                const rHdr = document.createElement('div');
                rHdr.className = 'species-option-header';
                rHdr.textContent = `${rarityLabel}  (${rarityItems.length})`;
                grid.appendChild(rHdr);
            }
            rarityItems.forEach(e => grid.appendChild(renderVehicleRow(e)));
        });

        frag.appendChild(grid);
    });

    container.appendChild(frag);

    document.getElementById('vehicle-count').textContent =
        `${items.length} result${items.length !== 1 ? 's' : ''}`;
    document.getElementById('vehicle-no-results').style.display =
        items.length ? 'none' : '';
}
