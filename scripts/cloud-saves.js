/* ARC20 cloud character saves
 *
 * localStorage stays the source of truth for the live sheet - it is what makes
 * play work with no signal, and nothing here changes that. Firestore is a sync
 * layer on top: characters are pushed when they are deliberately saved and
 * pulled when you sign in somewhere new.
 *
 * Storage shape: users/{uid}/characters/{charId}
 *   name, classKey, level, savedAt (client ms), updatedAt (server), schema,
 *   data (the save blob as a JSON *string*)
 *
 * The blob is a string rather than a nested map on purpose. The save object has
 * arbitrary nesting and user-controlled keys (featureOverrides, theme, custom
 * gains); Firestore restricts field names and map depth, and a stray key would
 * fail the write at some unpredictable future moment rather than here.
 *
 * Every function is a no-op when signed out or offline. Nothing here may ever
 * be required for solo play to work.
 */

(function () {
    const SCHEMA      = 1;
    // Firestore's hard limit is 1 MiB per document. Leave room for the metadata
    // fields and for UTF-8 expanding multi-byte characters.
    const MAX_BLOB    = 900 * 1024;
    const SAVES_KEY   = 'arc-saves';

    function arc() { return window.__arc; }

    function available() {
        const a = arc();
        return !!(a?.db && a?.uid && window.ArcAuth?.isSignedIn());
    }

    /* Session chat is not character data - it is scrollback. Dropping it keeps
     * the document small and avoids syncing one player's chat log to a device
     * that will immediately overwrite it. */
    function stripForCloud(raw) {
        try {
            const obj = JSON.parse(raw);
            delete obj.chat;
            return JSON.stringify(obj);
        } catch { return raw; }
    }

    function metaFrom(raw) {
        try {
            const d = JSON.parse(raw);
            return {
                name:     d.char?.name     || 'Unnamed',
                classKey: d.char?.classKey || '',
                level:    Number(d.char?.level) || 1,
            };
        } catch { return { name: 'Unnamed', classKey: '', level: 1 }; }
    }

    // ── WRITE ─────────────────────────────────────────────────────────────────

    async function push(id, raw, savedAt) {
        if (!available() || !id || !raw) return { ok: false, reason: 'unavailable' };

        const data = stripForCloud(raw);
        if (data.length > MAX_BLOB) {
            console.warn('[ARC] character too large to sync:', id, data.length);
            return { ok: false, reason: 'too-large' };
        }

        const a = arc();
        try {
            await a.setDoc(a.doc(a.db, 'users', a.uid, 'characters', id), {
                ...metaFrom(raw),
                savedAt:   savedAt || Date.now(),
                updatedAt: a.serverTimestamp(),
                schema:    SCHEMA,
                data,
            });
            return { ok: true };
        } catch (e) {
            // Offline is the common case and is not an error worth shouting about;
            // the character is safe in localStorage either way.
            console.warn('[ARC] cloud push deferred:', e?.code || e);
            return { ok: false, reason: 'offline' };
        }
    }

    async function remove(id) {
        if (!available() || !id) return false;
        const a = arc();
        try {
            await a.deleteDoc(a.doc(a.db, 'users', a.uid, 'characters', id));
            return true;
        } catch (e) { console.warn('[ARC] cloud delete failed:', e?.code || e); return false; }
    }

    /* displayName is the only profile field written anywhere. No email, no photo. */
    async function ensureUserDoc(displayName) {
        if (!available()) return;
        const a = arc();
        try {
            await a.setDoc(a.doc(a.db, 'users', a.uid), {
                displayName: displayName || window.ArcAuth?.displayName() || '',
                lastSeenAt:  a.serverTimestamp(),
            }, { merge: true });
        } catch (e) { console.warn('[ARC] user doc deferred:', e?.code || e); }
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    async function list() {
        if (!available()) return [];
        const a = arc();
        try {
            const snap = await a.getDocs(a.collection(a.db, 'users', a.uid, 'characters'));
            return snap.docs.map(d => {
                const v = d.data();
                return {
                    id: d.id, name: v.name || 'Unnamed', classKey: v.classKey || '',
                    level: v.level || 1, savedAt: v.savedAt || 0,
                };
            });
        } catch (e) { console.warn('[ARC] cloud list failed:', e?.code || e); return []; }
    }

    async function get(id) {
        if (!available() || !id) return null;
        const a = arc();
        try {
            const snap = await a.getDoc(a.doc(a.db, 'users', a.uid, 'characters', id));
            return snap.exists() ? (snap.data().data || null) : null;
        } catch (e) { console.warn('[ARC] cloud get failed:', e?.code || e); return null; }
    }

    // ── FIRST SIGN-IN ─────────────────────────────────────────────────────────

    /* Upload characters that already live on this device. Pure local -> cloud,
     * no reconciliation: nothing is overwritten and nothing is renamed. */
    async function uploadAllLocal() {
        if (!available()) return { pushed: 0, failed: 0 };

        let saves = [];
        try { saves = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]'); } catch {}

        let pushed = 0, failed = 0;
        for (const s of saves) {
            const raw = localStorage.getItem(`arc-save-${s.id}`);
            if (!raw) continue;
            const res = await push(s.id, raw, s.savedAt);
            res.ok ? pushed++ : failed++;
        }
        return { pushed, failed };
    }

    // ── CONFLICTS ─────────────────────────────────────────────────────────────

    /* Compare cloud against local by savedAt. Returns what differs so the caller
     * can ASK rather than silently picking a winner - a character quietly rolled
     * back is the fastest way to lose someone's trust in cloud saves. */
    async function diff() {
        const cloud = await list();
        let local = [];
        try { local = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]'); } catch {}

        const localById = Object.fromEntries(local.map(s => [s.id, s]));
        const cloudById = Object.fromEntries(cloud.map(s => [s.id, s]));

        return {
            cloudOnly: cloud.filter(c => !localById[c.id]),
            localOnly: local.filter(l => !cloudById[l.id]),
            newerInCloud: cloud.filter(c => {
                const l = localById[c.id];
                return l && (c.savedAt || 0) > (l.savedAt || 0);
            }),
        };
    }

    window.ArcCloud = {
        available, push, remove, list, get, diff,
        uploadAllLocal, ensureUserDoc, stripForCloud,
    };
})();
