let npcData = {};
let speciesData = { species: [], dragonTypes: [] };

// Load both JSONs
Promise.all([
    fetch("data/worldbuilding.json").then(res => res.json()),
    fetch("data/species.json").then(res => res.json())
]).then(([worldbuilding, species]) => {
    npcData = worldbuilding;
    speciesData = species;
}).catch(err => console.error("❌ Error loading data:", err));

// Rarity-weighted selector
const rarityWeight = (species) => {
    switch ((species.rarity || "").toLowerCase()) {
        case "now": return 100;
        case "common": return 30;
        case "uncommon": return 16;
        case "rare": return 8;
        case "very rare": return 4;
        case "legendary": return 2;
        case "unique": return 1;
        default: return 5;
    }
};
const weightedRandom = (list, weightFn) => {
    const pool = [];
    list.forEach(item => {
        const weight = Math.floor(weightFn(item) * 10); // support decimals
        for (let i = 0; i < weight; i++) pool.push(item);
    });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : list[Math.floor(Math.random() * list.length)];
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);

function formatTextWithBreaks(str) {
    return (str || "").replace(/\n/g, "<br>");
}

function formatSpecies(s) {
    const name = s.name || "Unknown";
    const lineage = s.lineage || "";
    const option = s.option || "";

    if (option && lineage) return `${capitalize(option)} ${name}`;
    if (lineage && lineage.toLowerCase() !== name.toLowerCase()) return `${capitalize(lineage)} - ${name}`;
    return name;
}

function extractFeature(species) {
    if (!species.features) return [];

    // If it's an array of features
    if (Array.isArray(species.features)) {
        return species.features.flatMap(f => {
            const baseDesc = `${f.name}: ${f.description}`;
            const optionLines = Array.isArray(f.options)
                ? f.options.map(opt => `<b> ${opt.name}:</b> ${opt.effect}`)
                : [];

            return [baseDesc, ...optionLines];
        });
    }

    // Fallback for simple string-style feature blocks
    return [species.features];
}

class NPC {
    constructor() {
        const species = weightedRandom(speciesData.species, rarityWeight);
        this.speciesName = formatSpecies(species);
        this.features = extractFeature(species);

        const dragonLineages = ["kobari", "drakonari"];
        const lowerName = species.name?.toLowerCase();

        if (dragonLineages.includes(lowerName)) {
            const dragon = getRandomItem(speciesData.dragonTypes);
            this.speciesName += ` (${dragon.name})`;

            // Add the dragon feature too
            if (dragon.features) {
                this.features.push(`🐉 ${dragon.features}`);
            }
        }

        this.name = generateName();
        this.affinity = `${getRandomItem(npcData.affinities)} from ${getRandomItem(npcData.habitats)}`;
        this.religion = getRandomItem(npcData.gods);
        this.item = getRandomItem(npcData.signatureItems);
        this.motivation = getRandomItem(npcData.motivations);
    }
}

function generateName() {
    const first = getRandomItem(npcData.names.start);
    const core = getRandomItem(npcData.names.core);
    const last = getRandomItem(npcData.names.end);

    let middle = core;
    if (first.endsWith(middle[0])) middle = middle.substring(1);
    if (middle.endsWith(last[0])) middle = middle.slice(0, -1);

    return first + middle + last;
}

function splitFeaturesString(str) {
    const [name, ...rest] = str.split(":");
    const effect = rest.join(":").trim();
    return {
        name: name.trim(),
        effect: effect || ""
    };
}


function createNpcCard(npc) {
    const div = document.createElement("div");
    div.className = "monster-card";

    const featureHTML = npc.features.map(f => {
        const { name, effect } = splitFeaturesString(f);
        return `<p><strong>${name}</strong>: ${formatTextWithBreaks(effect)}</p>`;
    }).join("");

    div.innerHTML = `
    <h1 contenteditable="true">${npc.name}</h1>
    <b>${npc.speciesName}</b>
    ${featureHTML}
    <hr>
    <p><strong>Affinity:</strong> ${npc.affinity}</p>
    <p><strong>Religion:</strong> ${npc.religion}</p>
    <p><strong>Signature Item:</strong> ${npc.item}</p>
    <p><strong>Motivation:</strong> ${npc.motivation}</p>
    <div class="button-row">
        <button class="copy-npc">Copy</button>
        <button class="delete-monster">Remove</button>
    </div>
`;


    // Remove button
    div.querySelector(".delete-monster").addEventListener("click", () => div.remove());

    // Copy button
    div.querySelector(".copy-npc").addEventListener("click", () => {
        const copyBtn = div.querySelector(".copy-npc");
        const deleteBtn = div.querySelector(".delete-monster");

        // Temporarily hide buttons during copy
        copyBtn.style.display = "none";
        deleteBtn.style.display = "none";

        // Grab just the visible text without buttons
        const text = div.innerText.trim();

        // Restore buttons
        copyBtn.style.display = "";
        deleteBtn.style.display = "";

        // Copy text
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        });

        navigator.clipboard.writeText(text).then(() => {
            const copyBtn = div.querySelector(".copy-npc");
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        });
    });

    return div;
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("generate-npc").addEventListener("click", () => {
        const npc = new NPC();
        const card = createNpcCard(npc);
        document.getElementById("npc-output").prepend(card);
    });
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

// Standard base movement speeds
const BASE_MOVEMENT = { walk: 30, burrow: 0, fly: 0 };

// Function to combine movement modifiers
const combineMovement = (modifiers) =>
    modifiers.reduce((acc, mod) => {
        Object.entries(mod).forEach(([mode, value]) => {
            acc[mode] = (acc[mode] || 0) + value;
        });
        return acc;
    }, { ...BASE_MOVEMENT });

let monsterData = {}; // Will hold the fetched monster data

// Fetch the monster data from monster.json
fetch("data/monster.json")
    .then(response => response.json())
    .then(data => {
        monsterData = data;
        populateDropdowns(); // Populate dropdowns after data loads
    })
    .catch(error => console.error("Error loading monster data:", error));


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
const check = ["Agility", "Crafting", "Influence", "Intellect", "Luck", "Observation", "Spirit", "Stealth", "Strength", "Survival"]
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
        if (!monsterData.base || !monsterData.additional || !monsterData.mod) {
            console.error("Monster data not loaded yet.");
            return;
        }

        this.baseKey = document.getElementById("randomize-base").checked
            ? randomItem(Object.keys(monsterData.base).sort())
            : document.getElementById("base-type").value;

        this.addKey = document.getElementById("randomize-additional").checked
            ? randomItem(Object.keys(monsterData.additional).sort())
            : document.getElementById("additional-type").value;

        this.modKey = document.getElementById("randomize-mod").checked
            ? randomItem(Object.keys(monsterData.mod).sort())
            : document.getElementById("mod-type").value;



        this.base = monsterData.base[this.baseKey];
        this.mergedBaseFeatures = [...(this.base.features || [])];
        this.mergedBaseDescription = this.base.description;
        this.subtypeChain = [];

        let current = this.base;
        while (current.subtypes) {
            const chosenSubtype = randomItem(Object.keys(current.subtypes));
            this.subtypeChain.push(chosenSubtype);
            const subtypeData = current.subtypes[chosenSubtype];
            this.mergedBaseDescription += " " + subtypeData.description;
            if (subtypeData.features) {
                this.mergedBaseFeatures = this.mergedBaseFeatures.concat(subtypeData.features);
            }
            current = subtypeData;
        }

        this.additional = monsterData.additional[this.addKey];
        this.mod = monsterData.mod[this.modKey];
        this.motivation = randomItem([
            "Hunting prey", "Defending territory", "Seeking revenge", "Rampaging from pain"
        ]);

        this.name = `${randomItem(this.mod.names)} ${randomItem(this.base.names)} ${randomItem(this.additional.names)}`;

        this.features = [
            randomItem(this.mergedBaseFeatures || []),
            randomItem(this.additional.features || []),
            randomItem(this.mod.features || [])
        ].filter(Boolean).map(formatFeature);

        const movementMods = [
            this.base.movementModifier,
            this.additional.movementModifier,
            this.mod.movementModifier
        ].filter(Boolean);
        this.movement = combineMovement(movementMods);
    }
}

const createMonsterCard = (monster) => {
    if (!monster) return;

    const monsterDiv = document.createElement("div");
    monsterDiv.className = "monster-card";

    const subtypeDisplay = monster.subtypeChain.length > 0
        ? ` (${monster.subtypeChain.map(s => toTitleCase(s)).join(" > ")})`
        : "";

    const featuresHtml = monster.features
        .map(f => `<li contenteditable="true"><strong>${f.name}</strong> (${f.action}): ${f.effect}</li>`)
        .join("");

    monsterDiv.innerHTML = `
      <h4 contenteditable="true">${monster.name}</h4>
      <p><strong>${toTitleCase(monster.baseKey)}${subtypeDisplay} - ${toTitleCase(monster.addKey)} - ${toTitleCase(monster.modKey)}</strong></p>
      <p>${monster.mergedBaseDescription} ${monster.additional.description} ${monster.mod.description}</p>
      <p><strong>Movement Speed:</strong> Walk: ${monster.movement.walk} ft${monster.movement.burrow ? `, Burrow: ${monster.movement.burrow} ft` : ""}${monster.movement.fly ? `, Fly: ${monster.movement.fly} ft` : ""}</p>
      <p><strong>Motivation:</strong> ${monster.motivation}</p>
      <h3>Features:</h3>
      <ul>${featuresHtml}</ul>
      <button class="delete-monster">Remove</button>`;

    monsterDiv.querySelector(".delete-monster")
        .addEventListener("click", () => monsterDiv.remove());

    return monsterDiv;
};

// Helper to convert a string to Title Case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}
function populateDropdowns() {
    ["base", "additional", "mod"].forEach(type => {
        const select = document.getElementById(`${type}-type`);
        if (!select) return;

        select.innerHTML = "";
        Object.keys(monsterData[type])
            .sort() // sort alphabetically
            .forEach(key => {
                const option = document.createElement("option");
                option.value = key;
                option.textContent = toTitleCase(key);
                select.appendChild(option);
            });
    });
}


document.addEventListener("DOMContentLoaded", function () {
    if (monsterData?.base && monsterData?.additional && monsterData?.mod) {
        populateDropdowns();
    } else {
        // Retry when monsterData is ready (if it's loaded asynchronously)
        const interval = setInterval(() => {
            if (monsterData?.base && monsterData?.additional && monsterData?.mod) {
                populateDropdowns();
                clearInterval(interval);
            }
        }, 100);
    }

    document.getElementById("generate-monster").addEventListener("click", function () {
        const monster = new Monster();
        if (monster) {
            document.getElementById("monster-output").prepend(createMonsterCard(monster));
        }
    });
});

// TOOLTIPS
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

document.getElementById("roll-d20-check").addEventListener("click", () => {
    const modifier = parseInt(document.getElementById("check-modifier").value, 10);
    const advantage = document.getElementById("check-advantage").value;

    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;

    let adjustedRoll1 = roll1;
    let chosenRaw;

    if (advantage === "advantage") {
        adjustedRoll1 += 4;
        chosenRaw = Math.max(adjustedRoll1, roll2);
    } else if (advantage === "disadvantage") {
        adjustedRoll1 -= 4;
        chosenRaw = Math.min(adjustedRoll1, roll2);
    } else {
        chosenRaw = roll1;
    }

    const finalResult = chosenRaw + modifier;
    const historyItem = document.createElement("li");
    historyItem.classList.add("styled-roll");

    // Determine success count
    let successCount = 0;
    if (finalResult >= 15) {
        successCount = Math.floor((finalResult - 15) / 5) + 1;
    }

    // Optional highlight
    if (finalResult >= 15) {
        historyItem.classList.add("roll-success");
    }

    historyItem.innerHTML = `
      <div class="roll-line">
        <span class="roll-label">🎲 Rolled:</span> 
        d20: <span class="roll-val">${highlightRoll(roll1)}</span>
        ${advantage !== "none" ? `→ <span class="roll-val">${adjustedRoll1}</span> / <span class="roll-val">${highlightRoll(roll2)}</span>` : ""}
        <hr>
      </div>
      <div class="mod-line">
        <span class="roll-label"> Modifier:</span> <span class="roll-mod">${modifier >= 0 ? "+" : ""}${modifier}</span>
      </div>
      <div class="total-line">
        <hr>
        <span class="roll-label"> Total:</span> <strong class="roll-total">${finalResult}</strong>
        ${successCount > 0 ? `<span class="success-count">(${successCount} success${successCount > 1 ? "es" : ""})</span>` : ""}
      </div>
      <div class="choice-line">
        <span class="roll-label"> Chose:</span> <em class="roll-chosen">${chosenRaw}</em>
      </div>
    `;



    document.getElementById("check-history").prepend(historyItem);

    // Limit history to 10 entries
    const historyList = document.getElementById("check-history");
    if (historyList.children.length > 5) {
        historyList.removeChild(historyList.lastChild);
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

document.getElementById("toggle-roller").addEventListener("click", () => {
    document.getElementById("dice-roller").classList.remove("active");
    document.getElementById("d20-check-roller").classList.add("active");
    document.getElementById("toggle-roller").classList.add("active");
    document.getElementById("toggle-dice").classList.remove("active");
});

document.getElementById("toggle-dice").addEventListener("click", () => {
    document.getElementById("dice-roller").classList.add("active");
    document.getElementById("d20-check-roller").classList.remove("active");
    document.getElementById("toggle-dice").classList.add("active");
    document.getElementById("toggle-roller").classList.remove("active");
});


document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".responsive-table").forEach((wrapper) => {
        const headers = Array.from(wrapper.querySelectorAll("thead th")).map(th => th.textContent.trim());
        wrapper.querySelectorAll("tbody tr").forEach(row => {
            Array.from(row.children).forEach((td, index) => {
                td.setAttribute("data-label", headers[index] || "");
            });
        });
    });
});
