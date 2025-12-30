/**
 * AI Chat Utilities
 * Handles chat completion requests
 */

import { AgentRequestData, AgentResponse } from './ai-agent-utils';
import { validateAgentFormFields, buildStandardizedPrompt } from './prompt-builder';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType, LOG_CONFIG } from '@/gradian-ui/shared/configs/log-config';
import { truncateText } from '@/domains/chat/utils/text-utils';
import {
  sanitizePrompt,
  sanitizeErrorMessage,
  validateAgentId,
} from './ai-security-utils';
import {
  validateAgentConfig,
} from './ai-common-utils';
import { buildSystemPrompt } from './prompt-concatenation-utils';
import { callChatApi } from './ai-api-caller';
import { extractParametersBySectionId } from './ai-shared-utils';

// Performance: Cache AI models to avoid repeated API calls
let cachedModels: any[] | null = null;
let modelsCacheTime: number = 0;
const MODELS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * General Markdown Output Rules
 * This prompt is automatically appended to all chat agents with string output format
 * to ensure consistent, professional markdown formatting across all agents
 */
export const GENERAL_MARKDOWN_OUTPUT_RULES = `

---

## 📋 GENERAL MARKDOWN OUTPUT RULES

### 🎯 Quality & Structure
- **Length**: 1000-5000+ words (standard: 1000-2000, complex: 2000-5000+)
- **Depth**: 2-3 paragraphs per major section, 100-200 words per subsection
- **Coverage**: Comprehensive analysis with actionable insights
- **Hierarchy**: H1 (title) → H2 (sections) → H3/H4 (subsections), aim for 8-15+ major sections

### 📝 Formatting Rules

**Blockquotes (>)** - For warnings, important notes, critical info:
\`\`\`text
> ⚠️ **Warning:** Action cannot be undone.
> **Important:** Review requirements before proceeding.
\`\`\`

**Ordered Lists (1., 2., 3.)** - For sequential steps, procedures, numbered instructions

**Unordered Lists (- or *)** - For important points, features, considerations (no specific order)

**Task Lists (- [ ])** - For action items, follow-ups, tasks requiring completion

**Dividers (***)** - Separate completely different subjects/major topic changes (not minor subsections)

**Tables** - Always include header row, separator (\`| --- |\`), proper alignment (\`:---:\` center, \`---:\` right, \`:---\` left)

**Headings** - Use proper hierarchy (H1-H4), maintain consistent structure

### ✍️ Grammar & Diction
**Before finalizing, review:**
1. **Grammar**: Spelling, punctuation, capitalization, subject-verb agreement, tense consistency, pronoun agreement, sentence structure, parallel structure
2. **Diction**: Precise word choice, clarity, consistency, technical accuracy, active voice preference, avoid wordiness/ambiguity

**Common errors to fix:**
- Subject-verb disagreement, incorrect pronouns, tense inconsistency
- Dangling modifiers, run-on sentences, fragments
- Wordiness ("In order to" → "To"), vague language ("Things" → specific items)
- Incorrect word choice (Affect/Effect, Ensure/Insure, Compliment/Complement)

**Quality standard**: Publication-ready, zero grammar errors, professional diction

### ✅ Pre-Output Checklist
- [ ] Grammar & diction review complete
- [ ] Important notes in blockquotes (>)
- [ ] Sequential steps in ordered lists (1., 2., 3.)
- [ ] Important points in unordered lists (- or *)
- [ ] Action items in task lists (- [ ])
- [ ] Different subjects separated with dividers (***)
- [ ] Tables properly formatted
- [ ] Sections have detailed descriptions (2-3 paragraphs minimum)
- [ ] Length requirements met
- [ ] **NEVER use \`\`\`markdown code blocks** - use \`\`\`text or \`\`\`plaintext for examples

---

**Apply these rules to ALL string format outputs for professional, consistent markdown.**`;

/**
 * Reference and Source Citation Rules
 * This prompt is automatically appended to all chat agents with string output format
 * to ensure consistent, professional reference formatting when sources are used
 */
export const REFERENCE_PROMPT = `

## 📚 REFERENCES AND SOURCE CITATION RULES

**Include References section ONLY if you used external sources, RAG data, search results, regulatory guidelines, research papers, or any source material. If NO references were used, omit entirely.**

### 📋 Format Requirements

**Location**: FINAL section, after all content. Add divider \`***\` BEFORE References section.

**Output Format** (output ONCE only):
\`\`\`text
***
## References

| Source Title | Source Host | Source URL | Description |
| --- | --- | --- | --- |
| [Actual Title] | [Actual Host] | [Actual URL] | [How source was used] |
\`\`\`

**Table Columns:**
- **Source Title**: Actual document/article title (e.g., "FDA 21 CFR Part 211")
- **Source Host**: Domain/organization (e.g., "fda.gov", "ich.org")
- **Source URL**: Full URL to source
- **Description**: Brief description of how source was used

### 🚨 Critical Rules

1. **ONLY Actual Source Data**: NEVER create fake/placeholder sources. Use ONLY data from RAG inputs, search results, user context, preloaded data, or system context. If source info missing, state "Source information not available" rather than inventing.

2. **Complete Reference List**: Include ALL references used. Cite inline where used (format: \`[Source Title](Source URL) - Source Host\`). Include all RAG sources.

3. **RAG Handling**: MANDATORY - Use ALL RAG references throughout analysis. Display ALL in References table. Extract metadata (host, title, URL) when available.

4. **Single Section**: Output ONE References section with ONE divider (\`***\`) before it. Do NOT duplicate.

### ✅ Checklist
- [ ] References section is FINAL section (if references used)
- [ ] Divider \`***\` before References
- [ ] All used references included
- [ ] Only actual source data (no placeholders)
- [ ] References cited inline in content
- [ ] All RAG sources included
- [ ] Properly formatted markdown table

### 🚫 Avoid
- ❌ Fake/placeholder source information
- ❌ Omitting used references
- ❌ Including References when none used
- ❌ Placing References mid-document
- ❌ Duplicating References section/divider
- ❌ Missing inline citations

---

**If sources used → cite properly. If no sources → omit References section.**`;

/**
 * Mermaid Diagram Rules
 * This prompt is automatically appended to all chat agents with string output format
 * to ensure consistent, professional Mermaid diagram formatting
 */
export const MERMAID_RULES = `

---

## 📊 MERMAID DIAGRAM RULES

### 🎯 Diagram Type Selection
- **\`flowchart\`**: Process flows, workflows, sequential actions, decision trees
- **\`stateDiagram-v2\`**: State transitions, state machines, state-based workflows
- **\`mindmap\`**: Hierarchical information, concept mapping, knowledge organization
- **\`timeline\`**: Chronological sequences, historical events, project phases
- **\`journey\`**: User experiences, process experiences with actors

### 🚫 CRITICAL RULES (Apply to ALL diagram types)

**1. NO PARENTHESES RULE:**
- **NEVER use parentheses in node names, state names, labels, transition labels, action names, phase names, or any text content**
- **ONLY exception**: Flowchart shape syntax \`([Start])\` and \`([End])\` (shape delimiters, not content)
- Use underscores instead: \`State_With_Parentheses\` ✅, \`State(With)Parentheses\` ❌

**2. PIPE SYNTAX \`|Label|\` RULE:**
- **EXCLUSIVE to flowcharts ONLY**: \`Node1 -->|Label| Node2\` ✅
- **NEVER use in stateDiagram-v2, mindmap, timeline, or journey** - causes parse errors
- **StateDiagram-v2**: Use colon syntax \`State1 --> State2 : Label\` instead

**3. General Formatting:**
- Each statement on its own line with proper spacing
- Include all decision points, branches, alternative flows (not just happy paths)
- Wrap in \`\`\`mermaid code blocks
- Use descriptive labels (without parentheses)

### 📋 Syntax by Type

**Flowchart:**
\`\`\`mermaid
flowchart TD
    ([Start]) --> Step1[Action]
    Step1 --> Decision{Decision?}
    Decision -->|Yes| Step2[Action A]
    Decision -->|No| Step3[Action B]
    Step2 --> ([End])
\`\`\`
- Use \`flowchart TD\` (top-down) or \`flowchart LR\` (left-right)
- \`([Start])\` / \`([End])\` for rounded rectangles, \`{Decision}\` for diamonds, \`[Action]\` for rectangles
- Label edges: \`Node1 -->|Label| Node2\` (ONLY in flowcharts)

**StateDiagram-v2:**
\`\`\`mermaid
stateDiagram-v2
    [*] --> Initial_State
    Initial_State --> Processing_State
    Processing_State --> Success_State : Valid
    Processing_State --> Error_State : Invalid
    Success_State --> [*]
\`\`\`
- **ALWAYS use \`[*]\` for start/end states** (never "Start"/"End")
- **NEVER use spaces in node names** - use underscores: \`Check_Stop_Code\` ✅
- Label transitions: \`State1 --> State2 : Label\` (colon syntax, NOT \`|Label|\`)

**Mindmap:**
\`\`\`mermaid
mindmap
  Root_Subject
    Branch1
      Leaf1
      Leaf2
    Branch2
\`\`\`
- Use indentation (2 spaces per level) for hierarchy
- No parentheses, no \`|Label|\` syntax

**Timeline:**
\`\`\`mermaid
timeline
    title Timeline Title
    Phase_1 : Event_1
    Phase_2 : Event_2
             : Event_3
\`\`\`
- Always include \`title\`
- Use colons to separate phase from event
- No parentheses in phase/event names

**Journey:**
\`\`\`mermaid
journey
    title Journey Title
    section Section_Name
      Action_1: 5: Actor1
      Action_2: 3: Actor1, Actor2
\`\`\`
- Format: \`Action_Name: Score: Actor1, Actor2\`
- Score typically 1-5
- No parentheses in action/section/actor names

### 🚫 Common Mistakes
- ❌ Using parentheses in any content (except flowchart shape syntax)
- ❌ Using \`|Label|\` syntax in non-flowchart diagrams
- ❌ Spaces in stateDiagram-v2 node names (use underscores)
- ❌ Custom start/end labels instead of \`[*]\`
- ❌ Wrong diagram type for use case
- ❌ Incomplete diagrams (missing paths/decision points)
- ❌ Not closing code blocks properly

---

**Choose the right type, follow syntax rules, create complete diagrams with all paths.**`;

/**
 * Load AI models from API route with caching
 * Performance: Cache models to avoid repeated API calls
 * Works on both client and server side
 */
async function loadAiModels(): Promise<any[]> {
  const now = Date.now();
  
  // Return cached models if still valid
  if (cachedModels !== null && (now - modelsCacheTime) < MODELS_CACHE_TTL) {
    return cachedModels;
  }

  try {
    // Determine API base URL
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const apiUrl = `${baseUrl}/api/ai-models`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control for client-side requests
      cache: 'default',
    });

    if (!response.ok) {
      loggingCustom(LogType.INFRA_LOG, 'warn', `Failed to load AI models: ${response.status} ${response.statusText}`);
      cachedModels = [];
      modelsCacheTime = now;
      return cachedModels;
    }

    const result = await response.json();
    
    if (!result.success || !Array.isArray(result.data)) {
      loggingCustom(LogType.INFRA_LOG, 'warn', 'Invalid AI models API response format');
      cachedModels = [];
      modelsCacheTime = now;
      return cachedModels;
    }
    
    const models = result.data || [];
    cachedModels = models;
    modelsCacheTime = now;
    return models;
  } catch (error) {
    loggingCustom(LogType.INFRA_LOG, 'error', `Error loading AI models from API: ${error instanceof Error ? error.message : String(error)}`);
    cachedModels = [];
    modelsCacheTime = now;
    return cachedModels;
  }
}

/**
 * Calculate pricing for token usage
 */
async function calculatePricing(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): Promise<{
  inputPricePer1M: number;
  outputPricePer1M: number;
  inputPrice: number;
  outputPrice: number;
  totalPrice: number;
} | null> {
  const models = await loadAiModels();
  const model = models.find((m: any) => m.id === modelId);

  if (!model || !model.pricing) {
    return null;
  }

  const inputPricePerMillion = model.pricing.input || 0;
  const outputPricePerMillion = model.pricing.output || 0;

  // Calculate prices (pricing is per 1 million tokens)
  const inputPrice = (promptTokens / 1_000_000) * inputPricePerMillion;
  const outputPrice = (completionTokens / 1_000_000) * outputPricePerMillion;
  const totalPrice = inputPrice + outputPrice;

  return {
    inputPricePer1M: inputPricePerMillion,
    outputPricePer1M: outputPricePerMillion,
    inputPrice,
    outputPrice,
    totalPrice,
  };
}

/**
 * Process chat request
 */
export async function processChatRequest(
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

    // Validate form fields if renderComponents exist
    if (agent.renderComponents && requestData.formValues) {
      const validationErrors = validateAgentFormFields(agent, requestData.formValues);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          validationErrors,
        };
      }
    }

    // Build user prompt from form values or use provided userPrompt
    let userPrompt = requestData.userPrompt || '';
    
    if (requestData.formValues && agent.renderComponents) {
      const builtPrompt = buildStandardizedPrompt(agent, requestData.formValues);
      if (builtPrompt) {
        userPrompt = builtPrompt;
      }
    }

    // Security: Sanitize and validate prompt
    if (!userPrompt || typeof userPrompt !== 'string') {
      return {
        success: false,
        error: 'userPrompt is required and must be a string',
      };
    }

    userPrompt = sanitizePrompt(userPrompt);
    if (!userPrompt) {
      return {
        success: false,
        error: 'Prompt cannot be empty after sanitization',
      };
    }

    // Extract bodyParams from requestData if available (for direct API calls)
    const bodyParams = requestData.body || {};
    
    // Append option descriptions to userPrompt when bodyParams contain option values
    // This ensures option descriptions are in the userPrompt (like AiBuilderForm does)
    // not just in the system prompt
    if (bodyParams && Object.keys(bodyParams).length > 0 && agent.renderComponents) {
      const optionDescriptionsParts: string[] = [];
      
      agent.renderComponents.forEach((field: any) => {
        const fieldName = field.name || field.id;
        const fieldValue = bodyParams[fieldName];
        
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          // For select fields, find the option and append its description
          if (field.component === 'select' && field.options) {
            const option = field.options.find(
              (opt: any) => opt.id === fieldValue || opt.value === fieldValue
            );
            
            if (option?.description) {
              const fieldLabel = field.label || fieldName;
              optionDescriptionsParts.push(`${fieldLabel} (${option.label || fieldValue}):\n${option.description}`);
            }
          }
        }
      });
      
      // Append option descriptions to userPrompt if any were found
      if (optionDescriptionsParts.length > 0) {
        userPrompt = `${userPrompt}\n\n${optionDescriptionsParts.join('\n\n')}`;
      }
    }
    
    // Build system prompt using centralized utility (handles preload routes internally)
    const { systemPrompt } = await buildSystemPrompt({
      agent,
      formValues: requestData.formValues,
      bodyParams,
      baseUrl,
    });

    // Format annotations in TOON-like format and add to user prompt
    let finalUserPrompt = userPrompt;
    if (
      requestData.annotations &&
      Array.isArray(requestData.annotations) &&
      requestData.annotations.length > 0 &&
      requestData.previousAiResponse
    ) {
      // Format annotations in TOON-like structure
      const annotationSections = requestData.annotations.map((ann) => {
        const changes = ann.annotations.map((a) => `- ${a.label}`).join('\n');
        return `${ann.schemaName}\n\n${changes}`;
      }).join('\n\n');

      // Build the modification request in user prompt
      const modificationRequest = `\n\n---\n\n## MODIFY EXISTING SCHEMA(S)\n\nPlease update the following schema(s) based on the requested modifications. Apply ONLY the specified changes while keeping everything else exactly the same.\n\nRequested Modifications:\n\n${annotationSections}\n\nPrevious Schema(s):\n\`\`\`json\n${requestData.previousAiResponse}\n\`\`\`\n\n---\n\nIMPORTANT: You are the world's best schema editor. Apply these modifications precisely while preserving all other aspects of the schema(s). Output the complete updated schema(s) in the same format (single object or array).`;

      finalUserPrompt = userPrompt + modificationRequest;
    }

    // Get model from agent config or use default
    const model = agent.model || 'gpt-4o-mini';

    // Call chat API using centralized utility
    const apiResult = await callChatApi({
      agent,
      systemPrompt,
      userPrompt: finalUserPrompt,
      model,
      responseFormat: (agent.requiredOutputFormat === 'json' || agent.requiredOutputFormat === 'table' || agent.requiredOutputFormat === 'search-results' || agent.requiredOutputFormat === 'search-card')
        ? { type: 'json_object' }
        : undefined,
    });

    if (!apiResult.success) {
      return {
        success: false,
        error: apiResult.error || 'API call failed',
      };
    }

    // Calculate pricing for token usage
    const pricing = await calculatePricing(
      model,
      apiResult.tokenUsage?.prompt_tokens || 0,
      apiResult.tokenUsage?.completion_tokens || 0
    );

    const tokenUsage = apiResult.tokenUsage
      ? {
          ...apiResult.tokenUsage,
          pricing: pricing
            ? {
                input_price_per_1m: pricing.inputPricePer1M || 0,
                output_price_per_1m: pricing.outputPricePer1M || 0,
                input_cost: pricing.inputPrice,
                output_cost: pricing.outputPrice,
                total_cost: pricing.totalPrice,
                model_id: model,
              }
            : null,
        }
      : null;

    return {
      success: true,
      data: {
        response: apiResult.data,
        format: (agent.requiredOutputFormat === 'table' || agent.requiredOutputFormat === 'search-results' || agent.requiredOutputFormat === 'search-card') ? 'json' : agent.requiredOutputFormat || 'string',
        tokenUsage,
        timing: apiResult.timing,
        agent: {
          id: agent.id,
          label: agent.label,
          description: agent.description,
          requiredOutputFormat: agent.requiredOutputFormat,
          nextAction: agent.nextAction,
        },
      },
    };
  } catch (error) {
    if (isDevelopment) {
      loggingCustom(LogType.INFRA_LOG, 'error', `Error in AI chat request: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      success: false,
      error: sanitizeErrorMessage(error, isDevelopment),
    };
  }
}

