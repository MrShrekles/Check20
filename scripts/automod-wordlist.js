// automod-wordlist.js - editable word/phrase lists for chat-cards.js's auto-mod gate.
//
// Entries can be single words (matched as whole tokens, so "ass" won't match
// inside "class"/"assassin") or multi-word phrases (matched as substrings of
// the normalized message). Matching also normalizes basic leetspeak
// (0/1/3/4/5/7/@/$) and collapses repeated letters ("fuuuck" -> "fuck"), but
// will NOT catch fully spaced-out evasion ("k y s").

// Tier 2 - SEVERE: instant permanent ban, no strikes.
// Two categories belong here: (1) hate speech / slurs targeting race, ethnicity,
// religion, gender, sexuality, disability, etc., and (2) explicit/graphic sexual
// content or sexual slurs (mild language like "cum" is NOT a target - only
// severe stuff). Empty by default - add your zero-tolerance terms/phrases
// before relying on this.
window.AUTOMOD_SEVERE = [
    'nigger', 'nygger',
    'you chink',
    'kike',
    'kyke',
    'nig nog'
];

// Tier 1 - STRIKE: counts toward the 3-strike system (10min -> 10hr -> perma).
// General profanity (fuck/shit/etc.) is intentionally NOT flagged. Focus this
// list on harassment/aggression directed at people. A couple of well-known
// self-harm-incitement phrases are seeded below (matched by Discord/Twitch
// automod too) - add more as needed.
window.AUTOMOD_STRIKE = [
    'rape',
    'faggot',
    'jew',
    'acrotomophilia',
    'anal',
    'ball sucking',
    'bangbros',
    'bareback',
    'barely legal',
    'barenaked',
    'tranny',
    'cunt',
    'whore',
    'coon',
    'darkie',
    'date rape',
    'daterape',
    'lolita',
    'rosy palm',
    'rosy palm and her 5 sisters',
    'suicide'

];