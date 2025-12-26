/**
 * AI Orchestrator Utilities
 * Handles orchestrator agent requests with complexity analysis, todo generation, and agent chaining
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { processAiAgent } from './ai-agent-utils';
import { getApiUrlForAgentType } from './ai-agent-url';
import { sanitizePrompt, getApiKey, sanitizeErrorMessage, safeJsonParse } from './ai-security-utils';
import { createAbortController, parseErrorResponse, buildTimingInfo } from './ai-common-utils';
import { getGeneralSystemPrompt } from './ai-general-utils';
import type { Todo, AgentChainStep } from '@/domains/chat/types';
import fs from 'fs';
import path from 'path';

// Cache for agents list
let cachedAgents: any[] | null = null;
let agentsCacheTime: number = 0;
const AGENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Retry utility function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries (default: 3)
 * @param initialDelay Initial delay in ms (default: 1000)
 * @returns Result of the function
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate exponential backoff delay: initialDelay * 2^attempt
      const delay = initialDelay * Math.pow(2, attempt);
      
      // Log retry attempt
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms. Error: ${lastError.message}`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed');
}

/**
 * Load AI agents from JSON file with caching
 */
function loadAiAgents(): any[] {
  const now = Date.now();
  
  if (cachedAgents !== null && (now - agentsCacheTime) < AGENTS_CACHE_TTL) {
    return cachedAgents;
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'ai-agents.json');
    const resolvedPath = path.resolve(dataPath);
    const dataDir = path.resolve(process.cwd(), 'data');
    
    if (!resolvedPath.startsWith(dataDir)) {
      console.error('Invalid agents file path');
      return [];
    }
    
    if (!fs.existsSync(resolvedPath)) {
      cachedAgents = [];
      agentsCacheTime = now;
      return cachedAgents;
    }
    
    const fileContents = fs.readFileSync(resolvedPath, 'utf8');
    const parseResult = safeJsonParse(fileContents, 10 * 1024 * 1024); // 10MB max
    
    if (!parseResult.success || !Array.isArray(parseResult.data)) {
      console.error('Invalid agents file format');
      return [];
    }
    
    cachedAgents = parseResult.data;
    agentsCacheTime = now;
    return cachedAgents;
  } catch (error) {
    console.error('Error loading AI agents:', error);
    return [];
  }
}

/**
 * Check if the user prompt is a general question/FAQ that should be answered directly
 */
async function isGeneralQuestion(
  userPrompt: string,
  availableAgents: any[]
): Promise<{ isGeneral: boolean; response?: string }> {
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    return { isGeneral: false };
  }

  const agentsList = availableAgents
    .filter(a => a.id !== 'orchestrator')
    .map(a => `- ${a.id}: ${a.label} - ${a.description}`)
    .join('\n');

  const detectionPrompt = `Analyze this user message and determine if it's a general question, FAQ, or informational request that should be answered directly without using specific agents.

User Message: "${userPrompt}"

Available Agents:
${agentsList}

Examples of general questions that should be answered directly:
- "How can I ask a question?"
- "What are your capabilities?"
- "What can you do?"
- "How does this work?"
- "What agents are available?"
- "How do I use the orchestrator?"
- General explanations, help requests, or FAQ-style questions
- Questions about the system itself or how to interact with it

Examples that require agents:
- "Summarize this text" (requires professional-writing agent)
- "Generate an image of a cat" (requires image-generator agent)
- "Analyze this process" (requires process-analyst agent)
- Specific tasks that need agent execution

Respond with JSON:
{
  "isGeneral": true/false,
  "reasoning": "Brief explanation"
}

If isGeneral is true, I will answer the question directly. If false, proceed with agent analysis.`;

  const messages = [
    {
      role: 'system' as const,
      content: getGeneralSystemPrompt() + 'You are an expert at distinguishing between general informational questions and specific task requests that require agent execution.',
    },
    {
      role: 'user' as const,
      content: detectionPrompt,
    },
  ];

  const apiUrl = getApiUrlForAgentType('chat');
  const { controller, timeoutId } = createAbortController(15000); // 15 seconds

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyResult.key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error detecting general question:', errorText);
      return { isGeneral: false };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { isGeneral: false };
    }

    const result = safeJsonParse(jsonMatch[0]);
    if (!result.success) {
      return { isGeneral: false };
    }

    const parsed = result.data as { isGeneral: boolean; reasoning?: string };
    
    if (parsed.isGeneral) {
      // Answer the general question directly
      const answerPrompt = `You are a helpful AI assistant that can answer general questions about the system, provide guidance, and explain capabilities.

Available Agents:
${agentsList}

User Question: "${userPrompt}"

Provide a helpful, clear, and concise answer to the user's question. If the question is about available agents or capabilities, mention the relevant agents. Be friendly and informative.

IMPORTANT: At the end of your response, add 2-4 relevant hashtags that summarize the topic or category of your answer. Use hashtags like #help, #guidance, #capabilities, #faq, #agents, etc. Place them at the end of your response on a new line or inline if appropriate.`;

      const answerMessages = [
        {
          role: 'system' as const,
          content: getGeneralSystemPrompt() + `You are a helpful AI orchestrator assistant. You can answer general questions, provide guidance, explain how to use the system, and describe available capabilities.

You have access to various specialized agents that can:
- Generate content (text, images, videos)
- Analyze data and processes
- Transcribe audio
- Review code
- And much more

When answering questions about capabilities, mention relevant agents. When answering general questions, be helpful and informative.

IMPORTANT: At the end of your response, add 2-4 relevant hashtags that summarize the topic or category of your answer. Use hashtags like #help, #guidance, #capabilities, #faq, #agents, etc. Place them at the end of your response on a new line or inline if appropriate.`,
        },
        {
          role: 'user' as const,
          content: answerPrompt,
        },
      ];

      // Create a new AbortController for the answer fetch
      const { controller: answerController, timeoutId: answerTimeoutId } = createAbortController(30000); // 30 seconds

      try {
        const answerResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKeyResult.key}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: answerMessages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
          signal: answerController.signal,
        });

        clearTimeout(answerTimeoutId);

        if (answerResponse.ok) {
          const answerData = await answerResponse.json();
          const answerContent = answerData.choices?.[0]?.message?.content || '';
          return { isGeneral: true, response: answerContent };
        }
      } catch (answerError: any) {
        if (answerError.name !== 'AbortError') {
          console.error('Error answering general question:', answerError);
        }
        // Fall through to return isGeneral: false if answer fails
      }
    }

    return { isGeneral: false };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('General question detection aborted');
    } else {
      console.error('Error detecting general question:', error);
    }
    return { isGeneral: false };
  }
}

/**
 * Analyze complexity of user request using LLM
 */
async function analyzeComplexity(
  userPrompt: string,
  availableAgents: any[],
  systemPrompt?: string
): Promise<{ complexity: number; needsTodos: boolean; suggestedAgents: string[]; noRelevantAgents?: boolean }> {
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    throw new Error(apiKeyResult.error || 'LLM_API_KEY is not configured');
  }

  const agentsList = availableAgents
    .filter(a => a.id !== 'orchestrator') // Exclude orchestrator itself
    .map(a => {
      // Extract renderComponents that have sectionId "body" or "extra"
      const bodyFields = (a.renderComponents || []).filter((comp: any) => comp.sectionId === 'body');
      const extraFields = (a.renderComponents || []).filter((comp: any) => comp.sectionId === 'extra');
      
      let agentInfo = `- ${a.id}: ${a.label} (${a.agentType || 'chat'}) - ${a.description}`;
      
      // Add form field information if available
      if (bodyFields.length > 0 || extraFields.length > 0) {
        agentInfo += '\n  Configurable options:';
        if (bodyFields.length > 0) {
          agentInfo += `\n    Body fields: ${bodyFields.map((f: any) => `${f.name} (${f.component})`).join(', ')}`;
        }
        if (extraFields.length > 0) {
          agentInfo += `\n    Extra fields: ${extraFields.map((f: any) => `${f.name} (${f.component})`).join(', ')}`;
        }
      }
      
      return agentInfo;
    })
    .join('\n');

  const analysisPrompt = `Analyze the complexity of this user request and determine if it requires multiple agents or a todo list.

User Request: "${userPrompt}"

Available Agents:
${agentsList}

CRITICAL: Only suggest agents that are ACTUALLY RELEVANT to the user's request. If the user's request doesn't match any available agent's capabilities, return an empty suggestedAgents array.

Respond with a JSON object:
{
  "complexity": 0.0-1.0, // 0 = simple (single agent), 1 = very complex (multiple agents, todos needed)
  "needsTodos": true/false, // Whether a todo list should be created
  "suggestedAgents": ["agent-id-1", "agent-id-2"], // List of agent IDs that should be used. EMPTY ARRAY if no agents match the request.
  "reasoning": "Brief explanation",
  "noRelevantAgents": true/false // Set to true if no available agents can handle this request
}

Consider:
- Simple requests (complexity < 0.3): Single agent, no todos
- Medium requests (0.3-0.7): May need 2-3 agents, conditional chaining
- Complex requests (> 0.7): Multiple agents, todos required, approval needed
- If the request doesn't match any agent's capabilities, set noRelevantAgents: true and suggestedAgents: []`;

  const messages = [
    {
      role: 'system' as const,
      content: getGeneralSystemPrompt() + (systemPrompt || 'You are an AI orchestration expert that analyzes request complexity.'),
    },
    {
      role: 'user' as const,
      content: analysisPrompt,
    },
  ];

  const apiUrl = getApiUrlForAgentType('chat');
  const { controller, timeoutId } = createAbortController(30000); // 30 seconds

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyResult.key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage || 'Failed to analyze complexity');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from complexity analysis');
    }

    // Extract JSON from content - handle markdown code blocks or plain JSON
    let jsonContent = content.trim();
    
    // Try to extract JSON from markdown code blocks
    const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonBlockMatch) {
      jsonContent = jsonBlockMatch[1];
    } else {
      // Try to find JSON object in the content
      const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonContent = jsonObjectMatch[0];
      }
    }

    const parsed = safeJsonParse(jsonContent, 10000);
    if (!parsed.success) {
      // Log the actual content for debugging
      console.error('Failed to parse complexity analysis response. Content:', content.substring(0, 500));
      console.error('Extracted JSON:', jsonContent.substring(0, 500));
      console.error('Parse error:', parsed.error);
      throw new Error(`Failed to parse complexity analysis response: ${parsed.error || 'Invalid JSON format'}`);
    }

    const analysis = parsed.data;
    
    // Filter suggested agents to only include those that actually exist
    const validSuggestedAgents = Array.isArray(analysis.suggestedAgents) 
      ? analysis.suggestedAgents.filter((agentId: string) => 
          availableAgents.some(a => a.id === agentId && a.id !== 'orchestrator')
        )
      : [];
    
    return {
      complexity: Math.min(1.0, Math.max(0.0, analysis.complexity || 0.5)),
      needsTodos: analysis.needsTodos || analysis.complexity > 0.7,
      suggestedAgents: validSuggestedAgents,
      noRelevantAgents: analysis.noRelevantAgents === true || validSuggestedAgents.length === 0,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Complexity analysis timeout');
    }
    throw error;
  }
}

/**
 * Generate todo list from user prompt and available agents
 */
async function generateTodoList(
  userPrompt: string,
  suggestedAgents: string[],
  availableAgents: any[],
  systemPrompt?: string
): Promise<Todo[]> {
  const apiKeyResult = getApiKey();
  if (!apiKeyResult.key) {
    throw new Error(apiKeyResult.error || 'LLM_API_KEY is not configured');
  }

  // If no suggested agents, return empty array
  if (!suggestedAgents || suggestedAgents.length === 0) {
    return [];
  }

  const agentsInfo = availableAgents
    .filter(a => suggestedAgents.includes(a.id))
    .map(a => {
      // Extract renderComponents that have sectionId "body" or "extra"
      const bodyFields = (a.renderComponents || []).filter((comp: any) => comp.sectionId === 'body');
      const extraFields = (a.renderComponents || []).filter((comp: any) => comp.sectionId === 'extra');
      
      return {
        id: a.id,
        label: a.label,
        type: a.agentType || 'chat',
        description: a.description,
        // Include form fields/options that can be configured
        formFields: {
          body: bodyFields.map((comp: any) => ({
            id: comp.id,
            name: comp.name,
            label: comp.label,
            component: comp.component,
            options: comp.options || [],
            defaultValue: comp.defaultValue,
            placeholder: comp.placeholder,
            description: comp.description,
          })),
          extra: extraFields.map((comp: any) => ({
            id: comp.id,
            name: comp.name,
            label: comp.label,
            component: comp.component,
            options: comp.options || [],
            defaultValue: comp.defaultValue,
            placeholder: comp.placeholder,
            description: comp.description,
          })),
        },
      };
    });

  const todoPrompt = `Based on this user request, create a detailed todo list that breaks down the work into steps, each assigned to an appropriate agent.

User Request: "${userPrompt}"

Available Agents:
${JSON.stringify(agentsInfo, null, 2)}

CRITICAL RULE - NO CONSECUTIVE SAME AGENT:
- NEVER create two consecutive todos that use the same agentId
- If multiple tasks would require the same agent, combine them into a SINGLE todo with a comprehensive, well-crafted user prompt that covers all aspects
- Create a better, more detailed user prompt that encompasses all related tasks for that agent
- This ensures efficient execution and avoids redundant agent calls
- Example: Instead of two "professional-writing" todos, create one todo with a combined prompt like "First, summarize the document, then translate it to Spanish, ensuring the summary is clear and the translation is accurate"

CRITICAL: Each agent has renderComponents (formFields) that represent configurable parameters. You MUST analyze the user request and extract appropriate parameter values.

KEYWORD DETECTION RULES (PRIORITY ORDER - CHECK IN THIS ORDER):
1. IMAGE GENERATION (HIGHEST PRIORITY):
   - If user mentions "sketch", "sketch image", "drawing", "pencil drawing", "create sketch", "generate sketch", "sketch of", "visual sketch" → MUST use "image-generator" agent with "imageType": "sketch"
   - If user mentions "image", "generate image", "create image", "picture" → use "image-generator" agent
   - For image-generator: detect image types like "infographic", "3d-model", "creative", "iconic", "editorial", "comic-book", "blueprint", "portrait", "landscape", "fashion", "cinematic", "isometric", "vector-illustration", "architectural", "product-photography", "tilt-shift", "polaroid", "lego-style", "disney", "red-dead", "gta-style", "xray", "mindmap", "timeline", "dashboard", "negative-space", "abstract", "retro", "poster", "photocopy", "newspaper", "collage", "paper-craft", "mockup", "persian", "hollywood-movie", "new-york", "cyberpunk", "retro-miami" and set "imageType" accordingly
   - CRITICAL: "sketch" keyword ALWAYS means image generation, NOT process analysis. Use "image-generator" agent, NOT "process-analyst"

1.5. GRAPH GENERATION (HIGH PRIORITY - AFTER IMAGE):
   - If user mentions "graph", "create graph", "generate graph", "graph visualization", "relationship graph", "entity graph", "dependency graph" → use "graph-generator" agent
   - If user mentions "root cause analysis", "6M", "6M model", "root cause", "cause and effect", "fishbone", "Ishikawa" → use "graph-generator" agent (applies 6M framework)
   - If user mentions "decision tree", "decision graph", "decision builder", "decision flow", "decision analysis" → use "graph-generator" agent
   - If user mentions "entity relationship", "ER diagram", "relationship mapping", "entity mapping", "system relationships" → use "graph-generator" agent
   - If user mentions "process flow graph", "workflow graph", "process visualization" → use "graph-generator" agent
   - For graph-generator: The agent will automatically apply 6M framework for root cause analysis, decision trees for decisions, and entity mapping for relationships

2. WRITING/TRANSLATION:
   - If user mentions "summarize", "summary", "summarizer" → use professional-writing agent with "writingStyle": "summarizer"
   - If user mentions "translate", "translation" → use professional-writing agent with "writingStyle": "translate"
   - If user mentions "extended", "expand", "elaborate" → use professional-writing agent with "writingStyle": "extended"
   - If user mentions "professional", "formal" → use professional-writing agent with "writingStyle": "professional"
   - If user mentions "casual", "informal" → use professional-writing agent with "writingStyle": "casual"
   - If user mentions "solution", "advisor", "best practices" → use professional-writing agent with "writingStyle": "solution-advisor"

3. OTHER AGENTS:
   - For any agent: extract text values from user prompt for text/textarea fields
   - For select fields: match user intent to available options and use the option "id" value

PARAMETER EXTRACTION:
- Analyze the user request carefully to identify which parameters should be set
- For each agent's formFields, determine if the user's request implies specific values
- Extract values from the user prompt that match field names, labels, placeholders, or descriptions
- Set parameters in the "input" field structure:
  * Fields with sectionId "body" → go in "input.body"
  * Fields with sectionId "extra" → go in "input.extra_body"
  * Use the field "name" (not "id") as the key in the input object
  * For select fields, use the option "id" value (not the label)
  * For text/textarea fields, extract relevant text from the user prompt that matches the field's purpose
  * Match field labels, placeholders, and descriptions to user intent (e.g., if field label is "Process Description" and user says "analyze this process", extract the process description)

FIELD DETECTION RULES:
- **Text/Textarea Fields**: Look for fields that match the main content of the user's request:
  * Common field names: "prompt", "userPrompt", "description", "content", "text", "input", "query", "question"
  * Process-related: "processDescription", "processSteps", "processChallenges", "workflowDescription"
  * Analysis-related: "incidentDescription", "codeInput", "dataInput", "analysisRequest"
  * Creative: "imageDescription", "graphDescription", "presentationTopic", "documentContent"
  * Improvement: "pointsToImprove", "areasToEnhance", "feedback"
  * Match field labels, placeholders, and descriptions to extract appropriate values from user prompt
- **Select Fields**: Match user intent to available options:
  * Look for keywords in user prompt that match option labels
  * Use the option "id" value (not label) in the input
  * If user intent is unclear, choose the most appropriate default option
- **Checkbox/Radio Fields**: Set boolean or option values based on user intent
- **If field purpose is unclear**: Extract text from user prompt that seems most relevant to the field's label/description

DEPENDENCY-DRIVEN PARAMETERS (AUTO-FILL FROM PREVIOUS TODO OUTPUT):
**CRITICAL: You MUST determine when a todo should use previous output vs fresh user input.**

**When to Use Previous Output ({"__fromDependency": true, "source": "previous-output"}):**
- **ALWAYS use for todos that have dependencies** (except the first todo in the chain)
- **Use when the todo is clearly a continuation or processing of previous output**, such as:
  * Second todo that processes/transforms output from first todo
  * Analysis of previous step's output
  * Translation/summarization of previous content
  * Enhancement/improvement of previous output
  * Format conversion (e.g., text → image, text → graph)
  * Any step that builds upon or uses previous step's result
- **Field names that typically use previous output** (when todo has dependencies):
  * "prompt", "userPrompt", "description", "content", "text", "input", "query"
  * "processDescription", "processSteps", "codeInput", "incidentDescription"
  * "imageDescription", "graphDescription", "documentContent"
  * Any text/textarea field that represents the main input for the agent
- **Detection logic**:
  1. If todo has dependencies (not the first todo) AND the field is a main input field (text/textarea)
  2. AND the user request suggests processing/transforming previous output
  3. THEN use {"__fromDependency": true, "source": "previous-output"}
  4. Example: "translate the summary" → second todo uses previous output for "userPrompt" field

**When to Use Fresh User Input (explicit text value):**
- **ALWAYS use for the FIRST todo** in the chain (no dependencies)
- **Use when user explicitly provides new/different input** for that step
- **Use when the step requires specific user-provided information** that's different from previous output
- **Use when user mentions specific details** that should override previous output
- Example: First todo always uses user's original prompt; subsequent todos use previous output unless user specifies otherwise

**Decision Process:**
1. Check if todo has dependencies (if not, use fresh input)
2. Identify the main input field(s) for the agent (usually text/textarea fields)
3. Analyze user request: Does it suggest processing previous output or using new input?
4. If processing previous output → use {"__fromDependency": true, "source": "previous-output"}
5. If using new input → extract and use explicit text from user prompt
6. For non-main fields (selects, checkboxes, etc.), always extract from user prompt or use defaults

Create a JSON array of todos:
[
  {
    "title": "Step description",
    "description": "Detailed description",
    "agentId": "agent-id",
    "agentType": "agent-type",
    "dependencies": ["previous-todo-id"], // REQUIRED: Each todo (except the first) must depend on the previous todo in the array
    "input": { // REQUIRED when agent has formFields - extract from user prompt
      "body": { // Values for fields with sectionId "body"
        "fieldName": "value" // Use field "name" as key, e.g., "imageType": "sketch", "writingStyle": "summarizer"
      },
      "extra_body": { // Values for fields with sectionId "extra"
        "fieldName": "value"
      }
    }
  }
]

DEPENDENCY RULES (CRITICAL):
- The FIRST todo in the array should have "dependencies": [] (empty array)
- Each SUBSEQUENT todo MUST have "dependencies": ["id-of-previous-todo"]
- Dependencies must reference the actual "id" field of the previous todo in the array
- Example: If first todo has id "todo-1", second todo should have "dependencies": ["todo-1"]
- This creates a sequential execution chain where each todo waits for the previous one

Order todos logically. Each todo should be assigned to one of the available agents.
CRITICAL: Check that no two consecutive todos have the same agentId. If they would, combine them into one todo with a comprehensive prompt.
ALWAYS include "input" field with appropriate parameters when the agent has formFields and the user request implies specific values.
CRITICAL: When user mentions "sketch" or "sketch image", ALWAYS use "image-generator" agent, NOT "process-analyst".`;

  const messages = [
    {
      role: 'system' as const,
      content: getGeneralSystemPrompt() + (systemPrompt || `You are an AI orchestration expert that creates detailed todo lists for multi-agent workflows.

## CRITICAL RULES

### 1. NO CONSECUTIVE SAME AGENT
Never create consecutive todos with the same agentId. If multiple tasks require the same agent, combine them into a single todo with a comprehensive, well-crafted user prompt that covers all related aspects.

### 2. DEPENDENCIES ARE REQUIRED
Each todo (except the first) MUST have dependencies set to the previous todo's ID. The first todo has empty dependencies [].

### 3. AGENT SELECTION RULES (PRIORITY ORDER)

**CRITICAL: Always read agent descriptions carefully. Each agent has a specific purpose and output format.**

#### A. IMAGE/VIDEO GENERATION (HIGHEST PRIORITY)
- **Keywords**: "sketch", "sketch image", "drawing", "pencil drawing", "create sketch", "generate sketch", "visual sketch", "image", "generate image", "create image", "picture", "visual", "infographic", "3d model", "creative image", "iconic", "editorial", "comic book"
- **Agent**: "image-generator"
- **Output**: Image files (PNG/URL)
- **CRITICAL**: "sketch" ALWAYS means visual artwork/image generation, NEVER process analysis. Use "image-generator", NOT "process-analyst"
- **For videos**: "video", "generate video", "create video" → use "video-generator"

#### A.5. GRAPH GENERATION (HIGH PRIORITY - AFTER IMAGE/VIDEO)
- **Keywords**: "graph", "create graph", "generate graph", "graph visualization", "relationship graph", "entity graph", "dependency graph", "root cause analysis", "6M", "6M model", "root cause", "cause and effect", "fishbone", "Ishikawa", "decision tree", "decision graph", "decision builder", "decision flow", "decision analysis", "entity relationship", "ER diagram", "relationship mapping", "entity mapping", "system relationships", "process flow graph", "workflow graph", "process visualization"
- **Agent**: "graph-generator"
- **Output**: Graph data with nodes and edges (graph format)
- **Capabilities**: 
  * Automatically applies 6M root cause analysis framework when root cause analysis is mentioned
  * Creates decision trees for decision-making scenarios
  * Maps entity relationships for complex systems
  * Compares with industry best practices
- **NOT for**: Image generation, video generation, or text processing

#### B. TEXT PROCESSING/WRITING
- **Keywords**: "summarize", "summary", "summarizer", "translate", "translation", "improve text", "enhance writing", "grammar", "professional writing", "casual writing", "extended", "expand text", "solution advisor"
- **Agent**: "professional-writing"
- **Output**: Enhanced text (string format)
- **NOT for**: Code review, data analysis, or schema creation

#### C. CODE REVIEW
- **Keywords**: "code review", "review code", "analyze code", "code security", "code quality", "refactor code", "secure code"
- **Agent**: "code-review-agent"
- **Output**: Code review report with secure rewrites
- **NOT for**: Text processing, data analysis, or schema creation

#### D. DATA ANALYSIS
- **Keywords**: "analyze data", "data analysis", "analyze this data", "data insights", "statistical analysis", "data patterns"
- **Context**: If user provides raw data (tables, JSON, CSV) → use "data-analysis-expert"
- **Context**: If analyzing preloaded system data → use "general-assistant"
- **Output**: Data analysis reports (markdown)

#### E. SCHEMA CREATION
- **Keywords**: "create schema", "database schema", "form schema", "data model", "entity", "create form", "app builder"
- **Agent**: "app-builder"
- **Output**: JSON schema objects
- **NOT for**: Process documentation, code generation, or data analysis

#### F. PROCESS DOCUMENTATION
- **Keywords**: "process documentation", "process analysis", "workflow", "process flow", "procedure", "SOP", "GMP process", "ISO process"
- **Agent**: "process-analyst"
- **Output**: Process documentation (markdown with Mermaid diagrams)
- **NOT for**: Employee performance, code review, or BPMN XML generation

#### G. BPMN WORKFLOW GENERATION
- **Keywords**: "BPMN", "workflow engine", "executable process", "Camunda", "Flowable", "process definition", "BPMN XML"
- **Agent**: "business-process-generator"
- **Output**: BPMN 2.0 XML
- **NOT for**: Process documentation (use process-analyst)

#### H. EMPLOYEE PERFORMANCE
- **Keywords**: "employee KPI", "performance review", "employee performance", "KPI generation", "performance metrics"
- **Agent**: "performance-manager"
- **Output**: Table format with KPIs
- **NOT for**: Process documentation or general HR tasks

#### I. QUALITY DEVIATION ANALYSIS
- **Keywords**: "deviation", "non-conformance", "quality issue", "CAPA", "GMP deviation", "pharmaceutical quality" (when user wants text report)
- **Agent**: "quality-assurance-analyst"
- **Output**: Deviation analysis report (markdown)
- **NOT for**: Process documentation, employee performance, or graph visualization
- **CRITICAL**: If user wants "root cause analysis graph" or "6M graph" or "visualize root causes", use "graph-generator" instead

#### J. OOX PHARMACEUTICAL ANALYSIS
- **Keywords**: "OOS", "OOT", "OOE", "out of specification", "out of trend", "out of expectation", "pharmaceutical OOX"
- **Agent**: "oox-analyzer-quality-control"
- **Output**: OOX analysis report
- **NOT for**: General deviation analysis (use quality-assurance-analyst)

#### K. VOICE TRANSCRIPTION
- **Keywords**: "transcribe", "audio to text", "speech to text", "voice transcription", "audio transcription"
- **Agent**: "voice-transcription"
- **Output**: Transcribed text

#### L. PRESENTATION SLIDES
- **Keywords**: "presentation", "slides", "slide deck", "presentation slides"
- **Agent**: "presentation-slide-creator"
- **Output**: Slide content (markdown)

#### M. AI AGENT CREATION
- **Keywords**: "create AI agent", "build agent", "new agent", "agent configuration"
- **Agent**: "ai-agent-builder"
- **Output**: AI agent JSON configuration

#### N. GENERAL BUSINESS ANALYSIS
- **Keywords**: "analyze system", "business analysis", "system insights", "organizational analysis" (when analyzing preloaded data)
- **Agent**: "general-assistant"
- **Output**: Business analysis report (markdown)

### 4. AGENT SELECTION DECISION PROCESS

1. **Check keywords in user request** - Match against agent descriptions and keywords above
2. **Read agent descriptions** - Each agent description clearly states "Use for:" and "NOT for:"
3. **Consider output format** - Match required output (JSON, string, table, image, video) to agent capabilities
4. **Priority order** - Image/video generation has highest priority, then specific domain agents, then general agents
5. **When in doubt** - Re-read agent descriptions. Each description explicitly states use cases and exclusions.

### 5. EXAMPLES OF CORRECT AGENT SELECTION

- "create a sketch of a cat" → image-generator (imageType: "sketch")
- "sketch image of a building" → image-generator (imageType: "sketch")
- "create a root cause analysis graph for quality deviation" → graph-generator (applies 6M framework)
- "generate a 6M analysis graph" → graph-generator (applies 6M framework)
- "create a decision tree for product launch" → graph-generator (creates decision tree)
- "map entity relationships in supply chain" → graph-generator (entity relationship mapping)
- "analyze this process" → process-analyst (process documentation)
- "summarize this text" → professional-writing (writingStyle: "summarizer")
- "review this code" → code-review-agent
- "create employee KPIs" → performance-manager
- "analyze this data table" → data-analysis-expert
- "create a schema for products" → app-builder

### 6. PARAMETER EXTRACTION AND FIELD DETECTION

**CRITICAL: You MUST extract appropriate parameter values from the user request and populate agent formFields correctly.**

#### A. FIELD DETECTION PROCESS

1. **Examine Agent formFields**: Each agent has formFields (body and extra_body sections) that define configurable parameters
2. **Match User Intent to Fields**: 
   - Read field labels, placeholders, and descriptions
   - Match user's request content to appropriate fields
   - Extract relevant text/values from user prompt
3. **Field Types**:
   - **Text/Textarea**: Extract text from user prompt that matches field purpose
   - **Select**: Match user keywords to option labels, use option "id" value
   - **Checkbox/Radio**: Set boolean or option values based on user intent

#### B. COMMON FIELD NAMES TO DETECT

**Main Input Fields** (usually text/textarea):
- "prompt", "userPrompt", "description", "content", "text", "input", "query", "question"
- "processDescription", "processSteps", "processChallenges", "workflowDescription"
- "incidentDescription", "codeInput", "dataInput", "analysisRequest"
- "imageDescription", "graphDescription", "presentationTopic", "documentContent"
- "pointsToImprove", "areasToEnhance", "feedback"

**Configuration Fields** (usually select):
- "imageType", "writingStyle", "language", "format", "type", "style"
- Match user keywords to available options

#### C. DEPENDENCY-DRIVEN PARAMETERS (CRITICAL)

**When to Use Previous Output** ({"__fromDependency": true, "source": "previous-output"}):
- **ALWAYS for todos with dependencies** (except first todo)
- **When todo processes/transforms previous output**:
  * Translation, summarization, enhancement of previous content
  * Format conversion (text → image, text → graph)
  * Analysis of previous step's output
  * Any continuation or building upon previous result
- **For main input fields** (text/textarea) in dependent todos
- **Example**: Todo 1 generates text → Todo 2 translates it → Todo 2's "userPrompt" field uses previous output

**When to Use Fresh User Input** (explicit text value):
- **ALWAYS for FIRST todo** (no dependencies)
- **When user provides specific new input** for that step
- **When step requires different information** than previous output
- **Example**: First todo always uses user's original prompt text

**Decision Algorithm**:
1. Is this the first todo? → Use fresh user input
2. Does todo have dependencies? → Check step 3
3. Is the field a main input field (text/textarea)? → Check step 4
4. Does user request suggest processing previous output? → Use {"__fromDependency": true, "source": "previous-output"}
5. Otherwise → Extract explicit text from user prompt

#### D. PARAMETER EXTRACTION EXAMPLES

**Example 1**: User says "summarize this document about quality control"
- Agent: professional-writing
- Field: "userPrompt" → Extract: "this document about quality control"
- Field: "writingStyle" → Set: "summarizer" (from keyword "summarize")

**Example 2**: User says "create a sketch of a pharmaceutical lab"
- Agent: image-generator
- Field: "imageDescription" → Extract: "a pharmaceutical lab"
- Field: "imageType" → Set: "sketch" (from keyword "sketch")

**Example 3**: Two-step chain - "analyze this process, then create a graph"
- Todo 1: process-analyst, "processDescription": "this process" (fresh input)
- Todo 2: graph-generator, "graphDescription": {"__fromDependency": true, "source": "previous-output"} (uses Todo 1 output)

**Example 4**: Two-step chain - "translate this text to Spanish, then summarize it"
- Todo 1: professional-writing, "userPrompt": "this text", "writingStyle": "translate", "targetLanguage": "Spanish"
- Todo 2: professional-writing, "userPrompt": {"__fromDependency": true, "source": "previous-output"}, "writingStyle": "summarizer"

### 7. CRITICAL REMINDERS

- **ALWAYS populate "input" field** when agent has formFields
- **ALWAYS use field "name"** (not "id") as the key in input.body or input.extra_body
- **ALWAYS check field labels/descriptions** to understand what to extract
- **ALWAYS use {"__fromDependency": true}** for dependent todos' main input fields (unless user specifies otherwise)
- **ALWAYS extract from user prompt** for first todo and when user provides specific input`),
    },
    {
      role: 'user' as const,
      content: todoPrompt,
    },
  ];

  const apiUrl = getApiUrlForAgentType('chat');
  // Increased timeout to 45 seconds to reduce timeout errors
  const { controller, timeoutId } = createAbortController(45000);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyResult.key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage || 'Failed to generate todos');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from todo generation');
    }

    // Extract JSON from content - handle markdown code blocks or plain JSON
    let jsonContent = content.trim();
    
    // Try to extract JSON from markdown code blocks first
    const jsonBlockMatch = jsonContent.match(/```(?:json)?\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*```/);
    if (jsonBlockMatch) {
      jsonContent = jsonBlockMatch[1];
    } else {
      // Try to find JSON array start (todos are usually arrays)
      const arrayStart = jsonContent.indexOf('[');
      const objectStart = jsonContent.indexOf('{');
      
      if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
        // Extract from array start
        jsonContent = jsonContent.substring(arrayStart);
      } else if (objectStart !== -1) {
        // Extract from object start
        jsonContent = jsonContent.substring(objectStart);
      }
    }

    // Helper function to fix incomplete JSON
    const tryFixIncompleteJson = (json: string): string => {
      let fixed = json.trim();
      
      // Remove incomplete property at the end (e.g., "ag" or incomplete strings)
      // Pattern: incomplete property like "ag" without closing quote and value
      fixed = fixed.replace(/,\s*"[^"]*$/, ''); // Remove incomplete quoted property name
      fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, ''); // Remove incomplete property with value
      fixed = fixed.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]+$/, ''); // Remove incomplete property with incomplete value
      
      // Remove trailing incomplete string values
      fixed = fixed.replace(/:\s*"[^"]*$/, ': ""'); // Replace incomplete string with empty string
      
      // Count brackets and braces to ensure they're balanced
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      
      // Close incomplete objects/arrays (close braces first, then brackets)
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
      }
      
      return fixed;
    };

    // Try parsing the extracted JSON
    let parsed = safeJsonParse(jsonContent, 100000);
    
    // If parsing fails, try to fix incomplete JSON
    if (!parsed.success) {
      console.warn('Initial JSON parse failed, attempting to fix incomplete JSON...');
      const fixedJson = tryFixIncompleteJson(jsonContent);
      parsed = safeJsonParse(fixedJson, 100000);
      
      if (!parsed.success) {
        // Log the actual content for debugging
        console.error('Failed to parse todo generation response. Content length:', content.length);
        console.error('Content preview:', content.substring(0, 1000));
        console.error('Extracted JSON length:', jsonContent.length);
        console.error('Extracted JSON preview:', jsonContent.substring(0, 1000));
        console.error('Fixed JSON length:', fixedJson.length);
        console.error('Fixed JSON preview:', fixedJson.substring(0, 1000));
        console.error('Parse error:', parsed.error);
        throw new Error(`Failed to parse todo generation response: ${parsed.error || 'Invalid JSON format'}`);
      }
    }

    // Extract todos array (might be wrapped in an object)
    const todosData = parsed.data;
    const todosArray = Array.isArray(todosData) 
      ? todosData 
      : Array.isArray(todosData.todos) 
        ? todosData.todos 
        : [];

    // Convert to Todo format with ULIDs
    const { ulid } = await import('ulid');
    const todosWithIds = todosArray.map((todo: any, index: number) => ({
      id: ulid(),
      title: todo.title || 'Untitled Todo',
      description: todo.description,
      status: 'pending' as const,
      agentId: todo.agentId,
      agentType: todo.agentType,
      dependencies: todo.dependencies || [],
      input: todo.input || undefined, // Preserve input field (body/extra_body configuration)
      createdAt: new Date().toISOString(),
    }));

    // Post-process todos: Fix dependencies (agent selection is handled by improved system prompt)
    const processedTodos = todosWithIds.map((todo: Todo, index: number) => {
      // Fix dependencies: If empty or invalid, set based on order
      let dependencies: string[] = [];
      if (index > 0) {
        // Each todo should depend on the previous one
        dependencies = [todosWithIds[index - 1].id];
      }

      // If dependencies were provided, try to normalize them
      if (todo.dependencies && todo.dependencies.length > 0) {
        const normalizedDeps = todo.dependencies.map((dep: string) => {
          // Check if dependency is a step reference (Step 1, Step 2, etc.)
          const stepMatch = dep.match(/^Step\s*(\d+)$/i);
          if (stepMatch) {
            const stepIndex = parseInt(stepMatch[1], 10) - 1; // Convert to 0-based index
            if (stepIndex >= 0 && stepIndex < todosWithIds.length) {
              return todosWithIds[stepIndex].id;
            }
          }

          // Check if dependency is a numeric index (1, 2, 3, etc.)
          const numMatch = dep.match(/^(\d+)$/);
          if (numMatch) {
            const depIndex = parseInt(numMatch[1], 10) - 1; // Convert to 0-based index
            if (depIndex >= 0 && depIndex < todosWithIds.length) {
              return todosWithIds[depIndex].id;
            }
          }

          // Check if dependency matches a todo title
          const matchingTodo = todosWithIds.find((t: Todo) => t.title === dep);
          if (matchingTodo) {
            return matchingTodo.id;
          }

          // Check if dependency is already a valid todo ID
          const existingTodo = todosWithIds.find((t: Todo) => t.id === dep);
          if (existingTodo) {
            return dep; // Already a valid ID
          }

          // If no match found, return original (will be caught by validation)
          return dep;
        }).filter((dep): dep is string => Boolean(dep));
        
        // Use normalized dependencies if valid, otherwise use order-based
        if (normalizedDeps.length > 0) {
          dependencies = normalizedDeps;
        }
      }

      return {
        ...todo,
        dependencies,
      };
    });

    return processedTodos;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Todo generation timeout after 45 seconds');
    }
    throw error;
  }
}

/**
 * Execute agent chain conditionally
 */
async function executeAgentChain(
  todos: Todo[],
  availableAgents: any[],
  initialInput: string,
  baseUrl?: string
): Promise<{ todos: Todo[]; finalOutput: any }> {
  let currentInput = initialInput;
  // Initialize completedTodos with todos that are already completed
  const completedTodos = new Set<string>(
    todos.filter(t => t.status === 'completed').map(t => t.id)
  );

  // Validate all dependencies exist before execution
  const validateDependencies = () => {
    const todoMap = new Map<string, Todo>();
    todos.forEach(t => {
      todoMap.set(t.id, t);
      if (t.title) todoMap.set(t.title, t);
    });

    for (const todo of todos) {
      if (todo.dependencies && todo.dependencies.length > 0) {
        for (const dep of todo.dependencies) {
          if (!todoMap.has(dep)) {
            throw new Error(`Todo ${todo.id} has invalid dependency: ${dep} (dependency does not exist)`);
          }
        }
      }
    }
  };

  // Validate dependencies first
  validateDependencies();

  // Execute todos in dependency order
  const executeTodo = async (todo: Todo): Promise<any> => {
    // Check dependencies
    if (todo.dependencies && todo.dependencies.length > 0) {
      const unmetDeps: string[] = [];
      
      for (const dep of todo.dependencies) {
        // Find the dependency todo by ID (most common) or by title
        const depTodo = todos.find(t => t.id === dep) || todos.find(t => t.title === dep);
        
        if (depTodo) {
          // Check if dependency is completed (either in current execution or from previous execution)
          const isCompleted = completedTodos.has(depTodo.id) || depTodo.status === 'completed';
          if (isCompleted) {
          continue; // Dependency is met
          }
        }
        
        // Dependency is unmet (either not found or not completed)
        unmetDeps.push(dep);
      }
      
      if (unmetDeps.length > 0) {
        throw new Error(`Todo ${todo.id} has unmet dependencies: ${unmetDeps.join(', ')}`);
      }
    }

    const agent = availableAgents.find(a => a.id === todo.agentId);
    if (!agent) {
      throw new Error(`Agent ${todo.agentId} not found`);
    }

    // Store execution metadata in todo
    const executedAt = new Date().toISOString();
    todo.chainMetadata = {
      input: currentInput,
      executedAt,
    };

    try {
      // Prepare request data with body/extra_body from todo input
      const requestData: AgentRequestData = {
        userPrompt: currentInput,
      };

      // If todo has input with body/extra_body, include them in the request
      if (todo.input) {
        if (todo.input.body) {
          requestData.body = todo.input.body;
        }
        if (todo.input.extra_body) {
          requestData.extra_body = todo.input.extra_body;
        }
      }

      const result = await processAiAgent(agent, requestData, baseUrl);

      if (!result.success) {
        const errorMessage = result.error || 'Agent execution failed';
        todo.status = 'failed';
        todo.output = errorMessage; // Save error as output for tooltip
        todo.chainMetadata.error = errorMessage;
        throw new Error(errorMessage);
      }

      // Extract token usage, duration, cost, and response format from result
      const tokenUsage = result.data?.tokenUsage || null;
      const cost = tokenUsage?.pricing?.total_cost || null;
      const responseFormat = result.data?.format || agent.requiredOutputFormat || 'string';
      const duration = result.data?.timing?.duration || null;

      const output = result.data?.response || result.data;
      currentInput = typeof output === 'string' 
        ? output 
        : JSON.stringify(output);
      
      completedTodos.add(todo.id);
      todo.status = 'completed';
      todo.completedAt = executedAt;
      todo.output = output;
      todo.chainMetadata.output = output;
      todo.tokenUsage = tokenUsage;
      todo.duration = duration;
      todo.cost = cost;
      todo.responseFormat = responseFormat;

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      todo.status = 'failed';
      todo.output = errorMessage; // Save error as output for tooltip
      todo.chainMetadata.error = errorMessage;
      throw error;
    }
  };

  // Topological sort of todos by dependencies using Kahn's algorithm
  // Dependencies can be either IDs or titles, so check both
  const todoMap = new Map<string, Todo>();
  todos.forEach(t => {
    todoMap.set(t.id, t);
    if (t.title) todoMap.set(t.title, t);
  });

  // Build dependency graph
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();
  
  todos.forEach(todo => {
    inDegree.set(todo.id, 0);
    graph.set(todo.id, []);
  });

  todos.forEach(todo => {
    if (todo.dependencies && todo.dependencies.length > 0) {
      todo.dependencies.forEach(dep => {
        const depTodo = todoMap.get(dep);
        if (depTodo) {
          const current = inDegree.get(todo.id) || 0;
          inDegree.set(todo.id, current + 1);
          const depList = graph.get(depTodo.id) || [];
          depList.push(todo.id);
          graph.set(depTodo.id, depList);
        }
      });
    }
  });

  // Kahn's algorithm for topological sort
  const sortedTodos: Todo[] = [];
  const queue: Todo[] = todos.filter(t => (inDegree.get(t.id) || 0) === 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    sortedTodos.push(current);
    
    const dependents = graph.get(current.id) || [];
    dependents.forEach(depId => {
      const currentInDegree = inDegree.get(depId) || 0;
      inDegree.set(depId, currentInDegree - 1);
      if (currentInDegree - 1 === 0) {
        const depTodo = todos.find(t => t.id === depId);
        if (depTodo) queue.push(depTodo);
      }
    });
  }

  // Check for circular dependencies
  if (sortedTodos.length !== todos.length) {
    const unsortedIds = todos
      .filter(t => !sortedTodos.some(st => st.id === t.id))
      .map(t => t.id);
    throw new Error(`Circular dependency detected. Affected todos: ${unsortedIds.join(', ')}`);
  }

  // Execute all todos
  for (const todo of sortedTodos) {
    if (todo.status === 'pending') {
      await executeTodo(todo);
    }
  }

  return {
    todos,
    finalOutput: currentInput,
  };
}

/**
 * Process orchestrator request
 */
export async function processOrchestratorRequest(
  agentId: string,
  requestData: AgentRequestData,
  baseUrl?: string,
  chatId?: string
): Promise<AgentResponse> {
  try {
    if (!requestData.userPrompt) {
      return {
        success: false,
        error: 'userPrompt is required',
      };
    }

    const userPrompt = sanitizePrompt(requestData.userPrompt);
    if (!userPrompt) {
      return {
        success: false,
        error: 'Prompt cannot be empty after sanitization',
      };
    }

    // Load available agents
    const availableAgents = loadAiAgents();
    const orchestratorAgent = availableAgents.find(a => a.id === agentId) || {
      id: 'orchestrator',
      label: 'Orchestrator',
      agentType: 'orchestrator',
      complexityThreshold: 0.5,
    };

    const complexityThreshold = orchestratorAgent.complexityThreshold || 0.5;

    // Check if this is a general question that should be answered directly
    const generalQuestionCheck = await isGeneralQuestion(userPrompt, availableAgents);
    if (generalQuestionCheck.isGeneral && generalQuestionCheck.response) {
      return {
        success: true,
        data: {
          complexity: 0,
          executionType: 'guidance',
          response: generalQuestionCheck.response,
        },
      };
    }

    // Analyze complexity
    const analysis = await analyzeComplexity(
      userPrompt,
      availableAgents,
      orchestratorAgent.systemPrompt
    );

    // Check if no relevant agents were found
    if (analysis.noRelevantAgents || analysis.suggestedAgents.length === 0) {
      return {
        success: true,
        data: {
          complexity: analysis.complexity,
          executionType: 'guidance',
          response: `I understand your request, but I don't have any agents that are specifically designed to handle this task.

Could you please:
1. Rephrase your request to align with available agent capabilities, or
2. Be more specific about what you'd like to accomplish?

I'm here to help once I understand how to best assist you with the available tools.

#guidance #help #agents`,
        },
      };
    }

    // If simple request, execute directly with appropriate agent
    if (analysis.complexity < complexityThreshold && analysis.suggestedAgents.length === 1) {
      const agent = availableAgents.find(a => a.id === analysis.suggestedAgents[0]);
      if (agent) {
        const result = await processAiAgent(agent, requestData, baseUrl);
        return {
          ...result,
          data: {
            ...result.data,
            complexity: analysis.complexity,
            executionType: 'direct',
            agentUsed: agent.id,
          },
        };
      }
    }

    // Generate todos if needed
    let todos: Todo[] = [];
    if (analysis.needsTodos || analysis.complexity >= complexityThreshold) {
      // Retry todo generation up to 3 times with exponential backoff
      todos = await retryWithBackoff(
        () => generateTodoList(
        userPrompt,
        analysis.suggestedAgents,
        availableAgents,
        orchestratorAgent.systemPrompt
        ),
        3, // max retries
        2000 // initial delay: 2 seconds (will be 2s, 4s, 8s for retries)
      );
    }

    // If todos were generated, return them for approval
    // Otherwise, execute the chain directly
    if (todos.length > 0) {
      return {
        success: true,
        data: {
          complexity: analysis.complexity,
          executionType: 'todo_required',
          todos,
          suggestedAgents: analysis.suggestedAgents,
          message: 'Todo list generated. Please approve to execute.',
        },
      };
    }

    // Execute agent chain if no todos (simple multi-agent case)
    if (analysis.suggestedAgents.length > 1) {
      // Create simple todos for execution
      const { ulid } = await import('ulid');
      const simpleTodos: Todo[] = analysis.suggestedAgents.map((agentId, index) => ({
        id: ulid(),
        title: `Execute with ${agentId}`,
        agentId,
        status: 'pending',
        dependencies: index > 0 ? [analysis.suggestedAgents[index - 1]] : [],
        createdAt: new Date().toISOString(),
      }));

      const chainResult = await executeAgentChain(simpleTodos, availableAgents, userPrompt, baseUrl);

      return {
        success: true,
        data: {
          complexity: analysis.complexity,
          executionType: 'chain_executed',
          todos: chainResult.todos,
          finalOutput: chainResult.finalOutput,
        },
      };
    }

    // If we reach here but have no suggested agents, provide guidance
    if (analysis.suggestedAgents.length === 0) {
      return {
        success: true,
        data: {
          complexity: analysis.complexity,
          executionType: 'guidance',
          response: `I understand your request, but I don't have any agents that are specifically designed to handle this task.

Could you please:
1. Rephrase your request to align with available agent capabilities, or
2. Be more specific about what you'd like to accomplish?

I'm here to help once I understand how to best assist you with the available tools.`,
        },
      };
    }

    // Fallback: use first suggested agent (should not reach here if validation is correct)
    const fallbackAgent = availableAgents.find(a => a.id === analysis.suggestedAgents[0]);
    
    if (!fallbackAgent) {
      return {
        success: true,
        data: {
          complexity: analysis.complexity,
          executionType: 'guidance',
          response: `I apologize, but I couldn't find a suitable agent to handle your request.

Please try rephrasing your request or be more specific about what you'd like to accomplish.`,
        },
      };
    }

    const result = await processAiAgent(fallbackAgent, requestData, baseUrl);
    return {
      ...result,
      data: {
        ...result.data,
        complexity: analysis.complexity,
        executionType: 'direct',
        agentUsed: fallbackAgent.id,
      },
    };
  } catch (error) {
    console.error('Error in orchestrator:', error);
    return {
      success: false,
      error: sanitizeErrorMessage(error),
    };
  }
}

/**
 * Execute approved todos
 */
export async function executeApprovedTodos(
  todos: Todo[],
  availableAgents: any[],
  initialInput: string,
  baseUrl?: string
): Promise<AgentResponse> {
  try {
    const chainResult = await executeAgentChain(todos, availableAgents, initialInput, baseUrl);

    return {
      success: true,
      data: {
        executionType: 'chain_executed',
        todos: chainResult.todos,
        finalOutput: chainResult.finalOutput,
      },
    };
  } catch (error) {
    console.error('Error executing approved todos:', error);
    return {
      success: false,
      error: sanitizeErrorMessage(error),
    };
  }
}

