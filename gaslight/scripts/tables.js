/* Damage tables: what a hit does beyond its damage.

   From data/damage.json. The rule: roll 1d6 per extra success beyond the first
   (2 successes = 1 roll, 3 = 2 rolls) on the table matching the damage type.
   The same roll as rollDamageTable() in scripts/active-sheet.js.

   Tables are rolled from the Reference panel, or from the button an attack card
   shows when it earns them. */

import { $, toast } from './dom.js';
import { get, load } from './data.js';
import { addMsg, now, setPostHook } from './chat.js';
import { state } from './state.js';
import { successCount } from './dice.js';
import { conditionInfo } from './conditions.js';

export const ensureTableData = () => load('damage');
export const damageTables = () => get('damage')?.types || {};
export const damageRule = () => get('damage')?.rule || '';

/** Display order of table groups, as the website has it. */
export const TABLE_GROUPS = ['Physical', 'Elemental', 'Realm', 'Other'];

/** "⚔️ Slashing" or "slashing" -> "Slashing", or null if there is no such table. */
export function tableKey(type) {
  const want = String(type || '').replace(/[^A-Za-z]/g, '').toLowerCase();
  return Object.keys(damageTables()).find(k => k.toLowerCase() === want) || null;
}

/** Roll a damage table one or more times and post the result. */
export async function rollDamageTable(type, { times = 1, charName = '' } = {}) {
  try { await ensureTableData(); } catch { return toast('Damage tables could not be loaded'); }
  const key = tableKey(type);
  if (!key) return toast(`There is no ${type} table`);
  const table = damageTables()[key];
  const entries = table.entries || [];
  const results = [];
  for (let i = 0; i < Math.max(1, times); i++) {
    const roll = 1 + Math.floor(Math.random() * entries.length);
    const result = entries[roll - 1] || '—';
    results.push({ roll, sides: entries.length, result, effect: conditionInfo(result)?.effect || '' });
  }
  addMsg({ type: 'table', charName, label: `${key} table`, icon: table.icon || '', results, time: now() });
}

/* With auto-roll on, an attack that earns its table does not wait to be asked.
   The narrator sets the bar in Settings; below it the card keeps its button. */
function autoRoll(m) {
  const s = state.settings || {};
  if (!s.autoRollTables || m.type !== 'roll' || !m.attack || !m.damage?.type) return;
  const successes = successCount(m.total);
  if (successes < Math.max(2, s.autoRollAt || 2)) return;
  rollDamageTable(m.damage.type, { times: successes - 1, charName: m.charName || '' });
}

/** Attack cards carry a button for the table they earned; one listener serves them all. */
export function initTables() {
  setPostHook(autoRoll);

  $('chatlog').addEventListener('click', e => {
    const b = e.target.closest('[data-dmgtable]');
    if (!b || b.disabled) return;
    b.disabled = true;
    b.textContent = 'Rolled';
    rollDamageTable(b.dataset.dmgtable, { times: +b.dataset.rolls || 1, charName: b.dataset.who || '' });
  });
}
