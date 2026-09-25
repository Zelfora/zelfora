import { supabase } from '../supabaseClient';

// Every image on the site goes through this module: resizing, uploading to the
// "images" Storage bucket (supabase/images.sql) and cleaning up replaced files.
// See "Images" in CLAUDE.md.
//
// An image field's value is one of:
//   ''                          no image
//   'https://...'               a URL: a pasted link or an earlier upload
//   { pending: true, blob, previewUrl }
//                               a photo picked on this device; uploaded on save
// The database only ever stores the URL, in a plain text column.

const BUCKET = 'images';
const bucket = supabase.storage.from(BUCKET);
// Every uploaded image's public URL starts with this.
const PUBLIC_PREFIX = bucket.getPublicUrl('').data.publicUrl;

// One entry per kind of image. maxSize: longest side in pixels after resizing.
// folder: its folder in the bucket. shape: how the picker previews it.
export const IMAGE_KINDS = {
  restaurantCover: { folder: 'restaurant-cover', maxSize: 1920, quality: 0.82, shape: 'wide' },
  menuItem: { folder: 'menu-item', maxSize: 1000, quality: 0.8, shape: 'square' },
  avatar: { folder: 'avatar', maxSize: 400, quality: 0.85, shape: 'round' },
};

// Refuse files this big before trying to decode them; phone photos are far smaller.
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

export class ImageError extends Error {
  constructor(code, cause) {
    super(`Image error: ${code}`, { cause });
    this.name = 'ImageError';
    this.code = code;
  }
}

// Translation key for an image error, or null for other errors.
export function imageErrorKey(err) {
  return err instanceof ImageError ? `imageError.${err.code}` : null;
}

export function isPendingImage(value) {
  return typeof value === 'object' && value !== null && value.pending === true;
}

export function imagePreviewSrc(value) {
  return isPendingImage(value) ? value.previewUrl : value || null;
}

// Links must be https (also enforced in the database).
export function isValidImageValue(value) {
  return isPendingImage(value) || value === '' || /^https:\/\/\S+$/i.test(value);
}

// True for files in our bucket, as opposed to links to other sites.
export function isStoredImage(url) {
  return typeof url === 'string' && url.startsWith(PUBLIC_PREFIX);
}

// Shrinks a picked photo in the browser and returns a pending image value.
// Uploads stay small and fast, and every image is WebP (or JPEG) no matter
// what the device produced.
export async function prepareImage(file, kind) {
  if (!file.type.startsWith('image/')) throw new ImageError('unsupported');
  if (file.size > MAX_SOURCE_BYTES) throw new ImageError('too_large');

  const { maxSize, quality } = IMAGE_KINDS[kind];
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (err) {
    // For example HEIC photos in browsers that can't decode them.
    throw new ImageError('unsupported', err);
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Browsers that can't encode WebP fall back to PNG, which is huge for
  // photos; use JPEG there instead.
  let blob = await canvasToBlob(canvas, 'image/webp', quality);
  if (blob?.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  if (!blob) throw new ImageError('unsupported');

  // A data URL rather than an object URL, so there is nothing to revoke.
  return { pending: true, blob, previewUrl: await blobToDataUrl(blob) };
}

// Saves an image field: uploads a pending photo, calls save(url) to store the
// URL on its row (save must throw on failure), then deletes whichever uploaded
// file is no longer used. Returns what save returns.
export async function commitImage({ value, previous = null, kind, save }) {
  const pending = isPendingImage(value);
  const url = pending ? await uploadImage(value.blob, kind) : value || null;

  let result;
  try {
    result = await save(url);
  } catch (err) {
    if (pending) deleteStoredImage(url);
    throw err;
  }
  if (previous && previous !== url) deleteStoredImage(previous);
  return result;
}

// Removes an uploaded image, e.g. after its menu item was deleted. Links to
// other sites and files in someone else's folder are left alone. Best effort:
// a leftover file only costs storage, so failures are logged, not thrown.
export async function deleteStoredImage(url) {
  if (!isStoredImage(url)) return;
  const path = decodeURI(url.slice(PUBLIC_PREFIX.length));
  try {
    const { error } = await bucket.remove([path]);
    if (error) throw error;
  } catch (err) {
    console.warn('Could not delete image', path, err);
  }
}

async function uploadImage(blob, kind) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new ImageError('upload_failed');

  // The storage policies only allow uploads under the user's own id.
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${IMAGE_KINDS[kind].folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await bucket.upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000', // a year: file names are never reused
    upsert: false,
  });
  if (error) throw new ImageError('upload_failed', error);
  return bucket.getPublicUrl(path).data.publicUrl;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
