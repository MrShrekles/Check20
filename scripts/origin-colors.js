/* ─── origin-colors.js ───────────────────────────────────────────────────────
   Canonical origin -> color standard for codex-ui. Any page rendering an
   origin badge (spells, monsters, classes, gods, curses/diseases, species...)
   should use originClass()/originColor() from here instead of defining its
   own palette.

   Colours themselves live in styles/origin-tokens.css as --origin-* custom
   properties, and are read back out here at runtime. That is deliberate: the
   palette used to exist in six places (this file, three Forge editors, and two
   stylesheets) and had already drifted — editor-class.js had Arcane at #00aaaa
   while this file had darkcyan. Reading the tokens means one edit, one source.

   Adding an origin: add its token + .origin-tag rule in origin-tokens.css, then
   add its key to ORIGINS below. Nothing else needs to change.
   ─────────────────────────────────────────────────────────────────────────── */

// The canonical origin list, in the order the game presents them. Every origin
// dropdown, filter row and tab strip should build itself from this rather than
// hardcoding its own copy.
const ORIGINS = [
    'pure', 'arcane', 'tech', 'crystal', 'nature', 'vozian',
    'chrono', 'chaos', 'life', 'elemental', 'dragon', 'divine',
];

// Staged: named and colour-ready, but no content carries them yet. The Forge
// offers these so data can be tagged as the rework lands; public pages build
// their filters from the data itself, so a staged origin stays invisible on the
// site until something actually uses it. Promote to ORIGINS when it ships.
const ORIGINS_STAGED = ['malform', 'death', 'void'];

// Everything the tooling should offer. Not the same as what the site shows.
const ORIGINS_ALL = [...ORIGINS, ...ORIGINS_STAGED];

// Not origins a piece of content can have, but valid tag states.
// fey is legacy - one monster (Gloomwing Siren) still carries it.
const ORIGIN_SPECIAL = ['fey', 'all', 'none'];

// Sources that aren't one of the canonical origins map to the closest thematic
// match rather than getting their own one-off color.
// celestial/basic are the pre-2026-08 names, kept so old exports, saved rolls
// and anything still holding the former spelling keeps resolving.
const ORIGIN_ALIAS = {
    celestial: 'divine', basic: 'pure',
    infernal: 'dragon', undead: 'crystal',
    plague: 'chrono', vampire: 'life',
};

// Fallback palette, used only if origin-tokens.css did not load (file:// pages,
// a stylesheet 404). Kept in sync by being the same values the tokens hold.
const ORIGIN_FALLBACK = {
    pure: 'darkslategray', arcane: 'darkcyan', tech: 'darkblue',
    crystal: 'rgb(79, 0, 0)', nature: '#1b7a41', vozian: '#502379',
    chrono: '#8a5408', chaos: '#331f0e', life: '#6b2a6a',
    elemental: '#275c65', dragon: '#ff5500', divine: '#7a4000',
    malform: '#7eaa44', death: 'rgb(23, 23, 41)', void: 'black',
    fey: '#aa44aa', all: '#ffffff', none: '#999999',
};

const _originColorCache = {};

function originClass(source) {
    const key = String(source || '').trim().toLowerCase();
    if (ORIGINS_ALL.includes(key) || ORIGIN_SPECIAL.includes(key)) return key;
    return ORIGIN_ALIAS[key] || 'none';
}

function originColor(source) {
    const key = originClass(source);
    if (key in _originColorCache) return _originColorCache[key];

    let value = '';
    if (typeof getComputedStyle === 'function' && typeof document !== 'undefined') {
        value = getComputedStyle(document.documentElement)
            .getPropertyValue(`--origin-${key}`).trim();
    }
    // Only cache a real token read. A call that lands before the stylesheet has
    // applied would otherwise pin the fallback for the rest of the page.
    if (value) _originColorCache[key] = value;
    return value || ORIGIN_FALLBACK[key] || ORIGIN_FALLBACK.none;
}

// Display form. Data is stored lowercase in some files and Title Case in
// others, so never print a raw origin - run it through here.
function originLabel(source) {
    const s = String(source || '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

// Splits a stored origin value that may hold several, e.g. gods.json's
// "nature, vozian". Always returns an array, empty for blank input.
function originList(source) {
    return String(source || '').split(',').map(s => s.trim()).filter(Boolean);
}
