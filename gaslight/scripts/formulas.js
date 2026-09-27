/* Finding the dice in a piece of game text.

   Damage lives in three places in the data, and a spell that casts with no
   damage is almost always one the reader missed:

     the effect's own `damage` field   12 of the 187 spell effects
     dice marked up as [[2d6]]         28 of them
     dice written into the prose       22 more, marked up nowhere

   Without the third, "Creatures take 3d6 acid damage" sends nothing at all.

   No imports, so this can be tested without a browser. */

const MARKED = /\[\[(.*?)\]\]/g;
const SHAPE = /^\d*d\d+!?([+-]\d+)*$/i;
const DICE = /\b(\d*d\d+(?:\s*[+-]\s*\d+)?)\b/gi;

/** Dice marked up the way the website marks them for its roll buttons. */
export function markedFormulas(text) {
  return [...String(text || '').matchAll(MARKED)]
    .map(m => m[1].replace(/\s+/g, ''))
    .filter(f => SHAPE.test(f));
}

/**
 * Dice written as plain prose: "takes 3d6 acid damage", "deals 1d4 per success".
 *
 * A regex over prose is a guess, not an answer — "make a 1d6 check" reads the
 * same as "takes 1d6 damage". Dice followed closely by a damage or healing
 * word are preferred, which is right most of the time and wrong occasionally.
 *
 * That is only tolerable because the roll tray shows the formula in an
 * editable field before anything is rolled: a wrong guess is visible and one
 * keystroke from fixed, where a silent omission is neither.
 */
export function proseFormulas(text) {
  const src = String(text || '').replace(MARKED, ' ');   // marked dice handled elsewhere
  const all = [...src.matchAll(DICE)].map(m => ({ f: m[1].replace(/\s+/g, ''), at: m.index }));
  if (!all.length) return [];
  const near = all.filter(d => /^.{0,28}(damage|healing|heal\b)/i.test(src.slice(d.at + d.f.length)));
  return [...new Set((near.length ? near : all).map(d => d.f))];
}

/**
 * Every formula a piece of game text offers, best first: the authored field,
 * then marked-up dice, then dice found in the prose.
 */
export function damageFormulas(field, text) {
  /* Whitespace is stripped so all three readers speak the same shape. The
     roller accepts "2d6 + 3" and "2d6+3" alike, but leaving them different
     defeats the dedupe below and an effect that says it twice would offer it
     twice. */
  const authored = String(field || '').replace(/\s+/g, '');
  return [...new Set([authored, ...markedFormulas(text), ...proseFormulas(text)].filter(Boolean))];
}
