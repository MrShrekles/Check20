// chat-cards.js — shared chat card renderers
// Loaded by active-sheet.html and narrator.html before their respective scripts.

const CONDITION_ICONS = {
    'Bleeding':    '🩸', 'Broken':      '🦴', 'Concussion':  '💫', 'Coughing':    '🤧',
    'Dislocation': '↕',  'Slowed':      '🐌', 'Pinned':      '📌', 'Prone':       '⬇',
    'Blind':       '🚫', 'Charmed':     '💞', 'Confused':    '❓', 'Deaf':        '🔇',
    'Fear':        '😨', 'Intangible':  '👻', 'Invisible':   '👤', 'Stunned':     '⚡',
    'Exhaustion':  '💤', 'Constrained': '⛓', 'Unconscious': '😵', 'Exposed':     '🎯',
    'Injured':     '🩹', 'Death':       '☠',
};

function condChip(name) {
    const icon = CONDITION_ICONS[name];
    return icon ? `${icon} ${name}` : name;
}

const EMOJI_SET = [
    '👍','👎','❤️','🔥','🎉','😂','😮','😢',
    '⚔️','🛡️','🎲','💀','✨','💥','🩸','🏹',
    '😈','😇','🤔','😤','😱','🤣','😏','👀',
    '🐉','👁️','💰','🗡️','🧪','📜','🏰','🌑',
];

function buildEmojiPanel() {
    return EMOJI_SET.map(e => `<button class="emoji-pick" type="button">${e}</button>`).join('');
}

function chatTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Returns true when a string contains only emoji (and whitespace / joiners)
function isEmojiOnly(str) {
    const t = (str || '').trim();
    return t.length > 0 && t.replace(/\p{Extended_Pictographic}|️|︎|‍|\s/gu, '').length === 0;
}

// Escape HTML then render *bold*, _italic_, `code` markdown-lite
function parseInline(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/~~(.+?)~~/g, '<del>$1</del>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="chat-code">$1</code>');
}

const CHAT_TEXT_CLAMP_LENGTH = 240; // chars; above this, clamp + offer "Show more"

// Renders a chat message's text span, clamping long messages with a "Show more" toggle.
function renderChatText(text) {
    const html = parseInline(text);
    if (!text || text.length <= CHAT_TEXT_CLAMP_LENGTH) {
        return `<span class="chat-text">${html}</span>`;
    }
    return `<span class="chat-text chat-text--clamped">${html}</span><button class="chat-show-more" type="button">Show more</button>`;
}

document.addEventListener('click', e => {
    const btn = e.target.closest('.chat-show-more');
    if (!btn) return;
    const span = btn.previousElementSibling;
    if (!span?.classList.contains('chat-text--clamped')) return;
    const expanded = span.classList.toggle('is-expanded');
    btn.textContent = expanded ? 'Show less' : 'Show more';
});

// ── PERSISTENT REACTIONS ──────────────────────────────────────────────────────

const REACTION_EMOJIS = ['👍','❤️','😂','😮','💀','🔥','⚔️','🎲'];

const REPORT_REASONS = [
    { key: 'harassment', label: 'Harassment' },
    { key: 'spam',       label: 'Spam' },
    { key: 'minors',     label: 'Inappropriate for minors' },
    { key: 'other',      label: 'Other' },
];

function buildReactionBar(m, myUid) {
    if (!m?.id) return '';
    const reactions = m.reactions || {};
    const chips = Object.entries(reactions)
        .filter(([, uids]) => Array.isArray(uids) && uids.length > 0)
        .map(([emoji, uids]) => {
            const mine = myUid && uids.includes(myUid);
            return `<button class="reaction-chip${mine ? ' is-mine' : ''}" data-emoji="${emoji}" type="button">${emoji} ${uids.length}</button>`;
        }).join('');
    const picker = REACTION_EMOJIS.map(e =>
        `<button class="reaction-pick-btn" data-emoji="${e}" type="button">${e}</button>`
    ).join('');

    const canReport   = myUid && m.uid !== myUid;
    const reportBtn   = canReport ? `<button class="chat-report-btn" data-msg-id="${m.id}" type="button" title="Report message">🚩</button>` : '';
    const reportPicker = canReport
        ? `<div class="report-reason-picker" hidden>${REPORT_REASONS.map(r =>
            `<button class="report-reason-pick-btn" data-reason="${r.key}" type="button">${r.label}</button>`
          ).join('')}</div>`
        : '';

    return `<div class="chat-reactions" data-msg-id="${m.id}"><div class="reaction-chips">${chips}<button class="reaction-add-btn" type="button" title="Add reaction">＋</button>${reportBtn}</div><div class="reaction-picker" hidden>${picker}</div>${reportPicker}</div>`;
}

// Close open reaction/report pickers when clicking outside
document.addEventListener('click', e => {
    if (!e.target.closest('.chat-reactions')) {
        document.querySelectorAll('.reaction-picker:not([hidden]), .report-reason-picker:not([hidden])').forEach(p => { p.hidden = true; });
    }
});

// Report button — toggle reason picker; reason pick — broadcast a chat-report event
document.addEventListener('click', e => {
    const reportBtn = e.target.closest('.chat-report-btn');
    if (reportBtn) {
        e.stopPropagation();
        const picker = reportBtn.closest('.chat-reactions')?.querySelector('.report-reason-picker');
        if (picker) {
            document.querySelectorAll('.reaction-picker:not([hidden]), .report-reason-picker:not([hidden])').forEach(p => { if (p !== picker) p.hidden = true; });
            picker.hidden = !picker.hidden;
        }
        return;
    }
    const reasonBtn = e.target.closest('.report-reason-pick-btn');
    if (reasonBtn) {
        const bar = reasonBtn.closest('.chat-reactions');
        const picker = reasonBtn.closest('.report-reason-picker');
        const chatMsgId = bar?.dataset.msgId;
        const reason = reasonBtn.dataset.reason;
        let reasonNote = null;
        if (reason === 'other') {
            reasonNote = window.prompt('Briefly describe the issue (optional):') || '';
        }
        if (chatMsgId) {
            document.dispatchEvent(new CustomEvent('chat-report', { detail: { chatMsgId, reason, reasonNote } }));
        }
        if (picker) picker.hidden = true;
        const flagBtn = bar?.querySelector('.chat-report-btn');
        if (flagBtn) {
            const orig = flagBtn.textContent;
            flagBtn.textContent = '✓';
            flagBtn.disabled = true;
            setTimeout(() => { flagBtn.textContent = orig; flagBtn.disabled = false; }, 2000);
        }
    }
});

// ── MODERATION: BAN/MUTE GATE ──────────────────────────────────────────────────

let _arcBanStatus = null;

document.addEventListener('arc:firebase-ready', ({ detail }) => {
    const arc = window.__arc;
    if (!arc?.db || !detail?.uid) return;
    arc.onSnapshot(arc.doc(arc.db, 'bans', detail.uid), snap => {
        _arcBanStatus = snap.exists() ? snap.data() : null;
        document.dispatchEvent(new CustomEvent('arc:ban-status-changed', { detail: _arcBanStatus }));
    }, err => console.error('[ARC] ban status:', err));
});

// True if the current device is free to send chat messages
function arcCanSendChat() {
    if (!_arcBanStatus) return true;
    return typeof _arcBanStatus.expiresAt === 'number' && _arcBanStatus.expiresAt < Date.now();
}

function arcBanMessage() {
    if (arcCanSendChat()) return '';
    const { status, expiresAt, createdBy } = _arcBanStatus;
    if (typeof expiresAt !== 'number') {
        return status === 'banned'
            ? (createdBy === 'auto-mod' ? 'You have been permanently banned for violating community guidelines.' : 'You have been banned from chat by The Seven.')
            : 'You have been muted by The Seven.';
    }
    const mins = Math.ceil((expiresAt - Date.now()) / 60000);
    const time = mins >= 60 ? `${Math.ceil(mins / 60)} hour(s)` : `${mins} minute(s)`;
    return `You are temporarily ${status === 'banned' ? 'banned' : 'muted'} — ${time} remaining.`;
}

// Inserts a hidden notice banner before the given container, shown whenever the
// current device is muted/banned. Call once per page during init.
function arcInitBanNotice(containerId) {
    const container = document.getElementById(containerId);
    if (!container?.parentNode) return;
    const notice = document.createElement('div');
    notice.className = 'chat-ban-notice';
    notice.hidden = true;
    container.parentNode.insertBefore(notice, container);

    const update = () => {
        if (!arcCanSendChat()) {
            notice.textContent = arcBanMessage();
            notice.hidden = false;
        } else {
            notice.hidden = true;
        }
    };
    update();
    document.addEventListener('arc:ban-status-changed', update);
    setInterval(update, 30000);
}

// ── AUTO-MODERATION: WORD FILTER, STRIKES, TIMED BANS ────────────────────────

const LEET_MAP = { '0':'o', '1':'i', '3':'e', '4':'a', '5':'s', '7':'t', '@':'a', '$':'s' };

function automodNormalizeToken(tok) {
    return tok.toLowerCase().split('').map(c => LEET_MAP[c] || c).join('')
        .replace(/[^a-z]/g, '')
        .replace(/(.)\1{2,}/g, '$1'); // "fuuuck" -> "fuck"
}

function automodNormalizeFull(text) {
    return text.toLowerCase().split('').map(c => LEET_MAP[c] || c).join('')
        .replace(/[^a-z\s]/g, '')
        .replace(/(.)\1{2,}/g, '$1')
        .replace(/\s+/g, ' ').trim();
}

// Returns 'severe', 'strike', or null
function automodScan(text) {
    const tokens = new Set(text.split(/\s+/).map(automodNormalizeToken).filter(Boolean));
    const full   = automodNormalizeFull(text);
    const hit = list => (list || []).some(term => term.includes(' ')
        ? full.includes(automodNormalizeFull(term))
        : tokens.has(automodNormalizeToken(term)));
    if (hit(window.AUTOMOD_SEVERE)) return 'severe';
    if (hit(window.AUTOMOD_STRIKE)) return 'strike';
    return null;
}

const AUTOMOD_DURATIONS = [10 * 60 * 1000, 10 * 60 * 60 * 1000, null]; // strike 1,2,3 -> 10min,10hr,perma

function automodAlertText(hit, status, expiresAt) {
    if (hit === 'severe') return 'Your message contained language that is not tolerated here. You have been permanently banned.';
    if (status === 'banned') return 'That was your 3rd strike for inappropriate language — you have been permanently banned.';
    const mins = Math.ceil((expiresAt - Date.now()) / 60000);
    const time = mins >= 60 ? `${Math.ceil(mins / 60)} hour(s)` : `${mins} minute(s)`;
    return `Your message was blocked for inappropriate language (strike). You are muted for ${time}.`;
}

// Scans outgoing chat text; if it trips the filter, issues a mute/ban, logs an
// audit-trail report, and returns false (caller must not send the message).
async function arcAutomodGate(text, room, author) {
    const hit = automodScan(text);
    if (!hit) return true;

    const arc = window.__arc;
    if (!arc?.db || !arc?.uid) return true;
    const banRef = arc.doc(arc.db, 'bans', arc.uid);

    let status, reason, expiresAt;
    if (hit === 'severe') {
        status = 'banned'; expiresAt = null; reason = 'auto-mod: severe language';
    } else {
        const strikeRef = arc.doc(arc.db, 'automodStrikes', arc.uid);
        let count = 1;
        try {
            const snap = await arc.getDoc(strikeRef);
            count = (snap.exists() ? (snap.data().count || 0) : 0) + 1;
        } catch (e) { console.error('[ARC] strike lookup:', e); }
        const dur = AUTOMOD_DURATIONS[Math.min(count, 3) - 1];
        expiresAt = dur ? Date.now() + dur : null;
        status = count >= 3 ? 'banned' : 'muted';
        reason = `auto-mod: strike ${Math.min(count, 3)}/3`;
        try {
            await arc.setDoc(strikeRef, { count, lastStrikeAt: arc.serverTimestamp(), lastReason: reason });
        } catch (e) { console.error('[ARC] strike record:', e); }
    }

    try {
        await arc.setDoc(banRef, {
            status, reason, reportId: null,
            createdAt: arc.serverTimestamp(), createdBy: 'auto-mod', expiresAt,
        }, { merge: true });
    } catch (e) { console.error('[ARC] automod ban write:', e); }

    // Audit trail for The Seven (self-report, satisfies existing reports rule)
    try {
        await arc.setDoc(arc.doc(arc.db, 'reports', crypto.randomUUID()), {
            status: 'open', reason: 'automod', reasonNote: reason,
            chatRoom: room, chatMsgId: null,
            chatMsgText: text, chatMsgAuthor: author ?? null, chatMsgUid: arc.uid, chatMsgType: 'msg',
            reportedBy: arc.uid, reportedAt: arc.serverTimestamp(),
            resolvedBy: null, resolvedAt: null, resolutionNote: null,
        });
    } catch (e) { console.error('[ARC] automod report:', e); }

    _arcBanStatus = { status, reason, expiresAt, createdBy: 'auto-mod' };
    document.dispatchEvent(new CustomEvent('arc:ban-status-changed', { detail: _arcBanStatus }));
    alert(automodAlertText(hit, status, expiresAt));
    return false;
}

// ── RATE LIMITING ─────────────────────────────────────────────────────────────

const CHAT_RATE_LIMIT_MAX    = 20;     // max sends...
const CHAT_RATE_LIMIT_WINDOW = 60000;  // ...per this many ms (1 minute)
let _recentSendTimes = [];

// True if a new chat-log entry (msg, roll, feature, poll, etc.) may be sent right now.
// Records the send if allowed. In-memory only — resets on page reload.
function arcRateLimitOk() {
    const now = Date.now();
    _recentSendTimes = _recentSendTimes.filter(t => now - t < CHAT_RATE_LIMIT_WINDOW);
    if (_recentSendTimes.length >= CHAT_RATE_LIMIT_MAX) return false;
    _recentSendTimes.push(now);
    return true;
}

const EMOJI_REACTIONS_HTML = `
<div class="chat-emoji-reactions">
  <button class="chat-emoji-react-btn" type="button" data-emoji-anim="dance"  title="Dance">💃</button>
  <button class="chat-emoji-react-btn" type="button" data-emoji-anim="spin"   title="Spin">🌀</button>
  <button class="chat-emoji-react-btn" type="button" data-emoji-anim="shake"  title="Shake">🫨</button>
  <button class="chat-emoji-react-btn" type="button" data-emoji-anim="boing"  title="Boing">🪀</button>
  <button class="chat-emoji-react-btn" type="button" data-emoji-anim="pop"    title="Pop">💥</button>
  <button class="chat-emoji-react-btn" type="button" data-emoji-anim="flip"   title="Flip">🔄</button>
</div>`;

// Returns the author badge HTML for a shared chat message
function authorBadge(m) {
    if (!m.isNarrator) return `<div class="shared-author">${m.author || 'Player'}</div>`;
    if (m.speakingAs)  return `<div class="shared-author shared-author--npc">🎭 ${m.speakingAs}</div>`;
    return `<div class="shared-author shared-author--nar">◆ ${m.monsterName || 'Narrator'}</div>`;
}

// ── REFERENCE ACTIONS — shared between player and narrator ───────────────────
const REF_ACTIONS = [
    { group: 'Actions' },
    { name: 'Attack',           desc: 'Make a melee or ranged attack against a creature or object within range.' },
    { name: 'Stealth',          desc: 'Make a Stealth check. On success, you are unseen and your next attack has Advantage. Attacking, casting, or revealing yourself ends Stealth unless a feature says otherwise.' },
    { name: 'Dash',             desc: 'Use your action to move again after moving, doubling your distance this turn.' },
    { name: 'Cast a Spell',     desc: 'Requires sound, movement, and a Spellcasting check (usually Spirit). Spend the listed Mana cost.' },
    { name: 'Grab or Hold',     desc: 'Make an opposed Strength check to impose the Pinned condition.' },
    { name: 'Administer Potion',desc: 'Give a potion to a downed ally. Drinking one yourself is a Half-Action.' },
    { group: 'Half-Actions' },
    { name: 'Disarm',           desc: 'Make an opposed Strength or Agility check to disarm a creature.' },
    { name: 'Help',             desc: 'Give a creature +1 to their next check this turn.' },
    { name: 'Pick Up Item',     desc: 'Pick up a dropped or nearby item.' },
    { name: 'Use an Object',    desc: 'Interact with levers, buttons, or similar objects.' },
    { name: 'Disengage',        desc: "Move out of a creature's range without provoking opportunity attacks." },
    { name: 'Unarmed Strike',   desc: 'Deals 1 BPorS damage. Can also be taken as an Off-Action.' },
    { group: 'Stances (Half-Action)' },
    { name: 'Advantage Stance',    desc: 'Gain Advantage on your next attack.' },
    { name: 'Disadvantage Stance', desc: 'Give Disadvantage to enemies attacking you or allies in range.' },
    { name: 'Offensive Stance',    desc: 'Use your Off-Action to Provoke.' },
    { name: 'Reaction Stance',     desc: 'React to failed attacks against you.' },
    { name: 'Guard Stance',        desc: 'When attacked, Provoke once without using an Off-Action. On all failed attacks, may Provoke at Disadvantage.' },
    { group: 'Off-Actions' },
    { name: 'Provoke',    desc: 'Attack creatures leaving your melee range without disengaging, when they fail a check against you, or per a specific ability.' },
    { name: 'Drink',      desc: 'Drink or hand off a potion.' },
    { name: 'Disrupt',    desc: "Impose Disadvantage on an enemy's attack with a successful check." },
    { name: 'Block',      desc: 'Reduce incoming melee damage by half using a shield.' },
    { name: 'Demoralize', desc: 'Force enemies to make a morale check with an Influence (Intimidate) roll.' },
    { group: 'Non-Actions' },
    { name: 'Switch Weapons', desc: 'Drop a weapon and draw another without spending action economy.' },
    { name: 'Stress Push',    desc: 'Take 4 stress damage to gain a +3 bonus on a low roll.' },
    { name: 'Roleplay',       desc: 'Briefly communicate or give orders without consequence.' },
    { group: 'Special' },
    { name: 'Called Shot',    desc: 'Declare before attacking. Accept a −10 to hit. On success, inflict a condition instead of normal damage.' },
    { name: 'Finisher',       desc: 'Instantly eliminate a helpless, sleeping, or completely unaware target. Cannot be used on an active or aware opponent.' },
    { name: 'Surprise Turn',  desc: 'Attacking from Stealth grants one extra action. Reveals your position unless an ability says otherwise.' },
];

// Poll card — used by both narrator and player chat renderers
function renderPollCard(m, currentUid) {
    const votes  = m.votes || {};
    const myVote = currentUid ? votes[currentUid] : null;
    const counts = {};
    Object.values(votes).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const total = Object.keys(votes).length;
    const opts  = (m.options || []).map(opt => {
        const count   = counts[opt] || 0;
        const pct     = total ? Math.round((count / total) * 100) : 0;
        const voted   = myVote === opt;
        return `<button class="poll-opt-btn${voted ? ' poll-opt-btn--voted' : ''}" data-poll-id="${m.id || ''}" data-choice="${opt}" type="button">
            <span class="poll-opt-label">${opt}</span>
            <span class="poll-opt-track"><span class="poll-opt-fill" style="width:${pct}%"></span></span>
            <span class="poll-opt-count">${count || ''}</span>
        </button>`;
    }).join('');
    return `<div class="poll-card">
        <div class="poll-question">${parseInline(m.text || '')}</div>
        <div class="poll-options">${opts}</div>
        <div class="poll-footer">${total} vote${total !== 1 ? 's' : ''} · ${m.time || ''}</div>
    </div>`;
}

// Trigger an emoji animation by chat message ID — called by Firebase reaction listener
function triggerEmojiReaction(chatMsgId, anim) {
    const li    = document.querySelector(`[data-chat-id="${chatMsgId}"]`);
    const emoji = li?.querySelector('.chat-emoji-big');
    if (!emoji || [...emoji.classList].some(c => c.startsWith('is-anim-'))) return;
    const cls = `is-anim-${anim}`;
    emoji.classList.add(cls);
    emoji.addEventListener('animationend', () => emoji.classList.remove(cls), { once: true });
}

// Reaction buttons — delegated on document, works in both active-sheet and narrator
document.addEventListener('click', e => {
    const btn = e.target.closest('[data-emoji-anim]');
    if (!btn) return;
    const emoji     = btn.closest('.chat-emoji-block')?.querySelector('.chat-emoji-big');
    const chatMsgId = btn.closest('[data-chat-id]')?.dataset.chatId;
    if (!emoji) return;
    if ([...emoji.classList].some(c => c.startsWith('is-anim-'))) return;

    // Play locally
    const anim = btn.dataset.emojiAnim;
    const cls  = `is-anim-${anim}`;
    emoji.classList.add(cls);
    emoji.addEventListener('animationend', () => emoji.classList.remove(cls), { once: true });

    // Broadcast to session (handled by active-sheet.js / narrator.js)
    if (chatMsgId) {
        document.dispatchEvent(new CustomEvent('emoji-react', { detail: { chatMsgId, anim } }));
    }
});

function fmtSigned(n) { const v = Number(n) || 0; return v >= 0 ? `+${v}` : `${v}`; }

function naturalRoll(rollNote) {
    if (!rollNote) return null;
    const nums = rollNote.match(/\d+/g)?.map(Number) || [];
    if (!nums.length) return null;
    if (rollNote.startsWith('adv')) return Math.max(...nums);
    if (rollNote.startsWith('dis')) return Math.min(...nums);
    // "d20(14)" — the actual die result is inside the parens, not the "20" from "d20"
    const paren = rollNote.match(/\((\d+)\)/);
    if (paren) return parseInt(paren[1], 10);
    return nums[0];
}

function successCount(total) {
    return total >= 15 ? Math.floor((total - 10) / 5) : 0;
}

function rollDiceNotation(raw) {
    const clean = (raw || '').replace(/\[\[|\]\]/g, '').trim();
    const m = clean.match(/^(\d+)d(\d+)(!?)([+-]\d+)?$/i);
    if (!m) return null;
    const count = Math.min(parseInt(m[1]), 20);
    const sides  = Math.min(parseInt(m[2]), 100);
    const explode = !!m[3], bonus = m[4] ? parseInt(m[4]) : 0;
    const rolls = [];
    for (let i = 0; i < count; i++) {
        let r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        if (explode) {
            let cap = 20;
            while (r === sides && cap-- > 0) { r = Math.floor(Math.random() * sides) + 1; rolls.push(r); }
        }
    }
    return { notation: clean, rolls, bonus, total: rolls.reduce((a, b) => a + b, 0) + bonus };
}

function autoTableRolls(d20Total, damageType) {
    const n = successCount(d20Total);
    if (n < 2 || !damageType || !window.damageData?.[damageType]) return null;
    return Array.from({ length: n - 1 }, () => {
        const roll = Math.floor(Math.random() * 6) + 1;
        return { roll, result: window.damageData[damageType].entries[roll - 1] || '—' };
    });
}

function successHtml(total) {
    const n = successCount(total);
    if (n === 0) return `<div class="roll-outcome roll-outcome--fail">✗ No Success</div>`;
    const label = n === 1 ? '1 Success' : `${n} Successes`;
    const pips  = '◆'.repeat(Math.min(n, 6));
    return `<div class="roll-outcome roll-outcome--success">${pips} ${label}</div>`;
}

function damageTableBtnHtml(total, damageType) {
    const n = successCount(total);
    if (n < 2 || !damageType || !window.damageData?.[damageType]) return '';
    const rolls = n - 1;
    return `<button class="dmg-table-btn" type="button"
        data-dmg-type="${damageType}" data-rolls="${rolls}">
        ⚄ Roll ${damageType} Table${rolls > 1 ? ` ×${rolls}` : ''}
    </button>`;
}

function expandableDesc(desc) {
    if (!desc) return '';
    const isLong = desc.length > 160;
    const html = desc.replace(/\[\[([^\]]+)\]\]/g, '<span class="inline-dice">$1</span>');
    return `<div class="chat-desc-body${isLong ? ' is-clamped' : ''}">
        <p class="chat-feat-desc">${html}</p>
    </div>${isLong ? `<button class="chat-expand-btn" type="button">▼ Show more</button>` : ''}`;
}

function diceChipsHtml(diceRolls) {
    if (!diceRolls?.length) return '';
    return `<div class="chat-feat-dice">${diceRolls.map(r => {
        const detail   = r.rolls?.length > 1 ? ` [${r.rolls.join('+')}]` : '';
        const bonusTxt = r.bonus ? (r.bonus > 0 ? `+${r.bonus}` : `${r.bonus}`) : '';
        return `<div class="chat-dice-chip">
            <span class="chat-dice-notation">${r.notation}</span>
            <span class="chat-dice-arrow">→</span>
            <span class="chat-dice-total">${r.total}</span>
            <span class="chat-dice-detail">${detail}${bonusTxt}</span>
        </div>`;
    }).join('')}</div>`;
}

// ── RENDER FUNCTIONS ──────────────────────────────────────────────────────────

function renderWeaponAttackEntry(entry) {
    const nat      = naturalRoll(entry.rollNote);
    const isCrit   = nat === 20;
    const resClass = isCrit ? 'chat-res--nat20' : nat === 1 ? 'chat-res--nat1' : '';
    const typeLbl  = entry.rollType === 'adv' ? '· Adv' : entry.rollType === 'dis' ? '· Dis' : '';
    const bonusTxt = entry.attackBonus ? ` ${fmtSigned(entry.attackBonus)}` : '';
    const condHtml = entry.conditions?.length
        ? `<div class="chat-roll-cond">${entry.conditions.map(condChip).join(' · ')}</div>` : '';

    const dmgHtml = entry.damageRoll ? (() => {
        const base   = entry.damageRoll.total;
        const total  = isCrit ? base * 2 : base;
        const rolls  = entry.damageRoll.rolls || [];
        const breakdown = rolls.length > 6 ? `[${rolls.length} dice]` : rolls.length ? `[${rolls.join('+')}]` : '';
        const detail = isCrit
            ? `<span class="chat-dice-detail">${breakdown}×2</span><span class="chat-crit-label">CRIT</span>`
            : breakdown ? `<span class="chat-dice-detail">${breakdown}</span>` : '';
        return `<div class="chat-dice-chip${isCrit ? ' chat-dice-chip--crit' : ''}">
            <span class="chat-dice-notation">${entry.damageRoll.notation}</span>
            <span class="chat-dice-arrow">→</span>
            <span class="chat-dice-total">${total}</span>
            ${detail}
        </div>
        <div class="chat-wep-meta">${[entry.damageType, entry.range, entry.properties].filter(Boolean).join(' · ')}</div>`;
    })()
        : `<div class="chat-wep-meta">${[entry.damage, entry.damageType, entry.range, entry.properties].filter(Boolean).join(' · ')}</div>`;

    const critClass = isCrit ? ' chat-roll--crit' : nat === 1 ? ' chat-roll--fumble' : '';
    return `<div class="chat-roll-card chat-roll--weapon${critClass}">
        <div class="chat-card-head">
            <span class="chat-card-title">⚔ ${entry.charName ? `${entry.charName} · ` : ''}${entry.weaponName || ''}</span>
            ${isCrit ? '<span class="chat-crit-tag">CRIT</span>' : nat === 1 ? '<span class="chat-fumble-tag">FUMBLE</span>' : ''}
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="chat-wep-body">
            <div class="chat-wep-col">
                <div class="chat-attack-label">${entry.checkLabel || ''}</div>
                <div class="chat-roll-result ${resClass}">${entry.d20Total}</div>
                <div class="chat-roll-breakdown">${entry.rollNote || ''} ${fmtSigned(entry.checkMod)}${bonusTxt} ${typeLbl}</div>
            </div>
            <div class="chat-wep-col chat-wep-col--right">
                <div class="chat-attack-label">DAMAGE</div>
                ${dmgHtml}
            </div>
        </div>
        ${successHtml(entry.d20Total)}
        ${entry.tableRolls?.length
            ? entry.tableRolls.map(r => `<div class="chat-inline-table-row">
                <span class="chat-table-type">${entry.damageType} Table</span>
                <span class="chat-table-die">d6→${r.roll}</span>
                <span class="chat-table-result">${r.result}</span>
              </div>`).join('')
            : damageTableBtnHtml(entry.d20Total, entry.damageType)}
        ${entry.target ? `<div class="chat-roll-target">↠ ${entry.target}</div>` : ''}
        ${entry.d20Total < 15 ? `<button class="provoke-btn" type="button"> Provoke!</button>` : ''}
        ${entry.desc ? expandableDesc(entry.desc) : ''}
        ${condHtml}
    </div>`;
}

function renderRollEntry(entry) {
    const fc        = entry.featureContext;
    const nat       = naturalRoll(entry.rollNote);
    const resClass  = nat === 20 ? 'chat-res--nat20' : nat === 1 ? 'chat-res--nat1' : '';
    const critClass = nat === 20 ? ' chat-roll--crit' : nat === 1 ? ' chat-roll--fumble' : '';
    const critTag   = nat === 20 ? '<span class="chat-crit-tag">CRIT</span>' : nat === 1 ? '<span class="chat-fumble-tag">FUMBLE</span>' : '';
    const typeLabel = entry.rollType === 'adv' ? '· Adv' : entry.rollType === 'dis' ? '· Dis' : '';
    const condHtml  = entry.conditions?.length
        ? `<div class="chat-roll-cond">${entry.conditions.map(condChip).join(' · ')}</div>` : '';
    const charLabel = entry.charName ? `${entry.charName} · ` : '';

    if (fc) {
        const fcDice      = fc.diceRolls?.length ? fc.diceRolls : [];
        const checkTag    = fc.tags?.find(t => t.startsWith('Check:'));
        const checkLabel  = checkTag ? checkTag.replace('Check: ', '') : (entry.label || 'Check');
        const displayTags = fc.tags?.filter(t => !t.startsWith('Check:')) || [];
        const tagsHtml    = displayTags.length
            ? `<div class="chat-feat-tags">${displayTags.map(t => `<span class="chat-feat-tag">${t}</span>`).join('')}</div>` : '';
        const borderClass = entry.rollType === 'adv' ? 'chat-roll--adv'
            : entry.rollType === 'dis' ? 'chat-roll--dis' : '';
        const modStr = entry.mod !== 0 ? ` ${fmtSigned(entry.mod)}` : '';
        return `<div class="chat-roll-card ${borderClass}${critClass}">
            <div class="chat-card-head">
                <span class="chat-card-title">⚡ ${charLabel}${fc.name}</span>
                ${critTag}
                <span class="chat-time">${entry.time || ''}</span>
            </div>
            ${tagsHtml}
            <div class="chat-attack-row">
                <div class="chat-attack-block">
                    <div class="chat-attack-label">${checkLabel.toUpperCase()}</div>
                    <div class="chat-roll-result ${resClass}">${entry.total}</div>
                    <div class="chat-roll-breakdown">${entry.rollNote || ''}${modStr}${typeLabel ? ` ${typeLabel}` : ''}</div>
                </div>
                ${fcDice.length ? `<div class="chat-attack-block">
                    <div class="chat-attack-label">DAMAGE</div>
                    ${diceChipsHtml(fcDice)}
                </div>` : ''}
            </div>
            ${successHtml(entry.total)}
            ${damageTableBtnHtml(entry.total, fc.tags?.find(t => t.startsWith('Dmg:'))?.match(/\(([^)]+)\)/)?.[1] || '')}
            ${entry.total < 15 ? `<button class="provoke-btn" type="button">⚡ Provoke!</button>` : ''}
            ${fc.desc ? expandableDesc(fc.desc) : ''}
            ${condHtml}
        </div>`;
    }

    const borderClass = entry.rollType === 'adv' ? 'chat-roll--adv'
        : entry.rollType === 'dis' ? 'chat-roll--dis' : '';
    const modStr = entry.mod !== 0 ? ` ${fmtSigned(entry.mod)}` : '';
    return `<div class="chat-roll-card ${borderClass}${critClass}">
        <div class="chat-card-head">
            <span class="chat-card-title">${charLabel}${entry.label || 'Roll'}</span>
            ${critTag}
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="chat-roll-result ${resClass}">${entry.total}</div>
        <div class="chat-roll-breakdown">${entry.rollNote || ''}${modStr}${typeLabel ? ` ${typeLabel}` : ''}</div>
        ${entry.label !== 'Initiative' ? successHtml(entry.total) : ''}
        ${entry.target ? `<div class="chat-roll-target">↠ ${entry.target}</div>` : ''}
        ${entry.label !== 'Initiative' && entry.total < 15 ? `<button class="provoke-btn" type="button">⚡ Provoke!</button>` : ''}
        ${condHtml}
    </div>`;
}

function renderRecoveryEntry(entry) {
    const rows = (entry.gains || []).map(g =>
        `<div class="chat-rec-row">
            <span class="chat-rec-label">${g.label}</span>
            <span class="chat-rec-val${g.rolled ? ' chat-rec-val--rolled' : ''}">${g.value}</span>
        </div>`
    ).join('');
    return `<div class="chat-recovery-card">
        <div class="chat-card-head">
            <span class="chat-card-title">⟳ ${entry.charName ? `${entry.charName} · ` : ''}${entry.title || ''}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="chat-rec-rows">${rows}</div>
    </div>`;
}

function renderDiceEntry(entry) {
    const breakdown = entry.rolls?.length > 1
        ? `<div class="dice-card-breakdown">[${entry.rolls.join(' + ')}]${entry.bonus !== 0 ? ` ${fmtSigned(entry.bonus)}` : ''}</div>`
        : '';
    return `<div class="chat-dice-card">
        <div class="chat-card-head">
            <span class="chat-card-title">${entry.charName ? `${entry.charName} · ` : ''}${entry.notation || ''}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="dice-card-total">${entry.total}</div>
        ${breakdown}
    </div>`;
}

function renderDmgTableEntry(entry) {
    return `<div class="chat-dmg-table-row">
        <span class="chat-table-type">${entry.damageType} Table</span>
        <span class="chat-table-sep">·</span>
        <span class="chat-table-die">d6→${entry.roll}</span>
        <span class="chat-table-sep">·</span>
        <span class="chat-table-result">${entry.result}</span>
        <span class="chat-time">${entry.time || ''}</span>
    </div>`;
}

function renderInitiativeCallEntry(entry) {
    return `<div class="chat-init-call">
        <span class="chat-init-call-icon">🎲</span>
        <span class="chat-init-call-label">ROLL INITIATIVE</span>
        <button class="chat-init-roll-btn" type="button">Roll d20</button>
        <span class="chat-time">${entry.time || ''}</span>
    </div>`;
}

function renderTurnEntry(entry) {
    return `<div class="chat-turn-card">
        <span class="chat-turn-round">Round ${entry.round}</span>
        <span class="chat-turn-sep">·</span>
        <span class="chat-turn-name">${entry.name}</span>
        <span class="chat-time">${entry.time || ''}</span>
    </div>`;
}

function renderFeatureEntry(entry) {
    const tagsHtml = entry.tags?.length
        ? `<div class="chat-feat-tags">${entry.tags.map(t => `<span class="chat-feat-tag">${t}</span>`).join('')}</div>` : '';

    const upgradesHtml = entry.upgrades?.length
        ? `<div class="chat-feat-upgrades">${entry.upgrades.map(u => {
            const uTags = u.tags?.length
                ? `<div class="chat-feat-tags">${u.tags.map(t => `<span class="chat-feat-tag">${t}</span>`).join('')}</div>` : '';
            return `<div class="chat-feat-upgrade">
                <div class="chat-feat-upgrade-name">↳ ${u.name || ''}</div>
                ${uTags}
                ${u.desc ? `<p class="chat-feat-upgrade-desc">${u.desc}</p>` : ''}
            </div>`;
        }).join('')}</div>`
        : '';

    return `<div class="chat-feat-card">
        <div class="chat-card-head">
            <span class="chat-card-title">⚡ ${entry.name || ''}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        ${tagsHtml}
        ${diceChipsHtml(entry.diceRolls)}
        ${expandableDesc(entry.desc)}
        ${upgradesHtml}
    </div>`;
}
