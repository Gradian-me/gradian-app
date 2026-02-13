import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  getInteractionById,
  updateInteraction,
  getApiMessage,
  TRANSLATION_KEYS,
} from '@/app/api/engagements/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

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

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateInteraction(id, {
      isRead: body.isRead,
      readAt: body.readAt,
      interactedAt: body.interactedAt,
      outputType: body.outputType,
      comment: body.comment,
      dueDate: body.dueDate,
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
