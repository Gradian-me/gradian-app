import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import {
  loadEngagementGroups,
  saveEngagementGroups,
  filterOutDeletedGroups,
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
    const groups = loadEngagementGroups();
    const active = filterOutDeletedGroups(groups);
    const group = active.find((g) => g.id === id);

    if (!group) {
      return NextResponse.json(
        { success: false, error: `Engagement group with ID ${id} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: group });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUPS_FETCH_FAILED),
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
    const groups = loadEngagementGroups();
    const active = filterOutDeletedGroups(groups);
    const index = groups.findIndex((g) => g.id === id);

    if (index === -1 || groups[index].deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUP_NOT_FOUND, { id }),
        },
        { status: 404 },
      );
    }

    const allowed = [
      'title',
      'description',
      'owners',
      'members',
      'viewers',
      'referenceSchemaId',
      'referenceInstanceId',
    ] as const;
    const updated = { ...groups[index] };
    const bodyObj = body as Record<string, unknown>;
    for (const key of allowed) {
      if (key in bodyObj) (updated as Record<string, unknown>)[key] = bodyObj[key];
    }
    updated.updatedAt = new Date().toISOString();
    groups[index] = updated;
    saveEngagementGroups(groups);

    return NextResponse.json({
      success: true,
      data: updated,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUP_UPDATED),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement group PUT error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUP_UPDATE_FAILED),
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
    const groups = loadEngagementGroups();
    const index = groups.findIndex((g) => g.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: `Engagement group with ID ${id} not found` },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const deletedBy = (body as { deletedBy?: string } | undefined)?.deletedBy;
    groups[index] = {
      ...groups[index],
      deletedBy: deletedBy ?? undefined,
      deletedAt: now,
    };
    saveEngagementGroups(groups);

    return NextResponse.json({
      success: true,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUP_DELETED),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement group DELETE error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUP_DELETE_FAILED),
      },
      { status: 500 },
    );
  }
}
