// Table Loading State Component

import React from 'react';
import { LoadingSpinner } from '@/gradian-ui/layout/components';

export function TableLoadingState() {
  return (
    <LoadingSpinner centered containerClassName="py-12" />
  );
}

TableLoadingState.displayName = 'TableLoadingState';

