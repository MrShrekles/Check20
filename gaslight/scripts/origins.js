/* Check20 origins and their colours.

   Ported from scripts/origin-colors.js so the VTT tags paths, talents and
   species the same way the website does. The values here are that file's
   fallback palette; the site reads them from origin-tokens.css, which this app
   does not load. */

export const ORIGINS = [
  'pure', 'arcane', 'tech', 'crystal', 'nature', 'vozian',
  'chrono', 'chaos', 'life', 'elemental', 'dragon', 'divine',
];

/** Written but not yet surfaced on the site. Content can still carry them. */
export const ORIGINS_STAGED = ['malform', 'death', 'void'];

export const ORIGINS_ALL = [...ORIGINS, ...ORIGINS_STAGED];

/** Valid tag states rather than origins a thing can have. */
const ORIGIN_SPECIAL = ['fey', 'all', 'none'];

/** Sources that map onto the closest canonical origin. */
const ORIGIN_ALIAS = {
  celestial: 'divine', basic: 'pure',
  infernal: 'dragon', undead: 'crystal',
};

const ORIGIN_COLOR = {
  pure: 'darkslategray', arcane: 'darkcyan', tech: 'darkblue',
  crystal: 'rgb(79, 0, 0)', nature: '#1b7a41', vozian: '#502379',
  chrono: '#8a5408', chaos: '#331f0e', life: '#6b2a6a',
  elemental: '#275c65', dragon: '#ff5500', divine: '#7a4000',
  malform: '#7eaa44', death: 'rgb(23, 23, 41)', void: 'black',
  fey: '#aa44aa', all: '#ffffff', none: '#999999',
};

export function originKey(source) {
  const key = String(source || '').trim().toLowerCase();
  if (ORIGINS_ALL.includes(key) || ORIGIN_SPECIAL.includes(key)) return key;
  return ORIGIN_ALIAS[key] || 'none';
}

export const originColor = source => ORIGIN_COLOR[originKey(source)] || ORIGIN_COLOR.none;
