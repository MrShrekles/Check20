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