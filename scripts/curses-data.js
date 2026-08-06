/* ─── curses-data.js ─────────────────────────────────────────────────────── */
let CURSES_ALL = [];

const curseState = {
    q: '',
    selectedType: 'all',
    exclude: { source: new Set() },
    collapsed: new Set(),
    filterUniverse: { source: new Set() },
};

async function loadCurses() {
    const res  = await fetch('data/curses.json');
    const json = await res.json();

    const process = (arr, fallbackType) => arr.map(e => ({
        ...e,
        type: e.type || fallbackType,
        sourceKey: (e.source || '').toLowerCase(),
        searchKey: [
            e.name, e.subtitle, e.source, e.desc,
            e.infection, e.progression, e.advanced?.curse, e.advanced?.desc,
            ...(e.sections || []).flatMap(s =>
                [s.label, s.intro, ...(s.steps || []).flatMap(st => [st.name, st.desc])]
            ),
            ...(e.stages || []).flatMap(s => [s.label, s.desc])
        ].filter(Boolean).join(' ').toLowerCase(),
    }));

    CURSES_ALL = [...process(json.curses || [], 'curse'), ...process(json.diseases || [], 'disease')];

    document.dispatchEvent(new Event('curses-ready'));
}

document.addEventListener('DOMContentLoaded', loadCurses);
