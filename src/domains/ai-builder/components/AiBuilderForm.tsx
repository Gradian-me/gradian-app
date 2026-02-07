/**
 * AI Builder Form Component
 * Main form for entering prompts and selecting agents
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { FormElementFactory } from '@/gradian-ui/form-builder/form-elements/components/FormElementFactory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, validateField } from '@/gradian-ui/shared/utils';
import { Sparkles, Loader2, Square, History, RotateCcw, PencilRuler } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DEMO_MODE } from '@/gradian-ui/shared/configs/env-config';
import { LOG_CONFIG, LogType } from '@/gradian-ui/shared/configs/log-config';
import { PromptPreviewSheet } from './PromptPreviewSheet';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { LanguageSelector } from '@/gradian-ui/form-builder/form-elements/components/LanguageSelector';
import { formatArrayFieldToToon } from '../utils/prompt-builder';
import type { AiAgent } from '../types';
import { useBusinessRuleEffects, getFieldEffects } from '@/domains/business-rule-engine';
import type { BusinessRuleWithEffects, BusinessRuleEffectsMap } from '@/domains/business-rule-engine';
import { extractParametersBySectionId } from '../utils/ai-shared-utils';
import { summarizePrompt } from '../utils/ai-summarization-utils';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

// Separate component for field item to allow hook usage
interface FieldItemProps {
  field: any;
  formValues: Record<string, any>;
  formErrors: Record<string, string>;
  touched: Record<string, boolean>;
  isLoading: boolean;
  disabled: boolean;
  handleFieldChange: (fieldName: string, value: any) => void;
  handleFieldBlur: (fieldName: string) => void;
  handleFieldFocus: (fieldName: string) => void;
  ruleEffects?: BusinessRuleEffectsMap;
  agentBusinessRules?: BusinessRuleWithEffects[] | undefined;
  selectedAgent?: AiAgent | null;
}

const FieldItem: React.FC<FieldItemProps> = memo(({
  field,
  formValues,
  formErrors,
  touched,
  isLoading,
  disabled,
  handleFieldChange,
  handleFieldBlur,
  handleFieldFocus,
  ruleEffects,
  agentBusinessRules,
  selectedAgent,
}) => {
  // Get business rule effects (push-based model)
  let fieldEffects;
  if (agentBusinessRules && agentBusinessRules.length > 0 && ruleEffects) {
    // Use push-based model: get effects from ruleEffects
    const fieldId = field.id || field.name;
    const sectionId = field.sectionId || 'basic-info';
    fieldEffects = getFieldEffects(fieldId, sectionId, ruleEffects);
  } else {
    // Default effects when no business rules
    fieldEffects = {
      isVisible: true,
      isRequired: false,
      isDisabled: false,
    };
  }

  // Skip hidden fields (including business rule visibility)
  if (!fieldEffects.isVisible) {
    return null;
  }

  const fieldValue = formValues[field.name] ?? field.defaultValue ?? '';
  const fieldError = formErrors[field.name];
  const fieldTouched = touched[field.name];

  // Helper function to determine column span based on field config
  // Similar to AccordionFormSection.tsx
  const getColSpan = (field: any): number => {
    const gridColumns = 2; // Fixed 2-column grid for AiBuilderForm
    
    // First check for explicit colSpan at field level
    if (field.colSpan != null) {
      return field.colSpan;
    }
    
    // Fallback to layout.colSpan for backward compatibility
    if (field.layout?.colSpan != null) {
      return field.layout.colSpan;
    }

    // Then check for width percentages and convert to colSpan
    const width = field.layout?.width;
    
    if (width === '100%') {
      return gridColumns; // Full width spans all columns
    } else if (width === '50%') {
      return Math.ceil(gridColumns / 2); // Half width
    } else if (width === '33.33%' || width === '33.3%') {
      return Math.ceil(gridColumns / 3); // One third width
    } else if (width === '25%') {
      return Math.ceil(gridColumns / 4); // One fourth width
    } else if (width === '66.66%' || width === '66.6%') {
      return Math.ceil((gridColumns / 3) * 2); // Two thirds width
    } else if (width === '75%') {
      return Math.ceil((gridColumns / 4) * 3); // Three fourths width
    }
    
    // Default: textarea components span full width, others span 1 column
    if (field.component === 'textarea') {
      return gridColumns;
    }
    
    // Default to 1 column if no width specified
    return 1;
  };

  const colSpan = getColSpan(field);
  
  // Generate appropriate column span class for responsive grid
  // Mobile: always full width (1 column)
  // Tablet/Desktop: respect colSpan (1 or 2 columns)
  // For a 2-column grid: colSpan 1 = half width, colSpan 2 = full width
  let colSpanClass = 'col-span-1';
  if (colSpan >= 2) {
    // Full width: span both columns on md+ screens
    colSpanClass = 'col-span-1 md:col-span-2';
  } else {
    // Half width: span one column on md+ screens, full width on mobile
    colSpanClass = 'col-span-1 md:col-span-1';
  }

  // Special styling for textarea/prompt field
  const isPromptField = field.name === 'userPrompt' || field.id === 'user-prompt';
  const customClassName = isPromptField
    ? cn(
        'min-h-[120px] md:min-h-[140px] px-4 md:px-5 py-3 md:py-4 rounded-xl border',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
        'border-violet-200/50 dark:border-violet-700/50',
        'text-gray-900 dark:text-gray-100',
        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
        'focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:border-violet-400',
        'shadow-sm',
        'transition-all duration-200',
        'direction-auto',
        'leading-relaxed',
        'text-sm' // Responsive text size
      )
    : undefined;

  // Merge required state: business rule OR validation.required
  const validationRequired = field.validation?.required ?? false;
  const isRequired = fieldEffects.isRequired || validationRequired;
  // Merge disabled state: business rule OR existing disabled flags
  const isDisabled = fieldEffects.isDisabled || isLoading || disabled;

  // Check if we should show CopyContent in the label row
  const shouldShowCopyInLabel = field.component === 'textarea' && 
    selectedAgent?.requiredOutputFormat === 'string' && 
    fieldValue && 
    String(fieldValue).trim();

  return (
    <div 
      className={cn('relative space-y-2', colSpanClass)}
    >
      {(field.label || shouldShowCopyInLabel) && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            {field.label && (
              <label
                htmlFor={field.id || field.name}
                className="text-sm font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide block"
              >
                {field.label}
                {isRequired && <span className="text-red-500 ms-1">*</span>}
              </label>
            )}
            {field.component === 'list-input' && field.placeholder && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal normal-case">
                {field.placeholder}
              </p>
            )}
          </div>
          {shouldShowCopyInLabel && (
            <CopyContent content={String(fieldValue)} />
          )}
        </div>
      )}
      <FormElementFactory
        config={{
          ...field,
          label: '', // Hide default label since we're rendering custom one
        }}
        value={fieldValue}
        onChange={(value) => handleFieldChange(field.name, value)}
        onBlur={() => handleFieldBlur(field.name)}
        onFocus={() => handleFieldFocus(field.name)}
        disabled={isDisabled}
        error={fieldError && fieldTouched ? fieldError : undefined} // Show error only when field is touched
        touched={fieldTouched}
        required={isRequired}
        className={customClassName}
        {...(field.aiAgentId ? { aiAgentId: field.aiAgentId } : {})}
        {...(field.component === 'textarea' ? { 
          enableVoiceInput: true,
          loadingTextSwitches: selectedAgent?.loadingTextSwitches,
          canCopy: false // Disable canCopy in Textarea since we're showing it in the label row
        } : {})}
      />
    </div>
  );
});

interface AiBuilderFormProps {
  userPrompt: string;
  onPromptChange: (prompt: string) => void;
  agents: AiAgent[];
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onStop: () => void;
  systemPrompt?: string;
  isLoadingPreload?: boolean;
  isSheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  onReset?: () => void;
  displayType?: 'default' | 'hideForm' | 'showFooter';
  runType?: 'manual' | 'automatic';
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
  onFormValuesChange?: (formValues: Record<string, any>) => void; // Callback to expose formValues
  hidePreviewButton?: boolean; // Hide the preview button in PromptPreviewSheet (useful for dialog mode)
  hideAgentSelector?: boolean; // Hide agent dropdown selector
  hideSearchConfig?: boolean; // Hide search type and summarization controls
  hideImageConfig?: boolean; // Hide image type selector
  hideEditAgent?: boolean; // Hide Edit Agent button
  hidePromptHistory?: boolean; // Hide Prompt History button
  hideLanguageSelector?: boolean; // Hide language selector from form (use in footer instead)
  summarizedPrompt?: string; // Summarized version of the prompt (for search/image)
  isSummarizing?: boolean; // Whether summarization is in progress
}

export function AiBuilderForm({
  userPrompt,
  onPromptChange,
  agents,
  selectedAgentId,
  onAgentChange,
  isLoading,
  onGenerate,
  onStop,
  systemPrompt = '',
  isLoadingPreload = false,
  isSheetOpen = false,
  onSheetOpenChange,
  disabled = false,
  onReset,
  displayType = 'default',
  runType = 'manual',
  selectedLanguage = 'fa',
  onLanguageChange,
  onFormValuesChange,
  hidePreviewButton = false,
  hideAgentSelector = false,
  hideSearchConfig = false,
  hideImageConfig = false,
  hideEditAgent = false,
  hidePromptHistory = false,
  hideLanguageSelector = false,
  summarizedPrompt: propSummarizedPrompt,
  isSummarizing: propIsSummarizing,
}: AiBuilderFormProps) {
  // Filter agents to only show those with showInAgentMenu !== false
  const visibleAgents = useMemo(() => {
    return agents.filter(agent => agent.showInAgentMenu !== false);
  }, [agents]);

  // Get selected agent (from all agents, not just visible ones, to support programmatic selection)
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

  // Feature flag: show model badge only when AI_MODEL_LOG is enabled
  const showModelBadge = LOG_CONFIG[LogType.AI_MODEL_LOG] === true;

  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  // Check if agent has string output format
  const isStringOutput = selectedAgent?.requiredOutputFormat === 'string';

  // Filter renderComponents to only include form fields (exclude preloadRoutes and language fields for string output agents)
  const formFields = useMemo(() => {
    if (!selectedAgent?.renderComponents) return [];
    return selectedAgent.renderComponents.filter(
      (component) => {
        // Exclude preload routes
        if (!component.component || component.route) return false;
        // For string output agents, exclude language-related fields
        if (isStringOutput) {
          const fieldName = (component.name || component.id || '').toLowerCase();
          return !fieldName.includes('language') && !fieldName.includes('output-language');
        }
        return true;
      }
    );
  }, [selectedAgent, isStringOutput]);

  // State for form values - initialize with userPrompt
  const [formValues, setFormValues] = useState<Record<string, any>>({
    userPrompt: userPrompt,
    // Include selectedLanguage in formValues for all agents
    ...(selectedLanguage && selectedLanguage !== 'text' ? { 'output-language': selectedLanguage } : {}),
    // Search configuration defaults
    searchType: 'no-search',
    max_results: 5,
    // Summarization toggle (default: true)
    summarizeBeforeSearchImage: true,
  });

  // State for form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  // Use props for summarized prompt if provided, otherwise use local state (for backward compatibility)
  const [localSummarizedPrompt, setLocalSummarizedPrompt] = useState<string | null>(null);
  const [localIsSummarizing, setLocalIsSummarizing] = useState(false);
  const summarizedPrompt = propSummarizedPrompt !== undefined ? propSummarizedPrompt : localSummarizedPrompt;
  const isSummarizing = propIsSummarizing !== undefined ? propIsSummarizing : localIsSummarizing;

  // Build concatenated prompt from all field labels and values
  const buildConcatenatedPrompt = useCallback((values: Record<string, any>) => {
    if (!selectedAgent?.renderComponents || !formFields.length) return '';
    
    const parts: string[] = [];
    
    // Sort fields by order to maintain consistent order
    const sortedFields = [...formFields].sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      return orderA - orderB;
    });
    
    sortedFields.forEach((field) => {
      // Get value from formValues, fallback to defaultValue from field config
      let fieldValue = values[field.name];
      
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

      // Note: sectionId is used to determine where data goes in API calls (body/extra_body vs prompt),
      // but ALL fields should be included in the concatenated prompt for preview purposes
      
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
          // Format arrays in TOON format
          formattedValue = formatArrayFieldToToon(field.name || field.id || 'field', field, fieldValue);
        }
        if (formattedValue) {
          // For TOON format, we don't need a label prefix since the format is self-contained
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
          const option = field.options?.find((opt: any) => String(opt.id) === String(fieldValue) || String(opt.value) === String(fieldValue)) as any;
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
          ) as any;
          if (option?.description) {
            formattedValue += `\n\n${option.description}`;
          }
        }
      } else {
        formattedValue = String(fieldValue);
      }
      
      // For userPrompt field, strip any existing "User Prompt:" prefix to avoid duplication
      if ((field.name === 'userPrompt' || field.id === 'user-prompt') && formattedValue) {
        // Remove "User Prompt:" prefix if it exists (case insensitive, with optional whitespace)
        formattedValue = formattedValue.replace(/^User\s+Prompt:\s*/i, '').trim();
      }
      
      // Use field name for LLM prompt (standard field config)
      // Format name: convert camelCase to Title Case (e.g., "userPrompt" -> "User Prompt")
      const formatFieldName = (name: string): string => {
        return name
          .replace(/([A-Z])/g, ' $1') // Add space before capital letters
          .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
          .trim();
      };
      
      const displayLabel = formatFieldName(field.name);
      if (displayLabel) {
        parts.push(`${displayLabel}: ${formattedValue}`);
      } else {
        parts.push(formattedValue);
      }
    });
    
    let finalPrompt = parts.join('\n\n');
    
    // Check if the prompt already contains a language instruction
    // This prevents duplicating language instructions when user pastes text that already includes them
    const hasLanguageInstruction = /IMPORTANT OUTPUT LANGUAGE REQUIREMENT/i.test(finalPrompt);
    
    // Add language instructions if language is specified (check common language field names)
    // Also check selectedLanguage prop as fallback
    // Only add if not already present in the prompt
    const outputLanguage = values['output-language'] || values['outputLanguage'] || values['language'] || values['lang'] || selectedLanguage;
    if (!hasLanguageInstruction && outputLanguage && typeof outputLanguage === 'string' && outputLanguage.trim() && outputLanguage.toLowerCase() !== 'en' && outputLanguage !== 'text') {
      const languageMap: Record<string, string> = {
        'en': 'English',
        'fa': 'Persian (Farsi)',
        'ar': 'Arabic',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian'
      };
      
      const languageCode = outputLanguage.trim().toLowerCase();
      const languageName = languageMap[languageCode] || languageCode.toUpperCase();
      
      finalPrompt += `\n\nIMPORTANT OUTPUT LANGUAGE REQUIREMENT:\nAll output must be in ${languageName} (${languageCode.toUpperCase()}). This includes:\n- All titles, subtitles, and headings\n- All body text and descriptions\n- All user-facing content\n\nHowever, keep the following in English:\n- Professional and technical abbreviations (e.g., API, JSON, HTTP, CSS, HTML, SQL, UUID, ID, URL)\n- Industry-standard terms and acronyms (e.g., SEO, CRM, UX, UI, SDK, IDE, CLI)\n- Programming language keywords and syntax\n- Technical specification names and standards\n- Brand names and product names that are internationally recognized\n- Scientific and medical terminology abbreviations\n\nEnsure natural, fluent ${languageName} while preserving essential English technical terms.`;
    }
    
    return finalPrompt;
  }, [formFields, selectedAgent?.renderComponents, selectedLanguage]);

  // Reset form values when agent changes (NOT when language changes)
  // Use ref for buildConcatenatedPrompt to avoid resetting form when language changes
  const buildConcatenatedPromptForResetRef = useRef(buildConcatenatedPrompt);
  useEffect(() => {
    buildConcatenatedPromptForResetRef.current = buildConcatenatedPrompt;
  }, [buildConcatenatedPrompt]);
  
  // Track previous agent ID to only reset when agent actually changes
  const prevAgentIdRef = useRef<string>(selectedAgentId);
  
  useEffect(() => {
    // Only reset if agent ID actually changed
    if (prevAgentIdRef.current === selectedAgentId) {
      return;
    }
    prevAgentIdRef.current = selectedAgentId;
    
    if (!selectedAgent?.renderComponents) return;
    
    const fields = selectedAgent.renderComponents.filter(
      (component) => component.component && !component.route
    );
    
    if (!fields.length) return;
    
    const initialValues: Record<string, any> = {};
    
    // Initialize all fields with their defaultValues or empty values
    fields.forEach((field) => {
      if (field.name === 'userPrompt' || field.id === 'user-prompt') {
        // Extract only the actual user prompt text, not the concatenated version with metadata
        // The input field should only show the user's actual prompt text
        // Metadata (language requirement, max_results, etc.) will be added when generating
        let promptValue = userPrompt || '';
        if (promptValue) {
          // Remove "User Prompt:" prefix if it exists (case insensitive, with optional whitespace)
          promptValue = promptValue.replace(/^User\s+Prompt:\s*/i, '').trim();
          
          // Remove language requirement section if present (everything from "IMPORTANT OUTPUT LANGUAGE REQUIREMENT" to end)
          promptValue = promptValue.replace(/\n\nIMPORTANT OUTPUT LANGUAGE REQUIREMENT:[\s\S]*$/i, '').trim();
          
          // Remove other metadata fields that might be in the prompt
          // These patterns match field labels like "Max_results: 5", "Search Type: ...", etc.
          promptValue = promptValue.replace(/\n\n(Max_results|Max Results|Search Type|Image Type|Summarize Before Search Image|Summarize Before Search|Output Language|Language):\s*[^\n]*(?:\n|$)/gi, '').trim();
          
          // Remove any remaining field labels that might have been added
          // This catches any "Field Name: value" patterns that weren't caught above
          promptValue = promptValue.replace(/\n\n[A-Z][^:]+:\s*[^\n]*(?:\n|$)/g, '').trim();
        }
        initialValues[field.name] = promptValue;
      } else {
        // Use defaultValue or empty value for other fields
        initialValues[field.name] = field.defaultValue ?? '';
      }
    });
    
    // Always include selectedLanguage in formValues if it's set
    if (selectedLanguage && selectedLanguage !== 'text') {
      initialValues['output-language'] = selectedLanguage;
    }
    
    // Initialize search configuration defaults
    initialValues.searchType = initialValues.searchType ?? 'no-search';
    initialValues.max_results = initialValues.max_results ?? 5;
    // Initialize summarization toggle (default: true)
    initialValues.summarizeBeforeSearchImage = initialValues.summarizeBeforeSearchImage ?? true;
    
    setFormValues(initialValues);
    
    // Reset errors and touched when agent changes
    setFormErrors({});
    setTouched({});
    
    // Validate required fields after initialization
    const initialErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.validation?.required) {
        const value = initialValues[field.name];
        const validationResult = validateField(value, field.validation);
        if (!validationResult.isValid) {
          initialErrors[field.name] = validationResult.error || getT(TRANSLATION_KEYS.MESSAGE_FIELD_REQUIRED, language, defaultLang);
        }
      }
    });
    if (Object.keys(initialErrors).length > 0) {
      setFormErrors(initialErrors);
    }
    
    // Defer parent callbacks to avoid updating parent state during render
    queueMicrotask(() => {
      // Notify parent of formValues change
      if (onFormValuesChange) {
        onFormValuesChange(initialValues);
      }
      
      // Don't update userPrompt here - it should only contain the actual user prompt text
      // The full concatenated prompt (with metadata) will be built when generating
      // For now, just set the user prompt to the extracted text value
      const promptFieldValue = initialValues['userPrompt'] || initialValues['user-prompt'] || '';
      if (promptFieldValue) {
        onPromptChange(promptFieldValue);
      } else {
        onPromptChange('');
      }
    });
  }, [selectedAgentId, selectedAgent, userPrompt, onFormValuesChange, onPromptChange, selectedLanguage]); // Only reset when agent ID changes, not when buildConcatenatedPrompt changes

  // Track previous selectedLanguage to avoid unnecessary updates
  const prevSelectedLanguageRef = useRef<string | undefined>(selectedLanguage);
  const buildConcatenatedPromptRef = useRef(buildConcatenatedPrompt);
  const onPromptChangeRef = useRef(onPromptChange);
  const onFormValuesChangeRef = useRef(onFormValuesChange);
  
  // Keep refs updated
  useEffect(() => {
    buildConcatenatedPromptRef.current = buildConcatenatedPrompt;
    onPromptChangeRef.current = onPromptChange;
    onFormValuesChangeRef.current = onFormValuesChange;
  }, [buildConcatenatedPrompt, onPromptChange, onFormValuesChange]);
  
  // Sync selectedLanguage with formValues and rebuild prompt when language changes
  // This effect ONLY updates the language field and rebuilds the prompt - it does NOT touch other form values
  useEffect(() => {
    // Only update if language actually changed
    if (prevSelectedLanguageRef.current === selectedLanguage) {
      return;
    }
    prevSelectedLanguageRef.current = selectedLanguage;
    
    // Use functional update to preserve ALL existing form values
    setFormValues((prevFormValues) => {
      // Create a copy to avoid mutating the previous state
      const newFormValues = { ...prevFormValues };
      
      if (selectedLanguage && selectedLanguage !== 'text') {
        // Only update if language is different from current formValues
        if (newFormValues['output-language'] === selectedLanguage) {
          // Language hasn't changed, no need to update
          return prevFormValues; // Return previous to avoid unnecessary update
        }
        
        // Update only the language field, preserve everything else
        newFormValues['output-language'] = selectedLanguage;
      } else {
        // Remove language if selectedLanguage is 'text' or empty
        if (newFormValues['output-language']) {
          delete newFormValues['output-language'];
        } else {
          // No language field to remove, no change needed
          return prevFormValues; // Return previous to avoid unnecessary update
        }
      }
      
      // Notify parent of formValues change (only language field changed)
      if (onFormValuesChangeRef.current) {
        onFormValuesChangeRef.current(newFormValues);
      }
      
      // Don't update userPrompt here - it should only contain the actual user prompt text
      // The full concatenated prompt (with language instruction) will be built when generating
      // Extract just the user prompt text from formValues
      const promptFieldValue = newFormValues['userPrompt'] || newFormValues['user-prompt'] || '';
      const promptText = typeof promptFieldValue === 'string' ? promptFieldValue : String(promptFieldValue || '');
      onPromptChangeRef.current(promptText);
      
      return newFormValues;
    });
  }, [selectedLanguage]); // Only depend on selectedLanguage

  // Build initial prompt when component mounts with formValues
  // This ensures prompt is built even when language is 'fa' and no onChange event occurs
  // This is especially important for 'en' because no language instruction is added, so the prompt
  // relies entirely on form field values
  const hasBuiltInitialPromptRef = useRef(false);
  const prevAgentIdForInitialBuildRef = useRef<string | undefined>(selectedAgentId);
  useEffect(() => {
    // Only build on initial mount or when agent changes
    const isAgentChange = prevAgentIdForInitialBuildRef.current !== selectedAgentId;
    if (isAgentChange) {
      prevAgentIdForInitialBuildRef.current = selectedAgentId;
      hasBuiltInitialPromptRef.current = false; // Reset for new agent
    }
    
    // When agent/formFields are ready and formValues exist, extract just the user prompt text
    // Don't build the full concatenated prompt here - that will be done when generating
    if (!hasBuiltInitialPromptRef.current && selectedAgent && formFields.length > 0 && Object.keys(formValues).length > 0) {
      hasBuiltInitialPromptRef.current = true;
      // Extract just the user prompt text from formValues (no metadata)
      const promptFieldValue = formValues['userPrompt'] || formValues['user-prompt'] || '';
      const promptText = typeof promptFieldValue === 'string' ? promptFieldValue : String(promptFieldValue || '');
      // Defer to avoid updating parent state during render
      queueMicrotask(() => {
        onPromptChange(promptText);
      });
    }
  }, [selectedAgentId, selectedAgent, formFields.length, formValues, buildConcatenatedPrompt, onPromptChange]);

  // Compute summarized prompt for preview when sheet opens and summarization is enabled
  // Only run if props are not provided (for backward compatibility)
  // If props are provided, summarization is handled in useAiBuilder
  useEffect(() => {
    // If props are provided, don't do local summarization
    if (propSummarizedPrompt !== undefined || propIsSummarizing !== undefined) {
      return;
    }

    if (!isSheetOpen) {
      // Reset when sheet closes
      setLocalSummarizedPrompt(null);
      setLocalIsSummarizing(false);
      return;
    }

    // Check if summarization is enabled
    const shouldSummarize = formValues.summarizeBeforeSearchImage !== false;
    const searchType = formValues.searchType || 'no-search';
    const isSearchEnabled = searchType && searchType !== 'no-search';
    const imageType = formValues.imageType || 'none';
    const isImageEnabled = imageType && imageType !== 'none';
    
    // Only summarize if enabled and search/image is configured
    if (shouldSummarize && (isSearchEnabled || isImageEnabled) && userPrompt.trim()) {
      setLocalIsSummarizing(true);
      const abortController = new AbortController();
      
      summarizePrompt(userPrompt.trim(), abortController.signal, 60000, undefined, selectedLanguage)
        .then((summary) => {
          if (!abortController.signal.aborted) {
            setLocalSummarizedPrompt(summary);
            setLocalIsSummarizing(false);
          }
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            // On error, don't show summary (will fallback to original)
            setLocalSummarizedPrompt(null);
            setLocalIsSummarizing(false);
          }
        });
      
      return () => {
        abortController.abort();
      };
    } else {
      // Reset if summarization is not needed
      setLocalSummarizedPrompt(null);
      setLocalIsSummarizing(false);
    }
  }, [isSheetOpen, formValues.summarizeBeforeSearchImage, formValues.searchType, formValues.imageType, userPrompt, selectedLanguage, propSummarizedPrompt, propIsSummarizing]);

  // Sync userPrompt with formValues when userPrompt changes externally
  // This handles external updates to userPrompt (e.g., from parent component)
  // When displayType is 'hideForm', we need to ensure userPrompt is in formValues
  useEffect(() => {
    // When displayType is 'hideForm', sync userPrompt prop directly to formValues
    if (displayType === 'hideForm') {
      const currentPromptValue = formValues['userPrompt'] || formValues['user-prompt'] || '';
      if (userPrompt !== currentPromptValue && userPrompt.trim() !== '') {
        setFormValues((prev) => ({
          ...prev,
          userPrompt: userPrompt,
        }));
      }
    } else {
      // For other display types, only sync if userPrompt is different from what we would generate
    const currentConcatenatedPrompt = buildConcatenatedPrompt(formValues);
    if (userPrompt !== currentConcatenatedPrompt && userPrompt.trim() !== '') {
      // If userPrompt was set externally and doesn't match our concatenated version,
      // we might need to parse it back, but for now we'll just ignore external updates
      // since the prompt should be built from formValues
    }
    }
  }, [userPrompt, formValues, buildConcatenatedPrompt, displayType]);

  // Handle field value change
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    // Extract the actual value from NormalizedOption array for select fields
    let actualValue = value;
    const currentField = formFields.find((f) => f.name === fieldName);
    
    if (currentField?.component === 'select' && Array.isArray(value) && value.length > 0) {
      // For select, extract the ID from the NormalizedOption array
      const normalizedOption = value[0];
      actualValue = normalizedOption?.id || normalizedOption?.value || value;
    }
    
    const newFormValues = {
      ...formValues,
      [fieldName]: actualValue,
    };
    
    // Ensure selectedLanguage is always in formValues
    if (selectedLanguage && selectedLanguage !== 'text') {
      newFormValues['output-language'] = selectedLanguage;
    }
    
    setFormValues(newFormValues);
    
    // Notify parent of formValues change
    if (onFormValuesChange) {
      onFormValuesChange(newFormValues);
    }

    // For userPrompt field, only update with the actual text (no metadata)
    // The full concatenated prompt (with metadata) will be built by buildStandardizedPrompt when generating
    if (fieldName === 'userPrompt' || fieldName === 'user-prompt') {
      // Use the actual text value directly - no need to build concatenated prompt
      // The input field should only show the user's actual prompt text
      const promptText = typeof actualValue === 'string' ? actualValue : String(actualValue || '');
      onPromptChange(promptText);
    } else {
      // For other fields, we still need to update the userPrompt to reflect changes
      // But we should extract only the user prompt text from formValues, not build the full concatenated version
      // The full prompt will be built when generating
      const promptFieldValue = newFormValues['userPrompt'] || newFormValues['user-prompt'] || '';
      // Extract just the text, removing any metadata that might have been added
      let promptText = typeof promptFieldValue === 'string' ? promptFieldValue : String(promptFieldValue || '');
      promptText = promptText.replace(/\n\nIMPORTANT OUTPUT LANGUAGE REQUIREMENT:[\s\S]*$/i, '').trim();
      promptText = promptText.replace(/\n\n(Max_results|Max Results|Search Type|Image Type|Summarize Before Search Image|Summarize Before Search|Output Language|Language):\s*[^\n]*(?:\n|$)/gi, '').trim();
      onPromptChange(promptText);
    }

    // Clear error when user starts typing
    if (formErrors[fieldName]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }

    // Validate field
    if (currentField?.validation) {
      const validationResult = validateField(actualValue, currentField.validation);
      if (!validationResult.isValid) {
        setFormErrors((prev) => ({
          ...prev,
          [fieldName]: validationResult.error || 'Invalid value',
        }));
      }
    }
  }, [formValues, formFields, formErrors, buildConcatenatedPrompt, onPromptChange, selectedLanguage, onFormValuesChange]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));

    // Validate on blur
    const currentField = formFields.find((f) => f.name === fieldName);
    const value = formValues[fieldName];
    if (currentField?.validation) {
      const validationResult = validateField(value, currentField.validation);
      if (!validationResult.isValid) {
        setFormErrors((prev) => ({
          ...prev,
          [fieldName]: validationResult.error || 'Invalid value',
        }));
      } else {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      }
    }
  }, [formValues, formFields]);

  // Validate all required fields
  const validateAllFields = useCallback(() => {
    const errors: Record<string, string> = {};
    
    formFields.forEach((field) => {
      if (field.validation?.required) {
        const value = formValues[field.name];
        const validationResult = validateField(value, field.validation);
        if (!validationResult.isValid) {
          errors[field.name] = validationResult.error || getT(TRANSLATION_KEYS.MESSAGE_FIELD_REQUIRED, language, defaultLang);
        }
      }
    });
    
    setFormErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, [formFields, formValues, language, defaultLang]);

  // Check if form is valid (all required fields filled)
  const isFormValid = useMemo(() => {
    // First check if there are any validation errors
    if (Object.keys(formErrors).length > 0) {
      return false;
    }
    
    // Then check if all required fields have values
    return formFields.every((field) => {
      if (field.validation?.required) {
        const value = formValues[field.name];
        // Check for empty values
        if (value === undefined || value === null || value === '') {
          return false;
        }
        // For select fields, check if it's an empty array
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }
        // For objects (like NormalizedOption), check if it's actually empty
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
          return false;
        }
      }
      return true;
    });
  }, [formFields, formValues, formErrors]);

  // Handle field focus
  const handleFieldFocus = useCallback((fieldName: string) => {
    // Could add focus handling if needed
  }, []);

  // Auto-resize textarea with max 8 lines (for textarea fields)
  useEffect(() => {
    const resizeTextarea = () => {
      const promptField = formFields.find(
        (field) => (field.name === 'userPrompt' || field.id === 'user-prompt') && field.component === 'textarea'
      );
      if (promptField) {
        // Try both id and name as the element ID
        const textareaId = promptField.id || promptField.name;
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
        
        if (textarea) {
          // Reset height to auto to get accurate scrollHeight
          textarea.style.height = 'auto';
          const scrollHeight = textarea.scrollHeight;
          const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
          const maxHeight = lineHeight * 8; // 8 lines max
          
          if (scrollHeight <= maxHeight) {
            textarea.style.height = `${scrollHeight}px`;
            textarea.style.overflowY = 'hidden';
          } else {
            textarea.style.height = `${maxHeight}px`;
            textarea.style.overflowY = 'auto';
          }
        }
      }
    };

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      resizeTextarea();
    }, 0);

    // Also add event listener for input changes
    const promptField = formFields.find(
      (field) => (field.name === 'userPrompt' || field.id === 'user-prompt') && field.component === 'textarea'
    );
    if (promptField) {
      const textareaId = promptField.id || promptField.name;
      const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
      
      if (textarea) {
        const handleInput = () => resizeTextarea();
        textarea.addEventListener('input', handleInput);
        
        return () => {
          clearTimeout(timeoutId);
          textarea.removeEventListener('input', handleInput);
        };
      }
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [formValues, formFields]);

  // Find the prompt field, agent select field, and imageType field
  const promptField = formFields.find(
    (field) => field.name === 'userPrompt' || field.id === 'user-prompt'
  );
  const agentSelectField = formFields.find(
    (field) => field.name === 'aiAgentSelect' || field.id === 'ai-agent-select'
  );
  const imageTypeField = formFields.find(
    (field) => field.name === 'imageType' || field.id === 'imageType'
  );

  // Default imageType field configuration (used when not in agent's renderComponents)
  // IMPORTANT: sectionId must be 'body' so it gets extracted into body params
  const defaultImageTypeField = useMemo(() => ({
    id: 'imageType',
    name: 'imageType',
    label: 'Image Type',
    sectionId: 'body', // Must be 'body' to be included in body params
    component: 'select',
    type: 'select',
    defaultValue: 'none',
    options: [
      { id: 'none', label: 'No Image', icon: 'X', color: 'default' },
      { id: 'standard', label: 'Standard', icon: 'Image', color: 'default' },
      { id: 'infographic', label: 'Infographic', icon: 'FileText', color: 'default' },
      { id: '3d-model', label: '3D Model', icon: 'Box', color: 'default' },
      { id: 'creative', label: 'Creative', icon: 'Palette', color: 'default' },
      { id: 'sketch', label: 'Sketch', icon: 'Pencil', color: 'default' },
      { id: 'comic-book', label: 'Comic Book', icon: 'BookOpen', color: 'default' },
      { id: 'iconic', label: 'Iconic', icon: 'Star', color: 'default' },
      { id: 'editorial', label: 'Editorial', icon: 'Newspaper', color: 'default' },
      { id: 'random', label: 'Random', icon: 'Shuffle', color: 'default' },
      { id: 'blueprint', label: 'Blueprint', icon: 'DraftingCompass', color: 'default' },
      { id: 'vector-illustration', label: 'Vector Illustration', icon: 'Layers', color: 'default' },
      { id: 'architectural', label: 'Architectural', icon: 'Building', color: 'default' },
      { id: 'isometric', label: 'Isometric', icon: 'Box', color: 'default' },
      { id: 'portrait', label: 'Portrait', icon: 'User', color: 'default' },
      { id: 'fashion', label: 'Fashion', icon: 'Shirt', color: 'default' },
      { id: 'product-photography', label: 'Product Photography', icon: 'Package', color: 'default' },
      { id: 'landscape', label: 'Landscape', icon: 'Mountain', color: 'default' },
      { id: 'tilt-shift', label: 'Tilt-Shift', icon: 'Focus', color: 'default' },
      { id: 'cinematic', label: 'Cinematic', icon: 'Film', color: 'default' },
      { id: 'polaroid', label: 'Polaroid', icon: 'Image', color: 'default' },
      { id: 'lego-style', label: 'Lego Style', icon: 'Grid3x3', color: 'default' },
      { id: 'disney', label: 'Disney', icon: 'Sparkles', color: 'default' },
      { id: 'red-dead', label: 'Red Dead Redemption', icon: 'ChessKnight', color: 'default' },
      { id: 'gta-style', label: 'GTA Style', icon: 'House', color: 'default' },
      { id: 'xray', label: 'X-Ray', icon: 'XRay', color: 'default' },
      { id: 'mindmap', label: 'Mindmap', icon: 'Network', color: 'default' },
      { id: 'timeline', label: 'Timeline', icon: 'Clock', color: 'default' },
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', color: 'default' },
      { id: 'negative-space', label: 'Negative Space', icon: 'Minus', color: 'default' },
      { id: 'abstract', label: 'Abstract', icon: 'Palette', color: 'default' },
      { id: 'retro', label: 'Retro', icon: 'Clock', color: 'default' },
      { id: 'poster', label: 'Poster', icon: 'RectangleHorizontal', color: 'default' },
      { id: 'photocopy', label: 'Photocopy', icon: 'Copy', color: 'default' },
      { id: 'newspaper', label: 'Newspaper', icon: 'Newspaper', color: 'default' },
      { id: 'collage', label: 'Collage', icon: 'Layers', color: 'default' },
      { id: 'paper-craft', label: 'Paper Craft', icon: 'Scissors', color: 'default' },
      { id: 'mockup', label: 'Mockup', icon: 'Monitor', color: 'default' },
      { id: 'persian', label: 'Persian', icon: 'Sparkles', color: 'default' },
      { id: 'hollywood-movie', label: 'Hollywood Movie', icon: 'Film', color: 'default' },
      { id: 'new-york', label: 'New York', icon: 'Building2', color: 'default' },
      { id: 'cyberpunk', label: 'Cyberpunk', icon: 'Zap', color: 'default' },
      { id: 'retro-miami', label: 'Retro Miami', icon: 'Sun', color: 'default' },
    ],
    validation: { required: false },
    colSpan: 1,
    order: 0,
  }), []);

  // Use imageTypeField from agent if available, otherwise use default
  const effectiveImageTypeField = imageTypeField || defaultImageTypeField;

  // Sort fields by order if available
  const sortedFields = [...formFields].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });

  // Get all field IDs for business rule effects (push-based model)
  const fieldIds = useMemo(() => sortedFields.map((f) => f.id || f.name), [sortedFields]);
  const sectionIds = useMemo(() => {
    const sections = new Set<string>();
    sortedFields.forEach((f) => {
      if (f.sectionId) sections.add(f.sectionId);
    });
    return Array.from(sections);
  }, [sortedFields]);

  // Evaluate business rule effects (push-based model) if businessRules exist at agent level
  const agentBusinessRules = (selectedAgent as any)?.businessRules as BusinessRuleWithEffects[] | undefined;
  const ruleEffects = useBusinessRuleEffects(
    agentBusinessRules,
    formValues,
    fieldIds,
    sectionIds
  );

  // Determine what to show based on displayType
  // Show form container when default/showFooter OR when runType is manual (to show footer)
  const showForm = displayType === 'default' || displayType === 'showFooter' || (displayType === 'hideForm' && runType === 'manual');
  // Show footer when showFooter/default OR when runType is manual (even if hideForm)
  const showFooter = displayType === 'showFooter' || displayType === 'default' || (displayType === 'hideForm' && runType === 'manual');

  return (
    <div className="space-y-6">
      {showForm && (
        <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/50 shadow-sm">
          <div className="relative p-4 md:p-6 space-y-4">
            {/* Header Section */}
            {displayType === 'default' && (
              <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center flex-wrap gap-3 md:gap-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto">
                  {/* Agent Select - use renderComponents if available, otherwise fallback */}
                  {!hideAgentSelector && (agentSelectField ? (
                    <div className="w-full md:w-72">
                      <FormElementFactory
                        config={{
                          ...agentSelectField,
                          options: visibleAgents.map(agent => ({
                            id: agent.id,
                            label: agent.label,
                            icon: agent.icon,
                          })),
                        }}
                        value={selectedAgentId}
                        onChange={(value) => {
                          // Handle both string and NormalizedOption[] from Select
                          if (Array.isArray(value) && value.length > 0) {
                            onAgentChange(value[0].id as string);
                          } else if (typeof value === 'string') {
                            onAgentChange(value);
                          }
                        }}
                        disabled={isLoading || disabled}
                        error={formErrors[agentSelectField.name]}
                        touched={touched[agentSelectField.name]}
                        onBlur={() => handleFieldBlur(agentSelectField.name)}
                        onFocus={() => handleFieldFocus(agentSelectField.name)}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-72">
                      <FormElementFactory
                        config={{
                          id: 'ai-agent-select',
                          name: 'aiAgentSelect',
                          label: '',
                          component: 'select',
                          type: 'select',
                          options: visibleAgents.map(agent => ({
                            id: agent.id,
                            label: agent.label,
                            icon: agent.icon,
                            category: agent.category,
                          })),
                        }}
                        value={selectedAgentId}
                        onChange={(value) => {
                          // Handle both string and NormalizedOption[] from Select
                          if (Array.isArray(value) && value.length > 0) {
                            onAgentChange(value[0].id as string);
                          } else if (typeof value === 'string') {
                            onAgentChange(value);
                          }
                        }}
                        disabled={isLoading || disabled}
                        className="w-full text-sm md:text-base"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!hideEditAgent && DEMO_MODE && selectedAgentId && (
                      <Link href={`/builder/ai-agents/${selectedAgentId}`} className="flex-1 sm:flex-initial">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-full md:w-auto shrink-0"
                          title={getT(TRANSLATION_KEYS.AI_BUILDER_EDIT_AGENT, language, defaultLang)}
                        >
                          <PencilRuler className="h-4 w-4 me-2" />
                          <span className="hidden md:inline">{getT(TRANSLATION_KEYS.AI_BUILDER_EDIT_AGENT, language, defaultLang)}</span>
                          <span className="md:hidden">{getT(TRANSLATION_KEYS.AI_BUILDER_EDIT_SHORT, language, defaultLang)}</span>
                        </Button>
                      </Link>
                    )}
                    {onReset && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onReset}
                        className="h-9 w-9 md:w-9 p-0 shrink-0"
                        title="Reset everything"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    {!hidePromptHistory && (
                      <Link href="/ai-prompts" target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-initial">
                        <Button variant="outline" size="sm" className="gap-2 w-full md:w-auto shrink-0">
                          <History className="h-4 w-4" />
                          <span className="hidden md:inline">{getT(TRANSLATION_KEYS.AI_BUILDER_PROMPT_HISTORY, language, defaultLang)}</span>
                          <span className="md:hidden">{getT(TRANSLATION_KEYS.AI_BUILDER_HISTORY_SHORT, language, defaultLang)}</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Render form fields from renderComponents in responsive grid */}
            {displayType === 'default' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedFields.map((field) => {
                  // Skip agent select field as it's rendered in header
                  if (field.name === 'aiAgentSelect' || field.id === 'ai-agent-select') {
                    return null;
                  }
                  // Skip imageType field as it's rendered in footer
                  if (field.name === 'imageType' || field.id === 'imageType') {
                    return null;
                  }

                  return (
                    <FieldItem
                      key={field.id || field.name}
                      field={field}
                      formValues={formValues}
                      formErrors={formErrors}
                      touched={touched}
                      isLoading={isLoading}
                      disabled={disabled}
                      handleFieldChange={handleFieldChange}
                      handleFieldBlur={handleFieldBlur}
                      handleFieldFocus={handleFieldFocus}
                      ruleEffects={ruleEffects}
                      agentBusinessRules={agentBusinessRules}
                      selectedAgent={selectedAgent}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Footer Section with Model Badge and Buttons */}
            {showFooter && (
              <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3 md:gap-2 pt-2 border-t border-violet-200/50 dark:border-violet-800/50 min-w-0">
                {/* Model Badge */}
                {showModelBadge && selectedAgent?.model && (
                  <Badge 
                    className={cn(
                      'shrink-0 self-start',
                      'bg-violet-100 text-cyan-700 border-cyan-200',
                      'dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800',
                      'font-medium shadow-sm'
                    )}
                  >
                    {selectedAgent.model}
                  </Badge>
                )}
                
                {/* Buttons */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto md:flex-wrap min-w-0">
                  {onSheetOpenChange && (
                    <>
                      {!hideLanguageSelector && onLanguageChange && (
                        <div className="w-full md:w-36 min-w-0 shrink-0">
                          <LanguageSelector
                            config={{
                              name: 'output-language',
                              label: '',
                              placeholder: getT(TRANSLATION_KEYS.AI_BUILDER_LABEL_LANGUAGE, language, defaultLang),
                            }}
                            value={selectedLanguage || 'fa'}
                            onChange={(lang) => {
                              const languageValue = lang || 'fa';
                              onLanguageChange(languageValue);
                              // Also update formValues to include language
                              const newFormValues: Record<string, any> = {
                                ...formValues,
                                'output-language': languageValue,
                              };
                              setFormValues(newFormValues);
                              // Notify parent of formValues change
                              if (onFormValuesChange) {
                                onFormValuesChange(newFormValues);
                              }
                              // Don't update userPrompt here - it should only contain the actual user prompt text
                              // The full concatenated prompt (with language instruction) will be built when generating
                              // Extract just the user prompt text from formValues
                              const promptFieldValue = newFormValues['userPrompt'] || newFormValues['user-prompt'] || '';
                              const promptText = typeof promptFieldValue === 'string' ? promptFieldValue : String(promptFieldValue || '');
                              onPromptChange(promptText);
                            }}
                            defaultLanguage="fa"
                            disabled={isLoading || disabled}
                          />
                        </div>
                      )}
                      {!hideImageConfig && (
                        <div className="w-full md:w-40 min-w-0 shrink-0">
                          <FormElementFactory
                            config={{
                              ...effectiveImageTypeField,
                              label: '',
                            }}
                            value={formValues[effectiveImageTypeField.name] || effectiveImageTypeField.defaultValue || 'none'}
                            onChange={(value) => {
                              // Handle both string and NormalizedOption[] from Select
                              let actualValue = value;
                              if (Array.isArray(value) && value.length > 0) {
                                actualValue = value[0].id || value[0].value || value;
                              } else if (typeof value === 'string') {
                                actualValue = value;
                              }
                              
                                const newFormValues = {
                                  ...formValues,
                                [effectiveImageTypeField.name]: actualValue,
                                };
                                setFormValues(newFormValues);
                                // Notify parent of formValues change
                                if (onFormValuesChange) {
                                  onFormValuesChange(newFormValues);
                                }
                              }}
                              disabled={isLoading || disabled}
                            error={formErrors[effectiveImageTypeField.name]}
                            touched={touched[effectiveImageTypeField.name]}
                            onBlur={() => handleFieldBlur(effectiveImageTypeField.name)}
                            onFocus={() => handleFieldFocus(effectiveImageTypeField.name)}
                            className="w-full"
                            />
                          </div>
                        )}
                      {/* Search Configuration */}
                      {!hideSearchConfig && (
                        <>
                          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto min-w-0">
                            <div className="w-full md:w-48 min-w-0 shrink-0">
                              <FormElementFactory
                                config={{
                                  id: 'search-type',
                                  name: 'searchType',
                                  label: '',
                                  component: 'select',
                                  type: 'select',
                                  options: [
                                    { 
                                      id: 'no-search', 
                                      label: 'No Search',
                                      icon: 'X',
                                      color: 'default'
                                    },
                                    { 
                                      id: 'basic', 
                                      label: 'Basic Search',
                                      icon: 'Search',
                                      color: 'default'
                                    },
                                    { 
                                      id: 'advanced', 
                                      label: 'Advanced Search',
                                      icon: 'Search',
                                      color: 'default'
                                    },
                                    { 
                                      id: 'deep', 
                                      label: 'Deep Search',
                                      icon: 'Search',
                                      color: 'default'
                                    },
                                  ],
                                  defaultValue: 'no-search',
                                }}
                                value={formValues.searchType || 'no-search'}
                                onChange={(value) => {
                                  let actualValue = value;
                                  if (Array.isArray(value) && value.length > 0) {
                                    actualValue = value[0].id || value[0].value || value;
                                  } else if (typeof value === 'string') {
                                    actualValue = value;
                                  }
                                  const newFormValues = {
                                    ...formValues,
                                    searchType: actualValue,
                                  };
                                  setFormValues(newFormValues);
                                  if (onFormValuesChange) {
                                    onFormValuesChange(newFormValues);
                                  }
                                }}
                                disabled={isLoading || disabled}
                                className="w-full"
                              />
                            </div>
                          </div>
                          {/* Summarization Toggle */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              id="summarize-before-search-image"
                              checked={formValues.summarizeBeforeSearchImage ?? true}
                              onCheckedChange={(checked) => {
                                const newFormValues = {
                                  ...formValues,
                                  summarizeBeforeSearchImage: checked,
                                };
                                setFormValues(newFormValues);
                                if (onFormValuesChange) {
                                  onFormValuesChange(newFormValues);
                                }
                              }}
                              disabled={isLoading || disabled}
                            />
                            <Label
                              htmlFor="summarize-before-search-image"
                              className="text-sm font-normal cursor-pointer"
                              title={getT(TRANSLATION_KEYS.AI_BUILDER_SUMMARIZE_TOOLTIP, language, defaultLang)}
                            >
                              {getT(TRANSLATION_KEYS.AI_BUILDER_SUMMARIZE, language, defaultLang)}
                            </Label>
                          </div>
                        </>
                      )}
                      {(() => {
                        const params = selectedAgent && formValues 
                          ? extractParametersBySectionId(selectedAgent, formValues)
                          : { body: {}, extra: {}, prompt: {} };
                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                        return (
                          <PromptPreviewSheet
                            isOpen={isSheetOpen}
                            onOpenChange={onSheetOpenChange}
                            systemPrompt={systemPrompt}
                            userPrompt={userPrompt}
                            isLoadingPreload={isLoadingPreload}
                            disabled={disabled}
                            extraBody={Object.keys(params.extra).length > 0 ? params.extra : undefined}
                            bodyParams={Object.keys(params.body).length > 0 ? params.body : undefined}
                            requiredOutputFormat={selectedAgent?.requiredOutputFormat}
                            agent={selectedAgent}
                            formValues={formValues}
                            baseUrl={baseUrl}
                            summarizedPrompt={summarizedPrompt || undefined}
                            isSummarizing={isSummarizing}
                            hideButton={hidePreviewButton}
                          />
                        );
                      })()}
                    </>
                  )}
                  {isLoading ? (
                    <div className="flex flex-row gap-2 w-full md:w-auto">
                      <Button
                        onClick={onGenerate}
                        disabled={true}
                        size="default"
                        variant="default"
                        className="h-10 shadow-sm flex-1 md:flex-initial"
                      >
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        <span className="hidden md:inline">Generating</span>
                        <span className="md:hidden">...</span>
                      </Button>
                      <Button
                        onClick={onStop}
                        variant="outline"
                        size="default"
                        className="h-10 shadow-sm flex-1 md:flex-initial"
                      >
                        <Square className="h-4 w-4 me-2 text-gray-600 dark:text-gray-400 fill-gray-600 dark:fill-gray-400" />
                        Stop
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        // When displayType is 'hideForm', only check if userPrompt exists
                        if (displayType === 'hideForm') {
                          // Check both formValues and the userPrompt prop
                          const promptValue = formValues['userPrompt'] || formValues['user-prompt'] || userPrompt || '';
                          const promptText = typeof promptValue === 'string' ? promptValue : String(promptValue || '');
                          if (!promptText.trim()) {
                            // Show error for empty prompt
                            setFormErrors((prev) => ({
                              ...prev,
                              userPrompt: getT(TRANSLATION_KEYS.AI_BUILDER_PROMPT_REQUIRED, language, defaultLang),
                            }));
                            return;
                          }
                          // Clear any errors and proceed
                          setFormErrors({});
                          onGenerate();
                          return;
                        }
                        
                        // For other display types, validate all fields before generating
                        const isValid = validateAllFields();
                        if (!isValid) {
                          // Show validation errors by touching all fields
                          const allTouched: Record<string, boolean> = {};
                          formFields.forEach((field) => {
                            allTouched[field.name] = true;
                          });
                          setTouched(allTouched);
                          return;
                        }
                        onGenerate();
                      }}
                      disabled={isLoading || disabled || runType === 'automatic'}
                      size="default"
                      variant="default"
                      className="h-10 shadow-sm w-full md:w-auto bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    >
                      <Sparkles className="h-4 w-4 me-2" />
                      <span className="hidden md:inline">{getT(TRANSLATION_KEYS.AI_BUILDER_DO_THE_MAGIC, language, defaultLang)}</span>
                      <span className="md:hidden">{getT(TRANSLATION_KEYS.AI_BUILDER_DO_THE_MAGIC, language, defaultLang)}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

FieldItem.displayName = 'FieldItem';

