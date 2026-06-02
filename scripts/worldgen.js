// worldgen.js — Quest, Enchanted Item, and Door/Lock/Trap generators
// Data lives in data/quest.json, data/enchanted.json, data/traps.json
// Edit those files in the Forge to add/change/remove table entries.

(function () {
    'use strict';

    // ── Storage keys ───────────────────────────────────────────────────────────
    const STORE = {
        quest:    'worldgen-quest-history',
        enchanted:'worldgen-enchanted-history',
        trap:     'worldgen-trap-history',
        loot:     'worldgen-loot-history',
    };

    // ── Card builder ───────────────────────────────────────────────────────────
    function buildCard(theme, header, title, rows, tags) {
        const card = document.createElement('div');
        card.className = `gen-card gen-card--${theme}`;
        const tagsHTML = (tags || []).length
            ? `<div class="gc-tags">${tags.map(t => `<span class="gc-tag ${t.cls || ''}">${t.text}</span>`).join('')}</div>`
            : '';
        card.innerHTML = `
            <div class="gc-header"><span class="gc-badge">${header}</span></div>
            <div class="gc-title">${title}</div>
            <div class="gc-divider"></div>
            ${rows.map(r => `
                <div class="gc-row">
                    <span class="gc-key">${r.key}</span>
                    <span class="gc-val${r.muted ? ' gc-val--muted' : ''}">${r.val}</span>
                </div>`).join('')}
            ${tagsHTML}
            <button class="gc-delete" aria-label="Remove">✕</button>`;
        card.querySelector('.gc-delete').addEventListener('click', () => {
            card.remove();
            // remove from storage by rebuilding without this card
            // (simplest: just don't re-save on delete — storage auto-expires on clear)
        });
        return card;
    }

    // ── Persistence helpers ────────────────────────────────────────────────────
    function saveCard(storeKey, data) {
        try {
            const arr = JSON.parse(localStorage.getItem(storeKey) || '[]');
            arr.unshift(data);
            if (arr.length > 30) arr.length = 30;
            localStorage.setItem(storeKey, JSON.stringify(arr));
        } catch(_) {}
    }

    function loadSaved(storeKey, outputId) {
        try {
            const out = document.getElementById(outputId);
            if (!out) return;
            const arr = JSON.parse(localStorage.getItem(storeKey) || '[]');
            // append in order (already newest-first)
            arr.forEach(d => out.appendChild(buildCard(d.theme, d.header, d.title, d.rows, d.tags)));
        } catch(_) {}
    }

    function bindClear(btnId, outputId, storeKey) {
        document.getElementById(btnId)?.addEventListener('click', () => {
            document.getElementById(outputId).innerHTML = '';
            try { localStorage.removeItem(storeKey); } catch(_) {}
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    const wbPick  = arr => arr[Math.floor(Math.random() * arr.length)];
    const byType  = (arr, t)  => arr.filter(e => e.type === t);
    const pickTxt = (arr, t)  => { const f = byType(arr, t); return f.length ? wbPick(f).text : '—'; };

    // Weighted random PL — lower PLs more common
    function randomPL() {
        const pool = [
            1,1,1,1, 2,2,2,2, 3,3,3, 4,4,4, 5,5,5,
            6,6, 7,7, 8,8, 9, 10, 11, 12,
        ];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ── DATA LOAD ──────────────────────────────────────────────────────────────
    let questData   = [];
    let enchantData = [];
    let trapData    = [];
    let lootData    = null;

    Promise.all([
        fetch('data/quest.json').then(r => r.json()),
        fetch('data/enchantedgen.json').then(r => r.json()),
        fetch('data/traps.json').then(r => r.json()),
        fetch('data/loot.json').then(r => r.json()),
        fetch('data/items.json').then(r => r.json()),
        fetch('data/weapons.json').then(r => r.json()),
        fetch('data/armor.json').then(r => r.json()),
        fetch('data/enchanted.json').then(r => r.json()),
        fetch('data/medicine.json').then(r => r.json()),
    ]).then(([q, e, t, lootCfg, items, weapons, armor, enchanted, medicine]) => {
        questData   = q;
        enchantData = e;
        trapData    = t;
        lootData = {
            config: lootCfg,
            items,
            weapons,
            armor,
            enchanted,
            medData: {
                prefixes:  medicine.filter(x => x.category === 'prefix').map(x => x.value),
                bases:     medicine.filter(x => x.category === 'base').map(x => x.value),
                suffixes:  medicine.filter(x => x.category === 'suffix').map(x => x.value),
                templates: medicine.filter(x => x.category === 'desc_templates').map(x => x.value),
                flavors:   medicine.filter(x => x.category === 'flavor').map(x => x.value),
                makers:    medicine.filter(x => x.category === 'maker').map(x => x.value),
                places:    medicine.filter(x => x.category === 'place').map(x => x.value),
                symbols:   medicine.filter(x => x.category === 'symbol').map(x => x.value),
                effects:   medicine.filter(x => x.category === 'effects').map(x => x.value),
            },
            enchGen: {
                prefixes:    e.filter(x => x.type === 'prefix').map(x => x.text),
                effects:     e.filter(x => x.type === 'effect').map(x => x.text),
                damageTypes: e.filter(x => x.type === 'damageType').map(x => x.text),
                checks:      e.filter(x => x.type === 'check').map(x => x.text),
                itemTypes:   e.filter(x => x.type === 'itemType').map(x => x.text),
            },
        };
        // Restore saved history for each generator
        loadSaved(STORE.quest,    'quest-output');
        loadSaved(STORE.enchanted,'item-output');
        loadSaved(STORE.trap,     'trap-output');
        bindGenerators();
        bindLootGenerator();
        // loadSavedLoot after bindLootGenerator defines buildLootCard
        loadSavedLoot('loot-output');
    }).catch(err => console.error('worldgen: data load failed', err));

    // ── GENERATORS ────────────────────────────────────────────────────────────
    function bindGenerators() {

        // ── Quest ──────────────────────────────────────────────────────────────
        const QUEST_TYPE_LABELS = {
            fetch:'Fetch', escort:'Escort', kill:'Eliminate', explore:'Explore',
            rescue:'Rescue', investigate:'Investigate', defend:'Defend', deliver:'Deliver',
        };

        document.getElementById('generate-quest')?.addEventListener('click', () => {
            const pick   = document.getElementById('quest-type-pick')?.value || 'any';
            const type   = pick === 'any' ? wbPick(Object.values(QUEST_TYPE_LABELS)) : QUEST_TYPE_LABELS[pick];
            const target = pickTxt(questData, 'target');
            const data   = {
                theme: 'quest',
                header: type,
                title:  `${type}: ${target.charAt(0).toUpperCase() + target.slice(1)}`,
                rows: [
                    { key:'Giver',  val: pickTxt(questData, 'giver') },
                    { key:'Goal',   val: `Acquire / handle ${target}` },
                    { key:'Twist',  val: pickTxt(questData, 'twist'),  muted: true },
                    { key:'Reward', val: pickTxt(questData, 'reward') },
                ],
                tags: [],
            };
            saveCard(STORE.quest, data);
            document.getElementById('quest-output')?.prepend(
                buildCard(data.theme, data.header, data.title, data.rows, data.tags)
            );
        });
        bindClear('clear-quests', 'quest-output', STORE.quest);

        // ── Enchanted Item ─────────────────────────────────────────────────────
        const RARITIES      = ['Common','Uncommon','Rare','Epic','Legendary'];
        const RARITY_COLORS = { Common:'#888', Uncommon:'#55aa55', Rare:'#5588cc', Epic:'#aa55cc', Legendary:'#cc8822' };

        document.getElementById('generate-item')?.addEventListener('click', () => {
            const tp  = document.getElementById('item-type-pick')?.value   || 'any';
            const rp  = document.getElementById('item-rarity-pick')?.value || 'any';

            const allItemTypes = byType(enchantData, 'itemType');
            const categories   = [...new Set(allItemTypes.map(e => e.category))];
            const chosenCat    = tp === 'any' ? wbPick(categories) : tp;
            const inCat        = allItemTypes.filter(e => e.category === chosenCat);
            const base         = inCat.length ? wbPick(inCat).text : 'Item';
            const rar          = rp === 'any' ? wbPick(RARITIES) : rp.charAt(0).toUpperCase() + rp.slice(1);
            const dmgType      = pickTxt(enchantData, 'damageType');
            const check        = pickTxt(enchantData, 'check');
            const effect       = pickTxt(enchantData, 'effect').replace('{type}', dmgType).replace('{check}', check);
            const rarCol       = RARITY_COLORS[rar] || '#888';
            const catLabel     = chosenCat.charAt(0).toUpperCase() + chosenCat.slice(1);

            const data = {
                theme:  'enchanted',
                header: `${catLabel} · <span style="color:${rarCol}">${rar}</span>`,
                title:  `${pickTxt(enchantData,'prefix')} ${base}`,
                rows: [
                    { key:'Type',   val: base },
                    { key:'Effect', val: `This item ${effect}.` },
                ],
                tags: [
                    { text: dmgType, cls: 'gc-tag--element' },
                    { text: rar,     cls: `gc-tag--${rar.toLowerCase()}` },
                ],
            };
            saveCard(STORE.enchanted, data);
            document.getElementById('item-output')?.prepend(
                buildCard(data.theme, data.header, data.title, data.rows, data.tags)
            );
        });
        bindClear('clear-items', 'item-output', STORE.enchanted);

        // ── Door / Lock / Trap ─────────────────────────────────────────────────
        document.getElementById('generate-trap')?.addEventListener('click', () => {
            const pl    = randomPL();
            const locks = byType(trapData, 'lock');
            const traps = byType(trapData, 'trap');
            const doors = byType(trapData, 'door');
            const lock  = locks.length ? wbPick(locks) : { name:'?', key:'?', hint:'?' };
            const trap  = traps.length ? wbPick(traps) : { name:'?', dmg:'?', effect:'?' };
            const door  = doors.length ? wbPick(doors).text : '?';
            const desc  = (trap.effect || '').replace('{dmg}', `${pl}d6`).replace('{range}', `${pl * 5}ft`);

            const data = {
                theme:  'trap',
                header: `PL ${pl} · ${trap.name} Trap`,
                title:  `${lock.name} Lock`,
                rows: [
                    { key:'Door',   val: door },
                    { key:'Key',    val: `${lock.key} — ${lock.hint}` },
                    { key:'Trap',   val: desc },
                    { key:'Damage', val: `${trap.dmg} · ${pl}d6`, muted: true },
                ],
                tags: [],
            };
            saveCard(STORE.trap, data);
            document.getElementById('trap-output')?.prepend(
                buildCard(data.theme, data.header, data.title, data.rows, data.tags)
            );
        });
        bindClear('clear-traps', 'trap-output', STORE.trap);

    } // end bindGenerators

    // ── Loot Generator ─────────────────────────────────────────────────────────

    function rollLoot(pl) {
        const { config, items, weapons, armor, enchanted, medData, enchGen } = lootData;
        const tier  = config.tiers.find(t => pl >= t.min && pl <= t.max) || config.tiers[config.tiers.length - 1];
        const gold  = Math.floor((tier.goldMin + Math.random() * (tier.goldMax - tier.goldMin)) * pl);
        const count = tier.rolls + (Math.random() < tier.bonus ? 1 : 0);
        const rarities = tier.rarities || null;

        const byRarity = arr => {
            if (!rarities) return arr;
            const f = arr.filter(x => rarities.includes((x.rarity || 'common').toLowerCase()));
            return f.length ? f : arr;
        };

        const picks = [];
        for (let i = 0; i < count; i++) {
            const cat = tier.pools[Math.floor(Math.random() * tier.pools.length)];
            let result = null;

            if (cat === 'item') {
                const it = wbPick(items);
                if (it) result = { cat, name: it.name, desc: it.description || '', meta: it.category || '' };

            } else if (cat === 'medicine') {
                const name   = `${wbPick(medData.prefixes)} ${wbPick(medData.bases)} ${wbPick(medData.suffixes)}`;
                const effect = wbPick(medData.effects);
                result = { cat, name, desc: effect, meta: 'Medicine' };

            } else if (cat === 'weapon') {
                const w = wbPick(byRarity(weapons));
                if (w) result = { cat, name: w.name, desc: [w.damage, w.damageType].filter(Boolean).join(' '), meta: [w.category, w.rarity].filter(Boolean).join(' · ') };

            } else if (cat === 'armor') {
                const a = wbPick(byRarity(armor));
                if (a) result = { cat, name: a.name, desc: a.description || `+${a.armor} Armor Rating`, meta: a.rarity || '' };

            } else if (cat === 'enchanted') {
                if (Math.random() < 0.5 && enchanted.length) {
                    const e = wbPick(enchanted);
                    result = { cat, name: e.name, desc: e.effect || e.description || '', meta: e.type || 'Enchanted' };
                } else {
                    const prefix   = wbPick(enchGen.prefixes);
                    const itemType = wbPick(enchGen.itemTypes);
                    const effect   = wbPick(enchGen.effects)
                        .replace('{type}',  wbPick(enchGen.damageTypes))
                        .replace('{check}', wbPick(enchGen.checks));
                    result = { cat, name: `${prefix} ${itemType}`, desc: effect, meta: 'Enchanted' };
                }
            }

            if (result) picks.push(result);
        }
        return { pl, tier: tier.label, gold, items: picks };
    }

    const CAT_COLOR = { item:'#8899aa', medicine:'#44bb88', weapon:'#cc5544', armor:'#aa7744', enchanted:'#aa77cc' };
    const CAT_LABEL = { item:'Item', medicine:'Medicine', weapon:'Weapon', armor:'Armor', enchanted:'Enchanted' };

    function buildLootCard(result) {
        const card = document.createElement('div');
        card.className = 'gen-card gen-card--loot';
        card.innerHTML = `
            <div class="gc-header"><span class="gc-badge">PL ${result.pl} · ${result.tier}</span></div>
            <div class="gc-title">⬡ ${result.gold} GP</div>
            <div class="gc-divider"></div>
            ${result.items.map(it => {
                const col = CAT_COLOR[it.cat] || '#888';
                return `<div class="gc-row" style="align-items:flex-start">
                    <span class="gc-key" style="color:${col};min-width:72px">${CAT_LABEL[it.cat] || it.cat}</span>
                    <span class="gc-val" style="display:flex;flex-direction:column;gap:1px">
                        <strong>${it.name}</strong>
                        ${it.desc ? `<span style="opacity:.7;font-size:.78em">${it.desc}</span>` : ''}
                        ${it.meta ? `<span style="opacity:.45;font-size:.72em">${it.meta}</span>` : ''}
                    </span>
                </div>`;
            }).join('')}
            <button class="gc-delete" aria-label="Remove">✕</button>`;
        card.querySelector('.gc-delete').addEventListener('click', () => card.remove());
        return card;
    }

    function bindLootGenerator() {
        let currentPl = 5;
        const plDisplay = document.getElementById('loot-pl-display');

        const updatePl = (delta) => {
            currentPl = Math.max(1, currentPl + delta);
            if (plDisplay) plDisplay.textContent = currentPl;
        };

        document.getElementById('loot-pl-dec')?.addEventListener('click', () => updatePl(-1));
        document.getElementById('loot-pl-inc')?.addEventListener('click', () => updatePl(1));

        document.getElementById('generate-loot')?.addEventListener('click', () => {
            if (!lootData) return;
            const result = rollLoot(currentPl);
            saveCard(STORE.loot, result);
            document.getElementById('loot-output')?.prepend(buildLootCard(result));
        });

        bindClear('clear-loot', 'loot-output', STORE.loot);
    }

    function loadSavedLoot(outputId) {
        try {
            const out = document.getElementById(outputId);
            if (!out) return;
            const arr = JSON.parse(localStorage.getItem(STORE.loot) || '[]');
            arr.forEach(d => out.appendChild(buildLootCard(d)));
        } catch(_) {}
    }

})();
