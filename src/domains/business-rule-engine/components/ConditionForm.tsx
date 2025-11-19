'use client';

import React from 'react';
import { Condition, Property, Operator } from '../types';
import { SchemaFieldSelector } from './SchemaFieldSelector';
import { OperatorSelector } from './OperatorSelector';
import { ValueInput } from './ValueInput';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ConditionFormProps {
  condition: Condition;
  properties: Property[];
  operators: Operator[];
  onChange: (updates: Partial<Condition>) => void;
  onDelete?: () => void;
  errors?: { field: string; message: string }[];
  showDelete?: boolean;
  compact?: boolean;
}

export function ConditionForm({
  condition,
  properties,
  operators,
  onChange,
  onDelete,
  errors = [],
  showDelete = true,
  compact = true,
}: ConditionFormProps) {
  const propertyError = errors.find((e) => e.field === 'property')?.message;
  const operatorError = errors.find((e) => e.field === 'operator')?.message;
  const valueError = errors.find((e) => e.field === 'value')?.message;


  if (compact) {
    return (
      <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900/50">
        <div className="flex flex-col lg:flex-row gap-2 items-start">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-start">
            <div className="col-span-1 sm:col-span-2 lg:col-span-4">
              <SchemaFieldSelector
                value={condition.property}
                onChange={(property) => onChange({ property })}
                error={propertyError}
                required
                compact
              />
            </div>
            <div className="col-span-1 sm:col-span-1 lg:col-span-3">
              <OperatorSelector
                operators={operators}
                value={condition.operator}
                onChange={(operator) => onChange({ operator })}
                property={condition.property}
                error={operatorError}
                required
                compact
              />
            </div>
            <div className="col-span-1 sm:col-span-1 lg:col-span-4">
              <ValueInput
                condition={condition}
                properties={properties}
                onChange={onChange}
                error={valueError}
                compact
                hideLabel={true}
              />
            </div>
            <div className="col-span-1 sm:col-span-1 lg:col-span-1 flex justify-end">
              {showDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full form (non-compact)
  return (
    <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Condition</h4>
        {showDelete && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-7 w-7 p-0 text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SchemaFieldSelector
          value={condition.property}
          onChange={(property) => onChange({ property })}
          error={propertyError}
          required
        />
        <OperatorSelector
          operators={operators}
          value={condition.operator}
          onChange={(operator) => onChange({ operator })}
          property={condition.property}
          error={operatorError}
          required
        />
      </div>
             <ValueInput
               condition={condition}
               properties={properties}
               onChange={onChange}
               error={valueError}
               hideLabel={false}
             />
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
          Description (Optional)
        </label>
        <Input
          value={condition.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Add description..."
          className="text-sm"
        />
      </div>
    </div>
  );
}

