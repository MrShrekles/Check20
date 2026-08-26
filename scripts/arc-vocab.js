// ── SHARED VOCABULARY ─────────────────────────────────────────────────────────
// Single source of truth for values the code branches on: the rarity ladder,
// check keys, action types, ranges. Canonical copy lives in data/vocab.json;
// this file only loads it and exposes helpers.
//
// Before this existed the rarity ladder was declared in six places and four of
// them disagreed - worldgen/narrator had an "Epic" tier the data never used and
// were missing "very rare" which 50+ entries did use. Add new values to
// data/vocab.json, not here.
(function (global) {
    'use strict';

    // Mirror of data/vocab.json, used ONLY if the fetch fails so that sorting and
    // colours degrade gracefully instead of silently ranking everything unknown.
    const FALLBACK = {
        rarity: {
            ladder: ['common', 'uncommon', 'rare', 'very rare', 'legendary'],
            colors: { 'common':'#888888', 'uncommon':'#55aa55', 'rare':'#5588cc',
                      'very rare':'#aa55cc', 'legendary':'#cc8822' },
        },
        checks: [], actionTypes: [], ranges: [],
    };

    let vocab = FALLBACK;
    let pending = null;

    // narrator.js runs from active-sheet/, the rest from the site root.
    function dataBase() {
        if (global.ARC_DATA_BASE) return global.ARC_DATA_BASE;
        return location.pathname.includes('/active-sheet/') ? '../data/' : 'data/';
    }

    function load() {
        if (pending) return pending;
        pending = fetch(dataBase() + 'vocab.json')
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(v => (vocab = v))
            .catch(err => { console.warn('vocab.json unavailable, using fallback', err); return vocab; });
        return pending;
    }

    // '' and null normalise to 'common' so unrated entries sort at the bottom
    // rather than vanishing from filters.
    function normalizeRarity(r) {
        const t = String(r ?? '').toLowerCase().trim();
        return t || 'common';
    }

    function ladder()      { return vocab.rarity?.ladder || FALLBACK.rarity.ladder; }
    function rarityRank(r) { const i = ladder().indexOf(normalizeRarity(r)); return i === -1 ? 99 : i; }
    function rarityColor(r) {
        const c = vocab.rarity?.colors || FALLBACK.rarity.colors;
        return c[normalizeRarity(r)] || '#888888';
    }
    // "very rare" -> "Very Rare", for display only. Data stays lowercase.
    function rarityLabel(r) {
        return normalizeRarity(r).replace(/\b\w/g, ch => ch.toUpperCase());
    }
    function checks()     { return vocab.checks || []; }
    function checkKeys()  { return checks().map(c => c.key); }
    function checkLabels(){ return checks().map(c => c.label); }

    global.ARC_VOCAB = {
        load, normalizeRarity, rarityRank, rarityColor, rarityLabel,
        ladder, checks, checkKeys, checkLabels,
        get data() { return vocab; },
    };

    load();
})(window);
