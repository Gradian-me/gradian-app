'use client';

import * as React from 'react';
import { init } from '@squircle/core';

export function SquircleProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (typeof CSS !== 'undefined' && 'paintWorklet' in CSS) {
      void init({ disablePolyfill: true });
    }
  }, []);
  return <>{children}</>;
}
