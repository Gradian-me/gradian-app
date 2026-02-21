// POST /api/lookups/fetch/[lookup-id] - Fetch lookup with optional params (proxy to URL_LOOKUP_CRUD/fetch/[lookup-id])

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { proxyDataRequest } from '@/app/api/data/utils';

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
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text && text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    // Invalid JSON or empty body: use empty object
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
