// ── SPECIES EDITOR ────────────────────────────────────────────────────────────

const SPD = {
    fetAction:   ['', 'Passive', 'Action', 'Half-Action', 'Off-Action', 'Special', 'Reaction', 'Free'],
    fetCheck:    ['', 'Agility', 'Crafting', 'Influence', 'Intellect', 'Medicine', 'Observation', 'Spirit', 'Stealth', 'Strength', 'Survival'],
    fetRange:    ['', 'Self', 'Touch', 'Reach', 'Short', 'Medium', 'Long'],
    fetDuration: ['', 'Instant', 'Until end of their next turn', 'Until end of your next turn', '1 minute', '1 hour', 'Permanent'],
    fetDamage:   ['', 'Impact', 'Piercing', 'Slashing', 'Acid', 'Eclipse', 'Fire', 'Fluid', 'Ice', 'Lightning', 'Solar', 'Thunder', 'Toxic', 'Nature', 'Psychic', 'Vozian', 'Healing'],
    diet:        ['', 'Omnivore', 'Carnivore', 'Herbivore'],
    rarity:      ['', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    origin:      ['', 'arcane', 'basic', 'celestial', 'chaos', 'chrono', 'crystal', 'dragon', 'elemental', 'fey', 'life', 'nature', 'tech', 'vozian'],
};

const SP_RARITY_COLOR = { Common: '#888', Uncommon: '#55aa55', Rare: '#5588cc', Epic: '#aa55cc', Legendary: '#cc8822' };

registerEditor('species', {

    groupKey: () => 'lineage',

    entryTitle: (e) => e.name || '(unnamed)',

    entryRow: (entry, showGroup) => {
        const issueCount = spQCAnalyze(entry).length;
        return {
            name: entry.name || '(unnamed)',
            meta: [entry.option, entry.origin].filter(Boolean).join(' · '),
            badges: [
                showGroup && entry.lineage ? { label: entry.lineage, color: '#7a7a7a' } : null,
                entry.rarity ? { label: entry.rarity, color: SP_RARITY_COLOR[entry.rarity] || '#888' } : null,
                issueCount > 0 ? { label: `⚠ ${issueCount}`, color: '#cc7733' } : null,
            ].filter(Boolean),
        };
    },

    newEntry: (group) => ({
        lineage:          group || '',
        option:           '',
        name:             '',
        description:      { physical: '', environment: '', culture: '', lore: '' },
        size:             '5-7',
        lifespan:         80,
        language:         'Imperial',
        diet:             'Omnivore',
        rarity:           'Common',
        region:           '',
        origin:           '',
        feature_name:     '',
        feature_effect:   '',
        fetAction:        '',
        fetCondition:     '',
        'sub-fet-name':   '',
        'sub-fet-effect': '',
    }),

    render: (entry, idx) => {
        const fa  = (k) => escAttr(String(entry[k] ?? ''));
        const fh  = (k) => escHtml(String(entry[k] ?? ''));
        const sel = buildSelect;

        const lineages  = [...new Set(state.data.map(e => e.lineage).filter(Boolean))].sort();
        const options   = [...new Set(state.data.map(e => e.option).filter(Boolean))].sort();
        const languages = [...new Set(state.data.map(e => e.language).filter(Boolean))].sort();
        const regions   = [...new Set(state.data.map(e => e.region).filter(Boolean))].sort();

        return `
        <div class="forge-section">
            <div class="section-header">Name</div>
            <div class="section-body">
                <input class="field-input" style="font-size:13px;font-family:'Cinzel',serif;letter-spacing:0.04em;"
                    type="text" value="${fa('name')}"
                    onchange="updateField(${idx},'name',this.value)" oninput="markUnsaved()">
            </div>
        </div>

        <div class="section-pair">
            <div class="forge-section">
                <div class="section-header">Lineage</div>
                <div class="section-body">
                    <div class="field-grid">
                        <datalist id="sp-lineage-opts-${idx}">${lineages.map(l => `<option value="${escAttr(l)}">`).join('')}</datalist>
                        <div class="field-wrap">
                            <label class="field-label">Lineage</label>
                            <input class="field-input" type="text" list="sp-lineage-opts-${idx}"
                                value="${fa('lineage')}"
                                onchange="updateField(${idx},'lineage',this.value);refreshGroups()" oninput="markUnsaved()">
                        </div>
                        <datalist id="sp-option-opts-${idx}">${options.map(o => `<option value="${escAttr(o)}">`).join('')}</datalist>
                        <div class="field-wrap">
                            <label class="field-label">Option</label>
                            <input class="field-input" type="text" list="sp-option-opts-${idx}"
                                value="${fa('option')}"
                                onchange="updateField(${idx},'option',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Rarity</label>
                            <select class="field-input" onchange="updateField(${idx},'rarity',this.value)">
                                ${sel(SPD.rarity, entry.rarity || '')}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Origin</label>
                            <select class="field-input" onchange="updateField(${idx},'origin',this.value)">
                                ${sel(SPD.origin, entry.origin || '')}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div class="forge-section">
                <div class="section-header">Biology</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Size</label>
                            <input class="field-input mono" type="text" placeholder="e.g. 5-7"
                                value="${fa('size')}"
                                onchange="updateField(${idx},'size',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Lifespan (yrs)</label>
                            <input class="field-input mono" type="number" min="1"
                                value="${entry.lifespan ?? ''}"
                                onchange="updateField(${idx},'lifespan',parseFloat(this.value)||0)" oninput="markUnsaved()">
                        </div>
                        <datalist id="sp-diet-opts-${idx}">${SPD.diet.filter(Boolean).map(d => `<option value="${escAttr(d)}">`).join('')}</datalist>
                        <div class="field-wrap">
                            <label class="field-label">Diet</label>
                            <input class="field-input" type="text" list="sp-diet-opts-${idx}"
                                value="${fa('diet')}"
                                onchange="updateField(${idx},'diet',this.value)" oninput="markUnsaved()">
                        </div>
                        <datalist id="sp-lang-opts-${idx}">${languages.map(l => `<option value="${escAttr(l)}">`).join('')}</datalist>
                        <div class="field-wrap full">
                            <label class="field-label">Language</label>
                            <input class="field-input" type="text" list="sp-lang-opts-${idx}"
                                value="${fa('language')}"
                                onchange="updateField(${idx},'language',this.value)" oninput="markUnsaved()">
                        </div>
                        <datalist id="sp-region-opts-${idx}">${regions.map(r => `<option value="${escAttr(r)}">`).join('')}</datalist>
                        <div class="field-wrap full">
                            <label class="field-label">Region</label>
                            <input class="field-input" type="text" list="sp-region-opts-${idx}"
                                value="${fa('region')}"
                                onchange="updateField(${idx},'region',this.value)" oninput="markUnsaved()">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
            <div class="forge-section" style="margin-bottom:0">
                <div class="section-header section-header-split">Physical <button class="sp-copy-btn" onclick="spCopy('sp-phys-${idx}',this)">⎘ Copy</button></div>
                <div class="section-body">
                    <textarea id="sp-phys-${idx}" class="field-input" rows="8" spellcheck="true"
                        onchange="updateField(${idx},'description.physical',this.value)"
                        oninput="markUnsaved()">${escHtml(String(entry.description?.physical ?? ''))}</textarea>
                </div>
            </div>
            <div class="forge-section" style="margin-bottom:0">
                <div class="section-header section-header-split">Environment <button class="sp-copy-btn" onclick="spCopy('sp-env-${idx}',this)">⎘ Copy</button></div>
                <div class="section-body">
                    <textarea id="sp-env-${idx}" class="field-input" rows="8" spellcheck="true"
                        onchange="updateField(${idx},'description.environment',this.value)"
                        oninput="markUnsaved()">${escHtml(String(entry.description?.environment ?? ''))}</textarea>
                </div>
            </div>
            <div class="forge-section" style="margin-bottom:0">
                <div class="section-header section-header-split">Culture <button class="sp-copy-btn" onclick="spCopy('sp-cult-${idx}',this)">⎘ Copy</button></div>
                <div class="section-body">
                    <textarea id="sp-cult-${idx}" class="field-input" rows="8" spellcheck="true"
                        onchange="updateField(${idx},'description.culture',this.value)"
                        oninput="markUnsaved()">${escHtml(String(entry.description?.culture ?? ''))}</textarea>
                </div>
            </div>
            <div class="forge-section" style="margin-bottom:0">
                <div class="section-header section-header-split">Lore <button class="sp-copy-btn" onclick="spCopy('sp-lore-${idx}',this)">⎘ Copy</button></div>
                <div class="section-body">
                    <textarea id="sp-lore-${idx}" class="field-input" rows="8" spellcheck="true"
                        onchange="updateField(${idx},'description.lore',this.value)"
                        oninput="markUnsaved()">${escHtml(String(entry.description?.lore ?? ''))}</textarea>
                </div>
            </div>
        </div>

        <div class="section-pair">
            <div class="forge-section">
                <div class="section-header">Main Feature</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap">
                            <label class="field-label">Feature Name</label>
                            <input class="field-input" type="text" value="${fa('feature_name')}"
                                onchange="updateField(${idx},'feature_name',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Action Type</label>
                            <select class="field-input" onchange="updateField(${idx},'fetAction',this.value)">
                                ${sel(SPD.fetAction, entry.fetAction || '')}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Check</label>
                            <select class="field-input" onchange="updateField(${idx},'fetCheck',this.value)">
                                ${sel(SPD.fetCheck, entry.fetCheck || '')}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Range</label>
                            <select class="field-input" onchange="updateField(${idx},'fetRange',this.value)">
                                ${sel(SPD.fetRange, entry.fetRange || '')}
                            </select>
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Damage</label>
                            <input class="field-input mono" type="text" placeholder="e.g. 1d6"
                                value="${fa('fetDamage')}"
                                onchange="updateField(${idx},'fetDamage',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap">
                            <label class="field-label">Damage Type</label>
                            <select class="field-input" onchange="updateField(${idx},'fetDamagetype',this.value)">
                                ${sel(SPD.fetDamage, entry.fetDamagetype || '')}
                            </select>
                        </div>
                        <div class="field-wrap full">
                            <label class="field-label">Duration</label>
                            <select class="field-input" onchange="updateField(${idx},'fetDuration',this.value)">
                                ${sel(SPD.fetDuration, entry.fetDuration || '')}
                            </select>
                        </div>
                        <div class="field-wrap full">
                            <label class="field-label">Condition</label>
                            <input class="field-input" type="text" placeholder="e.g. Prone, Stunned"
                                value="${fa('fetCondition')}"
                                onchange="updateField(${idx},'fetCondition',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap full">
                            <label class="field-label">Effect</label>
                            <textarea class="field-input" rows="4"
                                onchange="updateField(${idx},'feature_effect',this.value)"
                                oninput="markUnsaved()">${fh('feature_effect')}</textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div class="forge-section">
                <div class="section-header">Sub-Feature</div>
                <div class="section-body">
                    <div class="field-grid">
                        <div class="field-wrap full">
                            <label class="field-label">Sub-Feature Name</label>
                            <input class="field-input" type="text" value="${escAttr(entry['sub-fet-name'] || '')}"
                                onchange="updateField(${idx},'sub-fet-name',this.value)" oninput="markUnsaved()">
                        </div>
                        <div class="field-wrap full">
                            <label class="field-label">Effect</label>
                            <textarea class="field-input" rows="4"
                                onchange="updateField(${idx},'sub-fet-effect',this.value)"
                                oninput="markUnsaved()">${escHtml(entry['sub-fet-effect'] || '')}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        ${renderSpeciesQualityCheck(entry, idx)}`;
    },

});

// ── SPECIES QUALITY CHECKER ───────────────────────────────────────────────────

let _spQCIssues   = [];
let _spQCIgnCache = null;

function _spQCGetIgnored() {
    if (!_spQCIgnCache) {
        try { _spQCIgnCache = new Set(JSON.parse(localStorage.getItem('speciesQC_v1') || '[]')); }
        catch(e) { _spQCIgnCache = new Set(); }
    }
    return _spQCIgnCache;
}

function spQCIgnore(key) {
    _spQCIgnCache = null;
    const s = _spQCGetIgnored();
    s.add(key);
    localStorage.setItem('speciesQC_v1', JSON.stringify([...s]));
    renderEditor();
    renderEntryList();
}

function spQCUnignoreAll(entryName) {
    _spQCIgnCache = null;
    const s = _spQCGetIgnored();
    const pfx = `${entryName}::`;
    for (const k of [...s]) { if (k.startsWith(pfx)) s.delete(k); }
    localStorage.setItem('speciesQC_v1', JSON.stringify([...s]));
    renderEditor();
    renderEntryList();
}

function spQCApply(entryIdx, issueKey) {
    const issue = _spQCIssues.find(i => i.key === issueKey);
    if (!issue?.fix) return;
    updateField(entryIdx, issue.fix.path, issue.fix.value);
    spQCIgnore(issueKey);
}

const SP_QC_CONDITIONS = [
    'Bleeding','Broken','Concussion','Coughing','Dislocation','Slowed',
    'Pinned','Prone','Blind','Charmed','Confused','Deaf','Fear',
    'Injured','Stunned','Exhaustion','Invisible','Intangible','Constrained','Deafened','Death',
];

function spQCAnalyze(entry) {
    const ignored  = _spQCGetIgnored();
    const issues   = [];
    const desc     = entry.feature_effect  || '';
    const subDesc  = entry['sub-fet-effect'] || '';
    const subName  = entry['sub-fet-name']   || '';
    const featName = entry.feature_name      || '';

    const push = (scope, code, label, detail, fix = null) => {
        const key = `${entry.name}::${scope}::${code}`;
        if (!ignored.has(key)) issues.push({ key, scope, code, label, detail, fix });
    };

    // ── Main feature checks ──────────────────────────────────────────────────
    if (featName) {
        // Action type missing
        if (!entry.fetAction) {
            push('main', 'no_action', 'Feature has no action type',
                `"${featName}" has no action type set.`, null);
        }

        // Effect text missing
        if (!desc.trim()) {
            push('main', 'no_effect', 'Feature has no effect text',
                `"${featName}" is named but the effect field is empty.`, null);
        }

        if (desc) {
            // Condition in effect but fetCondition empty
            if (!entry.fetCondition) {
                const conds = SP_QC_CONDITIONS.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(desc));
                if (conds.length) {
                    push('main', 'condition_in_desc', 'Condition mentioned in effect text',
                        `Detected: ${conds.join(', ')} — species has no condition field; verify intent.`,
                        { path: 'fetCondition', value: conds.join(', '), label: `Apply: ${conds.join(', ')}` }
                    );
                }
            }

            // Check mentioned but fetCheck empty
            if (!entry.fetCheck) {
                const validChecks = SPD.fetCheck.filter(Boolean);
                const chkRx = new RegExp(`\\b(${validChecks.join('|')}) check\\b`, 'i');
                const chkM  = desc.match(chkRx);
                if (chkM) {
                    const matched = validChecks.find(c => c.toLowerCase() === chkM[1].toLowerCase());
                    push('main', 'no_check', 'Check in effect text, field empty',
                        `Detected "${chkM[1]} check".`,
                        matched ? { path: 'fetCheck', value: matched, label: `Add ${matched}` } : null
                    );
                }
            }

            // Damage dice in description but fetDamage empty
            if (!entry.fetDamage) {
                const diceM = desc.match(/\[?\[?(\d+d\d+)\]?\]?/);
                if (diceM) {
                    push('main', 'dice_in_desc', 'Damage dice in effect, field empty',
                        `Detected: "${diceM[1]}"`,
                        { path: 'fetDamage', value: diceM[1], label: 'Apply' }
                    );
                }
            }
        }

        // Damage / type mismatch
        const hasDmg  = entry.fetDamage    !== '' && entry.fetDamage    != null;
        const hasType = entry.fetDamagetype !== '' && entry.fetDamagetype != null;
        if (hasDmg && !hasType) {
            const typeList = SPD.fetDamage.filter(Boolean);
            const typeRx   = new RegExp(`\\b(${typeList.join('|')})\\s+damage\\b`, 'i');
            const typeM    = desc.match(typeRx);
            const detected = typeM ? typeList.find(t => t.toLowerCase() === typeM[1].toLowerCase()) : null;
            push('main', 'damage_no_type', 'Damage value has no damage type',
                `Damage is "${entry.fetDamage}" but Damage Type is empty.${detected ? ` Detected: ${detected}` : ''}`,
                detected ? { path: 'fetDamagetype', value: detected, label: `Apply ${detected}` } : null
            );
        }
        if (hasType && !hasDmg) {
            push('main', 'type_no_damage', 'Damage type set but no damage value',
                `Damage Type is "${entry.fetDamagetype}" but Damage field is empty.`, null);
        }
    }

    // ── Sub-feature checks ───────────────────────────────────────────────────
    if (subName && !subDesc.trim()) {
        push('sub', 'sub_no_effect', 'Sub-feature has no effect text',
            `"${subName}" is named but the effect field is empty.`, null);
    }
    if (subDesc && !subName.trim()) {
        push('sub', 'sub_no_name', 'Sub-feature effect has no name',
            'Sub-feature has effect text but no name.', null);
    }

    return issues;
}

const SP_QC_TYPE_COLOR = {
    no_action:        '#cc5544',
    no_effect:        '#cc5544',
    condition_in_desc:'#cc8833',
    no_check:         '#cc8833',
    damage_no_type:   '#cc5544',
    type_no_damage:   '#cc5544',
    dice_in_desc:     '#7788bb',
    sub_no_effect:    '#7788bb',
    sub_no_name:      '#7788bb',
};

function renderSpeciesQualityCheck(entry, idx) {
    const issues = spQCAnalyze(entry);
    _spQCIssues = issues;

    const body = issues.length === 0
        ? `<div class="class-qc-empty">✓ No issues detected.</div>`
        : `<div class="class-qc-list">${issues.map(issue => {
            const scopeLbl  = issue.scope === 'sub' ? 'SUB' : 'MAIN';
            const typeColor = SP_QC_TYPE_COLOR[issue.code] || '#888';
            const fixBtn = issue.fix
                ? `<button class="btn btn-green" style="font-size:9px;padding:2px 8px;"
                       onclick="spQCApply(${idx},'${escAttr(issue.key)}')"
                   >${escHtml(issue.fix.label)}</button>`
                : '';
            const ignBtn = `<button class="btn btn-ghost" style="font-size:9px;padding:2px 8px;"
                    onclick="spQCIgnore('${escAttr(issue.key)}')"
                >Ignore</button>`;
            const featLabel = issue.scope === 'sub'
                ? escHtml(entry['sub-fet-name'] || '(sub-feature)')
                : escHtml(entry.feature_name   || '(main feature)');
            return `<div class="class-qc-issue" style="border-left:3px solid ${typeColor};">
                <div class="class-qc-card-hd">
                    <span class="class-qc-badge">${scopeLbl}</span>
                    <span class="class-qc-name">${featLabel}</span>
                </div>
                <div class="class-qc-card-bd">
                    <div class="class-qc-type" style="color:${typeColor};">${escHtml(issue.label)}</div>
                    <div class="class-qc-detail">${escHtml(issue.detail)}</div>
                    <div class="class-qc-actions">${fixBtn}${ignBtn}</div>
                </div>
            </div>`;
        }).join('')}</div>`;

    const badge = issues.length > 0
        ? `<span class="class-qc-cnt class-qc-cnt-warn">${issues.length}</span>`
        : `<span class="class-qc-cnt class-qc-cnt-ok">✓</span>`;

    return `<div class="forge-section">
        <div class="section-header section-header-split">
            <span>Quality Check ${badge}</span>
            <button class="btn btn-ghost" style="font-size:9px;padding:1px 8px;"
                onclick="spQCUnignoreAll('${escAttr(entry.name)}')">Reset Ignored</button>
        </div>
        ${body}
    </div>`;
}

// ── SPECIES COPY HELPER ───────────────────────────────────────────────────────
(function injectCopyBtnStyle() {
    const s = document.createElement('style');
    s.textContent = `
        .sp-copy-btn {
            background: none; border: 1px solid #3a3520; color: #7a6030;
            font-family: 'Share Tech Mono', monospace; font-size: 8px;
            letter-spacing: .08em; padding: 1px 6px; border-radius: 2px;
            cursor: pointer; transition: color .15s, border-color .15s;
            float: right; margin-top: -1px;
        }
        .sp-copy-btn:hover { color: #e0aa44; border-color: #7a5518; }
    `;
    document.head.appendChild(s);
})();

function spCopy(taId, btn) {
    const ta = document.getElementById(taId);
    if (!ta || !ta.value.trim()) return;
    navigator.clipboard.writeText(ta.value).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied';
        setTimeout(() => btn.textContent = orig, 1500);
    });
}


