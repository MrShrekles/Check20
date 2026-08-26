// panelLayout.js - drag-to-reorder + width toggle for worldbuilding generator panels
// Operates on #gen-workspace > details.gen-panel children.

(function () {
    'use strict';

    const ORDER_KEY = 'worldgen-panel-order';
    const SIZE_KEY  = 'worldgen-panel-sizes';

    let dragSrc       = null;
    let dragEnabled   = false;

    function init() {
        const workspace = document.getElementById('gen-workspace');
        if (!workspace) return;

        workspace.querySelectorAll(':scope > details.gen-panel').forEach(panel => {
            // Wrap panel in a draggable slot
            const slot = document.createElement('div');
            slot.className = 'panel-slot';
            slot.dataset.panelId = panel.id;
            slot.draggable = true;
            panel.parentNode.insertBefore(slot, panel);
            slot.appendChild(panel);

            // Inject drag handle at start of summary
            const summary = panel.querySelector('.gen-panel-summary');
            if (summary) {
                const handle = document.createElement('span');
                handle.className = 'panel-drag-handle';
                handle.setAttribute('aria-hidden', 'true');
                handle.textContent = '⠿';
                summary.prepend(handle);

                // Only allow drag when mouse went down on the handle
                handle.addEventListener('mousedown', () => { dragEnabled = true; });
                handle.addEventListener('touchstart', () => { dragEnabled = true; }, { passive: true });

                // Size toggle button - inserted before the ::after chevron
                const sizeBtn = document.createElement('button');
                sizeBtn.className = 'panel-size-toggle';
                sizeBtn.type = 'button';
                sizeBtn.title = 'Toggle full width';
                sizeBtn.textContent = '▭';
                sizeBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    const isFull = slot.classList.toggle('panel-full');
                    sizeBtn.textContent = isFull ? '◱' : '▭';
                    sizeBtn.title = isFull ? 'Make half-width' : 'Toggle full width';
                    saveSizes(workspace);
                });
                summary.appendChild(sizeBtn);
            }

            // Drag source events
            slot.addEventListener('dragstart', e => {
                if (!dragEnabled) { e.preventDefault(); return; }
                dragSrc = slot;
                slot.classList.add('is-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', slot.dataset.panelId);
            });

            slot.addEventListener('dragend', () => {
                dragEnabled = false;
                slot.classList.remove('is-dragging');
                workspace.querySelectorAll('.panel-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
                dragSrc = null;
                saveOrder(workspace);
            });

            // Drop target events
            slot.addEventListener('dragover', e => {
                if (!dragSrc || dragSrc === slot) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                workspace.querySelectorAll('.panel-slot.drag-over').forEach(s => s.classList.remove('drag-over'));
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', e => {
                if (!slot.contains(e.relatedTarget)) slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', e => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                if (!dragSrc || dragSrc === slot) return;
                const rect = slot.getBoundingClientRect();
                const before = e.clientY < rect.top + rect.height / 2;
                workspace.insertBefore(dragSrc, before ? slot : slot.nextSibling);
            });
        });

        // Cancel drag if mouse released anywhere outside a handle
        document.addEventListener('mouseup', () => { dragEnabled = false; }, { passive: true });
        document.addEventListener('touchend', () => { dragEnabled = false; }, { passive: true });

        // Restore persisted layout
        restoreOrder(workspace);
        restoreSizes(workspace);
    }

    // ── Persistence ────────────────────────────────────────────────────────────

    function saveOrder(workspace) {
        const order = [...workspace.querySelectorAll('.panel-slot')].map(s => s.dataset.panelId);
        try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (_) {}
    }

    function restoreOrder(workspace) {
        try {
            const order = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]');
            if (!order.length) return;
            order.forEach(id => {
                const slot = workspace.querySelector(`.panel-slot[data-panel-id="${id}"]`);
                if (slot) workspace.appendChild(slot);
            });
        } catch (_) {}
    }

    function saveSizes(workspace) {
        const sizes = {};
        workspace.querySelectorAll('.panel-slot').forEach(s => {
            sizes[s.dataset.panelId] = s.classList.contains('panel-full') ? 'full' : 'half';
        });
        try { localStorage.setItem(SIZE_KEY, JSON.stringify(sizes)); } catch (_) {}
    }

    function restoreSizes(workspace) {
        try {
            const sizes = JSON.parse(localStorage.getItem(SIZE_KEY) || '{}');
            Object.entries(sizes).forEach(([id, size]) => {
                const slot = workspace.querySelector(`.panel-slot[data-panel-id="${id}"]`);
                if (!slot || size !== 'full') return;
                slot.classList.add('panel-full');
                const btn = slot.querySelector('.panel-size-toggle');
                if (btn) { btn.textContent = '◱'; btn.title = 'Make half-width'; }
            });
        } catch (_) {}
    }

    document.addEventListener('DOMContentLoaded', init);
})();
