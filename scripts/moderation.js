// moderation.js — "The Seven" moderation dashboard

const MOD_PASS = 'sevenwatchthegate';

const REASON_LABELS = {
    harassment: 'Harassment',
    spam:       'Spam',
    minors:     'Inappropriate for minors',
    automod:    'Auto-Mod',
    other:      'Other',
};

let openReports = [];
let activeBans  = [];
let roster      = [];
let strikes     = [];

function truncUid(uid) {
    if (!uid) return '—';
    return uid.length > 10 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid;
}

function escapeHtml(str) {
    return (str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function fmtTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ── BOOTSTRAP ────────────────────────────────────────────────────────────────

document.addEventListener('arc:firebase-ready', async ({ detail }) => {
    const arc = window.__arc;
    document.getElementById('mod-loading').hidden = true;
    try {
        const snap = await arc.getDoc(arc.doc(arc.db, 'admins', detail.uid));
        if (snap.exists()) {
            showDashboard(snap.data());
        } else {
            showGate();
        }
    } catch (e) {
        console.error('[MOD] admin check failed:', e);
        showGate();
    }
});

function showGate() {
    document.getElementById('gate').hidden = false;
}

function showDashboard(adminDoc) {
    document.getElementById('gate').hidden = true;
    document.getElementById('dashboard').hidden = false;
    document.getElementById('link-google-section').hidden = !!adminDoc.linkedGoogle;

    listenReports();
    listenBans();
    listenRoster();
    listenStrikes();
}

// ── GATE ─────────────────────────────────────────────────────────────────────

document.getElementById('gate-btn')?.addEventListener('click', async () => {
    const pw  = document.getElementById('gate-pw').value;
    const err = document.getElementById('gate-err');
    if (pw !== MOD_PASS) { err.hidden = false; return; }
    err.hidden = true;

    const arc = window.__arc;
    try {
        await arc.setDoc(arc.doc(arc.db, 'admins', arc.uid), {
            role: 'seven', addedAt: arc.serverTimestamp(), addedBy: 'self', linkedGoogle: false, label: null,
        });
        showDashboard({ linkedGoogle: false });
    } catch (e) {
        console.error('[MOD] self-register failed:', e);
        err.textContent = 'Something went wrong — try again.';
        err.hidden = false;
    }
});

document.getElementById('gate-pw')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('gate-btn').click();
});

document.getElementById('gate-google-btn')?.addEventListener('click', async () => {
    const arc = window.__arc;
    const err = document.getElementById('gate-google-err');
    err.hidden = true;
    try {
        const result = await arc.signInWithPopup(arc.auth, new arc.GoogleAuthProvider());
        const uid  = result.user.uid;
        const snap = await arc.getDoc(arc.doc(arc.db, 'admins', uid));
        if (snap.exists()) {
            arc.uid = uid;
            showDashboard(snap.data());
        } else {
            err.textContent = "This Google account isn't registered as The Seven — use the passcode first.";
            err.hidden = false;
        }
    } catch (e) {
        console.error('[MOD] google sign-in failed:', e);
        err.textContent = 'Sign-in failed: ' + (e.message || e.code || 'unknown error');
        err.hidden = false;
    }
});

// ── LINK GOOGLE ACCOUNT ────────────────────────────────────────────────────

document.getElementById('btn-link-google')?.addEventListener('click', async () => {
    const arc    = window.__arc;
    const status = document.getElementById('link-google-status');
    status.textContent = '';
    try {
        await arc.linkWithPopup(arc.auth.currentUser, new arc.GoogleAuthProvider());
        await arc.updateDoc(arc.doc(arc.db, 'admins', arc.uid), { linkedGoogle: true });
        document.getElementById('link-google-section').hidden = true;
    } catch (e) {
        console.error('[MOD] link failed:', e);
        status.textContent = e.code === 'auth/credential-already-in-use'
            ? "This Google account is already linked elsewhere — use 'Sign in with Google' instead."
            : 'Link failed: ' + (e.message || e.code || 'unknown error');
    }
});

// ── OPEN REPORTS ─────────────────────────────────────────────────────────────

function listenReports() {
    const arc = window.__arc;
    const q = arc.query(
        arc.collection(arc.db, 'reports'),
        arc.where('status', '==', 'open'),
        arc.orderBy('reportedAt', 'desc'),
    );
    arc.onSnapshot(q, snap => {
        openReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderReports();
    }, err => console.error('[MOD] reports listener:', err));
}

function renderReports() {
    const el = document.getElementById('reports-list');
    if (!openReports.length) { el.innerHTML = '<p class="mod-empty">No open reports.</p>'; return; }
    el.innerHTML = openReports.map(r => `
        <div class="mod-card" data-report-id="${r.id}">
            <div class="mod-card-head">
                <span class="mod-reason">🚩 ${REASON_LABELS[r.reason] || r.reason || 'Unknown'}</span>
                <span class="mod-time">${fmtTime(r.reportedAt)}</span>
            </div>
            ${r.reasonNote ? `<div class="mod-note">"${escapeHtml(r.reasonNote)}"</div>` : ''}
            <div class="mod-msg-snapshot">
                <div class="mod-msg-author">${escapeHtml(r.chatMsgAuthor || 'Unknown')} · room ${escapeHtml(r.chatRoom || '?')} · ${escapeHtml(r.chatMsgType || 'msg')}</div>
                <div class="mod-msg-text">${escapeHtml(r.chatMsgText || '(no text)')}</div>
            </div>
            <div class="mod-meta">Reported by ${truncUid(r.reportedBy)}</div>
            <div class="mod-actions">
                ${r.chatMsgId ? '<button class="mod-btn mod-btn--danger" data-action="remove" type="button">Remove Message</button>' : ''}
                <button class="mod-btn mod-btn--warn" data-action="mute" type="button">Mute User</button>
                <button class="mod-btn mod-btn--danger" data-action="ban" type="button">Ban User</button>
                <button class="mod-btn" data-action="dismiss" type="button">Dismiss</button>
            </div>
        </div>
    `).join('');
}

async function setReportStatus(reportId, status, note) {
    const arc = window.__arc;
    await arc.updateDoc(arc.doc(arc.db, 'reports', reportId), {
        status, resolvedBy: arc.uid, resolvedAt: arc.serverTimestamp(), resolutionNote: note,
    });
}

document.getElementById('reports-list')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card   = btn.closest('.mod-card');
    const report = openReports.find(r => r.id === card.dataset.reportId);
    if (!report) return;
    const arc    = window.__arc;
    const action = btn.dataset.action;

    btn.disabled = true;
    try {
        if (action === 'remove') {
            await arc.updateDoc(arc.doc(arc.db, 'rooms', report.chatRoom, 'chat', report.chatMsgId), { removed: true });
            await setReportStatus(report.id, 'resolved', 'Message removed');
        } else if (action === 'mute' || action === 'ban') {
            if (!report.chatMsgUid) { alert('No user associated with this report.'); btn.disabled = false; return; }
            const status = action === 'mute' ? 'muted' : 'banned';
            await arc.setDoc(arc.doc(arc.db, 'bans', report.chatMsgUid), {
                status, reason: report.reason, reportId: report.id,
                createdAt: arc.serverTimestamp(), createdBy: arc.uid, expiresAt: null,
            });
            await setReportStatus(report.id, 'resolved', `User ${status}`);
        } else if (action === 'dismiss') {
            await setReportStatus(report.id, 'dismissed', null);
        }
    } catch (e) {
        console.error('[MOD] report action failed:', e);
        btn.disabled = false;
    }
});

// ── CURRENT BANS / MUTES ───────────────────────────────────────────────────

function listenBans() {
    const arc = window.__arc;
    arc.onSnapshot(arc.collection(arc.db, 'bans'), snap => {
        activeBans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderBans();
    }, err => console.error('[MOD] bans listener:', err));
}

function renderBans() {
    const el = document.getElementById('bans-list');
    if (!activeBans.length) { el.innerHTML = '<p class="mod-empty">No active bans or mutes.</p>'; return; }
    el.innerHTML = activeBans.map(b => {
        const source = b.createdBy === 'auto-mod' ? 'Auto-Mod' : `Seven (${truncUid(b.createdBy)})`;
        let durationLabel;
        if (typeof b.expiresAt === 'number') {
            durationLabel = `until ${fmtTime(b.expiresAt)}` + (b.expiresAt < Date.now() ? ' (expired)' : '');
        } else {
            durationLabel = 'Permanent';
        }
        return `
        <div class="mod-card" data-uid="${b.id}">
            <div class="mod-card-head">
                <span class="mod-reason">${b.status === 'banned' ? '🚫 Banned' : '🔇 Muted'}</span>
                <span class="mod-time">${fmtTime(b.createdAt)}</span>
            </div>
            <div class="mod-meta">User ${truncUid(b.id)} · by ${source} · ${durationLabel}</div>
            ${b.reason ? `<div class="mod-note">Reason: ${REASON_LABELS[b.reason] || escapeHtml(b.reason)}</div>` : ''}
            <div class="mod-actions">
                <button class="mod-btn" data-action="unban" type="button">Unban / Unmute</button>
            </div>
        </div>
    `;
    }).join('');
}

document.getElementById('bans-list')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action="unban"]');
    if (!btn) return;
    const uid = btn.closest('.mod-card').dataset.uid;
    btn.disabled = true;
    try {
        const arc = window.__arc;
        await arc.deleteDoc(arc.doc(arc.db, 'bans', uid));
    } catch (e) {
        console.error('[MOD] unban failed:', e);
        btn.disabled = false;
    }
});

// ── THE SEVEN ROSTER ─────────────────────────────────────────────────────────

function listenRoster() {
    const arc = window.__arc;
    arc.onSnapshot(arc.collection(arc.db, 'admins'), snap => {
        roster = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderRoster();
    }, err => console.error('[MOD] roster listener:', err));
}

function renderRoster() {
    const el  = document.getElementById('roster-list');
    const arc = window.__arc;
    el.innerHTML = roster.map(a => `
        <div class="mod-card" data-uid="${a.id}">
            <div class="mod-card-head">
                <span class="mod-reason">${escapeHtml(a.label || 'The Seven')}</span>
                <span class="mod-time">${fmtTime(a.addedAt)}</span>
            </div>
            <div class="mod-meta">${truncUid(a.id)} · ${a.linkedGoogle ? 'Google linked' : 'passcode only'}${a.id === arc.uid ? ' · (you)' : ''}</div>
            <div class="mod-actions">
                <button class="mod-btn mod-btn--danger" data-action="remove" type="button">Remove</button>
            </div>
        </div>
    `).join('');
}

document.getElementById('roster-list')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action="remove"]');
    if (!btn) return;
    const uid = btn.closest('.mod-card').dataset.uid;
    if (roster.length <= 1) { alert("Can't remove the last member of The Seven."); return; }
    if (!confirm('Remove this member from The Seven?')) return;
    btn.disabled = true;
    try {
        const arc = window.__arc;
        await arc.deleteDoc(arc.doc(arc.db, 'admins', uid));
    } catch (e) {
        console.error('[MOD] roster remove failed:', e);
        btn.disabled = false;
    }
});

// ── AUTO-MOD ACTIVITY ────────────────────────────────────────────────────────

function listenStrikes() {
    const arc = window.__arc;
    arc.onSnapshot(arc.collection(arc.db, 'automodStrikes'), snap => {
        strikes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStrikes();
    }, err => console.error('[MOD] strikes listener:', err));
}

function renderStrikes() {
    const el = document.getElementById('strikes-list');
    if (!strikes.length) { el.innerHTML = '<p class="mod-empty">No auto-mod strikes recorded.</p>'; return; }
    el.innerHTML = strikes.map(s => `
        <div class="mod-card" data-uid="${s.id}">
            <div class="mod-card-head">
                <span class="mod-reason">${escapeHtml(s.lastReason || `Strike ${s.count}/3`)}</span>
                <span class="mod-time">${fmtTime(s.lastStrikeAt)}</span>
            </div>
            <div class="mod-meta">User ${truncUid(s.id)} · ${s.count || 0}/3 strikes</div>
            <div class="mod-actions">
                <button class="mod-btn" data-action="reset" type="button">Reset Strikes</button>
            </div>
        </div>
    `).join('');
}

document.getElementById('strikes-list')?.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action="reset"]');
    if (!btn) return;
    const uid = btn.closest('.mod-card').dataset.uid;
    if (!confirm('Reset this user\'s strike count to 0?')) return;
    btn.disabled = true;
    try {
        const arc = window.__arc;
        await arc.deleteDoc(arc.doc(arc.db, 'automodStrikes', uid));
    } catch (e) {
        console.error('[MOD] strike reset failed:', e);
        btn.disabled = false;
    }
});
