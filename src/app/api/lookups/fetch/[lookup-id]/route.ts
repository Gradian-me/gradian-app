// POST /api/lookups/fetch/[lookup-id] - Fetch lookup with optional params (proxy to URL_LOOKUP_CRUD/fetch/[lookup-id])
// Body.sanitizeLabels=true returns normalized options [{ id, label, icon, color }] based on lookup column roles.

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { proxyDataRequest } from '@/app/api/data/utils';
import {
  fetchLookupDefinition,
  fetchLookupRaw,
  sanitizeLookupRows,
} from '../../utils/lookup-fetch';

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

  const sanitizeLabels = body?.sanitizeLabels === true;
  if (sanitizeLabels) {
    const def = await fetchLookupDefinition(baseUrl, lookupId, request);
    const { ok, data: rawRows } = await fetchLookupRaw(baseUrl, lookupId, request, body);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Lookup fetch failed.', data: [] },
        { status: 502 }
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
