/* Picking: which item or door sits under a world point. */

import { state } from './state.js';
import { distToSeg, itemBounds } from './geometry.js';

/** Topmost item at the point, searched back to front. layerId narrows the
    search to one layer; null searches all of them. */
export function hitTest(wx, wy, layerId) {
  const g = state.grid.size;
  const tol = Math.max(6 / state.cam.z, 4);
  const items = state.items;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (layerId && it.layerId !== layerId) continue;
    if (it.kind === 'token') {
      const r = it.size * g / 2;
      if ((wx - it.x) ** 2 + (wy - it.y) ** 2 <= r * r) return it;
    } else if (it.kind === 'lamp') {
      const r = Math.max(12 / state.cam.z, 10);
      if ((wx - it.x) ** 2 + (wy - it.y) ** 2 <= r * r) return it;
    } else if (it.kind === 'shape') {
      if (wx >= it.x - tol && wx <= it.x + it.w + tol && wy >= it.y - tol && wy <= it.y + it.h + tol) return it;
    } else if (it.kind === 'ellipse') {
      const nx = (wx - (it.x + it.w / 2)) / (it.w / 2 || 1), ny = (wy - (it.y + it.h / 2)) / (it.h / 2 || 1);
      if (nx * nx + ny * ny <= 1.15) return it;
    } else if (it.kind === 'line') {
      if (distToSeg(wx, wy, it.x, it.y, it.x2, it.y2) <= (it.width || 3) / 2 + tol) return it;
    } else if (it.kind === 'stroke') {
      for (let j = 0; j < it.pts.length - 1; j++) {
        if (distToSeg(wx, wy, it.pts[j][0], it.pts[j][1], it.pts[j + 1][0], it.pts[j + 1][1]) <= (it.width || 3) / 2 + tol) return it;
      }
    } else if (it.kind === 'text') {
      const b = itemBounds(it);
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return it;
    }
  }
  return null;
}

/** Prefer the active layer, then fall back to anything. */
export const pick = (wx, wy) => hitTest(wx, wy, state.activeLayerId) || hitTest(wx, wy, null);

export function doorHit(wx, wy) {
  const g = state.grid.size;
  const tol = Math.max(10 / state.cam.z, g * .2);
  for (const k of Object.keys(state.light.doors)) {
    const [cx, cy, dir] = k.split(','); const x = +cx, y = +cy;
    const mx = dir === 'e' ? (x + 1) * g : x * g + g / 2;
    const my = dir === 'e' ? y * g + g / 2 : (y + 1) * g;
    if (Math.hypot(wx - mx, wy - my) < tol) return k;
  }
  return null;
}
