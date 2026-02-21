// GET /api/lookups - List all lookups (proxy to URL_LOOKUP_CRUD)

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { proxyDataRequest } from '@/app/api/data/utils';

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
  const pathWithQuery = search.toString() ? `?${search.toString()}` : '';
  return proxyDataRequest(
    request,
    pathWithQuery,
    {},
    baseUrl,
    LOOKUP_LIST_NORMALIZE_PATH
  );
}
