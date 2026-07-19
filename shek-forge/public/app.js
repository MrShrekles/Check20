// ── EDITOR REGISTRY ───────────────────────────────────────────────────────────
// Each editor-*.js calls registerEditor() to plug in.
// The shell never needs to change - only editors register/update.
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
    weapons: { melee: [], ranged: [] },  // for monster weapon autocomplete
    duplicates: new Map(), dupField: null  // index -> matched value, for duplicate name/id detection
};
let dialogCallback = null;

// ── TYPE CONFIG ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    monster: { icon: '☠', label: 'Monsters', bodyClass: 'type-monster', badgeClass: 'badge-monster', dotClass: 'dot-monster' },
    weapon: { icon: '⚔', label: 'Weapons', bodyClass: 'type-weapon', badgeClass: 'badge-weapon', dotClass: 'dot-weapon' },
    armor: { icon: '🛡', label: 'Armor', bodyClass: 'type-armor', badgeClass: 'badge-armor', dotClass: 'dot-armor' },
    hexgen: { icon: '⬡', label: 'Tables', bodyClass: 'type-hexgen', badgeClass: 'badge-hexgen', dotClass: 'dot-hexgen' },
    class: { icon: '⚑', label: 'Options', bodyClass: 'type-class', badgeClass: 'badge-class', dotClass: 'dot-class' },
    spell: { icon: '✦', label: 'Spells', bodyClass: 'type-spell', badgeClass: 'badge-spell', dotClass: 'dot-spell' },
    species: { icon: '❧', label: 'Species', bodyClass: 'type-species', badgeClass: 'badge-species', dotClass: 'dot-species' },
    enchanted: { icon: '✧', label: 'Enchanted', bodyClass: 'type-enchanted', badgeClass: 'badge-enchanted', dotClass: 'dot-enchanted' },
    medicine: { icon: '⚕', label: 'Medicine', bodyClass: 'type-medicine', badgeClass: 'badge-medicine', dotClass: 'dot-medicine' },
    quest: { icon: '⚔', label: 'Quests', bodyClass: 'type-quest', badgeClass: 'badge-quest', dotClass: 'dot-quest' },
    traps: { icon: '⚠', label: 'Traps', bodyClass: 'type-traps', badgeClass: 'badge-traps', dotClass: 'dot-traps' },
    worldbuilding: { icon: '🌐', label: 'Worldbuilding', bodyClass: 'type-worldbuilding', badgeClass: 'badge-worldbuilding', dotClass: 'dot-worldbuilding' },
    loot: { icon: '⬡', label: 'Loot', bodyClass: 'type-loot', badgeClass: 'badge-loot', dotClass: 'dot-loot' },
    generic: { icon: '◈', label: 'Entries', bodyClass: '', badgeClass: 'badge-generic', dotClass: 'dot-generic' },
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
        state.weapons.melee = all.filter(w => w.category === 'melee');
        state.weapons.ranged = all.filter(w => w.category === 'ranged' || w.category === 'firearm');
    } catch (e) { }
}

// ── FILE LIST ─────────────────────────────────────────────────────────────────
async function loadFileList() {
    try {
        const res = await fetch('/api/files');
        const json = await res.json();
        if (json.error) { showToast(json.error, 'error'); return; }
        state.files = json.files;
        state.folderPath = json.folder;
        // Keep currentFileModified in sync so autoUpdateTick doesn't mistake a save for an external edit
        if (state.currentFile) {
            const info = state.files.find(f => f.name === state.currentFile);
            if (info) state.currentFileModified = info.modified;
        }
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
            ${f.qcCount > 0 ? `<div class="file-qc-badge">⚠ ${f.qcCount}</div>` : ''}
            ${f.dupCount > 0 ? `<div class="file-qc-badge" style="color:#cc4488;background:rgba(200,40,140,.12);border-color:rgba(200,40,140,.3);" title="${f.dupCount} duplicate ${escHtml(f.dupField || 'name')}(s)">⧉ ${f.dupCount}</div>` : ''}
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
    if (state.autoUpdateEnabled) { btn.classList.replace('btn-ghost', 'btn-gold'); btn.textContent = 'Auto: ON'; }
    else { btn.classList.replace('btn-gold', 'btn-ghost'); btn.textContent = 'Auto: OFF'; }
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
                if (!state.unsaved) { showToast(`${state.currentFile} changed - reloading`, 'info'); await openFile(state.currentFile); }
                else showToast(`${state.currentFile} changed on disk (unsaved edits)`, 'error');
            }
        }
    } catch (e) { }
}

// ── DRAFT AUTOSAVE / CRASH RECOVERY ─────────────────────────────────────────
// Periodically stashes unsaved edits to localStorage so a crashed tab or an
// accidental close doesn't lose work between explicit saves.
const DRAFT_PREFIX = 'forge_draft_';
function draftKey(filename) { return DRAFT_PREFIX + filename; }
function stashDraft() {
    if (!state.currentFile || !state.unsaved) return;
    try { localStorage.setItem(draftKey(state.currentFile), JSON.stringify({ ts: Date.now(), data: state.data })); }
    catch (e) { }
}
function clearDraft(filename) {
    try { localStorage.removeItem(draftKey(filename)); } catch (e) { }
}
function takeDraft(filename, loadedData) {
    try {
        const raw = localStorage.getItem(draftKey(filename));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (JSON.stringify(parsed.data) === JSON.stringify(loadedData)) { clearDraft(filename); return null; }
        return parsed;
    } catch (e) { return null; }
}
setInterval(stashDraft, 15000);
window.addEventListener('beforeunload', e => {
    if (state.unsaved) {
        stashDraft();
        e.preventDefault();
        e.returnValue = '';
    }
});

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

        const draft = takeDraft(filename, state.data);
        if (draft) {
            const when = new Date(draft.ts).toLocaleTimeString();
            const restore = await confirm2(
                `Found an unsaved draft of ${filename} from ${when} (likely from a crashed tab or closed window). Restore it?`,
                'Restore Draft', 'btn-gold');
            if (restore) { state.data = draft.data; } else { clearDraft(filename); }
        }

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
        state.unsaved = !!(draft && state.data === draft.data);
        const info = state.files.find(f => f.name === filename);
        state.currentFileModified = info ? info.modified : null;
        resetUndo();

        // Reset type-specific toolbar buttons before letting the new editor show its own
        document.querySelectorAll('.toolbar-extra').forEach(el => el.style.display = 'none');

        // Let the editor refresh any autocomplete/datalist data
        editor?.onLoad?.(state.data);

        // Compute QC issue count + duplicates and store on the file record so the file list can show them
        computeQCCount();
        const fileRecord = state.files.find(f => f.name === filename);
        if (fileRecord) {
            fileRecord.dupCount = computeDuplicates();
            fileRecord.dupField = state.dupField;
        }

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
    computeDuplicates();
    computeQCCount();
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
        const dupBadge = state.duplicates.has(realIndex)
            ? `<span class="entry-badge" style="color:#cc4488;border-color:#cc4488;" title="Duplicate ${escAttr(state.dupField)}: ${escAttr(state.duplicates.get(realIndex))}">⧉ dup</span>` : '';
        // Ask editor for row display; fall back to generic
        if (editor?.entryRow) {
            const { name, meta, badges } = editor.entryRow(entry, state.currentGroup === 'All');
            const badgeHtml = (badges || []).map(b => `<span class="entry-badge" style="color:${b.color};border-color:${b.color};">${escHtml(b.label)}</span>`).join('') + dupBadge;
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
    editor.afterRender?.(entry, state.currentIndex);
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
        state.unsaved = false; clearDraft(state.currentFile); updateTitle(); showToast(`Saved ${state.currentFile}`, 'success'); loadFileList();
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
    const title = document.createElement('div'); title.className = 'dialog-title'; title.textContent = `Backups - ${state.currentFile}`;
    const content = document.createElement('div'); content.className = 'dialog-text';
    if (!backups.length) { content.textContent = 'No backups available.'; }
    else {
        const list = document.createElement('div'); list.style.cssText = 'max-height:300px;overflow:auto;';
        for (const b of backups) {
            const row = document.createElement('div'); row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);';
            const left = document.createElement('div'); left.style.cssText = 'font-family:Share Tech Mono,monospace;font-size:11px;color:#aaa;'; left.textContent = `${b.name} - ${new Date(b.modified).toLocaleString()}`;
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

// ── DUPLICATE NAME/ID DETECTION ─────────────────────────────────────────────
// Only checks fields that represent a real "identity" (name/id/term) - table
// editors whose entries are short generator fragments (value/text) are left
// alone since repeated fragments there are often intentional.
const DUP_KEY_FIELDS = ['name', 'id', 'term'];
// Pure version so the Alerts page can check duplicates in files that aren't
// currently open, without touching global state.
function findDuplicates(data) {
    const field = DUP_KEY_FIELDS.find(f => data.some(e => typeof e[f] === 'string' && e[f].trim()));
    const dups = new Map();
    if (field) {
        const seen = new Map();
        data.forEach((e, i) => {
            const v = (e[field] || '').trim().toLowerCase();
            if (!v) return;
            if (!seen.has(v)) seen.set(v, []);
            seen.get(v).push(i);
        });
        for (const [, idxs] of seen) if (idxs.length > 1) idxs.forEach(i => dups.set(i, data[i][field]));
    }
    return { field: field || null, dups };
}
function computeDuplicates() {
    const { field, dups } = findDuplicates(state.data);
    state.dupField = field;
    state.duplicates = dups;
    return dups.size;
}

// ── QC COUNT (kept fresh for the status bar + file list badge) ─────────────
function computeQCCount() {
    const editor = EDITORS[state.fileType];
    state.qcCount = editor?.qcCount ? editor.qcCount(state.data) : 0;
    const fileRecord = state.files.find(f => f.name === state.currentFile);
    if (fileRecord) fileRecord.qcCount = state.qcCount;
    return state.qcCount;
}

// ── UI HELPERS ─────────────────────────────────────────────────────────────────
function markUnsaved() { state.unsaved = true; updateTitle(); noteUndoChange(); }

// ── IN-SESSION UNDO / REDO ───────────────────────────────────────────────────
// markUnsaved() is called by virtually every mutation in the app (updateField,
// newEntry, deleteEntry, the teAddEntry/teRemoveEntry helpers, etc.), so it's
// the one choke point that already sees every edit - no need to instrument
// each mutation site individually. Snapshots are debounced so rapid typing
// collapses into one undo step instead of one per keystroke, and the
// JSON.stringify cost only runs once the user actually pauses.
let _undoStack = [], _redoStack = [];
let _undoFile = null, _undoBaseline = null, _undoTimer = null;
const UNDO_LIMIT = 50;
const UNDO_DEBOUNCE_MS = 700;

function resetUndo() {
    _undoStack = []; _redoStack = [];
    _undoFile = state.currentFile;
    _undoBaseline = JSON.stringify(state.data);
    clearTimeout(_undoTimer);
}
function noteUndoChange() {
    if (_undoFile !== state.currentFile) { resetUndo(); return; }
    clearTimeout(_undoTimer);
    _undoTimer = setTimeout(() => {
        const now = JSON.stringify(state.data);
        if (now !== _undoBaseline) {
            _undoStack.push(_undoBaseline);
            if (_undoStack.length > UNDO_LIMIT) _undoStack.shift();
            _undoBaseline = now;
            _redoStack = [];
        }
    }, UNDO_DEBOUNCE_MS);
}
function _applyUndoSnapshot(snapshot) {
    state.data = JSON.parse(snapshot);
    _undoBaseline = snapshot;
    state.filteredData = getVisibleData();
    state.currentIndex = Math.min(state.currentIndex, state.data.length - 1);
    renderEntryList();
    if (state.currentIndex >= 0 && state.data[state.currentIndex]) renderEditor(); else renderEmptyEditor();
    updateStatus();
    markUnsavedNoSnapshot();
}
function markUnsavedNoSnapshot() { state.unsaved = true; updateTitle(); }
function performUndo() {
    clearTimeout(_undoTimer);
    const now = JSON.stringify(state.data);
    if (now !== _undoBaseline) { _redoStack.push(now); _applyUndoSnapshot(_undoBaseline); showToast('Undone', 'info'); return; }
    if (!_undoStack.length) { showToast('Nothing to undo', 'info'); return; }
    _redoStack.push(_undoBaseline);
    _applyUndoSnapshot(_undoStack.pop());
    showToast('Undone', 'info');
}
function performRedo() {
    if (!_redoStack.length) { showToast('Nothing to redo', 'info'); return; }
    _undoStack.push(_undoBaseline);
    _applyUndoSnapshot(_redoStack.pop());
    showToast('Redone', 'info');
}
function updateTitle() {
    const dot = document.getElementById('statusDot'); const text = document.getElementById('statusText');
    if (state.unsaved) { dot.className = 'status-dot unsaved'; text.textContent = 'UNSAVED'; }
    else { dot.className = 'status-dot'; text.textContent = 'ALL SAVED'; }
    document.getElementById('titlePath').innerHTML = state.currentFile
        ? `${state.folderPath} / <span>${state.currentFile}</span>` : state.folderPath;
}
function updateToolbar() {
    const has = !!state.currentFile;
    ['btnReload', 'btnBackups', 'btnNew', 'btnUndo', 'btnRedo'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !has; });
    document.getElementById('toolbarTitle').textContent = has ? state.currentFile.replace('.json', '') : '-';
    document.getElementById('toolbarCount').textContent = has ? `${state.data.length} ${tc().label.toLowerCase()}` : '';
}
function updateStatus() {
    const cfg = tc();
    document.getElementById('sbFile').innerHTML = `${cfg.icon} <span>${state.currentFile || '-'}</span>`;
    document.getElementById('sbEntry').innerHTML = state.currentIndex >= 0 ? `entry <span>${state.currentIndex + 1} / ${state.data.length}</span>` : '';
    document.getElementById('sbType').innerHTML = state.currentFile ? `<span>${state.fileType}</span>` : '';
    updateQCStatus();
}

function updateQCStatus() {
    const el = document.getElementById('sbQC');
    if (!el) return;
    if (!state.currentFile) { el.innerHTML = ''; return; }
    const qc = state.qcCount || 0;
    const dup = state.duplicates ? state.duplicates.size : 0;
    const parts = [];
    if (qc > 0) parts.push(`⚠ <span style="color:#dd7755;">${qc} issue${qc === 1 ? '' : 's'}</span>`);
    if (dup > 0) parts.push(`⧉ <span style="color:#cc4488;">${dup} dup${dup === 1 ? '' : 's'}</span>`);
    if (!parts.length) { el.innerHTML = EDITORS[state.fileType]?.qcCount ? `✓ <span style="color:var(--green-bright);">clean</span>` : ''; return; }
    el.innerHTML = parts.join(' · ');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') { const c = document.getElementById('toastContainer'); const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = msg; c.appendChild(t); setTimeout(() => t.remove(), 2800); }

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function confirm2(text, confirmLabel = 'Confirm', btnClass = 'btn-danger') { return new Promise(resolve => { document.getElementById('dialogText').textContent = text; const btn = document.getElementById('dialogConfirmBtn'); btn.textContent = confirmLabel; btn.className = `btn ${btnClass}`; document.getElementById('dialogOverlay').classList.remove('hidden'); dialogCallback = resolve; }); }
function dialogConfirm() { document.getElementById('dialogOverlay').classList.add('hidden'); if (dialogCallback) dialogCallback(true); }
function dialogCancel() { document.getElementById('dialogOverlay').classList.add('hidden'); if (dialogCallback) dialogCallback(false); }

// ── UTILS ─────────────────────────────────────────────────────────────────────
function escHtml(str) { return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escAttr(str) { return String(str ?? '').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function buildSelect(opts, val) { return opts.map(o => `<option value="${escAttr(o)}" ${o === (val ?? '') ? 'selected' : ''}>${escHtml(o) || '-'}</option>`).join(''); }

// ── KEYBOARD ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); reloadFile(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); openGlobalSearch(); }

    const tag = document.activeElement?.tagName;
    const inTextField = tag === 'INPUT' || tag === 'TEXTAREA';

    // Undo/redo - left to the browser's native per-field undo while actually
    // typing in a text field; only takes over once focus is elsewhere.
    if ((e.ctrlKey || e.metaKey) && !inTextField) {
        const k = e.key.toLowerCase();
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); performUndo(); return; }
        if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); performRedo(); return; }
    }

    // Up/Down to move the selected entry without touching the mouse.
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !inTextField && tag !== 'SELECT') {
        if (!state.filteredData.length) return;
        e.preventDefault();
        const curPos = state.filteredData.indexOf(state.data[state.currentIndex]);
        let nextPos = curPos === -1 ? 0 : curPos + (e.key === 'ArrowDown' ? 1 : -1);
        nextPos = Math.max(0, Math.min(state.filteredData.length - 1, nextPos));
        selectEntry(state.data.indexOf(state.filteredData[nextPos]));
        document.querySelector('.entry-row.active')?.scrollIntoView({ block: 'nearest' });
    }
});

// ── GLOBAL SEARCH (across every file in the data folder) ───────────────────
async function openGlobalSearch() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay'; overlay.style.zIndex = 120;
    const box = document.createElement('div');
    box.className = 'dialog-box';
    box.style.cssText = 'max-width:560px;max-height:80vh;display:flex;flex-direction:column;gap:8px;';
    box.innerHTML = `
        <div class="dialog-title">Search All Files</div>
        <input type="text" id="global-search-input" class="field-input" placeholder="Search across every file…" autocomplete="off" style="width:100%;box-sizing:border-box">
        <div id="global-search-results" style="overflow-y:auto;max-height:420px;display:flex;flex-direction:column;gap:4px;"></div>
        <div class="dialog-actions"><button class="btn btn-ghost" onclick="this.closest('.dialog-overlay').remove()">Close</button></div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const input = box.querySelector('#global-search-input');
    const list = box.querySelector('#global-search-results');
    let debounceId = null;

    async function runSearch(q) {
        if (!q || q.length < 2) { list.innerHTML = '<div class="mp-empty">Type at least 2 characters…</div>'; return; }
        list.innerHTML = '<div class="mp-empty">Searching…</div>';
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const json = await res.json();
            const results = json.results || [];
            if (json.error) { list.innerHTML = `<div class="mp-empty">${escHtml(json.error)}</div>`; return; }
            if (!results.length) { list.innerHTML = '<div class="mp-empty">No matches</div>'; return; }
            list.innerHTML = results.map(r => `
                <div class="entry-row" style="cursor:pointer;padding:6px 10px;border-radius:4px;" data-file="${escAttr(r.filename)}" data-idx="${r.entryIndex}">
                    <div class="entry-row-name">${escHtml(r.name)}</div>
                    <div class="entry-row-meta">${escHtml(r.filename)} · ${escHtml(r.fileType)}</div>
                </div>`).join('');
            list.querySelectorAll('.entry-row').forEach(row => {
                row.addEventListener('click', async () => {
                    overlay.remove();
                    await openFile(row.dataset.file);
                    selectEntry(Number(row.dataset.idx));
                });
            });
        } catch (e) { list.innerHTML = '<div class="mp-empty">Search failed</div>'; }
    }

    input.addEventListener('input', () => {
        clearTimeout(debounceId);
        debounceId = setTimeout(() => runSearch(input.value.trim()), 250);
    });
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
    });
    requestAnimationFrame(() => input.focus());
}

// ── ALERTS PAGE (every QC issue + duplicate, across every file, in one place) ──
// Registries map a fileType to how to pull itemized issues out of it. Kept
// here (not in each editor) since this is the one place that needs every
// editor's analyzer at once.
const ALERTS_QC_TYPES = {
    monster: { analyze: e => monsterQCAnalyze(e), ignore: k => qcIgnore('monster', k) },
    spell: { analyze: e => spellQCAnalyze(e), ignore: k => qcIgnore('spell', k) },
    weapon: { analyze: e => gearQCAnalyze(e, 'weapon'), ignore: k => qcIgnore('weapon', k) },
    armor: { analyze: e => gearQCAnalyze(e, 'armor'), ignore: k => qcIgnore('armor', k) },
    glossary: { analyze: (e, data) => glossaryQCAnalyze(e, data), ignore: k => qcIgnore('glossary', k) },
    class: { analyze: e => classQCAnalyze(e), ignore: k => classQCIgnore(k) },
    species: { analyze: e => spQCAnalyze(e), ignore: k => spQCIgnore(k) },
};
const ALERTS_BLANK_TYPES = {
    quest: undefined, traps: undefined, medicine: undefined,
    worldbuilding: undefined, hexgen: undefined, enchanted: ['type', 'category'],
};

function scanFileForAlerts(filename, fileType, data) {
    const items = [];
    const qcType = ALERTS_QC_TYPES[fileType];
    if (qcType) {
        data.forEach((entry, idx) => {
            (qcType.analyze(entry, data) || []).forEach(issue => {
                items.push({
                    filename, index: idx,
                    entryLabel: entry.name || entry.term || `#${idx + 1}`,
                    title: issue.label || 'Issue',
                    detail: issue.detail || '',
                    ignore: issue.key ? () => qcType.ignore(issue.key) : null,
                });
            });
        });
    } else if (fileType === 'loot') {
        lootFindIssues(data).forEach(w => {
            items.push({ filename, index: w.index, entryLabel: data[w.index]?.label || `Tier ${w.index + 1}`, title: w.message, detail: '' });
        });
    } else if (fileType in ALERTS_BLANK_TYPES) {
        qcFindBlankEntries(data, ALERTS_BLANK_TYPES[fileType]).forEach(idx => {
            items.push({ filename, index: idx, entryLabel: `Entry #${idx + 1}`, title: 'Blank entry', detail: 'Added but never filled in.' });
        });
    }
    const { field, dups } = findDuplicates(data);
    if (field) {
        for (const [idx, val] of dups) {
            items.push({ filename, index: idx, entryLabel: data[idx][field] || `#${idx + 1}`, title: `Duplicate ${field}`, detail: `Shares "${val}" with another entry.`, isDup: true });
        }
    }
    return items;
}

async function scanAllFilesForAlerts(onProgress) {
    const res = await fetch('/api/files');
    const json = await res.json();
    const files = json.files || [];
    const allItems = [];
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (onProgress) onProgress(i, files.length, f.name);
        try {
            const fr = await fetch(`/api/file/${encodeURIComponent(f.name)}`);
            const fj = await fr.json();
            const data = Array.isArray(fj.data) ? fj.data : Object.values(fj.data || {});
            allItems.push(...scanFileForAlerts(f.name, fj.fileType || 'generic', data));
        } catch (e) { }
    }
    return allItems;
}

function updateAlertsBadge() {
    const btn = document.getElementById('btnAlerts');
    const sb = document.getElementById('sbAlertsAll');
    const n = state.alertsBadgeCount;
    if (btn) {
        btn.textContent = n === undefined ? '⚠ Alerts' : (n > 0 ? `⚠ Alerts (${n})` : '⚠ Alerts ✓');
        btn.style.color = n > 0 ? '#dd7755' : '';
    }
    if (sb) {
        sb.innerHTML = n === undefined ? ''
            : n > 0 ? `<span style="color:#dd7755;">⚠ ${n} total</span>`
                : `<span style="color:var(--green-bright);">✓ all clean</span>`;
    }
}

async function openAlertsPage() {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay'; overlay.style.zIndex = 130;
    const box = document.createElement('div');
    box.className = 'dialog-box';
    box.style.cssText = 'max-width:820px;width:90vw;max-height:85vh;display:flex;flex-direction:column;gap:8px;';
    box.innerHTML = `
        <div class="dialog-title" style="display:flex;justify-content:space-between;align-items:center;">
            <span>⚠ Alerts</span>
            <div style="display:flex;gap:6px;">
                <button class="btn btn-ghost" id="alerts-refresh" style="font-size:10px;">↺ Rescan</button>
                <button class="btn btn-ghost" style="font-size:10px;" onclick="this.closest('.dialog-overlay').remove()">Close</button>
            </div>
        </div>
        <div id="alerts-summary" style="font-size:11px;color:var(--text-muted);"></div>
        <div id="alerts-body" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:10px;"></div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const summary = box.querySelector('#alerts-summary');
    const body = box.querySelector('#alerts-body');

    function renderAlerts(items) {
        if (!items.length) {
            summary.textContent = 'No issues found across any file.';
            body.innerHTML = `<div class="class-qc-empty">✓ Everything looks clean.</div>`;
            state.alertsBadgeCount = 0;
            updateAlertsBadge();
            return;
        }
        const byFile = new Map();
        items.forEach(it => { if (!byFile.has(it.filename)) byFile.set(it.filename, []); byFile.get(it.filename).push(it); });
        summary.textContent = `${items.length} issue${items.length === 1 ? '' : 's'} across ${byFile.size} file${byFile.size === 1 ? '' : 's'}`;
        state.alertsBadgeCount = items.length;
        updateAlertsBadge();

        body.innerHTML = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length).map(([filename, list]) => `
            <div class="forge-section">
                <div class="section-header section-header-split">
                    <span>${escHtml(filename)} <span style="opacity:0.5;">[${list.length}]</span></span>
                    ${list.some(it => it.ignore) ? `<button class="btn btn-ghost alerts-ignore-all" style="font-size:9px;" data-file="${escAttr(filename)}">Ignore All Ignorable</button>` : ''}
                </div>
                <div class="class-qc-list" style="padding:8px;">
                    ${list.map((it, li) => `
                        <div class="class-qc-issue" style="border-left:3px solid ${it.isDup ? '#cc4488' : '#cc8833'};">
                            <div class="class-qc-card-hd">
                                <span class="class-qc-badge">${escHtml(it.entryLabel)}</span>
                            </div>
                            <div class="class-qc-card-bd">
                                <div class="class-qc-type" style="color:${it.isDup ? '#cc4488' : '#cc8833'};">${escHtml(it.title)}</div>
                                ${it.detail ? `<div class="class-qc-detail">${escHtml(it.detail)}</div>` : ''}
                                <div class="class-qc-actions">
                                    <button class="btn btn-ghost alerts-goto" style="font-size:9px;padding:2px 8px;" data-file="${escAttr(it.filename)}" data-idx="${it.index}">Go to entry</button>
                                    ${it.ignore ? `<button class="btn btn-ghost alerts-ignore" style="font-size:9px;padding:2px 8px;" data-file="${escAttr(filename)}" data-li="${li}">Ignore</button>` : ''}
                                </div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`).join('');

        body.querySelectorAll('.alerts-goto').forEach(btn => {
            btn.addEventListener('click', async () => {
                overlay.remove();
                await openFile(btn.dataset.file);
                selectEntry(Number(btn.dataset.idx));
            });
        });
        body.querySelectorAll('.alerts-ignore').forEach(btn => {
            btn.addEventListener('click', () => {
                const list = byFile.get(btn.dataset.file);
                const it = list[Number(btn.dataset.li)];
                if (it?.ignore) it.ignore();
                const globalIdx = items.indexOf(it);
                if (globalIdx !== -1) items.splice(globalIdx, 1);
                renderAlerts(items);
            });
        });
        body.querySelectorAll('.alerts-ignore-all').forEach(btn => {
            btn.addEventListener('click', () => {
                const filename = btn.dataset.file;
                const list = byFile.get(filename);
                list.filter(it => it.ignore).forEach(it => it.ignore());
                for (let i = items.length - 1; i >= 0; i--) {
                    if (items[i].filename === filename && items[i].ignore) items.splice(i, 1);
                }
                renderAlerts(items);
            });
        });
    }

    async function runScan() {
        body.innerHTML = `<div class="mp-empty">Scanning…</div>`;
        summary.textContent = '';
        const items = await scanAllFilesForAlerts((i, total, name) => {
            body.innerHTML = `<div class="mp-empty">Scanning ${escHtml(name)}… (${i + 1}/${total})</div>`;
        });
        renderAlerts(items);
    }

    box.querySelector('#alerts-refresh').addEventListener('click', runScan);
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
    });

    await runScan();
}

// ── SIDEBAR RESIZE ────────────────────────────────────────────────────────────
(function () {
    const divider = document.getElementById('sidebarDivider');
    const topPanel = document.querySelector('.sidebar-panel-files');
    const sidebar = document.querySelector('.sidebar');
    if (!divider || !topPanel || !sidebar) return;
    let dragging = false, startY = 0, startH = 0;
    divider.addEventListener('mousedown', e => { dragging = true; startY = e.clientY; startH = topPanel.getBoundingClientRect().height; divider.classList.add('dragging'); document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (!dragging) return; const sH = sidebar.getBoundingClientRect().height; topPanel.style.flex = `0 0 ${Math.max(80, Math.min(sH - 80, startH + (e.clientY - startY)))}px`; });
    document.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; divider.classList.remove('dragging'); document.body.style.cursor = ''; document.body.style.userSelect = ''; });
})();

// ── START ─────────────────────────────────────────────────────────────────────
init();
