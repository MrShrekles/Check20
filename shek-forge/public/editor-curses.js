// ── CURSE / DISEASE EDITOR (curses.json) ──────────────────────────────────────

// ── DUPLICATE ─────────────────────────────────────────────────────────────────
function duplicateCurse(idx) {
    const original = state.data[idx];
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.name = (original.name || 'Curse') + ' (Copy)';
    state.data.splice(idx + 1, 0, copy);
    state.filteredData = getVisibleData();
    state.currentIndex = idx + 1;
    renderGroupSelector(); renderEntryList(); renderEditor(); markUnsaved(); updateStatus();
    showToast(`Duplicated "${original.name || 'entry'}"`, 'success');
}

// ── DOMAIN VALUES ─────────────────────────────────────────────────────────────
const CRS_TYPE = ['curse', 'disease'];
const CRS_SECTION_TYPE = ['numbered', 'list', 'table'];
function crsSourceOptions() {
    return [...new Set(state.data.map(e => e.source).filter(Boolean))].sort();
}

// ── SECTION / STEP / REWARD MUTATIONS ─────────────────────────────────────────
function crsAddSection(idx) {
    if (!Array.isArray(state.data[idx].sections)) state.data[idx].sections = [];
    state.data[idx].sections.push({ label: '', type: 'numbered', steps: [] });
    markUnsaved();
    renderEditor();
}
function crsRemoveSection(idx, si) {
    state.data[idx].sections.splice(si, 1);
    markUnsaved();
    renderEditor();
}
function crsAddStep(idx, si) {
    state.data[idx].sections[si].steps.push({ name: '', desc: '' });
    markUnsaved();
    renderEditor();
}
function crsRemoveStep(idx, si, sti) {
    state.data[idx].sections[si].steps.splice(sti, 1);
    markUnsaved();
    renderEditor();
}
function crsToggleReward(idx, si) {
    const sec = state.data[idx].sections[si];
    if (sec.reward) delete sec.reward;
    else sec.reward = { name: '', desc: '' };
    markUnsaved();
    renderEditor();
}

// ── SECTION RENDER ─────────────────────────────────────────────────────────────
function renderCurseSection(idx, sec, si) {
    const steps = (sec.steps || []).map((st, sti) => `
        <div class="extra-feature">
            <div class="extra-feature-header">
                <input class="field-input" style="font-weight:600;" type="text" placeholder="Step name"
                    value="${escAttr(st.name || '')}"
                    onchange="updateField(${idx},'sections.${si}.steps.${sti}.name',this.value)" oninput="markUnsaved()">
                <button class="extra-feature-delete" onclick="crsRemoveStep(${idx},${si},${sti})">✕</button>
            </div>
            <div class="extra-feature-body">
                <div class="field-grid">
                    <div class="field-wrap">
                        <label class="field-label">Action</label>
                        <input class="field-input" type="text" placeholder="e.g. Action, Off-Action, Reaction"
                            value="${escAttr(st.action || '')}"
                            onchange="updateField(${idx},'sections.${si}.steps.${sti}.action',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Note</label>
                        <input class="field-input" type="text"
                            value="${escAttr(st.note || '')}"
                            onchange="updateField(${idx},'sections.${si}.steps.${sti}.note',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap full">
                        <label class="field-label">Description</label>
                        <textarea class="field-input" rows="2"
                            onchange="updateField(${idx},'sections.${si}.steps.${sti}.desc',this.value)"
                            oninput="markUnsaved()">${escHtml(st.desc || '')}</textarea>
                    </div>
                </div>
            </div>
        </div>`).join('');

    const reward = sec.reward ? `
        <div class="forge-section" style="margin-top:8px;">
            <div class="section-header section-header-split">
                <span>Reward</span>
                <button class="btn-section-add" onclick="crsToggleReward(${idx},${si})">✕ Remove Reward</button>
            </div>
            <div class="section-body">
                <div class="field-grid">
                    <div class="field-wrap full">
                        <label class="field-label">Reward Name</label>
                        <input class="field-input" type="text" value="${escAttr(sec.reward.name || '')}"
                            onchange="updateField(${idx},'sections.${si}.reward.name',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap full">
                        <label class="field-label">Reward Description</label>
                        <textarea class="field-input" rows="2"
                            onchange="updateField(${idx},'sections.${si}.reward.desc',this.value)"
                            oninput="markUnsaved()">${escHtml(sec.reward.desc || '')}</textarea>
                    </div>
                </div>
            </div>
        </div>` : `<button class="btn-section-add" style="margin-top:8px;" onclick="crsToggleReward(${idx},${si})">+ Add Reward</button>`;

    return `<div class="forge-section" style="border-color:var(--te-border,var(--border));">
        <div class="section-header section-header-split">
            <span>Section ${si + 1}</span>
            <button class="extra-feature-delete" onclick="crsRemoveSection(${idx},${si})" title="Remove section">✕</button>
        </div>
        <div class="section-body">
            <div class="field-grid">
                <div class="field-wrap">
                    <label class="field-label">Label</label>
                    <input class="field-input" type="text" value="${escAttr(sec.label || '')}"
                        onchange="updateField(${idx},'sections.${si}.label',this.value)" oninput="markUnsaved()">
                </div>
                <div class="field-wrap">
                    <label class="field-label">Type</label>
                    <select class="field-input" onchange="updateField(${idx},'sections.${si}.type',this.value)">
                        ${buildSelect(CRS_SECTION_TYPE, sec.type)}
                    </select>
                </div>
                <div class="field-wrap full">
                    <label class="field-label">Intro <span style="opacity:0.4;font-size:8px;">(optional)</span></label>
                    <textarea class="field-input" rows="2"
                        onchange="updateField(${idx},'sections.${si}.intro',this.value)"
                        oninput="markUnsaved()">${escHtml(sec.intro || '')}</textarea>
                </div>
            </div>
            ${reward}
            <div class="section-header-split" style="margin-top:10px;">
                <span style="font-size:10px;opacity:0.6;">Steps <span style="opacity:0.6;">[${(sec.steps || []).length}]</span></span>
                <button class="btn-section-add" onclick="crsAddStep(${idx},${si})">+ Add Step</button>
            </div>
            <div class="extra-features-list">
                ${steps || '<div class="extra-features-empty">No steps yet</div>'}
            </div>
        </div>
    </div>`;
}

// ── CURSE FORM ────────────────────────────────────────────────────────────────
function renderCurseForm(e, idx) {
    const srcOpts = crsSourceOptions();
    const sections = (e.sections || []).map((sec, si) => renderCurseSection(idx, sec, si)).join('');
    return `
        <div class="forge-section">
            <div class="section-header">Name</div>
            <div class="section-body">
                <input class="field-input field-input-name" type="text"
                    value="${escAttr(e.name || '')}" onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Identity</div>
            <div class="section-body">
                <div class="field-grid">
                    <datalist id="crs-src-opts-${idx}">${srcOpts.map(s => `<option value="${escAttr(s)}">`).join('')}</datalist>
                    <div class="field-wrap">
                        <label class="field-label">Subtitle</label>
                        <input class="field-input" type="text" value="${escAttr(e.subtitle || '')}"
                            onchange="updateField(${idx},'subtitle',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Type</label>
                        <select class="field-input" onchange="updateField(${idx},'type',this.value);refreshGroups()">
                            ${buildSelect(CRS_TYPE, e.type)}
                        </select>
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Source</label>
                        <input class="field-input" type="text" list="crs-src-opts-${idx}"
                            value="${escAttr(e.source || '')}" onchange="updateField(${idx},'source',this.value)" oninput="markUnsaved()">
                    </div>
                    <div class="field-wrap">
                        <label class="field-label">Color</label>
                        <input class="field-input mono" type="text" placeholder="#rrggbb"
                            value="${escAttr(e.color || '')}" onchange="updateField(${idx},'color',this.value)" oninput="markUnsaved()">
                    </div>
                </div>
            </div>
        </div>
        <div class="forge-section">
            <div class="section-header">Description</div>
            <div class="section-body">
                <textarea class="field-input" rows="4"
                    onchange="updateField(${idx},'desc',this.value)"
                    oninput="markUnsaved()">${escHtml(e.desc || '')}</textarea>
            </div>
        </div>
        ${e.type === 'disease' ? `
        <div class="forge-section">
            <div class="section-header">Infection <span style="opacity:0.4;font-size:8px;">(optional)</span></div>
            <div class="section-body">
                <textarea class="field-input" rows="2"
                    onchange="updateField(${idx},'infection',this.value)"
                    oninput="markUnsaved()">${escHtml(e.infection || '')}</textarea>
            </div>
        </div>` : ''}
        <div class="section-header-split" style="margin:10px 4px 4px;">
            <span>Sections <span style="opacity:0.4;font-size:9px;">[${(e.sections || []).length}]</span></span>
            <button class="btn-section-add" onclick="crsAddSection(${idx})">+ Add Section</button>
        </div>
        ${sections || '<div class="extra-features-empty">No progression sections yet</div>'}`;
}

// ── CURSE TABLE ───────────────────────────────────────────────────────────────
const CRS_COLS = [
    { label: '#',        key: null,      style: 'width:28px' },
    { label: 'Name',     key: 'name' },
    { label: 'Subtitle', key: 'subtitle' },
    { label: 'Type',     key: 'type',    style: 'width:80px' },
    { label: 'Source',   key: 'source',  style: 'width:90px' },
    { label: 'Sections', key: null,      style: 'width:64px' },
    { label: '',         key: null,      style: 'width:56px' },
];

function renderCurseTable() {
    const type = 'curse';
    const sorted = tmSortedRows(type, state.filteredData, []);
    const srcOpts = crsSourceOptions();

    const rows = sorted.map((e, rowNum) => {
        const idx = state.data.indexOf(e);
        return `
        <tr data-idx="${idx}">
            <td class="gt-row-num">${rowNum + 1}</td>
            <td><input class="gt-input gt-input-name" type="text" value="${escAttr(e.name || '')}"
                onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()"></td>
            <td><input class="gt-input" type="text" value="${escAttr(e.subtitle || '')}"
                onchange="updateField(${idx},'subtitle',this.value)" oninput="markUnsaved()" style="min-width:140px"></td>
            <td><select class="gt-input" onchange="updateField(${idx},'type',this.value);refreshGroups()">
                ${buildSelect(CRS_TYPE, e.type)}</select></td>
            <td><input class="gt-input" type="text" list="crs-src-opts" value="${escAttr(e.source || '')}"
                onchange="updateField(${idx},'source',this.value)" oninput="markUnsaved()" style="min-width:90px"></td>
            <td class="gt-row-num">${(e.sections || []).length}</td>
            <td>
                <div class="gt-actions">
                    <button class="gt-btn gt-btn-edit" onclick="tmEditForm('${type}',${idx})" title="Edit full progression">✎</button>
                    <button class="gt-btn gt-btn-del" onclick="tmDeleteRow('${type}',${idx})" title="Delete">✕</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    const count = state.filteredData.length;
    const groupLabel = state.currentGroup === 'All' ? 'all types' : state.currentGroup;
    document.getElementById('fieldEditor').innerHTML = `
        <div class="gear-table-wrap">
            <div class="gear-table-topbar">
                <div>
                    <div class="entry-title">⊞ Table — ${escHtml(state.currentFile || 'Curses')}</div>
                    <div class="entry-subtitle">${count} entries · ${escHtml(groupLabel)} · ✎ to edit description &amp; progression</div>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="tmToggle('${type}')">← Form View</button>
                    <button class="btn btn-green" onclick="curseTableNewRow()">+ Add Row</button>
                    <button class="btn btn-gold" onclick="saveFile()">Save All</button>
                </div>
            </div>
            <datalist id="crs-src-opts">${srcOpts.map(s => `<option value="${escAttr(s)}">`).join('')}</datalist>
            <div class="gear-table-scroll">
                <table class="gear-table">
                    <thead><tr>${tmThHtml(type, CRS_COLS)}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
}

function curseTableNewRow() {
    const editor = EDITORS.curse;
    const group = state.currentGroup !== 'All' ? state.currentGroup : '';
    const entry = editor.newEntry(group);
    state.data.push(entry);
    state.filteredData = getVisibleData();
    renderEntryList();
    renderGroupSelector();
    renderCurseTable();
    markUnsaved();
    updateStatus();
    setTimeout(() => {
        const newIdx = state.data.length - 1;
        const row = document.querySelector(`.gear-table tbody tr[data-idx="${newIdx}"]`);
        if (row) {
            const inp = row.querySelector('.gt-input-name');
            if (inp) { row.scrollIntoView({ block: 'center' }); inp.focus(); inp.select(); }
        }
    }, 30);
}

// ── SHARED ENTRY ROW HELPER ────────────────────────────────────────────────────
function curseEntryRow(entry) {
    return {
        name: entry.name || '(unnamed)',
        meta: entry.subtitle || entry.source || '',
        badges: [
            entry.type ? { label: entry.type, color: entry.color || '#8020a0' } : null,
            entry.source ? { label: entry.source, color: '#7a7a7a' } : null,
        ].filter(Boolean),
    };
}

// ── REGISTER: CURSE ────────────────────────────────────────────────────────────
registerEditor('curse', {
    groupKey:   () => 'type',
    entryTitle: (entry) => entry.name || '(unnamed)',
    entryRow:   curseEntryRow,
    headerActions: (entry, idx) => `<button class="btn btn-ghost" onclick="duplicateCurse(${idx})" title="Duplicate this entry">⧉ Duplicate</button>`,
    newEntry: (group) => ({
        name: '', subtitle: '', type: group || 'curse', source: '', color: '#5020a0',
        desc: '', sections: [],
    }),
    render: (entry, idx) => renderCurseForm(entry, idx),
    onLoad() {
        tmRegister('curse', renderCurseTable);
        tmOnLoad('curse');
    },
});
