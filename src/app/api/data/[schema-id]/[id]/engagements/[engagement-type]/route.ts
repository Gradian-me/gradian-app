import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  createEngagement,
  findGroupByReference,
  getOrCreateGroupForReference,
  listEngagements,
  getApiMessage,
  TRANSLATION_KEYS,
} from '@/app/api/engagements/utils';
import type { EngagementType } from '@/domains/engagements/types';

const VALID_ENGAGEMENT_TYPES: EngagementType[] = [
  'notification',
  'discussion',
  'sticky',
  'todo',
];

function isValidEngagementType(
  value: string | undefined,
): value is EngagementType {
  return (
    value !== undefined &&
    (VALID_ENGAGEMENT_TYPES as string[]).includes(value)
  );
}

const TYPE_LABELS: Record<EngagementType, string> = {
  notification: 'notification',
  discussion: 'discussion',
  sticky: 'sticky',
  todo: 'todo',
};

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ 'schema-id': string; id: string; 'engagement-type': string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { 'schema-id': schemaId, id: instanceId, 'engagement-type': engagementType } =
    await params;

  if (!isValidEngagementType(engagementType)) {
    return NextResponse.json(
      {
        success: false,
        error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_INVALID_TYPE, {
          value: `${engagementType}. Must be one of ${VALID_ENGAGEMENT_TYPES.join(', ')}`,
        }),
      },
      { status: 404 },
    );
  }

  try {
    const group = findGroupByReference(schemaId, instanceId);
    if (!group) {
      return NextResponse.json({
        success: true,
        data: [],
        message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_ENGAGEMENTS, {
          count: '0',
          type: TYPE_LABELS[engagementType],
        }),
      });
    }

    const data = listEngagements({
      engagementType,
      engagementGroupId: group.id,
    });

    return NextResponse.json({
      success: true,
      data,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_ENGAGEMENTS, {
        count: String(data.length),
        type: TYPE_LABELS[engagementType],
      }),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Data engagements ${engagementType} GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_ENGAGEMENTS_FETCH_FAILED),
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
  }: { params: Promise<{ 'schema-id': string; id: string; 'engagement-type': string }> },
) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { 'schema-id': schemaId, id: instanceId, 'engagement-type': engagementType } =
    await params;

  if (!isValidEngagementType(engagementType)) {
    return NextResponse.json(
      {
        success: false,
        error: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_INVALID_TYPE, {
          value: `${engagementType}. Must be one of ${VALID_ENGAGEMENT_TYPES.join(', ')}`,
        }),
      },
      { status: 404 },
    );
  }

  try {
    const body = await request.json();
    const createdBy = body.createdBy as string | undefined;
    const group = getOrCreateGroupForReference(schemaId, instanceId, createdBy);
    const created = createEngagement(body, engagementType, group.id, createdBy);
    const typeLabel =
      TYPE_LABELS[engagementType].charAt(0).toUpperCase() + TYPE_LABELS[engagementType].slice(1);

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_CREATED, {
          type: typeLabel,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Data engagements ${engagementType} POST error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_CREATE_FAILED),
      },
      { status: 500 },
    );
  }
}
