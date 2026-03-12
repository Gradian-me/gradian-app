import { getIndexedDb } from './db';
import {
  APPLICATION_CONFIG_CACHE_KEY,
  APPLICATION_CONFIG_CACHE_VERSION,
  type ApplicationConfigCacheLookupResult,
  type ApplicationConfigCachePayload,
} from './types';
import { decryptPayload, encryptPayload } from './utils/crypto';

function buildEmptyApplicationConfigPayload(): ApplicationConfigCachePayload {
  return {
    version: APPLICATION_CONFIG_CACHE_VERSION,
    updatedAt: 0,
    config: null,
  };
}

async function readEncryptedApplicationConfigPayload(): Promise<ApplicationConfigCachePayload | null> {
  const db = getIndexedDb();
  if (!db) {
    return null;
  }

  const entry = await db.kvStore.get(APPLICATION_CONFIG_CACHE_KEY);
  if (!entry || entry.version !== APPLICATION_CONFIG_CACHE_VERSION) {
    return null;
  }

  const payload = await decryptPayload<ApplicationConfigCachePayload>({
    ciphertext: entry.ciphertext,
    iv: entry.iv,
  });

  return payload;
}

async function writeApplicationConfigPayload(payload: ApplicationConfigCachePayload): Promise<void> {
  const db = getIndexedDb();
  if (!db) {
    return;
  }

  const encrypted = await encryptPayload(payload);
  if (!encrypted) {
    return;
  }

  await db.kvStore.put({
    key: APPLICATION_CONFIG_CACHE_KEY,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    updatedAt: Date.now(),
    version: APPLICATION_CONFIG_CACHE_VERSION,
  });
}

export async function readApplicationConfigFromCache(): Promise<ApplicationConfigCacheLookupResult> {
  const payload = (await readEncryptedApplicationConfigPayload()) ?? buildEmptyApplicationConfigPayload();

  return {
    hit: payload.config != null,
    config: payload.config ?? null,
  };
}

export async function persistApplicationConfigToCache(config: unknown): Promise<void> {
  if (config == null || typeof config !== 'object') {
    return;
  }

  const payload: ApplicationConfigCachePayload = {
    version: APPLICATION_CONFIG_CACHE_VERSION,
    updatedAt: Date.now(),
    config,
  };

  await writeApplicationConfigPayload(payload);
}

