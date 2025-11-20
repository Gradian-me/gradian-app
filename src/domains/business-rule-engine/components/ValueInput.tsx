'use client';

import { useState, useEffect, useMemo } from 'react';
import { Property, Condition, ValueType } from '../types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SchemaFieldSelector } from './SchemaFieldSelector';
import {
  getInputTypeForProperty,
  parseValueFromInput,
  validateValueForType,
  getDefaultValueForType,
} from '../utils/value-utils';
import { operatorRequiresValue } from '../utils/operator-utils';
import { cn } from '@/gradian-ui/shared/utils';
import { useAggregationTypes } from '../hooks/useAggregationTypes';
import { useSchemas } from '../hooks/useSchemas';
import { FormElementFactory } from '@/gradian-ui/form-builder/form-elements/components/FormElementFactory';
import type { FormField } from '@/gradian-ui/schema-manager/types/form-schema';

interface ValueInputProps {
  condition: Condition;
  properties: Property[];
  onChange: (updates: Partial<Condition>) => void;
  error?: string;
  compact?: boolean;
  hideLabel?: boolean;
}

export function ValueInput({ condition, properties, onChange, error, compact = false, hideLabel = false }: ValueInputProps) {
  const [localValue, setLocalValue] = useState<string>(
    condition.fixedValue !== null && condition.fixedValue !== undefined
      ? String(condition.fixedValue)
      : ''
  );

  const property = condition.property;
  const operator = condition.operator;
  const requiresValue = operatorRequiresValue(operator);
  const { aggregationTypes, isLoading: isLoadingAggregationTypes } = useAggregationTypes();
  const { schemas } = useSchemas();

  // Get the full field information from schemas based on the selected property
  const fieldConfig = useMemo(() => {
    if (!property?.schemaId || !property?.fieldId) {
      return null;
    }
    
    const schema = schemas.find((s) => s.id === property.schemaId);
    if (!schema?.fields) {
      return null;
    }
    
    const field = schema.fields.find((f) => f.id === property.fieldId) as FormField | undefined;
    if (!field) {
      return null;
    }
    
    // Return field config for FormElementFactory
    return {
      ...field,
      sectionId: field.sectionId, // sectionId is required in FormField
      component: (field.component || 'text') as FormField['component'],
      label: hideLabel ? '' : (field.label || field.name), // Hide label if hideLabel prop is true
      placeholder: field.placeholder || `Enter ${field.label || field.name}`,
      required: false, // Don't make it required in the condition value input
      options: field.options || [], // Include options for select/radio/checkbox-list components
    };
  }, [property, schemas, hideLabel]);

  // Update local value when condition changes externally
  useEffect(() => {
    if (condition.valueType === 'fixed') {
      setLocalValue(
        condition.fixedValue !== null && condition.fixedValue !== undefined
          ? String(condition.fixedValue)
          : ''
      );
    }
  }, [condition.fixedValue, condition.valueType]);

  const handleValueTypeChange = (newType: ValueType) => {
    onChange({
      valueType: newType,
      fixedValue: newType === 'fixed' ? getDefaultValueForType(property?.type || 'string') : null,
      propertyReference: newType === 'property' ? null : condition.propertyReference,
    });
  };

  const handleFixedValueChange = (newValue: any) => {
    // Handle both string and other types (from FormElementFactory)
    if (typeof newValue === 'string') {
      setLocalValue(newValue);
      if (property) {
        const parsed = parseValueFromInput(newValue, property.type);
        onChange({ fixedValue: parsed });
      }
    } else {
      // Direct value from FormElementFactory (e.g., boolean, number, array)
      onChange({ fixedValue: newValue });
      setLocalValue(String(newValue));
    }
  };

  const handlePropertyReferenceChange = (refProperty: Property | null) => {
    onChange({ 
      propertyReference: refProperty,
      aggregationType: refProperty ? condition.aggregationType : null, // Clear aggregation type when property is cleared
    });
  };

  const handleAggregationTypeChange = (aggregationTypeName: string) => {
    onChange({ aggregationType: aggregationTypeName });
  };

  if (!requiresValue) {
    return compact ? (
      <div className="text-xs text-gray-500 italic">No value needed</div>
    ) : (
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Value</label>
        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
          This operator does not require a value
        </div>
      </div>
    );
  }

  if (!property) {
    return compact ? (
      <div className="text-xs text-gray-500 italic">Select property first</div>
    ) : (
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Value</label>
        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
          Please select a property first
        </div>
      </div>
    );
  }

  const inputType = getInputTypeForProperty(property);

  if (compact) {
    return (
      <div className="space-y-1">
        <ToggleGroup
          type="single"
          value={condition.valueType}
          onValueChange={(value) => {
            if (value) {
              handleValueTypeChange(value as ValueType);
            }
          }}
          className={cn(
            'w-full',
            error ? 'border-red-500' : ''
          )}
        >
          <ToggleGroupItem value="fixed" className="flex-1 text-xs h-8">
            Fixed
          </ToggleGroupItem>
          <ToggleGroupItem value="property" className="flex-1 text-xs h-8">
            Property
          </ToggleGroupItem>
        </ToggleGroup>
        {condition.valueType === 'fixed' ? (
          fieldConfig ? (
            <FormElementFactory
              field={fieldConfig}
              value={condition.fixedValue}
              onChange={handleFixedValueChange}
              error={error}
              disabled={false}
            />
          ) : (
            // Fallback to basic input if field config not available
            property.type === 'boolean' ? (
              <div className="flex items-center gap-2">
                <Switch
                  checked={condition.fixedValue === true}
                  onCheckedChange={(checked) => onChange({ fixedValue: checked })}
                  className="scale-75"
                />
                <span className="text-xs">{condition.fixedValue ? 'Yes' : 'No'}</span>
              </div>
            ) : (
              <Input
                type={inputType}
                value={localValue}
                onChange={(e) => handleFixedValueChange(e.target.value)}
                placeholder="Value..."
                className={`text-xs h-8 ${error ? 'border-red-500' : ''}`}
              />
            )
          )
        ) : (
          <div className="space-y-1">
            <SchemaFieldSelector
              value={condition.propertyReference}
              onChange={handlePropertyReferenceChange}
              excludePropertyId={property.id}
              error={error}
              required
              compact
            />
            {condition.propertyReference && (
              <Select
                value={condition.aggregationType || ''}
                onValueChange={handleAggregationTypeChange}
              >
                <SelectTrigger className={cn(
                  'h-8 text-xs',
                  error ? 'border-red-500' : ''
                )}>
                  <SelectValue placeholder="Select aggregation..." />
                </SelectTrigger>
                <SelectContent>
                  {aggregationTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.symbol} {type.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
        {error && <div className="text-xs text-red-500">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
          Value Type
        </label>
        <ToggleGroup
          type="single"
          value={condition.valueType}
          onValueChange={(value) => {
            if (value) {
              handleValueTypeChange(value as ValueType);
            }
          }}
          className={cn(
            'w-full',
            error ? 'border-red-500' : ''
          )}
        >
          <ToggleGroupItem value="fixed" className="flex-1 text-sm h-10">
            Fixed
          </ToggleGroupItem>
          <ToggleGroupItem value="property" className="flex-1 text-sm h-10">
            Property
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {condition.valueType === 'fixed' ? (
        <div className="space-y-1">
          {fieldConfig ? (
            <FormElementFactory
              field={fieldConfig}
              value={condition.fixedValue}
              onChange={handleFixedValueChange}
              error={error}
              disabled={false}
            />
          ) : (
            // Fallback to basic inputs if field config not available
            property.type === 'boolean' ? (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={condition.fixedValue === true}
                  onCheckedChange={(checked) => onChange({ fixedValue: checked })}
                />
                <Label className="text-xs">{condition.fixedValue ? 'Yes' : 'No'}</Label>
              </div>
            ) : property.type === 'array' ? (
              <>
                <Textarea
                  value={localValue}
                  onChange={(e) => handleFixedValueChange(e.target.value)}
                  placeholder="Enter values separated by commas..."
                  className={`text-xs ${error ? 'border-red-500' : ''}`}
                  rows={2}
                />
                {error && <div className="text-xs text-red-500">{error}</div>}
              </>
            ) : (
              <Input
                type={inputType}
                value={localValue}
                onChange={(e) => handleFixedValueChange(e.target.value)}
                placeholder={`Enter ${property.type} value`}
                className={`text-xs h-8 ${error ? 'border-red-500' : ''}`}
              />
            )
          )}
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      ) : (
        <div className="space-y-2">
          <SchemaFieldSelector
            value={condition.propertyReference}
            onChange={handlePropertyReferenceChange}
            excludePropertyId={property.id}
            error={error}
            required
          />
          {condition.propertyReference && (
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Aggregation Type
              </label>
              <Select
                value={condition.aggregationType || ''}
                onValueChange={handleAggregationTypeChange}
              >
                <SelectTrigger className={cn(
                  'h-10 text-sm',
                  error ? 'border-red-500' : ''
                )}>
                  <SelectValue placeholder="Select aggregation type..." />
                </SelectTrigger>
                <SelectContent>
                  {aggregationTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.symbol} {type.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

