// ── SHARED "TE" (Table Entry) EDITOR CRUD ────────────────────────────────────
// Shared by quest/traps/medicine/worldbuilding/enchanted/hexgen - editors whose
// entries are flat chip/row fragments (the .te-chip / .te-row markup) edited
// inline, with no per-entry form. Each file keeps its own construction logic
// for what a "new entry" looks like, but delegates the mechanical set/remove/
// push-and-refresh work here instead of repeating it six times.
function teSetField(idx, field, value) {
    if (state.data[idx]) state.data[idx][field] = value;
    markUnsaved();
}
function teRemoveEntry(idx) {
    state.data.splice(idx, 1);
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
}
function teAddEntry(entry, focusSelector) {
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
    if (focusSelector) {
        setTimeout(() => {
            const inputs = document.querySelectorAll(focusSelector);
            if (inputs.length) inputs[inputs.length - 1].focus();
        }, 50);
    }
}

// ── SHARED TABLE MODE INFRASTRUCTURE ─────────────────────────────────────────
// Registry: { [type]: { mode: bool, sort: {col, dir}, render: Function } }
const TM = {};

function tmRegister(type, renderFn) {
    if (!TM[type]) TM[type] = { mode: false, sort: { col: null, dir: 1 } };
    TM[type].render = renderFn;
}

function tmIsOn(type) {
    return !!(TM[type]?.mode);
}

function tmToggle(type) {
    const t = TM[type];
    if (!t) return;
    t.mode = !t.mode;
    _tmRefreshBtn(type);
    if (t.mode) {
        t.render();
    } else {
        state.currentIndex = -1;
        renderEntryList();
        renderEmptyEditor();
    }
}

function _tmRefreshBtn(type) {
    const btn = document.getElementById('btnTableMode');
    if (!btn) return;
    const on = TM[type]?.mode;
    btn.textContent = on ? '≡ Form' : '⊞ Table';
    btn.classList.toggle('btn-gold', !!on);
    btn.classList.toggle('btn-ghost', !on);
}

function tmOnLoad(type) {
    if (TM[type]) {
        TM[type].mode = false;
        TM[type].sort = { col: null, dir: 1 };
    }
    const btn = document.getElementById('btnTableMode');
    if (btn) {
        btn.style.display = '';
        btn.textContent = '⊞ Table';
        btn.className = 'btn btn-ghost toolbar-extra';
    }
}

// For grid-first files (roll tables and the like) whose form view is the
// exception rather than the rule. Call from onLoad, after tmOnLoad: the
// renderEmptyEditor() that openFile runs next then paints the table directly,
// so the empty state never flashes on screen.
function tmOpenInTableMode(type) {
    if (!TM[type]) return;
    TM[type].mode = true;
    _tmRefreshBtn(type);
}

function tmSortBy(type, col) {
    const t = TM[type];
    if (!t) return;
    if (t.sort.col === col) t.sort.dir *= -1;
    else { t.sort.col = col; t.sort.dir = 1; }
    t.render();
}

function tmGetSort(type) {
    return TM[type]?.sort || { col: null, dir: 1 };
}

// Mirrors the ladder in data/vocab.json. Data is stored lowercase; the lookup
// below lowercases anyway so legacy Title-Case entries still sort correctly
// (the old map was missing 'Very Rare' entirely, ranking it as unknown).
const TM_RARITY_ORDER = {
    '': -1, common: 0, uncommon: 1, rare: 2, 'very rare': 3, legendary: 4,
};
const tmRarityRank = v => TM_RARITY_ORDER[String(v ?? '').toLowerCase().trim()] ?? -1;

function tmSortedRows(type, entries, numericKeys, rarityKeys) {
    const nKeys = numericKeys || [];
    const rKeys = rarityKeys || [];
    const { col, dir } = tmGetSort(type);
    if (!col) return entries;
    return [...entries].sort((a, b) => {
        if (nKeys.includes(col)) return dir * ((a[col] ?? 0) - (b[col] ?? 0));
        if (rKeys.includes(col)) return dir * (tmRarityRank(a[col]) - tmRarityRank(b[col]));
        return dir * String(a[col] ?? '').toLowerCase().localeCompare(String(b[col] ?? '').toLowerCase());
    });
}

function tmThHtml(type, cols) {
    const sort = tmGetSort(type);
    return cols.map(c => {
        const sAttr = c.style ? ` style="${c.style}"` : '';
        if (!c.key) return `<th${sAttr}>${c.label}</th>`;
        const active = sort.col === c.key;
        const arrow = active ? (sort.dir === 1 ? ' ▲' : ' ▼') : '';
        return `<th${sAttr} class="gt-th-sort${active ? ' gt-th-active' : ''}" onclick="tmSortBy('${type}','${c.key}')" title="Sort by ${c.label}">${c.label}${arrow}</th>`;
    }).join('');
}

async function tmDeleteRow(type, idx) {
    const entry = state.data[idx];
    const name = entry?.name || entry?.term || 'this entry';
    const ok = await confirm2(`Delete "${name}"?`, 'Delete', 'btn-danger');
    if (!ok) return;
    state.data.splice(idx, 1);
    state.currentIndex = -1;
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    TM[type]?.render();
    updateStatus();
    markUnsaved();
}

function tmEditForm(type, idx) {
    if (TM[type]) TM[type].mode = false;
    _tmRefreshBtn(type);
    selectEntry(idx);
}

// Patch core app functions to keep all table views in sync with group/search changes
// and exit gracefully when a specific entry is opened in form view.
(function () {
    const _setGroup      = setGroup;
    const _filterEntries = filterEntries;
    const _renderEditor  = renderEditor;
    const _renderEmpty   = renderEmptyEditor;

    setGroup = function (group) {
        _setGroup(group);
        const t = TM[state.fileType];
        if (t?.mode) t.render();
    };

    filterEntries = function () {
        _filterEntries();
        const t = TM[state.fileType];
        if (t?.mode) t.render();
    };

    renderEditor = function () {
        const t = TM[state.fileType];
        if (t?.mode) {
            t.mode = false;
            _tmRefreshBtn(state.fileType);
        }
        _renderEditor();
    };

    renderEmptyEditor = function () {
        const t = TM[state.fileType];
        if (t?.mode) { t.render(); return; }
        _renderEmpty();
    };
})();
