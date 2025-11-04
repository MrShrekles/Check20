(async function () {
    // Load data
    const res = await fetch('../data/gods.json');
    let raw = await res.json();
    const gods = (Array.isArray(raw) ? raw : raw.gods || []).map(normalize);

    // Elements
    const q = document.getElementById('q');
    const locSel = document.getElementById('loc');
    const linSel = document.getElementById('lin');
    const sortSel = document.getElementById('sort');
    const clearBtn = document.getElementById('clear');
    const list = document.getElementById('list');
    const count = document.getElementById('count');

    // Populate dropdowns
    fillSelect(locSel, uniq(gods.map(g => g.location)));
    fillSelect(linSel, uniq(gods.map(g => g.lineage)));

    // Events
    [q, locSel, linSel, sortSel].forEach(el => el.addEventListener('input', render));
    clearBtn.onclick = () => { q.value = ''; locSel.value = ''; linSel.value = ''; sortSel.value = 'rank'; render(); };

    render();

    // --- Render ---
    function render() {
        const term = q.value.trim().toLowerCase();
        const loc = locSel.value;
        const lin = linSel.value;
        let data = gods.filter(g =>
            (!loc || g.location === loc) &&
            (!lin || g.lineage === lin) &&
            (!term || (g.name + ' ' + g.words.join(' ') + ' ' + g.desc + ' ' + g.tag.join(' ')).toLowerCase().includes(term))
        );

        // Sort
        if (sortSel.value === 'rank') data.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
        else data.sort((a, b) => a.name.localeCompare(b.name));

        count.textContent = `${data.length} / ${gods.length}`;
        list.innerHTML = data.map(card).join('') || `<div class="card">No matches.</div>`;
        hookCopy();
    }

    // --- Templates ---
    function card(g) {
        return `
      <article class="card" id="${g.slug}">
        <div class="name">${g.name}</div>
        <div class="meta">Rank: ${g.rank ?? '—'} • ${g.location || '—'} • ${g.lineage || '—'}</div>
        <div class="chips">${g.words.map(w => `<span class="chip">${w}</span>`).join('')}</div>
        ${g.tag.length ? `<div class="chips">${g.tag.map(t => `<span class="chip">${t}</span>`).join('')}</div>` : ''}
        <div class="desc">${g.desc}</div>
        <div class="tools">
          <button data-copy="macro" data-slug="${g.slug}">Copy Macro</button>
          <button data-copy="json" data-slug="${g.slug}">Copy JSON</button>
        </div>
      </article>`;
    }

    // --- Copy handlers ---
    function hookCopy() {
        document.querySelectorAll('button[data-copy]').forEach(btn => {
            btn.onclick = () => {
                const g = gods.find(x => x.slug === btn.dataset.slug);
                const text = btn.dataset.copy === 'json'
                    ? JSON.stringify(g, null, 2)
                    : [
                        `**${g.name}** (Rank ${g.rank ?? '-'})`,
                        `Location: ${g.location || '-'} | Lineage: ${g.lineage || '-'}`,
                        `Words: ${g.words.join(', ') || '-'}`,
                        `Tags: ${g.tag.join(', ') || '-'}`,
                        g.desc || ''
                    ].join('\n');
                navigator.clipboard.writeText(text);
                const old = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = old, 800);
            };
        });
    }

    // --- Helpers ---
    function normalize(g) {
        const words = split(g.words);
        const tag = split(g.tag);
        const name = String(g.name || '').trim();
        return {
            name,
            words,
            desc: String(g.desc || '').trim(),
            location: String(g.location || '').trim(),
            rank: numOrNull(g.rank),
            lineage: String(g.lineage || '').trim(),
            tag,
            slug: slug(name)
        };
    }
    function split(v) { return v ? String(v).split(/[|,]/).map(s => s.trim()).filter(Boolean) : []; }
    function numOrNull(v) { const n = Number(v); return isNaN(n) ? null : n; }
    function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
    function uniq(a) { return [...new Set(a.filter(Boolean))]; }
    function fillSelect(sel, arr) { arr.sort().forEach(v => { const o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); }); }
})();
