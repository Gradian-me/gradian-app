// Relations API Routes
// Handles CRUD operations for data relations

import { NextRequest, NextResponse } from 'next/server';
import { isDemoModeEnabled, proxyDataRequest } from '../data/utils';
import {
  readAllRelations,
  createRelation,
  getRelationsBySource,
  getRelationsByTarget,
  getRelationsByType,
  getRelationsForSection,
  getRelationsBySchemaAndId,
} from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { DataRelation } from '@/gradian-ui/schema-manager/types/form-schema';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';

/**
 * GET - Query relations
 * Query parameters:
 * - schema, id, direction - Get relations by schema and id (direction: 'source' | 'target' | 'both', default: 'both')
 * - otherSchema (optional with above) - Filter by the other schema (targetSchema for source relations, sourceSchema for target relations)
 * - sourceSchema, sourceId - Get relations by source entity (legacy, adds direction: 'source')
 * - targetSchema, targetId - Get relations by target entity (legacy, adds direction: 'target')
 * - relationTypeId - Get relations by type
 * - sourceSchema, sourceId, relationTypeId - Get relations for a repeating section
 * - targetSchema (optional with legacy queries) - Filter by target schema
 */
export async function GET(request: NextRequest) {
  try {
		// In non-demo mode, proxy to upstream data service
		if (!isDemoModeEnabled()) {
			const targetPath = `/api/relations${request.nextUrl.search}`;
			return proxyDataRequest(request, targetPath);
		}

    const { searchParams } = new URL(request.url);
    
    const schema = searchParams.get('schema');
    const id = searchParams.get('id');
    const direction = searchParams.get('direction') as 'source' | 'target' | 'both' | null;
    const otherSchema = searchParams.get('otherSchema');
    
    const sourceSchema = searchParams.get('sourceSchema');
    const sourceId = searchParams.get('sourceId');
    const targetSchema = searchParams.get('targetSchema');
    const targetId = searchParams.get('targetId');
    const relationTypeId = searchParams.get('relationTypeId');

    let relations: DataRelation[];

    // New unified query by schema and id with direction
    if (schema && id) {
      const queryDirection = direction || 'both';
      relations = getRelationsBySchemaAndId(schema, id, queryDirection, otherSchema || undefined);
      
      // Filter by relationTypeId if provided
      if (relationTypeId) {
        relations = relations.filter(r => r.relationTypeId === relationTypeId);
      }
    }
    // Get relations for repeating section (most specific query)
    else if (sourceSchema && sourceId && relationTypeId) {
      relations = getRelationsForSection(sourceSchema, sourceId, relationTypeId, targetSchema || undefined);
      // Add direction indicator for source relations
      relations = relations.map(r => ({ ...r, direction: 'source' as const }));
    }
    // Get relations by source entity (legacy)
    else if (sourceSchema && sourceId) {
      relations = getRelationsBySource(sourceSchema, sourceId);
      // Add direction indicator
      relations = relations.map(r => ({ ...r, direction: 'source' as const }));
      // Filter by target schema if provided
      if (targetSchema) {
        relations = relations.filter(r => r.targetSchema === targetSchema);
      }
    }
    // Get relations by target entity (legacy)
    else if (targetSchema && targetId) {
      relations = getRelationsByTarget(targetSchema, targetId);
      // Add direction indicator
      relations = relations.map(r => ({ ...r, direction: 'target' as const }));
    }
    // Get relations by type
    else if (relationTypeId) {
      relations = getRelationsByType(relationTypeId);
    }
    // Get all relations
    else {
      relations = readAllRelations();
    }

    return NextResponse.json({
      success: true,
      data: relations,
      count: relations.length,
    });
  } catch (error) {
    const errorResponse = handleDomainError(error);
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        code: errorResponse.code,
      },
      { status: errorResponse.statusCode }
    );
  }
}

/**
 * POST - Create new relation
 * Body: { sourceSchema, sourceId, targetSchema, targetId, relationTypeId }
 */
export async function POST(request: NextRequest) {
  try {
		// In non-demo mode, proxy to upstream data service
		if (!isDemoModeEnabled()) {
			const body = await request.json();
			return proxyDataRequest(request, `/api/relations`, {
				body,
				headers: { 'content-type': 'application/json' },
			});
		}

    const body = await request.json();

    const { sourceSchema, sourceId, targetSchema, targetId, relationTypeId } = body;

    // Validate required fields
    if (!sourceSchema || !sourceId || !targetSchema || !targetId || !relationTypeId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sourceSchema, sourceId, targetSchema, targetId, relationTypeId',
        },
        { status: 400 }
      );
    }

    const relation = createRelation({
      sourceSchema,
      sourceId,
      targetSchema,
      targetId,
      relationTypeId,
    });

    return NextResponse.json({
      success: true,
      data: relation,
    }, { status: 201 });
  } catch (error) {
    const errorResponse = handleDomainError(error);
    return NextResponse.json(
      {
        success: false,
        error: errorResponse.error,
        code: errorResponse.code,
      },
      { status: errorResponse.statusCode }
    );
  }
}

