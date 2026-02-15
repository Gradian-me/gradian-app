import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import { upsertBookmark, getBookmarksByUser } from './utils/bookmarks';

function getTargetPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!isDemoModeEnabled()) {
    return proxyEngagementRequest(request, getTargetPath(request));
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ?? authResult.userId;
    const inactive = searchParams.get('inactive');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required', data: [] },
        { status: 400 },
      );
    }

    const options: { inactive?: boolean } = {};
    if (inactive === 'true') options.inactive = true;
    else if (inactive === 'false') options.inactive = false;

    const data = getBookmarksByUser(userId, options);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Bookmarks GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch bookmarks',
        data: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  if (!isDemoModeEnabled()) {
    return proxyEngagementRequest(request, getTargetPath(request), {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const bodyObj = (body ?? {}) as Record<string, unknown>;
    const referenceType = bodyObj.referenceType as string;
    const referenceId = bodyObj.referenceId as string;
    const referenceInstanceId = bodyObj.referenceInstanceId as
      | string
      | undefined;
    const userId = (bodyObj.userId as string) ?? authResult.userId;

    if (!referenceType || !referenceId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'referenceType, referenceId, and userId are required',
        },
        { status: 400 },
      );
    }

    const bookmark = upsertBookmark(
      referenceType,
      referenceId,
      referenceInstanceId,
      userId,
    );

    return NextResponse.json(
      { success: true, data: bookmark, message: 'Bookmark saved' },
      { status: 201 },
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Bookmarks POST error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to save bookmark',
      },
      { status: 500 },
    );
  }
}
