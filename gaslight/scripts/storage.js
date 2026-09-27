/* Cloud Storage: the bytes Firestore cannot hold.

   A Firestore document is capped at 1MB and a battlemap is many times that, so
   the image lives in Storage and the scene keeps only its URL. That split is
   the whole reason this module exists, and it is also why a map could never
   just be a data URL in the save: `snapshot()` is JSON.stringified into
   localStorage every two seconds, and one base64 map would blow the quota —
   which `autosave.js` catches, warns about once, and then goes silent about.

   Everything here is best effort. Signed out, offline, or with Storage
   unreachable, the table keeps working and the map simply has no image. It is
   never allowed to take the app down.

   `window.__arc` is set up by ../scripts/firebase.js, shared with the
   companion app and the website. See the README's **Firebase rooms**. */

import { session } from './session.js';
import { toast } from './dom.js';

/* Kept in step with storage.rules. The rule is the limit; this is the
   courtesy, so a 40MB drop is refused before it is uploaded rather than after.
   Change one and change the other. */
export const MAX_MAP_MB = 12;
export const MAP_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const arc = () => window.__arc || null;

/** Whether a map can be uploaded, and if not, why — in words a narrator can
    act on rather than a boolean they then have to explain to themselves. */
export function uploadBlocker() {
  if (!arc()?.storage) return 'Cloud storage is not available on this page.';
  if (!arc().isSignedIn?.()) return 'Sign in to put a map on a scene. Solo tables keep working without it.';
  if (!session.room) return 'Open the table from a room to upload a map.';
  return '';
}

/** What is wrong with this file, or '' if nothing is. */
export function fileBlocker(file) {
  if (!file) return 'No file.';
  if (!MAP_TYPES.includes(file.type)) return 'That is not a PNG, JPEG, WebP or GIF.';
  if (file.size > MAX_MAP_MB * 1024 * 1024) {
    return `That is ${(file.size / 1024 / 1024).toFixed(1)}MB; the limit is ${MAX_MAP_MB}MB.`;
  }
  return '';
}

/* A name that cannot collide and says where it came from. The uid also goes in
   the object's metadata, which is what the delete rule actually checks — the
   name is for a human reading the bucket. */
function objectName(file) {
  const ext = (file.name.match(/\.[a-z0-9]+$/i) || ['.png'])[0].toLowerCase();
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${arc().uid}-${stamp}${rand}${ext}`;
}

/**
 * Put a map in the bucket and give back its URL.
 *
 * @param {File} file
 * @param {string} sceneId
 * @param {(pct: number) => void} [onProgress] 0-100, for the bar
 * @returns {Promise<{url: string, path: string, w: number, h: number}>}
 */
export async function uploadSceneImage(file, sceneId, onProgress) {
  const why = uploadBlocker() || fileBlocker(file);
  if (why) throw new Error(why);

  const a = arc();
  const path = `rooms/${session.room}/scenes/${sceneId}/${objectName(file)}`;
  const ref = a.storageRef(a.storage, path);

  /* Resumable rather than a plain put: a battlemap on a hotel wifi is exactly
     the upload that needs a progress bar and the ability to survive a stall. */
  const task = a.uploadBytesResumable(ref, file, {
    contentType: file.type,
    // The rules read this, not the filename.
    customMetadata: { uploader: a.uid, room: session.room, scene: sceneId },
  });

  const url = await new Promise((resolve, reject) => {
    task.on('state_changed',
      snap => onProgress?.(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      reject,
      () => a.getDownloadURL(task.snapshot.ref).then(resolve, reject));
  });

  const { w, h } = await imageSize(file);
  return { url, path, w, h };
}

/** The pixel size, read locally: the map has to be placed before it loads. */
export function imageSize(fileOrUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isFile = typeof fileOrUrl !== 'string';
    if (!isFile) img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      if (isFile) URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('That image could not be read.'));
      if (isFile) URL.revokeObjectURL(img.src);
    };
    img.src = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
  });
}

/**
 * Take a map out of the bucket. Only ever the one this browser uploaded — the
 * rule refuses anyone else's, so a failure here is expected rather than
 * exceptional and is swallowed.
 */
export async function removeSceneImage(path) {
  const a = arc();
  if (!a?.storage || !path) return false;
  try {
    await a.deleteObject(a.storageRef(a.storage, path));
    return true;
  } catch {
    /* Someone else's upload, or already gone. The scene drops its reference
       either way; an orphaned object is a job for a scheduled cleanup, not a
       reason to refuse to clear the map. */
    return false;
  }
}

/** Say what went wrong, once, in the toast rather than only in the console. */
export function reportUploadError(err) {
  const msg = String(err?.message || err || 'Upload failed');
  console.warn('[gaslight] map upload:', err);
  toast(msg.includes('storage/unauthorized')
    ? 'The bucket refused that upload. Check the Storage rules are published.'
    : msg);
}
