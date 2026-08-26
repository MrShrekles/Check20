document.addEventListener('DOMContentLoaded', async () => {
    const tbody = document.getElementById('conditions-tbody');
    if (!tbody) return;

    try {
        const resp = await fetch('data/glossary.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const glossary = await resp.json();

        const conditions = glossary.filter(e => e.type === 'condition' && e.term !== 'Exhausted');
        const categories = [...new Set(conditions.map(c => c.category))];

        tbody.innerHTML = categories.map(cat => {
            const rows = conditions.filter(c => c.category === cat);
            return `<tr><td colspan="3" class="category-row">${cat} Conditions</td></tr>` +
                rows.map(c => `<tr><td>${c.term}</td><td>${c.definition}</td><td>${c.duration}</td></tr>`).join('');
        }).join('');
    } catch (e) {
        console.error('Failed to load glossary.json', e);
        tbody.innerHTML = `<tr><td colspan="3" style="color:#f88">Failed to load conditions data.</td></tr>`;
    }
});
