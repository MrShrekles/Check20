// ── Data sources ──────────────────────────────────────────────
const SEARCH_SOURCES = [
  {
    file:  "data/spells.json",
    label: "Spell",
    page:  "spellcasting.html",
    extract: data => data.map(d => ({
      name: d.name,
      sub:  d.origin || "",
      desc: d.effects?.[0]?.effect || "",
    })),
  },
  {
    file:  "data/weapons.json",
    label: "Weapon",
    page:  "weapons.html",
    extract: data => data.map(d => ({
      name: d.name,
      sub:  d.category || "",
      desc: d.description || "",
    })),
  },
  {
    file:  "data/armor.json",
    label: "Armor",
    page:  "armor.html",
    extract: data => data.map(d => ({
      name: d.name,
      sub:  d.category || "",
      desc: d.description || "",
    })),
  },
  {
    file:  "data/monsterbook.json",
    label: "Monster",
    page:  "monster.html",
    extract: data => data.map(d => ({
      name: d.name,
      sub:  d._group || "",
      desc: d.description || d.lore || "",
    })),
  },
  {
    file:  "data/gods.json",
    label: "Deity",
    page:  "gods.html",
    extract: data => data.map(d => ({
      name: d.name,
      sub:  d.words || "",
      desc: d.desc || "",
    })),
  },
  {
    file:  "data/species_new.json",
    label: "Species",
    page:  "species_new.html",
    extract: data => (data.species || []).map(d => ({
      name: d.name,
      sub:  d.lineage || "",
      desc: d.description || "",
    })),
  },
  {
    file:  "data/class-new.json",
    label: "Class",
    page:  "class.html",
    extract: data => {
      const all = [];
      for (const group of Object.values(data.classes || {})) {
        for (const cls of (Array.isArray(group) ? group : [])) {
          all.push({ name: cls.name, sub: cls.class || "", desc: cls.desc || "" });
        }
      }
      return all;
    },
  },
  {
    file:  "data/enchanted.json",
    label: "Enchanted",
    page:  "enchanted.html",
    extract: data => data.map(d => ({
      name: d.name,
      sub:  d.type || "",
      desc: (d.description || "") + " " + (d.effect || ""),
    })),
  },
  {
    file:  "data/medicine.json",
    label: "Medicine",
    page:  "reference.html",
    extract: data => (Array.isArray(data) ? data : []).map(d => ({
      name: d.name || d.item || "",
      sub:  d.type || d.category || "",
      desc: d.description || d.effect || "",
    })),
  },
];

// ── Index ─────────────────────────────────────────────────────
let _index = null;

async function buildSearchIndex() {
  if (_index) return _index;

  const results = await Promise.all(
    SEARCH_SOURCES.map(async src => {
      try {
        const res  = await fetch(src.file);
        if (!res.ok) return [];
        const data = await res.json();
        return src.extract(data).map(e => ({
          name:  (e.name  || "").trim(),
          sub:   (e.sub   || "").trim(),
          desc:  (e.desc  || "").trim(),
          label: src.label,
          page:  src.page,
        })).filter(e => e.name);
      } catch {
        return [];
      }
    })
  );

  _index = results.flat();
  return _index;
}

// ── Scoring ───────────────────────────────────────────────────
function scoreEntry(entry, term) {
  const t    = term.toLowerCase();
  const name = entry.name.toLowerCase();
  const sub  = entry.sub.toLowerCase();
  const desc = entry.desc.toLowerCase();

  if (name === t)             return 100;
  if (name.startsWith(t))    return 85;
  if (name.includes(t))      return 65;
  if (sub.includes(t))       return 45;
  if (desc.includes(t))      return 25;
  return 0;
}

function runSearch(term, index) {
  if (!term || term.length < 2) return [];
  const scored = index
    .map(e => ({ e, s: scoreEntry(e, term) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, 40).map(({ e }) => e);
}

// ── Rendering ─────────────────────────────────────────────────
const LABEL_COLORS = {
  Spell:     "#4a90d9",
  Weapon:    "#c0392b",
  Armor:     "#7f8c8d",
  Monster:   "#8e44ad",
  Deity:     "#f39c12",
  Species:   "#27ae60",
  Class:     "#e67e22",
  Enchanted: "#1abc9c",
  Medicine:  "#2ecc71",
};

function highlight(text, term) {
  if (!term) return text;
  const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(re, "<mark>$1</mark>");
}

function renderResults(results, container, term) {
  container.innerHTML = "";

  if (!results.length) {
    container.innerHTML = `<p class="sr-empty">No results for "<em>${term}</em>"</p>`;
    return;
  }

  // Group by label
  const groups = {};
  results.forEach(r => {
    (groups[r.label] ??= []).push(r);
  });

  for (const [label, entries] of Object.entries(groups)) {
    const group = document.createElement("div");
    group.className = "sr-group";

    const heading = document.createElement("h4");
    heading.className = "sr-group-label";
    heading.textContent = label + "s";
    heading.style.borderColor = LABEL_COLORS[label] || "var(--theme)";
    group.appendChild(heading);

    const list = document.createElement("div");
    list.className = "sr-list";

    entries.forEach(entry => {
      const card = document.createElement("a");
      card.className = "sr-card";
      card.href = entry.page;

      const excerpt = entry.desc.length > 110
        ? entry.desc.slice(0, 110).trim() + "…"
        : entry.desc;

      card.innerHTML = `
        <div class="sr-card-top">
          <strong class="sr-name">${highlight(entry.name, term)}</strong>
          ${entry.sub ? `<span class="sr-sub" style="background:${LABEL_COLORS[label] || "var(--theme)"}22;color:${LABEL_COLORS[label] || "var(--theme)"}">${entry.sub}</span>` : ""}
        </div>
        ${excerpt ? `<p class="sr-desc">${highlight(excerpt, term)}</p>` : ""}
      `;

      list.appendChild(card);
    });

    group.appendChild(list);
    container.appendChild(group);
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const input   = document.getElementById("global-search-input");
  const panel   = document.getElementById("global-search-results");
  const status  = document.getElementById("global-search-status");
  if (!input || !panel) return;

  let index     = null;
  let ready     = false;
  let debounce;

  async function ensureIndex() {
    if (ready) return;
    if (status) status.textContent = "Loading…";
    index = await buildSearchIndex();
    ready = true;
    if (status) status.textContent = `${index.length} entries indexed`;
    setTimeout(() => { if (status) status.textContent = ""; }, 2000);
  }

  // Pre-warm on focus
  input.addEventListener("focus", ensureIndex);

  input.addEventListener("input", () => {
    clearTimeout(debounce);
    const term = input.value.trim();

    if (!term || term.length < 2) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    debounce = setTimeout(async () => {
      await ensureIndex();
      const hits = runSearch(term, index);
      panel.hidden = false;
      renderResults(hits, panel, term);
    }, 180);
  });

  // Close on outside click
  document.addEventListener("click", e => {
    if (!e.target.closest("#global-search")) {
      panel.hidden = true;
    }
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2) panel.hidden = false;
  });

  // Keyboard: Escape closes
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      panel.hidden = true;
      input.blur();
    }
  });
});
