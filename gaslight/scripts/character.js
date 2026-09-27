/* The Check20 character model.

   Shaped to match active-sheet's character so the two stay in step, but
   flattened: active-sheet holds one character in a module-level `state`,
   while a table holds many in `state.chars[]`.

   Everything here is plain data that survives JSON.stringify — no Sets, no
   Maps — because a character is saved verbatim inside the table file. */

/* The ten checks, in sheet order. Short keys match vocab.json and
   active-sheet; the VTT used to key them by label and is migrated below. */
export const CHECKS = {
  physical: [
    { key: 'agi', label: 'Agility' },
    { key: 'cra', label: 'Crafting' },
    { key: 'ste', label: 'Stealth' },
    { key: 'str', label: 'Strength' },
    { key: 'sur', label: 'Survival' },
  ],
  mental: [
    { key: 'inf', label: 'Influence' },
    { key: 'int', label: 'Intellect' },
    { key: 'lck', label: 'Luck' },
    { key: 'obs', label: 'Observation' },
    { key: 'spi', label: 'Spirit' },
  ],
};

export const ALL_CHECKS = [...CHECKS.physical, ...CHECKS.mental];
export const CHECK_KEYS = ALL_CHECKS.map(c => c.key);

const LABEL_BY_KEY = Object.fromEntries(ALL_CHECKS.map(c => [c.key, c.label]));
const KEY_BY_LABEL = Object.fromEntries(ALL_CHECKS.map(c => [c.label.toLowerCase(), c.key]));

export const checkLabel = key => LABEL_BY_KEY[key] || key;
export const checkKey = label => KEY_BY_LABEL[String(label).toLowerCase()] || null;

export const TOKEN_COLORS = ['#af8000', '#4c6e6e', '#a45e3b', '#7a9a5e', '#8a6bb5', '#d9b382'];

function blankChecks() {
  const out = {};
  for (const k of CHECK_KEYS) out[k] = { mod: 0, bonus: 0, armorBonus: 0 };
  return out;
}

export function makeCharacter(seed = {}) {
  return {
    id: seed.id,
    name: seed.name || '',
    color: seed.color || TOKEN_COLORS[0],
    open: true,

    // identity
    level: 1,
    species: '', speciesLineage: '', speciesOption: '',
    speciesFeature: null, speciesSubFeature: null,
    classKey: '', pathName: '', talentName: '',
    age: '', size: '', diet: '', language: '', motivation: '', trinket: '',
    wealth: 0,

    checks: blankChecks(),

    res: {
      hp: { current: 0, max: 0, bonus: 0 },
      armor: { current: 0, max: 0 },
      mana: { current: 0, max: 0 },
      classRes: { current: 0, max: 0, label: 'Resource' },
      custom: [],
    },
    moveMod: 0,
    lowlightMod: 0,

    conditions: [],          // condition names, an array so it serialises
    equipment: [],
    favoriteSpells: [],
    featureOverrides: {},

    progression: { pathChecked: {}, talentChecked: {}, otherGains: [], xp: 0 },
    notes: '',
    npcs: [],
  };
}

/* ---- derived values ----
   Formulas follow active-sheet.js, which is the live implementation. */

const mod = (ch, key) => ch.checks?.[key]?.mod || 0;
const bonusOf = (ch, key) => ch.checks?.[key]?.bonus || 0;

/** mod + manual bonus + armour bonus: what you actually roll with. */
export function checkTotal(ch, key) {
  const c = ch.checks?.[key];
  if (!c) return 0;
  return Math.min(CHECK_CAP, (c.mod || 0) + (c.bonus || 0) + (c.armorBonus || 0) + checkGain(ch, key));
}

const sumEquip = (ch, field) => (ch.equipment || []).reduce((n, e) => n + (e[field] || 0), 0);

/** Wounds max = Agility + Strength + Survival + manual bonus. Floored at 1 so
    the wound bar always has a denominator. */
export function woundsMax(ch) {
  return Math.max(1, mod(ch, 'agi') + mod(ch, 'str') + mod(ch, 'sur') + (ch.res?.hp?.bonus || 0));
}

/* Mana: every 2 Spirit grants 1, plus anything steps have granted.

   Two escapes, because classes need them. A flat base replaces the Spirit
   formula outright — an Intellect spellcaster reads "You have 6 Mana", and
   its Spirit is beside the point. A bonus adds on top of whichever base is in
   play, for the smaller "+2 Mana" features. Both live on `res.mana`. */
export function manaBase(ch) {
  const flat = ch?.res?.mana?.flat;
  if (Number.isFinite(flat)) return Math.max(0, flat);
  return Math.floor((mod(ch, 'spi') + bonusOf(ch, 'spi')) / 2);
}

export function manaMax(ch) {
  return Math.max(0, manaBase(ch) + (ch?.res?.mana?.bonus || 0) + manaGain(ch));
}

/* Which check a character casts on. Spirit unless the class says otherwise —
   an Intellect spellcaster casts on Intellect, and several classes do. */
export const castingCheck = ch => ch?.castingCheck || 'spi';

/** Base 30 ft, +5 ft per 2 Agility. */
export function movement(ch) {
  return 30 + Math.floor(mod(ch, 'agi') / 2) * 5 + (ch.moveMod || 0) + sumEquip(ch, 'moveMod');
}

/** Base 30 ft, +5 ft per 2 Observation. */
export function lowLight(ch) {
  return 30 + Math.floor(mod(ch, 'obs') / 2) * 5 + (ch.lowlightMod || 0) + sumEquip(ch, 'lowlightMod');
}

/** Recompute maxima and keep current values sane.

    A character sitting at full health stays at full when a check raises the
    maximum, which also covers a brand new character whose maxima are still 0.
    A wounded character keeps the damage they have taken. */
export function reconcile(ch) {
  recalcEquipment(ch);
  const wm = woundsMax(ch), mm = manaMax(ch);

  const hp = ch.res.hp;
  const hpFull = hp.current >= hp.max;
  hp.max = wm;
  hp.current = hpFull ? wm : Math.min(hp.current, wm);

  const mana = ch.res.mana;
  const manaFull = mana.current >= mana.max;
  mana.max = mm;
  mana.current = manaFull ? mm : Math.min(mana.current, mm);
  ch.res.armor.current = Math.min(ch.res.armor.current, ch.res.armor.max);
  /* The class resource has a base the narrator sets and a total that includes
     what steps have granted. `baseMax` is captured once, the first time this
     runs, from whatever the character already had — without it, every
     reconcile would add the grants on top of the previous total and the
     resource would climb on its own. */
  const cr = ch.res.classRes;
  if (!Number.isFinite(cr.baseMax)) cr.baseMax = Number.isFinite(cr.max) ? cr.max : 0;
  cr.max = Math.max(0, cr.baseMax + classResGain(ch));
  cr.current = Math.min(cr.current, cr.max);
  return ch;
}

/* ---- migration ----
   Two older shapes exist: v1 D&D-style characters, and the Check20 shell the
   VTT used before this model (checks keyed by label, flat resources). */

export function migrateCharacter(ch) {
  if (ch && ch.res && ch.checks && ch.checks.agi) return ch;   // already current

  const out = makeCharacter({ id: ch?.id, name: ch?.name, color: ch?.color });
  if (!ch) return out;

  out.open = ch.open ?? false;
  out.notes = ch.notes || '';

  // checks: label-keyed numbers -> key-keyed { mod, bonus, armorBonus }
  if (ch.checks) {
    for (const [k, v] of Object.entries(ch.checks)) {
      const key = CHECK_KEYS.includes(k) ? k : checkKey(k);
      if (!key) continue;
      out.checks[key] = typeof v === 'object' && v !== null
        ? { mod: v.mod || 0, bonus: v.bonus || 0, armorBonus: v.armorBonus || 0 }
        : { mod: +v || 0, bonus: 0, armorBonus: 0 };
    }
  }

  out.res.hp.current = ch.wounds ?? ch.hp ?? 0;
  out.res.armor.current = ch.armor || 0;
  out.res.armor.max = ch.armorMax || 0;
  out.res.mana.current = ch.mana || 0;
  out.res.classRes.current = ch.cres || 0;
  out.res.classRes.max = ch.cresMax || 0;

  return reconcile(out);
}

/* ---- equipment ----
   Gear feeds back into the sheet: armour ratings set the armour maximum, and
   "Stealth +1" style strings on any carried item adjust the matching check.
   The website parses these the same way, from checkBonus/checkPenalty and,
   for armour only, free-text notes. */

/** Pull "Stealth +1, Agility-2" out of a string, keyed by check. */
export function parseCheckMods(text) {
  const out = {};
  if (!text) return out;
  for (const { key, label } of ALL_CHECKS) {
    const m = String(text).match(new RegExp(label + String.raw`\s*([+-]\d+)`, 'i'));
    if (m) out[key] = (out[key] || 0) + parseInt(m[1], 10);
  }
  return out;
}

export const isArmor = it => it.category === 'armor' || it.category === 'shield';

/** Total bulk carried, and what it costs at this Strength. */
export function bulkStatus(ch) {
  const carried = (ch.equipment || []).reduce((n, e) => n + (+e.bulk || 0), 0);
  const str = mod(ch, 'str');
  return {
    carried,
    limit: str,
    over: carried > str,
    exhausted: carried > str * 2,
  };
}

/** Recompute armour rating and per-check armour bonuses from equipment. */
export function recalcEquipment(ch) {
  for (const k of CHECK_KEYS) ch.checks[k].armorBonus = 0;

  let totalArmor = 0;
  let sawArmor = false;
  for (const it of ch.equipment || []) {
    if (isArmor(it)) { totalArmor += +it.armor || 0; sawArmor = true; }
    // Structured bonuses apply from anything carried. Free-text notes are
    // armour-only, so scratch notes on a gear item cannot move checks.
    const sources = [it.checkBonus, it.checkPenalty];
    if (isArmor(it)) sources.push(it.notes || '');
    for (const [key, val] of Object.entries(parseCheckMods(sources.filter(Boolean).join(', ')))) {
      if (ch.checks[key]) ch.checks[key].armorBonus += val;
    }
  }

  // Only let gear drive the armour maximum when the character actually has
  // armour. NPCs and monsters set it by hand and must keep that value.
  if (sawArmor) {
    const blank = ch.res.armor.max === 0 && ch.res.armor.current === 0;
    ch.res.armor.max = totalArmor;
    ch.res.armor.current = blank ? totalArmor : Math.min(ch.res.armor.current, totalArmor);
  }
}

/* ---- damage ---- */

/** Armour absorbs first, the remainder cuts into wounds. Returns a summary,
    or null if the amount was not a positive number. */
export function applyDamage(ch, amount) {
  const dmg = Math.max(0, Math.floor(Number(amount) || 0));
  if (!dmg) return null;

  const armor = ch.res.armor, hp = ch.res.hp;
  const armorHit = Math.min(armor.current || 0, dmg);
  const woundsHit = dmg - armorHit;

  armor.current = Math.max(0, (armor.current || 0) - armorHit);
  hp.current = Math.max(0, (hp.current || 0) - woundsHit);

  const downed = hp.current <= 0;
  // Reaching 0 wounds is the Injured condition: any further damage is Death.
  if (downed && !ch.conditions.includes('Injured')) ch.conditions.push('Injured');

  return { dmg, armorHit, woundsHit, downed };
}

/** Restore wounds, capped at the maximum. Clears Injured if it brings them up. */
export function heal(ch, amount) {
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  if (!amt) return null;
  const hp = ch.res.hp;
  const before = hp.current;
  hp.current = Math.min(woundsMax(ch), hp.current + amt);
  if (hp.current > 0) {
    const i = ch.conditions.indexOf('Injured');
    if (i >= 0) ch.conditions.splice(i, 1);
  }
  return { healed: hp.current - before };
}

/* ---- import from active-sheet ----
   A player's character lives in localStorage under 'arc-active-sheet', in
   active-sheet.js's own shape. Same origin, so the table can read it. */

/** Build a table character from active-sheet's saved state. Null if there is none. */
export function fromActiveSheet(st, { id, color } = {}) {
  if (!st?.char) return null;
  const c = st.char, r = st.resources || {};
  const ch = makeCharacter({ id, name: c.name || 'Player', color });

  for (const k of ['level', 'species', 'speciesLineage', 'speciesOption', 'speciesFeature',
    'speciesSubFeature', 'classKey', 'pathName', 'talentName', 'age', 'size', 'diet',
    'language', 'motivation', 'trinket', 'notes']) {
    if (c[k] != null && c[k] !== '') ch[k] = c[k];
  }
  ch.wealth = c.wealth ?? c.gold ?? 0;
  ch.favoriteSpells = [...(c.favoriteSpells || [])];
  ch.npcs = [...(c.npcs || [])];
  ch.featureOverrides = { ...(c.featureOverrides || {}) };

  for (const group of ['physical', 'mental']) {
    for (const chk of st.checks?.[group] || []) {
      if (ch.checks[chk.key]) ch.checks[chk.key] = { mod: chk.mod || 0, bonus: chk.bonus || 0, armorBonus: 0 };
    }
  }

  ch.res.hp = { current: r.hp?.current ?? 0, max: r.hp?.max ?? 0, bonus: r.hp?.bonus ?? 0 };
  ch.res.armor = { current: r.armor?.current ?? 0, max: r.armor?.max ?? 0 };
  ch.res.mana = { current: r.MN?.current ?? 0, max: r.MN?.max ?? 0 };
  ch.res.classRes = { current: r.classRes?.current ?? 0, max: r.classRes?.max ?? 0, label: r.classRes?.label || 'Resource' };
  ch.res.custom = [...(r.custom || [])];
  ch.moveMod = r.moveMod || 0;
  ch.lowlightMod = r.lowlightMod || 0;

  ch.conditions = [...(st.activeConditions || [])];

  // active-sheet keeps an armour item's rating as armorRating; recalcEquipment
  // reads `armor`.
  ch.equipment = (st.equipment || []).map((e, i) => ({
    ...e,
    id: e.id || `as${i}`,
    armor: e.armor ?? e.armorRating ?? undefined,
  }));

  // active-sheet keys steps by index alone; the table keys them by entry name
  // too, so a character who changes path keeps a readable record.
  const p = st.progression || {};
  const rekey = (src, entryName) => {
    const out = {};
    for (const [i, on] of Object.entries(src || {})) if (on && entryName) out[`${entryName}:${i}`] = true;
    return out;
  };
  ch.progression = {
    pathChecked: rekey(p.pathChecked, ch.pathName),
    talentChecked: rekey(p.talentChecked, ch.talentName),
    otherGains: [...(p.otherGains || [])],
    xp: p.xp || 0,
  };

  ch.fromActiveSheet = true;
  return reconcile(ch);
}

/* ---- path and talent steps ----

   Step 0 is what choosing a path or talent gives you: granted, never bought,
   never given back. It lives here rather than in progression.js because both
   the Progression panel and the Features panel need to agree on it, and
   progression.js already imports features.js. */

export const stepKey = (entryName, i) => `${entryName}:${i}`;

/** The opening step is the free one. */
export const isFreeStep = i => i === 0;

/** Mark the opening step of whichever path and talent the character has.
    Safe to call repeatedly; it is how a character chosen before this existed
    picks the step up. */
export function grantOpeningSteps(ch) {
  if (!ch) return ch;
  const prog = ch.progression ||= {};
  if (ch.pathName) (prog.pathChecked ||= {})[stepKey(ch.pathName, 0)] = true;
  if (ch.talentName) (prog.talentChecked ||= {})[stepKey(ch.talentName, 0)] = true;
  return ch;
}

/* ---- what a step grants ----

   Every path or talent step past the first grants one of three things: +1 to a
   check, +1 Mana, or +1 Class Resource. The choice is kept against the step
   that bought it, in `progression.gains`, keyed the same way the step itself
   is:

     gains['Steadfast:3'] = { type: 'check', key: 'agi' }
     gains['Brawler:2']   = { type: 'mana' }

   Kept rather than applied. A step given back takes its grant with it, with no
   need to remember what it was and undo it — the totals are derived, so they
   simply stop counting it. The opening step grants nothing: it is the path
   itself, not a purchase. */

/** No check goes above this, however it got there. */
export const CHECK_CAP = 15;

const gainsOf = ch => ch?.progression?.gains || {};

/** Every grant the character has actually bought, as an array. */
export function allGains(ch) {
  const held = { ...(ch?.progression?.pathChecked || {}), ...(ch?.progression?.talentChecked || {}) };
  return Object.entries(gainsOf(ch))
    .filter(([key]) => held[key] && !isFreeStep(+key.slice(key.lastIndexOf(':') + 1)))
    .map(([, g]) => g)
    .filter(Boolean);
}

/** How many +1s this check has been given by steps. */
export function checkGain(ch, key) {
  return allGains(ch).filter(g => g.type === 'check' && g.key === key).length;
}

/** Mana and class resource granted by steps. */
export const manaGain = ch => allGains(ch).filter(g => g.type === 'mana').length;
export const classResGain = ch => allGains(ch).filter(g => g.type === 'classRes').length;

/** Steps bought but never assigned a grant — the sheet should chase these. */
export function unassignedSteps(ch) {
  const held = { ...(ch?.progression?.pathChecked || {}), ...(ch?.progression?.talentChecked || {}) };
  const gains = gainsOf(ch);
  return Object.keys(held)
    .filter(k => held[k] && !isFreeStep(+k.slice(k.lastIndexOf(':') + 1)) && !gains[k]);
}

/** A check that is already at the cap cannot take another point. */
export const checkAtCap = (ch, key) => checkTotal(ch, key) >= CHECK_CAP;

/** Every check total added together — the number a narrator eyeballs. */
export const checkPointsTotal = ch => CHECK_KEYS.reduce((n, k) => n + checkTotal(ch, k), 0);

/* ---- features a character has changed ----

   Features come out of class-new.json and species.json, which are shared and
   read-only: a narrator who rewrites a feature for one character must not
   rewrite it for everyone who has it. So a change is stored against the
   character as an override, keyed by the feature, and merged over the written
   version when it is read.

   Only the fields that were actually changed are kept, so a later edit to the
   data still reaches a character who only rewrote the flavour text. Clearing
   an override puts the written feature back exactly.

   `featureOverrides` has been on the character model since the start and had
   nothing reading it. This is what it was for. */

const FEATURE_FIELDS = ['name', 'effect', 'action', 'check', 'range', 'damage', 'damageType', 'duration'];

/** What the written feature says, with anything this character changed on top. */
export function withOverride(ch, f) {
  const o = f?.key ? ch?.featureOverrides?.[f.key] : null;
  if (!o) return f;
  const out = { ...f };
  for (const k of FEATURE_FIELDS) if (o[k] !== undefined) out[k] = o[k];
  out.edited = true;
  return out;
}

/**
 * Record a change to one field. Setting it back to what the data says drops
 * the override for that field, so "edited" never lingers over an edit that
 * was undone.
 */
export function setOverride(ch, f, field, value) {
  if (!f?.key || !FEATURE_FIELDS.includes(field)) return;
  const store = ch.featureOverrides ||= {};
  const base = String(f[field] ?? '');
  const next = String(value ?? '');
  const o = store[f.key] ||= {};
  if (next === base) delete o[field]; else o[field] = next;
  if (!Object.keys(o).length) delete store[f.key];
}

/** Put the written feature back. */
export function clearOverride(ch, f) {
  if (f?.key && ch?.featureOverrides) delete ch.featureOverrides[f.key];
}

export const isOverridden = (ch, f) => !!(f?.key && ch?.featureOverrides?.[f.key]);
