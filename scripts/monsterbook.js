// ===== Monster Book =====
let bookData = [];
let bookFiltered = [];
const bookCollapsed = new Set();
let activeGroupFilter = "";
let bookEditMode = false;
const STORAGE_KEY          = "monsterbook_custom";
const STORAGE_KEY_OVERRIDE = "monsterbook_overrides";

function getCustomEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
}
function saveCustomEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function getOverrides() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_OVERRIDE) || "{}"); }
    catch { return {}; }
}
function saveOverrides(overrides) {
    localStorage.setItem(STORAGE_KEY_OVERRIDE, JSON.stringify(overrides));
}

function toggleEditMode() {
    bookEditMode = !bookEditMode;
    document.body.classList.toggle("book-edit-mode", bookEditMode);
    const btn = document.getElementById("btnEditMode");
    if (btn) btn.classList.toggle("active", bookEditMode);
}

async function loadMonsterBook() {
    try {
        const res = await fetch("data/monsterbook.json");
        const jsonData = await res.json();
        const overrides = getOverrides();
        const custom = getCustomEntries().map(m => ({ ...m, _custom: true }));
        const base = jsonData.map(m => overrides[m.name] ? { ...m, ...overrides[m.name] } : m);
        bookData = [...base, ...custom];
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

    const deleteBtnHtml = m._custom
        ? `<button class="btn-remove btn-delete-card">Delete</button>`
        : "";

    const meleeAtk  = m.melee  || m.melee_attack  || null;
    const rangedAtk = m.ranged || m.ranged_attack || null;
    const attackLine = (atk, label) => atk?.name
        ? `<span><strong>${label}:</strong> ${atk.name}${atk.damage ? ` ${atk.damage}` : ""}${(atk.type || atk.damage_type) ? ` (${atk.type || atk.damage_type})` : ""}</span>`
        : "";

    card.innerHTML = `
        <button class="card-edit-cog" title="Edit">⚙</button>
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
        <div class="feature-block" style="margin-top:6px">
            <div style="font-size:0.7em;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);opacity:0.7;margin-bottom:4px;">
                Spells · MN: ${m.check_mental != null ? m.check_mental * 2 : "—"}
            </div>
            ${m.spells.map(s => `
            <details class="spell-entry">
                <summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:5px;padding:3px 0">
                    <span class="spell-arrow">▶</span>
                    <strong>${s.name}</strong>
                    <span style="opacity:0.4;font-size:0.82em">${[s.manner, s.transmission].filter(Boolean).join(" · ")}</span>
                </summary>
                <ul style="list-style:none;padding-left:1em;margin:4px 0 6px;font-size:0.88em">
                    ${(s.effects || []).map(e => `<li style="margin-bottom:3px"><span style="color:var(--gold);opacity:0.85">${e.intent}${e.cost ? ` (${e.cost} MN)` : ""}</span> — ${[e.range, e.damage ? e.damage + (e.type ? " " + e.type : "") : ""].filter(Boolean).join(" · ")}${e.effect ? ": " + parseLinks(e.effect) : ""}</li>`).join("")}
                </ul>
            </details>`).join("")}
        </div>` : ""}
        ${m.lore ? `<p style="font-style:italic;opacity:0.7;margin-top:8px;font-size:0.9em">${parseLinks(m.lore)}</p>` : ""}
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            ${deleteBtnHtml}
            <button class="btn-chat-card">✦ Chat</button>
            <button class="btn-roll20-card">⬡ Roll20</button>
        </div>
    `;

    card.querySelector(".card-edit-cog").addEventListener("click", () => openCardEdit(card, m));
    if (m._custom) {
        card.querySelector(".btn-delete-card").addEventListener("click", () => deleteCustomMonster(m.name));
    }
    card.querySelector(".btn-chat-card").addEventListener("click", function() {
        copyMonsterForChat(m, this);
    });
    card.querySelector(".btn-roll20-card").addEventListener("click", function() {
        copyMonsterForRoll20(m, this);
    });

    return card;
}

// ===== Monster Link Utilities =====

function parseLinks(text) {
    if (!text) return "";
    // parseDice first so [[...]] are gone before the single-bracket link matcher runs
    const diced = typeof parseDice === 'function' ? parseDice(String(text)) : String(text);
    return diced.replace(/(?<!\[)\[([^\[\]]+)\](?!\])/g, (_, name) =>
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
        mana_max: m.check_mental != null ? m.check_mental * 2 : 0,
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

// ===== Chat Copy =====
function stripHtml(str) {
    return String(str || "").replace(/<[^>]+>/g, "");
}

function copyMonsterForChat(m, btn) {
    const lines = [];

    lines.push(`**${(m.name || "Unknown Monster").toUpperCase()}**`);

    const identity = [m.size, m.origin, m.rarity].filter(Boolean).join(" · ");
    if (identity) lines.push(identity);

    const envBeh = [m.environment, m.behavior].filter(Boolean).join(" · ");
    if (envBeh) lines.push(envBeh);
    if (m.motivation) lines.push(`Motivation: ${m.motivation}`);

    const pl   = m.pl            ?? 0;
    const phys = m.check_physical ?? 0;
    const ment = m.check_mental   ?? 0;
    if (pl) {
        lines.push("");
        lines.push(`PL ${pl}  (PHY ${phys} / MNT ${ment})  •  MN: ${ment * 2} max`);
    }

    const moveParts = [
        m.walk  && `Walk ${m.walk}`,
        m.fly   && `Fly ${m.fly}`,
        m.swim  && `Swim ${m.swim}`,
        m.climb && `Climb ${m.climb}`,
    ].filter(Boolean);
    if (moveParts.length) lines.push(`Move: ${moveParts.join(" / ")}`);

    // Attacks
    const meleeAtk  = m.melee  || m.melee_attack  || null;
    const rangedAtk = m.ranged || m.ranged_attack  || null;
    const atkLines  = [];
    const fmtAtk = (atk, label) => {
        if (!atk?.name) return;
        const dmg  = [atk.damage, atk.type || atk.damage_type].filter(Boolean).join(" ");
        atkLines.push(`${label}: ${atk.name}${dmg ? " — " + dmg : ""}`);
    };
    fmtAtk(meleeAtk,  "Melee");
    fmtAtk(rangedAtk, "Ranged");
    if (atkLines.length) { lines.push(""); lines.push("**ATTACKS**"); atkLines.forEach(a => lines.push(a)); }

    // Features — support both legacy fields and features array
    const featList = Array.isArray(m.features) && m.features.length
        ? m.features
        : (m.feature_name ? [{
            name:     m.feature_name,
            type:     m.feature_type,
            range:    m.feature_range,
            damage:   m.feature_damage,
            duration: m.feature_duration,
            effect:   m.feature_effect,
          }] : []);

    featList.forEach(f => {
        const meta = [f.type, f.range, f.damage, f.duration].filter(Boolean).join(" · ");
        lines.push("");
        lines.push(`**${f.name || "Feature"}**${meta ? `  [${meta}]` : ""}`);
        if (f.effect) lines.push(stripHtml(f.effect));
    });

    // Spells
    if (Array.isArray(m.spells) && m.spells.length) {
        lines.push("");
        lines.push(`**SPELLS** (MN: ${ment * 2} max)`);
        m.spells.forEach(s => {
            const spellMeta = [s.manner, s.transmission].filter(Boolean).join(" · ");
            lines.push(`${s.name || "Spell"}${spellMeta ? ` (${spellMeta})` : ""}`);
            (s.effects || []).forEach(e => {
                const cost  = e.cost ?? "?";
                const parts = [
                    e.intent ? `${e.intent} (${cost} MN)` : null,
                    e.range  || null,
                    e.damage ? e.damage + (e.type ? " " + e.type : "") : null,
                ].filter(Boolean).join(" · ");
                lines.push(`  ${parts}${e.effect ? " — " + stripHtml(e.effect) : ""}`);
            });
        });
    }

    if (m.description) { lines.push(""); lines.push(stripHtml(m.description)); }

    const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    const flash = () => {
        btn.textContent  = "✓ Copied!";
        btn.disabled     = true;
        setTimeout(() => { btn.textContent = "✦ Chat"; btn.disabled = false; }, 2000);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(flash).catch(() => fallbackCopy(text, flash));
    else fallbackCopy(text, flash);
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
    card.classList.add("editing");

    const meleeAtk  = m.melee  || m.melee_attack  || {};
    const rangedAtk = m.ranged || m.ranged_attack  || {};

    const featList = Array.isArray(m.features) && m.features.length
        ? m.features
        : (m.feature_name ? [{ name: m.feature_name, type: m.feature_type,
                               range: m.feature_range, effect: m.feature_effect }] : []);

    // Builds one editable feature row (innerHTML only — values set via JS after)
    function featRowHtml() {
        return `<li class="ce-feat-row" style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.07)">
            <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-bottom:3px">
                <input class="ce-fi-name"  type="text" placeholder="Feature name" style="flex:1;min-width:80px;font-weight:600">
                <input class="ce-fi-type"  type="text" placeholder="Type"  style="width:72px">
                <input class="ce-fi-range" type="text" placeholder="Range" style="width:58px">
                <button class="ce-rm-feat" style="background:transparent;border:1px solid #6a2020;color:#c46060;border-radius:3px;padding:1px 6px;cursor:pointer;font-size:0.78em;flex-shrink:0">✕</button>
            </div>
            <textarea class="ce-fi-effect" rows="2" placeholder="Effect..." style="width:100%;resize:vertical"></textarea>
        </li>`;
    }

    card.innerHTML = `
        <button class="card-edit-cog" title="Cancel edit" style="color:#d46060;opacity:1">⚙</button>

        <input class="ce-name" type="text" placeholder="Name *"
            style="font-size:1.05em;font-weight:bold;width:100%;margin-bottom:7px">

        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
            <input class="ce-group"  type="text" placeholder="Group"  style="flex:1;min-width:80px">
            <input class="ce-origin" type="text" placeholder="Origin" style="flex:1;min-width:80px">
            <select class="ce-size"   style="flex:1">
                <option value="">— Size —</option>
                <option>Tiny</option><option>Small</option><option>Medium</option>
                <option>Large</option><option>Giant</option><option>Monolithic</option>
            </select>
            <select class="ce-rarity" style="flex:1">
                <option value="">— Rarity —</option>
                <option>Common</option><option>Uncommon</option><option>Rare</option>
                <option>Epic</option><option>Legendary</option>
            </select>
        </div>

        <textarea class="ce-description" rows="2" placeholder="Description..."
            style="width:100%;margin-bottom:6px;resize:vertical"></textarea>

        <div class="info-mon" style="flex-direction:column;gap:5px;margin-bottom:6px">
            <div style="display:flex;gap:5px;flex-wrap:wrap">
                <span><strong>Env</strong> <input class="ce-environment" type="text" style="width:88px"></span>
                <span><strong>Behav</strong> <input class="ce-behavior" type="text" style="width:88px"></span>
                <span><strong>Motiv</strong> <input class="ce-motivation" type="text" style="width:88px"></span>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
                <span><strong>Walk</strong> <input class="ce-walk"  type="number" min="0" style="width:46px"></span>
                <span><strong>Fly</strong>  <input class="ce-fly"   type="number" min="0" style="width:46px"></span>
                <span><strong>Swim</strong> <input class="ce-swim"  type="number" min="0" style="width:46px"></span>
                <span><strong>Climb</strong><input class="ce-climb" type="number" min="0" style="width:46px"></span>
            </div>
        </div>

        <div class="pl-chips" style="margin-bottom:6px">
            <div class="pl-bubble">
                <span class="pl-seg pl-seg-pl"><strong>PL</strong> <input class="ce-pl"       type="number" min="1" style="width:38px"></span>
                <span class="pl-seg pl-seg-ph"><strong>Ph</strong> <input class="ce-physical"  type="number" min="0" style="width:38px"></span>
                <span class="pl-seg pl-seg-mt"><strong>Mt</strong> <input class="ce-mental"    type="number" min="0" style="width:38px"></span>
            </div>
        </div>

        <div class="info-mon" style="flex-direction:column;gap:4px;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
                <strong style="width:52px">Melee:</strong>
                <input class="ce-melee-name"   type="text" placeholder="name"   style="flex:2;min-width:70px">
                <input class="ce-melee-damage" type="text" placeholder="dmg"    style="width:44px">
                <input class="ce-melee-type"   type="text" placeholder="type"   style="width:70px">
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
                <strong style="width:52px">Ranged:</strong>
                <input class="ce-ranged-name"   type="text" placeholder="name"   style="flex:2;min-width:70px">
                <input class="ce-ranged-damage" type="text" placeholder="dmg"    style="width:44px">
                <input class="ce-ranged-type"   type="text" placeholder="type"   style="width:70px">
            </div>
        </div>

        <div class="feature-block" style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                <span style="font-size:0.75em;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);opacity:0.7">Features</span>
                <button class="ce-add-feat" style="font-size:0.78em;background:transparent;border:1px solid var(--theme-3);color:var(--cream,#f0e6cc);border-radius:3px;padding:2px 8px;cursor:pointer">+ Add</button>
            </div>
            <ul class="ce-feats-list" style="padding:0;margin:0;list-style:none">
                ${featList.map(() => featRowHtml()).join("")}
            </ul>
        </div>

        <textarea class="ce-lore" rows="2" placeholder="Lore..."
            style="width:100%;font-style:italic;opacity:0.75;resize:vertical;margin-bottom:8px"></textarea>

        <div style="display:flex;gap:6px">
            <button class="ce-save button">Save</button>
            <button class="ce-cancel button" style="background:var(--theme-1)">Cancel</button>
        </div>
    `;

    // ── Populate via JS (no escaping needed) ──────────────────────────────────
    const q = s => card.querySelector(s);
    q(".ce-name").value        = m.name        || "";
    q(".ce-group").value       = m._group      || "";
    q(".ce-origin").value      = m.origin      || "";
    q(".ce-size").value        = m.size        || "";
    q(".ce-rarity").value      = m.rarity      || "";
    q(".ce-description").value = m.description || "";
    q(".ce-environment").value = m.environment || "";
    q(".ce-behavior").value    = m.behavior    || "";
    q(".ce-motivation").value  = m.motivation  || "";
    q(".ce-walk").value        = m.walk        || 0;
    q(".ce-fly").value         = m.fly         || 0;
    q(".ce-swim").value        = m.swim        || 0;
    q(".ce-climb").value       = m.climb       || 0;
    q(".ce-pl").value          = m.pl             ?? "";
    q(".ce-physical").value    = m.check_physical ?? "";
    q(".ce-mental").value      = m.check_mental   ?? "";
    q(".ce-melee-name").value   = meleeAtk.name   || "";
    q(".ce-melee-damage").value = meleeAtk.damage  || "";
    q(".ce-melee-type").value   = meleeAtk.type || meleeAtk.damage_type || "";
    q(".ce-ranged-name").value   = rangedAtk.name   || "";
    q(".ce-ranged-damage").value = rangedAtk.damage  || "";
    q(".ce-ranged-type").value   = rangedAtk.type || rangedAtk.damage_type || "";
    q(".ce-lore").value        = m.lore        || "";

    card.querySelectorAll(".ce-feat-row").forEach((li, i) => {
        const f = featList[i] || {};
        li.querySelector(".ce-fi-name").value   = f.name   || "";
        li.querySelector(".ce-fi-type").value   = f.type   || "";
        li.querySelector(".ce-fi-range").value  = f.range  || "";
        li.querySelector(".ce-fi-effect").value = f.effect || "";
    });

    // ── Cancel / cog ─────────────────────────────────────────────────────────
    const cancel = () => { card.classList.remove("editing"); card.replaceWith(createBookCard(m)); };
    q(".card-edit-cog").addEventListener("click", cancel);
    q(".ce-cancel").addEventListener("click", cancel);

    // ── Add / remove features ─────────────────────────────────────────────────
    const featsList = q(".ce-feats-list");
    function wireRemove(li) {
        li.querySelector(".ce-rm-feat").addEventListener("click", () => li.remove());
    }
    card.querySelectorAll(".ce-feat-row").forEach(wireRemove);
    q(".ce-add-feat").addEventListener("click", () => {
        const li = document.createElement("li");
        li.className = "ce-feat-row";
        li.style.cssText = "padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.07)";
        li.innerHTML = featRowHtml().replace(/^<li[^>]*>/, "").replace(/<\/li>$/, "");
        featsList.appendChild(li);
        wireRemove(li);
    });

    // ── Save ──────────────────────────────────────────────────────────────────
    q(".ce-save").addEventListener("click", () => {
        const get    = s => q(s)?.value.trim() || "";
        const getNum = s => { const v = parseInt(q(s)?.value); return isNaN(v) ? undefined : v; };

        const name = get(".ce-name");
        if (!name) { q(".ce-name").focus(); return; }

        const features = [];
        card.querySelectorAll(".ce-feat-row").forEach(li => {
            const n = li.querySelector(".ce-fi-name")?.value.trim()   || "";
            const e = li.querySelector(".ce-fi-effect")?.value.trim() || "";
            if (n || e) features.push({
                name:   n,
                type:   li.querySelector(".ce-fi-type")?.value.trim()  || undefined,
                range:  li.querySelector(".ce-fi-range")?.value.trim() || undefined,
                effect: e || undefined,
            });
        });

        const meleeName  = get(".ce-melee-name");
        const rangedName = get(".ce-ranged-name");

        const entry = {
            name,
            _group:         get(".ce-group")       || undefined,
            origin:         get(".ce-origin")      || undefined,
            size:           get(".ce-size")        || undefined,
            rarity:         get(".ce-rarity")      || undefined,
            environment:    get(".ce-environment") || undefined,
            behavior:       get(".ce-behavior")    || undefined,
            motivation:     get(".ce-motivation")  || undefined,
            description:    get(".ce-description") || undefined,
            lore:           get(".ce-lore")        || undefined,
            pl:             getNum(".ce-pl"),
            check_physical: getNum(".ce-physical"),
            check_mental:   getNum(".ce-mental"),
            walk:           getNum(".ce-walk"),
            fly:            getNum(".ce-fly"),
            swim:           getNum(".ce-swim"),
            climb:          getNum(".ce-climb"),
            melee_attack:   meleeName  ? { name: meleeName,  damage: get(".ce-melee-damage"),  damage_type: get(".ce-melee-type")  } : undefined,
            ranged_attack:  rangedName ? { name: rangedName, damage: get(".ce-ranged-damage"), damage_type: get(".ce-ranged-type") } : undefined,
            features:       features.length ? features : undefined,
        };
        Object.keys(entry).forEach(k => { if (entry[k] === undefined) delete entry[k]; });

        card.classList.remove("editing");

        if (m._custom) {
            const custom = getCustomEntries();
            const idx = custom.findIndex(e => e.name === m.name);
            if (idx !== -1) custom[idx] = entry; else custom.push(entry);
            saveCustomEntries(custom);
            const bookEntry = { ...entry, _custom: true };
            const bi = bookData.findIndex(e => e._custom && e.name === m.name);
            if (bi !== -1) bookData[bi] = bookEntry;
            const fi = bookFiltered.findIndex(e => e._custom && e.name === m.name);
            if (fi !== -1) bookFiltered[fi] = bookEntry;
            card.replaceWith(createBookCard(bookEntry));
        } else {
            const existing = bookData.find(e => !e._custom && e.name === m.name) || {};
            const merged = { ...existing, ...entry };
            const overrides = getOverrides();
            if (name !== m.name) delete overrides[m.name];
            overrides[name] = entry;
            saveOverrides(overrides);
            const bi = bookData.findIndex(e => !e._custom && e.name === m.name);
            if (bi !== -1) bookData[bi] = merged;
            const fi = bookFiltered.findIndex(e => !e._custom && e.name === m.name);
            if (fi !== -1) bookFiltered[fi] = merged;
            card.replaceWith(createBookCard(merged));
        }
    });
}

function deleteCustomMonster(name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const custom = getCustomEntries().filter(m => m.name !== name);
    saveCustomEntries(custom);
    loadMonsterBook();
}

function exportMonsterBook() {
    // Export the full book (base + overrides + custom), stripped of internal flags
    const clean = bookData.map(({ _custom, ...m }) => m);
    const blob = new Blob([JSON.stringify(clean, null, 4)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "monsterbook.json";
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
