'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { cn } from '@/gradian-ui/shared/utils';
import { parseFormula } from '../utils/formula-parser';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

const MAX_DISPLAY_LENGTH = 10;

export interface CalculatorProps {
  enableCalculatorInput?: boolean;
  enableSign?: boolean;
  enableParanthesis?: boolean;
  enableHistory?: boolean;
  initialValue?: string | number;
  min?: number;
  max?: number;
  onApply?: (result: number) => void;
  onCancel?: () => void;
  className?: string;
}

function normalizeExpression(expr: string): string {
  const open = (expr.match(/\(/g) || []).length;
  const close = (expr.match(/\)/g) || []).length;
  if (open > close) {
    return expr + ')'.repeat(open - close);
  }
  return expr;
}

function formatForDisplay(value: number): string {
  if (!isFinite(value)) {
    return value > 0 ? 'Infinity' : '-Infinity';
  }
  if (isNaN(value)) {
    return 'Error';
  }
  const stringValue = String(value);
  if (stringValue.length <= MAX_DISPLAY_LENGTH) {
    return stringValue;
  }
  if (stringValue.includes('.')) {
    const [integerPart, decimalPart] = stringValue.split('.');
    const availableDecimals = MAX_DISPLAY_LENGTH - integerPart.length - 1;
    if (availableDecimals > 0) {
      return value.toFixed(Math.min(availableDecimals, decimalPart?.length ?? 0));
    }
  }
  const exponential = value.toExponential();
  if (exponential.length <= MAX_DISPLAY_LENGTH) {
    return exponential;
  }
  let precision = 5;
  while (precision >= 0) {
    const exp = value.toExponential(precision);
    if (exp.length <= MAX_DISPLAY_LENGTH) {
      return exp;
    }
    precision--;
  }
  return value.toExponential(0);
}

/** Normalize display string for parseFormula: × → *, ÷ → / */
function expressionForParse(display: string): string {
  const replaced = display.replace(/×/g, '*').replace(/÷/g, '/').trim();
  return normalizeExpression(replaced);
}

export const Calculator: React.FC<CalculatorProps> = ({
  enableCalculatorInput = false,
  enableSign = false,
  enableParanthesis = true,
  enableHistory = false,
  initialValue,
  min,
  max,
  onApply,
  onCancel,
  className,
}) => {
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const hasInitialValue = initialValue !== undefined && initialValue !== null && initialValue !== '';
  const [display, setDisplay] = useState<string>(() => {
    if (hasInitialValue) {
      const v = typeof initialValue === 'number' ? String(initialValue) : String(initialValue);
      return v || '0';
    }
    return '0';
  });
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(hasInitialValue);
  const [history, setHistory] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const calculate = useCallback((firstValue: number, secondValue: number, op: string): number => {
    switch (op) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '×':
      case '*':
        return firstValue * secondValue;
      case '÷':
      case '/':
        return secondValue === 0 ? Number.NaN : firstValue / secondValue;
      default:
        return secondValue;
    }
  }, []);

  const inputNumber = useCallback(
    (num: string) => {
      if (waitingForOperand) {
        setDisplay(num);
        setWaitingForOperand(false);
      } else {
        const newDisplay = display === '0' ? num : display + num;
        const effectiveLength = newDisplay.replace('.', '').replace('-', '').length;
        if (effectiveLength <= MAX_DISPLAY_LENGTH) {
          setDisplay(newDisplay);
        }
      }
    },
    [display, waitingForOperand]
  );

  const inputOperation = useCallback(
    (nextOp: string) => {
      const inputValue = parseFloat(display);
      if (isNaN(inputValue)) return;

      if (previousValue === null) {
        setPreviousValue(inputValue);
      } else if (operation) {
        const currentValue = previousValue;
        const newValue = calculate(currentValue, inputValue, operation);
        setDisplay(formatForDisplay(newValue));
        setPreviousValue(newValue);
        if (enableHistory) {
          setHistory((prev) =>
            [...prev.slice(-4), `${currentValue} ${operation} ${inputValue} = ${newValue}`]
          );
        }
      }
      setWaitingForOperand(true);
      setOperation(nextOp);
    },
    [display, previousValue, operation, calculate, enableHistory]
  );

  const performCalculation = useCallback(() => {
    const hasParens = display.includes('(') || display.includes(')');
    if (hasParens) {
      const expr = expressionForParse(display);
      const result = parseFormula(expr, {});
      if (result.success && typeof result.value === 'number' && !isNaN(result.value)) {
        setDisplay(formatForDisplay(result.value));
        setPreviousValue(null);
        setOperation(null);
        setWaitingForOperand(true);
      }
      return;
    }

    const inputValue = parseFloat(display);
    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(formatForDisplay(newValue));
      if (enableHistory) {
        setHistory((prev) =>
          [...prev.slice(-4), `${previousValue} ${operation} ${inputValue} = ${newValue}`]
        );
      }
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operation, calculate, enableHistory]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const backspace = useCallback(() => {
    setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'));
  }, []);

  const handleButtonClick = useCallback(
    (btn: string) => {
      if (btn === 'C') {
        clear();
      } else if (btn === '=') {
        performCalculation();
      } else if (['÷', '×', '-', '+'].includes(btn)) {
        // When parentheses are present, treat operators as part of the expression,
        // not as classic binary ops using previousValue.
        const hasParens = enableParanthesis && (display.includes('(') || display.includes(')'));
        if (hasParens) {
          setDisplay((d) => (d === '0' ? btn : d + btn));
        } else {
          inputOperation(btn);
        }
      } else if (btn === '±' && enableSign) {
        const num = parseFloat(display);
        if (!isNaN(num)) setDisplay(formatForDisplay(num * -1));
      } else if (btn === '%') {
        const num = parseFloat(display);
        if (!isNaN(num)) setDisplay(formatForDisplay(num / 100));
      } else if (btn === '.') {
        if (!display.includes('.')) inputNumber(btn);
      } else if ((btn === '(' || btn === ')') && enableParanthesis) {
        if (waitingForOperand) {
          setDisplay(btn);
          setWaitingForOperand(false);
        } else {
          setDisplay((d) => (d === '0' ? btn : d + btn));
        }
      } else if (/\d/.test(btn)) {
        inputNumber(btn);
      }
    },
    [
      clear,
      performCalculation,
      inputOperation,
      inputNumber,
      display,
      waitingForOperand,
      enableSign,
      enableParanthesis,
    ]
  );

  const getCurrentResult = useCallback((): number | null => {
    const hasParens = display.includes('(') || display.includes(')');
    if (hasParens) {
      const expr = expressionForParse(display);
      const result = parseFormula(expr, {});
      if (result.success && typeof result.value === 'number' && isFinite(result.value)) {
        return result.value;
      }
      return null;
    }
    if (previousValue !== null && operation) {
      const inputValue = parseFloat(display);
      if (!isNaN(inputValue)) {
        const value = calculate(previousValue, inputValue, operation);
        return isFinite(value) && !isNaN(value) ? value : null;
      }
    }
    const num = parseFloat(display);
    return !isNaN(num) && isFinite(num) ? num : null;
  }, [display, previousValue, operation, calculate]);

  const handleApply = useCallback(() => {
    const result = getCurrentResult();
    if (result === null) {
      setValidationError('Invalid expression');
      return;
    }

    if (typeof min === 'number' && result < min) {
      setValidationError(`Value must be \u2265 ${min}`);
      return;
    }

    if (typeof max === 'number' && result > max) {
      setValidationError(`Value must be \u2264 ${max}`);
      return;
    }

    setValidationError(null);
    onApply?.(result);
  }, [getCurrentResult, min, max, onApply]);

  const getButtonClass = useCallback((btn: string) => {
    if (['÷', '×', '-', '+', '='].includes(btn)) {
      return '!bg-orange-500 hover:!bg-orange-600 !text-white';
    }
    if (['C', '±', '%'].includes(btn)) {
      return '!bg-gray-500 hover:!bg-gray-600 !text-white';
    }
    if (['(', ')'].includes(btn)) {
      return '!bg-gray-600 hover:!bg-gray-500 !text-white';
    }
    return '!bg-gray-700 hover:!bg-gray-600 !text-white';
  }, []);

  useEffect(() => {
    if (initialValue !== undefined && initialValue !== null && initialValue !== '') {
      const v = typeof initialValue === 'number' ? String(initialValue) : String(initialValue);
      setDisplay(v || '0');
      setWaitingForOperand(true);
    }
  }, [initialValue]);
      // Calculator overlay is modal; capture keys even if focus stayed on the trigger input.

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const id = setTimeout(() => el.focus(), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const swallow = () => {
        e.preventDefault();
        e.stopPropagation();
        (e as any).stopImmediatePropagation?.();
      };
      if (e.key >= '0' && e.key <= '9') {
        swallow();
        handleButtonClick(e.key);
      } else if (e.key === '.') {
        swallow();
        handleButtonClick('.');
      } else if (e.key === '+') {
        swallow();
        handleButtonClick('+');
      } else if (e.key === '-') {
        swallow();
        handleButtonClick('-');
      } else if (e.key === '*') {
        swallow();
        handleButtonClick('×');
      } else if (e.key === '/') {
        swallow();
        handleButtonClick('÷');
      } else if (enableParanthesis && (e.key === '(' || e.key === ')')) {
        swallow();
        handleButtonClick(e.key);
      } else if (e.key === 'Enter') {
        swallow();
        if (enableCalculatorInput) {
          handleApply();
        } else {
          performCalculation();
        }
      } else if (e.key === 'Escape') {
        swallow();
        if (enableCalculatorInput) {
          onCancel?.();
        } else {
          clear();
        }
      } else if (e.key === 'Backspace') {
        swallow();
        backspace();
      }
    };
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, [handleButtonClick, handleApply, performCalculation, clear, backspace, enableCalculatorInput, onCancel, enableParanthesis]);

  const cancelLabel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const applyLabel = getT(TRANSLATION_KEYS.BUTTON_APPLY, language, defaultLang);

  return (
    <div
      className={cn(
        'bg-gray-900 rounded-lg p-3 h-full w-64 flex flex-col min-w-[16rem]',
        className
      )}
      role="application"
      aria-label="Calculator"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-sm">Calculator</h3>
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={backspace}
            className="text-gray-400 hover:text-white p-1 rounded"
            aria-label="Backspace"
          >
            <Delete size={14} />
          </button>
          {enableHistory && (
            <button
              type="button"
              onClick={clearHistory}
              className="text-gray-400 hover:text-white p-1 rounded"
              aria-label="Clear history"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {enableHistory && (
        <div className="bg-gray-800 rounded p-2 mb-2 h-12 overflow-y-auto">
          {history.length > 0 ? (
            <div className="space-y-1">
              {history.slice(-2).map((entry, index) => (
                <div key={index} className="text-xs text-gray-400">
                  {entry}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">History will appear here</div>
          )}
        </div>
      )}

      <div className="bg-black rounded p-3 mb-2 text-right">
        <input
          ref={inputRef}
          value={display}
          readOnly
          className="w-full bg-transparent border-none text-white text-2xl font-mono outline-none text-right min-h-8"
        />
        {operation && previousValue !== null && (
          <div className="text-orange-400 text-sm">
            {previousValue} {operation}
          </div>
        )}
      </div>

      {validationError && (
        <div className="mb-1 px-1 text-xs text-red-400 text-right">{validationError}</div>
      )}

      <div className="grid grid-cols-4 gap-2 flex-1">
        <button
          type="button"
          onClick={() => handleButtonClick('C')}
          className={cn(
            getButtonClass('C'),
            'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0',
            !enableSign && 'col-span-2'
          )}
        >
          C
        </button>
        {enableSign && (
          <button
            type="button"
            onClick={() => handleButtonClick('±')}
            className={cn(getButtonClass('±'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
          >
            ±
          </button>
        )}
        <button
          type="button"
          onClick={() => handleButtonClick('%')}
          className={cn(getButtonClass('%'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('÷')}
          className={cn(getButtonClass('÷'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          ÷
        </button>

        <button
          type="button"
          onClick={() => handleButtonClick('7')}
          className={cn(getButtonClass('7'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('8')}
          className={cn(getButtonClass('8'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('9')}
          className={cn(getButtonClass('9'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('×')}
          className={cn(getButtonClass('×'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          ×
        </button>

        <button
          type="button"
          onClick={() => handleButtonClick('4')}
          className={cn(getButtonClass('4'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('5')}
          className={cn(getButtonClass('5'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('6')}
          className={cn(getButtonClass('6'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('-')}
          className={cn(getButtonClass('-'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          -
        </button>

        <button
          type="button"
          onClick={() => handleButtonClick('1')}
          className={cn(getButtonClass('1'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('2')}
          className={cn(getButtonClass('2'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('3')}
          className={cn(getButtonClass('3'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          3
        </button>
        <button
          type="button"
          onClick={() => handleButtonClick('+')}
          className={cn(getButtonClass('+'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
        >
          +
        </button>

        {enableParanthesis ? (
          <>
            <button
              type="button"
              onClick={() => handleButtonClick('(')}
              className={cn(getButtonClass('('), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
            >
              (
            </button>
            <button
              type="button"
              onClick={() => handleButtonClick('0')}
              className={cn(getButtonClass('0'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleButtonClick(')')}
              className={cn(getButtonClass(')'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
            >
              )
            </button>
            <button
              type="button"
              onClick={() => handleButtonClick('.')}
              className={cn(getButtonClass('.'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
            >
              .
            </button>
            <button
              type="button"
              onClick={() => handleButtonClick('=')}
              className={cn(getButtonClass('='), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0 col-span-4')}
            >
              =
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleButtonClick('0')}
              className={cn(getButtonClass('0'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0 col-span-2')}
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleButtonClick('.')}
              className={cn(getButtonClass('.'), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
            >
              .
            </button>
            <button
              type="button"
              onClick={() => handleButtonClick('=')}
              className={cn(getButtonClass('='), 'h-10 rounded text-lg font-semibold transition-colors active:scale-95 min-w-0')}
            >
              =
            </button>
          </>
        )}
      </div>

      {enableCalculatorInput && (
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-700 shrink-0">
          <button
            type="button"
            className="flex-1 min-w-0 inline-flex items-center justify-center rounded-md border border-gray-600 bg-transparent px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer w-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel?.();
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="flex-1 min-w-0 inline-flex items-center justify-center rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 cursor-pointer w-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleApply();
            }}
          >
            {applyLabel}
          </button>
        </div>
      )}
    </div>
  );
};

Calculator.displayName = 'Calculator';
