// ARC20 in-page notifications (Option A — Notification API, no backend required)
// Option B upgrade path: registerPushToken() will handle FCM token storage + Cloudflare Worker

const ArcNotify = (() => {
    let _ready = false;

    async function requestPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') { _ready = true; return true; }
        if (Notification.permission === 'denied')  return false;
        const result = await Notification.requestPermission();
        _ready = result === 'granted';
        return _ready;
    }

    function show(title, body) {
        if (!_ready || Notification.permission !== 'granted') return;
        if (document.hasFocus()) return;
        const n = new Notification(title, {
            body,
            icon: '/active-sheet/icons/arc-icon-192.png',
            tag:  'arc-chat',   // replaces previous notification instead of stacking
            renotify: true,
        });
        setTimeout(() => n.close(), 7000);
    }

    // Option B stub: will become FCM token fetch + save to Firestore
    async function registerPushToken(_roomCode) { /* TODO Option B */ }

    return { requestPermission, show, registerPushToken };
})();
