/* ─── curses-data.js ─────────────────────────────────────────────────────── */
let CURSES_DATA  = [];
let CURSES_ALL   = [];

async function loadCurses() {
    const res  = await fetch('data/curses.json');
    const json = await res.json();

    const process = arr => arr.map(e => ({
        ...e,
        searchKey: [
            e.name, e.subtitle, e.source, e.desc, e.infection,
            ...(e.sections || []).flatMap(s =>
                [s.label, s.intro, ...(s.steps || []).flatMap(st => [st.name, st.desc])]
            )
        ].filter(Boolean).join(' ').toLowerCase(),
    }));

    CURSES_ALL  = [...process(json.curses || []), ...process(json.diseases || [])];
    CURSES_DATA = CURSES_ALL;

    document.dispatchEvent(new Event('curses-ready'));
}

document.addEventListener('DOMContentLoaded', loadCurses);
