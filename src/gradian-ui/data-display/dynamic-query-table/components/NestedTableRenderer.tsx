'use client';

import React from 'react';
import { NestedTableRendererProps, Schema } from '../types';
import { NestedTableViewWrapper } from './NestedTableViewWrapper';

export function NestedTableRenderer({ data, schemas, showFlattenSwitch, flatten, onFlattenChange, highlightQuery, expandAllTrigger, onExpandAllReady, showIds, flattenedSchemas, dynamicQueryActions, dynamicQueryId, onEditEntity }: NestedTableRendererProps) {
  // New structure: { schema: string, data: array, schemas: array }
  const rootSchemaId = data.schema;
  const rootData = Array.isArray(data.data) ? data.data : [];

  if (!rootSchemaId || rootData.length === 0) {
    return <div className="text-gray-500 dark:text-gray-400 p-4">No data available</div>;
  }

  const rootSchema = schemas?.find((s) => s.id === rootSchemaId || s.id === rootSchemaId.replace(/-/g, ''));

  if (!rootSchema) {
    return <div className="text-gray-500 dark:text-gray-400 p-4">Schema not found for {rootSchemaId}</div>;
  }

  return (
    <div className="w-full">
      <NestedTableViewWrapper 
        data={rootData} 
        schema={rootSchema} 
        schemas={schemas || []} 
        depth={0}
        highlightQuery={highlightQuery}
        showFlattenSwitch={showFlattenSwitch}
        flatten={flatten}
        onFlattenChange={onFlattenChange}
        expandAllTrigger={expandAllTrigger}
        onExpandAllReady={onExpandAllReady}
        showIds={showIds}
        flattenedSchemas={flattenedSchemas}
        dynamicQueryActions={dynamicQueryActions}
        dynamicQueryId={dynamicQueryId}
        onEditEntity={onEditEntity}
      />
    </div>
  );
}

