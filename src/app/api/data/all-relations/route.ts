// All Relations API Route
// Returns all related entities grouped by schema and direction
// Query parameters: schema, id, direction (optional), otherSchema (optional)

import { NextRequest, NextResponse } from 'next/server';
import { readAllRelations } from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { readAllData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { DataRelation } from '@/gradian-ui/schema-manager/types/form-schema';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import { isDemoModeEnabled, proxyDataRequest } from '../utils';
import { enrichEntityPickerFieldsFromRelations } from '@/gradian-ui/shared/domain/utils/field-value-relations.util';

// Route segment config to optimize performance
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface GroupedRelationData {
  schema: string;
  direction: 'source' | 'target';
  relation_type: string;
  data: any[];
}

/**
 * GET - Get all related entities grouped by schema and direction
 * Query parameters:
 * - schema: Source schema ID (required)
 * - id: Entity ID (required)
 * - direction: 'source' | 'target' | 'both' (optional, default: 'both')
 * - otherSchema: Filter by specific target/source schema (optional)
 * - relationTypeId: Filter by specific relation type (optional)
 */
export async function GET(request: NextRequest) {
  const targetPath = `/api/data/all-relations${request.nextUrl.search}`;

  if (!isDemoModeEnabled()) {
    return proxyDataRequest(request, targetPath);
  }

  try {
    const { searchParams } = new URL(request.url);
    
    const schema = searchParams.get('schema');
    const id = searchParams.get('id');
    const direction = searchParams.get('direction') as 'source' | 'target' | 'both' | null;
    const otherSchema = searchParams.get('otherSchema');
    const relationTypeId = searchParams.get('relationTypeId');

    // Validate required parameters
    if (!schema || !id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: schema and id are required',
        },
        { status: 400 }
      );
    }

    // Read all relations
    const allRelations = readAllRelations();
    
    // Filter relations based on schema, id, and direction
    const queryDirection = direction || 'both';
    let filteredRelations: DataRelation[] = [];

    if (queryDirection === 'source' || queryDirection === 'both') {
      const sourceRelations = allRelations.filter(
        r => r.sourceSchema === schema && r.sourceId === id
      );
      filteredRelations.push(...sourceRelations.map(r => ({ 
        ...r, 
        direction: (r.direction || 'source') as 'source' | 'target' 
      })));
    }

    if (queryDirection === 'target' || queryDirection === 'both') {
      const targetRelations = allRelations.filter(
        r => r.targetSchema === schema && r.targetId === id
      );
      filteredRelations.push(...targetRelations.map(r => ({ 
        ...r, 
        direction: (r.direction || 'target') as 'source' | 'target' 
      })));
    }

    // Filter by otherSchema if provided
    if (otherSchema) {
      filteredRelations = filteredRelations.filter(r => {
        if (r.direction === 'source') {
          return r.targetSchema === otherSchema;
        } else if (r.direction === 'target') {
          return r.sourceSchema === otherSchema;
        }
        // Fallback for relations without direction
        return r.targetSchema === otherSchema;
      });
    }

    // Filter by relationTypeId if provided
    if (relationTypeId) {
      filteredRelations = filteredRelations.filter(r => r.relationTypeId === relationTypeId);
    }

    // Exclude HAS_FIELD_VALUE unless explicitly requested via relationTypeId
    if (!relationTypeId) {
      filteredRelations = filteredRelations.filter(r => r.relationTypeId !== 'HAS_FIELD_VALUE');
    }

    // Read all data
    const allData = readAllData();

    // Group relations by schema, direction, and relation type
    const groupedMap = new Map<string, {
      schema: string;
      direction: 'source' | 'target';
      relation_type: string;
      entityIds: Set<string>;
    }>();

    for (const relation of filteredRelations) {
      // Determine which entity ID and schema to fetch based on direction
      let entityIdToFetch: string;
      let schemaToFetch: string;

      if (relation.direction === 'source') {
        // Entity is source, fetch target entity
        entityIdToFetch = relation.targetId;
        schemaToFetch = relation.targetSchema;
      } else if (relation.direction === 'target') {
        // Entity is target, fetch source entity
        entityIdToFetch = relation.sourceId;
        schemaToFetch = relation.sourceSchema;
      } else {
        // Fallback: use target (backward compatibility)
        entityIdToFetch = relation.targetId;
        schemaToFetch = relation.targetSchema;
      }

      // Determine direction for grouping (use relation.direction if available, otherwise infer from context)
      const relationDirection = relation.direction || 
        (relation.sourceSchema === schema && relation.sourceId === id ? 'source' : 'target') as 'source' | 'target';
      
      // Create a unique key for grouping: schema-direction-relationType
      const groupKey = `${schemaToFetch}-${relationDirection}-${relation.relationTypeId}`;

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          schema: schemaToFetch,
          direction: relationDirection,
          relation_type: relation.relationTypeId,
          entityIds: new Set(),
        });
      }

      groupedMap.get(groupKey)!.entityIds.add(entityIdToFetch);
    }

    // Fetch entities from all-data.json and group them
    const result: GroupedRelationData[] = [];

    for (const [groupKey, groupInfo] of groupedMap.entries()) {
      const entities: any[] = [];
      
      // Get schema data
      const schemaData = allData[groupInfo.schema] || [];
      
      // Fetch entities by IDs and enrich picker fields
      for (const entityId of groupInfo.entityIds) {
        const entity = schemaData.find((e: any) => e.id === entityId);
        if (entity) {
          // Enrich picker fields with id, label, icon, color from relations
          try {
            const enrichedEntity = await enrichEntityPickerFieldsFromRelations({
              schemaId: groupInfo.schema,
              entity: entity,
            });
            entities.push(enrichedEntity);
          } catch (error) {
            // If enrichment fails, use original entity
            console.warn(`Failed to enrich entity ${entityId} in schema ${groupInfo.schema}:`, error);
            entities.push(entity);
          }
        }
      }

      if (entities.length > 0) {
        result.push({
          schema: groupInfo.schema,
          direction: groupInfo.direction,
          relation_type: groupInfo.relation_type,
          data: entities,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
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

