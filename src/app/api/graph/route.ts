// Graph API Route
// Returns all data as nodes and relations as edges for graph visualization
// Query parameters: includedSchemaIds, excludedSchemaIds
// All nodes include schemaId property
// POST - Create a new graph
// PUT - Update an existing graph (via /api/graph/[graphId])

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { readAllData, writeAllData } from '@/gradian-ui/shared/domain/utils/data-storage.util';
import { readAllRelations, writeAllRelations } from '@/gradian-ui/shared/domain/utils/relations-storage.util';
import { handleDomainError } from '@/gradian-ui/shared/domain/errors/domain.errors';
import { getSchemaById } from '@/gradian-ui/schema-manager/utils/schema-registry.server';
import type { GraphNodeData, GraphEdgeData } from '@/domains/graph-designer/types';

// Route segment config to optimize performance
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GRAPHS_FILE = join(process.cwd(), 'data', 'graphs.json');
const DATA_DIR = join(process.cwd(), 'data');

/**
 * Ensure data directory and graphs file exist
 */
async function ensureGraphsFile(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    if (!existsSync(GRAPHS_FILE)) {
      await writeFile(GRAPHS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error ensuring graphs file:', error);
  }
}

/**
 * Read all graphs from file
 */
async function readGraphs(): Promise<Record<string, any>> {
  try {
    await ensureGraphsFile();
    const fileContent = await readFile(GRAPHS_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureGraphsFile();
      return {};
    }
    console.error('Error reading graphs:', error);
    return {};
  }
}

/**
 * Write graphs to file
 */
async function writeGraphs(graphs: Record<string, any>): Promise<void> {
  await ensureGraphsFile();
  await writeFile(GRAPHS_FILE, JSON.stringify(graphs, null, 2), 'utf-8');
}

/**
 * GET - Get all data as graph nodes and edges
 * Query parameters:
 * - includedSchemaIds: Comma-separated list of schema IDs to include (optional)
 *   - For nodes: only entities from these schemas are included
 *   - For edges: edges are included if EITHER sourceSchema OR targetSchema matches
 * - excludedSchemaIds: Comma-separated list of schema IDs to exclude (optional)
 * - graphType: Filter by graph type - 'nodes' to return only nodes, 'edges' to return only edges (optional)
 *   - If not provided, returns both nodes and edges
 * 
 * Returns: { success: true, data: { nodes: [], edges: [] }, message: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const includedSchemaIdsParam = searchParams.get('includedSchemaIds');
    const excludedSchemaIdsParam = searchParams.get('excludedSchemaIds');
    const graphTypeParam = searchParams.get('graphType');
    const tenantIdsParam = searchParams.get('tenantIds');
    const companyIdsParam = searchParams.get('companyIds');
    const singleCompanyIdParam = searchParams.get('companyId');
    
    const includedSchemaIds = includedSchemaIdsParam 
      ? includedSchemaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : null;
    
    const excludedSchemaIds = excludedSchemaIdsParam
      ? excludedSchemaIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    // Multi-tenant support: parse tenantIds for schema visibility filtering
    const tenantIds = tenantIdsParam
      ? tenantIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    const hasTenantFilter = tenantIds.length > 0;

    // Company scoping: parse companyIds (supports companyIds and legacy companyId)
    const parsedCompanyIds: string[] = [];
    if (companyIdsParam) {
      parsedCompanyIds.push(
        ...companyIdsParam.split(',').map((id) => id.trim()).filter(Boolean),
      );
    }
    if (singleCompanyIdParam) {
      parsedCompanyIds.push(singleCompanyIdParam.trim());
    }
    const companyIds = Array.from(new Set(parsedCompanyIds)).filter(Boolean);
    const hasCompanyFilter = companyIds.length > 0;
    
    // Validate graphType parameter
    const graphType = graphTypeParam?.toLowerCase();
    const validGraphTypes = ['nodes', 'edges'];
    if (graphType && !validGraphTypes.includes(graphType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid graphType. Must be one of: ${validGraphTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Read all data
    const allData = readAllData();
    
    // Read all relations
    const allRelations = readAllRelations();

    // Track which schemas are tenant-visible for edge-level filtering
    const tenantVisibleSchemas = new Set<string>();

    // Build nodes array
    const nodes: any[] = [];
    
    // Iterate through all schemas in the data
    for (const [schemaId, entities] of Object.entries(allData)) {
      // Apply explicit schema include/exclude filtering first
      if (includedSchemaIds && !includedSchemaIds.includes(schemaId)) {
        continue;
      }
      
      if (excludedSchemaIds.includes(schemaId)) {
        continue;
      }

      // Multi-tenant schema visibility filtering (mirrors /api/data behavior)
      let schema: any = null;
      if (hasTenantFilter) {
        try {
          schema = await getSchemaById(schemaId);
          const matchesTenantFilter = () => {
            if (!hasTenantFilter) return true;
            if (schema?.applyToAllTenants) return true;
            const related = Array.isArray(schema?.relatedTenants)
              ? schema.relatedTenants
                  .filter(Boolean)
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item?.id) return `${item.id}`;
                    return undefined;
                  })
                  .filter(Boolean) as string[]
              : [];
            if (related.length === 0) return false;
            return related.some((id: string) => tenantIds.includes(id));
          };
          const hasSchemaAndDataSync = schema?.syncStrategy === 'schema-and-data';
          if (!matchesTenantFilter() || !hasSchemaAndDataSync) {
            continue;
          }
          // Schema is visible for the requested tenants
          tenantVisibleSchemas.add(schemaId);
        } catch {
          // If schema can't be loaded, skip this schema entirely when tenant filter is applied
          continue;
        }
      } else {
        // When no tenant filter is applied, treat schema as visible by default
        tenantVisibleSchemas.add(schemaId);
        // Still load schema for entity-level filtering if needed
        try {
          schema = await getSchemaById(schemaId);
        } catch {
          // If schema can't be loaded, continue without entity-level tenant filtering
        }
      }

      // Add each entity as a node with schemaId, applying companyIds and tenantIds scoping when requested
      if (Array.isArray(entities)) {
        const typedEntities = entities as any[];
        
        // First, apply company filtering if requested
        let scopedEntities = hasCompanyFilter
          ? typedEntities.filter((entity: any) => {
              // Filter ONLY by relatedCompanies (array of { id, label })
              const relatedCompanies = entity['relatedCompanies'];
              if (Array.isArray(relatedCompanies) && relatedCompanies.length > 0) {
                const relatedIds = relatedCompanies
                  .map((item: any) =>
                    item && item.id ? String(item.id).trim() : null,
                  )
                  .filter((id: string | null): id is string => !!id);
                if (relatedIds.length > 0) {
                  return relatedIds.some((id) => companyIds.includes(id));
                }
                // If relatedCompanies is present but has no valid IDs, treat as not scoped
                return false;
              }
              // If no relatedCompanies metadata, do not filter this entity by companyIds (treat as global)
              return true;
            })
          : typedEntities;

        // Then, apply tenant filtering if schema supports it and tenantIds are provided
        if (hasTenantFilter && schema) {
          const allowDataRelatedTenants = schema?.allowDataRelatedTenants === true;
          
          if (allowDataRelatedTenants) {
            const normalizedTenantIds = tenantIds
              .map((id) => String(id).trim())
              .filter((id) => id.length > 0);

            if (normalizedTenantIds.length > 0) {
              scopedEntities = scopedEntities.filter((entity: any) => {
                // If entity has "relatedTenants" metadata, use it as primary filter source.
                const relatedTenants = entity['relatedTenants'];
                
                // If relatedTenants is empty/undefined/null, entity is visible to all tenants
                if (!relatedTenants || !Array.isArray(relatedTenants) || relatedTenants.length === 0) {
                  return true;
                }

                // If relatedTenants has values, check if any tenant ID matches
                const relatedIds = relatedTenants
                  .map((item: any) => {
                    if (typeof item === 'string') {
                      return String(item).trim();
                    }
                    if (item && item.id) {
                      return String(item.id).trim();
                    }
                    return null;
                  })
                  .filter((id: string | null): id is string => !!id);

                if (relatedIds.length > 0) {
                  return relatedIds.some((id) => normalizedTenantIds.includes(id));
                }

                // If relatedTenants exists but has no valid IDs, treat as visible to all
                return true;
              });
            }
          }
        }

        for (const entity of scopedEntities) {
          nodes.push({
            ...entity,
            schemaId: schemaId,
          });
        }
      }
    }

    // For HAS_FIELD_VALUE edges: include target nodes even if they don't pass tenant/company filters
    // This ensures that picker field values are visible in the graph
    const hasFieldValueTargets = new Set<string>();
    for (const relation of allRelations) {
      if (
        relation.relationTypeId === 'HAS_FIELD_VALUE' &&
        relation.inactive !== true
      ) {
        const sourceKey = `${relation.sourceSchema}:${String(relation.sourceId)}`;
        // Check if source node exists in filtered nodes
        const sourceExists = nodes.some(
          (node: any) =>
            node &&
            node.id != null &&
            node.schemaId === relation.sourceSchema &&
            String(node.id) === String(relation.sourceId),
        );
        
        if (sourceExists) {
          // Mark target node to be included
          hasFieldValueTargets.add(`${relation.targetSchema}:${String(relation.targetId)}`);
        }
      }
    }

    // Add target nodes for HAS_FIELD_VALUE edges if they exist in data but weren't included
    for (const targetKey of hasFieldValueTargets) {
      // Split on first colon only (in case targetId contains colons)
      const colonIndex = targetKey.indexOf(':');
      if (colonIndex === -1) continue;
      
      const targetSchema = targetKey.substring(0, colonIndex);
      const targetId = targetKey.substring(colonIndex + 1);
      
      const existingNode = nodes.find(
        (node: any) =>
          node &&
          node.schemaId === targetSchema &&
          String(node.id) === targetId,
      );
      
      if (!existingNode && allData[targetSchema]) {
        // Find the entity in the data
        const entities = allData[targetSchema];
        if (Array.isArray(entities)) {
          const entity = entities.find(
            (e: any) => e && String(e.id) === targetId,
          );
          if (entity) {
            // Add the target node even though it doesn't pass filters
            nodes.push({
              ...entity,
              schemaId: targetSchema,
            });
          }
        }
      }
    }

    // Precompute node lookup for edge filtering: only keep edges whose endpoints are present as nodes
    const nodeKeySet = new Set(
      nodes
        .map((node: any) =>
          node && node.id != null && node.schemaId
            ? `${node.schemaId}:${String(node.id)}`
            : null,
        )
        .filter((key: string | null): key is string => !!key),
    );

    // Build edges array
    const edges: any[] = [];
    
    for (const relation of allRelations) {
      // Skip inactive relations (similar to /api/relations behavior)
      if (relation.inactive === true) {
        continue;
      }

      // Ensure both source and target schemas are tenant-visible (when tenantIds are provided)
      // Exception: For HAS_FIELD_VALUE edges, be more lenient with target schema visibility
      const isHasFieldValue = relation.relationTypeId === 'HAS_FIELD_VALUE';
      if (
        hasTenantFilter &&
        !isHasFieldValue &&
        (!tenantVisibleSchemas.has(relation.sourceSchema) ||
          !tenantVisibleSchemas.has(relation.targetSchema))
      ) {
        continue;
      }
      // For HAS_FIELD_VALUE, only check source schema visibility
      if (
        hasTenantFilter &&
        isHasFieldValue &&
        !tenantVisibleSchemas.has(relation.sourceSchema)
      ) {
        continue;
      }

      const sourceKey = `${relation.sourceSchema}:${String(relation.sourceId)}`;
      const targetKey = `${relation.targetSchema}:${String(relation.targetId)}`;
      
      // Only include edges where both endpoints are present as nodes after filtering
      if (!nodeKeySet.has(sourceKey) || !nodeKeySet.has(targetKey)) {
        continue;
      }

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
        const edge: any = {
          id: relation.id,
          sourceId: relation.sourceId,
          targetId: relation.targetId,
          sourceSchema: relation.sourceSchema,
          targetSchema: relation.targetSchema,
          relationTypeId: relation.relationTypeId,
          createdAt: relation.createdAt,
          updatedAt: relation.updatedAt,
        };
        
        // Include fieldId if it exists in the relation
        // This is especially important for HAS_FIELD_VALUE relations used in integrations
        // to map picker field values back to their source form fields
        if (relation.fieldId) {
          edge.fieldId = relation.fieldId;
        }
        
        edges.push(edge);
      }
    }

    // Filter response based on graphType
    const responseData: { nodes?: any[]; edges?: any[] } = {};
    let message = '';
    
    if (graphType === 'nodes') {
      responseData.nodes = nodes;
      message = `Retrieved ${nodes.length} nodes`;
    } else if (graphType === 'edges') {
      responseData.edges = edges;
      message = `Retrieved ${edges.length} edges`;
    } else {
      // Return both if graphType is not specified
      responseData.nodes = nodes;
      responseData.edges = edges;
      message = `Retrieved ${nodes.length} nodes and ${edges.length} edges`;
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message,
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
 * POST - Create a new graph
 * Body: { graphId: string, nodes: GraphNodeData[], edges: GraphEdgeData[] }
 * 
 * Saves:
 * - Full node data to all-data.json under "graph-nodes" schema
 * - Full edge data to all-data-relations.json
 * - Only IDs and titles to graphs.json
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { graphId, nodes, edges } = body;

    if (!graphId) {
      return NextResponse.json(
        {
          success: false,
          error: 'graphId is required',
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        {
          success: false,
          error: 'nodes and edges must be arrays',
        },
        { status: 400 }
      );
    }

    // Validate that all edges reference existing nodes
    const nodeIds = new Set(nodes.map((n: GraphNodeData) => n.id));
    const missingNodes: Array<{ edgeIndex: number; nodeId: string; schema: string; type: 'source' | 'target' }> = [];
    
    edges.forEach((edge: GraphEdgeData, index: number) => {
      if (!nodeIds.has(edge.source)) {
        missingNodes.push({
          edgeIndex: index,
          nodeId: edge.source,
          schema: edge.sourceSchema || 'unknown',
          type: 'source',
        });
      }
      if (!nodeIds.has(edge.target)) {
        missingNodes.push({
          edgeIndex: index,
          nodeId: edge.target,
          schema: edge.targetSchema || 'unknown',
          type: 'target',
        });
      }
    });

    if (missingNodes.length > 0) {
      const errorDetails = missingNodes.map(m => 
        `Edge at index ${m.edgeIndex}: ${m.type} node with id '${m.nodeId}' does not exist in schema '${m.schema}'`
      ).join('; ');
      
      return NextResponse.json(
        {
          success: false,
          error: `Cannot create edges: The following nodes do not exist and were not created in this request: ${missingNodes.map(m => `- Node ${m.nodeId} in schema '${m.schema}'`).join(' ')} Details: ${errorDetails}. Please ensure all referenced nodes exist in the database or are included in the 'nodes' array of this request.`,
        },
        { status: 400 }
      );
    }

    const graphs = await readGraphs();
    
    // Check if graph already exists
    if (graphs[graphId]) {
      return NextResponse.json(
        {
          success: false,
          error: `Graph with id "${graphId}" already exists. Use PUT to update.`,
        },
        { status: 409 }
      );
    }

    // Save full node data to all-data.json
    const allData = readAllData();
    const graphNodesSchema = 'graph-nodes';
    if (!allData[graphNodesSchema]) {
      allData[graphNodesSchema] = [];
    }
    // Add or update nodes
    nodes.forEach((node: GraphNodeData) => {
      const existingIndex = allData[graphNodesSchema].findIndex((n: any) => n.id === node.id);
      if (existingIndex >= 0) {
        allData[graphNodesSchema][existingIndex] = node;
      } else {
        allData[graphNodesSchema].push(node);
      }
    });
    writeAllData(allData);

    // Save full edge data to all-data-relations.json
    // Need to get entity IDs from node payloads
    const allRelations = readAllRelations();
    edges.forEach((edge: GraphEdgeData) => {
      // Find source and target nodes to get entity IDs from payload
      const sourceNode = nodes.find((n: GraphNodeData) => n.id === edge.source);
      const targetNode = nodes.find((n: GraphNodeData) => n.id === edge.target);
      
      // Get entity IDs from payload, fallback to node ID if not available
      const sourceEntityId = (sourceNode?.payload as any)?.id || sourceNode?.id || edge.sourceId;
      const targetEntityId = (targetNode?.payload as any)?.id || targetNode?.id || edge.targetId;
      
      const existingIndex = allRelations.findIndex((r: any) => r.id === edge.id);
      const relationData: any = {
        id: edge.id,
        sourceSchema: edge.sourceSchema,
        sourceId: sourceEntityId,
        targetSchema: edge.targetSchema,
        targetId: targetEntityId,
        relationTypeId: edge.relationTypeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Include fieldId if it exists in the edge data
      if ((edge as any).fieldId) {
        relationData.fieldId = (edge as any).fieldId;
      }
      if (existingIndex >= 0) {
        allRelations[existingIndex] = { ...allRelations[existingIndex], ...relationData, updatedAt: new Date().toISOString() };
      } else {
        allRelations.push(relationData);
      }
    });
    writeAllRelations(allRelations);

    // Save only IDs, titles, schemaId, nodeId (optional), and incomplete (if true) to graphs.json
    const newGraph = {
      graphId,
      nodes: nodes.map((node: GraphNodeData) => ({
        id: node.id,
        title: node.title || 'Untitled',
        schemaId: node.schemaId,
        ...(node.nodeId && { nodeId: node.nodeId }), // Only include nodeId if it exists
        ...(node.incomplete && { incomplete: true }), // Only include incomplete if it's true
      })),
      edges: edges.map((edge: GraphEdgeData) => ({
        id: edge.id,
        title: edge.id, // Edge title is just the ID
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    graphs[graphId] = newGraph;
    await writeGraphs(graphs);

    return NextResponse.json({
      success: true,
      data: newGraph,
      message: 'Graph created successfully',
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

