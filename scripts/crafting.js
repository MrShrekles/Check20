/* ─── crafting.js ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    /* Toggle rows */
    document.querySelectorAll('.craft-section-head').forEach(head => {
        head.addEventListener('click', () => {
            const row  = head.closest('.spell-row');
            const open = row.classList.toggle('open');
            head.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
        });
    });

    /* Expand / collapse all */
    document.getElementById('craft-expand-all')?.addEventListener('click', () => {
        document.querySelectorAll('#craft-sections .spell-row').forEach(r => {
            r.classList.add('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▼';
        });
    });

    document.getElementById('craft-collapse-all')?.addEventListener('click', () => {
        document.querySelectorAll('#craft-sections .spell-row').forEach(r => {
            r.classList.remove('open');
            const a = r.querySelector('.spell-row-arrow');
            if (a) a.textContent = '▶';
        });
    });

    initCodexSize();
});
