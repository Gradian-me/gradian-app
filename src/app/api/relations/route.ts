// Relations API Routes
// Handles CRUD operations for data relations

import { NextRequest, NextResponse } from 'next/server';
import { isDemoModeEnabled, proxyDataRequest } from '../data/utils';
import {
  readAllRelations,
  writeAllRelations,
  createRelation,
  getRelationsBySource,
  getRelationsByTarget,
  getRelationsByType,
  getRelationsForSection,
  getRelationsBySchemaAndId,
} from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { DataRelation } from '@/gradian-ui/schema-manager/types/form-schema';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import { getExternalNodes } from '@/gradian-ui/shared/domain/utils/external-nodes.util';
import { getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import { BaseRepository } from '@/gradian-ui/shared/domain/repositories/base.repository';
import { getValueByRole, getSingleValueByRole } from '@/gradian-ui/form-builder/form-elements/utils/field-resolver';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

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
    const fieldId = searchParams.get('fieldId');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const resolveTargets = searchParams.get('resolveTargets') === 'true';

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

    // Optional filter by fieldId (mainly for HAS_FIELD_VALUE)
    if (fieldId) {
      relations = relations.filter((r) => r.fieldId === fieldId);
    }

    // By default, hide inactive relations when a relationTypeId is specified,
    // unless includeInactive=true is explicitly requested.
    if (relationTypeId && !includeInactive) {
      relations = relations.filter((r) => r.inactive !== true);
    }

    // If resolveTargets=true, enrich relations with target node data (label, icon, color)
    // OPTIMIZED: Batch fetch entities by schema to avoid N+1 queries
    if (resolveTargets && isDemoModeEnabled()) {
      // Batch process external nodes (single read)
      const externalNodes = getExternalNodes();
      const externalNodeMap = new Map(externalNodes.map((node) => [node.id, node]));

      // Group internal relations by targetSchema to batch fetch
      const relationsBySchema = new Map<string, DataRelation[]>();
      for (const rel of relations) {
        if (rel.targetSchema !== 'external-nodes') {
          if (!relationsBySchema.has(rel.targetSchema)) {
            relationsBySchema.set(rel.targetSchema, []);
          }
          relationsBySchema.get(rel.targetSchema)!.push(rel);
        }
      }

      // Batch fetch all entities and schemas by schema (one read per schema, not per relation)
      const schemaEntityMap = new Map<string, Map<string, any>>();
      const schemaMap = new Map<string, any>();
      
      await Promise.all(
        Array.from(relationsBySchema.keys()).map(async (schemaId) => {
          try {
            const [targetSchema, allEntities] = await Promise.all([
              getSchemaById(schemaId),
              new BaseRepository(schemaId).findAll(),
            ]);
            
            if (targetSchema) {
              schemaMap.set(schemaId, targetSchema);
            }
            
            // Create a map of entity ID -> entity for fast lookup
            const entityMap = new Map(allEntities.map((e: any) => [e.id, e]));
            schemaEntityMap.set(schemaId, entityMap);
          } catch (error) {
            loggingCustom(
              LogType.INFRA_LOG,
              'warn',
              `[GET /api/relations] Failed to batch fetch schema ${schemaId}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        })
      );

      // Enrich relations using batched data
      const enrichedRelations = relations.map((rel) => {
        try {
          let targetData: { id: string; label?: string; icon?: string; color?: string } | null = null;

          if (rel.targetSchema === 'external-nodes') {
            // Lookup from pre-loaded external nodes map
            const externalNode = externalNodeMap.get(rel.targetId);
            if (externalNode) {
              targetData = {
                id: externalNode.id,
                label: externalNode.label,
                icon: externalNode.icon,
                color: externalNode.color,
              };
            }
          } else {
            // Lookup from pre-loaded schema entity map
            const entityMap = schemaEntityMap.get(rel.targetSchema);
            const entity = entityMap?.get(rel.targetId);
            const targetSchema = schemaMap.get(rel.targetSchema);

            if (entity && targetSchema) {
              // Use proper field resolution with schema
              const label = getValueByRole(targetSchema, entity, 'title') || entity.name || entity.title || rel.targetId;
              const icon = getSingleValueByRole(targetSchema, entity, 'icon') || entity.icon;
              const color = getSingleValueByRole(targetSchema, entity, 'color') || entity.color;

              // Extract metadata from fields with addToReferenceMetadata: true
              const metadataFields = targetSchema.fields?.filter((f: any) => f.addToReferenceMetadata === true) || [];
              const metadata: Record<string, any> = {};
              if (metadataFields.length > 0) {
                metadataFields.forEach((field: any) => {
                  const fieldName = field.name;
                  if (fieldName && entity[fieldName] !== undefined && entity[fieldName] !== null) {
                    metadata[fieldName] = entity[fieldName];
                  }
                });
              }

              targetData = {
                id: rel.targetId,
                label: typeof label === 'string' ? label : String(label),
                icon: icon ? String(icon) : undefined,
                color: color ? String(color) : undefined,
                ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
              };
            }
          }

          return {
            ...rel,
            targetData,
          };
        } catch (error) {
          loggingCustom(
            LogType.INFRA_LOG,
            'warn',
            `[GET /api/relations] Failed to enrich relation ${rel.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return rel;
        }
      });

      return NextResponse.json({
        success: true,
        data: enrichedRelations,
        count: enrichedRelations.length,
      });
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

    // Prevent duplicate relation for same (sourceSchema, sourceId, targetSchema, targetId, relationTypeId)
    const relations = readAllRelations();
    const existingIndex = relations.findIndex(
      (r) =>
        r.sourceSchema === sourceSchema &&
        r.sourceId === sourceId &&
        r.targetSchema === targetSchema &&
        r.targetId === targetId &&
        r.relationTypeId === relationTypeId
    );

    if (existingIndex >= 0) {
      const existing = relations[existingIndex];
      // If it was inactive, revive it; otherwise block duplicate
      if (existing.inactive) {
        const revived = {
          ...existing,
          inactive: false,
          updatedAt: new Date().toISOString(),
        };
        relations[existingIndex] = revived;
        writeAllRelations(relations);
        return NextResponse.json(
          { success: true, data: revived, revived: true },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate relation not allowed for the same source, target, and relation type.',
          existing: existing,
        },
        { status: 409 }
      );
    }

    const relation = createRelation({
      sourceSchema,
      sourceId,
      targetSchema,
      targetId,
      relationTypeId,
    });

    return NextResponse.json(
      {
        success: true,
        data: relation,
      },
      { status: 201 }
    );
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

