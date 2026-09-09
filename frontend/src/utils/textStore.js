/**
 * IndexedDB Text Store for AI Tutor Platform
 * Provides persistent, quota-free client-side storage for extracted document text,
 * chunks, and chapter summaries.
 */

const DB_NAME = 'AITutorTextDB';
const DB_VERSION = 1;
const STORE_NAME = 'document_texts';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save extracted text and metadata for a document
 */
export async function saveDocumentText(docId, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: docId,
        fullText: data.fullText || '',
        topics: data.topics || [],
        chapters: data.chapters || [],
        chunks: data.chunks || [],
        isBangla: Boolean(data.isBangla),
        updatedAt: new Date().toISOString()
      };
      store.put(record);
      tx.oncomplete = () => {
        // Also save a lightweight summary in localStorage as an instant fallback
        try {
          const previewKey = `ai_tutor_doc_prev_${docId}`;
          const preview = {
            id: docId,
            sample: (data.fullText || '').slice(0, 3000),
            topics: data.topics || [],
            isBangla: Boolean(data.isBangla)
          };
          localStorage.setItem(previewKey, JSON.stringify(preview));
        } catch {
          // ignore quota limits on localStorage
        }
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage preview:', err);
    try {
      const previewKey = `ai_tutor_doc_prev_${docId}`;
      localStorage.setItem(previewKey, JSON.stringify({
        id: docId,
        sample: (data.fullText || '').slice(0, 3000),
        topics: data.topics || [],
        isBangla: Boolean(data.isBangla)
      }));
    } catch {
      // quota exceeded
    }
    return false;
  }
}

/**
 * Retrieve document text and topics
 */
export async function getDocumentText(docId) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(docId);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Check localStorage preview fallback
          resolve(getPreviewFromStorage(docId));
        }
      };
      request.onerror = () => resolve(getPreviewFromStorage(docId));
    });
  } catch {
    return getPreviewFromStorage(docId);
  }
}

function getPreviewFromStorage(docId) {
  try {
    const raw = localStorage.getItem(`ai_tutor_doc_prev_${docId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: docId,
        fullText: parsed.sample || '',
        topics: parsed.topics || [],
        chapters: [],
        chunks: [],
        isBangla: Boolean(parsed.isBangla)
      };
    }
  } catch {
    // ignore
  }
  return null;
}
