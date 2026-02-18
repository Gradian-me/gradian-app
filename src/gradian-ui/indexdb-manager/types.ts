import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

export const SCHEMA_CACHE_KEY = 'schemas';
export const SCHEMA_CACHE_VERSION = 1;
export const SCHEMA_SUMMARY_CACHE_KEY = 'schemas-summary';

export interface EncryptedStoreEntry {
  key: string;
  ciphertext: string;
  iv: string;
  updatedAt: number;
  version: number;
}

export interface SchemaCachePayload {
  version: number;
  hydratedAll: boolean;
  updatedAt: number;
  schemas: Record<string, FormSchema>;
}

export type SchemaCacheRequest =
  | { kind: 'all' }
  | { kind: 'single'; schemaId: string }
  | { kind: 'batch'; schemaIds: string[] };

export interface SchemaCacheLookupResult {
  hit: boolean;
  cachedMap: Record<string, FormSchema>;
  missingIds: string[];
  hydratedAll: boolean;
}

export interface SchemaCacheEventDetail {
  reason: 'update' | 'clear';
  affectedIds?: string[];
  cacheKey?: string;
}

export const COMPANY_CACHE_KEY = 'companies';
export const COMPANY_CACHE_VERSION = 1;

export interface CompanyRecord {
  id: string | number;
  name?: string;
  [key: string]: any;
}

export interface CompaniesCachePayload {
  version: number;
  hydrated: boolean;
  updatedAt: number;
  companies: CompanyRecord[];
}

export interface CompaniesCacheLookupResult {
  hit: boolean;
  hydrated: boolean;
  companies: CompanyRecord[];
}

export interface CompaniesCacheEventDetail {
  reason: 'update' | 'clear';
}

/** IndexedDB cache for GET /api/schemas?summary=true response (unified with api layer). */
export const SCHEMAS_SUMMARY_CACHE_VERSION = 1;

export interface SchemasSummaryCachePayload {
  version: number;
  updatedAt: number;
  schemas: FormSchema[];
}

export interface SchemasSummaryCacheLookupResult {
  hit: boolean;
  schemas: FormSchema[];
}


