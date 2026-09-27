/* Rooms, doors and which cells a light source can reach.

   A room is a set of grid cells sharing a region id. Light floods freely
   inside a region and crosses into another region only through an open door. */

import { state, computed, indexLayers, layerById } from './state.js';
import { cellOf, ckey } from './geometry.js';

/** dir is 'e' (edge to cx+1) or 's' (edge to cy+1). */
export const edgeKey = (cx, cy, dir) => cx + ',' + cy + ',' + dir;

export const regionAt = (cx, cy) => state.light.cells[ckey(cx, cy)] ?? null;

/* The renderer walks every room cell twice a frame. Parsing "12,-4" back into
   numbers each time showed up in profiles, so the parsed form is cached and
   rebuilt only when the cell map actually changes. */
export function invalidateRooms() { computed.roomsDirty = true; }

export function roomCells() {
  if (computed.roomsDirty) {
    const out = [];
    for (const k in state.light.cells) {
      const c = k.indexOf(',');
      out.push([+k.slice(0, c), +k.slice(c + 1), state.light.cells[k]]);
    }
    computed.rooms = out;
    computed.roomsDirty = false;
  }
  return computed.rooms;
}

export function addRoomRect(c0x, c0y, c1x, c1y) {
  const L = state.light;
  const xs = Math.min(c0x, c1x), xe = Math.max(c0x, c1x);
  const ys = Math.min(c0y, c1y), ye = Math.max(c0y, c1y);
  // find overlapped regions
  const hit = new Set();
  for (let x = xs; x <= xe; x++) for (let y = ys; y <= ye; y++) {
    const r = regionAt(x, y); if (r !== null) hit.add(r);
  }
  let target;
  if (hit.size === 0) { target = 'r' + (L.nextRegion++); }
  else {
    const arr = [...hit]; target = arr[0];
    if (arr.length > 1) {
      for (const k in L.cells) if (hit.has(L.cells[k])) L.cells[k] = target;
    }
  }
  for (let x = xs; x <= xe; x++) for (let y = ys; y <= ye; y++) L.cells[ckey(x, y)] = target;
  invalidateRooms(); cleanDoors(); computeLight();
}

export function cutRoomRect(c0x, c0y, c1x, c1y) {
  const L = state.light;
  const xs = Math.min(c0x, c1x), xe = Math.max(c0x, c1x);
  const ys = Math.min(c0y, c1y), ye = Math.max(c0y, c1y);
  for (let x = xs; x <= xe; x++) for (let y = ys; y <= ye; y++) delete L.cells[ckey(x, y)];
  invalidateRooms(); cleanDoors(); computeLight();
}

/** Drop doors left floating after their rooms were cut away. */
export function cleanDoors() {
  const L = state.light;
  for (const k of Object.keys(L.doors)) {
    const [cx, cy, dir] = k.split(',');
    const x = +cx, y = +cy;
    const a = regionAt(x, y);
    const b = dir === 'e' ? regionAt(x + 1, y) : regionAt(x, y + 1);
    if (a === null && b === null) delete L.doors[k];
  }
}

/** The cell edge nearest a world point, or null if the click was too central. */
export function nearestEdge(wx, wy) {
  const g = state.grid.size;
  const cx = Math.floor(wx / g), cy = Math.floor(wy / g);
  const lx = wx - cx * g, ly = wy - cy * g;
  const cand = [
    { d: ly, k: edgeKey(cx, cy - 1, 's') },  // north
    { d: g - ly, k: edgeKey(cx, cy, 's') },  // south
    { d: lx, k: edgeKey(cx - 1, cy, 'e') },  // west
    { d: g - lx, k: edgeKey(cx, cy, 'e') },  // east
  ].sort((a, b) => a.d - b.d);
  return cand[0].d < g * .35 ? cand[0].k : null;
}

export function edgeSides(k) {
  const [cx, cy, dir] = k.split(',');
  const x = +cx, y = +cy;
  return dir === 'e'
    ? [{ x, y }, { x: x + 1, y }]
    : [{ x, y }, { x, y: y + 1 }];
}

export function computeLight() {
  const lit = new Set();
  computed.litCells = lit;
  const L = state.light;
  if (!L.enabled) return;

  // seeds: tokens on visible non-narrator token layers, plus lamps anywhere visible
  indexLayers();
  const seeds = [];
  for (const it of state.items) {
    const lay = layerById(it.layerId);
    if (!lay || !lay.visible || lay.narrator) continue;
    if (it.kind === 'token' && lay.type === 'token') seeds.push(it);
    if (it.kind === 'lamp') seeds.push(it);
  }

  const openDoor = k => L.doors[k] && L.doors[k].open;
  for (const s of seeds) {
    const { cx, cy } = cellOf(s.x, s.y);
    if (regionAt(cx, cy) === null) continue;
    const start = ckey(cx, cy);
    if (lit.has(start)) continue;
    const q = [[cx, cy]]; const seen = new Set([start]);
    while (q.length) {
      const [x, y] = q.pop();
      lit.add(ckey(x, y));
      const here = regionAt(x, y);
      const nb = [
        [x + 1, y, edgeKey(x, y, 'e')], [x - 1, y, edgeKey(x - 1, y, 'e')],
        [x, y + 1, edgeKey(x, y, 's')], [x, y - 1, edgeKey(x, y - 1, 's')],
      ];
      for (const [nx, ny, ek] of nb) {
        const nk = ckey(nx, ny);
        if (seen.has(nk)) continue;
        const nr = regionAt(nx, ny);
        if (nr === null) continue;
        if (nr !== here && !openDoor(ek)) continue;
        seen.add(nk); q.push([nx, ny]);
      }
    }
  }
}
