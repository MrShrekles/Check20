const CACHE = 'arc20-v27';

// Everything network-first during active development.
// When data is stable, data/*.json can be moved back to cache-first for offline use.
const HTML_FILES = ['home.html', 'active-sheet.html', 'create-char.html'];
const ALWAYS_FRESH = ['.html', '.js', '.css', '.json'];

self.addEventListener('install', e => {
    e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (!e.request.url.startsWith(self.location.origin)) return;

    const url    = new URL(e.request.url);
    const ext    = url.pathname.split('.').pop();
    const fresh  = ALWAYS_FRESH.some(s => url.pathname.endsWith(s));

    if (fresh) {
        // Network-first for HTML, JS, CSS - always pick up code changes, fall back offline
        e.respondWith(
            fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
                return res;
            }).catch(() => caches.match(e.request))
        );
    } else {
        // Cache-first for data files (JSON) - fast offline, update on next reload
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
                return res;
            }))
        );
    }
});
