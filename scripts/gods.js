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
        const goto = e.target.closest('[data-goto]');
        if (goto) {
            e.preventDefault();
            const target = document.getElementById(goto.dataset.goto);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }


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
        else if (sortSel.value === 'origin') data = data.slice().sort((a, b) => (a.origins[0] || '').localeCompare(b.origins[0] || '') || a.name.localeCompare(b.name));
        else data = data.slice().sort((a, b) => a.name.localeCompare(b.name));


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

    function cardNode(g) {
        const art = document.createElement('article');
        art.className = 'card';
        art.id = g.slug;
        art.style.cssText = rankStyle(g.rank);

        // header strip
        const head = document.createElement('div');
        head.className = 'head';
        head.innerHTML = `
    <div class="title">${g.name}</div>
    <div class="origin-pills">
      ${g.origins.map(o => `<span class="origin-tag" data-origin="${originKey(o)}">${o}</span>`).join('')}
    </div>`;
        art.appendChild(head);

        // cover image (hidden if missing)
        const img = document.createElement('img');
        img.className = 'cover';
        img.loading = 'lazy';
        img.alt = g.name;
        img.src = g.cover;
        img.onerror = () => img.remove();
        art.appendChild(img);

        // --- body content ---
        art.insertAdjacentHTML('beforeend', `
    <div class="row meta">
      Rank: ${g.rank ?? '—'} • ${g.locations.join(', ') || '—'} •  ${g.lineages.map(L => {
          const target = byName.get(String(L).toLowerCase());
          const href = target ? `#${target.slug}` : '';
          return `<a class="chip chip-lineage" ${href ? `href="${href}" data-goto="${target.slug}"` : ''}>${L}</a>`;
      }).join('')}
    </div>


    <div class="row chips">${g.words.map(w => `<span class="chip">${w}</span>`).join('')}</div>
    <div class="row god-body collapsed">${g.desc}</div>
        <a class="read-more" role="button">Read full</a>

    <h4>Children: </h4>
    ${renderChildren(g)}

    <div class="tools">
      <button data-act="copy"  data-slug="${g.slug}">Copy</button>
      <button data-act="toggle" data-slug="${g.slug}">Hide</button>
    </div>
  `);

        // read-more toggle
        const body = art.querySelector('.god-body');
        const more = art.querySelector('.read-more');
        const toggle = () => {
            const collapsed = body.classList.toggle('collapsed');
            more.textContent = collapsed ? 'Read full' : 'Show less';
        };
        more.addEventListener('click', toggle);

        if ((g.desc || '').length < 220) {
            body.classList.remove('collapsed');
            more.style.display = 'none';
        }

        return art;
    }



    function renderChildren(g) {
        const kids = childrenMap.get(g.slug) || [];
        if (!kids.length) return '';
        const chips = kids.map(sl => {
            const c = bySlug.get(sl);
            return `<a class="chip chip-child" href="#${c.slug}" data-goto="${c.slug}">${c.name}</a>`;
        }).join('');
        return `<div class="chips kids">${chips}</div>`;
    }


    function normalize(g) {
        const words = split(g.words);
        const origins = split(g.origins ?? g.origin ?? g.tag);
        const locations = splitCSV(g.location);
        const lineages = splitCSV(g.lineage);
        const name = String(g.name || '').trim();
        const slugged = slug(name);

        const hay = (name + ' ' + words.join(' ') + ' ' +
            (g.desc || '') + ' ' + origins.join(' ') + ' ' +
            locations.join(' ') + ' ' + lineages.join(' ')
        ).toLowerCase();

        return {
            name,
            slug: slugged,
            words,
            desc: String(g.desc || '').trim(),
            cover: `assets/gods/${slugged}.jpg`,
            locations,
            location: locations[0] || '',
            lineages,
            lineage: lineages[0] || '',
            origins,
            rank: numOrNull(g.rank),
            hay
        };
    }

    // after gods array exists:
    const byName = new Map(gods.map(g => [g.name.toLowerCase(), g]));
    const bySlug = new Map(gods.map(g => [g.slug, g]));

    // build children map from lineage references
    const childrenMap = new Map(); // parentSlug -> [childSlugs]
    gods.forEach(child => {
        child.lineages.forEach(L => {
            const p = byName.get(String(L).toLowerCase());
            if (!p) return;
            const list = childrenMap.get(p.slug) || [];
            list.push(child.slug);
            childrenMap.set(p.slug, list);
        });
    });


    function buildClean(g) {
        const lines = [
            `${g.name} (Rank ${g.rank ?? '-'})`,
            `Origins: ${g.origins.join(', ') || '-'}`,
            `Lineage: ${g.lineages.join(', ') || '-'}`,
            `Location: ${g.locations.join(', ') || '-'}`,
            `Words: ${g.words.join(', ') || '-'}`,
            g.desc || ''
        ];
        return lines.join('\n');
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

