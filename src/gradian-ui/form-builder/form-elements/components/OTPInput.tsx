import * as React from 'react';
import { cn } from '@/gradian-ui/shared/utils';
import { CircularTimer } from '@/components/ui/circular-timer';
import type { FormElementRef } from '../types';
import type { OTPInputProps } from '../types';
import { validateField } from '@/gradian-ui/shared/utils';

// Context to coordinate OTP slots
type InputOTPContextValue = {
  slots: string[];
  maxLength: number;
  setSlots: (slots: string[]) => void;
  registerSlot: (index: number, ref: HTMLInputElement | null) => void;
  focusSlot: (index: number) => void;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  clearSlots: () => void;
};

const InputOTPContext = React.createContext<InputOTPContextValue | null>(null);

function useInputOTPContext(component: string) {
  const context = React.useContext(InputOTPContext);

  if (!context) {
    throw new Error(`${component} must be used within <OTPInput />`);
  }

  return context;
}

export interface InputOTPPrimitiveProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  maxLength: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  allowClear?: boolean;
  onClear?: () => void;
  resendDuration?: number;
  onResend?: () => Promise<void> | void;
  resendButtonLabel?: string;
  autoStartTimer?: boolean;
}

const InputOTPPrimitive = React.forwardRef<HTMLDivElement, InputOTPPrimitiveProps>(
  (
    {
      maxLength,
      value,
      defaultValue,
      className,
      onChange,
      disabled,
      inputMode = 'numeric',
      children,
      allowClear = true,
      onClear,
      resendDuration,
      onResend,
      resendButtonLabel = 'Send code',
      autoStartTimer = false,
      ...rest
    },
    ref
  ) => {
    const isControlled = value !== undefined;

    const toSlots = React.useCallback(
      (source?: string): string[] => {
        const initial = source ? source.split('').slice(0, maxLength) : [];
        return Array.from({ length: maxLength }, (_, idx) => initial[idx] ?? '');
      },
      [maxLength]
    );

    const [uncontrolledSlots, setUncontrolledSlots] = React.useState<string[]>(() =>
      toSlots(defaultValue)
    );

    const slots = React.useMemo(
      () => (isControlled ? toSlots(value) : uncontrolledSlots),
      [isControlled, toSlots, value, uncontrolledSlots]
    );

    const slotRefs = React.useRef<Array<HTMLInputElement | null>>([]);

    const setSlots = React.useCallback(
      (nextSlots: string[]) => {
        if (!isControlled) {
          setUncontrolledSlots(nextSlots);
        }
        const normalized = nextSlots.join('');
        onChange?.(normalized);
      },
      [isControlled, onChange]
    );

    const registerSlot = React.useCallback((index: number, slot: HTMLInputElement | null) => {
      slotRefs.current[index] = slot ?? null;
    }, []);

    const focusSlot = React.useCallback((index: number) => {
      const next = slotRefs.current[index];
      if (!next) return;

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          next.focus();
          next.select();
        });
      } else {
        next.focus();
        next.select();
      }
    }, []);

    const clearSlots = React.useCallback(() => {
      const emptySlots = Array.from({ length: maxLength }, () => '');
      setSlots(emptySlots);
      onClear?.();
      focusSlot(0);
    }, [focusSlot, maxLength, onClear, setSlots]);

    const [timerKey, setTimerKey] = React.useState(0);
    const [isCounting, setIsCounting] = React.useState(Boolean(autoStartTimer && resendDuration));
    const [remainingTime, setRemainingTime] = React.useState(resendDuration ?? 0);
    const [resendLoading, setResendLoading] = React.useState(false);

    React.useEffect(() => {
      if (resendDuration && autoStartTimer) {
        setTimerKey((prev) => prev + 1);
        setRemainingTime(resendDuration);
        setIsCounting(true);
      }
    }, [autoStartTimer, resendDuration]);

    const handleTimerComplete = React.useCallback(() => {
      setIsCounting(false);
      setRemainingTime(0);
    }, []);

    const handleResend = React.useCallback(async () => {
      if (!resendDuration) {
        onResend?.();
        return;
      }

      try {
        setResendLoading(true);
        await Promise.resolve(onResend?.());
        setTimerKey((prev) => prev + 1);
        setRemainingTime(resendDuration);
        setIsCounting(true);
      } catch (error) {
        console.error('[OTPInput] Resend error:', error);
      } finally {
        setResendLoading(false);
      }
    }, [onResend, resendDuration]);

    const contextValue = React.useMemo<InputOTPContextValue>(
      () => ({
        slots,
        maxLength,
        setSlots,
        registerSlot,
        focusSlot,
        disabled,
        inputMode,
        clearSlots,
      }),
      [slots, maxLength, setSlots, registerSlot, focusSlot, disabled, inputMode, clearSlots]
    );

    const disableResend = disabled || resendLoading || isCounting;
    const hasCustomChildren = React.Children.count(children) > 0;

    const defaultSlots = React.useMemo(() => {
      const slotElements = Array.from({ length: maxLength }, (_, index) => (
        <InputOTPSlot key={index} index={index} />
      ));
      return <InputOTPGroup>{slotElements}</InputOTPGroup>;
    }, [maxLength]);

    return (
      <InputOTPContext.Provider value={contextValue}>
        <div ref={ref} className={cn('flex w-full flex-col gap-4', className)} {...rest}>
          {resendDuration ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 shadow-sm dark:bg-white/5">
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-3">
                  {hasCustomChildren ? children : defaultSlots}
                </div>
                {allowClear && !disabled && (
                  <button
                    type="button"
                    onClick={clearSlots}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 focus:outline-none"
                    aria-label="Clear code"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <div className="flex items-center gap-3">
                  <CircularTimer
                    key={timerKey}
                    duration={resendDuration}
                    isPlaying={isCounting}
                    onUpdate={setRemainingTime}
                    onComplete={handleTimerComplete}
                    size={44}
                    strokeWidth={4}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={disableResend}
                  className={cn(
                    'inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-600 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-500/30 dark:text-violet-300',
                    resendLoading && 'animate-pulse'
                  )}
                >
                  {disableResend ? `Wait to resend code` : resendButtonLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                {hasCustomChildren ? children : defaultSlots}
              </div>
              {allowClear && !disabled && (
                <button
                  type="button"
                  onClick={clearSlots}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-muted/80 focus:outline-none"
                  aria-label="Clear code"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      </InputOTPContext.Provider>
    );
  }
);

InputOTPPrimitive.displayName = 'InputOTPPrimitive';

export const InputOTPGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center flex-nowrap overflow-hidden rounded-xl border border-gray-300 bg-white',
        className
      )}
      {...props}
    />
  )
);
InputOTPGroup.displayName = 'InputOTPGroup';

export const InputOTPSeparator = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children = '—', ...props }, ref) => (
    <span
      ref={ref}
      role="presentation"
      className={cn('mx-1.5 text-sm font-medium text-muted-foreground', className)}
      {...props}
    >
      {children}
    </span>
  )
);
InputOTPSeparator.displayName = 'InputOTPSeparator';

export interface InputOTPSlotProps extends React.InputHTMLAttributes<HTMLInputElement> {
  index: number;
}

export const InputOTPSlot = React.forwardRef<HTMLInputElement, InputOTPSlotProps>(
  ({ index, className, onChange, onKeyDown, onPaste, ...rest }, forwardedRef) => {
    const { slots, maxLength, setSlots, registerSlot, focusSlot, disabled, inputMode } =
      useInputOTPContext('InputOTPSlot');
    const localRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement);

    React.useEffect(() => {
      registerSlot(index, localRef.current);
    }, [index, registerSlot]);

    const safeValue = React.useMemo(() => slots[index] ?? '', [slots, index]);

    const updateValueAtIndex = React.useCallback(
      (nextChar: string, startIndex = index) => {
        const nextSlots = [...slots];

        if (startIndex >= 0 && startIndex < maxLength) {
          nextSlots[startIndex] = nextChar;
        }

        setSlots(nextSlots);
      },
      [slots, maxLength, setSlots, index]
    );

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;
      const lastChar = inputValue.slice(-1);
      const sanitized = lastChar.replace(/\s+/g, '');

      if (!sanitized) {
        updateValueAtIndex('', index);
        onChange?.(event);
        return;
      }

      if (inputMode === 'numeric' && !/^\d$/.test(sanitized)) {
        event.preventDefault();
        return;
      }

      updateValueAtIndex(sanitized, index);
      onChange?.(event);

      if (index < maxLength - 1) {
        focusSlot(index + 1);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      const isShiftTab = event.key === 'Tab' && event.shiftKey;

      if (event.key === 'Backspace' && !safeValue && index > 0) {
        event.preventDefault();
        focusSlot(index - 1);
        return;
      }

      if (event.key === 'ArrowLeft' || isShiftTab) {
        if (index > 0) {
          event.preventDefault();
          focusSlot(index - 1);
        }
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Tab') {
        if (index < maxLength - 1) {
          event.preventDefault();
          focusSlot(index + 1);
        }
        return;
      }

      onKeyDown?.(event);
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      const target = event.target;
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          target.select();
        });
      } else {
        target.select();
      }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = event.clipboardData.getData('text');
      if (!pasted) {
        return;
      }

      const sanitized = pasted.replace(/\s+/g, '');
      if (inputMode === 'numeric' && /\D/.test(sanitized)) {
        return;
      }

      event.preventDefault();

      const nextSlots = [...slots];
      let cursor = index;
      for (const char of sanitized) {
        if (cursor >= maxLength) break;
        nextSlots[cursor] = char;
        cursor += 1;
      }

      setSlots(nextSlots);
      onPaste?.(event);

      if (cursor <= maxLength - 1) {
        focusSlot(cursor);
      }
    };

    return (
      <input
        ref={localRef}
        inputMode={inputMode}
        type="text"
        autoComplete="one-time-code"
        maxLength={1}
        value={safeValue}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onPaste={handlePaste}
        className={cn(
          'flex h-10 w-10 items-center justify-center border-r border-gray-200 bg-white dark:bg-black text-md text-white font-semibold leading-none text-center transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 last:border-r-0',
          className
        )}
        {...rest}
      />
    );
  }
);
InputOTPSlot.displayName = 'InputOTPSlot';

// Combined component for general usage & form builder integration
export const InputOTP = React.forwardRef<FormElementRef, OTPInputProps>((props, ref) => {
  const {
    config,
    label,
    description,
    error,
    required,
    className,
    value = '',
    onChange,
    disabled,
    resendDuration,
    resendButtonLabel,
    autoStartTimer,
    onResend,
    separatorIndex,
    maxLength,
    ...rest
  } = props;

  const resolvedLabel = label ?? config?.label;
  const resolvedDescription = description ?? config?.description;
  // Prioritize required prop, then config.required, then config.validation?.required
  const resolvedRequired =
    typeof required !== 'undefined'
      ? required
      : config?.required ?? config?.validation?.required ?? false;
  const resolvedSeparator =
    typeof separatorIndex === 'number'
      ? separatorIndex
      : typeof config?.separatorIndex === 'number'
        ? config.separatorIndex
        : undefined;
  const resolvedMaxLength = maxLength ?? config?.maxLength ?? config?.length ?? 6;

  const formRef = React.useRef<HTMLDivElement>(null);
  const primitiveRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      primitiveRef.current?.focus();
    },
    blur: () => {
      primitiveRef.current?.blur();
    },
    validate: () => {
      if (!config?.validation) {
        return resolvedRequired ? Boolean(value) : true;
      }
      const result = validateField(value, config.validation);
      return result.isValid;
    },
    reset: () => onChange?.(''),
    getValue: () => value,
    setValue: (newValue) => onChange?.(newValue),
  }));

  const generatedChildren = React.useMemo(() => {
    const splitIndex =
      typeof resolvedSeparator === 'number' && resolvedSeparator > 0 && resolvedSeparator < resolvedMaxLength
        ? resolvedSeparator
        : null;

    const slots = Array.from({ length: resolvedMaxLength }, (_, index) => (
      <InputOTPSlot key={index} index={index} />
    ));

    if (splitIndex) {
      return (
        <>
          <InputOTPGroup>{slots.slice(0, splitIndex)}</InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>{slots.slice(splitIndex)}</InputOTPGroup>
        </>
      );
    }

    return <InputOTPGroup>{slots}</InputOTPGroup>;
  }, [resolvedSeparator, resolvedMaxLength]);

  return (
    <div ref={formRef} className={cn('space-y-3', className)}>
      {resolvedLabel && (
        <label className={cn('block text-xs font-medium text-gray-700 dark:text-gray-300', resolvedRequired && 'after:ml-1 after:text-red-500 after:content-["*"]')}>
          {resolvedLabel}
        </label>
      )}

      <InputOTPPrimitive
        ref={primitiveRef}
        maxLength={resolvedMaxLength}
        value={value}
        onChange={onChange}
        disabled={disabled}
        resendDuration={resendDuration ?? config?.resendDuration}
        resendButtonLabel={resendButtonLabel ?? config?.resendButtonLabel}
        autoStartTimer={autoStartTimer ?? config?.autoStartTimer}
        onResend={onResend ?? config?.onResend}
        allowClear
        {...rest}
      >
        {React.Children.count(props.children) > 0 ? props.children : generatedChildren}
      </InputOTPPrimitive>

      {resolvedDescription && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{resolvedDescription}</p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

InputOTP.displayName = 'InputOTP';

export const OTPInput = InputOTP;
