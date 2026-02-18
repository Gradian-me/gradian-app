import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { getIndexedDb } from './db';
import {
  SCHEMA_SUMMARY_CACHE_KEY,
  SCHEMAS_SUMMARY_CACHE_VERSION,
  type SchemasSummaryCacheLookupResult,
  type SchemasSummaryCachePayload,
} from './types';
import { decryptPayload, encryptPayload } from './utils/crypto';

async function readEncryptedPayload(): Promise<SchemasSummaryCachePayload | null> {
  const db = getIndexedDb();
  if (!db) {
    return null;
  }

  const entry = await db.kvStore.get(SCHEMA_SUMMARY_CACHE_KEY);
  if (!entry || entry.version !== SCHEMAS_SUMMARY_CACHE_VERSION) {
    return null;
  }

  const payload = await decryptPayload<SchemasSummaryCachePayload>({
    ciphertext: entry.ciphertext,
    iv: entry.iv,
  });

  return payload;
}

async function writePayload(payload: SchemasSummaryCachePayload): Promise<void> {
  const db = getIndexedDb();
  if (!db) {
    return;
  }

  const encrypted = await encryptPayload(payload);
  if (!encrypted) {
    return;
  }

  await db.kvStore.put({
    key: SCHEMA_SUMMARY_CACHE_KEY,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    updatedAt: Date.now(),
    version: SCHEMAS_SUMMARY_CACHE_VERSION,
  });
}

export async function readSchemasSummaryFromCache(): Promise<SchemasSummaryCacheLookupResult> {
  const payload = await readEncryptedPayload();
  if (!payload || !Array.isArray(payload.schemas) || payload.schemas.length === 0) {
    return { hit: false, schemas: [] };
  }

  return {
    hit: true,
    schemas: payload.schemas,
  };
}

export async function persistSchemasSummaryToCache(schemas: FormSchema[]): Promise<void> {
  if (!Array.isArray(schemas)) {
    return;
  }

  const payload: SchemasSummaryCachePayload = {
    version: SCHEMAS_SUMMARY_CACHE_VERSION,
    updatedAt: Date.now(),
    schemas,
  };

  await writePayload(payload);
}

export async function clearSchemasSummaryCache(): Promise<void> {
  const db = getIndexedDb();
  if (!db) {
    return;
  }

  await db.kvStore.delete(SCHEMA_SUMMARY_CACHE_KEY);
}
