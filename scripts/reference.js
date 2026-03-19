(function () {
    /* ── Tab switching ── */
    const nav = document.getElementById('ref-nav');
    const btns = nav.querySelectorAll('.ref-nav-btn');
    const panels = document.querySelectorAll('.tab-panel');

    function showTab(id) {
        btns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
        panels.forEach(p => p.classList.toggle('active', p.dataset.tab === id));
    }

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            clearSearch();
            showTab(btn.dataset.tab);
        });
    });

    /* ── Search ── */
    const searchInput = document.getElementById('ref-search');
    const searchCount = document.getElementById('search-count');
    const searchNav = document.getElementById('search-nav');
    const noResults = document.getElementById('no-results');
    const prevBtn = document.getElementById('search-prev');
    const nextBtn = document.getElementById('search-next');

    let allMarks = [];
    let currentIdx = -1;

    // Walk text nodes, avoid script/style
    function getTextNodes(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const tag = node.parentElement?.tagName?.toLowerCase();
                    if (['script', 'style', 'mark'].includes(tag)) return NodeFilter.FILTER_REJECT;
                    if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        const nodes = [];
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        return nodes;
    }

    function escapeRe(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightIn(panel, query) {
        const re = new RegExp(`(${escapeRe(query)})`, 'gi');
        const textNodes = getTextNodes(panel);
        let count = 0;

        textNodes.forEach(node => {
            if (!re.test(node.textContent)) return;
            re.lastIndex = 0;

            const frag = document.createDocumentFragment();
            let last = 0;
            let m;
            re.lastIndex = 0;

            while ((m = re.exec(node.textContent)) !== null) {
                if (m.index > last) {
                    frag.appendChild(document.createTextNode(node.textContent.slice(last, m.index)));
                }
                const mark = document.createElement('mark');
                mark.className = 'ref-hl';
                mark.textContent = m[0];
                frag.appendChild(mark);
                allMarks.push(mark);
                count++;
                last = re.lastIndex;
            }

            if (last < node.textContent.length) {
                frag.appendChild(document.createTextNode(node.textContent.slice(last)));
            }

            node.parentNode.replaceChild(frag, node);
        });

        return count;
    }

    function clearSearch() {
        // Remove all marks, restore text
        document.querySelectorAll('mark.ref-hl').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
        allMarks = [];
        currentIdx = -1;
        searchCount.textContent = '';
        searchNav.classList.remove('visible');
        document.body.classList.remove('searching');
        noResults.classList.remove('visible');
        // Remove data-has-results
        panels.forEach(p => p.removeAttribute('data-has-results'));
    }

    function jumpTo(idx) {
        if (!allMarks.length) return;
        if (currentIdx >= 0) allMarks[currentIdx].classList.remove('ref-hl-current');
        currentIdx = (idx + allMarks.length) % allMarks.length;
        allMarks[currentIdx].classList.add('ref-hl-current');
        allMarks[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchCount.textContent = `${currentIdx + 1} / ${allMarks.length}`;
    }

    prevBtn.addEventListener('click', () => jumpTo(currentIdx - 1));
    nextBtn.addEventListener('click', () => jumpTo(currentIdx + 1));

    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            clearSearch();
            const q = searchInput.value.trim();
            if (q.length < 2) return;

            document.body.classList.add('searching');

            let total = 0;
            panels.forEach(panel => {
                const n = highlightIn(panel, q);
                if (n > 0) panel.setAttribute('data-has-results', '');
                total += n;
            });

            if (total === 0) {
                noResults.classList.add('visible');
                searchCount.textContent = '0';
            } else {
                searchNav.classList.add('visible');
                jumpTo(0);
            }
        }, 200);
    });

    // Clear search on Escape
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            clearSearch();
            showTab(document.querySelector('.ref-nav-btn.active')?.dataset.tab || 'intro');
        }
        if (e.key === 'Enter') jumpTo(currentIdx + 1);
    });
})();