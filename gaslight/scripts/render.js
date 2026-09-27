/* Everything that paints the canvas. draw() is the only entry point; call it
   through requestDraw() so repaints coalesce to one per frame. */

import { state, ui, computed, indexLayers } from './state.js';
import { view, requestDraw, animate, clock } from './view.js';
import { w2s, itemBounds, lum } from './geometry.js';
import { regionAt, roomCells } from './lighting.js';
import { mapPalette } from './theme.js';
import { woundsMax } from './character.js';
import { conditionStyle } from './conditions.js';
import { isPlayerMode, PLAYER_CHAR_ID } from './session.js';
import { currentTurnRefs } from './initiative.js';
import { safeColor } from './dom.js';
import { drawMeasures } from './ruler.js';
import { drawBackdrop, drawBackdropSelection } from './backdrop.js';

/* The health ring's colour: green at full, amber through the middle, red as it
   runs out. Hue alone carries it, so the ring reads the same in both themes.
   It darkens slightly as it empties, which keeps the last sliver visible. */
const healthColor = f => `hsl(${Math.round(140 * f)} 74% ${52 - 10 * (1 - f)}%)`;

/* ---- things that move by themselves ----

   Two of them: a token in real trouble, and the token whose turn it is. Both
   are a slow pulse rather than a flash, because a map with a fight on it is
   already busy and a blink pulls the eye harder than anything else on screen.

   The renderer asks for the frame loop only while one of these is on screen,
   and gives it back when the last one goes. It owns exactly one claim on the
   loop, which is what keeps the count balanced. */

/** Below this fraction of its wounds, a token is worth noticing across a map. */
const HURT_AT = 1 / 3;

let wantAnim = false;
function wantAnimation(on) {
  if (on === wantAnim) return;
  wantAnim = on;
  animate(on);
}

/** 0..1 and back, once every `period` seconds. */
const pulse = (period = 1.9) => (Math.sin(clock() * (Math.PI * 2 / period)) + 1) / 2;

/** Whose turn it is, as the ids a token can be matched on. */
function currentTurn() {
  const c = state.init?.list?.[state.init?.turn];
  return c ? { charId: c.charId, itemId: c.itemId } : null;
}

/* What a hovered token says about itself.

   A narrator sees everything. A player sees their own character's numbers,
   because those are theirs, and nothing else's health at all — not the number
   and not a word for it. How badly hurt the Brute is is the narrator's to tell
   them, and a hover that answered it would take that away.

   Conditions stay visible on every token, because they are already pips on the
   token itself: hiding the words while showing the dots would only be coy. */
/** The lines a hover plate shows, longest first so the box can be sized. */
function hoverLines(it) {
  const lines = [];
  /* Two ways to be looking at this as a player: a real player session, and a
     narrator with Player view on. The second is a preview, so it has to hide
     exactly what the first hides or it is not previewing anything. */
  const asPlayer = isPlayerMode() || state.playerView;
  const mine = !asPlayer || it.charId === PLAYER_CHAR_ID;
  const frac = woundFraction(it);
  const armour = armourOf(it);

  if (mine && frac !== null) {
    if (it.hpMax > 0) {
      lines.push(`${Math.max(0, it.hpMax - (it.taken || 0))}/${it.hpMax} wounds`);
    } else {
      const ch = state.chars.find(c => c.id === it.charId);
      if (ch?.res?.hp) lines.push(`${ch.res.hp.current}/${woundsMax(ch)} wounds`);
    }
    if (armour > 0) lines.push(`${armour} armour`);
  }

  const conds = conditionsOf(it);
  if (conds.length) lines.push(conds.join(', '));
  return lines;
}

const isTurnToken = (it, turn) =>
  !!turn && ((turn.charId && it.charId === turn.charId) || (turn.itemId && it.id === turn.itemId));

/** How much of its wounds a token has left, 0..1, or null if it has no
    wounds to speak of. The same two sources the health ring reads. */
function woundFraction(it) {
  if (it.hpMax > 0) return Math.max(0, it.hpMax - (it.taken || 0)) / it.hpMax;
  if (it.charId) {
    const ch = state.chars.find(c => c.id === it.charId);
    if (ch?.res?.hp) {
      const max = woundsMax(ch);
      if (max > 0) return Math.max(0, Math.min(max, ch.res.hp.current ?? max)) / max;
    }
  }
  return null;
}

/** Armour on a token: a character's comes off the sheet, anything else carries
    its own, so a narrator can give a monster a plate and see it. */
function armourOf(it) {
  if (it.charId) {
    const ch = state.chars.find(c => c.id === it.charId);
    return Math.max(0, ch?.res?.armor?.current || 0);
  }
  return Math.max(0, it.armor || 0);
}

/** Conditions on a token, from the sheet for a character, from the item for
    everything else. */
function conditionsOf(it) {
  if (it.charId) {
    const ch = state.chars.find(c => c.id === it.charId);
    return ch?.conditions || [];
  }
  return it.conditions || [];
}

/* Pip colours come from the condition's category in the data: red for Corpus,
   blue for Cognition, yellow for Special, black for Major. A pip says what
   kind of trouble this is; the card says which one. */

/** A shield outline centred on x,y, about 2r tall. */
function shieldPath(ctx, x, y, r) {
  const w = r * 1.5, h = r * 1.7;
  ctx.beginPath();
  ctx.moveTo(x, y - h * .62);
  ctx.lineTo(x + w * .72, y - h * .34);
  ctx.lineTo(x + w * .72, y + h * .1);
  ctx.quadraticCurveTo(x + w * .6, y + h * .55, x, y + h * .66);
  ctx.quadraticCurveTo(x - w * .6, y + h * .55, x - w * .72, y + h * .1);
  ctx.lineTo(x - w * .72, y - h * .34);
  ctx.closePath();
}

export function draw() {
  const { ctx, W, H, DPR } = view;
  if (!ctx) return;
  pulsing = false;
  hoverPlate = null;
  turnRefs = currentTurnRefs();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const g = state.grid.size, z = state.cam.z, gz = g * z;
  indexLayers();

  // The battlemap goes under the grid, which is how every table reads one.
  drawBackdrop(ctx, w2s);

  // grid
  if (state.grid.show && gz > 7) {
    /* The theme's grid is tuned for an empty table. Over a battlemap it is
       often invisible or in the way, so a scene may name its own colour and
       say how hard to draw it. Empty means "whatever the theme says", which is
       what almost every scene wants. */
    ctx.save();
    ctx.strokeStyle = state.grid.ink ? safeColor(state.grid.ink) : mapPalette().grid;
    ctx.globalAlpha = Math.max(.05, Math.min(1, state.grid.weight ?? 1));
    ctx.lineWidth = 1;
    ctx.beginPath();
    const ox = ((state.cam.x % gz) + gz) % gz, oy = ((state.cam.y % gz) + gz) % gz;
    for (let x = ox; x < W; x += gz) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = oy; y < H; y += gz) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.restore();
  }

  drawRoomsBase();

  // layers bottom to top
  for (const L of state.layers) {
    if (!L.visible) continue;
    if (L.narrator && state.playerView) continue;
    ctx.globalAlpha = L.opacity;
    for (const it of state.items) {
      if (it.layerId !== L.id) continue;
      if (!onScreen(it)) continue;
      drawItem(it, L);
    }
    ctx.globalAlpha = 1;
  }

  drawWallsAndDoors();
  drawSceneWash();
  drawDarkness();

  drawBackdropSelection(ctx, w2s, mapPalette());
  for (const it of ui.sel.group) drawSelection(it);
  if (ui.sel.item && !ui.sel.group.includes(ui.sel.item)) drawSelection(ui.sel.item);
  if (ui.temp) drawTemp();

  drawPings();
  // The ruler draws over the tokens it is measuring between, and under the
  // hover plate, which is the thing you are actually pointing at.
  drawMeasures(ctx, w2s, mapPalette());
  if (hoverPlate) { drawHoverPlate(hoverPlate.it, hoverPlate.p, hoverPlate.r); hoverPlate = null; }

  // Hold the frame loop only while something on screen is actually moving.
  wantAnimation(pulsing);
}

/* Set by drawItem when it paints something that pulses; read at the end of
   the frame. A module-level flag rather than a return value, because drawItem
   is called from inside two nested loops. */
let pulsing = false;

/* The hovered token's readout, noted while its layer is painted and drawn once
   everything else is down. */
let hoverPlate = null;

/* Whoever is acting this frame. One lookup per frame rather than one per
   token, since the answer cannot change mid-paint. */
let turnRefs = [];

/* What a hovered token says, in a plate above it. Drawn last so nothing on
   the token can sit over it, and flipped below the token when there is no room
   above — a token near the top edge is exactly when you most want to read it. */
function drawHoverPlate(it, p, r) {
  const { ctx, W, H } = view;
  const z = state.cam.z;
  const P = mapPalette();
  const lines = hoverLines(it);
  if (!lines.length) return;

  const fs = Math.max(9, 11 * z);
  const pad = 6, lh = fs * 1.45;
  ctx.font = `600 ${fs}px Candara,sans-serif`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2;
  const h = lines.length * lh + pad * 1.5;

  let x = Math.min(W - w - 4, Math.max(4, p.x - w / 2));
  let y = p.y - r - h - Math.max(6, 8 * z);
  if (y < 4) y = p.y + r + Math.max(6, 8 * z);       // no room above: go below
  if (y + h > H - 4) y = Math.max(4, H - h - 4);

  ctx.save();
  ctx.fillStyle = P.plate;
  ctx.strokeStyle = 'rgba(255,250,240,.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 5);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = P.plateInk;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad * 0.75 + lh * (i + 0.5)));
  ctx.restore();
  ctx.textAlign = 'center';
}

/* Cheap rejection of items that cannot touch the viewport. The margin covers
   stroke width, token name plates and selection outlines. */
function onScreen(it) {
  const { W, H } = view;
  const z = state.cam.z, g = state.grid.size;
  let x, y, w, h;
  if (it.kind === 'token') { const r = it.size * g / 2; x = it.x - r; y = it.y - r; w = h = r * 2; }
  else if (it.kind === 'lamp') { x = it.x - 16; y = it.y - 16; w = h = 32; }
  else {
    const b = itemBounds(it);
    if (!b) return true;
    ({ x, y, w, h } = b);
  }
  const a = w2s(x, y);
  const m = 80;
  return !(a.x > W + m || a.y > H + m || a.x + w * z < -m || a.y + h * z < -m);
}

function drawRoomsBase() {
  const { ctx, W, H } = view;
  const g = state.grid.size, z = state.cam.z, s = g * z;
  const cells = roomCells();
  if (!cells.length) return;
  ctx.fillStyle = mapPalette().room;
  for (const [cx, cy] of cells) {
    const p = w2s(cx * g, cy * g);
    if (p.x > W || p.y > H || p.x + s < 0 || p.y + s < 0) continue;
    ctx.fillRect(p.x, p.y, s + .5, s + .5);
  }
}

function drawWallsAndDoors() {
  const { ctx, W, H } = view;
  const L = state.light, g = state.grid.size, z = state.cam.z, s = g * z;
  const cells = roomCells();
  const P = mapPalette();
  const doorKeys = Object.keys(L.doors);
  if (!cells.length && !doorKeys.length) return;
  ctx.save();
  ctx.strokeStyle = mapPalette().wall;
  ctx.lineWidth = Math.max(1.5, 3 * z);
  ctx.lineCap = 'square';
  ctx.beginPath();
  for (const [cx, cy, r] of cells) {
    const p = w2s(cx * g, cy * g);
    if (p.x > W + s || p.y > H + s || p.x + s < -s || p.y + s < -s) continue;
    if (regionAt(cx, cy - 1) !== r) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + s, p.y); }
    if (regionAt(cx, cy + 1) !== r) { ctx.moveTo(p.x, p.y + s); ctx.lineTo(p.x + s, p.y + s); }
    if (regionAt(cx - 1, cy) !== r) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + s); }
    if (regionAt(cx + 1, cy) !== r) { ctx.moveTo(p.x + s, p.y); ctx.lineTo(p.x + s, p.y + s); }
  }
  ctx.stroke();

  for (const k of doorKeys) {
    const d = L.doors[k];
    const [cx, cy, dir] = k.split(','); const x = +cx, y = +cy;
    let mx, my, horiz;
    if (dir === 'e') { const p = w2s((x + 1) * g, y * g); mx = p.x; my = p.y + s / 2; horiz = false; }
    else { const p = w2s(x * g, (y + 1) * g); mx = p.x + s / 2; my = p.y; horiz = true; }
    const half = s * .32;
    ctx.lineWidth = Math.max(3, 7 * z);
    ctx.strokeStyle = d.open ? P.doorOpen : P.doorShut;
    ctx.beginPath();
    if (horiz) { ctx.moveTo(mx - half, my); ctx.lineTo(mx + half, my); }
    else { ctx.moveTo(mx, my - half); ctx.lineTo(mx, my + half); }
    ctx.stroke();
    if (d.open) {
      ctx.lineWidth = Math.max(1, 2 * z);
      ctx.strokeStyle = P.doorMark;
      ctx.beginPath();
      if (horiz) { ctx.moveTo(mx - half, my); ctx.lineTo(mx - half, my - s * .3); ctx.moveTo(mx + half, my); ctx.lineTo(mx + half, my + s * .3); }
      else { ctx.moveTo(mx, my - half); ctx.lineTo(mx + s * .3, my - half); ctx.moveTo(mx, my + half); ctx.lineTo(mx - s * .3, my + half); }
      ctx.stroke();
    } else {
      ctx.fillStyle = P.doorMark;
      ctx.beginPath(); ctx.arc(mx, my, Math.max(1.5, 2.2 * z), 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

/* Darkness is painted on a scratch canvas and punched through with
   destination-out, then composited in one drawImage. */
/* A scene's colour, over the map and under everything that is not the map.

   Under the darkness, because a wash is scenery and darkness is what a player
   can see: tinting the fog would make the two arguable. Under the selection,
   the pings and the hover plate, because those are the app talking, not the
   room. A scene at amount 0 skips the pass entirely, which is every scene
   until a narrator picks a colour. */
function drawSceneWash() {
  const t = state.tint;
  if (!t || !(t.amount > 0)) return;
  const { ctx, W, H } = view;
  ctx.save();
  ctx.globalAlpha = Math.min(.8, t.amount);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = safeColor(t.color);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawDarkness() {
  const { ctx, offCv, offCtx: o, W, H, DPR } = view;
  const L = state.light;
  if (!L.enabled) return;
  if (!roomCells().length) return;
  const g = state.grid.size, z = state.cam.z, s = g * z;
  const P = mapPalette();
  const alpha = state.playerView ? P.fogAlphaPlayer : L.dim;
  if (alpha <= 0) return;
  o.setTransform(DPR, 0, 0, DPR, 0, 0);
  o.clearRect(0, 0, W, H);
  o.globalCompositeOperation = 'source-over';
  o.globalAlpha = alpha;
  o.fillStyle = P.fog;
  o.fillRect(0, 0, W, H);
  o.globalAlpha = 1;
  o.globalCompositeOperation = 'destination-out';
  o.fillStyle = '#000';
  for (const k of computed.litCells) {
    const c = k.indexOf(',');
    const p = w2s(+k.slice(0, c) * g, +k.slice(c + 1) * g);
    if (p.x > W || p.y > H || p.x + s < 0 || p.y + s < 0) continue;
    o.fillRect(p.x - 1, p.y - 1, s + 2, s + 2);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(offCv, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function drawItem(it, layer) {
  const { ctx } = view;
  const z = state.cam.z, g = state.grid.size;
  const narratorMark = layer.narrator && !state.playerView;
  const P = mapPalette();

  if (it.kind === 'shape') {
    const p = w2s(it.x, it.y);
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * .35;
    ctx.fillStyle = it.color;
    ctx.fillRect(p.x, p.y, it.w * z, it.h * z);
    ctx.restore();
    ctx.strokeStyle = it.color; ctx.lineWidth = (it.width || 3) * z;
    if (narratorMark) ctx.setLineDash([5, 4]);
    ctx.strokeRect(p.x, p.y, it.w * z, it.h * z);
    ctx.setLineDash([]);
  }
  else if (it.kind === 'ellipse') {
    const p = w2s(it.x + it.w / 2, it.y + it.h / 2);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, Math.abs(it.w / 2) * z, Math.abs(it.h / 2) * z, 0, 0, 7);
    ctx.globalAlpha = ctx.globalAlpha * .35;
    ctx.fillStyle = it.color; ctx.fill();
    ctx.restore();
    if (narratorMark) ctx.setLineDash([5, 4]);
    ctx.strokeStyle = it.color; ctx.lineWidth = (it.width || 3) * z; ctx.stroke();
    ctx.setLineDash([]);
  }
  else if (it.kind === 'line') {
    const a = w2s(it.x, it.y), b = w2s(it.x2, it.y2);
    if (narratorMark) ctx.setLineDash([5, 4]);
    ctx.strokeStyle = it.color; ctx.lineWidth = (it.width || 3) * z;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);
  }
  else if (it.kind === 'stroke') {
    if (it.pts.length < 2) return;
    if (narratorMark) ctx.setLineDash([5, 4]);
    ctx.strokeStyle = it.color; ctx.lineWidth = (it.width || 3) * z;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = w2s(it.pts[0][0], it.pts[0][1]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < it.pts.length; i++) {
      const p = w2s(it.pts[i][0], it.pts[i][1]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  else if (it.kind === 'text') {
    const p = w2s(it.x, it.y);
    ctx.fillStyle = it.color;
    ctx.font = `600 ${Math.max(9, (it.size || 16) * z)}px Candara,sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(it.text, p.x, p.y);
    if (narratorMark) {
      const tw = ctx.measureText(it.text).width;
      ctx.setLineDash([4, 3]); ctx.strokeStyle = P.narrator; ctx.lineWidth = 1;
      ctx.strokeRect(p.x - 3, p.y - (it.size || 16) * z * .7, tw + 6, (it.size || 16) * z * 1.4);
      ctx.setLineDash([]);
    }
  }
  else if (it.kind === 'token') {
    const p = w2s(it.x, it.y);
    // A little bigger under the pointer, which is what makes one token
    // findable among ten. Small enough not to shove its neighbours around.
    const r = (it.size * g / 2) * z * (ui.hover === it ? 1.12 : 1);

    /* Two glows, painted under the token so they read as light coming off it
       rather than a ring drawn on top. Both are worked out before the health
       ring below, which needs the same numbers. */
    const onTurn = isTurnToken(it, turnRefs);
    const hurtFrac = woundFraction(it);
    const badly = hurtFrac !== null && hurtFrac > 0 && hurtFrac <= HURT_AT;

    /* Pointed at, from the map or from the initiative order: a steady ring,
       not a pulse, so it reads as "this one" rather than competing with the
       turn marker. The token itself grows a little, which is what makes a
       crowded map findable under the pointer. */
    const hovered = ui.hover === it;
    if (hovered) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + Math.max(7, 9 * z), 0, 7);
      ctx.strokeStyle = 'rgba(255,250,240,.85)';
      ctx.lineWidth = Math.max(1.5, 2 * z);
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();
    }

    if (onTurn || badly) {
      pulsing = true;
      const beat = pulse(onTurn ? 1.6 : 2.2);
      // Whose turn it is wins the colour: it is the more useful fact.
      const hue = onTurn ? '255,215,0' : '200,60,50';
      const spread = r * (onTurn ? 0.55 : 0.42) * (0.55 + beat * 0.45);
      const gr = ctx.createRadialGradient(p.x, p.y, r * 0.7, p.x, p.y, r + spread);
      gr.addColorStop(0, `rgba(${hue},${(onTurn ? 0.36 : 0.30) * (0.45 + beat * 0.55)})`);
      gr.addColorStop(1, `rgba(${hue},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + spread, 0, 7);
      ctx.fillStyle = gr;
      ctx.fill();
    }

    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7);
    ctx.fillStyle = it.color; ctx.fill();
    ctx.lineWidth = Math.max(1.5, 2 * z);
    ctx.strokeStyle = P.tokenEdge; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, r - Math.max(2, 3 * z)), 0, 7);
    ctx.strokeStyle = P.tokenInner; ctx.lineWidth = 1; ctx.stroke();
    if (narratorMark) {
      ctx.setLineDash([4, 3]); ctx.strokeStyle = P.narrator;
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    // A token wears its mark if it has one: a shape, an emoji, or its initials.
    const initials = (it.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const mark = String(it.glyph || '').trim() || initials;
    ctx.fillStyle = lum(it.color) > .55 ? P.tokenInk : P.tokenInkLight;
    ctx.font = `700 ${Math.max(8, r * (it.glyph ? .95 : .75))}px Candara,'Segoe UI Emoji',sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mark, p.x, p.y + 1);

    /* Health as a ring around the token: a full circle at full wounds, closing
       anticlockwise as they are taken, green through amber to red on the way
       down. It sits outside the token so the mark underneath stays readable,
       and only a token with a wound ceiling has one — a plain tally has no
       fraction to draw. */
    let ringMax = 0, ringLeft = 0;
    if (it.hpMax > 0) {
      ringMax = it.hpMax;
      ringLeft = Math.max(0, it.hpMax - (it.taken || 0));
    } else if (it.charId) {
      // A character's wounds live on the sheet, not the token, so read them
      // there. The ring then follows damage taken anywhere — card, rail, roll.
      const ch = state.chars.find(c => c.id === it.charId);
      if (ch?.res?.hp) {
        ringMax = woundsMax(ch);
        ringLeft = Math.max(0, Math.min(ringMax, ch.res.hp.current ?? ringMax));
      }
    }

    if (ringMax > 0) {
      const frac = Math.max(0, Math.min(1, ringLeft / ringMax));
      const rr = r + Math.max(4, 5 * z);
      const lw = Math.max(2, 3.2 * z);
      const TOP = -Math.PI / 2;

      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(8,10,12,.5)';
      ctx.lineWidth = lw;
      ctx.stroke();

      if (frac > 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, TOP, TOP + Math.PI * 2 * frac);
        ctx.strokeStyle = healthColor(frac);
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }

    /* In cover: a shield arc across the lower edge, drawn in the token's own
       ink so it reads as something the token is behind rather than another
       badge stuck on it. Cover is a token flag, not a condition — it is not in
       conditions.json, and inventing one would put it in the picker, in the
       clearing rules and in Press On, all of which would be wrong. */
    if (it.cover) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + Math.max(2, 2.5 * z), Math.PI * 0.18, Math.PI * 0.82);
      ctx.strokeStyle = 'rgba(150,190,225,.92)';
      ctx.lineWidth = Math.max(2.5, 4 * z);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    /* Armour, top right: a shield with the value in it. The ring already says
       how hurt something is, so the number that used to sit here was saying it
       twice. Armour is the thing the ring cannot show. */
    const armour = armourOf(it);
    if (armour > 0) {
      const bx = p.x + r * .74, by = p.y - r * .74, br = Math.max(7, 9 * z);
      shieldPath(ctx, bx, by, br);
      ctx.fillStyle = 'rgba(28,46,66,.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,190,225,.9)';
      ctx.lineWidth = Math.max(1, 1.2 * z);
      ctx.stroke();
      ctx.fillStyle = '#dceaf7';
      ctx.font = `700 ${Math.max(7, br * .95)}px Consolas, ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(armour), bx, by + br * .06);
    }

    /* Something at zero wounds is worth seeing without reading the ring. */
    if (ringMax > 0 && ringLeft <= 0) {
      const bx = p.x - r * .74, by = p.y - r * .74, br = Math.max(6, 8 * z);
      ctx.beginPath(); ctx.arc(bx, by, br, 0, 7);
      ctx.fillStyle = 'rgba(20,20,20,.94)'; ctx.fill();
      ctx.strokeStyle = P.tokenEdge; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ff9090';
      ctx.font = `700 ${Math.max(8, br * 1.1)}px Consolas, ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✕', bx, by + 1);
    }

    /* Conditions as pips along the bottom edge, so a glance at the token says
       what is on it. Beyond six they stop being readable, so the rest become a
       count. */
    const conds = conditionsOf(it);
    if (conds.length && z > .35) {
      const shown = conds.slice(0, 6);
      const pr = Math.max(3, 4.2 * z);
      const gap = pr * 2.5;
      const total = (shown.length - 1) * gap;
      const by = p.y + r + pr + Math.max(2, 2.5 * z);
      shown.forEach((c, i) => {
        const bx = p.x - total / 2 + i * gap;
        const cs = conditionStyle(c);
        ctx.beginPath(); ctx.arc(bx, by, pr, 0, 7);
        ctx.fillStyle = cs.fill;
        ctx.fill();
        ctx.strokeStyle = cs.ink;
        ctx.lineWidth = Math.max(1, 1.1 * z);
        ctx.stroke();
      });
      if (conds.length > shown.length) {
        ctx.fillStyle = P.plateInk;
        ctx.font = `700 ${Math.max(7, 9 * z)}px Consolas, ui-monospace, monospace`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`+${conds.length - shown.length}`, p.x + total / 2 + pr * 1.8, by);
      }
      ctx.textAlign = 'center';
    }

    if (z > .45 && it.name) {
      // Drop the plate below the condition pips when the token wears any.
      const pipRoom = (conds.length && z > .35) ? Math.max(3, 4.2 * z) * 2 + Math.max(2, 2.5 * z) : 0;
      const top = p.y + r + 3 + pipRoom;
      ctx.font = `600 ${Math.max(9, 11.5 * z)}px Candara,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(it.name).width;
      ctx.fillStyle = P.plate;
      ctx.fillRect(p.x - tw / 2 - 4, top, tw + 8, 14 * z + 3);
      ctx.fillStyle = P.plateInk;
      ctx.fillText(it.name, p.x, top + 1 + (14 * z + 3) / 2 - 1);
    }

    /* Noted, not drawn. The plate has to come after the darkness mask or the
       fog dims it — at 0.97 alpha in player view it would be invisible — and
       after every layer, or a token above it paints over the top. */
    if (hovered) hoverPlate = { it, p, r };
  }
  else if (it.kind === 'lamp') {
    if (state.playerView) return;
    const p = w2s(it.x, it.y), r = 7 * Math.max(.6, z);
    ctx.strokeStyle = P.accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(ang) * (r + 2), p.y + Math.sin(ang) * (r + 2));
      ctx.lineTo(p.x + Math.cos(ang) * (r + 6), p.y + Math.sin(ang) * (r + 6));
      ctx.stroke();
    }
  }
}

function drawSelection(it) {
  const { ctx } = view;
  const z = state.cam.z, g = state.grid.size;
  ctx.save();
  ctx.strokeStyle = mapPalette().accent; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
  const box = itemBounds(it);
  if (it.kind === 'token' || it.kind === 'lamp') {
    const p = w2s(it.x, it.y);
    const r = it.kind === 'token' ? (it.size * g / 2) * z + 4 : 12 * z + 4;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
  } else if (box) {
    const a = w2s(box.x, box.y);
    ctx.strokeRect(a.x - 4, a.y - 4, box.w * z + 8, box.h * z + 8);
  }
  ctx.restore();
}

function drawTemp() {
  const { ctx } = view;
  const temp = ui.temp;
  const P = mapPalette();
  const z = state.cam.z;
  ctx.save();
  ctx.globalAlpha = .55;
  if (temp.kind === 'marquee') {
    const p = w2s(temp.x, temp.y);
    ctx.globalAlpha = .16;
    ctx.fillStyle = P.accent;
    ctx.fillRect(p.x, p.y, temp.w * z, temp.h * z);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = P.accent;
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, temp.w * z, temp.h * z);
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  if (temp.kind === 'shape' || temp.kind === 'roomAdd' || temp.kind === 'roomCut') {
    const p = w2s(temp.x, temp.y);
    ctx.fillStyle = temp.kind === 'roomCut' ? P.roomCut : temp.kind === 'roomAdd' ? P.roomAdd : temp.color;
    ctx.fillRect(p.x, p.y, temp.w * z, temp.h * z);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = temp.kind === 'roomCut' ? P.roomCutLine : temp.kind === 'roomAdd' ? P.roomAddLine : temp.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x, p.y, temp.w * z, temp.h * z);
  }
  else if (temp.kind === 'ellipse') {
    const p = w2s(temp.x + temp.w / 2, temp.y + temp.h / 2);
    ctx.strokeStyle = temp.color; ctx.lineWidth = 1.5; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.abs(temp.w / 2) * z, Math.abs(temp.h / 2) * z, 0, 0, 7); ctx.stroke();
  }
  else if (temp.kind === 'line') {
    const a = w2s(temp.x, temp.y), b = w2s(temp.x2, temp.y2);
    ctx.strokeStyle = temp.color; ctx.lineWidth = (temp.width || 3) * z; ctx.globalAlpha = .8;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  else if (temp.kind === 'stroke') {
    ctx.strokeStyle = temp.color; ctx.lineWidth = (temp.width || 3) * z; ctx.globalAlpha = .9;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = w2s(temp.pts[0][0], temp.pts[0][1]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < temp.pts.length; i++) { const p = w2s(temp.pts[i][0], temp.pts[i][1]); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
  }
  ctx.restore();
}

const PING_MS = 1400;

function drawPings() {
  const { ctx } = view;
  const z = state.cam.z;
  const P = mapPalette();
  const t = performance.now();
  for (const p of ui.pings) {
    const age = (t - p.t0) / PING_MS;
    if (age > 1) continue;
    const sp = w2s(p.x, p.y);
    ctx.save();
    for (const ph of [age, Math.max(0, age - .25)]) {
      ctx.globalAlpha = (1 - ph) * .8;
      ctx.strokeStyle = P.accent; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 6 + ph * 46 * Math.max(.6, z), 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = .9; ctx.fillStyle = P.accent;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function addPing(x, y) {
  ui.pings.push({ x, y, t0: performance.now() });
  if (rafOn) return;
  rafOn = true;
  const step = () => {
    const t = performance.now();
    for (let i = ui.pings.length - 1; i >= 0; i--) if (t - ui.pings[i].t0 > PING_MS) ui.pings.splice(i, 1);
    draw();
    if (ui.pings.length) requestAnimationFrame(step);
    else { rafOn = false; requestDraw(); }
  };
  requestAnimationFrame(step);
}
