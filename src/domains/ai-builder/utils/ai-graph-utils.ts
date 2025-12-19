/**
 * AI Graph Utilities
 * Handles graph generation requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { extractParametersBySectionId, parseUserPromptToFormValues } from './ai-shared-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType, LOG_CONFIG } from '@/gradian-ui/shared/configs/log-config';
import { truncateText } from '@/domains/chat/utils/text-utils';
import {
  sanitizePrompt,
  sanitizeErrorMessage,
  safeJsonParse,
} from './ai-security-utils';
import {
  validateAgentConfig,
} from './ai-common-utils';
import { buildSystemPrompt } from './prompt-concatenation-utils';
import { callChatApi } from './ai-api-caller';
import { extractJson } from '@/gradian-ui/shared/utils/json-extractor';

/**
 * Comprehensive Graph Generation Prompt
 * Instructs AI to generate structured graph data with nodes, edges, and metadata
 * Includes industry best practices, 6M root cause analysis, and decision builder capabilities
 * Note: Current date/time is provided via GENERAL_SYSTEM_PROMPT
 */
export const GRAPH_GENERATION_PROMPT = `You are an Advanced Graph Structure Intelligence Model with deep expertise in industry best practices, root cause analysis, and decision-making frameworks.

## YOUR CORE CAPABILITIES

1. **Industry Best Practices Analysis**: 
   - Identify the industry/domain from the user prompt (pharmaceutical, manufacturing, healthcare, technology, finance, etc.)
   - Research and apply industry-specific best practices, standards, and frameworks
   - Compare user scenarios with industry benchmarks and standards
   - Incorporate regulatory requirements (GMP, ISO, FDA, etc.) when relevant

2. **6M Root Cause Analysis Framework**:
   - When root cause analysis is requested, systematically apply the 6M model:
     * **Man (Human)**: People-related causes (training, skills, supervision, communication, human error)
     * **Machine (Equipment)**: Equipment and technology causes (calibration, maintenance, failures, design)
     * **Material**: Material-related causes (quality, availability, specifications, handling)
     * **Method (Process)**: Process and procedure causes (SOPs, workflows, documentation, validation)
     * **Measurement**: Measurement and data causes (accuracy, precision, monitoring, analysis)
     * **Mother Nature/Environment**: Environmental causes (temperature, humidity, contamination, external factors)
   - Create nodes for each 6M category when applicable
   - Show relationships between 6M categories
   - Map all causes to their effects and outcomes

3. **Decision Builder Capabilities**:
   - For decision-making scenarios, create comprehensive decision trees
   - Identify decision points, conditions, criteria, and outcomes
   - Show decision branches with clear paths and consequences
   - Include risk assessment nodes for each decision path
   - Map decision outcomes to actions and results

4. **Entity Relationship Mapping**:
   - Identify all entities, concepts, and relationships from the prompt
   - Map complex relationships (one-to-many, many-to-many, dependencies)
   - Show entity hierarchies and organizational structures

## CRITICAL REQUIREMENTS:

1. **Node Generation**:
   - Extract ALL key entities, concepts, processes, decision points, causes, and effects
   - Each node MUST have: id (unique), schemaId (categorization), title (descriptive), incomplete (false), parentId (null or parent), payload (relevant data)
   - Use consistent ID patterns: {domain}-{type}-{index} (e.g., "deviation-dv-2025-0198", "cause-man-1", "decision-launch-1")
   - **CRITICAL: Include nodeTypeId in payload**: Every node's payload MUST include a "nodeTypeId" field that uniquely identifies the node's type within its schema
     * Example: For a "cause" schema with type "man", payload should include: "nodeTypeId": "cause-man"
     * Example: For a "cause" schema with type "machine", payload should include: "nodeTypeId": "cause-machine"
     * This allows differentiation between different types within the same schema
   - Include comprehensive payload data:
     * For 6M analysis: type (man/machine/material/method/measurement/environment), nodeTypeId (e.g., "cause-man", "cause-machine"), category, impact, severity, dateFound
     * For decisions: decisionCriteria, riskLevel, outcome, probability, nodeTypeId (e.g., "decision-launch", "option-approve")
     * For entities: attributes, relationships, status, metadata, nodeTypeId (e.g., "entity-product", "entity-customer")
   - Ensure node titles are clear, descriptive, and meaningful
   - Use appropriate schemaId values: "deviation", "cause", "action", "process", "decision", "outcome", "entity", "risk", "control"
   - **CRITICAL: Schema Type Differentiation**: When multiple nodes share the same schemaId (e.g., "cause"), they MUST have different nodeTypeId values in their payload to differentiate them (e.g., "cause-man", "cause-machine", "cause-method", "cause-material", "cause-measurement", "cause-environment"). Never return nodes with the same schemaId and nodeTypeId unless they represent truly identical concepts.

2. **6M Root Cause Analysis**:
   - When root cause analysis is mentioned or implied, systematically apply 6M framework
   - **CRITICAL: Deviation Node Structure**:
     * Deviation nodes MUST have "parentId: null" (they are NOT parents of other nodes)
     * Deviation nodes are separate, standalone nodes that represent the problem/issue
     * Use edges (not parent-child relationships) to connect causes to deviations
   - Create nodes for each relevant 6M category:
     * schemaId: "cause" with nodeTypeId indicating the 6M category (e.g., "cause-man", "cause-machine", "cause-method")
     * Payload should include: type (man/machine/material/method/measurement/environment), category, impact, severity
     * **CRITICAL: Root cause nodes MUST have "parentId: null"** (they are NOT children of deviation)
   - Show relationships between 6M categories using edges:
     * Root causes can affect each other first (e.g., "cause-man" → "cause-machine" with relationTypeId: "affects" or "exacerbates")
     * Then root causes affect the deviation (e.g., "cause-man" → "deviation" with relationTypeId: "causes")
     * This creates a more accurate causal chain: causes can interact, then collectively cause the deviation
   - Map all causes to the main problem/deviation/issue using edges (NOT parent-child relationships)
   - Create action nodes that address the causes:
     * Action nodes should have "parentId: null" (or parentId pointing to the specific cause they address, but NOT the deviation)
     * Use edges to connect actions to causes or deviation (e.g., "action" → "cause" with relationTypeId: "addresses")
   - Use relation types: "causes", "affects", "exacerbates", "contributes-to", "triggers", "addresses"
   - **IMPORTANT**: For deviation/root cause analysis graphs, prefer edge-based relationships over parent-child hierarchy. Use parentId only for true hierarchical structures (like decision trees), not for causal relationships.

3. **Decision Builder Nodes**:
   - For decision scenarios, create decision nodes with:
     * schemaId: "decision"
     * Payload: decisionCriteria, options, riskAssessment, stakeholders
   - Create condition/option nodes for each decision path
   - Create outcome nodes for each possible result
   - Use parentId to show decision hierarchy
   - Use edges: "leads-to", "results-in", "triggers", "depends-on"

4. **Edge Generation - CRITICAL REQUIREMENTS**:
   - **MANDATORY**: Identify ALL relationships between nodes
   - **MANDATORY**: Create at least ONE edge for EVERY node you generate
   - **VALIDATION STEP**: After creating all nodes, go through each node ID and verify it appears in at least one edge (as source OR target)
   - Each edge MUST have: id, source, target, sourceSchema, sourceId, targetSchema, targetId, relationTypeId
   - Use meaningful relation types:
     * For connectivity: "connects-to", "links-to", "communicates-with", "attached-to"
     * For causality: "causes", "affects", "triggers", "exacerbates", "contributes-to"
     * For flow: "flows-to", "leads-to", "precedes", "follows"
     * For structure: "contains", "depends-on", "manages", "reports-to", "relates-to"
     * For decisions: "leads-to", "results-in", "triggers"
   - Ensure all source/target IDs reference valid node IDs
   - Create edges that show logical flow, causality, and dependencies
   - **IF YOU CREATE A NODE, YOU MUST CREATE AT LEAST ONE EDGE FOR IT - NO EXCEPTIONS**

5. **Industry Best Practices Integration**:
   - Apply industry-specific frameworks and standards
   - Use industry-standard terminology and classifications
   - Include regulatory compliance considerations when relevant
   - Reference best practices in node payloads and metadata

6. **Traceability and Connectivity**:
   - Every node and edge must be traceable back to the user prompt
   - Maintain logical flow and causality
   - Create hierarchical structures when appropriate (parent-child relationships using parentId)
   - **CRITICAL: No Orphaned Nodes - ABSOLUTE REQUIREMENT**: 
     * **EVERY SINGLE NODE MUST HAVE AT LEAST ONE EDGE** connecting it to at least one other node
     * **NO EXCEPTIONS** - If you create a node, you MUST create at least one edge for it
     * Before finalizing your output, verify that every node ID appears in at least one edge (either as source OR target)
     * If a node seems isolated, you MUST create appropriate edges to connect it (e.g., "connects-to", "relates-to", "affects", "depends-on", "influences", "links-to", "communicates-with")
     * **DO NOT create any node without creating at least one edge for it**
     * **VALIDATION CHECK**: Count your nodes, then count unique node IDs in your edges (sources + targets). Every node ID must appear in the edge list at least once.
   - Maintain consistency in naming conventions and ID patterns

7. **Metadata Generation**:
   - Generate nodeTypes array with unique types found in nodes
   - For 6M analysis, include nodeTypes for each 6M category
   - Each nodeType should have: id, label, color (Tailwind color name), icon (Lucide icon name)
   - Generate relationTypes array with all relationship types used in edges
   - Each relationType should have: id, label, color, icon
   - Generate schemas array for categorization (extract unique schemaId values from nodes)
   - Each schema should have: id, label, color, icon
   - Use appropriate colors and icons that match the domain and context

8. **Graph Structure Quality - VALIDATION REQUIREMENTS**:
   - Minimum 3 nodes required (unless user explicitly requests fewer)
   - **ABSOLUTE REQUIREMENT: Every node MUST have at least one edge**:
     * **BEFORE OUTPUT**: Count your nodes (N nodes)
     * **BEFORE OUTPUT**: Extract all unique node IDs from your edges (from both source and target fields)
     * **BEFORE OUTPUT**: Verify that every node ID appears in the edge list at least once
     * **IF ANY NODE IS MISSING FROM EDGES**: Create an edge for it immediately - use "connects-to", "relates-to", "links-to", or another appropriate relation type
     * **NO ORPHANED NODES ALLOWED** - Every node must be connected to the graph
   - All node IDs must be unique
   - All edge source/target must reference existing node IDs
   - All schemaIds in nodes should have corresponding entries in schemas array
   - All relationTypeIds in edges should have corresponding entries in relationTypes array
   - Avoid circular references unless they represent actual cycles in the domain
   - Create meaningful clusters and groupings through schemaId categorization
   - **Schema Type Differentiation**: When creating nodeTypes, ensure that nodes with the same schemaId but different nodeTypeId values are properly differentiated. For example, if you have a "cause" schema with types "man", "machine", "method", "material", "measurement", and "environment", create distinct nodeTypes for each (e.g., "cause-man", "cause-machine", etc.) rather than a single generic "cause" type.

OUTPUT FORMAT:
You MUST output ONLY valid JSON in this exact structure (no markdown, no explanations, no code blocks):
{
  "nodes": [
    {
      "id": "unique-id",
      "schemaId": "category",
      "title": "Descriptive Title",
      "incomplete": false,
      "parentId": null,
      "payload": {
        "nodeTypeId": "cause-man",
        "type": "man",
        "category": "Training Gap",
        "impact": "Medium",
        "severity": "High",
        "dateFound": "2025-01-22"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "sourceSchema": "source-category",
      "sourceId": "source-node-id",
      "targetSchema": "target-category",
      "targetId": "target-node-id",
      "relationTypeId": "relationship-type"
    }
  ],
  "nodeTypes": [
    {
      "id": "type-id",
      "label": "Type Label",
      "color": "red",
      "icon": "AlertTriangle"
    }
  ],
  "relationTypes": [
    {
      "id": "relation-id",
      "label": "Relation Label",
      "color": "blue",
      "icon": "ArrowRight"
    }
  ],
  "schemas": [
    {
      "id": "schema-id",
      "label": "Schema Label",
      "color": "green",
      "icon": "Network"
    }
  ]
}

VALIDATION RULES (MUST VERIFY BEFORE OUTPUT):
- Minimum 3 nodes required (unless explicitly fewer requested)
- **ABSOLUTE REQUIREMENT: All nodes must have at least one edge** - No orphaned nodes allowed
  * **VERIFICATION STEP**: For each node in your nodes array, check that its ID appears in at least one edge (either as source OR target)
  * **IF YOU FIND AN ORPHANED NODE**: Create an edge connecting it to the nearest related node immediately
  * **DO NOT OUTPUT** a graph with orphaned nodes - the system will reject it
- All node IDs must be unique strings
- All edge source/target must reference existing node IDs
- All schemaIds in nodes should exist in schemas array
- All relationTypeIds in edges should exist in relationTypes array
- **Payload MUST include nodeTypeId** - Every node's payload must contain a "nodeTypeId" field
- Nodes with the same schemaId must have different nodeTypeId values to differentiate them
- Payload should contain relevant domain-specific data
- Node titles should be descriptive and meaningful
- **FINAL CHECK**: Before outputting, verify: number of unique node IDs in edges >= number of nodes
- **CRITICAL: For deviation/root cause analysis graphs**:
  * Deviation nodes MUST have "parentId: null" (they are NOT parents)
  * Root cause nodes (schemaId: "cause") MUST have "parentId: null" (they are NOT children of deviation)
  * Action nodes (schemaId: "action") MUST have "parentId: null" (they are NOT children of deviation or causes)
  * Use edges to show relationships: causes → deviation (relationTypeId: "causes"), causes → causes (relationTypeId: "affects"/"exacerbates"), actions → causes/deviation (relationTypeId: "addresses")
  * DO NOT use parent-child hierarchy for deviation/root cause analysis - use edge-based relationships instead

EXAMPLES OF GOOD GRAPH STRUCTURES:

1. Process Flow:
   - Nodes: Process steps, decision points, outcomes
   - Edges: "flows-to", "leads-to", "triggers"
   - Schemas: "process", "decision", "outcome"

2. Cause-and-Effect:
   - Nodes: Root causes, contributing factors, effects, outcomes
   - Edges: "causes", "affects", "exacerbates", "contributes-to"
   - Schemas: "cause", "effect", "outcome"

3. Decision Tree:
   - Nodes: Decision points, conditions, outcomes
   - Edges: "leads-to", "triggers", "results-in"
   - Parent-child relationships for hierarchy

4. Organizational Structure:
   - Nodes: Departments, roles, responsibilities
   - Edges: "reports-to", "contains", "manages"
   - Schemas: "department", "role", "responsibility"

## EXAMPLES

**6M Root Cause Analysis Example**:
- Main node: Deviation/Issue (schemaId: "deviation", parentId: null) - NOT a parent node
- Cause nodes: Man causes (schemaId: "cause", nodeTypeId: "cause-man", parentId: null), Machine causes (nodeTypeId: "cause-machine", parentId: null), Method causes (nodeTypeId: "cause-method", parentId: null), etc.
  * All cause nodes have parentId: null (they are NOT children of deviation)
- Action nodes: Immediate, Corrective, Preventive actions (schemaId: "action", parentId: null)
  * Action nodes have parentId: null (they are NOT children of deviation or causes)
- Edges (NOT parent-child relationships):
  * Root causes can affect each other: "cause-man" → "cause-machine" (relationTypeId: "affects" or "exacerbates")
  * Root causes cause deviation: "cause-man" → "deviation" (relationTypeId: "causes"), "cause-machine" → "deviation" (relationTypeId: "causes")
  * Actions address causes: "action" → "cause-man" (relationTypeId: "addresses")
  * Actions address deviation: "action-immediate" → "deviation" (relationTypeId: "addresses")
- **Key Point**: Use edges to show relationships, NOT parent-child hierarchy. Deviation is a separate node connected via edges.

**Decision Tree Example**:
- Decision node: Main decision point (schemaId: "decision")
- Option nodes: Each possible choice (schemaId: "option", parentId: decision node id)
- Outcome nodes: Results of each option (schemaId: "outcome")
- Edges: Decision → options (relationTypeId: "leads-to"), Options → outcomes (relationTypeId: "results-in")

**Entity Relationship Example**:
- Entity nodes: All entities in the system (schemaId: "entity")
- Relationship edges: Show how entities relate (relationTypeId: "relates-to", "depends-on", "contains", etc.)

Remember: Generate comprehensive, meaningful graphs that accurately represent the user's intent, incorporate industry best practices, apply appropriate frameworks (6M when needed), and create traceable, logical relationships.`;

/**
 * Validate graph structure
 */
function validateGraphStructure(graphData: any): { valid: boolean; error?: string } {
  if (!graphData || typeof graphData !== 'object') {
    return { valid: false, error: 'Graph data must be an object' };
  }

  // Validate nodes
  if (!Array.isArray(graphData.nodes)) {
    return { valid: false, error: 'Graph must have a nodes array' };
  }

  if (graphData.nodes.length < 1) {
    return { valid: false, error: 'Graph must have at least 1 node' };
  }

  // Validate edges
  if (!Array.isArray(graphData.edges)) {
    return { valid: false, error: 'Graph must have an edges array' };
  }

  // Check for minimum requirements - ALL nodes must have at least one edge
  if (graphData.nodes.length > 1 && graphData.edges.length < 1) {
    return { valid: false, error: 'Graph with multiple nodes must have at least 1 edge' };
  }

  // Validate that every node has at least one edge (no orphaned nodes)
  // Only enforce this if there are multiple nodes and edges exist
  if (graphData.nodes.length > 1 && graphData.edges.length > 0) {
    const nodeEdgeCount = new Map<string, number>();
    for (const edge of graphData.edges) {
      if (edge.source && edge.target) {
        nodeEdgeCount.set(edge.source, (nodeEdgeCount.get(edge.source) || 0) + 1);
        nodeEdgeCount.set(edge.target, (nodeEdgeCount.get(edge.target) || 0) + 1);
      }
    }

    const orphanedNodes: string[] = [];
    for (const node of graphData.nodes) {
      const edgeCount = nodeEdgeCount.get(node.id) || 0;
      if (edgeCount === 0) {
        orphanedNodes.push(node.id);
      }
    }
    
    // Only fail if there are orphaned nodes AND we have edges (meaning some nodes are connected but others aren't)
    if (orphanedNodes.length > 0 && graphData.edges.length > 0) {
      return { 
        valid: false, 
        error: `The following nodes have no edges and are not connected to the graph: ${orphanedNodes.join(', ')}. All nodes must be connected with at least one edge.` 
      };
    }
  }

  // Validate node IDs are unique
  const nodeIds = new Set<string>();
  for (const node of graphData.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      return { valid: false, error: 'All nodes must have a valid string id' };
    }
    if (nodeIds.has(node.id)) {
      return { valid: false, error: `Duplicate node ID: ${node.id}` };
    }
    nodeIds.add(node.id);

    // Validate required node fields
    if (!node.schemaId || typeof node.schemaId !== 'string') {
      return { valid: false, error: `Node ${node.id} must have a valid schemaId` };
    }
    if (node.incomplete === undefined) {
      return { valid: false, error: `Node ${node.id} must have incomplete field` };
    }
    
    // Validate nodeTypeId in payload (make it optional but preferred)
    if (!node.payload || typeof node.payload !== 'object') {
      return { valid: false, error: `Node ${node.id} ("${node.title || 'unnamed'}") must have a payload object.` };
    }
    
    // nodeTypeId is preferred but not required - we can derive it from schemaId and type if missing
    if (!node.payload.nodeTypeId) {
      // Try to derive nodeTypeId from payload.type or schemaId
      const derivedNodeTypeId = node.payload.type 
        ? `${node.schemaId}-${node.payload.type}` 
        : node.schemaId;
      // Auto-fix: add nodeTypeId if missing
      node.payload.nodeTypeId = derivedNodeTypeId;
    }
    
    // Validate deviation/root cause analysis structure
    // For deviation nodes: must have parentId: null
    if (node.schemaId === 'deviation' && node.parentId !== null) {
      return { valid: false, error: `Deviation node ${node.id} ("${node.title || 'unnamed'}") must have parentId: null. Deviation nodes should not be parents of other nodes. Use edges to show relationships instead.` };
    }
    // For cause nodes: must have parentId: null (not children of deviation)
    if (node.schemaId === 'cause' && node.parentId !== null) {
      const parentNode = graphData.nodes.find((n: any) => n.id === node.parentId);
      if (parentNode && parentNode.schemaId === 'deviation') {
        return { valid: false, error: `Cause node ${node.id} ("${node.title || 'unnamed'}") must have parentId: null. Root cause nodes should not be children of deviation nodes. Use edges to show causal relationships instead (e.g., cause → deviation with relationTypeId: "causes").` };
      }
    }
    // For action nodes: should have parentId: null (or at most point to a cause, not deviation)
    if (node.schemaId === 'action' && node.parentId !== null) {
      const parentNode = graphData.nodes.find((n: any) => n.id === node.parentId);
      if (parentNode && parentNode.schemaId === 'deviation') {
        return { valid: false, error: `Action node ${node.id} ("${node.title || 'unnamed'}") should not have deviation as parent. Use edges to show relationships instead (e.g., action → deviation with relationTypeId: "addresses").` };
      }
    }
  }

  // Validate edges reference valid nodes
  for (const edge of graphData.edges) {
    if (!edge.source || !edge.target) {
      return { valid: false, error: 'All edges must have source and target' };
    }
    if (!nodeIds.has(edge.source)) {
      return { valid: false, error: `Edge references invalid source node: ${edge.source}` };
    }
    if (!nodeIds.has(edge.target)) {
      return { valid: false, error: `Edge references invalid target node: ${edge.target}` };
    }
    if (!edge.relationTypeId || typeof edge.relationTypeId !== 'string') {
      return { valid: false, error: 'All edges must have a valid relationTypeId' };
    }
  }

  // Validate optional metadata arrays if present
  if (graphData.nodeTypes && !Array.isArray(graphData.nodeTypes)) {
    return { valid: false, error: 'nodeTypes must be an array if provided' };
  }
  if (graphData.relationTypes && !Array.isArray(graphData.relationTypes)) {
    return { valid: false, error: 'relationTypes must be an array if provided' };
  }
  if (graphData.schemas && !Array.isArray(graphData.schemas)) {
    return { valid: false, error: 'schemas must be an array if provided' };
  }

  // Performance: Limit graph size to prevent DoS
  const MAX_NODES = 200;
  const MAX_EDGES = 500;
  if (graphData.nodes.length > MAX_NODES) {
    return { valid: false, error: `Graph exceeds maximum node limit of ${MAX_NODES}` };
  }
  if (graphData.edges.length > MAX_EDGES) {
    return { valid: false, error: `Graph exceeds maximum edge limit of ${MAX_EDGES}` };
  }

  return { valid: true };
}

/**
 * Process graph generation request
 */
export async function processGraphRequest(
  agent: any,
  requestData: AgentRequestData,
  baseUrl?: string
): Promise<AgentResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  // Get model from agent config (defined outside try block for use in catch block)
  const model = agent.model || 'gpt-4o';

  try {
    // Security: Validate agent configuration
    const agentValidation = validateAgentConfig(agent);
    if (!agentValidation.valid) {
      return {
        success: false,
        error: agentValidation.error || 'Invalid agent configuration',
      };
    }

    // Extract prompt from requestData
    let cleanPrompt = '';
    
    // Use body and extra_body from requestData if provided, otherwise calculate from formValues
    let bodyParams: Record<string, any> = requestData.body || {};
    let extraParams: Record<string, any> = requestData.extra_body || {};
    let promptParams: Record<string, any> = {};

    if (requestData.body || requestData.extra_body) {
      // Use provided body and extra_body
      bodyParams = requestData.body || {};
      extraParams = requestData.extra_body || {};
      
      // If formValues are provided, extract prompt params from fields that are not body/extra
      if (requestData.formValues) {
        const allParams = extractParametersBySectionId(agent, requestData.formValues);
        promptParams = allParams.prompt;
      }
    } else {
      // Fallback: If formValues are not provided but userPrompt is, parse userPrompt to extract formValues
      let parsedFormValues = requestData.formValues;
      if (!parsedFormValues && requestData.userPrompt) {
        parsedFormValues = parseUserPromptToFormValues(agent, requestData.userPrompt);
      }

      // Extract parameters from formValues based on sectionId
      if (parsedFormValues) {
        const params = extractParametersBySectionId(agent, parsedFormValues);
        bodyParams = params.body;
        extraParams = params.extra;
        promptParams = params.prompt;
      }
    }

    // Build prompt from promptParams (fields without sectionId or with other sectionId)
    if (Object.keys(promptParams).length > 0) {
      const promptParts: string[] = [];
      const promptComponents = agent.renderComponents
        ?.filter((comp: any) => {
          const fieldName = comp.name || comp.id;
          return promptParams[fieldName] !== undefined;
        })
        .sort((a: any, b: any) => (a.order || 999) - (b.order || 999)) || [];
      
      promptComponents.forEach((comp: any) => {
        const fieldName = comp.name || comp.id;
        const value = promptParams[fieldName];
        if (value) {
          const label = comp.label || fieldName;
          promptParts.push(`${label}: ${value}`);
        }
      });
      cleanPrompt = promptParts.join('\n\n');
    }

    // Fallback to userPrompt if no promptParams
    if (!cleanPrompt) {
      cleanPrompt = requestData.userPrompt || requestData.prompt || '';
      if (typeof cleanPrompt === 'string') {
        cleanPrompt = cleanPrompt.replace(/^(?:Prompt|User Prompt):\s*/i, '');
      }
    }

    // Security: Sanitize and validate prompt
    if (!cleanPrompt || typeof cleanPrompt !== 'string') {
      return {
        success: false,
        error: 'prompt is required and must be a string',
      };
    }

    cleanPrompt = sanitizePrompt(cleanPrompt);
    if (!cleanPrompt) {
      return {
        success: false,
        error: 'Prompt cannot be empty after sanitization',
      };
    }

    // Model is already defined at function scope

    // Build system prompt using centralized utility (handles preload routes internally)
    const { systemPrompt } = await buildSystemPrompt({
      agent,
      formValues: requestData.formValues,
      bodyParams,
      baseUrl,
    });

    // Call chat API using centralized utility (graph uses chat API with JSON format)
    const apiResult = await callChatApi({
      agent,
      systemPrompt,
      userPrompt: cleanPrompt,
      model,
      responseFormat: { type: 'json_object' }, // Force JSON output
    });

    if (!apiResult.success) {
      const errorMessage = apiResult.error || 'API call failed';
      
      // Log to AI_RESPONSE_LOG for visibility
      if (LOG_CONFIG[LogType.AI_RESPONSE_LOG]) {
        const errorDetails = {
          error: errorMessage,
          model,
          agentId: agent.id,
        };
        loggingCustom(
          LogType.AI_RESPONSE_LOG,
          'error',
          `Graph Generation API Error from ${model}:\n${JSON.stringify(errorDetails, null, 2)}`
        );
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    // The callChatApi already extracts JSON, but the AI might wrap it in markdown code blocks
    // Convert to string first, then extract JSON from markdown if needed
    let graphJsonString = typeof apiResult.data === 'string' ? apiResult.data : JSON.stringify(apiResult.data);
    
    // Strip markdown code blocks if present (AI sometimes wraps JSON in ```json ... ```)
    const extractedJson = extractJson(graphJsonString);
    if (extractedJson) {
      graphJsonString = extractedJson;
    }

    // Log AI response if enabled
    if (LOG_CONFIG[LogType.AI_RESPONSE_LOG]) {
      const responsePreview = truncateText(graphJsonString, 1000);
      loggingCustom(
        LogType.AI_RESPONSE_LOG,
        'info',
        `Graph Generation Response from ${model}:\n${responsePreview}`
      );
    }

    if (!graphJsonString) {
      const errorMessage = 'No graph data in response';
      
      // Log to AI_RESPONSE_LOG for visibility
      if (LOG_CONFIG[LogType.AI_RESPONSE_LOG]) {
        const errorDetails = {
          error: errorMessage,
          model,
          agentId: agent.id,
        };
        loggingCustom(
          LogType.AI_RESPONSE_LOG,
          'error',
          `Graph Generation Error from ${model}:\n${JSON.stringify(errorDetails, null, 2)}`
        );
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Parse the graph JSON (now that markdown is stripped)
    const graphParseResult = safeJsonParse(graphJsonString);
    if (!graphParseResult.success || !graphParseResult.data) {
      const errorMessage = graphParseResult.error || 'Invalid graph JSON format';
      const errorDetails = {
        error: errorMessage,
        rawResponse: truncateText(graphJsonString, 1000),
        model,
      };
      
      // Log to CLIENT_LOG for debugging
      loggingCustom(
        LogType.CLIENT_LOG,
        'error',
        `Graph JSON parse failed: ${errorMessage}\nRaw response: ${truncateText(graphJsonString, 500)}`
      );
      
      // Log to AI_RESPONSE_LOG for visibility
      if (LOG_CONFIG[LogType.AI_RESPONSE_LOG]) {
        loggingCustom(
          LogType.AI_RESPONSE_LOG,
          'error',
          `Graph Generation Error from ${model}:\n${JSON.stringify(errorDetails, null, 2)}`
        );
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    const graphData = graphParseResult.data;

    // Log graph structure for debugging
    if (isDevelopment) {
      loggingCustom(
        LogType.CLIENT_LOG,
        'info',
        `Graph structure: ${graphData.nodes?.length || 0} nodes, ${graphData.edges?.length || 0} edges`
      );
    }

    // Validate graph structure - collect warnings instead of failing
    const validation = validateGraphStructure(graphData);
    const warnings: string[] = [];
    
    if (!validation.valid && validation.error) {
      // Log the validation issue as a warning (non-blocking)
      const warningMessage = validation.error;
      const warningDetails = {
        warning: warningMessage,
        nodeCount: graphData.nodes?.length || 0,
        edgeCount: graphData.edges?.length || 0,
        nodeIds: graphData.nodes?.map((n: any) => n.id) || [],
        edgeSources: graphData.edges?.map((e: any) => e.source) || [],
        edgeTargets: graphData.edges?.map((e: any) => e.target) || [],
        model,
      };
      
      // Add warning to array
      warnings.push(warningMessage);
      
      // Log to CLIENT_LOG for debugging
      loggingCustom(
        LogType.CLIENT_LOG,
        'warn',
        `Graph validation warning: ${JSON.stringify(warningDetails, null, 2)}\nGraph data preview: ${truncateText(JSON.stringify(graphData, null, 2), 1000)}`
      );
      
      // Log to AI_RESPONSE_LOG for visibility
      if (LOG_CONFIG[LogType.AI_RESPONSE_LOG]) {
        loggingCustom(
          LogType.AI_RESPONSE_LOG,
          'warn',
          `Graph Generation Validation Warning from ${model}:\n${JSON.stringify(warningDetails, null, 2)}`
        );
      }
    }

    // Format response data for AiBuilderResponseData structure
    const responseData = {
      graph: graphData,
      format: 'graph' as const,
      model,
      timing: apiResult.timing,
    };

    // Extract token usage from API result
    const tokenUsage = apiResult.tokenUsage || null;

    return {
      success: true,
      data: {
        response: JSON.stringify(responseData, null, 2), // Stringify for consistency with other agent types
        format: 'graph' as const,
        tokenUsage,
        timing: apiResult.timing,
        warnings: warnings.length > 0 ? warnings : undefined, // Include warnings if any
        agent: {
          id: agent.id,
          label: agent.label,
          description: agent.description,
          requiredOutputFormat: 'graph' as const,
          nextAction: agent.nextAction,
        },
      },
    };
  } catch (error) {
    const errorMessage = sanitizeErrorMessage(error, isDevelopment);
    const errorDetails = {
      error: errorMessage,
      originalError: error instanceof Error ? error.message : String(error),
      model,
      agentId: agent.id,
    };
    
    // Log to CLIENT_LOG for debugging
    if (isDevelopment) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error in graph generation request: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Log to AI_RESPONSE_LOG for visibility
    if (LOG_CONFIG[LogType.AI_RESPONSE_LOG]) {
      loggingCustom(
        LogType.AI_RESPONSE_LOG,
        'error',
        `Graph Generation Exception from ${model}:\n${JSON.stringify(errorDetails, null, 2)}`
      );
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

