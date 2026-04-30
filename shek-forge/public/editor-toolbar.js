// ── FORGE CONTEXTUAL TOOLBAR ──────────────────────────────────────────────────
// Shows a floating action bar whenever text is selected inside a .field-input.
// Actions: wrap in [[dice]], capitalize, ALL CAPS, link to a monster entry.

(function () {

    // ── STYLES ────────────────────────────────────────────────────────────────
    const css = document.createElement('style');
    css.textContent = `
        #forge-toolbar {
            position: fixed;
            z-index: 500;
            display: none;
            align-items: center;
            gap: 2px;
            background: #16161f;
            border: 1px solid #3a3a50;
            border-radius: 6px;
            padding: 3px 5px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.6);
            pointer-events: auto;
            user-select: none;
            opacity: 0;
        }
        #forge-toolbar.tb-slow  { transition: opacity 0.5s ease 0.2s; }
        #forge-toolbar.tb-fast  { transition: opacity 0.12s ease; }
        #forge-toolbar.tb-visible { opacity: 1; }
        /* Hide selection-only buttons when no text is selected */
        #forge-toolbar.tb-insert .tb-select-only { display: none !important; }
        .tb-btn {
            background: transparent;
            border: none;
            color: #b0b0c8;
            font-size: 11px;
            font-family: 'Share Tech Mono', monospace;
            padding: 3px 9px;
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
            letter-spacing: 0.03em;
            transition: background 0.12s, color 0.12s;
        }
        .tb-btn:hover        { background: #2a2a3a; color: #fff; }
        .tb-btn.tb-dice      { color: #ffd700; }
        .tb-btn.tb-dice:hover{ background: #2a2515; color: #ffe555; }
        .tb-btn.tb-monster   { color: #7ecfff; }
        .tb-btn.tb-monster:hover { background: #152030; color: #aee8ff; }
        .tb-sep { width: 1px; height: 14px; background: #3a3a50; margin: 0 2px; flex-shrink: 0; }

        #forge-monster-picker {
            position: fixed;
            z-index: 501;
            display: none;
            flex-direction: column;
            background: #16161f;
            border: 1px solid #3a3a50;
            border-radius: 6px;
            padding: 5px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.6);
            min-width: 210px;
        }
        #forge-mp-search {
            width: 100%;
            background: #0e0e18;
            border: 1px solid #3a3a50;
            border-radius: 4px;
            color: #ccc;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            padding: 4px 8px;
            box-sizing: border-box;
            outline: none;
        }
        #forge-mp-search:focus { border-color: #7ecfff; }
        #forge-mp-list {
            max-height: 180px;
            overflow-y: auto;
            margin-top: 4px;
        }
        .mp-item {
            padding: 4px 8px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            color: #aaa;
            cursor: pointer;
            border-radius: 3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .mp-item:hover { background: #2a2a3a; color: #fff; }
        .mp-empty { padding: 10px 8px; color: #555; font-size: 11px; text-align: center; font-family: 'Share Tech Mono', monospace; }

        /* Case & Check subpanels */
        #forge-case-panel, #forge-check-panel {
            position: fixed; z-index: 501; display: none;
            flex-direction: column; gap: 2px;
            background: #16161f; border: 1px solid #3a3a50;
            border-radius: 6px; padding: 4px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.6);
            min-width: 110px;
        }
        .sub-item {
            padding: 4px 10px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px; color: #b0b0c8;
            cursor: pointer; border-radius: 3px;
            white-space: nowrap;
        }
        .sub-item:hover { background: #2a2a3a; color: #fff; }
        .sub-item.sub-check { color: #a0e8a0; }
        .sub-item.sub-check:hover { background: #152515; color: #c0ffc0; }
        .sub-item.sub-condition { color: #ffb87a; }
        .sub-item.sub-condition:hover { background: #251508; color: #ffd4a0; }

        /* Condition inline toolbar views */
        #forge-toolbar .tb-view { display: none; align-items: center; gap: 2px; }
        #forge-toolbar[data-view="main"]      .tb-main-view { display: flex; }
        #forge-toolbar[data-view="cond-cats"] .tb-cond-cats { display: flex; }
        #forge-toolbar[data-view="cond-list"] .tb-cond-list { display: flex; }
        .tb-back { color: #666; font-size: 10px; padding: 3px 6px; }
        .tb-back:hover { color: #aaa; background: #2a2a3a; }
        .tb-cond-cat { color: #ffb87a; }
        .tb-cond-cat:hover { background: #251508; color: #ffd4a0; }
        .tb-cond-item { color: #ffb87a; }
        .tb-cond-item:hover { background: #251508; color: #ffd4a0; }
    `;
    document.head.appendChild(css);

    // ── TOOLBAR DOM ───────────────────────────────────────────────────────────
    const toolbar = document.createElement('div');
    toolbar.id = 'forge-toolbar';
    toolbar.dataset.view = 'main';
    toolbar.innerHTML = `
        <div class="tb-view tb-main-view">
            <button class="tb-btn tb-dice tb-select-only" title="Wrap in dice notation [[...]]">⚄ [[dice]]</button>
            <div    class="tb-sep tb-select-only"></div>
            <button class="tb-btn tb-case tb-select-only" title="Change case">Aa ▾</button>
            <div    class="tb-sep tb-select-only"></div>
            <button class="tb-btn tb-check"     title="Insert a check">☑ Check</button>
            <button class="tb-btn tb-condition" title="Insert a condition">⚠ Cond</button>
            <div class="tb-sep"></div>
            <button class="tb-btn tb-monster"   title="Link to a monster entry">⚔ Monster</button>
        </div>
        <div class="tb-view tb-cond-cats">
            <button class="tb-btn tb-back">◂</button>
            <div class="tb-sep"></div>
            <span id="tb-cats"></span>
        </div>
        <div class="tb-view tb-cond-list">
            <button class="tb-btn tb-back-cats tb-back">◂</button>
            <div class="tb-sep"></div>
            <span id="tb-cond-items"></span>
        </div>
    `;
    document.body.appendChild(toolbar);

    // ── MONSTER PICKER DOM ────────────────────────────────────────────────────
    const picker = document.createElement('div');
    picker.id = 'forge-monster-picker';
    picker.innerHTML = `
        <input id="forge-mp-search" type="text" placeholder="Search monsters…" autocomplete="off">
        <div id="forge-mp-list"></div>
    `;
    document.body.appendChild(picker);

    const mpSearch = picker.querySelector('#forge-mp-search');
    const mpList   = picker.querySelector('#forge-mp-list');

    // ── CASE PANEL ────────────────────────────────────────────────────────────
    const casePanel = document.createElement('div');
    casePanel.id = 'forge-case-panel';
    casePanel.innerHTML = `
        <div class="sub-item" data-case="cap">Aa  First letter</div>
        <div class="sub-item" data-case="upper">ALL  All caps</div>
        <div class="sub-item" data-case="lower">lower  No caps</div>
    `;
    document.body.appendChild(casePanel);

    // ── CHECK PANEL ───────────────────────────────────────────────────────────
    const CHECKS = ['Agility','Crafting','Influence','Intellect','Luck','Mental','Observation','Physical','Spirit','Stealth','Strength','Survival'];
    const checkPanel = document.createElement('div');
    checkPanel.id = 'forge-check-panel';
    checkPanel.innerHTML = CHECKS.map(c =>
        `<div class="sub-item sub-check" data-check="${c}">${c} check</div>`
    ).join('');
    document.body.appendChild(checkPanel);

    // ── CONDITION INLINE VIEWS ────────────────────────────────────────────────
    const CONDITION_CATS = {
        'Corpus':    ['Bleeding','Broken','Concussion','Coughing','Dislocation','Pinned','Prone','Slowed'],
        'Cognition': ['Blind','Charmed','Confused','Deaf','Fear'],
        'Special':   ['Intangible','Invisible'],
        'Major':     ['Constrained','Death','Exhaustion','Exposed','Injured','Stunned','Unconscious'],
    };

    function setView(view) {
        toolbar.dataset.view = view;
        requestAnimationFrame(() => positionAbove(activeEl, toolbar));
    }

    function buildCondCats() {
        const el = toolbar.querySelector('#tb-cats');
        el.innerHTML = Object.keys(CONDITION_CATS).map(cat =>
            `<button class="tb-btn tb-cond-cat" data-cat="${cat}">${cat}</button>`
        ).join('');
        el.querySelectorAll('.tb-cond-cat').forEach(btn => {
            btn.addEventListener('mousedown', e => {
                e.preventDefault();
                buildCondList(btn.dataset.cat);
                setView('cond-list');
            });
        });
    }

    function buildCondList(cat) {
        const el = toolbar.querySelector('#tb-cond-items');
        el.innerHTML = CONDITION_CATS[cat].map(c =>
            `<button class="tb-btn tb-cond-item" data-condition="${c}">${c}</button>`
        ).join('');
        el.querySelectorAll('.tb-cond-item').forEach(btn => {
            btn.addEventListener('mousedown', e => {
                e.preventDefault();
                apply(btn.dataset.condition);
                setView('main');
            });
        });
    }

    buildCondCats();

    // ── LOCAL STATE ───────────────────────────────────────────────────────────
    let activeEl   = null;   // the focused .field-input
    let savedStart = 0;
    let savedEnd   = 0;

    // ── POSITION HELPERS ──────────────────────────────────────────────────────
    function positionAbove(el, floater) {
        const rect  = el.getBoundingClientRect();
        const fRect = floater.getBoundingClientRect();
        let top  = rect.top - fRect.height - 8;
        let left = rect.left;
        if (top < 4) top = rect.bottom + 8;                          // flip below if no room
        if (left + fRect.width > window.innerWidth - 8)
            left = window.innerWidth - fRect.width - 8;
        floater.style.top  = `${top}px`;
        floater.style.left = `${left}px`;
    }

    // ── SHOW / HIDE ───────────────────────────────────────────────────────────
    function showToolbar(el, hasSelection) {
        activeEl   = el;
        savedStart = el.selectionStart;
        savedEnd   = el.selectionEnd;

        toolbar.classList.remove('tb-slow', 'tb-fast', 'tb-insert', 'tb-select', 'tb-visible');
        if (hasSelection) {
            toolbar.classList.add('tb-fast', 'tb-select');
        } else {
            toolbar.classList.add('tb-slow', 'tb-insert');
        }

        toolbar.style.display = 'flex';
        requestAnimationFrame(() => {
            positionAbove(el, toolbar);
            requestAnimationFrame(() => toolbar.classList.add('tb-visible'));
        });
    }

    function hideToolbar() {
        toolbar.style.display = 'none';
        toolbar.classList.remove('tb-visible', 'tb-slow', 'tb-fast', 'tb-insert', 'tb-select');
        hideAllSub();
        activeEl = null;
    }

    function showPicker() {
        picker.style.display = 'flex';
        requestAnimationFrame(() => {
            positionAbove(toolbar, picker);
            // Recalculate — picker is above toolbar which is above the field
            const tbRect = toolbar.getBoundingClientRect();
            const pkRect = picker.getBoundingClientRect();
            picker.style.top  = `${tbRect.top - pkRect.height - 6}px`;
            picker.style.left = toolbar.style.left;
        });
        mpSearch.value = '';
        renderMonsterList('');
        requestAnimationFrame(() => mpSearch.focus());
    }

    function hidePicker() {
        picker.style.display = 'none';
    }

    // ── APPLY A TEXT TRANSFORM ────────────────────────────────────────────────
    function apply(newText) {
        if (!activeEl) return;
        // In insert mode (no selection), refresh to current cursor before applying
        if (savedStart === savedEnd) {
            savedStart = activeEl.selectionStart ?? savedStart;
            savedEnd   = activeEl.selectionEnd   ?? savedEnd;
        }
        const val    = activeEl.value;
        const before = val.slice(0, savedStart);
        const after  = val.slice(savedEnd);
        activeEl.value = before + newText + after;

        const cursor = savedStart + newText.length;
        activeEl.setSelectionRange(cursor, cursor);

        // Fire both events so inline onchange= handlers pick it up
        activeEl.dispatchEvent(new Event('input',  { bubbles: true }));
        activeEl.dispatchEvent(new Event('change', { bubbles: true }));

        hideToolbar();
        activeEl.focus();
    }

    function selected() {
        return activeEl ? activeEl.value.slice(savedStart, savedEnd) : '';
    }

    // ── SUBPANEL HELPERS ──────────────────────────────────────────────────────
    function positionBelow(anchor, panel) {
        const r = anchor.getBoundingClientRect();
        panel.style.top  = `${r.bottom + 4}px`;
        panel.style.left = `${r.left}px`;
    }

    function hideAllSub() {
        casePanel.style.display  = 'none';
        checkPanel.style.display = 'none';
        toolbar.dataset.view     = 'main';
        hidePicker();
    }

    function toggleSub(panel, anchorBtn) {
        const visible = panel.style.display === 'flex';
        hideAllSub();
        if (!visible) {
            panel.style.display = 'flex';
            requestAnimationFrame(() => positionBelow(anchorBtn, panel));
        }
    }

    // ── BUTTON WIRING ─────────────────────────────────────────────────────────
    toolbar.querySelector('.tb-dice').addEventListener('mousedown', e => {
        e.preventDefault();
        apply(`[[${selected()}]]`);
    });

    toolbar.querySelector('.tb-case').addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        toggleSub(casePanel, e.currentTarget);
    });

    casePanel.querySelectorAll('.sub-item').forEach(item => {
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            const s = selected();
            if (item.dataset.case === 'cap')   apply(s.charAt(0).toUpperCase() + s.slice(1));
            if (item.dataset.case === 'upper') apply(s.toUpperCase());
            if (item.dataset.case === 'lower') apply(s.toLowerCase());
        });
    });

    toolbar.querySelector('.tb-check').addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        toggleSub(checkPanel, e.currentTarget);
    });

    checkPanel.querySelectorAll('.sub-item').forEach(item => {
        item.addEventListener('mousedown', e => {
            e.preventDefault();
            apply(`${item.dataset.check} check`);
        });
    });

    toolbar.querySelector('.tb-condition').addEventListener('mousedown', e => {
        e.preventDefault();
        buildCondCats();
        setView('cond-cats');
    });

    toolbar.querySelector('.tb-cond-cats .tb-back').addEventListener('mousedown', e => {
        e.preventDefault();
        setView('main');
    });

    toolbar.querySelector('.tb-back-cats').addEventListener('mousedown', e => {
        e.preventDefault();
        setView('cond-cats');
    });

    toolbar.querySelector('.tb-monster').addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (picker.style.display === 'flex') { hidePicker(); return; }
        showPicker();
    });

    // ── MONSTER PICKER ────────────────────────────────────────────────────────
    function getMonsterNames() {
        if (typeof state === 'undefined' || !Array.isArray(state.data)) return [];
        return [...new Set(state.data.map(m => m.name).filter(Boolean))].sort();
    }

    function renderMonsterList(query) {
        const q     = query.toLowerCase();
        const names = getMonsterNames().filter(n => !q || n.toLowerCase().includes(q));
        if (!names.length) {
            mpList.innerHTML = `<div class="mp-empty">No monsters found</div>`;
            return;
        }
        mpList.innerHTML = names.slice(0, 50).map(n =>
            `<div class="mp-item" data-name="${escAttr(n)}">${escHtml(n)}</div>`
        ).join('');
        mpList.querySelectorAll('.mp-item').forEach(item => {
            item.addEventListener('mousedown', e => {
                e.preventDefault();
                apply(`[${item.dataset.name}]`);
            });
        });
    }

    mpSearch.addEventListener('input', () => renderMonsterList(mpSearch.value));

    // ── SELECTION DETECTION ───────────────────────────────────────────────────
    document.addEventListener('mouseup', e => {
        if (toolbar.contains(e.target) || picker.contains(e.target) ||
            casePanel.contains(e.target) || checkPanel.contains(e.target)) return;

        setTimeout(() => {
            const el = document.activeElement;

            if (!el || !el.classList.contains('field-input')
                    || el.type === 'number' || el.tagName === 'SELECT') {
                hideToolbar();
                return;
            }

            const start        = el.selectionStart ?? 0;
            const end          = el.selectionEnd   ?? 0;
            const hasSelection = start !== end;

            // Re-use existing toolbar if already showing for same field & same mode
            const alreadyCorrectMode = toolbar.style.display !== 'none' &&
                activeEl === el &&
                toolbar.classList.contains(hasSelection ? 'tb-select' : 'tb-insert');
            if (!alreadyCorrectMode) showToolbar(el, hasSelection);
        }, 20);
    });

    // Keyboard shortcut: Escape dismisses
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { hideToolbar(); hideQB(); }
    });

    // Click outside all panels → hide
    document.addEventListener('mousedown', e => {
        if (toolbar.style.display === 'none') return;
        if (toolbar.contains(e.target) || picker.contains(e.target) ||
            casePanel.contains(e.target) || checkPanel.contains(e.target)) return;
        if (e.target.classList?.contains('field-input')) return;
        hideToolbar();
    });

    // ── QUICK-BUILD ───────────────────────────────────────────────────────────
    const QB_S1 = [
        { label: 'Action',        value: 'Action',        text: 'As an Action, ' },
        { label: 'Half Action',   value: 'Half Action',   text: 'As a Half Action, ' },
        { label: 'Off Action',    value: 'Off Action',    text: 'As an Off Action, ' },
        { label: 'Passive',       value: 'Passive',       text: 'Passively, ' },
        { label: 'Press On',      value: 'Press On',      text: 'As a Press On, ' },
        { label: 'Start of Turn', value: 'Start of turn', text: 'At the start of the turn, ' },
        { label: 'End of Turn',   value: 'End of turn',   text: 'At the end of the turn, ' },
        { label: 'Special',       value: 'Special',       text: 'As a Special action, ' },
    ];

    const QB_S2 = [
        'Attack', 'Move', 'Deal', 'Summon', 'Gain',
        'Push', 'Pull', 'Teleport', 'Heal', 'Create',
        'Apply', 'Target', 'Reduce', 'Increase',
    ];

    // Inject styles
    const qbStyle = document.createElement('style');
    qbStyle.textContent = `
        #forge-quickbuild {
            position: fixed; z-index: 498; display: none;
            flex-direction: column; gap: 6px;
            background: #16161f; border: 1px solid #3a3a50;
            border-radius: 6px; padding: 6px 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.55);
            max-width: 520px;
        }
        .qb-label {
            font-family: 'Share Tech Mono', monospace; font-size: 10px;
            color: #555; text-transform: uppercase; letter-spacing: 0.08em;
        }
        .qb-chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .qb-chip {
            background: #1e1e2e; border: 1px solid #3a3a50; color: #b0b0c8;
            font-family: 'Share Tech Mono', monospace; font-size: 11px;
            padding: 2px 10px; border-radius: 20px; cursor: pointer;
            white-space: nowrap; transition: background 0.1s, border-color 0.1s, color 0.1s;
        }
        .qb-chip:hover { background: #2a2a3a; border-color: #6a6a8a; color: #fff; }
        .qb-chip-verb { border-color: #1a3040; color: #7ecfff; }
        .qb-chip-verb:hover { background: #152030; border-color: #7ecfff; color: #aee8ff; }
    `;
    document.head.appendChild(qbStyle);

    const qbPanel = document.createElement('div');
    qbPanel.id = 'forge-quickbuild';
    qbPanel.innerHTML = `<div class="qb-label" id="qb-label"></div><div class="qb-chips" id="qb-chips"></div>`;
    document.body.appendChild(qbPanel);

    let qbTarget   = null;
    let qbStage    = 0;
    let qbSkipHide = false;   // set true during programmatic input dispatches

    function hideQB() { qbPanel.style.display = 'none'; qbTarget = null; qbStage = 0; }

    function positionQB() {
        if (!qbTarget) return;
        const r = qbTarget.getBoundingClientRect();
        qbPanel.style.left  = `${r.left}px`;
        qbPanel.style.top   = `${r.bottom + 4}px`;
        qbPanel.style.width = `${r.width}px`;
    }

    function setChip(btn, onClick) {
        btn.addEventListener('mousedown', e => { e.preventDefault(); onClick(); });
    }

    function renderQB() {
        const label = document.getElementById('qb-label');
        const chips = document.getElementById('qb-chips');

        if (qbStage === 1) {
            label.textContent = 'Economy…';
            chips.innerHTML = QB_S1.map(s =>
                `<button class="qb-chip" data-v="${s.value}" data-text="${s.text}">${s.label}</button>`
            ).join('');
            chips.querySelectorAll('.qb-chip').forEach(btn => setChip(btn, () => {
                const val  = btn.dataset.v;
                const text = btn.dataset.text;

                // Sync the nearest Action Type select
                const grid = qbTarget.closest('.extra-feature-body') || qbTarget.closest('.field-grid');
                if (grid) {
                    const sel = grid.querySelector('select');
                    if (sel) { sel.value = val; sel.dispatchEvent(new Event('change', { bubbles: true })); }
                }

                qbSkipHide = true;
                qbTarget.value = text;
                qbTarget.dispatchEvent(new Event('input',  { bubbles: true }));
                qbTarget.dispatchEvent(new Event('change', { bubbles: true }));
                qbTarget.focus();
                qbTarget.setSelectionRange(qbTarget.value.length, qbTarget.value.length);
                qbSkipHide = false;

                qbStage = 2;
                renderQB();
            }));

        } else if (qbStage === 2) {
            label.textContent = 'Opens with…';
            chips.innerHTML = QB_S2.map(v =>
                `<button class="qb-chip qb-chip-verb" data-v="${v}">${v}</button>`
            ).join('');
            chips.querySelectorAll('.qb-chip').forEach(btn => setChip(btn, () => {
                qbSkipHide = true;
                qbTarget.value += btn.dataset.v + ' ';
                qbTarget.dispatchEvent(new Event('input',  { bubbles: true }));
                qbTarget.dispatchEvent(new Event('change', { bubbles: true }));
                qbTarget.focus();
                qbTarget.setSelectionRange(qbTarget.value.length, qbTarget.value.length);
                qbSkipHide = false;
                hideQB();
            }));
        }
    }

    // Focus an empty quick-build field → show Stage 1
    document.addEventListener('focus', e => {
        const el = e.target;
        if (!el.matches('[data-quick-build="feature"]')) return;
        if (el.value.trim() !== '') return;
        qbTarget = el;
        qbStage  = 1;
        qbPanel.style.display = 'flex';
        renderQB();
        positionQB();
    }, true);

    // User types manually → hide
    document.addEventListener('input', e => {
        if (e.target === qbTarget && !qbSkipHide) hideQB();
    }, true);

    // Blur → hide unless focus returns to the same field
    document.addEventListener('blur', e => {
        if (e.target !== qbTarget) return;
        setTimeout(() => { if (document.activeElement !== qbTarget) hideQB(); }, 160);
    }, true);

})();
