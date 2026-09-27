/* The ruler.

   There was already a measurement — shift-drag from any tool — and it drew a
   dashed line with a number of feet on it. That answers one question and only
   one: how far is it in a straight line. At a table the questions are usually

     can I hit it from here        → a band, not a number
     can I get there this turn     → against this creature's movement
     can I get there round that    → a path, not a hypotenuse

   So the ruler is its own tool, and it answers all three. It keeps the
   shift-drag as it was, because that is worth having in the middle of doing
   something else.

   What a measurement is: `ui.measure = { pts, live, open }`. `pts` are the
   corners that have been placed, `live` is where the pointer is, and `open`
   says whether more corners can still be added. Nothing here is saved — a
   measurement is a question being asked, not part of the map. */

import { state, ui } from './state.js';
import { view, requestDraw } from './view.js';
import { snapCenter } from './geometry.js';
import { glossaryEntries } from './glossary.js';
import { parseBands, pathFeet, legFeet, measureLabel, scaleOf, unitIsFeet } from './ranges.js';
import { movement } from './character.js';
import { isPlayerMode, PLAYER_CHAR_ID } from './session.js';

/* The bands come out of the glossary, which loads once at boot. Parsing them
   on every frame would be wasteful and parsing them at import time would be
   too early, so they are worked out on first use and kept. */
let bands = null;
export function rangeBands() {
  if (!bands || !bands.length) bands = parseBands(glossaryEntries());
  return bands;
}

/* A measurement lands on cell centres while Snap is on, so a distance across
   a battlemap comes out in whole cells instead of "47 ft" because the pointer
   was three pixels off. Off, it measures exactly where you point. */
export const rulerPoint = w =>
  (state.snap ? (p => [p.x, p.y])(snapCenter(w.x, w.y)) : [w.x, w.y]);

export function startMeasure(w, { open = false } = {}) {
  const p = rulerPoint(w);
  ui.measure = { pts: [p], live: p, open };
  requestDraw();
}

export function moveMeasure(w) {
  if (!ui.measure) return;
  ui.measure.live = rulerPoint(w);
  requestDraw();
}

/** A corner. The path turns here and keeps going. */
export function addWaypoint(w) {
  if (!ui.measure) return startMeasure(w, { open: true });
  ui.measure.pts.push(rulerPoint(w));
  ui.measure.open = true;
  requestDraw();
}

/** Pinned measurements stay on the map until they are cleared. */
export function pinMeasure() {
  const m = ui.measure;
  if (!m) return;
  const pts = [...m.pts, m.live];
  if (pts.length > 1) ui.pins.push(pts);
  ui.measure = null;
  requestDraw();
}

export function endMeasure() {
  ui.measure = null;
  requestDraw();
}

/** Esc, and the toolbar's own way out: drop everything the ruler is showing. */
export function clearMeasures() {
  const had = !!ui.measure || ui.pins.length > 0;
  ui.measure = null;
  ui.pins = [];
  if (had) requestDraw();
  return had;
}

/* ---- what it says ----

   One selected token turns "45 ft" into "45 ft of your 35", which is the
   question actually being asked. Only for a token that has a movement to
   measure against, and never for a token a player should not be reading. */
function moveNote(ft) {
  // Movement is written in feet, so it means nothing on a scene measured in
  // anything else. Better to say nothing than to compare miles to feet.
  const { per, unit } = scaleOf(state);
  if (!unitIsFeet(unit)) return '';
  const it = ui.sel.item || (ui.sel.group.length === 1 ? ui.sel.group[0] : null);
  if (!it) return '';
  if (isPlayerMode() && it.charId !== PLAYER_CHAR_ID) return '';
  const ch = it.charId ? state.chars.find(c => c.id === it.charId) : null;
  if (!ch) return '';
  const move = movement(ch);
  if (!(move > 0)) return '';
  const left = move - Math.round(ft / per) * per;
  return left >= 0 ? `${left} ft left of ${move}` : `${-left} ft past ${move}`;
}

/* ---- drawing ---- */

const DASH = [7, 5];

function drawPath(ctx, pts, { live = false, w2s, palette }) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = palette.accent;
  ctx.setLineDash(live ? DASH : []);
  ctx.globalAlpha = live ? 1 : .72;
  ctx.beginPath();
  const s0 = w2s(pts[0][0], pts[0][1]);
  ctx.moveTo(s0.x, s0.y);
  for (let i = 1; i < pts.length; i++) {
    const s = w2s(pts[i][0], pts[i][1]);
    ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // A knot at every corner, so a path of three legs reads as three legs.
  for (const p of pts) {
    const s = w2s(p[0], p[1]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
  }
  ctx.restore();
}

/* Each leg carries its own length once there is more than one, because the
   total alone does not tell you which corner to move. */
function drawLegLabels(ctx, pts, { w2s, palette }) {
  if (pts.length < 3) return;
  const g = state.grid.size;
  ctx.save();
  ctx.font = '600 10px Candara, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 1; i < pts.length; i++) {
    const { per } = scaleOf(state);
    const ft = Math.round(legFeet(pts[i - 1], pts[i], g, per) / per) * per;
    if (!ft) continue;
    const a = w2s(pts[i - 1][0], pts[i - 1][1]);
    const b = w2s(pts[i][0], pts[i][1]);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const text = `${ft}`;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = palette.label;
    ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
    ctx.fillStyle = palette.plateInk;
    ctx.fillText(text, mx, my);
  }
  ctx.restore();
}

function drawTotal(ctx, pts, { w2s, palette, live }) {
  const g = state.grid.size;
  const scale = scaleOf(state);
  const ft = pathFeet(pts, g, scale.per);
  const end = w2s(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  const lines = [measureLabel(ft, rangeBands(), scale)];
  const note = live ? moveNote(ft) : '';
  if (note) lines.push(note);

  ctx.save();
  ctx.font = '600 12px Candara, sans-serif';
  const pad = 7;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2;
  const h = lines.length * 15 + 7;
  /* Kept on screen: a measurement whose label is off the edge of the map is a
     measurement you cannot read. */
  const x = Math.min(view.W - w - 6, Math.max(6, end.x + 12));
  const y = Math.min(view.H - h - 6, Math.max(6, end.y - h - 8));
  ctx.fillStyle = palette.label;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.fillStyle = i ? palette.plateInk : palette.accent;
    ctx.fillText(l, x + pad, y + 11 + i * 15);
  });
  ctx.restore();
}

/**
 * Everything the ruler has on screen. Called by render.js after the map and
 * before the hover plate, so a measurement sits over the tokens it is
 * measuring between but under the thing you are pointing at.
 */
export function drawMeasures(ctx, w2s, palette) {
  const opts = { w2s, palette };

  for (const pts of ui.pins) {
    drawPath(ctx, pts, { ...opts, live: false });
    drawLegLabels(ctx, pts, opts);
    if (pts.length > 1) drawTotal(ctx, pts, { ...opts, live: false });
  }

  const m = ui.measure;
  if (!m) return;
  const pts = m.live ? [...m.pts, m.live] : m.pts;
  if (pts.length < 2) return;
  drawPath(ctx, pts, { ...opts, live: true });
  drawLegLabels(ctx, pts, opts);
  drawTotal(ctx, pts, { ...opts, live: true });
}

/** True while a measurement is taking pointer input. */
export const measuring = () => !!ui.measure;

/** Whether the open measurement is still collecting corners. */
export const measureOpen = () => !!ui.measure?.open;
