# Gaslight Table

A Check20 virtual tabletop. Canvas map with room-based lighting, layers, tokens, drawing tools, dice, a party roster and the Check20 glossary.

## Picking this up in a new session

Read this first, then **Known weak points**, **Waiting on Firebase** and
**Testing**. Three things about how this project is worked on:

- **Run what can be run; do not drive the browser.** `npm run verify` checks
  every module parses and links, then runs the rules tests. Do that before
  handing anything over. No browser runs, no screenshots, no Playwright —
  clicking is the user's, and they are often away from the machine.
- **Never claim a browser behaviour you have not seen.** Anything only reasoned
  about is written, parsed and linked, not observed. Say which it is. When
  something does not work, the console error is worth more than an hour of
  reading the code — ask for it early.
- **`node --check` is not a parse check here.** It exits 0 on a broken ES
  module. Use `npm run check`, which copies to `.mjs` first and also resolves
  every named import. This cost a whole session once already.
- **This folder now lives inside the Check20 project and shares its data.**
  It was a clone with its own copies of `data/`, `scripts/`, `assets/` and the
  companion app; those were duplicates and are gone. Everything shared is read
  from the parent with `../`, so a data edit lands in one place.

### Where it sits

Done 2026-09-23. The VTT lives in the Check20 project and reads its data.

```
Rulebook Project/          the site root, published by Netlify
  data/                    shared game data
  assets/                  shared art and icons
  scripts/                 shared: firebase.js, auth-gate.js + the website's own
  companion/               the phone app, was active-sheet/
  Gaslight/                this VTT
  index.html, species.html, ...   the rulebook website
```

**What reaches outside this folder, and how.** The rule that catches people:
`fetch()` and `location.href` resolve against the *document* (`Gaslight/table.html`),
so they go up one level; `import()` resolves against the *module*
(`Gaslight/scripts/session.js`), so it goes up two.

| Where | Path | Resolves against |
|---|---|---|
| `scripts/data.js` | `'../data/'` | the page |
| `scripts/glossary.js` | `'../data/glossary.json'` | the page |
| `scripts/rooms.js` | `'../companion/active-sheet.html'` | the page |
| `scripts/session.js` | `'../../scripts/firebase.js'` | the module |
| `index.html` | `'../scripts/auth-gate.js'`, `'../scripts/firebase.js'` | the page |

`styles/*.css` and `scripts/*.js` inside this folder are plain relative links
and need nothing. The VTT references `assets/` zero times.

Netlify publishes from the repo root, so this folder deploys as it stands; no
config change was needed. The companion app's service worker precaches only its
own files with `./` and `../`, so it never sees the VTT.

Still not done, and a much bigger job: the full `check20/` layout in which the
website itself becomes `rulebook/` and the shared scripts move to `shared/`.
That touches 25 HTML pages, the service worker and Netlify. Nothing here
depends on it.

## Running it

ES modules and `fetch` need a server — the page will not work from `file://`.

- VS Code: right-click `index.html` → **Open with Live Server**

`index.html` is the lobby: choose Narrator or Player, sign in, pick a room.
`table.html` is the table itself, and still opens directly with no room and no
account for solo prep.

**Sign-in and 127.0.0.1.** Live Server serves on `127.0.0.1:5500`. Firebase
Auth only allows sign-in from its authorised domains, which include
`localhost` by default but not necessarily `127.0.0.1`. If Google sign-in
fails with `auth/unauthorized-domain`, open `http://localhost:5500/` instead,
or add `127.0.0.1` in the Firebase console under Authentication → Settings →
Authorised domains.
- or: `npx http-server -c-1 .` and open http://127.0.0.1:8080

**On a phone.** `.vscode/settings.json` sets Live Server's host to `0.0.0.0`,
so the table is reachable from the same Wi-Fi at `http://<this machine's
IP>:5500/index.html` (`ipconfig` gives the address). Restart Live Server after
changing that setting, and allow it through Windows Firewall on private
networks. Sign-in will not work from a raw IP — see above — but the table
itself opens without an account. The layout is built for a desktop; the rails
and sidebar are tight on a phone.

## Layout

Everything in this folder is the VTT's own. Nothing here is shared with another
app, and nothing here is a copy of anything.

```
index.html          the lobby: narrator or player, rooms, joining
table.html          the table
package.json        npm run verify / check / test — no dependencies
scripts/            the VTT's 62 ES modules, see below
styles/             base, topbar, subbar, stage, dock, scenes, sidebar, sheet,
                    rollcards, narrator
tests/              the rules tests, run with npm test
tools/              check-modules.mjs, the real parse and link check
```

Shared things are read from the parent: `../data/`, `../scripts/firebase.js`,
`../scripts/auth-gate.js` and `../companion/`. See **Where it sits** for the
exact paths and which ones resolve against the page rather than the module.

### Modules

Dependencies run one way, top to bottom. Nothing imports a module below it.

| Module | Holds |
|---|---|
| `dom.js` | `$` (memoised `getElementById`), `esc`, `toast` |
| `state.js` | `state` (everything that is saved), `ui` (selection, drag, pings), `computed` (caches), layer index |
| `geometry.js` | world↔screen, grid snapping, item bounds, luminance, and `moveItem`/`normaliseItem` — the only place an item's coordinates change |
| `view.js` | canvas surfaces, viewport metrics, `requestDraw()` frame scheduler |
| `lighting.js` | room regions, doors, `computeLight()` flood fill |
| `render.js` | `draw()` and everything it paints |
| `hittest.js` | picking items and doors under a point |
| `props.js` | the floating item property panel |
| `layers.js` | layers panel, new-layer modal |
| `scenes.js` | the table's pages: the model, the switch, and the bar across the top |
| `ranges.js` | Check20's range bands, parsed out of the glossary, and path distance — no DOM |
| `mapstore.js` | battlemaps in this browser's IndexedDB — the default, and the free one |
| `mappanel.js` | the Map window: the open scene's map, grid, scale, lighting and wash |
| `sync.js` | live sync: the narrator publishes the board, players follow it |
| `storage.js` | Cloud Storage: uploading a map, the limits, and why a failure is never fatal |
| `backdrop.js` | the battlemap under the grid: the decode cache, and placing one |
| `ruler.js` | the ruler tool: measuring, waypoints, pins and what the label says |
| `dock.js` | floating windows and the river they lock into — knows nothing about what is inside them |
| `toolbar.js` | top bar, sub bars, zoom |
| `tools.js` | pointer and keyboard interaction, map text entry |
| `dice.js` | `checkRoll`, `rollFormula`, `successCount` — pure maths, no DOM |
| `formulas.js` | finding the dice in game text — no DOM |
| `rollcards.js` | the chat cards for checks, attacks, raw dice, and the fight's own beats |
| `rolltray.js` | the tray that opens before a roll: modifier, Advantage, damage |
| `glossary.js` | Rules tab, hover terms, loads `data/glossary.json` |
| `chat.js` | chat log, `rollCheck` / `rollDice`, speaker list |
| `character.js` | the Check20 character model, derived values, damage, migration |
| `conditions.js` | conditions data plus the check-to-Disadvantage table |
| `sheet.js` | the character rail, and the Checks and Ref panels |
| `recovery.js` | Press On, Long Rest and the day they sit in |
| `features.js` | species, class, path and talent, and the features they grant |
| `gear.js` | carried equipment, bulk, weapon attacks, and what the token card offers |
| `reorder.js` | dragging rows into a different order — ported from the companion |
| `spells.js` | known spells, intent tiers, casting |
| `progression.js` | XP and the path and talent steps it buys |
| `stepgain.js` | the modal that asks what a step grants |
| `bio.js` | description fields, notes, species prose |
| `creator.js` | the six-step character creation wizard |
| `creation-lists.js` | trinket and equipment suggestions, lifted from `create-char.js` |
| `origins.js` | origin names and their colours, ported from the website |
| `narrator.js` | the monster book and generator windows: which sub tab each is showing |
| `monsters.js` | the monster book, the power-level maths its text needs, and the tweaks a narrator makes mid-fight |
| `generators.js` | loot, people, scenes, doors, curses and gods, ported from the website's rules |
| `settings.js` | the settings menu: theme, and the table's own options |
| `theme.js` | dark and light, including the map's two palettes |
| `notify.js` | the unread count and the toast for the rail's character |
| `roster.js` | the compact party list in the sidebar |
| `tokencard.js` | quick actions on a character's token: their weapons, any check, and the way into their sheet |
| `groupcard.js` | quick actions on a handful of tokens at once |
| `monstercard.js` | the same for a monster's token, reading from the book |
| `data.js` | cached loader for the shared `data/*.json` |
| `journal.js`, `initiative.js`, `tabs.js`, `sidebar.js` | sidebar panes and resize |
| `persistence.js` | save/load JSON, v1 migration |
| `main.js` | boot |
| `landing.js` | the lobby page |
| `rooms.js` | create, list, edit and join rooms over the website's Firebase |
| `session.js` | how the table was opened: offline, narrator or player |

All paths above are under `scripts/`.

`window.gaslight` exposes `{ state, ui, computed, draw, computeLight, requestDraw }`
for poking at a live table from the devtools console.

## How the lighting works

A room is a set of grid cells sharing a region id; overlapping rooms merge.
`computeLight()` flood-fills from every token on a visible non-narrator token
layer plus every lamp. Light spreads freely inside a region and crosses into a
neighbouring region only through an **open** door. Unlit cells get a darkness
overlay — `light.dim` for the narrator, a hard 0.97 in Player view.

## Moving things on the map

One rule: **`moveItem()` in `geometry.js` is the only code that writes an
item's coordinates.** It lives there, away from any pointer handler, so it can
be tested in Node — `tests/logic.test.mjs` covers all seven kinds.

It exists because of a bug worth remembering. A pencil stroke is a bag of
points and carried no `x`/`y` at all. `itemBounds()` works its box out from the
points, so a stroke drew and selected perfectly. But the drag did
`dx = w.x - it.x`, got `NaN`, and wrote `NaN` into every point. The drawing did
not move to the wrong place — it stopped having coordinates. It parsed, it
linked, it rendered, and it died the first time it was touched.

Three things now stand between that and a repeat:

- **`moveItem()` refuses a destination that is not a real point** and returns
  false, so a bad number cannot enter an item.
- **`normaliseItem()` gives an item the coordinates the maths assumes**, and
  `applyTable()` runs it over every item on load. A stroke saved before
  anchors existed gets one; a damaged coordinate is pulled back instead of
  spreading. Better a drawing in the wrong place than one silently gone.
- **`itemIsSane()`** is the assertion the tests use, and is there for any
  future check that wants it.

The lesson generalises: this survived because every *structural* check passed.
Parsing, linking and rendering all say nothing about whether the numbers are
numbers.

## Scenes

A table has pages. The road, the inn, the cellar under it — each is a scene,
with its own map, its own layers, its own lighting and its own camera. The bar
across the top of the stage is how you move between them.

### How the model works

The open scene's map is live at the top of `state`, exactly where it has always
been: `state.items`, `state.layers`, `state.light`, `state.grid`, `state.cam`,
`state.tint`. The other scenes sit on the shelf in `state.scenes`, and
`state.sceneId` says which one is open.

That is deliberate, and it is worth knowing why before changing it. Fifty-odd
modules read `state.items` directly. Moving the live map behind
`activeScene().items` would have touched every one of them to buy nothing —
only one map is ever being drawn. So switching writes the live fields back to
the scene that is leaving and reads the arriving one's over the top.

The arrays are taken by reference, so ordinary work — pushing an item, flipping
a layer's visibility, dragging a token — writes through to the scene entry with
no bookkeeping at all. What does **not** write through is replacing a whole
object, and there is one of those in the app: `zoomReset` does
`state.cam = { x: 0, y: 0, z: 1 }`. That is what `syncActiveScene()` is for,
and why it runs before a save and before every switch.

**`SCENE_FIELDS` in `state.js` is the whole risk.** A field added to a scene and
left out of that list looks fine — the reference sharing hides it — and then
goes wrong on the first switch, quietly, by carrying one page's setting onto
another. There is a test that fails if the list and `makeScene()` disagree.

### What a scene carries

| Field | |
|---|---|
| `items`, `layers`, `activeLayerId` | the map itself |
| `grid` | size and whether it shows: a battlemap and a world map are not the same scale |
| `cam` | where you were looking when you left |
| `light` | `enabled`, `dim`, the room cells and the doors |
| `tint` | a colour wash, `{ color, amount }` |
| `name`, `thumb` | what it is called and what it looked like |

### Folders

A campaign that runs long ends up with thirty pages, and thirty cards in a row
is not a strip, it is a filing problem.

**Drag one scene onto another and they become a folder** — the same interaction
as the website's session board in `scripts/worldgen.js`, and the same one
Roll20 uses. Drop a scene on an existing folder tile and it joins. Drop it on
the strip itself and it comes back out. A folder is a tile the same size and
shape as a card, because in the strip it is the same kind of thing: something
you drop a scene on, and something you open. Its name is edited in place on the
tile; the arrow on it tips the folder out, leaving every scene loose.

Underneath it is still **a plain string on the scene** — `''` is loose, anything
else groups. There are no folder objects, no tree, and nothing to clean up when
the last scene leaves one: a folder exists exactly as long as something is filed
under it, so a save carries no empty drawers and Firebase will have no second
collection to keep in step. Dropping onto a scene that is already filed joins
*that* folder rather than nesting, which is the rule the session board uses and
the reason neither of them ever grows a tree.

Two details that are easy to get wrong:

- **Dragging a scene onto another moves it next to the one it was dropped on.**
  The two sit together from now on, so leaving the dragged card wherever it
  started would put a folder's contents in two places in the strip.
- **The settings panel is marked `draggable="false"`.** Its card is draggable,
  and a draggable ancestor eats the drag that selects text in a field.

The strip is **ten across and two deep**, then it scrolls. Fixed columns rather
than `auto-fill`, so the cards are the same size whether there are three or
thirty; seven columns under 1500px and five under 1100px. A scene's settings
hang below its card, and a scrolling strip would cut them off, so while one is
open the strip stops clipping — you are editing a page, not scrolling for one.

### The preview

The card in the bar shows the map as it looked when you last left it: the live
canvas, drawn down to 160px and kept as a JPEG at quality 0.55, which lands at
three or four kilobytes. Small enough to sit in the 2-second autosave, and
honest — it is where you were, not a render of somewhere you have never been.

It is taken when you leave a scene, when you open that scene's settings, and at
most once every six seconds otherwise. `captureThumb()` returns `''` rather than
throwing if the canvas is not up or the browser refuses the read, because a
missing preview is a grey card and a thrown error is a dead scene bar.

### The wash

A scene's colour is one `multiply` fill over the whole canvas, drawn in
`drawSceneWash()` between the walls and the darkness. The order matters:

- **Under the darkness**, because a wash is scenery and darkness is what a
  player can see. Tinting the fog would make the two arguable.
- **Under the selection, the pings and the hover plate**, because those are the
  app talking, not the room.
- **Skipped entirely at amount 0**, which is every scene until a narrator picks
  a colour.

### Known consequences

- **The order is table-wide, not per scene.** One fight at a time, and the round
  count and elapsed clock belong to the table. Switch away mid-fight and the
  turn cards still list everyone by name and roll, but `itemFor()` finds
  nothing, so they lose their wounds and their colour. They come back when you
  go back. Making the order per scene, or indexing items across scenes, is a
  decision rather than a patch.
- **Anything that walks `state.items` only sees the open scene.** That includes
  the rename loop in `session.js` that keeps a player's token named after their
  sheet. A player token on another page keeps its old name until that page is
  open. Worth fixing when the map syncs, since that pass has to walk every
  scene anyway.

## Text size

Every `font-size` in `styles/` is written as `calc(Npx * var(--fs))` — 352 of
them — so one number in `:root` scales all of them and nothing else. Widths,
padding and the map are untouched, which is the point: more readable words in
the same panel, not a zoomed page with the map blown up with it. The largest
step therefore fits fewer words on a line, and that is the trade.

Four steps in Settings → Appearance (0.9 / 1 / 1.12 / 1.26), stored per browser
in `gaslight.textsize` and applied by the inline script in each page's `<head>`
alongside the theme, so nothing reflows on boot.

**If you add a rule, write the size as `calc(Npx * var(--fs))`.** A bare `px`
will simply not scale, and nothing will tell you.

## Maps

A scene can have a battlemap under its grid. A map's bytes can come from three
places, and the scene stores only which:

| `image.src` | | |
|---|---|---|
| `local` | `key` into IndexedDB | Free, offline, no account. **The default.** |
| `cloud` | `url` + `path` in Cloud Storage | Needs Blaze billing enabled |
| `url` | someone else's link | Costs nothing, belongs to nobody |

What is **never** in `image` is the bytes, or an object URL. An object URL
belongs to one page load, so a saved table would carry a dead link. And the
bytes would go through `snapshot()` into localStorage every two seconds and
blow its five-megabyte quota — which `autosave.js` catches, warns about once,
and then goes quiet about, losing the table somewhere nobody is looking.

### Local is the default, and why

Cloud Storage needs a **Blaze** billing account; Spark cannot provision a
bucket at all. More to the point, until scenes sync there is nothing for a
shared bucket to share — the map URL lives on the scene and the scene does not
leave this laptop. Paying for a bucket whose only reader is the narrator's own
browser buys nothing.

So a dropped map goes in **IndexedDB** (`mapstore.js`). Not localStorage: that
is a string store the autosave is already filling. IndexedDB takes the Blob as
it is, has a quota in the hundreds of megabytes, and is a different bucket
entirely from the autosave.

**There is deliberately no automatic tidy-up.** A key that no open table uses
may still belong to a table saved in a file you have not loaded today, so
sweeping unused keys on boot would quietly delete maps from other campaigns. A
map is dropped when a narrator takes it off a scene, and at no other time.

A local map does not travel: open the same saved table on another machine and
`getMap(key)` returns null, so the scene shows without its map rather than
erroring. The settings panel says so rather than letting it be discovered.

### The cloud half, for when it is worth it

`storage.js` and `storage.rules` are written and unused. When scene sync lands
and Blaze is worth turning on:

1. Enable Blaze, then Storage → Get started (**the location cannot be changed
   later**).
2. Publish `storage.rules` from Storage → Rules. Until it is published every
   upload returns `storage/unauthorized`, which the uploader reports in those
   words rather than failing silently. Save the existing ruleset first — rules
   deploys are global and instant, and that copy is the rollback.

The SDK is already **vendored**: `scripts/vendor/firebase/firebase-storage.js`
is the stock 12.13.0 bundle with its one gstatic import rewritten to
`./firebase-app.js`, since the service worker only caches same-origin requests.
`firebase.js` exposes `storage`, `storageRef`, `uploadBytesResumable`,
`getDownloadURL`, `deleteObject`, `listAll` and `getMetadata` on `window.__arc`.

The rules enforce size (12MB maps, 3MB token art), content type — without which
it is a free file host for anyone with an account — and
`metadata.uploader == request.auth.uid` on write and delete. Reads are open to
any signed-in account, the same as the room document, because membership is not
modelled yet; see the Stage 2 note atop `firestore.rules`.

### Grabbing one

**Click the map to select it**, the same as anything else on the table. A
dashed box and four corner handles appear, and the **Map window** opens on the
left, where every control for it lives.

- **Drag the body** to move it.
- **Drag a corner** to resize. The opposite corner stays put, and one scale
  drives both sides — a squashed battlemap is a broken one.
- **Delete** removes it. **Escape** deselects, and does that before it clears
  the token selection.

It is grabbable only while the **Map layer is visible and unlocked**. That
reuses the lock already sitting in the Layers panel rather than inventing a
second one, and it is how you stop picking the map up by accident once you are
drawing over it — the card's Lock button sets that same layer lock.

The controls first lived only in the scene cog — behind a furled bar, a card
and a scroll — so a map you had just dropped was a map you could not touch.
Then they lived in a floating card, which was too narrow and wrapped `80 cells`
to one letter a line. They are in the Map window now, with the grid, the scale,
the lighting and the wash, because those are all the same question: **how does
the open scene look.** A scene you are not looking at offers none of them, for
the reason that decided it — you cannot judge a colour wash on a page you
cannot see.

### Placing one

Drop an image anywhere on the table, or use the scene cog. It arrives **forty
cells wide and centred on the view**, because a 4000px image is eighty cells of
nothing in particular and "a room" is something a narrator can adjust. Size
steps, 20/40/80-cell fits and nudge buttons follow.

Resizing happens **about the map's centre**, so a map nudged into alignment
with the table's grid stays aligned when it is resized. Growing from the
top-left would walk it away every time. That maths lives in `geometry.js`
rather than with the drawing, because it is arithmetic with no canvas in it and
arithmetic that puts a map in the wrong place is worth a test — there are
twenty of them.

### CORS, and the previews

Images load with `crossOrigin = 'anonymous'`. This is **not optional**: the
scene preview draws the canvas to a data URL, and a tainted canvas refuses, so
one map could silently kill every thumbnail on the table.

Blob URLs and Storage both allow it. Someone else's host may not, and an image
that fails that way is retried **without** the flag rather than not shown — a
map you can see with no preview beats no map. The scene is marked, and its
settings panel says the preview has stopped updating and that the map is fine.
Other scenes' previews are unaffected.

## A scene's own scale

One cell is five feet by default — the Check20 number, and what a battlemap
means. But a scene is not always a battlemap: a town map might be fifty feet to
the cell and a world map ten miles, and a ruler that insisted on five would be
lying on both.

So a scene carries `scale: { per, unit }`, set in its cog by a number and a
free-text unit, with presets for Battlemap / Building / Town / Region / World.
The ruler reads it, and so does the movement line.

**The range bands only apply in feet.** Melee, Reach, Short, Medium and Long
are written in feet in the glossary, so on a world map measured in miles the
ruler says how far and stops there rather than claiming "Short range". The same
goes for the movement comparison, which would otherwise be measuring a
character's 35 feet against a hundred miles.

## Windows, and the river

Initiative and Layers were two panels nailed to two corners. The monster book
and the generators were a slide-out rail that covered half the map and could
only ever show one of them. Four narrator tools, three ways of behaving, and no
way to have the book open beside the order.

They are all one thing now. A window has a head that **drags** it, **folds** it
to a single line, and **closes** it. The **river** is the column down the left
edge of the map: drop a window on it and it locks into the stack, drag it off
and it floats where you left it. The river shows itself only while it is
holding something or while a window is being dragged at it — an empty gutter
down the side of a map is just lost map.

`dock.js` does not know what is inside a window. It takes a list of
`{ key, title, icon, elId, bodyId, render, ensure, narratorOnly }` and
`main.js` is the only place that says which panel is which — so the monster book
keeps living in `monsters.js` and the dock never grows an import of it.

- **`render`** fills the body when the window opens, and whenever something
  inside it changes. **`ensure`** is for a panel whose data loads lazily: it
  returns a promise and the window renders again when it settles.
- **`narratorOnly`** hides a window from a player outright. Initiative is *not*
  narrator-only — whose turn it is belongs to the table.
- **Layout is per browser** (`gaslight.windows` in localStorage), not part of
  the table. Which corner you like your initiative in is about your screen, not
  about the campaign.
- **Drag is measured from where the pointer went down**, not per-event
  movement: a slow drag reports a run of sub-pixel moves and would never start.
  A window only leaves the river once it has actually moved 3px, so a click on
  the head folds it rather than undocking it.

## The tool rail

- **Select and Pan are one control**, two halves of an oval. They answer the
  same question — what does a drag do — so they read as one switch rather than
  two buttons that happen to be adjacent. The lit half has its
  `box-shadow: inset 0 0 0 1px` cleared: `.tool.on` in the top bar draws that
  ring on the element's own radius, which is square here, so it put a
  rounded-square outline inside a stadium and `overflow: hidden` clipped its
  corners off. The pill is the frame; the lit half only fills it.
- **The building tools are behind a hammer**, not a plus. A plus says “add one
  more of whatever is here”; these are the tools that build the map.
- **The building tools fold away.** Token, Draw, Rooms, Lamp and Erase live
  behind one button, because a narrator running a fight is not reaching for the
  room builder and five live buttons made it look like they were. The fold
  opens itself when a build tool is chosen by its keyboard shortcut, and its
  button lights while one of them is live — so a shut rail never claims you are
  in Select when the map is in Erase. Remembered per browser.
- **Below the rule, the four window switches.** A lit button is an open window;
  clicking a lit one whose window is folded away unfolds it rather than closing
  something you cannot see.

## Layers

Three types, and a rule that keeps them apart:

| Type | Holds |
|---|---|
| `map` | rooms and backdrop art, under everything |
| `draw` | pencil, lines, shapes, labels |
| `token` | tokens and lamps |

**Tokens go on token layers; everything else goes anywhere but.** They sort
differently and light differently, and mixing them is how a drawing ends up
under a token nobody can pick.

`layerForKind()` in `state.js` answers where a new item lands: the **topmost**
visible, unlocked layer that will take it — topmost because layers paint bottom
to top, so the last match in the list is the highest. Choosing a tool moves the
active layer to the one it works on, so Token cannot drop a token onto the map
layer by accident. Select and Pan touch no layer and leave the choice alone.

Older tables used `narrator`, `objects`, `text` and `custom`. All of them count
as drawing layers, so nothing saved before this stops working.

## Rendering notes

- Nothing calls `draw()` directly. Handlers call `requestDraw()`, which paints
  at most once per animation frame however many changes land in between. While
  something is pulsing, the loop in `view.js` paints every frame instead; see
  **The animation loop**.
- **Glows are painted under the token**, before its own circle, so they read as
  light coming off it rather than a ring drawn over it.
- **The hover plate is drawn last**, after every layer and after the darkness
  mask. Inside the layer loop a token on a higher layer painted over it, and
  the fog dimmed it — at `fogAlphaPlayer` 0.97 it was invisible in player view.
  It flips below the token when there is no room above, since a token near the
  top edge is exactly when you want to read it. A pulse that beats
  twice a second reads as an alarm; these are nearer two seconds, because a map
  with a fight on it is busy enough.
- Room cells are parsed once into `computed.rooms` and rebuilt only when the
  cell map changes (`invalidateRooms()`). Call it if you mutate
  `state.light.cells` directly.
- Items outside the viewport are skipped before any canvas work.
- The darkness mask is composited from one cached offscreen canvas.
- **A stroke's bounding box is cached** in a `WeakMap` in `geometry.js`. The
  cull asks for every item's box once per frame, and a stroke's box means
  walking all of its points — the single most expensive thing the renderer does
  on a map with a few hundred drawings. Measured over 60 frames: 2000 strokes of
  140 points each cost 10.0 ms/frame walking, 6.5 ms cached. A move shifts the
  cached box by the same delta rather than dropping it, since every point moved
  by the same amount. Call `invalidateBounds()` if you change a stroke's points
  any other way.
- **Where it gets heavy.** That measurement is maths only — no canvas calls, no
  GPU — so treat it as a floor, not a budget. Several hundred strokes is
  comfortable; a few thousand is not. If it ever needs to go further, the next
  step is baking finished drawings onto an offscreen canvas per layer and
  redrawing that one image, rather than replaying every point every frame.

## Saving

`Save` downloads the whole `state` as JSON, minus the current tool selection.
`snapshot()` calls `syncActiveScene()` first, so the file never carries a stale
copy of the page you are looking at.

`Load` takes both shapes a file can arrive in. A table saved since scenes
carries `scenes[]`; anything older is one map at the top level and becomes a
one-page table, so neither is a special case downstream. `migrateScene()` runs
per page either way: layers gain `type`/`narrator`, strokes gain their anchor,
v1 `light` items are dropped, and the id ceiling is computed across **every**
scene — or a new item on page one could be handed an id page three is already
using. D&D-style characters still become Check20 shells.

## Roadmap

Phases renumbered 2026-09-22: the sheet came first, then the narrator's tools,
then everything that makes it play, then the map itself, and going live last.

- [x] **Phase 0 — Foundations.** Resizable sidebar, shared data loader, Check20
      character model with migration from the v1 and shell shapes.
- [x] **Phase 1 — Checks, health, conditions.** The sheet lives in a map-side
      rail; the Party tab is a roster; a character token opens a quick card.
- [x] **Phase 2 — Roll cards.** Dice trays, crit and fumble tags, successes,
      Provoke, damage beside the attack, and the damage-table roll a hit earns.
      Messages use the website's field names so Phase 7 can bridge them.
- [x] **Phase 3 — The character sheet.** Species, class, path and talent;
      gear that moves checks and armour; spells by intent tier; XP and unlocks;
      bio; reference. Plus guided creation, ported from `create-char.js`.
- [x] **Phase 4 — Narrator.** The narrator's own rail, mirroring the character
      rail on the left edge of the map.
      - [x] **Monster book.** All 99 monsters: search by name, group or
            environment, filter by group, power level band and environment, and
            pin the ones you need tonight. A stat block carries checks,
            movement, both attacks (rollable), features, spells and lore.
      - [x] **Adjustable monsters.** Power level, both checks, damage
            formulas and which check an attack rolls against, all editable on
            the card and saved with the table. Physical and Mental share the
            power level as one budget, the way the book writes them.
      - [x] **Generators.** Loot by power level, people, scenes, doors with
            locks and traps, curses and diseases, and gods. The rules are the
            website's, ported from `scripts/worldgen.js` and the loot roller
            in `scripts/narrator.js`.
      - [x] **Handouts.** Anything written on a monster, and any journal
            entry, can be sent to the chat log, where it is saved with the
            table and keeps its rollable formulas. A generated NPC, haul or
            scene can also be filed in the journal with Keep, written up
            there, and handed out later.
- [ ] **Phase 5 — Functionality.** The play layer that ties it together.
      *Scope still to pin down.* Started with the combat loop:
      - [x] **Monster tokens have a card**: what it has taken, its attacks at
            the tweaked numbers, a way into the book, and a roll into the order.
      - [x] **Initiative tracks the fight**: a column of turn cards, each tied
            to a character or a token, showing its colour, its wounds or the
            damage it has taken, and its roll. Clicking one brings the view to
            it, hovering one rings it on the map, and the order counts rounds.
            A box round several tokens opens the **group card**, which rolls
            them all into the order at once — characters on Agility, monsters
            on their Physical check — and also puts the same damage through all
            of them, sets or clears a condition on all of them, or deletes
            them. One token still opens its own card; the selection is the
            thing you just made, so it is what the card is about. The header carries how long the fight has taken
            at **ten seconds a round**, the same rule as the companion's
            `encTime`, with a test asserting the two agree.
      - [x] **Ending a turn.** The active card offers Prone, Cover and End
            turn. Prone is a real Check20 condition and goes on the sheet.
            **Cover is not in `conditions.json`**, so it is a flag on the token
            and draws as a shield arc across its lower edge — inventing a
            condition would have put it in the condition picker, in the
            clearing rules and in Press On, all of which would be lying.
      - [x] **Rests and recovery.** Press On a set number of times a day
            (class resource, mana, armour repaired for a roll plus Crafting,
            wounds healed for a roll), a once-a-day Long Rest that fills
            everything and clears conditions, and Reset Day. The rules are the
            companion app's, so a phone and a laptop at one table agree.
            `recovery.js`.
      - [ ] The rest of the day-to-day actions a session needs.
- [ ] **Phase 6 — Tokens.** The token as a thing you read at a glance and act
      on, rather than a coloured circle with a name under it. Done so far:
      - [x] **Health rings.** A ring around the token, green to red as it
            empties. A monster carries `hpMax`/`taken` on the item; a character
            reads `res.hp` from the sheet, so the ring follows damage applied
            anywhere.
      - [x] **Wounds from the power level.** A monster token is dropped with
            `hpMax = PL x PL`; the card's max field still overrides it.
      - [x] **Marks.** A shape, an emoji or initials, reached from the Style
            button on either card.
      - [x] **Condition pips**, coloured by category — Corpus red, Cognition
            blue, Special yellow, Major black — reading straight from
            `data/conditions.json`. Conditions are added and searched from
            either card, grouped the same way.
      - [ ] Condition animations: a bleeding token drips, Invisible and
            Intangible get a ghost outline, and so on. The pips already know
            the category, so this hangs off the same data.
      - [ ] A token settings menu, for anything with more than a button's worth
            of options: view distance, vision type, what a token can interact
            with.
      - [ ] A card for a plain token. A custom token gets Style and nothing
            else: no wounds, armour, checks or attacks. `hpMax`, `taken`,
            `armor` and `conditions` already work on any item, so what is
            missing is the card and somewhere to put two checks and an attack.
      - [x] **Measurement.** A ruler tool with snapping, waypoints, pinned
            lines, Check20's range bands read out of the glossary, and a
            comparison against the selected character's movement. See
            **The ruler**.
      - [ ] Targeting: picking a target from an attack, with the range band
            checked against what the weapon or spell is written for.
      - [ ] A note that rides on a token, and a dot when it has one.
      - [ ] Token art: an image per token, and where the file lives.
- [x] **Phase 6.5 — Scenes and the window system.** A table has pages, and the
      narrator's panels stopped being four different kinds of thing.
      - [x] **Scenes.** Per-page map, layers, grid, camera, lighting and colour
            wash, with a preview strip across the top of the stage and
            per-scene settings behind the cog. See **Scenes**.
      - [x] **Windows and the river.** Initiative, Layers, the monster book and
            the generators are one kind of thing: drag, fold to a line, dock or
            float. See **Windows, and the river**.
      - [x] **The tool rail regrouped.** Select and Pan as one control, the
            building tools folded away, the window switches below the rule.
      - [ ] An image per scene: a battlemap dropped on the map layer. Needs
            Firebase Storage — the bucket is configured
            (`check20-77406.firebasestorage.app`) but the Storage SDK is
            imported nowhere in the project, and a base64 map in the 2-second
            localStorage autosave would blow the quota. `autosave.js` catches
            that, warns to the console once, and then goes silent.
### The animation loop — done, and how to use it

`view.js` has one rAF loop that runs only while something wants it:

```js
animate(true)   // something on screen is moving
animate(false)  // it stopped
clock()         // seconds since the loop started, shared by everything
```

`animating()` says whether it is running. The count is balanced by callers, so
**every `animate(true)` needs its `animate(false)`.** The renderer holds
exactly one claim and flips it in `wantAnimation()` at the end of each frame,
which is the pattern to copy: work out whether anything wants to move this
frame, then ask for or release the loop once.

`clock()` matters more than it looks. Two pulses that each kept their own
start time would drift apart within a minute; one clock keeps every glow on the
map breathing together.

## Next: a shared room, without a bill

**Decided 2026-09-27: free is the requirement, not the preference.** *"Not
paying is always better, especially in the long run."* So Blaze billing is off
the table as a dependency. `storage.js` and `storage.rules` stay written and
idle — an option for someone else's deployment, never a thing this one needs.

Two things are already settled and should not be reopened:

- **Players see the same image the narrator dropped, at the quality it was
  dropped at.** Downscaling to afford postage is not on.
- **A local-only map is useless.** A map only the narrator sees is a notepad.

### The plan, in order

Each step is worth doing on its own, and each makes the next one smaller.

**1. Player-side cache.** Whatever carries the bytes, a player keeps what they
receive in their own IndexedDB, keyed by a hash of the content. A map then
transfers **once per player, ever**: a reconnect costs nothing, a second
session costs nothing, and a narrator dropping for a moment does not blank
anyone's screen. `mapstore.js` already does this job for the narrator; the
player side is the same store with a hash for a key.

*This is the failsafe, and it is first because it makes every later step
cheaper and is the thing that survives whichever transport wins.*

**2. Scene sync.** A map cannot reach a player until the scene does. The
field-ownership table under **Firebase rooms** has map state marked *"new;
needs its own subcollection"* and that is still the gap. Everything else —
chat, encounter, players — already syncs; scenes are the missing row.

*Nothing about maps is testable at a table until this exists, so it comes
before either transport.*

**3. Chunked Firestore, full quality.** A document caps at 1MB and base64
inflates by a third, so a 3MB map is five or six documents under
`rooms/{code}/maps/{sceneId}/`. **No downscaling** — chunking carries full
quality, in pieces. Spark allows 1GiB stored, 10GiB/month egress and 50K reads
a day; six chunks read by five players is thirty reads. `firestore.rules`
already governs that path, so there is no new rules file and no new product.

*Cost: nothing. Limit: about 340 maps at 3MB before the 1GiB runs out, and a
few seconds to load one the first time — which step 1 makes a once-ever cost.*

**4. Pre-load the next scene.** With 1 and 3, a scene's map is already in the
player's browser before the narrator switches to it, and the switch is
instant. This is what makes chunked transfer feel like no transfer at all, and
it is why step 3 does not need to be fast.

**5. WebRTC, if and when 3 runs out.** The narrator as host, a data channel per
player, signalled through Firestore. Free at any scale and any quality, and the
right end state for a system that never wants a bill. Two honest catches:
**TURN** — about one connection in six fails NAT traversal and needs relaying,
which is the one part that costs money or a server — and the narrator must be
online, though step 1 means a drop is survivable.

*Do not start here.* It is the hardest part, and 1 through 4 make it optional
rather than urgent.

### What this buys, and what it does not

At one table: free, full quality, works offline for the narrator, survives a
dropped connection. At ten tables: still free. Past about forty tables the
1GiB of Firestore storage is the wall, and that is when step 5 stops being
optional — or when a map gets a "shared by link" path that keeps big art out
of the database entirely.

## Open question: more than one image

**Raised 2026-09-27. Not decided.** Asked: *"how do we handle multiple images?
What about custom token images, or map additions, or multiple maps on the same
page?"*

Today a scene has exactly one `image`, and it is a field on the scene rather
than a thing on the map. That was the right shape for "a battlemap under the
grid" and it is the wrong shape for everything else being asked for:

- **A second map on the same page** — two rooms side by side on one canvas.
- **Map additions** — a rug, a table, a door, dropped on top of the backdrop.
- **Token art** — an image as a token's face, which is a different thing again:
  it belongs to the character, not the scene, and should follow them between
  tables.

The shape that covers the first two is **an image is an item**, with
`kind: 'image'`, living on a layer like everything else, with the existing
selection, z-order, lock and visibility for free. The scene's `image` field
then becomes shorthand for "the image on the map layer, at the bottom", or goes
away entirely.

That is a bigger change than it looks, and it lands directly on top of the
layers question below — **read the two together**, because if images become
items then "which layer am I on" gets asked several more times a session, and
whatever fixes that has to fix this too.

Token art is separate and simpler: it is a field on the character, stored per
account rather than per table, which is what the `users/{uid}/tokens/` path in
`storage.rules` is already reserved for.

## Open question: layers are in the way

**Raised 2026-09-26. Not decided. Do not build any of this yet.**

The symptom, in the narrator's words: *"it's becoming bothersome switching
between them."* Dropping a map, then moving a token, then drawing a line means
three trips to the Layers panel, and picking the wrong layer fails quietly —
the click lands on nothing and it is not obvious why.

### Why it is like this

Layers were built to answer a different question: **what draws on top of what,
and what can players see.** That is a real question and the current model
answers it well. Three types, enforced at creation:

| | |
|---|---|
| `map` | rooms and backdrop art, under everything |
| `draw` | pencil, lines, shapes, labels |
| `token` | tokens and lamps |

`layerForKind()` already sends a new item to the right one automatically, and
`TOOL_LAYER` already makes picking a tool select its layer. So **creating**
things mostly works without thinking about layers at all.

The pain is in **selecting and moving** things that already exist, where the
active layer is a filter you have to remember to change. The backdrop makes it
worse: it is not on a layer at all, it just borrows the Map layer's lock.

### The options, as they look now

**A. One layer, different interactions.** Everything lives together; what you
grab is decided by what is under the pointer and a precedence order (handles →
tokens → drawings → backdrop). New layers become an opt-in thing for people who
want them.
*For:* nothing to switch, which is the actual complaint.
*Against:* throws away per-kind visibility and the narrator-only flag, which
are load-bearing — a narrator-only drawing layer is how secrets stay secret.

**B. Keep the layers, drop the filter.** Layers keep doing z-order and
visibility, but Select picks from every visible unlocked layer rather than only
the active one, with precedence deciding ties. The active layer only decides
where **new** things land, which it already does.
*For:* the switching stops, nothing is lost, and it is a change to `pick()` and
one branch in `tools.js` rather than a rewrite.
*Against:* clicking a drawing under a token becomes harder; needs an Alt-click
or a repeated-click cycle to reach what is underneath.

**C. Kind toggles instead of layer rows.** Four switches — Maps, Rooms,
Drawings, Tokens — that say what is *grabbable* right now, independent of
z-order. Layers stay for visibility and secrecy.
*For:* says out loud what the active layer means implicitly today.
*Against:* a second mental model alongside layers, which may be worse than one
bad model.

**D. Leave it, fix discoverability.** Show the active layer somewhere you are
already looking, and say why a click found nothing ("Barkus is on Tokens,
which is not the active layer").
*For:* cheapest by far, and the current model is not wrong.
*Against:* does not fix the complaint, only explains it.

### What to settle before building

1. Does a **backdrop** become a real item on the Map layer, or stay a scene
   field? Making it an item would fold it into whatever selection model wins
   and remove the special case, but scenes would then need a way to say "this
   item is the backdrop".
2. Is the narrator-only flag **per layer** or per item? B and C keep it per
   layer; A needs it per item.
3. What does **Alt-click** do? If Select reaches every layer, something has to
   reach what is underneath.
4. Does any of this change what a **player** can grab? It must not: the rule
   is their own token and nothing else.

My reading is that **B** is the strongest — it fixes the stated problem, keeps
what layers are actually good at, and is small. But it is not decided, and
the map-tools placement below is worth settling first because it may change
how much any of this matters.

### Related, and smaller

- **Map tools belong on the left, near Layers.** Asked for on 2026-09-26. The
  backdrop card is anchored to the map, which is right for nudging, but there
  is no home for "the maps on this scene" beside the panel that governs what
  draws over them.

### Where today left it, 2026-09-27

**Done this session**

- Scenes keep their maps across a reload. The scene reader hand-listed the
  fields it carried, so every refresh dropped the battlemap, reset the scale to
  5ft and lost the folders. It walks `SCENE_FIELDS` now, and sixty-odd
  assertions fail if a field is ever dropped again.
- Clicking works. `w2s` was used in `tools.js` without being imported, which
  threw on the first pointerdown and killed every click in the app.
- `npm run check` grew two passes: a name used but never imported, and a name
  imported but never used. The first had taken the whole app down twice.
- The **Map window** on the left holds everything about how the open scene
  looks. The scene cog names and files a scene and nothing else — you cannot
  judge a colour wash on a page you are not looking at.
- Grid: a colour picker and a strength slider, per scene. Out of the top bar.
- Distance: a number and a free-text unit with a list of the common ones. The
  named presets are gone; they were a second way to say the same thing.
- Lighting: on or off. The narrator's Dim is gone, because it only ever changed
  what the narrator saw and tuning a number the table does not share is a
  setting pretending to be a rule.
- Save and Load moved into the settings menu.

**Open questions, in the order they should be answered**

1. **A shared room without a bill** — planned above, five steps, start with the
   player-side cache. This is the next build.
2. **More than one image.** An image should probably be an item on a layer.
   Read with 3.
3. **Layers are in the way.** Option B — keep layers for z-order and
   visibility, stop using the active layer as a selection filter.
4. **Bounds, and what lighting should be.** The largest. Two rules questions
   are the narrator's to answer before any code: is Observation a distance in
   feet, a band, or a multiplier? And is there a dim ring beyond the bright
   radius?
5. **Grid align**, two-point calibration for a dropped map. Small,
   self-contained, and the biggest quality-of-life win still unbuilt.

**Still true, still flagged:** Gaslight has never been committed to git.

### Backlog, 2026-09-23

Grouped by what they cost, not by how much they are wanted.

**Self-contained — a session each, no new machinery**

- [x] **What a step grants.** Buying a step asks: +1 to a check (capped at 15),
      +1 Mana, or +1 Class Resource. The choice is stored against the step, so
      giving the step back takes the grant with it — nothing to undo. Step 0 is
      the path itself: granted, free, grants nothing. `stepgain.js`.
- [ ] **Progression grouping.** Unlocks and XP want to be separate sections
      rather than one column.
- [ ] **Undo.** `Ctrl+Z` for an erase, a move, a delete. Wants a small ring
      buffer of inverse actions in `state`; the tricky part is deciding what
      counts as one action (a drag is many pointermoves).
- [ ] **Chat reactions.** The companion already has them in `chat-cards.js`,
      including the delegated click handling, so this is a port rather than a
      design.
- [x] **Token hover.** The token grows 12% under the pointer and a plate above
      it reads its wounds, armour and conditions. A narrator sees numbers; a
      player sees the same facts in words — "Badly hurt", "Armoured" — because
      knowing a Brute has 61 of 200 left is knowing the narrator's notes, while
      seeing that it is badly hurt is just looking at it. The wording ladder
      shares `HURT_AT` with the glow, so the two can never disagree.
- [ ] **Drop shadow, and a flying look.** A shadow offset under a token reads
      as height. Whether flying is a layer or a per-token flag is the real
      question: a flag travels with the token, a layer sorts and lights as a
      group.

**Needs the frame loop above**

- [x] **Badly wounded glow.** A red pulse under any token at or below a third
      of its wounds, monster or character. `HURT_AT` in `render.js`.
- [x] **Turn marker.** A gold pulse under whoever is up, the view brought to
      them, a toast, and the chat line it always had. Hovering a chip in the
      initiative strip rings its token with a steady dashed outline — steady
      rather than pulsing, so it reads as "this one" instead of competing with
      the turn marker.
- [ ] **Condition animations.** Bleeding drips, Prone flattens, Invisible and
      Intangible get a ghost outline. The pips already carry the category, so
      the hook exists.


**Structural — decide the model before writing any of it**

- [ ] **Layer typing.** Map and room objects locked to map layers, tokens to
      token layers, neither allowed on the other. Layers already carry a
      `type`; nothing enforces it. This also fixes the hit-test bug below.
- [ ] **Room layering and transitions.** Moving between levels of a building.
      Depends on layer typing, and probably on map pages.
- [ ] **Minor dynamic lighting.** Flicker on lamps, light that falls off with
      distance rather than filling a region evenly. The flood fill is
      per-region and binary today, so this is a change to `computeLight()`, not
      a coat of paint.

- [ ] **Phase 6b — The map, layers and dynamics.** The canvas itself: what
      layers are for, what can be locked or hidden, and how a map is built.
      - [ ] **Several maps, not one playspace.** A table needs pages: the inn,
            the cellar, the road. Each is its own items, light cells, doors and
            camera, with the chat, journal, party and initiative shared across
            all of them. `state` holds one map's worth of those today, so this
            is a state reshape before it is a UI — and it should land before
            Phase 7, since the sync model has to know what a page is.
      - [ ] Layer behaviour: `hitTest` ignores visibility today, so a token on
            a hidden layer is invisible but still clickable.
      - [ ] Map art, or stay with drawn rooms and lighting?
      - [ ] Pictures in the journal only, with drawing on top of them?
      - [ ] Hosting a local image to everyone needs Phase 7, since the file has
            to reach other people somehow.
- [ ] **Phase 7 — Live on Firebase.** *On hold until the build is done.* The
      lobby, rooms and player joining are built (see **The lobby**). Still to
      come: the map syncing to players, a player's sheet writing back, and a
      first run against the real database and its rules.

## Waiting on Firebase

These are wanted, and none of them can work properly until Phase 7, because
each one is really "one person's screen changes something on another person's
screen". Building them offline first would mean building them twice.

- **Giving an item to a player.** Loot rolled by the narrator landing in a
  player's gear, on their sheet, on their device.
- **Party gold.** One purse the whole table sees change. Offline it would just
  be a number on the narrator's screen, which is what a notepad already does.
- **Players trading items** between themselves.
- **Handouts reaching player screens.** Send posts to the chat log, which is
  the right plumbing — it is saved with the table and uses the website's field
  names — but today only this browser sees it.
- **Journal entries shared with the party**, with per-entry visibility so the
  narrator keeps their own notes private.
- **Player notes syncing.** The notes model is in place; the sync is not.

The one piece worth building offline first is **visibility** — marking a
journal entry or a handout as the narrator's or the party's. That is a field on
the entry, it costs nothing now, and Phase 7 then only has to honour it.

## Known weak points

Found in an audit on 2026-09-22, and left alone deliberately — each needs a
decision rather than a patch.

- **The chat log has no ceiling.** `state.chat` only grows. The two costs it
  caused are handled: the log now builds only its last 150 messages into the
  page, with a button for the rest (`paintLog()` in `chat.js`), and autosave
  backs off to one check every 16 seconds while nothing changes. What is left
  is the size of the saved file itself, which needs a policy — archive, cap or
  leave it — rather than a patch.
- **One post hook, first come.** `setPostHook` in `chat.js` holds a single
  callback, used by the damage tables' auto-roll. A second module wanting one
  would silently replace it. Make it a list when there is a second caller.
- **`hitTest` ignores layer visibility.** A token on a hidden layer is invisible
  but still clickable. Layer *type* is now enforced at creation (see **Layers**),
  but the hit test still does not care what it picks.
- **`$()` memoises by id.** Anything fetched that way must live in the page's
  own markup, never inside an `innerHTML` a module rebuilds, or the cache hands
  back a node that is no longer in the document. One instance of this was fixed
  (`rbName`); the trap is worth remembering.
- **Two monsters break the power-level invariant.** Skeleton and Ice Elemental
  are written 6/6 at PL 6, where every other monster's checks sum to its PL.
  The book is shown as written until something is adjusted; fixing the data is
  the real answer.
- **What a player may read.** Three places have to stay in step, and **Player
  view counts as the fourth**: a preview that shows more than a player sees is
  not previewing anything, so every one of these checks
  `isPlayerMode() || state.playerView`. The hover plate shows a player their
  own character's numbers and **no other token's health at all** — not the number and not a word for it, because how
  hurt the Brute is is the narrator's to tell them. The initiative turn cards
  follow the same rule, since the order is on screen for everyone and a wound
  count there would hand out exactly what the hover refuses. Conditions stay
  visible on every token: they are already pips on the token, and hiding the
  words while showing the dots would only be coy.
- **Players can read the narrator's journal.** Entries have no visibility flag
  yet, so player mode shows all of them, read-only. See **Waiting on Firebase**.

## Testing

Some of this is now automated. The rest is yours, and the list is deliberately
short — it is the things that are quick to check and easy to get wrong, not
every feature in the app.

### What `npm run check` catches

Three passes, and each was added the day a bug got past the ones before it.

1. **Does it parse as an ES module?** Each file is copied to `.mjs` first,
   because `node --check` on a `.js` file parses it as CommonJS, meets
   `import`, falls back to ESM detection and **swallows the syntax error**,
   exiting 0. A literal newline inside a string in `generators.js` passed
   `node --check` and took the whole app down.
2. **Does every named import resolve?** A missing export is not a parse error:
   the file is fine, the graph is not, and the browser fails the whole thing at
   link time with every handler unwired.
3. **Is every cross-module name a file uses actually imported?** `w2s(...)` was
   called in `tools.js` and never imported there. That parses, it links, and it
   throws a ReferenceError on the first `pointerdown` — so every click in the
   app stopped working, with nothing in the console until someone clicked.
   Neither pass above sees it, because nothing is *missing*; a name is simply
   not there. So every name any module exports is known project-wide, and a
   file that uses one without importing or declaring it is reported.

Pass 3 needs to know what is code and what is not, and the first version used
regexes for that. It was not up to it: a template literal with a nested
template in its `${}` leaked its contents, and `/^[+-]?\d+$/` looked like a
division followed by an identifier — both of which showed up as "uses `$`
without importing it". A checker that cries wolf gets muted, so it is a
character scanner now, with a mode stack for nested templates.

### What runs without a browser

```
npm run verify    # both of the below, in order
npm run check     # every module parses as ESM and every import resolves
npm test          # Check20 rules: damage, armour, wounds, dice
```

No dependencies — it is all plain Node, so there is nothing to install.

`tests/logic.test.mjs` covers what the rules promise: wounds counting down from
their maximum, armour absorbing first, the floor at 0 and the Injured condition,
healing and its cap, successes at 15 and every 5 above, advantage keeping the
higher *adjusted* die, and dice formulas staying in range. 3232 assertions.

Importing the modules is half the point. **`node --check file.js` does not
catch a syntax error in an ES module** — Node tries CommonJS, meets `import`,
falls back to ESM detection and swallows it. A literal newline inside a string
in `generators.js` passed `node --check` and took the entire app down with
`Uncaught SyntaxError` — every handler unwired, the page still painting
perfectly from its static markup. `npm run check` copies each file to `.mjs`
first, which makes Node parse it as what it is, and then resolves every named
import so a missing export fails here rather than at link time in the browser.
Both cases are verified against deliberately broken files.

Only `character.js` and `dice.js` can be imported in Node; everything else
reaches the DOM. Testing the rest needs a browser and is not worth automating
yet.

### Worth checking by hand

Confirmed working in a browser on 2026-09-23: the table boots, monster and
character cards open, monster book and generators load, marks apply, initiative
runs, chat cards roll, dark mode, save and load.

Still unverified, and each one is quick:

- [ ] **Player mode** (`?mode=player`). Settings shows Appearance only; the
      journal's title and body are read-only but notes are not; a player cannot
      select another player's token, a monster token, or anything on the map
      except their own; double-click gives them nothing they should not have.
- [ ] **Marks survive a save and load**, and clearing one falls back to the
      name's initials.
- [ ] **Notes and journal entries survive a save and load**, and the count on an
      entry's header matches the notes under it.
- [ ] **Initiative**: Next past the last combatant bumps the round and says so
      in chat; Clear resets it to 1; clicking a linked chip brings the view to
      that token at the same zoom.
- [ ] **A table saved before 2026-09-22 still loads** — monster PL tweaks
      migrate from the old `plOverrides` shape to `tweaks`.
- [ ] **The health ring** does not collide with the dashed selection ring, and
      a character token's ring follows damage applied from the rail.

Added 2026-09-24, none of it seen in a browser yet:

- [ ] **Scenes keep their maps.** Draw on scene one, add a scene, draw on it,
      go back: both drawings are where they were left, and so is the camera.
      This is the one that matters — a scene that loses a map loses work.
- [ ] **A table saved before today still loads** as a one-page table with
      everything on it, and saving it again gives a `scenes[]` file.
- [ ] **The preview** fills in after a moment on the card you are looking at,
      and updates when you leave a scene.
- [ ] **Per-scene lighting**: turning lighting off on one scene leaves the
      next one lit, and the Rooms sub bar's toggle agrees with the scene's cog.
- [ ] **The wash** sits under the darkness — a dark room stays as dark as it
      was — and does not tint the selection ring, a ping or the hover plate.
- [ ] **Delete the open scene** falls to its neighbour; deleting the last one
      is refused.
- [ ] **Windows**: drag one off the river and it floats; drag it back and it
      locks in at the height you dropped it; fold leaves a single line; a
      click on the head folds rather than undocking; the layout survives a
      reload.
- [ ] **The build fold** opens itself when Draw is chosen with `D`, and its
      button is lit while a build tool is live.
- [ ] **Player mode** hides the scene bar, the build fold, Layers, the book and
      the generators — and still shows the order.
- [ ] **Folders**: dragging one card onto another makes a folder holding both;
      dropping a third on the folder tile joins it; dropping one back on the
      strip loosens it; renaming the tile renames it for every scene inside;
      the arrow tips it out and the folder stops existing.
- [ ] **Dragging with a settings panel open** still selects text in its fields
      rather than starting a drag of the card.
- [ ] **The ruler**: drag measures and lets go; click, click, click lays a path
      whose total is more than the straight line across it; Alt-release leaves
      it on the map; Escape clears the ruler before it clears the selection.
- [ ] **The band** is right at the edges — 10ft reads Reach, 11ft reads Short,
      200ft reads Medium, 201ft reads Long.
- [ ] **Snap on** gives whole cells; snap off measures where you point.
- [ ] **A selected character token** adds the movement line, and a player never
      sees another character's.
- [ ] **Drop an image on the table**: it lands forty cells wide under the middle
      of the view, survives a reload, and the scene preview still renders
      afterwards (the crossOrigin flag is what makes that work).
- [ ] **Take the map off** clears it from the scene and from IndexedDB, and the
      "holding N maps" count in the cog goes down.
- [ ] **Paste a link** to an image on a host that sends no CORS headers: the
      map draws, and the panel says the preview has stopped updating rather
      than leaving it a mystery.
- [ ] **A saved table opened on another machine** shows its scenes without
      their local maps, and does not error.
- [ ] **Upload to the room** is offered only when signed in and in a room, and
      says why when it is not.
- [ ] **Grab the map**: click selects it, drag moves it, a corner resizes it
      about the opposite corner, Delete removes it, Escape deselects before it
      touches the token selection.
- [ ] **Lock the Map layer** and the map stops answering the pointer, so
      drawing over it no longer picks it up.
**Live sync, 2026-09-27. None of this has been in a browser yet, and it is the
first feature that writes to a shared server — so it is the first one where a
mistake is not fixed by a reload. Test with two browsers, narrator and player,
on the same room code.**

- [ ] **The narrator drops a token and the player sees it** within a second.
- [ ] **The player drags their own token and the narrator sees it move**, and
      the token does not snap back under the player's hand while they drag.
- [ ] **A player joins a room the narrator has never seen them in** and a
      token appears on the narrator's map named after them.
- [ ] **The narrator switches scene and the player follows.**
- [ ] **A player cannot move anything but their own token** — the rules refuse
      a write to `board/`, and the app refuses the drag.
- [ ] **No echo.** Two browsers open, nobody touching anything: the board is
      not being rewritten in a loop. Watch the Firestore usage graph.
- [ ] **Drawing a lot** eventually warns about the size rather than failing
      silently. 200 pencil strokes is about 343KB; the warning is at 700KB.
- [ ] **Offline** — pull the network and the table keeps working locally, and
      the room badge says so.

- [ ] **The Erase tool does not resize the map** — the corner handles belong to
      Select only.
- [ ] **A map survives a reload.** It did not: the scene reader hand-listed
      the fields it carried, so every refresh dropped the battlemap, reset the
      scene scale to 5ft and lost the folders. There are now 60-odd assertions
      pinning a scene's round trip.
- [ ] **The Map window** (left rail, `Map`) sets the open scene's map, grid,
      scale, lighting and wash, and opens when the map on the table is grabbed.
- [ ] **The scene cog** now names and files a scene and nothing else; a scene
      you are not looking at offers no style controls at all.
- [ ] **Save and Load** are in the settings menu and still work.
- [ ] **Clicking works at all.** `w2s` was used in `tools.js` without being
      imported, which threw on the first pointerdown and killed every click in
      the app — tokens, maps, doors, the marquee. `npm run check` now catches
      that class; see **Testing**.
- [ ] **Scene scale**: set a scene to miles and the ruler stops naming bands
      and stops comparing to movement.
- [ ] **Dim and Wash are buttons now** — setting either no longer drags the
      scene card into a folder.
- [ ] **Text size** at Larger does not break the sheet rail, the roll cards or
      the turn cards, and survives a reload without a flash of the old size.
- [ ] **The river is invisible when empty** — no line down the left of the map
      with nothing docked.

### Known to be missing rather than broken

- Monster tokens dropped before 2026-09-22 have no `hpMax`, so no ring. Either
  set a max on the card or run, in the console:
  `gaslight.state.items.forEach(i => { if (i.monster && i.pl && !i.hpMax) { i.hpMax = i.pl * i.pl; i.taken ||= 0; } }); gaslight.requestDraw()`
- Once a token's look has been changed, the only way back to its card is to
  close the panel and click the token again. Reported as "cannot get back to the
  normal popup"; not reproduced from the code, so the cause is still open.

### Recently added

Scenes and windows, 2026-09-24:

- **A table has pages.** Each scene keeps its own map, layers, grid, camera,
  lighting and colour wash. The strip across the top of the stage shows each
  one as a preview of how it looked when you left it; the cog on a card opens
  what that scene *is* — name, lighting, dim, wash — rather than what is on
  it. See **Scenes** for the model and the one thing that can go wrong with it.
- **Four panels became one kind of thing.** Initiative, Layers, the monster book
  and the generators are windows: drag them, fold them to a line, lock them
  into the river down the left edge or let them float. The book can be open
  beside the order now, which it never could. See **Windows, and the river**.
- **The tool rail regrouped.** Select and Pan as one oval, the five building
  tools folded behind one button, the window switches under a rule.
- **The slide-out narrator rail is gone**, and 2,145 characters of its CSS with
  it.
- **Folders for scenes**: drag one card onto another and they group, the way the
  website's session board does it. Still a plain string on the scene rather
  than a tree. The strip is ten across and two deep.
- **A text size setting**, four steps, scaling all 352 font sizes in the
  stylesheets from one variable.
- **A ruler** (`M`), with waypoints for measuring round a corner, pinned lines,
  and Check20's own range bands — Melee, Reach, Short, Medium, Long — parsed
  out of the glossary rather than hardcoded.
- **Battlemaps**, from any of three places: kept in this browser (the default,
  free and offline), uploaded to the room, or linked. Drop one on the table.
  See **Maps**.
- **A scene measures in its own units**, so a world map stops claiming things
  are at Short range.
- **The grid belongs to the scene**: colour, strength, size and what a cell
  measures, all in its cog. A battlemap and a world map do not want the same
  lines.
- **`npm run check` has a third pass**, for a name used but never imported.
  That bug class had taken the whole app down twice.
- **The scene cog is a cog**, and its sliders are buttons — a slider inside a
  draggable card dragged the card.

Features and chat, 2026-09-24:

- **A feature says what it does while it is shut.** A closed card carries the
  first sentence and a *Read more*, instead of nothing. Eleven path steps used
  to be eleven names; you had to unfold each one to find out which was which.
- **A family is one card.** The base *is* the disclosure now — its head, tags
  and buttons when shut, its own text and its upgrades nested inside it when
  open. There is no separate grey `Bloodletting 4` bar above it any more:
  Bloodmark and Regen are not four features, they are how Bloodletting behaves.
  An upgrade's own fold stops its click, so opening one does not shut the base
  it sits in.
- **The chat box is a textarea**, three lines and draggable taller. Enter sends,
  Shift+Enter is a new line, and the log keeps the breaks (`.msgtext` is
  `pre-wrap`).
- **The dice are behind a button.** The check row, the d4–d% row and the slash
  hints fold into `#chatTools`, opened by the `d20 Dice` toggle. They took a
  third of the panel to sit there unused, and whatever comes next — a GIF
  keyboard, emotes — has somewhere to live.

Offline and visual work, 2026-09-22:

- **Dark and light.** A toggle in the top bar, remembered per browser and
  applied before first paint. The palette lives entirely in CSS variables;
  the canvas keeps its own two palettes in `theme.js`, since reading CSS
  variables every frame would be wasteful.
- **Chat notifications.** A count on the Chat tab while you are looking
  elsewhere, and a toast for anything that happens to the character in the rail.
- **Rolls jump to Chat**, so an attack shows its result without a click.
- **Roll cards read along one line** — label, the dice that landed, then the
  total. They only stack on a narrow screen. An attack puts its check and its
  damage **side by side** (`duel` on `.rcbody`), wrapping to stacked when the
  sidebar is dragged under about 300px. The class had been in the markup since
  roll cards existed with no rule behind it, so they always stacked.
- **Progression grouped** into Next, Taken and Locked, with a count and bar
  per path and talent.

Narrator and table work, same day:

- **A settings menu** in the top right. The theme moved into it (dark is the
  standard), alongside the table's own options, which the narrator sets for the
  room and which save with the table.
- **Auto-rolled damage tables**, off by default, with the narrator choosing how
  many successes it takes.
- **Monsters tuned on the fly.** Power level, checks, damage and which check an
  attack uses, all editable and saved per monster. Physical and Mental share
  the power level as one budget, as 97 of the 99 written monsters do.
- **Monster tokens** dropped straight from the book, sized by the monster and
  coloured by its origin, and a way back from a token to its stat block.
- **Marks on tokens**: shapes in the token's ink, or an emoji.
- **Send to chat** on monster features, spell effects, attacks, lore, generator
  results and journal entries, as a card that keeps its formulas rollable.
- **Player notes on journal entries**, signed by the chat's speaker, with the
  entry itself read-only in player mode.

## The lobby

`index.html`. Two doors:

- **Narrator** — create a room (name, welcome message, a six-character code
  to hand out), edit a room's name and welcome, or resume one. Entering opens
  `table.html?room=CODE&mode=narrator` with a room badge in the top bar.
- **Player** — enter a code, see the room's name and welcome message, then
  choose **Open the table** (`table.html?room=CODE&mode=player`) or **Open my
  sheet** (active-sheet, or character creation if there is no character yet).

Accounts are the website's Google sign-in via `ArcAuth`. `ArcAuth.require()`
is not used here: it assumes it is running on `companion/home.html` and
would redirect to a `home.html` that does not exist at the site root.

Rooms are the same documents narrator.html and active-sheet use, and the
localStorage keys match (`arc-room`, `arc-narrator-room`), so a room entered
here is the room those apps open too. Joining as a player mirrors
`completeJoin()` in `scripts/home.js`: it writes `players/{uid}`, posts the
arrival to the room's chat, and sets `arc-room`.

**Player view is a preview, and must stay one.** Anything gated on
`isPlayerMode()` has to be gated on `state.playerView` too, or the narrator's
preview quietly shows more than a player would see. The hover plate and the
initiative status pills both do; when you add the next thing a player should
not see, add it to both.

**Player mode on the table.** Select and Pan only; the layers panel, save and
load, grid controls and the player-view toggle are hidden, and player view is
forced on. A player can drag only their own token. Their character is read
from active-sheet's saved state on the same device (`arc-active-sheet`) by
`fromActiveSheet()`, which also rekeys path steps from active-sheet's plain
indexes to this app's `Path Name:index` form.

**Live sync, built 2026-09-27.** `sync.js`. Until it, `onSnapshot` appeared
nowhere in this app: the room code was a badge and a lobby handshake, and
Gaslight looked multiplayer while being a single-player tool.

    rooms/{CODE}                   sceneId    which page is open
    rooms/{CODE}/board/{sceneId}   the board  items, layers, grid, light, image
    rooms/{CODE}/moves/{uid}       one player's own token, written by them

**One document per scene, not one per item.** A board is 7KB for sixty tokens
and 34KB for twenty pencil strokes, nowhere near Firestore's 1MB cap; one
document means one listener, one write, and no chance of a player seeing half
an update. Heavy drawing is what would eventually push past it — 200 strokes is
343KB — so the narrator is warned at 700KB rather than having a write fail
somewhere nobody is looking.

**The narrator owns the board; a player writes one thing.** Where their own
token is. That asymmetry is the entire conflict-resolution story, and it is
deliberate: two writers on one document needs merge rules, and a table does not
need them — the narrator is the authority, which is what a narrator is.

**`playerUid` on a token is the whole link.** The narrator matches a move to a
token by it; a player recognises their own token in an incoming board by it.
The handshake: a player says where their token is, the narrator materialises it
on the board, and it comes back to everyone on the next publish. From then on
there is one object and one truth, and the player only moves it. A player the
narrator has never seen gets a token rather than having their move dropped —
someone who joins should appear.

**Two guards worth knowing about:**

- `applying` — writing a snapshot into `state` is itself a change, and a
  change is what triggers a publish. Without the flag a narrator's write would
  echo off a player and come back.
- A player's own position survives an incoming board. Taking the narrator's
  copy would drag the token back under their hand every time a snapshot landed
  mid-move.

**Publishing hangs off the autosave**, which is already the one place in the
app that knows "something is different". Wiring it there rather than into every
handler means nothing has to remember to announce itself. It debounces again at
450ms and skips a board that has not actually changed.

**Not built yet:**

- Chat, the journal and the roster do not sync. Only the board does.
- A player switching scenes follows the narrator; they cannot wander.
- No presence: nothing shows who is connected, or when someone drops.
- Changes a player makes on the table (wounds, conditions) do not write back to
  active-sheet or to `players/{uid}`. Until they do, the phone sheet and the
  table can drift apart.
- Nothing here has run against the real Firestore or its security rules. The
  flows are tested against an in-memory stand-in with the same API, which
  checks this app's logic but not what the server will permit.

## Firebase rooms

`Gaslight/` and `companion/` are both subfolders of the same site, so they
share an origin. That means loading `../scripts/firebase.js` gives this app the
*same* signed-in session and the same Firestore project with no extra login. `window.__arc` exposes `db` and the Firestore helpers, and fires
`arc:firebase-ready` / `arc:auth-changed`.

Rooms require a real account — `__arc.isSignedIn()` excludes anonymous
sessions. Solo play must keep working signed out.

### Why several apps can write one room

Every write to `rooms/{CODE}` outside creation is an `updateDoc` with a small
payload, so Firestore merges at the **field** level and two clients writing
different fields never clobber each other. `narrator.js` and `active-sheet.js`
already rely on this. The invariant to preserve: **never `setDoc` the room
document without `{ merge: true }`.** Creation is the one exception.

Subcollections (`chat`, `loot`, `handouts`, `players`, `gifts`) key every entry
by its own id, so they carry no clobber risk at all.

### Field ownership

| Field | Written by |
|---|---|
| room creation (the one `setDoc` on a room) | narrator.html, **Gaslight lobby** |
| `name`, `welcomeMsg`, `lastActivityAt` | narrator.html, **Gaslight lobby** |
| `narratorUid`, `status`, `gold`, `provokeLocked` | narrator.html |
| `characters[]` (cast summary) | narrator.html |
| `handoutPopup`, `typingNar` | narrator.html |
| `encounter[]` | **Gaslight** (takes over from narrator.html) |
| `encounterRound`, `encounterTurnIndex` | **Gaslight**, narrator.html *and* active-sheet — players advance their own turn |
| `lastReaction` | narrator.html, active-sheet |
| map and fog state | **Gaslight** (new; needs its own subcollection) |
| `players/{uid}` | active-sheet, **Gaslight lobby** when a player joins |
| `chat/{id}`, `loot/{id}`, `handouts/{id}`, `gifts/{id}` | any, per-document ids |

Gaslight reads everything and writes only its own rows.

### Constraints

- **Cadence.** The 2-second localStorage autosave must not become a Firestore
  write. Room sync is event-driven and debounced, as `debouncedRoomSync()` in
  active-sheet already does.
- **Document size.** Firestore caps a document at 1MB. Room cells are cheap,
  pencil strokes on a large map are not, so map state belongs in a
  subcollection rather than in the room document.
- **Security rules** live in the Firebase console, not this repo. Confirm what
  a narrator uid is allowed to write before building against these fields.
- **Offline.** Firebase is additive. The table must stay fully usable with no
  network and no account.

### Knock-on for Phase 3b

If player characters arrive from `players/{uid}`, the creation wizard only ever
needs to build NPCs and monsters — players build their own in `create-char`.
Scope 3b once this phase is settled.

## The sheet

Seven rail sections, each its own module, all reading live from `state.chars`:

| Section | Holds |
|---|---|
| **Checks** | the ten checks, health, take-damage, conditions |
| **Features** | species, class, path, talent, every granted feature — and rolling them |
| **Gear** | carried equipment, bulk, attack and damage rolls |
| **Spells** | known spells by intent tier, casting and mana |
| **Progression** | XP and path/talent steps |
| **Bio** | age, size, diet, language, motivation, notes, species prose |
| **Ref** | the conditions currently on this character |

**A feature is not only text.** 298 of the 1544 written path and talent steps
carry a check and 242 carry damage, so a large part of what a character can do
is rollable — and none of it was. A feature with a check rolls through the same
tray an attack does, damage and all; one with damage but no check rolls that on
its own; and any of them can be **Sent** to the table, formulas still rollable
from the log.

**One card shape, two columns.** `.actcard` is what the thing is on the left
and what you can do with it on the right, and gear and features both use it —
so a weapon that attacks and a feature that attacks look and behave the same
instead of each having invented its own row. The actions column is a fixed
72px so every button in a list lines up; a column of ragged buttons is harder
to hit than a column of aligned ones.

**A feature carries its upgrades.** Bloodmark, Regen, Infernal Force and
Bloodlink are not four things a character announces — they are how Bloodletting
behaves once they are bought. So within a family the first step is the base and
the rest are what it carries:

- The **base** rolls and Sends for the whole family. One post: its own text,
  then each upgrade labelled by its short name, with every die from all of
  them offered once.
- An **upgrade** keeps only what is genuinely its own — an extra die to roll,
  and its own wording to edit. It has no Send, because read out alone it says
  "deal an additional 1d6" with no sign of what it is additional to.
- The base lists what it carries as chips, so it is visible without unfolding.

`featFamily()` decides the family, and it handles both spellings the data uses:
`"Bloodletting: Bloodmark"` and `"Storm Stance II"`.

**A note is not one paragraph.** `noteCard` rendered everything into a single
`<p>`, and HTML eats newlines — so a feature sent with four upgrades arrived as
a wall. A note now takes `parts`, each with its own heading, and plain `text`
is split on blank lines into paragraphs. Everything that sends prose — monster
features, generator results, handouts — reads better for it, not just features.

**Features fold away.** Eleven path steps is a wall of prose. Collapsed, the
head still carries the name, the action, the check and the range — and the
buttons stay out, because they are the reason to go looking for the feature at
all. Clicking the body opens it; what is open is not saved, since what a player
had unfolded is not part of the character.

**A feature can be rewritten, for one character only.** The pencil on a card
opens every field — name, action, check, range, duration, damage and the text
itself. The data is shared and read-only, so nothing is edited in place: the
change is stored on the character in `featureOverrides` and merged over the
written version when it is read. The field had been on the model since the
start with nothing reading it; this is what it was for.

Two rules make that safe, and both are tested:

- **Only what differs is stored.** Set a field back to what the rulebook says
  and the override for it disappears; empty the last one and the whole entry
  goes, so nothing is left marked "edited" over an edit that was undone.
- **A later fix to the data still lands.** A character who only rewrote the
  flavour text picks up a corrected damage formula, because only the text was
  ever overridden. `withOverride()` merges field by field, not wholesale.

The written wording shows through the editor as placeholder text, so an empty
field reads as *unchanged* rather than *blank*, and **Put the written version
back** restores it exactly.

Gear is told apart by kind rather than read: `gearKind()` sorts everything into
**weapon** (red), **armour** (blue) or **kit** (gold) from its category, with
what it does as a fallback so a custom item still lands somewhere sensible. All
216 catalogue entries classify correctly. The hue is a left edge and a tinted
icon, not a coloured card — a list of saturated blocks is harder to read than
the wall of text it replaced.

Gear is the player's own list: draggable into whatever order they like, saved
with the character, and the order the token card reads. A star on a weapon puts
it on that card. Dragging is `bindDragReorder()` in `reorder.js`, ported from
the companion — pointer events rather than HTML5 drag-and-drop, which cannot be
styled, fires inconsistently, and does not work with touch at all.

Gear is editable after the fact. An item is spread out of the catalogue when it
is added and was then frozen, which is wrong the moment anything happens to it:
a weapon is enchanted, armour is dented, a narrator hands over something one of
a kind. The pencil on a row opens every field the rest of the sheet reads —
name, damage and type, the comma-separated check list the attack tray offers,
armour, bulk, range, and the `checkBonus`/`checkPenalty` strings. **+ Custom**
makes a blank item and opens it, for anything the catalogue has not got.

Edits run through `changed()`, which calls `reconcile()`, so armour ratings and
check bonuses are resummed as they are typed.

Gear and species feed back into the rest of the sheet rather than sitting
inertly: `recalcEquipment()` sets the armour maximum from armour ratings and
adds `checkBonus`/`checkPenalty` strings to the matching check, and choosing a
species fills size, diet and language if they are still blank.

Two parsing details worth knowing, because both are easy to get subtly wrong:

- Check modifiers are matched with `String.raw` so the `\s`/`\d` in the pattern
  survive. A template literal eats them and the regex silently never matches.
- Spell damage lives inside the effect text as `[[2d6]]`, and a `!` suffix on a
  die means it explodes: rolling the top face rolls again and adds, capped so a
  run of maximums cannot spin forever.

## Hotkeys

Keys are ignored while an input, textarea, select or editable field has focus,
so typing in chat never switches tools. Tool keys are ignored with Ctrl or Cmd
held, leaving the browser's own shortcuts alone.

| Key | Does |
|---|---|
| `V` | Select |
| `H` | Pan |
| `M` | Ruler |
| `T` | Token |
| `D` | Draw |
| `R` | Rooms |
| `L` | Lamp |
| `E` | Erase |
| `Delete` / `Backspace` | Delete the selection, one item or a whole group |
| `Enter` | Close an open ruler path, leaving anything pinned |
| `Escape` | Clear the ruler first; if there is nothing to clear, drop the selection and close the cards, panel and map text entry |
| `Ctrl` + `A` | Select everything on the visible, unlocked layers |

A box round several tokens opens the group card. **Roll initiative** there puts
all of them in at once: characters on Agility, monsters on their Physical
check, and anything already in the order is left where it is rather than added
twice.

Mouse, in Select:

| Action | Does |
|---|---|
| Click a token | Its card — the sheet card, the monster card, or the property panel |
| **Alt** + double-click a character token | Straight to the full sheet, past the card |
| Double-click a token | Same as a click |
| Double-click empty map | Ping |
| **Drag empty map** | Selection box, RTS style. Everything whose centre falls inside is selected; dragging any one of them moves the whole group |
| **Ctrl** + drag empty map | Add to the selection instead of replacing it |
| Drag with a group selected | Moves them all, keeping their spacing |
| **Shift** + drag | Measure, from any tool |
| **Shift** + click with the Token tool | Force a second token on the same spot; without it, a click selects what is already there |
| Click a door | Open or close it |
| Middle or right drag | Pan, whatever the tool |
| Tools | Down the left edge, icon only — each carries its name and key in a tooltip |
| Wheel | Zoom |

Dragging empty space used to pan. It now draws a selection box, so panning is
middle-drag, right-drag or the Pan tool (`H`). A player still gets the old
pan on an empty drag: there is nothing on the map they are allowed to marquee.

`TOOL_KEYS` in `tools.js` holds the tool letters; the rest live in the same
`keydown` handler at the bottom of `initTools()`.

## The ruler

Shift-drag has always drawn a dashed line with a number of feet on it. That
answers one question and only one. At a table the questions are usually:

- **can I hit it from here** — which wants a band, not a number
- **can I get there this turn** — which wants this creature's movement
- **can I get there round that** — which wants a path, not a hypotenuse

So the ruler is its own tool (`M`), in the pointer pill with Select and Pan,
because it is the same question those two answer: what does a drag do.
Shift-drag still measures from any tool, since wanting to know how far
something is in the middle of doing something else is the common case.

| | |
|---|---|
| **Drag** | One straight leg. It goes when you let go. |
| **Click, click, click** | A path. Each click lays a corner, so you can measure round a wall rather than through it. `Enter` or `Escape` ends it. |
| **Alt** on release | Leaves the measurement on the map until `Escape` |
| **Escape** | Clears everything the ruler is showing, before it touches the selection |

It snaps to cell centres while **Snap** is on, so a distance comes out in whole
cells instead of `47 ft` because the pointer was three pixels off. Off, it
measures exactly where you point.

**Players get the ruler too.** Asking the narrator "how far is that" is the
most common question at a table and the least interesting one to answer out
loud, and the ruler tells a player nothing the map does not already show them.

### Bands come from the rules, not from here

`ranges.js` parses Check20's range bands out of `data/glossary.json`, where
they are already written with their distances:

| | |
|---|---|
| Melee | 5ft or touching |
| Reach | 10ft |
| Short | Within 50ft |
| Medium | 50-200ft |
| Long | 200-1000ft |
| Visible | Within line of sight — no distance, so not a band |

Parsing them beats hardcoding because a second copy of those numbers would
drift the first time they are tuned. **The tighter band wins**: 10ft is Reach,
not Short, even though Short covers it too, because the tighter one is what a
player means. Past the longest band it says how far and nothing else rather
than inventing a name.

`ranges.js` has no DOM, so all of this is tested — the parse, the band edges
at 5/10/50/200/1000, the diagonal, and that an L-shaped path is longer than
the straight line across it.

### Movement

With exactly one character token selected, the label adds `12 ft left of 35`,
or `5 ft past 35` when the path is too long. It reads `movement(ch)` from
`character.js`, the same 30 + Agility value the sheet shows. Only for a token
that has a movement to measure against, and never for a token a player should
not be reading.

## Rolls

`rollCheck({ charName, label, mod, rollType, conditions, attack, damage })` and
`rollDice({ charName, label, formula })` in `chat.js` are the two entry points.
The v1 wrappers `rollC20` and `doRoll` are gone; nothing called them.

**Successes.** A total of 15 is one success and every 5 above it is another;
below 15 is none. Same rule as `successCount()` in `scripts/chat-cards.js`.

**Advantage** is d20+4 against a d20, keep the higher. **Disadvantage** is
d20−4 against a d20, keep the lower. Checks and bonuses are added to the
result, so they never change which die wins. The kept die shows its ±4 on
the card.

`scripts/active-sheet.js` rolls a plain 2d20 for both, which is wrong by this
ruling. It matters for Phase 7: the website's `parseRollNote()` assumes a
plain 2d20, so it would name the wrong die as kept on a VTT roll. VTT
messages also store `kept`, `dropped` and `keptAdj` directly so the answer
is never ambiguous. Either fix active-sheet or have the bridge read those
fields.

## The order, and who is in it

`state.init.list` is one entry per combatant, sorted by roll. **What gets played
can be shorter.** With **The opposition takes one turn** on — the default, and
how the companion runs it — every monster acts together at the best roll any of
them made, because eight Brutes is one decision rather than eight turns to
click through.

`playOrder()` in `initiative.js` builds that, and **`state.init.turn` indexes
it, not the raw list.** Anything that moves or clamps the turn has to go
through `clampTurn()`, or turning the setting on leaves the index past the end
of a shorter order. `sheet.js` had its own clamp against `list.length` and now
calls `clampTurn()` instead.

A single monster is never grouped: one of anything takes its own turn. The
grouped entry sits at the **highest** roll among its members, so the
opposition can lead the order or bring up the rear.

The renderer asks `currentTurnRefs()` once a frame for everyone acting, which
is why the whole opposition glows together on their turn. The grouped card
offers only **End turn** — there is no single "them" to go prone or take cover,
and no one token to bring the view to.

## Rolling

Every roll goes through `askRoll()` in `rolltray.js` before it reaches
`rollCheck()`. The tray carries the four things a roll used to have no way to
say:

- **Which check it rolls, and why.** A weapon usually lists several — 104 of
  the 116 in `weapons.json` do, typically "Agility, Luck, Observation" — and
  the code used to take the first silently. The tray shows the weapon's own
  list, says where it came from, and lets any of the ten be chosen over it.
  The modifier, the label and anything forcing Disadvantage all follow the
  choice. Same for spells: it says whether you are casting on Spirit by default
  or on something the class set, and points at where that is set.
- **A temporary modifier.** The sheet's number is shown, and you type whatever
  else applies — a buff, a tweaked weapon, a narrator's call.
- **Advantage, asked every time.** It used to be set only by a condition. A
  condition that forces Disadvantage still does, and the tray names it, but the
  narrator can overrule it, because they always could at a real table.
- **Damage, editable.** It rides along with the attack instead of waiting for a
  second button, so a buffed weapon rolls what it actually does.
- **The spell or feature's own text**, which now reaches the table with the
  roll rather than staying on the sheet. `note` on the message, rendered by
  `checkCard`.

`Enter` rolls, `Escape` cancels. Settings has **Ask before rolling**; turned
off, a click rolls straight away as it used to.

### Where a spell's damage is

Three places, and `damageFormulas()` in `formulas.js` reads all three, best
first:

| | of 187 effects | |
|---|---|---|
| the effect's own `damage` field | 12 | the authored answer, trusted first |
| dice marked up as `[[2d6]]` | 28 | what the website marks for its roll buttons |
| dice written into the prose | 22 more | *"takes 3d6 acid damage"*, marked up nowhere |

Reading only the first two covered **31 of 187**. Reading all three covers
**52**. The 21 that were missing cast with no damage at all — Corrosive,
Fallout, Frostbind, every tier of Gravity and Ignition.

The prose reader is a regex over English, which is a guess: *"make a 1d6
check"* reads the same as *"takes 1d6 damage"*. It prefers dice followed
closely by a damage or healing word, which is right most of the time. **That is
only acceptable because the roll tray shows the formula in an editable field
before anything is rolled** — a wrong guess is visible and one keystroke from
being fixed, where a silent omission is neither. Do not use this reader
anywhere the result is not shown before it is used.

All three readers strip whitespace so they return the same shape; without
that, `2d6 + 3` and `2d6+3` survive the dedupe as two separate offers.

### Do not offer one of ten and call it a choice

The character token card used to have a single **Agility** button. Agility was
there because something had to be, and a card that offers one of ten checks
tells the player the other nine do not exist — the same mistake as the weapon's
first listed check, in a different costume.

It now offers what the character actually has: their weapons by name, **Check**
for any of the ten through the tray, and jumps into **Spells** and **Kit**
rather than dropping everyone on Checks to go and find it.

**Which weapons is the player's call.** `cardActions()` takes anything starred
in the Gear panel, and falls back to the first few in the carried order when
nothing is starred — so the card is useful before anyone configures it and
exactly theirs once they have. The carried order is draggable and saved, so
dragging a weapon to the top of Gear puts it first on the card too.

`attackWith()` lives in `gear.js` and both the Gear panel and the token card
call it, so a weapon's check list and the reasoning behind it exist once.

### Do not decide for the player

The tray exists partly as an answer to a habit worth naming: the app kept
picking for people and not saying so. A weapon's first listed check became
*the* check. Spirit became *the* casting check. Neither was visible, so nobody
could learn the rule or disagree with it.

The pattern to follow: **show the default, say where it came from, allow the
override.** A player who sees "Lantern Mace can be used with Agility, Luck,
Observation" learns something about their weapon. A player whose roll simply
said "(Agility)" learns nothing, and is wrong about their own character.

The same rule covers anything the app would otherwise refuse. A Cast button
greyed out for want of Mana teaches nobody anything — it reads as a broken
app, because a disabled control is indistinguishable from one that does not
work. So the button stays live, the row says `3 MN · you have 1`, and clicking
opens the tray with the reason in red and the action renamed **Cast anyway**.
The narrator can allow it, because a narrator at a real table always could;
Mana is clamped at zero rather than going negative, since allowing an overcast
is allowing the spell, not inventing a debt.

**Never disable a control without saying why beside it.** If the reason cannot
be shown, the control should not be disabled.

## Known data issues

In the website's shared data, so they show there too. Left untouched here,
since `data/` is read-only to this app:

- `data/class-new.json` has 7 garbled characters, `Ã-` where `×` was meant
  ("1d100 × 5"), all in Merchant "Investment" steps: Kingpin, Bibliotaph,
  Smith, Undertaker, Witch. A UTF-8 encoding slip somewhere upstream.
- Game text marks dice as `[[2d6]]` for the website's roll buttons.
  `detemplate()` in `dom.js` shows them as plain text on the sheet.
- Monster text is written against the creature's power level: "[[5 * PL]]
  armor". `resolvePL()` in `monsters.js` works those out per monster, leaving
  dice rollable — "[[1d6 + PL]]" at PL 3 becomes "1d6 + 3". It evaluates the
  arithmetic itself rather than using `eval`, and leaves anything it cannot
  read ("[[equal to foo]]") as written.
- `spells.json`: **Summon Dragon** has a Whisper effect with an empty `effect`
  string, so it casts with no text. It is the only one.
- Monster environments are inconsistently cased and spaced in the data
  ("Void" and "void", "Fey" and "fey"), so the filter matches case-insensitively
  and shows one entry per environment.

## What a step grants

Every path or talent step past the first buys **+1 to a check (cap 15), +1 Mana,
or +1 Class Resource**. The choice is kept against the step that bought it:

```
progression.gains['Steadfast:3'] = { type: 'check', key: 'agi' }
```

**Kept, not applied.** `checkTotal`, `manaMax` and `reconcile` derive the
totals from the grants that are currently held, so giving a step back removes
its grant with no record of what to undo. A grant written against a step that
is not held counts for nothing, and step 0 never grants at all.

`unassignedSteps()` finds steps bought without a choice, and the Progression
panel offers to walk them one modal at a time.

**The class resource is the awkward one.** There is no structured resource in
`class-new.json` — it is prose across most entries, and `res.classRes.label` is
free text the narrator fills in. So the option is offered only when the
character actually has one, and points at the Health cog otherwise, rather than
granting a point to a resource that does not exist.

`classRes.max` is `baseMax + grants`, with `baseMax` captured once. Without
that split, every `reconcile()` would add the grants to the previous total and
the resource would climb on its own — which it briefly did. There is a test.

## Check20 rules baked in

- A check is d20 + modifier. **Advantage** rolls d20+4 alongside a plain d20 and
  takes the higher; **Disadvantage** rolls d20-4 and takes the lower.
- Wounds max = Agility + Strength + Survival + bonus (floored at 1), matching
  `active-sheet.js`. The glossary entry still says Agility + Strength; treat the
  glossary as stale on this point. A Tank's +10 goes in the bonus.
- Mana max = floor(Spirit / 2) + bonus, unless `res.mana.flat` is set, which
  replaces the Spirit formula outright. An Intellect spellcaster reads "You have
  6 Mana" and has no use for its Spirit, so flat is 6. **An empty flat is not
  zero** — it means work it out from Spirit — so the field stores `null`, and an
  explicit 0 really is 0.
- Spells cast on Spirit **unless the character says otherwise**. `castingCheck`
  on the character, set under the cog on Health, and several classes need it:
  an Intellect spellcaster casts on Intellect. This was hardcoded to `spi` in
  `spells.js` with a comment saying "unless a path says otherwise", which
  nothing implemented.
- Movement = 30 ft + 5 per 2 Agility. Low light = 30 ft + 5 per 2 Observation.
- One grid cell is 5 ft.
- Chat: `/c +3 adv` for a check, `/r 2d6+3` for raw dice.
