/* Pointer and keyboard interaction on the canvas: what each tool does on
   press, drag and release. */

import { state, ui, id, activeLayer, layerForKind } from './state.js';
import { $, toast } from './dom.js';
import { view, requestDraw } from './view.js';
import {
  w2s, s2w, cellOf, snapCenter, snapPoint, itemBounds, moveItem, normaliseItem,
  invalidateBounds,
} from './geometry.js';
import {
  computeLight, addRoomRect, cutRoomRect, nearestEdge, edgeSides, regionAt,
} from './lighting.js';
import { pick, doorHit } from './hittest.js';
import { addPing } from './render.js';
import { showPopFor, hidePop } from './props.js';
import { showTokenCard, hideTokenCard, characterFor } from './tokencard.js';
import { openSheet } from './sheet.js';
import { showMonsterCard, hideMonsterCard } from './monstercard.js';
import { showGroupCard, hideGroupCard } from './groupcard.js';
import { setTool, updateZoomLbl } from './toolbar.js';
import { isPlayerMode, PLAYER_CHAR_ID } from './session.js';
import {
  startMeasure, moveMeasure, addWaypoint, endMeasure, pinMeasure,
  clearMeasures, measureOpen,
} from './ruler.js';
import { backdropAt, backdropHandleAt, scaleFromCorner } from './backdrop.js';
import { revealWin } from './dock.js';
import { publishMyToken } from './sync.js';

const TOOL_KEYS = {
  v: 'select', h: 'pan', m: 'ruler',
  t: 'token', d: 'draw', r: 'rooms', l: 'lamp', e: 'erase',
};

/* Moving the map is this module's job; saving it, refreshing the scene's
   preview and taking it out of the store are the scene's. Hooks rather than an
   import, because scenes.js already reaches this way round. */
let onBackdropMoved = null;
let onBackdropRemove = null;
export function setBackdropHooks({ moved, removed }) {
  onBackdropMoved = moved;
  onBackdropRemove = removed;
}

export function initTools() {
  const cv = view.cv;

  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    const sx = e.offsetX, sy = e.offsetY;
    const w = s2w(sx, sy);
    const L = activeLayer();
    hidePop(); hideTextEntry(); hideTokenCard(); hideMonsterCard(); hideGroupCard();

    /* The ruler.

       A drag measures and lets go. A click starts a path that stays open, so
       corners can be added one at a time — which is how you measure round a
       wall rather than through it. Alt on the way out leaves it on the map.

       Shift-drag still measures from any tool, because wanting to know how far
       something is in the middle of doing something else is the common case
       and always was. */
    if (state.tool === 'ruler' || e.shiftKey) {
      if (measureOpen() && state.tool === 'ruler') {
        addWaypoint(w);
        ui.drag = { mode: 'measure', sx, sy, waypoint: true };
      } else {
        startMeasure(w);
        ui.drag = { mode: 'measure', sx, sy };
      }
      return;
    }

    if (e.button === 1 || e.button === 2 || state.tool === 'pan') {
      ui.drag = { mode: 'pan', sx, sy, cx: state.cam.x, cy: state.cam.y };
      return;
    }

    if (state.tool === 'select') {
      // doors first: click a door to open or close it
      const dk = doorHit(w.x, w.y);
      if (dk) {
        const d = state.light.doors[dk];
        d.open = !d.open;
        computeLight(); requestDraw();
        toast(d.open ? 'Door opened' : 'Door closed');
        return;
      }
      /* A corner handle of the already-selected map, before anything else:
         it sits over the map's own pixels and over whatever is drawn on top,
         and it is a 7px target that has to win. */
      const corner = backdropHandleAt(sx, sy, w2s);
      if (corner) {
        ui.drag = { mode: 'bdscale', corner };
        return;
      }

      const it = pick(w.x, w.y);
      if (it) {
        const itLayer = state.layers.find(l => l.id === it.layerId);
        // Players move their own token and nothing else on the narrator's map.
        const mine = !isPlayerMode() || it.charId === PLAYER_CHAR_ID;
        if (itLayer && !itLayer.locked && mine) {
          normaliseItem(it);
          /* Grabbing one of a selected group drags the whole group, keeping
             the spacing between them. Grabbing anything else starts over. */
          const inGroup = ui.sel.group.includes(it);
          if (!inGroup) ui.sel.group = [];
          ui.sel.item = it;
          ui.drag = {
            mode: 'move', it, dx: w.x - it.x, dy: w.y - it.y, moved: false,
            card: !!characterFor(it) || !!it.monster,
            group: inGroup
              ? ui.sel.group.filter(g => g !== it).map(g => (normaliseItem(g), { it: g, dx: w.x - g.x, dy: w.y - g.y }))
              : null,
          };
          requestDraw(); return;
        }
      }
      /* Nothing on the map, but the map itself is under the pointer. Grabbing
         it needs the Map layer visible and unlocked, which reuses the lock
         already in the Layers panel rather than inventing a second one. */
      if (!isPlayerMode() && backdropAt(w.x, w.y)) {
        ui.sel.item = null;
        ui.sel.group = [];
        ui.backdrop = true;
        ui.drag = {
          mode: 'bdmove', moved: false,
          dx: w.x - (state.image.x || 0),
          dy: w.y - (state.image.y || 0),
        };
        /* Grabbing the map opens the window that styles it, which is where
           every control for it lives now. */
        revealWin('map');
        requestDraw();
        return;
      }

      /* Empty space drags a selection box, the way an RTS does. Panning is
         still middle or right drag, and the Pan tool (H). A player gets the
         old pan, since they have nothing on the map to marquee. */
      ui.sel.item = null;
      ui.sel.group = [];
      ui.backdrop = false;
      if (isPlayerMode()) {
        ui.drag = { mode: 'pan', sx, sy, cx: state.cam.x, cy: state.cam.y };
      } else {
        ui.drag = { mode: 'marquee', x0: w.x, y0: w.y, x1: w.x, y1: w.y, add: e.ctrlKey || e.metaKey };
      }
      requestDraw(); return;
    }

    if (state.tool === 'rooms') {
      if (state.roomMode === 'door') {
        const ek = nearestEdge(w.x, w.y);
        if (!ek) { toast('Click closer to a wall edge'); return; }
        const [a, b] = edgeSides(ek);
        if (regionAt(a.x, a.y) === null && regionAt(b.x, b.y) === null) { toast('Doors go on room walls'); return; }
        if (state.light.doors[ek]) {
          delete state.light.doors[ek];
          toast('Door removed');
        } else {
          state.light.doors[ek] = { open: false };
          toast('Door placed, closed');
        }
        computeLight(); requestDraw(); return;
      }
      const c = cellOf(w.x, w.y);
      ui.drag = { mode: 'room', c0: c };
      ui.temp = {
        kind: state.roomMode === 'cut' ? 'roomCut' : 'roomAdd',
        x: c.cx * state.grid.size, y: c.cy * state.grid.size, w: state.grid.size, h: state.grid.size,
      };
      requestDraw(); return;
    }

    if (L.locked) { toast(`Layer "${L.name}" is locked`); return; }

    if (state.tool === 'token') {
      /* Drop one and go back to Select. Placing a token is nearly always a
         single act, and staying in the tool meant the next click — to move it,
         to open its card — laid down another one instead. Shift keeps the tool
         held down for laying out a group in one go. */
      const p = snapCenter(w.x, w.y);
      // A token goes on a token layer, whatever the layers panel has selected.
      const tl = layerForKind('token');
      const it = {
        id: id(), layerId: (tl || L).id, kind: 'token', x: p.x, y: p.y, size: 1,
        color: $('drawColor').value,
        name: 'Token ' + (state.items.filter(i => i.kind === 'token').length + 1),
      };
      state.items.push(it); ui.sel.item = it;
      computeLight(); requestDraw(); showPopFor(it);
      if (!e.shiftKey) setTool('select');
      return;
    }

    if (state.tool === 'lamp') {
      const p = snapCenter(w.x, w.y);
      state.items.push({ id: id(), layerId: (layerForKind('lamp') || L).id, kind: 'lamp', x: p.x, y: p.y });
      computeLight(); requestDraw();
      return;
    }

    if (state.tool === 'draw') {
      const color = $('drawColor').value;
      const width = +$('drawWidth').value;
      if (state.drawMode === 'text') { showTextEntry(sx, sy, w.x, w.y, color); return; }
      if (state.drawMode === 'pencil') {
        ui.drag = { mode: 'pencil' };
        ui.temp = { kind: 'stroke', pts: [[w.x, w.y]], color, width };
      } else {
        const p = snapPoint(w.x, w.y);
        ui.drag = { mode: 'drawshape', ox: p.x, oy: p.y };
        if (state.drawMode === 'line') ui.temp = { kind: 'line', x: p.x, y: p.y, x2: p.x, y2: p.y, color, width };
        else ui.temp = { kind: state.drawMode === 'ellipse' ? 'ellipse' : 'shape', x: p.x, y: p.y, w: 0, h: 0, color, width };
      }
      requestDraw(); return;
    }

    if (state.tool === 'erase') {
      const it = pick(w.x, w.y);
      if (it) {
        state.items = state.items.filter(i => i !== it);
        if (ui.sel.item === it) ui.sel.item = null;
        if (ui.hover === it) ui.hover = null;
        ui.sel.group = ui.sel.group.filter(x => x !== it);
        computeLight(); requestDraw();
      }
    }
  });

  /* Pointing at a token, with nothing being dragged. Tracked separately from
     the drag handler below because it has to run when there is no drag at all,
     and it repaints only when the answer changes — a pointermove fires far too
     often to redraw on every one. */
  cv.addEventListener('pointermove', e => {
    if (ui.drag) return;
    const w = s2w(e.offsetX, e.offsetY);
    const it = pick(w.x, w.y);
    const over = it && (it.kind === 'token' || it.kind === 'lamp') ? it : null;
    if (over === ui.hover) return;
    ui.hover = over;
    requestDraw();
  });

  cv.addEventListener('pointerleave', () => {
    if (!ui.hover) return;
    ui.hover = null;
    requestDraw();
  });

  cv.addEventListener('pointermove', e => {
    const drag = ui.drag;
    if (!drag) return;
    const sx = e.offsetX, sy = e.offsetY;
    const w = s2w(sx, sy);

    if (drag.mode === 'measure') {
      moveMeasure(w);
      return;
    }
    else if (drag.mode === 'bdmove') {
      state.image = { ...state.image, x: w.x - drag.dx, y: w.y - drag.dy };
      drag.moved = true;
    }
    else if (drag.mode === 'bdscale') {
      state.image = scaleFromCorner(state.image, drag.corner, w.x, w.y);
      drag.moved = true;
    }
    else if (drag.mode === 'pan') {
      state.cam.x = drag.cx + (sx - drag.sx);
      state.cam.y = drag.cy + (sy - drag.sy);
    }
    else if (drag.mode === 'move') {
      let nx = w.x - drag.dx, ny = w.y - drag.dy;
      if ((drag.it.kind === 'token' || drag.it.kind === 'lamp') && state.grid.show) {
        const p = snapCenter(nx, ny); nx = p.x; ny = p.y;
      }
      // One implementation for every kind, and it refuses a bad destination.
      if (moveItem(drag.it, nx, ny)) drag.moved = true;
      // The rest of the group follows, holding its spacing.
      if (drag.group) for (const m of drag.group) moveItem(m.it, w.x - m.dx, w.y - m.dy);
    }
    else if (drag.mode === 'marquee') {
      drag.x1 = w.x; drag.y1 = w.y;
      ui.temp = { kind: 'marquee', x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1),
        w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0) };
    }
    else if (drag.mode === 'pencil') {
      const last = ui.temp.pts[ui.temp.pts.length - 1];
      if (Math.hypot(w.x - last[0], w.y - last[1]) > 2 / state.cam.z) { ui.temp.pts.push([w.x, w.y]); invalidateBounds(ui.temp); }
    }
    else if (drag.mode === 'drawshape') {
      const p = snapPoint(w.x, w.y);
      if (ui.temp.kind === 'line') { ui.temp.x2 = p.x; ui.temp.y2 = p.y; }
      else {
        ui.temp.x = Math.min(drag.ox, p.x); ui.temp.y = Math.min(drag.oy, p.y);
        ui.temp.w = Math.abs(p.x - drag.ox); ui.temp.h = Math.abs(p.y - drag.oy);
      }
    }
    else if (drag.mode === 'room') {
      const c = cellOf(w.x, w.y), g = state.grid.size;
      const xs = Math.min(drag.c0.cx, c.cx), xe = Math.max(drag.c0.cx, c.cx);
      const ys = Math.min(drag.c0.cy, c.cy), ye = Math.max(drag.c0.cy, c.cy);
      ui.temp.x = xs * g; ui.temp.y = ys * g; ui.temp.w = (xe - xs + 1) * g; ui.temp.h = (ye - ys + 1) * g;
      drag.c1 = c;
    }
    requestDraw();
  });

  cv.addEventListener('pointerup', e => {
    const drag = ui.drag;
    if (!drag) return;
    const temp = ui.temp;

    if (drag.mode === 'marquee') {
      /* Everything on a visible, unlocked layer whose centre falls inside the
         box. Centre rather than overlap, so a big token half under the box is
         not swept up by a small drag. A box you barely moved is a click: it
         just clears the selection. */
      const x0 = Math.min(drag.x0, drag.x1), x1 = Math.max(drag.x0, drag.x1);
      const y0 = Math.min(drag.y0, drag.y1), y1 = Math.max(drag.y0, drag.y1);
      if (x1 - x0 > 4 || y1 - y0 > 4) {
        const hits = state.items.filter(i => {
          const L = state.layers.find(l => l.id === i.layerId);
          if (!L || !L.visible || L.locked) return false;
          if (L.narrator && state.playerView) return false;
          /* A token's x,y is its centre; a drawing's is an anchor that may
             sit anywhere along it. Measure both from the middle of what is
             actually drawn. */
          const b = i.kind === 'token' || i.kind === 'lamp' ? null : itemBounds(i);
          const cx = b ? b.x + b.w / 2 : i.x;
          const cy = b ? b.y + b.h / 2 : i.y;
          return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
        });
        ui.sel.group = drag.add ? [...new Set([...ui.sel.group, ...hits])] : hits;
        ui.sel.item = ui.sel.group.length === 1 ? ui.sel.group[0] : null;
        /* One token opens its own card, the way a click does. More than one
           opens the group card: the selection is the thing you just made, so
           it is the thing the card should be about. */
        if (ui.sel.group.length === 1) {
          const only = ui.sel.group[0];
          if (characterFor(only)) showTokenCard(only);
          else if (only.monster) showMonsterCard(only);
          else showPopFor(only);
        } else if (ui.sel.group.length > 1) {
          showGroupCard();
        }
      }
      ui.temp = null; ui.drag = null; requestDraw();
      return;
    }
    if (drag.mode === 'bdmove' || drag.mode === 'bdscale') {
      if (drag.moved) onBackdropMoved?.(state.image);
      ui.temp = null; ui.drag = null; requestDraw();
      return;
    }
    if (drag.mode === 'measure') {
      /* Barely moved means it was a click, not a drag: the path stays open for
         the next corner. A real drag is the whole measurement, and ends. */
      const moved = Math.abs(e.offsetX - drag.sx) + Math.abs(e.offsetY - drag.sy) > 4;
      if (!moved && state.tool === 'ruler') {
        if (ui.measure) ui.measure.open = true;
      } else if (e.altKey) {
        pinMeasure();
      } else {
        endMeasure();
      }
    }
    else if (drag.mode === 'move') {
      if (drag.moved && (drag.it.kind === 'token' || drag.it.kind === 'lamp')) computeLight();
      /* A player owns exactly one thing on this map: where their token is.
         Said on release rather than per frame — the room needs the answer,
         not the journey. */
      if (drag.moved && isPlayerMode()) publishMyToken();
      // A click, not a drag. A character or monster token opens its card;
      // anything else opens the property panel, the way it does when placed.
      if (!drag.moved) {
        if (!drag.card) showPopFor(drag.it);
        else if (drag.it.monster) showMonsterCard(drag.it);
        else showTokenCard(drag.it);
      }
    }
    else if (drag.mode === 'pencil') {
      /* A stroke is a bag of points, but dragging one needs a reference to
         measure the move against. Without it `w.x - it.x` is NaN and every
         point becomes NaN on the first drag, which looks like the drawing
         vanishing. The anchor is only a reference; the points are the shape. */
      if (temp.pts.length > 1) {
        state.items.push({
          id: id(), layerId: (layerForKind('stroke') || activeLayer()).id,
          x: temp.pts[0][0], y: temp.pts[0][1],
          ...temp,
        });
      }
    }
    else if (drag.mode === 'drawshape') {
      if (temp.kind === 'line') {
        if (Math.hypot(temp.x2 - temp.x, temp.y2 - temp.y) > 3) {
          state.items.push({ id: id(), layerId: (layerForKind(temp.kind) || activeLayer()).id, ...temp });
        }
      } else if (temp.w > 3 && temp.h > 3) {
        state.items.push({ id: id(), layerId: (layerForKind(temp.kind) || activeLayer()).id, ...temp });
      }
    }
    else if (drag.mode === 'room') {
      const c1 = drag.c1 || drag.c0;
      if (state.roomMode === 'cut') cutRoomRect(drag.c0.cx, drag.c0.cy, c1.cx, c1.cy);
      else addRoomRect(drag.c0.cx, drag.c0.cy, c1.cx, c1.cy);
    }
    ui.temp = null; ui.drag = null; requestDraw();
  });

  cv.addEventListener('contextmenu', e => e.preventDefault());

  cv.addEventListener('dblclick', e => {
    const w = s2w(e.offsetX, e.offsetY);
    const it = pick(w.x, w.y);
    // Same rule as a single click: a player reaches their own token and
    // nothing else. Without this, a double-click opened the property panel —
    // and its Delete button — on anything on the narrator's map.
    if (it && (!isPlayerMode() || it.charId === PLAYER_CHAR_ID)) {
      ui.sel.item = it; requestDraw();
      // Alt goes straight past the card to the full sheet.
      const ch = characterFor(it);
      if (e.altKey && ch) { hidePop(); hideTokenCard(); return openSheet(ch); }
      if (ch) showTokenCard(it);
      else if (it.monster) showMonsterCard(it);
      else showPopFor(it);
      return;
    }
    addPing(w.x, w.y);
  });

  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const nz = Math.min(4, Math.max(.2, state.cam.z * f));
    const w = s2w(e.offsetX, e.offsetY);
    state.cam.x = e.offsetX - w.x * nz;
    state.cam.y = e.offsetY - w.y * nz;
    state.cam.z = nz;
    updateZoomLbl(); requestDraw();
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.target.matches('input,textarea,select,[contenteditable]')) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && ui.backdrop) {
      ui.backdrop = false;
      onBackdropRemove?.();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && (ui.sel.item || ui.sel.group.length)) {
      const gone = new Set(ui.sel.group);
      if (ui.sel.item) gone.add(ui.sel.item);
      state.items = state.items.filter(i => !gone.has(i));
      ui.sel.item = null; ui.sel.group = [];
      if (gone.has(ui.hover)) ui.hover = null;
      hidePop(); computeLight(); requestDraw();
    }
    if (e.key === 'Escape') {
      /* One Escape at a time: it clears what the ruler is showing before it
         clears the selection, so ending a measurement does not also drop the
         token you were measuring from. */
      if (clearMeasures()) return;
      if (ui.backdrop) { ui.backdrop = false; requestDraw(); return; }
      ui.sel.item = null; ui.sel.group = [];
      hidePop(); hideTextEntry(); hideTokenCard(); hideMonsterCard(); hideGroupCard(); requestDraw();
    }
    // Enter closes an open path without clearing the pinned ones.
    if (e.key === 'Enter' && ui.measure) { endMeasure(); return; }
    // Select every token on the visible, unlocked layers.
    if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey) && !isPlayerMode()) {
      e.preventDefault();
      ui.sel.group = state.items.filter(i => {
        const L = state.layers.find(l => l.id === i.layerId);
        return L && L.visible && !L.locked && !(L.narrator && state.playerView);
      });
      ui.sel.item = null;
      showGroupCard();
      requestDraw();
    }
    const t = TOOL_KEYS[e.key.toLowerCase()];
    if (t && !e.metaKey && !e.ctrlKey) setTool(t);
  });

  initTextEntry();
}

/* ---- map text labels ---- */

let textEntryWorld = null;

function showTextEntry(sx, sy, wx, wy, color) {
  textEntryWorld = { wx, wy, color };
  const el = $('textEntry');
  el.style.left = Math.min(view.W - 160, sx) + 'px';
  el.style.top = sy + 'px';
  el.style.display = 'block';
  $('textEntryInput').value = '';
  $('textEntryInput').focus();
}

export function hideTextEntry() {
  $('textEntry').style.display = 'none';
  textEntryWorld = null;
}

function initTextEntry() {
  $('textEntryInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && textEntryWorld) {
      const v = $('textEntryInput').value.trim();
      if (v) {
        state.items.push({
          id: id(), layerId: (layerForKind('text') || activeLayer()).id, kind: 'text',
          x: textEntryWorld.wx, y: textEntryWorld.wy, text: v, color: textEntryWorld.color, size: 16,
        });
        requestDraw();
      }
      hideTextEntry();
    }
    if (e.key === 'Escape') hideTextEntry();
  });
}
