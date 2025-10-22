/* =========================
   Check20 — Patent Medicine Generator (1920s)
   Data-driven version using data/medicine.json
   ========================= */

const MED_DATA_URL = "data/medicine.json";

let MED_DATA = null;               // full json
let MED_TEMPLATES = [];            // array of template strings
let MED_POOLS = {};                // all pools
let MED_DEFAULTS = { occult: true, mundaneOnly: false, allowRare: false };

let SAVED_MEDS = JSON.parse(localStorage.getItem("check20-medicine-cards") || "[]");

/* ---------- Utilities ---------- */
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const cap = (s = "") => s.charAt(0).toUpperCase() + s.slice(1);
const byId = (id) => document.getElementById(id);

function fillTemplate(tpl, dict) {
    return tpl.replace(/\{(\w+)\}/g, (_, k) => dict[k] ?? "");
}

function pickDisclaimer(allowRare) {
    const d = MED_POOLS.disclaimers || {};
    const common = d.common || [];
    const rare = d.rare || [];
    const forbidden = d.forbidden || [];

    const roll = Math.random();
    if (allowRare && roll > 0.8 && forbidden.length) return rand(forbidden);
    if (allowRare && roll > 0.6 && rare.length) return rand(rare);
    return rand(common.length ? common : [""]);
}

/* ---------- Model ---------- */
class Medicine {
    constructor(opts = {}) {
        const { occult, mundaneOnly, allowRare } = { ...MED_DEFAULTS, ...opts };

        this.brand = rand(MED_POOLS.brand);
        this.company = rand(MED_POOLS.company);
        this.doctor = rand(MED_POOLS.doctor);
        this.adjective = rand(MED_POOLS.adjective);
        this.substance = rand(MED_POOLS.substance);
        this.form = rand(MED_POOLS.form);
        this.ingredient = rand(MED_POOLS.ingredient);

        const claim = rand(MED_POOLS.claim);
        const effect = (occult && !mundaneOnly ? rand(MED_POOLS.effect) : claim);

        this.packaging = rand(MED_POOLS.packaging);
        this.seal = rand(MED_POOLS.seal);
        this.price = rand(MED_POOLS.price);
        this.disclaimer = pickDisclaimer(allowRare);

        const tpl = rand(MED_TEMPLATES);
        this.label = fillTemplate(tpl, {
            brand: this.brand,
            company: this.company,
            doctor: this.doctor,
            adjective: this.adjective,
            substance: this.substance,
            form: this.form,
            ingredient: this.ingredient,
            claim,
            effect,
            packaging: this.packaging,
            seal: this.seal,
            disclaimer: this.disclaimer
        });

        this._id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}

/* ---------- Card Rendering ---------- */
function createMedicineCard(med) {
    const div = document.createElement("div");
    div.className = "monster-card";

    div.innerHTML = `
    <h1 contenteditable="true">${cap(med.brand)} ${med.substance} ${med.form}</h1>
    <p>${med.label}</p>
    <hr>
    <p><b>Form:</b> ${med.form}</p>
    <p><b>Ingredient:</b> ${med.ingredient}</p>
    <p><b>Packaging:</b> ${med.packaging}</p>
    <p><b>Seal:</b> ${med.seal}</p>
    <p><b>Price:</b> ${med.price}</p>

    <div class="button-row">
      <button class="copy-med">Copy</button>
      <button class="delete-med">Remove</button>
    </div>
  `;

    div.querySelector(".delete-med").addEventListener("click", () => {
        div.remove();
        SAVED_MEDS = SAVED_MEDS.filter(m => m._id !== med._id);
        localStorage.setItem("check20-medicine-cards", JSON.stringify(SAVED_MEDS));
    });

    div.querySelector(".copy-med").addEventListener("click", () => {
        const copyBtn = div.querySelector(".copy-med");
        const delBtn = div.querySelector(".delete-med");
        copyBtn.style.display = "none";
        delBtn.style.display = "none";
        const text = div.innerText.trim();
        copyBtn.style.display = "";
        delBtn.style.display = "";
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
        });
    });

    return div;
}

/* ---------- Boot ---------- */
async function loadMedicineData() {
    const res = await fetch(MED_DATA_URL);
    if (!res.ok) throw new Error(`Failed to load ${MED_DATA_URL}`);
    const json = await res.json();

    MED_DATA = json;
    MED_TEMPLATES = json.templates || [];
    MED_POOLS = json.pools || {};
    MED_DEFAULTS = { ...MED_DEFAULTS, ...(json.defaults || {}) };

    // ensure arrays exist to avoid rand() errors
    const ensure = (k, fallback = []) => { if (!Array.isArray(MED_POOLS[k])) MED_POOLS[k] = fallback; };
    ["brand", "company", "doctor", "adjective", "substance", "form", "ingredient", "claim", "indication",
        "effect", "packaging", "seal", "price"].forEach(k => ensure(k));
    if (!MED_POOLS.disclaimers) MED_POOLS.disclaimers = { common: [], rare: [], forbidden: [] };
}

document.addEventListener("DOMContentLoaded", async () => {
    const out = byId("medicine-output");
    const genBtn = byId("generate-medicine");
    const clrBtn = byId("clear-medicines");
    const chkOcc = byId("med-occult");
    const chkMun = byId("med-mundane");
    const chkRare = byId("med-rare");

    try {
        await loadMedicineData();
    } catch (e) {
        console.error("❌ Medicine data load error:", e);
    }

    // render saved
    SAVED_MEDS.forEach(m => out.prepend(createMedicineCard(m)));

    genBtn?.addEventListener("click", () => {
        const med = new Medicine({
            occult: chkOcc?.checked ?? MED_DEFAULTS.occult,
            mundaneOnly: chkMun?.checked ?? MED_DEFAULTS.mundaneOnly,
            allowRare: chkRare?.checked ?? MED_DEFAULTS.allowRare
        });

        const card = createMedicineCard(med);
        out.prepend(card);

        SAVED_MEDS.push(med);
        localStorage.setItem("check20-medicine-cards", JSON.stringify(SAVED_MEDS));
    });

    clrBtn?.addEventListener("click", () => {
        localStorage.removeItem("check20-medicine-cards");
        SAVED_MEDS = [];
        out.innerHTML = "";
    });
});
