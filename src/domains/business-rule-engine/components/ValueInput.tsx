'use client';

import { useState, useEffect } from 'react';
import { Property, Condition, ValueType } from '../types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectOption } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { SchemaFieldSelector } from './SchemaFieldSelector';
import {
  getInputTypeForProperty,
  parseValueFromInput,
  validateValueForType,
  getDefaultValueForType,
} from '../utils/value-utils';
import { operatorRequiresValue } from '../utils/operator-utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface ValueInputProps {
  condition: Condition;
  properties: Property[];
  onChange: (updates: Partial<Condition>) => void;
  error?: string;
  compact?: boolean;
}

export function ValueInput({ condition, properties, onChange, error, compact = false }: ValueInputProps) {
  const [localValue, setLocalValue] = useState<string>(
    condition.fixedValue !== null && condition.fixedValue !== undefined
      ? String(condition.fixedValue)
      : ''
  );

  const property = condition.property;
  const operator = condition.operator;
  const requiresValue = operatorRequiresValue(operator);

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

  const handleFixedValueChange = (newValue: string) => {
    setLocalValue(newValue);
    if (property) {
      const parsed = parseValueFromInput(newValue, property.type);
      onChange({ fixedValue: parsed });
    }
  };

  const handlePropertyReferenceChange = (refProperty: Property | null) => {
    onChange({ propertyReference: refProperty });
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
        {condition.valueType === 'fixed' ? (
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
        ) : (
          <SchemaFieldSelector
            value={condition.propertyReference}
            onChange={handlePropertyReferenceChange}
            excludePropertyId={property.id}
            error={error}
            required
            compact
          />
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
            if (value) handleValueTypeChange(value as ValueType);
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="fixed" aria-label="Fixed Value" className="text-xs px-2 py-1">
            Fixed
          </ToggleGroupItem>
          <ToggleGroupItem value="property" aria-label="Property Reference" className="text-xs px-2 py-1">
            Property
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {condition.valueType === 'fixed' ? (
        <div className="space-y-1">
          {property.type === 'boolean' ? (
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
          )}
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      ) : (
        <SchemaFieldSelector
          value={condition.propertyReference}
          onChange={handlePropertyReferenceChange}
          excludePropertyId={property.id}
          error={error}
          required
        />
      )}
    </div>
  );
}

