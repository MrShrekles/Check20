// ── QUEST TABLE EDITOR ────────────────────────────────────────────────────────

function updateQuestText(idx, value) {
    if (state.data[idx]) state.data[idx].text = value;
    markUnsaved();
}

function removeQuestEntry(idx) {
    state.data.splice(idx, 1);
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
}

function addQuestEntry(type) {
    state.data.push({ type, text: '' });
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
    setTimeout(() => {
        const inputs = document.querySelectorAll(`.te-chip-input[data-type="${type}"], .te-row-input[data-type="${type}"]`);
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
}

function renderQuestTable() {
    const SECTIONS = [
        { type: 'giver',  label: 'Givers',  long: false },
        { type: 'target', label: 'Targets', long: false },
        { type: 'twist',  label: 'Twists',  long: true  },
        { type: 'reward', label: 'Rewards', long: false },
    ];

    const html = SECTIONS.map(({ type, label, long }) => {
        const entries = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.type === type);

        const items = entries.map(e => long
            ? `<div class="te-row">
                    <input class="te-row-input" data-type="${type}" value="${escAttr(e.text)}"
                        onchange="updateQuestText(${e._i},this.value)" oninput="markUnsaved()"
                        placeholder="twist text…">
                    <button class="te-remove" onclick="removeQuestEntry(${e._i})">×</button>
               </div>`
            : `<div class="te-chip">
                    <input class="te-chip-input" data-type="${type}" value="${escAttr(e.text)}"
                        onchange="updateQuestText(${e._i},this.value)" oninput="markUnsaved()"
                        placeholder="…">
                    <button class="te-remove" onclick="removeQuestEntry(${e._i})">×</button>
               </div>`
        ).join('');

        return `
            <div class="te-section">
                <div class="te-section-head">
                    <h3>${label} <span class="te-count">${entries.length}</span></h3>
                    <button class="te-add-btn" onclick="addQuestEntry('${type}')">+ Add</button>
                </div>
                <div class="te-${long ? 'rows te-rows--wide' : 'chips'}">
                    ${items || `<p style="color:#555;font-size:12px">No ${label.toLowerCase()} yet</p>`}
                </div>
            </div>`;
    }).join('');

    return `<div class="te-editor" style="--te-accent:#cc8822;--te-chip-bg:#1a1000;--te-border:#5a3500;
        --te-text:#ffbb44;--te-input-bg:#0f0800;--te-chip-focus:rgba(204,136,34,.1);
        --te-btn-bg-a:#2a1800;--te-btn-bg-b:#1a1000;--te-btn-border:#5a3500;--te-glow:rgba(204,136,34,.35);">
        ${html}
    </div>`;
}

registerEditor('quest', {
    groupKey: () => 'type',
    entryTitle: (e) => e.text || '(empty)',
    entryRow: (e) => ({
        name: e.text || '(empty)',
        meta: '',
        badges: [{ label: e.type, color: '#cc8822' }],
    }),
    newEntry: (group) => ({ type: group || 'giver', text: '' }),
    render: () => renderQuestTable(),
    headerActions: () => `<span style="font-size:11px;color:#cc8822;opacity:.7">Editing all ${state.data.length} entries</span>`,
});
