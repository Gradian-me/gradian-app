import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  loadEngagementGroups,
  saveEngagementGroups,
  filterOutDeletedGroups,
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

  try {
    const { id } = await params;
    const body = await request.json();
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
    for (const key of allowed) {
      if (key in body) (updated as Record<string, unknown>)[key] = body[key];
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
    let deletedBy: string | undefined;
    try {
      const body = await request.json();
      deletedBy = body?.deletedBy;
    } catch {
      // No body or invalid JSON
    }
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
