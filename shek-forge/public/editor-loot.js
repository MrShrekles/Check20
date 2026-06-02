// ── Loot Editor ───────────────────────────────────────────────────────────────
// loot.json is now a config-only file: just tiers with pool weights and rarities.
// Items are drawn at runtime from items.json, weapons.json, armor.json,
// enchanted.json, and medicine.json — no static lists here.

const LOOT_POOLS = ['item', 'medicine', 'weapon', 'armor', 'enchanted'];
const LOOT_POOL_CFG = {
    item:      { icon: '🗡', label: 'Item',      color: '#8899aa', desc: 'from items.json'      },
    medicine:  { icon: '⚗', label: 'Medicine',  color: '#44bb88', desc: 'generated procedurally' },
    weapon:    { icon: '⚔', label: 'Weapon',    color: '#cc5544', desc: 'from weapons.json'    },
    armor:     { icon: '🛡', label: 'Armor',     color: '#aa7744', desc: 'from armor.json'      },
    enchanted: { icon: '✧', label: 'Enchanted', color: '#aa77cc', desc: 'from enchanted.json + gen' },
};

const RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'mythic'];

function escL(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function lootTiers()       { return state.data.filter(e => e._group === 'tiers'); }
function lootTierIndices() { return state.data.map((e,i) => e._group === 'tiers' ? i : -1).filter(i => i >= 0); }

// ── Render ────────────────────────────────────────────────────────────────────

function renderLootEditor() {
    const tiers   = lootTiers();
    const tierIdx = lootTierIndices();

    const tiersHtml = tiers.map((t, ti) => {
        const si = tierIdx[ti];

        // Pool weight summary
        const poolCounts = {};
        LOOT_POOLS.forEach(p => { poolCounts[p] = 0; });
        (t.pools || []).forEach(p => { if (poolCounts[p] !== undefined) poolCounts[p]++; });
        const total = (t.pools || []).length || 1;

        const poolBadges = LOOT_POOLS.filter(p => poolCounts[p] > 0).map(p => {
            const pct = Math.round((poolCounts[p] / total) * 100);
            const cfg = LOOT_POOL_CFG[p];
            return `<span class="loot-pool-badge" style="background:${cfg.color}22;color:${cfg.color};border:1px solid ${cfg.color}44">
                ${cfg.icon} ${p} ×${poolCounts[p]} <span style="opacity:.55">(${pct}%)</span>
                <button class="loot-pool-remove" title="Remove one ${p}" data-si="${si}" data-pool="${p}">−</button>
            </span>`;
        }).join('');

        const addBtns = LOOT_POOLS.map(p => {
            const cfg = LOOT_POOL_CFG[p];
            return `<button class="loot-pool-add btn btn-sm" data-si="${si}" data-pool="${p}" style="color:${cfg.color}" title="${cfg.desc}">+${p}</button>`;
        }).join('');

        // Rarities editor
        const currentRarities = t.rarities || [];
        const rarityChips = RARITY_OPTIONS.map(r => {
            const on = currentRarities.includes(r);
            return `<button class="loot-rarity-btn${on ? ' is-on' : ''}" data-si="${si}" data-rarity="${r}">${r}</button>`;
        }).join('');

        return `<div class="loot-tier-card" data-si="${si}">
            <div class="loot-tier-head">
                <div class="loot-tier-label-wrap">
                    <label class="loot-mini-label">Label</label>
                    <input class="field-input loot-field" data-si="${si}" data-field="label" value="${escL(t.label || '')}" />
                </div>
                <div class="loot-tier-range">
                    <label class="loot-mini-label">PL Range</label>
                    <div class="loot-inline">
                        <input class="field-input loot-num" type="number" min="1" data-si="${si}" data-field="min" value="${escL(t.min ?? 1)}" />
                        <span class="loot-sep">–</span>
                        <input class="field-input loot-num" type="number" min="1" data-si="${si}" data-field="max" value="${escL(t.max ?? 99)}" />
                    </div>
                </div>
                <div class="loot-tier-rolls">
                    <label class="loot-mini-label">Rolls</label>
                    <input class="field-input loot-num" type="number" min="0" data-si="${si}" data-field="rolls" value="${escL(t.rolls ?? 1)}" />
                </div>
                <div class="loot-tier-bonus">
                    <label class="loot-mini-label">Bonus roll chance</label>
                    <input class="field-input loot-num" type="number" min="0" max="1" step="0.05" data-si="${si}" data-field="bonus" value="${escL(t.bonus ?? 0)}" />
                </div>
                <div class="loot-tier-gold">
                    <label class="loot-mini-label">Gold per PL (min–max)</label>
                    <div class="loot-inline">
                        <input class="field-input loot-num" type="number" min="0" data-si="${si}" data-field="goldMin" value="${escL(t.goldMin ?? 1)}" />
                        <span class="loot-sep">–</span>
                        <input class="field-input loot-num" type="number" min="0" data-si="${si}" data-field="goldMax" value="${escL(t.goldMax ?? 10)}" />
                        <span class="loot-sep" style="font-size:10px;opacity:.6">× PL</span>
                    </div>
                </div>
                <button class="te-remove loot-tier-del" data-si="${si}" title="Delete tier">✕</button>
            </div>

            <div class="loot-tier-section-label">Pool weights <span style="opacity:.5;font-size:10px">(weapons &amp; armor filtered by Rarities below)</span></div>
            <div class="loot-tier-pools">
                <div class="loot-pools-row">${poolBadges || '<span style="opacity:.4;font-size:11px">No pools set</span>'}</div>
                <div class="loot-add-pools">${addBtns}</div>
            </div>

            <div class="loot-tier-section-label">Rarities <span style="opacity:.5;font-size:10px">(applies to weapons &amp; armor)</span></div>
            <div class="loot-rarities">${rarityChips}</div>
        </div>`;
    }).join('');

    const legend = LOOT_POOLS.map(p => {
        const cfg = LOOT_POOL_CFG[p];
        return `<span class="loot-legend-item"><span style="color:${cfg.color}">${cfg.icon} ${cfg.label}</span> <span style="opacity:.45;font-size:10px">— ${cfg.desc}</span></span>`;
    }).join('');

    return `<div class="loot-editor">
        <div class="loot-source-legend">${legend}</div>
        <div class="forge-section">
            <div class="section-header">
                <span class="section-title">⚡ Tiers</span>
                <button class="btn btn-sm btn-primary" id="loot-add-tier">+ Add Tier</button>
            </div>
            <div class="loot-tiers">${tiersHtml || '<p class="muted" style="padding:8px">No tiers defined.</p>'}</div>
        </div>
    </div>`;
}

// ── After-render wiring ───────────────────────────────────────────────────────

function lootAfterRender() {
    const fe = document.getElementById('fieldEditor');
    if (!fe) return;

    // Numeric & text tier fields
    fe.querySelectorAll('.loot-field, .loot-num').forEach(inp => {
        inp.addEventListener('change', () => {
            const si  = parseInt(inp.dataset.si, 10);
            const val = inp.type === 'number' ? Number(inp.value) : inp.value.trim();
            updateField(si, inp.dataset.field, val);
        });
    });

    // Rarity toggles
    fe.querySelectorAll('.loot-rarity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const si  = parseInt(btn.dataset.si, 10);
            const r   = btn.dataset.rarity;
            const cur = [...(state.data[si].rarities || [])];
            const idx = cur.indexOf(r);
            if (idx === -1) cur.push(r); else cur.splice(idx, 1);
            updateField(si, 'rarities', cur);
            btn.classList.toggle('is-on', !btn.classList.contains('is-on'));
        });
    });

    // Pool weight add
    fe.querySelectorAll('.loot-pool-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const si  = parseInt(btn.dataset.si, 10);
            const cur = [...(state.data[si].pools || [])];
            cur.push(btn.dataset.pool);
            updateField(si, 'pools', cur);
            renderEditor();
        });
    });

    // Pool weight remove
    fe.querySelectorAll('.loot-pool-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const si  = parseInt(btn.dataset.si, 10);
            const cur = [...(state.data[si].pools || [])];
            const idx = cur.lastIndexOf(btn.dataset.pool);
            if (idx !== -1) cur.splice(idx, 1);
            updateField(si, 'pools', cur);
            renderEditor();
        });
    });

    // Delete tier
    fe.querySelectorAll('.loot-tier-del').forEach(btn => {
        btn.addEventListener('click', async () => {
            const si = parseInt(btn.dataset.si, 10);
            const ok = await confirm2('Delete this tier?', 'Delete', 'btn-danger');
            if (!ok) return;
            state.data.splice(si, 1);
            markUnsaved();
            renderEntryList();
            renderEditor();
        });
    });

    // Add tier
    fe.querySelector('#loot-add-tier')?.addEventListener('click', () => {
        const tiers    = lootTiers();
        const lastMax  = tiers.length ? (tiers[tiers.length - 1].max ?? 1) : 0;
        const firstIdx = lootTierIndices()[0] ?? 0;
        state.data.splice(firstIdx, 0, {
            _group: 'tiers', label: 'New Tier',
            min: lastMax + 1, max: lastMax + 4,
            rolls: 1, bonus: 0.3, goldMin: 1, goldMax: 5,
            rarities: ['common'],
            pools: ['item', 'item', 'medicine'],
        });
        markUnsaved();
        renderEntryList();
        renderEditor();
    });
}

// ── Registration ──────────────────────────────────────────────────────────────

registerEditor('loot', {
    entryTitle: (e) => `${e.label || 'Unnamed'} (PL ${e.min}–${e.max})`,
    entryRow: (e) => ({
        name:   e.label || 'Unnamed Tier',
        meta:   `PL ${e.min}–${e.max} · ${e.rolls} roll${e.rolls !== 1 ? 's' : ''} · ${(e.pools||[]).length} pool slots`,
        badges: [{ label: 'tier', color: '#e8c060' }],
    }),
    groupKey:  () => '_group',
    newEntry:  () => ({ _group: 'tiers', label: 'New Tier', min: 1, max: 5, rolls: 1, bonus: 0.3, goldMin: 1, goldMax: 5, rarities: ['common'], pools: ['item', 'medicine'] }),
    render:      () => renderLootEditor(),
    afterRender: () => lootAfterRender(),
    headerActions: () => `<span style="opacity:.45;font-size:11px">Items drawn live from items.json · weapons.json · armor.json · enchanted.json · medicine.json</span>`,
});
