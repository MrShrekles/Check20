/* Home screen — character management */

const ACTIVE_KEY = 'arc-active-sheet';
const SAVES_KEY  = 'arc-saves';

// ── STORAGE HELPERS ───────────────────────────────────────────────────────────

function getActive() {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); }
    catch { return null; }
}

function getSaves() {
    try { return JSON.parse(localStorage.getItem(SAVES_KEY) || '[]'); }
    catch { return []; }
}

function setSaves(arr) {
    localStorage.setItem(SAVES_KEY, JSON.stringify(arr));
}

function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── SAVE CURRENT CHARACTER ────────────────────────────────────────────────────

function saveCurrentToSlot(existingId = null) {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        const name = data.char?.name || 'Unnamed';
        const id   = existingId || `save_${Date.now()}`;

        localStorage.setItem(`arc-save-${id}`, raw);

        const saves = getSaves().filter(s => s.id !== id);
        saves.unshift({
            id,
            name,
            classKey: data.char?.classKey || '',
            level:    data.char?.level    || 1,
            savedAt:  Date.now(),
        });
        setSaves(saves);
        return id;
    } catch { return null; }
}

// ── LOAD A SAVE SLOT ──────────────────────────────────────────────────────────

function loadSave(id) {
    const raw = localStorage.getItem(`arc-save-${id}`);
    if (!raw) { alert('Save not found.'); return; }
    localStorage.setItem(ACTIVE_KEY, raw);
    window.location.href = 'active-sheet.html';
}

// ── DELETE A SAVE SLOT ────────────────────────────────────────────────────────

function deleteSave(id) {
    localStorage.removeItem(`arc-save-${id}`);
    setSaves(getSaves().filter(s => s.id !== id));
    renderAll();
}

// ── RENDER ────────────────────────────────────────────────────────────────────

function renderAll() {
    renderCurrent();
    renderSaves();
}

function renderCurrent() {
    const data       = getActive();
    const section    = document.getElementById('home-current');
    const nameEl     = document.getElementById('home-char-name');
    const metaEl     = document.getElementById('home-char-meta');

    if (!data || !data.char?.name) {
        section.hidden = true;
        return;
    }

    section.hidden = false;
    nameEl.textContent = data.char.name;
    const parts = [data.char.classKey, data.char.species, `Lv ${data.char.level || 1}`].filter(Boolean);
    metaEl.textContent = parts.join(' · ');
}

function renderSaves() {
    const saves   = getSaves();
    const section = document.getElementById('home-saves-section');
    const list    = document.getElementById('saves-list');

    if (!saves.length) { section.hidden = true; return; }

    section.hidden = false;
    list.innerHTML = saves.map(s => `
        <div class="save-entry">
            <div class="save-info">
                <span class="save-name">${s.name}</span>
                <span class="save-meta">${[s.classKey, `Lv ${s.level || 1}`, fmtDate(s.savedAt)].filter(Boolean).join(' · ')}</span>
            </div>
            <div class="save-actions">
                <button class="save-btn save-btn--load" data-load="${s.id}" type="button">Load</button>
                <button class="save-btn save-btn--del"  data-del="${s.id}"  type="button">✕</button>
            </div>
        </div>`).join('');
}

// ── EVENTS ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    renderAll();

    // Save current to slot
    document.getElementById('btn-save-current')?.addEventListener('click', () => {
        const id = saveCurrentToSlot();
        if (id) {
            const btn = document.getElementById('btn-save-current');
            btn.textContent = '✓ Saved';
            setTimeout(() => { btn.textContent = 'Save'; }, 1500);
            renderSaves();
            document.getElementById('home-saves-section').hidden = false;
        }
    });

    // Continue with active character
    document.getElementById('btn-continue')?.addEventListener('click', () => {
        window.location.href = 'active-sheet.html';
    });

    // New character — prompt to save if active exists
    document.getElementById('btn-new')?.addEventListener('click', () => {
        const data = getActive();
        if (data?.char?.name) {
            const choice = confirm(`Save "${data.char.name}" before starting a new character?`);
            if (choice) saveCurrentToSlot();
        }
        localStorage.removeItem(ACTIVE_KEY);
        window.location.href = 'create-char.html';
    });

    // Import from file
    document.getElementById('btn-import')?.addEventListener('click', () => {
        document.getElementById('file-load')?.click();
    });

    document.getElementById('file-load')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                localStorage.setItem(ACTIVE_KEY, JSON.stringify(data));
                renderAll();
            } catch {
                alert('Invalid save file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // Saves list — load or delete
    document.getElementById('saves-list')?.addEventListener('click', e => {
        const loadBtn = e.target.closest('[data-load]');
        if (loadBtn) {
            const data = getActive();
            if (data?.char?.name) {
                if (confirm(`Switch to this character? Save "${data.char.name}" first?`)) {
                    saveCurrentToSlot();
                }
            }
            loadSave(loadBtn.dataset.load);
            return;
        }
        const delBtn = e.target.closest('[data-del]');
        if (delBtn) {
            const saves = getSaves();
            const s     = saves.find(x => x.id === delBtn.dataset.del);
            if (s && confirm(`Delete "${s.name}"? This cannot be undone.`)) {
                deleteSave(delBtn.dataset.del);
            }
        }
    });
});
