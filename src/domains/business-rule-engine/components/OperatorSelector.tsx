'use client';

import { useMemo } from 'react';
import { Operator, Property } from '../types';
import { Select, SelectOption } from '@/gradian-ui/form-builder/form-elements/components/Select';
import {
  getOperatorsForPropertyType,
  groupOperatorsByCategory,
} from '../utils/operator-utils';

interface OperatorSelectorProps {
  operators: Operator[];
  value: Operator | null;
  onChange: (operator: Operator | null) => void;
  property: Property | null;
  error?: string;
  required?: boolean;
  compact?: boolean;
}

export function OperatorSelector({
  operators,
  value,
  onChange,
  property,
  error,
  required = false,
  compact = false,
}: OperatorSelectorProps) {
  // Filter operators by property type
  const filteredOperators = useMemo(() => {
    return getOperatorsForPropertyType(operators, property?.type || null);
  }, [operators, property]);

  // Group operators by category
  const groupedOperators = useMemo(
    () => groupOperatorsByCategory(filteredOperators),
    [filteredOperators]
  );

  // Convert to SelectOption format
  const options: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [];
    Object.entries(groupedOperators).forEach(([category, ops]) => {
      ops.forEach((op) => {
        opts.push({
          id: op.id,
          value: op.id,
          label: `${op.symbol} ${op.title}`,
          color: op.color,
        });
      });
    });
    return opts;
  }, [groupedOperators]);

  const handleChange = (selectedId: string) => {
    const selected = operators.find((o) => o.id === selectedId);
    onChange(selected || null);
  };

  if (compact) {
    return (
      <div className="space-y-1">
        <Select
          options={options}
          value={value?.id || ''}
          onValueChange={handleChange}
          placeholder="Operator..."
          config={{ name: 'operator', label: '' }}
          error={error}
          size="sm"
          disabled={!property}
        />
        {error && <div className="text-xs text-red-500">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Operator {required && <span className="text-red-500">*</span>}
      </label>
      <Select
        options={options}
        value={value?.id || ''}
        onValueChange={handleChange}
        placeholder="Select operator..."
        config={{ name: 'operator', label: '' }}
        error={error}
        size="sm"
        disabled={!property}
      />
      {value && !compact && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {value.sqlEquivalent && (
            <span className="mr-2">SQL: {value.sqlEquivalent}</span>
          )}
        </div>
      )}
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  );
}

