// ARC20 Analytics - fire-and-forget event tracker
// Writes to Firestore 'analytics' collection; never blocks UI or throws to callers.

(function () {
    let _uid = null;

    document.addEventListener('arc:firebase-ready', e => {
        _uid = e.detail.uid;
    });

    window.arcTrack = function (eventType, data) {
        try {
            const arc = window.__arc;
            if (!arc?.db) return;
            const uid = _uid || arc.uid;
            if (!uid) return;

            const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            arc.setDoc(
                arc.doc(arc.db, 'analytics', id),
                { type: eventType, uid, timestamp: arc.serverTimestamp(), ...data }
            ).catch(() => {});
        } catch { /* never interrupt gameplay */ }
    };
})();
