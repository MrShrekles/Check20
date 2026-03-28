(async function () {
    const DATA_URL = '/data/gods.json';
    const $ = s => document.querySelector(s);
    const COLLATE = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

    // Canonical realm buckets — maps any location string → canonical realm label
    const REALM_MAP = {
        'universal': 'Universal',
        'prime': 'Prime', 'all': 'Prime',
        'fey': 'Fey', 'fey spring': 'Fey', 'spring': 'Fey', 'summer': 'Fey', 'winter': 'Fey',
        'celestial': 'Celestial', 'celestia': 'Celestial',
        'eclipse': 'Eclipse',
        'dreamsea': 'Dreamsea',
        'ordealis': 'Ordealis',
        'void': 'Void', 'the void': 'Void', 'realm of void': 'Void',
        'abyss': 'Abyss',
    };
    const REALM_ORDER = ['Universal', 'Prime', 'Fey', 'Celestial', 'Eclipse', 'Dreamsea', 'Ordealis', 'Void', 'Abyss', 'Other'];

    // Lineage values that are not real god names
    const NON_GOD_LINEAGES = new Set(['self', 'primordial', 'alien', 'the 7', '']);

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

    // ---------- Lookup maps ----------
    const byName = new Map(gods.map(g => [g.name.toLowerCase(), g]));
    const bySlug = new Map(gods.map(g => [g.slug, g]));
    const godsBySlug = bySlug;

    // Build children map: parentSlug → [childSlugs]  (self-correcting from lineage field)
    const childrenMap = new Map();
    gods.forEach(child => {
        child.lineages.forEach(L => {
            const p = byName.get(String(L).toLowerCase());
            if (!p) return;
            const arr = childrenMap.get(p.slug) || [];
            arr.push(child.slug);
            childrenMap.set(p.slug, arr);
        });
    });

    // ---------- Elements ----------
    const q = $('#q'), linSel = $('#lin'), sortSel = $('#sort'),
        clearBtn = $('#clear'), list = $('#list'), count = $('#count'),
        collapseAllBtn = $('#collapse-all'), treeWrap = $('#tree-wrap'),
        btnCard = $('#btn-card-view'), btnTree = $('#btn-tree-view');

    // ---------- Realm tabs ----------
    const presentRealms = [...new Set(gods.flatMap(g => g.realms))].sort(
        (a, b) => REALM_ORDER.indexOf(a) - REALM_ORDER.indexOf(b)
    );
    const realmTabBar = $('#realm-tabs');
    presentRealms.forEach(realm => {
        const btn = document.createElement('button');
        btn.className = 'realm-tab';
        btn.dataset.realm = realm;
        btn.textContent = realm;
        realmTabBar.appendChild(btn);
    });

    let activeRealm = '';
    realmTabBar.addEventListener('click', e => {
        const tab = e.target.closest('.realm-tab');
        if (!tab) return;
        activeRealm = tab.dataset.realm;
        realmTabBar.querySelectorAll('.realm-tab').forEach(t => t.classList.toggle('active', t === tab));
        scheduleRender();
    });

    // ---------- Lineage filter ----------
    fillSelect(linSel, uniq(gods.flatMap(g => g.lineages)));

    // ---------- Rank stats ----------
    const rankStats = (() => {
        const vals = gods.map(g => (typeof g.rank === 'number' ? g.rank : null)).filter(v => v != null);
        const min = vals.length ? Math.min(...vals) : 0;
        const max = vals.length ? Math.max(...vals) : 1;
        return { min, max: max === min ? min + 1 : max };
    })();

    // ---------- View state ----------
    let viewMode = 'card'; // 'card' | 'tree'

    btnCard.addEventListener('click', () => {
        viewMode = 'card';
        btnCard.classList.add('active');
        btnTree.classList.remove('active');
        list.style.display = '';
        treeWrap.style.display = 'none';
        collapseAllBtn.style.display = '';
        scheduleRender();
    });

    btnTree.addEventListener('click', () => {
        viewMode = 'tree';
        btnTree.classList.add('active');
        btnCard.classList.remove('active');
        list.style.display = 'none';
        treeWrap.style.display = '';
        collapseAllBtn.style.display = 'none';
        renderTree();
    });

    // ---------- Collapse All ----------
    collapseAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.card').forEach(c => {
            c.classList.add('collapsed');
            const btn = c.querySelector('button[data-act="toggle"]');
            if (btn) btn.textContent = 'Show';
        });
    });

    // ---------- Events ----------
    [q, linSel, sortSel].forEach(el => el.addEventListener('input', scheduleRender));
    clearBtn.addEventListener('click', () => {
        q.value = ''; linSel.value = ''; sortSel.value = 'rank';
        activeRealm = '';
        realmTabBar.querySelectorAll('.realm-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
        document.querySelectorAll('.card').forEach(c => { c.classList.remove('collapsed'); c.style.outline = ''; });
        scheduleRender();
    });

    // Card button delegation
    list.addEventListener('click', e => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const g = godsBySlug.get(btn.dataset.slug);
        const card = btn.closest('.card');
        if (!g || !card) return;

        if (btn.dataset.act === 'copy') {
            navigator.clipboard.writeText(buildClean(g));
            btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 900);
            card.style.outline = '2px solid #4caf50';
        } else if (btn.dataset.act === 'toggle') {
            const collapsed = card.classList.toggle('collapsed');
            btn.textContent = collapsed ? 'Show' : 'Hide';
        }
    });

    // Smooth-scroll data-goto links
    document.addEventListener('click', e => {
        const goto = e.target.closest('[data-goto]');
        if (!goto) return;
        e.preventDefault();
        // If in tree mode, switch to card view first
        if (viewMode === 'tree') {
            btnCard.click();
            setTimeout(() => scrollToCard(goto.dataset.goto), 50);
        } else {
            scrollToCard(goto.dataset.goto);
        }
    });

    function scrollToCard(slug) {
        const target = document.getElementById(slug);
        if (target) {
            target.style.outline = '2px solid var(--theme)';
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => target.style.outline = '', 1500);
        }
    }

    // ---------- Render loop (card view) ----------
    let raf = null;
    function scheduleRender() { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(render); }

    function render() {
        raf = null;
        if (viewMode === 'tree') { renderTree(); return; }

        const term = (q.value || '').trim().toLowerCase();
        const lin = linSel.value;

        let data = gods;
        if (activeRealm) data = data.filter(g => g.realms.includes(activeRealm));
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

    // ---------- Card node ----------
    function cardNode(g) {
        const art = document.createElement('article');
        art.className = 'card';
        art.id = g.slug;
        art.style.cssText = rankStyle(g.rank);

        const head = document.createElement('div');
        head.className = 'head';
        head.innerHTML = `
    <div class="title">${g.name}</div>
    <div class="origin-pills">
      ${g.origins.map(o => {
            const key = originKey(o);
            return `<span class="origin-tag ${key}" data-origin="${key}">${o}</span>`;
        }).join('')}
    </div>`;
        art.appendChild(head);

        const img = document.createElement('img');
        img.className = 'cover'; img.loading = 'lazy'; img.alt = g.name; img.src = g.cover;
        img.onerror = () => img.remove();
        art.appendChild(img);

        art.insertAdjacentHTML('beforeend', `
    <div class="row meta">
      Rank: ${g.rank ?? '—'} &bull; ${g.realms.join(', ') || '—'} &bull;
      ${g.lineages.map(L => {
            const target = byName.get(String(L).toLowerCase());
            const href = target ? `#${target.slug}` : '';
            return `<a class="chip chip-lineage" ${href ? `href="${href}" data-goto="${target.slug}"` : ''}>${L}</a>`;
        }).join('')}
    </div>
    <div class="row chips">${g.words.map(w => `<span class="chip">${w}</span>`).join('')}</div>
    <div class="row god-body collapsed">${g.desc}</div>
    <a class="read-more" role="button">Read full</a>
    <h4 class="children-head">Children</h4>
    ${renderChildren(g)}
    <div class="tools">
      <button data-act="copy"  data-slug="${g.slug}">Copy</button>
      <button data-act="toggle" data-slug="${g.slug}">Hide</button>
    </div>
  `);

        const body = art.querySelector('.god-body');
        const more = art.querySelector('.read-more');
        more.addEventListener('click', () => {
            const collapsed = body.classList.toggle('collapsed');
            more.textContent = collapsed ? 'Read full' : 'Show less';
        });
        if ((g.desc || '').length < 220) {
            body.classList.remove('collapsed');
            more.style.display = 'none';
        }

        // Hide children heading if no children
        if (!childrenMap.has(g.slug)) {
            art.querySelector('.children-head').style.display = 'none';
        }

        return art;
    }

    // ---------- Children chips ----------
    function renderChildren(g) {
        const kids = childrenMap.get(g.slug) || [];
        if (!kids.length) return '';
        const chips = kids.map(sl => {
            const c = bySlug.get(sl);
            if (!c) return '';
            return `<a class="chip chip-child" href="#${c.slug}" data-goto="${c.slug}">${c.name}</a>`;
        }).join('');
        return `<div class="row chips kids">${chips}</div>`;
    }

    // ---------- Tree view ----------
    function renderTree() {
        const term = (q.value || '').trim().toLowerCase();
        const lin = linSel.value;

        // Determine which gods to include
        let pool = gods;
        if (activeRealm) pool = pool.filter(g => g.realms.includes(activeRealm));
        if (lin) pool = pool.filter(g => g.lineages.includes(lin));
        if (term) pool = pool.filter(g => g.hay.includes(term));

        const poolSlugs = new Set(pool.map(g => g.slug));

        // Find roots: gods in pool whose lineages don't resolve to any god in pool
        const roots = pool.filter(g =>
            g.lineages.every(L => {
                if (NON_GOD_LINEAGES.has(L.toLowerCase())) return true;
                const p = byName.get(L.toLowerCase());
                return !p || !poolSlugs.has(p.slug);
            })
        ).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

        // Track placed slugs to avoid rendering the same node twice
        const placed = new Set();

        const container = document.createElement('div');
        container.className = 'tree-container';

        if (!pool.length) {
            container.innerHTML = '<p class="tree-empty">No gods match current filters.</p>';
        } else {
            const rootUl = buildTreeBranch(roots, poolSlugs, placed, 0);
            container.appendChild(rootUl);

            // Orphans: gods in pool not yet placed (e.g. multi-parent gods placed elsewhere already)
            const orphans = pool.filter(g => !placed.has(g.slug))
                .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
            if (orphans.length) {
                const orphanHead = document.createElement('div');
                orphanHead.className = 'tree-orphan-head';
                orphanHead.textContent = '— Other / Unknown Lineage —';
                container.appendChild(orphanHead);
                container.appendChild(buildTreeBranch(orphans, poolSlugs, placed, 0));
            }
        }

        count.textContent = `${pool.length} / ${gods.length}`;
        treeWrap.replaceChildren(container);
    }

    function buildTreeBranch(nodes, poolSlugs, placed, depth) {
        const ul = document.createElement('ul');
        ul.className = depth === 0 ? 'tree tree-root' : 'tree';

        for (const g of nodes) {
            if (placed.has(g.slug)) continue;
            placed.add(g.slug);

            const li = document.createElement('li');
            li.className = 'tree-item';

            // Node pill
            const node = document.createElement('div');
            node.className = 'tree-node';
            node.style.cssText = rankStyle(g.rank);
            node.innerHTML = `
        <a class="tree-name" href="#${g.slug}" data-goto="${g.slug}">${g.name}</a>
        <span class="tree-rank">Rank ${g.rank ?? '—'}</span>
        ${g.origins.map(o => `<span class="origin-tag ${originKey(o)}">${o}</span>`).join('')}
      `;
            li.appendChild(node);

            // Recurse into children that are in the pool
            const kidSlugs = (childrenMap.get(g.slug) || []).filter(sl => poolSlugs.has(sl) && !placed.has(sl));
            if (kidSlugs.length) {
                const kids = kidSlugs.map(sl => bySlug.get(sl)).filter(Boolean)
                    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
                li.appendChild(buildTreeBranch(kids, poolSlugs, placed, depth + 1));
            }

            ul.appendChild(li);
        }
        return ul;
    }

    // ---------- Normalise ----------
    function normalize(g) {
        const words = split(g.words);
        const origins = split(g.origins ?? g.origin ?? g.tag);
        const locations = splitCSV(g.location);
        const lineages = splitCSV(g.lineage);
        const name = String(g.name || '').trim();
        const slugged = slug(name);

        // Map locations to canonical realms
        const realms = [...new Set(
            locations.map(l => REALM_MAP[l.toLowerCase()] || 'Other')
        )];

        const hay = (name + ' ' + words.join(' ') + ' ' +
            (g.desc || '') + ' ' + origins.join(' ') + ' ' +
            locations.join(' ') + ' ' + lineages.join(' ')
        ).toLowerCase();

        return { name, slug: slugged, words, desc: String(g.desc || '').trim(),
            cover: `assets/gods/${slugged}.jpg`, locations, location: locations[0] || '',
            realms, lineages, lineage: lineages[0] || '', origins, rank: numOrNull(g.rank), hay };
    }

    // ---------- Utilities ----------
    function buildClean(g) {
        return [
            `${g.name} (Rank ${g.rank ?? '-'})`,
            `Origins: ${g.origins.join(', ') || '-'}`,
            `Lineage: ${g.lineages.join(', ') || '-'}`,
            `Location: ${g.locations.join(', ') || '-'}`,
            `Words: ${g.words.join(', ') || '-'}`,
            g.desc || ''
        ].join('\n');
    }

    function originKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

    const RANK_COLOR = {
        MIN_RANK: 1, MAX_RANK: 200,
        HUE_START: 120, HUE_RANGE: 999,
        SAT_START: 50, SAT_END: 30,
        LIGHT_START: 30, LIGHT_END: 9
    };

    function rankStyle(rank) {
        if (rank === 999) return 'background:#000; border-color:#000;';
        if (rank === 0 || rank == null || isNaN(rank)) return 'background:var(--gold-1); border-color:#d4af37;';
        const cfg = RANK_COLOR;
        const clamped = clamp(rank, cfg.MIN_RANK, cfg.MAX_RANK);
        const r = (clamped - cfg.MIN_RANK) / (cfg.MAX_RANK - cfg.MIN_RANK || 1);
        let hue = ((cfg.HUE_START + r * cfg.HUE_RANGE) % 500 + 360) % 360;
        const sat = cfg.SAT_START + (cfg.SAT_END - cfg.SAT_START) * r;
        const light = cfg.LIGHT_START + (cfg.LIGHT_END - cfg.LIGHT_START) * r;
        const H = Math.round(hue), S = Math.round(sat), L = Math.round(light);
        return `background:hsl(${H} ${S}% ${L}%); border-color:hsl(${H} ${Math.max(0,S-15)}% ${Math.max(0,L-12)}%);`;
    }

    function split(v) { return v ? String(v).split(/[|,]/).map(s => s.trim()).filter(Boolean) : []; }
    function splitCSV(v) { return v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []; }
    function numOrNull(v) { const n = Number(v); return isNaN(n) ? null : n; }
    function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
    function uniq(a) { return [...new Set(a.filter(Boolean))].sort(COLLATE.compare); }
    function fillSelect(sel, arr) { arr.forEach(v => { const o = document.createElement('option'); o.value = o.textContent = v; sel.appendChild(o); }); }
    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

})();
