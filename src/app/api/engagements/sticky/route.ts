import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';
import {
  createEngagement,
  enrichEngagementsWithInteractions,
  listEngagements,
  getApiMessage,
  TRANSLATION_KEYS,
} from '../utils';
import type { EngagementType } from '@/domains/engagements/types';

const ENGAGEMENT_TYPE: EngagementType = 'sticky';

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

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

    return NextResponse.json({
      success: true,
      data,
      message: getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_RETRIEVED_STICKIES, {
        count: String(data.length),
      }),
    });
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagements sticky GET error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_STICKIES_FETCH_FAILED),
        data: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const engagementGroupId = body.engagementGroupId ?? null;
    const created = createEngagement(body, ENGAGEMENT_TYPE, engagementGroupId);
    return NextResponse.json(
      {
        success: true,
        data: created,
        message: 'Sticky created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    loggingCustom(
      LogType.INFRA_LOG,
      'error',
      `Engagements sticky POST error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : getApiMessage(request, TRANSLATION_KEYS.API_ENGAGEMENT_STICKY_CREATE_FAILED),
      },
      { status: 500 },
    );
  }
}
