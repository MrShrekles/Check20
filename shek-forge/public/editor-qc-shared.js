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

// ── SUMMON RULES ─────────────────────────────────────────────────────────────
// Anything that summons a creature has to answer two questions or it falls
// apart at the table: how long does it stick around, and if it sticks around
// forever, what happens when it dies? A permanent summon with no death rule
// is an infinite free ally, so the text has to say whether getting it back
// costs an action, a ritual, downtime, crafting, or finding a new one.
const QC_SUMMON_RX = /\b(summons?|summoned|summoning|conjures?|conjured|conjuring)\b/i;

// Any phrasing that pins down how long the summon lasts. Matches both real
// durations ("for 1 minute", "until the end of your next turn") and the
// open-ended ones ("permanent", "until dismissed").
const QC_DURATION_RX = new RegExp([
    /(?:for|lasts?|lasting|remains? for|persists? for)\s+(?:\d+|a|an|one|your)\s*(?:round|turn|minute|hour|day|week|month|year)s?\b/.source,
    /until\s+(?:the\s+)?(?:end|start|beginning)\s+of\b/.source,
    /until\s+(?:you\s+)?(?:dismiss|dispel)/.source,
    /until\s+(?:it\s+is\s+)?(?:dismissed|dispelled|destroyed|banished|slain|killed)\b/.source,
    /until\s+it\s+(?:dies|drops)\b/.source,
    /\b(?:instant|instantaneous|permanent(?:ly)?|indefinite(?:ly)?)\b/.source,
].join('|'), 'i');

const QC_PERMANENT_RX = new RegExp([
    /\bpermanent(?:ly)?\b/.source,
    /\bindefinite(?:ly)?\b/.source,
    /until\s+(?:it\s+is\s+)?(?:dismissed|destroyed|banished|slain|killed)\b/.source,
    /until\s+(?:you\s+)?dismiss/.source,
    /until\s+it\s+dies\b/.source,
    /\b(?:does\s+not|doesn'?t|never)\s+expires?\b/.source,
    /\bno\s+duration\b/.source,
].join('|'), 'i');

// Does the text say anything at all about the summon being killed/removed?
const QC_SUMMON_DEATH_RX = /\b(dies|die|death|dead|killed|slain|destroyed|banished|reduced to 0|drops? to 0|falls in combat)\b/i;

// Does it say how you get the summon back (or that you can't)?
const QC_SUMMON_RECOVERY_RX = new RegExp([
    /\bre-?summon\w*/.source,
    /\bre-?conjure\w*/.source,
    /\britual\b/.source,
    /\b(?:as|takes?|costs?|requires?|spend(?:ing)?)\s+(?:an?\s+)?(?:action|reaction|bonus action|turn|minute|hour|day)/.source,
    /\bdowntime\b/.source,
    /\b(?:craft|forge|build|construct|rebuild|repair)\w*\b/.source,
    /\b(?:find|locate|seek|tame|bond with|recruit)\s+(?:a\s+)?(?:new|another|replacement)/.source,
    /\b(?:new|another|replacement)\s+(?:familiar|companion|summon|creature|minion|servant|beast)/.source,
    /\b(?:long|short|full)\s+rest\b/.source,
    /\b(?:cannot|can'?t|may not)\s+be\s+(?:re-?summoned|replaced|restored|revived)/.source,
    /\b(?:lost|gone)\s+(?:forever|permanently)\b/.source,
    /\bpermanently\s+(?:lost|destroyed)\b/.source,
].join('|'), 'i');

// text: the prose being checked. duration: the entry's duration field value
// (pass null/undefined when the data shape has no such field - the check then
// relies on the prose alone).
function qcCheckSummon(text, duration) {
    if (!text || !QC_SUMMON_RX.test(text)) return [];
    const dur = String(duration ?? '').trim();
    const durInText = QC_DURATION_RX.test(text);

    if (!dur && !durInText) {
        return [{ code: 'summon_no_duration', label: 'Summon has no duration',
            detail: 'This summons a creature but never says how long it lasts. Set a duration, or state it in the text (for example "for 1 minute", "until the end of your next turn", or "Permanent").' }];
    }

    const permanent = QC_PERMANENT_RX.test(dur) || QC_PERMANENT_RX.test(text);
    if (!permanent) return [];

    if (!QC_SUMMON_DEATH_RX.test(text)) {
        return [{ code: 'summon_permanent_no_death_rule', label: 'Permanent summon with no death rule',
            detail: 'This summon is permanent but never says what happens when it dies. Add the rule: is it gone for good, or can you get it back?' }];
    }
    if (!QC_SUMMON_RECOVERY_RX.test(text)) {
        return [{ code: 'summon_no_recovery_cost', label: 'Permanent summon: no cost to replace it',
            detail: 'The text covers the summon dying but not what it takes to get another one. Say which it is: an action to resummon, a ritual, downtime, crafting a new body, finding or bonding with a new familiar, or that it is lost for good.' }];
    }
    return [];
}

// ── IGNORE LISTS (namespaced per editor) ────────────────────────────────────
// storageKey is optional and defaults to `qcShared_${ns}_v1`; editors that
// predate this shared module (class, species) pass their original literal
// key so existing users don't lose previously-ignored issues on upgrade.
const _qcIgnCaches = {};
function _qcStorageKey(ns, storageKey) { return storageKey || `qcShared_${ns}_v1`; }
function qcGetIgnored(ns, storageKey) {
    if (!_qcIgnCaches[ns]) {
        try { _qcIgnCaches[ns] = new Set(JSON.parse(localStorage.getItem(_qcStorageKey(ns, storageKey)) || '[]')); }
        catch (e) { _qcIgnCaches[ns] = new Set(); }
    }
    return _qcIgnCaches[ns];
}
function qcIgnore(ns, key, storageKey) {
    const s = qcGetIgnored(ns, storageKey);
    s.add(key);
    localStorage.setItem(_qcStorageKey(ns, storageKey), JSON.stringify([...s]));
    renderEditor();
    renderEntryList();
    updateStatus();
}
function qcUnignoreAll(ns, entryLabel, storageKey) {
    const s = qcGetIgnored(ns, storageKey);
    const pfx = `${entryLabel}::`;
    for (const k of [...s]) if (k.startsWith(pfx)) s.delete(k);
    localStorage.setItem(_qcStorageKey(ns, storageKey), JSON.stringify([...s]));
    renderEditor();
    renderEntryList();
    updateStatus();
}
function qcIgnoreAllForEntry(ns, keysJson, storageKey) {
    const keys = JSON.parse(keysJson);
    const s = qcGetIgnored(ns, storageKey);
    keys.forEach(k => s.add(k));
    localStorage.setItem(_qcStorageKey(ns, storageKey), JSON.stringify([...s]));
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
// fields: [{ label, get(entry) => string, required?: bool, duration?(entry) => string }]
// `duration` is optional - supply it when the data shape has a duration field
// next to the prose so the summon check can read it instead of guessing.
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

        for (const hit of qcCheckSummon(text, f.duration ? f.duration(entry) : null)) {
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
                        <button class="btn btn-ghost btn-qc-xs"
                            onclick="qcIgnore('${escAttr(ns)}','${escAttr(issue.key)}')">Ignore</button>
                    </div>
                </div>
            </div>`).join('')}</div>`;

    const badge = issues.length > 0
        ? `<span class="class-qc-cnt class-qc-cnt-warn">${issues.length}</span>`
        : `<span class="class-qc-cnt class-qc-cnt-ok">✓</span>`;

    const ignoreAllBtn = issues.length > 1
        ? `<button class="btn btn-ghost btn-qc-xs"
               onclick="event.preventDefault();qcIgnoreAllForEntry('${escAttr(ns)}','${escAttr(JSON.stringify(issues.map(i => i.key)))}')"
           >Ignore All (${issues.length})</button>`
        : '';

    return `<details class="forge-section forge-section-qc" ${issues.length > 0 ? 'open' : ''}>
        <summary class="section-header section-header-split forge-qc-summary">
            <span class="forge-qc-title">Quality Check ${badge}</span>
            <div style="display:flex;gap:4px;">
                ${ignoreAllBtn}
                <button class="btn btn-ghost btn-qc-xs"
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
