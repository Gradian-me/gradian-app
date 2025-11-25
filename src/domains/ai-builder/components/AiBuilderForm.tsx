/**
 * AI Builder Form Component
 * Main form for entering prompts and selecting agents
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { FormElementFactory } from '@/gradian-ui/form-builder/form-elements/components/FormElementFactory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, validateField } from '@/gradian-ui/shared/utils';
import { Sparkles, Loader2, Square, History, RotateCcw } from 'lucide-react';
import { DEMO_MODE } from '@/gradian-ui/shared/constants/application-variables';
import { PromptPreviewSheet } from './PromptPreviewSheet';
import type { AiAgent } from '../types';
import { useBusinessRuleEffects, getFieldEffects, useFieldRules } from '@/domains/business-rule-engine';
import type { FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import type { BusinessRuleWithEffects, BusinessRuleEffectsMap } from '@/domains/business-rule-engine';

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
}) => {
  // Always call hooks unconditionally (Rules of Hooks)
  // For pull-based model (backward compatibility)
  const fieldRules = useFieldRules(field as FormField, formValues);
  
  // Get business rule effects (push-based model) or fall back to pull-based model
  let fieldEffects;
  if (agentBusinessRules && agentBusinessRules.length > 0 && ruleEffects) {
    // Use push-based model: get effects from ruleEffects
    const fieldId = field.id || field.name;
    const sectionId = field.sectionId || 'basic-info';
    fieldEffects = getFieldEffects(fieldId, sectionId, ruleEffects);
  } else {
    // Fall back to pull-based model: use fieldRules from hook
    fieldEffects = {
      isVisible: fieldRules.isVisible,
      isRequired: fieldRules.isRequired,
      isDisabled: fieldRules.isDisabled,
    };
  }

  // Skip hidden fields (including business rule visibility)
  if (!fieldEffects.isVisible) {
    return null;
  }

  const fieldValue = formValues[field.name] ?? field.defaultValue ?? '';
  const fieldError = formErrors[field.name];
  const fieldTouched = touched[field.name];

  // Determine column span: textarea = 2 (full width), others = 1 (half width)
  const colSpan = field.component === 'textarea' ? 2 : 1;
  const colSpanClass = colSpan === 2 ? 'col-span-2' : 'col-span-1';

  // Special styling for textarea/prompt field
  const isPromptField = field.name === 'userPrompt' || field.id === 'user-prompt';
  const customClassName = isPromptField
    ? cn(
        'min-h-[140px] px-5 py-4 rounded-xl border',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
        'border-violet-200/50 dark:border-violet-700/50',
        'text-gray-900 dark:text-gray-100',
        'placeholder:text-gray-400 dark:placeholder:text-gray-500',
        'focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:border-violet-400',
        'shadow-sm',
        'transition-all duration-200',
        'direction-auto'
      )
    : undefined;

  // Merge required state: business rule OR validation.required
  const validationRequired = field.validation?.required ?? false;
  const isRequired = fieldEffects.isRequired || validationRequired;
  // Merge disabled state: business rule OR existing disabled flags
  const isDisabled = fieldEffects.isDisabled || isLoading || disabled;

  return (
    <div 
      className={cn('relative space-y-2', colSpanClass)}
      style={{
        gridColumn: colSpan === 2 ? 'span 2 / span 2' : 'span 1 / span 1'
      }}
    >
      {field.label && (
        <label
          htmlFor={field.id || field.name}
          className="text-sm font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-2 block"
        >
          {field.label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
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
}: AiBuilderFormProps) {
  // Get selected agent
  const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

  // Filter renderComponents to only include form fields (exclude preloadRoutes)
  const formFields = useMemo(() => {
    if (!selectedAgent?.renderComponents) return [];
    return selectedAgent.renderComponents.filter(
      (component) => component.component && !component.route
    );
  }, [selectedAgent]);

  // State for form values - initialize with userPrompt
  const [formValues, setFormValues] = useState<Record<string, any>>({
    userPrompt: userPrompt,
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
      let fieldValue = values[field.name];
      
      // Skip empty values
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        return;
      }
      
      // Format the value based on field type
      let formattedValue = '';
      
      // Handle NormalizedOption array (from Select component)
      if (Array.isArray(fieldValue) && fieldValue.length > 0 && typeof fieldValue[0] === 'object' && 'id' in fieldValue[0]) {
        // Extract the first option's label or id
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
    
    return parts.join('\n\n');
  }, [formFields]);

  // Reset form values when agent changes
  useEffect(() => {
    if (!selectedAgent?.renderComponents) return;
    
    const fields = selectedAgent.renderComponents.filter(
      (component) => component.component && !component.route
    );
    
    if (!fields.length) return;
    
    const initialValues: Record<string, any> = {};
    
    // Initialize all fields with their defaultValues or empty values
    fields.forEach((field) => {
      if (field.name === 'userPrompt' || field.id === 'user-prompt') {
        // Use current userPrompt value for prompt field
        initialValues[field.name] = userPrompt;
      } else {
        // Use defaultValue or empty value for other fields
        initialValues[field.name] = field.defaultValue ?? '';
      }
    });
    
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
          initialErrors[field.name] = validationResult.error || 'This field is required';
        }
      }
    });
    if (Object.keys(initialErrors).length > 0) {
      setFormErrors(initialErrors);
    }
    
    // Build initial concatenated prompt and update userPrompt
    const initialPrompt = buildConcatenatedPrompt(initialValues);
    if (initialPrompt) {
      onPromptChange(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId, buildConcatenatedPrompt]); // Reset when agent ID changes

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
    
    setFormValues(newFormValues);

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
  }, [formValues, formFields, formErrors, buildConcatenatedPrompt, onPromptChange]);

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
    const promptField = formFields.find(
      (field) => (field.name === 'userPrompt' || field.id === 'user-prompt') && field.component === 'textarea'
    );
    if (promptField) {
      const textarea = document.getElementById(promptField.id || promptField.name) as HTMLTextAreaElement;
      if (textarea) {
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

  return (
    <div className="space-y-6">
      {/* Modern Gradient Card Container */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border border-violet-200/50 dark:border-violet-800/50 shadow-sm">
        <div className="relative p-6 space-y-4">
          {/* Header Section */}
          <div className="flex flex-row justify-end items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {/* Agent Select - use renderComponents if available, otherwise fallback */}
              {agentSelectField ? (
                <div className="w-48">
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
                <div className="w-48">
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
              {onReset && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  className="h-9 w-9 p-0 shrink-0"
                  title="Reset everything"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Link href="/ai-prompts" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2 shrink-0">
                  <History className="h-4 w-4" />
                  Prompt History
                </Button>
              </Link>
            </div>
          </div>

          {/* Render form fields from renderComponents in a 2-column grid */}
          <div className="grid grid-cols-2 gap-4">
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
                />
              );
            })}
          </div>
          
          {/* Footer Section with Model Badge and Buttons */}
          <div className="flex justify-between items-center pt-2 border-t border-violet-200/50 dark:border-violet-800/50">
            {/* Model Badge on Left */}
            {selectedAgent?.model && (
              <Badge 
                className={cn(
                  'shrink-0',
                  'bg-violet-100 text-cyan-700 border-cyan-200',
                  'dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800',
                  'font-medium shadow-sm'
                )}
              >
                {selectedAgent.model}
              </Badge>
            )}
            
            {/* Buttons on Right */}
            <div className="flex items-center gap-2">
              {onSheetOpenChange && (
                <PromptPreviewSheet
                  isOpen={isSheetOpen}
                  onOpenChange={onSheetOpenChange}
                  systemPrompt={systemPrompt}
                  userPrompt={userPrompt}
                  isLoadingPreload={isLoadingPreload}
                  disabled={!userPrompt.trim() || disabled}
                />
              )}
              {isLoading ? (
                <>
                  <Button
                    onClick={onGenerate}
                    disabled={true}
                    size="default"
                    variant="default"
                    className="h-10 shadow-sm"
                  >
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating
                  </Button>
                  <Button
                    onClick={onStop}
                    variant="outline"
                    size="default"
                    className="h-10 shadow-sm"
                  >
                    <Square className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 fill-gray-600 dark:fill-gray-400" />
                    Stop
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    // Validate all fields before generating
                    if (validateAllFields()) {
                      onGenerate();
                    }
                  }}
                  disabled={!isFormValid || !userPrompt.trim() || disabled}
                  size="default"
                  variant="default"
                  className="h-10 shadow-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Do the Magic
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

