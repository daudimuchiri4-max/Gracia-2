// IndexedDB helper for storing large local video files without hitting Firestore 1MB limits

const DB_NAME = 'GraciaSchoolVideoDB';
const STORE_NAME = 'videos';

export async function saveVideoBlob(id: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(file, id);
      putRequest.onsuccess = () => resolve(`local-video://${id}`);
      putRequest.onerror = (err: any) => reject(err);
    };
    request.onerror = (err: any) => reject(err);
  });
}

export async function getVideoBlobUrl(idOrUrl: string): Promise<string> {
  if (!idOrUrl || !idOrUrl.startsWith('local-video://')) {
    return idOrUrl;
  }
  const id = idOrUrl.replace('local-video://', '');
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve('');
        return;
      }
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      getRequest.onsuccess = (event: any) => {
        const file = event.target.result;
        if (file) {
          resolve(URL.createObjectURL(file));
        } else {
          resolve('');
        }
      };
      getRequest.onerror = () => resolve('');
    };
    request.onerror = () => resolve('');
  });
}
