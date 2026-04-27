// editor-hexgen.js — table editor for hexgen.json (weighted random tables)

const HEX_ENV_SUBS = ['desert', 'mountain', 'city', 'all'];

// ── WEIGHT HELPERS ────────────────────────────────────────────────────────────
function hexGroupTotal(group, subgroup) {
    return state.data
        .filter(e => e._group === group && (group !== 'environments' || e._subgroup === subgroup))
        .reduce((s, e) => s + (e.weight || 0), 0);
}

// Live-update the weight bar without a full re-render
function hexUpdateWeightDisplay(idx) {
    const entry = state.data[idx];
    if (!entry) return;
    const total = hexGroupTotal(entry._group, entry._subgroup);
    const w = entry.weight || 0;
    const pct = total > 0 ? ((w / total) * 100).toFixed(1) : '0.0';
    const fill  = document.querySelector('.hex-weight-fill');
    const pctEl = document.querySelector('.hex-weight-pct');
    const totEl = document.querySelector('.hex-weight-total');
    if (fill)  fill.style.width  = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (totEl) totEl.textContent = `${w} / ${total} in table`;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderHexgenEntry(entry, idx) {
    const group = entry._group || '';

    // ── Travel Connectors (plain strings) ────────────────────────────────────
    if (group === 'travelConnectors') {
        return `<div class="forge-section">
            <div class="section-header">Travel Connector</div>
            <div class="section-body">
                <div class="field-wrap full">
                    <label class="field-label">Text</label>
                    <input class="field-input" type="text" value="${escAttr(entry.value || '')}"
                        onchange="updateField(${idx},'value',this.value)" oninput="markUnsaved()">
                </div>
            </div>
        </div>`;
    }

    // ── Weight section (shared) ───────────────────────────────────────────────
    const sub   = entry._subgroup || null;
    const total = hexGroupTotal(group, sub);
    const w     = entry.weight || 0;
    const pct   = total > 0 ? ((w / total) * 100).toFixed(1) : '0.0';

    const weightSection = `<div class="forge-section">
        <div class="section-header">Weight</div>
        <div class="section-body">
            <div class="field-grid">
                <div class="field-wrap">
                    <label class="field-label">Weight</label>
                    <input class="field-input mono" type="number" min="0" value="${w}"
                        onchange="updateField(${idx},'weight',parseInt(this.value)||0);hexUpdateWeightDisplay(${idx})"
                        oninput="markUnsaved()">
                </div>
                <div class="field-wrap">
                    <label class="field-label">Roll Chance</label>
                    <div class="hex-weight-bar-wrap">
                        <div class="hex-weight-fill" style="width:${pct}%"></div>
                        <span class="hex-weight-pct">${pct}%</span>
                    </div>
                </div>
            </div>
            <div class="hex-weight-total">${w} / ${total} in table</div>
        </div>
    </div>`;

    // ── Environments (has subgroup) ───────────────────────────────────────────
    if (group === 'environments') {
        const subOpts = HEX_ENV_SUBS.map(s =>
            `<option value="${s}"${entry._subgroup === s ? ' selected' : ''}>${s}</option>`
        ).join('');
        return `<div class="forge-section">
            <div class="section-header">Environment Entry</div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap full">
                        <label class="field-label">Name</label>
                        <input class="field-input" type="text" value="${escAttr(entry.name || '')}"
                            onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Sub-terrain</label>
                        <select class="field-input"
                            onchange="updateField(${idx},'_subgroup',this.value)">
                            ${subOpts}
                        </select>
                    </div>
                </div>
            </div>
        </div>${weightSection}`;
    }

    // ── Populations (has tier) ────────────────────────────────────────────────
    if (group === 'populations') {
        return `<div class="forge-section">
            <div class="section-header">Population Entry</div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap full">
                        <label class="field-label">Name</label>
                        <input class="field-input" type="text" value="${escAttr(entry.name || '')}"
                            onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Tier (0–10)</label>
                        <input class="field-input mono" type="number" min="0" max="10" value="${entry.tier ?? 0}"
                            onchange="updateField(${idx},'tier',parseInt(this.value)||0)" oninput="markUnsaved()">
                    </div>
                </div>
            </div>
        </div>${weightSection}`;
    }

    // ── Power Levels (has numeric value) ─────────────────────────────────────
    if (group === 'powerLevels') {
        return `<div class="forge-section">
            <div class="section-header">Power Level Entry</div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap full">
                        <label class="field-label">Label</label>
                        <input class="field-input" type="text" value="${escAttr(entry.name || '')}"
                            onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">PL Value</label>
                        <input class="field-input mono" type="number" min="1" value="${entry.value ?? 1}"
                            onchange="updateField(${idx},'value',parseInt(this.value)||1)" oninput="markUnsaved()">
                    </div>
                </div>
            </div>
        </div>${weightSection}`;
    }

    // ── Default (lords, enemies, temperaments, features, foods, resources) ────
    const label = group.charAt(0).toUpperCase() + group.slice(1);
    return `<div class="forge-section">
        <div class="section-header">${escHtml(label)} Entry</div>
        <div class="section-body">
            <div class="field-wrap full">
                <label class="field-label">Name</label>
                <input class="field-input" type="text" value="${escAttr(entry.name || '')}"
                    onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
            </div>
        </div>
    </div>${weightSection}`;
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('hexgen', {
    groupKey: () => '_group',

    entryTitle: entry => entry.name || entry.value || '(unnamed)',

    entryRow: (entry) => {
        const name = entry.name || entry.value || '(unnamed)';
        const w    = entry.weight;
        if (w === undefined) return { name, meta: '', badges: [] };

        const group = entry._group || '';
        const sub   = entry._subgroup || null;
        const total = hexGroupTotal(group, sub);
        const pct   = total > 0 ? ((w / total) * 100).toFixed(1) : '0.0';

        const extras = [
            sub,
            entry.tier  !== undefined ? `T${entry.tier}`  : null,
            entry._group === 'powerLevels' && entry.value !== undefined
                ? `PL${entry.value}` : null,
        ].filter(Boolean).join(' · ');

        return {
            name,
            meta: `wt ${w} · ${pct}%${extras ? ' · ' + extras : ''}`,
            badges: [],
        };
    },

    headerActions: (entry) => {
        const group = entry._group || '';
        const sub   = entry._subgroup || null;
        const total = hexGroupTotal(group, sub);
        return `<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--text-muted);
                    padding:4px 10px;border:1px solid var(--border);border-radius:2px;align-self:center;">
                    ∑ ${total}
                </div>`;
    },

    render: renderHexgenEntry,

    newEntry: (group) => {
        switch (group) {
            case 'travelConnectors': return { _group: group, value: '' };
            case 'environments':    return { _group: group, _subgroup: 'desert', name: '', weight: 1 };
            case 'populations':     return { _group: group, name: '', weight: 1, tier: 0 };
            case 'powerLevels':     return { _group: group, name: 'PL ', weight: 1, value: 1 };
            default:                return { _group: group, name: '', weight: 1 };
        }
    },
});
