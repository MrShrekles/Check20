// ── WORLDBUILDING TABLE EDITOR ────────────────────────────────────────────────
// worldbuilding.json flattens to { _group, _subgroup?, value } entries

function updateWBEntry(idx, value) { teSetField(idx, 'value', value); }

function removeWBEntry(idx) { teRemoveEntry(idx); }

// ── Per-section sort-by-value (persisted, independent per section) ─────────
const WB_SORT_KEY = 'wbSectionSort_v1';
function wbGetSortState() {
    try { return JSON.parse(localStorage.getItem(WB_SORT_KEY)) || {}; } catch (e) { return {}; }
}
function wbSectionKey(group, sub) { return sub ? `${group}:${sub}` : group; }
function wbToggleSort(group, sub) {
    const s = wbGetSortState();
    const k = wbSectionKey(group, sub);
    s[k] = !s[k];
    localStorage.setItem(WB_SORT_KEY, JSON.stringify(s));
    renderEditor();
}
function wbMaybeSort(entries, group, sub) {
    if (!wbGetSortState()[wbSectionKey(group, sub)]) return entries;
    return [...entries].sort((a, b) =>
        String(a.value || '').localeCompare(String(b.value || ''), undefined, { numeric: true, sensitivity: 'base' }));
}
function wbSortBtn(group, sub) {
    const on = !!wbGetSortState()[wbSectionKey(group, sub)];
    return `<button class="te-add-btn te-sort-btn${on ? ' active' : ''}"
        onclick="wbToggleSort('${group}'${sub ? `,'${sub}'` : ''})" title="Sort this section A-Z">⇅ A-Z</button>`;
}

function addWBEntry(group, subgroup) {
    const entry = { _group: group, value: '' };
    if (subgroup) entry._subgroup = subgroup;
    const sel = subgroup
        ? `.te-chip-input[data-group="${group}"][data-sub="${subgroup}"]`
        : `.te-chip-input[data-group="${group}"], .te-row-input[data-group="${group}"]`;
    teAddEntry(entry, sel);
}

function renderWBTable() {
    // Sections with their display config
    const SECTIONS = [
        { group:'names',          label:'Names',             long:false, nameStyles: true },
        { group:'affinities',     label:'Affinities',        long:false, scroll:true },
        { group:'habitats',       label:'Habitats',          long:false, scroll:true },
        { group:'gods',           label:'Gods',              long:false, scroll:true },
        { group:'signatureItems', label:'Signature Items',   long:false, scroll:true },
        { group:'motivations',    label:'Motivations',       long:true  },
        { group:'people',         label:'People',            long:false },
        { group:'locations',      label:'Locations',         long:false },
        { group:'objects',        label:'Objects',           long:false },
        { group:'conflicts',      label:'Conflicts',         long:false },
        { group:'questionTemplates', label:'Question Templates', long:true },
    ];

    // Name style → display label + ordered sub-keys
    const NAME_STYLES = [
        { key: 'fantasy',  label: 'Fantasy (syllable)',  subs: ['fantasy-start', 'fantasy-core', 'fantasy-end'] },
        { key: 'twenties', label: '1920s',               subs: ['twenties-first', 'twenties-last'] },
        { key: 'victorian',label: 'Victorian',           subs: ['victorian-first', 'victorian-last'] },
        { key: 'goblin',   label: 'Goblin',              subs: ['goblin-prefix', 'goblin-suffix'] },
    ];

    const html = SECTIONS.map(({ group, label, long, nameStyles, scroll }) => {
        if (nameStyles) {
            const styleBlocks = NAME_STYLES.map(({ label: styleLabel, subs }) => {
                const subBlocks = subs.map(sg => {
                    const entries = wbMaybeSort(state.data.map((e, i) => ({ ...e, _i: i }))
                        .filter(e => e._group === group && e._subgroup === sg), group, sg);
                    const subLabel = sg.split('-').slice(1).join('-');
                    const chips = entries.map(e => `
                        <div class="te-chip">
                            <input class="te-chip-input" data-group="${group}" data-sub="${sg}"
                                value="${escAttr(e.value)}"
                                onchange="updateWBEntry(${e._i},this.value)" oninput="markUnsaved()"
                                placeholder="…">
                            <button class="te-remove" onclick="removeWBEntry(${e._i})">×</button>
                        </div>`).join('');
                    return `
                        <div class="te-cat">
                            <div class="te-cat-label" style="display:flex;justify-content:space-between;align-items:center">
                                <span>${subLabel} (${entries.length})</span>
                                ${wbSortBtn(group, sg)}
                            </div>
                            <div class="te-chips">
                                ${chips}
                                <button class="te-add-chip" onclick="addWBEntry('${group}','${sg}')">+ add</button>
                            </div>
                        </div>`;
                }).join('');
                return `
                    <div class="te-sub-section">
                        <div class="te-sub-section-head">${styleLabel}</div>
                        ${subBlocks}
                    </div>`;
            }).join('');

            return `
                <div class="te-section">
                    <div class="te-section-head"><h3>${label}</h3></div>
                    ${styleBlocks}
                </div>`;
        }

        const entries = wbMaybeSort(state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e._group === group), group);

        const items = entries.map(e => long
            ? `<div class="te-row">
                    <input class="te-row-input" data-group="${group}" value="${escAttr(e.value)}"
                        onchange="updateWBEntry(${e._i},this.value)" oninput="markUnsaved()" placeholder="…">
                    <button class="te-remove" onclick="removeWBEntry(${e._i})">×</button>
               </div>`
            : `<div class="te-chip">
                    <input class="te-chip-input" data-group="${group}" value="${escAttr(e.value)}"
                        onchange="updateWBEntry(${e._i},this.value)" oninput="markUnsaved()" placeholder="…">
                    <button class="te-remove" onclick="removeWBEntry(${e._i})">×</button>
               </div>`
        ).join('');

        return `
            <div class="te-section">
                <div class="te-section-head">
                    <h3>${label} <span class="te-count">${entries.length}</span></h3>
                    <div style="display:flex;gap:6px">
                        ${wbSortBtn(group)}
                        <button class="te-add-btn" onclick="addWBEntry('${group}')">+ Add</button>
                    </div>
                </div>
                <div class="te-${long ? 'rows te-rows--wide' : 'chips'}${scroll ? ' te-chips--scroll' : ''}">
                    ${items || `<p class="empty-state">No entries yet</p>`}
                </div>
            </div>`;
    }).join('');

    return `<div class="te-editor" style="--te-accent:#33aaaa;--te-chip-bg:#061414;--te-border:#1a4a4a;
        --te-text:#55dddd;--te-input-bg:#040e0e;--te-chip-focus:rgba(51,170,170,.1);
        --te-btn-bg-a:#0a2222;--te-btn-bg-b:#061414;--te-btn-border:#1a4a4a;--te-glow:rgba(51,170,170,.35);">
        ${html}
    </div>`;
}

registerEditor('worldbuilding', {
    groupKey: (data) => {
        const hasSubgroup = data.some(e => e._subgroup);
        return hasSubgroup ? '_subgroup' : '_group';
    },
    entryTitle: (e) => e.value || '(empty)',
    entryRow: (e) => ({
        name: e.value || '(empty)',
        meta: e._subgroup || '',
        badges: [{ label: e._group, color: '#33aaaa' }],
    }),
    newEntry: (group) => ({ _group: group || 'affinities', value: '' }),
    qcCount: (data) => qcCountBlankEntries(data),
    render: () => renderWBTable(),
    headerActions: () => `<span style="font-size:11px;color:#33aaaa;opacity:.7">Editing all ${state.data.length} entries</span>`,
});
