// ── Forge Settings ────────────────────────────────────────────────────────────
const SETTINGS_KEY = 'forge_settings';

function loadForgeSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function saveForgeSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function syncToggle(id, on) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = on ? 'ON' : 'OFF';
    el.classList.toggle('on', on);
}

function applyForgeSettings(s) {
    const scale = s.fontScale || 1;

    // Zoom html, compensate body so nothing is clipped at any scale
    document.documentElement.style.zoom = scale;
    document.body.style.height = (100 / scale) + 'vh';
    document.body.style.width  = (100 / scale) + 'vw';

    // Font size buttons
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.scale) === scale);
    });

    // Compact mode
    document.body.classList.toggle('forge-compact', !!s.compact);
    syncToggle('compactToggle', !!s.compact);

    // Print / B&W — strips all color to grayscale
    document.body.classList.toggle('forge-print', !!s.print);
    syncToggle('printToggle', !!s.print);

    // Invert — flips dark UI to light
    document.body.classList.toggle('forge-invert', !!s.invert);
    syncToggle('invertToggle', !!s.invert);
}

function setFontScale(scale) {
    const s = loadForgeSettings();
    s.fontScale = scale;
    saveForgeSettings(s);
    applyForgeSettings(s);
}

function toggleCompact() {
    const s = loadForgeSettings();
    s.compact = !s.compact;
    saveForgeSettings(s);
    applyForgeSettings(s);
}

function togglePrintMode() {
    const s = loadForgeSettings();
    s.print = !s.print;
    saveForgeSettings(s);
    applyForgeSettings(s);
}

function toggleInvert() {
    const s = loadForgeSettings();
    s.invert = !s.invert;
    saveForgeSettings(s);
    applyForgeSettings(s);
}

function openSettings() {
    document.getElementById('settingsOverlay').classList.remove('hidden');
}
function closeSettings() {
    document.getElementById('settingsOverlay').classList.add('hidden');
}
function closeSettingsOutside(e) {
    if (e.target === document.getElementById('settingsOverlay')) closeSettings();
}

// Apply saved settings immediately on load
applyForgeSettings(loadForgeSettings());
