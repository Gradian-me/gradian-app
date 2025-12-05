'use client';

import React, { useState } from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { Check } from 'lucide-react';

export interface TaskListItemProps {
  children: React.ReactNode;
  checked?: boolean;
  [key: string]: any;
}

/**
 * Task list item component with interactive checkbox
 */
export function TaskListItem({ children, checked: initialChecked, ...props }: TaskListItemProps) {
  const [isChecked, setIsChecked] = useState(initialChecked === true);

  return (
    <li className="mb-1 flex items-start gap-2" {...props}>
      <button
        type="button"
        onClick={() => setIsChecked(!isChecked)}
        className={cn(
          "mt-0.5 shrink-0 w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1",
          isChecked
            ? "bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 text-white"
            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500"
        )}
        aria-label={isChecked ? "Uncheck item" : "Check item"}
        role="checkbox"
        aria-checked={isChecked}
      >
        {isChecked && (
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        )}
      </button>
      <span
        className={cn(
          "flex-1",
          isChecked && "line-through text-gray-500 dark:text-gray-400"
        )}
      >
        {children}
      </span>
    </li>
  );
}

