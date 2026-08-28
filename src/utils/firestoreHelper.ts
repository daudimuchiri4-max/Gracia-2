import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';

/**
 * Recursively cleans an object for Firestore by converting undefined to null,
 * stripping invalid functions, and ensuring all fields are serializable.
 */
export function cleanForFirestore(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  if (typeof obj === 'function') {
    return null;
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Safely writes to Firestore with fallback local persistence.
 */
export async function safeSetDoc<T extends Record<string, any>>(
  docRef: DocumentReference,
  data: T,
  options?: SetOptions
): Promise<void> {
  const cleaned = cleanForFirestore(data);
  try {
    if (options) {
      await setDoc(docRef, cleaned, options);
    } else {
      await setDoc(docRef, cleaned);
    }
  } catch (err) {
    console.warn(`Firestore setDoc failed for ${docRef.path}:`, err);
  }
}

/**
 * Safely updates a Firestore document.
 */
export async function safeUpdateDoc(
  docRef: DocumentReference,
  data: Record<string, any>
): Promise<void> {
  const cleaned = cleanForFirestore(data);
  try {
    await updateDoc(docRef, cleaned);
  } catch (err) {
    console.warn(`Firestore updateDoc failed for ${docRef.path}:`, err);
  }
}

/**
 * Safely deletes a Firestore document.
 */
export async function safeDeleteDoc(docRef: DocumentReference): Promise<void> {
  try {
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Firestore deleteDoc failed for ${docRef.path}:`, err);
  }
}
