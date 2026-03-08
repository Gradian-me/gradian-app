'use client';

import React from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { IconBox } from '@/gradian-ui/form-builder/form-elements/components/IconBox';
import type { FormWizard } from '@/gradian-ui/schema-manager/types/form-schema';
import { resolveFromTranslationsArray } from '@/gradian-ui/shared/utils/translation-utils';

export interface WizardStepperProps {
  wizards: FormWizard[];
  activeIndex: number;
  onSelect: (index: number) => void;
  wizardHasError: Record<string, boolean>;
  language: string;
  defaultLang: string;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_ICON = 'Circle';

export function WizardStepper({
  wizards,
  activeIndex,
  onSelect,
  wizardHasError,
  language,
  defaultLang,
  disabled = false,
  className,
}: WizardStepperProps) {
  if (wizards.length === 0) return null;

  const sortedWizards = [...wizards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalSteps = sortedWizards.length;
  const progressPercent = totalSteps > 0 ? ((activeIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className={cn('flex flex-col items-center w-full', className)}>
      {/* Wrapper so progress bar and buttons share the same width (width = buttons row) */}
      <div className="flex flex-col items-center w-max max-w-full">
        {/* Progress bar — w-full = same width as buttons row */}
        <div
          className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-6"
          role="progressbar"
          aria-valuenow={activeIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label="Form progress"
        >
          <div
            className="h-full rounded-full bg-violet-500 dark:bg-violet-600 transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step buttons — no lines between */}
        <div
          role="tablist"
          aria-label="Form steps"
          className="flex items-center justify-center gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden py-2 scrollbar-thin"
        >
        {sortedWizards.map((wizard, index) => {
          const isActive = index === activeIndex;
          const hasError = wizardHasError[wizard.id];
          const icon = wizard.icon ?? DEFAULT_ICON;
          const label = resolveFromTranslationsArray(wizard.title, language, defaultLang) || wizard.id;

          return (
            <button
              key={wizard.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => !disabled && onSelect(index)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 min-w-16 sm:min-w-20 shrink-0 p-2 rounded-xl transition-colors outline-none focus-visible:outline-2 focus-visible:outline-violet-500 focus-visible:outline-offset-2',
                isActive && 'bg-violet-100 dark:bg-violet-900/40',
                !isActive && !disabled && 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <div
                className={cn(
                  'rounded-xl p-0.5 transition-[border-color,box-shadow]',
                  hasError && 'border-2 border-red-500 shadow-sm shadow-red-500/20'
                )}
              >
                <IconBox
                  name={icon}
                  variant="rounded"
                  size="md"
                  color={hasError ? 'red' : isActive ? 'violet' : 'gray'}
                  className={cn(
                    !isActive && !hasError && 'border-2 border-violet-200 dark:border-violet-800'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-center truncate max-w-full',
                  isActive && !hasError && 'text-violet-600 dark:text-violet-400',
                  hasError && 'text-red-600 dark:text-red-400',
                  !isActive && !hasError && 'text-gray-500 dark:text-gray-400'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
