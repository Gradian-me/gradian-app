import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { getUserIdFromRequest } from '@/domains/chat/utils/auth-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import { countEngagements, getApiMessage, TRANSLATION_KEYS } from '../../utils';
import type { EngagementType } from '@/domains/engagements/types';

const VALID_ENGAGEMENT_TYPES: EngagementType[] = [
  'notification',
  'discussion',
  'sticky',
  'todo',
];

const TYPE_ALIASES: Record<string, EngagementType> = {
  notifications: 'notification',
};

function resolveEngagementType(param: string): EngagementType | null {
  const normalized = param?.toLowerCase().trim();
  if (TYPE_ALIASES[normalized]) return TYPE_ALIASES[normalized];
  if (VALID_ENGAGEMENT_TYPES.includes(normalized as EngagementType))
    return normalized as EngagementType;
  return null;
}

function getTargetPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

/**
 * GET /api/engagements/{notification|discussion|sticky|todo}/count
 * Query: isRead (optional), currentUserId (optional). For notifications, user from auth when currentUserId omitted.
 * Returns { success, data: number } for badges without fetching full list.
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ 'engagement-type': string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!isDemoModeEnabled()) {
    return proxyEngagementRequest(request, getTargetPath(request));
  }

  const { 'engagement-type': slug } = await params;
  const engagementType = resolveEngagementType(slug);

  if (!engagementType) {
    return NextResponse.json(
      {
        success: false,
        error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_INVALID_TYPE, {
          value: `${slug}. Must be one of ${VALID_ENGAGEMENT_TYPES.join(', ')}, or notifications`,
        }),
      },
      { status: 404 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const authUserId = authResult.userId?.trim();
    const tokenUserId = !authUserId ? getUserIdFromRequest(request) : null;
    const currentUserId =
      searchParams.get('currentUserId') ??
      (engagementType === 'notification' ? authUserId || (tokenUserId ?? undefined) : undefined);

    const isReadParam = searchParams.get('isRead');
    const isRead =
      isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

    const refSchemaId = searchParams.get('referenceSchemaId') ?? undefined;
    const refType = searchParams.get('referenceType') ?? (refSchemaId ? 'schema' : undefined);
    const refId = searchParams.get('referenceId') ?? refSchemaId;
    const count = countEngagements({
      engagementType,
      engagementGroupId: searchParams.get('engagementGroupId') ?? undefined,
      referenceSchemaId: refSchemaId,
      referenceType: refType,
      referenceId: refId,
      referenceInstanceId: searchParams.get('referenceInstanceId') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      currentUserId,
      sourceType:
        (searchParams.get('sourceType') as 'createdByMe' | 'assignedToMe') ?? undefined,
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
      `Engagements ${engagementType} count GET error: ${error instanceof Error ? error.message : String(error)}`,
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
