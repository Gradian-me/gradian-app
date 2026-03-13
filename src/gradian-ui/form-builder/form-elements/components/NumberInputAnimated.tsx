'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
import { Calculator } from '@/gradian-ui/formula-engine';
import { createBeep } from '@/gradian-ui/shared/utils/sound-utils';
import { triggerSelection } from '@/gradian-ui/shared/haptic-utils';

export type NumberInputAnimatedProps = {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  /** When true, plays a short beep on value change (Web Audio). */
  enableBeep?: boolean;
};

export const NumberInputAnimated: React.FC<NumberInputAnimatedProps> = ({
  value = 1,
  min = 1,
  max = 200,
  onChange,
  enableBeep = false,
}) => {
  const defaultValue = React.useRef(value);
  const [calculatorOpen, setCalculatorOpen] = React.useState(false);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const beepRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (enableBeep) {
      beepRef.current = createBeep(audioContextRef);
    } else {
      beepRef.current = null;
    }

    return () => {
      beepRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [enableBeep]);

  const handlePointerDown =
    (diff: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse') {
        event.preventDefault();
      }
      const next = Math.min(
        Math.max(value + diff, min ?? -Infinity),
        max ?? Infinity
      );
      onChange?.(next);
      triggerSelection();
      if (enableBeep && beepRef.current) {
        beepRef.current();
      }
    };

  const handleCalculatorApply = React.useCallback(
    (result: number) => {
      // Let the parent/form validation handle min/max errors.
      // Only normalize to an integer for the animated count.
      const next = Math.round(result);
      onChange?.(next);
      setCalculatorOpen(false);
    },
    [onChange]
  );

  const handleOpenCalculator = React.useCallback(() => {
    setCalculatorOpen(true);
  }, []);

  const disableDecrement = min != null && value <= min;
  const disableIncrement = max != null && value >= max;

  return (
    <div className="group inline-flex items-stretch rounded-full text-sm font-semibold bg-gray-100 dark:bg-gray-700/80 transition-shadow focus-within:ring-2 focus-within:ring-violet-400 dark:focus-within:ring-violet-600">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-90 transition-all disabled:opacity-30"
        disabled={disableDecrement}
        onPointerDown={handlePointerDown(-1)}
      >
        <Minus className="size-3.5" absoluteStrokeWidth strokeWidth={3.5} />
      </button>
      <div
        className="relative grid cursor-pointer select-none items-center justify-items-center text-center [grid-template-areas:'overlap'] *:[grid-area:overlap]"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          handleOpenCalculator();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenCalculator();
          }
        }}
        aria-label="Open calculator to enter number"
      >
        <input
          readOnly
          className="min-w-[2.5em] w-[2.5em] bg-transparent py-1 text-center font-[inherit] text-transparent outline-none pointer-events-none select-none"
          style={{ fontKerning: 'none' }}
          type="number"
          min={min}
          step={1}
          autoComplete="off"
          inputMode="numeric"
          max={max}
          value={value}
          aria-hidden="true"
          tabIndex={-1}
        />
        <div
          className="pointer-events-none flex items-center justify-center font-[inherit] tabular-nums text-gray-800 dark:text-gray-100"
          style={{ fontKerning: 'none' }}
          aria-hidden="true"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="inline-block"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      {calculatorOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 pointer-events-auto"
            style={{ isolation: 'isolate' }}
            onClick={() => setCalculatorOpen(false)}
            role="presentation"
            dir="ltr"
          >
            <div
              className="rounded-lg border border-gray-700 shadow-2xl overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Calculator"
            >
              <Calculator
                enableCalculatorInput
                enableSign={false}
                enableParanthesis
                enableHistory={false}
                initialValue={value}
                min={min}
                max={max}
                onApply={handleCalculatorApply}
                onCancel={() => setCalculatorOpen(false)}
              />
            </div>
          </div>,
          document.body
        )}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-90 transition-all disabled:opacity-30"
        disabled={disableIncrement}
        onPointerDown={handlePointerDown(1)}
      >
        <Plus className="size-3.5" absoluteStrokeWidth strokeWidth={3.5} />
      </button>
    </div>
  );
};
