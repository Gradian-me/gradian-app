/**
 * Option Extractor Utility
 * General utility for extracting option descriptions from form values
 * Uses OptionLike interface: {id, label, icon, color, description}
 */

import { OptionLike } from './option-normalizer';

/**
 * Extract option descriptions from form values based on agent renderComponents
 * Finds selected options by matching form values with agent.renderComponents options
 * 
 * @param agent - Agent configuration with renderComponents
 * @param formValues - Form values containing selected option IDs
 * @returns Concatenated descriptions string for system prompt
 */
export function extractOptionDescriptions(
  agent: any,
  formValues: Record<string, any>
): string {
  if (!agent?.renderComponents || !formValues) {
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

    const fieldValue = formValues[fieldName];
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return;
    }

    // Get field label for display
    const fieldLabel = component.label || fieldName;

    // Handle different field types
    const componentType = component.component;

    // Helper function to add description with labels
    const addDescription = (option: OptionLike | null, item?: any) => {
      if (!option?.description) return;
      
      // Get option label from option, item, or use id as fallback
      const optionLabel = option.label || item?.label || option.id || 'Option';
      descriptions.push({ fieldLabel, optionLabel, description: option.description });
    };

    // For checkbox-list, radio, toggle-group - handle arrays
    if (['checkbox-list', 'radio', 'toggle-group'].includes(componentType)) {
      const selectedIds = Array.isArray(fieldValue) 
        ? fieldValue.map((item: any) => {
            if (typeof item === 'object' && item !== null) {
              return item.id || item.value || item;
            }
            return item;
          })
        : [fieldValue];

      selectedIds.forEach((id: any, index: number) => {
        const item = Array.isArray(fieldValue) ? fieldValue[index] : fieldValue;
        const option = component.options.find((opt: OptionLike) => 
          String(opt.id) === String(id) || 
          String(opt.value) === String(id)
        );
        addDescription(option, item);
      });
    }
    // For select (single or multiple)
    else if (componentType === 'select') {
      // Handle multiple select or single select with array value (NormalizedOption[])
      if (Array.isArray(fieldValue)) {
        fieldValue.forEach((item: any) => {
          // First check if the item itself has a description (NormalizedOption might have description)
          if (typeof item === 'object' && item !== null && item.description) {
            const optionLabel = item.label || item.id || 'Option';
            descriptions.push({ fieldLabel, optionLabel, description: item.description });
            return;
          }
          
          // Otherwise, look up the description from component.options
          const id = typeof item === 'object' && item !== null
            ? (item.id || item.value)
            : item;
          
          const option = component.options.find((opt: OptionLike) => 
            String(opt.id) === String(id) || 
            String(opt.value) === String(id)
          );
          addDescription(option, item);
        });
      }
      // Handle single select with object value (NormalizedOption)
      else if (typeof fieldValue === 'object' && fieldValue !== null) {
        // First check if the object itself has a description
        if (fieldValue.description) {
          const optionLabel = fieldValue.label || fieldValue.id || 'Option';
          descriptions.push({ fieldLabel, optionLabel, description: fieldValue.description });
        } else {
          // Otherwise, look up the description from component.options
          const id = fieldValue.id || fieldValue.value;
          if (id !== undefined && id !== null) {
            const option = component.options.find((opt: OptionLike) => 
              String(opt.id) === String(id) || 
              String(opt.value) === String(id)
            );
            addDescription(option, fieldValue);
          }
        }
      }
      // Handle single select with string/number value
      else {
        const id = String(fieldValue);
        
        const option = component.options.find((opt: OptionLike) => 
          String(opt.id) === String(id) || 
          String(opt.value) === String(id)
        );
        addDescription(option);
      }
    }
    // For other option-based components
    else if (component.options && component.options.length > 0) {
      const item = fieldValue;
      const id = typeof fieldValue === 'object' && fieldValue !== null
        ? (fieldValue.id || fieldValue.value)
        : fieldValue;
      
      const option = component.options.find((opt: OptionLike) => 
        String(opt.id) === String(id) || 
        String(opt.value) === String(id)
      );
      addDescription(option, item);
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
  
  // Add header and format descriptions
  return '\n\n## Selected Option Descriptions\n\n' + formattedDescriptions.join('\n\n') + '\n';
}

