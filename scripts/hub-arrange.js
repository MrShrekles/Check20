// ── GENERATOR BUBBLE ARRANGING ────────────────────────────────────────────────
// Lets each person drag the generator bubbles into the order they actually use,
// saved to localStorage on their own machine.
//
// Pointer events rather than HTML5 drag-and-drop: dragstart never fires on
// touch, and this page gets used on tablets at the table.
(function () {
    'use strict';

    const KEY       = 'wb-bubble-order';
    const THRESHOLD = 6;   // px of movement before a press becomes a drag,
                           // so a normal click still switches generator

    const container = document.querySelector('.hub-bubbles');
    if (!container) return;

    const bubbles = () => [...container.querySelectorAll('.hub-bubble')];
    const paneOf  = el => el.dataset.pane;

    // ── persistence ───────────────────────────────────────────────────────────
    function saveOrder() {
        try { localStorage.setItem(KEY, JSON.stringify(bubbles().map(paneOf))); } catch (e) {}
        reflectCustom();
    }

    // Unknown ids are ignored and anything missing is appended, so adding a
    // ninth generator later still shows up for people with a saved order.
    function restoreOrder() {
        let saved;
        try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return; }
        if (!Array.isArray(saved) || !saved.length) return;

        const byPane = new Map(bubbles().map(b => [paneOf(b), b]));
        saved.forEach(pane => {
            const el = byPane.get(pane);
            if (el) { container.appendChild(el); byPane.delete(pane); }
        });
        byPane.forEach(el => container.appendChild(el));   // new ones go last
        reflectCustom();
    }

    function resetOrder() {
        try { localStorage.removeItem(KEY); } catch (e) {}
        location.reload();
    }

    function hasCustomOrder() {
        try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    }

    function reflectCustom() {
        document.querySelector('.hub-arrange')?.toggleAttribute('data-custom', hasCustomOrder());
    }

    // ── where does the dragged bubble belong now? ─────────────────────────────
    // Nearest sibling by centre distance, then left/right of its midpoint. Works
    // when the row wraps, which a fixed left-to-right scan does not.
    function insertionPoint(x, y, dragged) {
        let closest = null, best = Infinity;
        for (const el of bubbles()) {
            if (el === dragged) continue;
            const r = el.getBoundingClientRect();
            const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
            if (d < best) { best = d; closest = el; }
        }
        if (!closest) return null;
        const r = closest.getBoundingClientRect();
        return x < r.left + r.width / 2 ? closest : closest.nextElementSibling;
    }

    // ── pointer drag ──────────────────────────────────────────────────────────
    let dragEl = null, startX = 0, startY = 0, dragging = false, justDragged = false;

    container.addEventListener('pointerdown', e => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const b = e.target.closest('.hub-bubble');
        if (!b) return;
        dragEl = b; startX = e.clientX; startY = e.clientY; dragging = false;
        try { b.setPointerCapture(e.pointerId); } catch (err) {}
    });

    container.addEventListener('pointermove', e => {
        if (!dragEl) return;

        if (!dragging) {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD) return;
            dragging = true;
            dragEl.classList.add('is-dragging');
            container.classList.add('is-arranging');
        }

        const before = insertionPoint(e.clientX, e.clientY, dragEl);
        if (before !== dragEl && before !== dragEl.nextElementSibling) {
            container.insertBefore(dragEl, before);
        }
    });

    function endDrag(e) {
        if (!dragEl) return;
        if (dragging) {
            saveOrder();
            justDragged = true;              // swallow the click this would fire
            setTimeout(() => { justDragged = false; }, 0);
        }
        dragEl.classList.remove('is-dragging');
        container.classList.remove('is-arranging');
        try { dragEl.releasePointerCapture(e.pointerId); } catch (err) {}
        dragEl = null; dragging = false;
    }

    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);

    // A drag ends over a bubble and would otherwise switch generator.
    container.addEventListener('click', e => {
        if (justDragged) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

    // ── keyboard: Alt + ←/→ moves the focused bubble ──────────────────────────
    container.addEventListener('keydown', e => {
        if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        const b = e.target.closest('.hub-bubble');
        if (!b) return;
        e.preventDefault();
        if (e.key === 'ArrowLeft'  && b.previousElementSibling) container.insertBefore(b, b.previousElementSibling);
        if (e.key === 'ArrowRight' && b.nextElementSibling)     container.insertBefore(b.nextElementSibling, b);
        b.focus();
        saveOrder();
    });

    document.getElementById('hub-reset-order')?.addEventListener('click', resetOrder);

    restoreOrder();
    window.hubResetOrder = resetOrder;
})();
