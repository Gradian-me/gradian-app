// GET /api/lookups - List all lookups (proxy to URL_LOOKUP_CRUD)

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { proxyDataRequest } from '@/app/api/data/utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

/** Mask Bearer token for logs. */
function maskToken(auth: string | null): string {
  if (!auth || typeof auth !== 'string') return '(none)';
  const t = auth.trim();
  if (!t.toLowerCase().startsWith('bearer ')) return '***';
  const token = t.slice(7).trim();
  return token.length <= 4 ? 'Bearer ***' : `Bearer ***...${token.slice(-4)}`;
}

/** Truncate fingerprint for logs. */
function truncateFingerprint(fp: string | null): string {
  if (!fp || !fp.trim()) return '(none)';
  const s = fp.trim();
  return s.length <= 12 ? s : `${s.slice(0, 8)}...`;
}

const LOOKUP_LIST_NORMALIZE_PATH = '/api/data/lookups';

export async function GET(request: NextRequest) {
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

  const search = new URLSearchParams(request.nextUrl.searchParams);
  search.delete('tenantIds');
  search.delete('companyIds');
  const items = Object.fromEntries([...search.entries()]);
  const tenantDomain = request.headers.get('x-tenant-domain') ?? '';
  // Log: items (query params), token masked, fingerprint truncated, xTenantDomain full
  loggingCustom(
    LogType.INFRA_LOG,
    'info',
    `[lookups/list] items=${JSON.stringify(items)} token=${maskToken(request.headers.get('authorization'))} fingerprint=${truncateFingerprint(request.headers.get('x-fingerprint'))} xTenantDomain=${tenantDomain}`
  );
  const pathWithQuery = search.toString() ? `?${search.toString()}` : '';
  return proxyDataRequest(
    request,
    pathWithQuery,
    {},
    baseUrl,
    LOOKUP_LIST_NORMALIZE_PATH
  );
}
