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

    entryRow: (entry, showGroup) => ({
        name: entry.name || '(unnamed)',
        meta: [entry.option, entry.origin].filter(Boolean).join(' · '),
        badges: [
            showGroup && entry.lineage ? { label: entry.lineage, color: '#7a7a7a' } : null,
            entry.rarity ? { label: entry.rarity, color: SP_RARITY_COLOR[entry.rarity] || '#888' } : null,
        ].filter(Boolean),
    }),

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
        </div>`;
    },

});

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


