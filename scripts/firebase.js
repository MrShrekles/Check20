// ARC20 Firebase module - loads once, exposes window.__arc to all pages

import { initializeApp }        from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
    getFirestore, doc, setDoc, getDoc,
    collection, onSnapshot, serverTimestamp, updateDoc, deleteDoc,
    query, orderBy, limit, getDocs, writeBatch, where,
    arrayUnion, arrayRemove,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { getAuth, signInAnonymously, GoogleAuthProvider, linkWithPopup, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

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

// Expose db + Firestore helpers immediately (uid filled in after auth)
window.__arc = {
    db, uid: null,
    doc, setDoc, getDoc, collection, onSnapshot, serverTimestamp, updateDoc, deleteDoc,
    query, orderBy, limit, getDocs, writeBatch, where, arrayUnion, arrayRemove,
    auth, GoogleAuthProvider, linkWithPopup, signInWithPopup,
};

signInAnonymously(auth)
    .then(cred => {
        window.__arc.uid = cred.user.uid;
        document.dispatchEvent(new CustomEvent('arc:firebase-ready', {
            detail: { uid: cred.user.uid },
        }));
    })
    .catch(err => console.error('[ARC] Firebase auth failed:', err));
