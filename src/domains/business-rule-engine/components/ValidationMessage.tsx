'use client';

import { RuleValidationError } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';

interface ValidationMessageProps {
  errors: RuleValidationError[];
  className?: string;
}

export function ValidationMessage({ errors, className }: ValidationMessageProps) {
  if (errors.length === 0) {
    return (
      <Card className={cn('border-green-200 bg-green-50 dark:bg-green-950', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Rule is valid
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-red-200 bg-red-50 dark:bg-red-950', className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Validation Errors ({errors.length})
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
              {errors.map((error, index) => (
                <li key={index}>
                  <span className="font-medium">{error.field}:</span> {error.message}
                  {error.conditionId && (
                    <span className="text-xs ms-2">(Condition: {error.conditionId.slice(0, 8)})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

