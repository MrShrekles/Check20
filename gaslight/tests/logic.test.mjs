/* Check20 rules, checked without a browser.
 *
 *   node tests/logic.test.mjs
 *
 * Two jobs. The obvious one is the assertions below. The quieter one matters
 * more: importing the modules really loads them as ES modules, so a syntax
 * error or a missing export fails here. `node --check file.js` does NOT catch
 * either — on a .js file Node tries CommonJS, meets `import`, falls back to
 * ESM detection and swallows the error. A literal newline inside a string in
 * generators.js passed `node --check` and took the whole app down.
 *
 * Only DOM-free modules can be imported: character.js, dice.js and state.js
 * have no imports at all. Anything reaching dom.js or data.js needs a browser,
 * so it is covered by `npm run check` in the README instead.
 */

import { applyDamage, heal, woundsMax, manaMax, movement, checkTotal, reconcile } from '../scripts/character.js';
import { checkRoll, rollFormula, successCount } from '../scripts/dice.js';
import {
  makeScene, migrateScene, SCENE_FIELDS, DEFAULT_LIGHT, DEFAULT_TINT,
} from '../scripts/state.js';
import {
  parseBands, bandFor, pathFeet, legFeet, measureLabel, toCells, FEET_PER_CELL,
  scaleOf, unitIsFeet,
} from '../scripts/ranges.js';
import { backdropRect, fitToCells, nudgeBackdrop, zoomBackdrop } from '../scripts/geometry.js';

let pass = 0, fail = 0;
const fails = [];

function is(actual, expected, what) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  fail++; fails.push(`${what}\n    expected ${e}\n    got      ${a}`);
}

function ok(cond, what) {
  if (cond) { pass++; return; }
  fail++; fails.push(what);
}

/* A character with the checks the rules read: wounds are Agility + Strength +
   Survival, so 4 + 3 + 3 is 10. */
const make = (over = {}) => ({
  name: 'Test',
  /* All ten, because reconcile() walks CHECK_KEYS and a partial character
     throws. The five that matter carry values; the rest sit at zero. */
  checks: {
    agi: { mod: 4, bonus: 0 }, cra: { mod: 0, bonus: 0 }, ste: { mod: 0, bonus: 0 },
    str: { mod: 3, bonus: 0 }, sur: { mod: 3, bonus: 0 }, inf: { mod: 0, bonus: 0 },
    int: { mod: 0, bonus: 0 }, lck: { mod: 0, bonus: 0 }, obs: { mod: 2, bonus: 0 },
    spi: { mod: 7, bonus: 0 },
  },
  equipment: [],
  conditions: [],
  res: {
    hp: { current: 10, bonus: 0 },
    armor: { current: 0, max: 0 },
    mana: { current: 0, max: 0 },
    classRes: { current: 0, max: 0, label: 'Resource' },
  },
  ...over,
});

/* ---- wounds are a capacity, counted down from the maximum ---- */

is(woundsMax(make()), 10, 'woundsMax = Agility + Strength + Survival');
is(woundsMax(make({ res: { hp: { current: 10, bonus: 5 }, armor: { current: 0, max: 0 }, mana: { current: 0, max: 0 }, classRes: { current: 0, max: 0, label: 'Resource' } } })), 15,
  'woundsMax adds the hp bonus');
is(woundsMax({ checks: {}, res: {} }), 1, 'woundsMax never drops below 1');

{
  const ch = make();
  const r = applyDamage(ch, 5);
  is(ch.res.hp.current, 5, 'a sword for 5 against 10 wounds leaves 5');
  is(r.armorHit, 0, 'no armor means nothing is absorbed');
  is(r.woundsHit, 5, 'all 5 land on wounds');
  ok(!r.downed, '5 of 10 is not downed');
}

/* ---- armor goes down first ---- */

{
  const ch = make({ res: { hp: { current: 10, bonus: 0 }, armor: { current: 3, max: 3 }, mana: { current: 0, max: 0 }, classRes: { current: 0, max: 0, label: 'Resource' } } });
  const r = applyDamage(ch, 5);
  is(ch.res.armor.current, 0, '3 armor against 5 damage is stripped');
  is(ch.res.hp.current, 8, 'the 2 left over take wounds from 10 to 8');
  is([r.armorHit, r.woundsHit], [3, 2], 'the split is reported as 3 armor, 2 wounds');
}

{
  const ch = make({ res: { hp: { current: 10, bonus: 0 }, armor: { current: 6, max: 6 }, mana: { current: 0, max: 0 }, classRes: { current: 0, max: 0, label: 'Resource' } } });
  const r = applyDamage(ch, 4);
  is(ch.res.armor.current, 2, 'armor absorbs the whole hit and keeps the rest');
  is(ch.res.hp.current, 10, 'wounds are untouched while armor holds');
  is(r.woundsHit, 0, 'nothing reached wounds');
}

/* ---- the floor, and what reaching it means ---- */

{
  const ch = make();
  const r = applyDamage(ch, 25);
  is(ch.res.hp.current, 0, 'wounds stop at 0 rather than going negative');
  ok(r.downed, 'reaching 0 reports downed');
  ok(ch.conditions.includes('Injured'), 'reaching 0 wounds applies Injured');
}

{
  const ch = make();
  applyDamage(ch, 25);
  applyDamage(ch, 3);
  is(ch.conditions.filter(c => c === 'Injured').length, 1, 'Injured is not applied twice');
}

/* ---- healing ---- */

{
  const ch = make();
  applyDamage(ch, 25);
  heal(ch, 4);
  is(ch.res.hp.current, 4, 'healing brings wounds back up');
  ok(!ch.conditions.includes('Injured'), 'healing above 0 clears Injured');
}

{
  const ch = make();
  applyDamage(ch, 3);
  heal(ch, 99);
  is(ch.res.hp.current, 10, 'healing is capped at the maximum');
}

/* ---- damage that is not a number ---- */

{
  const ch = make();
  is(applyDamage(ch, 0), null, 'zero damage does nothing');
  is(applyDamage(ch, ''), null, 'empty damage does nothing');
  is(applyDamage(ch, -5), null, 'negative damage does nothing');
  is(ch.res.hp.current, 10, 'and none of that moved the wounds');
}

/* ---- the other derived values the README states ---- */

is(manaMax(make()), 3, 'mana is floor(Spirit / 2), so 7 gives 3');
is(movement(make()), 40, 'movement is 30 ft + 5 per 2 Agility, so 4 gives 40');

/* ---- successes: 15 is one, every 5 above is another ---- */

is(successCount(14), 0, '14 is no successes');
is(successCount(15), 1, '15 is one success');
is(successCount(19), 1, '19 is still one');
is(successCount(20), 2, '20 is two');
is(successCount(25), 3, '25 is three');

/* ---- advantage keeps the higher die, disadvantage the lower ---- */

/* The shifted die competes on its shifted value, so the raw kept die can be
   the lower of the two. What must hold is that the ADJUSTED value won. */
for (let i = 0; i < 400; i++) {
  const adv = checkRoll(0, 'adv');
  ok(adv.kept + adv.keptAdj >= adv.dropped, 'advantage keeps the higher adjusted die');
  ok(adv.total === adv.kept + adv.keptAdj, 'advantage total is the kept die plus its shift');

  const dis = checkRoll(0, 'dis');
  ok(dis.kept + dis.keptAdj <= dis.dropped, 'disadvantage keeps the lower adjusted die');

  const flat = checkRoll(3, 'flat');
  ok(flat.dropped === null, 'a flat check drops nothing');
  ok(flat.total === flat.kept + 3, 'a flat check is the die plus the modifier');
  ok(flat.kept >= 1 && flat.kept <= 20, 'a d20 stays within 1 and 20');
}

/* The shift is ±4, so it can be worth at most 4 either way. */
{
  let sawShift = false;
  for (let i = 0; i < 400; i++) {
    const r = checkRoll(0, 'adv');
    ok(r.keptAdj === 0 || r.keptAdj === 4, 'advantage shifts by 4 or not at all');
    if (r.keptAdj === 4) sawShift = true;
  }
  ok(sawShift, 'advantage does sometimes keep the shifted die');
}

/* ---- dice formulas stay inside their bounds ---- */

for (let i = 0; i < 200; i++) {
  const r = rollFormula('2d6+3');
  ok(r.total >= 5 && r.total <= 15, '2d6+3 lands between 5 and 15');
  const flat = rollFormula('1d1+2');
  is(flat.total, 3, '1d1+2 is always 3');
}

/* ---- moving things on the map ----

   The bug these guard: a pencil stroke carried no x/y, the drag computed
   `w.x - undefined`, and NaN went into every point. The drawing did not move
   wrongly — it stopped having coordinates. It parsed, it linked, it rendered,
   and it died on first contact. */

const { moveItem, normaliseItem, itemIsSane } =
  await import('../scripts/geometry.js');

const items = () => ({
  token:   { kind: 'token', x: 10, y: 20, size: 1 },
  lamp:    { kind: 'lamp', x: 10, y: 20 },
  stroke:  { kind: 'stroke', x: 10, y: 20, pts: [[10, 20], [14, 26], [18, 20]] },
  line:    { kind: 'line', x: 10, y: 20, x2: 30, y2: 40 },
  shape:   { kind: 'shape', x: 10, y: 20, w: 8, h: 6 },
  ellipse: { kind: 'ellipse', x: 10, y: 20, w: 8, h: 6 },
  text:    { kind: 'text', x: 10, y: 20, text: 'hi', size: 16 },
});

for (const [kind, it] of Object.entries(items())) {
  moveItem(it, 110, 220);
  is([it.x, it.y], [110, 220], `${kind} lands where it was moved`);
  ok(itemIsSane(it), `${kind} still has real coordinates after a move`);
}

{
  // A shape carries its whole self, not just its anchor.
  const l = items().line;
  moveItem(l, 110, 220);
  is([l.x2, l.y2], [130, 240], 'a line carries its far end');

  const s = items().stroke;
  moveItem(s, 110, 220);
  is(s.pts, [[110, 220], [114, 226], [118, 220]], 'a stroke carries every point');
}

{
  // The original bug, exactly: a stroke with no anchor at all.
  const s = { kind: 'stroke', pts: [[5, 5], [9, 9]] };
  ok(!itemIsSane(s), 'a stroke with no anchor is spotted');
  normaliseItem(s);
  ok(itemIsSane(s), 'normalising gives it one');
  is([s.x, s.y], [5, 5], 'the anchor comes from its first point');
  moveItem(s, 15, 15);
  is(s.pts, [[15, 15], [19, 19]], 'and it then moves correctly');
}

{
  // A bad destination must never be written into the item.
  for (const bad of [NaN, undefined, Infinity, null]) {
    const it = items().stroke;
    const before = JSON.stringify(it);
    ok(moveItem(it, bad, 5) === false, `a move to ${String(bad)} is refused`);
    ok(moveItem(it, 5, bad) === false, `a move with ${String(bad)} for y is refused`);
    is(JSON.parse(before), it, `the item is untouched by a ${String(bad)} move`);
  }
}

{
  // Damaged coordinates are pulled back rather than left to spread.
  const it = normaliseItem({ kind: 'line', x: NaN, y: 3, x2: undefined, y2: 9 });
  ok(itemIsSane(it), 'a broken line is repaired');
  const st = normaliseItem({ kind: 'stroke', pts: [[1, 2], [NaN, 4], [5, 6]] });
  is(st.pts, [[1, 2], [5, 6]], 'a broken point is dropped, the rest kept');
  ok(itemIsSane(st), 'and the stroke is sane again');
  const empty = normaliseItem({ kind: 'stroke', pts: [] });
  ok(itemIsSane(empty), 'even a stroke with no points left is made sane');
}

{
  // Moving is idempotent in the way a drag depends on: many small moves and
  // one big one land in the same place.
  const a = items().stroke, b = items().stroke;
  for (let i = 1; i <= 50; i++) moveItem(a, 10 + i * 2, 20 + i);
  moveItem(b, 110, 70);
  is(a.pts, b.pts, 'fifty small moves land where one big one does');
}


/* ---- the opening step of a path or talent is free ----

   Step 0 is what choosing the path gives you. It is never bought and never
   given back, so it must not eat 20 XP. */

const { xpSpent, xpAvailable, isFree, XP_PER_STEP } =
  await import('../scripts/progression.js');

ok(isFree(0), 'step 0 is the free one');
ok(!isFree(1) && !isFree(5), 'nothing else is');

{
  const ch = { progression: { xp: 100, pathChecked: {}, talentChecked: {} } };
  ch.progression.pathChecked['Steadfast:0'] = true;
  ch.progression.talentChecked['Brawler:0'] = true;
  is(xpSpent(ch), 0, 'two opening steps cost nothing');
  is(xpAvailable(ch), 100, 'and none of the XP is gone');
}

{
  const ch = { progression: { xp: 100, pathChecked: {}, talentChecked: {} } };
  ch.progression.pathChecked['Steadfast:0'] = true;   // free
  ch.progression.pathChecked['Steadfast:1'] = true;   // 20
  ch.progression.pathChecked['Steadfast:2'] = true;   // 20
  is(xpSpent(ch), 2 * XP_PER_STEP, 'only the bought steps are counted');
  is(xpAvailable(ch), 100 - 2 * XP_PER_STEP, 'the rest of the XP is still there');
}

{
  // A path whose name has a colon in it must still resolve its index.
  const ch = { progression: { xp: 60, pathChecked: { 'Storm: Stance:0': true, 'Storm: Stance:1': true }, talentChecked: {} } };
  is(xpSpent(ch), XP_PER_STEP, 'a colon in the name does not break the index');
}


/* ---- layer typing ----

   Tokens on token layers, drawings anywhere else, and a tool lands on the
   topmost layer that will take what it makes. */

const { layerAccepts, layerTypeFor, layerForKind, TOOL_LAYER, state: vttState } =
  await import('../scripts/state.js');

is(layerTypeFor('token'), 'token', 'a token wants a token layer');
is(layerTypeFor('lamp'), 'token', 'so does a lamp');
is(layerTypeFor('stroke'), 'draw', 'a stroke wants a drawing layer');
is(layerTypeFor('text'), 'draw', 'so does a label');

{
  const tok = { type: 'token' }, draw = { type: 'draw' }, map = { type: 'map' };
  ok(layerAccepts(tok, 'token'), 'a token layer takes a token');
  ok(!layerAccepts(tok, 'stroke'), 'and refuses a drawing');
  ok(layerAccepts(draw, 'stroke'), 'a drawing layer takes a drawing');
  ok(!layerAccepts(draw, 'token'), 'and refuses a token');
  ok(layerAccepts(map, 'stroke'), 'the map layer counts as a drawing layer');
  ok(!layerAccepts(map, 'lamp'), 'but never takes a lamp');
  ok(!layerAccepts(null, 'token'), 'no layer takes nothing');
}

{
  // The default table: Map, Drawings, Tokens.
  const types = vttState.layers.map(l => l.type);
  is(types, ['map', 'draw', 'token'], 'a new table has one layer of each kind');
  is(layerForKind('token').type, 'token', 'a token finds the token layer');
  is(layerForKind('stroke').type, 'draw', 'a stroke finds the drawing layer');
}

{
  // Two drawing layers: the higher one wins, because layers paint bottom-up.
  const before = vttState.layers.slice();
  vttState.layers.push({ id: 'zz', name: 'Over', type: 'draw', visible: true, locked: false });
  is(layerForKind('stroke').id, 'zz', 'the topmost drawing layer wins');
  vttState.layers[vttState.layers.length - 1].locked = true;
  ok(layerForKind('stroke').id !== 'zz', 'a locked layer is skipped');
  vttState.layers[vttState.layers.length - 1].locked = false;
  vttState.layers[vttState.layers.length - 1].visible = false;
  ok(layerForKind('stroke').id !== 'zz', 'a hidden layer is skipped');
  vttState.layers.length = 0;
  vttState.layers.push(...before);
}

is(TOOL_LAYER.token, 'token', 'the Token tool works on token layers');
is(TOOL_LAYER.draw, 'draw', 'the Draw tool works on drawing layers');
is(TOOL_LAYER.rooms, 'map', 'the Rooms tool works on the map');
ok(!TOOL_LAYER.select && !TOOL_LAYER.pan, 'Select and Pan touch no layer');


/* ---- what a step grants ----

   +1 to a check (capped at 15), +1 Mana, or +1 Class Resource. Grants are
   stored against the step that bought them, so giving the step back takes the
   grant with it. */

const {
  checkGain, manaGain, classResGain, allGains, unassignedSteps,
  checkAtCap, checkPointsTotal, CHECK_CAP,
} = await import('../scripts/character.js');

const withGains = (gains, held) => make({
  progression: { xp: 200, pathChecked: held || {}, talentChecked: {}, gains },
});

{
  const ch = withGains(
    { 'P:1': { type: 'check', key: 'agi' }, 'P:2': { type: 'check', key: 'agi' }, 'P:3': { type: 'mana' } },
    { 'P:0': true, 'P:1': true, 'P:2': true, 'P:3': true });
  is(checkGain(ch, 'agi'), 2, 'two steps into Agility count twice');
  is(checkGain(ch, 'str'), 0, 'and not into anything else');
  is(manaGain(ch), 1, 'a mana step counts once');
  is(classResGain(ch), 0, 'nothing went to the class resource');
  is(checkTotal(ch, 'agi'), 6, 'Agility is its base 4 plus the two grants');
  is(manaMax(ch), 4, 'mana is floor(Spirit/2) plus the grant');
}

{
  // A grant only counts while the step that bought it is held.
  const ch = withGains({ 'P:1': { type: 'check', key: 'agi' } }, { 'P:1': true });
  is(checkGain(ch, 'agi'), 1, 'held, so it counts');
  delete ch.progression.pathChecked['P:1'];
  is(checkGain(ch, 'agi'), 0, 'given back, so it does not');
  is(allGains(ch).length, 0, 'and it is not in the list any more');
}

{
  // The opening step grants nothing, even if something was written against it.
  const ch = withGains({ 'P:0': { type: 'check', key: 'agi' } }, { 'P:0': true });
  is(checkGain(ch, 'agi'), 0, 'step 0 grants nothing');
}

{
  // The cap holds however the total got there.
  const gains = {}, held = {};
  for (let i = 1; i <= 30; i++) { gains['P:' + i] = { type: 'check', key: 'agi' }; held['P:' + i] = true; }
  const ch = withGains(gains, held);
  is(checkTotal(ch, 'agi'), CHECK_CAP, 'thirty grants still stop at the cap');
  ok(checkAtCap(ch, 'agi'), 'and the check reports itself full');
  ok(!checkAtCap(ch, 'str'), 'while an untouched check does not');
}

{
  const ch = withGains({}, {});
  is(checkPointsTotal(ch), 4 + 3 + 3 + 7 + 2, 'the check total adds the ten checks');
}

{
  // Steps bought but never assigned are findable.
  const ch = withGains({ 'P:1': { type: 'mana' } }, { 'P:0': true, 'P:1': true, 'P:2': true, 'P:3': true });
  is(unassignedSteps(ch).sort(), ['P:2', 'P:3'], 'the unassigned steps are listed');
  ok(!unassignedSteps(ch).includes('P:0'), 'and the free step is never among them');
}

{
  /* The bug this nearly shipped with: reconcile recomputed classRes.max from
     max + grants, so every call added the grants again and the resource grew
     without anyone touching it. baseMax is captured once. */
  const ch = withGains({ 'P:1': { type: 'classRes' } }, { 'P:1': true });
  ch.res.classRes = { current: 0, max: 3, label: 'Grit' };
  reconcile(ch);
  is(ch.res.classRes.max, 4, 'base 3 plus one grant');
  reconcile(ch); reconcile(ch); reconcile(ch);
  is(ch.res.classRes.max, 4, 'and it stays there however often it is recomputed');
  is(ch.res.classRes.baseMax, 3, 'with the base remembered separately');
}


/* ---- mana bases, bonuses, and what you cast on ----

   Classes need both escapes. "You have 6 Mana" replaces the Spirit formula;
   "+2 Mana" adds to it. And an Intellect spellcaster does not cast on Spirit. */

const { manaBase, castingCheck } = await import('../scripts/character.js');

is(manaBase(make()), 3, 'the base is floor(Spirit / 2) by default');

{
  // An Intellect spellcaster: "You have 6 Mana."
  const ch = make();
  ch.res.mana.flat = 6;
  is(manaBase(ch), 6, 'a flat base replaces the Spirit formula outright');
  is(manaMax(ch), 6, 'and that is the maximum');
  ch.checks.spi.mod = 20;
  is(manaMax(ch), 6, 'however high Spirit goes');
}

{
  // A smaller feature: "+2 Mana".
  const ch = make();
  ch.res.mana.bonus = 2;
  is(manaMax(ch), 5, 'a bonus adds to the Spirit base');
  ch.res.mana.flat = 6;
  is(manaMax(ch), 8, 'and to a flat base too');
}

{
  // Empty is not zero: it means work it out from Spirit.
  const ch = make();
  ch.res.mana.flat = null;
  is(manaMax(ch), 3, 'a null base falls back to Spirit');
  ch.res.mana.flat = 0;
  is(manaMax(ch), 0, 'but an explicit zero is a real zero');
}

{
  // Grants stack on top of whichever base is in play.
  const ch = make({ progression: { xp: 0, pathChecked: { 'P:1': true }, talentChecked: {}, gains: { 'P:1': { type: 'mana' } } } });
  ch.res.mana.flat = 6;
  is(manaMax(ch), 7, 'a step grant adds to a flat base');
}

{
  // Reconcile keeps a full pool full when the maximum moves.
  const ch = make();
  reconcile(ch);
  is(ch.res.mana.max, 3, 'reconcile sets the maximum');
  ch.res.mana.current = 3;
  ch.res.mana.flat = 6;
  reconcile(ch);
  is([ch.res.mana.current, ch.res.mana.max], [6, 6], 'a full pool stays full when the base grows');
  ch.res.mana.flat = 2;
  reconcile(ch);
  is([ch.res.mana.current, ch.res.mana.max], [2, 2], 'and is clamped when it shrinks');
}

is(castingCheck(make()), 'spi', 'Spirit is what you cast on by default');
is(castingCheck(make({ castingCheck: 'int' })), 'int', 'an Intellect spellcaster casts on Intellect');

{
  // The Tank: +10 Wounds. The field already existed; this pins it.
  const ch = make();
  ch.res.hp.bonus = 10;
  is(woundsMax(ch), 20, 'a Tank carries its ten extra wounds');
}


/* ---- finding the dice in game text ----

   Spell damage lives in three places and the reader used to see only two, so
   22 effects cast with nothing at all. */

const { markedFormulas, proseFormulas, damageFormulas } =
  await import('../scripts/formulas.js');

is(markedFormulas('deal [[2d6]] fire'), ['2d6'], 'marked dice are read');
is(markedFormulas('deal [[2d6+3]] and [[1d4]]'), ['2d6+3', '1d4'], 'several of them, in order');
is(markedFormulas('[[5 * PL]] armor'), [], 'and arithmetic that is not dice is ignored');
is(markedFormulas('nothing here'), [], 'text with no dice gives nothing');

is(proseFormulas('Creatures take 3d6 acid damage'), ['3d6'], 'dice in prose are found');
is(proseFormulas('takes 2d6 + 3 fire damage'), ['2d6+3'], 'with their bonus, spaces removed');
is(proseFormulas('deal [[1d8]] only'), [], 'marked dice are left to the marked reader');

{
  // The guess prefers dice that sit next to a damage word.
  is(proseFormulas('Make a check, then deal 2d6 fire damage')[0], '2d6',
    'damage dice win over incidental ones');
  is(proseFormulas('Heal for 1d6 and push them 1d4 squares')[0], '1d6',
    'healing counts as damage-ish for this purpose');
  is(proseFormulas('Roll 1d6 to see which door opens')[0], '1d6',
    'with no damage word at all it falls back to the first dice it sees');
}

{
  // The order damage is trusted in: field, then marked, then prose.
  is(damageFormulas('2d6 + 3', 'takes [[1d4]] and 3d6 damage')[0], '2d6+3',
    'the authored field wins');
  is(damageFormulas('', 'takes [[1d4]] and 3d6 damage')[0], '1d4',
    'then marked-up dice');
  is(damageFormulas('', 'takes 3d6 acid damage')[0], '3d6',
    'then whatever the prose says');
  is(damageFormulas('', 'a calming word, no dice'), [],
    'and nothing when there is nothing');
  is(damageFormulas('1d6', 'takes 1d6 damage'), ['1d6'],
    'the same formula twice is listed once');
  is(damageFormulas('2d6 + 3', 'takes 2d6+3 damage'), ['2d6+3'],
    'spacing does not make it look like two different formulas');
}



/* ---- how long a fight has taken ----

   Ten seconds a round, the same rule the companion uses so a phone and a
   laptop at one table agree. */

{
  const ROUND_SECONDS = 10;
  const elapsedLabel = round => {
    const secs = Math.max(0, (round - 1)) * ROUND_SECONDS;
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60), r = secs % 60;
    return r ? `${m}m ${r}s` : `${m}m`;
  };

  is(elapsedLabel(1), '0s', 'round one is where the clock starts');
  is(elapsedLabel(2), '10s', 'a round is ten seconds');
  is(elapsedLabel(7), '1m', 'six rounds in is a minute, said as a minute');
  is(elapsedLabel(8), '1m 10s', 'and the seconds come back after it');
  is(elapsedLabel(13), '2m', 'two minutes reads clean');
  is(elapsedLabel(0), '0s', 'a round below one never goes negative');

  // It must agree with the companion, which reports the same thing in minutes.
  const companionMinutes = round => ((round - 1) * 10 / 60).toFixed(2);
  for (const r of [1, 7, 13, 31]) {
    const mine = Math.max(0, r - 1) * ROUND_SECONDS;
    is(mine / 60, +companionMinutes(r), `round ${r} matches the companion's clock`);
  }
}


/* ---- the opposition as one turn ----

   `init.turn` indexes the PLAYED order, which is shorter than the list when
   monsters are grouped. The ordering is pure, so it is tested here; the
   clamping that goes with it is why `clampTurn()` exists. */

{
  // The same shape initiative.js builds, lifted so the maths is pinned.
  const playOrder = (list, grouped, isEnemy) => {
    if (!grouped) return list.map(c => ({ group: false, val: c.val, members: [c] }));
    const foes = list.filter(isEnemy);
    if (foes.length < 2) return list.map(c => ({ group: false, val: c.val, members: [c] }));
    const rest = list.filter(c => !isEnemy(c)).map(c => ({ group: false, val: c.val, members: [c] }));
    const val = Math.max(...foes.map(f => f.val || 0));
    const entry = { group: true, val, members: foes };
    const at = rest.findIndex(e => (e.val || 0) <= val);
    if (at === -1) rest.push(entry); else rest.splice(at, 0, entry);
    return rest;
  };
  const foe = c => !!c.foe;
  // Sorted highest first, the way addCombatant keeps it.
  const list = [
    { name: 'Scorn', val: 23 },
    { name: 'Brute A', val: 21, foe: true },
    { name: 'Barkus', val: 14 },
    { name: 'Brute B', val: 9, foe: true },
    { name: 'Brute C', val: 4, foe: true },
  ];

  {
    const o = playOrder(list, false, foe);
    is(o.length, 5, 'ungrouped, every combatant takes its own turn');
    is(o.map(e => e.members[0].name), ['Scorn', 'Brute A', 'Barkus', 'Brute B', 'Brute C'],
      'and the order is untouched');
  }

  {
    const o = playOrder(list, true, foe);
    is(o.length, 3, 'grouped, three monsters become one turn');
    is(o.map(e => (e.group ? 'FOES' : e.members[0].name)), ['Scorn', 'FOES', 'Barkus'],
      'and it lands at the best roll any of them made');
    is(o[1].val, 21, 'which is the highest monster roll, not the lowest');
    is(o[1].members.length, 3, 'carrying all three');
  }

  {
    // One monster is not a group: it takes its own turn like anyone else.
    const solo = [{ name: 'Scorn', val: 23 }, { name: 'Brute', val: 21, foe: true }];
    const o = playOrder(solo, true, foe);
    is(o.length, 2, 'a lone monster is not grouped');
    ok(!o.some(e => e.group), 'and there is no group entry at all');
  }

  {
    // The opposition rolling highest goes first.
    const fast = [{ name: 'Brute A', val: 30, foe: true }, { name: 'Brute B', val: 28, foe: true }, { name: 'Scorn', val: 9 }];
    const o = playOrder(fast, true, foe);
    is(o.map(e => (e.group ? 'FOES' : e.members[0].name)), ['FOES', 'Scorn'],
      'the opposition can lead the order');
  }

  {
    // The opposition rolling lowest goes last.
    const slow = [{ name: 'Scorn', val: 30 }, { name: 'Brute A', val: 5, foe: true }, { name: 'Brute B', val: 2, foe: true }];
    const o = playOrder(slow, true, foe);
    is(o.map(e => (e.group ? 'FOES' : e.members[0].name)), ['Scorn', 'FOES'],
      'and it can bring up the rear');
  }

  {
    // Turning the setting on must not leave `turn` past the end.
    const o = playOrder(list, true, foe);
    let turn = 4;                            // valid ungrouped, past the end grouped
    if (turn >= o.length) turn = 0;
    is(turn, 0, 'a turn index past the shorter order is brought back to the top');
  }

  {
    // An all-monster fight still plays.
    const all = [{ name: 'A', val: 9, foe: true }, { name: 'B', val: 4, foe: true }];
    const o = playOrder(all, true, foe);
    is(o.length, 1, 'a fight of nothing but monsters is one turn');
    is(o[0].members.length, 2, 'with both of them in it');
  }
}


/* ---- what the token card offers ----

   Starred gear if any is starred, otherwise the first few in the player's own
   order. The card has to be useful before anyone configures it and exactly
   theirs once they have. */

{
  const weaponsOf = ch => (ch.equipment || []).filter(i => String(i.check || '').trim());
  const cardActions = (ch, max = 3) => {
    const all = weaponsOf(ch);
    const pinned = all.filter(i => i.onCard);
    return (pinned.length ? pinned : all).slice(0, max);
  };
  const gear = (...names) => ({ equipment: names });
  const w = (name, onCard) => ({ name, check: 'Agility', ...(onCard ? { onCard: true } : {}) });
  const thing = name => ({ name });

  is(cardActions(gear(w('Mace'), w('Pistol'), thing('Cloak'))).map(x => x.name),
    ['Mace', 'Pistol'], 'only gear with a check to roll can be an action');

  is(cardActions(gear(thing('Cloak'), thing('Rope'))).length, 0,
    'carrying nothing rollable offers nothing');

  is(cardActions(gear(w('A'), w('B'), w('C'), w('D'))).map(x => x.name),
    ['A', 'B', 'C'], 'unstarred, it takes the first few in the carried order');

  is(cardActions(gear(w('A'), w('B'), w('C', true), w('D'))).map(x => x.name),
    ['C'], 'one star and only that one is offered');

  is(cardActions(gear(w('A', true), w('B'), w('C', true))).map(x => x.name),
    ['A', 'C'], 'several stars keep their carried order');

  is(cardActions(gear(w('A', true), w('B', true), w('C', true), w('D', true))).map(x => x.name),
    ['A', 'B', 'C'], 'more stars than the card holds are cut to what fits');

  {
    // Reordering the gear reorders the card, which is the point of dragging.
    const ch = gear(w('Mace'), w('Pistol'));
    is(cardActions(ch).map(x => x.name), ['Mace', 'Pistol'], 'carried order to begin with');
    ch.equipment.reverse();
    is(cardActions(ch).map(x => x.name), ['Pistol', 'Mace'], 'and it follows a reorder');
  }

  is(cardActions({}).length, 0, 'a character with no equipment at all is fine');
}


/* ---- telling gear apart ----

   Three kinds so a glance can sort them: something you hit with, something you
   hide behind, and everything else. Category first, what it does as a
   fallback, so custom items land somewhere sensible. */

{
  const W = new Set(['melee', 'ranged', 'firearm', 'magic']);
  const A = new Set(['armor', 'armour', 'shield']);
  const gearKind = it => {
    const c = String(it.category || '').trim().toLowerCase();
    if (W.has(c)) return 'weapon';
    if (A.has(c)) return 'armour';
    if (String(it.check || '').trim() && String(it.damage || '').trim()) return 'weapon';
    if (+it.armor > 0) return 'armour';
    return 'kit';
  };

  is(gearKind({ category: 'melee' }), 'weapon', 'melee is a weapon');
  is(gearKind({ category: 'firearm' }), 'weapon', 'and so is a firearm');
  is(gearKind({ category: 'magic' }), 'weapon', 'and a magic one');
  is(gearKind({ category: 'armor' }), 'armour', 'armor is armour');
  is(gearKind({ category: 'shield' }), 'armour', 'and so is a shield');
  is(gearKind({ category: 'Potions & Salves' }), 'kit', 'a potion is kit');
  is(gearKind({ category: 'Tools & Equipment' }), 'kit', 'so are tools');

  // Casing and spacing from the data should not decide the answer.
  is(gearKind({ category: ' Melee ' }), 'weapon', 'spacing does not matter');
  is(gearKind({ category: 'ARMOR' }), 'armour', 'nor does casing');

  // A custom item has no category, so what it does has to answer.
  is(gearKind({ name: 'Narrator special', check: 'Agility', damage: '1d6' }), 'weapon',
    'a custom thing that rolls and hurts is a weapon');
  is(gearKind({ name: 'Plate of a kind', armor: 4 }), 'armour',
    'a custom thing with an armour rating is armour');
  is(gearKind({ name: 'Odd trinket' }), 'kit', 'and anything else is kit');
  is(gearKind({ name: 'Focus', check: 'Intellect' }), 'kit',
    'a check with no damage is not a weapon');
}


/* ---- rewriting a feature for one character ----

   The data is shared and read-only, so a change is an override on the
   character. Only what actually differs is stored, so a later fix to the
   rulebook still reaches a character who only rewrote the flavour. */

const { withOverride, setOverride, clearOverride, isOverridden } =
  await import('../scripts/character.js');

{
  const written = { key: 'Careward:3', name: 'Banish', effect: 'Touch a creature...', check: 'Intellect' };
  const ch = { name: 'Scorn', featureOverrides: {} };

  is(withOverride(ch, written).name, 'Banish', 'untouched, it reads as written');
  ok(!withOverride(ch, written).edited, 'and is not marked as edited');
  ok(!isOverridden(ch, written), 'with nothing stored');

  setOverride(ch, written, 'name', 'Send Away');
  is(withOverride(ch, written).name, 'Send Away', 'the change shows');
  is(withOverride(ch, written).check, 'Intellect', 'and everything else is still the written version');
  ok(withOverride(ch, written).edited, 'the card can tell it was changed');
  is(Object.keys(ch.featureOverrides['Careward:3']), ['name'], 'only the changed field is stored');
}

{
  // Setting a field back to what the data says must not leave it "edited".
  const written = { key: 'P:1', name: 'Banish', effect: 'Text' };
  const ch = { featureOverrides: {} };
  setOverride(ch, written, 'name', 'Other');
  ok(isOverridden(ch, written), 'changed');
  setOverride(ch, written, 'name', 'Banish');
  ok(!isOverridden(ch, written), 'and changed back leaves nothing behind');
  is(ch.featureOverrides['P:1'], undefined, 'the whole entry goes, not an empty object');
}

{
  // A later fix to the rulebook reaches a character who only rewrote the text.
  const ch = { featureOverrides: {} };
  const v1 = { key: 'P:2', name: 'Banish', effect: 'Old text', damage: '1d6' };
  setOverride(ch, v1, 'effect', 'My own words');
  const v2 = { ...v1, damage: '2d6' };        // the data was corrected
  const read = withOverride(ch, v2);
  is(read.damage, '2d6', 'the corrected damage comes through');
  is(read.effect, 'My own words', 'while the rewritten text is kept');
}

{
  // Reset puts the written feature back exactly.
  const written = { key: 'P:3', name: 'A', effect: 'B', check: 'Spirit' };
  const ch = { featureOverrides: {} };
  setOverride(ch, written, 'name', 'X');
  setOverride(ch, written, 'check', 'Luck');
  clearOverride(ch, written);
  is(withOverride(ch, written), written, 'nothing is left of the override');
}

{
  // One character's change is nobody else's.
  const written = { key: 'P:4', name: 'Shared' };
  const a = { featureOverrides: {} }, b = { featureOverrides: {} };
  setOverride(a, written, 'name', 'Mine');
  is(withOverride(a, written).name, 'Mine', 'the one who changed it sees it');
  is(withOverride(b, written).name, 'Shared', 'and nobody else does');
}

{
  // A feature with no key cannot be overridden, and must not throw.
  const ch = { featureOverrides: {} };
  const noKey = { name: 'Nameless' };
  setOverride(ch, noKey, 'name', 'X');
  is(Object.keys(ch.featureOverrides).length, 0, 'a feature with no key stores nothing');
  is(withOverride(ch, noKey).name, 'Nameless', 'and reads as written');
  is(withOverride(null, noKey).name, 'Nameless', 'with no character either');
  setOverride(ch, written_none(), 'nope', 'X');
  function written_none() { return { key: 'P:5' }; }
  is(ch.featureOverrides['P:5'], undefined, 'and a field that is not a feature field is refused');
}


/* ---- a feature and the upgrades it carries ----

   "Bloodletting: Bloodmark" is not a thing a character announces. It is how
   Bloodletting behaves once it is bought, so the base carries it and an
   upgrade read out on its own would say "deal an additional 1d6" with no sign
   of what it is additional to. */

{
  const featFamily = name =>
    String(name || '').split(':')[0].replace(/\s+(II|III|IV|V|VI|VII|VIII|IX|X)\s*$/i, '').trim();
  const shortName = name => {
    const t = String(name || ''); const i = t.indexOf(':');
    return i > 0 ? t.slice(i + 1).trim() : t;
  };
  const familyGroups = cards => {
    const out = new Map();
    for (const c of cards) {
      const fam = featFamily(c.name) || c.name || 'Unnamed';
      if (!out.has(fam)) out.set(fam, []);
      out.get(fam).push(c);
    }
    return out;
  };

  is(featFamily('Bloodletting: Bloodmark'), 'Bloodletting', 'a colon marks an upgrade');
  is(featFamily('Storm Stance II'), 'Storm Stance', 'and so does a roman numeral');
  is(featFamily('Sanctuary'), 'Sanctuary', 'a base is its own family');
  is(shortName('Bloodletting: Bloodmark'), 'Bloodmark', 'an upgrade is named short once the family is known');
  is(shortName('Sanctuary'), 'Sanctuary', 'and a base keeps its whole name');

  {
    // The real Barber talent, in the order it is bought.
    const cards = ['Bloodletting', 'Bloodletting: Bloodmark', 'Bloodletting: Regen',
      'Bloodletting: Infernal Force', 'Bloodletting: Bloodlink'].map(name => ({ name }));
    const [[fam, list]] = [...familyGroups(cards)];
    is(fam, 'Bloodletting', 'all five are one family');
    is(list.length, 5, 'with every step in it');
    const [base, ...upgrades] = list;
    is(base.name, 'Bloodletting', 'the first bought is the base');
    is(upgrades.map(u => shortName(u.name)),
      ['Bloodmark', 'Regen', 'Infernal Force', 'Bloodlink'],
      'and the rest are what it carries');
  }

  {
    // A base sends its own text plus each upgrade's, and every die from both.
    const damageFormulas = (field, text) => {
      const out = [];
      const f = String(field || '').replace(/\s+/g, '');
      if (f) out.push(f);
      for (const m of String(text || '').matchAll(/(\d*d\d+)/g)) if (!out.includes(m[1])) out.push(m[1]);
      return out;
    };
    const base = { name: 'Bloodletting', effect: 'Touch a creature and make an Influence check.', damage: '1d6' };
    const carried = [
      { name: 'Bloodletting: Bloodmark', effect: 'Deal an additional 1d6 damage.' },
      { name: 'Bloodletting: Bloodlink', effect: 'Your ally takes 2 healing.' },
    ];
    const parts = [base.effect, ...carried.map(u => `${shortName(u.name)}: ${u.effect}`)];
    const rolls = [...damageFormulas(base.damage, base.effect)];
    for (const u of carried) for (const r of damageFormulas(u.damage, u.effect)) if (!rolls.includes(r)) rolls.push(r);

    is(parts.length, 3, 'one post carries the base and both upgrades');
    ok(parts[1].startsWith('Bloodmark:'), 'each upgrade is labelled by its short name');
    is(rolls, ['1d6'], 'and a die named twice is offered once');
  }
}


/* ---- a note is not one paragraph ----

   A feature sent with four upgrades used to arrive as one block, because the
   markup was a single <p> and HTML eats newlines. */

{
  const paras = text => String(text || '')
    .split(/\n{2,}/)
    .map(t => t.trim())
    .filter(Boolean);

  is(paras('one'), ['one'], 'a single run of prose is one paragraph');
  is(paras('one\n\ntwo'), ['one', 'two'], 'a blank line breaks it');
  is(paras('one\ntwo'), ['one\ntwo'], 'a single newline does not');
  is(paras('one\n\n\n\ntwo'), ['one', 'two'], 'however many blank lines there are');
  is(paras('  spaced  \n\n  out  '), ['spaced', 'out'], 'and each is trimmed');
  is(paras(''), [], 'nothing gives nothing');
  is(paras(null), [], 'and neither does null');
}

/* ---- scenes: a table's pages ----

   The open scene's map is live at the top of `state`; the rest wait in
   `state.scenes`. Switching writes the live fields back and reads the arriving
   ones over the top, which is cheap and works — as long as SCENE_FIELDS names
   every field that belongs to a page.

   That list is the whole risk. A field added to a scene and left out of it
   would look fine, because the arrays are shared by reference and most edits
   write straight through. It would go wrong on the first switch, quietly, by
   carrying one page's setting onto another. So the first test here is the one
   that matters: the list and the model must agree. */

{
  const sc = makeScene('Cellar');
  is(sc.name, 'Cellar', 'a scene is named when it is made');
  ok(Array.isArray(sc.items) && sc.items.length === 0, 'and starts with an empty map');
  is(sc.layers.length, 3, 'with the three default layers');
  is(sc.activeLayerId, sc.layers[2].id, 'the token layer active, as the app does');
  ok(sc.id !== makeScene().id, 'every scene gets its own id');
  is(sc.folder, '', 'and is loose until it is filed in a folder');

  /* Bookkeeping, not map: the name, the preview and the folder it is filed
     under are the scene's own, and the id identifies it. Everything else is
     the page itself and has to travel when you switch. */
  const BOOKKEEPING = new Set(['id', 'name', 'thumb', 'folder']);
  const modelled = Object.keys(sc).filter(k => !BOOKKEEPING.has(k));
  is(modelled.slice().sort(), SCENE_FIELDS.slice().sort(),
    'SCENE_FIELDS names every field of a scene that is not bookkeeping');

  for (const k of SCENE_FIELDS) {
    ok(k in sc, `a new scene carries ${k}, so switching to it never reads undefined`);
  }
}

/* The switch itself, as scenes.js does it: sync the live fields into the scene
   that is leaving, then copy the arriving one's over the top. */
{
  const live = {};
  const load = (st, sc) => { for (const k of SCENE_FIELDS) st[k] = sc[k]; };
  const sync = (st, sc) => { for (const k of SCENE_FIELDS) sc[k] = st[k]; };

  const road = makeScene('Road');
  const inn = makeScene('Inn');
  load(live, road);

  live.items.push({ id: 'i9', kind: 'token', name: 'Brute' });
  is(road.items.length, 1, 'an item pushed onto the live map is on the scene: the array is shared');

  live.cam = { x: 40, y: 0, z: 2 };
  is(road.cam.z, 1, 'but replacing a whole object breaks that link');
  sync(live, road);
  is(road.cam.z, 2, 'which is exactly what the sync before a switch is for');

  load(live, inn);
  is(live.items.length, 0, 'the inn is empty, as it was made');
  is(live.cam.z, 1, 'and brings its own camera');
  is(road.items.length, 1, 'the road still has its token');

  load(live, road);
  is(live.items[0].name, 'Brute', 'and going back finds it where it was left');
  is(live.cam.z, 2, 'camera and all');
}

/* Lighting is per scene, so an outdoor road and a lit cellar are two settings
   rather than one the narrator keeps flipping. */
{
  const a = makeScene('Outside');
  const b = makeScene('Cellar');
  a.light.enabled = false;
  a.light.dim = 0;
  ok(b.light.enabled === true, 'turning the light off outside leaves the cellar lit');
  is(b.light.dim, DEFAULT_LIGHT().dim, 'and its dim untouched');

  a.tint = { color: '#16284a', amount: .34 };
  is(b.tint, DEFAULT_TINT(), 'and a colour wash on one is not on the other');
  is(DEFAULT_TINT().amount, 0, 'a fresh scene has no wash at all, so the pass is skipped');
}

/* A scene copied for a variant of the same room must not share its map with
   the original, or drawing on one would draw on both. This is the clone
   duplicateScene() makes. */
{
  const sc = makeScene('Crypt');
  sc.items.push({ id: 'i1', kind: 'token', name: 'Wight' });
  const copy = structuredClone({ ...sc, id: undefined });
  copy.id = 'i99';
  copy.name = 'Crypt copy';
  copy.items.push({ id: 'i2', kind: 'token', name: 'Second wight' });
  is(sc.items.length, 1, 'adding to the copy does not add to the original');
  is(copy.items.length, 2, 'the copy has both');
  ok(copy.items[0] !== sc.items[0], 'and the items themselves are separate objects');
  ok(copy.id !== sc.id, 'a copy is its own scene');
}

/* ---- the ruler ----

   Check20 writes its range bands in the glossary, with the distances in the
   definition. The ruler parses them from there rather than keeping a second
   copy of the numbers, so tuning the rules tunes the ruler. These are the
   entries as data/glossary.json has them. */

const GLOSS = [
  { term: 'Melee Range', category: 'Range', definition: '5ft or touching.' },
  { term: 'Reach Range', category: 'Range', definition: '10ft.' },
  { term: 'Short Range', category: 'Range', definition: 'Within 50ft.' },
  { term: 'Medium Range', category: 'Range', definition: '50-200ft.' },
  { term: 'Long Range', category: 'Range', definition: '200-1000ft.' },
  { term: 'Visible Range', category: 'Range', definition: 'Within line of sight.' },
  { term: 'Prone', category: 'Condition', definition: 'You are on the ground.' },
];

{
  const bands = parseBands(GLOSS);
  is(bands.map(b => b.name), ['Melee', 'Reach', 'Short', 'Medium', 'Long'],
    'the five bands with a distance, near to far');
  ok(!bands.some(b => b.name === 'Visible'),
    'line of sight is a range but not a distance, so it is not a band');
  ok(!bands.some(b => b.name === 'Prone'),
    'and nothing outside the Range category gets in');

  is(bands.find(b => b.name === 'Short'), { name: 'Short', min: 0, max: 50 },
    '"Within 50ft" is nought to fifty');
  is(bands.find(b => b.name === 'Medium'), { name: 'Medium', min: 50, max: 200 },
    'and "50-200ft" carries both ends');

  /* The tighter band wins: 10ft is Reach, not Short, even though Short covers
     it too \u2014 the tighter one is what a player means. */
  is(bandFor(0, bands), 'Melee', 'touching is Melee');
  is(bandFor(5, bands), 'Melee', 'and so is five feet');
  is(bandFor(6, bands), 'Reach', 'a foot past Melee is Reach');
  is(bandFor(10, bands), 'Reach', 'ten feet is still Reach');
  is(bandFor(11, bands), 'Short', 'past Reach is Short');
  is(bandFor(50, bands), 'Short', 'fifty feet is the end of Short');
  is(bandFor(51, bands), 'Medium', 'and one more is Medium');
  is(bandFor(200, bands), 'Medium', 'two hundred is the end of Medium');
  is(bandFor(201, bands), 'Long', 'past that is Long');
  is(bandFor(1000, bands), 'Long', 'a thousand feet is the end of Long');
  is(bandFor(1001, bands), '', 'and past the longest band there is no name for it');
  is(bandFor(-1, bands), '', 'a negative distance is not a distance');
  is(bandFor(10, []), '', 'with no bands loaded it says nothing rather than guessing');
}

/* A cell is five feet, the same as the map's grid. */
{
  is(FEET_PER_CELL, 5, 'one cell is five feet');
  const g = 50;   // 50px to a cell, the default grid
  is(legFeet([0, 0], [50, 0], g), 5, 'one cell across is five feet');
  is(legFeet([0, 0], [500, 0], g), 50, 'ten cells is fifty');
  is(Math.round(legFeet([0, 0], [150, 200], g)), 25, 'and a diagonal is measured, not counted');
  is(toCells(47), 9, 'feet round to the nearest whole cell');

  /* Waypoints are the whole point of a path: a token walking an L does not
     travel the hypotenuse. */
  const L = [[0, 0], [200, 0], [200, 150]];
  is(pathFeet(L, g), 35, 'an L is its legs added up');
  is(Math.round(legFeet(L[0], L[2], g)), 25, 'which is further than the straight line');
  is(pathFeet([[0, 0]], g), 0, 'one point is no distance');
  is(pathFeet([], g), 0, 'and no points is none either');

  /* The grid can be resized, and the feet have to follow it. */
  is(legFeet([0, 0], [80, 0], 80), 5, 'a bigger grid still makes one cell five feet');
}

{
  const bands = parseBands(GLOSS);
  is(measureLabel(47, bands), '45 ft · 9 cells · Short', 'the label reads distance, cells and band');
  is(measureLabel(5, bands), '5 ft · 1 cell · Melee', 'and one cell is singular');
  is(measureLabel(0, bands), '0 ft · 0 cells · Melee', 'nowhere is still Melee');
  is(measureLabel(1200, bands), '1200 ft · 240 cells', 'past the last band it just says how far');
}

/* ---- a scene measures in its own units ----

   Five feet to a cell is the Check20 default and what a battlemap means, but a
   city map might be fifty to the cell and a world map ten miles. A ruler that
   insisted on five would be lying on both. */

{
  is(scaleOf(null), { per: 5, unit: 'ft' }, 'no scene at all falls back to the Check20 default');
  is(scaleOf({}), { per: 5, unit: 'ft' }, 'and so does a scene that has never been given one');
  is(scaleOf({ scale: { per: 10, unit: 'miles' } }), { per: 10, unit: 'miles' },
    'a world map keeps what it was told');
  is(scaleOf({ scale: { per: 0, unit: 'ft' } }), { per: 5, unit: 'ft' },
    'nought to the cell is not a scale, so the default stands');
  is(scaleOf({ scale: { per: -3, unit: 'ft' } }), { per: 5, unit: 'ft' },
    'and neither is a negative one');
  is(scaleOf({ scale: { per: 20, unit: '   ' } }), { per: 20, unit: 'ft' },
    'a blank unit falls back rather than rendering an empty word');

  ok(unitIsFeet('ft') && unitIsFeet('Feet') && unitIsFeet('FOOT'),
    'feet is feet however it is written');
  ok(!unitIsFeet('m') && !unitIsFeet('miles') && !unitIsFeet(''),
    'and nothing else is');
}

{
  const bands = parseBands(GLOSS);
  const g = 50;

  // Ten cells across, on three different scales.
  is(legFeet([0, 0], [500, 0], g, 5), 50, 'ten cells at five feet is fifty feet');
  is(legFeet([0, 0], [500, 0], g, 50), 500, 'the same ten cells at fifty is five hundred');
  is(legFeet([0, 0], [500, 0], g, 10), 100, 'and at ten miles to the cell, a hundred miles');

  is(measureLabel(50, bands, { per: 5, unit: 'ft' }), '50 ft · 10 cells · Short',
    'a battlemap gets the band');
  is(measureLabel(100, bands, { per: 10, unit: 'miles' }), '100 miles · 10 cells',
    'a world map gets no band: the bands are written in feet, so on miles they would be a lie');
  is(measureLabel(500, bands, { per: 50, unit: 'ft' }), '500 ft · 10 cells · Long',
    'a city map in feet still gets one, at its own scale');
  is(measureLabel(50, bands), '50 ft · 10 cells · Short',
    'and with no scale passed it behaves as it always did');

  is(pathFeet([[0, 0], [200, 0], [200, 150]], g, 50), 350,
    'a path adds its legs up at the scene scale');
}

/* ---- placing a battlemap ----

   A dropped image is a picture with no idea how big a room is. 4000px is not
   4000 map pixels of anything in particular, so it is placed by cells: its
   longest side spans a number of them, and the narrator adjusts from there.

   All of this is arithmetic with no canvas in it, and arithmetic that puts a
   map in the wrong place is worth a test. */

{
  const g = 50;                                   // 50px to a cell
  const raw = { w: 4000, h: 3000, x: 0, y: 0, scale: 1 };

  is(backdropRect(raw), { x: 0, y: 0, w: 4000, h: 3000 },
    'at scale 1 the image pixels are the map pixels');
  is(backdropRect({ ...raw, scale: .5 }), { x: 0, y: 0, w: 2000, h: 1500 },
    'and scale multiplies both sides');
  is(backdropRect(null), { x: 0, y: 0, w: 0, h: 0 },
    'no image is no rectangle rather than a crash');
  is(backdropRect({}), { x: 0, y: 0, w: 0, h: 0 },
    'and neither is an empty one');

  // Forty cells wide: the longest side spans 40 * 50 = 2000 world pixels.
  const fitted = fitToCells(raw, 40, g);
  is(fitted.scale, 0.5, 'forty cells across a 4000px map is half size');
  const r = backdropRect(fitted);
  is(r.w, 2000, 'which is forty cells wide');
  is(r.h, 1500, 'and the aspect ratio is kept');

  // A tall map fits by its own longest side, which is its height.
  const tall = fitToCells({ w: 1000, h: 2000, x: 0, y: 0, scale: 1 }, 40, g);
  is(backdropRect(tall).h, 2000, 'a tall map spans forty cells top to bottom');
  is(backdropRect(tall).w, 1000, 'and is narrower than it is high');

  is(fitToCells({ x: 0, y: 0 }, 10, g).scale, 500,
    'a map with no size still gets a number rather than a NaN');
}

/* Nudging is for lining a map's own grid up with the table's, so it must move
   the map and change nothing else. */
{
  const im = { w: 100, h: 100, x: 10, y: 20, scale: 2 };
  is(nudgeBackdrop(im, 5, -5), { w: 100, h: 100, x: 15, y: 15, scale: 2 },
    'nudge moves it and leaves the scale alone');
  is(im.x, 10, 'and does not touch the one it was given');
  is(nudgeBackdrop({ w: 10, h: 10 }, 3, 4).x, 3, 'a map with no position starts at nought');
}

/* Resizing happens about the centre. Growing from the top-left would walk the
   map away from wherever it had just been lined up. */
{
  const im = { w: 100, h: 100, x: 0, y: 0, scale: 1 };
  const big = zoomBackdrop(im, 2);
  is(big.scale, 2, 'twice the size');
  is(backdropRect(big), { x: -50, y: -50, w: 200, h: 200 },
    'grown about its own centre, so the middle has not moved');

  const mid = c => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 });
  is(mid(backdropRect(im)), mid(backdropRect(big)), 'the centre is where it was');
  is(mid(backdropRect(zoomBackdrop(im, .5))), mid(backdropRect(im)),
    'and shrinking keeps it too');

  /* Nudge then resize: the whole point of centring. The centre the narrator
     lined up stays lined up. */
  const placed = nudgeBackdrop(im, 37, -14);
  is(mid(backdropRect(zoomBackdrop(placed, 1.1))), mid(backdropRect(placed)),
    'a map nudged into place stays put when it is resized');

  ok(zoomBackdrop(im, 1000).scale <= 40, 'there is a ceiling on how big it goes');
  ok(zoomBackdrop(im, 0.00001).scale >= .02, 'and a floor on how small');
}

/* ---- a scene survives being saved and read back ----

   This is the test that should have existed already. The old reader
   hand-listed the fields it carried, and by the time a scene had a map, a
   scale and a folder it was listing nine of twelve — so every reload silently
   dropped the battlemap, reset the scale to five feet and lost the folders.
   Nothing said so; the table just came back slightly wrong.

   The rule the reader now follows, and that this pins down: everything in
   SCENE_FIELDS comes back, plus the bookkeeping. */

{
  const layers = [{ id: 'l1', name: 'Map', type: 'map', visible: true, locked: false, opacity: 1, narrator: false }];
  const saved = {
    id: 'sc7',
    name: 'The Cellar',
    folder: 'Chapter 2',
    layers,
    items: [{ id: 'i1', kind: 'token', name: 'Wight', x: 10, y: 20 }],
    activeLayerId: 'l1',
    grid: { show: false, size: 80 },
    cam: { x: -120, y: 44, z: 1.5 },
    light: { enabled: false, dim: .2, cells: { '1,1': 3 }, doors: {}, nextRegion: 4 },
    tint: { color: '#16284a', amount: .34 },
    scale: { per: 10, unit: 'miles' },
    image: { src: 'local', key: 'm123', w: 2048, h: 1536, x: -40, y: -30, scale: .5 },
    thumb: 'data:image/jpeg;base64,abc',
  };

  const back = migrateScene(saved, 'Fallback');

  // The one that was actually broken.
  is(back.image, saved.image, 'the battlemap comes back — it did not, and every reload lost it');
  is(back.scale, saved.scale, 'and so does the scene scale');
  is(back.folder, 'Chapter 2', 'and the folder it was filed in');

  is(back.id, 'sc7', 'a scene keeps its id, so the open one is still the open one');
  is(back.name, 'The Cellar', 'and its name');
  is(back.thumb, saved.thumb, 'and its preview');
  is(back.grid, { show: false, size: 80, ink: '', weight: 1 },
    'the grid is per scene and comes back whole, with the fields it gained');
  is(back.cam, saved.cam, 'and the camera, so you are looking where you left off');
  is(back.tint, saved.tint, 'and the colour wash');
  is(back.light.enabled, false, 'lighting off stays off');
  is(back.light.dim, .2, 'at the dim it was set to');
  is(back.light.cells, { '1,1': 3 }, 'with the rooms that were built');
  is(back.items.length, 1, 'and the map itself');

  /* The guard that makes the above hold in future: every field the model has
     is carried. Add one to makeScene and forget the reader, and this fails. */
  for (const k of SCENE_FIELDS) {
    ok(back[k] !== undefined, `a saved scene comes back with ${k}`);
  }
}

/* What a file can be wrong about, rather than merely missing. */
{
  const bare = {
    layers: [{ id: 'l1', name: 'Map', type: 'map', visible: true, locked: false, opacity: 1, narrator: false }],
    items: [],
  };

  const back = migrateScene(bare, 'Scene 1');
  is(back.name, 'Scene 1', 'a scene with no name takes the one it is offered');
  is(back.folder, '', 'and is loose');
  is(back.scale, { per: 5, unit: 'ft' }, 'and measures in Check20 feet');
  is(back.image, null, 'and has no map');
  is(back.grid, { show: true, size: 50, ink: '', weight: 1 }, 'on a default grid');
  is(back.activeLayerId, 'l1', 'with its topmost layer active');
  for (const k of SCENE_FIELDS) ok(back[k] !== undefined, `even bare, it has ${k}`);

  // A half-written grid gains the field it is missing rather than losing the one it has.
  is(migrateScene({ ...bare, grid: { size: 70 } }, 'x').grid,
    { show: true, size: 70, ink: '', weight: 1 },
    'a grid saved before it had `show`, `ink` or `weight` keeps its size and gains them');
  is(migrateScene({ ...bare, grid: { size: 70, ink: '#ff0000' } }, 'x').grid.ink, '#ff0000',
    'and a grid colour set on a scene comes back');
  is(migrateScene({ ...bare, light: { enabled: false } }, 'x').light.dim, DEFAULT_LIGHT().dim,
    'and lighting saved before it had a dim gets the default one');

  // A map is a reference, never bytes. Anything that is not one is not a map.
  is(migrateScene({ ...bare, image: {} }, 'x').image, null,
    'an image with neither a key nor a url is not a map');
  is(migrateScene({ ...bare, image: 'sunset.png' }, 'x').image, null,
    'and neither is a bare string');
  ok(migrateScene({ ...bare, image: { src: 'url', url: 'https://x/y.png' } }, 'x').image,
    'a linked map is');

  // v1 files carried light items that are rooms now.
  is(migrateScene({ ...bare, items: [{ id: 'i1', kind: 'light' }, { id: 'i2', kind: 'token', x: 0, y: 0 }] }, 'x').items.length,
    1, 'v1 light items are dropped, the rest are kept');

  let threw = false;
  try { migrateScene({ items: [] }, 'x'); } catch { threw = true; }
  ok(threw, 'a scene with no layers is not a scene, and says so rather than half-loading');
}

/* ---- report ---- */

console.log(`\n  ${pass} passed, ${fail} failed\n`);
for (const f of fails) console.log('  FAIL  ' + f + '\n');
process.exit(fail ? 1 : 0);

