// Graph API Route
// Returns all data as nodes and relations as edges for graph visualization
// Query parameters: includedSchemaIds, excludedSchemaIds
// All nodes include schemaId property

import { NextRequest, NextResponse } from 'next/server';
import { readAllData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { readAllRelations } from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';

// Route segment config to optimize performance
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET - Get all data as graph nodes and edges
 * Query parameters:
 * - includedSchemaIds: Comma-separated list of schema IDs to include (optional)
 *   - For nodes: only entities from these schemas are included
 *   - For edges: edges are included if EITHER sourceSchema OR targetSchema matches
 * - excludedSchemaIds: Comma-separated list of schema IDs to exclude (optional)
 * 
 * Returns: { nodes: [], edges: [] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const includedSchemaIdsParam = searchParams.get('includedSchemaIds');
    const excludedSchemaIdsParam = searchParams.get('excludedSchemaIds');
    
    const includedSchemaIds = includedSchemaIdsParam 
      ? includedSchemaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : null;
    
    const excludedSchemaIds = excludedSchemaIdsParam
      ? excludedSchemaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    // Read all data
    const allData = readAllData();
    
    // Read all relations
    const allRelations = readAllRelations();

    // Build nodes array
    const nodes: any[] = [];
    
    // Iterate through all schemas in the data
    for (const [schemaId, entities] of Object.entries(allData)) {
      // Apply schema filtering
      if (includedSchemaIds && !includedSchemaIds.includes(schemaId)) {
        continue;
      }
      
      if (excludedSchemaIds.includes(schemaId)) {
        continue;
      }

      // Add each entity as a node with schemaId
      if (Array.isArray(entities)) {
        for (const entity of entities) {
          nodes.push({
            ...entity,
            schemaId: schemaId,
          });
        }
      }
    }

    // Build edges array
    const edges: any[] = [];
    
    for (const relation of allRelations) {
      // Check if source or target schema matches includedSchemaIds
      // If includedSchemaIds is provided, include edge if EITHER sourceSchema OR targetSchema is in the list
      const sourceMatches = !includedSchemaIds || includedSchemaIds.includes(relation.sourceSchema);
      const targetMatches = !includedSchemaIds || includedSchemaIds.includes(relation.targetSchema);
      const schemaMatches = sourceMatches || targetMatches;
      
      // Check if either schema is excluded
      const sourceExcluded = excludedSchemaIds.includes(relation.sourceSchema);
      const targetExcluded = excludedSchemaIds.includes(relation.targetSchema);
      const isExcluded = sourceExcluded || targetExcluded;
      
      // Include edge if schema matches (either source or target) and neither is excluded
      if (schemaMatches && !isExcluded) {
        edges.push({
          id: relation.id,
          source: relation.sourceId,
          target: relation.targetId,
          sourceSchema: relation.sourceSchema,
          targetSchema: relation.targetSchema,
          relationTypeId: relation.relationTypeId,
          createdAt: relation.createdAt,
          updatedAt: relation.updatedAt,
        });
      }
    }

    return NextResponse.json({
      nodes,
      edges,
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

