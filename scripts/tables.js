document.addEventListener("DOMContentLoaded", () => {
  // === MOTIVATION ===
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
      const selectedMotivation = document.getElementById("selected-motivation");
  const rollMotivationButton = document.getElementById("rollMotivationButton");

  function rollMotivation() {
    const randomIndex = Math.floor(Math.random() * motivationList.length);
    const result = `${randomIndex + 1}. ${motivationList[randomIndex]}`;
    selectedMotivation.textContent = result;
    localStorage.setItem('selectedMotivation', result);
  }

  rollMotivationButton.addEventListener("click", rollMotivation);
  const savedMotivation = localStorage.getItem('selectedMotivation');
  if (savedMotivation) selectedMotivation.textContent = savedMotivation;

  // === EQUIPMENT ===
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
  const selectedEquipment = document.getElementById("selected-equipment");
  const rollEquipmentButton = document.getElementById("roll-equipment");

  function rollEquipment() {
    const randomIndex = Math.floor(Math.random() * equipmentList.length);
    const result = equipmentList[randomIndex];
    selectedEquipment.textContent = result;
    localStorage.setItem('selectedEquipment', result);
  }

  rollEquipmentButton.addEventListener("click", rollEquipment);
  const savedEquipment = localStorage.getItem('selectedEquipment');
  if (savedEquipment) selectedEquipment.textContent = savedEquipment;

  // === TRINKET ===
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
  const selectedTrinket = document.getElementById("selected-trinket");
  const rollTrinketButton = document.getElementById("roll-trinket");

  function rollTrinket() {
    const randomIndex = Math.floor(Math.random() * trinketList.length);
    const result = trinketList[randomIndex];
    selectedTrinket.textContent = result;
    localStorage.setItem('selectedTrinket', result);
  }

  rollTrinketButton.addEventListener("click", rollTrinket);
  const savedTrinket = localStorage.getItem('selectedTrinket');
  if (savedTrinket) selectedTrinket.textContent = savedTrinket;

  // === WEALTH ===
  const rollWealthButton = document.getElementById("roll-wealth");
  const startingWealthAmount = document.getElementById("starting-wealth-amount");

  rollWealthButton.addEventListener("click", () => {
    const roll = Math.floor(Math.random() * 100) + 1 + 50;
    const result = `You begin with ${roll} gp.`;
    startingWealthAmount.textContent = result;
    localStorage.setItem('startingWealth', result);
  });

  const savedWealth = localStorage.getItem('startingWealth');
  if (savedWealth) startingWealthAmount.textContent = savedWealth;

  // === COPY BUTTONS (SHARED HANDLER) ===
  document.querySelectorAll(".copy-button").forEach(button => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target");
      const text = document.getElementById(targetId)?.textContent || "";
      if (text.trim()) {
        navigator.clipboard.writeText(text).then(() => {
          button.textContent = "Copied!";
          setTimeout(() => button.textContent = "Copy", 1200);
        });
      } else {
        button.textContent = "Nothing to Copy";
        setTimeout(() => button.textContent = "Copy", 1200);
      }
    });
  });
});
