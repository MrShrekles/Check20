// ── HEXGEN TABLE EDITOR ───────────────────────────────────────────────────────

const HEX_ENV_SUBS = ['desert', 'mountain', 'city', 'all'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexGroupTotal(group, subgroup) {
    return state.data
        .filter(e => e._group === group && (group !== 'environments' || e._subgroup === subgroup))
        .reduce((s, e) => s + (Number(e.weight) || 0), 0);
}

function hexPct(weight, total) {
    return total > 0 ? ((weight / total) * 100).toFixed(1) + '%' : '-';
}

function updateHexField(idx, field, value) {
    if (!state.data[idx]) return;
    state.data[idx][field] = value;
    markUnsaved();
    // refresh percentage labels for this group without full re-render
    const group = state.data[idx]._group;
    const sub   = state.data[idx]._subgroup || null;
    const total = hexGroupTotal(group, sub);
    document.querySelectorAll(`.hex-pct[data-group="${group}"]${sub ? `[data-sub="${sub}"]` : ''}`).forEach(el => {
        const i = Number(el.dataset.idx);
        const w = Number(state.data[i]?.weight) || 0;
        el.textContent = hexPct(w, total);
    });
}

function removeHexEntry(idx) {
    state.data.splice(idx, 1);
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
}

function addHexEntry(group, subgroup) {
    const templates = {
        travelConnectors: { _group: group, value: '' },
        environments:     { _group: group, _subgroup: subgroup || 'all', name: '', weight: 1 },
        populations:      { _group: group, name: '', tier: 0, weight: 1 },
        powerLevels:      { _group: group, pl: 1, weight: 1 },
    };
    state.data.push(templates[group] || { _group: group, name: '', weight: 1 });
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
}

// ── Row builders ──────────────────────────────────────────────────────────────

function hexNameWeightRow(e, total) {
    const pct = hexPct(Number(e.weight) || 0, total);
    return `<div class="te-row">
        <input class="te-row-input" value="${escAttr(e.name || '')}"
            onchange="updateHexField(${e._i},'name',this.value)" oninput="markUnsaved()" placeholder="name…">
        <input class="te-row-input te-input--xs" type="number" min="0" value="${e.weight ?? 1}"
            onchange="updateHexField(${e._i},'weight',parseInt(this.value)||0)" oninput="markUnsaved()">
        <span class="hex-pct te-count" data-group="${e._group}" data-sub="${e._subgroup||''}" data-idx="${e._i}">${pct}</span>
        <button class="te-remove" onclick="removeHexEntry(${e._i})">×</button>
    </div>`;
}

function hexColHeader(extra) {
    return `<div class="te-col-header" style="display:flex;gap:6px;margin-bottom:2px;font-size:10px;color:#444;padding:0 2px">
        <span style="flex:1">Name</span>
        ${extra || ''}
        <span style="flex:0 0 54px;text-align:center">Wt</span>
        <span style="flex:0 0 40px;text-align:right">%</span>
        <span style="width:28px"></span>
    </div>`;
}

// ── Full table render ─────────────────────────────────────────────────────────

function renderHexgenTable() {
    const byGroup = (g, sub) => state.data
        .map((e, i) => ({ ...e, _i: i }))
        .filter(e => e._group === g && (!sub || e._subgroup === sub));

    // Simple { name, weight } sections
    const simpleGroups = [
        { group: 'lords',        label: 'Lords'        },
        { group: 'enemies',      label: 'Enemies'      },
        { group: 'temperaments', label: 'Temperaments' },
        { group: 'features',     label: 'Features'     },
        { group: 'foods',        label: 'Foods'        },
        { group: 'resources',    label: 'Resources'    },
    ];

    const simpleSections = simpleGroups.map(({ group, label }) => {
        const entries = byGroup(group);
        const total   = hexGroupTotal(group, null);
        const rows    = entries.map(e => hexNameWeightRow(e, total)).join('');
        return `<div class="te-section">
            <div class="te-section-head">
                <h3>${label} <span class="te-count">${entries.length} · ∑${total}</span></h3>
                <button class="te-add-btn" onclick="addHexEntry('${group}')">+ Add</button>
            </div>
            ${hexColHeader()}
            <div class="te-rows">${rows || `<p style="color:#555;font-size:12px">Empty</p>`}</div>
        </div>`;
    }).join('');

    // Environments (grouped by sub-terrain)
    const envBlocks = HEX_ENV_SUBS.map(sub => {
        const entries = byGroup('environments', sub);
        const total   = hexGroupTotal('environments', sub);
        const rows    = entries.map(e => hexNameWeightRow(e, total)).join('');
        return `<div class="te-cat">
            <div class="te-cat-label" style="display:flex;justify-content:space-between">
                <span>${sub} <span class="te-count">${entries.length} · ∑${total}</span></span>
                <button class="te-add-chip" onclick="addHexEntry('environments','${sub}')">+ ${sub}</button>
            </div>
            ${hexColHeader()}
            <div class="te-rows">${rows || `<p style="color:#555;font-size:12px">Empty</p>`}</div>
        </div>`;
    }).join('');

    const envSection = `<div class="te-section">
        <div class="te-section-head"><h3>Environments</h3></div>
        ${envBlocks}
    </div>`;

    // Populations (name + tier + weight)
    const pops      = byGroup('populations');
    const popTotal  = hexGroupTotal('populations', null);
    const popRows   = pops.map(e => {
        const pct = hexPct(Number(e.weight) || 0, popTotal);
        return `<div class="te-row">
            <input class="te-row-input" value="${escAttr(e.name || '')}"
                onchange="updateHexField(${e._i},'name',this.value)" oninput="markUnsaved()" placeholder="name…">
            <input class="te-row-input te-input--xs" type="number" min="0" max="10" value="${e.tier ?? 0}"
                onchange="updateHexField(${e._i},'tier',parseInt(this.value)||0)" oninput="markUnsaved()">
            <input class="te-row-input te-input--xs" type="number" min="0" value="${e.weight ?? 1}"
                onchange="updateHexField(${e._i},'weight',parseInt(this.value)||0)" oninput="markUnsaved()">
            <span class="hex-pct te-count" data-group="populations" data-sub="" data-idx="${e._i}">${pct}</span>
            <button class="te-remove" onclick="removeHexEntry(${e._i})">×</button>
        </div>`;
    }).join('');

    const popSection = `<div class="te-section">
        <div class="te-section-head">
            <h3>Populations <span class="te-count">${pops.length} · ∑${popTotal}</span></h3>
            <button class="te-add-btn" onclick="addHexEntry('populations')">+ Add</button>
        </div>
        <div class="te-col-header" style="display:flex;gap:6px;margin-bottom:2px;font-size:10px;color:#444;padding:0 2px">
            <span style="flex:1">Name</span>
            <span style="flex:0 0 54px;text-align:center">Tier</span>
            <span style="flex:0 0 54px;text-align:center">Wt</span>
            <span style="flex:0 0 40px;text-align:right">%</span>
            <span style="width:28px"></span>
        </div>
        <div class="te-rows">${popRows || `<p style="color:#555;font-size:12px">Empty</p>`}</div>
    </div>`;

    // Power Levels (pl + weight)
    const pls      = byGroup('powerLevels');
    const plTotal  = hexGroupTotal('powerLevels', null);
    const plRows   = pls.map(e => {
        const pct = hexPct(Number(e.weight) || 0, plTotal);
        return `<div class="te-row">
            <input class="te-row-input te-input--xs" type="number" min="1" value="${e.pl ?? 1}"
                onchange="updateHexField(${e._i},'pl',parseInt(this.value)||1)" oninput="markUnsaved()">
            <input class="te-row-input te-input--xs" type="number" min="0" value="${e.weight ?? 1}"
                onchange="updateHexField(${e._i},'weight',parseInt(this.value)||0)" oninput="markUnsaved()">
            <span class="hex-pct te-count" data-group="powerLevels" data-sub="" data-idx="${e._i}">${pct}</span>
            <button class="te-remove" onclick="removeHexEntry(${e._i})">×</button>
        </div>`;
    }).join('');

    const plSection = `<div class="te-section">
        <div class="te-section-head">
            <h3>Power Levels <span class="te-count">${pls.length} · ∑${plTotal}</span></h3>
            <button class="te-add-btn" onclick="addHexEntry('powerLevels')">+ Add</button>
        </div>
        <div class="te-col-header" style="display:flex;gap:6px;margin-bottom:2px;font-size:10px;color:#444;padding:0 2px">
            <span style="flex:0 0 54px;text-align:center">PL</span>
            <span style="flex:0 0 54px;text-align:center">Wt</span>
            <span style="flex:0 0 40px;text-align:right">%</span>
            <span style="width:28px"></span>
        </div>
        <div class="te-rows">${plRows || `<p style="color:#555;font-size:12px">Empty</p>`}</div>
    </div>`;

    // Travel Connectors (plain strings)
    const connectors = byGroup('travelConnectors');
    const connRows   = connectors.map(e => `
        <div class="te-row">
            <input class="te-row-input" value="${escAttr(e.value || '')}"
                onchange="updateHexField(${e._i},'value',this.value)" oninput="markUnsaved()"
                placeholder="travel description…">
            <button class="te-remove" onclick="removeHexEntry(${e._i})">×</button>
        </div>`).join('');

    const connSection = `<div class="te-section">
        <div class="te-section-head">
            <h3>Travel Connectors <span class="te-count">${connectors.length}</span></h3>
            <button class="te-add-btn" onclick="addHexEntry('travelConnectors')">+ Add</button>
        </div>
        <div class="te-rows te-rows--wide">${connRows || `<p style="color:#555;font-size:12px">Empty</p>`}</div>
    </div>`;

    return `<div class="te-editor" style="
        --te-accent:#c87830;--te-chip-bg:#1e1406;--te-border:#40301a;
        --te-text:#e8a050;--te-input-bg:#120e06;--te-chip-focus:rgba(200,120,48,.1);
        --te-btn-bg-a:#2a1c08;--te-btn-bg-b:#1a1004;--te-btn-border:#40301a;--te-glow:rgba(200,120,48,.35);">
        ${simpleSections}
        ${envSection}
        ${popSection}
        ${plSection}
        ${connSection}
    </div>`;
}

// ── Register ──────────────────────────────────────────────────────────────────

registerEditor('hexgen', {
    groupKey: () => '_group',

    entryTitle: e => e.name || e.value || (e.pl != null ? `PL ${e.pl}` : '(unnamed)'),

    entryRow: (entry) => {
        const name = entry.name || entry.value || (entry.pl != null ? `PL ${entry.pl}` : '(unnamed)');
        const w    = entry.weight;
        if (w === undefined) return { name, meta: '', badges: [] };
        const group = entry._group || '';
        const sub   = entry._subgroup || null;
        const total = hexGroupTotal(group, sub);
        const pct   = total > 0 ? ((w / total) * 100).toFixed(1) : '0.0';
        const extras = [sub, entry.tier !== undefined ? `T${entry.tier}` : null].filter(Boolean).join(' · ');
        return { name, meta: `wt ${w} · ${pct}%${extras ? ' · ' + extras : ''}`, badges: [] };
    },

    headerActions: () =>
        `<span style="font-size:11px;color:#c87830;opacity:.7">Editing all ${state.data.length} entries</span>`,

    render: () => renderHexgenTable(),

    newEntry: (group) => {
        switch (group) {
            case 'travelConnectors': return { _group: group, value: '' };
            case 'environments':    return { _group: group, _subgroup: 'all', name: '', weight: 1 };
            case 'populations':     return { _group: group, name: '', tier: 0, weight: 1 };
            case 'powerLevels':     return { _group: group, pl: 1, weight: 1 };
            default:                return { _group: group, name: '', weight: 1 };
        }
    },
});
