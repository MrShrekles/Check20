// global-chat.js - Town Square: app-wide chat with online presence

const GLOBAL_ROOM = '000000';
const PRESENCE_TIMEOUT = 90 * 1000; // "online" if heartbeat within this window
const PRESENCE_INTERVAL = 60 * 1000;

function getCharName() {
    try {
        const data = JSON.parse(localStorage.getItem('arc-active-sheet') || 'null');
        return data?.char?.name || 'Player';
    } catch { return 'Player'; }
}

let chatMsgs     = [];
let presenceDocs = [];

// ── CHAT ─────────────────────────────────────────────────────────────────────

function renderChatLog() {
    const el = document.getElementById('chat-log');
    if (!el) return;
    const myUid    = window.__arc?.uid;
    const scroller = el.closest('.gc-main') || el.parentElement;
    const wasAtTop = !scroller || scroller.scrollTop <= 60;

    el.innerHTML = '';

    if (!chatMsgs.length) {
        const li = document.createElement('li');
        li.className = 'chat-empty';
        li.textContent = 'No messages yet. Say hello!';
        el.appendChild(li);
        return;
    }

    chatMsgs.forEach(m => {
        const li = document.createElement('li');
        li.className = 'chat-msg-wrap chat-entry--msg';
        if (m.id) li.dataset.chatId = m.id;

        if (m.removed) {
            li.className = 'chat-msg--removed';
            li.innerHTML = '<span class="chat-removed-text">- removed -</span>';
            el.appendChild(li);
            return;
        }

        const isMe = m.uid === myUid;
        const badge = !isMe ? `<div class="shared-author">${m.author || 'Player'}</div>` : '';

        if (m.type === 'dice') {
            li.className = 'chat-msg-wrap';
            li.innerHTML = badge + renderDiceEntry(m);
            if (m.id) li.insertAdjacentHTML('beforeend', buildReactionBar(m, myUid));
            el.appendChild(li);
            return;
        }

        const emojiOnly = isEmojiOnly(m.text);
        li.innerHTML = emojiOnly
            ? `${badge}<span class="chat-time">${m.time || ''}</span><div class="chat-emoji-block"><span class="chat-text chat-emoji-big">${parseInline(m.text)}</span>${EMOJI_REACTIONS_HTML}</div>`
            : `${badge}<span class="chat-time">${m.time || ''}</span>${renderChatText(m.text)}`;

        if (m.id) li.insertAdjacentHTML('beforeend', buildReactionBar(m, myUid));
        el.appendChild(li);
    });

    if (wasAtTop && scroller) scroller.scrollTop = 0;
}

function listenToChat() {
    const arc = window.__arc;
    const q = arc.query(
        arc.collection(arc.db, 'rooms', GLOBAL_ROOM, 'chat'),
        arc.orderBy('postedAt', 'desc'),
        arc.limit(80)
    );
    arc.onSnapshot(q, snap => {
        chatMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderChatLog();
    }, err => console.error('[ARC] global chat:', err));
}

async function sendMsg() {
    const input = document.getElementById('chat-msg-input');
    const text  = input?.value.trim();
    if (!text) return;
    if (!arcCanSendChat()) return;
    if (!(await arcAutomodGate(text, GLOBAL_ROOM, getCharName()))) { input.value = ''; return; }
    if (!arcRateLimitOk()) { alert('You are sending messages too fast - wait a few seconds and try again.'); return; }
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) return;
    input.value = '';
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', GLOBAL_ROOM, 'chat', crypto.randomUUID()), {
            type:     'msg',
            text,
            author:   getCharName(),
            uid:      arc.uid,
            time:     chatTimestamp(),
            postedAt: arc.serverTimestamp(),
            reactions: {},
        });
    } catch(e) { console.error('[ARC] send failed:', e); }
}

async function rollDice() {
    if (!arcRateLimitOk()) { console.warn('[ARC] rate-limited, not broadcasting: dice'); return; }
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) return;
    const sides = parseInt(document.getElementById('gc-dice-type')?.value || '20', 10);
    const count = Math.max(1, parseInt(document.getElementById('gc-dice-count')?.value || '1', 10));
    const bonus = parseInt(document.getElementById('gc-dice-bonus')?.value || '0', 10);
    const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * sides));
    const total = rolls.reduce((s, r) => s + r, 0) + bonus;
    const sidesLabel = sides === 100 ? '%' : sides;
    const notation = `${count}d${sidesLabel}${bonus !== 0 ? fmtSigned(bonus) : ''}`;
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', GLOBAL_ROOM, 'chat', crypto.randomUUID()), {
            type:     'dice',
            time:     chatTimestamp(),
            charName: getCharName(),
            notation, rolls, bonus, total,
            author:   getCharName(),
            uid:      arc.uid,
            postedAt: arc.serverTimestamp(),
            reactions: {},
        });
    } catch(e) { console.error('[ARC] dice roll broadcast:', e); }
}

async function togglePlayerReaction(msgId, emoji) {
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid || !msgId) return;
    const msg  = chatMsgs.find(m => m.id === msgId);
    const uids = msg?.reactions?.[emoji] || [];
    const op   = uids.includes(arc.uid) ? arc.arrayRemove(arc.uid) : arc.arrayUnion(arc.uid);
    try {
        await arc.updateDoc(arc.doc(arc.db, 'rooms', GLOBAL_ROOM, 'chat', msgId), { [`reactions.${emoji}`]: op });
    } catch(e) { console.error('[ARC] toggleReaction:', e); }
}

// ── PRESENCE ─────────────────────────────────────────────────────────────────

async function syncPresence() {
    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) return;
    try {
        await arc.setDoc(arc.doc(arc.db, 'rooms', GLOBAL_ROOM, 'presence', arc.uid), {
            name:      getCharName(),
            updatedAt: arc.serverTimestamp(),
        }, { merge: true });
    } catch(e) { console.error('[ARC] presence sync failed:', e); }
}

function renderPresence() {
    const listEl  = document.getElementById('gc-online-list');
    const countEl = document.getElementById('gc-online-count');
    if (!listEl || !countEl) return;

    const now = Date.now();
    const online = presenceDocs.filter(p => {
        const t = p.updatedAt?.toMillis ? p.updatedAt.toMillis() : 0;
        return now - t < PRESENCE_TIMEOUT;
    });

    countEl.textContent = online.length;

    if (!online.length) {
        listEl.innerHTML = '<li class="gc-online-empty">No one else is here yet.</li>';
        return;
    }
    listEl.innerHTML = online
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(p => `<li>${p.name || 'Player'}</li>`).join('');
}

function listenToPresence() {
    const arc = window.__arc;
    arc.onSnapshot(arc.collection(arc.db, 'rooms', GLOBAL_ROOM, 'presence'), snap => {
        presenceDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderPresence();
    }, err => console.error('[ARC] presence:', err));
}

// ── EMOJI REACTION BROADCAST (dance/spin/etc) ─────────────────────────────────

function listenToRoomDoc() {
    const arc = window.__arc;
    arc.onSnapshot(arc.doc(arc.db, 'rooms', GLOBAL_ROOM), snap => {
        const data = snap.data() || {};
        const r = data.lastReaction;
        if (r?.at && r?.chatMsgId && r?.anim && r.by !== arc.uid) {
            const ageMs = Date.now() - r.at.toMillis();
            if (ageMs <= 4000) triggerEmojiReaction(r.chatMsgId, r.anim);
        }
    });
}

// ── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('arc:firebase-ready', () => {
    listenToChat();
    listenToPresence();
    listenToRoomDoc();

    syncPresence();
    setInterval(syncPresence, PRESENCE_INTERVAL);
    setInterval(renderPresence, 30000);

    document.addEventListener('emoji-react', async ({ detail }) => {
        const arc = window.__arc;
        try {
            await arc.setDoc(arc.doc(arc.db, 'rooms', GLOBAL_ROOM), {
                lastReaction: { chatMsgId: detail.chatMsgId, anim: detail.anim, by: arc.uid, at: arc.serverTimestamp() },
            }, { merge: true });
        } catch(e) { console.error('[ARC] emoji-react write failed:', e); }
    });

    document.addEventListener('chat-report', async ({ detail }) => {
        const arc = window.__arc;
        const { chatMsgId, reason, reasonNote } = detail;
        const msg = chatMsgs.find(m => m.id === chatMsgId);
        if (!msg) return;
        try {
            await arc.setDoc(arc.doc(arc.db, 'reports', crypto.randomUUID()), {
                status:        'open',
                reason,
                reasonNote:    reasonNote || null,
                chatRoom:      GLOBAL_ROOM,
                chatMsgId,
                chatMsgText:   msg.text ?? null,
                chatMsgAuthor: msg.author ?? null,
                chatMsgUid:    msg.uid ?? null,
                chatMsgType:   msg.type ?? null,
                reportedBy:    arc.uid,
                reportedAt:    arc.serverTimestamp(),
                resolvedBy:    null,
                resolvedAt:    null,
                resolutionNote: null,
            });
        } catch(e) { console.error('[ARC] report failed:', e); }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    arcInitBanNotice('chat-input-row');

    // Online panel toggle
    document.getElementById('gc-online-btn')?.addEventListener('click', () => {
        const panel = document.getElementById('gc-online-panel');
        if (panel) panel.hidden = !panel.hidden;
    });

    // Info / Feedback dialog
    const infoDialog = document.getElementById('gc-info-dialog');
    document.getElementById('gc-info-btn')?.addEventListener('click', () => infoDialog?.showModal());
    document.getElementById('gc-info-close')?.addEventListener('click', () => infoDialog?.close());
    infoDialog?.addEventListener('click', e => { if (e.target === infoDialog) infoDialog.close(); });

    // Send message
    document.getElementById('btn-send-msg')?.addEventListener('click', sendMsg);
    document.getElementById('chat-msg-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendMsg();
    });

    // Dice roller
    const diceBtn   = document.getElementById('gc-dice-btn');
    const dicePanel = document.getElementById('gc-dice-panel');
    if (diceBtn && dicePanel) {
        diceBtn.addEventListener('click', e => {
            e.stopPropagation();
            dicePanel.hidden = !dicePanel.hidden;
            const emojiPanel = document.getElementById('emoji-panel');
            if (emojiPanel) emojiPanel.hidden = true;
        });
    }
    document.getElementById('btn-gc-dice-roll')?.addEventListener('click', rollDice);

    // Emoji picker
    const emojiBtn   = document.getElementById('emoji-btn');
    const emojiPanel = document.getElementById('emoji-panel');
    if (emojiBtn && emojiPanel) {
        emojiPanel.innerHTML = buildEmojiPanel();
        emojiBtn.addEventListener('click', e => {
            e.stopPropagation();
            emojiPanel.hidden = !emojiPanel.hidden;
            if (dicePanel) dicePanel.hidden = true;
        });
        emojiPanel.addEventListener('click', e => {
            const em = e.target.closest('.emoji-pick');
            if (!em) return;
            const input = document.getElementById('chat-msg-input');
            if (input) {
                const pos = input.selectionStart || input.value.length;
                input.value = input.value.slice(0, pos) + em.textContent + input.value.slice(pos);
                input.focus();
                input.setSelectionRange(pos + em.textContent.length, pos + em.textContent.length);
            }
            emojiPanel.hidden = true;
        });
        document.addEventListener('click', e => {
            if (!emojiPanel.hidden && !emojiPanel.contains(e.target) && e.target !== emojiBtn) {
                emojiPanel.hidden = true;
            }
        });
    }

    // Reactions - click delegation on chat log
    document.getElementById('chat-log')?.addEventListener('click', e => {
        const reactionAddBtn = e.target.closest('.reaction-add-btn');
        if (reactionAddBtn) {
            e.stopPropagation();
            const picker = reactionAddBtn.closest('.chat-reactions')?.querySelector('.reaction-picker');
            if (picker) picker.hidden = !picker.hidden;
            return;
        }
        const reactionPickBtn = e.target.closest('.reaction-pick-btn');
        if (reactionPickBtn) {
            const bar = reactionPickBtn.closest('.chat-reactions');
            if (bar) { togglePlayerReaction(bar.dataset.msgId, reactionPickBtn.dataset.emoji); bar.querySelector('.reaction-picker').hidden = true; }
            return;
        }
        const reactionChip = e.target.closest('.reaction-chip');
        if (reactionChip) {
            const bar = reactionChip.closest('.chat-reactions');
            if (bar) togglePlayerReaction(bar.dataset.msgId, reactionChip.dataset.emoji);
        }
    });
});
