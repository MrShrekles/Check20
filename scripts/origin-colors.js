/* ─── origin-colors.js ───────────────────────────────────────────────────────
   Canonical origin -> color standard for codex-ui. Any page rendering an
   origin badge (spells, monsters, classes, gods, curses/diseases, species...)
   should use originClass()/originColor() from here instead of defining its
   own palette, so origin colors stay consistent site-wide. Colors themselves
   live in the shared `.origin-tag.<name>` classes in styles/codex-ui.css -
   this file only maps a source string to the right class/color.
   ─────────────────────────────────────────────────────────────────────────── */

const ORIGIN_COLORS = {
    basic: 'darkslategray', arcane: 'darkcyan', tech: 'darkblue',
    crystal: 'rgb(79, 0, 0)', nature: '#1b7a41', vozian: '#502379',
    chrono: '#8a5408', chaos: '#331f0e', life: '#6b2a6a',
    elemental: '#275c65', dragon: '#ff5500', celestial: '#7a4000',
    fey: '#aa44aa', all: '#ffffff', none: '#999',
};

// Sources that aren't one of the canonical origins map to the closest thematic match
// rather than getting their own one-off color.
const ORIGIN_ALIAS = {
    divine: 'celestial', infernal: 'dragon', undead: 'crystal',
    plague: 'chrono', vampire: 'life',
};

function originClass(source) {
    const key = String(source || '').trim().toLowerCase();
    if (key in ORIGIN_COLORS) return key;
    return ORIGIN_ALIAS[key] || 'none';
}

function originColor(source) {
    return ORIGIN_COLORS[originClass(source)] || ORIGIN_COLORS.none;
}
