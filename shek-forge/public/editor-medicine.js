// ── MEDICINE TABLE EDITOR ─────────────────────────────────────────────────────

function updateMedField(idx, field, value) { teSetField(idx, field, value); }

function removeMedEntry(idx) { teRemoveEntry(idx); }

function addMedEntry(category) {
    const entry = category === 'effects'
        ? { category, name: '', value: '' }
        : { category, value: '' };
    teAddEntry(entry, `.te-chip-input[data-cat="${category}"], .te-row-input[data-cat="${category}"]`);
}

function renderMedicineTable() {
    const SECTIONS = [
        { cat: 'prefix',         label: 'Prefixes',           long: false },
        { cat: 'base',           label: 'Base Names',         long: false },
        { cat: 'suffix',         label: 'Suffixes',           long: false },
        { cat: 'flavor',         label: 'Flavors',            long: false },
        { cat: 'maker',          label: 'Makers',             long: false },
        { cat: 'place',          label: 'Places',             long: false },
        { cat: 'symbol',         label: 'Symbols',            long: false },
        { cat: 'folk',           label: 'Folk Groups',        long: false },
        { cat: 'effects',        label: 'Effects',            long: true, hasName: true },
        { cat: 'desc_templates', label: 'Description Templates', long: true },
    ];

    const html = SECTIONS.map(({ cat, label, long, hasName }) => {
        const entries = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.category === cat);

        let items;
        if (hasName) {
            // Effects: two-field rows (name + description)
            items = entries.map(e => `
                <div class="te-row">
                    <input class="te-row-input te-input--sm" data-cat="${cat}" value="${escAttr(e.name || '')}"
                        onchange="updateMedField(${e._i},'name',this.value)" oninput="markUnsaved()"
                        placeholder="Effect name…">
                    <input class="te-row-input te-input--wide" value="${escAttr(e.value || '')}"
                        onchange="updateMedField(${e._i},'value',this.value)" oninput="markUnsaved()"
                        placeholder="Description - use [[wound:P]], {maker} etc.">
                    <button class="te-remove" onclick="removeMedEntry(${e._i})">×</button>
                </div>`).join('');
        } else if (long) {
            // Desc templates: full-width rows
            items = entries.map(e => `
                <div class="te-row">
                    <input class="te-row-input" data-cat="${cat}" value="${escAttr(e.value || '')}"
                        onchange="updateMedField(${e._i},'value',this.value)" oninput="markUnsaved()"
                        placeholder="Template - use {flavor}, {maker}, {place}…">
                    <button class="te-remove" onclick="removeMedEntry(${e._i})">×</button>
                </div>`).join('');
        } else {
            // Chips
            items = entries.map(e => `
                <div class="te-chip">
                    <input class="te-chip-input" data-cat="${cat}" value="${escAttr(e.value || '')}"
                        onchange="updateMedField(${e._i},'value',this.value)" oninput="markUnsaved()"
                        placeholder="…">
                    <button class="te-remove" onclick="removeMedEntry(${e._i})">×</button>
                </div>`).join('');
        }

        const containerClass = long ? 'te-rows te-rows--wide' : 'te-chips';

        return `
            <div class="te-section">
                <div class="te-section-head">
                    <h3>${label} <span class="te-count">${entries.length}</span></h3>
                    <button class="te-add-btn" onclick="addMedEntry('${cat}')">+ Add</button>
                </div>
                <div class="${containerClass}">
                    ${items || `<p class="empty-state">No ${label.toLowerCase()} yet</p>`}
                </div>
            </div>`;
    }).join('');

    return `<div class="te-editor" style="
        --te-accent:#44bb88;--te-chip-bg:#051a10;--te-border:#184830;
        --te-text:#66ddaa;--te-input-bg:#030e08;--te-chip-focus:rgba(68,187,136,.1);
        --te-btn-bg-a:#0a2a18;--te-btn-bg-b:#051a10;--te-btn-border:#184830;--te-glow:rgba(68,187,136,.35);">
        ${html}
    </div>`;
}

registerEditor('medicine', {
    groupKey: () => 'category',
    entryTitle: (e) => e.name || e.value || '(empty)',
    entryRow: (e) => ({
        name:   e.name || e.value || '(empty)',
        meta:   e.name ? e.value.slice(0, 40) : '',
        badges: [{ label: e.category, color: '#44bb88' }],
    }),
    newEntry: (group) => group === 'effects'
        ? { category: group || 'prefix', name: '', value: '' }
        : { category: group || 'prefix', value: '' },
    qcCount: (data) => qcCountBlankEntries(data),
    render: () => renderMedicineTable(),
    headerActions: () => `<span style="font-size:11px;color:#44bb88;opacity:.7">Editing all ${state.data.length} entries</span>`,
});
