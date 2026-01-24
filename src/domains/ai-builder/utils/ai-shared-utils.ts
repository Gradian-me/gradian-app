/**
 * AI Shared Utilities
 * Common utilities used across all AI agent types
 */

/**
 * Parse concatenated userPrompt string back into individual field values
 * Handles format like: "Prompt: value\n\nSize: value\n\nOutput_format: value"
 * 
 * @param agent - The AI agent configuration object
 * @param userPrompt - The concatenated prompt string
 * @returns Object with parsed field values
 */
export function parseUserPromptToFormValues(
  agent: any,
  userPrompt: string
): Record<string, any> {
  const formValues: Record<string, any> = {};

  if (!agent.renderComponents || !userPrompt || typeof userPrompt !== 'string') {
    return formValues;
  }

  // Helper to format field name to display label (matches AiBuilderForm logic)
  const formatFieldName = (name: string): string => {
    return name
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  // Build a map of display labels to component info
  const labelToComponent = new Map<string, any>();
  agent.renderComponents.forEach((component: any) => {
    const fieldName = component.name || component.id;
    if (!fieldName) return;

    // Use component label if available, otherwise format the field name
    const displayLabel = component.label || formatFieldName(fieldName);
    const normalizedLabel = displayLabel.toLowerCase();
    
    // Map the display label
    labelToComponent.set(normalizedLabel, {
      component,
      fieldName,
    });

    // Also map common variations and field name directly
    if (fieldName === 'prompt' || fieldName === 'userPrompt') {
      labelToComponent.set('prompt', { component, fieldName });
      labelToComponent.set('user prompt', { component, fieldName });
    }
    
    // Map field name variations (e.g., "output_format" -> "output format", "responseFormat" -> "response format")
    const fieldNameFormatted = formatFieldName(fieldName).toLowerCase();
    if (fieldNameFormatted !== normalizedLabel) {
      labelToComponent.set(fieldNameFormatted, { component, fieldName });
    }
    
    // Map underscore variations (e.g., "output_format" -> "output_format", "Output_format")
    if (fieldName.includes('_')) {
      labelToComponent.set(fieldName.toLowerCase(), { component, fieldName });
      // Also map with first letter capitalized (matches user's example "Output_format")
      const capitalized = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).toLowerCase();
      labelToComponent.set(capitalized.toLowerCase(), { component, fieldName });
    }
  });

  // Split by double newlines to get individual field entries
  const entries = userPrompt.split(/\n\n+/).filter(entry => entry.trim());

  entries.forEach((entry) => {
    // Match format: "Label: Value" or "Label:Value"
    const match = entry.match(/^([^:]+):\s*(.+)$/);
    if (!match) return;

    const [, labelPart, valuePart] = match;
    const label = labelPart.trim();
    const value = valuePart.trim();

    // Try to find matching component by label (case-insensitive)
    // Normalize by removing spaces/underscores and converting to lowercase for comparison
    const normalizedLabel = label.toLowerCase().replace(/[\s_]/g, '');
    let componentInfo = labelToComponent.get(label.toLowerCase());
    
    // If not found, try normalized version (handles "Output Format" vs "Output_format" vs "outputformat")
    if (!componentInfo) {
      for (const [key, info] of labelToComponent.entries()) {
        const normalizedKey = key.replace(/[\s_]/g, '');
        if (normalizedKey === normalizedLabel) {
          componentInfo = info;
          break;
        }
      }
    }

    if (componentInfo) {
      const { component, fieldName } = componentInfo;

      // Handle select components - extract ID from label like "1024x1024 (Square)"
      if (component.component === 'select' && component.options) {
        // Try to find option by label first
        const optionByLabel = component.options.find(
          (opt: any) => opt.label?.toLowerCase() === value.toLowerCase()
        );
        
        if (optionByLabel) {
          formValues[fieldName] = optionByLabel.id || optionByLabel.value || value;
          return;
        }

        // Try to extract ID from value like "1024x1024 (Square)" -> "1024x1024"
        const idMatch = value.match(/^([^\s(]+)/);
        if (idMatch) {
          const extractedId = idMatch[1];
          const optionById = component.options.find(
            (opt: any) => (opt.id || opt.value) === extractedId
          );
          if (optionById) {
            formValues[fieldName] = optionById.id || optionById.value;
            return;
          }
          // If extracted ID matches an option, use it
          formValues[fieldName] = extractedId;
          return;
        }
      }

      // For other field types, use the value as-is
      formValues[fieldName] = value;
    }
  });

  return formValues;
}

/**
 * Extract parameters from formValues based on sectionId
 * - Fields with sectionId: "body" → go in main request body
 * - Fields with sectionId: "extra" → go in extra_body object
 * - Other fields (no sectionId or other sectionId) → concatenated as prompt
 * 
 * @param agent - The AI agent configuration object
 * @param formValues - Form values from the request
 * @returns Object with separated body, extra, and prompt parameters
 */
/**
 * Serialize array/object values to extract IDs or labels for API parameters
 * This prevents [object Object] issues when values are later converted to strings
 */
function serializeValueForApi(value: any, component?: any): any {
  // Handle arrays (from picker, checkbox-list, list-input, etc.)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return value; // Return empty array as-is
    }
    
    // If array contains objects, extract IDs or labels
    if (typeof value[0] === 'object' && value[0] !== null) {
      // For picker/select components, extract IDs
      if (component?.component === 'picker' || component?.component === 'select' || component?.component === 'checkbox-list') {
        return value.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            return item.id || item.value || item.label || item;
          }
          return item;
        });
      }
      // For list-input, extract labels
      if (component?.component === 'list-input') {
        return value.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            return item.label || item.id || item.value || item;
          }
          return item;
        });
      }
      // Default: extract IDs
      return value.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return item.id || item.value || item.label || item;
        }
        return item;
      });
    }
    // Plain array, return as-is
    return value;
  }
  
  // Handle single object (from radio, toggle-group, etc.)
  if (typeof value === 'object' && value !== null) {
    // For select/picker components, extract ID
    if (component?.component === 'picker' || component?.component === 'select' || component?.component === 'radio') {
      return value.id || value.value || value.label || value;
    }
    // Default: extract ID or label
    return value.id || value.value || value.label || value;
  }
  
  // Primitive values, return as-is
  return value;
}

export function extractParametersBySectionId(
  agent: any,
  formValues: Record<string, any>
): { body: Record<string, any>; extra: Record<string, any>; prompt: Record<string, any> } {
  const bodyParams: Record<string, any> = {};
  const extraParams: Record<string, any> = {};
  const promptParams: Record<string, any> = {};

  if (!agent.renderComponents || !formValues) {
    return { body: bodyParams, extra: extraParams, prompt: promptParams };
  }

  // Map field names to API parameter names (can be extended per agent type)
  const fieldToApiMap: Record<string, string> = {
    responseFormat: 'output_format',
    aspectRatio: 'aspect_ratio',
    safetyTolerance: 'safety_tolerance',
    promptUpsampling: 'prompt_upsampling',
  };

  agent.renderComponents.forEach((component: any) => {
    const fieldName = component.name || component.id;
    const sectionId = component.sectionId;
    const value = formValues[fieldName];

    if (value === undefined || value === null || value === '') {
      return;
    }

    // Map field name to API parameter name
    const apiParamName = fieldToApiMap[fieldName] || fieldName;

    // Serialize value for API (extract IDs/labels from objects/arrays)
    const serializedValue = serializeValueForApi(value, component);

    if (sectionId === 'extra') {
      extraParams[apiParamName] = serializedValue;
    } else if (sectionId === 'body') {
      bodyParams[apiParamName] = serializedValue;
    } else {
      // Fields without sectionId or with other sectionId values go to prompt
      promptParams[fieldName] = serializedValue;
    }
  });

  return { body: bodyParams, extra: extraParams, prompt: promptParams };
}

