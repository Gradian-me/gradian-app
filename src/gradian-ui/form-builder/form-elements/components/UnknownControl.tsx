// Unknown Control Component
// Rendered when an unknown component type is encountered

import React from 'react';
import { FormElementProps } from '../types';
import { cn } from '../../../shared/utils';
import { AlertCircle } from 'lucide-react';

export interface UnknownControlProps extends FormElementProps {
  componentType?: string;
}

export const UnknownControl: React.FC<UnknownControlProps> = ({
  config,
  value,
  error,
  disabled,
  required,
  componentType,
  className,
}) => {
  const fieldName = config?.name || 'unknown';
  const fieldLabel = config?.label;
  const unknownType = componentType || config?.component || config?.type || 'unknown';

  return (
    <div className={cn('w-full', className)}>
      {fieldLabel && (
        <label
          htmlFor={fieldName}
          className={cn(
            'block text-xs font-medium mb-2',
            error ? 'text-red-700' : 'text-gray-700',
            required && 'after:content-["*"] after:ml-1 after:text-red-500'
          )}
        >
          {fieldLabel}
        </label>
      )}
      <div className="flex items-center gap-2 w-full px-3 py-2 border border-yellow-400 rounded-lg bg-yellow-50 text-yellow-800">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            Unknown component type: <span className="font-mono">{unknownType}</span>
          </p>
          <p className="text-xs text-yellow-700 mt-0.5">
            This component type is not supported. Please check the component configuration.
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

UnknownControl.displayName = 'UnknownControl';

