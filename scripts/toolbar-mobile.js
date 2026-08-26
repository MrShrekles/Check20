// Collapsible sticky toolbars on mobile.
// Any .toolbar-toggle-btn must be immediately followed by .toolbar-collapsible.
(function () {
    function initToggles() {
        document.querySelectorAll('.toolbar-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const body = btn.nextElementSibling;
                if (!body) return;
                const isOpen = body.classList.toggle('open');
                btn.classList.toggle('open', isOpen);
            });
        });
    }

    // Call whenever active filters change to light the indicator pip.
    window.toolbarUpdatePip = function (btnSelector, hasActiveFilters) {
        const btn = document.querySelector(btnSelector);
        if (btn) btn.classList.toggle('has-filters', !!hasActiveFilters);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initToggles);
    } else {
        initToggles();
    }
})();
