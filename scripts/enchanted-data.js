/* ─── enchanted-data.js ──────────────────────────────────────────────────── */
let ENCHANTED_DATA = [];

const ENC_TYPE_COLORS = {
    amulet:  '#5020a0',
    armor:   '#604020',
    gear:    '#205040',
    item:    '#304060',
    lantern: '#806010',
    weapon:  '#6a1818',
};

async function loadEnchanted() {
    const raw = await fetch('data/enchanted.json').then(r => r.json());

    ENCHANTED_DATA = raw.map(item => {
        const slug  = codexSlug(item.name);
        const type  = (item.type || 'item');
        const color = ENC_TYPE_COLORS[type.toLowerCase()] || '#404040';

        const tags = (item.tags || [])
            .map(t => String(t).trim().toLowerCase())
            .filter(Boolean);

        const checks = String(item.check || '')
            .split(',').map(c => c.trim().toLowerCase()).filter(Boolean);

        return {
            ...item,
            slug,
            color,
            tags,
            checks,
            damageArmor: String(item['Damage, Armor'] || '').trim(),
            searchKey: [item.name, item.type, item.description, item.effect, item.upgrade,
                ...tags, ...checks].filter(Boolean).join(' ').toLowerCase(),
        };
    });

    document.dispatchEvent(new Event('enchanted-ready'));
}

document.addEventListener('DOMContentLoaded', loadEnchanted);
