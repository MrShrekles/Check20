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

    Promise.all([
        fetch('data/quest.json').then(r => r.json()),
        fetch('data/enchantedgen.json').then(r => r.json()),
        fetch('data/traps.json').then(r => r.json()),
    ]).then(([q, e, t]) => {
        questData   = q;
        enchantData = e;
        trapData    = t;
        // Restore saved history for each generator
        loadSaved(STORE.quest,    'quest-output');
        loadSaved(STORE.enchanted,'item-output');
        loadSaved(STORE.trap,     'trap-output');
        bindGenerators();
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

})();
