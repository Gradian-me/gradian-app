// POST /api/lookups/fetch/[lookup-id] - Fetch lookup with optional params (proxy to URL_LOOKUP_CRUD/fetch/[lookup-id])
// Body.sanitizeLabels=true returns normalized options [{ id, label, icon, color }] based on lookup column roles.

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { proxyDataRequest } from '@/app/api/data/utils';
import {
  fetchLookupDefinition,
  fetchLookupRaw,
  sanitizeLookupRows,
} from '../../utils/lookup-fetch';

/** Mask Bearer token for logs: "Bearer ***...last4" or "Bearer ***" if short. */
function maskToken(auth: string | null): string {
  if (!auth || typeof auth !== 'string') return '(none)';
  const t = auth.trim();
  if (!t.toLowerCase().startsWith('bearer ')) return '***';
  const token = t.slice(7).trim();
  return token.length <= 4 ? 'Bearer ***' : `Bearer ***...${token.slice(-4)}`;
}

/** Truncate fingerprint for logs: first 8 chars + "...". */
function truncateFingerprint(fp: string | null): string {
  if (!fp || !fp.trim()) return '(none)';
  const s = fp.trim();
  return s.length <= 12 ? s : `${s.slice(0, 8)}...`;
}

/** Synthetic path for response normalization (mutation). */
const LOOKUP_FETCH_NORMALIZE_PATH = '/api/data/lookups/0';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ 'lookup-id': string }> }
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const baseUrl = process.env.URL_LOOKUP_CRUD?.replace(/\/+$/, '');
  if (!baseUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'Lookup service URL is not configured. Set URL_LOOKUP_CRUD.',
      },
      { status: 500 }
    );
  }

  const { 'lookup-id': lookupId } = await params;
  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text && text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    // Invalid JSON or empty body: use empty object
  }

  const tenantDomain = request.headers.get('x-tenant-domain') ?? '';
  const itemsSummary =
    Object.keys(body).length === 0
      ? '(empty)'
      : JSON.stringify(
          Object.fromEntries(
            Object.entries(body).map(([k, v]) => [
              k,
              Array.isArray(v) ? `[${v.length}]` : typeof v === 'object' && v !== null ? '{...}' : String(v).slice(0, 80),
            ])
          )
        );
  // Log: items (body summary), token masked, fingerprint truncated, xTenantDomain full
  loggingCustom(
    LogType.INFRA_LOG,
    'info',
    `[lookups/fetch] lookupId=${lookupId} items=${itemsSummary} token=${maskToken(request.headers.get('authorization'))} fingerprint=${truncateFingerprint(request.headers.get('x-fingerprint'))} xTenantDomain=${tenantDomain}`
  );

  const sanitizeLabels = body?.sanitizeLabels === true;
  if (sanitizeLabels) {
    const def = await fetchLookupDefinition(baseUrl, lookupId, request);
    const { ok, status, data: rawRows } = await fetchLookupRaw(baseUrl, lookupId, request, body);
    if (!ok) {
      const httpStatus = status >= 400 && status <= 599 ? status : 502;
      const errorMessage = httpStatus === 401 || httpStatus === 403 ? 'Unauthorized' : 'Lookup fetch failed.';
      return NextResponse.json(
        { success: false, error: errorMessage, data: [] },
        { status: httpStatus }
      );
    }
    const defWithDefaults = def ?? {
      resultKeyColumn: 'id',
      resultValueColumn: 'label',
      resultValueColumnEN: undefined,
      resultColorColumn: 'color',
      resultIconColumn: 'icon',
    };
    const options = sanitizeLookupRows(rawRows, defWithDefaults);
    return NextResponse.json({ success: true, data: options });
  }

  const pathWithQuery = `/fetch/${encodeURIComponent(lookupId)}`;
  return proxyDataRequest(
    request,
    pathWithQuery,
    { method: 'POST', body },
    baseUrl,
    LOOKUP_FETCH_NORMALIZE_PATH
  );
}
