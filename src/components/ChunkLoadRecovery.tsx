'use client';

import { useEffect } from 'react';

const CHUNK_LOAD_KEY = 'chunk_load_reload_attempted';
const CHUNK_ERROR_PATTERNS = [
  'Loading chunk',
  'ChunkLoadError',
  'Loading CSS chunk',
  'Failed to fetch dynamically imported module',
];

function isChunkLoadError(reason: unknown): boolean {
  if (reason instanceof Error) {
    const s = `${reason.name} ${reason.message}`;
    return CHUNK_ERROR_PATTERNS.some((p) => s.includes(p));
  }
  if (typeof reason === 'string') {
    return CHUNK_ERROR_PATTERNS.some((p) => reason.includes(p));
  }
  return false;
}

/**
 * Listens for chunk load errors (e.g. after deploy when HTML references old chunk hashes)
 * and triggers a single full page reload to fetch fresh HTML and chunks.
 * Uses sessionStorage to avoid infinite reload loops.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    function handleRejection(event: PromiseRejectionEvent) {
      if (!isChunkLoadError(event.reason)) return;
      try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(CHUNK_LOAD_KEY)) return;
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(CHUNK_LOAD_KEY, '1');
        window.location.reload();
      } catch {
        // ignore
      }
    }

    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  return null;
}
