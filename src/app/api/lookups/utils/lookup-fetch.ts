/**
 * Server-only: fetch lookup definition and raw rows from URL_LOOKUP_CRUD,
 * and optionally normalize rows to option shape { id, label, icon, color }.
 */

import { NextRequest } from 'next/server';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

const DATA_LIST_PATHS = [['data'], ['data', 'data'], ['items'], ['results'], ['result'], ['rows'], ['records']];

function getNestedValue(source: unknown, path: string[]): unknown {
  return path.reduce<unknown>((v, key) => {
    if (v != null && typeof v === 'object' && key in (v as Record<string, unknown>)) {
      return (v as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function findArray(payload: unknown): unknown[] | undefined {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return undefined;
  for (const path of DATA_LIST_PATHS) {
    const candidate = getNestedValue(payload, path);
    if (Array.isArray(candidate)) return candidate as unknown[];
  }
  return undefined;
}

function getDef(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  if (typeof v === 'string' && v.trim()) return v.trim();
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  const vSnake = obj[snake];
  return typeof vSnake === 'string' && (vSnake as string).trim() ? (vSnake as string).trim() : undefined;
}

export interface LookupDefinition {
  resultKeyColumn?: string;
  resultValueColumn?: string;
  resultValueColumnEN?: string;
  resultColorColumn?: string;
  resultIconColumn?: string;
  column_map_id?: string;
  column_map_title?: string;
  column_map_subtitle?: string;
  column_map_description?: string;
  column_map_color?: string;
  column_map_icon?: string;
  column_map_url?: string;
  column_map_avatar?: string;
  column_map_pagination_page?: string;
  column_map_pagination_limit?: string;
}

/**
 * Fetch lookup entity (definition) from URL_LOOKUP_CRUD GET /{lookupId}.
 * Returns definition with column names or null on failure.
 */
export async function fetchLookupDefinition(
  baseUrl: string,
  lookupId: string,
  request: NextRequest
): Promise<LookupDefinition | null> {
  const url = `${baseUrl}/${encodeURIComponent(lookupId)}`;
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const xTenant = request.headers.get('x-tenant-domain');
  if (xTenant) headers.set('x-tenant-domain', xTenant);
  const xFingerprint = request.headers.get('x-fingerprint');
  if (xFingerprint) headers.set('x-fingerprint', xFingerprint);
  headers.set('content-type', 'application/json');

  try {
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    if (!res.ok) {
      loggingCustom(LogType.INFRA_LOG, 'warn', `[lookup-fetch] GET definition failed: ${res.status} ${url}`);
      return null;
    }
    const payload = await res.json();
    const data = (payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload) as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') return null;
    return {
      resultKeyColumn: getDef(data, 'resultKeyColumn'),
      resultValueColumn: getDef(data, 'resultValueColumn'),
      resultValueColumnEN: getDef(data, 'resultValueColumnEN'),
      resultColorColumn: getDef(data, 'resultColorColumn'),
      resultIconColumn: getDef(data, 'resultIconColumn'),
      column_map_id: getDef(data, 'column_map_id'),
      column_map_title: getDef(data, 'column_map_title'),
      column_map_subtitle: getDef(data, 'column_map_subtitle'),
      column_map_description: getDef(data, 'column_map_description'),
      column_map_color: getDef(data, 'column_map_color'),
      column_map_icon: getDef(data, 'column_map_icon'),
      column_map_url: getDef(data, 'column_map_url'),
      column_map_avatar: getDef(data, 'column_map_avatar'),
      column_map_pagination_page: getDef(data, 'column_map_pagination_page'),
      column_map_pagination_limit: getDef(data, 'column_map_pagination_limit'),
    };
  } catch (e) {
    loggingCustom(LogType.INFRA_LOG, 'warn', `[lookup-fetch] GET definition error: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/**
 * Fetch raw lookup result from URL_LOOKUP_CRUD POST /fetch/{lookupId}.
 */
export async function fetchLookupRaw(
  baseUrl: string,
  lookupId: string,
  request: NextRequest,
  body: unknown
): Promise<{ ok: boolean; data: unknown[] }> {
  const url = `${baseUrl}/fetch/${encodeURIComponent(lookupId)}`;
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
  const xTenant = request.headers.get('x-tenant-domain');
  if (xTenant) headers.set('x-tenant-domain', xTenant);
  const xFingerprint = request.headers.get('x-fingerprint');
  if (xFingerprint) headers.set('x-fingerprint', xFingerprint);
  headers.set('content-type', 'application/json');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: typeof body === 'object' && body !== null ? JSON.stringify(body) : '{}',
      cache: 'no-store',
    });
    const payload = await res.json();
    const arr = findArray(payload);
    return { ok: res.ok, data: Array.isArray(arr) ? arr : [] };
  } catch (e) {
    loggingCustom(LogType.INFRA_LOG, 'warn', `[lookup-fetch] POST fetch error: ${e instanceof Error ? e.message : String(e)}`);
    return { ok: false, data: [] };
  }
}

/** Option row: id, label (string or translation array), icon, color */
export type SanitizedLookupOption = {
  id: string;
  label: string | Array<Record<string, string>>;
  icon?: string;
  color?: string;
};

const ID_LIKE_KEYS = /^(id|_id|key|code|partId|productCode|companyId)$/i;
const LABEL_LIKE_KEYS = /^(label|name|title|text|productName|companyTitle|description)$/i;
const LABEL_EN_KEYS = /^(.*_en|.*EN|nameEn|titleEn)$/i;

function inferKeyColumn(keys: string[]): string {
  const preferred = keys.find((k) => /^partId|productCode|^code$/i.test(k));
  if (preferred) return preferred;
  const idLike = keys.find((k) => ID_LIKE_KEYS.test(k));
  if (idLike) return idLike;
  const partOrCode = keys.find((k) => /part|code|id/i.test(k));
  if (partOrCode) return partOrCode;
  return keys[0] ?? 'id';
}

function inferValueColumn(keys: string[], keyCol: string): string {
  const labelLike = keys.find((k) => k !== keyCol && LABEL_LIKE_KEYS.test(k));
  if (labelLike) return labelLike;
  const enCol = keys.find((k) => k !== keyCol && LABEL_EN_KEYS.test(k));
  if (enCol) return enCol;
  const other = keys.filter((k) => k !== keyCol);
  return other[0] ?? keyCol;
}

function inferValueColumnEN(keys: string[], keyCol: string, valueCol: string): string | undefined {
  return keys.find((k) => k === `${valueCol}_EN` || k === `${valueCol}_en`);
}

/** Comma-separated column names → values from row concatenated with " | ". */
function getConcatenatedFromRow(row: unknown, commaSeparatedColumns: string): string {
  if (row == null || typeof row !== 'object' || !commaSeparatedColumns || !String(commaSeparatedColumns).trim()) {
    return '';
  }
  const r = row as Record<string, unknown>;
  const parts = commaSeparatedColumns
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((col) => (col in r && r[col] != null && r[col] !== '' ? String(r[col]) : null))
    .filter((v): v is string => v !== null);
  return parts.join(' | ');
}

/** Single column name → value from row, or undefined. */
function getSingleFromRow(row: unknown, column: string): string | undefined {
  if (row == null || typeof row !== 'object' || !column || !String(column).trim()) return undefined;
  const r = row as Record<string, unknown>;
  const col = column.trim();
  if (col in r && r[col] != null && r[col] !== '') return String(r[col]);
  return undefined;
}

/**
 * Map raw rows to option shape using definition column names.
 * Uses column_map_title (comma-separated → concatenated with " | ") for label when set;
 * column_map_id for id when set. Otherwise falls back to resultKeyColumn/resultValueColumn or inference.
 */
export function sanitizeLookupRows(
  rows: unknown[],
  def: LookupDefinition
): SanitizedLookupOption[] {
  const get = (row: unknown, col: string): unknown => {
    if (row == null || typeof row !== 'object') return undefined;
    const r = row as Record<string, unknown>;
    if (col in r) return r[col];
    return undefined;
  };

  const firstRow = rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null ? (rows[0] as Record<string, unknown>) : null;
  const keys = firstRow ? Object.keys(firstRow) : [];

  let keyCol = def.column_map_id ?? def.resultKeyColumn ?? undefined;
  let valueCol = def.column_map_title ?? def.resultValueColumn ?? undefined;
  let valueColEN = def.resultValueColumnEN ?? undefined;

  if (!keyCol || !firstRow || !(keyCol in firstRow)) {
    if (!def.column_map_id) keyCol = inferKeyColumn(keys);
    else keyCol = (keyCol ?? '').split(',')[0]?.trim() || inferKeyColumn(keys);
  }
  keyCol = keyCol ?? inferKeyColumn(keys);

  if (!valueCol || !firstRow) {
    if (!def.column_map_title) {
      if (!valueCol || !(valueCol in firstRow!)) valueCol = inferValueColumn(keys, keyCol);
    }
  } else if (def.column_map_title && valueCol.includes(',')) {
    valueCol = valueCol;
  } else if (valueCol && !(valueCol in firstRow!)) {
    if (!def.column_map_title) valueCol = inferValueColumn(keys, keyCol);
  }
  valueCol = valueCol ?? inferValueColumn(keys, keyCol);

  if (!valueColEN && firstRow) {
    const valueColFirst = (valueCol ?? '').split(',')[0]?.trim() || (valueCol ?? '');
    const inferred = inferValueColumnEN(keys, keyCol, valueColFirst);
    if (inferred && inferred in firstRow) valueColEN = inferred;
  }

  const colorCol = def.column_map_color ?? def.resultColorColumn ?? 'color';
  const iconCol = def.column_map_icon ?? def.resultIconColumn ?? 'icon';

  const useColumnMapId = Boolean(def.column_map_id?.trim());
  const useColumnMapTitle = Boolean(def.column_map_title?.trim());

  return rows.map((row) => {
    let id: string;
    if (useColumnMapId) {
      id = getConcatenatedFromRow(row, def.column_map_id!);
    } else {
      id = String(get(row, keyCol) ?? '');
    }
    let label: string | Array<Record<string, string>>;
    if (useColumnMapTitle) {
      label = getConcatenatedFromRow(row, def.column_map_title!);
      if (!label) label = id;
    } else {
      const value = get(row, valueCol ?? '');
      const valueEN = valueColEN ? get(row, valueColEN) : undefined;
      if (valueEN !== undefined && valueEN !== null && value !== undefined && value !== null) {
        label = [{ en: String(valueEN) }, { fa: String(value) }];
      } else if (value !== undefined && value !== null) {
        label = String(value);
      } else {
        label = id;
      }
    }
    return {
      id,
      label,
      icon: getSingleFromRow(row, iconCol) ?? (typeof get(row, iconCol) === 'string' ? String(get(row, iconCol)) : undefined),
      color: getSingleFromRow(row, colorCol) ?? (typeof get(row, colorCol) === 'string' ? String(get(row, colorCol)) : undefined),
    };
  });
}
