'use client';

import { LogicalOperator } from '../types';
import { Select, SelectOption } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

interface LogicalOperatorSelectorProps {
  value: LogicalOperator;
  onChange: (operator: LogicalOperator) => void;
  conditionCount?: number;
  compact?: boolean;
}

export function LogicalOperatorSelector({
  value,
  onChange,
  conditionCount = 0,
  compact = false,
}: LogicalOperatorSelectorProps) {
  const options: SelectOption[] = compact
    ? [
        {
          id: 'and',
          value: 'and',
          label: 'AND',
          icon: 'CheckCircle',
        },
        {
          id: 'or',
          value: 'or',
          label: 'OR',
          icon: 'Circle',
        },
        {
          id: 'not',
          value: 'not',
          label: 'NOT',
          icon: 'XCircle',
          color: 'destructive',
        },
      ]
    : [
        {
          id: 'and',
          value: 'and',
          label: 'AND - All conditions must pass',
          icon: 'CheckCircle',
        },
        {
          id: 'or',
          value: 'or',
          label: 'OR - Any condition can pass',
          icon: 'Circle',
        },
        {
          id: 'not',
          value: 'not',
          label: 'NOT - Negate the condition',
          icon: 'XCircle',
          color: 'destructive',
        },
      ];

  const handleChange = (selectedId: string) => {
    onChange(selectedId as LogicalOperator);
  };

  const getDescription = (op: LogicalOperator): string => {
    switch (op) {
      case 'and':
        return 'All conditions in this group must be true for the rule to pass.';
      case 'or':
        return 'At least one condition in this group must be true for the rule to pass.';
      case 'not':
        return 'The result of this group will be negated (true becomes false, false becomes true).';
      default:
        return '';
    }
  };

  if (compact) {
    return (
      <Select
        options={options}
        value={value}
        onValueChange={handleChange}
        placeholder="Operator..."
        config={{ name: 'logicalOperator', label: '' }}
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Logical Operator
      </label>
      <Select
        options={options}
        value={value}
        onValueChange={handleChange}
        placeholder="Select logical operator..."
        config={{ name: 'logicalOperator', label: '' }}
        size="sm"
      />
      {conditionCount > 0 && !compact && (
        <Card className="mt-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">{getDescription(value)}</p>
                <p>This group contains {conditionCount} condition(s).</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

