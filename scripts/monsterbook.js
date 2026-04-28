// ===== Monster Book =====
let bookData = [];
let bookFiltered = [];
const bookCollapsed = new Set();
let activeGroupFilter = "";
const STORAGE_KEY = "monsterbook_custom";

function getCustomEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
}

function saveCustomEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function loadMonsterBook() {
    try {
        const res = await fetch("data/monsterbook.json");
        const jsonData = await res.json();
        const custom = getCustomEntries().map(m => ({ ...m, _custom: true }));
        bookData = [...jsonData, ...custom];
        bookFiltered = [...bookData];
        populateBookFilters();
        renderBook();
    } catch (e) {
        console.error("Failed to load monsterbook.json:", e);
        document.getElementById("bookOutput").innerHTML = "<p>Failed to load monster book.</p>";
    }
}

function populateBookFilters() {
    const uniq = key => [...new Set(bookData.map(m => m[key]).filter(Boolean))].sort();

    // Group pills
    const pillContainer = document.getElementById("filterBookGroup");
    if (pillContainer) {
        const groups = uniq("_group");
        pillContainer.innerHTML = ["", ...groups].map(g =>
            `<button class="group-pill${activeGroupFilter === g ? " active" : ""}" data-group="${g}">
                ${g || "All"}
            </button>`
        ).join("");
        pillContainer.querySelectorAll(".group-pill").forEach(btn => {
            btn.addEventListener("click", () => {
                activeGroupFilter = btn.dataset.group === activeGroupFilter ? "" : btn.dataset.group;
                pillContainer.querySelectorAll(".group-pill").forEach(b =>
                    b.classList.toggle("active", b.dataset.group === activeGroupFilter)
                );
                filterBook();
            });
        });
    }

    function fill(id, values, placeholder) {
        const el = document.getElementById(id);
        if (!el) return;
        const cur = el.value;
        el.innerHTML = `<option value="">${placeholder}</option>`;
        values.forEach(v => {
            const o = document.createElement("option");
            o.value = v; o.textContent = v;
            el.appendChild(o);
        });
        if (cur) el.value = cur;
    }
    fill("filterBookOrigin", uniq("origin"), "All Origins");
    fill("filterBookSize",   uniq("size"),   "Any Size");
    fill("filterBookRarity", uniq("rarity"), "Any Rarity");
}

function clearBookFilters() {
    document.getElementById("bookSearch").value = "";
    activeGroupFilter = "";
    ["filterBookOrigin", "filterBookSize", "filterBookRarity"]
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    document.querySelectorAll(".group-pill").forEach(b =>
        b.classList.toggle("active", b.dataset.group === "")
    );
    filterBook();
}

function filterBook() {
    const q  = document.getElementById("bookSearch").value.toLowerCase();
    const oF = document.getElementById("filterBookOrigin")?.value || "";
    const sF = document.getElementById("filterBookSize")?.value   || "";
    const rF = document.getElementById("filterBookRarity")?.value || "";

    bookFiltered = bookData.filter(m => {
        if (q              && !JSON.stringify(m).toLowerCase().includes(q)) return false;
        if (activeGroupFilter && (m._group || "") !== activeGroupFilter)    return false;
        if (oF             && (m.origin || "") !== oF)                      return false;
        if (sF             && (m.size   || "") !== sF)                      return false;
        if (rF             && (m.rarity || "") !== rF)                      return false;
        return true;
    });
    renderBook();
}

function toggleCollapseAll() {
    const btn = document.getElementById("btnCollapseAll");
    const allKeys = [...new Set(bookFiltered.map(m => m._group || m.origin || "Other"))];
    const anyExpanded = allKeys.some(k => !bookCollapsed.has(k));
    if (anyExpanded) {
        allKeys.forEach(k => bookCollapsed.add(k));
        if (btn) btn.textContent = "Expand All";
    } else {
        bookCollapsed.clear();
        if (btn) btn.textContent = "Collapse All";
    }
    renderBook();
}

function renderBook() {
    const out = document.getElementById("bookOutput");
    if (!bookFiltered.length) {
        out.innerHTML = `<p style="opacity:0.5">No monsters found.</p>`;
        return;
    }

    const groups = new Map();
    bookFiltered.forEach(m => {
        const key = m._group || m.origin || "Other";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(m);
    });

    const sortedKeys = [...groups.keys()].sort((a, b) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return a.localeCompare(b);
    });

    out.innerHTML = "";
    sortedKeys.forEach(key => {
        const collapsed = bookCollapsed.has(key);

        const section = document.createElement("div");
        section.className = "book-group";

        const heading = document.createElement("h3");
        heading.className = "book-group-heading" + (collapsed ? " collapsed" : "");
        heading.innerHTML = `<span class="book-group-arrow">${collapsed ? "▶" : "▼"}</span>${key} <span class="book-group-count">${groups.get(key).length}</span>`;
        heading.style.cursor = "pointer";

        const grid = document.createElement("div");
        grid.className = "monster-grid";
        if (collapsed) grid.style.display = "none";
        groups.get(key).forEach(m => grid.append(createBookCard(m)));

        heading.addEventListener("click", () => {
            const isNowCollapsed = !bookCollapsed.has(key);
            if (isNowCollapsed) bookCollapsed.add(key); else bookCollapsed.delete(key);
            grid.style.display = isNowCollapsed ? "none" : "";
            heading.querySelector(".book-group-arrow").textContent = isNowCollapsed ? "▶" : "▼";
            heading.classList.toggle("collapsed", isNowCollapsed);
        });

        section.appendChild(heading);
        section.appendChild(grid);
        out.append(section);
    });
}

function createBookCard(m) {
    const card = document.createElement("div");
    card.className = "monster-card";

    const moveParts = [];
    if (m.walk)  moveParts.push(`Walk ${m.walk} ft`);
    if (m.fly)   moveParts.push(`Fly ${m.fly} ft`);
    if (m.swim)  moveParts.push(`Swim ${m.swim} ft`);
    if (m.climb) moveParts.push(`Climb ${m.climb} ft`);
    const moveText = moveParts.join(" • ") || "—";

    // Build feature list — supports both legacy single-feature fields and the
    // newer `features` array written by addToBookFromGenerator.
    let featuresHTML = "";
    const featList = Array.isArray(m.features) && m.features.length
        ? m.features
        : (m.feature_name ? [{
            name:   m.feature_name,
            type:   m.feature_type,
            range:  m.feature_range,
            effect: m.feature_effect,
          }] : []);

    if (featList.length) {
        const items = featList.map(f => {
            const meta = [f.type, f.range].filter(Boolean).join(" · ");
            return `<li><strong>${f.name}</strong>${meta ? ` (${meta})` : ""}: ${parseLinks(f.effect || "")}</li>`;
        }).join("");
        featuresHTML = `<div class="feature-block"><ul class="features">${items}</ul></div>`;
    }

    const customBtns = m._custom
        ? `<button class="secondary btn-edit-card">Edit</button>
           <button class="btn-remove btn-delete-card">Delete</button>`
        : "";

    const meleeAtk  = m.melee  || m.melee_attack  || null;
    const rangedAtk = m.ranged || m.ranged_attack || null;
    const attackLine = (atk, label) => atk?.name
        ? `<span><strong>${label}:</strong> ${atk.name}${atk.damage ? ` ${atk.damage}` : ""}${(atk.type || atk.damage_type) ? ` (${atk.type || atk.damage_type})` : ""}</span>`
        : "";

    card.innerHTML = `
        <h3 class="title">${m.name}${m._custom ? ` <span style="font-size:0.65em;opacity:0.45;font-weight:normal">[custom]</span>` : ""}</h3>
        ${m._group ? `<div class="pillline">${m._group}${m.origin ? ` · ${m.origin}` : ""}</div>` : ""}
        ${m.description ? `<p class="mon-meta">${parseLinks(m.description)}</p>` : ""}
        <div class="info-mon">
            <span><strong>Move:</strong> ${moveText}</span>
            ${m.environment ? `<span><strong>Env:</strong> ${m.environment}</span>`  : ""}
            ${m.behavior    ? `<span><strong>Behav:</strong> ${m.behavior}</span>`   : ""}
            ${m.rarity      ? `<span><strong>Rarity:</strong> ${m.rarity}</span>`    : ""}
            ${m.size        ? `<span><strong>Size:</strong> ${m.size}</span>`        : ""}
            ${m.motivation  ? `<span><strong>Motiv:</strong> ${m.motivation}</span>` : ""}
        </div>
        ${m.pl != null ? `<div class="pl-chips"><div class="pl-bubble">
            <span class="pl-seg pl-seg-pl"><strong>PL</strong> ${m.pl}</span>
            ${m.check_physical != null ? `<span class="pl-seg pl-seg-ph"><strong>Ph</strong> ${m.check_physical}</span>` : ""}
            ${m.check_mental   != null ? `<span class="pl-seg pl-seg-mt"><strong>Mt</strong> ${m.check_mental}</span>`   : ""}
        </div></div>` : ""}
        ${(meleeAtk?.name || rangedAtk?.name) ? `<div class="info-mon">${attackLine(meleeAtk, "Melee")}${attackLine(rangedAtk, "Ranged")}</div>` : ""}
        ${featuresHTML}
        ${Array.isArray(m.spells) && m.spells.length ? `
        <div class="feature-block">
            <div style="font-size:0.7em;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);opacity:0.7;margin-bottom:4px;">Spells · SP: ${m.check_mental != null ? m.check_mental * 2 : "—"}</div>
            <ul class="features">
                ${m.spells.map(s => `
                <li><strong>${s.name}</strong> <span style="opacity:0.5;font-size:0.85em">${[s.manner, s.transmission].filter(Boolean).join(" · ")}</span>
                    <ul style="list-style:none;padding-left:0.8em;margin:2px 0 0">
                        ${(s.effects || []).map(e => `<li style="font-size:0.9em"><span style="color:var(--gold);opacity:0.8">${e.intent}${e.cost ? ` (${e.cost} SP)` : ""}</span> — ${[e.range, e.damage ? e.damage + (e.type ? " " + e.type : "") : ""].filter(Boolean).join(" · ")}${e.effect ? ": " + parseLinks(e.effect) : ""}</li>`).join("")}
                    </ul>
                </li>`).join("")}
            </ul>
        </div>` : ""}
        ${m.lore ? `<p style="font-style:italic;opacity:0.7;margin-top:8px;font-size:0.9em">${parseLinks(m.lore)}</p>` : ""}
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            ${customBtns}
            <button class="btn-roll20-card">⬡ Roll20</button>
        </div>
    `;

    if (m._custom) {
        card.querySelector(".btn-edit-card").addEventListener("click", () => openCardEdit(card, m));
        card.querySelector(".btn-delete-card").addEventListener("click", () => deleteCustomMonster(m.name));
    }
    card.querySelector(".btn-roll20-card").addEventListener("click", function() {
        copyMonsterForRoll20(m, this);
    });

    return card;
}

// ===== Monster Link Utilities =====

function parseLinks(text) {
    if (!text) return "";
    return String(text).replace(/\[([^\]]+)\]/g, (_, name) =>
        `<span class="monster-link" data-target="${name.replace(/"/g, "&quot;")}">${name}</span>`
    );
}

function buildMonsterPacket(m) {
    const meleeAtk  = m.melee  || m.melee_attack  || {};
    const rangedAtk = m.ranged || m.ranged_attack  || {};
    const f0 = (Array.isArray(m.features) && m.features.length) ? m.features[0] : {};
    return {
        name:           m.name            || "Unknown Monster",
        size:           m.size            || "",
        type:           m.origin          || "",
        description:    m.description     || "",
        environment:    m.environment     || "",
        behavior:       m.behavior        || "",
        motivation:     m.motivation      || "",
        pl:             m.pl              ?? 1,
        check_physical: m.check_physical  ?? 0,
        check_mental:   m.check_mental    ?? 0,
        move_walk:      m.walk            ?? 0,
        move_fly:       m.fly             ?? 0,
        move_swim:      m.swim            ?? 0,
        move_climb:     m.climb           ?? 0,
        melee:  { name: meleeAtk.name  || "", damage: meleeAtk.damage  || "1d6", type: meleeAtk.type  || meleeAtk.damage_type  || "", equipped: !!meleeAtk.equipped },
        ranged: { name: rangedAtk.name || "", damage: rangedAtk.damage || "1d6", type: rangedAtk.type || rangedAtk.damage_type || "", equipped: !!rangedAtk.equipped },
        feature: {
            name:   m.feature_name   || f0.name   || "",
            action: m.feature_type   || f0.type   || "Action",
            range:  m.feature_range  || f0.range  || "Melee",
            effect: m.feature_effect || f0.effect || "",
            damage: m.feature_damage || f0.damage || "",
        },
        spells:          Array.isArray(m.spells) ? m.spells : [],
        spell_points_max: m.check_mental != null ? m.check_mental * 2 : 0,
    };
}

function extractLinkedNames(m) {
    const blob = [
        m.description, m.lore, m.motivation, m.feature_effect,
        ...(Array.isArray(m.features) ? m.features.map(f => f.effect) : [])
    ].filter(Boolean).join(" ");
    const names = new Set();
    for (const match of blob.matchAll(/\[([^\]]+)\]/g)) names.add(match[1]);
    names.delete(m.name);
    return [...names];
}

// ===== Roll20 Export =====
function copyMonsterForRoll20(m, btn) {
    const mainCmd    = `!importmonster ${JSON.stringify(buildMonsterPacket(m))}`;
    const linkedCmds = extractLinkedNames(m)
        .map(name => bookData.find(b => b.name === name))
        .filter(Boolean)
        .map(linked => `!importmonster ${JSON.stringify(buildMonsterPacket(linked))}`);

    const allCmds = [mainCmd, ...linkedCmds].join("\n");
    const count   = 1 + linkedCmds.length;

    const flash = () => {
        btn.textContent = count > 1 ? `✓ ${count} monsters!` : "✓ Copied!";
        btn.style.background = "var(--green-2)";
        btn.style.color = "var(--gold)";
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = "⬡ Roll20";
            btn.style.background = "";
            btn.style.color = "";
            btn.disabled = false;
        }, 2000);
    };

    if (navigator.clipboard) {
        navigator.clipboard.writeText(allCmds).then(flash).catch(() => fallbackCopy(allCmds, flash));
    } else {
        fallbackCopy(allCmds, flash);
    }
}

function fallbackCopy(text, callback) {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    callback();
}

// ===== Inline Card Editor =====
function openCardEdit(card, m) {
    // Pull first feature from either the features array or legacy fields
    const feat = Array.isArray(m.features) && m.features.length
        ? m.features[0]
        : { name: m.feature_name, type: m.feature_type, range: m.feature_range,
            effect: m.feature_effect, duration: m.feature_duration, damage: m.feature_damage };

    card.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <div class="nm-field nm-full">
                <label>Name *</label>
                <input class="ce-name" type="text">
            </div>
            <div class="nm-field">
                <label>Group</label>
                <input class="ce-group" type="text">
            </div>
            <div class="nm-field">
                <label>Origin</label>
                <input class="ce-origin" type="text">
            </div>
            <div class="nm-field">
                <label>Size</label>
                <select class="ce-size">
                    <option value="">—</option>
                    <option>Tiny</option><option>Small</option><option>Medium</option>
                    <option>Large</option><option>Huge</option><option>Colossal</option>
                </select>
            </div>
            <div class="nm-field">
                <label>Rarity</label>
                <select class="ce-rarity">
                    <option value="">—</option>
                    <option>Common</option><option>Uncommon</option>
                    <option>Rare</option><option>Legendary</option>
                </select>
            </div>
            <div class="nm-field">
                <label>Environment</label>
                <input class="ce-environment" type="text">
            </div>
            <div class="nm-field">
                <label>Behavior</label>
                <input class="ce-behavior" type="text">
            </div>
            <div class="nm-field nm-full">
                <label>Motivation</label>
                <input class="ce-motivation" type="text">
            </div>
            <div class="nm-field nm-full">
                <label>Description</label>
                <textarea class="ce-description" rows="2"></textarea>
            </div>
            <div class="nm-field nm-full">
                <label>Lore</label>
                <textarea class="ce-lore" rows="2"></textarea>
            </div>
            <div class="nm-field">
                <label>Walk (ft)</label>
                <input class="ce-walk" type="number" min="0">
            </div>
            <div class="nm-field">
                <label>Fly (ft)</label>
                <input class="ce-fly" type="number" min="0">
            </div>
            <div class="nm-field">
                <label>Swim (ft)</label>
                <input class="ce-swim" type="number" min="0">
            </div>
            <div class="nm-field">
                <label>Climb (ft)</label>
                <input class="ce-climb" type="number" min="0">
            </div>
            <div class="nm-field nm-full" style="margin-top:4px;font-size:0.8em;opacity:0.6;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Feature</div>
            <div class="nm-field">
                <label>Name</label>
                <input class="ce-feat-name" type="text">
            </div>
            <div class="nm-field">
                <label>Type</label>
                <select class="ce-feat-type">
                    <option value="">—</option>
                    <option>Action</option><option>Off-Action</option>
                    <option>Reaction</option><option>Passive</option>
                </select>
            </div>
            <div class="nm-field">
                <label>Range</label>
                <input class="ce-feat-range" type="text">
            </div>
            <div class="nm-field">
                <label>Damage Type</label>
                <input class="ce-feat-damage" type="text">
            </div>
            <div class="nm-field nm-full">
                <label>Duration</label>
                <input class="ce-feat-duration" type="text">
            </div>
            <div class="nm-field nm-full">
                <label>Effect</label>
                <textarea class="ce-feat-effect" rows="2"></textarea>
            </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
            <button class="button ce-save">Save</button>
            <button class="ghost ce-cancel">Cancel</button>
        </div>
    `;

    // Populate via JS so no HTML-escaping needed
    const q = s => card.querySelector(s);
    q(".ce-name").value        = m.name        || "";
    q(".ce-group").value       = m._group      || "";
    q(".ce-origin").value      = m.origin      || "";
    q(".ce-size").value        = m.size        || "";
    q(".ce-rarity").value      = m.rarity      || "";
    q(".ce-environment").value = m.environment || "";
    q(".ce-behavior").value    = m.behavior    || "";
    q(".ce-motivation").value  = m.motivation  || "";
    q(".ce-description").value = m.description || "";
    q(".ce-lore").value        = m.lore        || "";
    q(".ce-walk").value        = m.walk        || 0;
    q(".ce-fly").value         = m.fly         || 0;
    q(".ce-swim").value        = m.swim        || 0;
    q(".ce-climb").value       = m.climb       || 0;
    q(".ce-feat-name").value     = feat.name     || "";
    q(".ce-feat-type").value     = feat.type     || "";
    q(".ce-feat-range").value    = feat.range    || "";
    q(".ce-feat-damage").value   = feat.damage   || "";
    q(".ce-feat-duration").value = feat.duration || "";
    q(".ce-feat-effect").value   = feat.effect   || "";

    q(".ce-cancel").addEventListener("click", () => {
        card.replaceWith(createBookCard(m));
    });

    q(".ce-save").addEventListener("click", () => {
        const get    = s => q(s)?.value.trim() || "";
        const getNum = s => parseInt(q(s)?.value) || 0;

        const name = get(".ce-name");
        if (!name) { q(".ce-name").focus(); return; }

        const entry = {
            name,
            _group:           get(".ce-group")       || undefined,
            origin:           get(".ce-origin")      || undefined,
            size:             get(".ce-size")        || undefined,
            rarity:           get(".ce-rarity")      || undefined,
            environment:      get(".ce-environment") || undefined,
            behavior:         get(".ce-behavior")    || undefined,
            motivation:       get(".ce-motivation")  || undefined,
            description:      get(".ce-description") || undefined,
            lore:             get(".ce-lore")        || undefined,
            walk:             getNum(".ce-walk"),
            fly:              getNum(".ce-fly"),
            swim:             getNum(".ce-swim"),
            climb:            getNum(".ce-climb"),
            feature_name:     get(".ce-feat-name")     || undefined,
            feature_type:     get(".ce-feat-type")     || undefined,
            feature_range:    get(".ce-feat-range")    || undefined,
            feature_damage:   get(".ce-feat-damage")   || undefined,
            feature_duration: get(".ce-feat-duration") || undefined,
            feature_effect:   get(".ce-feat-effect")   || undefined,
        };

        Object.keys(entry).forEach(k => {
            if (entry[k] === undefined || entry[k] === 0) delete entry[k];
        });

        // Persist
        const custom = getCustomEntries();
        const idx = custom.findIndex(e => e.name === m.name);
        if (idx !== -1) custom[idx] = entry; else custom.push(entry);
        saveCustomEntries(custom);

        // Update live data arrays
        const bookEntry = { ...entry, _custom: true };
        const bi = bookData.findIndex(e => e._custom && e.name === m.name);
        if (bi !== -1) bookData[bi] = bookEntry;
        const fi = bookFiltered.findIndex(e => e._custom && e.name === m.name);
        if (fi !== -1) bookFiltered[fi] = bookEntry;

        // Swap card in-place
        card.replaceWith(createBookCard(bookEntry));
    });
}

function submitNewMonster() {
    const get    = id => document.getElementById(id)?.value.trim() || "";
    const getNum = id => parseInt(document.getElementById(id)?.value) || 0;

    const name = get("new-name");
    if (!name) { alert("Name is required."); return; }

    const entry = {
        name,
        _group:           get("new-group"),
        origin:           get("new-origin"),
        size:             get("new-size"),
        rarity:           get("new-rarity"),
        environment:      get("new-environment"),
        behavior:         get("new-behavior"),
        description:      get("new-description"),
        lore:             get("new-lore"),
        walk:             getNum("new-walk"),
        fly:              getNum("new-fly"),
        swim:             getNum("new-swim"),
        climb:            getNum("new-climb"),
        feature_name:     get("new-feat-name"),
        feature_type:     get("new-feat-type"),
        feature_range:    get("new-feat-range"),
        feature_effect:   get("new-feat-effect"),
        feature_duration: get("new-feat-duration"),
        feature_damage:   get("new-feat-damage"),
        motivation:       get("new-motivation"),
    };

    Object.keys(entry).forEach(k => {
        if (entry[k] === "" || entry[k] === 0) delete entry[k];
    });

    const custom = getCustomEntries();
    custom.push(entry);
    saveCustomEntries(custom);

    bookData.push({ ...entry, _custom: true });
    bookFiltered = [...bookData];
    renderBook();

    document.getElementById("new-monster-form").reset();
    document.getElementById("new-monster-details").open = false;

    requestAnimationFrame(() => {
        document.getElementById("bookOutput").lastElementChild?.scrollIntoView({ behavior: "smooth" });
    });
}

function deleteCustomMonster(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const custom = getCustomEntries().filter(m => m.name !== name);
    saveCustomEntries(custom);
    loadMonsterBook();
}

function exportMonsterBook() {
    const custom = getCustomEntries();
    if (!custom.length) { alert("No custom entries to export."); return; }
    const blob = new Blob([JSON.stringify(custom, null, 4)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "monsterbook_custom.json";
    a.click();
    URL.revokeObjectURL(a.href);
}

// ===== Add from Generator =====

function _parseMovementText(text) {
    if (!text) return {};
    const out = {};
    const patterns = { walk: /Walk[:\s]+(\d+)\s*ft/i, fly: /Fly[:\s]+(\d+)\s*ft/i,
                       swim: /Swim[:\s]+(\d+)\s*ft/i, climb: /Climb[:\s]+(\d+)\s*ft/i };
    for (const [key, re] of Object.entries(patterns)) {
        const m = text.match(re);
        if (m) out[key] = parseInt(m[1]);
    }
    return out;
}

const _cap = s => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s;

function addToBookFromGenerator(mon) {
    const dash = v => (!v || v === "—") ? undefined : v;

    const moveFb = _parseMovementText(mon.movementText);

    const features = (mon.features || [])
        .filter(f => f && (f.name || f.effect || f.text))
        .map(f => {
            if (f.name || f.effect) {
                return {
                    name:     f.name           || "Feature",
                    type:     _cap(f.action)   || undefined,
                    range:    _cap(f.range)    || undefined,
                    effect:   f.effect         || undefined,
                    duration: _cap(f.duration) || undefined,
                    damage:   _cap(f.damage)   || undefined,
                };
            }
            // Old format — parse from text: "Name (meta): effect"
            const text = f.text || "";
            const colonIdx = text.indexOf(":");
            if (colonIdx > -1) {
                const beforeColon = text.slice(0, colonIdx).trim();
                const parenIdx = beforeColon.indexOf("(");
                const name = (parenIdx > -1 ? beforeColon.slice(0, parenIdx) : beforeColon).trim();
                const effect = text.slice(colonIdx + 1).trim();
                return { name: name || "Feature", effect: effect || undefined };
            }
            return { name: text || "Feature" };
        })
        .map(f => { Object.keys(f).forEach(k => f[k] === undefined && delete f[k]); return f; });

    const entry = {
        name:        mon.name || "Unnamed Creature",
        _group:      dash(mon.infoLine)    || undefined,
        origin:      mon.origins?.filter(Boolean).join(" / ") || undefined,
        size:        dash(mon.size)        || undefined,
        rarity:      dash(mon.rarity)      || undefined,
        environment: dash(mon.environment) || undefined,
        behavior:    dash(mon.behavior)    || undefined,
        description: dash(mon.description) || undefined,
        walk:        mon.moveWalk  || moveFb.walk  || 0,
        fly:         mon.moveFly   || moveFb.fly   || 0,
        swim:        mon.moveSwim  || moveFb.swim  || 0,
        climb:       mon.moveClimb || moveFb.climb || 0,
        features:    features.length ? features : undefined,
        pl:          mon.pl     || undefined,
        melee:       mon.melee  || undefined,
        ranged:      mon.ranged || undefined,
    };

    Object.keys(entry).forEach(k => {
        if (entry[k] === "" || entry[k] === 0 || entry[k] === undefined) delete entry[k];
    });

    const custom = getCustomEntries();
    custom.push(entry);
    saveCustomEntries(custom);

    if (bookData.length > 0) {
        bookData.push({ ...entry, _custom: true });
        bookFiltered = [...bookData];
        renderBook();
    }

    showTab("monsterbook");

    requestAnimationFrame(() => {
        document.getElementById("bookOutput").lastElementChild?.scrollIntoView({ behavior: "smooth" });
    });
}
window.addToBookFromGenerator = addToBookFromGenerator;

document.addEventListener('DOMContentLoaded', () => {
    loadMonsterBook();

    // ===== Monster Link Tooltip & Navigation =====
    const tip = document.createElement("div");
    tip.id = "monster-link-tooltip";
    document.body.appendChild(tip);

    function showTip(name, e) {
        const found = bookData.find(b => b.name === name);
        if (!found) {
            tip.innerHTML = `<span class="mlt-name">${name}</span><span class="mlt-miss">Not in book</span>`;
        } else {
            const moves = [];
            if (found.walk)  moves.push(`Walk ${found.walk}ft`);
            if (found.fly)   moves.push(`Fly ${found.fly}ft`);
            if (found.swim)  moves.push(`Swim ${found.swim}ft`);
            if (found.climb) moves.push(`Climb ${found.climb}ft`);
            const featList = Array.isArray(found.features) && found.features.length
                ? found.features
                : (found.feature_name ? [{ name: found.feature_name, type: found.feature_type }] : []);
            const featNames = featList.map(f => f.name).filter(Boolean).join(", ");
            tip.innerHTML = `
                <span class="mlt-name">${found.name}</span>
                ${(found.size || found.rarity) ? `<span class="mlt-row">${[found.size, found.rarity].filter(Boolean).join(" · ")}</span>` : ""}
                ${found.pl != null ? `<span class="mlt-row">PL ${found.pl}${found.check_physical != null ? ` · Ph ${found.check_physical}` : ""}${found.check_mental != null ? ` · Mt ${found.check_mental}` : ""}</span>` : ""}
                ${moves.length ? `<span class="mlt-row">${moves.join(" · ")}</span>` : ""}
                ${featNames ? `<span class="mlt-feat">⚔ ${featNames}</span>` : ""}
            `;
        }
        tip.style.display = "flex";
        moveTip(e);
    }

    function moveTip(e) {
        const x = e.clientX + 16;
        const y = e.clientY + 16;
        tip.style.left = `${Math.min(x, window.innerWidth  - (tip.offsetWidth  || 220) - 8)}px`;
        tip.style.top  = `${Math.min(y, window.innerHeight - (tip.offsetHeight || 120) - 8)}px`;
    }

    const out = document.getElementById("bookOutput");

    out.addEventListener("click", e => {
        const link = e.target.closest(".monster-link");
        if (!link) return;
        const name = link.dataset.target;
        for (const card of out.querySelectorAll(".monster-card")) {
            const title = card.querySelector(".title");
            if (title && title.textContent.trim().startsWith(name)) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.classList.remove("monster-highlight");
                void card.offsetWidth;
                card.classList.add("monster-highlight");
                setTimeout(() => card.classList.remove("monster-highlight"), 1800);
                return;
            }
        }
    });

    out.addEventListener("mouseover", e => {
        const link = e.target.closest(".monster-link");
        if (link) showTip(link.dataset.target, e);
    });
    out.addEventListener("mousemove", e => {
        if (e.target.closest(".monster-link")) moveTip(e);
    });
    out.addEventListener("mouseout", e => {
        if (!e.relatedTarget?.closest?.(".monster-link")) tip.style.display = "none";
    });
});

// ===== Tab switching =====
function showTab(tab) {
    document.getElementById("tab-generator").hidden = tab !== "generator";
    document.getElementById("tab-monsterbook").hidden = tab !== "monsterbook";
    document.querySelectorAll("#monster-tabs .tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    if (tab === "monsterbook" && !bookData.length) loadMonsterBook();
}
