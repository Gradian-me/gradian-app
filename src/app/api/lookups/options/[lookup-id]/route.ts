// GET /api/lookups/options/[lookup-id] - Returns normalized options for a lookup (id, label, icon, color)
// Used when targetSchema=lookups and referenceEntityId=lookupId so selects/pickers get option lists.

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
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

/** Truncate fingerprint for logs: first 8 chars + "..." */
function truncateFingerprint(fp: string | null): string {
  if (!fp || !fp.trim()) return '(none)';
  const s = fp.trim();
  return s.length <= 12 ? s : `${s.slice(0, 8)}...`;
}

type LookupOption = {
  id: string;
  label: unknown;
  icon?: string;
  color?: string;
};

function dedupeOptionsById(options: LookupOption[]): LookupOption[] {
  const seen = new Set<string>();
  const out: LookupOption[] = [];
  let emptyCounter = 0;

  for (const opt of options) {
    const rawId = typeof opt?.id === 'string' ? opt.id.trim() : '';
    const stableId = rawId || `__empty_id__:${emptyCounter++}`;
    if (seen.has(stableId)) {
      continue;
    }
    seen.add(stableId);
    out.push({ ...opt, id: stableId });
  }

  return out;
}

export async function GET(
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
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page') ?? '';
  const limit = searchParams.get('limit') ?? '';
  const tenantDomain = request.headers.get('x-tenant-domain') ?? '';
  const tenantId = request.headers.get('x-tenant-id') ?? '';
  const items = Object.fromEntries([...searchParams.entries()]);
  // Log: items (query params), token masked, fingerprint truncated, xTenantDomain full
  loggingCustom(
    LogType.INFRA_LOG,
    'info',
    `[lookups/options] lookupId=${lookupId} items=${JSON.stringify(items)} token=${maskToken(request.headers.get('authorization'))} fingerprint=${truncateFingerprint(request.headers.get('x-fingerprint'))} xTenantDomain=${tenantDomain} xTenantId=${tenantId}`
  );
  const def = await fetchLookupDefinition(baseUrl, lookupId, request);
  const { ok, status, data: rawRows } = await fetchLookupRaw(baseUrl, lookupId, request, {});
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
  const options = sanitizeLookupRows(rawRows, defWithDefaults) as LookupOption[];

  // Optional filtering by includeIds / includeIds[] to mirror /api/data semantics
  const includeIdsArray = searchParams.getAll('includeIds[]');
  const includeIdsCsv = searchParams.get('includeIds');
  const includeIdsFromCsv = includeIdsCsv
    ? includeIdsCsv
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    : [];
  const includeIds = [...includeIdsArray, ...includeIdsFromCsv].filter((id) => id && id.trim().length > 0);

  const filteredOptions =
    includeIds.length > 0
      ? options.filter((opt) => typeof opt.id === 'string' && includeIds.includes(opt.id.trim()))
      : options;

  const distinctOptions = dedupeOptionsById(filteredOptions);
  return NextResponse.json({ success: true, data: distinctOptions });
}
