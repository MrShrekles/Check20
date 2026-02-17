/* Active Sheet (mobile-first runner template)
   - Bottom nav panel switching
   - Resource +/- controls
   - Conditions chips
   - Roll drawer open/close
   - Simple roll + logs (stub; plug in your real roller later)
*/

const state = {
    resources: {
        hp: { current: 0, max: 0 },
        armor: { current: 0, max: 0 },
        sp: { current: 0, max: 0 },
    },
    conditions: [
        "Injured", "Bleeding", "Burning", "Poisoned", "Stunned",
        "Frightened", "Hidden", "Prone", "Grappled"
    ],
    activeConditions: new Set(),
    quickChecks: [
        { key: "Agi", label: "Agility", mod: 0 },
        { key: "Str", label: "Strength", mod: 0 },
        { key: "Obs", label: "Observation", mod: 0 },
        { key: "Int", label: "Intellect", mod: 0 },
        { key: "Inf", label: "Influence", mod: 0 },
        { key: "Lck", label: "Luck", mod: 0 },
    ],
    rollLog: [],       // main
    miniRollLog: [],   // drawer session
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
    cacheEls();
    bindNav();
    bindResources();
    renderConditions();
    renderQuickChecks();
    bindDrawer();
    bindEdit();
    syncUI();
});

function cacheEls() {
    els.panels = {
        play: document.getElementById("panel-play"),
        actions: document.getElementById("panel-actions"),
        checks: document.getElementById("panel-checks"),
        gear: document.getElementById("panel-gear"),
        edit: document.getElementById("panel-edit"),
    };

    els.navBtns = Array.from(document.querySelectorAll(".nav-btn"));
    els.fabRoll = document.getElementById("fab-roll");

    els.hpCur = document.getElementById("hp-current");
    els.hpMax = document.getElementById("hp-max");
    els.armorCur = document.getElementById("armor-current");
    els.armorMax = document.getElementById("armor-max");
    els.spCur = document.getElementById("sp-current");
    els.spMax = document.getElementById("sp-max");

    els.conditionsRow = document.getElementById("conditions-row");
    els.quickChecks = document.getElementById("quick-checks");

    els.rollDrawer = document.getElementById("roll-drawer");
    els.rollLabel = document.getElementById("roll-label");
    els.rollMod = document.getElementById("roll-mod");
    els.btnRoll = document.getElementById("btn-roll");
    els.miniLog = document.getElementById("mini-roll-log");

    els.mainLog = document.getElementById("roll-log");

    els.btnClearConditions = document.getElementById("btn-clear-conditions");
    els.btnClearLog = document.getElementById("btn-clear-log");
    els.btnClearMiniLog = document.getElementById("btn-clear-mini-log");

    els.nameInput = document.getElementById("char-name");
    els.levelInput = document.getElementById("char-level");
    els.hpMaxInput = document.getElementById("hp-max-input");
    els.armorMaxInput = document.getElementById("armor-max-input");
    els.spMaxInput = document.getElementById("sp-max-input");
    els.btnSaveEdit = document.getElementById("btn-save-edit");
}

function bindNav() {
    els.navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const nav = btn.dataset.nav;
            setActivePanel(nav);
        });
    });
}

function setActivePanel(key) {
    Object.entries(els.panels).forEach(([k, el]) => {
        el.classList.toggle("is-active", k === key);
    });
    els.navBtns.forEach(b => b.classList.toggle("is-active", b.dataset.nav === key));
}

function bindResources() {
    // Resource pills use event delegation
    document.querySelector(".resource-strip").addEventListener("click", (e) => {
        const btn = e.target.closest(".pill-btn");
        if (!btn) return;

        const pill = e.target.closest(".resource-pill");
        if (!pill) return;

        const resKey = pill.dataset.resource;
        const action = btn.dataset.action;

        const res = state.resources[resKey];
        if (!res) return;

        if (action === "inc") res.current = Math.min(res.current + 1, res.max);
        if (action === "dec") res.current = Math.max(res.current - 1, 0);

        syncUI();
        pushRollLog(`Adjusted ${resKey.toUpperCase()} to ${res.current}/${res.max}`);
    });
}

function renderConditions() {
    els.conditionsRow.innerHTML = "";
    state.conditions.forEach(name => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = name;
        b.setAttribute("aria-pressed", "false");

        b.addEventListener("click", () => {
            if (state.activeConditions.has(name)) {
                state.activeConditions.delete(name);
                b.setAttribute("aria-pressed", "false");
            } else {
                state.activeConditions.add(name);
                b.setAttribute("aria-pressed", "true");
            }
        });

        els.conditionsRow.appendChild(b);
    });

    els.btnClearConditions.addEventListener("click", () => {
        state.activeConditions.clear();
        renderConditions();
    });
}

function renderQuickChecks() {
    els.quickChecks.innerHTML = "";
    state.quickChecks.forEach(chk => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "quick-btn";
        b.innerHTML = `<span>${chk.label}</span><small>${fmtSigned(chk.mod)}</small>`;

        b.addEventListener("click", () => {
            els.rollLabel.value = `${chk.label} Check`;
            els.rollMod.value = chk.mod;
            openDrawer();
        });

        els.quickChecks.appendChild(b);
    });

    els.btnClearLog.addEventListener("click", () => {
        state.rollLog = [];
        renderLogs();
    });
}

function bindDrawer() {
    // Open via FAB
    els.fabRoll.addEventListener("click", () => {
        els.rollLabel.value = "Roll";
        els.rollMod.value = 0;
        openDrawer();
    });

    // Close buttons / scrim
    els.rollDrawer.addEventListener("click", (e) => {
        if (e.target.matches("[data-drawer-close]")) closeDrawer();
    });

    // Toggle buttons
    Array.from(document.querySelectorAll(".toggle-btn")).forEach(btn => {
        btn.addEventListener("click", () => btn.classList.toggle("is-on"));
    });

    els.btnRoll.addEventListener("click", () => {
        const label = (els.rollLabel.value || "Roll").trim();
        const mod = Number(els.rollMod.value || 0);

        // Stub: d20 + mod. Replace with your Check20 roller later.
        const d20 = 1 + Math.floor(Math.random() * 20);
        const total = d20 + mod;

        const line = `${label}: d20(${d20}) ${fmtSigned(mod)} = ${total}`;
        pushRollLog(line);
        pushMiniLog(line);
        renderLogs();
    });

    els.btnClearMiniLog.addEventListener("click", () => {
        state.miniRollLog = [];
        renderLogs();
    });
}

function openDrawer() {
    els.rollDrawer.classList.add("is-open");
    els.rollDrawer.setAttribute("aria-hidden", "false");
    // Focus label for quick edit
    setTimeout(() => els.rollLabel?.focus(), 0);
}

function closeDrawer() {
    els.rollDrawer.classList.remove("is-open");
    els.rollDrawer.setAttribute("aria-hidden", "true");
}

function bindEdit() {
    els.btnSaveEdit.addEventListener("click", () => {
        state.resources.hp.max = clampNum(els.hpMaxInput.value);
        state.resources.armor.max = clampNum(els.armorMaxInput.value);
        state.resources.sp.max = clampNum(els.spMaxInput.value);

        // Clamp currents
        state.resources.hp.current = Math.min(state.resources.hp.current, state.resources.hp.max);
        state.resources.armor.current = Math.min(state.resources.armor.current, state.resources.armor.max);
        state.resources.sp.current = Math.min(state.resources.sp.current, state.resources.sp.max);

        syncUI();
        pushRollLog("Saved Edit values");
        setActivePanel("play");
    });
}

function syncUI() {
    els.hpCur.textContent = state.resources.hp.current;
    els.hpMax.textContent = state.resources.hp.max;

    els.armorCur.textContent = state.resources.armor.current;
    els.armorMax.textContent = state.resources.armor.max;

    els.spCur.textContent = state.resources.sp.current;
    els.spMax.textContent = state.resources.sp.max;

    // keep edit inputs in sync
    els.hpMaxInput.value = state.resources.hp.max;
    els.armorMaxInput.value = state.resources.armor.max;
    els.spMaxInput.value = state.resources.sp.max;

    renderLogs();
}

function renderLogs() {
    els.mainLog.innerHTML = "";
    state.rollLog.slice(0, 8).forEach(line => {
        const li = document.createElement("li");
        li.textContent = line;
        els.mainLog.appendChild(li);
    });

    els.miniLog.innerHTML = "";
    state.miniRollLog.slice(0, 10).forEach(line => {
        const li = document.createElement("li");
        li.textContent = line;
        els.miniLog.appendChild(li);
    });
}

function pushRollLog(line) {
    state.rollLog.unshift(line);
    if (state.rollLog.length > 20) state.rollLog.length = 20;
}

function pushMiniLog(line) {
    state.miniRollLog.unshift(line);
    if (state.miniRollLog.length > 20) state.miniRollLog.length = 20;
}

function fmtSigned(n) {
    const v = Number(n) || 0;
    return v >= 0 ? `+${v}` : `${v}`;
}

function clampNum(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
}
