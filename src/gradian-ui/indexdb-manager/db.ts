import Dexie, { Table } from 'dexie';

import type { EncryptedStoreEntry } from './types';

const DB_NAME = 'gradian-ui-indexdb';
const DB_VERSION = 1;

class GradianIndexedDb extends Dexie {
  public kvStore!: Table<EncryptedStoreEntry, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      kvStore: '&key, updatedAt',
    });
  }
}

let dbInstance: GradianIndexedDb | null = null;
let dbOpenFailed = false;

export function getIndexedDb(): GradianIndexedDb | null {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }
  if (dbOpenFailed) {
    return null;
  }

  if (!dbInstance) {
    try {
      dbInstance = new GradianIndexedDb();
    } catch (err) {
      dbOpenFailed = true;
      dbInstance = null;
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(
          '[indexdb] IndexedDB unavailable (e.g. private mode, storage disabled, or quota):',
          err instanceof Error ? err.message : String(err)
        );
      }
      return null;
    }
  }

  return dbInstance;
}

/** Call when an operation fails due to DB closed/unavailable so we stop using the broken instance. */
export function invalidateIndexedDb(): void {
  dbInstance = null;
  dbOpenFailed = true;
}
