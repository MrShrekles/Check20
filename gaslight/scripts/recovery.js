/* Press On, Long Rest, and the day they sit in.

   The rules are the companion app's, so the two agree at a table where one
   player is on their phone and another is at the laptop:

     Press On    After a combat encounter: regain 1 class resource, 1 Mana,
                 repair Armor for 1d6 + Crafting, heal for 1d6 + Survival, and
                 remove every condition lasting a minute or less. Twice a day,
                 and never twice running without a fight in between.
     Long Rest   Ten uninterrupted hours somewhere safe: Wounds full, class
                 resources recharged, all armour repaired to at least half,
                 and every condition lasting a day or less removed. Once a day.
     Reset Day   puts both back, for the next day.

   The condition clearing is the table below, not a parse: `duration` in
   conditions.json is prose ("Lasts 1 minute", "Until a Long Rest", "Lasts 6
   weeks"), and prose cannot be compared against a minute.

   Nothing here is stored on the character until it is used, so a table saved
   before this existed loads with the defaults. */

import { esc, toast } from './dom.js';
import { rollFormula } from './dice.js';
import { checkTotal, woundsMax, manaMax, reconcile } from './character.js';
import { allConditions } from './conditions.js';
import { postNote } from './chat.js';

const DEFAULTS = {
  poUses: 2,        // times a day
  poResource: 1,    // class resource regained
  poMana: 1,        // mana recovered
  poArmor: 'd6',    // armour repaired, plus Crafting
  poHeal: 'd6',     // wounds healed, plus Survival
};


/* Which recovery is enough to shift a condition, read off its written
   duration. 'press' also clears on a long rest; 'rest' needs the full ten
   hours; 'never' is beyond either.

   The quoted text is the `duration` field it was read from. The ones marked
   CALL are judgement rather than a stated duration - correct them here and
   both the sheet and the chat card follow. */
const CLEARED_BY = {
  Bleeding:    'press',   // "Lasts 1 minute"
  Coughing:    'press',   // "Until a Press On or irritant removed"
  Stunned:     'press',   // "Until end of next turn or Press On"
  Confused:    'press',   // "Until end of next turn"
  Deaf:        'press',   // "Until end of next turn"
  Exposed:     'press',   // "Until end of next turn"
  Slowed:      'press',   // "Until source removed or until the end of your next turn"
  Fear:        'press',   // ends when the source is out of sight, turn-scoped
  Prone:       'press',   // CALL - "Requires 15 ft of movement to stand"
  Pinned:      'press',   // CALL - "Off-Action Physical Check"
  Constrained: 'press',   // CALL - "Off-Action removal; escape from restraints"
  Dislocation: 'press',   // CALL - "Off-Action Survival Check, or Until a Long Rest"

  Concussion:  'rest',    // "Until a Long Rest"
  Exhaustion:  'rest',    // "Persists until a long rest..."
  Exhausted:   'rest',    // the same thing under its other name
  Unconscious: 'rest',    // CALL - "a set duration, damage taken, or ally assistance"
  Blind:       'rest',    // CALL - "Off-Action removal unless permanent"

  Broken:      'never',   // "Lasts 6 weeks"
  Charmed:     'never',   // "Ends based on the charm's source"
  Invisible:   'never',   // an effect being run, not an injury to sleep off
  Intangible:  'never',   // the same
  Injured:     'never',   // healing removes it, which Press On already does
  Death:       'never',   // resurrection only
};

/* Anything added to the data later and not listed above: clear it on a long
   rest if its own text mentions one, otherwise leave it alone. Better to
   under-clear than to wipe something the narrator was tracking. */
function clearedBy(name) {
  if (CLEARED_BY[name]) return CLEARED_BY[name];
  const d = String(allConditions().find(c => c.name === name)?.duration || '').toLowerCase();
  if (d.includes('press on')) return 'press';
  if (d.includes('long rest')) return 'rest';
  return 'never';
}

/** Conditions this recovery shifts. A long rest also does everything Press On
    does, so it takes both tiers. */
function clearConditions(ch, tier) {
  const keep = [], gone = [];
  for (const c of ch.conditions || []) {
    const by = clearedBy(c);
    const shifts = tier === 'rest' ? (by === 'press' || by === 'rest') : by === 'press';
    (shifts ? gone : keep).push(c);
  }
  ch.conditions = keep;
  return gone;
}

/** The character's recovery settings, defaults filled in on first read. */
export function recoveryOf(ch) {
  const r = ch.recovery ||= {};
  for (const [k, v] of Object.entries(DEFAULTS)) if (r[k] === undefined) r[k] = v;
  r.pressOnUsed ||= 0;
  r.longRestUsed = !!r.longRestUsed;
  r.needsFight = !!r.needsFight;
  return r;
}

export const pressOnLeft = ch => {
  const r = recoveryOf(ch);
  return Math.max(0, (r.poUses || 0) - (r.pressOnUsed || 0));
};

/* A bare "d6" is one die; the roller wants a count. */
const normalise = f => (/^\d/.test(String(f).trim()) ? String(f).trim() : '1' + String(f).trim());

/**
 * Spend one use of Press On.
 * @returns {{gains: string[]}|null} null when there is nothing left to spend.
 */
export function pressOn(ch) {
  const r = recoveryOf(ch);
  if (pressOnLeft(ch) <= 0) return null;
  // Not twice running: another fight has to happen in between.
  if (r.needsFight) return null;

  const gains = [];
  const res = ch.res;

  if (r.poResource > 0 && res.classRes.max > 0) {
    const before = res.classRes.current;
    res.classRes.current = Math.min(res.classRes.max, before + r.poResource);
    if (res.classRes.current > before) {
      gains.push(`${res.classRes.current - before} ${res.classRes.label || 'Resource'}`);
    }
  }

  if (r.poMana > 0) {
    const mm = manaMax(ch);
    const before = res.mana.current;
    res.mana.current = Math.min(mm, before + r.poMana);
    if (res.mana.current > before) gains.push(`${res.mana.current - before} Mana`);
  }

  if (String(r.poArmor || '').trim() && res.armor.max > 0) {
    // Repair is the roll plus Crafting, never less than 1.
    const roll = rollFormula(normalise(r.poArmor));
    const amount = Math.max(1, (roll?.total || 0) + checkTotal(ch, 'cra'));
    const before = res.armor.current;
    res.armor.current = Math.min(res.armor.max, before + amount);
    if (res.armor.current > before) gains.push(`${res.armor.current - before} Armor repaired`);
  }

  if (String(r.poHeal || '').trim()) {
    // Healing is the roll plus Survival, as repair is the roll plus Crafting.
    const roll = rollFormula(normalise(r.poHeal));
    const amount = Math.max(0, (roll?.total || 0) + checkTotal(ch, 'sur'));
    const before = ch.res.hp.current;
    ch.res.hp.current = Math.min(woundsMax(ch), before + amount);
    if (ch.res.hp.current > before) gains.push(`${ch.res.hp.current - before} Wounds`);
  }

  // Healing above zero is no longer Injured.
  if (ch.res.hp.current > 0) {
    const i = (ch.conditions || []).indexOf('Injured');
    if (i >= 0) ch.conditions.splice(i, 1);
  }

  const gone = clearConditions(ch, 'press');
  if (gone.length) gains.push('Cleared ' + gone.join(', '));

  r.pressOnUsed += 1;
  r.needsFight = true;
  reconcile(ch);
  return { gains };
}

/**
 * A long rest: everything to full, armour to at least half, conditions gone.
 * @returns {{gains: string[]}|null} null if one has already been taken today.
 */
export function longRest(ch) {
  const r = recoveryOf(ch);
  if (r.longRestUsed) return null;

  const res = ch.res;
  res.hp.current = woundsMax(ch);
  res.mana.current = manaMax(ch);
  res.classRes.current = res.classRes.max;
  res.armor.current = Math.max(res.armor.current, Math.ceil(res.armor.max / 2));

  const gone = clearConditions(ch, 'rest');
  const left = (ch.conditions || []).length;

  r.longRestUsed = true;
  r.needsFight = false;   // ten hours resets it, fight or no fight
  reconcile(ch);

  return {
    gains: [
      'Wounds full',
      'Mana full',
      `${res.classRes.label || 'Resource'} full`,
      `Armor to ${res.armor.current}`,
      gone.length ? 'Cleared ' + gone.join(', ') : 'No conditions to clear',
      left ? 'Still carrying ' + ch.conditions.join(', ') : null,
    ].filter(Boolean),
  };
}

/** A fight happened, so Press On is available again. Called when the
    initiative order is cleared, and by hand from the Recovery block. */
export function markCombatEnded(chars) {
  for (const ch of chars || []) if (ch.recovery) ch.recovery.needsFight = false;
}

/** A new day: Press On and the Long Rest are available again. */
export function resetDay(ch) {
  const r = recoveryOf(ch);
  r.pressOnUsed = 0;
  r.longRestUsed = false;
  r.needsFight = false;
}

/** Say what happened in the chat log, the way a roll does. */
export function postRecovery(ch, title, gains) {
  postNote({
    charName: ch.name || 'Unnamed',
    label: title,
    text: gains.length ? gains.join(' · ') : 'Nothing to recover',
  });
  toast(`${title}: ${gains.length ? gains.join(', ') : 'nothing to recover'}`);
}

/** The Recovery block for the Checks panel. */
export function recoveryBlock(ch, changed, block) {
  const r = recoveryOf(ch);
  const el = block('Recovery', 'What Press On gives this character');
  const left = pressOnLeft(ch);

  const drawer = document.createElement('div');
  drawer.className = 'smods';
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="smodgrid">
      <label>Uses a day <input type="number" min="0" max="9" data-rec="poUses" value="${r.poUses}"></label>
      <label>Resource <input type="number" min="0" data-rec="poResource" value="${r.poResource}"></label>
      <label>Mana <input type="number" min="0" data-rec="poMana" value="${r.poMana}"></label>
      <label>Repair <input type="text" data-rec="poArmor" value="${esc(r.poArmor)}" placeholder="d6"></label>
      <label>Healing <input type="text" data-rec="poHeal" value="${esc(r.poHeal)}" placeholder="d6"></label>
    </div>
    <div class="hint">Repair adds Crafting, healing adds Survival. Leave a field
      empty to skip that part. Press On also clears every condition lasting a
      minute or less; a long rest clears anything lasting a day or less.</div>`;

  el.querySelector('[data-cog]').addEventListener('click', () => { drawer.hidden = !drawer.hidden; });
  drawer.querySelectorAll('[data-rec]').forEach(i => i.addEventListener('change', () => {
    r[i.dataset.rec] = i.type === 'number' ? Math.max(0, +i.value || 0) : i.value.trim();
    changed(ch);
  }));

  const blocked = r.needsFight;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="recrow">
      <span class="reclbl">Press On</span>
      <span class="recpips">${Array.from({ length: r.poUses }, (_, i) =>
        `<i class="recpip${i < left ? ' on' : ''}"></i>`).join('')}</span>
      <span class="recleft">${left}/${r.poUses}</span>
      <button class="tbbtn tb-init" data-rec-act="press"
        ${left && !blocked ? '' : 'disabled'}>Use</button>
    </div>
    ${blocked ? `<div class="recwarn">
      Not twice running — another fight first.
      <button class="tbbtn" data-rec-act="fought">We fought</button>
    </div>` : ''}
    <div class="recrow">
      <span class="reclbl">Long Rest</span>
      <span class="recnote">${r.longRestUsed ? 'Taken today' : '10 hours, somewhere safe'}</span>
      <button class="tbbtn tb-style" data-rec-act="rest" ${r.longRestUsed ? 'disabled' : ''}>Rest</button>
    </div>
    <div class="recrow">
      <button class="tbbtn" data-rec-act="reset">Reset the day</button>
    </div>`;

  wrap.querySelector('[data-rec-act=fought]')?.addEventListener('click', () => {
    markCombatEnded([ch]);
    toast('Press On is available again');
    changed(ch);
  });

  wrap.querySelector('[data-rec-act=press]').addEventListener('click', () => {
    const out = pressOn(ch);
    if (!out) {
      return toast(recoveryOf(ch).needsFight
        ? 'Press On needs another fight first'
        : 'No Press On left today');
    }
    postRecovery(ch, 'Press On', out.gains);
    changed(ch);
  });
  wrap.querySelector('[data-rec-act=rest]').addEventListener('click', () => {
    const out = longRest(ch);
    if (!out) return toast('A long rest has already been taken today');
    postRecovery(ch, 'Long Rest', out.gains);
    changed(ch);
  });
  wrap.querySelector('[data-rec-act=reset]').addEventListener('click', () => {
    resetDay(ch);
    toast('A new day: Press On and the long rest are back');
    changed(ch);
  });

  el.appendChild(drawer);
  el.appendChild(wrap);
  return el;
}
