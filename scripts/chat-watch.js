// chat-watch.js - the in-app chat toast, and a room-chat watcher for the pages
// that can't show chat themselves.
//
// Pages that host their own chat (anything with #panel-chat: active-sheet,
// narrator) already run a listener - they also maintain an unread badge and
// render the log - so there this file only supplies the toast helpers below.
// Everywhere else the watcher at the bottom takes over and offers a way back.

let _chatToastTimer = null;

function showChatToast(title, body, onView, viewLabel) {
    let el = document.getElementById('chat-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'chat-toast';
        el.className = 'chat-toast';
        el.innerHTML = `
            <div class="chat-toast-body">
                <div class="chat-toast-title"></div>
                <div class="chat-toast-text"></div>
            </div>
            <button class="chat-toast-view" type="button">View</button>
            <button class="chat-toast-x" type="button" aria-label="Dismiss">✕</button>`;
        document.body.appendChild(el);
        el.querySelector('.chat-toast-x').addEventListener('click', hideChatToast);
        el.querySelector('.chat-toast-view').addEventListener('click', () => {
            const fn = el._onView;
            hideChatToast();
            fn?.();
        });
    }
    el.querySelector('.chat-toast-title').textContent = title || 'New message';
    el.querySelector('.chat-toast-text').textContent  = body  || '';
    el.querySelector('.chat-toast-view').textContent  = viewLabel || 'View';
    el._onView = onView;
    el.classList.add('is-open');
    clearTimeout(_chatToastTimer);
    _chatToastTimer = setTimeout(hideChatToast, 6000);
}

function hideChatToast() {
    clearTimeout(_chatToastTimer);
    document.getElementById('chat-toast')?.classList.remove('is-open');
}

// One-line summary of a chat message, for the toast and the OS notification.
function chatNotifyBody(m) {
    if (m.type === 'roll')          return `Rolled ${m.total ?? ''}`.trim();
    if (m.type === 'weapon-attack') return `${m.weaponName || 'Attack'} - ${m.total ?? m.d20Total ?? ''}`;
    if (m.type === 'dice')          return `${m.notation || 'Dice'} - ${m.total ?? ''}`;
    if (m.type === 'feature')       return m.name || 'Used a feature';
    return m.text ? m.text.slice(0, 80) : 'New message';
}

// ── ROOM CHAT WATCHER ─────────────────────────────────────────────────────────
// For pages without their own chat panel: toast incoming room messages and
// offer a jump back to the sheet's chat.

(function watchRoomChat() {
    if (document.getElementById('panel-chat')) return;  // page hosts its own chat

    let unsub = null;

    function start() {
        // Permission was granted back on the sheet; ArcNotify still needs priming
        // per page. Only when already granted - never prompt from here.
        if (window.Notification?.permission === 'granted') window.ArcNotify?.requestPermission();

        if (unsub) { unsub(); unsub = null; }

        const arc  = window.__arc;
        const room = localStorage.getItem('arc-room');
        if (!arc?.db || !room) return;   // left the room - stay torn down

        const q = arc.query(
            arc.collection(arc.db, 'rooms', room, 'chat'),
            arc.orderBy('postedAt', 'desc'),
            arc.limit(20)
        );
        // The first snapshot is the existing backlog, not news - skip it, and
        // never gate on doc count: the query is capped, so the count stops
        // growing once the room is busy and comparisons stop firing for good.
        let primed = false;
        unsub = arc.onSnapshot(q, snap => {
            const wasPrimed = primed;
            primed = true;
            if (!wasPrimed) return;

            const incoming = snap.docChanges()
                .filter(c => c.type === 'added')
                .map(c => c.doc.data())
                .filter(m => !['system', 'turn'].includes(m.type) && !m.removed
                    && m.uid !== arc.uid);
            if (!incoming.length) return;

            incoming.forEach(m => window.ArcNotify?.show(
                m.author ? `${m.author} - ${room}` : room, chatNotifyBody(m)));

            // ArcNotify no-ops while the page is focused; the toast covers that.
            // Only the newest gets a toast - there is one toast element to share.
            const last = incoming[incoming.length - 1];
            showChatToast(last.author || 'New message', chatNotifyBody(last),
                () => { location.href = 'active-sheet.html#chat'; }, 'Go to chat');
        }, err => console.error('[ARC] room chat watch:', err));
    }

    document.addEventListener('arc:firebase-ready', start);
    if (window.__arc?.uid) start();   // auth may already have resolved
    // Joining or leaving a room on this very page should retarget the watcher
    document.addEventListener('arc:room-changed', start);
})();
