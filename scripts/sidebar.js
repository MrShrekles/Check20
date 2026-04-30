// Self-inject sidebar.css if not already loaded (sidebar.js ships on every page)
if (!document.querySelector('link[href*="sidebar.css"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles/sidebar.css';
  document.head.appendChild(link);
}

document.addEventListener("DOMContentLoaded", () => {
  const target = document.getElementById("sidebar-placeholder");
  if (!target) return;

  fetch("components/sidebar.html")
    .then(res => res.text())
    .then(html => {
      target.innerHTML = html;
      initSidebar();
    })
    .catch(err => console.error("Failed to load sidebar:", err));
});

function initSidebar() {
  const sidebar     = document.getElementById("sidebar");
  const sidebarTitle = document.getElementById("sidebar-title");

  // ── Mode config ──────────────────────────────────────────────
  const MODES = {
    dice:      { title: "Dice Roller", tabGroup: "tabs-dice",      defaultBlock: "check-block" },
    reference: { title: "Reference",   tabGroup: "tabs-reference",  defaultBlock: "reference-block" },
    lore:      { title: "Lore",        tabGroup: "tabs-lore",       defaultBlock: "lore-block" },
    tables:    { title: "Tables",      tabGroup: "tabs-tables",     defaultBlock: "tables-block" },
    search:    { title: "Search",      tabGroup: "tabs-search",     defaultBlock: "search-block" },
  };

  let currentMode = null;

  function showBlock(blockId) {
    document.querySelectorAll(".roller-block").forEach(b => b.classList.remove("active"));
    document.getElementById(blockId)?.classList.add("active");
  }

  function openMode(mode) {
    const config = MODES[mode];
    if (!config) return;

    // Panel
    sidebar.classList.add("open");
    document.body.classList.add("sidebar-open");

    // Title
    if (sidebarTitle) sidebarTitle.textContent = config.title;

    // Tab groups — show only the one for this mode
    document.querySelectorAll(".tab-group").forEach(g => { g.hidden = true; });
    const group = document.getElementById(config.tabGroup);
    if (group) group.hidden = false;

    // Active block: whichever tab is currently marked active in the group, or the default
    const activeStab = group?.querySelector(".stab.active");
    showBlock(activeStab?.dataset.block || config.defaultBlock);

    // Strip button highlight
    document.querySelectorAll(".strip-btn[data-mode]").forEach(btn =>
      btn.classList.toggle("strip-active", btn.dataset.mode === mode)
    );

    currentMode = mode;
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
    document.querySelectorAll(".strip-btn[data-mode]").forEach(btn =>
      btn.classList.remove("strip-active")
    );
    currentMode = null;
  }

  // ── Generic open/close toggle ────────────────────────────────
  document.getElementById("sidebar-open")?.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openMode(currentMode || "dice");
    }
  });

  // ── Strip mode buttons ───────────────────────────────────────
  document.querySelectorAll(".strip-btn[data-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (sidebar.classList.contains("open") && currentMode === mode) {
        closeSidebar();
      } else {
        openMode(mode);
      }
    });
  });

  // ── Close button ─────────────────────────────────────────────
  document.getElementById("sidebar-close")?.addEventListener("click", closeSidebar);

  // ── Horizontal tab buttons inside sidebar ────────────────────
  document.querySelectorAll(".stab").forEach(stab => {
    stab.addEventListener("click", () => {
      const group = stab.closest(".tab-group");
      group?.querySelectorAll(".stab").forEach(s => s.classList.remove("active"));
      stab.classList.add("active");
      showBlock(stab.dataset.block);
    });
  });

  // ── Page shortcuts ───────────────────────────────────────────
  document.getElementById("toggle-top")?.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("header-placeholder")?.scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("toggle-spellbook")?.addEventListener("click", () => {
    window.location.href = "spellcasting.html#spells";
  });

  // ── Floating search ──────────────────────────────────────────
  document.getElementById("toggle-search")?.addEventListener("click", () => {
    const fs = document.getElementById("floating-search");
    const expanding = !fs.classList.contains("expanded");
    fs.classList.toggle("expanded", expanding);
    if (expanding) document.getElementById("sidebar-search-input")?.focus();
  });

  initSidebarSearch();

  // ── Union hover ──────────────────────────────────────────────
  const unionItems = document.querySelectorAll(".union-list li");
  const unionMap   = {};

  unionItems.forEach(li => {
    const name = li.querySelector(".union-name")?.textContent.trim().toLowerCase();
    if (name) unionMap[name] = li;
  });

  unionItems.forEach(li => {
    li.addEventListener("mouseenter", () => {
      const text  = li.querySelector(".union-opposes")?.textContent ?? "";
      const match = text.match(/Opposes:\s*(.+)/i);
      const key   = match?.[1]?.trim().toLowerCase();
      li.classList.add("union-active");
      if (key) unionMap[key]?.classList.add("union-opposed");
    });
    li.addEventListener("mouseleave", () =>
      unionItems.forEach(el => el.classList.remove("union-active", "union-opposed"))
    );
  });

  // ── Tables rollers ───────────────────────────────────────────
  initTablesRollers();

  // ── Data search ───────────────────────────────────────────────
  initSidebarDataSearch();

  // ── Check20 Roller ───────────────────────────────────────────
  document.getElementById("roll-d20-check")?.addEventListener("click", () => {
    const modifier  = parseInt(document.getElementById("check-modifier").value, 10) || 0;
    const advantage = document.getElementById("check-advantage").value;
    const roll1     = Math.floor(Math.random() * 20) + 1;
    const roll2     = Math.floor(Math.random() * 20) + 1;

    let adjusted1 = roll1;
    let chosen;

    if (advantage === "advantage") {
      adjusted1 += 4;
      chosen = Math.max(adjusted1, roll2);
    } else if (advantage === "disadvantage") {
      adjusted1 -= 4;
      chosen = Math.min(adjusted1, roll2);
    } else {
      chosen = roll1;
    }

    const total        = chosen + modifier;
    const successCount = total >= 15 ? Math.floor((total - 15) / 5) + 1 : 0;

    const item = document.createElement("li");
    item.classList.add("styled-roll");
    if (successCount > 0) item.classList.add("roll-success");

    item.innerHTML = `
      <div class="roll-line">
        <span class="roll-label">🎲 Rolled:</span>
        d20: <span class="roll-val">${highlightRoll(roll1)}</span>
        ${advantage !== "none" ? `→ <span class="roll-val">${adjusted1}</span> / <span class="roll-val">${highlightRoll(roll2)}</span>` : ""}
        <hr>
      </div>
      <div class="choice-line">
        <span class="roll-label">Chose:</span> <em class="roll-chosen">${chosen}</em>
      </div>
      <div class="mod-line">
        <span class="roll-label">Modifier:</span> <span class="roll-mod">${modifier >= 0 ? "+" : ""}${modifier}</span>
      </div>
      <div class="total-line">
        <hr>
        <span class="roll-label">Total:</span> <strong class="roll-total">${total}</strong>
        ${successCount > 0 ? `<span class="success-count">(${successCount} success${successCount > 1 ? "es" : ""})</span>` : ""}
      </div>`;

    prependToHistory("check-history", item);
  });

  // ── Standard Roller ──────────────────────────────────────────
  document.getElementById("roll-dice")?.addEventListener("click", () => {
    const numDice  = parseInt(document.getElementById("number-of-dice").value, 10);
    const dieType  = parseInt(document.getElementById("dice-type").value, 10);
    const modifier = parseInt(document.getElementById("modifier").value, 10) || 0;
    const advantage = document.getElementById("advantage").value;

    if (isNaN(numDice) || isNaN(dieType)) return;

    const rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * dieType) + 1);
    let selected = [...rolls];
    if (advantage === "advantage")    selected = [Math.max(...rolls)];
    if (advantage === "disadvantage") selected = [Math.min(...rolls)];

    const total = selected.reduce((s, r) => s + r, 0) + modifier;

    const item = document.createElement("li");
    item.classList.add("styled-roll");
    item.innerHTML = `
      <div class="roll-line">
        <span class="roll-label">🎲 Rolled:</span>
        ${numDice}d${dieType}: ${rolls.map(r => `<span class="roll-val">${r}</span>`).join(", ")}
        ${advantage !== "none" ? `→ <em class="roll-chosen">${selected.join(", ")}</em>` : ""}
        <hr>
      </div>
      <div class="mod-line">
        <span class="roll-label">Modifier:</span> <span class="roll-mod">${modifier >= 0 ? "+" : ""}${modifier}</span>
      </div>
      <div class="total-line">
        <hr>
        <span class="roll-label">Total:</span> <strong class="roll-total">${total}</strong>
      </div>`;

    prependToHistory("roll-history", item);
  });

  // ── Increment / decrement buttons ────────────────────────────
  bindStepper("increase-dice",      "number-of-dice", +1, 1);
  bindStepper("decrease-dice",      "number-of-dice", -1, 1);
  bindStepper("increase-mod",       "modifier",        +1);
  bindStepper("decrease-mod",       "modifier",        -1);
  bindStepper("increase-check-mod", "check-modifier",  +1);
  bindStepper("decrease-check-mod", "check-modifier",  -1);
}

// ── Helpers ───────────────────────────────────────────────────

function bindStepper(btnId, inputId, delta, min = -Infinity) {
  document.getElementById(btnId)?.addEventListener("click", () => {
    const input = document.getElementById(inputId);
    const val   = parseInt(input.value, 10) || 0;
    input.value = Math.max(min, val + delta);
  });
}

function prependToHistory(listId, item, max = 5) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.prepend(item);
  while (list.children.length > max) list.removeChild(list.lastChild);
}

function highlightRoll(value) {
  if (value === 20) return `<span class="roll-max">${value}</span>`;
  if (value === 1)  return `<span class="roll-min">${value}</span>`;
  return `<span class="roll-normal">${value}</span>`;
}

// ── Sidebar data search ───────────────────────────────────────

const SB_SOURCES = [
  { file:"data/spells.json",      label:"Spell",     page:"spellcasting.html", extract: d => d.map(x=>({ name:x.name, sub:x.origin||"",        desc:x.effects?.[0]?.effect||"" })) },
  { file:"data/weapons.json",     label:"Weapon",    page:"weapons.html",      extract: d => d.map(x=>({ name:x.name, sub:x.category||"",      desc:x.description||"" })) },
  { file:"data/armor.json",       label:"Armor",     page:"armor.html",        extract: d => d.map(x=>({ name:x.name, sub:x.category||"",      desc:x.description||"" })) },
  { file:"data/monsterbook.json", label:"Monster",   page:"monster.html",      extract: d => d.map(x=>({ name:x.name, sub:x._group||"",        desc:x.description||x.lore||"" })) },
  { file:"data/gods.json",        label:"Deity",     page:"gods.html",         extract: d => d.map(x=>({ name:x.name, sub:x.words||"",         desc:x.desc||"" })) },
  { file:"data/species_new.json", label:"Species",   page:"species_new.html",  extract: d => (d.species||[]).map(x=>({ name:x.name, sub:x.lineage||"", desc:x.description||"" })) },
  { file:"data/class-new.json",   label:"Class",     page:"class.html",        extract: d => { const a=[];for(const g of Object.values(d.classes||{}))for(const c of(Array.isArray(g)?g:[]))a.push({name:c.name,sub:c.class||"",desc:c.desc||""});return a; } },
  { file:"data/enchanted.json",   label:"Enchanted", page:"enchanted.html",    extract: d => d.map(x=>({ name:x.name, sub:x.type||"",          desc:(x.description||"")+" "+(x.effect||"") })) },
];

const SB_COLORS = { Spell:"#4a90d9", Weapon:"#c0392b", Armor:"#7f8c8d", Monster:"#8e44ad", Deity:"#f39c12", Species:"#27ae60", Class:"#e67e22", Enchanted:"#1abc9c" };

let _sbIndex = null;

async function buildSbIndex() {
  if (_sbIndex) return _sbIndex;
  const rows = await Promise.all(SB_SOURCES.map(async src => {
    try {
      const r = await fetch(src.file);
      if (!r.ok) return [];
      return src.extract(await r.json()).map(e => ({ ...e, label: src.label, page: src.page })).filter(e => e.name);
    } catch { return []; }
  }));
  _sbIndex = rows.flat();
  return _sbIndex;
}

function sbScore(e, t) {
  const n = e.name.toLowerCase(), s = e.sub.toLowerCase(), d = e.desc.toLowerCase();
  if (n === t)          return 100;
  if (n.startsWith(t)) return 85;
  if (n.includes(t))   return 65;
  if (s.includes(t))   return 45;
  if (d.includes(t))   return 25;
  return 0;
}

function sbHL(text, term) {
  const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi");
  return text.replace(re, "<mark class='sb-hl'>$1</mark>");
}

function renderSbResults(hits, container, term) {
  container.innerHTML = "";
  if (!hits.length) { container.innerHTML = `<p class="sb-no-results">No results for "<em>${term}</em>"</p>`; return; }
  const groups = {};
  hits.forEach(r => (groups[r.label] ??= []).push(r));
  for (const [label, entries] of Object.entries(groups)) {
    const g = document.createElement("div");
    g.className = "sb-sr-group";
    g.innerHTML = `<h4 class="sb-sr-label" style="border-color:${SB_COLORS[label]||"var(--theme)"}">${label}s</h4>`;
    entries.forEach(e => {
      const excerpt = e.desc.length > 90 ? e.desc.slice(0,90).trim()+"…" : e.desc;
      const card = document.createElement("a");
      card.className = "sb-sr-card";
      card.href = e.page;
      card.innerHTML = `
        <div class="sb-sr-top">
          <strong class="sb-sr-name">${sbHL(e.name, term)}</strong>
          ${e.sub ? `<span class="sb-sr-sub" style="color:${SB_COLORS[label]||"var(--theme)"}">${e.sub}</span>` : ""}
        </div>
        ${excerpt ? `<p class="sb-sr-desc">${sbHL(excerpt, term)}</p>` : ""}`;
      g.appendChild(card);
    });
    container.appendChild(g);
  }
}

function initSidebarDataSearch() {
  const input   = document.getElementById("sb-search-input");
  const results = document.getElementById("sb-search-results");
  const status  = document.getElementById("sb-search-status");
  if (!input || !results) return;

  let ready = false, index = null, debounce;

  async function ensureIndex() {
    if (ready) return;
    if (status) status.textContent = "Loading index…";
    index = await buildSbIndex();
    ready = true;
    if (status) status.textContent = `${index.length} entries ready`;
    setTimeout(() => { if (status) status.textContent = ""; }, 2000);
  }

  input.addEventListener("focus", ensureIndex);

  input.addEventListener("input", () => {
    clearTimeout(debounce);
    const term = input.value.trim().toLowerCase();
    if (!term || term.length < 2) { results.innerHTML = ""; return; }
    debounce = setTimeout(async () => {
      await ensureIndex();
      const hits = index
        .map(e => ({ e, s: sbScore(e, term) }))
        .filter(({ s }) => s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 35)
        .map(({ e }) => e);
      renderSbResults(hits, results, term);
    }, 180);
  });

  input.addEventListener("keydown", e => { if (e.key === "Escape") input.value = ""; });
}

// ── Tables rollers ────────────────────────────────────────────

function initTablesRollers() {
  const MOTIVATIONS = [
    "Achieving dominion over another","Achieving spiritual enlightenment","Avoiding certain death",
    "Avoiding financial ruin","Beating a diagnosis or condition","Becoming a leader of others",
    "Becoming the sole power or authority","Being a philanthropist","Being accepted by others",
    "Gaining family recognition","Being the best at something","Shaking someone's beliefs",
    "Caring for an aging parent","Carrying on a legacy","Catching a villain","Causing someone pain",
    "Coming to grips with a mental disorder","Controlling others","Coping with a learning disability or illness",
    "Correcting a perceived mistake","Discovering something important","Dealing with bullies",
    "Defying expectations","Discovering one's true self","Having it all","Aiding a self-destructive loved one",
    "Keeping what one has no matter what","Learning to trust","Making someone proud",
    "Navigating a changing family situation","Obliterating an enemy","Obsessively pursuing a relationship",
    "Obtaining glory whatever the cost","Obtaining shelter from the elements","Overcoming a debilitating fear",
    "Overcoming a fear","Overcoming abuse and learning to trust","Overcoming addiction",
    "Overthrowing good with evil","Preserving a cultural heritage","Profiteering","Promoting chaos",
    "Protecting a loved one","Protecting one's home or property","Providing for one's family",
    "Providing security for future generations","Proving someone wrong","Pursuing a passion",
    "Doing the right thing","Embracing a personal identity","Escaping a dangerous life","Escaping a killer",
    "Escaping confinement","Escaping danger","Escaping homelessness","Escaping invaders",
    "Escaping widespread disaster","Establishing a sense of belonging","Evading responsibility",
    "Exploring one's biological roots","Finding a lifelong partner","Finding friendship or companionship",
    "Finding one's purpose","Finding something lost","Fitting in","Forcing a big change",
    "Forcing conversion","Forgiving oneself","Gaining control over one's own life","Getting revenge",
    "Giving up a child","Having a child","Pursuing a toxic desire","Pursuing justice for oneself or others",
    "Pursuing knowledge","Pursuing mastery of a skill or talent","Realizing a dream",
    "Reclaiming personal power","Reuniting with distant family","Repaying a debt",
    "Rescuing a loved one from a captor","Resisting peer pressure","Restoring one's name or reputation",
    "Righting a deep wrong","Ruining someone's life","Ruining someone's reputation","Saving the world",
    "Seeking adventure","Seeking death","Serving others","Solving a problem",
    "Stopping an event from happening","Supporting oneself financially","Surviving loss",
    "Surviving the death of a loved one","Taking what one is owed","Trying something new",
    "Overcoming past failures","Winning a competition",
  ];

  const EQUIPMENT = [
    "A bandolier of shotgun shells, a gun cleaning kit, a holster for quick draw",
    "Brewing equipment, a selection of rare herbs and magical ingredients, a few bottles of 'moonshine'",
    "A book of abyssal texts, a set of writing tools and ink, a small collection of scrolls and manuscripts, and a silver holy symbol",
    "Collection jars (for the leeches), a medical kit (with basic supplies)",
    "A broken porcelain mask affixed to your face, a set of manacles (for apprehending the guilty), and a locked spellbook",
    "A grappling hook, a water-skin, and a small first-aid kit",
    "A ledger, a set of fine writing implements, and a collection of valuable coins from various nations",
    "A portable taco-making kit, a book on taco divination, a collection of exotic taco ingredients",
    "A set of cheese-making tools, a selection of fine cheeses, a guide to cheese varieties, an intelligent cheese",
    "A set of keys to the library, a lantern with oil, a set of cleaning supplies, and a small collection of arcane tomes",
    "A set of tattooing tools, a sketchbook, and a few magical inks with unique properties",
    "A set of torture tools, a manual on painless interrogation techniques, a government badge",
    "A set of wooden stakes, a vial of holy water, and a guide to supernatural creatures",
    "A shoe-making kit, a selection of magical leathers and materials, a catalog of shoe designs",
    "A small pouch of magical components, a spellbook, and a scroll case",
    "A sturdy belt with multiple pouches, a canvas bag, and a small pocket knife",
    "A tool kit with magical and mundane tools, a manual on supernatural handyman tasks, a set of keys to various dimensions",
    "A whetstone, a set of weapon maintenance tools, and a training manual",
    "Acrobat's tools, a small makeup kit, and a set of costume props",
    "Amulet of your divinity, a divine shard, a broken crown of fallen stars",
    "Animal handling tools, a portable cage, and a collection of treats to gain the trust of animals",
    "Bedroll, a map of the region, and a signal whistle",
    "Brewing equipment, a selection of rare herbs, a few bottles of 'moonshine'",
    "Collection jars for leeches, a medical kit",
    "Dentist's tools, vampire teeth molds, a book on vampire dental anatomy",
    "Elemental gemstones, a collection of elemental scrolls, and a small elemental creature bound to your service",
    "Enchanted makeup kit, mirror, small case of various potions",
    "Golem maintenance kit, a manual on golem anatomy, and a golem making kit",
    "Gunsmith tools, a few spectral bullets, an old diary with spectral firearm designs",
    "Handcuffs engraved with your initials, a notepad and a magnifying glass",
    "Healer's kit, a wooden staff, and a collection of potions",
    "Light Hammer, a flask filled with liquor, and a lighter",
    "Mechanics' tools, a portable workshop, and a few spare parts",
    "Musical instrument or juggling balls, Performer's Flourish (+1 Influence)",
    "Old miner's helmet with functioning lantern, a collection of precious stones",
    "Pocket watch, a city map, a book on city architecture",
    "Recipe book for different sodas, a portable soda dispenser",
    "Rope, grappling hook, and lockpicks in a compact pouch",
    "Ruined Spellbook, magical focus, and a pouch of magical reagents",
    "Scale, a ledger, and a set of merchant's tools — Additional 50 gp",
    "Several bottles of milk and a large canvas sack for carrying dairy products",
    "Thieves' Tools concealed in a hidden wrist compartment, a grappling hook, and lockpicks disguised as cufflinks",
  ];

  const TRINKETS = [
    "Shotgun shell that was once shot at you, kept as a lucky charm",
    "A broken practice weapon, a reminder of your past failures",
    "A tarnished silver badge that once belonged to a criminal you captured",
    "A pocket watch with a cryptic inscription on the back",
    "A coin from the organization you once worked for, stamped with a mysterious emblem",
    "A broken amulet, once a symbol of your divine authority",
    "A taco charm, said to bring good luck",
    "A small enchanted vial containing your former essence",
    "A small intricately carved figurine of your original form",
    "A small token of protection, given to you by a friend before your exile",
    "A small silver medallion bearing the symbol of your order",
    "A small enchanted crystal that changes color and emits faint elemental energy",
    "A small ornate box containing a mysterious abyssal artifact",
    "A dried flower from a rare and dangerous plant you once grew",
    "A spent bullet casing from the first spirit you ever bound to a weapon",
    "A favorite soda spoon, slightly bent but still useful",
    "A small intricately carved bone used to mix your inks",
    "A miniature shoe charm, said to bring good luck to its owner",
    "A small perfectly aged cheese that seems to have a personality of its own",
    "An old miner's whistle, said to ward off evil spirits",
    "An old railroad spike, a reminder of your first day on the job",
    "A tiny perfectly articulated golem hand, a memento from a successful repair job",
    "A small doll, a reminder of your desire to change",
    "A leech preserved in a small glass vial",
    "A mysterious key with an emblem of an unknown organization",
    "A small unmarked box that contains an unknown substance",
    "A playing card with an ever-shifting face",
    "A small intricately carved figurine of a mythical creature you once cared for",
    "A lucky coin, said to bring fortune to those who carry it",
    "A small charm in the shape of your favorite animal from the menagerie",
    "A poster from one of your most memorable performances",
    "A small worn carving of a caravan, a gift from a grateful merchant",
    "A broken chain, a symbol of your newfound freedom from the arena",
    "A golden pocket watch engraved with your family's crest",
    "A small intricate clockwork contraption you built as a testament to your skill",
    "A small vial of 'holy water' that's actually infused with dark energy",
    "A small carved wooden ship you found among the cargo",
    "A cowbell, a memento from your favorite dairy cow",
    "A badge from your old fire department, bearing the symbol of a phoenix",
    "A small worn key that once opened the door to your old guardhouse",
    "A recipe for a particularly potent brew, passed down through generations",
    "A small stone from the foundation of the city's oldest building",
    "A set of vampire fangs you've replaced",
    "A screw from a piece of celestial machinery",
    "An old makeup case containing a mysterious magical substance",
    "A small enchanted stone that emits a faint eerie glow",
    "A glass orb that glows slightly when held, no known origin",
    "A small mechanical bird that occasionally chirps despite lacking visible power sources",
    "A book with blank pages that sometimes display faint writing",
    "A stone that is always warm to the touch",
    "A wooden puzzle box that has never been opened",
    "A mirror shard that shows a mysterious shadow in the reflection",
    "An old compass that points to something other than magnetic north",
    "A handkerchief embroidered with an unfamiliar coat of arms",
    "A piece of driftwood shaped like a sea creature",
    "A candle that cannot be lit, it emits a faint sweet smell when warm",
    "A deck of cards where all the kings are missing",
    "A bell that makes no sound when rung",
    "A diary written in an unknown language",
    "A set of old locksmith tools with one pick inexplicably bent",
    "A whistle that only animals can hear",
    "A locket that refuses to open, sounds like something is moving inside",
    "A piece of chalk that writes on air",
    "A feather that falls like a stone when dropped",
    "A glove that absorbs light, making the hand invisible when worn",
    "A bottle of ink that changes color daily",
    "A monocle that shows an arcane symbol when looking at the moon",
    "A scarf that cannot get wet",
    "A comb that makes hair stand on end when used",
    "A matchbox with matches that light when snapped",
    "A pebble that skips on dry land",
    "A coin that always lands on its edge",
    "A key that gets colder as it gets closer to locks",
    "A nail that never rusts",
    "A tooth from an unknown beast, it vibrates slightly in thunderstorms",
    "A map with a place that no one can find",
    "A hat that always returns to its owner when lost",
    "A small box that hums a melody at night",
    "A painting of a door that seems to change in detail",
    "A soap that never lathers",
    "A button that detaches and reattaches itself from clothes",
    "A quill that only writes in rhymes",
    "A pair of glasses that show constellations at night",
    "A bookmark that prevents the book from ever finishing",
    "A flask that doubles the taste of any liquid inside",
    "A lantern with a flame that flickers in the presence of spirits",
    "A spoon that makes any meal taste delicious",
    "A pair of boots that leave footprints of a different creature",
    "A whistle that only works at sunrise and sunset",
    "A ring that feels heavier with lies",
    "A bottle that refills with sea water",
    "A glove that softly glows in the presence of magic",
    "A brush that paints only in shades of blue",
    "A belt that always fits the wearer perfectly",
    "A scarf that smells like the forest after rain",
    "A yarn ball that never tangles",
    "A small statue that slowly turns towards the nearest gold",
    "A pen that writes on its own when left alone",
    "A coin that jumps slightly when near treasure",
    "A feather that acts as a magnet for paper",
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function setupRoller(btnId, resultId, arr, storageKey) {
    const btn = document.getElementById(btnId);
    const out = document.getElementById(resultId);
    if (!btn || !out) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) out.textContent = saved;
    btn.addEventListener("click", () => {
      const result = pickRandom(arr);
      out.textContent = result;
      localStorage.setItem(storageKey, result);
    });
  }

  setupRoller("sb-roll-motivation", "sb-selected-motivation", MOTIVATIONS, "sb-motivation");
  setupRoller("sb-roll-equipment",  "sb-selected-equipment",  EQUIPMENT,   "sb-equipment");
  setupRoller("sb-roll-trinket",    "sb-selected-trinket",    TRINKETS,    "sb-trinket");

  const wealthBtn = document.getElementById("sb-roll-wealth");
  const wealthOut = document.getElementById("sb-starting-wealth");
  if (wealthBtn && wealthOut) {
    const saved = localStorage.getItem("sb-wealth");
    if (saved) wealthOut.textContent = saved;
    wealthBtn.addEventListener("click", () => {
      const roll   = Math.floor(Math.random() * 100) + 1 + 50;
      const result = `${roll} gp`;
      wealthOut.textContent = result;
      localStorage.setItem("sb-wealth", result);
    });
  }

  document.querySelectorAll(".sb-copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const text = document.getElementById(btn.dataset.target)?.textContent?.trim() || "";
      if (!text) {
        btn.textContent = "Nothing yet";
        setTimeout(() => btn.textContent = "Copy", 1200);
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 1200);
      });
    });
  });
}

// ── Page-text search (used by all non-spell pages) ────────────

function initSidebarSearch() {
  const input = document.getElementById("sidebar-search-input");
  if (!input) return;

  if (typeof renderSpells === "function") {
    input.addEventListener("input", renderSpells);
  } else {
    input.addEventListener("input", () => highlightPageText(input.value.trim()));
  }
}

function highlightPageText(term) {
  document.querySelectorAll("mark.sb-highlight").forEach(m => {
    m.parentNode.replaceChild(document.createTextNode(m.textContent), m);
    m.parentNode?.normalize();
  });

  const countEl = document.getElementById("sidebar-search-count");
  if (!term || term.length < 2) {
    if (countEl) countEl.textContent = "";
    return;
  }

  const root    = document.querySelector("main") || document.body;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex   = new RegExp(escaped, "gi");

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName;
      if (["SCRIPT", "STYLE", "MARK", "INPUT", "TEXTAREA", "SELECT"].includes(tag))
        return NodeFilter.FILTER_REJECT;
      return node.textContent.toLowerCase().includes(term.toLowerCase())
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let count = 0;
  nodes.forEach(node => {
    const text     = node.textContent;
    const fragment = document.createDocumentFragment();
    let lastIndex  = 0, match;
    while ((match = regex.exec(text)) !== null) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const mark = document.createElement("mark");
      mark.className   = "sb-highlight";
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIndex = match.index + match[0].length;
      count++;
    }
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.parentNode.replaceChild(fragment, node);
  });

  if (countEl) countEl.textContent = count > 0 ? `${count} match${count !== 1 ? "es" : ""}` : "No matches";
  document.querySelector("mark.sb-highlight")?.scrollIntoView({ behavior: "smooth", block: "center" });
}
