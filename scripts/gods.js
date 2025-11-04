(async function () {
    const DATA_URL = '/data/gods.json';
    const $ = s => document.querySelector(s);
    const COLLATE = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

    // ---------- Load ----------
    let gods = [];
    try {
        const res = await fetch(DATA_URL, { cache: 'no-store' });
        const raw = await res.json();
        gods = (Array.isArray(raw) ? raw : raw.gods || []).map(normalize);
    } catch (e) {
        console.error('Failed to load gods.json:', e);
        $('#list').innerHTML = `<div class="card">Failed to load data.</div>`;
        return;
    }

    // ---------- Elements ----------
    const q = $('#q'), locSel = $('#loc'), linSel = $('#lin'), sortSel = $('#sort'),
        clearBtn = $('#clear'), list = $('#list'), count = $('#count');

    // ---------- Filters ----------
    fillSelect(locSel, uniq(gods.flatMap(g => g.locations)));
    fillSelect(linSel, uniq(gods.flatMap(g => g.lineages)));

    // ---------- Rank stats (once) ----------
    const rankStats = (() => {
        const vals = gods.map(g => (typeof g.rank === 'number' ? g.rank : null)).filter(v => v != null);
        const min = vals.length ? Math.min(...vals) : 0;
        const max = vals.length ? Math.max(...vals) : 1;
        return { min, max: max === min ? min + 1 : max };
    })();

    // ---------- Events ----------
    [q, locSel, linSel, sortSel].forEach(el => el.addEventListener('input', scheduleRender));
    clearBtn.onclick = () => {
        q.value = ''; locSel.value = ''; linSel.value = ''; sortSel.value = 'rank';
        document.querySelectorAll('.card').forEach(c => { c.classList.remove('collapsed'); c.style.outline = ''; });
        scheduleRender();
    };

    // One listener for card buttons
    list.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const g = godsBySlug.get(btn.dataset.slug);
        const card = btn.closest('.card'); if (!g || !card) return;

        if (btn.dataset.act === 'copy') {
            navigator.clipboard.writeText(buildClean(g));
            btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 900);
            card.style.outline = '2px solid #4caf50';
        } else if (btn.dataset.act === 'toggle') {
            const collapsed = card.classList.toggle('collapsed');
            btn.textContent = collapsed ? 'Show' : 'Hide';
        }
    });

    const godsBySlug = new Map(gods.map(g => [g.slug, g]));

    // ---------- Render loop ----------
    let raf = null;
    function scheduleRender() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }

    function render() {
        raf = null;
        const term = (q.value || '').trim().toLowerCase();
        const loc = locSel.value, lin = linSel.value;

        let data = gods;
        if (loc) data = data.filter(g => g.locations.includes(loc));
        if (lin) data = data.filter(g => g.lineages.includes(lin));
        if (term) data = data.filter(g => g.hay.includes(term));

        if (sortSel.value === 'rank') data = data.slice().sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
        else data = data.slice().sort((a, b) => COLLATE.compare(a.name, b.name));

        count.textContent = `${data.length} / ${gods.length}`;

        const frag = document.createDocumentFragment();
        if (!data.length) {
            const div = document.createElement('div');
            div.className = 'card'; div.textContent = 'No matches.';
            frag.appendChild(div);
        } else {
            for (const g of data) frag.appendChild(cardNode(g));
        }
        list.replaceChildren(frag);
    }

    scheduleRender();

    // ---------- DOM ----------
    function cardNode(g) {
        const art = document.createElement('article');
        art.className = 'card';
        art.id = g.slug;
        art.style.cssText = rankStyle(g.rank);

        const pills = document.createElement('div');
        pills.className = 'origin-pills';
        pills.innerHTML = g.origins.map(o => `<span class="origin-tag" data-origin="${originKey(o)}">${o}</span>`).join('');
        art.appendChild(pills);

        art.insertAdjacentHTML('beforeend', `
      <div class="name">${g.name}</div>
      <div class="meta">
        Rank: ${g.rank ?? '—'} •
        ${(g.locations.length ? g.locations.join(', ') : '—')} •
        ${(g.lineages.length ? g.lineages.join(', ') : '—')}
      </div>
      <div class="chips">${g.words.map(w => `<span class="chip">${w}</span>`).join('')}</div>
      <div class="desc">${g.desc}</div>
      <div class="tools">
        <button data-act="copy"  data-slug="${g.slug}">Copy</button>
        <button data-act="toggle" data-slug="${g.slug}">Hide</button>
      </div>
    `);
        return art;
    }

    // ---------- Helpers ----------
    function normalize(g) {
        const words = split(g.words);
        const origins = split(g.origins ?? g.origin ?? g.tag);
        const locations = splitCSV(g.location);
        const lineages = splitCSV(g.lineage);
        const name = String(g.name || '').trim();

        const hay = (name + ' ' + words.join(' ') + ' ' +
            (g.desc || '') + ' ' + origins.join(' ') + ' ' +
            locations.join(' ') + ' ' + lineages.join(' ')
        ).toLowerCase();

        return {
            name,
            words,
            desc: String(g.desc || '').trim(),
            location: locations[0] || '',
            locations,
            rank: numOrNull(g.rank),
            lineage: lineages[0] || '',
            lineages,
            origins,
            slug: slug(name),
            hay
        };
    }

    function buildClean(g) {
        return JSON.stringify({
            name: g.name,
            words: g.words.join(', '),
            desc: g.desc,
            location: (g.locations.length ? g.locations.join(', ') : ''),
            rank: (typeof g.rank === 'number' ? g.rank : ''),
            lineage: (g.lineages.length ? g.lineages.join(', ') : ''),
            origins: g.origins.join(', ')
        }, null, 2);
    }

    function originKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

    function rankStyle(rank) {
        const { min, max } = rankStats;
        const r = (typeof rank === 'number') ? (rank - min) / (max - min) : 0.5; // 0..1
        // low rank -> deeper & cooler; high rank -> lighter & warmer (tweak as you like)
        const hue = Math.round(10 - r * 500);       // 210→140
        const sat = Math.round(60);  // 55–85
        const light = Math.round(10 + r * 20);      // 20–38
        const bg = `hsl(${hue} ${sat}% ${light}%)`;
        const bd = `hsl(${hue} ${Math.max(25, sat - 18)}% ${Math.max(10, light - 8)}%)`;
        return `background:${bg}; border-color:${bd};`;
    }

    // splits: "a, b" or "a|b" or "a,b|c"
    function split(v) { return v ? String(v).split(/[|,]/).map(s => s.trim()).filter(Boolean) : []; }
    function splitCSV(v) { return v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []; }
    function numOrNull(v) { const n = Number(v); return isNaN(n) ? null : n; }
    function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
    function uniq(a) { return [...new Set(a.filter(Boolean))].sort(COLLATE.compare); }
    function fillSelect(sel, arr) { arr.forEach(v => { const o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); }); }
    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
})();
