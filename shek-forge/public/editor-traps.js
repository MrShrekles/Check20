// ── TRAPS TABLE EDITOR ────────────────────────────────────────────────────────

function updateTrapField(idx, field, value) {
    if (state.data[idx]) state.data[idx][field] = value;
    markUnsaved();
}

function removeTrapEntry(idx) {
    state.data.splice(idx, 1);
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
}

function addTrapEntry(type) {
    const templates = {
        door: { type: 'door', text: '' },
        lock: { type: 'lock', name: '', key: '', hint: '' },
        trap: { type: 'trap', name: '', dmg: '', effect: '' },
    };
    state.data.push(templates[type] || { type, text: '' });
    state.filteredData = getVisibleData();
    renderEntryList(); renderEditor(); markUnsaved();
    setTimeout(() => {
        const inputs = document.querySelectorAll(`.te-chip-input[data-type="${type}"], .te-row-input[data-type="${type}"]`);
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
}

function renderTrapsTable() {
    const doors = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.type === 'door');
    const locks = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.type === 'lock');
    const traps = state.data.map((e, i) => ({ ...e, _i: i })).filter(e => e.type === 'trap');

    const doorChips = doors.map(e => `
        <div class="te-chip">
            <input class="te-chip-input" data-type="door" value="${escAttr(e.text)}"
                onchange="updateTrapField(${e._i},'text',this.value)" oninput="markUnsaved()" placeholder="door state…">
            <button class="te-remove" onclick="removeTrapEntry(${e._i})">×</button>
        </div>`).join('');

    const lockRows = locks.map(e => `
        <div class="te-row">
            <input class="te-row-input te-input--sm" data-type="lock" value="${escAttr(e.name)}"
                onchange="updateTrapField(${e._i},'name',this.value)" oninput="markUnsaved()" placeholder="Name">
            <input class="te-row-input te-input--sm" value="${escAttr(e.key)}"
                onchange="updateTrapField(${e._i},'key',this.value)" oninput="markUnsaved()" placeholder="Key type">
            <input class="te-row-input te-input--wide" value="${escAttr(e.hint)}"
                onchange="updateTrapField(${e._i},'hint',this.value)" oninput="markUnsaved()" placeholder="How to open / bypass…">
            <button class="te-remove" onclick="removeTrapEntry(${e._i})">×</button>
        </div>`).join('');

    const trapRows = traps.map(e => `
        <div class="te-row">
            <input class="te-row-input te-input--sm" data-type="trap" value="${escAttr(e.name)}"
                onchange="updateTrapField(${e._i},'name',this.value)" oninput="markUnsaved()" placeholder="Name">
            <input class="te-row-input te-input--sm" value="${escAttr(e.dmg)}"
                onchange="updateTrapField(${e._i},'dmg',this.value)" oninput="markUnsaved()" placeholder="Damage type">
            <input class="te-row-input te-input--wide" value="${escAttr(e.effect)}"
                onchange="updateTrapField(${e._i},'effect',this.value)" oninput="markUnsaved()" placeholder="Effect - use {dmg} and {range}">
            <button class="te-remove" onclick="removeTrapEntry(${e._i})">×</button>
        </div>`).join('');

    const colHints = `<div style="display:flex;gap:6px;margin-bottom:4px;font-size:10px;color:#555;padding:0 2px">
        <span style="flex:0 0 110px">Name</span>
        <span style="flex:0 0 110px">Dmg / Key</span>
        <span style="flex:1">Effect / Hint</span>
        <span style="width:28px"></span>
    </div>`;

    return `<div class="te-editor" style="--te-accent:#cc3333;--te-chip-bg:#200606;--te-border:#5a1a1a;
        --te-text:#ff8888;--te-input-bg:#120404;--te-chip-focus:rgba(204,51,51,.1);
        --te-btn-bg-a:#2e0a0a;--te-btn-bg-b:#1a0606;--te-btn-border:#5a1a1a;--te-glow:rgba(204,51,51,.35);">

        <div class="te-section">
            <div class="te-section-head">
                <h3>Door States <span class="te-count">${doors.length}</span></h3>
                <button class="te-add-btn" onclick="addTrapEntry('door')">+ Add</button>
            </div>
            <div class="te-chips">
                ${doorChips || `<p style="color:#555;font-size:12px">No door states yet</p>`}
                ${doors.length ? `<button class="te-add-chip" onclick="addTrapEntry('door')">+ door state</button>` : ''}
            </div>
        </div>

        <div class="te-section">
            <div class="te-section-head">
                <h3>Lock Types <span class="te-count">${locks.length}</span></h3>
                <button class="te-add-btn" onclick="addTrapEntry('lock')">+ Add Lock</button>
            </div>
            ${colHints.replace('Dmg / Key','Key').replace('Effect / Hint','Hint')}
            <div class="te-rows">
                ${lockRows || `<p style="color:#555;font-size:12px">No lock types yet</p>`}
            </div>
        </div>

        <div class="te-section">
            <div class="te-section-head">
                <h3>Trap Types <span class="te-count">${traps.length}</span></h3>
                <button class="te-add-btn" onclick="addTrapEntry('trap')">+ Add Trap</button>
            </div>
            ${colHints}
            <div class="te-rows">
                ${trapRows || `<p style="color:#555;font-size:12px">No trap types yet</p>`}
            </div>
        </div>

    </div>`;
}

registerEditor('traps', {
    groupKey: () => 'type',
    entryTitle: (e) => e.name || e.text || '(empty)',
    entryRow: (e) => ({
        name: e.name || e.text || '(empty)',
        meta: e.dmg || e.key || '',
        badges: [{ label: e.type, color: '#cc3333' }],
    }),
    newEntry: (group) => {
        const t = group || 'door';
        if (t === 'lock') return { type: 'lock', name: '', key: '', hint: '' };
        if (t === 'trap') return { type: 'trap', name: '', dmg: '', effect: '' };
        return { type: 'door', text: '' };
    },
    render: () => renderTrapsTable(),
    headerActions: () => `<span style="font-size:11px;color:#cc3333;opacity:.7">Editing all ${state.data.length} entries</span>`,
});
