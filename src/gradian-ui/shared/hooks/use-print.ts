/**
 * Print Hook
 * React hook for printing HTML elements with style preservation and header support
 */

'use client';

import { useRef, useCallback, useState } from 'react';
import type { RefObject } from 'react';
import type { PrintOptions } from '../types/print-management';
import { printElement } from '../utils/print-management';
import { loggingCustom } from '../utils/logging-custom';
import { LogType } from '../configs/log-config';

export interface UsePrintReturn {
  /**
   * Function to trigger print
   */
  print: () => Promise<void>;
  /**
   * Whether print is currently in progress
   */
  isPrinting: boolean;
}

/**
 * Hook for printing an element
 * @param elementRef - Ref to the element to print
 * @param options - Print options including header configuration
 * @returns Object with print function and isPrinting state
 */
export function usePrint(
  elementRef: RefObject<HTMLElement | null>,
  options?: PrintOptions
): UsePrintReturn {
  const [isPrinting, setIsPrinting] = useState(false);
  const isPrintingRef = useRef(false);

  const print = useCallback(async () => {
    // Prevent multiple simultaneous print operations
    if (isPrintingRef.current) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      loggingCustom(LogType.CLIENT_LOG, 'warn', 'Print: Element ref is not available');
      return;
    }

    try {
      isPrintingRef.current = true;
      setIsPrinting(true);

      await printElement(element, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggingCustom(LogType.CLIENT_LOG, 'error', `Print error: ${errorMessage}`);
      throw error;
    } finally {
      // Use setTimeout to ensure state updates after print dialog interaction
      setTimeout(() => {
        isPrintingRef.current = false;
        setIsPrinting(false);
      }, 100);
    }
  }, [elementRef, options]);

  return {
    print,
    isPrinting,
  };
}

