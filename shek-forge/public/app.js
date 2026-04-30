// ── EDITOR REGISTRY ───────────────────────────────────────────────────────────
// Each editor-*.js calls registerEditor() to plug in.
// The shell never needs to change — only editors register/update.
const EDITORS = {};

function registerEditor(type, impl) {
    EDITORS[type] = impl;
    console.log(`[Forge] Editor registered: ${type}`);
}

// ── STATE ─────────────────────────────────────────────────────────────────────
const state = {
    files: [], currentFile: null, data: [], filteredData: [],
    currentIndex: -1, groups: [], currentGroup: 'All',
    fileType: 'generic',   // 'monster' | 'weapon' | 'armor' | 'generic'
    unsaved: false, autoUpdateEnabled: true,
    currentFileModified: null, autoIntervalId: null, folderPath: '',
    weapons: { melee: [], ranged: [] }   // for monster weapon autocomplete
};
let dialogCallback = null;

// ── TYPE CONFIG ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    monster: { icon: '☠', label: 'Monsters', bodyClass: 'type-monster', badgeClass: 'badge-monster', dotClass: 'dot-monster' },
    weapon:  { icon: '⚔', label: 'Weapons',  bodyClass: 'type-weapon',  badgeClass: 'badge-weapon',  dotClass: 'dot-weapon'  },
    armor:   { icon: '🛡', label: 'Armor',    bodyClass: 'type-armor',   badgeClass: 'badge-armor',   dotClass: 'dot-armor'   },
    hexgen:  { icon: '⬡', label: 'Tables',   bodyClass: 'type-hexgen',  badgeClass: 'badge-hexgen',  dotClass: 'dot-hexgen'  },
    class:   { icon: '⚑', label: 'Paths',    bodyClass: 'type-class',   badgeClass: 'badge-class',   dotClass: 'dot-class'   },
    spell:   { icon: '✦', label: 'Spells',   bodyClass: 'type-spell',   badgeClass: 'badge-spell',   dotClass: 'dot-spell'   },
    generic: { icon: '◈', label: 'Entries',  bodyClass: '',             badgeClass: 'badge-generic', dotClass: 'dot-generic' },
};
function tc() { return TYPE_CONFIG[state.fileType] || TYPE_CONFIG.generic; }

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
    await Promise.all([loadFileList(), loadWeapons()]);
    if (state.autoUpdateEnabled) startAutoUpdate();
}

// ── WEAPONS (for monster autocomplete) ────────────────────────────────────────
async function loadWeapons() {
    try {
        const res = await fetch('/api/weapons');
        const json = await res.json();
        const all = json.weapons || [];
        state.weapons.melee  = all.filter(w => w.category === 'melee');
        state.weapons.ranged = all.filter(w => w.category === 'ranged' || w.category === 'firearm');
    } catch (e) {}
}

// ── FILE LIST ─────────────────────────────────────────────────────────────────
async function loadFileList() {
    try {
        const res = await fetch('/api/files');
        const json = await res.json();
        if (json.error) { showToast(json.error, 'error'); return; }
        state.files = json.files;
        state.folderPath = json.folder;
        renderFileList();
        updateTitle();
    } catch (e) { showToast('Cannot connect to server', 'error'); }
}

function renderFileList() {
    const el = document.getElementById('fileList');
    if (!state.files.length) { el.innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="empty-sub">No JSON files found</div></div>`; return; }
    el.innerHTML = state.files.map(f => {
        const cfg = TYPE_CONFIG[f.fileType] || TYPE_CONFIG.generic;
        return `
        <div class="file-item ${f.name === state.currentFile ? 'active' : ''}" onclick="openFile('${f.name}')">
            <div class="file-type-dot ${cfg.dotClass}" title="${f.fileType}"></div>
            <div class="file-name">${f.name}</div>
            <div class="file-count">${f.entryCount}</div>
        </div>`;
    }).join('');
    const parts = state.folderPath.replace(/\\/g, '/').split('/');
    document.getElementById('folderName').textContent = parts[parts.length - 1] || state.folderPath;
    document.getElementById('titlePath').innerHTML = state.folderPath;
}

// ── AUTO UPDATE ───────────────────────────────────────────────────────────────
function toggleAutoUpdate() {
    state.autoUpdateEnabled = !state.autoUpdateEnabled;
    updateAutoButton();
    if (state.autoUpdateEnabled) startAutoUpdate(); else stopAutoUpdate();
}
function updateAutoButton() {
    const btn = document.getElementById('btnAuto');
    if (!btn) return;
    if (state.autoUpdateEnabled) { btn.classList.replace('btn-ghost','btn-gold'); btn.textContent = 'Auto: ON'; }
    else { btn.classList.replace('btn-gold','btn-ghost'); btn.textContent = 'Auto: OFF'; }
}
function startAutoUpdate() { stopAutoUpdate(); state.autoIntervalId = setInterval(autoUpdateTick, 10000); updateAutoButton(); }
function stopAutoUpdate() { if (state.autoIntervalId) clearInterval(state.autoIntervalId); state.autoIntervalId = null; updateAutoButton(); }
async function autoUpdateTick() {
    try {
        const res = await fetch('/api/files');
        const json = await res.json();
        if (json.error) return;
        const prev = JSON.stringify(state.files.map(f => ({ name: f.name, size: f.size, modified: f.modified })));
        const next = JSON.stringify(json.files.map(f => ({ name: f.name, size: f.size, modified: f.modified })));
        if (prev !== next) { state.files = json.files; renderFileList(); }
        if (state.currentFile) {
            const info = state.files.find(f => f.name === state.currentFile);
            const newMod = info ? Date.parse(info.modified) : null;
            const oldMod = state.currentFileModified ? Date.parse(state.currentFileModified) : null;
            if (newMod && oldMod && newMod > oldMod) {
                if (!state.unsaved) { showToast(`${state.currentFile} changed — reloading`, 'info'); await openFile(state.currentFile); }
                else showToast(`${state.currentFile} changed on disk (unsaved edits)`, 'error');
            }
        }
    } catch (e) {}
}

// ── OPEN FILE (core routing happens here) ─────────────────────────────────────
async function openFile(filename) {
    if (state.unsaved) { const ok = await confirm2(`Discard unsaved changes to ${state.currentFile}?`, 'Discard', 'btn-danger'); if (!ok) return; }
    try {
        const res = await fetch(`/api/file/${encodeURIComponent(filename)}`);
        const json = await res.json();
        if (json.error) { showToast(json.error, 'error'); return; }

        state.currentFile = filename;
        state.data = Array.isArray(json.data) ? json.data : Object.values(json.data);
        state.fileType = json.fileType || 'generic';

        // Ask the active editor for its group key, fall back to defaults
        const editor = EDITORS[state.fileType];
        const gk = editor?.groupKey?.(state.data) || (json.groups ? '_group' : null);
        if (gk) {
            const groupSet = new Set(state.data.map(e => e[gk]).filter(Boolean));
            state.groups = [...groupSet].sort();
        } else if (json.groups) {
            state.groups = json.groups;
        } else {
            state.groups = [];
        }

        state.currentGroup = 'All';
        state.filteredData = [...state.data];
        state.currentIndex = -1;
        state.unsaved = false;
        const info = state.files.find(f => f.name === filename);
        state.currentFileModified = info ? info.modified : null;

        // Let the editor refresh any autocomplete/datalist data
        editor?.onLoad?.(state.data);

        // Apply type theme
        applyTypeTheme(state.fileType);

        renderFileList();
        renderGroupSelector();
        renderEntryList();
        renderEmptyEditor();
        updateToolbar();
        updateTitle();
        document.getElementById('searchInput').value = '';
    } catch (e) { showToast('Failed to load file', 'error'); }
}

function applyTypeTheme(type) {
    document.body.className = TYPE_CONFIG[type]?.bodyClass || '';
    const badge = document.getElementById('fileTypeBadge');
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.generic;
    badge.textContent = type;
    badge.className = `file-type-badge visible ${cfg.badgeClass}`;
    document.getElementById('entryPanelLabel').textContent = cfg.label;
}

// ── ENTRY LIST ────────────────────────────────────────────────────────────────
function getGroupKey() {
    const editor = EDITORS[state.fileType];
    return editor?.groupKey?.(state.data) || '_group';
}

function getVisibleData(data = state.data) {
    if (!state.groups.length || state.currentGroup === 'All') return [...data];
    const gk = getGroupKey();
    return data.filter(e => e[gk] === state.currentGroup);
}

function filterEntries() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    state.filteredData = getVisibleData().filter(e => !q || JSON.stringify(e).toLowerCase().includes(q));
    renderEntryList();
}

function setGroup(group) {
    state.currentGroup = group || 'All';
    const q = document.getElementById('searchInput').value.toLowerCase();
    state.filteredData = getVisibleData().filter(e => !q || JSON.stringify(e).toLowerCase().includes(q));
    renderGroupSelector(); renderEntryList();
}

function renderGroupSelector() {
    const el = document.getElementById('groupSelect');
    if (!el || !state.groups.length) { if (el) el.innerHTML = ''; return; }
    const gk = getGroupKey();
    el.innerHTML = ['All', ...state.groups].map(g => {
        const count = g === 'All' ? state.data.length : state.data.filter(e => e[gk] === g).length;
        return `
        <button type="button" class="group-tab ${state.currentGroup === g ? 'active' : ''}" data-group="${escAttr(g)}">
            ${escHtml(g)} <span style="font-size:8px;opacity:0.6;">${count}</span>
        </button>`;
    }).join('');
    el.querySelectorAll('button[data-group]').forEach(btn => btn.addEventListener('click', () => setGroup(btn.dataset.group)));
}

function renderEntryList() {
    const el = document.getElementById('entryList');
    if (!state.filteredData.length) {
        el.innerHTML = `<div class="empty-state" style="padding:20px;"><div class="empty-sub">No entries</div></div>`;
        return;
    }
    const editor = EDITORS[state.fileType];
    const gk = getGroupKey();

    const makeRow = entry => {
        const realIndex = state.data.indexOf(entry);
        const isActive = realIndex === state.currentIndex;
        // Ask editor for row display; fall back to generic
        if (editor?.entryRow) {
            const { name, meta, badges } = editor.entryRow(entry, state.currentGroup === 'All');
            const badgeHtml = (badges || []).map(b => `<span class="entry-badge" style="color:${b.color};border-color:${b.color};">${escHtml(b.label)}</span>`).join('');
            return `
                <div class="entry-row ${isActive ? 'active' : ''}" onclick="selectEntry(${realIndex})">
                    <div class="entry-row-name">${escHtml(name)}</div>
                    ${meta ? `<div class="entry-row-meta">${escHtml(meta)}</div>` : ''}
                    ${badgeHtml ? `<div class="entry-row-badges">${badgeHtml}</div>` : ''}
                </div>`;
        }
        // Generic fallback
        const name = entry.name || entry.id || entry.title || Object.values(entry)[0] || '(unnamed)';
        const group = entry[gk];
        return `
            <div class="entry-row ${isActive ? 'active' : ''}" onclick="selectEntry(${realIndex})">
                <div class="entry-row-name">${escHtml(String(name))}${state.currentGroup === 'All' && group ? `<span style="font-family:Share Tech Mono,monospace;font-size:9px;color:var(--text-muted);margin-left:4px;">${escHtml(group)}</span>` : ''}</div>
            </div>`;
    };

    if (state.groups.length && state.currentGroup === 'All') {
        const grouped = {};
        state.filteredData.forEach(e => { const g = e[gk] || '(none)'; if (!grouped[g]) grouped[g] = []; grouped[g].push(e); });
        el.innerHTML = Object.entries(grouped).map(([g, entries]) => `
            <div class="entry-group">
                <div class="entry-group-title">${escHtml(g)}<span>${entries.length}</span></div>
                ${entries.map(makeRow).join('')}
            </div>`).join('');
        return;
    }
    el.innerHTML = state.filteredData.map(makeRow).join('');
}

// ── EDITOR ROUTING ─────────────────────────────────────────────────────────────
function selectEntry(index) {
    state.currentIndex = index;
    renderEntryList();
    renderEditor();
    updateStatus();
}

function renderEmptyEditor() {
    const cfg = tc();
    document.getElementById('fieldEditor').innerHTML = `
        <div class="empty-state" style="flex:1;">
            <div class="empty-glyph" style="font-size:48px;">${cfg.icon}</div>
            <div class="empty-text">${escHtml(state.currentFile || 'Forge')}</div>
            <div class="empty-sub">Select an entry to begin editing</div>
        </div>`;
}

function renderEditor() {
    const entry = state.data[state.currentIndex];
    if (!entry) return renderEmptyEditor();
    const editor = EDITORS[state.fileType];
    if (!editor) return renderEditorStub();

    const innerHtml = editor.render(entry, state.currentIndex);
    document.getElementById('fieldEditor').innerHTML = `
        <div class="field-editor-header">
            <div>
                <div class="entry-title">${escHtml(editor.entryTitle?.(entry) || entry.name || '(unnamed)')}</div>
                <div class="entry-subtitle">${escHtml(state.currentFile)} · entry ${state.currentIndex + 1} of ${state.data.length}</div>
            </div>
            <div class="header-actions">
                ${editor.headerActions?.(entry, state.currentIndex) || ''}
                <button class="btn btn-danger" onclick="deleteEntry(${state.currentIndex})">✕ Delete</button>
                <button class="btn btn-gold" onclick="saveFile()">Save All</button>
            </div>
        </div>
        <div class="fields-scroll">${innerHtml}</div>`;
}

function renderEditorStub() {
    document.getElementById('fieldEditor').innerHTML = `
        <div class="empty-state" style="flex:1;">
            <div class="empty-glyph">⚙</div>
            <div class="empty-text">Editor Loading</div>
            <div class="empty-sub">${state.fileType} editor module not yet connected</div>
        </div>`;
}

// ── SAVE / RELOAD / EXPORT ────────────────────────────────────────────────────
function saveFile() {
    if (!state.currentFile) return showToast('No file open', 'error');
    fetch(`/api/file/${encodeURIComponent(state.currentFile)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: state.data })
    }).then(r => r.json()).then(json => {
        if (json.error) return showToast(json.error, 'error');
        state.unsaved = false; updateTitle(); showToast(`Saved ${state.currentFile}`, 'success'); loadFileList();
    }).catch(() => showToast('Failed to save', 'error'));
}
async function reloadFile() {
    if (!state.currentFile) return;
    if (state.unsaved) { const ok = await confirm2(`Discard unsaved changes?`, 'Discard', 'btn-danger'); if (!ok) return; }
    openFile(state.currentFile);
}
function exportFile() { if (!state.currentFile) return; window.open(`/api/export/${encodeURIComponent(state.currentFile)}`, '_blank'); }

// ── NEW / DELETE ──────────────────────────────────────────────────────────────
function newEntry() {
    if (!state.currentFile) return showToast('Open a file first', 'error');
    const editor = EDITORS[state.fileType];
    const group = state.currentGroup !== 'All' ? state.currentGroup : (state.groups[0] || '');
    const entry = editor?.newEntry?.(group) || { name: '' };
    state.data.push(entry);
    state.filteredData = getVisibleData();
    state.currentIndex = state.data.length - 1;
    renderFileList(); renderGroupSelector(); renderEntryList(); renderEditor(); markUnsaved(); updateStatus();
}
async function deleteEntry(index) {
    if (index < 0 || index >= state.data.length) return;
    const entry = state.data[index];
    const name = entry.name || entry.id || 'this entry';
    const ok = await confirm2(`Delete "${name}"?`, 'Delete', 'btn-danger');
    if (!ok) return;
    state.data.splice(index, 1);
    state.currentIndex = Math.min(state.currentIndex, state.data.length - 1);
    state.filteredData = getVisibleData();
    renderEntryList();
    if (state.currentIndex >= 0 && state.data[state.currentIndex]) renderEditor(); else renderEmptyEditor();
    updateStatus(); markUnsaved();
}

// ── FOLDER / BACKUPS ──────────────────────────────────────────────────────────
function changeFolder() {
    const folder = prompt('Enter the data folder path:', state.folderPath || '');
    if (!folder) return;
    fetch('/api/folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder }) })
        .then(r => r.json()).then(json => { if (json.error) return showToast(json.error, 'error'); state.folderPath = json.folder; showToast('Folder updated', 'success'); loadFileList(); })
        .catch(() => showToast('Failed to change folder', 'error'));
}
async function openBackups() {
    if (!state.currentFile) return showToast('Open a file first', 'error');
    try {
        const res = await fetch(`/api/backups/${encodeURIComponent(state.currentFile)}`);
        const json = await res.json();
        if (json.error) { showToast(json.error, 'error'); return; }
        showBackupsModal(json.backups || []);
    } catch (e) { showToast('Failed to fetch backups', 'error'); }
}
function showBackupsModal(backups) {
    const overlay = document.createElement('div'); overlay.className = 'dialog-overlay'; overlay.style.zIndex = 110;
    const box = document.createElement('div'); box.className = 'dialog-box'; box.style.maxWidth = '500px';
    const title = document.createElement('div'); title.className = 'dialog-title'; title.textContent = `Backups — ${state.currentFile}`;
    const content = document.createElement('div'); content.className = 'dialog-text';
    if (!backups.length) { content.textContent = 'No backups available.'; }
    else {
        const list = document.createElement('div'); list.style.cssText = 'max-height:300px;overflow:auto;';
        for (const b of backups) {
            const row = document.createElement('div'); row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);';
            const left = document.createElement('div'); left.style.cssText = 'font-family:Share Tech Mono,monospace;font-size:11px;color:#aaa;'; left.textContent = `${b.name} — ${new Date(b.modified).toLocaleString()}`;
            const right = document.createElement('div'); right.style.display = 'flex'; right.style.gap = '6px';
            const dl = document.createElement('a'); dl.className = 'btn btn-ghost'; dl.href = `/api/backups/download/${encodeURIComponent(state.currentFile)}/${encodeURIComponent(b.name)}`; dl.textContent = 'Download'; dl.onclick = () => setTimeout(() => overlay.remove(), 100);
            const restoreBtn = document.createElement('button'); restoreBtn.className = 'btn btn-danger'; restoreBtn.textContent = 'Restore';
            restoreBtn.onclick = async () => { const ok = await confirm2(`Restore ${b.name}? This overwrites the current file.`, 'Restore', 'btn-danger'); if (!ok) return; await restoreBackup(b.name); overlay.remove(); };
            right.appendChild(dl); right.appendChild(restoreBtn); row.appendChild(left); row.appendChild(right); list.appendChild(row);
        }
        content.appendChild(list);
    }
    const actions = document.createElement('div'); actions.className = 'dialog-actions';
    const closeBtn = document.createElement('button'); closeBtn.className = 'btn btn-ghost'; closeBtn.textContent = 'Close'; closeBtn.onclick = () => overlay.remove();
    actions.appendChild(closeBtn); box.appendChild(title); box.appendChild(content); box.appendChild(actions); overlay.appendChild(box); document.body.appendChild(overlay);
}
async function restoreBackup(backupName) {
    try {
        const res = await fetch('/api/backups/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: state.currentFile, backupName }) });
        const json = await res.json();
        if (json.error) { showToast(json.error, 'error'); return; }
        showToast(`Restored from ${backupName}`, 'success'); await openFile(state.currentFile);
    } catch (e) { showToast('Restore failed', 'error'); }
}

// ── SHARED FIELD MUTATIONS ─────────────────────────────────────────────────────
function updateField(entryIndex, key, value) {
    setNestedProperty(state.data[entryIndex], key, value);
    markUnsaved();
    if (key === 'name' || key === 'id' || key === 'title') {
        renderEntryList();
        const titleEl = document.querySelector('.entry-title');
        if (titleEl) titleEl.textContent = EDITORS[state.fileType]?.entryTitle?.(state.data[entryIndex]) || state.data[entryIndex][key] || '(unnamed)';
    }
}
function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) { if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {}; current = current[keys[i]]; }
    current[keys[keys.length - 1]] = value;
}
function getNestedProperty(obj, path) {
    return path.split('.').reduce((cur, key) => cur && typeof cur === 'object' ? cur[key] : undefined, obj);
}
function refreshGroups() {
    const gk = getGroupKey();
    state.groups = [...new Set(state.data.map(e => e[gk]).filter(Boolean))].sort();
    renderGroupSelector(); renderEntryList();
}

// ── UI HELPERS ─────────────────────────────────────────────────────────────────
function markUnsaved() { state.unsaved = true; updateTitle(); }
function updateTitle() {
    const dot = document.getElementById('statusDot'); const text = document.getElementById('statusText');
    if (state.unsaved) { dot.className = 'status-dot unsaved'; text.textContent = 'UNSAVED'; }
    else { dot.className = 'status-dot'; text.textContent = 'ALL SAVED'; }
    document.getElementById('titlePath').innerHTML = state.currentFile
        ? `${state.folderPath} / <span>${state.currentFile}</span>` : state.folderPath;
}
function updateToolbar() {
    const has = !!state.currentFile;
    ['btnReload','btnBackups','btnNew','btnSave','btnExport'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !has; });
    document.getElementById('toolbarTitle').textContent = has ? state.currentFile.replace('.json','') : '—';
    document.getElementById('toolbarCount').textContent = has ? `${state.data.length} ${tc().label.toLowerCase()}` : '';
}
function updateStatus() {
    const cfg = tc();
    document.getElementById('sbFile').innerHTML = `${cfg.icon} <span>${state.currentFile || '—'}</span>`;
    document.getElementById('sbEntry').innerHTML = state.currentIndex >= 0 ? `entry <span>${state.currentIndex + 1} / ${state.data.length}</span>` : '';
    document.getElementById('sbType').innerHTML = state.currentFile ? `<span>${state.fileType}</span>` : '';
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') { const c = document.getElementById('toastContainer'); const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = msg; c.appendChild(t); setTimeout(() => t.remove(), 2800); }

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function confirm2(text, confirmLabel = 'Confirm', btnClass = 'btn-danger') { return new Promise(resolve => { document.getElementById('dialogText').textContent = text; const btn = document.getElementById('dialogConfirmBtn'); btn.textContent = confirmLabel; btn.className = `btn ${btnClass}`; document.getElementById('dialogOverlay').classList.remove('hidden'); dialogCallback = resolve; }); }
function dialogConfirm() { document.getElementById('dialogOverlay').classList.add('hidden'); if (dialogCallback) dialogCallback(true); }
function dialogCancel()  { document.getElementById('dialogOverlay').classList.add('hidden'); if (dialogCallback) dialogCallback(false); }

// ── UTILS ─────────────────────────────────────────────────────────────────────
function escHtml(str) { return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(str) { return String(str ?? '').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function buildSelect(opts, val) { return opts.map(o => `<option value="${escAttr(o)}" ${o === (val ?? '') ? 'selected' : ''}>${escHtml(o) || '—'}</option>`).join(''); }

// ── KEYBOARD ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); reloadFile(); }
});

// ── SIDEBAR RESIZE ────────────────────────────────────────────────────────────
(function () {
    const divider = document.getElementById('sidebarDivider');
    const topPanel = document.querySelector('.sidebar-panel-files');
    const sidebar  = document.querySelector('.sidebar');
    if (!divider || !topPanel || !sidebar) return;
    let dragging = false, startY = 0, startH = 0;
    divider.addEventListener('mousedown', e => { dragging = true; startY = e.clientY; startH = topPanel.getBoundingClientRect().height; divider.classList.add('dragging'); document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (!dragging) return; const sH = sidebar.getBoundingClientRect().height; topPanel.style.flex = `0 0 ${Math.max(80, Math.min(sH - 80, startH + (e.clientY - startY)))}px`; });
    document.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; divider.classList.remove('dragging'); document.body.style.cursor = ''; document.body.style.userSelect = ''; });
})();

// ── START ─────────────────────────────────────────────────────────────────────
init();
