'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Animates streamed text reveal with a lightweight interval-based approach.
 * Avoids per-frame animation callbacks that can trigger excessive React updates.
 */
export function useAnimatedStreamedText(text: string, enabled: boolean): string {
  const [cursor, setCursor] = useState(0);
  const cursorRef = useRef(0);
  const prevTextRef = useRef(text);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const targetLen = text.length;
    const prevText = prevTextRef.current;
    const isContinuation = prevText.length > 0 && text.startsWith(prevText) && targetLen >= prevText.length;
    const from = enabled ? (isContinuation ? Math.min(cursorRef.current, targetLen) : 0) : targetLen;

    prevTextRef.current = text;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled) {
      if (cursorRef.current !== targetLen) {
        cursorRef.current = targetLen;
        setCursor(targetLen);
      }
      return;
    }

    if (from >= targetLen) {
      if (cursorRef.current !== targetLen) {
        cursorRef.current = targetLen;
        setCursor(targetLen);
      }
      return;
    }

    cursorRef.current = from;
    setCursor(from);

    const delta = targetLen - from;
    const intervalMs = 24; // ~41fps: smooth enough, much lower render pressure than 60fps
    const ticks = Math.max(8, Math.min(40, Math.ceil(delta / 4)));
    const step = Math.max(1, Math.ceil(delta / ticks));

    timerRef.current = setInterval(() => {
      const next = Math.min(targetLen, cursorRef.current + step);
      if (next !== cursorRef.current) {
        cursorRef.current = next;
        setCursor(next);
      }

      if (next >= targetLen && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, enabled]);

  if (!enabled) return text;
  return text.slice(0, cursor);
}
