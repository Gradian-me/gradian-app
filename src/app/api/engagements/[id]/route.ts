import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  getEngagementById,
  softDeleteEngagement,
  updateEngagement,
  getApiMessage,
  TRANSLATION_KEYS,
} from '../utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const engagement = getEngagementById(id);
    if (!engagement) {
      return NextResponse.json(
        { success: false, error: `Engagement with ID ${id} not found` },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: engagement });
  } catch (error) {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateEngagement(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Engagement with ID ${id} not found` },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: updated,
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
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const deleted = softDeleteEngagement(id, body.deletedBy as string | undefined);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_NOT_FOUND, { id }),
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
