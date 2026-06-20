/* ═══════════════════════════════════════════════════════════════
   MONSTER FORGE - unified editor for monsterbase + monstermod + monsterbook
   ═══════════════════════════════════════════════════════════════ */

/* ── Domain values ─────────────────────────────────────────── */
const D = {
    size:      ['', 'Tiny', 'Small', 'Medium', 'Large', 'Giant', 'Monolithic'],
    rarity:    ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    behavior:  ['', 'Aggressive', 'Trickster', 'Mindless', 'Neutral', 'Cowardly', 'Territorial', 'Pack Hunter', 'Solitary', 'Social', 'Predator', 'Scavenger'],
    origin:    ['', 'basic', 'arcane', 'tech', 'crystal', 'nature', 'vozian', 'chrono', 'chaos', 'life', 'elemental', 'dragon', 'celestial'],
    featType:  ['', 'Action', 'Half Action', 'Off Action', 'Non-Action', 'Passive', 'Reaction', 'Free', 'Special', 'Press On', 'Long Rest', 'Start of turn', 'End of turn'],
    featRange: ['', 'Self', 'Melee', 'Reach', 'Short', 'Medium', 'Long'],
    featDur:   ['', 'Instant', 'Until end of their next turn', 'Until end of your next turn', '1 minute', '1 hour', 'Permanent'],
    dmgType:   ['', 'Physical', 'Impact', 'Piercing', 'Slashing', 'Acid', 'Arcane', 'Chaos', 'Cold', 'Crystal', 'Chrono', 'Eclipse', 'Elemental', 'Fire', 'Fluid', 'Healing', 'Lightning', 'Nature', 'Psychic', 'Radiant', 'Solar', 'Tech', 'Thunder', 'Toxic', 'Vozian'],
};

/* ── State ─────────────────────────────────────────────────── */
const MF = {
    bases: [],
    mods:  [],
    book:  [],
    tab:     'editor',
    openRow: null,
    filters: { search: '', origin: '', rarity: '', show: 'all' },
    bookFilters: { search: '', origin: '', rarity: '' },
    baseTimer: null,
    modTimer:  null,
    bookTimer: null,
    dialogCallback: null,
};

/* ── Init ──────────────────────────────────────────────────── */
async function init() {
    try {
        const [bd, md, bk] = await Promise.all([
            fetch('/api/file/monsterbase.json').then(r=>r.json()),
            fetch('/api/file/monstermod.json').then(r=>r.json()),
            fetch('/api/file/monsterbook.json').then(r=>r.json()),
        ]);
        MF.bases = bd.data || [];
        MF.mods  = md.data || [];
        MF.book  = bk.data || [];
    } catch(e) {
        console.error('[MonsterForge] Load failed:', e);
        toast('Failed to load data - is the Forge server running?', 'error');
        return;
    }
    populateFilters();
    populateComposeSelects();
    renderEditor();
    renderBook();
}

/* ── Filters ───────────────────────────────────────────────── */
function populateFilters() {
    const allOrigins = [...new Set([
        ...MF.bases.map(b => b.origin),
        ...MF.mods.map(m => m.origin),
    ].filter(Boolean).map(s=>s.toLowerCase()))].sort();

    const allRarities = [...new Set(MF.bases.map(b=>b.rarity).filter(Boolean))].sort();

    fillSelect('filterOrigin', allOrigins, 'All Origins');
    fillSelect('filterRarity', allRarities, 'Any Rarity');

    const bookOrigins = [...new Set(MF.book.map(b=>b.origin).filter(Boolean))].sort();
    const bookRarities = [...new Set(MF.book.map(b=>b.rarity).filter(Boolean))].sort();
    fillSelect('bookFilterOrigin', bookOrigins, 'All Origins');
    fillSelect('bookFilterRarity', bookRarities, 'Any Rarity');
}

function fillSelect(id, vals, placeholder) {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="">${placeholder}</option>` +
        vals.map(v => `<option value="${esc(v)}">${cap(v)}</option>`).join('');
    if (cur) el.value = cur;
}

function applyFilters() {
    MF.filters.search = document.getElementById('filterSearch')?.value.toLowerCase().trim() || '';
    MF.filters.origin = document.getElementById('filterOrigin')?.value || '';
    MF.filters.rarity = document.getElementById('filterRarity')?.value || '';
    renderEditor();
}

function applyBookFilters() {
    MF.bookFilters.search = document.getElementById('bookSearch')?.value.toLowerCase().trim() || '';
    MF.bookFilters.origin = document.getElementById('bookFilterOrigin')?.value || '';
    MF.bookFilters.rarity = document.getElementById('bookFilterRarity')?.value || '';
    renderBook();
}

function setTypeFilter(show) {
    MF.filters.show = show;
    document.querySelectorAll('.mf-type-pill').forEach(b => b.classList.toggle('active', b.dataset.show === show));
    renderEditor();
}

/* ── Tab switching ─────────────────────────────────────────── */
function setTab(tab) {
    MF.tab = tab;
    document.getElementById('tab-editor').classList.toggle('hidden', tab !== 'editor');
    document.getElementById('tab-book').classList.toggle('hidden', tab !== 'book');
    document.getElementById('tabBtnEditor').classList.toggle('active', tab === 'editor');
    document.getElementById('tabBtnBook').classList.toggle('active', tab === 'book');
}

/* ── Compose selects ───────────────────────────────────────── */
function populateComposeSelects() {
    const baseEl = document.getElementById('composeBase');
    const modEl  = document.getElementById('composeMod');
    if (!baseEl || !modEl) return;
    baseEl.innerHTML = MF.bases.map((b,i)=>`<option value="${i}">${esc(b.name)}${b.baseType ? ' - '+esc(b.baseType) : ''}</option>`).join('');
    modEl.innerHTML  = MF.mods.map((m,i)=>`<option value="${i}">${esc(m.name)} (${esc(m.environment || m.origin || '?')})</option>`).join('');
}

/* ══════════════════════════════════════════════════════════════
   RENDER: EDITOR TAB
   ══════════════════════════════════════════════════════════════ */
function renderEditor() {
    const list = document.getElementById('editorList');
    if (!list) return;

    const { search, origin, rarity, show } = MF.filters;

    const filteredBases = show === 'mod' ? [] : MF.bases.filter((b,i) => {
        if (origin && (b.origin||'').toLowerCase() !== origin.toLowerCase()) return false;
        if (rarity && b.rarity !== rarity) return false;
        if (search && !JSON.stringify(b).toLowerCase().includes(search)) return false;
        return true;
    });

    const filteredMods = show === 'base' ? [] : MF.mods.filter((m,i) => {
        if (origin && (m.origin||'').toLowerCase() !== origin.toLowerCase()) return false;
        if (search && !JSON.stringify(m).toLowerCase().includes(search)) return false;
        return true;
    });

    if (!filteredBases.length && !filteredMods.length) {
        list.innerHTML = `<div style="padding:40px;text-align:center;opacity:0.4;font-size:0.9rem">No entries match filters.</div>`;
        return;
    }

    // Group by origin
    const groups = new Map();
    filteredBases.forEach((b, localIdx) => {
        const realIdx = MF.bases.indexOf(b);
        const key = (b.origin || 'unknown').toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ entry: b, type: 'base', idx: realIdx });
    });
    filteredMods.forEach((m, localIdx) => {
        const realIdx = MF.mods.indexOf(m);
        const key = (m.origin || 'unknown').toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ entry: m, type: 'mod', idx: realIdx });
    });

    const sorted = [...groups.entries()].sort((a,b) => a[0].localeCompare(b[0]));

    let html = '';
    for (const [key, items] of sorted) {
        const sortedItems = items.sort((a,b) => (a.entry.name||'').localeCompare(b.entry.name||''));
        html += `<div class="mf-group-header"><span class="origin-tag ${esc(key)}">${esc(key)}</span><span class="mf-group-count">${sortedItems.length}</span></div>`;
        for (const { entry, type, idx } of sortedItems) {
            html += renderEditorRow(entry, type, idx);
        }
    }
    list.innerHTML = html;
}

function renderEditorRow(entry, type, idx) {
    const id = `${type}-${idx}`;
    const isOpen = MF.openRow === id;
    const origin = (entry.origin || 'none').toLowerCase();

    const nameTags = type === 'base' ? [
        entry.baseType ? `<span class="mb-tag mb-tag-group">${esc(entry.baseType)}</span>` : '',
        `<span class="mb-tag mb-tag-origin">${esc(origin)}</span>`,
        entry.rarity   ? `<span class="mb-tag mb-tag-rarity">${esc(entry.rarity)}</span>` : '',
        entry.size     ? `<span class="mb-tag mb-tag-size">${esc(entry.size)}</span>` : '',
    ] : [
        `<span class="mb-tag mb-tag-origin">${esc(origin)}</span>`,
        entry.environment ? `<span class="mb-tag mb-tag-env">${esc(entry.environment)}</span>` : '',
    ];

    const head = `
    <div class="spell-row-head" onclick="toggleRow('${id}')">
        <span class="spell-row-arrow">${isOpen ? '▼' : '▶'}</span>
        <span class="spell-row-name">${esc(entry.name || '-')}</span>
        <div class="spell-row-tags">${nameTags.join('')}</div>
        <span class="forge-type-pill forge-type-${type}">${type.toUpperCase()}</span>
    </div>`;

    const detail = isOpen
        ? `<div class="spell-row-detail"><div class="forge-detail">${type === 'base' ? renderBaseForm(entry, idx) : renderModForm(entry, idx)}</div></div>`
        : `<div class="spell-row-detail"></div>`;

    return `<div class="spell-row${isOpen ? ' open' : ''}" id="row-${id}">${head}${detail}</div>`;
}

/* ── Toggle row open/close ─────────────────────────────────── */
function toggleRow(id) {
    const wasOpen = MF.openRow === id;
    MF.openRow = wasOpen ? null : id;
    renderEditor();
    if (!wasOpen) {
        requestAnimationFrame(() => {
            const el = document.getElementById(`row-${id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
}

/* ══════════════════════════════════════════════════════════════
   BASE FORM
   ══════════════════════════════════════════════════════════════ */
function renderBaseForm(entry, idx) {
    const mov = entry.movement || {};
    return `
    <!-- Name -->
    <div class="fd-field">
        <label class="fd-label">Name</label>
        <input class="fd-name-input" type="text" value="${esc(entry.name||'')}"
            onchange="setBase(${idx},'name',this.value)" oninput="scheduleBase()">
    </div>

    <!-- Identity -->
    <div>
        <div class="fd-section">Identity</div>
        <div class="fd-grid">
            <div class="fd-field">
                <label class="fd-label">Base Type</label>
                <input type="text" value="${esc(entry.baseType||'')}"
                    onchange="setBase(${idx},'baseType',this.value)" oninput="scheduleBase()">
            </div>
            <div class="fd-field">
                <label class="fd-label">Origin</label>
                <select onchange="setBase(${idx},'origin',this.value)">${buildSelect(D.origin, entry.origin||'')}</select>
            </div>
            <div class="fd-field">
                <label class="fd-label">Size</label>
                <select onchange="setBase(${idx},'size',this.value)">${buildSelect(D.size, entry.size||'')}</select>
            </div>
            <div class="fd-field">
                <label class="fd-label">Rarity</label>
                <select onchange="setBase(${idx},'rarity',this.value)">${buildSelect(D.rarity, entry.rarity||'')}</select>
            </div>
            <div class="fd-field">
                <label class="fd-label">Behavior</label>
                <select onchange="setBase(${idx},'behavior',this.value)">${buildSelect(D.behavior, entry.behavior||'')}</select>
            </div>
        </div>
    </div>

    <!-- Movement -->
    <div>
        <div class="fd-section">Movement (absolute ft)</div>
        <div class="fd-move-row">
            ${['walk','fly','swim','climb','burrow'].map(k=>`
            <div class="fd-move-cell">
                <span class="fd-move-label">${k}</span>
                <div class="fd-stepper">
                    <button class="fd-step-btn" onclick="stepBaseMove(${idx},'${k}',-5)">−</button>
                    <input type="number" id="bm-${k}-${idx}" min="0" step="5" value="${mov[k]||0}"
                        onchange="setBaseMove(${idx},'${k}',+this.value)" oninput="scheduleBase()">
                    <button class="fd-step-btn" onclick="stepBaseMove(${idx},'${k}',5)">+</button>
                </div>
            </div>`).join('')}
        </div>
    </div>

    <!-- Attacks -->
    <div>
        <div class="fd-section">Attacks</div>
        <div class="fd-attacks">
            ${['melee','ranged','spell'].map(k => renderAttackRow(entry, idx, k, 'base', false)).join('')}
        </div>
    </div>

    <!-- Features -->
    <div>
        <div class="fd-section">Features</div>
        <div class="fd-features" id="bfeats-${idx}">
            ${renderFeaturesInner(entry.features||[], idx, 'base')}
        </div>
        <button class="mf-btn fd-feat-add" onclick="addFeature('base',${idx})">+ Add Feature</button>
    </div>

    <!-- Description -->
    <div class="fd-field">
        <label class="fd-label">Description</label>
        <textarea onchange="setBase(${idx},'description',this.value)" oninput="scheduleBase()">${esc(entry.description||'')}</textarea>
    </div>

    <!-- Actions -->
    <div class="fd-row-actions">
        <button class="mf-btn" onclick="duplicateEntry('base',${idx})">⧉ Duplicate</button>
        <button class="mf-btn mf-btn-danger" onclick="confirmDelete('base',${idx})">🗑 Delete</button>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   MOD FORM
   ══════════════════════════════════════════════════════════════ */
function renderModForm(entry, idx) {
    const mov = entry.movementMod || {};
    return `
    <!-- Name -->
    <div class="fd-field">
        <label class="fd-label">Mod Name</label>
        <input class="fd-name-input" type="text" value="${esc(entry.name||'')}"
            onchange="setMod(${idx},'name',this.value)" oninput="scheduleMod()">
    </div>

    <!-- Identity -->
    <div>
        <div class="fd-section">Mod Identity</div>
        <div class="fd-grid">
            <div class="fd-field">
                <label class="fd-label">Origin</label>
                <select onchange="setMod(${idx},'origin',this.value)">${buildSelect(D.origin, entry.origin||'')}</select>
            </div>
            <div class="fd-field">
                <label class="fd-label">Environment</label>
                <input type="text" value="${esc(entry.environment||'')}"
                    onchange="setMod(${idx},'environment',this.value)" oninput="scheduleMod()">
            </div>
            <div class="fd-field">
                <label class="fd-label">Lair Type</label>
                <input type="text" value="${esc(entry.lairType||'')}"
                    onchange="setMod(${idx},'lairType',this.value)" oninput="scheduleMod()">
            </div>
            <div class="fd-field fd-full">
                <label class="fd-label">Motivation</label>
                <input type="text" value="${esc(entry.motivation||'')}"
                    onchange="setMod(${idx},'motivation',this.value)" oninput="scheduleMod()">
            </div>
        </div>
    </div>

    <!-- Movement delta -->
    <div>
        <div class="fd-section">Movement Delta (+ adds · − subtracts · 0 = no change)</div>
        <div class="fd-move-row">
            ${['walk','fly','swim','climb','burrow'].map(k=>`
            <div class="fd-move-cell">
                <span class="fd-move-label">${k}</span>
                <div class="fd-stepper">
                    <button class="fd-step-btn" onclick="stepModMove(${idx},'${k}',-5)">−</button>
                    <input type="number" id="mm-${k}-${idx}" step="5" value="${mov[k]||0}"
                        onchange="setModMove(${idx},'${k}',+this.value)" oninput="scheduleMod()">
                    <button class="fd-step-btn" onclick="stepModMove(${idx},'${k}',5)">+</button>
                </div>
            </div>`).join('')}
        </div>
    </div>

    <!-- Attack overrides -->
    <div>
        <div class="fd-section">Attack Overrides (checked = replaces Base's attack)</div>
        <div class="fd-attacks">
            ${['melee','ranged','spell'].map(k => renderAttackRow(entry, idx, k, 'mod', true)).join('')}
        </div>
    </div>

    <!-- Features -->
    <div>
        <div class="fd-section">Features</div>
        <div class="fd-features" id="mfeats-${idx}">
            ${renderFeaturesInner(entry.features||[], idx, 'mod')}
        </div>
        <button class="mf-btn fd-feat-add" onclick="addFeature('mod',${idx})">+ Add Feature</button>
    </div>

    <!-- Actions -->
    <div class="fd-row-actions">
        <button class="mf-btn" onclick="duplicateEntry('mod',${idx})">⧉ Duplicate</button>
        <button class="mf-btn mf-btn-danger" onclick="confirmDelete('mod',${idx})">🗑 Delete</button>
    </div>`;
}

/* ── Attack row helper ─────────────────────────────────────── */
function renderAttackRow(entry, idx, key, type, isOverride) {
    const atk = entry[key] || {};
    const active = entry[key] !== null && entry[key] !== undefined;
    const toggleLabel = isOverride ? 'Override' : 'Active';
    const prefix = type === 'base' ? 'b' : 'm';
    const onToggle = `toggleAtk('${type}',${idx},'${key}',this.checked)`;
    const onName   = `setAtkField('${type}',${idx},'${key}','name',this.value)`;
    const onDmg    = `setAtkField('${type}',${idx},'${key}','damage',this.value)`;
    const onType   = `setAtkField('${type}',${idx},'${key}','type',this.value)`;

    return `
    <div class="fd-attack-row" id="atkrow-${prefix}-${key}-${idx}">
        <span class="fd-attack-label">${cap(key)}</span>
        <label class="fd-attack-toggle">
            <input type="checkbox" ${active?'checked':''} onchange="${onToggle}">
            <span>${toggleLabel}</span>
        </label>
        <input id="atkinp-${prefix}-${key}-${idx}" type="text" placeholder="Name…"
            value="${esc(atk.name||'')}" ${!active?'disabled':''}
            onchange="${onName}" oninput="${type==='base'?'scheduleBase()':'scheduleMod()'}">
        <input type="text" placeholder="e.g. 1d6" class="mono"
            value="${esc(atk.damage||'')}" ${!active?'disabled':''}
            onchange="${onDmg}" oninput="${type==='base'?'scheduleBase()':'scheduleMod()'}">
        <select ${!active?'disabled':''} onchange="${onType}">
            ${buildSelectInsensitive(D.dmgType, atk.type||'')}
        </select>
    </div>`;
}

/* ── Feature list helpers ──────────────────────────────────── */
function renderFeaturesInner(features, idx, type) {
    if (!features.length) return `<div class="fd-feat-empty">No features yet - click Add Feature</div>`;
    return features.map((f, fi) => renderFeatureRow(f, fi, idx, type)).join('');
}

function renderFeatureRow(f, fi, idx, type) {
    const prefix = type === 'base' ? 'b' : 'm';
    const sched  = type === 'base' ? 'scheduleBase()' : 'scheduleMod()';
    const update = `updateFeature('${type}',${idx},${fi}`;
    return `
    <div class="fd-feature" id="feat-${prefix}-${idx}-${fi}">
        <div class="fd-feature-top">
            <input type="text" placeholder="Feature name…" value="${esc(f.name||'')}"
                onchange="${update},'name',this.value)" oninput="${sched}">
            <select onchange="${update},'type',this.value)">${buildSelectInsensitive(D.featType, f.type||'')}</select>
            <select onchange="${update},'range',this.value)">${buildSelectInsensitive(D.featRange, f.range||'')}</select>
            <button class="fd-feat-del" onclick="removeFeature('${type}',${idx},${fi})">✕</button>
        </div>
        <textarea placeholder="Effect…" onchange="${update},'effect',this.value)" oninput="${sched}">${esc(f.effect||'')}</textarea>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   RENDER: BOOK TAB
   ══════════════════════════════════════════════════════════════ */
function renderBook() {
    const list = document.getElementById('bookList');
    if (!list) return;

    const { search, origin, rarity } = MF.bookFilters;
    const filtered = MF.book.filter(b => {
        if (origin && (b.origin||'').toLowerCase() !== origin.toLowerCase()) return false;
        if (rarity && b.rarity !== rarity) return false;
        if (search && !JSON.stringify(b).toLowerCase().includes(search)) return false;
        return true;
    });

    if (!filtered.length) {
        list.innerHTML = `<div style="padding:40px;text-align:center;opacity:0.4;font-size:0.9rem">No book entries match filters.</div>`;
        return;
    }

    const groups = new Map();
    filtered.forEach(b => {
        const realIdx = MF.book.indexOf(b);
        const key = b._group || b.origin || 'Other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ entry: b, idx: realIdx });
    });

    const sorted = [...groups.entries()].sort((a,b) => {
        if (a[0]==='Other') return 1; if (b[0]==='Other') return -1;
        return a[0].localeCompare(b[0]);
    });

    let html = '';
    for (const [key, items] of sorted) {
        html += `<div class="mf-group-header">${esc(key)} <span class="mf-group-count">${items.length}</span></div>`;
        for (const { entry, idx } of items) html += renderBookRow(entry, idx);
    }
    list.innerHTML = html;
}

function renderBookRow(entry, idx) {
    const id = `book-${idx}`;
    const isOpen = MF.openRow === id;
    const origin = (entry.origin||'none').toLowerCase().split('/')[0].trim();

    const head = `
    <div class="spell-row-head" onclick="toggleRow('${id}')">
        <span class="spell-row-arrow">${isOpen?'▼':'▶'}</span>
        <span class="spell-row-name">${esc(entry.name||'-')}</span>
        <div class="spell-row-tags">
            ${entry._group  ? `<span class="mb-tag mb-tag-group">${esc(entry._group)}</span>` : ''}
            ${entry.origin  ? `<span class="mb-tag mb-tag-origin">${esc(entry.origin)}</span>` : ''}
            ${entry.rarity  ? `<span class="mb-tag mb-tag-rarity">${esc(entry.rarity)}</span>` : ''}
            ${entry.size    ? `<span class="mb-tag mb-tag-size">${esc(entry.size)}</span>` : ''}
            ${entry.pl!=null? `<span class="mb-tag" style="background:var(--warm-2)">PL ${entry.pl}</span>` : ''}
        </div>
        <span class="forge-type-pill forge-type-book">BOOK</span>
    </div>`;

    const detail = isOpen ? `
    <div class="spell-row-detail"><div class="forge-detail">
        ${renderBookForm(entry, idx)}
    </div></div>` : `<div class="spell-row-detail"></div>`;

    return `<div class="spell-row${isOpen?' open':''}" id="row-${id}">${head}${detail}</div>`;
}

function renderBookForm(entry, idx) {
    const meleeAtk  = entry.melee_attack  || entry.melee  || {};
    const rangedAtk = entry.ranged_attack || entry.ranged || {};
    const spellAtk  = entry.spell || {};
    const pl = entry.pl ?? 0, ph = entry.check_physical ?? 0, mt = entry.check_mental ?? 0;

    const featList = Array.isArray(entry.features) && entry.features.length
        ? entry.features
        : (entry.feature_name ? [{name:entry.feature_name,type:entry.feature_type,range:entry.feature_range,effect:entry.feature_effect}] : []);

    return `
    <!-- Name + Group -->
    <div class="fd-grid">
        <div class="fd-field">
            <label class="fd-label">Name</label>
            <input class="fd-name-input" type="text" value="${esc(entry.name||'')}"
                onchange="setBook(${idx},'name',this.value)" oninput="scheduleBook()">
        </div>
        <div class="fd-field">
            <label class="fd-label">Group</label>
            <input type="text" value="${esc(entry._group||'')}"
                onchange="setBook(${idx},'_group',this.value)" oninput="scheduleBook()">
        </div>
    </div>

    <!-- Identity -->
    <div>
        <div class="fd-section">Identity</div>
        <div class="fd-grid">
            <div class="fd-field">
                <label class="fd-label">Origin</label>
                <input type="text" value="${esc(entry.origin||'')}"
                    onchange="setBook(${idx},'origin',this.value)" oninput="scheduleBook()">
            </div>
            <div class="fd-field">
                <label class="fd-label">Size</label>
                <select onchange="setBook(${idx},'size',this.value)">${buildSelect(D.size, entry.size||'')}</select>
            </div>
            <div class="fd-field">
                <label class="fd-label">Rarity</label>
                <select onchange="setBook(${idx},'rarity',this.value)">${buildSelect(D.rarity, entry.rarity||'')}</select>
            </div>
            <div class="fd-field">
                <label class="fd-label">Environment</label>
                <input type="text" value="${esc(entry.environment||'')}"
                    onchange="setBook(${idx},'environment',this.value)" oninput="scheduleBook()">
            </div>
            <div class="fd-field">
                <label class="fd-label">Behavior</label>
                <select onchange="setBook(${idx},'behavior',this.value)">${buildSelect(D.behavior, entry.behavior||'')}</select>
            </div>
            <div class="fd-field fd-full">
                <label class="fd-label">Motivation</label>
                <input type="text" value="${esc(entry.motivation||'')}"
                    onchange="setBook(${idx},'motivation',this.value)" oninput="scheduleBook()">
            </div>
        </div>
    </div>

    <!-- PL -->
    <div>
        <div class="fd-section">Power Level</div>
        <div class="fd-pl-row">
            ${[['pl','PL',pl],['check_physical','Physical',ph],['check_mental','Mental',mt]].map(([k,l,v])=>`
            <div class="fd-pl-cell">
                <label class="fd-label">${l}</label>
                <div class="fd-stepper">
                    <button class="fd-step-btn" onclick="stepBook(${idx},'${k}',-1)">−</button>
                    <input type="number" id="bk-${k}-${idx}" min="0" value="${v}"
                        onchange="setBook(${idx},'${k}',+this.value)" oninput="scheduleBook()">
                    <button class="fd-step-btn" onclick="stepBook(${idx},'${k}',1)">+</button>
                </div>
            </div>`).join('')}
        </div>
    </div>

    <!-- Movement -->
    <div>
        <div class="fd-section">Movement (ft)</div>
        <div class="fd-move-row">
            ${['walk','fly','swim','climb'].map(k=>`
            <div class="fd-move-cell">
                <span class="fd-move-label">${k}</span>
                <div class="fd-stepper">
                    <button class="fd-step-btn" onclick="stepBook(${idx},'${k}',-5)">−</button>
                    <input type="number" id="bkm-${k}-${idx}" min="0" step="5" value="${entry[k]||0}"
                        onchange="setBook(${idx},'${k}',+this.value)" oninput="scheduleBook()">
                    <button class="fd-step-btn" onclick="stepBook(${idx},'${k}',5)">+</button>
                </div>
            </div>`).join('')}
        </div>
    </div>

    <!-- Attacks -->
    <div>
        <div class="fd-section">Attacks</div>
        <div class="fd-attacks">
            ${[
                ['Melee',  'melee_attack',  meleeAtk],
                ['Ranged', 'ranged_attack', rangedAtk],
                ['Spell',  'spell',         spellAtk],
            ].map(([label, key, atk]) => `
            <div class="fd-attack-row">
                <span class="fd-attack-label">${label}</span>
                <span></span>
                <input type="text" placeholder="Name…" value="${esc(atk.name||'')}"
                    onchange="setBookAtk(${idx},'${key}','name',this.value)" oninput="scheduleBook()">
                <input type="text" placeholder="e.g. 1d6" value="${esc(atk.damage||'')}"
                    onchange="setBookAtk(${idx},'${key}','damage',this.value)" oninput="scheduleBook()">
                <input type="text" placeholder="Type" value="${esc(atk.damage_type||atk.type||'')}"
                    onchange="setBookAtk(${idx},'${key}','damage_type',this.value)" oninput="scheduleBook()">
            </div>`).join('')}
        </div>
    </div>

    <!-- Features -->
    <div>
        <div class="fd-section">Features</div>
        <div class="fd-features" id="bkfeats-${idx}">
            ${featList.length
                ? featList.map((f,fi)=>renderBookFeatureRow(f,fi,idx)).join('')
                : '<div class="fd-feat-empty">No features</div>'}
        </div>
        <button class="mf-btn fd-feat-add" onclick="addBookFeature(${idx})">+ Add Feature</button>
    </div>

    <!-- Description / Lore -->
    <div class="fd-grid fd-grid-wide">
        <div class="fd-field">
            <label class="fd-label">Description</label>
            <textarea onchange="setBook(${idx},'description',this.value)" oninput="scheduleBook()">${esc(entry.description||'')}</textarea>
        </div>
        <div class="fd-field">
            <label class="fd-label">Lore</label>
            <textarea onchange="setBook(${idx},'lore',this.value)" oninput="scheduleBook()">${esc(entry.lore||'')}</textarea>
        </div>
    </div>

    <!-- Spells list -->
    ${Array.isArray(entry.spells)&&entry.spells.length ? `
    <div>
        <div class="fd-section">Spells</div>
        <div class="fd-spells">
            ${entry.spells.map((s,si)=>`
            <div class="fd-spell-row">
                <span class="fd-spell-name">${esc(s.name||'?')}</span>
                <span class="fd-spell-meta">${esc([s.manner,s.transmission].filter(Boolean).join(' · '))}</span>
                <button class="fd-feat-del" onclick="removeBookSpell(${idx},${si})">✕</button>
            </div>`).join('')}
        </div>
    </div>` : ''}

    <!-- Actions -->
    <div class="fd-row-actions">
        <button class="mf-btn mf-btn-danger" onclick="confirmDelete('book',${idx})">🗑 Delete</button>
    </div>`;
}

function renderBookFeatureRow(f, fi, idx) {
    return `
    <div class="fd-feature">
        <div class="fd-feature-top">
            <input type="text" placeholder="Feature name…" value="${esc(f.name||'')}"
                onchange="setBookFeature(${idx},${fi},'name',this.value)" oninput="scheduleBook()">
            <input type="text" placeholder="Type" value="${esc(f.type||f.action||'')}"
                onchange="setBookFeature(${idx},${fi},'type',this.value)" oninput="scheduleBook()">
            <input type="text" placeholder="Range" value="${esc(f.range||'')}"
                onchange="setBookFeature(${idx},${fi},'range',this.value)" oninput="scheduleBook()">
            <button class="fd-feat-del" onclick="removeBookFeature(${idx},${fi})">✕</button>
        </div>
        <textarea placeholder="Effect…" onchange="setBookFeature(${idx},${fi},'effect',this.value)" oninput="scheduleBook()">${esc(f.effect||'')}</textarea>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   COMPOSE
   ══════════════════════════════════════════════════════════════ */
function doCompose() {
    const bi = +document.getElementById('composeBase')?.value;
    const mi = +document.getElementById('composeMod')?.value;
    const base = MF.bases[bi];
    const mod  = MF.mods[mi];
    if (!base || !mod) return;

    const composed = composeMonster(base, mod);
    const preview  = document.getElementById('composePreview');
    if (!preview) return;

    const attacks = [
        ['Melee',  composed.melee],
        ['Ranged', composed.ranged],
        ['Spell',  composed.spell],
    ].filter(([,a]) => a?.name);

    preview.innerHTML = `
    <div class="mf-preview-card">
        <div class="mf-preview-name">${esc(composed.name)}</div>
        <div class="mf-preview-pills">
            ${composed.origins.map(o=>`<span class="origin-tag ${esc(o)}">${esc(o)}</span>`).join('')}
            ${composed.rarity   ? `<span class="mb-tag mb-tag-rarity">${esc(composed.rarity)}</span>` : ''}
            ${composed.size     ? `<span class="mb-tag mb-tag-size">${esc(composed.size)}</span>` : ''}
            ${composed.environment ? `<span class="mb-tag mb-tag-env">${esc(composed.environment)}</span>` : ''}
        </div>
        <div class="mf-preview-meta">
            ${composed.moveText ? `<span>Move: ${esc(composed.moveText)}</span>` : ''}
            ${composed.behavior ? `<span>Behavior: ${esc(composed.behavior)}</span>` : ''}
            ${composed.lairType ? `<span>Lair: ${esc(composed.lairType)}</span>` : ''}
        </div>
        ${attacks.length ? `<div class="mf-preview-attacks">
            ${attacks.map(([l,a])=>`<div><strong>${l}:</strong> ${esc(a.name)} - ${esc(a.damage||'')} ${esc(a.type||'')}</div>`).join('')}
        </div>` : ''}
        ${composed.features.length ? `<div class="mf-preview-features">
            ${composed.features.map(f=>`<div class="mf-preview-feature"><strong>${esc(f.name)}</strong>${f.type?` <em style="opacity:0.5;font-size:0.78em">(${esc(f.type)})</em>`:''}: ${esc(f.effect||'')}</div>`).join('')}
        </div>` : ''}
        ${composed.motivation ? `<div class="mf-preview-motivation">${esc(composed.motivation)}</div>` : ''}
        <div class="mf-preview-actions">
            <button class="mf-btn mf-btn-gold" onclick="addComposedToBook(${MF.bases.indexOf(base)},${MF.mods.indexOf(mod)})">+ Add to Book</button>
        </div>
    </div>`;
    preview.classList.add('visible');
}

function composeMonster(base, mod) {
    const name = `${mod.name} ${base.name}`;
    const origins = [...new Set([base.origin, mod.origin].filter(Boolean).map(s=>s.toLowerCase()))];

    const movement = { ...(base.movement || { walk: 30 }) };
    if (mod.movementMod) {
        for (const k of Object.keys(mod.movementMod)) {
            movement[k] = (movement[k] || 0) + mod.movementMod[k];
        }
    }
    for (const k of Object.keys(movement)) if (movement[k] <= 0) delete movement[k];

    const moveParts = Object.entries(movement).map(([k,v])=>`${cap(k)}: ${v} ft`);
    const moveText  = moveParts.join(', ') || '-';

    const melee  = mod.melee  !== undefined ? mod.melee  : (base.melee  || null);
    const ranged = mod.ranged !== undefined ? mod.ranged : (base.ranged || null);
    const spell  = mod.spell  !== undefined ? mod.spell  : (base.spell  || null);

    const features = [
        ...(base.features || []).map(f=>({...f})),
        ...(mod.features  || []).map(f=>({...f})),
    ];

    return {
        name, origins, movement, moveText,
        melee, ranged, spell, features,
        spells:      [...(base.spells||[]), ...(mod.spells||[])],
        baseType:    base.baseType  || '',
        size:        base.size      || '',
        rarity:      base.rarity    || '',
        behavior:    base.behavior  || '',
        environment: mod.environment || '',
        lairType:    mod.lairType   || '',
        motivation:  mod.motivation || '',
        description: base.description || '',
    };
}

async function addComposedToBook(baseIdx, modIdx) {
    const base = MF.bases[baseIdx];
    const mod  = MF.mods[modIdx];
    if (!base || !mod) return;
    const c = composeMonster(base, mod);

    const entry = {
        name:        c.name,
        _group:      c.baseType || base.name,
        origin:      c.origins.join(' / '),
        size:        c.size        || undefined,
        rarity:      c.rarity      || undefined,
        environment: c.environment || undefined,
        behavior:    c.behavior    || undefined,
        motivation:  c.motivation  || undefined,
        lairType:    c.lairType    || undefined,
        description: c.description || undefined,
        walk:        c.movement.walk   || 0,
        fly:         c.movement.fly    || 0,
        swim:        c.movement.swim   || 0,
        climb:       c.movement.climb  || 0,
        melee_attack:  c.melee  ? { name: c.melee.name,  damage: c.melee.damage,  damage_type: c.melee.type  } : undefined,
        ranged_attack: c.ranged ? { name: c.ranged.name, damage: c.ranged.damage, damage_type: c.ranged.type } : undefined,
        spell:         c.spell  ? { name: c.spell.name,  damage: c.spell.damage,  damage_type: c.spell.type  } : undefined,
        features: c.features.map(f=>({ name:f.name, type:f.type, range:f.range, effect:f.effect, damage:f.damage })),
        spells: c.spells.length ? c.spells : undefined,
    };

    // Strip undefined
    Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k]);

    MF.book.push(entry);
    await saveBook(true);
    renderBook();
    populateFilters();
    toast(`Added "${c.name}" to Book`, 'success');
    document.getElementById('composePreview').classList.remove('visible');
    setTab('book');
}

/* ══════════════════════════════════════════════════════════════
   DATA MUTATIONS - Base
   ══════════════════════════════════════════════════════════════ */
function setBase(idx, path, val) {
    setNested(MF.bases[idx], path, val);
    scheduleBase();
}
function setBaseMove(idx, key, val) {
    if (!MF.bases[idx].movement) MF.bases[idx].movement = {};
    MF.bases[idx].movement[key] = Math.max(0, val);
    scheduleBase();
}
function stepBaseMove(idx, key, delta) {
    if (!MF.bases[idx].movement) MF.bases[idx].movement = {};
    const cur = MF.bases[idx].movement[key] || 0;
    const newVal = Math.max(0, cur + delta);
    MF.bases[idx].movement[key] = newVal;
    const inp = document.getElementById(`bm-${key}-${idx}`);
    if (inp) inp.value = newVal;
    scheduleBase();
}
function setAtkField(type, idx, key, field, val) {
    const arr = type === 'base' ? MF.bases : MF.mods;
    if (!arr[idx][key]) arr[idx][key] = { name: '', damage: '', type: '' };
    arr[idx][key][field] = val;
    if (type === 'base') scheduleBase(); else scheduleMod();
}
function toggleAtk(type, idx, key, active) {
    const arr = type === 'base' ? MF.bases : MF.mods;
    arr[idx][key] = active ? { name: '', damage: '', type: '' } : null;
    const prefix = type === 'base' ? 'b' : 'm';
    const row = document.getElementById(`atkrow-${prefix}-${key}-${idx}`);
    if (row) row.querySelectorAll('input:not([type=checkbox]),select').forEach(el => el.disabled = !active);
    if (type === 'base') scheduleBase(); else scheduleMod();
}
function addFeature(type, idx) {
    const arr = type === 'base' ? MF.bases : MF.mods;
    if (!arr[idx].features) arr[idx].features = [];
    arr[idx].features.push({ name: '', type: '', range: '', effect: '' });
    if (type === 'base') scheduleBase(); else scheduleMod();
    const containerId = type === 'base' ? `bfeats-${idx}` : `mfeats-${idx}`;
    const container = document.getElementById(containerId);
    if (container) {
        const fi = arr[idx].features.length - 1;
        container.insertAdjacentHTML('beforeend', renderFeatureRow(arr[idx].features[fi], fi, idx, type));
        container.querySelector('.fd-feat-empty')?.remove();
    }
}
function removeFeature(type, idx, fi) {
    const arr = type === 'base' ? MF.bases : MF.mods;
    arr[idx].features.splice(fi, 1);
    if (type === 'base') scheduleBase(); else scheduleMod();
    // Re-render just the features list to keep fi indices correct
    const containerId = type === 'base' ? `bfeats-${idx}` : `mfeats-${idx}`;
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = renderFeaturesInner(arr[idx].features, idx, type);
}
function updateFeature(type, idx, fi, field, val) {
    const arr = type === 'base' ? MF.bases : MF.mods;
    if (arr[idx].features?.[fi]) arr[idx].features[fi][field] = val;
    if (type === 'base') scheduleBase(); else scheduleMod();
}

/* ── Mod mutations ─────────────────────────────────────────── */
function setMod(idx, path, val) { setNested(MF.mods[idx], path, val); scheduleMod(); }
function setModMove(idx, key, val) {
    if (!MF.mods[idx].movementMod) MF.mods[idx].movementMod = {};
    MF.mods[idx].movementMod[key] = val;
    scheduleMod();
}
function stepModMove(idx, key, delta) {
    if (!MF.mods[idx].movementMod) MF.mods[idx].movementMod = {};
    const cur = MF.mods[idx].movementMod[key] || 0;
    const newVal = cur + delta;
    MF.mods[idx].movementMod[key] = newVal;
    const inp = document.getElementById(`mm-${key}-${idx}`);
    if (inp) inp.value = newVal;
    scheduleMod();
}

/* ── Book mutations ────────────────────────────────────────── */
function setBook(idx, path, val) { setNested(MF.book[idx], path, val); scheduleBook(); }
function stepBook(idx, key, delta) {
    MF.book[idx][key] = Math.max(0, (MF.book[idx][key] || 0) + delta);
    const inp = document.getElementById(`bk-${key}-${idx}`) || document.getElementById(`bkm-${key}-${idx}`);
    if (inp) inp.value = MF.book[idx][key];
    scheduleBook();
}
function setBookAtk(idx, key, field, val) {
    if (!MF.book[idx][key]) MF.book[idx][key] = {};
    MF.book[idx][key][field] = val;
    scheduleBook();
}
function addBookFeature(idx) {
    if (!MF.book[idx].features) MF.book[idx].features = [];
    MF.book[idx].features.push({ name: '', type: '', range: '', effect: '' });
    scheduleBook();
    const container = document.getElementById(`bkfeats-${idx}`);
    if (container) {
        const fi = MF.book[idx].features.length - 1;
        container.insertAdjacentHTML('beforeend', renderBookFeatureRow(MF.book[idx].features[fi], fi, idx));
        container.querySelector('.fd-feat-empty')?.remove();
    }
}
function removeBookFeature(idx, fi) {
    MF.book[idx].features.splice(fi, 1);
    scheduleBook();
    const container = document.getElementById(`bkfeats-${idx}`);
    if (container) {
        container.innerHTML = MF.book[idx].features.length
            ? MF.book[idx].features.map((f,i)=>renderBookFeatureRow(f,i,idx)).join('')
            : '<div class="fd-feat-empty">No features</div>';
    }
}
function setBookFeature(idx, fi, field, val) {
    if (MF.book[idx].features?.[fi]) MF.book[idx].features[fi][field] = val;
    scheduleBook();
}
function removeBookSpell(idx, si) {
    MF.book[idx].spells.splice(si, 1);
    scheduleBook();
    renderBook(); // need full re-render to update indices
}

/* ── Add / Duplicate / Delete ──────────────────────────────── */
function addNew(type) {
    if (type === 'base') {
        MF.bases.push({ name: 'New Base', baseType: '', origin: 'basic', description: '', size: 'Medium', rarity: 'Common', behavior: 'Neutral', movement: { walk: 30 }, melee: null, ranged: null, spell: null, spells: [], features: [] });
        scheduleBase();
        MF.openRow = `base-${MF.bases.length - 1}`;
    } else {
        MF.mods.push({ name: 'New Mod', origin: 'basic', environment: '', lairType: '', motivation: '', movementMod: {}, melee: null, ranged: null, spell: null, spells: [], features: [] });
        scheduleMod();
        MF.openRow = `mod-${MF.mods.length - 1}`;
    }
    MF.filters.show = type;
    document.querySelectorAll('.mf-type-pill').forEach(b => b.classList.toggle('active', b.dataset.show === type));
    renderEditor();
    requestAnimationFrame(() => {
        const last = document.getElementById(`row-${MF.openRow}`);
        if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

function duplicateEntry(type, idx) {
    const arr = type === 'base' ? MF.bases : MF.mods;
    const copy = JSON.parse(JSON.stringify(arr[idx]));
    copy.name = (copy.name || 'Entry') + ' (Copy)';
    arr.splice(idx + 1, 0, copy);
    if (type === 'base') scheduleBase(); else scheduleMod();
    MF.openRow = `${type}-${idx + 1}`;
    renderEditor();
    toast(`Duplicated "${arr[idx].name}"`, 'success');
}

function confirmDelete(type, idx) {
    const arr = type === 'base' ? MF.bases : type === 'mod' ? MF.mods : MF.book;
    const name = arr[idx]?.name || 'this entry';
    showDialog(`Delete "${name}"?`, 'This cannot be undone.', () => deleteEntry(type, idx));
}

function deleteEntry(type, idx) {
    if (type === 'base')  { MF.bases.splice(idx, 1); scheduleBase(); renderEditor(); }
    else if (type === 'mod')  { MF.mods.splice(idx, 1);  scheduleMod();  renderEditor(); }
    else if (type === 'book') { MF.book.splice(idx, 1);  scheduleBook(); renderBook();  }
    MF.openRow = null;
    toast('Deleted', 'success');
}

/* ══════════════════════════════════════════════════════════════
   AUTOSAVE
   ══════════════════════════════════════════════════════════════ */
function scheduleBase() {
    clearTimeout(MF.baseTimer);
    setSaveStatus('saving');
    MF.baseTimer = setTimeout(saveBases, 900);
}
function scheduleMod() {
    clearTimeout(MF.modTimer);
    setSaveStatus('saving');
    MF.modTimer = setTimeout(saveMods, 900);
}
function scheduleBook() {
    clearTimeout(MF.bookTimer);
    setSaveStatus('saving');
    MF.bookTimer = setTimeout(() => saveBook(false), 900);
}

async function saveBases() {
    await writeFile('monsterbase.json', MF.bases);
}
async function saveMods() {
    await writeFile('monstermod.json', MF.mods);
}
async function saveBook(immediate = false) {
    if (!immediate) { clearTimeout(MF.bookTimer); }
    await writeFile('monsterbook.json', MF.book);
}

async function writeFile(filename, data) {
    try {
        const res = await fetch(`/api/file/${filename}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSaveStatus('saved');
    } catch(e) {
        console.error('[MonsterForge] Save failed:', e);
        setSaveStatus('error');
        toast(`Save failed: ${e.message}`, 'error');
    }
}

function setSaveStatus(status) {
    const dot  = document.getElementById('saveDot');
    const text = document.getElementById('saveText');
    if (!dot || !text) return;
    dot.className  = `mf-save-dot ${status}`;
    if (status === 'saving') text.textContent = 'Saving…';
    else if (status === 'saved') {
        const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        text.textContent = `Saved ${t}`;
    } else if (status === 'error') text.textContent = 'Save failed!';
}

/* ══════════════════════════════════════════════════════════════
   UTILS
   ══════════════════════════════════════════════════════════════ */
function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function cap(s) { return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : ''; }

function buildSelect(opts, current) {
    const cur = String(current ?? '');
    return opts.map(o => `<option value="${esc(o)}"${o === cur ? ' selected' : ''}>${o || '-'}</option>`).join('');
}

function buildSelectInsensitive(opts, current) {
    const cur = String(current ?? '').toLowerCase().replace(/[\s_-]/g, '');
    return opts.map(o => {
        const norm = o.toLowerCase().replace(/[\s_-]/g, '');
        return `<option value="${esc(o)}"${norm === cur ? ' selected' : ''}>${o || '-'}</option>`;
    }).join('');
}

function setNested(obj, path, val) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
        cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
}

/* ── Dialog ────────────────────────────────────────────────── */
function showDialog(title, text, onConfirm) {
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogText').textContent  = text;
    document.getElementById('dialogOverlay').classList.remove('hidden');
    MF.dialogCallback = onConfirm;
}
function dialogConfirm() {
    document.getElementById('dialogOverlay').classList.add('hidden');
    if (MF.dialogCallback) { MF.dialogCallback(); MF.dialogCallback = null; }
}
function dialogCancel() {
    document.getElementById('dialogOverlay').classList.add('hidden');
    MF.dialogCallback = null;
}

/* ── Toast ─────────────────────────────────────────────────── */
function toast(msg, type = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `mf-toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

/* ── Boot ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
