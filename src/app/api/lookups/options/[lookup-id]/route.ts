// GET /api/lookups/options/[lookup-id] - Returns normalized options for a lookup (id, label, icon, color)
// Used when targetSchema=lookups and referenceEntityId=lookupId so selects/pickers get option lists.

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import {
  fetchLookupDefinition,
  fetchLookupRaw,
  sanitizeLookupRows,
} from '../../utils/lookup-fetch';

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
  const def = await fetchLookupDefinition(baseUrl, lookupId, request);
  const { ok, data: rawRows } = await fetchLookupRaw(baseUrl, lookupId, request, {});
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
