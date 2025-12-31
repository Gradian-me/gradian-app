import { NextRequest, NextResponse } from 'next/server';
import { swaggerDocument } from '@/lib/swagger';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: NextRequest) {
  // Check authentication if REQUIRE_LOGIN is true
  const authResult = await requireApiAuth(request);
  
  // If authentication failed, return the error response
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  // Authentication passed (or not required) - return swagger document
  return NextResponse.json(swaggerDocument);
}


