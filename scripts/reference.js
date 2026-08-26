(function () {
    /* ── Section toggle ── */
    document.querySelectorAll('.ref-section-head').forEach(head => {
        head.addEventListener('click', () => {
            const section = head.closest('.ref-section');
            const open = section.classList.toggle('open');
            head.querySelector('.spell-row-arrow').textContent = open ? '▼' : '▶';
        });
    });

    /* ── Expand / collapse all ── */
    document.getElementById('ref-expand-all')?.addEventListener('click', () => {
        document.querySelectorAll('.ref-section').forEach(s => {
            s.classList.add('open');
            s.querySelector('.spell-row-arrow').textContent = '▼';
        });
    });

    document.getElementById('ref-collapse-all')?.addEventListener('click', () => {
        document.querySelectorAll('.ref-section').forEach(s => {
            s.classList.remove('open');
            s.querySelector('.spell-row-arrow').textContent = '▶';
        });
    });

    /* ── Size controls ── */
    initCodexSize();

    /* ── Search ── */
    const searchInput  = document.getElementById('ref-search');
    const searchCount  = document.getElementById('search-count');
    const searchNav    = document.getElementById('search-nav');
    const noResults    = document.getElementById('no-results');
    const prevBtn      = document.getElementById('search-prev');
    const nextBtn      = document.getElementById('search-next');

    let allMarks   = [];
    let currentIdx = -1;

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

    function highlightIn(root, re) {
        let count = 0;
        getTextNodes(root).forEach(node => {
            if (!re.test(node.textContent)) return;
            re.lastIndex = 0;
            const frag = document.createDocumentFragment();
            let last = 0, m;
            re.lastIndex = 0;
            while ((m = re.exec(node.textContent)) !== null) {
                if (m.index > last) frag.appendChild(document.createTextNode(node.textContent.slice(last, m.index)));
                const mark = document.createElement('mark');
                mark.className = 'ref-hl';
                mark.textContent = m[0];
                frag.appendChild(mark);
                allMarks.push(mark);
                count++;
                last = re.lastIndex;
            }
            if (last < node.textContent.length) frag.appendChild(document.createTextNode(node.textContent.slice(last)));
            node.parentNode.replaceChild(frag, node);
        });
        return count;
    }

    function clearSearch() {
        document.querySelectorAll('mark.ref-hl').forEach(mark => {
            mark.parentNode.replaceChild(document.createTextNode(mark.textContent), mark);
            mark.parentNode?.normalize();
        });
        allMarks   = [];
        currentIdx = -1;
        searchCount.textContent = '';
        searchNav.classList.remove('visible');
        noResults.style.display = '';
        document.querySelectorAll('.ref-section').forEach(s => s.removeAttribute('data-search-match'));
    }

    function jumpTo(idx) {
        if (!allMarks.length) return;
        if (currentIdx >= 0) allMarks[currentIdx].classList.remove('ref-hl-current');
        currentIdx = (idx + allMarks.length) % allMarks.length;
        allMarks[currentIdx].classList.add('ref-hl-current');
        allMarks[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchCount.textContent = `${currentIdx + 1} / ${allMarks.length}`;
    }

    prevBtn?.addEventListener('click', () => jumpTo(currentIdx - 1));
    nextBtn?.addEventListener('click', () => jumpTo(currentIdx + 1));

    let debounce;
    searchInput?.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            clearSearch();
            const q = searchInput.value.trim();
            if (q.length < 2) return;

            const re = new RegExp(`(${escapeRe(q)})`, 'gi');
            let total = 0;

            document.querySelectorAll('.ref-section').forEach(section => {
                const body = section.querySelector('.ref-section-body');
                if (!body) return;
                const n = highlightIn(body, re);
                if (n > 0) {
                    section.setAttribute('data-search-match', '');
                    /* Auto-open matching sections */
                    section.classList.add('open');
                    section.querySelector('.spell-row-arrow').textContent = '▼';
                }
                total += n;
            });

            if (total === 0) {
                noResults.style.display = 'block';
                searchCount.textContent = '0';
            } else {
                searchNav.classList.add('visible');
                jumpTo(0);
            }
        }, 200);
    });

    searchInput?.addEventListener('keydown', e => {
        if (e.key === 'Escape') { searchInput.value = ''; clearSearch(); }
        if (e.key === 'Enter')  jumpTo(currentIdx + 1);
    });
})();
