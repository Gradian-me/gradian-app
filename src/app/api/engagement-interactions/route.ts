import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import type { EngagementInteraction } from '@/domains/engagements/types';
import {
  findInteractionsByEngagementIds,
  loadEngagementInteractions,
  upsertInteraction,
  getApiMessage,
  TRANSLATION_KEYS,
} from '@/app/api/engagements/utils';

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
    const engagementId = searchParams.get('engagementId');
    const engagementIds = searchParams.get('engagementIds'); // comma-separated
    const userId = searchParams.get('userId') ?? undefined;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId or current user required',
          data: [],
        },
        { status: 400 },
      );
    }

    let data: EngagementInteraction[];
    if (engagementIds) {
      const ids = engagementIds.split(',').map((s) => s.trim()).filter(Boolean);
      data = findInteractionsByEngagementIds(ids, userId);
    } else if (engagementId) {
      const all = loadEngagementInteractions();
      data = all.filter(
        (i) => i.engagementId === engagementId && i.userId === userId,
      );
    } else {
      const all = loadEngagementInteractions();
      data = all.filter((i) => i.userId === userId);
    }

    return NextResponse.json({
      success: true,
      data,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_INTERACTIONS, {
        count: String(data.length),
      }),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement interactions GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch interactions',
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
    const engagementId = bodyObj.engagementId as string;
    const userId = bodyObj.userId as string;

    if (!engagementId || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_ENGAGEMENT_ID_USER_ID_REQUIRED),
        },
        { status: 400 },
      );
    }

    const updates: Parameters<typeof upsertInteraction>[2] = {};
    if (bodyObj.interactionType != null)
      updates.interactionType = bodyObj.interactionType as 'read' | 'acknowledge' | 'mention';
    if (typeof bodyObj.isRead === 'boolean')
      updates.interactionType = bodyObj.isRead ? 'read' : undefined;
    if (bodyObj.readAt != null) updates.interactedAt = bodyObj.readAt as string;
    if (bodyObj.interactedAt != null) updates.interactedAt = bodyObj.interactedAt as string;
    if (bodyObj.outputType != null) updates.outputType = bodyObj.outputType as 'approved' | 'rejected';
    if (bodyObj.comment != null) updates.comment = bodyObj.comment as string;
    if (bodyObj.referenceEngagementId !== undefined)
      updates.referenceEngagementId =
        bodyObj.referenceEngagementId === null || bodyObj.referenceEngagementId === ''
          ? null
          : (bodyObj.referenceEngagementId as string);

    const interaction = upsertInteraction(engagementId, userId, updates);

    return NextResponse.json(
      {
        success: true,
        data: interaction,
        message: 'Interaction saved successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement interactions POST error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_INTERACTION_SAVE_FAILED),
      },
      { status: 500 },
    );
  }
}
