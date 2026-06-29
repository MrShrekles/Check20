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

// Input size: 5 steps mapping to vertical padding values
const INPUT_SIZE_STEPS = [
    { pv: '2px',  ph: '5px',  label: 'XS' },
    { pv: '3px',  ph: '6px',  label: 'S'  },
    { pv: '4px',  ph: '8px',  label: 'M'  },
    { pv: '6px',  ph: '10px', label: 'L'  },
    { pv: '9px',  ph: '12px', label: 'XL' },
];
// Textarea height: 5 steps
const TEXTAREA_HEIGHT_STEPS = [
    { h: '36px',  label: 'XS' },
    { h: '46px',  label: 'S'  },
    { h: '56px',  label: 'M'  },
    { h: '80px',  label: 'L'  },
    { h: '120px', label: 'XL' },
];

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

    // Print / B&W - strips all color to grayscale
    document.body.classList.toggle('forge-print', !!s.print);
    syncToggle('printToggle', !!s.print);

    // Invert - flips dark UI to light
    document.body.classList.toggle('forge-invert', !!s.invert);
    syncToggle('invertToggle', !!s.invert);

    // Contextual toolbar
    syncToggle('contextualBarToggle', s.contextualBar !== false);

    // Input size
    const inputStep = INPUT_SIZE_STEPS[(s.inputSize || 3) - 1];
    document.documentElement.style.setProperty('--input-padding-v', inputStep.pv);
    document.documentElement.style.setProperty('--input-padding-h', inputStep.ph);
    const inputSlider = document.getElementById('inputSizeSlider');
    if (inputSlider) inputSlider.value = s.inputSize || 3;
    const inputVal = document.getElementById('inputSizeVal');
    if (inputVal) inputVal.textContent = inputStep.label;

    // Textarea height
    const taStep = TEXTAREA_HEIGHT_STEPS[(s.textareaHeight || 3) - 1];
    document.documentElement.style.setProperty('--textarea-min-height', taStep.h);
    const taSlider = document.getElementById('textareaHeightSlider');
    if (taSlider) taSlider.value = s.textareaHeight || 3;
    const taVal = document.getElementById('textareaHeightVal');
    if (taVal) taVal.textContent = taStep.label;
}

function setInputSize(step) {
    const s = loadForgeSettings();
    s.inputSize = step;
    saveForgeSettings(s);
    applyForgeSettings(s);
}

function setTextareaHeight(step) {
    const s = loadForgeSettings();
    s.textareaHeight = step;
    saveForgeSettings(s);
    applyForgeSettings(s);
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

function toggleContextualBar() {
    const s = loadForgeSettings();
    s.contextualBar = s.contextualBar === false ? true : false;
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
