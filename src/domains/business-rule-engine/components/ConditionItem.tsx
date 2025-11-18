'use client';

import { Condition } from '../types';
import { formatPropertyPath } from '../utils/property-utils';
import { formatValueForDisplay } from '../utils/value-utils';
import { Card, CardContent } from '@/components/ui/card';
import { ButtonMinimal } from '@/gradian-ui/form-builder/form-elements/components/ButtonMinimal';
import { Edit, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConditionItemProps {
  condition: Condition;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  showActions?: boolean;
}

export function ConditionItem({
  condition,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
}: ConditionItemProps) {
  const propertyName = condition.property
    ? formatPropertyPath(condition.property)
    : '?';
  const operatorSymbol = condition.operator?.symbol || '?';
  let valueDisplay = '?';

  if (condition.valueType === 'fixed') {
    if (condition.property) {
      valueDisplay = formatValueForDisplay(
        condition.fixedValue,
        condition.property.type
      );
    } else {
      valueDisplay = String(condition.fixedValue);
    }
  } else if (condition.valueType === 'property') {
    valueDisplay = condition.propertyReference
      ? formatPropertyPath(condition.propertyReference)
      : '?';
  }

  const isComplete =
    condition.property && condition.operator && condition.valueType;

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {propertyName}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {operatorSymbol}
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {valueDisplay}
              </span>
              {!isComplete && (
                <Badge variant="warning" className="text-xs">
                  Incomplete
                </Badge>
              )}
            </div>
            {condition.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {condition.description}
              </p>
            )}
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <ButtonMinimal
                  icon={Edit}
                  title="Edit condition"
                  color="blue"
                  size="sm"
                  onClick={onEdit}
                />
              )}
              {onDuplicate && (
                <ButtonMinimal
                  icon={Copy}
                  title="Duplicate condition"
                  color="gray"
                  size="sm"
                  onClick={onDuplicate}
                />
              )}
              {onDelete && (
                <ButtonMinimal
                  icon={Trash2}
                  title="Delete condition"
                  color="red"
                  size="sm"
                  onClick={onDelete}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

