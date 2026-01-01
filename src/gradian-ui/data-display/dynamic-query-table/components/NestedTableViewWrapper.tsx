'use client';

import React, { useState, useCallback } from 'react';
import { NestedTableViewWrapperProps } from '../types';
import { NestedTableView } from './NestedTableView';

export function NestedTableViewWrapper({ 
  data, 
  schema, 
  schemas, 
  depth = 0, 
  highlightQuery, 
  showFlattenSwitch, 
  flatten, 
  onFlattenChange,
  expandAllTrigger: externalExpandAllTrigger,
  onExpandAllReady,
  showIds,
  flattenedSchemas,
}: NestedTableViewWrapperProps) {
  const [internalExpandAllTrigger, setInternalExpandAllTrigger] = useState(0);
  
  // Use external trigger if provided, otherwise use internal state
  const expandAllTrigger = externalExpandAllTrigger !== undefined ? externalExpandAllTrigger : internalExpandAllTrigger;

  const expandAll = useCallback(() => {
    setInternalExpandAllTrigger((prev) => prev + 1);
  }, []);

  const collapseAll = useCallback(() => {
    setInternalExpandAllTrigger(0);
  }, []);

  // Expose expand/collapse functions to parent
  React.useEffect(() => {
    if (onExpandAllReady) {
      onExpandAllReady(expandAll, collapseAll);
    }
  }, [onExpandAllReady, expandAll, collapseAll]);

  return (
    <NestedTableView
      data={data}
      schema={schema}
      schemas={schemas}
      depth={depth}
      highlightQuery={highlightQuery}
      expandAllTrigger={expandAllTrigger}
      onExpandAll={expandAll}
      onCollapseAll={collapseAll}
      showFlattenSwitch={showFlattenSwitch}
      flatten={flatten}
      onFlattenChange={onFlattenChange}
      showIds={showIds}
      flattenedSchemas={flattenedSchemas}
    />
  );
}

