/* Dragging rows into a different order.

   Ported from `bindDragReorder` in the companion's active-sheet.js so the two
   apps feel the same. Pointer events rather than HTML5 drag-and-drop, because
   the native API cannot be styled, fires inconsistently across browsers, and
   does not work with touch at all.

   The container owns one drop line, shown between rows as the pointer passes
   them. The array is reordered in place and `onDrop` is called once, at the
   end — not on every move. */

/**
 * @param {HTMLElement} container  holds the rows; gets the drop line
 * @param {any[]} array            reordered in place to match
 * @param {() => void} onDrop      called once, after a move that changed things
 */
export function bindDragReorder(container, array, onDrop) {
  if (!container) return;

  const line = document.createElement('div');
  line.className = 'droplinerow';
  line.hidden = true;
  container.appendChild(line);

  const clear = () => {
    line.hidden = true;
    container.querySelectorAll('.dragging').forEach(r => r.classList.remove('dragging'));
  };

  container.addEventListener('pointerdown', e => {
    if (!e.target.closest('.draghandle')) return;
    const row = e.target.closest('[data-drag-idx]');
    if (!row) return;
    e.preventDefault();

    const from = +row.dataset.dragIdx;
    row.classList.add('dragging');
    let to = -1;

    const onMove = ev => {
      ev.preventDefault();
      const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drag-idx]');
      if (!target || target === row) { line.hidden = true; to = -1; return; }

      const rect = target.getBoundingClientRect();
      const after = ev.clientY > rect.top + rect.height / 2;
      to = +target.dataset.dragIdx + (after ? 1 : 0);
      // The dragged row is about to be pulled out, so everything after it shifts.
      if (to > from) to--;

      line.hidden = false;
      line.style.top = `${(after ? rect.bottom : rect.top) - container.getBoundingClientRect().top}px`;
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      clear();
      if (to >= 0 && to !== from) {
        const [moved] = array.splice(from, 1);
        array.splice(to, 0, moved);
        onDrop();
      }
      to = -1;
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  });
}
