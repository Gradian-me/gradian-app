import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import { ulid } from 'ulid';
import { isDemoModeEnabled, proxyEngagementRequest } from '@/app/api/data/utils';
import {
  loadEngagementGroups,
  saveEngagementGroups,
  filterOutDeletedGroups,
  getApiMessage,
  TRANSLATION_KEYS,
} from '@/app/api/engagements/utils';
import type { EngagementGroup } from '@/domains/engagements/types';

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
    const groups = loadEngagementGroups();
    const active = filterOutDeletedGroups(groups);

    const { searchParams } = new URL(request.url);
    const referenceType = searchParams.get('referenceType') ?? undefined;
    const referenceId = searchParams.get('referenceId') ?? undefined;
    const referenceSchemaId = searchParams.get('referenceSchemaId') ?? undefined; // legacy
    const referenceInstanceId = searchParams.get('referenceInstanceId') ?? undefined;

    let filtered = active;
    if (referenceType && referenceId)
      filtered = filtered.filter(
        (g) => g.referenceType === referenceType && g.referenceId === referenceId,
      );
    else if (referenceSchemaId)
      filtered = filtered.filter(
        (g) =>
          g.referenceSchemaId === referenceSchemaId ||
          (g.referenceType === 'schema' && g.referenceId === referenceSchemaId),
      );
    if (referenceInstanceId)
      filtered = filtered.filter(
        (g) => g.referenceInstanceId === referenceInstanceId,
      );

    return NextResponse.json({
      success: true,
      data: filtered,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_GROUPS, {
        count: String(filtered.length),
      }),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement groups GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUPS_FETCH_FAILED),
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
    const bodyObj = (body ?? {}) as Record<string, unknown>;
    const groups = loadEngagementGroups();

    const now = new Date().toISOString();
    const id = (bodyObj.id as string) ?? ulid();
    const refType = bodyObj.referenceType as string | undefined;
    const refId = bodyObj.referenceId as string | undefined;
    const refSchemaId = bodyObj.referenceSchemaId as string | undefined;
    const newGroup: EngagementGroup = {
      id: String(id),
      referenceType: refType ?? (refSchemaId ? 'schema' : undefined),
      referenceId: refId ?? refSchemaId,
      referenceInstanceId: bodyObj.referenceInstanceId as string | undefined,
      title: bodyObj.title as string | undefined,
      description: bodyObj.description as string | undefined,
      createdBy: bodyObj.createdBy as string | undefined,
      createdAt: (bodyObj.createdAt as string | undefined) ?? now,
      owners: Array.isArray(bodyObj.owners) ? bodyObj.owners : [],
      members: Array.isArray(bodyObj.members) ? bodyObj.members : [],
      viewers: Array.isArray(bodyObj.viewers) ? bodyObj.viewers : [],
    };

    groups.push(newGroup);
    saveEngagementGroups(groups);

    return NextResponse.json(
      { success: true, data: newGroup, message: 'Engagement group created successfully' },
      { status: 201 },
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagement groups POST error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_GROUP_CREATE_FAILED),
      },
      { status: 500 },
    );
  }
}
