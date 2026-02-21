// GET/POST /api/external-proxy - Proxy to schema's externalBaseUrl (for absolute URLs to avoid CORS)
// Query: schemaId, path (e.g. "" or "/id" or "/fetch/id"). POST body is forwarded as JSON.

import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { findSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { getExternalUrlConfig } from '@/gradian-ui/shared/utils/external-base-url';
import { proxyDataRequest } from '@/app/api/data/utils';

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const schemaId = request.nextUrl.searchParams.get('schemaId');
  const pathParam = request.nextUrl.searchParams.get('path') ?? '';

  if (!schemaId || !schemaId.trim()) {
    return NextResponse.json(
      { success: false, error: 'schemaId is required.' },
      { status: 400 }
    );
  }

  const schema = await findSchemaById(schemaId.trim());
  const externalConfig = schema ? getExternalUrlConfig(schema) : null;
  const baseUrlRaw = externalConfig?.externalBaseUrl ?? schema?.externalBaseUrl?.trim();
  if (!schema || !baseUrlRaw) {
    return NextResponse.json(
      { success: false, error: 'Schema not found or has no externalBaseUrl.' },
      { status: 400 }
    );
  }

  const baseUrl = baseUrlRaw.replace(/\/+$/, '');
  if (!isAbsoluteUrl(baseUrl)) {
    return NextResponse.json(
      { success: false, error: 'externalBaseUrl must be absolute (http/https) for proxy.' },
      { status: 400 }
    );
  }

  const path = pathParam.startsWith('/') ? pathParam : pathParam ? `/${pathParam}` : '';
  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.delete('schemaId');
  searchParams.delete('path');
  const queryString = searchParams.toString();
  const pathWithQuery = path + (queryString ? `?${queryString}` : '');
  const pathForNormalization = path ? `/api/data/${schemaId}/0` : `/api/data/${schemaId}`;
  return proxyDataRequest(
    request,
    pathWithQuery,
    {},
    baseUrl,
    pathForNormalization
  );
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const schemaId = request.nextUrl.searchParams.get('schemaId');
  const pathParam = request.nextUrl.searchParams.get('path') ?? '';

  if (!schemaId || !schemaId.trim()) {
    return NextResponse.json(
      { success: false, error: 'schemaId is required.' },
      { status: 400 }
    );
  }

  const schema = await findSchemaById(schemaId.trim());
  const externalConfig = schema ? getExternalUrlConfig(schema) : null;
  const baseUrlRaw = externalConfig?.externalBaseUrl ?? schema?.externalBaseUrl?.trim();
  if (!schema || !baseUrlRaw) {
    return NextResponse.json(
      { success: false, error: 'Schema not found or has no externalBaseUrl.' },
      { status: 400 }
    );
  }

  const baseUrl = baseUrlRaw.replace(/\/+$/, '');
  if (!isAbsoluteUrl(baseUrl)) {
    return NextResponse.json(
      { success: false, error: 'externalBaseUrl must be absolute (http/https) for proxy.' },
      { status: 400 }
    );
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text && text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    // empty or invalid JSON
  }

  const path = pathParam.startsWith('/') ? pathParam : pathParam ? `/${pathParam}` : '';
  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  searchParams.delete('schemaId');
  searchParams.delete('path');
  const queryString = searchParams.toString();
  const pathWithQuery = path + (queryString ? `?${queryString}` : '');
  const pathForNormalization = `/api/data/${schemaId}/0`;
  return proxyDataRequest(
    request,
    pathWithQuery,
    { method: 'POST', body },
    baseUrl,
    pathForNormalization
  );
}
