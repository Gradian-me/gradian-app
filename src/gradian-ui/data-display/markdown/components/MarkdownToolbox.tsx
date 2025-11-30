'use client';

import React from 'react';
import { Toggle } from '@/gradian-ui/form-builder/form-elements/components/Toggle';

export interface MarkdownToolboxProps {
  showRaw: boolean;
  onToggleRaw: (value: boolean) => void;
}

export function MarkdownToolbox({ showRaw, onToggleRaw }: MarkdownToolboxProps) {
  return (
    <div className="flex items-center justify-end mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
        <Toggle
          config={{
            name: 'markdown-view-toggle',
            label: '',
            onIcon: 'FileCode',
            offIcon: 'Eye',
          }}
          value={showRaw}
          onChange={onToggleRaw}
          onLabel="Raw"
          offLabel="Preview"
        />
      </div>
    </div>
  );
}

MarkdownToolbox.displayName = 'MarkdownToolbox';

