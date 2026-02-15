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
  getApiMessage,
  TRANSLATION_KEYS,
} from '../utils';
import type { EngagementType } from '@/domains/engagements/types';

const ENGAGEMENT_TYPE: EngagementType = 'todo';

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
    const currentUserId = searchParams.get('currentUserId') ?? undefined;
    let data = listEngagements({
      engagementType: ENGAGEMENT_TYPE,
      engagementGroupId: searchParams.get('engagementGroupId') ?? undefined,
      referenceSchemaId: searchParams.get('referenceSchemaId') ?? undefined,
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

    return NextResponse.json({
      success: true,
      data,
      message: `Retrieved ${data.length} todo(s)`,
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagements todo GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_TODOS_FETCH_FAILED),
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
    const bodyObj = body as Record<string, unknown>;
    const authUserId = authResult.userId?.trim();
    const tokenUserId = !authUserId ? getUserIdFromRequest(request) : null;
    const createdBy = authUserId || (tokenUserId ?? undefined);
    const engagementGroupId = bodyObj.engagementGroupId ?? null;
    const created = createEngagement(
      bodyObj,
      ENGAGEMENT_TYPE,
      engagementGroupId as string | null,
      createdBy,
    );
    const data = await enrichEngagementWithCreatedBy(created);
    return NextResponse.json(
      {
        success: true,
        data,
        message: 'Todo created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagements todo POST error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_TODO_CREATE_FAILED),
      },
      { status: 500 },
    );
  }
}
