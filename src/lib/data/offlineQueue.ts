/**
 * Lokal kø for fund, der ikke kunne gemmes med det samme — typisk fordi du
 * stod i skoven uden dækning. Gemmes i IndexedDB, ikke localStorage: fotos
 * som data-URL'er kan sagtens sprænge localStorages 5-10 MB-grænse, og
 * IndexedDB findes præcis til strukturerede data som dette.
 *
 * Køen er en midlertidig mellemstation, ikke en sandhedskilde — et fund
 * forsvinder herfra, i samme øjeblik det er skrevet til Supabase. Supabase
 * er og bliver den eneste sandhed, jf. CLAUDE.md; det ændrer denne fil intet
 * ved, den udsætter bare skrivningen til der er forbindelse.
 */
import type { FindInput } from './types';

export interface QueuedFind {
  localId: string;
  input: FindInput;
  queuedAt: string;
}

const DB_NAME = 'svampespor';
const STORE = 'pendingFinds';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB ikke tilgængelig i dette miljø'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * `fetch` selv kaster en `TypeError` ved netværkssvigt (DNS, offline, CORS
 * blokeret af manglende forbindelse) — det er signalet, der reelt betyder
 * "prøv igen senere". Alt andet (forkert login, RLS, valideringsfejl fra
 * Postgrest/Supabase Auth) er en rigtig fejl, der ikke bliver bedre af at
 * vente, og skal derfor IKKE lægges i køen — kun vises til brugeren.
 */
export function isOfflineLikeError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed');
}

export async function enqueueFind(input: FindInput): Promise<QueuedFind> {
  const db = await openDb();
  const record: QueuedFind = {
    localId: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input,
    queuedAt: new Date().toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return record;
}

export async function listQueuedFinds(): Promise<QueuedFind[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedFind[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedFind(localId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(localId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
