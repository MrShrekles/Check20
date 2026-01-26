/*    STATE    */
let SPECIES = [];
let DRAGON_TYPES = [];
const state = {
    speciesSlug: null,                    // current species slug
    optionKey: 'general',                 // current option key
    dragonType: localStorage.getItem('c20.dragonType') || null
};

/*    UTILS    */
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const low = s => String(s || '').toLowerCase().trim();
const trim = s => String(s || '').replace(/\s+/g, ' ').trim();
const cap = s => String(s || '').replace(/\b\w/g, c => c.toUpperCase());
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

/*    LOADERS    */
/** Load species_new.json from common paths, then normalize lists. */
async function loadSpeciesData() {
    const paths = ['data/species_new.json', 'species_new.json'];
    for (const p of paths) {
        try {
            const res = await fetch(p);
            if (!res.ok) continue;
            const json = await res.json();
            SPECIES = normalizeSpecies(json.species || []);
            DRAGON_TYPES = normalizeDragonTypes(json.dragonTypes || []);
            return;
        } catch {/* try next */ }
    }
    console.error('[Check20] Could not load species_new.json');
}

// === Shared helper for table rolls ===
function getRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}
const motivationList = [
    "Achieving dominion over another",
    "Achieving spiritual enlightenment",
    "Avoiding certain death",
    "Avoiding financial ruin",
    "Beating a diagnosis or condition",
    "Becoming a leader of others",
    "Becoming the sole power or authority",
    "Being a philanthropist",
    "Being accepted by others",
    "Gaining family recognition",
    "Being the best at something",
    "Shaking someone's beliefs",
    "Caring for an aging parent",
    "Carrying on a legacy",
    "Catching a villain",
    "Causing someone pain",
    "Coming to grips with a mental disorder",
    "Controlling others",
    "Coping with a learning disability or illness",
    "Correcting a perceived mistake",
    "Discovering something important",
    "Dealing with bullies",
    "Defying expectations",
    "Discovering one's true self",
    "Having it all",
    "Aiding a self-destructive loved one",
    "Keeping what one has no matter what",
    "Learning to trust",
    "Making someone proud",
    "Navigating a changing family situation",
    "Obliterating an enemy",
    "Obsessively pursuing a relationship",
    "Obtaining glory whatever the cost",
    "Obtaining shelter from the elements",
    "Overcoming a debilitating fear",
    "Overcoming a fear",
    "Overcoming abuse and learning to trust",
    "Overcoming addiction",
    "Overthrowing good with evil",
    "Preserving a cultural heritage",
    "Profiteering",
    "Promoting chaos",
    "Protecting a loved one",
    "Protecting one's home or property",
    "Providing for one's family",
    "Providing security for future generations",
    "Proving someone wrong",
    "Pursuing a passion",
    "Doing the right thing",
    "Embracing a personal identity",
    "Escaping a dangerous life",
    "Escaping a killer",
    "Escaping confinement",
    "Escaping danger",
    "Escaping homelessness",
    "Escaping invaders",
    "Escaping widespread disaster",
    "Establishing a sense of belonging",
    "Evading responsibility",
    "Exploring one's biological roots",
    "Finding a lifelong partner",
    "Finding friendship or companionship",
    "Finding one's purpose",
    "Finding something lost",
    "Fitting in",
    "Forcing a big change",
    "Forcing conversion",
    "Forgiving oneself",
    "Gaining control over one's own life",
    "Getting revenge",
    "Giving up a child",
    "Having a child",
    "Pursuing a toxic desire",
    "Pursuing justice for oneself or others",
    "Pursuing knowledge",
    "Pursuing mastery of a skill or talent",
    "Realizing a dream",
    "Reclaiming personal power",
    "Reuniting with distant family",
    "Repaying a debt",
    "Rescuing a loved one from a captor",
    "Resisting peer pressure",
    "Restoring one's name or reputation",
    "Righting a deep wrong",
    "Ruining someone's life",
    "Ruining someone's reputation",
    "Saving the world",
    "Seeking adventure",
    "Seeking death",
    "Serving others",
    "Solving a problem",
    "Stopping an event from happening",
    "Supporting oneself financially",
    "Surviving loss",
    "Surviving the death of a loved one",
    "Taking what one is owed",
    "Trying something new",
    "Overcoming past failures",
    "Winning a competition",
];
const equipmentList = [
    "A bandolier of shotgun shells, a gun cleaning kit, a holster for quick draw",
    "Brewing equipment, a selection of rare herbs and magical ingredients, a few bottles of 'moonshine'",
    "A book of abyssal texts, a set of writing tools and ink, a small collection of scrolls and manuscripts, and a silver holy symbol",
    "Collection jars (for the leeches), a medical kit (with basic supplies)",
    "A broken porcelain mask affixed to your face, a set of manacles (for apprehending the guilty), and a locked spellbook (which you still hold dear)",
    "A grappling hook (for scaling trees and buildings), a water-skin (for emergency fire suppression), and a small first-aid kit (for treating burns and injuries)",
    "A ledger (for keeping track of finances), a set of fine writing implements (for drafting contracts and letters), and a collection of valuable coins (from various nations and time periods)",
    "A portable taco-making kit, a book on taco divination, a collection of exotic taco ingredients",
    "A set of cheese-making tools, a selection of fine cheeses, a guide to cheese varieties, an intelligent cheese",
    "A set of keys to the library, a lantern with a small supply of oil, a set of cleaning supplies, and a small collection of arcane tomes",
    "A set of tattooing tools (needles, inks, etc.), a sketchbook (for designing tattoos), and a few magical inks with unique properties",
    "A set of torture tools, a manual on painless interrogation techniques, a government badge",
    "A set of wooden stakes (for dispatching strigoi foes), a vial of holy water (for use against fiends and other malevolent entities), and a guide to supernatural creatures (detailing their weaknesses and vulnerabilities)",
    "A shoe-making kit, a selection of magical leathers and materials, a catalog of shoe designs",
    "A small pouch of magical components (used for casting spells), a spellbook (containing your first spells), and a scroll case (for storing important documents)",
    "A sturdy belt with multiple pouches for carrying small items, a canvas bag for carrying larger items, and a small pocket knife",
    "A tool kit with magical and mundane tools, a manual on supernatural handyman tasks, a set of keys to various dimensions",
    "A whetstone (for sharpening your weapon), a set of weapon maintenance tools, and a training manual (with notes from your past instructors)",
    "Acrobat's tools (juggling pins, tightrope, etc.), a small makeup kit (for touch-ups before performances), and a set of costume props (for disguising yourself)",
    "Amulet of your divinity, a divine shard, a broken crown of fallen stars",
    "Animal Handling tools (leash, muzzle, etc.), a portable cage (for temporarily holding creatures), and a collection of treats (to gain the trust of animals)",
    "Bedroll (for sleeping during long journeys), a map of the region, and a signal whistle (for alerting fellow guards)",
    "Brewing equipment, a selection of rare herbs and magical ingredients, a few bottles of 'moonshine'",
    "Collection jars (for the leeches), a medical kit (with basic supplies)",
    "Dentist's tools, vampire teeth molds, a book on vampire dental anatomy",
    "Elemental gemstones (used as a focus for channeling elemental energies), a collection of scrolls (detailing various elemental spells and rituals), and a small, elemental creature (such as a salamander, water weird, or stone elemental) bound to your service",
    "Enchanted makeup kit, mirror, small case of various potions",
    "Golem maintenance kit (includes oils, runes, and miniature tools), a manual on golem anatomy, and a golem making kit for a PL [[1d4]] golem takes 6 hours of crafting",
    "Gunsmith tools, a few spectral bullets, an old diary with spectral firearm designs",
    "Handcuffs (engraved with your initials), a notepad and a magnifying glass (in a leather case)",
    "Healer's kit (containing various herbs and bandages), a wooden staff (used for walking and channeling healing magic), and a collection of potions (for various ailments)",
    "Light Hammer (with a handle wrapped    in soft leather for a better grip), Flask filled with liquor, and a lighter",
    "Mechanics' tools (a set of wrenches, pliers, and other essentials), a portable workshop (for on-the-go repairs and inventions), and a few spare parts (gears, springs, and other components for quick fixes)",
    "Musical instrument (with intricate carvings) or set of juggling balls (made of fine materials), Performer’s Flourish (+1 Influence)",
    "Old miner's helmet (with functioning lantern), a collection of precious stones",
    "Pocket watch, a city map, a book on city architecture",
    "Recipe book (for different sodas), a portable soda dispenser",
    "Rope, grappling hook, and lockpicks (in a compact pouch)",
    "Ruined Spellbook (pages made from the bark of a magical tree), magical focus (a crystal pulsating with elemental energy), and a pouch of magical reagents (gathered from the wild)",
    "Scale (for weighing and measuring goods), a ledger (for keeping track of inventory and profits), and a set of merchant's tools (for crafting and repairing items), Additional 50 gp",
    "Several bottles of milk (for customer deliveries and emergency sustenance), a large canvas sack (for carrying dairy products)",
    "Thieves' Tools (concealed in a hidden wrist compartment), a grappling hook (collapsible for easy storage), and a set of lockpicks (disguised as cufflinks)"
];
const trinketList = [
    "Shotgun shell that was once shot at you, kept as a lucky charm",
    "A broken practice weapon, a reminder of your past failures and determination to improve",
    "A tarnished, silver badge that once belonged to a criminal you captured",
    "A pocket watch with a cryptic inscription on the back",
    "A coin from the organization you once worked for, stamped with a mysterious emblem",
    "A broken amulet, once a symbol of your divine authority",
    "A taco charm, said to bring good luck",
    "A small, enchanted vial containing your former essence",
    "A small, intricately carved figurine of your original form, a reminder of where you came from",
    "A small token of protection, given to you by a friend before your exile",
    "A small, silver medallion bearing the symbol of your order, a constant reminder of your sworn duty",
    "A small, enchanted crystal that changes color and emits faint elemental energy, a gift from your elemental master",
    "A small, ornate box containing a mysterious, abyssal artifact",
    "A dried flower from a rare and dangerous plant you once grew",
    "A spent bullet casing from the first spirit you ever bound to a weapon",
    "A favorite soda spoon, slightly bent but still useful",
    "A small, intricately carved bone used to mix your inks",
    "A miniature shoe charm, said to bring good luck to its owner",
    "A small, perfectly aged cheese that seems to have a personality of its own",
    "An old miner's whistle, said to ward off evil spirits",
    "An old railroad spike, a reminder of your first day on the job",
    "A tiny, perfectly articulated golem hand, a memento from a successful repair job",
    "A small doll, a reminder of your desire to change",
    "A leech preserved in a small glass vial",
    "A mysterious key with an emblem of an unknown organization",
    "A small, unmarked box that contains an unknown substance",
    "A playing card with an ever-shifting face",
    "A small, intricately carved figurine of a mythical creature that you once cared for",
    "A lucky coin, said to bring fortune to those who carry it",
    "A small charm in the shape of your favorite animal from the menagerie",
    "A poster from one of your most memorable performances",
    "A small, worn carving of a caravan, a gift from a grateful merchant",
    "A broken chain, a symbol of your newfound freedom from the arena",
    "A golden pocket watch, engraved with your family's crest, a symbol of your past success and a reminder of the fortune you seek to regain",
    "A small, intricate clockwork contraption you built as a testament to your skill",
    "A small vial of 'holy water' that's actually infused with dark energy",
    "A small, carved wooden ship you found among the cargo",
    "A cowbell, a memento from your favorite dairy cow",
    "A badge from your old fire department, bearing the symbol of a phoenix rising from the ashes",
    "A small, worn key that once opened the door to your old guardhouse",
    "A recipe for a particularly potent brew, passed down through generations",
    "A small stone from the foundation of the city's oldest building",
    "A set of vampire fangs you've replaced",
    "A screw from a piece of celestial machinery",
    "An old makeup case containing a mysterious magical substance",
    "A small, enchanted stone that emits a faint, eerie glow",
    "A glass orb that glows slightly when held, no known origin",
    "A small, mechanical bird that occasionally chirps, despite lacking visible power sources",
    "A book with blank pages that sometimes display faint writing",
    "A stone that is always warm to the touch",
    "A wooden puzzle box that has never been opened",
    "A mirror shard that shows a mysterious shadow in the reflection",
    "An old compass that points to something other than magnetic north",
    "A handkerchief embroidered with an unfamiliar coat of arms",
    "A piece of driftwood shaped like a sea creature",
    "A candle that cannot be lit, it emits a faint, sweet smell when warm",
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
    "A feather that acts as a magnet for paper"
];

// Copy motivationList, equipmentList, and trinketList from tables.js
// (keep the names exactly the same so we reuse the same data)


/* Simple eligibility: explicit flags, common lineages, or name hints */
function isDragonEligible(s) {
    if (s.dragonTypeAllowed === true || s.dragonType === true) return true;
    const lin = low(s.lineage);
    if (lin === 'dragon' || lin === 'dragonkin') return true;
    return /(dragon|drake|wyrm|drakon|drakonari|kobari)/i.test(`${s.name} ${s.option} ${s.lineage}`);
}

/* Normalize species to consistent fields. */
function normalizeSpecies(arr) {
    return (arr || []).map(s => {
        // If features is an array, keep it; otherwise, build one feature from legacy fields.
        const feats = Array.isArray(s.features) ? s.features
            : ((s.feature_name || s.featureName || s.features) ? [{
                name: s.feature_name || s.featureName || 'Feature',
                // Map feature_effect → description; fall back to string features if present
                description: s.feature_effect || (typeof s.features === 'string' ? s.features : ''),
                action: s.fetAction || s.action || '',
                damage: s.fetDamage || s.damage || '',
                type: s.fetDamageType || s.damageType || s.type || ''
            }] : []);

        const out = {
            ...s,
            name: trim(s.name),
            slug: slug(s.name),
            lineage: trim(s.lineage),
            option: trim(s.option || ''),
            optionKey: low(s.option || 'general'),
            rarity: trim(s.rarity || ''),
            features: feats.map(f => ({
                name: trim(f.name || 'Feature'),
                description: trim(f.description || ''),
                action: trim(f.action || ''),
                damage: trim(f.damage || ''),
                type: trim(f.type || '')
            })),
            description: trim(s.description || '')
        };
        out.dragonEligible = isDragonEligible(out);
        return out;
    });
}

/* Normalize dragon types: split "Title (Element)" and extract one feature line. */
function normalizeDragonTypes(arr) {
    return (arr || []).map(raw => {
        const name = trim(raw.name);
        const m = name.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
        const title = trim(m?.[1] || name);
        const element = trim(m?.[2] || '');
        const cleaned = trim(String(raw.features || raw.feature || '').replace(/<\/?li>/gi, ''));
        const idx = cleaned.indexOf(':');
        const featureName = idx > -1 ? trim(cleaned.slice(0, idx)) : (cleaned ? cleaned.split(' ')[0] : 'Feature');
        const featureText = idx > -1 ? trim(cleaned.slice(idx + 1)) : trim(cleaned.replace(featureName, ''));
        return { ...raw, name, title, element, slug: slug(name), featureName, featureText };
    });
}

/** Species */
function buildSpeciesSelect() {
    const sel = document.getElementById('species');
    if (!sel) return;

    const groups = new Map();
    SPECIES
        .map(s => {
            const key = `${s.slug}::${s.optionKey || 'general'}`;
            const lin = cap(s.lineage || 'Unknown');
            const optionLabel = s.option ? cap(s.option) : '';
            const nameLabel = cap(s.name);
            const label = optionLabel
                ? `${optionLabel}: ${nameLabel}`   // Option first, both capitalized
                : `${nameLabel}`;                 // Just capitalized name
            return { key, lin, label };
        })
        .sort((a, b) => a.lin.localeCompare(b.lin) || a.label.localeCompare(b.label))
        .forEach(row => {
            if (!groups.has(row.lin)) groups.set(row.lin, []);
            groups.get(row.lin).push(row);
        });

    let html = `<option value="">Select Species</option>`;
    for (const [lin, arr] of groups) {
        html += `<optgroup label="${esc(lin)}">` +
            arr.map(r => `<option value="${esc(r.key)}">${esc(r.label)}</option>`).join('') +
            `</optgroup>`;
    }
    sel.innerHTML = html;

    if (!sel.dataset.wired) {
        sel.addEventListener('change', () => {
            const [slugPart, optPart] = (sel.value || '').split('::');
            state.speciesSlug = slugPart || null;
            state.optionKey = optPart || 'general';
            renderSpeciesBlock();
        });
        sel.dataset.wired = '1';
    }
}



/** Render features and (if eligible) dragon type picker. */
function renderSpeciesBlock() {
    const details = document.getElementById('species-details') ||
        document.querySelector('ul#species-details.feature-list');
    const subs = document.getElementById('subspecies-details');
    if (!details) return;

    // Clear if nothing selected
    if (!state.speciesSlug) {
        details.innerHTML = '';
        if (subs) subs.innerHTML = '';
        return;
    }

    const pick = SPECIES.find(s => s.slug === state.speciesSlug && (s.optionKey || 'general') === state.optionKey)
        || SPECIES.find(s => s.slug === state.speciesSlug);
    if (!pick) {
        details.innerHTML = '';
        if (subs) subs.innerHTML = '';
        return;
    }

    // Push basic fields if present
    const lang = document.getElementById('language');
    const diet = document.getElementById('diet');
    const size = document.getElementById('size');
    if (lang) lang.value = pick.language || '';
    if (diet) diet.value = pick.diet || '';
    if (size) size.value = pick.size || '';

    // Feature names + description inline; add simple pills if present
    details.innerHTML = (pick.features || []).map(f => {
        const pills = [f.action, [f.damage, f.type].filter(Boolean).join(', ')].filter(Boolean)
            .map(x => `<span class="pill">${esc(x)}</span>`).join(' ');
        const desc = f.description ? `: ${esc(f.description)}` : '';
        return `<li><strong>${esc(f.name || 'Feature')}</strong>${desc}${pills ? ' ' + pills : ''}</li>`;
    }).join('') || '';

    // Dragon type (optional)
    if (subs) subs.innerHTML = '';
    if (subs && pick.dragonEligible && DRAGON_TYPES.length) {
        subs.innerHTML = dragonTypeHTML();
        const dsel = subs.querySelector('.dragonTypeSelect');
        if (state.dragonType && !DRAGON_TYPES.some(dt => dt.slug === state.dragonType)) {
            state.dragonType = null;
            localStorage.removeItem('c20.dragonType');
        }
        if (state.dragonType) dsel.value = state.dragonType;

        dsel.addEventListener('change', () => {
            state.dragonType = dsel.value || null;
            if (state.dragonType) localStorage.setItem('c20.dragonType', state.dragonType);
            else localStorage.removeItem('c20.dragonType');
            updateDragonPreview(subs);
        });

        updateDragonPreview(subs);
    }
}

/* 
   DRAGON TYPE UI
    */
function dragonTypeHTML() {
    const opts = DRAGON_TYPES.map(dt => {
        const label = dt.element ? `${dt.title} (${dt.element})` : dt.title;
        const sel = state.dragonType === dt.slug ? ' selected' : '';
        return `<option value="${dt.slug}"${sel}>${esc(label)}</option>`;
    }).join('');
    return `
    <section class="dragon-type">
      <label><strong>Dragon Type</strong></label>
      <select class="dragonTypeSelect">${opts}</select>
      <div class="dragon-type-preview"></div>
    </section>`;
}

function updateDragonPreview(root) {
    const view = root.querySelector('.dragon-type-preview');
    const chosen = DRAGON_TYPES.find(dt => dt.slug === state.dragonType);
    view.innerHTML = chosen ? `
    <p class="dt-feature">
      ${chosen.element ? `<span class="pill">${esc(chosen.element)}</span>` : ''}
      <strong>${esc(chosen.featureName)}:</strong> ${esc(chosen.featureText)}
    </p>` : '';
}

// === Check Totals & Derived Stats Helpers ===

// All the check TOTAL fields we want to affect/sum
const CHECK_TOTAL_FIELDS = [
    "agilityTotal",
    "craftingTotal",
    "stealthTotal",
    "strengthTotal",
    "survivalTotal",
    "influenceTotal",
    "intellectTotal",
    "luckTotal",
    "observationTotal",
    "spiritTotal"
];

// Grab the inputs for those fields
function getCheckTotalInputs() {
    return CHECK_TOTAL_FIELDS
        .map(name => document.querySelector(`input[name="${name}"]`))
        .filter(Boolean);
}

// Update the "Total Checks" box at the bottom of the table
function updateTotalChecksSum() {
    const inputs = getCheckTotalInputs();
    let sum = 0;

    inputs.forEach(input => {
        const v = parseInt(input.value, 10);
        if (!isNaN(v)) sum += v;
    });

    const totalField = document.getElementById("totalChecksSum");
    if (totalField) {
        totalField.value = sum;
    }
}

// +1 / -1 to all check totals
function adjustAllTotals(delta) {
    const inputs = getCheckTotalInputs();

    inputs.forEach(input => {
        const current = parseInt(input.value, 10) || 0;
        input.value = current + delta;
    });

    updateTotalChecksSum();
    // Keep derived stats in sync if Agi/Str/Obs changed
    if (typeof calculateDerivedStats === "function") {
        calculateDerivedStats();
    }
}

// Clear all check totals
function clearAllTotals() {
    const inputs = getCheckTotalInputs();

    inputs.forEach(input => {
        input.value = "";
    });

    updateTotalChecksSum();
    if (typeof calculateDerivedStats === "function") {
        calculateDerivedStats();
    }
}

// Core derived stats logic: Wounds, Movement, LLV
function calculateDerivedStats() {
    const agiInput = document.getElementById("agilityTotal");
    const strInput = document.getElementById("strength");
    const obsInput = document.getElementById("observation");

    const agility = agiInput ? parseInt(agiInput.value, 10) || 0 : 0;
    const strength = strInput ? parseInt(strInput.value, 10) || 0 : 0;
    const observation = obsInput ? parseInt(obsInput.value, 10) || 0 : 0;

    const woundsTotal = document.getElementById("wounds");
    const moveTotal = document.getElementById("movement");
    const llvTotal = document.getElementById("llv");

    // Wounds = Agi + Str【turn9file1†charsheet.html†L11-L13】
    if (woundsTotal) {
        woundsTotal.value = agility + strength;
    }

    // Movement = 30 + 5 per 2 Agi【turn9file8†charsheet.html†L8-L10】
    if (moveTotal) {
        moveTotal.value = 30 + 5 * Math.floor(agility / 2);
    }

    // LLV = 30 + 5 per 2 Obs【turn9file4†charsheet.html†L6-L8】
    if (llvTotal) {
        llvTotal.value = 30 + 5 * Math.floor(observation / 2);
    }

    // Optional: if current values are empty or 0, sync them to totals
    const woundsCurrent = document.getElementById("woundsCurrent");
    const moveCurrent = document.getElementById("moveCurrent");
    const llvCurrent = document.getElementById("llvCurrent");

    if (woundsCurrent && (!woundsCurrent.value || woundsCurrent.value === "0")) {
        woundsCurrent.value = woundsTotal ? woundsTotal.value : "";
    }
    if (moveCurrent && (!moveCurrent.value || moveCurrent.value === "0")) {
        moveCurrent.value = moveTotal ? moveTotal.value : "";
    }
    if (llvCurrent && (!llvCurrent.value || llvCurrent.value === "0")) {
        llvCurrent.value = llvTotal ? llvTotal.value : "";
    }

    // Keep the Total Checks box updated when Agi/Str/Obs move
    updateTotalChecksSum();
}

// Button just calls this
function recalculateAllStats() {
    calculateDerivedStats();
}

/*    BOOT    */
document.addEventListener('DOMContentLoaded', async () => {
    await loadSpeciesData();
    buildSpeciesSelect();

    // If a species is preselected in the DOM, hydrate state and render
    const sel = document.getElementById('species');
    if (sel && sel.value) {
        const [slugPart, optPart] = (sel.value || '').split('::');
        state.speciesSlug = slugPart || null;
        state.optionKey = optPart || 'general';
    }

    renderSpeciesBlock();
});
document.addEventListener('DOMContentLoaded', () => {
    const trinketInput = document.getElementById('trinket');
    const motivationInput = document.getElementById('motivation');
    const addEquipTextarea = document.getElementById('addEquip');

    const rollTrinketBtn = document.getElementById('roll-trinket-sheet');
    const rollMotivationBtn = document.getElementById('roll-motivation-sheet');
    const rollAddEquipBtn = document.getElementById('roll-addEquip-sheet');

    if (rollTrinketBtn && trinketInput) {
        rollTrinketBtn.addEventListener('click', () => {
            const result = getRandomItem(trinketList);
            trinketInput.value = result;
        });
    }

    if (rollMotivationBtn && motivationInput) {
        rollMotivationBtn.addEventListener('click', () => {
            const result = getRandomItem(motivationList);
            motivationInput.value = result;
        });
    }

    if (rollAddEquipBtn && addEquipTextarea) {
        rollAddEquipBtn.addEventListener('click', () => {
            const result = getRandomItem(equipmentList);
            addEquipTextarea.value = result;
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await loadSpeciesData();
    buildSpeciesSelect();

    // existing hydration logic...
    const sel = document.getElementById('species');
    if (sel && sel.value) {
        const [slugPart, optPart] = (sel.value || '').split('::');
        state.speciesSlug = slugPart || null;
        state.optionKey = optPart || 'general';
    }
    renderSpeciesBlock();

    // --- ADD THIS: keep Total Checks auto-updating for every check ---
    getCheckTotalInputs().forEach(input => {
        input.addEventListener('input', updateTotalChecksSum);
        input.addEventListener('change', updateTotalChecksSum);
    });

    // initialize on load
    updateTotalChecksSum();
});
