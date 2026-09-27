/* The battlemap under the grid.

   A scene's `image` says where its bytes live, how big they are, and where on
   the map the picture sits. Three places the bytes can be:

     local   kept in this browser's IndexedDB, by key. Free, offline, no
             account, and the only one that works without billing enabled.
     cloud   uploaded to Cloud Storage, by URL and path. Needs Blaze, and
             needs scenes to sync before anyone else can see it.
     url     someone else's, pasted in. Costs nothing and belongs to nobody.

   What never goes in `image` is the bytes, or an object URL. An object URL
   belongs to one page load, so a saved table would carry a dead link; and the
   bytes would go through `snapshot()` into localStorage every two seconds and
   blow the quota, which `autosave.js` catches, warns about once, and then goes
   quiet about — losing the table somewhere nobody is looking.

   Decoding is the expensive part and it happens once. Images are cached by
   URL, and the frame that asks for one that is not ready gets nothing and a
   repaint when it lands, rather than a stall. */

import { state, ui } from './state.js';
import { view, requestDraw } from './view.js';
import { getMap } from './mapstore.js';
import { backdropRect } from './geometry.js';

/* url -> HTMLImageElement. An entry exists as soon as the load starts, so a
   map on screen is fetched once however many frames ask for it. */
const cache = new Map();
const failed = new Set();

/* IndexedDB key -> object URL. Reading a blob out of the store is async and
   the renderer is not, so the first frame that wants a local map starts the
   read and paints without it; the read finishes and asks for a repaint. */
const localUrls = new Map();
const localPending = new Set();

/* Hosts that will not send CORS headers. Their images still draw, but the
   canvas they are drawn on cannot be read back, which is what the scene
   preview does — so the preview for that scene stops updating and every other
   scene's carries on. Tracked so the settings panel can say so out loud
   instead of leaving a narrator wondering. */
const tainting = new Set();

/** Whether this scene's map stops its preview from updating. */
export const imageTaints = im => !!im && im.src === 'url' && tainting.has(im.url);

/**
 * The URL to draw for a scene's image, or null while one is being fetched.
 *
 * A local map has to come out of IndexedDB first; that read is kicked off here
 * because the renderer is the only thing that knows which map is on screen.
 */
export function urlForImage(im) {
  if (!im) return null;
  if (im.src === 'local') {
    const have = localUrls.get(im.key);
    if (have) return have;
    if (!localPending.has(im.key)) {
      localPending.add(im.key);
      getMap(im.key).then(rec => {
        localPending.delete(im.key);
        if (!rec?.blob) return;   // cleared site data, or another machine
        localUrls.set(im.key, URL.createObjectURL(rec.blob));
        requestDraw();
      }).catch(() => localPending.delete(im.key));
    }
    return null;
  }
  return im.url || null;
}

/** Hand back an object URL when its map is taken off a scene. */
export function releaseLocal(key) {
  const url = localUrls.get(key);
  if (!url) return;
  URL.revokeObjectURL(url);
  localUrls.delete(key);
  forgetImage(url);
}

/**
 * The decoded image for a URL, or null while it is still coming.
 * Starting the load is a side effect on purpose: the renderer is the only
 * thing that knows which maps are actually on screen.
 */
export function imageFor(url) {
  if (!url || failed.has(url)) return null;
  const have = cache.get(url);
  if (have) return have.complete && have.naturalWidth ? have : null;

  const img = new Image();
  /* The scene preview draws the canvas to a data URL, and a tainted canvas
     refuses — so without this, one map would silently kill the previews.
     Storage and blob URLs both allow it. Someone else's host may not, and an
     image that fails this way is retried without the flag rather than not
     shown at all: a map you can see with no preview beats no map. */
  img.crossOrigin = 'anonymous';
  img.onload = () => requestDraw();
  img.onerror = () => {
    if (!url.startsWith('blob:') && !tainting.has(url)) {
      tainting.add(url);
      const plain = new Image();
      plain.onload = () => requestDraw();
      plain.onerror = () => {
        failed.add(url);
        cache.delete(url);
        console.warn('[gaslight] backdrop failed to load:', url);
      };
      cache.set(url, plain);
      plain.src = url;
      return;
    }
    failed.add(url);
    cache.delete(url);
    console.warn('[gaslight] backdrop failed to load:', url);
  };
  cache.set(url, img);
  img.src = url;
  return null;
}

/** A map that has been replaced is not coming back; let the decode go. */
export function forgetImage(url) {
  cache.delete(url);
  failed.delete(url);
}

/**
 * Paint the open scene's backdrop.
 *
 * Called first, before the grid: the grid belongs over the map, which is how
 * every table reads one. Rooms, drawings, tokens and darkness all come after.
 */
export function drawBackdrop(ctx, w2s) {
  const im = state.image;
  if (!im) return;
  const url = urlForImage(im);
  if (!url) return;
  const img = imageFor(url);
  if (!img) return;

  const r = backdropRect(im);
  const a = w2s(r.x, r.y);
  const z = state.cam.z;
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, a.x, a.y, r.w * z, r.h * z);
  ctx.restore();
}

/* ---- grabbing it ----

   A map you cannot touch is a map you cannot fix, and the scene cog is three
   clicks and a furled bar away from the thing you just dropped. So the
   backdrop is grabbable on the map itself, like everything else is.

   It is grabbable only while the Map layer is visible and unlocked — which
   reuses the lock already sitting in the Layers panel rather than inventing a
   second one, and means a narrator drawing over a finished map does not keep
   picking the map up by accident. */

export function backdropLayer() {
  return state.layers.find(l => l.type === 'map') || null;
}

export function backdropGrabbable() {
  const im = state.image;
  if (!im) return false;
  const L = backdropLayer();
  return !!L && L.visible && !L.locked;
}

/** Is this world point on the map? */
export function backdropAt(wx, wy) {
  if (!backdropGrabbable()) return false;
  const r = backdropRect(state.image);
  return wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h;
}

/* The four corners, in screen space, for the resize handles. Corners rather
   than edges: a map is resized by its aspect ratio, never squashed, so one
   handle per corner says everything there is to say. */
export const HANDLE = 7;

export function backdropCorners(w2s) {
  const r = backdropRect(state.image);
  const a = w2s(r.x, r.y);
  const b = w2s(r.x + r.w, r.y + r.h);
  return [
    { id: 'nw', x: a.x, y: a.y },
    { id: 'ne', x: b.x, y: a.y },
    { id: 'sw', x: a.x, y: b.y },
    { id: 'se', x: b.x, y: b.y },
  ];
}

/** Which handle is under this screen point, if any. */
export function backdropHandleAt(sx, sy, w2s) {
  if (!state.image || !ui.backdrop) return null;
  for (const c of backdropCorners(w2s)) {
    if (Math.abs(sx - c.x) <= HANDLE + 3 && Math.abs(sy - c.y) <= HANDLE + 3) return c.id;
  }
  return null;
}

/**
 * Resize by dragging a corner: the opposite corner stays put, which is what
 * every other resize handle in the world does and the only behaviour that lets
 * you pin one edge and pull the other.
 */
export function scaleFromCorner(im, corner, wx, wy) {
  const r = backdropRect(im);
  const anchor = {
    nw: { x: r.x + r.w, y: r.y + r.h },
    ne: { x: r.x, y: r.y + r.h },
    sw: { x: r.x + r.w, y: r.y },
    se: { x: r.x, y: r.y },
  }[corner];
  if (!anchor) return im;

  /* One scale for both sides — a squashed battlemap is a broken one. The
     longer of the two drags wins, so it follows the pointer. */
  const wantW = Math.abs(wx - anchor.x);
  const wantH = Math.abs(wy - anchor.y);
  const base = Math.max(im.w || 1, 1), baseH = Math.max(im.h || 1, 1);
  const scale = Math.max(.02, Math.min(40, Math.max(wantW / base, wantH / baseH)));

  const w = base * scale, h = baseH * scale;
  return {
    ...im,
    scale,
    x: corner === 'nw' || corner === 'sw' ? anchor.x - w : anchor.x,
    y: corner === 'nw' || corner === 'ne' ? anchor.y - h : anchor.y,
  };
}

/** The dashed box and its corners, drawn over the map when it is selected. */
export function drawBackdropSelection(ctx, w2s, palette) {
  if (!ui.backdrop || !state.image) return;
  const r = backdropRect(state.image);
  const a = w2s(r.x, r.y);
  const b = w2s(r.x + r.w, r.y + r.h);
  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.setLineDash([]);
  for (const c of backdropCorners(w2s)) {
    ctx.fillStyle = palette.label;
    ctx.fillRect(c.x - HANDLE / 2, c.y - HANDLE / 2, HANDLE, HANDLE);
    ctx.strokeRect(c.x - HANDLE / 2 + .5, c.y - HANDLE / 2 + .5, HANDLE - 1, HANDLE - 1);
  }
  ctx.restore();
}

/* ---- placing one ----

   A dropped map arrives as a picture with no idea how big a room is. The
   maths for that lives in geometry.js so the tests can reach it; what is left
   here is the one piece that needs the viewport. */

/** Sit it under the middle of what is on screen right now. */
export function centreOnView(im) {
  const z = state.cam.z;
  const cx = (view.W / 2 - state.cam.x) / z;
  const cy = (view.H / 2 - state.cam.y) / z;
  const r = backdropRect(im);
  return { ...im, x: cx - r.w / 2, y: cy - r.h / 2 };
}
