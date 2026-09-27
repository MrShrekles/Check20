/* Coordinate maths. World units are pixels at zoom 1; one grid cell is 5 ft. */

import { state } from './state.js';

export const w2s = (x, y) => ({ x: x * state.cam.z + state.cam.x, y: y * state.cam.z + state.cam.y });
export const s2w = (x, y) => ({ x: (x - state.cam.x) / state.cam.z, y: (y - state.cam.y) / state.cam.z });

export const cellOf = (wx, wy) => ({ cx: Math.floor(wx / state.grid.size), cy: Math.floor(wy / state.grid.size) });
export const ckey = (cx, cy) => cx + ',' + cy;

export function snapCenter(x, y) {
  const g = state.grid.size;
  return { x: Math.floor(x / g) * g + g / 2, y: Math.floor(y / g) * g + g / 2 };
}

/** Grid intersections, for shapes. Respects the Snap toggle. */
export function snapPoint(x, y) {
  if (!state.snap) return { x, y };
  const g = state.grid.size;
  return { x: Math.round(x / g) * g, y: Math.round(y / g) * g };
}

export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** World-space bounding box, or null for tokens and lamps which are radial. */
export function itemBounds(it) {
  if (it.kind === 'shape' || it.kind === 'ellipse') return { x: it.x, y: it.y, w: it.w, h: it.h };
  if (it.kind === 'line') return { x: Math.min(it.x, it.x2), y: Math.min(it.y, it.y2), w: Math.abs(it.x2 - it.x), h: Math.abs(it.y2 - it.y) };
  if (it.kind === 'stroke') return strokeBounds(it);
  if (it.kind === 'text') return { x: it.x, y: it.y - (it.size || 16) * .7, w: (it.text || '').length * (it.size || 16) * .55, h: (it.size || 16) * 1.4 };
  return null;
}

/** Perceived luminance 0..1, used to pick readable text on a token. */
export function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}


/* ---- stroke bounds, cached ----

   A stroke's box is worked out by walking its points, and the cull asks for it
   once per stroke per frame. On a map with a few hundred drawings that is the
   single most expensive thing the renderer does, and the answer almost never
   changes: a stroke's points only move when the whole stroke is dragged, and
   then they all move by the same amount, so the box can simply be shifted.

   The cache is a WeakMap rather than a field on the item, so it never lands in
   a save file and disappears with the stroke. */
const bbCache = new WeakMap();

function strokeBounds(it) {
  const hit = bbCache.get(it);
  if (hit && hit.n === it.pts.length) return hit.box;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of it.pts) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  bbCache.set(it, { n: it.pts.length, box });
  return box;
}

/** Throw away a stroke's cached box. Call after changing its points in any way
    other than moving the whole thing. */
export function invalidateBounds(it) {
  bbCache.delete(it);
}

/* ---- moving an item ----

   Every kind is moved by the same two functions, and both live here rather
   than inside a pointer handler, so they can be tested without a browser.

   The bug they exist to prevent: a pencil stroke is a bag of points and used
   to carry no x/y at all. The drag read `w.x - it.x`, got NaN, and wrote NaN
   into every point. The drawing did not move to the wrong place — it stopped
   having coordinates, which looks exactly like it vanishing. Nothing caught
   it, because the shape still parsed, still linked, and still rendered until
   the moment it was touched. */

/** True when every coordinate this item relies on is a real number. */
export function itemIsSane(it) {
  if (!it) return false;
  const fin = v => Number.isFinite(v);
  if (!fin(it.x) || !fin(it.y)) return false;
  if (it.kind === 'line') return fin(it.x2) && fin(it.y2);
  if (it.kind === 'stroke') {
    return Array.isArray(it.pts) && it.pts.length > 0
      && it.pts.every(p => Array.isArray(p) && fin(p[0]) && fin(p[1]));
  }
  if (it.kind === 'shape' || it.kind === 'ellipse') return fin(it.w) && fin(it.h);
  return true;
}

/**
 * Give an item the coordinates the move maths assumes, in place.
 * Safe to call on anything, any number of times. Returns the item.
 *
 * A stroke with no anchor takes its first point; anything with a broken
 * coordinate is pulled back to its own bounds, or to the origin if even that
 * cannot be worked out. Better a drawing in the wrong place than one that is
 * silently gone.
 */
export function normaliseItem(it) {
  if (!it) return it;
  const fin = v => Number.isFinite(v);

  if (it.kind === 'stroke') {
    if (Array.isArray(it.pts)) {
      it.pts = it.pts.filter(p => Array.isArray(p) && fin(p[0]) && fin(p[1]));
    }
    if (!Array.isArray(it.pts) || !it.pts.length) it.pts = [[fin(it.x) ? it.x : 0, fin(it.y) ? it.y : 0]];
    bbCache.delete(it);
    if (!fin(it.x) || !fin(it.y)) { it.x = it.pts[0][0]; it.y = it.pts[0][1]; }
    return it;
  }

  if (!fin(it.x)) it.x = 0;
  if (!fin(it.y)) it.y = 0;
  if (it.kind === 'line') {
    if (!fin(it.x2)) it.x2 = it.x;
    if (!fin(it.y2)) it.y2 = it.y;
  }
  if (it.kind === 'shape' || it.kind === 'ellipse') {
    if (!fin(it.w)) it.w = 0;
    if (!fin(it.h)) it.h = 0;
  }
  return it;
}

/**
 * Move an item so its anchor sits at nx,ny, carrying the rest of its shape.
 * A no-op if the destination is not a real point, so a bad number can never
 * be written into the item.
 *
 * @returns {boolean} whether anything actually moved.
 */
export function moveItem(it, nx, ny) {
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return false;
  normaliseItem(it);
  const dx = nx - it.x, dy = ny - it.y;
  if (dx === 0 && dy === 0) return false;

  if (it.kind === 'line') { it.x2 += dx; it.y2 += dy; }
  if (it.kind === 'stroke') {
    for (const p of it.pts) { p[0] += dx; p[1] += dy; }
    // Every point moved by the same amount, so the box did too.
    const c = bbCache.get(it);
    if (c) { c.box.x += dx; c.box.y += dy; }
  }

  it.x = nx;
  it.y = ny;
  return true;
}

/* ---- a backdrop's place on the map ----

   A scene's battlemap is a rectangle in world space: where its top-left sits,
   and how many world pixels one of its own pixels covers. `scale` of 1 means
   the image's pixels are the map's pixels and the grid falls where it falls.

   This lives here rather than with the drawing because it is arithmetic with
   no canvas in it, and arithmetic that puts a map in the wrong place is worth
   a test. */

export const backdropRect = im => ({
  x: im?.x || 0,
  y: im?.y || 0,
  w: (im?.w || 0) * (im?.scale || 1),
  h: (im?.h || 0) * (im?.scale || 1),
});

/**
 * Scale a map so its longest side spans `cells` grid cells.
 *
 * The usual first move with a dropped image: 4000px is not 4000 map pixels of
 * anything in particular, but "forty cells wide" is a room.
 */
export function fitToCells(im, cells, gridSize = state.grid.size) {
  const longest = Math.max(im?.w || 1, im?.h || 1);
  return { ...im, scale: (cells * gridSize) / longest };
}

/** Shift it, for lining a map's own grid up with the table's. */
export const nudgeBackdrop = (im, dx, dy) => ({ ...im, x: (im?.x || 0) + dx, y: (im?.y || 0) + dy });

/**
 * Grow or shrink about its own centre, so nudging it into place is not undone
 * by the next size change.
 */
export function zoomBackdrop(im, factor) {
  const before = backdropRect(im);
  const scale = Math.max(.02, Math.min(40, (im?.scale || 1) * factor));
  const after = { ...im, scale };
  const r = backdropRect(after);
  return { ...after, x: before.x + (before.w - r.w) / 2, y: before.y + (before.h - r.h) / 2 };
}
