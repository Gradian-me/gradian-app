import { NextRequest, NextResponse } from 'next/server';

import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import { requireApiAuth } from '@/gradian-ui/shared/utils/api-auth.util';
import { isDemoModeEnabled } from '@/app/api/data/utils';
import {
  DemoMergeResult,
  InvalidMergeColumnsError,
  MergeColumnConfig,
  mergeGraphEntitiesBackend,
  mergeGraphEntitiesDemo,
  parseMergeColumns,
} from '@/domains/graph-etl/graph-merge-etl';

// Route segment config to optimize performance
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GraphNodeLike = {
  schemaId?: string;
  payload?: any;
  [key: string]: any;
};

function buildSourceBySchemaFromNodes(
  nodes: any[],
  includedSchemaIds: string[] | null,
): Record<string, any[]> {
  const result: Record<string, any[]> = {};

  if (!Array.isArray(nodes)) {
    return result;
  }

  for (const rawNode of nodes) {
    const node = rawNode as GraphNodeLike;

    let schemaId: string | undefined =
      (node && typeof node.schemaId === 'string' && node.schemaId) ||
      (node?.payload && typeof node.payload.schemaId === 'string' ? node.payload.schemaId : undefined);

    const payload = node && node.payload && typeof node.payload === 'object' ? node.payload : node;

    if (!schemaId && payload && typeof payload.schemaId === 'string') {
      schemaId = payload.schemaId;
    }

    if (!schemaId) {
      continue;
    }

    if (includedSchemaIds && includedSchemaIds.length > 0 && !includedSchemaIds.includes(schemaId)) {
      continue;
    }

    if (!result[schemaId]) {
      result[schemaId] = [];
    }

    result[schemaId].push(payload);
  }

  return result;
}

function buildSourceBySchemaFromEntities(
  entities: any[],
  includedSchemaIds: string[] | null,
): Record<string, any[]> {
  const result: Record<string, any[]> = {};

  if (!Array.isArray(entities)) {
    return result;
  }

  for (const entity of entities) {
    if (!entity || typeof entity !== 'object') continue;

    const schemaId = typeof (entity as any).schemaId === 'string' ? (entity as any).schemaId : undefined;
    if (!schemaId) continue;

    if (includedSchemaIds && includedSchemaIds.length > 0 && !includedSchemaIds.includes(schemaId)) {
      continue;
    }

    if (!result[schemaId]) {
      result[schemaId] = [];
    }

    result[schemaId].push(entity);
  }

  return result;
}

type MergeResponseData = DemoMergeResult & {
  total: {
    inserted: number;
    updated: number;
    deactivated: number;
    skippedInvalidKey: number;
  };
};

export async function POST(request: NextRequest) {
  try {
    // Require authentication (reuses global API auth rules)
    const authResult = await requireApiAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse mergeColumns configuration
    let config: MergeColumnConfig;
    try {
      const mergeColumnsRaw = searchParams.get('mergeColumns');
      config = parseMergeColumns(mergeColumnsRaw);
    } catch (error) {
      if (error instanceof InvalidMergeColumnsError) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // Optional includedSchemaIds filter (e.g. includedSchemaIds=users)
    const includedSchemaIdsParam = searchParams.get('includedSchemaIds');
    const includedSchemaIds = includedSchemaIdsParam
      ? includedSchemaIdsParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : null;

    const body = await request.json();

    let sourceBySchema: Record<string, any[]> = {};

    // Preferred: same shape as /api/graph POST: { graphId, nodes, edges }
    if (body && typeof body === 'object' && !Array.isArray(body) && Array.isArray(body.nodes)) {
      sourceBySchema = buildSourceBySchemaFromNodes(body.nodes, includedSchemaIds);
    } else if (Array.isArray(body)) {
      // Fallback: allow direct array of entities shaped like payloads (with schemaId)
      sourceBySchema = buildSourceBySchemaFromEntities(body, includedSchemaIds);
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid request body. Expected { graphId, nodes, edges } or an array of entities with schemaId.',
        },
        { status: 400 },
      );
    }

    if (Object.keys(sourceBySchema).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No valid entities found to merge. Ensure that nodes or entities include a schemaId and match includedSchemaIds (if provided).',
        },
        { status: 400 },
      );
    }

    const demoMode = isDemoModeEnabled();

    if (!demoMode) {
      // Backend integration hook: currently not implemented
      await mergeGraphEntitiesBackend();
    }

    const result = await mergeGraphEntitiesDemo({
      sourceBySchema,
      config,
    });

    const total = result.summaries.reduce(
      (acc, summary) => {
        acc.inserted += summary.inserted;
        acc.updated += summary.updated;
        acc.deactivated += summary.deactivated;
        acc.skippedInvalidKey += summary.skippedInvalidKey;
        return acc;
      },
      {
        inserted: 0,
        updated: 0,
        deactivated: 0,
        skippedInvalidKey: 0,
      },
    );

    const data: MergeResponseData = {
      ...result,
      total,
    };

    return NextResponse.json({
      success: true,
      data,
      message: 'Graph data merged successfully.',
    });
  } catch (error) {
    // If backend merge is not yet implemented, surface a clear 501 response
    if (error instanceof Error && error.message.includes('not implemented for backend mode')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Graph merge is not implemented for backend mode yet. Enable demo mode to use this endpoint.',
        },
        { status: 501 },
      );
    }

    const errorResponse = handleDomainError(error);
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        code: errorResponse.code,
      },
      { status: errorResponse.statusCode },
    );
  }
}

