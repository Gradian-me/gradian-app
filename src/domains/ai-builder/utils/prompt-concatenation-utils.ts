/**
 * Prompt Concatenation Utilities
 * Centralized prompt building for all AI agent types
 * Handles preload routes, option descriptions, and system prompt concatenation
 */

import { getGeneralSystemPrompt } from './ai-general-utils';
import { GENERAL_MARKDOWN_OUTPUT_RULES, REFERENCE_PROMPT, MERMAID_RULES, ORGANIZATION_RAG_PROMPT } from './ai-chat-utils';
import { GRAPH_GENERATION_PROMPT } from './ai-graph-utils';
import { GENERAL_IMAGE_PROMPT, IMAGE_TYPE_PROMPTS } from './ai-image-utils';
import { preloadRoutes } from '@/gradian-ui/shared/utils/preload-routes';
import { extractOptionDescriptions } from '@/gradian-ui/form-builder/form-elements/utils/option-extractor';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/configs/log-config';

/**
 * Extract option descriptions from bodyParams when calling API directly
 * Finds option IDs in bodyParams and extracts their descriptions from agent.renderComponents
 * 
 * @param agent - Agent configuration with renderComponents
 * @param bodyParams - Body parameters containing option IDs (e.g., {writingStyle: 'summarizer'})
 * @returns Concatenated descriptions string for system prompt
 */
export function extractOptionDescriptionsFromBodyParams(
  agent: any,
  bodyParams: Record<string, any>
): string {
  if (!agent?.renderComponents || !bodyParams) {
    return '';
  }

  const descriptions: Array<{ fieldLabel: string; optionLabel: string; description: string }> = [];

  // Iterate through all renderComponents to find option-based fields
  agent.renderComponents.forEach((component: any) => {
    if (!component.component || !component.options || !Array.isArray(component.options)) {
      return;
    }

    const fieldName = component.name || component.id;
    if (!fieldName) {
      return;
    }

    // Check if this field exists in bodyParams
    const paramValue = bodyParams[fieldName];
    if (paramValue === undefined || paramValue === null || paramValue === '') {
      return;
    }

    // Get field label for display
    const fieldLabel = component.label || fieldName;

    // Handle different field types
    const componentType = component.component;

    // Helper function to add description with labels
    const addDescription = (option: any) => {
      if (!option?.description) return;
      const optionLabel = option.label || option.id || 'Option';
      descriptions.push({ fieldLabel, optionLabel, description: option.description });
    };

    // For checkbox-list, radio, toggle-group - handle arrays
    if (['checkbox-list', 'radio', 'toggle-group'].includes(componentType)) {
      const selectedIds = Array.isArray(paramValue) 
        ? paramValue.map((item: any) => {
            if (typeof item === 'object' && item !== null) {
              return item.id || item.value || item;
            }
            return String(item);
          })
        : [String(paramValue)];

      selectedIds.forEach((id: string) => {
        const option = component.options.find((opt: any) => 
          String(opt.id) === id || 
          String(opt.value) === id
        );
        addDescription(option);
      });
    }
    // For select (single or multiple)
    else if (componentType === 'select') {
      // Handle multiple select
      if (Array.isArray(paramValue)) {
        paramValue.forEach((item: any) => {
          const id = typeof item === 'object' && item !== null
            ? String(item.id || item.value)
            : String(item);
          
          const option = component.options.find((opt: any) => 
            String(opt.id) === id || 
            String(opt.value) === id
          );
          addDescription(option);
        });
      }
      // Handle single select - convert to string for comparison
      else {
        const id = String(paramValue);
        
        const option = component.options.find((opt: any) => 
          String(opt.id) === id || 
          String(opt.value) === id
        );
        addDescription(option);
      }
    }
    // For other option-based components
    else if (component.options && component.options.length > 0) {
      const id = String(paramValue);
      
      const option = component.options.find((opt: any) => 
        String(opt.id) === id || 
        String(opt.value) === id
      );
      addDescription(option);
    }
  });

  // Return concatenated descriptions with proper formatting
  if (descriptions.length === 0) {
    return '';
  }

  // Remove duplicates based on description text (keep first occurrence)
  const seenDescriptions = new Set<string>();
  const uniqueDescriptions: Array<{ fieldLabel: string; optionLabel: string; description: string }> = [];
  
  descriptions.forEach((desc) => {
    if (!seenDescriptions.has(desc.description)) {
      seenDescriptions.add(desc.description);
      uniqueDescriptions.push(desc);
    }
  });

  // Format descriptions with field label and option label
  const formattedDescriptions = uniqueDescriptions.map((desc) => 
    `**${desc.fieldLabel}: (${desc.optionLabel})**\n\n${desc.description}`
  );
  
  return '\n\n## Selected Option Descriptions\n\n' + formattedDescriptions.join('\n\n') + '\n';
}

/**
 * Extract option descriptions from any source (formValues or bodyParams)
 * Unified function that checks both sources
 * 
 * @param agent - Agent configuration with renderComponents
 * @param formValues - Form values (optional)
 * @param bodyParams - Body parameters (optional)
 * @returns Concatenated descriptions string for system prompt
 */
export function extractOptionDescriptionsFromAnySource(
  agent: any,
  formValues?: Record<string, any>,
  bodyParams?: Record<string, any>
): string {
  // Extract from formValues if provided
  const formDescriptions = formValues ? extractOptionDescriptions(agent, formValues) : '';
  
  // Extract from bodyParams if provided
  const bodyDescriptions = bodyParams ? extractOptionDescriptionsFromBodyParams(agent, bodyParams) : '';

  // If both are empty, return empty string
  if (!formDescriptions.trim() && !bodyDescriptions.trim()) {
    return '';
  }

  // If only one source has descriptions, return it
  if (formDescriptions.trim() && !bodyDescriptions.trim()) {
    return formDescriptions;
  }
  if (bodyDescriptions.trim() && !formDescriptions.trim()) {
    return bodyDescriptions;
  }

  // Both have descriptions - merge and remove duplicates
  // Extract descriptions from both (they already have headers and formatting)
  // Remove the header from both and merge
  const formDescWithoutHeader = formDescriptions.replace(/^[\s\n]*## Selected Option Descriptions[\s\n]*/i, '').trim();
  const bodyDescWithoutHeader = bodyDescriptions.replace(/^[\s\n]*## Selected Option Descriptions[\s\n]*/i, '').trim();
  
  // Split by double newlines to get individual descriptions (format: **Label**:\n\nDescription)
  const formItems = formDescWithoutHeader.split(/\n\n+/).filter(item => item.trim());
  const bodyItems = bodyDescWithoutHeader.split(/\n\n+/).filter(item => item.trim());
  
  // Combine and remove duplicates based on description text (not label, as same description might have different labels)
  const seenDescriptions = new Set<string>();
  const uniqueItems: string[] = [];
  
  [...formItems, ...bodyItems].forEach((item) => {
    // Extract description text (after the field label, option label, and newlines)
    // Format is: **Field Label: (Option Label)**\n\nDescription
    // Use [\s\S] instead of . with 's' flag for compatibility
    const descMatch = item.match(/\*\*.*?:\s*\(.*?\)\*\*\s*\n\n([\s\S]*)/);
    const descText = descMatch ? descMatch[1].trim() : item.trim();
    
    if (!seenDescriptions.has(descText)) {
      seenDescriptions.add(descText);
      uniqueItems.push(item);
    }
  });

  if (uniqueItems.length === 0) {
    return '';
  }

  return '\n\n## Selected Option Descriptions\n\n' + uniqueItems.join('\n\n') + '\n';
}

/**
 * Build complete system prompt by concatenating all parts
 * Helper function that handles the concatenation order
 * 
 * @param params - Parameters for building system prompt
 * @returns Complete system prompt string
 */
function buildCompleteSystemPrompt(params: {
  generalSystemPrompt: string;
  agentSystemPrompt: string;
  optionDescriptions: string;
  additionalSystemPrompt?: string;
  graphGenerationPrompt?: string;
  imageGenerationPrompt?: string;
  generalMarkdownRules?: string;
  mermaidRules?: string;
  referencePrompt?: string;
  preloadedContext: string;
}): string {
  let systemPrompt = params.generalSystemPrompt;
  
  // 2. Agent-specific system prompt
  if (params.agentSystemPrompt) {
    systemPrompt += '\n\n***\n\n' + params.agentSystemPrompt;
  }
  
  // 3. Option descriptions
  if (params.optionDescriptions) {
    systemPrompt += '\n\n***\n\n' + params.optionDescriptions;
  }
  
  // 4. Additional system prompt (if provided)
  if (params.additionalSystemPrompt) {
    systemPrompt += '\n\n***\n\n' + params.additionalSystemPrompt;
  }
  
  // 5. Reference and source citation rules (for string format agents)
  if (params.referencePrompt) {
    systemPrompt += '\n\n' + params.referencePrompt;
  }
  
  // 6. Preloaded context (added at the end)
  if (params.preloadedContext) {
    systemPrompt += '\n\n***\n\n' + '## Preloaded Context for RAG:\n\n' 
    + ORGANIZATION_RAG_PROMPT
    + '\n\n'
    + '---'
    + '\n\n'
    + params.preloadedContext;
  }

  // 7. Graph generation prompt (for graph agents)
  if (params.graphGenerationPrompt) {
    systemPrompt += '\n\n***\n\n' + params.graphGenerationPrompt;
  }
  
  // 8. Image generation prompt (for image agents)
  if (params.imageGenerationPrompt) {
    systemPrompt += '\n\n***\n\n' + params.imageGenerationPrompt;
  }
  
  // 9. General markdown output rules (for string format agents)
  if (params.generalMarkdownRules) {
    systemPrompt += '\n\n***\n\n' + params.generalMarkdownRules;
  }
  
  // 10. Mermaid diagram rules (for string format agents)
  if (params.mermaidRules) {
    systemPrompt += '\n\n' + params.mermaidRules;
  }
  
  return systemPrompt;
}

/**
 * Build system prompt for any agent type
 * This function ensures consistent prompt building across all agent types
 * 
 * Order of concatenation (preload routes are added independently):
 * 1. General system prompt (date/time context from ai-general-utils.ts)
 * 2. Agent-specific system prompt
 * 3. Option descriptions (for selected options like professional-writing)
 * 4. Additional system prompt (if provided)
 * 5. Graph generation prompt (for graph agents)
 * 6. General markdown output rules (for string format agents)
 * 7. Preloaded context (from preload-routes.ts) - added independently at the end
 * 
 * @param params - Parameters for building system prompt
 * @returns Object with systemPrompt and metadata
 */
export async function buildSystemPrompt(params: {
  agent: any;
  formValues?: Record<string, any>;
  bodyParams?: Record<string, any>;
  additionalSystemPrompt?: string;
  baseUrl?: string;
}): Promise<{
  systemPrompt: string;
  isLoadingPreload: boolean;
}> {
  const { agent, formValues, bodyParams, additionalSystemPrompt, baseUrl } = params;

  // 1. General system prompt (date/time context)
  const generalSystemPrompt = getGeneralSystemPrompt();

  // 2. Agent-specific system prompt
  const agentSystemPrompt = agent.systemPrompt || '';

  // 3. Extract option descriptions from formValues OR bodyParams
  const optionDescriptions = extractOptionDescriptionsFromAnySource(
    agent,
    formValues,
    bodyParams
  );

  // 4. Additional system prompt (if provided)
  // (already in params)

  // 5. Graph generation prompt (for graph agents)
  const graphGenerationPrompt = agent.agentType === 'graph-generation' 
    ? GRAPH_GENERATION_PROMPT 
    : undefined;

  // 6. Image generation prompt (for image agents)
  let imageGenerationPrompt: string | undefined = undefined;
  if (agent.agentType === 'image-generation') {
    // Get image type from formValues or bodyParams
    const imageType = formValues?.imageType || bodyParams?.imageType || 'standard';
    
    // Always start with general image prompt
    const promptParts: string[] = [GENERAL_IMAGE_PROMPT];
    
    // Get the appropriate image type prompt
    if (imageType && imageType !== 'none' && imageType !== 'standard' && typeof imageType === 'string') {
      const imageTypeStr = String(imageType);
      const specificPrompt = IMAGE_TYPE_PROMPTS[imageTypeStr] || 
                           IMAGE_TYPE_PROMPTS[imageTypeStr.toLowerCase()] || 
                           '';
      
      if (specificPrompt) {
        // Extract the additional content (the part after GENERAL_IMAGE_PROMPT)
        // Since specific prompts include GENERAL_IMAGE_PROMPT at the start, we need to extract the additional part
        if (specificPrompt.startsWith(GENERAL_IMAGE_PROMPT)) {
          const additionalContent = specificPrompt.substring(GENERAL_IMAGE_PROMPT.length).trim();
          if (additionalContent) {
            promptParts.push(additionalContent);
          }
        } else {
          // If it doesn't start with general prompt, use the whole thing
          promptParts.push(specificPrompt);
        }
      }
    }
    
    // Join with divider between general and specific prompts
    imageGenerationPrompt = promptParts.join('\n\n***\n\n');
  }

  // 7. General markdown output rules (for string format agents)
  const generalMarkdownRules = agent.requiredOutputFormat === 'string'
    ? GENERAL_MARKDOWN_OUTPUT_RULES
    : undefined;

  // 8. Mermaid diagram rules (for string format agents)
  const mermaidRules = agent.requiredOutputFormat === 'string'
    ? MERMAID_RULES
    : undefined;

  // 9. Reference and source citation rules (for string format agents)
  const referencePrompt = agent.requiredOutputFormat === 'string'
    ? REFERENCE_PROMPT
    : undefined;

  // 10. Preload routes - called internally in parallel
  // Always include organization-rag globally for all agents
  const globalPreloadRoutes = [
    {
      route: '/api/organization-rag',
      title: 'Organization RAG',
      description: 'MANDATORY: Organization RAG data for context-aware AI processing',
      method: 'GET' as const,
      jsonPath: 'data',
      queryParameters: {
        format: 'toon',
      },
    },
  ];

  // Merge global preload routes with agent-specific preload routes
  // Agent-specific routes take precedence (appear first), but global routes are always included
  const allPreloadRoutes = [
    ...(agent.preloadRoutes || []),
    // Add global organization-rag only if not already present in agent's preloadRoutes
    ...(agent.preloadRoutes?.some((route: any) => route.route === '/api/organization-rag') 
      ? [] 
      : globalPreloadRoutes),
  ];

  let preloadedContext = '';
  let isLoadingPreload = false;
  
  if (allPreloadRoutes.length > 0 && baseUrl) {
    isLoadingPreload = true;
    try {
      preloadedContext = await preloadRoutes(allPreloadRoutes, baseUrl);
    } catch (error) {
      loggingCustom(
        LogType.INFRA_LOG,
        'error',
        `Error preloading routes: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue even if preload fails
    } finally {
      isLoadingPreload = false;
    }
  }

  // Build complete system prompt
  const systemPrompt = buildCompleteSystemPrompt({
    generalSystemPrompt,
    agentSystemPrompt,
    optionDescriptions,
    additionalSystemPrompt,
    graphGenerationPrompt,
    imageGenerationPrompt,
    generalMarkdownRules,
    mermaidRules,
    referencePrompt,
    preloadedContext,
  });

  return {
    systemPrompt,
    isLoadingPreload,
  };
}
