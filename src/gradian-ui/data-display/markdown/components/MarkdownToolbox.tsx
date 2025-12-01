'use client';

import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Eye, FileCode } from 'lucide-react';

export interface MarkdownToolboxProps {
  viewMode: 'preview' | 'raw';
  onViewModeChange: (value: 'preview' | 'raw') => void;
}

export function MarkdownToolbox({ viewMode, onViewModeChange }: MarkdownToolboxProps) {
  return (
    <div className="flex items-center justify-end mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value === 'preview' || value === 'raw') {
              onViewModeChange(value);
            }
          }}
          className="inline-flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 p-0.5 gap-0"
        >
          <ToggleGroupItem 
            value="preview" 
            aria-label="Preview" 
            className="gap-2 rounded-l-md rounded-r-none border-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 data-[state=on]:bg-violet-200 dark:data-[state=on]:bg-violet-900 data-[state=on]:text-violet-800 dark:data-[state=on]:text-violet-200"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="raw" 
            aria-label="Raw" 
            className="gap-2 rounded-r-md rounded-l-none border-0 bg-white dark:bg-gray-800 data-[state=on]:bg-violet-200 dark:data-[state=on]:bg-violet-900 data-[state=on]:text-violet-800 dark:data-[state=on]:text-violet-200"
          >
            <FileCode className="h-4 w-4" />
            <span>Raw</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

MarkdownToolbox.displayName = 'MarkdownToolbox';

