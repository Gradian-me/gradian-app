/**
 * IndexedDB utilities for Gradian UI
 *
 * Provides a simple key-value API on top of Dexie-based IndexedDB,
 * with optional AES-GCM encryption using the shared crypto utilities.
 *
 * This is intended for generic client-side caching / persistence,
 * not for highly sensitive secrets (prefer server-side or secure stores for that).
 */

import { getIndexedDb } from '@/gradian-ui/indexdb-manager/db';
import { encryptPayload, decryptPayload, type EncryptedPayload } from '@/gradian-ui/indexdb-manager/utils/crypto';
import type { EncryptedStoreEntry } from '@/gradian-ui/indexdb-manager/types';

export interface IndexedDbCrudOptions {
  /**
   * When true, values are encrypted using AES-GCM via the shared crypto utils.
   * When false (default), values are stored as plain JSON strings.
   */
  encryptData?: boolean;

  /**
   * Optional logical namespace to avoid key collisions.
   * Final storage key format: `${prefix}${namespaceOptional}${key}`
   * where prefix is `enc:` or `plain:` depending on encryptData.
   */
  namespace?: string;

  /**
   * Application-level versioning for the stored entry.
   * This is not the IndexedDB schema version; use it to invalidate your own data.
   */
  version?: number;
}

const ENCRYPTED_PREFIX = 'enc:';
const PLAIN_PREFIX = 'plain:';

function buildStorageKey(key: string, options?: IndexedDbCrudOptions): string {
  const ns = options?.namespace ? `${options.namespace}:` : '';
  const prefix = options?.encryptData ? ENCRYPTED_PREFIX : PLAIN_PREFIX;
  return `${prefix}${ns}${key}`;
}

function getEntryVersion(options?: IndexedDbCrudOptions): number {
  // Default logical version to 1 when not provided
  return typeof options?.version === 'number' ? options.version : 1;
}

/**
 * Initialize the underlying IndexedDB instance (no-op on server).
 * Returns true when IndexedDB is available and initialized.
 */
export function initIndexedDb(): boolean {
  const db = getIndexedDb();
  return !!db;
}

/**
 * Create or replace a value in IndexedDB for the given key.
 * This is effectively an "upsert" operation.
 */
export async function setIndexedDbItem<T>(
  key: string,
  value: T,
  options?: IndexedDbCrudOptions,
): Promise<boolean> {
  const db = getIndexedDb();
  if (!db) {
    return false;
  }

  const storeKey = buildStorageKey(key, options);
  const updatedAt = Date.now();
  const version = getEntryVersion(options);

  try {
    if (options?.encryptData) {
      const encrypted = await encryptPayload<T>(value);
      if (!encrypted) {
        // Encryption not available; avoid falling back to plaintext by default.
        console.warn(`[indexdb-utils] Encryption unavailable for key "${storeKey}", skipping write.`);
        return false;
      }

      const entry: EncryptedStoreEntry = {
        key: storeKey,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        updatedAt,
        version,
      };

      await db.kvStore.put(entry);
      return true;
    }

    // Plain JSON storage path (not encrypted)
    const serialized = JSON.stringify(value);
    const entry: EncryptedStoreEntry = {
      key: storeKey,
      ciphertext: serialized,
      iv: '',
      updatedAt,
      version,
    };

    await db.kvStore.put(entry);
    return true;
  } catch (error) {
    console.error(`[indexdb-utils] Failed to set item for key "${storeKey}":`, error);
    return false;
  }
}

/**
 * Read a value from IndexedDB for the given key.
 * Returns null when the key is missing, expired, or cannot be decoded.
 */
export async function getIndexedDbItem<T>(
  key: string,
  options?: IndexedDbCrudOptions,
): Promise<T | null> {
  const db = getIndexedDb();
  if (!db) {
    return null;
  }

  const storeKey = buildStorageKey(key, options);

  try {
    const entry = (await db.kvStore.get(storeKey)) as EncryptedStoreEntry | undefined | null;
    if (!entry) {
      return null;
    }

    if (options?.encryptData) {
      const payload: EncryptedPayload = {
        ciphertext: entry.ciphertext,
        iv: entry.iv,
      };

      const decrypted = await decryptPayload<T>(payload);
      if (decrypted === null) {
        console.warn(`[indexdb-utils] Failed to decrypt value for key "${storeKey}".`);
      }
      return decrypted;
    }

    // Plain JSON path
    if (!entry.ciphertext) {
      return null;
    }

    try {
      return JSON.parse(entry.ciphertext) as T;
    } catch (parseError) {
      console.warn(`[indexdb-utils] Failed to parse plain JSON value for key "${storeKey}":`, parseError);
      return null;
    }
  } catch (error) {
    console.error(`[indexdb-utils] Failed to get item for key "${storeKey}":`, error);
    return null;
  }
}

/**
 * Atomically update an item in IndexedDB by reading the current value,
 * passing it through an updater function, then writing back the result.
 *
 * If the updater returns null or undefined, the key will be removed.
 */
export async function updateIndexedDbItem<T>(
  key: string,
  updater: (current: T | null) => T | null | undefined,
  options?: IndexedDbCrudOptions,
): Promise<T | null> {
  const db = getIndexedDb();
  if (!db) {
    return null;
  }

  const current = await getIndexedDbItem<T>(key, options);
  const next = updater(current);

  if (next === null || typeof next === 'undefined') {
    await removeIndexedDbItem(key, options);
    return null;
  }

  const ok = await setIndexedDbItem<T>(key, next, options);
  return ok ? next : null;
}

/**
 * Remove a single key from IndexedDB (both encrypted and plain variants
 * under the same namespace are removed to avoid stale data).
 */
export async function removeIndexedDbItem(
  key: string,
  options?: IndexedDbCrudOptions,
): Promise<void> {
  const db = getIndexedDb();
  if (!db) {
    return;
  }

  const ns = options?.namespace ? `${options.namespace}:` : '';
  const encryptedKey = `${ENCRYPTED_PREFIX}${ns}${key}`;
  const plainKey = `${PLAIN_PREFIX}${ns}${key}`;

  try {
    await Promise.all([
      db.kvStore.delete(encryptedKey),
      db.kvStore.delete(plainKey),
    ]);
  } catch (error) {
    console.error(`[indexdb-utils] Failed to remove item for key "${key}":`, error);
  }
}

/**
 * Clear all keys under a given namespace and encryption mode.
 *
 * Example:
 *   await clearIndexedDbNamespace('user-store', true);  // encrypted namespace
 *   await clearIndexedDbNamespace('user-store', false); // plain namespace
 */
export async function clearIndexedDbNamespace(
  namespace: string,
  encryptData: boolean,
): Promise<void> {
  const db = getIndexedDb();
  if (!db) {
    return;
  }

  const prefix = encryptData ? ENCRYPTED_PREFIX : PLAIN_PREFIX;
  const fullPrefix = `${prefix}${namespace}:`;

  try {
    await db.kvStore
      .where('key')
      .startsWith(fullPrefix)
      .delete();
  } catch (error) {
    console.error(`[indexdb-utils] Failed to clear namespace "${namespace}" (encrypted=${encryptData}):`, error);
  }
}

/**
 * Configuration for a typed, namespaced IndexedDB "collection".
 *
 * Example (schemas):
 *   const schemaStore = createIndexedDbStore<FormSchema>({
 *     namespace: 'schemas',
 *     encryptData: true,
 *   });
 */
export interface IndexedDbStoreConfig<T> {
  /** Logical namespace for this collection (e.g. "schemas", "companies"). */
  namespace: string;
  /** Store values encrypted at rest. Defaults to false. */
  encryptData?: boolean;
  /** Optional logical version to tag entries written by this store. */
  version?: number;
  /** Optional hook for transforming values before store (e.g. strip volatile fields). */
  serialize?(value: T): T;
  /** Optional hook for transforming values after read (e.g. hydrate defaults). */
  deserialize?(value: T): T;
}

export interface IndexedDbStore<T> {
  /** Underlying namespace, useful for debugging and cache tools. */
  namespace: string;
  /** Store or replace a value under the given key. */
  set(key: string, value: T): Promise<boolean>;
  /** Get a value by key, or null when missing/invalid. */
  get(key: string): Promise<T | null>;
  /**
   * Read-modify-write update.
   * If updater returns null/undefined, the key is removed.
   */
  update(key: string, updater: (current: T | null) => T | null | undefined): Promise<T | null>;
  /** Remove a single key from this namespace. */
  remove(key: string): Promise<void>;
  /** Clear all keys in this namespace. */
  clear(): Promise<void>;
}

/**
 * Create a typed, namespaced IndexedDB store that can be reused across the app.
 *
 * This generalizes the pattern you want for schemas:
 *   const schemaStore = createIndexedDbStore<FormSchema>({ namespace: 'schemas', encryptData: true });
 *
 * And later:
 *   await schemaStore.set(schema.id, schema);
 *   const cached = await schemaStore.get(schemaId);
 *   await schemaStore.clear(); // clear-cache for all schemas
 */
export function createIndexedDbStore<T>(config: IndexedDbStoreConfig<T>): IndexedDbStore<T> {
  const baseOptions: IndexedDbCrudOptions = {
    namespace: config.namespace,
    encryptData: config.encryptData,
    version: config.version,
  };

  const applySerialize = (value: T): T =>
    config.serialize ? config.serialize(value) : value;

  const applyDeserialize = (value: T | null): T | null =>
    value !== null && config.deserialize ? config.deserialize(value) : value;

  return {
    namespace: config.namespace,

    async set(key, value) {
      const safeValue = applySerialize(value);
      return setIndexedDbItem<T>(key, safeValue, baseOptions);
    },

    async get(key) {
      const raw = await getIndexedDbItem<T>(key, baseOptions);
      return applyDeserialize(raw);
    },

    async update(key, updater) {
      const next = await updateIndexedDbItem<T>(
        key,
        (current) => {
          const deserialized = applyDeserialize(current);
          const updated = updater(deserialized);
          return updated == null ? updated : applySerialize(updated);
        },
        baseOptions,
      );
      return applyDeserialize(next);
    },

    async remove(key) {
      await removeIndexedDbItem(key, baseOptions);
    },

    async clear() {
      await clearIndexedDbNamespace(config.namespace, !!config.encryptData);
    },
  };
}

