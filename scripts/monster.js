// Standard base movement speeds
const BASE_MOVEMENT = { walk: 30, burrow: 0, fly: 0 };

// Combine an array of movementModifier objects with BASE_MOVEMENT
const combineMovement = (modifiers) =>
    modifiers.reduce((acc, mod) => {
        Object.entries(mod).forEach(([mode, value]) => {
            acc[mode] = (acc[mode] || 0) + value;
        });
        return acc;
    }, { ...BASE_MOVEMENT });

// Data definitions
var monsterData = {
    base: {
        Celestial: {
            description: "Heavenly and pure, imbued with divine power.",
            names: ["Seraph", "Guardian", "Luminary"],
            features: [
                {
                    name: "Divine Radiance",
                    type: "Healing Effect",
                    effect: "You and allies within {range} regain {value} wounds. If an ally is under the {condition} condition, they may make a {check} to end it."
                },
                {
                    name: "Blessing",
                    type: "Support Effect",
                    effect: "Grant an ally within {range} a divine blessing, giving them +{value} to their next {check} for {duration}."
                },
                {
                    name: "Halo of Protection",
                    type: "Defense Buff",
                    effect: "Allies within {range} gain {value} armor and resistance to {damage} damage for {duration}."
                }
            ],
            movementModifier: { walk: 5 }
        },
        Angelic: {
            description: "Benevolent and graceful, with a touch of celestial might.",
            names: ["Cherub", "Archangel", "Messenger"],
            features: [
                {
                    name: "Angelic Grace",
                    type: "Status Infliction",
                    effect: "Creatures that attack you must succeed on a {check} or take the {condition} condition until the end of their next turn."
                },
                {
                    name: "Holy Smite",
                    type: "Damage Effect",
                    effect: "Your melee attacks deal an additional {value} {damage} damage. If the target fails a {check}, they take the {condition} condition."
                }
            ],
            movementModifier: { walk: 5 }
        },
        Construct: {
            description: "Artificially created beings with a mechanical or magical design.",
            names: ["Golem", "Automaton", "Sentinel"],
            features: [
                {
                    name: "Immovable",
                    type: "Defense Buff",
                    effect: "You gain {value} additional armor and resistance to magic-based attacks."
                }
            ],
            movementModifier: { walk: -10 },
            subtypes: {
                Core: {
                    description: "Constructs with an imbued magical core.",
                    subtypes: {
                        Arcane: {
                            description: "A core powered by arcane forces.",
                            features: [{ name: "Arcane Core", type: "Passive Effect", effect: "Enhances magical abilities, granting +{value} to {check} rolls for spellcasting." }]
                        },
                        Dryad: {
                            description: "A core infused with nature’s spirit.",
                            features: [{ name: "Natural Resilience", type: "Healing Effect", effect: "Regenerate {value} wounds at the start of each turn." }]
                        },
                        Vozian: {
                            description: "A mysterious, otherworldly core.",
                            features: [{ name: "Mystic Echo", type: "Passive Effect", effect: "Mimics magical abilities used within {range} for {duration}." }]
                        },
                        Adapted: {
                            description: "A core that adapts to combat needs.",
                            features: [{ name: "Adaptive Response", type: "Passive Effect", effect: "Adjusts defenses dynamically, increasing resistance to the last {damage} attack taken." }]
                        },
                        Cursed: {
                            description: "A core that brings misfortune to enemies.",
                            features: [{ name: "Curse of Misfortune", type: "Status Infliction", effect: "Lowers enemy {check} rolls by {value} for {duration}." }]
                        }
                    }
                },
                Mech: {
                    description: "Pure mechanical constructs.",
                    subtypes: {
                        Standard: {
                            description: "A standard mechanical design.",
                            features: [{ name: "Metallic Body", type: "Defense Buff", effect: "Resistant to physical damage, reducing all incoming damage by {value}." }]
                        }
                    }
                },
                Vehicle: {
                    description: "Constructs designed for transport or combat on the move.",
                    subtypes: {
                        "Battle Chariot": {
                            description: "A fast, armored vehicle.",
                            features: [{ name: "Ram", type: "Movement Bonus", effect: "Charge at enemies, dealing {value} {damage} damage and knocking them prone if they fail a {check}." }]
                        }
                    }
                },
                Arcane: {
                    description: "Arcane constructs blending technology and magic.",
                    subtypes: {
                        "Arcane Tinker": {
                            description: "A gadget-based magical construct.",
                            features: [{ name: "Spell Tinker", type: "Damage Effect", effect: "Fires arcane bolts dealing {value} {damage} damage." }]
                        }
                    }
                },
                Tinker: {
                    description: "Ingenious constructs built with mechanical ingenuity.",
                    subtypes: {
                        Clockwork: {
                            description: "Precisely engineered for accuracy.",
                            features: [{ name: "Precise Strike", type: "Damage Effect", effect: "Delivers calculated damage with +{value} to {check} rolls for accuracy." }]
                        }
                    }
                },
                Steampunk: {
                    description: "Constructs powered by steam and gears.",
                    subtypes: {
                        Gearwork: {
                            description: "A blend of brass and steam.",
                            features: [{ name: "Steam Burst", type: "Damage Effect", effect: "Blasts foes with scalding steam, dealing {value} {damage} damage and applying the {condition} condition." }]
                        }
                    }
                },
                Crystal: {
                    description: "Constructs formed from crystalline structures.",
                    subtypes: {
                        "Crystal Golem": {
                            description: "Hard and refractive, built from crystal.",
                            features: [{ name: "Prismatic Shield", type: "Defense Buff", effect: "Deflects energy attacks, reducing incoming {damage} damage by {value}." }]
                        }
                    }
                }
            }
        },
        Demon: {
            description: "Malevolent demonic beings from various infernal realms.",
            names: ["Imp", "Fiend", "Hellspawn"],
            features: [
                {
                    name: "Hellfire",
                    type: "Damage Effect",
                    effect: "Unleashes damaging infernos, dealing {value} {damage} damage within {range}."
                }
            ],
            movementModifier: { walk: 10 },
            subtypes: {
                "Ordealis Demon": {
                    description: "A demon from the Ordealis realm.",
                    features: [{ name: "Ordealis Curse", type: "Status Infliction", effect: "Weakens enemy defenses, imposing a {condition} condition on a failed {check}." }]
                },
                "Fey Demon": {
                    description: "A demon with an otherworldly twist.",
                    features: [{ name: "Fey Trickery", type: "Status Infliction", effect: "Confuses foes, causing them to make a {check} or suffer the {condition} condition." }]
                },
                "Dreamsea Demon": {
                    description: "Born of nightmares and illusory seas.",
                    features: [{ name: "Nightmare Wave", type: "Status Infliction", effect: "Sends enemies into a fearful daze, applying {condition} for {duration}." }]
                },
                Imp: {
                    description: "A small, cunning demon.",
                    features: [{ name: "Mischief", type: "Passive Effect", effect: "Disrupts enemy actions, imposing {condition} when interacting with abilities." }]
                },
                "Greater Demon": {
                    description: "A powerful demon of immense strength.",
                    features: [{ name: "Demonic Strength", type: "Damage Effect", effect: "Deals devastating blows, increasing melee {damage} damage by {value}." }]
                },
                "Angelic Demon": {
                    description: "A demon with a twisted, angelic aspect.",
                    features: [{ name: "Fallen Grace", type: "Passive Effect", effect: "Baffles foes with contradictory power, forcing them to make a {check} or suffer {condition}." }]
                },
                "Abyssal Demon": {
                    description: "A demon emerging from the abyss, embodying chaos.",
                    features: [{ name: "Abyssal Roar", type: "Status Infliction", effect: "Instills terror in enemies, forcing them to make a {check} or become {condition} for {duration}." }]
                },
                "Eclipse Demon": {
                    description: "A demon associated with eclipses and dark omens.",
                    features: [{ name: "Shadow Rift", type: "Movement Bonus", effect: "Tears at the fabric of light, teleporting {range} and applying {condition} to creatures in the path." }]
                }
            }
        },
        Denizen: {
            description: "Urban dwellers of mystical cities (orcs, elves, dwarves, etc.), resourceful and diverse.",
            names: ["Humanoid", "Bandit", "Thief", "Brigand", "Thug"],
            features: [{ name: "Streetwise", type: "Passive Effect", effect: "Knows the hidden routes and secrets of the city, granting advantage on {check} rolls for navigation." }],
            movementModifier: { walk: 0 }
        },
        Dragon: {
            description: "Ancient and majestic draconic beings wielding elemental might.",
            names: ["Wyrm", "Drake", "Serpent"],
            features: [{ name: "Dragon's Breath", type: "Damage Effect", effect: "Unleashes elemental fury, dealing {value} {damage} damage in a {range} cone." }],
            movementModifier: { walk: 20 },
            subtypes: {
                wyvern: {
                    description: "A lighter, winged form of draconic terror.",
                    features: [{ name: "Piercing Talons", type: "Damage Effect", effect: "Rips through enemy armor, increasing {damage} damage by {value} and bypassing {value} armor." }]
                },
                wyrm: {
                    description: "A serpentine, ancient dragon steeped in legend.",
                    features: [{ name: "Ancient Wisdom", type: "Passive Effect", effect: "Reveals enemy weaknesses, granting +{value} to {check} rolls when analyzing foes." }]
                },
                hydra: {
                    description: "A multi-headed beast that regenerates quickly.",
                    features: [{ name: "Regenerative Heads", type: "Healing Effect", effect: "Recovers from damage rapidly, regenerating {value} wounds at the start of each turn." }]
                }
            }
        },
        Dreamsea: {
            description: "Mystical beings born of dreams and illusions.",
            names: ["Phantom", "Mirage", "Specter"],
            features: [{ name: "Illusory Veil", type: "Status Infliction", effect: "Confuses foes with reality-distorting energy, causing them to make a {check} or suffer {condition}." }],
            movementModifier: { walk: 0 }
        },
        Eclipse: {
            description: "Creatures shrouded in darkness and the power of death.",
            names: ["Wraith", "Ghoul", "Lich"],
            features: [{ name: "Shadow Strike", type: "Damage Effect", effect: "Delivers surprise attacks from darkness, dealing {value} {damage} damage and applying {condition}." }],
            movementModifier: { walk: 0 },
            subtypes: {
                Undead: {
                    description: "Reanimated corpses that serve dark forces.",
                    features: [{ name: "Decay", type: "Status Infliction", effect: "Weakens living creatures over time, reducing {check} results by {value}." }]
                },
                Vampire: {
                    description: "Bloodsucking predators of the night.",
                    features: [{ name: "Blood Drain", type: "Healing Effect", effect: "Steals life from its victims, healing for {value} per attack." }]
                },
                Ghoul: {
                    description: "Cannibalistic creatures haunting graveyards.",
                    features: [{ name: "Grisly Bite", type: "Damage Effect", effect: "Inflicts infection on contact, dealing {value} {damage} damage and applying {condition}." }]
                },
                Wraith: {
                    description: "Ethereal beings that drain life force.",
                    features: [{ name: "Ethereal Touch", type: "Damage Effect", effect: "Saps the vitality of foes, dealing {value} {damage} damage and reducing {check} by {value}." }]
                }
            }
        },
        Elemental: {
            description: "A creature composed of raw elemental energies.",
            names: ["Essence", "Wisp", "Specter"],
            features: [{ name: "Elemental Surge", effect: "Unleashes pure energy" }],
            movementModifier: { walk: 0 },
            subtypes: {
                acid: {
                    description: "Corrosive energy that eats through matter.",
                    features: [{ name: "Corrosive Touch", effect: "Erodes armor and flesh" }]
                },
                smoke: {
                    description: "A shifting haze that obscures vision.",
                    features: [{ name: "Obscuring Mist", effect: "Reduces enemy accuracy" }]
                },
                darkness: {
                    description: "An embodiment of shadow that drains hope.",
                    features: [{ name: "Umbral Veil", effect: "Cloaks the area in darkness" }]
                },
                fire: {
                    description: "A blazing force that ignites everything.",
                    features: [{ name: "Blazing Inferno", effect: "Scorches foes with fire" }]
                },
                plasma: {
                    description: "Volatile, high-energy matter in constant flux.",
                    features: [{ name: "Plasma Burst", effect: "Releases explosive energy" }]
                },
                paper: {
                    description: "Unexpectedly sharp and delicate.",
                    features: [{ name: "Brittle Edges", effect: "Cuts with surprising precision" }]
                },
                ice: {
                    description: "A frigid force that slows and shatters.",
                    features: [{ name: "Frostbite", effect: "Chills and cracks defenses" }]
                },
                stone: {
                    description: "Solid and enduring, with the power of earth.",
                    features: [{ name: "Rock Solid", effect: "Grants temporary resistance" }]
                },
                lightning: {
                    description: "A rapid strike of electrifying energy.",
                    features: [{ name: "Storm Strike", effect: "Electrocutes with high voltage" }]
                },
                wire: {
                    description: "Sharp and entangling, like barbed wire.",
                    features: [{ name: "Barbed Trap", effect: "Entangles and stuns" }]
                },
                solar: {
                    description: "Radiates with the brightness of the sun.",
                    features: [{ name: "Radiant Burst", effect: "Emits a blinding flash" }]
                },
                thunder: {
                    description: "A booming force that shakes the air.",
                    features: [{ name: "Sonic Boom", effect: "Disorients with powerful sound" }]
                },
                sound: {
                    description: "Vibrates with resonating energy.",
                    features: [{ name: "Resonance", effect: "Vibrates enemy bones" }]
                },
                toxic: {
                    description: "Poisons and debilitates nearby foes.",
                    features: [{ name: "Venomous Cloud", effect: "Releases toxic fumes" }]
                },
                radiation: {
                    description: "Emits harmful, lingering energy.",
                    features: [{ name: "Irradiation", effect: "Causes persistent sickness" }]
                },
                poison: {
                    description: "Spreads dangerous toxins.",
                    features: [{ name: "Noxious Spray", effect: "Poisons with each hit" }]
                },
                fluid: {
                    description: "Shifts and flows unpredictably.",
                    features: [{ name: "Liquid Form", effect: "Adapts its shape mid-combat" }]
                },
                water: {
                    description: "Washes over foes with unstoppable force.",
                    features: [{ name: "Tidal Wave", effect: "Knocks enemies off their feet" }]
                },
                oil: {
                    description: "Slick and treacherous.",
                    features: [{ name: "Slippery Coating", effect: "Makes surfaces dangerously slick" }]
                },
                blood: {
                    description: "Drains life with each strike.",
                    features: [{ name: "Crimson Flow", effect: "Saps strength from victims" }]
                },
                metal: {
                    description: "Hard and unyielding.",
                    features: [{ name: "Metallic Clang", effect: "Stuns with reverberation" }]
                },
                copper: {
                    description: "Channels electric shocks through its body.",
                    features: [{ name: "Electro-Copper", effect: "Delivers electric bursts" }]
                },
                iron: {
                    description: "Embodies raw, unbreakable strength.",
                    features: [{ name: "Iron Will", effect: "Boosts defensive power" }]
                },
                bronze: {
                    description: "Crushing and relentless.",
                    features: [{ name: "Bronze Charge", effect: "Delivers a devastating blow" }]
                },
                storm: {
                    description: "A furious, chaotic maelstrom.",
                    features: [{ name: "Tempest Fury", effect: "Unleashes a barrage of wind and rain" }]
                },
                empathy: {
                    description: "Surprisingly, it channels shared emotion.",
                    features: [{ name: "Emotional Surge", effect: "Empowers nearby allies" }]
                }
            }
        },
        "Mana Wraith": {
            description: "Spirits that drain mana, evolving from a Mana Spirit to a Storm with rising power.",
            names: ["Mana Spirit", "Wraith", "Storm"],
            features: [{ name: "Mana Drain", effect: "Drains magical energy from nearby foes." }],
            movementModifier: { walk: 0 }
        },
        Mimic: {
            description: "Creatures that mimic objects or beings to deceive their prey.",
            names: ["Imitator", "Shifter"],
            features: [{ name: "Camouflage", effect: "Blends into surroundings for ambush" }],
            movementModifier: { walk: -5 },
            subtypes: {
                "mobject mimic": {
                    description: "Mimics inanimate objects.",
                    features: [{ name: "Object Impersonation", effect: "Lures victims with a mundane disguise" }]
                },
                "creature mimic": {
                    description: "Mimics living creatures.",
                    features: [{ name: "Creature Imitation", effect: "Assumes the form of another creature" }]
                },
                doppelganger: {
                    description: "Exact replicas of other beings.",
                    features: [{ name: "Mirror Image", effect: "Creates confusing duplicates" }]
                },
                changeling: {
                    description: "Masters of disguise and transformation.",
                    features: [{ name: "Fluid Form", effect: "Adapts shape to evade or ambush" }]
                },
                "feral dragon": {
                    description: "A wild, draconic mimic.",
                    features: [{ name: "Draconic Roar", effect: "Intimidates with a fearsome shout" }]
                },
                "taxi mimic": {
                    description: "A mimic posing as a common vehicle.",
                    features: [{ name: "Rideable Illusion", effect: "Lures travelers with the promise of transport" }]
                },
                "treasure insect": {
                    description: "Mimics a valuable find to ensnare prey.",
                    features: [{ name: "Gleaming Lure", effect: "Attracts with a shimmering appearance" }]
                },
                "mirror spector": {
                    description: "Reflects the appearance of others perfectly.",
                    features: [{ name: "Reflective Form", effect: "Baffles enemies with mirrored images" }]
                }
            }
        },
        Mutant: {
            description: "Creatures altered by magic or environment, unpredictable and evolving.",
            names: ["Aberration", "Chimera", "Mutant"],
            features: [{ name: "Adaptive Mutation", effect: "Changes abilities mid-combat." }],
            movementModifier: { walk: 0 }
        },
        Nature: {
            description: "Wild and untamed beings representing the raw force of nature.",
            names: ["Beast", "Wildling", "Forest Spirit"],
            features: [{ name: "Nature's Fury", effect: "Unleashes elemental wrath on foes." }],
            movementModifier: { walk: 5 }
        },
        Ordealis: {
            description: "Mysterious beings from a forgotten realm, unpredictable and enigmatic.",
            names: ["Oracle", "Mystic", "Seer"],
            features: [{ name: "Prophetic Insight", effect: "Foretells enemy moves." }],
            movementModifier: { walk: 0 }
        },
        Shifter: {
            description: "Chameleons of both nature and magic, able to transform at will.",
            names: ["Formwalker", "Shifter"],
            features: [{ name: "Transform", effect: "Adopts various forms to suit combat." }],
            movementModifier: { walk: 5 }
        }
    },
    additional: {
        // 🔥 FRONTLINE COMBATANTS
        Frontline: {
            description: "Close-quarters combatants built for resilience and melee power.",
            names: ["Brute", "Warrior", "Knight", "Mightforge", "Champion", "Legionnaire", "Vanguard", "Gladiator", "Warlord", "Battlemaster"],
            features: [
                { name: "Crushing Blow", effect: "Delivers devastating physical strikes." },
                { name: "Defensive Stance", effect: "Bolsters defenses and shields allies." },
                { name: "Raging Assault", effect: "Unleashes a flurry of powerful strikes." },
                { name: "Glorious Strike", effect: "Deals extra damage to challenging foes." },
                { name: "Unyielding Guard", effect: "Reduces incoming damage while holding the front line." }
            ],
            movementModifier: { walk: 5 }
        },

        // 🏹 RANGED & ARTILLERY
        Ranged: {
            description: "Ranged specialists who strike from a distance.",
            names: ["Grenadier", "Sharpshooter", "Marksman", "Arbalest", "Longshot", "Sniper", "Bowmaster", "Gunner", "Ballista", "Deadeye"],
            features: [
                { name: "Explosive Charge", effect: "Deals area damage with a burst of energy." },
                { name: "Deadeye Shot", effect: "Hits weak points for extra critical damage." },
                { name: "Piercing Volley", effect: "Fires a barrage that passes through enemies." },
                { name: "Suppressive Fire", effect: "Reduces enemy movement with continuous fire." }
            ],
            movementModifier: { walk: 0 }
        },

        // 🎭 STEALTH & INFILTRATION
        Stealth: {
            description: "Experts in deception, subterfuge, and precise eliminations.",
            names: ["Thief", "Rogue", "Assassin", "Cultist", "Saboteur", "Infiltrator", "Shade", "Nightstalker", "Stalker", "Ghost"],
            features: [
                { name: "Stealth Strike", effect: "Delivers critical damage when undetected." },
                { name: "Shadow Cloak", effect: "Becomes invisible for a short time." },
                { name: "Silent Execution", effect: "Kills instantly if a target is unaware." },
                { name: "Poison Blade", effect: "Laces weapons with debilitating toxins." }
            ],
            movementModifier: { walk: 5 }
        },

        // ✨ SPELLCASTERS & ARCANE MANIPULATORS
        Magic: {
            description: "Spellcasters who wield magic to control the battlefield.",
            names: ["Mage", "Sorcerer", "Mindrift", "Time Warden", "Arcanist", "Invoker", "Spellbinder", "Elementalist", "Voidcaller", "Illusionist"],
            features: [
                { name: "Arcane Blast", effect: "Unleashes a burst of magical energy." },
                { name: "Temporal Shift", effect: "Slows enemies by bending time." },
                { name: "Mental Onslaught", effect: "Bombards foes with psychic energy." },
                { name: "Reality Tear", effect: "Disrupts physical space to create dangerous rifts." }
            ],
            movementModifier: { walk: 0 }
        },

        // 🌿 SUPPORT & HEALING
        Support: {
            description: "Healers and enablers who empower allies.",
            names: ["Medic", "Doctor", "Priest", "Support", "Adept", "Caretaker", "Guardian", "Pacifier", "Soother", "Warden"],
            features: [
                { name: "Healing Touch", effect: "Rapidly restores health to injured allies." },
                { name: "Divine Prayer", effect: "Calls upon divine intervention for protection." },
                { name: "Medical Expertise", effect: "Cures ailments and wounds with precision." },
                { name: "Inspiring Presence", effect: "Boosts the morale and effectiveness of allies." }
            ],
            movementModifier: { walk: 0 }
        },

        // ⚡ SPECIAL ABILITIES (UNIQUE FANTASTICAL ROLES)
        Mystic: {
            description: "Unconventional beings with unique abilities beyond standard combat roles.",
            names: ["Avatar", "Gravitas", "Visionary", "Prophet", "Herald", "Oracle", "Transcendent", "Fatebinder", "Celestial", "Harbinger"],
            features: [
                { name: "Celestial Aura", effect: "Grants blessings that empower allies." },
                { name: "Gravity Well", effect: "Manipulates mass to hinder enemies." },
                { name: "Foretelling", effect: "Predicts enemy moves to gain tactical advantage." },
                { name: "Reality Distortion", effect: "Causes strange and unpredictable effects on the battlefield." }
            ],
            movementModifier: { walk: 0 }
        },

        // 🌿 NATURE & ELEMENTAL FORCES
        Nature: {
            description: "Creatures infused with elemental power or the raw force of nature.",
            names: ["Fungal", "Tribal", "Shaman", "Warden", "Beastcaller", "Wildspeaker", "Druid", "Primalist", "Stormcaller", "Verdant"],
            features: [
                { name: "Primal Roar", effect: "Channels the raw power of nature to intimidate foes." },
                { name: "Spore Cloud", effect: "Releases toxic spores that weaken enemies." },
                { name: "Earthen Bind", effect: "Uses the land itself to trap opponents." },
                { name: "Elemental Surge", effect: "Unleashes bursts of elemental energy." }
            ],
            movementModifier: { walk: 0 }
        },

        // 🕵️‍♂️ INTELLECTUAL & STRATEGIC ROLES
        Tactician: {
            description: "Masters of planning, knowledge, and calculated strikes.",
            names: ["Detective", "Knight", "Paladin", "Strategist", "Tactician", "Commander", "Marshal", "Sentinel", "Battle Sage", "Fieldmaster"],
            features: [
                { name: "Uncover Truth", effect: "Exposes enemy vulnerabilities." },
                { name: "Defensive Tactician", effect: "Anticipates and counters attacks effectively." },
                { name: "Sacred Strike", effect: "Delivers righteous blows that smite evil." },
                { name: "Strategic Insight", effect: "Predicts and outmaneuvers enemies." }
            ],
            movementModifier: { walk: 0 }
        }
    },
    mod: {
        // MUNDANE MODS - Simple but effective modifications
        Mundane: {
            description: "Practical, physical, or tactical changes to a creature.",
            names: ["Armored", "Fast", "Slow", "Resilient", "Heavy", "Agile", "Lumbering", "Stealthy", "Burrowing", "Climbing"],
            features: [
                { name: "Thick Hide", effect: "Reduces damage from physical attacks." },
                { name: "Enhanced Reflexes", effect: "Dodges attacks more easily." },
                { name: "Bulky", effect: "Moves slower but is harder to push around." },
                { name: "Silent Stalker", effect: "Moves unnoticed and ambushes prey." },
                { name: "Tunnel Maker", effect: "Excavates tunnels to surprise enemies." }
            ],
            movementModifier: { walk: 5 }
        },

        // SUPERNATURAL MODS - Magic-infused and mythic traits
        Supernatural: {
            description: "Otherworldly or mystical alterations to a creature.",
            names: ["Elemental Infused", "Ethereal", "Brimstone", "Vampiric", "Immortal", "Fungal", "Void-Touched", "Celestial Marked"],
            features: [
                { name: "Mystic Flight", effect: "Grants the ability to hover and maneuver magically." },
                { name: "Undying", effect: "Sustains itself through magical regeneration." },
                { name: "Venomous Bite", effect: "Injects toxins that paralyze enemies." },
                { name: "Spore Burst", effect: "Releases toxic spores to impair foes." },
                { name: "Elemental Boost", effect: "Augments elemental damage output." }
            ],
            movementModifier: { fly: 10 }
        },

        // STRANGE MUTATIONS - Weird and unpredictable modifications
        Mutations: {
            description: "Unnatural or corrupted traits, often unstable in nature.",
            names: ["Corrupted", "Parasitic", "Voidshape", "Intra-Planar", "Goldrot", "Siphon", "Nested", "Titanic", "Horrific"],
            features: [
                { name: "Tainted Aura", effect: "Weakens nearby beings with corrupt energy." },
                { name: "Life Leech", effect: "Drains strength from its host to bolster itself." },
                { name: "Planar Shift", effect: "Flickers between dimensions to evade attacks." },
                { name: "Cursed Decay", effect: "Weakens armor and corrodes metal." },
                { name: "Shifting Form", effect: "Alters its appearance to confuse attackers." }
            ],
            movementModifier: { walk: 0 }
        },

        // COMMANDER & HIERARCHY - Mods that change social or tactical positioning
        Command: {
            description: "Denotes leadership, servitude, or group combat effectiveness.",
            names: ["King", "Tyrant", "Leader", "Minion", "Bound Servant", "Commander", "Pack Alpha"],
            features: [
                { name: "Regal Command", effect: "Boosts the morale of allies and intimidates foes." },
                { name: "Oppressive Rule", effect: "Enforces obedience in its presence." },
                { name: "Commanding Presence", effect: "Inspires and directs allies effectively." },
                { name: "Swarm Tactics", effect: "Excels when operating as part of a horde." },
                { name: "Obedient", effect: "Follows commands without question." }
            ],
            movementModifier: { walk: 0 }
        }
    }
};

const monsterMotivations = [
    "Bloodlust", "Hunting prey", "Defending territory", "Seeking revenge", "Eliminating a perceived threat",
    "Fighting for dominance", "Following orders to kill", "Destroying intruders", "Rampaging due to pain or madness",
    "Marking territory with violence", "Scavenging for food", "Protecting young", "Guarding a nest or lair",
    "Defending a wounded ally", "Hiding from a larger predator", "Storing food or resources", "Avoiding danger",
    "Moving to a safer area", "Seeking a cure for an ailment", "Following a leader’s command", "Seeking companionship",
    "Performing a ritual", "Testing intruders before trusting them", "Enforcing order in its domain", "Looking for a mate",
    "Defending its tribe or faction", "Reclaiming lost land", "Investigating strange sounds or smells",
    "Searching for something lost", "Chasing a moving object", "Collecting shiny objects", "Observing intruders without hostility",
    "Imitating other creatures", "Seeking something familiar", "Seeking magical energy", "Guarding an ancient secret",
    "Bound by a curse to perform an action", "Absorbing souls or life force", "Being controlled by another entity",
    "Manifesting due to an old prophecy", "Enforcing a divine or eldritch law", "Reenacting an ancient battle",
    "Wandering aimlessly", "Playing tricks or misleading travelers", "Spreading destruction for fun",
    "Escaping from a captor", "Experiencing a mental break", "Acting out due to unnatural corruption",
    "Confused about its purpose", "Seeking freedom from servitude"
];
const actionTypes = ["Action", "Half-Action", "Off-Action"];
const ranges = ["Melee", "Reach", "Short", "Medium", "Long"];
const damageTypes = ["Physical", "Elemental", "Acid", "Eclipse", "Fire", "Ice", "Lighting", "Solar", "Thunder", "Toxic", "Fluid", "Realm"];
const values = ["1d6", "1d8", "2d4", "1d4!", "3"];
const condition = ["Bleeding", "Broken", "Concussion", "Coughing", "Dislocation", "Slowed", "Pinned", "Prone", "", "Blind", "Charmed", "Confused", "Deaf", "Fear", "Intangible", "Invisible", "Unconscious", "Stunned", "Exhaustion", "Constrained", "Exposed"]
const check = ["Agility","Crafting","Influence","Intellect","Luck","Observation","Spirit","Stealth","Strength","Survival"]
const duration = ["Until the end of their next turn", "1 Minute"]
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const formatFeature = (feature) => {
    // Get random values for your custom tokens
    const randomRange = randomItem(ranges);
    const randomValue = randomItem(values);
    const randomAction = randomItem(actionTypes);
    const randomDamage = randomItem(damageTypes);
    const randomCondition = randomItem(condition);
    const randomCheck = randomItem(check);
    const randomDuration = randomItem(duration);



    // Replace tokens in the effect string with randomized values
    let effect = feature.effect
        .replace("{range}", randomRange)
        .replace("{value}", randomValue)
        .replace("{action}", randomAction)
        .replace("{condition}", randomCondition)
        .replace("{damage}", randomDamage)
        .replace("{check}", randomCheck)
        .replace("{duration}", randomDuration)
        ;

    return { name: feature.name, action: randomAction, effect };
};

class Monster {
    constructor() {
        this.baseKey = document.getElementById("randomize-base").checked
            ? randomItem(Object.keys(monsterData.base))
            : document.getElementById("base-type").value;
        this.addKey = document.getElementById("randomize-additional").checked
            ? randomItem(Object.keys(monsterData.additional))
            : document.getElementById("additional-type").value;
        this.modKey = document.getElementById("randomize-mod").checked
            ? randomItem(Object.keys(monsterData.mod))
            : document.getElementById("mod-type").value;

        this.base = monsterData.base[this.baseKey];
        this.additional = monsterData.additional[this.addKey];
        this.mod = monsterData.mod[this.modKey];
        this.motivation = randomItem(monsterMotivations);

        // Create a monster name from mod, base, and additional names.
        this.name = `${randomItem(this.mod.names)} ${randomItem(this.base.names)} ${randomItem(this.additional.names)}`;

        // Pick one feature from each category (if available) and format them.
        this.features = [
            randomItem(this.base.features || []),
            randomItem(this.additional.features || []),
            randomItem(this.mod.features || [])
        ].filter(Boolean).map(formatFeature);

        // Calculate movement speed using combineMovement.
        const movementMods = [this.base.movementModifier, this.additional.movementModifier, this.mod.movementModifier].filter(Boolean);
        this.movement = combineMovement(movementMods);
    }
}

const createMonsterCard = (monster) => {
    const monsterDiv = document.createElement("div");
    monsterDiv.className = "monster-card";
    const featuresHtml = monster.features
        .map(
            (f) =>
                `<li contenteditable="true"><strong>${f.name}</strong> (${f.action}): ${f.effect}</li>`
        )
        .join("");
    monsterDiv.innerHTML = `
      <h4 contenteditable="true">${monster.name}</h4>
      <p><strong>${toTitleCase(monster.baseKey)} - ${toTitleCase(monster.addKey)} - ${toTitleCase(monster.modKey)}</strong></p>
      <p>${monster.base.description} ${monster.additional.description} ${monster.mod.description}</p>
      <p><strong>Movement Speed:</strong> Walk: ${monster.movement.walk} ft${monster.movement.burrow ? `, Burrow: ${monster.movement.burrow} ft` : ""
        }${monster.movement.fly ? `, Fly: ${monster.movement.fly} ft` : ""}</p>
      <p><strong>Motivation:</strong> ${monster.motivation}</p>
      <h3>Features:</h3>
      <ul>${featuresHtml}</ul>
      <button class="delete-monster">Remove</button>`;
    monsterDiv
        .querySelector(".delete-monster")
        .addEventListener("click", () => monsterDiv.remove());
    return monsterDiv;
}

// Helper to convert a string to Title Case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

// Populate the select dropdowns when DOM is ready.
document.addEventListener("DOMContentLoaded", function () {
    // Populate Base Type select
    var baseSelect = document.getElementById("base-type");
    baseSelect.innerHTML = "";
    Object.keys(monsterData.base).forEach(function (key) {
        var option = document.createElement("option");
        option.value = key;
        option.textContent = toTitleCase(key);
        baseSelect.appendChild(option);
    });

    // Populate Additional Type select
    var addSelect = document.getElementById("additional-type");
    addSelect.innerHTML = "";
    Object.keys(monsterData.additional).forEach(function (key) {
        var option = document.createElement("option");
        option.value = key;
        option.textContent = toTitleCase(key);
        addSelect.appendChild(option);
    });

    // Populate Mod Type select
    var modSelect = document.getElementById("mod-type");
    modSelect.innerHTML = "";
    Object.keys(monsterData.mod).forEach(function (key) {
        var option = document.createElement("option");
        option.value = key;
        option.textContent = toTitleCase(key);
        modSelect.appendChild(option);
    });

    // Attach event listener for generating a monster card
    var generateBtn = document.getElementById("generate-monster");
    var output = document.getElementById("monster-output");
    generateBtn.addEventListener("click", function () {
        var monster = new Monster();
        var card = createMonsterCard(monster);
        output.prepend(card);
    });
});


// -----------------------------------------------------------------------//
// Sidebar toggle functionality
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("toggle-sidebar");

    toggleButton.addEventListener("click", function () {
        if (sidebar.classList.contains("closed")) {
            sidebar.classList.remove("closed");
            sidebar.classList.add("open");
        } else {
            sidebar.classList.remove("open");
            sidebar.classList.add("closed");
        }
    });
});

// Dice roller functionality
let selectedDiceType = 6; // Default dice type (d6)
const rollHistory = document.getElementById("roll-history");

// Update dice type on button click
document.querySelectorAll(".dice-button").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".dice-button").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        selectedDiceType = parseInt(button.dataset.dice, 10);
    });
});


document.getElementById("roll-dice").addEventListener("click", () => {
    const numberOfDice = parseInt(document.getElementById("number-of-dice").value, 10);
    const diceType = parseInt(document.getElementById("dice-type").value, 10);
    const modifier = parseInt(document.getElementById("modifier").value, 10);
    const advantage = document.getElementById("advantage").value;

    if (numberOfDice <= 0 || diceType <= 0) {
        alert("Please enter valid values for dice and modifiers.");
        return;
    }

    let rolls = [];
    let secondaryRolls = [];

    for (let i = 0; i < numberOfDice; i++) {
        const roll = Math.floor(Math.random() * diceType) + 1;
        rolls.push(roll);
        if (advantage !== "none") {
            // Roll secondary dice for advantage/disadvantage
            const secondaryRoll = Math.floor(Math.random() * diceType) + 1;
            secondaryRolls.push(secondaryRoll);
        }
    }

    let finalResult = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

    if (advantage === "advantage") {
        const advantageResult = secondaryRolls.reduce((sum, roll) => sum + roll, 0);
        finalResult = Math.max(finalResult, advantageResult + modifier);
        rolls = rolls.map((roll, i) => `${roll}/${secondaryRolls[i]}`);
    } else if (advantage === "disadvantage") {
        const disadvantageResult = secondaryRolls.reduce((sum, roll) => sum + roll, 0);
        finalResult = Math.min(finalResult, disadvantageResult + modifier);
        rolls = rolls.map((roll, i) => `${roll}/${secondaryRolls[i]}`);
    }

    // Add roll history with color coding for min/max
    const historyItem = document.createElement("li");
    historyItem.innerHTML = `Rolled: ${numberOfDice}d${diceType} (${rolls.map(roll => highlightRoll(roll, diceType)).join(", ")}) + ${modifier} = ${finalResult}`;
    rollHistory.prepend(historyItem);

    // Limit history to the last 10 rolls
    if (rollHistory.children.length > 10) {
        rollHistory.removeChild(rollHistory.lastChild);
    }
});

// Highlight rolls based on value
function highlightRoll(roll, diceType) {
    const [primary, secondary] = roll.toString().split("/").map(Number); // Support for advantage/disadvantage
    const highlight = value => {
        if (value === diceType) return `<span class="roll-max">${value}</span>`; // Max roll
        if (value === 1) return `<span class="roll-min">${value}</span>`; // Min roll
        return `<span class="roll-normal">${value}</span>`; // Default
    };

    return secondary
        ? `${highlight(primary)}/${highlight(secondary)}` // Advantage/Disadvantage case
        : highlight(primary); // Normal roll
}

document.getElementById("roll-d20-check").addEventListener("click", () => {
    const modifier = parseInt(document.getElementById("check-modifier").value, 10);
    const advantage = document.getElementById("check-advantage").value;

    const roll1 = Math.floor(Math.random() * 20) + 1; // First d20 roll
    const roll2 = Math.floor(Math.random() * 20) + 1; // Second d20 roll
    let chosenValue; // To track which value is chosen
    let finalRoll; // The final result after applying modifiers

    if (advantage === "advantage") {
        const higherRoll = Math.max(roll1, roll2); // Higher roll
        const adjustedRoll = roll1 + 4; // Add +4 to the first roll
        chosenValue = Math.max(higherRoll, adjustedRoll); // Choose the best value
        finalRoll = chosenValue + modifier;
    } else if (advantage === "disadvantage") {
        const lowerRoll = Math.min(roll1, roll2); // Lower roll
        const adjustedRoll = roll1 + 4; // Add +4 to the first roll
        chosenValue = Math.max(lowerRoll, adjustedRoll); // Choose the best value
        finalRoll = chosenValue + modifier;
    } else {
        chosenValue = roll1; // No advantage/disadvantage
        finalRoll = roll1 + modifier;
    }

    // Add result to history
    const historyItem = document.createElement("li");
    historyItem.innerHTML = `
        Rolled: d20 (${highlightRoll(roll1)}${advantage !== "none" ? `/${highlightRoll(roll2)}` : ""}) + ${modifier} = ${finalRoll} [Chose: ${chosenValue}]
    `;
    document.getElementById("check-history").prepend(historyItem);

    // Limit history to the last 10 rolls
    if (document.getElementById("check-history").children.length > 10) {
        document.getElementById("check-history").removeChild(document.getElementById("check-history").lastChild);
    }
});

// Highlight rolls based on value
function highlightRoll(value) {
    if (value === 20) {
        return `<span class="roll-max">${value}</span>`; // Natural 20
    } else if (value === 1) {
        return `<span class="roll-min">${value}</span>`; // Natural 1
    } else {
        return `<span class="roll-normal">${value}</span>`; // Default roll
    }
}

