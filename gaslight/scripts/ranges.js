/* Distance, in Check20's own terms. No DOM, so the tests can reach it.

   A number of feet is not what anyone at the table actually asks. They ask
   "can I hit it from here", and the answer is a band: Melee, Reach, Short,
   Medium, Long. Those bands are written in `data/glossary.json` with their
   distances in the definition, so this parses them out of the rules rather
   than hardcoding a second copy that would drift the first time the numbers
   are tuned:

     Melee Range    5ft or touching.
     Reach Range    10ft.
     Short Range    Within 50ft.
     Medium Range   50-200ft.
     Long Range     200-1000ft.
     Visible Range  Within line of sight.     <- no distance, so not a band

   One cell is five feet, the same as the grid the map is drawn on. */

export const FEET_PER_CELL = 5;

/* A scene says how much ground one cell covers and what to call it. Five feet
   is the Check20 default and what a battlemap means, but a city map might be
   fifty and a world map ten miles — so the ruler asks the scene rather than
   assuming. */
export const scaleOf = scene => ({
  per: Number(scene?.scale?.per) > 0 ? Number(scene.scale.per) : FEET_PER_CELL,
  unit: String(scene?.scale?.unit || 'ft').trim() || 'ft',
});

/* The bands are written in feet, so they only mean anything on a scene
   measured in feet. On a world map in miles, "Short range" would be a lie. */
const FOOT_WORDS = new Set(['ft', 'ft.', 'feet', 'foot']);
export const unitIsFeet = unit => FOOT_WORDS.has(String(unit || '').trim().toLowerCase());

/**
 * The range bands, ordered near to far.
 * @param {Array<{term: string, category: string, definition: string}>} entries
 *        glossary entries, as loaded
 * @returns {Array<{name: string, min: number, max: number}>}
 */
export function parseBands(entries = []) {
  const out = [];
  for (const e of entries) {
    if (String(e?.category || '').toLowerCase() !== 'range') continue;
    const def = String(e.definition || '');
    /* Every number that is a distance: "50-200ft" gives both, "Within 50ft"
       gives one, "line of sight" gives none and so is not a band. */
    const nums = [...def.matchAll(/(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?)\s*)?ft/gi)]
      .flatMap(m => [m[1], m[2]])
      .filter(Boolean)
      .map(Number);
    if (!nums.length) continue;
    const name = String(e.term || '').replace(/\s*range\s*$/i, '').trim() || e.term;
    out.push({
      name,
      min: nums.length > 1 ? Math.min(...nums) : 0,
      max: Math.max(...nums),
    });
  }
  return out.sort((a, b) => a.max - b.max || a.min - b.min);
}

/**
 * What to call this distance. The first band that reaches it wins, so 10ft is
 * Reach rather than Short even though both cover it — the tighter band is the
 * one a player means.
 * @returns {string} the band's name, or '' past the longest one
 */
export function bandFor(ft, bands = []) {
  if (!(ft >= 0)) return '';
  for (const b of bands) if (ft <= b.max) return b.name;
  return '';
}

/** Straight-line distance between two world points, in the scene's own unit. */
export const legFeet = (a, b, gridSize, per = FEET_PER_CELL) =>
  Math.hypot(b[0] - a[0], b[1] - a[1]) / gridSize * per;

/**
 * A path's total, leg by leg. Measuring around a corner is the whole reason
 * for waypoints: a token walking an L does not travel the hypotenuse.
 */
export function pathFeet(pts = [], gridSize = 50, per = FEET_PER_CELL) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += legFeet(pts[i - 1], pts[i], gridSize, per);
  return total;
}

/** Distance, rounded to the nearest cell, which is how a map is actually read. */
export const toCells = (ft, per = FEET_PER_CELL) => Math.round(ft / per);
export const snapFeet = (ft, per = FEET_PER_CELL) => toCells(ft, per) * per;

/**
 * The line under a measurement: how far, how many cells, and — when the scene
 * is measured in feet — what Check20 calls that distance.
 * @param {number} dist   in the scene's own unit
 * @param {Array} bands
 * @param {{per: number, unit: string}} [scale]
 * @returns {string}
 */
export function measureLabel(dist, bands = [], scale = null) {
  const { per, unit } = scale || { per: FEET_PER_CELL, unit: 'ft' };
  const rounded = snapFeet(dist, per);
  const cells = toCells(dist, per);
  const band = unitIsFeet(unit) ? bandFor(rounded, bands) : '';
  const n = Number.isInteger(rounded) ? rounded : Math.round(rounded * 10) / 10;
  return `${n} ${unit} · ${cells} ${cells === 1 ? 'cell' : 'cells'}${band ? ` · ${band}` : ''}`;
}
