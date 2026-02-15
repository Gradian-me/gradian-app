import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { getUserIdFromRequest } from '@/domains/chat/utils/auth-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import {
  createEngagement,
  enrichEngagementWithCreatedBy,
  enrichEngagementsWithCreatedBy,
  enrichEngagementsWithInteractions,
  listEngagements,
  getEngagementById,
  updateEngagement,
  softDeleteEngagement,
  getApiMessage,
  TRANSLATION_KEYS,
} from '../utils';
import type { EngagementType } from '@/domains/engagements/types';

const VALID_ENGAGEMENT_TYPES: EngagementType[] = [
  'notification',
  'discussion',
  'sticky',
  'todo',
];

/** "notifications" (plural) is backward-compat alias for "notification" */
const TYPE_ALIASES: Record<string, EngagementType> = {
  notifications: 'notification',
};

const TRANSLATION_MAP = {
  notification: {
    retrieved: TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_NOTIFICATIONS,
    fetchFailed: TRANSLATION_KEYS.API_ENGAGEMENT_NOTIFICATIONS_FETCH_FAILED,
    created: TRANSLATION_KEYS.API_ENGAGEMENT_NOTIFICATION_CREATED,
    createFailed: TRANSLATION_KEYS.API_ENGAGEMENT_NOTIFICATION_CREATE_FAILED,
  },
  discussion: {
    retrieved: TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_DISCUSSIONS,
    fetchFailed: TRANSLATION_KEYS.API_ENGAGEMENT_DISCUSSIONS_FETCH_FAILED,
    created: TRANSLATION_KEYS.API_ENGAGEMENT_DISCUSSION_CREATED,
    createFailed: TRANSLATION_KEYS.API_ENGAGEMENT_DISCUSSION_CREATE_FAILED,
  },
  sticky: {
    retrieved: TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_STICKIES,
    fetchFailed: TRANSLATION_KEYS.API_ENGAGEMENT_STICKIES_FETCH_FAILED,
    created: TRANSLATION_KEYS.API_ENGAGEMENT_STICKY_CREATED,
    createFailed: TRANSLATION_KEYS.API_ENGAGEMENT_STICKY_CREATE_FAILED,
  },
  todo: {
    retrieved: TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_TODOS,
    fetchFailed: TRANSLATION_KEYS.API_ENGAGEMENT_TODOS_FETCH_FAILED,
    created: TRANSLATION_KEYS.API_ENGAGEMENT_TODO_CREATED,
    createFailed: TRANSLATION_KEYS.API_ENGAGEMENT_TODO_CREATE_FAILED,
  },
} as const;

function resolveEngagementType(param: string): EngagementType | null {
  const normalized = param?.toLowerCase().trim();
  if (TYPE_ALIASES[normalized]) return TYPE_ALIASES[normalized];
  if (VALID_ENGAGEMENT_TYPES.includes(normalized as EngagementType))
    return normalized as EngagementType;
  return null;
}

function isEngagementId(param: string): boolean {
  const t = resolveEngagementType(param);
  return t === null && typeof param === 'string' && param.length > 0;
}

function getTargetPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

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

  // ID mode: fetch single engagement
  if (isEngagementId(slug)) {
    try {
      const engagement = getEngagementById(slug);
      if (!engagement) {
        return NextResponse.json(
          { success: false, error: `Engagement with ID ${slug} not found` },
          { status: 404 },
        );
      }
      const data = await enrichEngagementWithCreatedBy(engagement);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      loggingCustom(
        LogType.INFRA_LOG,
        'error',
        `Engagement GET by id error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_ENGAGEMENTS_FETCH_FAILED),
        },
        { status: 500 },
      );
    }
  }

  // Type mode: list engagements
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

    const refSchemaId = searchParams.get('referenceSchemaId') ?? undefined;
    const refType = searchParams.get('referenceType') ?? (refSchemaId ? 'schema' : undefined);
    const refId = searchParams.get('referenceId') ?? refSchemaId;
    let data = listEngagements({
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
    });

    if (currentUserId) {
      data = enrichEngagementsWithInteractions(data, currentUserId);
    }
    data = await enrichEngagementsWithCreatedBy(data);

    const t = TRANSLATION_MAP[engagementType];
    return NextResponse.json({
      success: true,
      data,
      message: getApiMessage(request, t.retrieved, { count: String(data.length) }),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagements ${engagementType} GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    const t = TRANSLATION_MAP[engagementType];
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, t.fetchFailed),
        data: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ 'engagement-type': string }> },
) {
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
    const bodyObj = body as Record<string, unknown>;
    const NOTIFICATION_CREATED_BY = '01KBF8N88CG4YPK6VDNQAE420Z';
    const authUserId = authResult.userId?.trim();
    const tokenUserId = !authUserId ? getUserIdFromRequest(request) : null;
    const createdBy =
      engagementType === 'notification'
        ? NOTIFICATION_CREATED_BY
        : authUserId || (tokenUserId ?? undefined);
    const engagementGroupId = bodyObj.engagementGroupId ?? null;
    const created = createEngagement(
      bodyObj,
      engagementType,
      engagementGroupId as string | null,
      createdBy,
    );
    const data = await enrichEngagementWithCreatedBy(created);
    const t = TRANSLATION_MAP[engagementType];
    return NextResponse.json(
      {
        success: true,
        data,
        message: getApiMessage(request, t.created),
      },
      { status: 201 },
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagements ${engagementType} POST error: ${error instanceof Error ? error.message : String(error)}`,
    );
    const t = TRANSLATION_MAP[engagementType];
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, t.createFailed),
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ 'engagement-type': string }> },
) {
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
      method: 'PUT',
      body,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { 'engagement-type': slug } = await params;
  if (!isEngagementId(slug)) {
    return NextResponse.json(
      { success: false, error: 'PUT is only supported for engagement ID' },
      { status: 404 },
    );
  }

  try {
    const updated = updateEngagement(slug, body as Record<string, unknown>);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Engagement with ID ${slug} not found` },
        { status: 404 },
      );
    }
    const data = await enrichEngagementWithCreatedBy(updated);
    return NextResponse.json({
      success: true,
      data,
      message: 'Engagement updated successfully',
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement PUT error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_UPDATE_FAILED),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ 'engagement-type': string }> },
) {
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
      method: 'DELETE',
      body,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { 'engagement-type': slug } = await params;
  if (!isEngagementId(slug)) {
    return NextResponse.json(
      { success: false, error: 'DELETE is only supported for engagement ID' },
      { status: 404 },
    );
  }

  try {
    const deleted = softDeleteEngagement(slug, (body as { deletedBy?: string })?.deletedBy);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_NOT_FOUND, { id: slug }),
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_DELETED),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement DELETE error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_DELETE_FAILED),
      },
      { status: 500 },
    );
  }
}
