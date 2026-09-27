/* The whole table lives here. Everything in `state` is saved; `ui` and
   `computed` are transient and rebuilt from state. */

let uid = 1;
export const id = () => 'i' + (uid++);
export const peekUid = () => uid;
export const setUid = n => { uid = n; };

export function makeDefaultLayers() {
  return [
    { id: id(), name: 'Map', type: 'map', visible: true, locked: false, opacity: 1, narrator: false },
    { id: id(), name: 'Drawings', type: 'draw', visible: true, locked: false, opacity: 1, narrator: false },
    { id: id(), name: 'Tokens', type: 'token', visible: true, locked: false, opacity: 1, narrator: false },
  ];
}

/* ---- scenes ----

   A table has pages. One of them is open, and the open one's map lives at the
   top of `state` exactly where it always did — `state.items`, `state.layers`,
   `state.light` and the rest. The others sit on the shelf in `state.scenes`.

   That is deliberate. Fifty-odd modules read `state.items` directly, and
   moving the live map behind `activeScene().items` would have touched every
   one of them to buy nothing: only one map is ever being drawn. So switching
   a scene writes the live fields back to the scene that is leaving and reads
   the arriving one's over the top.

   The arrays are taken by reference, so ordinary work — pushing an item,
   flipping a layer — writes through to the scene entry with no bookkeeping.
   What does not write through is a whole-object replacement (`state.cam = {}`
   in zoom reset, for one), which is why `syncActiveScene()` exists and why it
   runs before a save and before a switch. */

export const SCENE_FIELDS = [
  'items', 'layers', 'activeLayerId', 'grid', 'cam', 'light', 'tint', 'scale', 'image',
];

export const DEFAULT_LIGHT = () => ({ enabled: true, dim: .55, cells: {}, doors: {}, nextRegion: 1 });

/** No wash at all until a narrator asks for one: amount 0 skips the pass. */
export const DEFAULT_TINT = () => ({ color: '#20304a', amount: 0 });

/* How much ground one cell covers, and what to call it.

   Five feet is the Check20 default and what a battlemap means. It is per scene
   because a scene is not always a battlemap: a city map might be 50ft to the
   cell and a world map ten miles, and a ruler that insists on five would be
   lying on both. The unit is free text so it can say whatever the table says
   — ft, m, miles, leagues — and the range bands only apply when it is feet,
   because that is the unit Check20 writes them in. */
export const DEFAULT_SCALE = () => ({ per: 5, unit: 'ft' });

export function makeScene(name = 'New scene') {
  const layers = makeDefaultLayers();
  return {
    id: id(), name,
    items: [],
    layers,
    activeLayerId: layers[layers.length - 1].id,
    /* `ink` empty means "whatever the theme says", which is what almost every
       scene wants; a colour here is for a map whose own lines fight the
       default. `weight` is how strongly it is drawn over the battlemap. */
    grid: { show: true, size: 50, ink: '', weight: 1 },
    cam: { x: 0, y: 0, z: 1 },
    light: DEFAULT_LIGHT(),
    tint: DEFAULT_TINT(),
    scale: DEFAULT_SCALE(),
    /* The backdrop: a battlemap under the grid. Firestore holds the URL, never
       the bytes — see scripts/storage.js for why. null until one is dropped. */
    image: null,               // { url, path, w, h, x, y, scale }
    thumb: '',                 // a small JPEG of how it looked when you left
    folder: '',                // '' is loose; anything else groups the strip
  };
}

/* Table-wide settings, the narrator's to set for the room. They ride along in
   the save, so a table keeps the way its narrator likes to run it. */
export const SETTING_DEFAULTS = {
  autoRollTables: false,   // roll the damage table without waiting for a click
  autoRollAt: 2,           // ...once an attack earns this many successes
  askBeforeRoll: true,     // open the tray before a roll: modifier, Advantage, damage
  groupEnemyTurns: true,   // the opposition acts as one turn, not one each
};

export const state = {
  layers: makeDefaultLayers(),
  items: [],                    // tokens, drawings, lamps
  activeLayerId: null,
  grid: { show: true, size: 50 },
  cam: { x: 0, y: 0, z: 1 },
  playerView: false,
  tool: 'select',
  drawMode: 'pencil',
  roomMode: 'add',
  snap: true,
  light: {
    enabled: true,
    dim: .55,                   // narrator-side darkness for unlit rooms
    cells: {},                  // "x,y" -> regionId
    doors: {},                  // edgeKey -> {open}
    nextRegion: 1,
  },
  tint: DEFAULT_TINT(),
  scenes: [],                   // filled at boot from the live fields
  sceneId: null,
  chat: [], journal: [], chars: [],
  narrator: { monsterBook: [], tweaks: {} },   // pinned shortlist, and monsters tuned on the fly
  settings: { ...SETTING_DEFAULTS },
  init: { list: [], turn: 0, round: 1 },
  tableName: 'Untitled Table',
};
state.activeLayerId = state.layers[state.layers.length - 1].id;   // tokens, the one you use most

/* Transient interaction state. Kept in one object so modules can share the
   live values without circular imports. */
export const ui = {
  sel: { item: null, group: [] },
  backdrop: false,       // the scene's map is selected, and has handles on it
  hover: null,            // a token being pointed at, from the map or the order
  drag: null,
  temp: null,
  measure: null,         // the ruler's open measurement: { pts, live, open }
  pins: [],              // measurements left on the map until cleared
  pings: [],
};

/* Derived caches, never saved. */
export const computed = {
  litCells: new Set(),   // "x,y" keys reachable by a light source
  rooms: [],             // [cx, cy, regionId] parsed from light.cells
  roomsDirty: true,
};

/* Layer lookup. Rebuilt at the top of every draw and light pass, which is
   cheap for a handful of layers and never goes stale. */
const layerIndex = new Map();
export function indexLayers() {
  layerIndex.clear();
  for (const l of state.layers) layerIndex.set(l.id, l);
}
export const layerById = lid => layerIndex.get(lid) ?? state.layers.find(l => l.id === lid);
export const activeLayer = () => state.layers.find(l => l.id === state.activeLayerId);

/* ---- what belongs on which layer ----

   Three kinds of layer, and a rule that keeps them apart:

     map     rooms and backdrop art
     draw    pencil, lines, shapes, labels
     token   tokens and lamps

   A token has no business on the map layer and a pencil line has none on the
   token layer: they sort differently, they light differently, and mixing them
   is how a drawing ends up under a token nobody can pick. The old types
   (narrator, objects, text, custom) are all drawing layers as far as this is
   concerned, so nothing saved before this stops working. */

export const TOKEN_KINDS = new Set(['token', 'lamp']);

/** The layer type an item of this kind wants. */
export const layerTypeFor = kind => (TOKEN_KINDS.has(kind) ? 'token' : 'draw');

/** Whether this layer will take this kind of item. */
export function layerAccepts(layer, kind) {
  if (!layer) return false;
  return TOKEN_KINDS.has(kind) ? layer.type === 'token' : layer.type !== 'token';
}

/**
 * The layer a new item of this kind should land on: the topmost visible,
 * unlocked layer that will take it. Layers are painted bottom to top, so the
 * last match in the list is the highest one.
 *
 * Falls back to any layer that would take it, then to the active layer, so
 * this can never leave the caller with nowhere to put something.
 */
export function layerForKind(kind) {
  const ok = l => layerAccepts(l, kind);
  const usable = state.layers.filter(l => ok(l) && l.visible && !l.locked);
  if (usable.length) return usable[usable.length - 1];
  const any = state.layers.filter(ok);
  if (any.length) return any[any.length - 1];
  return activeLayer() || state.layers[state.layers.length - 1] || null;
}

/** The layer type a tool works on, or null for tools that touch no layer. */
export const TOOL_LAYER = {
  token: 'token', lamp: 'token',
  draw: 'draw', rooms: 'map',
};

/* ---- reading a scene back out of a file ----

   This lived in persistence.js and hand-listed the fields it carried. It
   listed nine of them, and by the time scenes had a map, a scale and a folder
   it was listing nine of twelve — so every reload silently dropped the
   battlemap, reset the scale to five feet and lost the folders. Nothing said
   so; the table just came back slightly wrong.

   So it starts from what was saved and only touches what genuinely needs
   fixing. A field added to `makeScene` is carried from now on without anyone
   having to remember this function exists, and `SCENE_FIELDS` is walked rather
   than transcribed.

   `normalise` is passed in rather than imported: geometry.js imports this
   file, so importing it back would be a cycle. */
export function migrateScene(d, fallbackName, normalise = x => x, fixLayers = () => { }) {
  if (!d?.layers || !d?.items) throw new Error('a scene with no map');
  fixLayers(d.layers);

  const sc = makeScene(d.name || fallbackName);

  // Everything the file had, over the defaults a new scene starts with.
  for (const k of SCENE_FIELDS) if (d[k] !== undefined) sc[k] = d[k];
  sc.id = d.id || sc.id;
  sc.thumb = typeof d.thumb === 'string' ? d.thumb : '';
  sc.folder = typeof d.folder === 'string' ? d.folder.trim() : '';

  /* The rest is what a file can be wrong about, rather than merely missing.

     Items: every one is given the coordinates the move maths assumes. Strokes
     saved before they carried an anchor get one; anything with a broken
     coordinate is pulled back rather than left to turn into NaN the first time
     it is dragged. `light` items are from v1 and are dropped. */
  sc.items = d.items.filter(i => i.kind !== 'light').map(normalise);
  sc.activeLayerId = d.activeLayerId || d.layers[d.layers.length - 1].id;

  // Objects that gained fields: take the defaults, then what the file had.
  sc.grid = { show: true, size: 50, ink: '', weight: 1, ...(d.grid || {}) };
  sc.cam = { x: 0, y: 0, z: 1, ...(d.cam || {}) };
  sc.light = { ...DEFAULT_LIGHT(), ...(d.light || {}) };
  sc.tint = { ...DEFAULT_TINT(), ...(d.tint || {}) };
  sc.scale = { ...DEFAULT_SCALE(), ...(d.scale || {}) };

  // A map is a reference, never bytes; anything else in there is not one.
  sc.image = d.image && typeof d.image === 'object' && (d.image.key || d.image.url)
    ? d.image
    : null;

  return sc;
}
