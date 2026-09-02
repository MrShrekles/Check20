// ARC20 Firebase module - loads once, exposes window.__arc to all pages
//
// The SDK is vendored under scripts/vendor/firebase/ rather than loaded from
// gstatic. The service worker only caches same-origin requests, so a CDN copy
// could never be cached and auth would be unavailable offline. The vendored
// bundles are the stock 12.13.0 files with their one cross-origin import
// rewritten to './firebase-app.js'. To upgrade: re-download all three and redo
// that rewrite.

import { initializeApp } from './vendor/firebase/firebase-app.js';
import {
    getFirestore, doc, setDoc, getDoc,
    collection, onSnapshot, serverTimestamp, updateDoc, deleteDoc,
    query, orderBy, limit, getDocs, writeBatch, where,
    arrayUnion, arrayRemove,
} from './vendor/firebase/firebase-firestore.js';
import {
    getAuth, onAuthStateChanged, signInAnonymously,
    GoogleAuthProvider, linkWithPopup, signInWithPopup,
    signInWithRedirect, getRedirectResult, signOut, updateProfile, deleteUser,
} from './vendor/firebase/firebase-auth.js';

const firebaseConfig = {
    apiKey:            'AIzaSyDbM6Dc8KEnRgWuK2owVhMXAY87aZNBIDA',
    authDomain:        'check20-77406.firebaseapp.com',
    projectId:         'check20-77406',
    storageBucket:     'check20-77406.firebasestorage.app',
    messagingSenderId: '906281015894',
    appId:             '1:906281015894:web:838a990002ffb93a8a79f7',
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// Expose db + Firestore helpers immediately (uid filled in after auth resolves)
window.__arc = {
    db, uid: null, isAnonymous: false, user: null,
    doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp, updateDoc, deleteDoc,
    query, orderBy, limit, getDocs, writeBatch, where, arrayUnion, arrayRemove,
    auth, GoogleAuthProvider, linkWithPopup, signInWithPopup,
    signInWithRedirect, getRedirectResult, signInAnonymously, signOut,
    onAuthStateChanged, updateProfile, deleteUser,

    // A real account, not a leftover anonymous session. Anything that touches
    // other people (rooms, chat, cloud saves) gates on this; solo play does not.
    isSignedIn() { return !!this.user && !this.isAnonymous; },
};

// ── AUTH BOOTSTRAP ────────────────────────────────────────────────────────────
// Previously this called signInAnonymously() unconditionally, so every visitor
// got a throwaway uid. Now the session is whatever is already cached - which is
// what lets a signed-in user open the app offline, since onAuthStateChanged
// resolves from local persistence without touching the network.
//
// `arc:firebase-ready` still fires exactly once, and still fires even when
// nobody is signed in (detail.uid === null). Every listener already guards on
// uid, so signed-out simply means the room/chat features stay dormant.
// Later transitions - signing in, signing out - fire `arc:auth-changed`.

let _readyFired = false;

function applyUser(user) {
    const arc = window.__arc;
    arc.user        = user || null;
    arc.uid         = user ? user.uid : null;
    arc.isAnonymous = user ? !!user.isAnonymous : false;
}

onAuthStateChanged(auth, user => {
    applyUser(user);
    const detail = {
        uid:         window.__arc.uid,
        isAnonymous: window.__arc.isAnonymous,
        signedIn:    window.__arc.isSignedIn(),
        displayName: user?.displayName || '',
    };

    if (!_readyFired) {
        _readyFired = true;
        document.dispatchEvent(new CustomEvent('arc:firebase-ready', { detail }));
    }
    document.dispatchEvent(new CustomEvent('arc:auth-changed', { detail }));
}, err => {
    console.error('[ARC] auth state failed:', err);
    if (!_readyFired) {
        _readyFired = true;
        document.dispatchEvent(new CustomEvent('arc:firebase-ready', {
            detail: { uid: null, isAnonymous: false, signedIn: false, displayName: '' },
        }));
    }
});

// Completes a signInWithRedirect() started on a previous page load. Harmless
// when no redirect is pending; it resolves to null.
getRedirectResult(auth).catch(err => {
    if (err?.code !== 'auth/no-auth-event') console.error('[ARC] redirect result:', err);
});
