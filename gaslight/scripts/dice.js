/* Dice maths. No DOM, no state: chat.js turns these results into messages.

   Results carry the field names the website's chat uses — label, total, mod,
   rollType, rollNote — so a VTT roll and an active-sheet roll are the same
   shape. rollNote is the compact "d20(14)" / "adv(14,3)" / "dis(5,18)" form of
   the two raw faces. */

export const d20 = () => 1 + Math.floor(Math.random() * 20);
export const fmtMod = m => (m >= 0 ? '+' : '') + m;

/* Advantage: roll d20+4 and a d20, keep the higher. Disadvantage: roll d20-4
   and a d20, keep the lower. Checks and bonuses apply to the result either
   way, and since they apply to both dice equally they never change which one
   wins. This is the ruled version; active-sheet.js rolls a plain 2d20 instead
   and is the one that is wrong. */
export const ADV_SHIFT = 4;

/* Successes: 15 is one, and every 5 above it is another. Below 15 is none.
   Same threshold as successCount() in scripts/chat-cards.js. */
export const successCount = total => total >= 15 ? Math.floor((total - 10) / 5) : 0;

/** A Check20 check: d20 + modifier, with optional Advantage or Disadvantage. */
export function checkRoll(mod, rollType = 'flat') {
  if (rollType === 'none') rollType = 'flat';
  const a = d20(), b = d20();

  let kept, dropped, keptAdj = 0;
  if (rollType === 'adv') {
    // The shifted die competes on its shifted value.
    const useA = a + ADV_SHIFT >= b;
    kept = useA ? a : b; dropped = useA ? b : a; keptAdj = useA ? ADV_SHIFT : 0;
  } else if (rollType === 'dis') {
    const useA = a - ADV_SHIFT <= b;
    kept = useA ? a : b; dropped = useA ? b : a; keptAdj = useA ? -ADV_SHIFT : 0;
  } else {
    kept = a; dropped = null;
  }

  const total = kept + keptAdj + mod;
  const rollNote = rollType === 'flat' ? `d20(${a})` : `${rollType}(${a},${b})`;
  return {
    total, mod, rollType, rollNote,
    kept, dropped, keptAdj,
    crit: kept === 20 ? 20 : kept === 1 ? 1 : 0,
    successes: successCount(total),
  };
}

/* A die marked "!" explodes: rolling its highest face rolls again and adds.
   Capped so a run of maximums cannot spin forever. */
const EXPLODE_CAP = 20;

function rollDie(faces, exploding, out) {
  let total = 0;
  for (let i = 0; i < EXPLODE_CAP; i++) {
    const r = 1 + Math.floor(Math.random() * faces);
    const boom = exploding && faces >= 2 && r === faces;
    out.push({ face: r, sides: faces, boom });
    total += r;
    if (!boom) break;
  }
  return total;
}

/** Parse and roll NdM+K, where NdM! explodes. Null if the formula does not read.
    Returns the faces rolled (for dice trays) and the flat bonus separately. */
export function rollFormula(formula) {
  const clean = String(formula).replace(/\s+/g, '').toLowerCase();
  if (!/^[+-]?(\d*d\d+!?|\d+)([+-](\d*d\d+!?|\d+))*$/.test(clean)) return null;
  const terms = clean.match(/[+-]?(\d*d\d+!?|\d+)/g);

  let total = 0, bonus = 0, crit = 0;
  const faces = [];
  const parts = [];
  for (const t of terms) {
    const sign = t[0] === '-' ? -1 : 1;
    const body = t.replace(/^[+-]/, '');
    if (body.includes('d')) {
      const exploding = body.endsWith('!');
      let [n, m] = body.replace(/!$/, '').split('d'); n = +n || 1; m = +m;
      if (n > 100 || m > 1000 || m < 1) return null;
      const rolled = [];
      for (let i = 0; i < n; i++) total += sign * rollDie(m, exploding, rolled);
      if (sign < 0) rolled.forEach(r => { r.neg = true; });
      faces.push(...rolled);
      if (m === 20 && n === 1 && crit === 0) crit = rolled[0].face === 20 ? 20 : rolled[0].face === 1 ? 1 : 0;
      parts.push((sign < 0 ? '-' : '') + `${n}d${m}${exploding ? '!' : ''} [${rolled.map(r => r.face).join(', ')}]`);
    } else {
      total += sign * +body;
      bonus += sign * +body;
      parts.push((sign < 0 ? '-' : '+') + body);
    }
  }
  return {
    total, bonus, faces, crit,
    notation: clean.replace(/([+-])/g, ' $1 ').trim(),
    detail: parts.join('  '),
  };
}
