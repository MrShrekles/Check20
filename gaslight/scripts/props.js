/* The floating property panel for a selected item. */

import { state, ui } from './state.js';
import { $, esc } from './dom.js';
import { view, requestDraw } from './view.js';
import { w2s, itemBounds } from './geometry.js';
import { computeLight } from './lighting.js';
import { showMonster } from './narrator.js';
import { isPlayerMode } from './session.js';

let popItem = null;

/** Reopen the card a token came from. main.js points this at the two cards;
    props.js must not import them, since they already import it. */
let backHook = null;
export const setCardBackHook = fn => { backHook = fn; };

/* Quick marks for a token. Shapes first, drawn in the token's ink; the emoji
   bring their own colour. Anything else can be typed into the field — one
   emoji, or up to two letters. */
const GLYPHS = [
  '●', '◆', '▲', '■', '✦', '✖',
  '💀', '☠️', '👁️', '🕷️', '🐺', '🐉',
  '🗡️', '🛡️', '🔥', '⚡', '🧿', '❓',
];

const TITLES = {
  token: 'Token', lamp: 'Lamp', shape: 'Rectangle', ellipse: 'Ellipse',
  line: 'Line', stroke: 'Pencil stroke', text: 'Text',
};

export function showPopFor(it) {
  popItem = it;
  const show = (el, on) => { el.style.display = on ? '' : 'none'; };
  const isToken = it.kind === 'token';
  const hasColor = it.kind !== 'lamp';

  $('popTitle').textContent = TITLES[it.kind] || 'Item';
  // Style is a detour from a card, so it needs a way back. Only tokens with a
  // card behind them get the button; a plain shape has nowhere to return to.
  $('popBack').hidden = !(backHook && (it.monster || it.charId));
  show($('popNameRow'), isToken);
  show($('popMarkRow'), isToken);
  show($('popStatRow'), !!it.monster && !isPlayerMode());   // the book is the narrator's
  if (it.monster) $('popStat').textContent = `Stat block: ${it.monster}`;
  show($('popGlyphs'), isToken);
  show($('popTextRow'), it.kind === 'text');
  show($('popColor'), hasColor);
  show($('popColorLbl'), hasColor);
  show($('popSize'), isToken);
  show($('popSizeLbl'), isToken);
  show($('popWidthRow'), ['shape', 'ellipse', 'line', 'stroke'].includes(it.kind));

  if (isToken) {
    $('popName').value = it.name;
    $('popSize').value = String(it.size);
    $('popGlyph').value = it.glyph || '';
    for (const b of $('popGlyphs').children) b.classList.toggle('on', b.dataset.glyph === (it.glyph || ''));
  }
  if (it.kind === 'text') $('popText').value = it.text;
  if (hasColor) $('popColor').value = it.color;
  if (it.width) $('popWidth').value = it.width;
  $('popLayer').innerHTML = state.layers
    .map(l => `<option value="${l.id}" ${l.id === it.layerId ? 'selected' : ''}>${esc(l.name)}</option>`).join('');

  const b = itemBounds(it) || { x: it.x, y: it.y, w: 0, h: 0 };
  const p = w2s(b.x + b.w, b.y);
  const pop = $('pop');
  pop.style.left = Math.min(view.W - 218, Math.max(6, p.x + 16)) + 'px';
  pop.style.top = Math.min(view.H - 240, Math.max(6, p.y - 20)) + 'px';
  pop.classList.add('on');
}

/* One mark at a time, kept in step between the field and the picker. An empty
   mark is left off the item entirely, so tokens fall back to their initials. */
function setGlyph(glyph) {
  if (!popItem) return;
  const g = String(glyph || '').trim();
  if (g) popItem.glyph = g; else delete popItem.glyph;
  if ($('popGlyph').value !== g) $('popGlyph').value = g;
  for (const b of $('popGlyphs').children) b.classList.toggle('on', b.dataset.glyph === g);
  requestDraw();
}

export function hidePop() { $('pop').classList.remove('on'); popItem = null; }

export function initProps() {
  const edit = (elId, ev, fn) => $(elId).addEventListener(ev, function () {
    if (!popItem) return;
    fn(popItem, this);
    requestDraw();
  });

  $('popGlyphs').innerHTML = ['', ...GLYPHS].map(g =>
    `<button type="button" class="glyphbtn${g ? '' : ' none'}" data-glyph="${g}"
      title="${g ? 'Mark this token' : 'No mark — use the initials'}">${g || 'AB'}</button>`).join('');

  $('popGlyphs').addEventListener('click', e => {
    const b = e.target.closest('[data-glyph]');
    if (!b || !popItem) return;
    setGlyph(b.dataset.glyph);
  });

  edit('popName', 'input', (it, el) => { it.name = el.value; });
  edit('popGlyph', 'input', (it, el) => { setGlyph(el.value); });
  edit('popText', 'input', (it, el) => { it.text = el.value; });
  edit('popColor', 'input', (it, el) => { it.color = el.value; });
  edit('popSize', 'change', (it, el) => { it.size = +el.value; });
  edit('popWidth', 'input', (it, el) => { it.width = +el.value; });
  edit('popLayer', 'change', (it, el) => { it.layerId = el.value; computeLight(); });

  $('popBack').onclick = () => {
    const it = popItem;
    hidePop();
    if (it) backHook?.(it);
  };

  $('popStat').onclick = () => {
    if (popItem?.monster) showMonster(popItem.monster);
  };

  $('popDel').onclick = () => {
    if (!popItem) return;
    const gone = popItem;
    state.items = state.items.filter(i => i !== gone);
    if (ui.sel.item === gone) ui.sel.item = null;
    if (ui.hover === gone) ui.hover = null;
    ui.sel.group = ui.sel.group.filter(i => i !== gone);
    hidePop(); computeLight(); requestDraw();
  };
}
