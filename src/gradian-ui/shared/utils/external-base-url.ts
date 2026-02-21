/**
 * Helpers for schemas that use externalBaseUrl (list/detail/fetch from external URL instead of /api/data/[schema-id]).
 * Reads from externalUrlSettings[0] first, then falls back to top-level externalBaseUrl / externalFetchPathTemplate.
 */

import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';

/** Effective external URL config: from externalUrlSettings[0] or top-level (backward compat). */
export function getExternalUrlConfig(schema: FormSchema): {
  externalBaseUrl?: string;
  externalFetchPathTemplate?: string;
  passTenants?: boolean;
  passCompanies?: boolean;
} | null {
  const first = schema.externalUrlSettings?.[0];
  const base = first?.externalBaseUrl?.trim() ?? schema.externalBaseUrl?.trim();
  if (!base) return null;
  return {
    externalBaseUrl: base,
    externalFetchPathTemplate: first?.externalFetchPathTemplate ?? schema.externalFetchPathTemplate,
    passTenants: first?.passTenants,
    passCompanies: first?.passCompanies,
  };
}

/** Base URL for list (no trailing slash). For absolute externalBaseUrl returns external-proxy query base. */
export function getListBaseEndpoint(schema: FormSchema): string {
  const base = getExternalUrlConfig(schema)?.externalBaseUrl ?? schema.externalBaseUrl?.trim();
  if (!base) return `/api/data/${schema.id}`;
  const normalized = base.replace(/\/+$/, '');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return `/api/external-proxy?schemaId=${encodeURIComponent(schema.id)}&path=`;
  }
  return normalized;
}

/** Full URL for a single entity (detail). */
export function getDetailEndpoint(schema: FormSchema, id: string): string {
  const base = getExternalUrlConfig(schema)?.externalBaseUrl ?? schema.externalBaseUrl?.trim();
  if (!base) return `/api/data/${schema.id}/${encodeURIComponent(id)}`;
  const normalized = base.replace(/\/+$/, '');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return `/api/external-proxy?schemaId=${encodeURIComponent(schema.id)}&path=/${encodeURIComponent(id)}`;
  }
  return `${normalized}/${encodeURIComponent(id)}`;
}
