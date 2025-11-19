'use client';

import { useMemo } from 'react';
import { Operator, Property } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getOperatorsForPropertyType,
  groupOperatorsByCategory,
} from '../utils/operator-utils';
import { cn } from '@/gradian-ui/shared/utils';

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

  const handleChange = (selectedId: string) => {
    const selected = operators.find((o) => o.id === selectedId);
    onChange(selected || null);
  };

  const operatorValue = value?.id || '';

  return (
    <div className="space-y-2">
      {!compact && (
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Operator {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Select
        value={operatorValue}
        onValueChange={handleChange}
        disabled={!property}
      >
        <SelectTrigger className={cn(
          compact ? 'h-8 text-xs' : 'h-10 text-sm',
          error ? 'border-red-500' : '',
          !property ? 'opacity-50' : ''
        )}>
          <SelectValue placeholder={property ? "Select operator..." : "Select property first"} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedOperators).map(([category, ops]) => (
            ops.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {op.symbol} {op.title}
              </SelectItem>
            ))
          ))}
        </SelectContent>
      </Select>
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

