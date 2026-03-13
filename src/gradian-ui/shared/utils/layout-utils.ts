import * as React from 'react';

export interface BackButtonCloseOptions {
  /**
   * When true (default), a history entry with a lightweight marker is pushed when
   * the layer opens so that the browser back button will first pop that entry and
   * give the layer a chance to close instead of immediately navigating away.
   */
  enableHistoryIntercept?: boolean;
  /**
   * Optional unique marker key when multiple independent stacks are used.
   * Defaults to '__gradianDialog'.
   */
  markerKey?: string;
}

/**
 * Hook to close a layered UI element (dialog, drawer, sheet, etc.) when the user
 * presses the browser back button on mobile, instead of navigating away.
 *
 * Behaviour:
 * - When `open` transitions to true, pushes a history state marker and registers
 *   a `popstate` listener.
 * - When that marker state is popped (back button), calls `onRequestClose(false)`.
 * - If multiple layers are open, each pushes its own entry, so back closes them
 *   one by one in LIFO order.
 *
 * Consumers should ensure `onRequestClose(false)` follows the same path as their
 * normal close button, including any confirmation UI.
 */
export function useBackButtonClose(
  open: boolean,
  onRequestClose: (nextOpen: boolean) => void,
  options?: BackButtonCloseOptions
): void {
  const { enableHistoryIntercept = true, markerKey = '__gradianDialog' } = options ?? {};
  const popstateHandlerRef = React.useRef<((event: PopStateEvent) => void) | null>(null);

  React.useEffect(() => {
    if (!enableHistoryIntercept) return;
    if (typeof window === 'undefined') return;
    if (!open) return;

    const marker = { [markerKey]: true } as Record<string, unknown>;

    try {
      const currentState = window.history.state ?? {};
      window.history.pushState({ ...currentState, ...marker }, '');
    } catch {
      // Ignore history errors (e.g. disabled history or unsupported environment)
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = (event.state ?? {}) as Record<string, unknown>;
      if (!state[markerKey]) {
        // Not our marker; let navigation proceed normally.
        return;
      }
      onRequestClose(false);
    };

    popstateHandlerRef.current = handlePopState;
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (popstateHandlerRef.current) {
        window.removeEventListener('popstate', popstateHandlerRef.current);
        popstateHandlerRef.current = null;
      }
    };
  }, [open, enableHistoryIntercept, markerKey, onRequestClose]);
}

