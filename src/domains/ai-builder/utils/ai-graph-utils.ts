/**
 * AI Graph Utilities
 * Handles graph generation requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { extractParametersBySectionId, parseUserPromptToFormValues } from './ai-shared-utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType, LOG_CONFIG } from '@/gradian-ui/shared/configs/log-config';
import { getGeneralSystemPrompt } from './ai-general-utils';
import { truncateText } from '@/domains/chat/utils/text-utils';
import {
  sanitizePrompt,
  getApiKey,
  sanitizeErrorMessage,
  safeJsonParse,
} from './ai-security-utils';
import {
  createAbortController,
  parseErrorResponse,
  buildTimingInfo,
  validateAgentConfig,
} from './ai-common-utils';

/**
 * Comprehensive Graph Generation Prompt
 * Instructs AI to generate structured graph data with nodes, edges, and metadata
 * Includes industry best practices, 6M root cause analysis, and decision builder capabilities
 * Note: Current date/time is provided via GENERAL_SYSTEM_PROMPT
 */
const GRAPH_GENERATION_PROMPT = `You are an Advanced Graph Structure Intelligence Model with deep expertise in industry best practices, root cause analysis, and decision-making frameworks.

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
   - Create nodes for each relevant 6M category:
     * schemaId: "cause" with nodeTypeId indicating the 6M category (e.g., "cause-man", "cause-machine", "cause-method")
     * Payload should include: type (man/machine/material/method/measurement/environment), category, impact, severity
   - Show relationships between 6M categories (e.g., "affects", "exacerbates", "contributes-to")
   - Map all causes to the main problem/deviation/issue
   - Create action nodes that address the causes
   - Use relation types: "causes", "affects", "exacerbates", "contributes-to", "triggers"

3. **Decision Builder Nodes**:
   - For decision scenarios, create decision nodes with:
     * schemaId: "decision"
     * Payload: decisionCriteria, options, riskAssessment, stakeholders
   - Create condition/option nodes for each decision path
   - Create outcome nodes for each possible result
   - Use parentId to show decision hierarchy
   - Use edges: "leads-to", "results-in", "triggers", "depends-on"

4. **Edge Generation**:
   - Identify ALL relationships between nodes
   - Each edge MUST have: id, source, target, sourceSchema, sourceId, targetSchema, targetId, relationTypeId
   - Use meaningful relation types:
     * For causality: "causes", "affects", "triggers", "exacerbates", "contributes-to"
     * For flow: "flows-to", "leads-to", "precedes", "follows"
     * For structure: "contains", "depends-on", "manages", "reports-to"
     * For decisions: "leads-to", "results-in", "triggers"
   - Ensure all source/target IDs reference valid node IDs
   - Create edges that show logical flow, causality, and dependencies

5. **Industry Best Practices Integration**:
   - Apply industry-specific frameworks and standards
   - Use industry-standard terminology and classifications
   - Include regulatory compliance considerations when relevant
   - Reference best practices in node payloads and metadata

6. **Traceability and Connectivity**:
   - Every node and edge must be traceable back to the user prompt
   - Maintain logical flow and causality
   - Create hierarchical structures when appropriate (parent-child relationships using parentId)
   - **CRITICAL: No Orphaned Nodes**: ALL nodes MUST have at least one edge connecting them to other nodes. No node should exist without any relations. Every node must be part of the connected graph structure. If a node seems isolated, create appropriate edges to connect it to the graph (e.g., "relates-to", "affects", "depends-on", "influences").
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

8. **Graph Structure Quality**:
   - Minimum 3 nodes required (unless user explicitly requests fewer)
   - **CRITICAL: All nodes must have edges**: Every node MUST have at least one edge connecting it to at least one other node. There should be NO isolated nodes in the graph.
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

VALIDATION RULES:
- Minimum 3 nodes required (unless explicitly fewer requested)
- **CRITICAL: All nodes must have at least one edge** - No orphaned nodes allowed
- All node IDs must be unique strings
- All edge source/target must reference existing node IDs
- All schemaIds in nodes should exist in schemas array
- All relationTypeIds in edges should exist in relationTypes array
- **Payload MUST include nodeTypeId** - Every node's payload must contain a "nodeTypeId" field
- Nodes with the same schemaId must have different nodeTypeId values to differentiate them
- Payload should contain relevant domain-specific data
- Node titles should be descriptive and meaningful

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
- Main node: Deviation/Issue (schemaId: "deviation")
- Cause nodes: Man causes (schemaId: "cause", nodeTypeId: "cause-man"), Machine causes (nodeTypeId: "cause-machine"), Method causes (nodeTypeId: "cause-method"), etc.
- Action nodes: Immediate, Corrective, Preventive actions (schemaId: "action")
- Edges: All causes → deviation (relationTypeId: "causes"), Deviation → actions (relationTypeId: "triggers")

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
  const nodeEdgeCount = new Map<string, number>();
  for (const edge of graphData.edges) {
    nodeEdgeCount.set(edge.source, (nodeEdgeCount.get(edge.source) || 0) + 1);
    nodeEdgeCount.set(edge.target, (nodeEdgeCount.get(edge.target) || 0) + 1);
  }

  for (const node of graphData.nodes) {
    const edgeCount = nodeEdgeCount.get(node.id) || 0;
    if (edgeCount === 0) {
      return { valid: false, error: `Node "${node.id}" has no edges. All nodes must be connected to the graph with at least one edge.` };
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

  try {
    // Security: Validate agent configuration
    const agentValidation = validateAgentConfig(agent);
    if (!agentValidation.valid) {
      return {
        success: false,
        error: agentValidation.error || 'Invalid agent configuration',
      };
    }

    // Security: Get API key with validation
    const apiKeyResult = getApiKey();
    if (!apiKeyResult.key) {
      return {
        success: false,
        error: apiKeyResult.error || 'LLM_API_KEY is not configured',
      };
    }
    const apiKey = apiKeyResult.key;

    // Extract prompt from requestData
    let cleanPrompt = '';
    
    // Use body and extra_body from requestData if provided, otherwise calculate from formValues
    let bodyParams: Record<string, any> = {};
    let extraParams: Record<string, any> = {};
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

    // Get model from agent config
    const model = agent.model || 'gpt-4o';

    // Get API URL based on agent type (graph generation uses chat API)
    const apiUrl = getApiUrlForAgentType('chat');

    // Track timing
    const startTime = Date.now();

    // Performance: Use shared AbortController utility
    const { controller, timeoutId } = createAbortController(120000); // 120 seconds

    try {
      // Build system prompt with general system prompt (date/time context) and graph generation instructions
      const systemPrompt = getGeneralSystemPrompt() + (agent.systemPrompt || '') + '\n\n' + GRAPH_GENERATION_PROMPT;

      // Build request body
      const requestBody = {
        model,
        messages: [
          {
            role: 'system' as const,
            content: systemPrompt,
          },
          {
            role: 'user' as const,
            content: cleanPrompt,
          },
        ],
        response_format: { type: 'json_object' }, // Force JSON output
      };

      // Log request body (mask sensitive data in production)
      if (isDevelopment) {
        loggingCustom(
          LogType.AI_BODY_LOG,
          'info',
          `Graph Generation Request to ${apiUrl}: ${JSON.stringify(requestBody, null, 2)}`
        );
      }

      // Call LLM API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Security: Use shared error parsing utility
        const errorMessage = await parseErrorResponse(response);
        
        if (isDevelopment) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Graph generation API error: ${errorMessage}`);
        }

        return {
          success: false,
          error: sanitizeErrorMessage(errorMessage, isDevelopment),
        };
      }

      // Security: Use safe JSON parsing
      const responseText = await response.text();
      const parseResult = safeJsonParse(responseText);
      
      if (!parseResult.success || !parseResult.data) {
        return {
          success: false,
          error: parseResult.error || 'Invalid response format from graph generation service',
        };
      }

      const data = parseResult.data;

      // Extract content from response (OpenAI format)
      let graphJsonString = '';
      if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
        const choice = data.choices[0];
        if (choice.message && choice.message.content) {
          graphJsonString = choice.message.content;
        }
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
        return {
          success: false,
          error: 'No graph data in response',
        };
      }

      // Parse the graph JSON
      const graphParseResult = safeJsonParse(graphJsonString);
      if (!graphParseResult.success || !graphParseResult.data) {
        return {
          success: false,
          error: graphParseResult.error || 'Invalid graph JSON format',
        };
      }

      const graphData = graphParseResult.data;

      // Validate graph structure
      const validation = validateGraphStructure(graphData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid graph structure',
        };
      }

      // Performance: Use shared timing utility
      const timing = buildTimingInfo(startTime);

      // Format response data for AiBuilderResponseData structure
      const responseData = {
        graph: graphData,
        format: 'graph' as const,
        model,
        timing,
      };

      // Extract token usage if available
      const tokenUsage = data.usage ? {
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0,
        pricing: null, // Will be calculated by chat utils if needed
      } : null;

      return {
        success: true,
        data: {
          response: JSON.stringify(responseData, null, 2), // Stringify for consistency with other agent types
          format: 'graph' as const,
          tokenUsage,
          timing,
          agent: {
            id: agent.id,
            label: agent.label,
            description: agent.description,
            requiredOutputFormat: 'graph' as const,
            nextAction: agent.nextAction,
          },
        },
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        if (isDevelopment) {
          loggingCustom(LogType.CLIENT_LOG, 'error', `Request timeout in graph generation API: ${fetchError.message}`);
        }
        return {
          success: false,
          error: sanitizeErrorMessage('Request timeout', isDevelopment),
        };
      }

      throw fetchError;
    }
  } catch (error) {
    if (isDevelopment) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `Error in graph generation request: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}

