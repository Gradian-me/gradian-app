'use client';

import React from 'react';
import { DynamicQueryTableProps } from '../types';
import { DynamicQueryTable } from './DynamicQueryTable';

export interface DynamicQueryTableWrapperProps extends DynamicQueryTableProps {
  className?: string;
}

/**
 * Wrapper component for DynamicQueryTable
 * Similar to TableWrapper, provides a consistent interface for using the dynamic query table
 */
export function DynamicQueryTableWrapper(props: DynamicQueryTableWrapperProps) {
  return (
    <div className={props.className}>
      <DynamicQueryTable {...props} />
    </div>
  );
}

DynamicQueryTableWrapper.displayName = 'DynamicQueryTableWrapper';

