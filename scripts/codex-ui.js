// ─── Shared Codex UI — size buttons for expandable-row pages ─────────────────
// Usage: call initCodexSize() in DOMContentLoaded on any page that has
//   #codex-size-btns and loads spells.css (which owns the --codex-* variables).

const CODEX_SIZE = {
    small:  { '--codex-min': '220px', '--codex-name-size': '0.8rem',  '--codex-tag-size': '0.58rem', '--codex-cost-size': '0.68rem', '--codex-intent-size': '0.74rem', '--codex-effect-size': '0.76rem', '--codex-meta-size': '0.63rem', '--codex-row-pad': '.35rem .5rem',  '--codex-lh': '1.45' },
    medium: { '--codex-min': '460px', '--codex-name-size': '0.92rem', '--codex-tag-size': '0.68rem', '--codex-cost-size': '0.78rem', '--codex-intent-size': '0.86rem', '--codex-effect-size': '0.88rem', '--codex-meta-size': '0.73rem', '--codex-row-pad': '.55rem .65rem', '--codex-lh': '1.55' },
    large:  { '--codex-min': '820px', '--codex-name-size': '1.02rem', '--codex-tag-size': '0.75rem', '--codex-cost-size': '0.86rem', '--codex-intent-size': '0.94rem', '--codex-effect-size': '0.97rem', '--codex-meta-size': '0.8rem',  '--codex-row-pad': '.7rem .8rem',   '--codex-lh': '1.62' },
};

function applyCodexSize(key) {
    const vars = CODEX_SIZE[key] || CODEX_SIZE.medium;
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
}

function initCodexSize() {
    const btns = document.querySelectorAll('#codex-size-btns .codex-size-btn');
    if (!btns.length) return;
    const saved = localStorage.getItem('codex_card_size') || 'medium';
    applyCodexSize(saved);
    btns.forEach(b => b.classList.toggle('active', b.dataset.size === saved));
    btns.forEach(b => b.addEventListener('click', () => {
        const s = b.dataset.size;
        applyCodexSize(s);
        localStorage.setItem('codex_card_size', s);
        btns.forEach(x => x.classList.toggle('active', x === b));
    }));
}
