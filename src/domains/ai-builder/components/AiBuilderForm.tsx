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
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import { PromptPreviewSheet } from './PromptPreviewSheet';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { LanguageSelector } from '@/gradian-ui/form-builder/form-elements/components/LanguageSelector';
import { formatArrayFieldToToon } from '../utils/prompt-builder';
import type { AiAgent } from '../types';
import { useBusinessRuleEffects, getFieldEffects } from '@/domains/business-rule-engine';
import type { BusinessRuleWithEffects, BusinessRuleEffectsMap } from '@/domains/business-rule-engine';
import { extractParametersBySectionId } from '../utils/ai-shared-utils';

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
        'text-sm md:text-base' // Responsive text size
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
        error={undefined} // Don't show error messages
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
  includeImage?: boolean;
  onIncludeImageChange?: (includeImage: boolean) => void;
  onFormValuesChange?: (formValues: Record<string, any>) => void; // Callback to expose formValues
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
  selectedLanguage = 'text',
  onLanguageChange,
  includeImage = false,
  onIncludeImageChange,
  onFormValuesChange,
}: AiBuilderFormProps) {
  // Get selected agent
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

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
  });

  // State for form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
      const fieldValue = values[field.name];
      
      // Skip empty values
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        return;
      }

      // Skip fields with sectionId "body" or "extra" - these go in body/extra_body, not in prompt
      // Exception: include "prompt" field in userPrompt for display purposes, even if it has sectionId "body"
      const isPromptField = (field.name === 'prompt' || field.id === 'prompt');
      if ((field.sectionId === 'body' || field.sectionId === 'extra') && !isPromptField) {
        return;
      }
      
      // Format the value based on field type
      let formattedValue = '';
      
      // Check if this is an array component that should use TOON format
      const isArrayComponent = [
        'checkbox-list',
        'radio',
        'toggle-group',
        'tag-input',
        'list-input'
      ].includes(field.component);
      
      // Check if select is multiple
      const isMultipleSelect = 
        field.component === 'select' &&
        (field.multiple || 
         field.metadata?.allowMultiselect ||
         field.selectionType === 'multiple' ||
         field.selectionMode === 'multiple' ||
         field.mode === 'multiple');
      
      if (isArrayComponent || isMultipleSelect) {
        // Format arrays in TOON format
        formattedValue = formatArrayFieldToToon(field.name || field.id || 'field', field, fieldValue);
        if (formattedValue) {
          // For TOON format, we don't need a label prefix since the format is self-contained
          parts.push(formattedValue);
          return;
        }
      } else if (Array.isArray(fieldValue) && fieldValue.length > 0 && typeof fieldValue[0] === 'object' && 'id' in fieldValue[0]) {
        // Handle NormalizedOption array (from single Select component) - only first option
        const normalizedOption = fieldValue[0];
        formattedValue = normalizedOption.label || normalizedOption.id || String(normalizedOption.value || '');
      } else if (field.component === 'select') {
        // For select with string/number value, find the option label
        const option = field.options?.find((opt: any) => opt.id === fieldValue || opt.value === fieldValue);
        formattedValue = option?.label || String(fieldValue);
      } else if (Array.isArray(fieldValue)) {
        // For arrays (like checkbox-list, tag-input), join with commas
        formattedValue = fieldValue.map((item: any) => {
          if (typeof item === 'object' && item.label) return item.label;
          if (typeof item === 'object' && item.id) return item.id;
          return String(item);
        }).join(', ');
      } else if (typeof fieldValue === 'object' && fieldValue !== null) {
        // Handle single object (shouldn't happen but just in case)
        formattedValue = (fieldValue as any).label || (fieldValue as any).id || String((fieldValue as any).value || '');
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
    
    // Add language instructions if language is specified (check common language field names)
    // Also check selectedLanguage prop as fallback
    const outputLanguage = values['output-language'] || values['outputLanguage'] || values['language'] || values['lang'] || selectedLanguage;
    if (outputLanguage && typeof outputLanguage === 'string' && outputLanguage.trim() && outputLanguage.toLowerCase() !== 'en' && outputLanguage !== 'text') {
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
        // Use current userPrompt value for prompt field, but strip any existing "User Prompt:" prefix
        // to avoid duplication when building the concatenated prompt
        let promptValue = userPrompt || '';
        if (promptValue) {
          // Remove "User Prompt:" prefix if it exists (case insensitive, with optional whitespace)
          promptValue = promptValue.replace(/^User\s+Prompt:\s*/i, '').trim();
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
    
    setFormValues(initialValues);
    
    // Notify parent of formValues change
    if (onFormValuesChange) {
      onFormValuesChange(initialValues);
    }
    
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
          initialErrors[field.name] = validationResult.error || 'This field is required';
        }
      }
    });
    if (Object.keys(initialErrors).length > 0) {
      setFormErrors(initialErrors);
    }
    
    // Build initial concatenated prompt and update userPrompt
    const initialPrompt = buildConcatenatedPromptForResetRef.current(initialValues);
    if (initialPrompt) {
      onPromptChange(initialPrompt);
    }
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
          // Language hasn't changed, but we still need to rebuild prompt in case other values changed
          const concatenatedPrompt = buildConcatenatedPromptRef.current(newFormValues);
          onPromptChangeRef.current(concatenatedPrompt);
          return prevFormValues; // Return previous to avoid unnecessary update
        }
        
        // Update only the language field, preserve everything else
        newFormValues['output-language'] = selectedLanguage;
      } else {
        // Remove language if selectedLanguage is 'text' or empty
        if (newFormValues['output-language']) {
          delete newFormValues['output-language'];
        } else {
          // No language field to remove, just rebuild prompt
          const concatenatedPrompt = buildConcatenatedPromptRef.current(newFormValues);
          onPromptChangeRef.current(concatenatedPrompt);
          return prevFormValues; // Return previous to avoid unnecessary update
        }
      }
      
      // Notify parent of formValues change (only language field changed)
      if (onFormValuesChangeRef.current) {
        onFormValuesChangeRef.current(newFormValues);
      }
      
      // Rebuild prompt with updated language
      const concatenatedPrompt = buildConcatenatedPromptRef.current(newFormValues);
      onPromptChangeRef.current(concatenatedPrompt);
      
      return newFormValues;
    });
  }, [selectedLanguage]); // Only depend on selectedLanguage

  // Sync userPrompt with formValues when userPrompt changes externally
  // This handles external updates to userPrompt (e.g., from parent component)
  // Note: We don't want to rebuild the prompt here since it's already built from formValues
  useEffect(() => {
    // Only sync if userPrompt is different from what we would generate
    const currentConcatenatedPrompt = buildConcatenatedPrompt(formValues);
    if (userPrompt !== currentConcatenatedPrompt && userPrompt.trim() !== '') {
      // If userPrompt was set externally and doesn't match our concatenated version,
      // we might need to parse it back, but for now we'll just ignore external updates
      // since the prompt should be built from formValues
    }
  }, [userPrompt, formValues, buildConcatenatedPrompt]);

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

    // Build concatenated prompt from all fields and update userPrompt
    // Pass the original value array to buildConcatenatedPrompt so it can extract labels
    const valuesForPrompt = {
      ...newFormValues,
      [fieldName]: value, // Keep original value for prompt building (to get labels)
    };
    const concatenatedPrompt = buildConcatenatedPrompt(valuesForPrompt);
    onPromptChange(concatenatedPrompt);

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
          errors[field.name] = validationResult.error || 'This field is required';
        }
      }
    });
    
    setFormErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }, [formFields, formValues]);

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

  // Find the prompt field and agent select field
  const promptField = formFields.find(
    (field) => field.name === 'userPrompt' || field.id === 'user-prompt'
  );
  const agentSelectField = formFields.find(
    (field) => field.name === 'aiAgentSelect' || field.id === 'ai-agent-select'
  );

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
  const showForm = displayType === 'default' || displayType === 'showFooter';
  const showFooter = displayType === 'showFooter' || displayType === 'default';

  return (
    <div className="space-y-6">
      {showForm && (
        <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/50 shadow-sm">
          <div className="relative p-4 md:p-6 space-y-4">
            {/* Header Section */}
            {displayType === 'default' && (
              <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center flex-wrap gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 w-full sm:w-auto">
                  {/* Agent Select - use renderComponents if available, otherwise fallback */}
                  {agentSelectField ? (
                    <div className="w-full sm:w-72">
                      <FormElementFactory
                        config={{
                          ...agentSelectField,
                          options: agents.map(agent => ({
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
                    <div className="w-full sm:w-72">
                      <FormElementFactory
                        config={{
                          id: 'ai-agent-select',
                          name: 'aiAgentSelect',
                          label: '',
                          component: 'select',
                          type: 'select',
                          options: agents.map(agent => ({
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
                        className="w-full"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {DEMO_MODE && selectedAgentId && (
                      <Link href={`/builder/ai-agents/${selectedAgentId}`} className="flex-1 sm:flex-initial">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-full sm:w-auto shrink-0"
                          title="Edit Agent"
                        >
                          <PencilRuler className="h-4 w-4 me-2" />
                          <span className="hidden xs:inline">Edit Agent</span>
                          <span className="xs:hidden">Edit</span>
                        </Button>
                      </Link>
                    )}
                    {onReset && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onReset}
                        className="h-9 w-9 sm:w-9 p-0 shrink-0"
                        title="Reset everything"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Link href="/ai-prompts" target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-initial">
                      <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto shrink-0">
                        <History className="h-4 w-4" />
                        <span className="hidden xs:inline">Prompt History</span>
                        <span className="xs:hidden">History</span>
                      </Button>
                    </Link>
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
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-2 pt-2 border-t border-violet-200/50 dark:border-violet-800/50">
                {/* Model Badge on Left */}
                {selectedAgent?.model && (
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
                
                {/* Buttons on Right */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {onSheetOpenChange && (
                    <>
                      {onLanguageChange && (
                        <div className="w-full sm:w-36">
                          <LanguageSelector
                            config={{
                              name: 'output-language',
                              label: '',
                              placeholder: 'Language',
                            }}
                            value={selectedLanguage}
                            onChange={(lang) => {
                              onLanguageChange(lang);
                              // Also update formValues to include language
                              const newFormValues = {
                                ...formValues,
                                'output-language': lang,
                              };
                              setFormValues(newFormValues);
                              // Notify parent of formValues change
                              if (onFormValuesChange) {
                                onFormValuesChange(newFormValues);
                              }
                              // Rebuild prompt with new language
                              const valuesForPrompt = {
                                ...newFormValues,
                              };
                              const concatenatedPrompt = buildConcatenatedPrompt(valuesForPrompt);
                              onPromptChange(concatenatedPrompt);
                            }}
                            defaultLanguage="en"
                          />
                        </div>
                      )}
                      {onIncludeImageChange && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Switch
                            id="include-image"
                            checked={includeImage}
                            onCheckedChange={(checked) => {
                              onIncludeImageChange(checked);
                              // Also update formValues
                              const newFormValues = {
                                ...formValues,
                                includeImage: checked,
                              };
                              setFormValues(newFormValues);
                              // Notify parent of formValues change
                              if (onFormValuesChange) {
                                onFormValuesChange(newFormValues);
                              }
                            }}
                            disabled={isLoading || disabled}
                          />
                          <Label htmlFor="include-image" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                            Include Image
                          </Label>
                        </div>
                      )}
                      {(() => {
                        const params = selectedAgent && formValues 
                          ? extractParametersBySectionId(selectedAgent, formValues)
                          : { body: {}, extra: {}, prompt: {} };
                        return (
                          <PromptPreviewSheet
                            isOpen={isSheetOpen}
                            onOpenChange={onSheetOpenChange}
                            systemPrompt={systemPrompt}
                            userPrompt={userPrompt}
                            isLoadingPreload={isLoadingPreload}
                            disabled={!userPrompt.trim() || disabled}
                            extraBody={Object.keys(params.extra).length > 0 ? params.extra : undefined}
                            bodyParams={Object.keys(params.body).length > 0 ? params.body : undefined}
                          />
                        );
                      })()}
                    </>
                  )}
                  {isLoading ? (
                    <div className="flex flex-row gap-2 w-full sm:w-auto">
                      <Button
                        onClick={onGenerate}
                        disabled={true}
                        size="default"
                        variant="default"
                        className="h-10 shadow-sm flex-1 sm:flex-initial"
                      >
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        <span className="hidden xs:inline">Generating</span>
                        <span className="xs:hidden">...</span>
                      </Button>
                      <Button
                        onClick={onStop}
                        variant="outline"
                        size="default"
                        className="h-10 shadow-sm flex-1 sm:flex-initial"
                      >
                        <Square className="h-4 w-4 me-2 text-gray-600 dark:text-gray-400 fill-gray-600 dark:fill-gray-400" />
                        Stop
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        // Validate all fields before generating
                        if (validateAllFields()) {
                          onGenerate();
                        }
                      }}
                      disabled={!isFormValid || !userPrompt.trim() || disabled || runType === 'automatic'}
                      size="default"
                      variant="default"
                      className="h-10 shadow-sm w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    >
                      <Sparkles className="h-4 w-4 me-2" />
                      <span className="hidden xs:inline">Do the Magic</span>
                      <span className="xs:hidden">Generate</span>
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

