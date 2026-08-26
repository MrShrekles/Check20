/* ARC20 auth gate
 *
 * The rule this enforces: anything solo works signed out. Anything that touches
 * other people - rooms, shared chat, cloud saves, sharing - needs an account.
 *
 * OFFLINE IS THE POINT. The gate reads a localStorage flag and never waits on
 * Firebase, so a player who signed in at home can open the app in a basement or
 * a campsite with no signal and everything solo still works. Someone could forge
 * that flag in devtools and it would not matter: this gate is UX, not security.
 * The security boundary is the Firestore rules, which run on Google's servers
 * where a fake localStorage key means nothing. All a forger unlocks is the
 * offline single-player app they could already use.
 *
 * Loaded as a classic script before the page's own logic. It must never throw,
 * because a broken gate would take the whole app down with it.
 */

(function () {
    const FLAG_KEY = 'arc-auth';

    // ── LOCAL FLAG ────────────────────────────────────────────────────────────

    function getLocal() {
        try {
            const raw = localStorage.getItem(FLAG_KEY);
            if (!raw) return null;
            const v = JSON.parse(raw);
            return (v && v.uid) ? v : null;
        } catch { return null; }
    }

    function setLocal(user) {
        try {
            localStorage.setItem(FLAG_KEY, JSON.stringify({
                uid:         user.uid,
                displayName: user.displayName || '',
                at:          Date.now(),
            }));
        } catch { /* private mode - the session still works, it just won't persist */ }
    }

    // Only ever called from a deliberate sign-out. Never clear this because
    // Firebase reported no user: offline, or after iOS evicts IndexedDB, that is
    // exactly the state a signed-in player is in - and clearing it would lock
    // them out of their own offline sheet, which is the failure this whole
    // design exists to prevent.
    function clearLocal() {
        try { localStorage.removeItem(FLAG_KEY); } catch {}
    }

    function isSignedIn()  { return !!getLocal(); }
    function displayName() { return getLocal()?.displayName || ''; }

    // ── PLATFORM ──────────────────────────────────────────────────────────────

    // Popups are unreliable in an installed PWA on iOS - they open detached or
    // are blocked outright - so those get the redirect flow instead.
    function prefersRedirect() {
        try {
            const standalone = window.navigator.standalone === true
                || window.matchMedia?.('(display-mode: standalone)')?.matches;
            const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            return !!(standalone && iOS);
        } catch { return false; }
    }

    // Sign-in only ever executes on home.html. Redirect reloads the page, and
    // reloading active-sheet.html mid-session would drop a player out of a fight.
    function onHomePage() {
        return /(^|\/)home\.html$/.test(location.pathname) || location.pathname.endsWith('/active-sheet/');
    }

    function sendToSignIn(reason) {
        const next = location.pathname.split('/').pop() + location.search + location.hash;
        const url  = new URL('home.html', location.href);
        url.searchParams.set('next', next);
        if (reason) url.searchParams.set('why', reason);
        location.href = url.toString();
    }

    // ── SIGN IN / OUT ─────────────────────────────────────────────────────────

    async function signInWithGoogle() {
        const arc = window.__arc;
        if (!arc?.auth) throw new Error('offline');

        const provider = new arc.GoogleAuthProvider();

        if (prefersRedirect()) {
            await arc.signInWithRedirect(arc.auth, provider);
            return null;                       // the page navigates away
        }

        let cred;
        try {
            cred = await arc.signInWithPopup(arc.auth, provider);
        } catch (e) {
            // Blocked popups are common on mobile browsers; fall back rather
            // than dead-ending the user.
            if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
                await arc.signInWithRedirect(arc.auth, provider);
                return null;
            }
            throw e;
        }
        if (cred?.user) setLocal(cred.user);
        return cred?.user || null;
    }

    async function signOutNow() {
        const arc = window.__arc;
        clearLocal();
        // Leaving an account should not leave you pointed at its rooms.
        try {
            localStorage.removeItem('arc-room');
            localStorage.removeItem('arc-room-name');
            localStorage.removeItem('arc-narrator-room');
        } catch {}
        try { if (arc?.auth) await arc.signOut(arc.auth); } catch (e) { console.error('[ARC] sign out:', e); }
        document.dispatchEvent(new CustomEvent('arc:signed-out'));
    }

    async function setDisplayName(name) {
        const arc   = window.__arc;
        const clean = (name || '').trim().slice(0, 40);
        if (!clean) return false;

        const local = getLocal();
        if (local) { local.displayName = clean; try { localStorage.setItem(FLAG_KEY, JSON.stringify(local)); } catch {} }

        // Best effort - offline this stays local until the next successful write.
        try {
            if (arc?.auth?.currentUser) {
                await arc.updateProfile(arc.auth.currentUser, { displayName: clean });
                // displayName is the ONLY profile field stored. No email, no photo.
                await arc.setDoc(arc.doc(arc.db, 'users', arc.uid),
                    { displayName: clean, updatedAt: arc.serverTimestamp() }, { merge: true });
            }
        } catch (e) { console.warn('[ARC] display name sync deferred:', e); }
        return true;
    }

    function needsDisplayName() {
        const local = getLocal();
        return !!local && !local.displayName;
    }

    /* Gate an action that touches other people. Returns true to proceed.
     * When signed out it either routes to sign-in or, if already on home,
     * hands back false so the caller can surface its own prompt. */
    function require(reason) {
        if (isSignedIn()) return true;
        if (onHomePage()) {
            document.dispatchEvent(new CustomEvent('arc:sign-in-required', { detail: { reason } }));
            return false;
        }
        sendToSignIn(reason);
        return false;
    }

    // ── KEEP THE FLAG FRESH ───────────────────────────────────────────────────
    // Note the asymmetry: a real account refreshes the flag, but a null user
    // never clears it. See clearLocal() above for why.
    document.addEventListener('arc:auth-changed', ({ detail }) => {
        if (detail?.signedIn && window.__arc?.user) setLocal(window.__arc.user);
    });

    window.ArcAuth = {
        getLocal, isSignedIn, displayName, needsDisplayName,
        signInWithGoogle, signOutNow, setDisplayName,
        require, sendToSignIn, prefersRedirect,
    };
})();
