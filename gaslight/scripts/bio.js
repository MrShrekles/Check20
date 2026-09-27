/* The Bio panel: the parts of a character that are description rather than
   mechanics. Species fills several of these in when it is chosen; everything
   stays editable afterwards. */

import { esc } from './dom.js';
import { speciesEntry } from './features.js';

const FIELDS = [
  ['age', 'Age', 'text'],
  ['size', 'Size', 'text'],
  ['diet', 'Diet', 'text'],
  ['language', 'Language', 'text'],
  ['motivation', 'Motivation', 'text'],
  ['trinket', 'Trinket', 'text'],
  ['wealth', 'Wealth', 'number'],
  ['level', 'Level', 'number'],
];

let onChanged = () => { };
export function initBio(changedCallback) { onChanged = changedCallback; }

export function renderBioPanel(ch) {
  const frag = document.createDocumentFragment();
  frag.appendChild(detailsBlock(ch));
  frag.appendChild(notesBlock(ch));
  const lore = speciesLore(ch);
  if (lore) frag.appendChild(lore);
  return frag;
}

function block(title) {
  const el = document.createElement('div');
  el.className = 'sblock';
  el.innerHTML = `<h4>${title}</h4>`;
  return el;
}

function detailsBlock(ch) {
  const el = block('Details');
  const grid = document.createElement('div');
  grid.className = 'biogrid';
  grid.innerHTML = FIELDS.map(([key, label, type]) => `
    <label class="biofield">
      <span>${label}</span>
      <input type="${type}" data-bio="${key}" value="${esc(ch[key] ?? '')}">
    </label>`).join('');
  el.appendChild(grid);

  grid.querySelectorAll('[data-bio]').forEach(i => i.addEventListener('change', () => {
    const key = i.dataset.bio;
    ch[key] = i.type === 'number' ? (+i.value || 0) : i.value;
    onChanged(ch);
  }));
  return el;
}

function notesBlock(ch) {
  const el = block('Notes');
  const ta = document.createElement('textarea');
  ta.className = 'bionotes';
  ta.placeholder = 'Background, ties, secrets, anything the table should remember.';
  ta.value = ch.notes || '';
  ta.addEventListener('input', () => { ch.notes = ta.value; });
  el.appendChild(ta);
  return el;
}

/* Species prose, shown read-only so the sheet carries the flavour without
   making it another thing to maintain by hand. */
function speciesLore(ch) {
  const sp = speciesEntry(ch);
  const d = sp?.description;
  if (!d) return null;
  const el = block(`${esc(sp.name)}`);
  const parts = [
    ['Physical', d.physical], ['Environment', d.environment],
    ['Culture', d.culture], ['Lore', d.lore],
  ].filter(([, v]) => v);
  if (!parts.length) return null;

  const wrap = document.createElement('div');
  wrap.innerHTML = parts.map(([label, text]) => `
    <details class="lorepart">
      <summary>${label}</summary>
      <p>${esc(text)}</p>
    </details>`).join('');
  el.appendChild(wrap);
  return el;
}
