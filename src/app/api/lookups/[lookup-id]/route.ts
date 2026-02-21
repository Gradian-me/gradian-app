// GET /api/lookups/[lookup-id] - Get one lookup (proxy to URL_LOOKUP_CRUD/[lookup-id])

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { proxyDataRequest } from '@/app/api/data/utils';

/** Synthetic path for response normalization (detail = 5 segments). */
const LOOKUP_DETAIL_NORMALIZE_PATH = '/api/data/lookups/0';

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
  const search = new URLSearchParams(request.nextUrl.searchParams);
  search.delete('tenantIds');
  search.delete('companyIds');
  const pathWithQuery = `/${encodeURIComponent(lookupId)}${search.toString() ? `?${search.toString()}` : ''}`;
  return proxyDataRequest(
    request,
    pathWithQuery,
    {},
    baseUrl,
    LOOKUP_DETAIL_NORMALIZE_PATH
  );
}
