// editor-generic.js — dynamic field editor for any JSON structure

// ── ARRAY HELPERS (called from inline onclick handlers) ───────────────────────
function genericRemoveArrayItem(idx, path, ti) {
    const arr = getNestedProperty(state.data[idx], path);
    if (!Array.isArray(arr)) return;
    arr.splice(ti, 1);
    markUnsaved();
    renderEditor();
}

function genericAddArrayItem(idx, path) {
    const arr = getNestedProperty(state.data[idx], path);
    if (!Array.isArray(arr)) return;
    const sample = arr.find(i => i !== null && i !== undefined);
    if (typeof sample === 'object' && !Array.isArray(sample)) {
        const blank = {};
        Object.keys(sample).forEach(k => { blank[k] = typeof sample[k] === 'number' ? 0 : ''; });
        arr.push(blank);
    } else {
        arr.push('');
    }
    markUnsaved();
    renderEditor();
}

function genericAddField(idx) {
    const key = prompt('New field name:');
    if (!key?.trim()) return;
    const k = key.trim();
    if (Object.prototype.hasOwnProperty.call(state.data[idx], k)) {
        showToast('Field already exists', 'error');
        return;
    }
    state.data[idx][k] = '';
    markUnsaved();
    renderEditor();
}

function genericRemoveField(idx, key) {
    delete state.data[idx][key];
    markUnsaved();
    renderEditor();
}

// ── SCALAR FIELD ──────────────────────────────────────────────────────────────
function genericScalar(key, val, idx, path) {
    const label = key.replace(/^_/, '').replace(/_/g, ' ');
    const p = escAttr(path);

    // _group gets a select pre-filled from existing groups
    if (path === '_group') {
        const groups = [...new Set(state.data.map(e => e._group).filter(Boolean))].sort();
        const opts = ['', ...groups].map(g =>
            `<option value="${escAttr(g)}"${val === g ? ' selected' : ''}>${escHtml(g) || '— none —'}</option>`
        ).join('');
        const extraOpt = val && !groups.includes(val)
            ? `<option value="${escAttr(val)}" selected>${escHtml(val)}</option>` : '';
        return `<div class="field-wrap">
            <label class="field-label">Group</label>
            <select class="field-input" onchange="updateField(${idx},'_group',this.value);refreshGroups()">
                ${opts}${extraOpt}
            </select>
        </div>`;
    }

    if (typeof val === 'boolean') {
        return `<div class="field-wrap">
            <label class="field-label">${escHtml(label)}</label>
            <select class="field-input" onchange="updateField(${idx},'${p}',this.value==='true')">
                <option value="true"${val ? ' selected' : ''}>true</option>
                <option value="false"${!val ? ' selected' : ''}>false</option>
            </select>
        </div>`;
    }

    if (typeof val === 'number') {
        return `<div class="field-wrap">
            <label class="field-label">${escHtml(label)}</label>
            <input class="field-input mono" type="number" value="${val}"
                onchange="updateField(${idx},'${p}',parseFloat(this.value)||0)" oninput="markUnsaved()">
        </div>`;
    }

    const str = val === null || val === undefined ? '' : String(val);
    const isLong = str.length > 80 || str.includes('\n');

    if (isLong) {
        return `<div class="field-wrap full">
            <label class="field-label">${escHtml(label)}</label>
            <textarea class="field-input" rows="3"
                onchange="updateField(${idx},'${p}',this.value)"
                oninput="markUnsaved()">${escHtml(str)}</textarea>
        </div>`;
    }

    return `<div class="field-wrap full">
        <label class="field-label">${escHtml(label)}</label>
        <input class="field-input" type="text" value="${escAttr(str)}"
            onchange="updateField(${idx},'${p}',this.value)" oninput="markUnsaved()">
    </div>`;
}

// ── ARRAY SECTION ─────────────────────────────────────────────────────────────
function genericArray(key, arr, idx) {
    const label = key.replace(/^_/, '').replace(/_/g, ' ');
    const isObjArr = arr.length > 0
        && typeof arr[0] === 'object' && arr[0] !== null && !Array.isArray(arr[0]);

    if (isObjArr) {
        const items = arr.map((item, ti) => {
            const preview = Object.values(item).find(v => typeof v === 'string' && v) || `Item ${ti + 1}`;
            const fields = Object.entries(item).map(([k, v]) => {
                const isNum  = typeof v === 'number';
                const isLong = typeof v === 'string' && (v.length > 60 || v.includes('\n'));
                const ip     = escAttr(`${key}.${ti}.${k}`);
                const fl     = k.replace(/_/g, ' ');
                if (isLong) {
                    return `<div class="field-wrap full">
                        <label class="field-label">${escHtml(fl)}</label>
                        <textarea class="field-input" rows="2"
                            onchange="updateField(${idx},'${ip}',this.value)"
                            oninput="markUnsaved()">${escHtml(String(v ?? ''))}</textarea>
                    </div>`;
                }
                const oc = isNum
                    ? `onchange="updateField(${idx},'${ip}',parseFloat(this.value)||0)"`
                    : `onchange="updateField(${idx},'${ip}',this.value)"`;
                return `<div class="field-wrap">
                    <label class="field-label">${escHtml(fl)}</label>
                    <input class="field-input${isNum ? ' mono' : ''}" type="${isNum ? 'number' : 'text'}"
                        value="${escAttr(String(v ?? ''))}" ${oc} oninput="markUnsaved()">
                </div>`;
            }).join('');
            return `<div class="extra-feature">
                <div class="extra-feature-header">
                    <div class="extra-feature-name" style="font-size:11px;color:var(--text-muted);">
                        ${escHtml(String(preview).slice(0, 48))}
                    </div>
                    <button class="extra-feature-delete"
                        onclick="genericRemoveArrayItem(${idx},'${key}',${ti})">✕</button>
                </div>
                <div class="extra-feature-body">
                    <div class="field-grid">${fields}</div>
                </div>
            </div>`;
        }).join('');

        return `<div class="forge-section">
            <div class="section-header section-header-split">
                <span>${escHtml(label)} <span style="opacity:0.4;font-size:9px;letter-spacing:0;">[${arr.length}]</span></span>
                <button class="btn-section-add" onclick="genericAddArrayItem(${idx},'${key}')">+ Add</button>
            </div>
            <div class="extra-features-list">
                ${items || '<div class="extra-features-empty">Empty</div>'}
            </div>
        </div>`;
    }

    // Primitive array — flat editable list
    const items = arr.map((item, ti) => {
        const ip = escAttr(`${key}.${ti}`);
        return `<div class="array-item">
            <input type="text"
                style="flex:1;background:transparent;border:none;outline:none;padding:0;color:var(--text-primary);font-family:'Share Tech Mono',monospace;font-size:12px;"
                value="${escAttr(String(item ?? ''))}"
                onchange="updateField(${idx},'${ip}',this.value)" oninput="markUnsaved()">
            <div class="array-item-delete"
                onclick="genericRemoveArrayItem(${idx},'${key}',${ti})">✕</div>
        </div>`;
    }).join('');

    return `<div class="forge-section">
        <div class="section-header">
            ${escHtml(label)} <span style="opacity:0.4;font-size:9px;letter-spacing:0;">[${arr.length}]</span>
        </div>
        <div class="array-field">
            ${items || '<div style="padding:8px 10px;font-size:11px;color:var(--text-muted);font-style:italic;">Empty</div>'}
            <div class="array-add" onclick="genericAddArrayItem(${idx},'${key}')">+ Add Item</div>
        </div>
    </div>`;
}

// ── OBJECT SECTION ────────────────────────────────────────────────────────────
function genericObject(key, obj, idx) {
    const label = key.replace(/^_/, '').replace(/_/g, ' ');
    const fields = Object.entries(obj).map(([k, v]) => {
        if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
            return `<div class="field-wrap full">
                <label class="field-label">${escHtml(k)}
                    <span style="opacity:0.4;font-size:8px;"> (nested)</span></label>
                <input class="field-input mono" type="text"
                    value="${escAttr(JSON.stringify(v))}" readonly style="opacity:0.45;cursor:default;">
            </div>`;
        }
        return genericScalar(k, v, idx, `${key}.${k}`);
    }).join('');

    return `<div class="forge-section">
        <div class="section-header">${escHtml(label)}</div>
        <div class="section-body">
            <div class="field-grid">
                ${fields || '<div style="opacity:0.4;font-size:11px;">Empty object</div>'}
            </div>
        </div>
    </div>`;
}

// ── MAIN RENDER ───────────────────────────────────────────────────────────────
function renderGenericEntry(entry, idx) {
    const simple   = [];
    const sections = [];

    for (const [key, val] of Object.entries(entry)) {
        if (Array.isArray(val)) {
            sections.push(genericArray(key, val, idx));
        } else if (val !== null && val !== undefined && typeof val === 'object') {
            sections.push(genericObject(key, val, idx));
        } else {
            simple.push([key, val]);
        }
    }

    let propsHtml = '';
    if (simple.length) {
        const short = simple.filter(([, v]) => !(typeof v === 'string' && (v.length > 80 || v.includes('\n'))));
        const long  = simple.filter(([, v]) =>   typeof v === 'string' && (v.length > 80 || v.includes('\n')));
        propsHtml = `<div class="forge-section">
            <div class="section-header">Properties</div>
            <div class="section-body">
                <div class="field-grid">
                    ${short.map(([k, v]) => genericScalar(k, v, idx, k)).join('')}
                </div>
                ${long.map(([k, v]) => `
                    <div class="field-grid" style="margin-top:8px;">
                        ${genericScalar(k, v, idx, k)}
                    </div>`).join('')}
            </div>
        </div>`;
    }

    return `${propsHtml}${sections.join('')}
        <div style="padding:8px 4px;border-top:1px solid var(--border);">
            <button class="btn btn-ghost" style="font-size:11px;"
                onclick="genericAddField(${idx})">+ Add Field</button>
        </div>`;
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
registerEditor('generic', {
    groupKey:   () => '_group',
    entryTitle: entry => entry.name || entry.id || entry.title
        || String(Object.values(entry)[0] || '(unnamed)'),
    entryRow: (entry) => {
        const name = entry.name || entry.id || entry.title
            || String(Object.values(entry)[0] || '(unnamed)');
        const meta = Object.entries(entry)
            .filter(([k, v]) => !['name','id','title','_group'].includes(k)
                && typeof v === 'string' && v.length > 0 && v.length < 30)
            .slice(0, 2).map(([, v]) => v).join(' · ');
        const badges = entry._group
            ? [{ label: entry._group, color: 'var(--type-generic)' }] : [];
        return { name, meta, badges };
    },
    render:   renderGenericEntry,
    newEntry: group => ({ name: '', _group: group || '' }),
    headerActions: () => '',
});
