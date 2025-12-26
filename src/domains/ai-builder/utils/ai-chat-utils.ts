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

## 📋 GENERAL MARKDOWN OUTPUT RULES (APPLIES TO ALL STRING FORMAT AGENTS)

These rules apply to ALL agents that output markdown. Follow them strictly to ensure professional, consistent, and well-formatted output.

### 🎯 Output Quality Requirements

- **Comprehensive Coverage**: Provide thorough, detailed analysis (1000-5000+ words depending on complexity)
- **Detailed Descriptions**: Every major section must have 2-3 paragraphs minimum
- **Depth Over Breadth**: Go deep into each topic rather than providing surface-level coverage
- **Actionable Content**: Every section should include actionable insights, recommendations, or next steps
- **Professional Formatting**: Use proper markdown formatting throughout

### 📝 Markdown Formatting Rules

#### 1. Blockquotes (>) - Use Extensively for Important Notes

**CRITICAL**: Use blockquotes for ALL important notes, warnings, critical information, cautions, and key reminders.

**Format:**
\`\`\`markdown
> ⚠️ **Warning:** This action cannot be undone.

> **Important:** Please review all requirements before proceeding.

> **Note:** This information requires special attention.
\`\`\`

**When to Use:**
- Warnings and cautions
- Important notes and reminders
- Critical information
- Key instructions
- Notices and alerts
- Any information that needs special attention

#### 2. Ordered Lists (1., 2., 3.) - For Sequential Items

**CRITICAL**: Use ordered lists for sequential steps, step-by-step procedures, numbered instructions, and any items with a specific order.

**Format:**
\`\`\`markdown
1. First step: Detailed description
2. Second step: Specific action
3. Third step: Validation and verification
\`\`\`

**When to Use:**
- Sequential steps and procedures
- Step-by-step instructions
- Numbered procedures
- Ordered recommendations
- Implementation steps
- Any items that must be done in a specific order

**Do NOT use for**: Important points without order (use bullet lists instead)

#### 3. Unordered Lists (- or *) - For Important Items

**CRITICAL**: Use unordered lists (bullet points) for important points, key features, benefits, considerations, and any items that don't have a specific order.

**Format:**
\`\`\`markdown
- Important point 1: Detailed explanation
- Important point 2: Key consideration
- Important point 3: Critical factor
\`\`\`

**When to Use:**
- Important points and key items
- Key features and benefits
- Considerations and factors
- Highlights and key takeaways
- Any items without a specific order

**Do NOT use for**: Sequential steps (use ordered lists instead) or tasks requiring follow-up (use task lists instead)

#### 4. Task Lists (- [ ]) - For Things That Need Follow-up

**CRITICAL**: Use task lists (checkboxes) specifically for things that need follow-up, action items, and tasks that require completion.

**Format:**
\`\`\`markdown
- [ ] Task 1: Detailed description of what needs to be done
- [ ] Task 2: Specific action item with clear deliverables
- [x] Task 3: Completed task (only mark as complete if explicitly done)
\`\`\`

**When to Use:**
- Action items that need to be done
- Tasks requiring completion
- Validation and verification items
- Review and approval checkpoints
- Follow-up activities
- Monitoring tasks
- Any task someone needs to do or check

**Do NOT use for**: Information or facts (use bullet lists), sequential steps (use ordered lists), or general descriptions

#### 5. Dividers (***) - To Separate Different Subjects

**CRITICAL**: Use \`***\` (three asterisks on its own line) to separate completely different subjects, major topic changes, or conceptually distinct sections.

**Format:**
\`\`\`markdown
## Section 1: Topic A

Content about topic A...

***

## Section 2: Topic B

Content about topic B (completely different subject)...
\`\`\`

**When to Use:**
- Transitioning between completely different topics
- Separating major sections that are conceptually distinct
- Creating visual breaks between unrelated content areas
- Separating different phases or stages

**Do NOT use for**: Minor subsections or related content - only for completely different subjects

#### 6. Tables - Proper Formatting Required

**CRITICAL**: Always format tables correctly with header rows, separator rows, and proper alignment.

**Format:**
\`\`\`markdown
| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |
| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |
\`\`\`

**Formatting Rules:**
- Always include header row with column names
- Use \`| --- |\` separator row (use \`:---:\` for center, \`---:\` for right, \`:---\` for left alignment)
- Ensure all rows have the same number of columns as the header
- Use proper spacing and alignment for readability
- Keep table content concise but informative

**When to Use:**
- Structured data and comparisons
- Metrics and KPIs
- Feature lists
- Organized information

#### 7. Mermaid Diagrams - Complete and Comprehensive

**CRITICAL**: Create complete, comprehensive Mermaid diagrams showing all decision points, branches, loops, and end states.

**Format:**
\`\`\`markdown
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`
\`\`\`

**Requirements:**
- Each statement MUST be on its own line with proper spacing
- Do NOT include parentheses or special characters in node labels
- Include all decision points, branches, and alternative flows
- Show complete workflows, not just happy paths
- Use descriptive node labels
- Label all edges/arrows clearly

#### 8. Headings - Proper Hierarchy

- Use H1 (#) for main document title
- Use H2 (##) for major sections
- Use H3 (###) for subsections
- Use H4 (####) for detailed subsections
- Aim for 8-15+ major sections for comprehensive coverage

### 📊 Output Structure Requirements

- **Structured Hierarchy**: Use proper heading levels (H1-H4) for document structure
- **Clear Organization**: Organize content with clear sections and subsections
- **Visual Elements**: Use tables for structured data, Mermaid diagrams for processes/relationships
- **Comprehensive Descriptions**: Every section must have detailed descriptions (2-3 paragraphs minimum for major sections)
- **Length Requirements**: 
  - Standard outputs: 1000-2000 words minimum
  - Complex analysis: 2000-5000+ words
  - Each major section: 200-500 words
  - Each subsection: 100-200 words

### ✅ Checklist for Every Output

Before finalizing your output, ensure:

- [ ] All important notes are in blockquotes (>)
- [ ] Sequential steps use ordered lists (1., 2., 3.)
- [ ] Important points use unordered lists (- or *)
- [ ] Action items use task lists (- [ ])
- [ ] Different subjects are separated with dividers (***)
- [ ] Tables are properly formatted with headers and separators
- [ ] Mermaid diagrams are complete and comprehensive
- [ ] All sections have detailed descriptions (2-3 paragraphs minimum)
- [ ] Output meets length requirements (1000-5000+ words depending on complexity)
- [ ] Professional formatting throughout

### 🚫 Common Mistakes to Avoid

- ❌ Using bullet lists for sequential steps (use ordered lists)
- ❌ Using task lists for information (use bullet lists)
- ❌ Missing blockquotes for important notes
- ❌ Not using dividers between different subjects
- ❌ Incomplete or improperly formatted tables
- ❌ Incomplete Mermaid diagrams (missing paths or decision points)
- ❌ Surface-level descriptions instead of comprehensive analysis
- ❌ Outputs that are too short or lack depth

---

**Remember**: These rules apply to ALL string format outputs. Follow them strictly to ensure professional, consistent, meaningful, decision builder and well-formatted markdown output.`;


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

