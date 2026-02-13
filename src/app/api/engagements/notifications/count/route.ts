import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import { countEngagements, getApiMessage, TRANSLATION_KEYS } from '../../utils';
import type { EngagementType } from '@/domains/engagements/types';

const ENGAGEMENT_TYPE: EngagementType = 'notification';

function getTargetPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

/**
 * GET /api/engagements/notifications/count
 * Query: currentUserId (required for isRead filter), isRead (optional)
 * Returns { success, data: number } for badges without fetching full list.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!isDemoModeEnabled()) {
    return proxyEngagementRequest(request, getTargetPath(request));
  }

  try {
    const { searchParams } = new URL(request.url);
    const currentUserId = searchParams.get('currentUserId') ?? undefined;
    const isReadParam = searchParams.get('isRead');
    const isRead =
      isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

    const count = countEngagements({
      engagementType: ENGAGEMENT_TYPE,
      engagementGroupId: searchParams.get('engagementGroupId') ?? undefined,
      referenceSchemaId: searchParams.get('referenceSchemaId') ?? undefined,
      referenceInstanceId: searchParams.get('referenceInstanceId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      currentUserId,
      sourceType:
        (searchParams.get('sourceType') as 'createdByMe' | 'assignedToMe') ??
        undefined,
      isRead,
    });

    return NextResponse.json({
      success: true,
      data: count,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_COUNT_LABEL, {
        count: String(count),
      }),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagements notifications count GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_COUNT_FAILED),
        data: 0,
      },
      { status: 500 },
    );
  }
}
