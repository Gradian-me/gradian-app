import type { Core, ElementDefinition } from 'cytoscape';
import type { GraphEdgeData, GraphLayout, GraphNodeData } from '../types';
import { LAYOUTS } from './layouts';
import { getNodeType, nodeDataToCytoscapeData, getIncompleteValue } from './node-data-extractor';
import { updateNodeStyles, updateStylesAfterLayout, updateEdgeCurveStyle } from './cytoscape-styles';
import { getNodeBackgroundColor, getNodeBorderColor, getEdgeColor, generateBadgeSvg } from './color-mapper';

/**
 * Schema information for node type resolution
 */
export interface SchemaInfo {
  id: string;
  singular_name?: string;
  plural_name?: string;
}

export interface NodeType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface RelationType {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

/**
 * Configuration for synchronizing React state with Cytoscape
 */
export interface SchemaConfig {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface CytoscapeSyncConfig {
  cy: Core;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  layout: GraphLayout;
  schemas: SchemaInfo[];
  nodeTypes?: NodeType[];
  relationTypes?: RelationType[];
  schemasConfig?: SchemaConfig[];
  hiddenNodeTypeIds?: Set<string>;
  hiddenRelationTypeIds?: Set<string>;
  hiddenSchemaIds?: Set<string>;
}

/**
 * Synchronizes React state (nodes, edges) with Cytoscape graph
 * Handles adding, removing, updating elements and running layout
 */
export function syncCytoscapeGraph(config: CytoscapeSyncConfig): void {
  const { cy, nodes, edges, layout, schemas, nodeTypes, relationTypes, schemasConfig, hiddenNodeTypeIds, hiddenRelationTypeIds, hiddenSchemaIds } = config;

  // Create lookup maps for node and relation types
  const nodeTypeMap = new Map<string, NodeType>();
  if (nodeTypes) {
    nodeTypes.forEach((type) => {
      nodeTypeMap.set(type.id, type);
    });
  }

  const relationTypeMap = new Map<string, RelationType>();
  if (relationTypes) {
    relationTypes.forEach((type) => {
      relationTypeMap.set(type.id, type);
    });
  }

  // Filter nodes and edges based on visibility
  const visibleNodes = (hiddenNodeTypeIds && hiddenNodeTypeIds.size > 0) || (hiddenSchemaIds && hiddenSchemaIds.size > 0)
    ? nodes.filter((node) => {
        // Check schema visibility
        if (hiddenSchemaIds && hiddenSchemaIds.has(node.schemaId)) {
          return false;
        }
        // Check node type visibility
        const nodeTypeId = (node.payload as any)?.nodeTypeId;
        if (nodeTypeId && hiddenNodeTypeIds && hiddenNodeTypeIds.has(nodeTypeId)) {
          return false;
        }
        return true;
      })
    : nodes;

  // Create a set of visible node IDs for edge filtering
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  
  const visibleEdges = edges.filter((edge) => {
    // Hide edge if source or target node is hidden
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
      return false;
    }
    // Hide edge if relation type is hidden
    if (hiddenRelationTypeIds && hiddenRelationTypeIds.has(edge.relationTypeId)) {
      return false;
    }
    return true;
  });

  const currentElementIds = new Set(cy.elements().map((el) => el.id()));
  const newElementIds = new Set([
    ...visibleNodes.map((n) => n.id),
    ...visibleEdges.map((e) => e.id),
  ]);

  // Find elements to remove (exist in current but not in new)
  const toRemove = cy.elements().filter((el) => !newElementIds.has(el.id()));
  
    // Find elements to add (exist in new but not in current)
    const toAdd: ElementDefinition[] = [
      ...visibleNodes
        .filter((node) => !currentElementIds.has(node.id))
        .map((node) => {
          const nodeType = getNodeType(node, schemas);
          const nodeTypeId = (node.payload as any)?.nodeTypeId;
          const nodeTypeData = nodeTypeId ? nodeTypeMap.get(nodeTypeId) : undefined;
          const backgroundColor = nodeTypeData ? getNodeBackgroundColor(nodeTypeData.color) : undefined;
          const borderColor = nodeTypeData ? getNodeBorderColor(nodeTypeData.color) : undefined;
          const nodeTypeLabel = nodeTypeData?.label || '';
          const nodeTypeColor = nodeTypeData?.color || 'gray';
          
          // Get schema config for icon
          const schemaConfig = schemasConfig?.find(s => s.id === node.schemaId);
          const schemaIcon = schemaConfig?.icon;
          const nodeTypeIcon = nodeTypeData?.icon;
          const icon = schemaIcon || nodeTypeIcon;
          
          // Generate badge SVG if we have a node type label (use node type color, not schema color)
          const badgeImage = nodeTypeLabel ? generateBadgeSvg(nodeTypeLabel, nodeTypeColor) : undefined;
          
          // Check if node has payload data
          const hasPayload = !!node.payload;
          
          return {
            data: {
              ...nodeDataToCytoscapeData(node, nodeType),
              nodeTypeId,
              nodeTypeLabel,
              nodeBackgroundColor: backgroundColor,
              nodeBorderColor: borderColor,
              icon,
              badgeImage,
              payload: node.payload, // Include payload data for info icon functionality
              hasPayload,
            },
          };
        }),
      ...visibleEdges
        .filter((edge) => !currentElementIds.has(edge.id))
        .map((edge) => {
          const relationTypeData = relationTypeMap.get(edge.relationTypeId);
          const edgeColor = relationTypeData ? getEdgeColor(relationTypeData.color) : undefined;
          return {
            data: {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceSchema: edge.sourceSchema,
              sourceId: edge.sourceId,
              targetSchema: edge.targetSchema,
              targetId: edge.targetId,
              relationTypeId: edge.relationTypeId,
              relationColor: edgeColor,
            },
          };
        }),
    ];

  // Update existing node data
  visibleNodes.forEach((node) => {
    if (currentElementIds.has(node.id)) {
      const existing = cy.$id(node.id);
      if (existing.length > 0) {
        const nodeType = getNodeType(node, schemas);
        const incompleteValue = getIncompleteValue(node);
        const nodeTypeId = (node.payload as any)?.nodeTypeId;
        const nodeTypeData = nodeTypeId ? nodeTypeMap.get(nodeTypeId) : undefined;
        const backgroundColor = nodeTypeData ? getNodeBackgroundColor(nodeTypeData.color) : undefined;
        const borderColor = nodeTypeData ? getNodeBorderColor(nodeTypeData.color) : undefined;
        const nodeTypeLabel = nodeTypeData?.label || '';
        const nodeTypeColor = nodeTypeData?.color || 'gray';
        
        // Get schema config for icon
        const schemaConfig = schemasConfig?.find(s => s.id === node.schemaId);
        const schemaIcon = schemaConfig?.icon;
        const nodeTypeIcon = nodeTypeData?.icon;
        const icon = schemaIcon || nodeTypeIcon;
        
        // Generate badge SVG if we have a node type label (use node type color, not schema color)
        const badgeImage = nodeTypeLabel ? generateBadgeSvg(nodeTypeLabel, nodeTypeColor) : undefined;
        
        // Check if node has payload data
        const hasPayload = !!node.payload;
        
        existing.data({
          ...nodeDataToCytoscapeData(node, nodeType),
          incomplete: incompleteValue,
          nodeTypeId,
          nodeTypeLabel,
          nodeBackgroundColor: backgroundColor,
          nodeBorderColor: borderColor,
          icon,
          badgeImage,
          payload: node.payload, // Include payload data for info icon functionality
          hasPayload,
        });
        
        // Apply colors if available
        if (backgroundColor) {
          existing.style('background-color', backgroundColor);
        }
        if (borderColor) {
          existing.style('border-color', borderColor);
        }
        
        // Show node if it was hidden
        existing.style('display', 'element');
        
        // Always update style for existing nodes to ensure they reflect current state
        existing.style();
      }
    }
  });

  // Hide nodes that are not in visibleNodes
  nodes.forEach((node) => {
    if (!visibleNodes.includes(node) && currentElementIds.has(node.id)) {
      const existing = cy.$id(node.id);
      if (existing.length > 0) {
        existing.style('display', 'none');
      }
    }
  });
  
  // Trigger a style recalculation on the entire graph once after all updates
  updateNodeStyles(cy);

  // Update existing edge data
  visibleEdges.forEach((edge) => {
    if (currentElementIds.has(edge.id)) {
      const existing = cy.$id(edge.id);
      if (existing.length > 0) {
        const relationTypeData = relationTypeMap.get(edge.relationTypeId);
        const edgeColor = relationTypeData ? getEdgeColor(relationTypeData.color) : undefined;
        existing.data({
          source: edge.source,
          target: edge.target,
          sourceSchema: edge.sourceSchema,
          sourceId: edge.sourceId,
          targetSchema: edge.targetSchema,
          targetId: edge.targetId,
          relationTypeId: edge.relationTypeId,
          relationColor: edgeColor,
        });
        
        // Apply color if available
        if (edgeColor) {
          existing.style('line-color', edgeColor);
          existing.style('target-arrow-color', edgeColor);
        }
        
        // Show edge if it was hidden
        existing.style('display', 'element');
      }
    }
  });

  // Hide edges that are not in visibleEdges
  edges.forEach((edge) => {
    if (!visibleEdges.includes(edge) && currentElementIds.has(edge.id)) {
      const existing = cy.$id(edge.id);
      if (existing.length > 0) {
        existing.style('display', 'none');
      }
    }
  });

  // Animate removals with fade-out
  if (toRemove.length > 0) {
    toRemove.animate({
      style: { opacity: 0 },
      duration: 300,
      easing: 'ease-out',
    });
    setTimeout(() => {
      toRemove.remove();
    }, 300);
  }

  // Add new elements with fade-in animation
  if (toAdd.length > 0) {
    const added = cy.add(toAdd);
    
    // Apply colors to newly added nodes
    added.nodes().forEach((node) => {
      const backgroundColor = node.data('nodeBackgroundColor');
      const borderColor = node.data('nodeBorderColor');
      if (backgroundColor) {
        node.style('background-color', backgroundColor);
      }
      if (borderColor) {
        node.style('border-color', borderColor);
      }
    });
    
    // Apply colors to newly added edges
    added.edges().forEach((edge) => {
      const relationColor = edge.data('relationColor');
      if (relationColor) {
        edge.style('line-color', relationColor);
        edge.style('target-arrow-color', relationColor);
      }
    });
    
    added.style({ opacity: 0 });
    added.animate({
      style: { opacity: 1 },
      duration: 400,
      easing: 'ease-out',
    });
  }

  // Update edge curve-style based on layout
  updateEdgeCurveStyle(cy, layout);

  // Run layout with smooth animation
  const layoutOptions = {
    ...LAYOUTS[layout],
    animate: true,
  };
  const layoutInstance = cy.layout(layoutOptions);
  updateStylesAfterLayout(cy, layoutInstance);
  
  // Fit graph to viewport after layout completes to prevent items from being pushed out
  layoutInstance.one('layoutstop', () => {
    cy.fit(undefined, 10); // Fit with 10px padding
  });
  
  layoutInstance.run();
}

