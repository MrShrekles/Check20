// arc-shared.js - helpers used by more than one ARC20 page.
// Loaded before the per-page script by active-sheet.html, narrator.html and
// create-char.html. Everything here was previously copy-pasted per page; keeping
// one copy stops the versions drifting apart.

// ── COLOUR MATH (theme picker) ────────────────────────────────────────────────

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function hexToHue(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    const d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === rr)      h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else                 h = (rr - gg) / d + 4;
    h = Math.round(h * 60);
    return h < 0 ? h + 360 : h;
}

function hexToSL(hex) {
    const { r, g, b } = hexToRgb(hex);
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return { s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if      (h <  60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    const to = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
}

// ── EQUIPMENT ─────────────────────────────────────────────────────────────────

// Sorts a loose item into weapon / armor / gear. Shared by the creation wizard
// (which writes the category) and the sheet (which reads it) - they must agree.
function inferEquipCategory(name, notes) {
    const n = (name  || '').toLowerCase();
    const d = (notes || '').toLowerCase();
    if (d.includes('armor:') || n.includes('armor') || n.includes('shield') || n.includes('cloak') || n.includes('robes')) return 'armor';
    if (/\dd\d/.test(d) || /\dd\d/.test(n)) return 'weapon';
    return 'gear';
}
