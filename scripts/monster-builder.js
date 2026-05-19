// monster-builder.js
document.addEventListener('DOMContentLoaded', () => {
    const $ = s => document.querySelector(s);
    const rand = arr => arr[Math.floor(Math.random() * arr.length)];
    const nonEmpty = v => v !== undefined && v !== null && String(v).trim() !== "";
    const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);

    const originClass = o => {
        const k = String(o || "none").trim().toLowerCase();
        return ["basic","arcane","tech","crystal","nature","vozian","chrono","chaos","life","elemental","dragon","celestial","none"]
            .includes(k) ? k : "none";
    };

    const STORAGE_KEY = "c20_monsters_v2";
    let saveTimer = null;
    const debounce = (fn, ms = 400) => (...args) => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fn(...args), ms); };

    // ── UI refs ──
    const btnGenerate    = $("#btnGenerate");
    const btnClearAll    = $("#btnClearAll");
    const chkRandBase    = $("#chkRandomBase");
    const chkRandMod     = $("#chkRandomMod");
    const selBase        = $("#selBase");
    const selMod         = $("#selMod");
    const chkConcatName  = $("#chkConcatName");
    const filterRarity   = $("#filterRarity");
    const filterSize     = $("#filterSize");
    const filterBaseOrigin = $("#filterBaseOrigin");
    const filterModOrigin  = $("#filterModOrigin");

    let outGrid = $("#monsterOutput");
    let DATA = { base: [], mod: [] };

    // ── Load data ──
    Promise.all([
        fetch("data/monsterbase.json", { cache: "no-store" }).then(r => r.json()),
        fetch("data/monstermod.json",  { cache: "no-store" }).then(r => r.json())
    ]).then(([bases, mods]) => {
        DATA.base = bases;
        DATA.mod  = mods;
        populateFilters();
        populateSelectors();
        wireEvents();
        loadFromStorage();
    }).catch(err => console.error("[monster-builder] Failed to load data:", err));

    // ── Filters ──
    function populateFilters() {
        fillFilter(filterRarity,    DATA.base, "rarity");
        fillFilter(filterSize,      DATA.base, "size");
        fillFilter(filterBaseOrigin, DATA.base, "origin");
        fillFilter(filterModOrigin,  DATA.mod,  "origin");
    }

    function fillFilter(sel, arr, key) {
        if (!sel) return;
        const vals = [...new Set(arr.map(e => e[key]).filter(nonEmpty))].sort();
        sel.innerHTML = `<option value="">Any</option>` +
            vals.map(v => `<option value="${v}">${cap(v)}</option>`).join("");
    }

    function filteredBases() {
        const rar = filterRarity?.value   || "";
        const sz  = filterSize?.value     || "";
        const ori = filterBaseOrigin?.value || "";
        const pool = DATA.base.filter(b =>
            (!rar || b.rarity  === rar) &&
            (!sz  || b.size    === sz)  &&
            (!ori || b.origin  === ori)
        );
        return pool.length ? pool : DATA.base;
    }

    function filteredMods() {
        const ori = filterModOrigin?.value || "";
        const pool = DATA.mod.filter(m => !ori || m.origin === ori);
        return pool.length ? pool : DATA.mod;
    }

    // ── Selectors ──
    function populateSelectors() {
        repopulateBase();
        repopulateMod();
        togglePickers();
        [filterRarity, filterSize, filterBaseOrigin].forEach(f =>
            f?.addEventListener("change", () => { repopulateBase(); })
        );
        filterModOrigin?.addEventListener("change", repopulateMod);
    }

    function repopulateBase() {
        if (!selBase) return;
        const pool = filteredBases();
        selBase.innerHTML = pool.map((b, i) => {
            const idx = DATA.base.indexOf(b);
            return `<option value="${idx}">${b.name}${b.baseType ? " — " + b.baseType : ""}</option>`;
        }).join("");
    }

    function repopulateMod() {
        if (!selMod) return;
        const pool = filteredMods();
        selMod.innerHTML = pool.map((m, i) => {
            const idx = DATA.mod.indexOf(m);
            return `<option value="${idx}">${m.name} (${m.environment || m.origin})</option>`;
        }).join("");
    }

    function togglePickers() {
        if (selBase) selBase.disabled = !!chkRandBase?.checked;
        if (selMod)  selMod.disabled  = !!chkRandMod?.checked;
    }

    // ── Wire events ──
    function wireEvents() {
        chkRandBase?.addEventListener("change", togglePickers);
        chkRandMod?.addEventListener("change", togglePickers);

        btnGenerate?.addEventListener("click", () => {
            const base = pickBase();
            const mod  = pickMod();
            const composed = compose(base, mod);
            outGrid.prepend(renderCard(composed));
            autosaveNow();
        });

        btnClearAll?.addEventListener("click", () => { outGrid.replaceChildren(); autosaveNow(); });
    }

    // ── Pick ──
    function pickBase() {
        if (!DATA.base.length) return {};
        if (!selBase || chkRandBase?.checked) return rand(filteredBases());
        const idx = Number(selBase.value);
        return DATA.base[idx] ?? rand(filteredBases());
    }

    function pickMod() {
        if (!DATA.mod.length) return null;
        if (!selMod || chkRandMod?.checked) return rand(filteredMods());
        const idx = Number(selMod.value);
        return DATA.mod[idx] ?? rand(filteredMods());
    }

    // ── Compose ──
    function compose(base, mod) {
        const concat = chkConcatName ? !!chkConcatName.checked : true;
        const baseName = base?.name || "Creature";
        const modName  = mod?.name  || "";

        const name = (concat && modName) ? `${modName} ${baseName}` : baseName;

        const origins = [...new Set(
            [base?.origin, mod?.origin].filter(nonEmpty).map(s => s.trim().toLowerCase())
        )];

        // Movement: base is absolute, mod is delta
        const movement = { ...(base?.movement || { walk: 30 }) };
        if (mod?.movementMod) {
            for (const k of Object.keys(mod.movementMod)) {
                movement[k] = (movement[k] || 0) + mod.movementMod[k];
            }
        }
        for (const k of Object.keys(movement)) {
            if (movement[k] <= 0) delete movement[k];
        }

        // Attacks: mod overrides base (null on mod = keep base's)
        const melee  = mod?.melee  !== undefined ? mod.melee  : base?.melee  || null;
        const ranged = mod?.ranged !== undefined ? mod.ranged : base?.ranged || null;
        const spell  = mod?.spell  !== undefined ? mod.spell  : base?.spell  || null;

        // Features: base first, then mod (tagged so card can style differently)
        const baseFeatures = (base?.features || []).map(f => ({ ...f, _src: "base" }));
        const modFeatures  = (mod?.features  || []).map(f => ({ ...f, _src: "mod" }));
        const features = [...baseFeatures, ...modFeatures];

        // Spells: merged
        const spells = [...(base?.spells || []), ...(mod?.spells || [])];

        return {
            name,
            baseName,
            modName,
            baseType:    base?.baseType    || "",
            origins,
            size:        base?.size        || "Medium",
            rarity:      base?.rarity      || "Common",
            behavior:    base?.behavior    || "",
            environment: mod?.environment  || "",
            lairType:    mod?.lairType     || "",
            motivation:  mod?.motivation   || "",
            description: base?.description || "",
            movement,
            melee,
            ranged,
            spell,
            features,
            spells,
        };
    }

    // ── Render card ──
    function renderCard(mon) {
        const el = document.createElement("div");
        el.className = "monster-card";

        const originPills = mon.origins.map(o =>
            `<span class="origin-tag ${originClass(o)}">${esc(cap(o))}</span>`
        ).join("");

        const moveText = buildMoveText(mon.movement);

        const attacksHTML = buildAttacksHTML(mon);

        const infoRows = [
            mon.behavior    && `<span><strong>Behavior:</strong> ${esc(mon.behavior)}</span>`,
            mon.environment && `<span><strong>Env:</strong> ${esc(mon.environment)}</span>`,
            mon.lairType    && `<span><strong>Lair:</strong> ${esc(mon.lairType)}</span>`,
        ].filter(Boolean).join("");

        const motivationHTML = mon.motivation
            ? `<p class="mon-motivation"><em>${esc(mon.motivation)}</em></p>` : "";

        const featuresHTML = mon.features.length ? `
            <div class="feature-block">
                <ul class="features">${mon.features.map(f => {
                    const meta = [f.type || f.action, f.range, f.duration, f.damage].filter(nonEmpty).join(" · ");
                    const text = `<strong>${esc(f.name)}</strong>${meta ? ` <span class="feat-meta">(${esc(meta)})</span>` : ""}${f.effect ? `: ${esc(f.effect)}` : ""}`;
                    return `<li class="${f._src === "mod" ? "mod-line" : ""}" contenteditable="true">${text}</li>`;
                }).join("")}</ul>
            </div>` : "";

        const spellsHTML = mon.spells.length ? `
            <div class="mon-spells"><strong>Spells:</strong> ${mon.spells.map(s => esc(s.name || s)).join(", ")}</div>` : "";

        el.innerHTML = `
            <div class="origin-pill-row">${originPills}</div>
            <h3 class="title" contenteditable="true">${esc(mon.name)}</h3>
            <div class="pillline" contenteditable="true">${esc([mon.baseType, mon.size, mon.rarity].filter(nonEmpty).join(" · "))}</div>
            ${mon.description ? `<p class="mon-meta" contenteditable="true">${esc(mon.description)}</p>` : ""}
            <div class="info-mon">
                <span><strong>Move:</strong> ${esc(moveText)}</span>
                ${infoRows}
            </div>
            ${attacksHTML}
            ${motivationHTML}
            ${featuresHTML}
            ${spellsHTML}
            <div class="button-row">
                <button class="secondary btn-copy">Copy</button>
                <button class="secondary btn-add-book">Add to Book</button>
                <button class="ghost btn-remove">Remove</button>
            </div>
        `.trim();

        el.__mon = mon;

        el.querySelector(".btn-remove")?.addEventListener("click", () => { el.remove(); autosaveNow(); });

        el.querySelector(".btn-add-book")?.addEventListener("click", e => {
            if (typeof window.addToBookFromGenerator === "function") {
                const live = captureEdits(el, mon);
                window.addToBookFromGenerator(live);
                const btn = e.currentTarget;
                btn.textContent = "Added!";
                btn.disabled = true;
                setTimeout(() => { btn.textContent = "Add to Book"; btn.disabled = false; }, 1500);
            }
        });

        el.querySelector(".btn-copy")?.addEventListener("click", async () => {
            const text = buildCopyText(el, mon);
            try { await navigator.clipboard.writeText(text); } catch {}
        });

        el.addEventListener("input", debounce(autosaveNow, 400));
        return el;
    }

    function buildMoveText(movement) {
        const labels = { walk: "Walk", fly: "Fly", swim: "Swim", climb: "Climb", burrow: "Burrow" };
        return Object.entries(movement)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${labels[k] || k}: ${v} ft`)
            .join(", ") || "—";
    }

    function buildAttacksHTML(mon) {
        const atk = (label, a) => {
            if (!a?.name) return `<span class="atk-empty"><strong>${label}:</strong> —</span>`;
            const dmg = [a.damage, a.type].filter(nonEmpty).join(" ");
            return `<span><strong>${label}:</strong> ${esc(a.name)}${dmg ? ` — ${esc(dmg)}` : ""}</span>`;
        };
        const any = mon.melee?.name || mon.ranged?.name || mon.spell?.name;
        if (!any && !mon.melee && !mon.ranged && !mon.spell) return "";
        return `<div class="info-mon attacks-block">
            ${atk("Melee",  mon.melee)}
            ${atk("Ranged", mon.ranged)}
            ${atk("Spell",  mon.spell)}
        </div>`;
    }

    function captureEdits(el, mon) {
        return {
            ...mon,
            name:        el.querySelector(".title")?.textContent.trim()   || mon.name,
            description: el.querySelector(".mon-meta")?.textContent.trim() || mon.description,
        };
    }

    function buildCopyText(el, mon) {
        const lines = [];
        lines.push(el.querySelector(".title")?.textContent.trim() || mon.name);
        lines.push(el.querySelector(".pillline")?.textContent.trim() || "");
        if (mon.description) lines.push(el.querySelector(".mon-meta")?.textContent.trim() || "");
        const infoSpans = [...el.querySelectorAll(".info-mon span")];
        infoSpans.forEach(s => lines.push(s.textContent.trim()));
        if (mon.motivation) lines.push(`Motivation: ${mon.motivation}`);
        [...el.querySelectorAll(".features li")].forEach(li => lines.push(`• ${li.textContent.trim()}`));
        return lines.filter(Boolean).join("\n");
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[c])
        );
    }

    // ── Save / Load ──
    function snapshotCard(el) {
        return {
            mon: el.__mon || null,
            edits: {
                title: el.querySelector(".title")?.textContent || "",
                pill:  el.querySelector(".pillline")?.textContent || "",
                desc:  el.querySelector(".mon-meta")?.textContent || "",
            }
        };
    }

    function restoreCard(snap) {
        const card = renderCard(snap.mon || {});
        if (snap.edits) {
            const set = (sel, val) => { const n = card.querySelector(sel); if (n && val) n.textContent = val; };
            set(".title",   snap.edits.title);
            set(".pillline", snap.edits.pill);
            set(".mon-meta", snap.edits.desc);
        }
        return card;
    }

    function autosaveNow() {
        const payload = [...document.querySelectorAll(".monster-card")].map(snapshotCard);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) { console.warn("[monster-builder] save failed:", e); }
    }

    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return;
            outGrid.replaceChildren();
            arr.forEach(snap => outGrid.appendChild(restoreCard(snap)));
        } catch (e) { console.warn("[monster-builder] load failed:", e); }
    }
});
