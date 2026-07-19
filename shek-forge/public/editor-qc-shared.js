// ── SHARED QUALITY CHECK HELPERS ────────────────────────────────────────────
// Reused by multiple editor-*.js modules so every file type gets the same
// AI-wording / grammar / broken-reference detection that editor-class.js
// pioneered, without duplicating the rule set in every editor.
// Ignore-lists are namespaced per editor type in localStorage so "Ignore"
// in one file type never hides an issue in another.

const QC_AI_WORDS = [
    'delve','tapestry','testament','seamlessly','vibrant',
    'embark','foster','pivotal','holistic','multifaceted',
    'leverage','utilize','game-changing','ever-evolving',
    'landscape','ecosystem','paradigm','synergy','notably',
    'it is worth noting',"it's worth noting",
    'in the realm of','navigate',
];

const QC_GRAMMAR_CHECKS = [
    { rx: /\b(\w+)\s+\1\b/i, code: 'repeat_word',  label: 'Repeated word',  detail: m => `"${m[0]}" — word repeated consecutively.` },
    { rx: /  +/,              code: 'double_space', label: 'Double space',   detail: () => 'Contains two or more consecutive spaces.' },
];

function qcRunGrammarChecks(text) {
    if (!text) return [];
    return QC_GRAMMAR_CHECKS
        .map(c => { const m = text.match(c.rx); return m ? { ...c, match: m } : null; })
        .filter(Boolean);
}

// Deliberately conservative - this system uses homebrew formulas like
// "[[1+PL]]" and "[[5 * PL]]" freely, so only flag unambiguous mistakes
// (an empty block, mismatched bracket counts, or "NxM" where "NdM" was
// almost certainly meant) rather than trying to validate full syntax.
function qcCheckDiceSyntax(text) {
    if (!text || !text.includes('[[')) return [];
    const issues = [];
    if (/\[\[\s*\]\]/.test(text)) {
        issues.push({ code: 'dice_empty', label: 'Empty dice expression', detail: 'Found "[[ ]]" with nothing inside.' });
    }
    const opens = (text.match(/\[\[/g) || []).length;
    const closes = (text.match(/\]\]/g) || []).length;
    if (opens !== closes) {
        issues.push({ code: 'dice_unbalanced', label: 'Unbalanced [[ ]] brackets',
            detail: `Found ${opens} "[[" but ${closes} "]]" - a dice expression may be missing its closing bracket.` });
    }
    for (const m of text.matchAll(/\[\[([^\[\]]*)\]\]/g)) {
        if (/\d\s*[xX]\s*\d/.test(m[1]) && !/\d\s*[dD]\s*\d/.test(m[1])) {
            issues.push({ code: 'dice_x_typo', label: `Possible typo in "[[${m[1]}]]"`,
                detail: `"${m[1]}" looks like dice notation but uses "x" instead of "d".` });
        }
    }
    return issues;
}

// ── IGNORE LISTS (namespaced per editor) ────────────────────────────────────
const _qcIgnCaches = {};
function qcGetIgnored(ns) {
    if (!_qcIgnCaches[ns]) {
        try { _qcIgnCaches[ns] = new Set(JSON.parse(localStorage.getItem(`qcShared_${ns}_v1`) || '[]')); }
        catch (e) { _qcIgnCaches[ns] = new Set(); }
    }
    return _qcIgnCaches[ns];
}
function qcIgnore(ns, key) {
    const s = qcGetIgnored(ns);
    s.add(key);
    localStorage.setItem(`qcShared_${ns}_v1`, JSON.stringify([...s]));
    renderEditor();
    renderEntryList();
    updateStatus();
}
function qcUnignoreAll(ns, entryLabel) {
    const s = qcGetIgnored(ns);
    const pfx = `${entryLabel}::`;
    for (const k of [...s]) if (k.startsWith(pfx)) s.delete(k);
    localStorage.setItem(`qcShared_${ns}_v1`, JSON.stringify([...s]));
    renderEditor();
    renderEntryList();
    updateStatus();
}
function qcIgnoreAllForEntry(ns, keysJson) {
    const keys = JSON.parse(keysJson);
    const s = qcGetIgnored(ns);
    keys.forEach(k => s.add(k));
    localStorage.setItem(`qcShared_${ns}_v1`, JSON.stringify([...s]));
    renderEditor();
    renderEntryList();
    updateStatus();
}

// ── MONSTER NAME CACHE (for [Bracket] cross-file reference checks) ─────────
// Loaded once per session from monsterbook.json regardless of which file is
// currently open, so a "[Goblin]" link typed while editing spells.json still
// resolves against the real bestiary.
let _qcMonsterNames = null;
let _qcMonsterNamesPromise = null;
function qcGetMonsterNames() {
    if (_qcMonsterNames) return Promise.resolve(_qcMonsterNames);
    if (_qcMonsterNamesPromise) return _qcMonsterNamesPromise;
    _qcMonsterNamesPromise = fetch('/api/file/monsterbook.json')
        .then(r => r.json())
        .then(json => {
            const data = Array.isArray(json.data) ? json.data : [];
            _qcMonsterNames = new Set(data.map(m => m.name).filter(Boolean));
            return _qcMonsterNames;
        })
        .catch(() => (_qcMonsterNames = new Set()));
    return _qcMonsterNamesPromise;
}
function qcGetMonsterNamesSync() { return _qcMonsterNames ? [..._qcMonsterNames].sort() : []; }
function qcInvalidateMonsterNames() { _qcMonsterNames = null; _qcMonsterNamesPromise = null; }
// Kick the fetch off immediately at load; re-render once it lands so any
// broken-link badges already on screen (or the monster picker) update.
qcGetMonsterNames().then(() => {
    if (typeof state !== 'undefined' && state.currentIndex >= 0) { renderEditor(); renderEntryList(); }
});

// ── GLOSSARY TERM CACHE (for cross-referencing condition/check names) ──────
let _qcGlossaryTerms = null;
let _qcGlossaryPromise = null;
function qcGetGlossaryTerms() {
    if (_qcGlossaryTerms) return Promise.resolve(_qcGlossaryTerms);
    if (_qcGlossaryPromise) return _qcGlossaryPromise;
    _qcGlossaryPromise = fetch('/api/file/glossary.json')
        .then(r => r.json())
        .then(json => {
            const data = Array.isArray(json.data) ? json.data : [];
            _qcGlossaryTerms = {
                conditions: new Set(data.filter(e => e.type === 'condition').map(e => e.term.toLowerCase())),
                checks: new Set(data.filter(e => e.type === 'check').map(e => e.term.toLowerCase())),
            };
            return _qcGlossaryTerms;
        })
        .catch(() => (_qcGlossaryTerms = { conditions: new Set(), checks: new Set() }));
    return _qcGlossaryPromise;
}
function qcGetGlossaryTermsSync() { return _qcGlossaryTerms || { conditions: new Set(), checks: new Set() }; }
qcGetGlossaryTerms().then(() => {
    if (typeof state !== 'undefined' && state.currentIndex >= 0) { renderEditor(); renderEntryList(); }
});

// ── PROSE ANALYZER ───────────────────────────────────────────────────────────
// fields: [{ label, get(entry) => string, required?: bool }]
// Returns [{ key, fieldLabel, code, label, detail }]
function qcAnalyzeProse(entry, ns, entryLabel, fields) {
    const ignored = qcGetIgnored(ns);
    const issues = [];
    const push = (fieldLabel, code, label, detail) => {
        const key = `${entryLabel}::${fieldLabel}::${code}`;
        if (!ignored.has(key)) issues.push({ key, fieldLabel, code, label, detail });
    };
    for (const f of fields) {
        const text = String(f.get(entry) ?? '');
        if (!text.trim()) {
            if (f.required) push(f.label, 'empty_required', `${f.label} is empty`, `"${f.label}" has no content.`);
            continue;
        }

        const aiHits = QC_AI_WORDS.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
        if (aiHits.length) {
            push(f.label, 'ai_words', 'AI-sounding language detected',
                `In "${f.label}": ${aiHits.map(h => `"${h}"`).join(', ')}. Rewrite without these words.`);
        }

        if (/[a-z,] - [a-z]/i.test(text)) {
            push(f.label, 'em_dash', 'Em dash substitute found (" - ")',
                `"${f.label}" uses " - " as a sentence connector. Rewrite without the dash.`);
        }

        for (const hit of qcRunGrammarChecks(text)) {
            push(f.label, `grammar_${hit.code}`, hit.label, `In "${f.label}": ${hit.detail(hit.match)}`);
        }

        for (const hit of qcCheckDiceSyntax(text)) {
            push(f.label, hit.code, hit.label, hit.detail);
        }

        if (_qcMonsterNames) {
            // Skip [[dice/formula]] notation (e.g. "[[1d6]]", "[[1+PL]]") - only a
            // single bracket pair, not one nested inside another, is a monster link.
            const brackets = [...text.matchAll(/(?<!\[)\[([^\[\]]+)\](?!\])/g)].map(m => m[1]);
            for (const name of brackets) {
                if (!_qcMonsterNames.has(name)) {
                    push(f.label, 'broken_link', `Broken monster link "[${name}]"`,
                        `"${f.label}" links to "[${name}]" but no monster with that name was found in monsterbook.json.`);
                }
            }
        }
    }
    return issues;
}

// ── PANEL RENDERER (matches the class/species Quality Check look) ──────────
function qcRenderPanel(issues, ns, entryLabel) {
    const body = issues.length === 0
        ? `<div class="class-qc-empty">✓ No issues detected.</div>`
        : `<div class="class-qc-list">${issues.map(issue => `
            <div class="class-qc-issue" style="border-left:3px solid #cc8833;">
                <div class="class-qc-card-hd">
                    <span class="class-qc-badge">${escHtml(issue.fieldLabel)}</span>
                </div>
                <div class="class-qc-card-bd">
                    <div class="class-qc-type" style="color:#cc8833;">${escHtml(issue.label)}</div>
                    <div class="class-qc-detail">${escHtml(issue.detail)}</div>
                    <div class="class-qc-actions">
                        <button class="btn btn-ghost" style="font-size:9px;padding:2px 8px;"
                            onclick="qcIgnore('${escAttr(ns)}','${escAttr(issue.key)}')">Ignore</button>
                    </div>
                </div>
            </div>`).join('')}</div>`;

    const badge = issues.length > 0
        ? `<span class="class-qc-cnt class-qc-cnt-warn">${issues.length}</span>`
        : `<span class="class-qc-cnt class-qc-cnt-ok">✓</span>`;

    const ignoreAllBtn = issues.length > 1
        ? `<button class="btn btn-ghost" style="font-size:9px;padding:1px 8px;"
               onclick="event.preventDefault();qcIgnoreAllForEntry('${escAttr(ns)}','${escAttr(JSON.stringify(issues.map(i => i.key)))}')"
           >Ignore All (${issues.length})</button>`
        : '';

    return `<details class="forge-section forge-section-qc" ${issues.length > 0 ? 'open' : ''}>
        <summary class="section-header section-header-split forge-qc-summary">
            <span class="forge-qc-title">Quality Check ${badge}</span>
            <div style="display:flex;gap:4px;">
                ${ignoreAllBtn}
                <button class="btn btn-ghost" style="font-size:9px;padding:1px 8px;"
                    onclick="event.preventDefault();qcUnignoreAll('${escAttr(ns)}','${escAttr(entryLabel)}')">Reset Ignored</button>
            </div>
        </summary>
        ${body}
    </details>`;
}

// ── TABLE-STYLE EDITORS (quest/traps/medicine/worldbuilding/enchanted/hexgen) ──
// These editors show every entry as a chip/row rather than a selectable
// per-entry form, so there's no per-entry panel to render - just surface a
// count of entries that were added but never filled in, via the file-list badge.
function qcFindBlankEntries(data, excludeKeys) {
    const ex = new Set(excludeKeys || ['type', 'category', '_group', '_subgroup']);
    const indices = [];
    data.forEach((e, i) => {
        // Only judge by string fields - numeric-only entries (e.g. { pl, weight })
        // can't be usefully judged "blank" this way, so leave them alone.
        const strVals = Object.entries(e).filter(([k, v]) => !ex.has(k) && typeof v === 'string').map(([, v]) => v);
        if (strVals.length > 0 && strVals.every(v => !v.trim())) indices.push(i);
    });
    return indices;
}
function qcCountBlankEntries(data, excludeKeys) { return qcFindBlankEntries(data, excludeKeys).length; }
