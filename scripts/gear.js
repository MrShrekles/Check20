// ─── Gear Page - Weapons / Armor / Items / Enchanted ─────────────────────────

const WEAPON_CATEGORY_COLORS = {
    melee:   '#8c2020',
    ranged:  '#205080',
    firearm: '#604010',
    magic:   '#5020a0',
};

const WEAPON_ICONS = {
    melee:   '/assets/icons/sword.svg',
    ranged:  '/assets/icons/bow-arrow.svg',
    firearm: '/assets/icons/handgun.svg',
    magic:   '/assets/icons/wand.svg',
};

const ITEM_ICONS = {
    'Food & Drink':        '🍖',
    'Tools & Equipment':   '🔧',
    'Musical Instruments': '🎵',
    'Fashion':             '👒',
    'Miscellaneous':       '⭐',
};

const ENCHANTED_ICONS = {
    'Amulet':  '🔮',
    'Armor':   '🛡',
    'Gear':    '⚙',
    'Item':    '📦',
    'Lantern': '🕯',
    'Weapon':  '⚔',
};

const gearState = {
    weapons:  { data: [], activeCategory: 'all', activeRarities: [], sort: 'name' },
    armor:    { data: [], activeCategory: 'all', activeHefty: [],    sort: 'name' },
    items:    { data: [], activeCategory: 'all',                      sort: 'name' },
    enchanted:{ data: [], activeType: 'all',                          sort: 'name' },
};

// ─── Damage scoring ───────────────────────────────────────────────────────────
function parseDamageScore(dmg) {
    if (!dmg) return 0;
    const s = String(dmg).trim();
    if (/^\d+$/.test(s)) return parseInt(s);
    const m = s.match(/^(\d+)d(\d+)(!?)([+-]\d+)?/i);
    if (!m) return 0;
    const n = +m[1], d = +m[2], exploding = m[3] === '!', bonus = m[4] ? +m[4] : 0;
    const base = n * (d + 1) / 2;
    // Exploding dice: multiply avg by d/(d-1)
    return (exploding && d > 1 ? base * d / (d - 1) : base) + bonus;
}

function damageGroup(score) {
    if (score <= 0)  return 'Special';
    if (score <= 4)  return 'Light  (avg ≤4)';
    if (score <= 8)  return 'Standard  (avg 5–8)';
    if (score <= 14) return 'Heavy  (avg 9–14)';
    return 'Powerful  (avg 15+)';
}

function normalizeRarity(r) { return (r || 'common').toLowerCase().trim(); }

function rarityOrder(r) {
    return { common: 1, uncommon: 2, rare: 3, 'very rare': 4, legendary: 5 }[normalizeRarity(r)] ?? 99;
}

function highlightText(text, term) {
    if (!term || !text) return text || '';
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text).replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
}

function flashButton(btn, msg) {
    const orig = btn.textContent;
    btn.textContent = msg;
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1400);
}

function searchTerm() {
    return document.getElementById('sidebar-search-input')?.value.toLowerCase().trim() || '';
}

// ─── Tab switching ─────────────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('#gear-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#gear-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
            sessionStorage.setItem('activeGearTab', btn.dataset.tab);
        });
    });
    const saved = sessionStorage.getItem('activeGearTab');
    if (saved) document.querySelector(`#gear-tabs .tab-btn[data-tab="${saved}"]`)?.click();
}

// ─── Toolbar collapsibles ─────────────────────────────────────────────────────
function initToolbars() {
    document.querySelectorAll('.gear-toolbar').forEach(toolbar => {
        const col = toolbar.querySelector('.toolbar-collapsible');
        const chevron = toolbar.querySelector('.toolbar-toggle-chevron');
        col.classList.add('open');
        if (chevron) chevron.textContent = '▲';

        toolbar.querySelector('.toolbar-toggle-btn').addEventListener('click', () => {
            const open = col.classList.toggle('open');
            chevron.textContent = open ? '▲' : '▼';
        });
    });
}

// ─── Expand / Collapse All ────────────────────────────────────────────────────
function initExpandCollapse() {
    document.querySelectorAll('.gear-expand-all').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.tab-content').querySelectorAll('.spell-row').forEach(r => {
                r.classList.add('open');
                r.querySelector('.spell-row-arrow').textContent = '▼';
            });
        });
    });
    document.querySelectorAll('.gear-collapse-all').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.tab-content').querySelectorAll('.spell-row').forEach(r => {
                r.classList.remove('open');
                r.querySelector('.spell-row-arrow').textContent = '▶';
            });
        });
    });
}

// ─── Group render helper ──────────────────────────────────────────────────────
function appendGroupHeader(container, label, count) {
    const h = document.createElement('h3');
    h.className = 'spell-group-header';
    h.textContent = `${label}  (${count})`;
    container.appendChild(h);
}

function makeRow(headHTML, detailHTML, onCopy) {
    const row = document.createElement('div');
    row.className = 'spell-row';

    const head = document.createElement('div');
    head.className = 'spell-row-head';
    head.innerHTML = `<span class="spell-row-arrow">▶</span>${headHTML}`;
    head.addEventListener('click', () => {
        const open = row.classList.toggle('open');
        head.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
    });

    const detail = document.createElement('div');
    detail.className = 'spell-row-detail';
    detail.innerHTML = detailHTML;

    if (onCopy) {
        const actions = document.createElement('div');
        actions.className = 'spell-row-actions';
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-gear';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', e => { e.stopPropagation(); onCopy(e.target); });
        actions.appendChild(copyBtn);
        detail.appendChild(actions);
    }

    row.appendChild(head);
    row.appendChild(detail);
    return row;
}

function renderGrouped(list, container, keyFn, rowBuilder, term) {
    const groups = new Map();
    list.forEach(item => {
        const k = keyFn(item);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(item);
    });
    groups.forEach((items, k) => {
        if (k !== null) appendGroupHeader(container, k, items.length);
        items.forEach(item => container.appendChild(rowBuilder(item, term)));
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEAPONS
// ═══════════════════════════════════════════════════════════════════════════════
function initWeaponFilters() {
    document.querySelectorAll('#weapon-category-toggles .gear-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#weapon-category-toggles .gear-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.weapons.activeCategory = btn.dataset.filter;
            renderWeapons();
        });
    });
    document.querySelectorAll('#weapon-rarity-toggles button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const r = btn.dataset.rarity, arr = gearState.weapons.activeRarities;
            const i = arr.indexOf(r);
            if (i === -1) arr.push(r); else arr.splice(i, 1);
            renderWeapons();
        });
    });
    document.querySelectorAll('#weapon-sort-toggles button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#weapon-sort-toggles button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.weapons.sort = btn.dataset.sort;
            renderWeapons();
        });
    });
}

function renderWeapons() {
    const { activeCategory, activeRarities, sort } = gearState.weapons;
    const term = searchTerm();
    const container = document.getElementById('weapon-grid');

    let list = gearState.weapons.data.filter(w => {
        const matchCat    = activeCategory === 'all' || w.category === activeCategory;
        const matchRarity = activeRarities.length === 0 || activeRarities.includes(normalizeRarity(w.rarity));
        const matchSearch = !term || w.name.toLowerCase().includes(term) || (w.description || '').toLowerCase().includes(term);
        return matchCat && matchRarity && matchSearch;
    });

    container.innerHTML = '';
    document.getElementById('weapon-count').textContent = `${list.length} Weapons`;

    if (sort === 'name') {
        list.sort((a, b) => a.name.localeCompare(b.name));
        list.forEach(w => container.appendChild(buildWeaponRow(w, term)));

    } else if (sort === 'category') {
        list.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
        renderGrouped(list, container,
            w => (w.category || 'Unknown').charAt(0).toUpperCase() + w.category.slice(1),
            buildWeaponRow, term);

    } else if (sort === 'damage') {
        list.sort((a, b) => parseDamageScore(a.damage) - parseDamageScore(b.damage));
        renderGrouped(list, container,
            w => damageGroup(parseDamageScore(w.damage)),
            buildWeaponRow, term);

    } else if (sort === 'cost') {
        list.sort((a, b) => (a.cost || 0) - (b.cost || 0));
        list.forEach(w => container.appendChild(buildWeaponRow(w, term)));
    }
}

function buildWeaponRow(w, term) {
    const rarityNorm = normalizeRarity(w.rarity);
    const iconSrc = WEAPON_ICONS[w.category];
    const iconHtml = iconSrc
        ? `<img src="${iconSrc}" class="gear-row-icon" title="${w.category}" alt="${w.category}">`
        : '';

    const headHTML = `
        ${iconHtml}
        <span class="spell-row-name">${highlightText(w.name, term)}</span>
        <span class="spell-row-tags">
            <span class="gear-tag gear-tag--rarity gear-rarity--${rarityNorm.replace(' ', '-')}">${w.rarity || 'Common'}</span>
        </span>
        <span class="spell-row-cost">${w.damage || '-'}${w.damageType ? ` <em class="gear-dmg-type">${w.damageType}</em>` : ''}</span>`;

    const stats = [
        w.range      ? `<span><strong>Range</strong> ${w.range}</span>`           : '',
        w.properties ? `<span><strong>Properties</strong> ${w.properties}</span>` : '',
        w.check      ? `<span><strong>Check</strong> ${w.check}</span>`            : '',
        w.bulk != null ? `<span><strong>Bulk</strong> ${w.bulk}</span>`            : '',
        w.cost != null ? `<span><strong>Cost</strong> ${w.cost}¢</span>`           : '',
    ].filter(Boolean);

    const detailHTML = `
        <div class="gear-detail-block">
            <div class="gear-stat-row">${stats.join('')}</div>
            ${w.description ? `<p class="gear-desc">${highlightText(w.description, term)}</p>` : ''}
        </div>`;

    const row = makeRow(headHTML, detailHTML, btn => {
        const text = `**${w.name}** (${w.category})\nDamage: ${w.damage || '-'} ${w.damageType || ''} · Range: ${w.range || '-'}\nProperties: ${w.properties || '-'}\n${w.description || ''}`.trim();
        navigator.clipboard.writeText(text).then(() => flashButton(btn, 'Copied!'));
    });
    const catAccent = WEAPON_CATEGORY_COLORS[w.category];
    if (catAccent) row.style.setProperty('--row-accent', catAccent);
    return row;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARMOR
// ═══════════════════════════════════════════════════════════════════════════════
function initArmorFilters() {
    document.querySelectorAll('#armor-category-toggles .gear-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#armor-category-toggles .gear-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.armor.activeCategory = btn.dataset.filter;
            renderArmor();
        });
    });
    document.querySelectorAll('#armor-hefty-toggles button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const h = btn.dataset.hefty, arr = gearState.armor.activeHefty;
            const i = arr.indexOf(h);
            if (i === -1) arr.push(h); else arr.splice(i, 1);
            renderArmor();
        });
    });
    document.querySelectorAll('#armor-sort-toggles button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#armor-sort-toggles button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.armor.sort = btn.dataset.sort;
            renderArmor();
        });
    });
}

function renderArmor() {
    const { activeCategory, activeHefty, sort } = gearState.armor;
    const term = searchTerm();
    const container = document.getElementById('armor-grid');

    let list = gearState.armor.data.filter(a => {
        const matchCat   = activeCategory === 'all' || a.category === activeCategory;
        const matchHefty = activeHefty.length === 0  || activeHefty.includes((a.hefty || 'no').toLowerCase());
        const matchSearch = !term || a.name.toLowerCase().includes(term) || (a.description || '').toLowerCase().includes(term);
        return matchCat && matchHefty && matchSearch;
    });

    if (sort === 'name')  list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'armor') list.sort((a, b) => (b.armor || 0) - (a.armor || 0));
    if (sort === 'cost')  list.sort((a, b) => (a.cost || 0) - (b.cost || 0));

    container.innerHTML = '';
    document.getElementById('armor-count').textContent = `${list.length} Pieces`;
    list.forEach(a => container.appendChild(buildArmorRow(a, term)));
}

function buildArmorRow(a, term) {
    const iconSrc = a.category === 'armor' ? '/assets/icons/kevlar-vest.svg' : null;
    const iconHtml = iconSrc
        ? `<img src="${iconSrc}" class="gear-row-icon" title="${a.category}" alt="${a.category}">`
        : '🛡';

    const headHTML = `
        <span class="gear-row-icon-wrap">${iconHtml}</span>
        <span class="spell-row-name">${highlightText(a.name, term)}</span>
        <span class="spell-row-tags">
            ${a.hefty === 'yes' ? '<span class="gear-tag gear-tag--hefty">Hefty</span>' : ''}
        </span>
        <span class="spell-row-cost">Armor ${a.armor ?? '-'}</span>`;

    const stats = [
        a.movePenalty  ? `<span><strong>Move Penalty</strong> ${a.movePenalty}</span>`  : '',
        a.checkPenalty ? `<span><strong>Penalty</strong> ${a.checkPenalty}</span>`       : '',
        a.checkBonus   ? `<span><strong>Bonus</strong> ${a.checkBonus}</span>`           : '',
        a.bulk != null ? `<span><strong>Bulk</strong> ${a.bulk}</span>`                  : '',
        a.cost != null ? `<span><strong>Cost</strong> ${a.cost}¢</span>`                 : '',
    ].filter(Boolean);

    const detailHTML = `
        <div class="gear-detail-block">
            <div class="gear-stat-row">${stats.join('')}</div>
            ${a.description ? `<p class="gear-desc">${highlightText(a.description, term)}</p>` : ''}
        </div>`;

    return makeRow(headHTML, detailHTML, btn => {
        const text = `**${a.name}**\nArmor: ${a.armor} · Hefty: ${a.hefty || 'no'}\n${a.checkPenalty ? `Penalty: ${a.checkPenalty}` : ''}\n${a.checkBonus ? `Bonus: ${a.checkBonus}` : ''}`.trim();
        navigator.clipboard.writeText(text).then(() => flashButton(btn, 'Copied!'));
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUNDANE ITEMS
// ═══════════════════════════════════════════════════════════════════════════════
function initItemFilters() {
    document.querySelectorAll('#item-category-toggles .gear-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#item-category-toggles .gear-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.items.activeCategory = btn.dataset.filter;
            renderItems();
        });
    });
    document.querySelectorAll('#item-sort-toggles button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#item-sort-toggles button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.items.sort = btn.dataset.sort;
            renderItems();
        });
    });
}

function renderItems() {
    const { activeCategory, sort } = gearState.items;
    const term = searchTerm();
    const container = document.getElementById('item-grid');

    let list = gearState.items.data.filter(it => {
        const matchCat   = activeCategory === 'all' || it.category === activeCategory;
        const matchSearch = !term || it.name.toLowerCase().includes(term) || (it.description || '').toLowerCase().includes(term);
        return matchCat && matchSearch;
    });

    if (sort === 'name')     list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'category') list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    if (sort === 'cost')     list.sort((a, b) => (a.cost || 0) - (b.cost || 0));

    container.innerHTML = '';
    document.getElementById('item-count').textContent = `${list.length} Items`;

    if (sort === 'category') {
        renderGrouped(list, container, it => it.category, buildItemRow, term);
    } else {
        list.forEach(it => container.appendChild(buildItemRow(it, term)));
    }
}

function buildItemRow(it, term) {
    const icon = ITEM_ICONS[it.category] || '📦';
    const headHTML = `
        <span class="gear-row-icon-wrap gear-row-icon--emoji">${icon}</span>
        <span class="spell-row-name">${highlightText(it.name, term)}</span>
        <span class="spell-row-tags">
            <span class="gear-tag gear-tag--cat">${it.category}</span>
        </span>
        <span class="spell-row-cost">${it.cost != null ? `$${it.cost}` : '-'}</span>`;

    const detailHTML = `
        <div class="gear-detail-block">
            ${it.bulk ? `<div class="gear-stat-row"><span><strong>Bulk</strong> ${it.bulk}</span></div>` : ''}
            ${it.description ? `<p class="gear-desc">${highlightText(it.description, term)}</p>` : ''}
        </div>`;

    return makeRow(headHTML, detailHTML, btn => {
        const text = `**${it.name}** (${it.category})\nCost: $${it.cost || '-'}\n${it.description || ''}`.trim();
        navigator.clipboard.writeText(text).then(() => flashButton(btn, 'Copied!'));
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENCHANTED ITEMS
// ═══════════════════════════════════════════════════════════════════════════════
function initEnchantedFilters() {
    document.querySelectorAll('#enchanted-type-toggles .gear-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#enchanted-type-toggles .gear-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.enchanted.activeType = btn.dataset.filter;
            renderEnchanted();
        });
    });
    document.querySelectorAll('#enchanted-sort-toggles button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#enchanted-sort-toggles button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gearState.enchanted.sort = btn.dataset.sort;
            renderEnchanted();
        });
    });
}

function renderEnchanted() {
    const { activeType, sort } = gearState.enchanted;
    const term = searchTerm();
    const container = document.getElementById('enchanted-grid');

    let list = gearState.enchanted.data.filter(it => {
        const matchType   = activeType === 'all' || it.type === activeType;
        const matchSearch = !term || it.name.toLowerCase().includes(term)
            || (it.effect || '').toLowerCase().includes(term)
            || (it.description || '').toLowerCase().includes(term);
        return matchType && matchSearch;
    });

    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'type') list.sort((a, b) => (a.type || '').localeCompare(b.type || '') || a.name.localeCompare(b.name));

    container.innerHTML = '';
    document.getElementById('enchanted-count').textContent = `${list.length} Items`;

    if (sort === 'type') {
        renderGrouped(list, container, it => it.type || 'Unknown', buildEnchantedRow, term);
    } else {
        list.forEach(it => container.appendChild(buildEnchantedRow(it, term)));
    }
}

function buildEnchantedRow(it, term) {
    const icon = ENCHANTED_ICONS[it.type] || '✨';
    const checkTags = (it.tags || []).slice(0, 3).map(t =>
        `<span class="gear-tag gear-tag--item-tag">${t}</span>`).join('');

    const headHTML = `
        <span class="gear-row-icon-wrap gear-row-icon--emoji">${icon}</span>
        <span class="spell-row-name">${highlightText(it.name, term)}</span>
        <span class="spell-row-tags">
            <span class="gear-tag gear-tag--type">${it.type || '-'}</span>
            ${it.check ? `<span class="gear-tag gear-tag--check">${it.check}</span>` : ''}
            ${checkTags}
        </span>`;

    const artHTML = it.image
        ? `<img src="${it.image}" class="codex-art" alt="${it.name}" onerror="this.parentElement.remove()">`
        : '';

    const detailHTML = `
        <div class="gear-detail-block">
            ${artHTML ? `<div class="codex-art-wrap">${artHTML}</div>` : ''}
            ${it.description ? `<p class="gear-desc gear-desc--flavor">${highlightText(it.description, term)}</p>` : ''}
            ${it.effect ? `
                <div class="gear-item-section">
                    <span class="gear-item-label">Effect</span>
                    <p class="gear-desc">${highlightText(it.effect, term)}</p>
                </div>` : ''}
            ${it.upgrade ? `
                <div class="gear-item-section gear-item-section--upgrade">
                    <span class="gear-item-label gear-item-label--upgrade">Upgrade</span>
                    <p class="gear-desc">${highlightText(it.upgrade, term)}</p>
                </div>` : ''}
        </div>`;

    return makeRow(headHTML, detailHTML, btn => {
        const text = `**${it.name}** (${it.type})\n${it.description || ''}\nEffect: ${it.effect || '-'}\n${it.upgrade ? `Upgrade: ${it.upgrade}` : ''}`.trim();
        navigator.clipboard.writeText(text).then(() => flashButton(btn, 'Copied!'));
    });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initToolbars();
    initCodexSize();
    initExpandCollapse();
    initWeaponFilters();
    initArmorFilters();
    initItemFilters();
    initEnchantedFilters();

    const [weapons, armor, items, enchanted] = await Promise.all([
        fetch('data/weapons.json').then(r => r.json()),
        fetch('data/armor.json').then(r => r.json()),
        fetch('data/items.json').then(r => r.json()),
        fetch('data/enchanted.json').then(r => r.json()),
    ]);

    gearState.weapons.data   = weapons;
    gearState.armor.data     = armor;
    gearState.items.data     = items;
    gearState.enchanted.data = enchanted;

    renderWeapons();
    renderArmor();
    renderItems();
    renderEnchanted();

    document.getElementById('sidebar-search-input')?.addEventListener('input', () => {
        renderWeapons(); renderArmor(); renderItems(); renderEnchanted();
    });
});
