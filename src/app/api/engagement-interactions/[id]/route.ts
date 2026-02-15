import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import {
  getInteractionById,
  updateInteraction,
  getApiMessage,
  TRANSLATION_KEYS,
} from '@/app/api/engagements/utils';

function getTargetPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!isDemoModeEnabled()) {
    return proxyEngagementRequest(request, getTargetPath(request));
  }

  try {
    const { id } = await params;
    const interaction = getInteractionById(id);
    if (!interaction) {
      return NextResponse.json(
        { success: false, error: `Interaction with ID ${id} not found` },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: interaction });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch interaction',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  try {
    const { id } = await params;
    const bodyObj = body as Record<string, unknown>;
    const updated = updateInteraction(id, {
      interactionType: bodyObj.interactionType as 'read' | 'acknowledge' | 'mention' | undefined,
      interactedAt: bodyObj.interactedAt as string | undefined,
      outputType: bodyObj.outputType as 'approved' | 'rejected' | undefined,
      comment: bodyObj.comment as string | undefined,
    });
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_INTERACTION_NOT_FOUND, {
            id,
          }),
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: updated,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_INTERACTION_UPDATED),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement interaction PUT error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_INTERACTION_UPDATE_FAILED),
      },
      { status: 500 },
    );
  }
}
