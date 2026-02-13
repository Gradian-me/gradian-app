import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import {
  countEngagements,
  findGroupByReference,
  getApiMessage,
  TRANSLATION_KEYS,
} from '@/app/api/engagements/utils';
import type { EngagementType } from '@/domains/engagements/types';

function getTargetPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

const VALID_ENGAGEMENT_TYPES: EngagementType[] = [
  'notification',
  'discussion',
  'sticky',
  'todo',
];

function isValidEngagementType(
  value: string | undefined,
): value is EngagementType {
  return (
    value !== undefined &&
    (VALID_ENGAGEMENT_TYPES as string[]).includes(value)
  );
}

/**
 * GET /api/data/[schema-id]/[id]/engagements/[engagement-type]/count
 * Query: currentUserId (optional), isRead (optional)
 * Returns { success, data: number } for record-scoped badges without fetching full list.
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ 'schema-id': string; id: string; 'engagement-type': string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!isDemoModeEnabled()) {
    return proxyEngagementRequest(request, getTargetPath(request));
  }

  const { 'schema-id': schemaId, id: instanceId, 'engagement-type': engagementType } =
    await params;

  if (!isValidEngagementType(engagementType)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid engagement type: ${engagementType}. Must be one of ${VALID_ENGAGEMENT_TYPES.join(', ')}`,
      },
      { status: 404 },
    );
  }

  try {
    const group = findGroupByReference(schemaId, instanceId);
    if (!group) {
      return NextResponse.json({
        success: true,
        data: 0,
        message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_COUNT_LABEL, {
          count: '0',
        }),
      });
    }

    const { searchParams } = new URL(request.url);
    const currentUserId = searchParams.get('currentUserId') ?? undefined;
    const isReadParam = searchParams.get('isRead');
    const isRead =
      isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

    const count = countEngagements({
      engagementType,
      engagementGroupId: group.id,
      currentUserId,
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
      `Data engagements ${engagementType} count GET error: ${error instanceof Error ? error.message : String(error)}`,
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
