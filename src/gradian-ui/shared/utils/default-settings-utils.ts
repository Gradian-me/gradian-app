import type { DefaultListSettings } from '@/gradian-ui/schema-manager/types/form-schema';
import type { SortConfig } from './sort-utils';

/**
 * Normalizes defaultSettings from schema.
 * Stored shape may be array: [{"grouping":[{"column":"a"},...]},{"sorting":[{"column":"b","isAscending":true}]}].
 * Returns a single object { grouping?: [...], sorting?: [...] } for consumption.
 */
export function normalizeDefaultSettings(
  raw: DefaultListSettings | Array<Record<string, unknown>> | undefined
): DefaultListSettings {
  if (raw == null) return {};
  if (Array.isArray(raw)) {
    const out: DefaultListSettings = {};
    for (const item of raw) {
      if (item && typeof item === 'object') {
        if (Array.isArray(item.grouping)) {
          out.grouping = item.grouping
            .filter((g): g is { column: string } => g && typeof g === 'object' && typeof (g as { column?: string }).column === 'string')
            .map((g) => ({ column: (g as { column: string }).column }));
        }
        if (Array.isArray(item.sorting)) {
          out.sorting = item.sorting
            .filter((s): s is { column: string; isAscending: boolean } =>
              s != null && typeof s === 'object' && typeof (s as { column?: string }).column === 'string'
            )
            .map((s) => ({
              column: (s as { column: string }).column,
              isAscending: typeof (s as { isAscending?: boolean }).isAscending === 'boolean' ? (s as { isAscending: boolean }).isAscending : true,
            }));
        }
      }
    }
    return out;
  }
  if (typeof raw === 'object' && raw !== null) {
    const grouping = Array.isArray(raw.grouping)
      ? raw.grouping
          .filter((g): g is { column: string } => g != null && typeof g === 'object' && typeof (g as { column?: string }).column === 'string')
          .map((g) => ({ column: (g as { column: string }).column }))
      : undefined;
    const sorting = Array.isArray(raw.sorting)
      ? raw.sorting
          .filter((s): s is { column: string; isAscending: boolean } =>
            s != null && typeof s === 'object' && typeof (s as { column?: string }).column === 'string'
          )
          .map((s) => ({
            column: (s as { column: string }).column,
            isAscending: typeof (s as { isAscending?: boolean }).isAscending === 'boolean' ? (s as { isAscending: boolean }).isAscending : true,
          }))
      : undefined;
    return { grouping, sorting };
  }
  return {};
}

/** Default sort when schema has no defaultSettings: updatedAt descending. */
export const DEFAULT_SORT_FALLBACK: SortConfig[] = [{ column: 'updatedAt', isAscending: false }];

/**
 * Returns initial sort config from schema defaultSettings, or fallback.
 */
export function getInitialSortConfig(
  raw: DefaultListSettings | Array<Record<string, unknown>> | undefined
): SortConfig[] {
  const normalized = normalizeDefaultSettings(raw);
  if (normalized.sorting && normalized.sorting.length > 0) {
    return normalized.sorting;
  }
  return DEFAULT_SORT_FALLBACK;
}

/**
 * Returns initial group config from schema defaultSettings, or empty array.
 */
export function getInitialGroupConfig(
  raw: DefaultListSettings | Array<Record<string, unknown>> | undefined
): { column: string }[] {
  const normalized = normalizeDefaultSettings(raw);
  return normalized.grouping ?? [];
}
