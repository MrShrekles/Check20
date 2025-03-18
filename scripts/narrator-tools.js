document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded. Initializing tooltips...");

    const tooltipLibrary = {
        // Ranges
        "Melee Range": "Within 5ft",
        "reach range": "10ft",
        "Short range": "Within 50ft",
        "Medium range": "50-200ft",
        "Long range": "200-1000ft",

        // Rest and recovery
        "Press On": "After combat take a moment to recover, can only be done twice per long rest.",
        "Long Rest": "A long rest requires 10 hours of uninterrupted downtime",
        "Morale Check": "A check from an enemy or NPC, a failed check can cause them to flee from combat",

        // Conditions
        "Bleeding": "Cannot recover wounds or receive healing.",
        "Broken": "Physical Disadvantage",
        "Concussion": "Mental Disadvantage, Spellcasting Disadvantage",
        "Coughing": "Mental Disadvantage",
        "Dislocation": "Physical Disadvantage",
        "Slowed": "Movement halved",
        "Pinned": "Cannot move; restrained by an object or creature.",
        "Prone": "Disadvantage on ranged attacks; advantage for melee attacks against you.",
        "Blind": "Disadvantage on attack checks; attacks against you have advantage.",
        "Charmed": "Mental Disadvantage; cannot attack the source of the charm.",
        "Confused": "Mental Disadvantage, attacks against you have advantage.",
        "Deaf": "Stealth disadvantage; Spellcasting disadvantage.",
        "Fear": "Must dash away or hide until the end of your next turn.",
        "Intangible": "Immune to physical damage; cannot attack; movement halved.",
        "Invisible": "Cannot be targeted by opportunity attacks; attacks against you have disadvantage.",
        "Unconscious": "Unable to act; vulnerable to critical hits and Finishers.",
        "Stunned": "Disadvantage on all checks; movement halved.",
        "Exhaustion": "Disadvantage on all checks; movement halved.",
        "Constrained": "Cannot make attack actions; attacks against have advantage.",
        "Exposed": "Take double damage.",
        "Injured": "At 0 wounds, any further damage causes immediate Death.",
        "Death": "Character dies and cannot interact with the living world."
    };

    function applyTooltips() {
        const allElements = document.querySelectorAll("body *");

        if (!allElements.length) {
            console.warn("No elements found in body for tooltip processing.");
            return;
        }

        allElements.forEach(element => {
            const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);

            textNodes.forEach(node => {
                let originalText = node.textContent.trim(); // Trim whitespace

                Object.keys(tooltipLibrary).forEach(term => {
                    const regex = new RegExp(`\\b${term}\\b`, "gi"); // Match whole words, case-insensitive

                    if (regex.test(originalText)) {
                        console.log(`Match found for: "${term}" in text: "${originalText}"`); // Debugging
                        const tooltipText = tooltipLibrary[term];

                        // Ensure the node hasn't been replaced already
                        if (element.contains(node)) {
                            const html = originalText.replace(
                                regex,
                                `<span class="tooltip" data-tooltip="${tooltipText}">${term}</span>`
                            );
                            const wrapper = document.createElement("span");
                            wrapper.innerHTML = html;
                            element.replaceChild(wrapper, node);
                        }
                    }
                });
            });
        });
    }

    applyTooltips();
});

document.addEventListener("DOMContentLoaded", () => {
    // Name Generator Components
    const start = ["A", "Ba", "Ci", "Da", "El", "Fa", "Ga", "Gre", "He", "Hi", "In", "Ik", "Jo", "Jor", "Ka", "Lo",
        "Lun", "Om", "Ok", "Pa", "Ma", "Mu", "Na", "Pho", "Qu", "Ra", "Shi", "Tha", "Tra", "Uth",
        "Vi", "Vo", "Wi", "Wu", "Xe", "Xo", "Yu", "Ze", "Zyn", "Za"];
    const core = ["ar", "en", "il", "or", "um", "el", "ix", "an", "os", "iv",
        "ath", "eus", "mir", "dor", "rin", "var", "zel", "tur", "cra", "phy",
        "dyn", "ver", "mal", "zar", "gel", "qui", "nok", "syl", "tov", "zid", "jj", "ii"];
    const end = ["a", "is", "on", "us", "eth", "ian", "el", "or", "yx",
        "al", "ric", "dar", "mon", "ren", "vor", "las", "zun", "ther", "wyn",
        "tog", "ran", "dris", "lix", "sen", "oth", "quar", "pha", "nid", "xir"];

    function generateName() {
        let first = start[Math.floor(Math.random() * start.length)];
        let middle = core[Math.floor(Math.random() * core.length)];
        let last = end[Math.floor(Math.random() * end.length)];

        // Smooth transitions (avoid duplicate vowels/consonants)
        if (first.endsWith(middle[0])) middle = middle.substring(1);
        if (middle.endsWith(last[0])) middle = middle.substring(0, middle.length - 1);

        return first + middle + last;
    }

    // Primary Species Categories
    const speciesGroups = {
        "Human": ["Primarch", "Klienkin", "Changeling"],
        "Dwarf": ["Breaker Banished", "Breaker", "Flamebeard", "Hill", "Mountain"],
        "Elf": ["Fire/Sun", "Noble", "Shadow/Smoke", "Undark/Fungal", "Water/Ice", "Wood/Ashlar", "Wood/Earth"],
        "Breaker Dwarf": ["Fully Red", "Heavily Red", "No Red", "Some Red"],
        "Orc": ["Desert", "Mountain", "Jungle", "Maldios", "Oceanic"],
        "Core Bound": ["Arcane", "Dryad", "Vozian", "Rusty"],
        "Gnome": ["Tinker", "Gloom", "Vozian", "Nemuri"],
        "Changeling": ["Elemental", "Vozian", "Nemuri"],

        "Realm Split": {
            "Ensuri": ["Air", "Stone", "Fire", "Water", "Toxic", "Frost", "Lightning", "Smoke", "Empath"],
            "Helborn": ["Desolate", "Rustfiend", "Soulshade", "Ink Shadow", "Echo Horn", "Icereaver", "Mistfire", "Warshade", "Mortaltus", "Vozian", "Abyssal"],
            "Seraphim": ["Shackleborn (Brakkus)", "Chronal Warden (Chronus)", "Resonance (Dumda)", "Empyreans (Exembar)", "Silent (Jesha)", "Librarian (Signissen)", "Emissary (Zuinmuir)", "Ancestral"],
            "Etherian": ["Dreamborn", "Nightmare Brood"]
        },
        "Goblijjins": {
            "Goblin": ["Wild", "City", "Vozian"],
            "Hojjoblin": ["Wild", "City", "Vozian"]
        },
        "Giant": {
            "Muśkila": ["Tricky"],
            "Visala": ["Half-Giant"],
            "Rākṣasa": ["Demon"],
            "Nirvāsita": ["Banished"]
        },
        "Dragon": [
            "Viridian", "Crimson Pyre", "Glacial", "Cloudburst", "Aquarion", "Venom", "Voltstryke",
            "Solarflare", "Ashen", "Verdant", "Shadowwraith", "Radiance", "Astraleon", "Vozurian",
            "Thornspike", "Reaver", "Crystal"
        ],
        "Kobari": [
            "Viridian", "Crimson Pyre", "Glacial", "Cloudburst", "Aquarion", "Venom", "Voltstryke",
            "Solarflare", "Ashen", "Verdant", "Shadowwraith", "Radiance", "Astraleon", "Vozurian",
            "Thornspike", "Reaver", "Crystal"
        ],
        "Drakonari": [
            "Viridian", "Crimson Pyre", "Glacial", "Cloudburst", "Aquarion", "Venom", "Voltstryke",
            "Solarflare", "Ashen", "Verdant", "Shadowwraith", "Radiance", "Astraleon", "Vozurian",
            "Thornspike", "Reaver", "Crystal"
        ],
        "Greenborn": {
            "Otoata": ["Thorn", "Venin", "Husk"],
            "Ciuperca": ["Psychedelic", "Deadly", "Ghost"],
        },
        "Symbiotes": ["Gloomspawn", "Eternal Worm"],
        "Firstborn": [],
        "Strigoi": ["Tristeţe (Lesser Vampire)", "Avuţie (Viscount)", "Tărie (Winged Vampire)", "Înviere (Undead)"],
        "Gargoyle": ["Infernal (Lavastone)", "Celestial (Marble)", "Stone (Greystone)", "Nemuri (Mind Stone)"],
        "Zoanthropes": ["Predatory Heritage", "Avian Heritage", "Cervidae Heritage", "Aquatic Heritage", "Satyr Heritage", "Centaur Heritage"],
        "Araknakin": ["Scorpikin", "Spiderkin", "Tikkin"],
        "Avians": ["Corvus", "Crane", "Hawk", "Owl", "Passerine", "Penguin", "Phoenix"],
        "Beruklians": ["Gorilla", "Mono Grito", "Oranggian", "Papio (Baboon)"],
        "Caniform": ["Lupine (Alpha)", "Lupine (Sovereign)", "Ursakin", "Foxxin", "Coyote"],
        "Cloven": ["Caprakin (Goatmen)", "Minotaur (Hellhorn)", "Minotaur (Labyrinthine)", "Cervidae (Deerfolk)", "Equinor (Horsefolk)", "Bovinus (Bisonfolk)"],
        "Felidae": ["Paka (Cat-Folk)", "Shujaa (Lion-Folk)", "Kivuli (Panthari)", "Cheetari (Mwendokasi)"],
        "Half Cloven": ["Hippokin", "Elephantine", "Roxodon", "Camelon (Camelfolk)"],
        "Gliers": ["Leporidae (Rabbikin)", "Opossum", "Raccoon", "Squirrel", "Beaver", "Platypus", "Porcupine (Quillkin)", "Chippoterian (Bat Folk)", "Molefolk (Diggers)", "Pangolin", "Armadillo"],
        "Reptilia": ["Savra (Lizard-Greek)", "She-Ren (Snake Men-Chinese)", "Rua (Turtle-Vietnamese)", "Crokagator"],
        "Marsupial": ["Kangarans (Kangaroo Folk)", "Wombarn (Wombat Folk)"],
        "Mythic Beast": ["Kirin (Chimeric Deer/Dragon)", "Ammit (Chimeric Lion/Crocodile)", "Jackalope (Horned Rabbit)", "Griffin (Lion/Eagle)", "Tarasque (Behemoth)"],
        "Plagued One": ["Gnoll", "Scourge", "Scavenger"]
    };


    function getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    function generateSpecies() {
        // Pick a random species category
        const categoryKeys = Object.keys(speciesGroups);
        let category = getRandomItem(categoryKeys);
        let species;

        if (Array.isArray(speciesGroups[category])) {
            // If category has a simple array (like Drakonari or Avians)
            species = getRandomItem(speciesGroups[category]);
        } else {
            // If category is an object with subcategories
            const subCategoryKeys = Object.keys(speciesGroups[category]);
            let subCategory = getRandomItem(subCategoryKeys);

            if (speciesGroups[category][subCategory].length > 0) {
                let subSpecies = getRandomItem(speciesGroups[category][subCategory]);
                species = `${subCategory} - ${subSpecies}`;
            } else {
                species = subCategory;
            }
        }

        return `${category}: ${species}`;
    }

    // Affinity & Habitat Generator Components
    const affinityOptions = [
        "Artisan", "Merchant", "Scholar", "Warrior", "Rogue", "Healer", "Hunter", "Scout", "Performer",
        "Fireborne", "Frostbinder", "Stormcaller", "Stonebound", "Windstrider", "Toxicblood",
        "Lightforged", "Shadowtouched", "Abyssalflame", "Glacialheart", "Thundershaper",
        "Eclipse Revenant", "Wraithborn", "Hollowshade", "Phantomwalker", "Spectral Sentinel", "Ghostbound",
        "Dreamweaver", "Sleepwalker", "Nightmare Touched", "Oneiromancer", "Lucidborn",
        "Hellforged", "Infernal Pactbearer", "Flamefiend", "Ashenblood", "Doombringer", "Voidmarked",
        "Celestial Ward", "Sunblessed", "Dawnforged", "Starborne", "Seraphic Blade", "Divine Speaker",
        "Wildheart", "Feralborn", "Thornbloom", "Forestwarden", "Spiritwalker", "Shapebinder",
        "Drakeblood", "Wyrmtouched", "Scaled Fury", "Skyborn", "Moltenfang", "Venomfang", "Elderwing",
        "Clockwork Soul", "Manacrafted", "Golemforged", "Runebound", "Machinelord", "Etherframe",
        "Fleshsculpted", "Chimeric Experiment", "Twistedborn", "Plaguekin", "Mutantborn", "Aberrant Flesh",
        "Stone Titan", "Skystrider", "Frost Colossus", "Thunderborn", "Stormbringer", "Adventurer",
        "Aerial Acrobat", "Alchemist", "Alchemist", "Ancestral Guardian", "Ancient Bloodline", "Apothecary", "Arcane Archer", "Arcane Trickster", "Archaeologist", "Archaeologist", "Archivist", "Aristocrat", "Art Deco Architect", "Art Therapist", "Artisan's Child", "Assassin", "Astral Traveler", "Astrologer", "Astronomer", "Accountant", "Adept", "Administrative Assistant", "Adventurer", "Adventurer", "Asylum Inmate", "Athlete", "Auditing Clerk", "Automobile Manufacturer", "Aviator", "Aviator", "Aviator Pioneer", "Baker", "Baker", "Banker", "Banker", "Banker", "Barbarian", "Barber", "Barber/urgeon", "Bard", "Barnstormer", "Barnstormer Pilot", "Barrister", "Barroom Brawler", "Bartender", "Battle Master", "Beast", "Beast Master", "Beast Tamer", "Beast Whisperer", "Benefits Coordinator", "Berserker", "Biomedical Engineer", "Black Furies", "Blacksmith", "Blacksmith", "Bladebound", "Bladesinging", "Blues Harmonist", "Boarding School Pupil", "Boardwalk Entrepreneur", "Bodyguard", "Bookkeeper", "Bookkeeper", "Bootlegger", "Bootlegger", "Botanist", "Bounty Hunter", "Boxing Promoter", "Brawler", "Breadmaker", "Brothel Madam/Mister", "Brujah", "Budget Coordinator", "Butcher", "Butcher", "Carpenter", "Cattle Rustler", "Cavalier", "Cavalry Officer",
        "Celestial Messenger", "Champion", "Chaplain", "Chef", "Chemist", "Chimney Sweep", "Chimney Sweep", "Circle of Dreams", "Circle of Spores", "Circle of Stars", "Circle of the Land", "Circle of the Moon", "Circle of the Shepherd", "Clergy", "Cleric", "Clockwork Soul", "Coachman", "Coal Miner", "Coal Miner", "Cobbler", "Cobbler/Shoemaker", "College of Eloquence", "College of Glamour", "College of Lore", "College of Swords", "College of Valor", "College of Whispers", "Colonial Explorer", "Commoner", "Cook", "Country Gentleman/Lady", "Crime Boss", "Crime Syndicate Member", "Crystal Seer", "Cult Escapee", "Cultist", "Curator", "Cursed Enchanter/Enchantress", "Cursed Wanderer", "Dance Marathon Competitor", "Dancer", "Dark Ritualist", "Data Entry Operator", "Demon Binder", "Desert Nomad", "Desert cout", "Deserted Soldier", "Detective", "Dew Collector", "Dietary Aide", "Diplomat", "Disgraced Knight", "Diversity and Inclusion Manager", "Divine Soul", "Dock Hand", "Dock Worker", "Dock Worker", "Dockhand", "Doctor/Dentist", "Draconic Bloodline", "Dragon's Disciple", "Drayman (Horse-Drawn Cart Driver)", "Dreamweaver", "Dressmaker", "Druid", "Druidic Initiate", "Echo Knight", "Eldritch Knight", "Elemental Adept's Apprentice", "Elemental Binder", "Employee", "Enchanted Forager", "Enchanted Stream Fisher", "Entertainer", "Ethereal Artist", "Evangelist", "Event Planner", "Exiled Pixie", "Exiled Prince/Princess", "Factory Foreman", "Factory Worker", "Factory Worker", "Factory Worker", "Factory Worker", "Fae Ambassador", "Fae Beast Tamer", "Fae Court Advisor", "Fae Court Jester", "Fae Court Noble", "Fae-Touched", "Fae-Touched Wanderer", "Faith Healer", "Farmer", "Farmer", "Fighter", "Financial nalyst", "Firefighter", "Fisherman", "Fisherman", "Fitness Trainer", "Flapper", "Flapper Dancer", "Food Service", "Food Service", "Food Service", "Food Service Manager", "Forest Guardian", "Forest Guardian", "Forest Warden", "Forge Domain", "Forklift Operator", "Front Desk Receptionist", "Frontier Pioneer", "Gambler", "Gangster", "Gaslighter (street lamp lighter)", "Gladiator Champion", "Gloom Stalker", "Gold Rush Prospector", "Governess/Tutor", "Government Official", "Grave Domain", "Green Witch/Herbalist", "Grenadier", "Grocer", "Grove Keeper's Child", "Grove Tender", "Guardian of Ancient Secrets", "Guide", "Guild Artisan", "Haberdasher", "Harlem Renaissance Poet", "Herbalist Alchemist", "Hexcrafter",
        "Homesteader/Farmer", "Horizon Walker", "Housekeeping Supervisor", "Housemaid", "Hunter", "Immigrant", "Innkeeper", "Inquisitive", "Inventor", "Inventor's Apprentice", "Janitor", "Jazz Age Novelist", "Jazz Bard", "Jazz Club Singer", "Jazz Musician", "Jazz Musician", "Jeweler", "Journalist", "Journalist/eporter", "Just a Worker", "Labor Relations Specialist", "Labor Union Organizer", "Laundry Attendant", "Laundry orker", "Lawyer", "Librarian", "Librarian", "Librarian", "Life Domain", "Light Domain", "Lighthouse Keeper", "Logger", "Logistics Analyst", "Lonesome Drifter", "Lost Scholar", "Madame", "Mage", "Magus", "Mail Carrier", "Mason", "Mason", "Mason", "Mastermind", "Matchstick Girl", "Mayor", "Mechanic", "Merchant", "Merchant", "Miller", "Milliner (Hat Maker)", "Milliner (hat maker)", "Mining Camp Foreman", "Missionary Preacher", "Mob Enforcer", "Mob Enforcer", "Monk", "Monster layer", "Moonbeam Dancer", "Moonlit Clearing Dancer", "Mountain Hermit", "Mountain Trapper", "Music Therapist", "Mystic", "Mystic Seer", "Mystical Archivist", "Mystical Glade Dweller", "Native Tribe Shaman", "Native Tribe Warrior", "Nature Diviner", "Nature Domain", "Nectar Brewer", "Newsboy", "Newsboy/ewsie", "Newspaper Reporter", "Newspaper Reporter", "Noble Heir", "Novelist", "Nurse", "Oath of Conquest", "Oath of Devotion", "Oath of Glory", "Oath of Redemption", "Oath of the Ancients", "Oath of engeance", "Office Manager", "Opera Singer", "Order Domain", "Orphaned Street Urchin", "Outcast Witch", "Outlaw Bandit",
        "Paladin", "Payroll Specialist", "Performer", "Personal Assistant", "Petal Alchemist", "Pharmacist", "Philanthropist", "Photographer", "Photographer", "Physician", "Pirate of the High Seas", "Playwright", "Plumber", "Policeman", "Policeman/Bobby", "Politician", "Preacher", "Private Eye", "Private Investigator", "Prohibition Agent", "Prohibition Agent", "Prohibition Brute", "Psychic", "Radio Announcer", "Radio Broadcaster", "Railroad Worker", "Railroad Worker", "Railway Worker",
        "Rancher's Heir",
        "Ranger",
        "Relic Hunter",
        "Rigger",
        "Ritual Celebrant",
        "Riverboat Gambler",
        "Rodeo Star", "Rogue",
        "Rune Carver",
        "Rune Enchanter",
        "Sacred Glade Keeper", "Sacred Grove Protector",
        "Saloon Owner",
        "Samurai",
        "Scholar",
        "School of Abjuration", "School of Conjuration",
        "School of Divination",
        "School of Enchantment",
        "School of Evocation", "School of Illusion",
        "School of Necromancy",
        "School of Transmutation",
        "School of War Magic",
        "School Teacher",
        "Schoolteacher",
        "Scribe",
        "Sea Prophet",
        "Seamstress/Tailor",
        "Seamstress/Tailor",
        "Security Guard",
        "Servant/Maid",
        "Service industry", "Service industry",
        "Service industry",
        "Sewer Soldier",
        "Shadow Magic",
        "Shadow Mender",
        "Ship's Captain",
        "Shipping and Receiving Clerk",
        "Shipwright",
        "Shop Assistant", "Silent Film Star",
        "Silent Film Star",
        "Silent Movie Director",
        "Silent Striders",
        "Snake Oil Salesman",
        "Sorcerer",
        "Soulknife",
        "Speakeasy Owner",
        "Speakeasy Owner",
        "Speakeasy Protector",
        "Spirit Medium",
        "Spirit Talker", "Spiritualist/Medium",
        "Stable Hand",
        "Stagecoach Driver",
        "Starlight Harpist",
        "Stationmaster", "Steam Engine Operator", "Stock Market Speculator",
        "Stockbroker",
        "Stone Shaper",
        "Storm Herald",
        "Storm Sorcery",
        "Street Cleaner",
        "Street Samurai", "Street Urchin", "Street Vendor",
        "Streetcar Driver",
        "Suffragette",
        "Suffragette",
        "Suffragette (activist for women's voting rights)",
        "Summoner",
        "Sunlight Chaser",
        "Swarmkeeper", "Swashbuckler",
        "Swing Singer",
        "Sylvan Emissary",
        "Synthesist",
        "Tavernkeeper",
        "Taxi Driver", "Technomancer",
        "Telegraph Operator", "Telegraph Operator", "Telegraph Operator",
        "Telephone Operator",
        "Tempest Domain",
        "Temple Acolyte",
        "The Archfey",
        "The Celestial", "The Fathomless",
        "The Fiend",
        "The Great Old One", "Soulblade",
        "Thief",
        "Thorn Knight", "Tomb Raider",
        "Toreador",
        "Totem Warrior", "Town Sheriff",
        "Train Conductor",
        "Train Robber",
        "Training and Development Manager", "Translator",
        "Traveling Salesman", "Traveling Showman", "Tree Singer", "Trickery Domain", "Twilight Domain", "Uktena", "Undead Wrangler", "Undercover Agent", "Mountain Walker"
    ];

    const habitatOptions = [
        // **Urban & Civilized Locations**
        "Bustling Market", "Cobblestone Streets", "Industrial District", "Seedy Back Alley", "Noble Estates",
        "Sprawling Suburbs", "Quiet Hamlet", "Small Fishing Village", "Remote Farmstead", "Merchant Docks",
        "Crowded Train Station", "Railroad Town", "Mining Settlement", "Roadside Inn", "Wayfarer’s Tavern",
        "Underground Catacombs", "Theater District", "High Society Ballroom", "Speakeasy Lounge", "Abandoned Factory",

        // **Nature & Wilderness**
        "Rolling Grasslands", "Open Farmlands", "Sunflower Fields", "Wind-Swept Hills", "Pine Forest",
        "Maple Grove", "Cherry Blossom Orchard", "Snowy Woods", "Golden Wheat Fields", "Lonely Meadow",
        "Crystal Clear Lake", "Rocky Highlands", "Ancient Redwood Grove", "Echoing Cliffs", "Murky Swamplands",
        "Jagged Ravines", "Glacial Ice Fields", "Sand Dunes", "Bamboo Thicket", "Riverbank Outpost",

        // **Underground & Hidden Locales**
        "Forgotten Crypt", "Collapsing Mine Shaft", "Echoing Cave System", "Underground Reservoir", "Root-Tangled Tunnels",
        "Buried Temple", "Lost Catacombs", "Hidden Bunker", "Witch’s Hollow", "Ancient Sewers", "Ruined Subway Tunnels",

        // **Fantasy & Otherworldly**
        "Underdark", "Astral Plane", "Abyssal Depths", "Boreal Wilds", "Cavern Dwellings", "Sky Cities",
        "Dreamscape", "Fungal Wastes", "Gloom Forest", "Jungle Ruins", "Oceanic Depths", "Twilight Glade",
        "Mountain Stronghold", "Infernal Wastes", "Starborn Citadel", "Rainforest Canopy", "Tundra Expanse",
        "Marshlands", "Sinking Mire", "Desert Outlands", "Seabound Cliffs", "Stormlands", "Feywild Enclaves",
        "Haunted Manor", "Eldritch Swamp", "Time-Lost Ruins", "Crystal Caves", "Ever-burning Wastes"
    ];


    const gods = [
        "Behemoth {Treachery}", "Beinvinger", "Bonkfyre", "Bøsk", "Brakkus", "Brycotarian", "Caishen",
        "Chronus", "Daruuk", "Diabolus", "Dumda", "Dynasty", "Enou", "Exembar", "Falkaust", "Araneae",
        "Azmon (Asmodeus)", "Baset", "Beggar", "Felsmoke", "Fenrir", "Gash {Heresy}", "Hamsa", "Hav",
        "Hpem (Titania)", "Huginn & Muninn", "Jera", "Jesha", "Johanna, The Bear", "Karne", "Khalas God-Dragon",
        "Kistar", "Maldios (Maldios)", "Mephisto", "Meris", "Nag Panchami", "Nassus", "Noble", "Nocha",
        "Noh (Loki)", "Odure", "Ohm (Yggdrasill)", "Pazulu {Lust}", "Pluto {Limbo}", "Ponyta", "Principle Fun",
        "Queldethenarous", "Signessen", "Sov", "Stormbane", "Tala", "Temprusk", "The Dark Edict", "The Dawn",
        "The Elements", "The Emperor", "The Silence", "The Watcher", "Thor (Elemental)", "Toe Fungus",
        "Tortugreg", "Tuchulcha {Fraud}", "Tyrant Lord Breaker", "Undying", "Vassago {Violence}", "Ventress of Iron",
        "Vozo", "Vultus", "Whisper", "Yeeshnu", "Yurmundas", "Zuinmuir", "The 7even"
    ];

    const signatureItems = [
        "Arcane Staff", "Assault Rifle", "Battering Ram", "Battle Axe", "Blackjack Sap",
        "Blowgun", "Blunderbuss", "Bolas", "Bolt-Action Rifle", "Boomerang", "Bootlegger's Sawed-Off Shotgun",
        "Brass Knuckles", "Broadsword", "Claymore", "Club", "Composite Bow", "Crossbow", "Crossbow, Hand",
        "Crossbow, Heavy", "Crossbow, Light", "Dagger", "Dart", "Derringer Pocket Pistol", "Dirigible Bomb",
        "Doel Daggers", "Dueling Sabre", "Falchion", "Flail", "Flapper's Purse Pistol", "Flintlock Pistol",
        "Gangster's Cudgel", "Gas Grenade (riot control)", "Ghost Blade", "Gladius", "Glaive", "Greataxe",
        "Greatclub", "Greatsword", "Halberd", "Hand Cannon", "Hand Crossbow", "Handaxe", "Heavy Staff",
        "Heavy Whip", "Javelin", "Katana", "Kukri", "Lance", "Lever-Action Rifle", "Light Hammer", "Light Whip",
        "Longbow", "Longsword", "Luger P08", "Mace", "Machete", "Machine Gun", "Magic Staff", "Magic Wand",
        "Mangonel", "Maul", "Molotov Cocktail", "Morning Star", "Morningstar", "Mosin-Nagant", "Musket",
        "Naval Cutlass", "Net", "Nunchaku", "Oathbow", "Pike", "Police Baton", "Quarterstaff", "Railway Rifle",
        "Rapier", "Razor Blade (hidden)", "Recurve Bow", "Revolver", "Rune Axe", "Sabre", "Sai", "Sapper's Shovel",
        "Scimitar", "Semi-Automatic Pistol", "Shortbow", "Shortsword", "Shotgun", "Shuriken (Ninja Stars)",
        "Sickle", "Siege Crossbow", "Signal Pistol", "Silvered Dagger", "Sling", "Slingshot", "Sniper Rifle",
        "Speakeasy Dagger", "Spear", "Stielhandgranate (Stick Grenade)", "Submachine Gun", "Sword",
        "Throwing Axe", "Throwing Knife", "Throwing Sword", "Thunder Hammer", "Trident", "Vickers Machine Gun",
        "Walther PPK", "War Hammer", "War Pick", "War Scythe", "Warhammer", "Whip"
    ];

    const motivations = [
        "Achieving dominion over another", "Achieving spiritual enlightenment", "Aiding a self-destructive loved one",
        "Avoiding certain death", "Avoiding financial ruin", "Beating a diagnosis or condition",
        "Becoming a leader of others", "Becoming the sole power or authority", "Being accepted by others",
        "Being a philanthropist", "Being the best at something", "Caring for an aging parent",
        "Carrying on a legacy", "Catching a villain", "Causing someone pain",
        "Coming to grips with a mental disorder", "Controlling others", "Coping with a learning disability or illness",
        "Correcting a perceived mistake", "Dealing with bullies", "Defying expectations",
        "Discovering one's true self", "Discovering something important", "Doing the right thing",
        "Embracing a personal identity", "Embracing chaos", "Escaping a dangerous life",
        "Escaping a killer", "Escaping confinement", "Escaping danger",
        "Escaping homelessness", "Escaping invaders", "Escaping widespread disaster",
        "Establishing a sense of belonging", "Evading responsibility", "Exploring one's biological roots",
        "Finding a lifelong partner", "Finding friendship or companionship", "Finding one's purpose",
        "Finding something lost", "Fitting in", "Forcing a big change",
        "Forcing conversion", "Forgiving oneself", "Gaining control over one's own life",
        "Gaining family recognition", "Getting revenge", "Giving up a child",
        "Having a child", "Having it all", "Keeping what one has no matter what",
        "Learning to trust", "Making someone proud", "Navigating a changing family situation",
        "Obliterating an enemy", "Obsessively pursuing a relationship", "Obtaining glory whatever the cost",
        "Obtaining shelter from the elements", "Overcoming a debilitating fear", "Overcoming a fear",
        "Overcoming abuse and learning to trust", "Overcoming addiction", "Overcoming past failures",
        "Overthrowing good with evil", "Preserving a cultural heritage", "Profiteering",
        "Promoting chaos", "Protecting a loved one", "Protecting one's home or property",
        "Providing for one's family", "Providing security for future generations", "Proving someone wrong",
        "Pursuing a passion", "Pursuing a toxic desire", "Pursuing justice for oneself or others",
        "Pursuing knowledge", "Pursuing mastery of a skill or talent", "Realizing a dream",
        "Reclaiming personal power", "Reuniting with distant family", "Repaying a debt",
        "Rescuing a loved one from a captor", "Resisting peer pressure", "Restoring one's name or reputation",
        "Righting a deep wrong", "Ruining someone's life", "Ruining someone's reputation",
        "Saving the world", "Seeking adventure", "Seeking death",
        "Serving others", "Shaking someone's beliefs", "Solving a problem",
        "Stopping an event from happening", "Supporting oneself financially", "Surviving loss",
        "Surviving the death of a loved one", "Taking what one is owed", "Trying something new",
        "Winning a competition"
    ];


    function generateAffinity() {
        return `${affinityOptions[Math.floor(Math.random() * affinityOptions.length)]} from ${habitatOptions[Math.floor(Math.random() * habitatOptions.length)]}`;
    }
    function generateReligion() {
        return gods[Math.floor(Math.random() * gods.length)];
    }
    function generateSignatureItem() {
        return signatureItems[Math.floor(Math.random() * signatureItems.length)];
    }
    function generateMotivation() {
        return motivations[Math.floor(Math.random() * motivations.length)];
    }

    function generateAll(npcId) {
        document.getElementById(`generated-name-${npcId}`).textContent = generateName();
        document.getElementById(`generated-species-${npcId}`).textContent = generateSpecies();
        document.getElementById(`generated-history-${npcId}`).textContent = generateAffinity();
        document.getElementById(`generated-item-${npcId}`).textContent = generateSignatureItem();
        document.getElementById(`generated-religion-${npcId}`).textContent = generateReligion();
        document.getElementById(`generated-motivation-${npcId}`).textContent = generateMotivation();
    }

    // Function to attach listeners to NPC Generator 1
    function attachEventListeners(npcId) {
        document.getElementById(`generate-name-btn-${npcId}`).addEventListener("click", () => {
            document.getElementById(`generated-name-${npcId}`).textContent = generateName();
        });

        document.getElementById(`generate-species-btn-${npcId}`).addEventListener("click", () => {
            document.getElementById(`generated-species-${npcId}`).textContent = generateSpecies();
        });

        document.getElementById(`generate-history-btn-${npcId}`).addEventListener("click", () => {
            document.getElementById(`generated-history-${npcId}`).textContent = generateAffinity();
        });

        document.getElementById(`generate-item-btn-${npcId}`).addEventListener("click", () => {
            document.getElementById(`generated-item-${npcId}`).textContent = generateSignatureItem();
        });

        document.getElementById(`generate-religion-btn-${npcId}`).addEventListener("click", () => {
            document.getElementById(`generated-religion-${npcId}`).textContent = generateReligion();
        });

        document.getElementById(`generate-motivation-btn-${npcId}`).addEventListener("click", () => {
            document.getElementById(`generated-motivation-${npcId}`).textContent = generateMotivation();
        });

        // Attach the "Generate All" button for this NPC
        document.getElementById(`generate-all-btn-${npcId}`).addEventListener("click", () => {
            generateAll(npcId);
        });
    }

    // Attach event listeners for both NPC generators
    attachEventListeners(1);
    attachEventListeners(2);
    attachEventListeners(3);
    attachEventListeners(4);

});

document.addEventListener("DOMContentLoaded", () => {
    // Business Name Components
    const namePrefixes = ["Silver", "Gilded", "Rusty", "Brass", "Velvet", "Duskwind", "Evernight", "Storm &", "Ember", "Cinder", "Clockwork", "Obsidian", "Ironclad", "Hollow"];
    const nameSubjects = ["Serpent", "Gear", "Lotus", "Crown", "Talon", "Furnace", "Vault", "Anchor", "Coin", "Fang", "Wraith", "Lantern", "Harbor", "Forge", "Spire", "Chalice"];
    const businessTypes = ["Tavern", "Trading Co.", "Forge", "Emporium", "Workshop", "Boutique", "Supply Co.", "Foundry", "Jewelers", "Mercantile", "Bazaar", "Guildhall", "Apothecary", "Syndicate", "Market", "Bank", "Lounge"];

    // 1920s British First & Last Names
    const firstNames = ["Arthur", "Albert", "Alfred", "Bertram", "Basil", "Cecil", "Charles", "Clive", "Colin", "Daniel", "Douglas", "Dudley", "Edgar", "Edmund", "Edward", "Edwin", "Ernest", "Eustace", "Francis", "Frederick", "Geoffrey", "George", "Gerald", "Gordon", "Graham", "Harold", "Herbert", "Horace", "Hubert", "Hugh", "James", "John", "Kenneth", "Leonard", "Lionel", "Malcolm", "Maurice", "Nigel", "Norman", "Percival", "Philip", "Quentin", "Reginald", "Roland", "Ronald", "Rupert", "Sidney", "Stanley", "Terrence", "Theodore", "Victor", "Vincent", "Wallace", "Walter", "Wilfred", "Wilbur", "Winston", "Agatha", "Alice", "Annie", "Audrey", "Barbara", "Beatrice", "Bridget", "Catherine", "Cecilia", "Charlotte", "Clara", "Constance", "Daisy", "Dorothy", "Edith", "Eleanor", "Elizabeth", "Elsie", "Emily", "Emma", "Ethel", "Evelyn", "Felicity", "Florence", "Frances", "Gwendolyn", "Gladys", "Grace", "Harriet", "Helen", "Henrietta", "Irene", "Isabelle", "Jean", "Josephine", "Julia", "Lavinia", "Lilian", "Louisa", "Mabel", "Margaret", "Marjorie", "Mildred", "Millicent", "Muriel", "Nancy", "Nora", "Olive", "Patricia", "Penelope", "Phyllis", "Primrose", "Rosalind", "Rose", "Sylvia", "Theodora", "Victoria", "Vera", "Winifred", "Yvonne"];
    const lastNames = ["Abbington", "Ashworth", "Barclay", "Bradshaw", "Chamberlain", "Chapman", "Daventry", "Ellsworth", "Fairchild", "Gladstone", "Harrington", "Holloway", "Kensington", "Lancaster", "Montague", "Norwood", "Pembroke", "Radcliffe", "Sinclair", "Thornfield", "Whittington", "Winchester", "Yardley"];
    const titles = ["Mr.", "Mrs.", "Miss", "Dr.", "Sir", "Lady", "Dragon",];

    const reputations = [
        // Prestigious & High-Class
        "Highly respected",
        "Well-known among the elite",
        "A staple of high society",
        "A luxurious experience",
        "Frequented by nobles and politicians",
        "Award-winning and widely acclaimed",
        "A historical landmark business",
        "Exclusive clientele only",
        "Rumored to have royal patronage",
        "Has a waiting list months long",

        // Reliable & Well-Established
        "Long-established and trusted",
        "A local institution",
        "Known for quality craftsmanship",
        "A family business passed down generations",
        "Popular with the working class",
        "A cornerstone of the community",
        "Run by a respected master of the trade",
        "Known for fair prices and honesty",
        "The go-to place for its services",
        "Frequently recommended by word of mouth",

        // Mysterious & Unconventional
        "Mysterious and enigmatic",
        "Operates at odd hours",
        "Customers leave whispering",
        "Shrouded in secrecy",
        "Run by an eccentric owner",
        "Appears to have no fixed location",
        "Only those 'in the know' can find it",
        "Ritualistic customer service practices",
        "Deals in esoteric and arcane goods",
        "Surrounded by rumors and myths",

        // Shady & Criminal Ties
        "Shady dealings and questionable business practices",
        "A front for organized crime",
        "Underground network operations",
        "Frequently raided by the authorities",
        "Bribing officials to stay in business",
        "Known for back-alley deals",
        "Rumored to launder money",
        "Run by a former smuggler",
        "Heavily guarded and secretive",
        "A meeting place for underworld figures",

        // Up-and-Coming & Struggling
        "An ambitious newcomer",
        "Up-and-coming but still unknown",
        "Recently renovated and gaining attention",
        "Trying to carve a niche in the market",
        "Innovative but unproven",
        "Struggling to stay afloat",
        "Plagued by debt and bad investments",
        "Losing customers to competitors",
        "Management in constant turmoil",
        "Frequently changing ownership",

        // Dangerous & Fearsome
        "Feared by competitors",
        "No one dares cross its owner",
        "Has a monopoly on its trade",
        "Unfairly drives competitors out of business",
        "Heavy security and tight restrictions",
        "Known for ruthless business tactics",
        "Reputation for dealing with troublemakers harshly",
        "Haunted by past tragedies",
        "Accused of dealing in cursed goods",
        "A recent crime happened on its premises",

        // Unusual & Odd
        "Has the strangest clientele",
        "The business itself seems alive",
        "Employees wear bizarre uniforms",
        "Known for its bizarre and unique products",
        "Customers leave feeling 'changed'",
        "People swear the shop moves locations overnight",
        "Visitors report strange occurrences",
        "The owner is rumored to be non-human",
        "Nobody knows where their goods come from",
        "People go in but don’t always come out"
    ];

    const secrets = [
        // Criminal & Illegal Activity
        "Front for organized crime",
        "Smuggles rare and illegal goods",
        "Owner is an informant for the authorities",
        "Launders money for criminal organizations",
        "Hides contraband in its backrooms",
        "Frequented by known criminals",
        "Has ties to a notorious gang",
        "Bribes officials to avoid inspections",
        "Used as a meeting place for spies",
        "Sells counterfeit goods disguised as real",

        // Hidden Wealth & Artifacts
        "Hides a secret vault filled with treasure",
        "Has a hidden underground chamber",
        "Owner possesses a legendary artifact",
        "Houses a stolen royal heirloom",
        "Customers unknowingly pay with cursed coins",
        "Store items hold hidden magical properties",
        "A secret map is hidden somewhere inside",
        "Owner secretly collects forbidden relics",
        "The sign outside is a coded message for those in the know",
        "A rare book in its possession holds a lost prophecy",

        // Supernatural & Occult
        "Run by a secret society",
        "Has dealings with the underworld",
        "Protected by powerful supernatural figures",
        "A ghost haunts the establishment",
        "Customers sometimes disappear without a trace",
        "Has an old contract with a demon",
        "The business only appears under certain conditions",
        "Employees must perform strange rituals before opening",
        "Its owner is far older than they appear",
        "A secret room leads to another realm",

        // Dangerous Experiments & Curses
        "Experiments with illegal alchemy",
        "The basement hides unethical experiments",
        "Sells enchanted items that cause bad luck",
        "A cursed object is kept locked away in the back",
        "An old debt requires the business to sacrifice something every month",
        "A strange illness plagues those who work here too long",
        "The building itself seems to whisper at night",
        "Customers leave feeling oddly changed",
        "The business attracts people who were thought to be dead",
        "No one knows who built it or when it opened",

        // Financial & Personal Struggles
        "Is deeply in debt to dangerous people",
        "Owner is trying to flee from past crimes",
        "Once belonged to someone who mysteriously vanished",
        "A powerful rival is trying to ruin it",
        "Barely staying afloat, but refuses to close",
        "Employees are forced to work under extreme conditions",
        "A former partner wants revenge for a betrayal",
        "A secret investor is pulling all the strings",
        "The business is unknowingly on cursed land",
        "Something valuable is buried beneath its foundation",

        // Political & Conspiratorial
        "A secret rebellion operates from its basement",
        "The owner is connected to the royal family",
        "Messages for spies are hidden in its receipts",
        "A major scandal is about to surface regarding its dealings",
        "Its profits fund an underground resistance movement",
        "Has access to classified government information",
        "A powerful noble visits in disguise",
        "Hidden documents inside could topple a government",
        "A strange customer always comes to collect 'special orders'",
        "The owner was assumed dead years ago, but is alive and running the shop",

        // 🎭 **Secret Benefactors & Charity Work**
        "Quietly funds an orphanage or shelter",
        "Provides free food to the poor after hours",
        "Houses and employs war veterans in need of work",
        "Owner donates most of their earnings to charity",
        "Offers discounted goods to struggling families",
        "Runs a secret soup kitchen in the back alley",
        "Provides scholarships for gifted but poor students",
        "Supports an underground hospital for the injured",
        "Gives safe passage to those fleeing persecution",
        "Hides rare medicine for those who need it most",

        // 🕊️ **Altruistic & Community-Driven**
        "Gathers donations for rebuilding homes after disasters",
        "Provides free legal aid to the falsely accused",
        "Shelters runaway children in need of protection",
        "Employs people who would otherwise be shunned by society",
        "Forgives debts for customers struggling to pay",
        "Gives free repairs for those who can't afford them",
        "Passes on unsold goods to struggling merchants",
        "Trains apprentices who can't afford an education",
        "Smuggles books into areas where knowledge is restricted",
        "Supports artists and writers by funding their work",

        // 🔮 **Mystical & Protective**
        "Protects the town from a hidden supernatural threat",
        "Has a magical charm that wards off misfortune",
        "Uses secret enchantments to ensure fair deals",
        "A benevolent ghost helps guide lost travelers",
        "Knows a prophecy about the town's future and safeguards it",
        "Has an ancient blessing that ensures prosperity",
        "A secret guardian watches over the business from the shadows",
        "Sells items that bring luck and protection to those in need",
        "A hidden artifact beneath the shop keeps an old evil at bay",
        "Owner can see glimpses of the future and uses it to help others",

        // 🏛️ **Honorable & Ethical**
        "Works hard to keep the city’s streets safe at night",
        "Refuses to deal in goods of unethical origin",
        "Exposes fraud and corruption among the elite",
        "Smuggles people to freedom from oppressive regimes",
        "Acts as a neutral ground for rival factions to negotiate peace",
        "Shelters political exiles from unjust rulers",
        "Shields innocent people from wrongful accusations",
        "Keeps a secret record of crimes that others try to erase",
        "Secretly repairs historical artifacts and donates them",
        "Investigates missing persons and finds lost loved ones",

        // 🎭 **Unexpected Generosity**
        "Hides free gifts in packages to brighten customers’ days",
        "Delivers anonymous care packages to those in need",
        "Employs staff who would otherwise be left destitute",
        "Buys goods from struggling farmers at fair prices",
        "Provides free meals to children without homes",
        "Once saved a famous hero but never speaks of it",
        "Donates profits to maintain public libraries and schools",
        "Funds expeditions to lost civilizations for the sake of knowledge",
        "Ensures no workers are ever exploited in their trade",
        "Lets struggling musicians perform for free, boosting their careers",

        // 🏴‍☠️ **Defying the Status Quo for Good**
        "Provides sanctuary for those fleeing unjust laws",
        "Smuggles messages for those who can't afford official couriers",
        "Trades with outcasts and the downtrodden, keeping them afloat",
        "Secretly funds the resistance against a tyrannical government",
        "Provides a safe house for refugees in need of escape",
        "Distributes stolen goods back to the poor, like a modern Robin Hood",
        "Offers loans with no interest to help struggling businesses",
        "Harbors runaway slaves and helps them find new lives",
        "Trades only in fair-trade goods, rejecting exploitative practices",
        "Teaches literacy to those who were never allowed to learn",

        // 💎 **Rare & Unique Business Secrets**
        "A hidden library exists beneath the store, open only to a select few",
        "Contains a vault with ancient knowledge that no one else has",
        "Owner possesses a legendary recipe that can cure any ailment",
        "Sells handcrafted items made by artisans long thought lost",
        "Has an unknown benefactor who keeps it running despite hardships",
        "Holds an ancient secret about the city's foundation",
        "A forgotten royal once owned the business but disappeared",
        "A secret garden inside produces rare and extinct plants",
        "Has a secret handshake for members of a mysterious order",
        "A small emblem on every item hints at a greater hidden network"
    ];

    // Functions
    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function generateBusinessName() {
        return `The ${getRandomElement(namePrefixes)} ${getRandomElement(nameSubjects)} ${getRandomElement(businessTypes)}`;
    }

    function generateOwnerName() {
        return `${getRandomElement(titles)} ${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
    }

    function generateReputation() {
        return getRandomElement(reputations);
    }

    function generateSecret() {
        return getRandomElement(secrets);
    }

    // Handling multiple generators dynamically
    document.querySelectorAll(".business-generator").forEach(generator => {
        generator.querySelector(".generate-business-name-btn").addEventListener("click", () => {
            generator.querySelector(".generated-business-name").textContent = generateBusinessName();
        });

        generator.querySelector(".generate-owner-btn").addEventListener("click", () => {
            generator.querySelector(".generated-owner").textContent = generateOwnerName();
        });

        generator.querySelector(".generate-reputation-btn").addEventListener("click", () => {
            generator.querySelector(".generated-reputation").textContent = generateReputation();
        });

        generator.querySelector(".generate-secret-btn").addEventListener("click", () => {
            generator.querySelector(".generated-secret").textContent = generateSecret();
        });

        generator.querySelector(".generate-all-business-btn").addEventListener("click", () => {
            generator.querySelector(".generated-business-name").textContent = generateBusinessName();
            generator.querySelector(".generated-owner").textContent = generateOwnerName();
            generator.querySelector(".generated-reputation").textContent = generateReputation();
            generator.querySelector(".generated-secret").textContent = generateSecret();
        });
    });
});

document.addEventListener("DOMContentLoaded", () => {

    function getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // **Dynamic Elements**
    const people = [
        "a childhood friend", "a rival", "a trusted mentor", "a partner", "a family member",
        "a wealthy patron", "a street performer", "a mysterious stranger", "a former lover",
        "a blackmailer", "a detective", "a corrupt official", "a known con artist",
        "a famous author", "a gang leader", "a cabaret singer", "a priest with secrets",
        "an underground doctor", "a notorious bootlegger", "a war veteran",
        "a journalist digging too deep", "a bartender who hears everything"
    ];

    const motivations = [
        "money", "power", "love", "loyalty", "a dangerous secret", "personal survival",
        "revenge", "a guilty conscience", "forbidden knowledge", "protecting someone else",
        "fear of being discovered", "a promise made long ago", "a deal gone wrong",
        "a thirst for adventure", "to save face", "an old debt unpaid", "escaping the past",
        "a misplaced sense of justice", "desperation", "curiosity"
    ];

    const locations = [
        "a speakeasy", "an underground gambling den", "a high-society ball",
        "a police interrogation room", "a dark alley", "a train station", "a jazz club",
        "a foggy dockside", "a grand library", "an exclusive rooftop party",
        "a cramped tenement flat", "a shady pawn shop", "a newspaper office",
        "an abandoned theater", "a train car heading west", "a mansion with locked doors",
        "a ruined cathedral", "a neon-lit dancehall", "a hidden bookshop", "a stolen car",
        "a lavish hotel suite", "a riverboat casino"
    ];

    const objects = [
        "a stolen briefcase", "a forged document", "a cursed relic", "a mysterious letter",
        "an unmarked envelope full of cash", "a hidden ledger", "a famous painting",
        "a bloodstained glove", "a tarnished pocket watch", "a revolver with a single bullet",
        "a diamond necklace", "a counterfeit bill", "a book of secrets",
        "a pair of torn opera tickets", "a locked diary", "a map leading to nowhere",
        "a family heirloom pawned for quick cash", "an unsigned contract",
        "a glass bottle with something dangerous inside", "a torn playing card"
    ];

    const conflicts = [
        "a moral dilemma", "a financial crisis", "a duel", "a secret identity",
        "a police chase", "a lost inheritance", "an arranged marriage",
        "a mistaken identity", "a rival gang's vendetta", "a promise you can't keep",
        "a missing person case", "a forbidden romance", "a debt collector's ultimatum",
        "a judge with a personal grudge", "a political scandal", "a missing body",
        "a business partner's betrayal", "a courtroom drama", "an unexpected blackmail",
        "a coded message you can't decipher", "a public disgrace"
    ];

    const questionTemplates = [
        // Betrayal & Loyalty
        "Have you ever betrayed {person} for {motivation}? Would you do it again?",
        "What secret did you keep from {person} that changed everything?",
        "Who did you swear an oath to protect, and did you keep it?",
        "Was there ever a time you turned your back on {person} for {conflict}?",

        // Memory & Reflection
        "What happened last time you were caught in {location} with {object}?",
        "What’s your worst memory from {location}, and how does it haunt you?",
        "Which memory from {location} do you cherish most, and why?",
        "What regret do you carry from {location}?",

        // Secrets & Lies
        "Have you ever lied to {person} to cover up {conflict}? How did they react when they found out?",
        "What’s the biggest lie or truth you’ve ever told {person} and why?",
        "Who knows your darkest secret from {location}, and what is it?",
        "What forbidden truth did you discover about {person}?",

        // Love & Loss
        "Did you ever lose someone important in {location}? Who were they?",
        "What’s your greatest regret in love, and who was involved?",
        "Who did you once love that you still dream about?",
        "What did you sacrifice for {person}, and was it worth it?",

        // Ambition & Dreams
        "What do you aspire to achieve, even if it means crossing {person}?",
        "What’s the one dream you've never let go of, despite {conflict}?",
        "Who stands in the way of your ambitions, and how do you plan to overcome them?",
        "What drives you to keep going when you feel like giving up?",

        // Conflict & Danger
        "Would you risk your life to protect {person} from {conflict}?",
        "What’s the most dangerous situation you've survived in {location}?",
        "Who have you faced in combat, and what was the outcome?",
        "What’s the most reckless thing you've ever done to escape {conflict}?",

        // Mysteries & Intrigue
        "What’s the strangest thing you’ve ever witnessed in {location}?",
        "Why did you once flee {location} in the dead of night?",
        "What mystery have you dedicated your life to solving?",
        "What forbidden knowledge did you uncover in {location}?",

        // Rumors & Reputations
        "What’s a rumor about you that started in {location}?",
        "What do people whisper about you behind your back?",
        "What’s the one lie about you that everyone believes?",
        "Who spread false stories about you, and why?",

        // Redemption & Forgiveness
        "What’s one thing you wish you could take back about {conflict}?",
        "Who do you seek forgiveness from, and for what deed?",
        "What would you do differently if you could relive a moment in {location}?",
        "Who do you owe a debt of gratitude or an apology to?",

        // Forbidden & Taboo
        "What’s the most forbidden place you've been to, and why?",
        "What taboo have you broken for {motivation}?",
        "What secret society or hidden group are you connected to?",
        "What law or rule did you break that changed your life forever?",

        // Artifact & Relics
        "You once found {object} in {location}. What did you do with it?",
        "What cursed artifact did you stumble upon, and what happened next?",
        "Which relic do you seek and why is it important to you?",
        "What legendary item are you willing to risk everything to possess?",

        // Past & Legacy
        "What family secret are you hiding from the world?",
        "What legacy do you carry from your ancestors?",
        "What’s a piece of advice from {person} you still follow?",
        "What unfinished business do you have in {location}?",

        // Desires & Temptations
        "What’s the one thing you desire most, and what might you risk to achieve it?",
        "What temptation have you struggled to resist?",
        "Who is your forbidden love, and why can’t you be together?",
        "What vice or indulgence can you not give up?",

        // Fears & Nightmares
        "What are you most afraid of losing?",
        "What’s the recurring nightmare that haunts you?",
        "What fear have you kept hidden from everyone, even yourself?",
        "What’s the worst fate you can imagine?",

        // Truth & Deception
        "Who do you trust with your deepest secrets?",
        "What truth have you kept from {person} that would change everything?",
        "What’s the one thing you've never been honest about?",
        "What did you once say that you wish you could take back?"
    ];

    function generateQuestion() {
        let template = getRandom(questionTemplates);
        let filledQuestion = template
            .replace("{person}", getRandom(people))
            .replace("{motivation}", getRandom(motivations))
            .replace("{location}", getRandom(locations))
            .replace("{object}", getRandom(objects))
            .replace("{conflict}", getRandom(conflicts));
        return filledQuestion;
    }

    // Event Listener
    document.getElementById("generate-question-btn").addEventListener("click", () => {
        document.getElementById("generated-question").textContent = generateQuestion();
    });

});
