'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calculator, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { useFormulaEvaluation } from '../hooks/useFormulaEvaluation';
import { extractFormulaDependencies } from '../utils/formula-parser';
import { useDynamicFormContextStore } from '@/stores/dynamic-form-context.store';

export interface FormulaInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  fieldName: string;
  formData?: Record<string, any>;
  referenceData?: Record<string, any[]>;
  showPreview?: boolean;
}

/**
 * Formula Input Component
 * Provides a text input with formula editing capabilities, autocomplete, and live preview
 */
export const FormulaInput: React.FC<FormulaInputProps> = ({
  value = '',
  onChange,
  onBlur,
  onFocus,
  error,
  disabled = false,
  required = false,
  className,
  placeholder = 'Enter formula (e.g., {{formData.price}} * {{formData.quantity}})',
  fieldName,
  formData,
  referenceData,
  showPreview = true
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Get form schema for field suggestions
  const formSchema = useDynamicFormContextStore((s) => s.formSchema);

  // Evaluate formula for preview
  const evaluation = useFormulaEvaluation({
    formula: localValue,
    fieldName,
    formData,
    referenceData,
    enabled: showPreview && localValue.trim() !== ''
  });

  // Extract dependencies
  const dependencies = useMemo(() => {
    return extractFormulaDependencies(localValue);
  }, [localValue]);

  // Get available fields for autocomplete
  const availableFields = useMemo(() => {
    if (!formSchema?.fields) return [];
    
    return formSchema.fields
      .filter(field => field.name && field.name !== fieldName)
      .map(field => ({
        name: field.name,
        label: field.label || field.name,
        type: field.component
      }));
  }, [formSchema, fieldName]);

  // Handle input change
  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  // Insert variable at cursor position
  const insertVariable = useCallback((variable: string) => {
    const input = document.getElementById(`formula-input-${fieldName}`) as HTMLTextAreaElement;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = localValue;
    const newText = text.substring(0, start) + variable + text.substring(end);
    
    handleChange(newText);
    
    // Restore cursor position after variable
    setTimeout(() => {
      input.focus();
      const newPos = start + variable.length;
      input.setSelectionRange(newPos, newPos);
    }, 0);
  }, [localValue, handleChange, fieldName]);

  // Available context variables
  const contextVariables = [
    { label: 'Form Data', value: '{{formData.', description: 'Access form field values' },
    { label: 'Reference', value: '{{reference.', description: 'Access picker field aggregations' },
    { label: 'Page Data', value: '{{pageData.', description: 'Access URL and query parameters' },
    { label: 'User Data', value: '{{userData.', description: 'Access current user data' }
  ];

  // Available aggregations
  const aggregations = [
    { label: 'Sum', value: '.sum', description: 'Sum of all values' },
    { label: 'Average', value: '.avg', description: 'Average of all values' },
    { label: 'Min', value: '.min', description: 'Minimum value' },
    { label: 'Max', value: '.max', description: 'Maximum value' },
    { label: 'Count', value: '.count', description: 'Count of items' },
    { label: 'Count Distinct', value: '.countdistinct', description: 'Count of unique values' },
    { label: 'Std Dev', value: '.stdev', description: 'Standard deviation' }
  ];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Textarea
          id={`formula-input-${fieldName}`}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          className={cn(
            'font-mono text-sm',
            error && 'border-red-500 focus-visible:ring-red-500',
            evaluation.error && 'border-orange-500'
          )}
          rows={3}
        />
        
        {/* Formula helper button */}
        <Popover open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              disabled={disabled}
            >
              <Calculator className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Context Variables</h4>
                <div className="space-y-1">
                  {contextVariables.map((ctx) => (
                    <div key={ctx.value} className="text-xs">
                      <code className="bg-gray-100 px-1 py-0.5 rounded">{ctx.value + 'fieldName' + '}}'}</code>
                      <span className="text-gray-500 ml-2">{ctx.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Available Fields</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableFields.map((field) => (
                    <Button
                      key={field.name}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs justify-start"
                      onClick={() => insertVariable(`{{formData.${field.name}}}`)}
                    >
                      <code>{field.name}</code>
                      <span className="text-gray-500 ml-2">{field.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Aggregations (for references)</h4>
                <div className="space-y-1">
                  {aggregations.map((agg) => (
                    <div key={agg.value} className="text-xs">
                      <code className="bg-gray-100 px-1 py-0.5 rounded">{`{{reference.fieldName${agg.value}}}`}</code>
                      <span className="text-gray-500 ml-2">{agg.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Operators</h4>
                <div className="flex gap-2 flex-wrap">
                  {['+', '-', '*', '/', '%', '^'].map((op) => (
                    <code key={op} className="bg-gray-100 px-2 py-1 rounded text-sm">{op}</code>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Preview and dependencies */}
      {showPreview && localValue.trim() !== '' && (
        <div className="space-y-2">
          {/* Evaluation result */}
          {evaluation.error ? (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span>{evaluation.error}</span>
            </div>
          ) : evaluation.value !== null ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Result: <strong>{typeof evaluation.value === 'number' ? evaluation.value.toFixed(2) : evaluation.value}</strong></span>
            </div>
          ) : null}

          {/* Dependencies */}
          {dependencies.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Depends on:</span>
              {dependencies.map((dep) => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

FormulaInput.displayName = 'FormulaInput';

