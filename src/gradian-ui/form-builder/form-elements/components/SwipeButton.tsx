'use client';

import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';

import { cn } from '../../../shared/utils';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';

export type SwipeButtonVariant = 'success' | 'warning' | 'error';

export interface SwipeButtonConfig {
  name?: string;
  label?: string;
  /**
   * Visual variant, typically mapped to intent:
   * - success: positive/confirm, e.g. save
   * - warning: cautionary, e.g. risky change
   * - error: destructive, e.g. delete
   */
  variant?: SwipeButtonVariant;
  /**
   * Lucide icon name for the main action (e.g. "Save", "Trash2").
   * Rendered next to the label text.
   */
  icon?: string;
  /**
   * Optional custom text inside the track.
   * If omitted, the field label will be used by the factory.
   */
  text?: string;
  /**
   * Milliseconds to keep the validated state before auto-reset.
   * Only affects the UI state, not the bound value.
   */
  validationDuration?: number;
}

export interface SwipeButtonProps {
  config?: SwipeButtonConfig;
  value?: boolean | null;
  onChange?: (value: boolean) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const VARIANT_COLORS: Record<
  SwipeButtonVariant,
  {
    track: string;
    trackBorder: string;
    thumb: string;
    thumbHover: string;
    validated: string;
  }
> = {
  success: {
    track: 'bg-emerald-50 dark:bg-emerald-950/30',
    trackBorder: 'border-emerald-200 dark:border-emerald-800',
    thumb: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
    thumbHover: 'hover:bg-emerald-700 dark:hover:bg-emerald-400',
    validated: 'bg-emerald-500 dark:bg-emerald-500',
  },
  warning: {
    track: 'bg-amber-50 dark:bg-amber-950/30',
    trackBorder: 'border-amber-200 dark:border-amber-800',
    thumb: 'bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950',
    thumbHover: 'hover:bg-amber-600 dark:hover:bg-amber-300',
    validated: 'bg-amber-500 dark:bg-amber-500',
  },
  error: {
    track: 'bg-red-50 dark:bg-red-950/30',
    trackBorder: 'border-red-200 dark:border-red-800',
    thumb: 'bg-red-600 text-white dark:bg-red-500 dark:text-red-950',
    thumbHover: 'hover:bg-red-700 dark:hover:bg-red-400',
    validated: 'bg-red-500 dark:bg-red-500',
  },
};

export const SwipeButton: React.FC<SwipeButtonProps> = ({
  config,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required,
  className,
}) => {
  const variant: SwipeButtonVariant = config?.variant ?? 'success';
  const validationDuration = config?.validationDuration ?? 1600;

  const [isSwiped, setIsSwiped] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-reset only the visual state; keep the boolean value as "was confirmed".
  useEffect(() => {
    if (!isValidated) return;
    const timer = window.setTimeout(() => {
      setIsValidated(false);
      setIsSwiped(false);
      setCurrentX(0);
      setIsDragging(false);
    }, validationDuration);
    return () => window.clearTimeout(timer);
  }, [isValidated, validationDuration]);

  const isInteractive = !disabled;

  const handleStart = (clientX: number) => {
    if (!isInteractive || isValidated) return;
    setStartX(clientX);
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!buttonRef.current || !isDragging || !isInteractive || isValidated) return;

    const containerWidth = containerRef.current?.offsetWidth ?? 0;
    const buttonWidth = buttonRef.current.offsetWidth;
    const gap = 3;
    const maxSwipe = containerWidth - buttonWidth - gap * 2;

    let newX = clientX - startX;
    newX = Math.max(0, Math.min(newX, maxSwipe));

    setCurrentX(newX);
    setIsSwiped(newX >= maxSwipe - 10);
  };

  const completeSwipe = () => {
    setIsValidated(true);
    setCurrentX(0);
    setIsDragging(false);
    if (!value) {
      onChange?.(true);
    } else {
      // Still emit change so consumers that listen for transitions can react.
      onChange?.(true);
    }
    onBlur?.();
  };

  const handleEnd = () => {
    if (!isInteractive || isValidated) return;

    if (isSwiped) {
      completeSwipe();
    } else {
      setCurrentX(0);
      setIsSwiped(false);
      setIsDragging(false);
    }
  };

  const colors = VARIANT_COLORS[variant];
  const labelText = config?.text ?? config?.label ?? 'Swipe to confirm';
  const ariaLabel = `${labelText}${required ? ' (required)' : ''}`;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-10 w-[250px] overflow-hidden rounded-lg mx-auto',
        'border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
        colors.trackBorder,
        colors.track,
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      onTouchStart={(e) => handleStart(e.touches[0]?.clientX ?? 0)}
      onTouchMove={(e) => handleMove(e.touches[0]?.clientX ?? 0)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      role="button"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onFocus={onFocus}
      tabIndex={disabled ? -1 : 0}
    >
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          'absolute inset-y-[6px] left-[6px] flex h-[calc(100%-12px)] items-center justify-center rounded-full px-2',
          'cursor-grab active:cursor-grabbing select-none shadow-sm transition-all duration-300',
          colors.thumb,
          colors.thumbHover,
          isValidated &&
            cn(
              'w-[calc(100%-12px)] cursor-default opacity-100',
              colors.validated,
              'hover:bg-inherit dark:hover:bg-inherit'
            )
        )}
        style={{
          width: isValidated ? `calc(100% - 12px)` : '40px',
          transform: isValidated ? 'none' : `translateX(${currentX}px)`,
          transition: isDragging ? 'none' : 'all 0.25s ease',
        }}
        aria-label={isValidated ? 'Confirmed' : ariaLabel}
        disabled={disabled || isValidated}
      >
        {isValidated ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <div className="flex h-full w-full items-center justify-center px-10">
        <span
          style={{ '--swipe-button-text-width': '140px' } as CSSProperties}
          className={cn(
            'pointer-events-none inline-flex items-center gap-1.5 text-sm font-medium',
            'text-slate-600/80 dark:text-slate-200/80 select-none',
            'animate-swipe-button-text bg-size-[var(--swipe-button-text-width)_100%] bg-clip-text bg-position-[0_0] bg-no-repeat',
            '[transition:background-position_1s_cubic-bezier(.4,0,.2,1)_infinite]',
            variant === 'success' &&
              'bg-linear-to-r from-transparent via-emerald-700 via-50% to-transparent dark:via-emerald-300',
            variant === 'warning' &&
              'bg-linear-to-r from-transparent via-amber-700 via-50% to-transparent dark:via-amber-300',
            variant === 'error' &&
              'bg-linear-to-r from-transparent via-red-700 via-50% to-transparent dark:via-red-300'
          )}
        >
          {config?.icon && (
            <IconRenderer
              iconName={config.icon}
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <span>{labelText}</span>
        </span>
      </div>
    </div>
  );
};

SwipeButton.displayName = 'SwipeButton';

