on('ready', function () {
    sendChat('Check20', '/w gm Check20 API active: Have a good session!');
});

on('chat:message', function (msg) {
    if (msg.type === 'api' && msg.content.startsWith('!damage')) {
        let damageType = msg.content.split(' ')[1];
        processCharacterDamage(msg.who, damageType);
    } else if (msg.type === 'api' && msg.content.startsWith('!spdamage')) {
        let damageType = msg.content.split(' ')[1];
        processStarshipDamage(msg.who, damageType);
    } else if (msg.type === 'api' && msg.content.startsWith('!motivation')) {
        let args = msg.content.split(' ');
        let whisperToGM = args[1]?.toLowerCase() === 'gm';
        processMotivation(msg.who, whisperToGM);
    } else if (msg.type === 'api' && msg.content.startsWith('!trinket')) {
        processTrinket(msg.who);
    }
});

// Standard damage tables
function processCharacterDamage(playerName, damageType) {
    const damageTables = {
        impact: [
            "Broken",
            "Concussion",
            "Coughing",
            "Dislocation",
            "Prone",
            "Knockback (10ft)"
        ],
        piercing: [
            "Additional +1",
            "Additional +2",
            "Additional +3",
            "Additional +4",
            "Additional +5",
            "Pinned"
        ],
        slashing: [
            "Additional +2",
            "Additional +3",
            "Bleeding",
            "Cleave",
            "Disarm",
            "Feint (Take Stance)"
        ],
        fire: [
            "Additional +1",
            "Additional +2",
            "Additional +3",
            "Exposed",
            "Blind",
            "Coughing"
        ],
        ice: [
            "Additional +1",
            "Additional +2",
            "Constrained",
            "Dislocation",
            "Slowed (End Next)",
            "Pinned"
        ],
        thunder: [
            "Additional +1",
            "Cleave",
            "Confusion",
            "Deaf",
            "Disarm",
            "Knockback (20ft)"
        ],
        solar: [
            "Additional +1",
            "Additional +2",
            "Additional +3",
            "Blind",
            "Pinned",
            "Evil Banishment"
        ],
        nature: [
            "Additional +1",
            "Constrained",
            "Confusion",
            "Coughing",
            "Disease (Verdant Fever)",
            "Pinned"
        ],
        lightning: [
            "Additional +1",
            "Additional +2",
            "Additional +3",
            "Blind",
            "Confusion",
            "Pinned"
        ],
        vozian: [
            "Siphon (Half Damage)",
            "Blind",
            "Coughing",
            "Disease (Infernal Skritches)",
            "Intangible (1 round)",
            "Double Damage"
        ],
        eclipse: [
            "Additional +1",
            "Additional +2",
            "Blind",
            "Deaf",
            "Raise upon Death",
            "Fear"
        ],
        psychic: [
            "Additional +1",
            "Blind",
            "Charmed",
            "Concussion",
            "Confusion",
            "Fear"
        ],
        acid: [
            "Additional +1",
            "Additional +2",
            "Additional +3",
            "Exposed",
            "Slowed",
            "Coughing"
        ],
        toxic: [
            "Additional +1",
            "Additional +2",
            "Blind",
            "Confusion",
            "Coughing",
            "Fear"
        ],
        fluid: [
            "Blind",
            "Coughing",
            "Deaf",
            "Broken",
            "Concussion",
            "Prone"
        ],
        healing: [
            "Additional +1",
            "Additional +2",
            "Additional +3",
            "Additional +4",
            "Additional +5",
            "Remove Condition"
        ],
    };

    if (damageTables[damageType.toLowerCase()]) {
        handleDamageTable(playerName, damageType, damageTables[damageType.toLowerCase()]);
    } else {
        sendChat('Check20', `/w gm Unknown damage type: ${damageType}`);
    }
}

// Starship damage tables
function processStarshipDamage(playerName, damageType) {
    const damageTables = {
        impact: [
            "Damage Weapons",
            "Knockback 6cc",
            "Crew Check: Agility",
            "Crew Check: Strength",
            "Crew Condition: Broken",
            "Crew Condition: Concussion"
        ],
        piercing: [
            "Knockback 2cc",
            "Crew Condition: Pinned",
            "Damage +100",
            "Damage +60",
            "Damage +25",
            "Damage Life Support"
        ],
        slashing: [
            "Knockback 4cc",
            "Crew Condition: Bleeding",
            "Damage +100",
            "Damage +60",
            "Damage +25",
            "Damage Gravity"
        ],
        acid: [
            "Crew Check: Survival",
            "Overheat: Gravity",
            "System Corruption: Corrosion",
            "Damage +70",
            "Damage +50",
            "Damage +30"
        ],
        eclipse: [
            "Crew Condition: Blind",
            "Crew Condition: Intangible",
            "Crew Condition: Invisible",
            "Sensor Disrupt",
            "Engage Stealth",
            "Unhindered Move"
        ],
        fire: [
            "Damage Engines",
            "Crew Check: Intellect",
            "Overheat: Weapons",
            "Overheat: Engines",
            "Overheat: Power",
            "Overheat: Life Support"
        ],
        ice: [
            "Stasis",
            "Crew Condition: Unconscious",
            "Damage +30",
            "Crew Condition: Dislocation",
            "Damage Engines",
            "Damage Power"
        ],
        lightning: [
            "Overheat: Gravity",
            "Damage Power",
            "Overheat: Jump Drive",
            "Damage Engines",
            "Damage Weapons",
            "Damage Life Support"
        ],
        solar: [
            "Damage Jump Drive",
            "Crew Check: Stealth",
            "Crew Condition: Stunned",
            "System Corruption: Radiation Poisoning",
            "Sensor Overcharge",
            "Damage Crew Morale"
        ],
        thunder: [
            "Damage Gravity",
            "EMP Burst",
            "Crew Condition: Confused",
            "Crew Condition: Deaf",
            "Overheat: Communications",
            "Crew Condition: Fractured"
        ],
        toxic: [
            "Damage Life Support",
            "Crew Check: Observation",
            "Crew Condition: Coughing",
            "System Corruption: Mold",
            "Damage +60",
            "Damage +25"
        ],
        fluid: [
            "Crew Check: Crafting",
            "System Corruption: Rust Plague",
            "Damage Life Support",
            "Crew Condition: Prone",
            "Damage Engines",
            "Damage Communications"
        ],
        nature: [
            "System Corruption: Parasites",
            "System Corruption: Biomass Overgrowth",
            "System Corruption: Spores",
            "Raid: Spores",
            "Raid: Beasts",
            "Raid: Insects"
        ],
        psychic: [
            "Damage Communications",
            "Damage Crew morale",
            "Crew Check: Influence",
            "Crew Check: Spirit",
            "Raid: Visions",
            "Crew Condition: Charmed"
        ],
        vozian: [
            "Demon Raid",
            "Crew Check: Luck",
            "Raid: Demon",
            "Crew Condition: Exhaustion",
            "Crew Condition: Fear",
            "System Corruption: Void Decay"
        ]
    };

    if (damageTables[damageType.toLowerCase()]) {
        handleDamageTable(playerName, damageType, damageTables[damageType.toLowerCase()]);
    } else {
        sendChat('Check20', `/w gm Unknown damage type: ${damageType}`);
    }
}

function handleDamageTable(playerName, damageType, damageTable) {
    let roll = randomInteger(6);
    let result = damageTable[roll - 1];

    sendChat('Check20', `&{template:shek} {{name=${playerName}}} {{${damageType.charAt(0).toUpperCase() + damageType.slice(1)}=${result}}}`);
}

// Motivation Table
const motivationTable = [
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
    "EmBrAcing cHaOs",
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
    "Winning a competition"
];

function processMotivation(playerName, whisperToGM) {
    let roll = randomInteger(100);
    let motivation = motivationTable[roll - 1]; // Adjust for zero-based index
    let formattedPlayerName = playerName.replace(/ \(GM\)| \(As GM\)/g, ''); // Remove GM tags

    if (whisperToGM) {
        // Whisper the motivation to the GM
        sendChat('Check20', `/w gm &{template:shek} {{name=${formattedPlayerName}}} {{Motivation=${motivation}}}`);
    } else {
        // Send the motivation publicly
        sendChat('Check20', `&{template:shek} {{name=${formattedPlayerName}}} {{Motivation=${motivation}}}`);
    }
}

const trinketTable = [
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
    "A small, intricate clockwork contraption you built as a display of your skill",
    "A small vial of 'holy Fluid' that's actually infused with dark energy",
    "A small, carved wooden ship you found among the cargo",
    "A cowbell, a memento from your favorite dairy cow",
    "A badge from your old Heat department, bearing the symbol of a phoenix rising from the ashes",
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
    "A bell that makes no sound when rung",
    "A deck of cards where all the kings are missing",
    "A diary written in an unknown language",
    "A set of old locksmith tools with one pick inexplicably bent",
    "A whistle that only animals can hear",
    "A locket that refuses to open, sounds like something is moving inside",
    "A feather that falls like a stone when dropped",
    "A piece of chalk that writes on air",
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
    "A bottle that refills with sea Fluid",
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

function processTrinket(playerName) {
    let roll = randomInteger(100); // Roll a d100
    let trinket = trinketTable[roll - 1]; // Adjust for zero-based index
    sendChat('Check20', `&{template:shek} {{name=${playerName}}} {{Trinket=${trinket}}}`);
}

// Roll20 API Script - Add Spell via Chat Command
// Corrected version to allow deletion and full select setting
const generateUUID = (function () {
    "use strict";
    var a = 0, b = [];
    return function () {
        var c = (new Date()).getTime(), d = (c === a);
        a = c;
        var e = new Array(8), f = 7;
        for (; f >= 0; f--) {
            e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
            c = Math.floor(c / 64);
        }
        c = e.join("");
        if (d) {
            for (f = 11; f >= 0 && b[f] === 63; f--) {
                b[f] = 0;
            }
            b[f]++;
        } else {
            for (f = 0; f < 12; f++) {
                b[f] = Math.floor(64 * Math.random());
            }
        }
        for (f = 0; f < 12; f++) {
            c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
        }
        return c;
    };
}());

const generateRowID = function () {
    "use strict";
    return generateUUID().replace(/_/g, "Z");
};

on('chat:message', function (msg) {
    if (msg.type !== 'api') return;

    if (msg.content.startsWith('!addspell')) {
        const parts = msg.content.replace('!addspell ', '').split('|');
        if (parts.length < 3) {
            sendChat('API', '/w gm Usage: !addspell Name|Intent|Effect');
            return;
        }

        const spellName = parts[0].trim();
        const spellIntent = parts[1].trim(); // Example: "Whisper"
        const spellEffect = parts[2].trim();

        if (!msg.selected || msg.selected.length === 0) {
            sendChat('API', '/w gm Please select a token linked to a character.');
            return;
        }

        const token = getObj('graphic', msg.selected[0]._id);
        if (!token) {
            sendChat('API', '/w gm Invalid token selected.');
            return;
        }

        const characterId = token.get('represents');
        if (!characterId) {
            sendChat('API', '/w gm Selected token is not linked to a character.');
            return;
        }

        const newRowId = generateRowID();
        const prefix = `repeating_spells_${newRowId}`;

        // Intent Mapping
        const intentOptions = {
            "Light Whisper": "Light Whisper(0)",
            "Whisper": "Whisper(1)",
            "Surge": "Surge(3)",
            "Shout": "Shout(6)",
            "Roar": "Roar(9)",
            "Storm": "Storm(12)",
            "Cataclysm": "Cataclysm(24)"
        };

        const mappedIntent = intentOptions[spellIntent] || "Whisper(1)";

        // Default selections
        const defaultManner = "Manifest";
        const defaultTransmission = "Material";

        // Default damage settings
        let defaultDamageType = "None"; // Neutral setting
        let defaultDamage = "0"; // No damage


        const attributes = [
            { name: `${prefix}_spell_name`, current: spellName },
            { name: `${prefix}_spell_intent`, current: mappedIntent },
            { name: `${prefix}_spell_action`, current: "Action" },
            { name: `${prefix}_spell_manner`, current: defaultManner },
            { name: `${prefix}_spell_transmission`, current: defaultTransmission },
            { name: `${prefix}_spell_effect`, current: spellEffect },
            { name: `${prefix}_spell_range`, current: "Short" },
            { name: `${prefix}_spell_area`, current: "" },
            { name: `${prefix}_spell_duration`, current: "1 round" },
            { name: `${prefix}_spell_target`, current: "Creature" },
            { name: `${prefix}_spell_damage`, current: defaultDamage },
            { name: `${prefix}_damageType`, current: defaultDamageType }
        ];

        attributes.forEach(attr => {
            createObj('attribute', {
                name: attr.name,
                current: attr.current,
                characterid: characterId
            });
        });

        // Update _reporder_repeating_spells
        let reporderAttr = findObjs({
            type: 'attribute',
            characterid: characterId,
            name: '_reporder_repeating_spells'
        })[0];

        if (reporderAttr) {
            let currentOrder = reporderAttr.get('current') || '';
            let orderList = currentOrder ? currentOrder.split(',') : [];
            orderList.push(newRowId);
            reporderAttr.set('current', orderList.join(','));
        } else {
            createObj('attribute', {
                name: '_reporder_repeating_spells',
                current: newRowId,
                characterid: characterId
            });
        }

        sendChat('API', `/w gm Spell "${spellName}" added and properly registered.`);
    }
});

// Roll20 API Script - Add Armor via Chat Command
on('chat:message', function (msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!addarmor')) return;


    const parts = msg.content.replace('!addarmor ', '').split('|');
if (parts.length < 3) {
    sendChat('API', '/w gm Usage: !addarmor Name|ArmorValue|Description|[CheckMods]');
    return;
}

    const [armorName, armorValue, armorDesc] = parts.map(p => p.trim());

    if (!msg.selected || msg.selected.length === 0) {
        sendChat('API', '/w gm Please select a token linked to a character.');
        return;
    }

    const token = getObj('graphic', msg.selected[0]._id);
    const characterId = token?.get('represents');
    if (!characterId) {
        sendChat('API', '/w gm Selected token is not linked to a character.');
        return;
    }

    const rowId = generateUUID().replace(/_/g, "Z");
    const prefix = `repeating_armor_${rowId}`;

    const attributes = [
        { name: `${prefix}_armor-name`, current: armorName },
        { name: `${prefix}_armorMod`, current: armorValue },
        { name: `${prefix}_armor-desc`, current: armorDesc },
        { name: `${prefix}_armorBulk`, current: 1 },
        { name: `${prefix}_moveMod`, current: 0 },
        { name: `${prefix}_magicpenMod`, current: 0 },
        { name: `${prefix}_lowlight-mod`, current: 0 }
    ];
    // Parse check modifiers
    const checkMods = (parts[3] || "").split(',').map(e => e.trim()).filter(e => e.includes(':'));
    const checkMap = {
        Agility: 'agilityPenalty',
        Crafting: 'craftingPenalty',
        Influence: 'influencePenalty',
        Intellect: 'intellectPenalty',
        Luck: 'luckPenalty',
        Observation: 'observationPenalty',
        Spirit: 'spiritPenalty',
        Stealth: 'stealthPenalty',
        Strength: 'strengthPenalty',
        Survival: 'survivalPenalty',
        Move: 'moveMod',
        Magic: 'magicpenMod'
    };

    // Add each modifier to the attribute list
    checkMods.forEach(mod => {
        const [stat, value] = mod.split(':').map(e => e.trim());
        const attrName = checkMap[stat];
        if (attrName) {
            attributes.push({
                name: `${prefix}_${attrName}`,
                current: parseInt(value, 10) || 0
            });
        }
    });


    attributes.forEach(attr => {
        createObj('attribute', {
            name: attr.name,
            current: attr.current,
            characterid: characterId
        });
    });

    // Update reporder for armor
    let reporderAttr = findObjs({
        type: 'attribute',
        characterid: characterId,
        name: '_reporder_repeating_armor'
    })[0];

    if (reporderAttr) {
        let currentOrder = reporderAttr.get('current') || '';
        let orderList = currentOrder ? currentOrder.split(',') : [];
        orderList.push(rowId);
        reporderAttr.set('current', orderList.join(','));
    } else {
        createObj('attribute', {
            name: '_reporder_repeating_armor',
            current: rowId,
            characterid: characterId
        });
    }

    sendChat('API', `/w gm Armor "${armorName}" added successfully.`);
});

// ── MONSTER FORGE IMPORT ──────────────────────────────────────────────────────
on('chat:message', function (msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!importmonster')) return;

    const jsonStr = msg.content.slice('!importmonster'.length).trim();
    let data;
    try {
        data = JSON.parse(jsonStr);
    } catch (e) {
        sendChat('Monster Forge', '/w gm ⚠️ Could not parse monster data. Was the command pasted correctly?');
        return;
    }

    if (!data || !data.name) {
        sendChat('Monster Forge', '/w gm ⚠️ Monster data is missing a name.');
        return;
    }

    // Find existing character or create new one
    const existing = findObjs({ type: 'character', name: data.name });
    const char = existing.length > 0
        ? existing[0]
        : createObj('character', { name: data.name, inplayerjournals: '', controlledby: '' });
    const cid = char.id;

    function setAttr(attrName, value) {
        const found = findObjs({ type: 'attribute', characterid: cid, name: attrName });
        if (found.length > 0) {
            found[0].set('current', String(value));
        } else {
            createObj('attribute', { characterid: cid, name: attrName, current: String(value) });
        }
    }

    // Set to Minion tab
    setAttr('tab', 'minion');

    // Identity
    if (data.size)        setAttr('size',        data.size);
    if (data.type)        setAttr('npcType',     data.type);
    if (data.description) setAttr('backstory',   data.description);
    if (data.environment) setAttr('environment', data.environment);
    if (data.behavior)    setAttr('behavior',    data.behavior);
    if (data.motivation)  setAttr('motivation',  data.motivation);

    // Combat stats — derive Threat, actions, Mana from PL (sheet workers don't fire via API)
    const pl = data.pl ?? 1;
    const ThreatMax    = Math.floor(pl / 2);
    const numAttacks     = Math.max(1, Math.floor(pl / 3));
    const checkPh        = data.check_physical > 0 ? data.check_physical : Math.ceil(pl / 2);
    const checkMt        = data.check_mental   > 0 ? data.check_mental   : Math.floor(pl / 2);
    const spellPointsMax = data.mana_max ?? (checkMt * 2);

    setAttr('PL',               pl);
    setAttr('threat_max',     ThreatMax);
    setAttr('Threat',         ThreatMax);
    setAttr('num_attacks',      numAttacks);
    setAttr('check_physical',   checkPh);
    setAttr('check_mental',     checkMt);
    setAttr('mana_max', spellPointsMax);
    setAttr('MN',               spellPointsMax);

    // Movement
    setAttr('move_walk',  data.move_walk  ?? 0);
    setAttr('move_fly',   data.move_fly   ?? 0);
    setAttr('move_swim',  data.move_swim  ?? 0);
    setAttr('move_climb', data.move_climb ?? 0);

    // Melee attack
    if (data.melee) {
        setAttr('standard-weapon',   data.melee.name    || 'Melee Attack');
        setAttr('standard-damage',   data.melee.damage  || '1d6');
        setAttr('standard-type',     data.melee.type    || '');
        setAttr('standard-equipped', data.melee.equipped ? '1' : '0');
    }

    // Ranged attack
    if (data.ranged) {
        setAttr('ranged-weapon',   data.ranged.name    || 'Ranged Attack');
        setAttr('ranged-damage',   data.ranged.damage  || '1d6');
        setAttr('ranged-type',     data.ranged.type    || '');
        setAttr('ranged-equipped', data.ranged.equipped ? '1' : '0');
    }

    // Feature as a repeating AE entry
    if (data.feature && data.feature.name) {
        const rowId = generateRowID();
        const prefix = `repeating_AEs_${rowId}`;

        createObj('attribute', { characterid: cid, name: `${prefix}_AE`,            current: 'Feature' });
        createObj('attribute', { characterid: cid, name: `${prefix}_AETitle`,        current: 'Feature' });
        createObj('attribute', { characterid: cid, name: `${prefix}_AEName`,         current: data.feature.name });
        createObj('attribute', { characterid: cid, name: `${prefix}_AE-action`,      current: data.feature.action || 'Action' });
        createObj('attribute', { characterid: cid, name: `${prefix}_AERange`,        current: data.feature.range  || 'Melee' });
        createObj('attribute', { characterid: cid, name: `${prefix}_AEDescription`,  current: data.feature.effect || '' });
        createObj('attribute', { characterid: cid, name: `${prefix}_AEDamage`,       current: '' });
        createObj('attribute', { characterid: cid, name: `${prefix}_damageType`,     current: data.feature.damage || '' });

        // Register row in reporder so Roll20 renders it
        const reporderKey = '_reporder_repeating_AEs';
        const reporder = findObjs({ type: 'attribute', characterid: cid, name: reporderKey })[0];
        if (reporder) {
            const list = (reporder.get('current') || '').split(',').filter(Boolean);
            list.push(rowId);
            reporder.set('current', list.join(','));
        } else {
            createObj('attribute', { characterid: cid, name: reporderKey, current: rowId });
        }
    }

    // Monster spells — one repeating row per intent level per spell
    if (Array.isArray(data.spells) && data.spells.length) {
        const reporderKey = '_reporder_repeating_mspells';
        const rowIds = [];

        data.spells.forEach(spell => {
            (spell.effects || [{ intent: 'Whisper', cost: 1 }]).forEach(effect => {
                const rowId = generateRowID();
                const prefix = `repeating_mspells_${rowId}`;
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-name`,         current: spell.name         || '' });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-manner`,       current: spell.manner       || '' });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-transmission`, current: spell.transmission || '' });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-intent`,       current: effect.intent      || 'Whisper' });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-cost`,         current: String(effect.cost ?? 1) });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-range`,        current: effect.range       || 'Short' });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-damage`,       current: effect.damage      || '1d6' });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-type`,         current: effect.type        || '' });
                createObj('attribute', { characterid: cid, name: `${prefix}_mspell-effect`,       current: effect.effect      || '' });
                rowIds.push(rowId);
            });
        });

        const reporder = findObjs({ type: 'attribute', characterid: cid, name: reporderKey })[0];
        if (reporder) {
            const list = (reporder.get('current') || '').split(',').filter(Boolean);
            rowIds.forEach(id => list.push(id));
            reporder.set('current', list.join(','));
        } else {
            createObj('attribute', { characterid: cid, name: reporderKey, current: rowIds.join(',') });
        }
    }

    sendChat('Monster Forge', `/w gm ✅ "${data.name}" imported as a Minion. Find it in the Journal.`);
});
