// Bump CACHE whenever files are ADDED to the app. The activate handler purges
// every cache whose key differs, so a bump is what clears stale entries; without
// it, newly added files have no cached copy to fall back on when the network is
// flaky - which is exactly how the enchanted generator died on mobile.
const CACHE = 'arc20-v32';

// Everything network-first during active development.
// When data is stable, data/*.json can be moved back to cache-first for offline use.
const ALWAYS_FRESH = ['.html', '.js', '.css', '.json'];

// Warmed on install so they exist offline from the first load. Fetched one by
// one rather than cache.addAll(), which is atomic - a single 404 would abort the
// whole install and leave the worker with nothing.
const PRECACHE = [
    // Pages - everything solo play needs, so a fresh install that goes offline
    // before browsing around can still build and run a character.
    './home.html',
    './create-char.html',
    './active-sheet.html',
    './narrator.html',

    // Styles
    './styles/home.css',
    './styles/create-char.css',
    './styles/active-sheet.css',
    './styles/narrator.css',
    './styles/chat-toast.css',

    // Scripts
    '../scripts/home.js',
    '../scripts/create-char.js',
    '../scripts/active-sheet.js',
    '../scripts/narrator.js',
    '../scripts/arc-shared.js',
    '../scripts/arc-vocab.js',
    '../scripts/chat-cards.js',
    '../scripts/chat-watch.js',
    '../scripts/notifications.js',
    '../scripts/analytics.js',
    '../scripts/automod-wordlist.js',
    '../scripts/tooltips.js',

    // Data the character wizard and sheet cannot open without
    '../data/species.json',
    '../data/classes.json',
    '../data/class-new.json',
    '../data/spells.json',
    '../data/conditions.json',
    '../data/damage.json',
    '../data/progression.json',
    '../data/worldbuilding.json',

    // Data shared with the narrator tools
    '../data/vocab.json',
    '../data/items.json',
    '../data/weapons.json',
    '../data/armor.json',
    '../data/enchantedgen.json',
    '../data/medicine.json',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => Promise.all(PRECACHE.map(
                url => fetch(url, { cache: 'reload' })
                    .then(res => (res && res.ok) ? c.put(url, res) : null)
                    .catch(() => null)          // a missing file must not block install
            )))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Never hand respondWith() an undefined - that throws and the request fails hard
// instead of degrading. A real Response lets the caller see a clean error.
function offlineFallback(request) {
    return caches.match(request).then(cached => cached || new Response(
        JSON.stringify({ error: 'offline', url: request.url }),
        { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'application/json' } }
    ));
}

self.addEventListener('fetch', e => {
    if (!e.request.url.startsWith(self.location.origin)) return;
    if (e.request.method !== 'GET') return;

    const url   = new URL(e.request.url);
    const fresh = ALWAYS_FRESH.some(s => url.pathname.endsWith(s));

    if (fresh) {
        // Network-first for HTML, JS, CSS, JSON - always pick up code changes,
        // fall back to cache (then to a 503) when the network is unavailable.
        e.respondWith(
            fetch(e.request).then(res => {
                if (res && res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => offlineFallback(e.request))
        );
    } else {
        // Cache-first for everything else (images, fonts) - fast, updated on next load.
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
                if (res && res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => offlineFallback(e.request)))
        );
    }
});
