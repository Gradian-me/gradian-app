'use client';

import * as React from "react"
import { cn } from "@/lib/utils"
import { IconRenderer, isValidLucideIcon } from "@/gradian-ui/shared/utils/icon-renderer"

export interface IconInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const IconInput = React.forwardRef<HTMLInputElement, IconInputProps>(
  ({ className, value = '', onChange, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(value);
    const isValid = isValidLucideIcon(localValue);
    const isEmpty = !localValue || localValue.trim() === '';

    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange?.(e);
    };

    return (
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          {isEmpty ? (
            <span className="text-gray-400 text-sm dark:text-slate-500">Icon</span>
          ) : isValid ? (
            <IconRenderer iconName={localValue} className="h-4 w-4 text-gray-600 dark:text-gray-200" />
          ) : (
            <span className="text-red-500 text-xs dark:text-red-400">Invalid</span>
          )}
        </div>
        <input
          type="text"
          ref={ref}
          value={localValue}
          onChange={handleChange}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-white ps-12 pe-3 py-2 text-sm text-gray-900 ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-300 focus-visible:ring-offset-1 focus-visible:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500 dark:focus-visible:ring-violet-500",
            isEmpty
              ? "border-gray-300 text-gray-900 placeholder:text-gray-400 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
              : isValid
                ? "border-green-300 text-gray-900 placeholder:text-gray-400 dark:border-emerald-500 dark:text-slate-100 dark:placeholder:text-slate-500"
                : "border-red-300 text-red-600 placeholder:text-red-400 dark:border-red-500 dark:text-red-300 dark:placeholder:text-red-300/70",
            className
          )}
          placeholder="Type icon name (e.g., User, Home, Search)"
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className={cn(
            'text-xs',
            isEmpty
              ? 'text-gray-500 dark:text-slate-500'
              : isValid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
          )}>
            {isEmpty ? '' : isValid ? '✓' : '✗'}
          </span>
        </div>
      </div>
    )
  }
)
IconInput.displayName = "IconInput"

export { IconInput }

