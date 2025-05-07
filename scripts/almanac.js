document.addEventListener("DOMContentLoaded", () => {

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