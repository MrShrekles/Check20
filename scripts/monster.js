// Data definitions
var monsterData = {
    base: {
        Celestial: {
            description: "Heavenly and pure, imbued with divine power.",
            names: ["Seraph", "Guardian", "Luminary"],
            features: [{ name: "Divine Radiance", effect: "Heals allies and weakens foes." }],
            movement: 35
        },
        Angelic: {
            description: "Benevolent and graceful, with a touch of celestial might.",
            names: ["Cherub", "Archangel", "Messenger"],
            features: [{ name: "Blessing", effect: "Boosts morale and grants temporary strength." }],
            movement: 35
        },
        Construct: {
            description: "Artificially created beings with a mechanical or magical design.",
            names: ["Golem", "Automaton", "Sentinel"],
            features: [{ name: "Immovable", effect: "High defense and resistance to magic" }],
            movement: 20,
            subtypes: {
                Core: {
                    description: "Constructs with an imbued magical core.",
                    subtypes: {
                        Arcane: {
                            description: "A core powered by arcane forces.",
                            features: [{ name: "Arcane Core", effect: "Enhances magical abilities" }]
                        },
                        Dryad: {
                            description: "A core infused with nature’s spirit.",
                            features: [{ name: "Natural Resilience", effect: "Heals over time" }]
                        },
                        Vozian: {
                            description: "A mysterious, otherworldly core.",
                            features: [{ name: "Mystic Echo", effect: "Mimics magical abilities" }]
                        },
                        Adapted: {
                            description: "A core that adapts to combat needs.",
                            features: [{ name: "Adaptive Response", effect: "Adjusts defenses dynamically" }]
                        },
                        Cursed: {
                            description: "A core that brings misfortune to enemies.",
                            features: [{ name: "Curse of Misfortune", effect: "Lowers enemy stats" }]
                        }
                    }
                },
                Mech: {
                    description: "Pure mechanical constructs.",
                    subtypes: {
                        Standard: {
                            description: "A standard mechanical design.",
                            features: [{ name: "Metallic Body", effect: "Resistant to physical damage" }]
                        }
                    }
                },
                Vehicle: {
                    description: "Constructs designed for transport or combat on the move.",
                    subtypes: {
                        "Battle Chariot": {
                            description: "A fast, armored vehicle.",
                            features: [{ name: "Ram", effect: "Charges at enemies" }]
                        }
                    }
                },
                arcane: {
                    description: "Arcane constructs blending technology and magic.",
                    subtypes: {
                        "Arcane Tinker": {
                            description: "A gadget-based magical construct.",
                            features: [{ name: "Spell Tinker", effect: "Fires arcane bolts" }]
                        }
                    }
                },
                tinker: {
                    description: "Ingenious constructs built with mechanical ingenuity.",
                    subtypes: {
                        Clockwork: {
                            description: "Precisely engineered for accuracy.",
                            features: [{ name: "Precise Strike", effect: "Delivers calculated damage" }]
                        }
                    }
                },
                steampunk: {
                    description: "Constructs powered by steam and gears.",
                    subtypes: {
                        Gearwork: {
                            description: "A blend of brass and steam.",
                            features: [{ name: "Steam Burst", effect: "Blasts foes with scalding steam" }]
                        }
                    }
                },
                crystal: {
                    description: "Constructs formed from crystalline structures.",
                    subtypes: {
                        "Crystal Golem": {
                            description: "Hard and refractive, built from crystal.",
                            features: [{ name: "Prismatic Shield", effect: "Deflects energy attacks" }]
                        }
                    }
                }
            }
        },
        Demon: {
            description: "Malevolent demonic beings from various infernal realms.",
            names: ["Imp", "Fiend", "Hellspawn"],
            features: [{ name: "Hellfire", effect: "Unleashes damaging infernos" }],
            movement: 40,
            subtypes: {
                "Ordealis Demon": {
                    description: "A demon from the Ordealis realm.",
                    features: [{ name: "Ordealis Curse", effect: "Weakens enemy defenses" }]
                },
                "Fey Demon": {
                    description: "A demon with an otherworldly twist.",
                    features: [{ name: "Fey Trickery", effect: "Confuses foes" }]
                },
                "Dreamsea Demon": {
                    description: "Born of nightmares and illusory seas.",
                    features: [{ name: "Nightmare Wave", effect: "Sends enemies into a fearful daze" }]
                },
                Imp: {
                    description: "A small, cunning demon.",
                    features: [{ name: "Mischief", effect: "Disrupts enemy actions" }]
                },
                "Greater Demon": {
                    description: "A powerful demon of immense strength.",
                    features: [{ name: "Demonic Strength", effect: "Deals devastating blows" }]
                },
                "Angelic Demon": {
                    description: "A demon with a twisted, angelic aspect.",
                    features: [{ name: "Fallen Grace", effect: "Baffles foes with contradictory power" }]
                },
                "Abyssal Demon": {
                    description: "A demon emerging from the abyss, embodying chaos.",
                    features: [{ name: "Abyssal Roar", effect: "Instills terror in enemies" }]
                },
                "Eclipse Demon": {
                    description: "A demon associated with eclipses and dark omens.",
                    features: [{ name: "Shadow Rift", effect: "Tears at the fabric of light" }]
                }
            }
        },
        Denizen: {
            description: "Urban dwellers of mystical cities (orcs, elves, dwarves, etc.), resourceful and diverse.",
            names: ["Orc", "Elf", "Dwarf"],
            features: [{ name: "Streetwise", effect: "Knows the hidden routes and secrets of the city." }],
            movement: 30
        },
        Dragon: {
            description: "Ancient and majestic draconic beings wielding elemental might.",
            names: ["Wyrm", "Drake", "Serpent"],
            features: [{ name: "Dragon's Breath", effect: "Unleashes elemental fury" }],
            movement: 50,
            subtypes: {
                wyvern: {
                    description: "A lighter, winged form of draconic terror.",
                    features: [{ name: "Piercing Talons", effect: "Rips through enemy armor" }]
                },
                wyrm: {
                    description: "A serpentine, ancient dragon steeped in legend.",
                    features: [{ name: "Ancient Wisdom", effect: "Reveals enemy weaknesses" }]
                },
                hydra: {
                    description: "A multi-headed beast that regenerates quickly.",
                    features: [{ name: "Regenerative Heads", effect: "Recovers from damage rapidly" }]
                }
            }
        },
        Dreamsea: {
            description: "Mystical beings born of dreams and illusions.",
            names: ["Phantom", "Mirage", "Specter"],
            features: [{ name: "Illusory Veil", effect: "Confuses foes with reality-distorting energy." }],
            movement: 30
        },
        Eclipse: {
            description: "Creatures shrouded in darkness and the power of death.",
            names: ["Wraith", "Ghoul", "Lich"],
            features: [{ name: "Shadow Strike", effect: "Delivers surprise attacks from darkness" }],
            movement: 30,
            subtypes: {
                Undead: {
                    description: "Reanimated corpses that serve dark forces.",
                    features: [{ name: "Decay", effect: "Weakens living creatures over time" }]
                },
                Vampire: {
                    description: "Bloodsucking predators of the night.",
                    features: [{ name: "Blood Drain", effect: "Steals life from its victims" }]
                },
                Ghoul: {
                    description: "Cannibalistic creatures haunting graveyards.",
                    features: [{ name: "Grisly Bite", effect: "Inflicts infection on contact" }]
                },
                Wraith: {
                    description: "Ethereal beings that drain life force.",
                    features: [{ name: "Ethereal Touch", effect: "Saps the vitality of foes" }]
                },
                Ghost: {
                    description: "Spirits that linger between worlds.",
                    features: [{ name: "Haunting", effect: "Disturbs enemy focus" }]
                },
                Skeleton: {
                    description: "Bones animated by dark magic.",
                    features: [{ name: "Bone Rattle", effect: "Distracts and unsettles enemies" }]
                },
                Zombie: {
                    description: "Mindless undead that relentlessly pursue the living.",
                    features: [{ name: "Infectious Bite", effect: "Spreads a dangerous plague" }]
                },
                Lich: {
                    description: "Undead mages with immense dark knowledge.",
                    features: [{ name: "Soul Siphon", effect: "Absorbs magical energy from opponents" }]
                },
                Revenant: {
                    description: "Spirits returned from the dead to exact vengeance.",
                    features: [{ name: "Vengeful Strike", effect: "Deals extra damage to past tormentors" }]
                }
            }
        },
        Elemental: {
            description: "A creature composed of raw elemental energies.",
            names: ["Essence", "Wisp", "Specter"],
            features: [{ name: "Elemental Surge", effect: "Unleashes pure energy" }],
            movement: 30,
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
            movement: 30
        },
        Mimic: {
            description: "Creatures that mimic objects or beings to deceive their prey.",
            names: ["Imitator", "Shifter"],
            features: [{ name: "Camouflage", effect: "Blends into surroundings for ambush" }],
            movement: 25,
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
            movement: 30
        },
        Nature: {
            description: "Wild and untamed beings representing the raw force of nature.",
            names: ["Beast", "Wildling", "Forest Spirit"],
            features: [{ name: "Nature's Fury", effect: "Unleashes elemental wrath on foes." }],
            movement: 35
        },
        Ordealis: {
            description: "Mysterious beings from a forgotten realm, unpredictable and enigmatic.",
            names: ["Oracle", "Mystic", "Seer"],
            features: [{ name: "Prophetic Insight", effect: "Foretells enemy moves." }],
            movement: 30
        },
        Shifter: {
            description: "Chameleons of both nature and magic, able to transform at will.",
            names: ["Formwalker", "Shifter"],
            features: [{ name: "Transform", effect: "Adopts various forms to suit combat." }],
            movement: 35
        }
    },
    additional: {
        Avatar: {
            description: "A divine manifestation bridging the mortal and celestial realms.",
            names: ["Avatar", "Incarnation", "Manifestation"],
            features: [{ name: "Celestial Aura", effect: "Grants blessings that empower allies." }],
            movement: 30
        },
        brute: {
            description: "A creature defined by raw power and unrefined strength.",
            names: ["Brute", "Brawler", "Smasher"],
            features: [{ name: "Crushing Blow", effect: "Delivers devastating physical strikes." }],
            movement: 35
        },
        Champion: {
            description: "A battle-tested fighter with a legacy of valor and triumph.",
            names: ["Champion", "Victor", "Hero"],
            features: [{ name: "Glorious Strike", effect: "Deals extra damage to challenging foes." }],
            movement: 35
        },
        Cultist: {
            description: "A devoted follower of mysterious, often dark doctrines.",
            names: ["Cultist", "Zealot"],
            features: [{ name: "Fanatical Rant", effect: "Unleashes maddening incantations that unsettle enemies." }],
            movement: 30
        },
        Detective: {
            description: "Observant and methodical, skilled at uncovering hidden truths.",
            names: ["Detective", "Investigator"],
            features: [{ name: "Uncover Truth", effect: "Exposes enemy vulnerabilities." }],
            movement: 30
        },
        Doctor: {
            description: "A healer or experimental researcher, pushing the limits of medicine.",
            names: ["Doctor", "Surgeon", "Physician"],
            features: [{ name: "Medical Expertise", effect: "Restores health and cures ailments." }],
            movement: 30
        },
        Fungal: {
            description: "A creature fused with spores and decay, thriving on organic rot.",
            names: ["Mycelium", "Sporeling"],
            features: [{ name: "Spore Burst", effect: "Releases toxic spores to weaken foes." }],
            movement: 25
        },
        Gravitas: {
            description: "A gravity bender who manipulates the force of mass at will.",
            names: ["Gravitas", "Gravity Master"],
            features: [{ name: "Gravity Well", effect: "Draws enemies in or pushes them away with gravitational force." }],
            movement: 30
        },
        Grenadier: {
            description: "An explosive specialist who uses incendiary and shrapnel tactics.",
            names: ["Grenadier", "Bomber"],
            features: [{ name: "Explosive Charge", effect: "Deals area damage with a burst of explosive energy." }],
            movement: 30
        },
        Knight: {
            description: "A noble warrior clad in armor, upholding honor and duty.",
            names: ["Knight", "Cavalier", "Squire"],
            features: [{ name: "Defensive Stance", effect: "Bolsters defenses and shields allies." }],
            movement: 30
        },
        Mage: {
            description: "A master of arcane arts, wielding potent spells and mystical knowledge.",
            names: ["Mage", "Wizard", "Sorcerer"],
            features: [{ name: "Arcane Blast", effect: "Unleashes a burst of magical energy on foes." }],
            movement: 30
        },
        Medic: {
            description: "A skilled battlefield healer dedicated to saving lives.",
            names: ["Medic", "Healer"],
            features: [{ name: "Healing Touch", effect: "Rapidly restores health to injured allies." }],
            movement: 30
        },
        Mightforge: {
            description: "A warrior whose strength is honed through relentless combat.",
            names: ["Mightforge", "Berserker"],
            features: [{ name: "Raging Assault", effect: "Unleashes a flurry of powerful strikes." }],
            movement: 30
        },
        Mindrift: {
            description: "A psionic force that warps perception and assaults the mind.",
            names: ["Mindrift", "Psion", "Telepath"],
            features: [{ name: "Mental Onslaught", effect: "Bombards foes with psychic energy." }],
            movement: 30
        },
        Paladin: {
            description: "A holy warrior imbued with divine power and unyielding faith.",
            names: ["Paladin", "Crusader"],
            features: [{ name: "Sacred Strike", effect: "Delivers righteous blows that smite evil." }],
            movement: 30
        },
        Priest: {
            description: "A spiritual guide and healer, devoted to sacred orders.",
            names: ["Priest", "Cleric"],
            features: [{ name: "Divine Prayer", effect: "Calls upon divine intervention to protect allies." }],
            movement: 30
        },
        Prophet: {
            description: "A visionary seer gifted with foresight and mystic insight.",
            names: ["Prophet", "Seer"],
            features: [{ name: "Foretelling", effect: "Predicts enemy moves to gain tactical advantage." }],
            movement: 30
        },
        Support: {
            description: "A dedicated enhancer who bolsters the capabilities of their comrades.",
            names: ["Support", "Buffer"],
            features: [{ name: "Inspire", effect: "Boosts the morale and effectiveness of nearby allies." }],
            movement: 30
        },
        Thief: {
            description: "A cunning and agile rogue skilled in stealth and subterfuge.",
            names: ["Thief", "Rogue", "Cutpurse"],
            features: [{ name: "Stealth Strike", effect: "Delivers critical damage when undetected." }],
            movement: 35
        },
        "Time Warden": {
            description: "A keeper of temporal order who manipulates the flow of time.",
            names: ["Time Warden", "Chrono Guardian"],
            features: [{ name: "Temporal Shift", effect: "Slows enemies by bending time." }],
            movement: 30
        },
        Tribal: {
            description: "A warrior steeped in ancestral tradition and primal might.",
            names: ["Tribal", "Shaman"],
            features: [{ name: "Primal Roar", effect: "Channels the raw power of nature to intimidate foes." }],
            movement: 30
        },
        Visionary: {
            description: "A creative and forward-thinking soul, devising unconventional tactics.",
            names: ["Visionary", "Dreamer"],
            features: [{ name: "Inspiring Vision", effect: "Unleashes innovative tactics to confuse enemies." }],
            movement: 30
        },
        Warrior: {
            description: "A seasoned combatant with extensive battlefield experience.",
            names: ["Warrior", "Fighter", "Soldier"],
            features: [{ name: "Relentless Assault", effect: "Maintains continuous pressure on opponents." }],
            movement: 30
        }
    },
    mod: {
        "bound servant": {
            description: "A creature forced into servitude by dark magic.",
            names: ["Bound Servant", "Enslaved Spirit"],
            features: [{ name: "Obedient", effect: "Follows commands without question." }]
        },
        brimstone: {
            description: "Infused with the searing essence of brimstone and fire.",
            names: ["Brimstone", "Sulfuric"],
            features: [{ name: "Burning Presence", effect: "Radiates heat that scorches foes." }]
        },
        burrowing: {
            description: "Modified for underground movement.",
            names: ["Burrower"],
            features: [{ name: "Tunnel Maker", effect: "Excavates tunnels to surprise enemies." }]
        },
        Corrupted: {
            description: "Twisted by malevolent forces, tainted and unstable.",
            names: ["Corrupted", "Blighted"],
            features: [{ name: "Tainted Aura", effect: "Weakens nearby beings with its corrupt presence." }]
        },
        Deathsong: {
            description: "Haunted by a spectral melody that foretells demise.",
            names: ["Deathsong", "Dirge Singer"],
            features: [{ name: "Melancholy Tune", effect: "Saps the will of those who hear it." }]
        },
        diseased: {
            description: "Carrying a virulent, debilitating illness.",
            names: ["Diseased", "Plagued"],
            features: [{ name: "Infectious Touch", effect: "Spreads sickness with each contact." }]
        },
        "elemental infused": {
            description: "Enhanced by raw elemental energies, altering its core abilities.",
            names: ["Elementally Infused"],
            features: [{ name: "Elemental Boost", effect: "Augments elemental damage output." }]
        },
        "flying -magical": {
            description: "Levitation granted by mystical energies.",
            names: ["Magical Flyer"],
            features: [{ name: "Mystic Flight", effect: "Grants the ability to hover and maneuver magically." }]
        },
        "flying -winged": {
            description: "True flight enabled by natural wings.",
            names: ["Winged"],
            features: [{ name: "Soaring", effect: "Enables sustained, agile flight." }]
        },
        fungal: {
            description: "Overgrown with fungus and spores, exuding decay.",
            names: ["Fungal", "Mushroomed"],
            features: [{ name: "Spore Burst", effect: "Releases toxic spores to impair foes." }]
        },
        "giant (size)": {
            description: "Enlarged beyond normal scale, making it a towering threat.",
            names: ["Giant"],
            features: [{ name: "Massive", effect: "Delivers powerful, oversized strikes." }]
        },
        goldrot: {
            description: "Infused with cursed gold that decays with a toxic touch.",
            names: ["Goldrot"],
            features: [{ name: "Cursed Decay", effect: "Weakens armor and corrodes metal." }]
        },
        immortal: {
            description: "Defies death and the ravages of time.",
            names: ["Immortal"],
            features: [{ name: "Undying", effect: "Sustains itself through magical regeneration." }]
        },
        "intra-planar": {
            description: "Connected to energies that flow between planes of existence.",
            names: ["Intra-planar"],
            features: [{ name: "Planar Shift", effect: "Flickers between dimensions to evade attacks." }]
        },
        Iron: {
            description: "Reinforced with iron, bolstering its durability.",
            names: ["Iron", "Steeled"],
            features: [{ name: "Ironclad", effect: "Greatly increases physical resistance." }]
        },
        king: {
            description: "Exudes regal authority, inspiring obedience and fear.",
            names: ["King", "Monarch"],
            features: [{ name: "Regal Command", effect: "Boosts the morale of allies and intimidates foes." }]
        },
        leader: {
            description: "A natural commander, guiding others in battle.",
            names: ["Leader", "Commander"],
            features: [{ name: "Commanding Presence", effect: "Inspires and directs allies effectively." }]
        },
        minion: {
            description: "A subordinate creature, weaker but numerous.",
            names: ["Minion", "Underling"],
            features: [{ name: "Swarm Tactics", effect: "Excels when operating as part of a horde." }]
        },
        nested: {
            description: "Complex, layered abilities hidden beneath the surface.",
            names: ["Nested"],
            features: [{ name: "Hidden Depths", effect: "Reveals unexpected abilities in dire moments." }]
        },
        parasitic: {
            description: "Relies on a host to feed and enhance its power.",
            names: ["Parasitic"],
            features: [{ name: "Life Leech", effect: "Drains strength from its host to bolster itself." }]
        },
        poisonous: {
            description: "Exudes toxins that can debilitate or kill.",
            names: ["Poisonous"],
            features: [{ name: "Toxic Secretion", effect: "Inflicts poison that saps vitality." }]
        },
        rooted: {
            description: "Anchored to the ground, sacrificing mobility for resilience.",
            names: ["Rooted"],
            features: [{ name: "Deep Roots", effect: "Increases defense and regenerates health slowly." }]
        },
        Rust: {
            description: "Covered in corrosion that deteriorates nearby metal.",
            names: ["Rusty"],
            features: [{ name: "Corrosion", effect: "Accelerates the decay of enemy armor." }]
        },
        siphon: {
            description: "Drains energy or life from its surroundings.",
            names: ["Siphon"],
            features: [{ name: "Energy Drain", effect: "Absorbs power from opponents to strengthen itself." }]
        },
        tiny: {
            description: "Diminutive in size yet quick and elusive.",
            names: ["Tiny"],
            features: [{ name: "Elusive", effect: "Easily dodges attacks due to its small size." }]
        },
        tyrant: {
            description: "Dominates with oppressive force and ruthless power.",
            names: ["Tyrant"],
            features: [{ name: "Oppressive Rule", effect: "Instills fear and enforces obedience in its presence." }]
        },
        Vampiric: {
            description: "Drains life from its foes to sustain its own existence.",
            names: ["Vampiric"],
            features: [{ name: "Life Drain", effect: "Steals vitality with every attack." }]
        },
        venomous: {
            description: "Emits potent venom that can cripple or kill.",
            names: ["Venomous"],
            features: [{ name: "Venomous Bite", effect: "Injects toxins that paralyze enemies." }]
        },
        Void: {
            description: "Embodies the emptiness and chaos of the void.",
            names: ["Void"],
            features: [{ name: "Null Field", effect: "Suppresses magical energies in its vicinity." }]
        },
        Voidshape: {
            description: "Constantly shifting form, like the ever-changing void.",
            names: ["Voidshape"],
            features: [{ name: "Shifting Form", effect: "Alters its appearance to confuse attackers." }]
        },
        weak: {
            description: "Inherently frail and lacking in strength.",
            names: ["Weak"],
            features: [{ name: "Fragile", effect: "Suffers from low durability and power." }]
        }
    }
};
var actionTypes = ["Action", "Half-Action", "Off-Action"];
var ranges = ["Melee", "Short", "Medium", "Long"];
var damageTypes = ["Physical", "Fire", "Ice", "Lightning", "Toxic"];

// Elemental subtypes with unique features
var elementalFeatures = {
    acid: { name: "Corrosive Touch", effect: "Corrodes armor and flesh" },
    smoke: { name: "Obscuring Mist", effect: "Blurs enemy vision" },
    darkness: { name: "Umbral Veil", effect: "Shrouds the area in dark energy" },
    fire: { name: "Blazing Inferno", effect: "Engulfs foes in flames" },
    plasma: { name: "Electrostatic Surge", effect: "Releases charged plasma bolts" },
    paper: { name: "Brittle Edges", effect: "Cuts with surprising sharpness" },
    ice: { name: "Frostbite", effect: "Chills and slows opponents" },
    stone: { name: "Rock Solid", effect: "Grants temporary resistance" },
    lightning: { name: "Storm Strike", effect: "Electrocutes with high voltage" },
    wire: { name: "Barbed Trap", effect: "Entangles and stuns" },
    solar: { name: "Radiant Burst", effect: "Emits a blinding flash" },
    thunder: { name: "Sonic Boom", effect: "Disorients with powerful sound" },
    sound: { name: "Resonance", effect: "Vibrates enemy bones" },
    toxic: { name: "Venomous Cloud", effect: "Poisons those nearby" },
    radiation: { name: "Irradiation", effect: "Causes lingering sickness" },
    poison: { name: "Noxious Spray", effect: "Emits a toxic mist" },
    fluid: { name: "Liquid Form", effect: "Shifts shape unpredictably" },
    water: { name: "Tidal Wave", effect: "Washes away obstacles" },
    oil: { name: "Slippery Coating", effect: "Makes surfaces dangerously slick" },
    blood: { name: "Crimson Flow", effect: "Saps strength from victims" },
    metal: { name: "Metallic Clang", effect: "Stuns with reverberation" },
    copper: { name: "Electro-Copper", effect: "Channels electric shocks" },
    iron: { name: "Iron Will", effect: "Boosts defensive power" },
    bronze: { name: "Bronze Charge", effect: "Delivers a crushing blow" },
    empathy: { name: "Emotional Surge", effect: "Empowers allies with shared feeling" }
};

// Helper to pick a random item from an array
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Format a feature with random properties
function formatFeature(feature) {
    var action = randomItem(actionTypes);
    var range = randomItem(ranges);
    var damage = randomItem(damageTypes);
    var effect = feature.effect + " with a " + action + " attack (" + damage + " damage, " + range + " range)";
    return { name: feature.name, action: action, range: range, damage: damage, effect: effect };
}

// Monster class that builds a monster based on filter settings
function Monster() {
    // Determine base type: if randomize is checked, pick randomly; else use selected value.
    this.baseKey = document.getElementById("randomize-base").checked
        ? randomItem(Object.keys(monsterData.base))
        : document.getElementById("base-type").value;
    this.addKey = document.getElementById("randomize-additional").checked
        ? randomItem(Object.keys(monsterData.additional))
        : document.getElementById("additional-type").value;
    this.modKey = document.getElementById("randomize-mod").checked
        ? randomItem(Object.keys(monsterData.mod))
        : document.getElementById("mod-type").value;

    // Get the corresponding data
    this.base = monsterData.base[this.baseKey];
    this.additional = monsterData.additional[this.addKey];
    this.mod = monsterData.mod[this.modKey];

    // Create a monster name from additional and base names
    this.name = randomItem(this.additional.names) + " " + randomItem(this.base.names);

    // If base is Elemental, choose an elemental subtype and add its feature.
    if (this.baseKey === "Elemental") {
        var availableElementals = Object.keys(elementalFeatures);
        this.elementalType = randomItem(availableElementals);
        this.name += " (" + this.elementalType + ")";
        this.elementalFeature = formatFeature(elementalFeatures[this.elementalType]);
    }

    // Format features from base and additional types.
    var baseFeatures = this.base.features.map(formatFeature);
    var addFeatures = this.additional.features.map(formatFeature);
    this.features = this.elementalFeature
        ? baseFeatures.concat(addFeatures, [this.elementalFeature])
        : baseFeatures.concat(addFeatures);

    // Calculate movement speed
    this.movement = this.base.movement + this.additional.movement;
}

// Create and return a monster card element.
function createMonsterCard(monster) {
    var monsterDiv = document.createElement("div");
    monsterDiv.classList.add("monster-card");
    monsterDiv.innerHTML =
        "<h4 contenteditable='true'>" + monster.name + "</h4>" +
"<p><strong>" + toTitleCase(monster.baseKey) + " - " + toTitleCase(monster.addKey) + " - " + toTitleCase(monster.modKey) + "</strong></p>" +
        "<p>" + monster.base.description + " " + monster.additional.description + " " + monster.mod.description + "</p>" +
        "<p><strong>Movement Speed:</strong> " + monster.movement + " ft</p>" +
        "<h3>Features:</h3><ul>" +
        monster.features.map(function (f) {
            return "<li contenteditable='true'><strong>" + f.name + "</strong> (" + f.action + ") - " + f.effect + "</li>";
        }).join('') +
        "</ul>" +
        "<button class='delete-monster'>Remove</button>";

    // Remove button functionality
    monsterDiv.querySelector(".delete-monster").addEventListener("click", function () {
        monsterDiv.remove();
    });
    return monsterDiv;
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
  

// Attach event listener when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
    var generateBtn = document.getElementById("generate-monster");
    var output = document.getElementById("monster-output");
    generateBtn.addEventListener("click", function () {
        var monster = new Monster();
        var card = createMonsterCard(monster);
        output.prepend(card);
    });
});

document.addEventListener("DOMContentLoaded", function() {
    // Helper to title-case strings
    function toTitleCase(str) {
      return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    }
  
    // Populate Base Type select
    var baseSelect = document.getElementById("base-type");
    baseSelect.innerHTML = "";
    Object.keys(monsterData.base).forEach(function(key) {
      var option = document.createElement("option");
      option.value = key;
      option.textContent = toTitleCase(key);
      baseSelect.appendChild(option);
    });
  
    // Populate Additional Type select
    var addSelect = document.getElementById("additional-type");
    addSelect.innerHTML = "";
    Object.keys(monsterData.additional).forEach(function(key) {
      var option = document.createElement("option");
      option.value = key;
      option.textContent = toTitleCase(key);
      addSelect.appendChild(option);
    });
  
    // Populate Mod Type select
    var modSelect = document.getElementById("mod-type");
    modSelect.innerHTML = "";
    Object.keys(monsterData.mod).forEach(function(key) {
      var option = document.createElement("option");
      option.value = key;
      option.textContent = toTitleCase(key);
      modSelect.appendChild(option);
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

