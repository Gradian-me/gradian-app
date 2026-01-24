/**
 * Prompt Builder Utilities
 * Handles validation and prompt building for AI agents with TOON formatting support
 */

import { validateField } from '@/gradian-ui/shared/utils';
import { normalizeOptionArray, NormalizedOption } from '@/gradian-ui/form-builder/form-elements/utils/option-normalizer';
import { formatToToon } from '@/gradian-ui/shared/utils/text-utils';

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValues {
  [key: string]: any;
}

/**
 * Validates all form fields from agent's renderComponents
 * Returns array of validation errors (empty if all valid)
 */
export function validateAgentFormFields(
  agent: any,
  formValues: FormValues
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!agent.renderComponents || !Array.isArray(agent.renderComponents)) {
    return errors;
  }

  // Filter to only form fields (exclude route-based components)
  const formFields = agent.renderComponents.filter(
    (component: any) => component.component && !component.route
  );

  for (const field of formFields) {
    const value = formValues[field.name || field.id];
    const validation = field.validation || {};

    // Use the existing validateField utility
    const validationResult = validateField(value, validation);
    
    if (!validationResult.isValid) {
      errors.push({
        field: field.name || field.id || 'unknown',
        message: validationResult.error || 'Invalid value'
      });
    }
  }

  return errors;
}

/**
 * Formats array field values in TOON format
 * Supports: checkbox-list, radio, toggle-group, tag-input, list-input, select (multiple)
 */
export function formatArrayFieldToToon(
  fieldName: string,
  field: any,
  value: any
): string {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return '';
  }

  // Normalize the value to an array of NormalizedOption
  const normalizedArray = normalizeOptionArray(value);

  if (normalizedArray.length === 0) {
    return '';
  }

  // Format in TOON format: fieldName[count]{label}:
  //   item1label
  //   item2label
  const toonResult = formatToToon(fieldName, normalizedArray, ['label']);

  if (!toonResult) {
    return '';
  }

  // Get the friendly label name from the field
  const fieldLabel = field.label || fieldName;
  
  // Format field name: convert camelCase to Title Case if needed
  const formatFieldName = (name: string): string => {
    // If it already looks like a formatted label (has spaces or capitals), use it as is
    if (name.includes(' ') || (name[0] && name[0] === name[0].toUpperCase())) {
      return name;
    }
    // Otherwise, convert camelCase to Title Case
    return name
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  const displayLabel = formatFieldName(fieldLabel);
  
  // Wrap TOON format in markdown code block to preserve formatting and prevent markdown parsing
  // Use 'text' language identifier to ensure proper whitespace handling and wrapping
  // Prepend the friendly label name above the TOON format
  return `${displayLabel}:\n\n\`\`\`text\n${toonResult}\n\`\`\``;
}

/**
 * Gets language code from form values
 * Checks common language field names
 */
function getLanguageFromFormValues(formValues: FormValues): string | null {
  // Check common language field names
  const languageFieldNames = [
    'language',
    'outputLanguage',
    'output-language',
    'output_language',
    'outputLanguageCode',
    'lang'
  ];
  
  for (const fieldName of languageFieldNames) {
    const value = formValues[fieldName];
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  
  return null;
}

/**
 * Gets language name from language code
 */
function getLanguageName(languageCode: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'fa': 'Persian (Farsi)',
    'ar': 'Arabic',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'tr': 'Turkish',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
  };
  
  return languageMap[languageCode.toLowerCase()] || languageCode.toUpperCase();
}

/**
 * Builds language instruction text
 */
function buildLanguageInstruction(languageCode: string): string {
  const languageName = getLanguageName(languageCode);
  
  return `\n\nIMPORTANT OUTPUT LANGUAGE REQUIREMENT:\nAll output must be in ${languageName} (${languageCode.toUpperCase()}). This includes:\n- All titles, subtitles, and headings\n- All body text and descriptions\n- All user-facing content\n\nHowever, keep the following in English:\n- Professional and technical abbreviations (e.g., API, JSON, HTTP, CSS, HTML, SQL, UUID, ID, URL)\n- Industry-standard terms and acronyms (e.g., SEO, CRM, UX, UI, SDK, IDE, CLI, GMP, GLP, GDP, etc)\n- Programming language keywords and syntax\n- Technical specification names and standards\n- Brand names and product names that are internationally recognized\n- Scientific and medical terminology abbreviations\n\nEnsure natural, fluent ${languageName} while preserving essential English technical terms.`;
}

/**
 * Builds a standardized prompt from form values
 * Formats fields in readable format with TOON formatting for arrays
 */
export function buildStandardizedPrompt(
  agent: any,
  formValues: FormValues
): string {
  if (!agent.renderComponents || !Array.isArray(agent.renderComponents)) {
    return '';
  }

  // Extract language from form values
  const outputLanguage = getLanguageFromFormValues(formValues);

  // Filter to only form fields (exclude route-based components and language fields)
  const formFields = agent.renderComponents.filter(
    (component: any) => {
      if (!component.component || component.route) return false;
      // Exclude language fields from the main prompt (they're handled separately)
      const fieldName = (component.name || component.id || '').toLowerCase();
      return !fieldName.includes('language') && !fieldName.includes('output-language') && !fieldName.includes('outputlanguage');
    }
  );

  const parts: string[] = [];

  // Sort fields by order to maintain consistent order
  const sortedFields = [...formFields].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });

  sortedFields.forEach((field) => {
    // Get value from formValues, fallback to defaultValue from field config
    let fieldValue = formValues[field.name || field.id];
    
    // Helper to check if value is empty
    const isEmpty = (val: any): boolean => {
      return val === undefined || val === null || 
             (typeof val === 'string' && val === '') ||
             (Array.isArray(val) && val.length === 0);
    };
    
    // If value is missing/empty and field has a defaultValue, use it
    if (isEmpty(fieldValue) && field.defaultValue !== undefined) {
      fieldValue = field.defaultValue;
    }

    // Skip empty values (only after checking defaultValue)
    if (isEmpty(fieldValue)) {
      return;
    }

    // Include ALL fields in the prompt, regardless of sectionId
    // sectionId only determines where they go in the API request (body/extra_body),
    // but ALL field values should be included in the prompt text for the AI to process
    // This ensures the AI has access to all form data (text, numbers, dates, lists, etc.)

    // Format the value based on field type
    let formattedValue = '';

    // Helper function to extract label from option object, looking up from field.options if needed
    const extractLabelFromOption = (item: any, fieldOptions?: any[]): string => {
      // If item already has a label, use it
      if (item?.label) return item.label;
      
      // If item has an id, try to find the label from field.options
      if (item?.id && fieldOptions && Array.isArray(fieldOptions)) {
        const option = fieldOptions.find(
          (opt: any) => String(opt.id) === String(item.id) || String(opt.value) === String(item.id)
        );
        if (option?.label) return option.label;
      }
      
      // Fallback to id, name, value, or string representation
      return item?.id || item?.name || item?.value || String(item || '');
    };

    // Check if this is an array component that should use TOON format
    const isArrayComponent = [
      'checkbox-list',
      'radio',
      'toggle-group',
      'tag-input',
      'list-input',
      'picker' // Add picker to array components
    ].includes(field.component);

    // Check if select is multiple
    const isMultipleSelect = 
      field.component === 'select' &&
      (field.multiple || 
       field.metadata?.allowMultiselect ||
       field.selectionType === 'multiple' ||
       field.selectionMode === 'multiple' ||
       field.mode === 'multiple');

    // Check if picker allows multiselect
    const isMultiplePicker = 
      field.component === 'picker' &&
      (field.allowMultiselect || field.multiple);

    if (isArrayComponent || isMultipleSelect || isMultiplePicker) {
      // For picker with objects that only have id, enrich with labels from options
      if (field.component === 'picker' && Array.isArray(fieldValue) && field.options) {
        const enrichedValue = fieldValue.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            const label = extractLabelFromOption(item, field.options);
            return { ...item, label };
          }
          return item;
        });
        formattedValue = formatArrayFieldToToon(field.name || field.id || 'field', field, enrichedValue);
      } else {
        // Format arrays in TOON format (includes field label)
        formattedValue = formatArrayFieldToToon(field.name || field.id || 'field', field, fieldValue);
      }
      if (formattedValue) {
        // TOON format includes the field label, so just push it directly
        parts.push(formattedValue);
        return;
      }
    } else if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      // Handle array values (from picker, select, etc.)
      if (typeof fieldValue[0] === 'object' && fieldValue[0] !== null) {
        // Array of objects - extract labels
        formattedValue = fieldValue.map((item: any) => extractLabelFromOption(item, field.options)).join(', ');
      } else {
        // Plain array - join with commas
        formattedValue = fieldValue.map((item: any) => String(item)).join(', ');
      }
    } else if (field.component === 'select' || field.component === 'picker') {
      // For single select/picker with string/number value, find the option label
      if (typeof fieldValue === 'object' && fieldValue !== null) {
        // Object value - extract label
        formattedValue = extractLabelFromOption(fieldValue, field.options);
      } else {
        // String/number value - look up from options
        const option = field.options?.find(
          (opt: any) => String(opt.id) === String(fieldValue) || String(opt.value) === String(fieldValue)
        );
        formattedValue = option?.label || String(fieldValue);
        
        // Append option description if available
        if (option?.description) {
          formattedValue += `\n\n${option.description}`;
        }
      }
    } else if (typeof fieldValue === 'object' && fieldValue !== null) {
      // Handle single object (for toggle-group, radio, etc.)
      formattedValue = extractLabelFromOption(fieldValue, field.options);
      
      // Append option description if available
      if ((fieldValue as any).description) {
        formattedValue += `\n\n${(fieldValue as any).description}`;
      } else if (field.options) {
        // Try to find description from field options
        const option = field.options.find(
          (opt: any) => String(opt.id) === String((fieldValue as any).id) || String(opt.value) === String((fieldValue as any).value)
        );
        if (option?.description) {
          formattedValue += `\n\n${option.description}`;
        }
      }
    } else {
      formattedValue = String(fieldValue);
    }

    // For userPrompt field, strip any existing "User Prompt:" prefix to avoid duplication
    if ((field.name === 'userPrompt' || field.id === 'user-prompt') && formattedValue) {
      formattedValue = formattedValue.replace(/^User\s+Prompt:\s*/i, '').trim();
    }

    // Format field name: convert camelCase to Title Case
    const formatFieldName = (name: string): string => {
      return name
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
    };

    const displayLabel = formatFieldName(field.name || field.id || 'field');
    if (displayLabel) {
      parts.push(`${displayLabel}: ${formattedValue}`);
    } else {
      parts.push(formattedValue);
    }
  });

  let finalPrompt = parts.join('\n\n');
  
  // Append language instruction if language is specified
  if (outputLanguage && outputLanguage.toLowerCase() !== 'en') {
    finalPrompt += buildLanguageInstruction(outputLanguage);
  }

  return finalPrompt;
}

