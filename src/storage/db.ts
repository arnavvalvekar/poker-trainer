import type { HandHistoryEntry } from '../types/poker';
import type { DecisionFeedback } from '../feedback/feedback-engine';

const DB_NAME = 'poker-trainer';
const DB_VERSION = 1;
const HANDS_STORE = 'hands';
const ARCHIVE_STORE = 'archive';
const MAX_HANDS = 1000;

export interface StoredHand extends HandHistoryEntry {
  handId: string;
  feedback: DecisionFeedback[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDS_STORE)) {
        const store = db.createObjectStore(HANDS_STORE, { keyPath: 'handId' });
        store.createIndex('handNumber', 'handNumber', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(ARCHIVE_STORE)) {
        db.createObjectStore(ARCHIVE_STORE, { keyPath: 'handId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function txStore(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  return openDB().then(
    (db) => db.transaction(storeName, mode).objectStore(storeName),
  );
}

export async function saveHand(hand: StoredHand): Promise<void> {
  const store = await txStore(HANDS_STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(hand);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllHands(): Promise<StoredHand[]> {
  const store = await txStore(HANDS_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const hands = (req.result as StoredHand[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(hands);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getHand(handId: string): Promise<StoredHand | null> {
  const store = await txStore(HANDS_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(handId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function archiveOldHands(): Promise<number> {
  const hands = await getAllHands();
  if (hands.length <= MAX_HANDS) return 0;

  const toArchive = hands.slice(MAX_HANDS);
  const archiveStore = await txStore(ARCHIVE_STORE, 'readwrite');
  const handsStore = await txStore(HANDS_STORE, 'readwrite');

  for (const hand of toArchive) {
    await new Promise<void>((resolve, reject) => {
      const req = archiveStore.put(hand);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const req = handsStore.delete(hand.handId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  return toArchive.length;
}

export async function searchHands(query: string): Promise<StoredHand[]> {
  const hands = await getAllHands();
  const q = query.toLowerCase();
  return hands.filter(
    (h) =>
      h.heroCards.join(' ').toLowerCase().includes(q) ||
      h.winningHand.toLowerCase().includes(q) ||
      String(h.handNumber).includes(q) ||
      h.result.includes(q),
  );
}

export async function clearAllHands(): Promise<void> {
  const store = await txStore(HANDS_STORE, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
