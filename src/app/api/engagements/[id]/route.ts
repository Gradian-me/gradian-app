import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import {
  getEngagementById,
  softDeleteEngagement,
  updateEngagement,
  getApiMessage,
  TRANSLATION_KEYS,
} from '../utils';

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
    const updated = updateEngagement(id, body as Record<string, unknown>);
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

  try {
    const { id } = await params;
    const deleted = softDeleteEngagement(id, (body as { deletedBy?: string })?.deletedBy);
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
