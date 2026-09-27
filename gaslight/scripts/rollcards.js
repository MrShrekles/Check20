/* Chat cards for rolls.

   The layout follows the website's roll cards (checkStatHtml / damageStatHtml /
   diceTrayHtml in scripts/chat-cards.js): the total is the headline, and a
   tray underneath shows every face that landed, so each number shows its work.
   On Advantage or Disadvantage the discarded d20 sits in the tray struck
   through; a natural 20 or 1 lights the kept die and tags the card.

   Check cards also read out Check20 successes, and attacks that miss flag that
   they can be Provoked. */

import { esc, safeColor } from './dom.js';
import { linkTerms } from './glossary.js';
import { fmtMod, successCount } from './dice.js';
import { state } from './state.js';
import { get } from './data.js';

const RULE_NOTE = {
  adv: 'Advantage · d20+4 vs d20',
  dis: 'Disadvantage · d20−4 vs d20',
};

function head(m, tag = '') {
  return `<div class="rchead">
    ${m.charName ? `<span class="rcwho">${esc(m.charName)}</span>` : ''}
    <span class="rclabel">${linkTerms(esc(m.label || 'Roll'))}</span>
    ${tag}
    <span class="t">${esc(m.time || '')}</span>
  </div>`;
}

function critTag(crit, what = 'Critical') {
  if (crit === 20) return `<span class="rctag crit">${what}</span>`;
  if (crit === 1) return '<span class="rctag fumble">Fumble</span>';
  return '';
}

/* The d20 half of a card. */
function checkStat(m) {
  const kept = m.kept;
  const face = kept === 20 ? ' nat20' : kept === 1 ? ' nat1' : '';
  const adj = m.keptAdj ? `<sup>${fmtMod(m.keptAdj)}</sup>` : '';
  const tray = [
    kept != null ? `<span class="die d20${face}">${kept}${adj}</span>` : '',
    m.dropped != null ? `<span class="die drop" title="Discarded">${m.dropped}</span>` : '',
    m.mod ? `<span class="dmod">${fmtMod(m.mod)}</span>` : '',
  ].join('');
  return `<div class="rcstat">
    <div class="rcstatlbl">${m.damage ? 'Attack' : 'Check'}</div>
    <div class="tray">${tray}</div>
    <div class="rcval${face}">${m.total}</div>
    ${RULE_NOTE[m.rollType] ? `<div class="rcnote">${RULE_NOTE[m.rollType]}</div>` : ''}
  </div>`;
}

/* The damage half. Doubled on a critical, and the loudest number on the card. */
function damageStat(dmg, isCrit) {
  if (!dmg) return '';
  const total = isCrit ? dmg.total * 2 : dmg.total;
  return `<div class="rcstat dmg${isCrit ? ' crit' : ''}">
    <div class="rcstatlbl">Damage <span>${esc(dmg.notation || '')}</span></div>
    <div class="tray">${faceTray(dmg.faces)}${dmg.bonus ? `<span class="dmod">${fmtMod(dmg.bonus)}</span>` : ''}${isCrit ? '<span class="dmod crit">×2</span>' : ''}</div>
    <div class="rcval">${total}</div>
    ${dmg.type ? `<div class="rcnote">${esc(dmg.type)}</div>` : ''}
  </div>`;
}

function faceTray(faces = []) {
  if (faces.length > 10) return `<span class="dcount">${faces.length} dice</span>`;
  return faces.map(f => {
    const cls = ['die', f.boom ? 'boom' : '', f.neg ? 'neg' : '',
      f.face === f.sides && f.sides > 1 ? 'max' : ''].filter(Boolean).join(' ');
    return `<span class="${cls}" title="d${f.sides}${f.boom ? ', exploded' : ''}">${f.face}</span>`;
  }).join('');
}

function outcome(total) {
  const n = successCount(total);
  if (!n) return '<div class="rcout fail">No Success</div>';
  const pips = '<span class="pip"></span>'.repeat(Math.min(n, 6));
  return `<div class="rcout ok"><span class="pips">${pips}</span>${n === 1 ? '1 Success' : `${n} Successes`}</div>`;
}

/* Two or more successes on a hit earns rolls on the damage-type table: one per
   success beyond the first. Only offered when that table exists. */
function tableButton(m) {
  const type = m.damage?.type;
  const rolls = successCount(m.total) - 1;
  if (!m.attack || !type || rolls < 1) return '';
  // With auto-roll on, the table has already been rolled; no button to offer.
  const set = state.settings || {};
  if (set.autoRollTables && rolls + 1 >= Math.max(2, set.autoRollAt || 2)) return '';
  const tables = get('damage')?.types;
  const want = String(type).replace(/[^A-Za-z]/g, '').toLowerCase();
  const key = tables ? Object.keys(tables).find(k => k.toLowerCase() === want) : type;
  if (!key) return '';
  return `<button class="rcbtn" data-dmgtable="${esc(key)}" data-rolls="${rolls}" data-who="${esc(m.charName || '')}">
    Roll ${esc(key)} table${rolls > 1 ? ` ×${rolls}` : ''}</button>`;
}

function conditionChips(list) {
  if (!list?.length) return '';
  return `<div class="rcconds">${list.map(c => `<span class="cpip">${esc(c)}</span>`).join('')}</div>`;
}

/** A Check20 check, or an attack with its damage beside it. */
export function checkCard(m) {
  const isCrit = m.crit === 20;
  return `<div class="rcard${isCrit ? ' crit' : m.crit === 1 ? ' fumble' : ''}">
    ${head(m, critTag(m.crit))}
    <div class="rcbody${m.damage ? ' duel' : ''}">
      ${checkStat(m)}
      ${damageStat(m.damage, isCrit)}
    </div>
    ${m.note ? `<div class="rcnote">${linkTerms(esc(m.note))}</div>` : ''}
    ${m.noOutcome ? '' : outcome(m.total)}
    ${m.attack && m.total < 15 ? '<div class="rcprov">⚡ Missed — can be Provoked</div>' : ''}
    ${tableButton(m)}
    ${conditionChips(m.conditions)}
  </div>`;
}

/** A raw dice roll: damage, a spell's effect, a plain d6. */
export function diceCard(m) {
  return `<div class="rcard dice${m.crit === 20 ? ' crit' : m.crit === 1 ? ' fumble' : ''}">
    ${head(m, critTag(m.crit, 'Natural 20'))}
    <div class="rcbody">
      <div class="rcstat dmg solo">
        <div class="rcstatlbl">${esc(m.notation || '')}</div>
        <div class="tray">${faceTray(m.faces)}${m.bonus ? `<span class="dmod">${fmtMod(m.bonus)}</span>` : ''}</div>
        <div class="rcval">${m.total}</div>
      </div>
    </div>
  </div>`;
}

/** A piece of text sent to the table: a monster feature, a spell, a handout.
    Rollable formulas in it come through as buttons, the same as on the card
    it was sent from. */
export function noteCard(m) {
  const tags = (m.tags || []).filter(Boolean);
  const rolls = (m.rolls || []).filter(Boolean);

  /* A note is not one paragraph. A feature sent with four upgrades used to
     arrive as a single block because the markup was one <p> and HTML eats the
     newlines — so a blank line becomes a paragraph, and a named piece gets its
     name above it. */
  const body = m.parts?.length
    ? m.parts.map(p => `
      <div class="notepart">
        ${p.label ? `<span class="notepartlbl">${esc(p.label)}</span>` : ''}
        ${paras(p.text)}
      </div>`).join('')
    : paras(m.text || '');

  return `<div class="rcard note">
    ${head(m)}
    ${tags.length ? `<div class="feattags">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="rcnote">${body}</div>
    ${rolls.length ? `<div class="gearacts">${rolls.map(r =>
      `<button class="tbbtn" data-noteroll="${esc(r)}" data-who="${esc(m.charName || '')}" data-lbl="${esc(m.label || '')}">${esc(r)}</button>`).join('')}</div>` : ''}
  </div>`;
}

/** Blank lines are paragraph breaks; a run of prose stays one paragraph. */
const paras = text => String(text || '')
  .split(/\n{2,}/)
  .map(t => t.trim())
  .filter(Boolean)
  .map(t => `<p>${linkTerms(esc(t))}</p>`)
  .join('') || '<p></p>';

/** A damage table result: the d6 face and what it did. */
export function tableCard(m) {
  const rows = (m.results || []).map(r => `
    <div class="tblrow">
      <span class="die max" title="d${r.sides || 6}">${r.roll}</span>
      <div><b>${linkTerms(esc(r.result))}</b>${r.effect ? `<p>${esc(r.effect)}</p>` : ''}</div>
    </div>`).join('');
  return `<div class="rcard table">
    ${head({ ...m, label: `${m.icon ? m.icon + ' ' : ''}${m.label}` })}
    ${rows}
  </div>`;
}

/* ---- the fight's own beats ----

   Whose turn it is and which round it is are what the eye hunts for when it
   scrolls back through a log, and as prose among the rolls they were the
   hardest lines to find. So each is its own card, and the party and the
   opposition are told apart without reading a word: the side's colour runs
   down the edge, and the token's own colour is the dot. */

export function turnCard(m) {
  const side = m.side === 'party' ? 'party' : m.side === 'enemy' ? 'enemy' : 'other';
  const word = side === 'party' ? 'Your turn' : side === 'enemy' ? 'Enemy turn' : 'Turn';
  return `<div class="turnmsg ${side}">
    <span class="tmdot" style="background:${safeColor(m.color)}"></span>
    <span class="tmwho">${esc(m.who || 'Someone')}</span>
    <span class="tmword">${word}</span>
  </div>`;
}

export function roundCard(m) {
  return `<div class="roundmsg">
    <span class="rmline"></span>
    <span class="rmlabel">Round ${m.round ?? '?'}</span>
    ${m.elapsed ? `<span class="rmtime" title="Ten seconds a round">${esc(m.elapsed)}</span>` : ''}
    <span class="rmline"></span>
  </div>`;
}
