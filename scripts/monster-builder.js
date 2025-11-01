// monster-builder.js
document.addEventListener('DOMContentLoaded', () => {
    const $ = (s) => document.querySelector(s);
    const ce = (t) => document.createElement(t);
    const nonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== "";
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const btnGenerate = $("#btnGenerate");
    const btnClearAll = $("#btnClearAll");
    const chkRandomBase = $("#chkRandomBase");
    const chkRandomAdd = $("#chkRandomAdd");
    const selBase = $("#selBase");
    const selAdd = $("#selAdd");
    const chkConcatName = $("#chkConcatName");
    const chkNumbersAdd = $("#chkNumbersAdd");

    const BASE_MOVE = 30;
    const ZERO = 0;

    const originClass = (o) => {
        const k = String(o || "none").trim().toLowerCase();
        return ["basic", "arcane", "tech", "crystal", "nature", "vozian", "chrono", "chaos", "life", "elemental", "dragon", "celestial", "none"].includes(k) ? k : "none";
    };

    const STORAGE_KEY = "c20_monsters_v1";
    let saveTimer = null;
    const debounce = (fn, ms = 400) => (...args) => { clearTimeout(saveTimer); saveTimer = setTimeout(() => fn(...args), ms); };

    let outGrid = $("#monster-output") || $("#monsterOutput");
    if (!outGrid) {
        outGrid = ce("div");
        outGrid.id = "monster-output";
        outGrid.className = "monster-grid";
        ($("main") || document.body).appendChild(outGrid);
    }

    const PRIMARY_URL = "data/monstertype.json";
    const FALLBACK_URL = "./monstertype.json";
    let DATA = { base: [], add: [] };

    loadData(PRIMARY_URL).catch(() => loadData(FALLBACK_URL)).then(() => { populateSelectors(); wire(); loadFromStorage(); })
        .catch(err => console.error("[monster] Failed to load monstertype.json:", err));

    async function loadData(url) {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        const json = await res.json();

        if (Array.isArray(json)) {
            DATA.base = json.map(normalize);
            DATA.add = [];
        } else {
            DATA.base = Array.isArray(json.base) ? json.base.map(normalize) : [];
            DATA.add = Array.isArray(json.add) ? json.add.map(normalize) : [];
        }
    }

    function normalize(row) {
        const r = { ...row };
        for (const k of Object.keys(r)) if (typeof r[k] === "string" && r[k].trim() === "") r[k] = undefined;

        r.name ??= "";
        r.baseType ??= "";
        r.origin ??= "none";
        r.description ??= "";
        r.size ??= "Medium";
        r.environment ??= "Prime";
        r.behavior ??= "Neutral";
        r.rarity ??= "Common";

        r.featureName ??= "";
        r.featureEffect ??= "";
        r.featureAction ??= "Action";
        r.featureRange ??= "";
        r.featureDuration ??= "Instant";
        r.featureDamage ??= "";

        r.movement = nonEmpty(r.movement) ? r.movement : undefined;
        r.fly = nonEmpty(r.fly) ? r.fly : undefined;
        r.swim = nonEmpty(r.swim) ? r.swim : undefined;
        r.climb = nonEmpty(r.climb) ? r.climb : undefined;
        r.burrow = nonEmpty(r.burrow) ? r.burrow : undefined;

        return r;
    }

    function populateSelectors() {
        fill(selBase, DATA.base);
        fill(selAdd, DATA.add);
        togglePickers();
    }
    function fill(select, list) {
        if (!select) return;
        select.innerHTML = "";
        list.forEach((m, i) => {
            const label = [m.name, m.baseType].filter(Boolean).join(" — ");
            select.add(new Option(label || `(Unnamed ${i})`, String(i)));
        });
    }
    function togglePickers() {
        if (selBase) selBase.disabled = chkRandomBase ? !!chkRandomBase.checked : true;
        if (selAdd) selAdd.disabled = (chkRandomAdd ? !!chkRandomAdd.checked : true) || DATA.add.length === 0;
    }

    function wire() {
        chkRandomBase?.addEventListener("change", togglePickers);
        chkRandomAdd?.addEventListener("change", togglePickers);

        btnGenerate?.addEventListener("click", () => {
            const base = pickBase();
            const add = pickAdd();
            const composed = compose(base, add, {
                concatName: chkConcatName ? !!chkConcatName.checked : true,
                numbersAdd: chkNumbersAdd ? !!chkNumbersAdd.checked : true
            });
            outGrid.prepend(renderCard(composed));
            autosaveNow();
        });

        btnClearAll?.addEventListener("click", () => { outGrid.replaceChildren(); autosaveNow(); });
    }

    function pickBase() {
        if (!DATA.base.length) return {};
        if (!selBase || chkRandomBase?.checked) return rand(DATA.base);
        const idx = Number(selBase.value) || 0;
        return DATA.base[idx] || DATA.base[0];
    }
    function pickAdd() {
        if (!DATA.add.length) return null;
        if (!selAdd || chkRandomAdd?.checked) return rand(DATA.add);
        const raw = selAdd.value;
        if (raw === "" || raw == null) return null;
        const idx = Number(raw);
        return Number.isFinite(idx) ? (DATA.add[idx] ?? null) : null;
    }

    function compose(base, add, opts) {
        const concatName = opts?.concatName !== false;
        const numbersAdd = opts?.numbersAdd !== false;

        const name = (concatName && nonEmpty(base?.name) && nonEmpty(add?.name))
            ? `${base.name} ${add.name}`
            : (base?.name || add?.name || "Unnamed Creature");

        const origins = [base?.origin, add?.origin]
            .filter(nonEmpty)
            .map(s => String(s).trim())
            .filter((v, i, a) => a.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i);

        const infoLine = joinDistinct([base?.baseType, add?.baseType], " + ");
        const description = [base?.description, add?.description].filter(nonEmpty).join(" ");
        const movementText = buildMovementLine(base, add, numbersAdd);
        const environment = joinDistinct([base?.environment, add?.environment], " / ") || "—";
        const behavior = joinDistinct([base?.behavior, add?.behavior], " / ") || "—";
        const rarity = joinDistinct([base?.rarity, add?.rarity], " / ") || "—";
        const size = joinDistinct([base?.size, add?.size], " / ") || "—";

        const features = [];
        const bf = featureLine(base, false);
        const af = featureLine(add, true);
        if (bf) features.push(bf);
        if (af) features.push(af);

        return { name, origins, infoLine, description, movementText, environment, behavior, rarity, size, features };
    }

    function joinDistinct(vals, sep = " ") {
        const arr = vals.filter(nonEmpty).map(s => String(s).trim());
        if (!arr.length) return "";
        const lower = arr.map(s => s.toLowerCase());
        return lower.length === 2 && lower[0] === lower[1] ? arr[0] : arr.join(sep);
    }

    function buildMovementLine(base, add, numbersAdd) {
        const modes = ["movement", "fly", "swim", "climb", "burrow"];
        const b = coerceMove(base);
        const a = coerceMove(add);
        const out = {};

        for (const m of modes) {
            const bv = b[m], av = a[m];
            const nb = isFinite(bv), na = isFinite(av);
            if (nb || na) {
                const val = numbersAdd ? ((+bv || 0) + (+av || 0)) : (na ? +av : (+bv || 0));
                if (val) out[m] = val;
            } else {
                const phrase = preferPhrase(bv, av);
                if (phrase) out[m] = phrase;
            }
        }

        const parts = [];
        if (out.movement) parts.push(modeText("Walk", out.movement));
        if (out.fly) parts.push(modeText("Fly", out.fly));
        if (out.swim) parts.push(modeText("Swim", out.swim));
        if (out.climb) parts.push(modeText("Climb", out.climb));
        if (out.burrow) parts.push(modeText("Burrow", out.burrow));

        return `Movement: ${parts.length ? parts.join(", ") : "—"}`;
    }

    function coerceMove(row = {}) {
        const out = {};
        const walkRaw = nonEmpty(row.movement) ? row.movement : BASE_MOVE;
        const walk = toNum(walkRaw, BASE_MOVE);
        out.movement = isFinite(walk) ? walk : BASE_MOVE;

        for (const m of ["fly", "swim", "climb", "burrow"]) {
            const raw = nonEmpty(row[m]) ? row[m] : ZERO;
            const num = toNum(raw, out.movement);
            if (isFinite(num)) out[m] = num;
            else {
                const phrase = normalizePhrase(String(raw), out.movement);
                if (phrase) out[m] = phrase;
            }
        }
        return out;
    }

    function toNum(v, walk) {
        if (v == null) return NaN;
        if (typeof v === "number" && isFinite(v)) return v;
        const s = String(v).trim().toLowerCase();
        if (/^\d+$/.test(s)) return Number(s);
        if (isFinite(walk)) {
            if (s.includes("equal to movement")) return walk;
            if (s.includes("half") && s.includes("movement")) return Math.floor(walk / 2);
            if (s.includes("double") && s.includes("movement")) return walk * 2;
        }
        return NaN;
    }
    function normalizePhrase(s, walk) {
        const t = s.trim().toLowerCase();
        if (t === "none") return "";
        if (t === "hover") return "Hover";
        if (!isFinite(walk)) return cap(s);
        if (t.includes("equal to movement")) return walk;
        if (t.includes("half") && t.includes("movement")) return Math.floor(walk / 2);
        if (t.includes("double") && t.includes("movement")) return walk * 2;
        return cap(s);
    }
    function preferPhrase(a, b) {
        const A = nonEmpty(a) ? String(a).trim() : "";
        const B = nonEmpty(b) ? String(b).trim() : "";
        if (!A && !B) return "";
        if (!B) return pretty(A);
        if (!A) return pretty(B);
        if (B.toLowerCase() === "none") return pretty(A);
        return pretty(B);
    }
    function pretty(v) { return v === "none" ? "" : cap(v); }
    function modeText(label, v) { return isFinite(v) ? `${label}: ${v} ft` : `${label}: ${v}`; }
    const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

    function featureLine(src, isAdd) {
        if (!src) return null;
        const any = [src.featureName, src.featureEffect, src.featureAction, src.featureRange, src.featureDuration, src.featureDamage].some(nonEmpty);
        if (!any) return null;

        const name = nonEmpty(src.featureName) ? src.featureName : (isAdd ? "Add Feature" : "Feature");
        const meta = [src.featureAction, src.featureRange, src.featureDuration, src.featureDamage].filter(nonEmpty);
        const metaTxt = meta.length ? ` (${meta.join(" · ")})` : "";
        const eff = nonEmpty(src.featureEffect) ? `: ${src.featureEffect}` : "";

        return { text: `${name}${metaTxt}${eff}`, isAdd: !!isAdd };
    }

    function renderCard(mon) {
        const el = document.createElement("div");
        el.className = "monster-card";
        el.style.position = "relative";

        const originPills = (mon.origins || []).map((o, i) =>
            `<span class="origin-tag ${originClass(o)}" style="top:${2 + i * 2}rem; right:1rem;">${esc(o)}</span>`
        ).join("");

        const featuresHTML = (mon.features?.length
            ? `<div class="feature-block"><ul class="features">${mon.features.map(f => `<li ${f.isAdd ? 'class="add-line"' : ''} contenteditable="true">${esc(f.text)}</li>`).join("")
            }</ul></div>`
            : "");

        const infoBlock = `
      <div class="info-mon">
        <span><strong>Move:</strong> ${esc(mon.movementText)}</span>
        <span><strong>Env:</strong> ${esc(mon.environment)}</span>
        <span><strong>Behav:</strong> ${esc(mon.behavior)}</span>
        <span><strong>Rarity:</strong> ${esc(mon.rarity)}</span>
        <span><strong>Size:</strong> ${esc(mon.size)}</span>
      </div>
    `;

        el.innerHTML = `
      ${originPills}
      <h3 class="title" contenteditable="true">${esc(mon.name)}</h3>
      ${mon.infoLine ? `<div class="pillline" contenteditable="true">${esc(mon.infoLine)}</div>` : ""}
      ${mon.description ? `<p class="mon-meta" contenteditable="true">${esc(mon.description)}</p>` : ""}
      ${infoBlock}
      ${featuresHTML}
      <div class="button-row">
        <button class="secondary btn-copy">Copy</button>
        <button class="ghost btn-remove">Remove</button>
      </div>
    `.trim();

        el.__mon = mon;
        el.querySelector(".btn-remove")?.addEventListener("click", () => { el.remove(); autosaveNow(); });
        el.querySelector(".btn-copy")?.addEventListener("click", async () => {
            const text = [
                el.querySelector(".title")?.textContent.trim(),
                el.querySelector(".pillline")?.textContent.trim(),
                ...[...el.querySelectorAll(".mon-meta")].map(p => p.textContent.trim()),
                ...[...el.querySelectorAll(".info-mon span")].map(s => s.textContent.trim()),
                ...[...el.querySelectorAll(".features li")].map(li => `• ${li.textContent.trim()}`)
            ].filter(Boolean).join("\n");
            try { await navigator.clipboard.writeText(text); } catch { }
        });

        el.addEventListener("input", debounce(autosaveNow, 400));
        return el;
    }

    function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[c])); }

    /* ---------- Save/Load ---------- */
    function snapshotCard(el) {
        return {
            mon: el.__mon || null,
            edits: {
                title: el.querySelector(".title")?.textContent || "",
                pill: el.querySelector(".pillline")?.textContent || "",
                desc: el.querySelector(".mon-meta")?.textContent || "",
                info: [...el.querySelectorAll(".info-mon span")].map(s => s.textContent || ""),
                features: [...el.querySelectorAll(".features li")].map(li => li.textContent || "")
            }
        };
    }
    function restoreCard(snap) {
        const card = renderCard(snap.mon || compose({}, null, {}));
        if (snap.edits) {
            const set = (sel, val) => { const n = card.querySelector(sel); if (n && val != null) n.textContent = val; };
            set(".title", snap.edits.title);
            set(".pillline", snap.edits.pill);
            set(".mon-meta", snap.edits.desc);

            const spans = [...card.querySelectorAll(".info-mon span")];
            if (spans.length && Array.isArray(snap.edits.info)) {
                snap.edits.info.forEach((val, i) => { if (spans[i]) spans[i].lastChild.nodeValue = " " + val.split(/:\s*/).pop(); });
            }
            const lis = [...card.querySelectorAll(".features li")];
            snap.edits.features.forEach((t, i) => { if (lis[i]) lis[i].textContent = t; });
        }
        return card;
    }
    function autosaveNow() {
        const cards = [...document.querySelectorAll(".monster-card")];
        const payload = cards.map(snapshotCard);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) { console.warn("[monster] save failed:", e); }
    }
    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return;
            outGrid.replaceChildren();
            arr.forEach(snap => outGrid.appendChild(restoreCard(snap)));
        } catch (e) { console.warn("[monster] load failed:", e); }
    }
    function exportMonsters() {
        try {
            const blob = new Blob([localStorage.getItem(STORAGE_KEY) || "[]"], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "monsters.json";
            document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
        } catch (e) { console.warn("[monster] export failed:", e); }
    }
    function importMonsters(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try { localStorage.setItem(STORAGE_KEY, reader.result); loadFromStorage(); }
            catch (e) { console.warn("[monster] import failed:", e); }
        };
        reader.readAsText(file);
    }

    // Optional external hooks if you add buttons in HTML:
    $("#btnSaveAll")?.addEventListener("click", autosaveNow);
    $("#btnLoadAll")?.addEventListener("click", loadFromStorage);
    $("#btnExport")?.addEventListener("click", exportMonsters);
    $("#fileImport")?.addEventListener("change", e => importMonsters(e.target.files[0]));
});
