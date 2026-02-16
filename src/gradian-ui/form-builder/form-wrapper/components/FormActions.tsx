// Form Actions Component

import React from 'react';
import { FormActionsProps } from '../types';
import { cn } from '../../../shared/utils';

export const FormActions: React.FC<FormActionsProps> = ({
  actions,
  direction = 'row',
  justify = 'end',
  align = 'center',
  spacing = 'md',
  className,
  ...props
}) => {
  const containerClasses = cn(
    'flex',
    direction === 'column' && 'flex-col',
    direction === 'row' && 'flex-row',
    justify === 'start' && 'justify-start',
    justify === 'center' && 'justify-center',
    justify === 'end' && 'justify-end',
    justify === 'between' && 'justify-between',
    justify === 'around' && 'justify-around',
    align === 'start' && 'items-start',
    align === 'center' && 'items-center',
    align === 'end' && 'items-end',
    align === 'stretch' && 'items-stretch',
    spacing === 'sm' && 'space-x-2',
    spacing === 'md' && 'space-x-3',
    spacing === 'lg' && 'space-x-4',
    direction === 'column' && spacing === 'sm' && 'space-x-0 space-y-2',
    direction === 'column' && spacing === 'md' && 'space-x-0 space-y-3',
    direction === 'column' && spacing === 'lg' && 'space-x-0 space-y-4',
    className
  );

  const getButtonClasses = (variant: string, disabled: boolean, loading: boolean) => {
    const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    };

    const disabledClasses = 'opacity-50 cursor-not-allowed';
    const loadingClasses = 'opacity-75 cursor-wait';

    return cn(
      baseClasses,
      variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary,
      disabled && disabledClasses,
      loading && loadingClasses
    );
  };

  return (
    <div className={containerClasses} {...props}>
      {actions.map((action, index) => (
        <button
          key={index}
          type={action.type === 'submit' ? 'submit' : 'button'}
          disabled={action.disabled}
          onClick={action.onClick}
          className={getButtonClasses(
            action.variant || 'primary',
            action.disabled || false,
            action.loading || false
          )}
        >
          <div className="flex items-center gap-2">
            {action.loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            )}
            {action.icon && !action.loading && (
              <span>{action.icon}</span>
            )}
            <span className="hidden md:inline">{action.label}</span>
            {typeof action.badge === 'number' && action.badge > 0 && (
              <span className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 tabular-nums">
                {action.badge > 99 ? '99+' : action.badge}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

FormActions.displayName = 'FormActions';
