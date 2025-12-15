'use client';

import React, { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Eye, FileCode, FileDown, Loader2, Pencil, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { cn } from '@/lib/utils';
import { loggingCustom } from '@/gradian-ui/shared/utils/logging-custom';
import { LogType } from '@/gradian-ui/shared/constants/application-variables';

export interface MarkdownToolboxProps {
  viewMode: 'editor' | 'preview' | 'raw';
  onViewModeChange: (value: 'editor' | 'preview' | 'raw') => void;
  onExportPdf?: () => Promise<void>;
  showPdfExport?: boolean;
  showEditor?: boolean;
  aiAgentId?: string;
  onAiAgentClick?: () => void;
  hasContent?: boolean;
}

export function MarkdownToolbox({ 
  viewMode, 
  onViewModeChange,
  onExportPdf,
  showPdfExport = true,
  showEditor = false,
  aiAgentId,
  onAiAgentClick,
  hasContent = false
}: MarkdownToolboxProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!onExportPdf) return;
    
    setIsExporting(true);
    try {
      await onExportPdf();
      toast.success('PDF exported successfully');
    } catch (error) {
      loggingCustom(LogType.CLIENT_LOG, 'error', `PDF export error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {aiAgentId && hasContent && onAiAgentClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAiAgentClick}
            className={cn(
              "gap-2",
              "border-violet-200/70 bg-white/80 text-violet-600",
              "hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700",
              "dark:border-violet-500/50 dark:bg-gray-900/80 dark:text-violet-200 dark:hover:bg-violet-500/10"
            )}
          >
            <IconRenderer iconName="Sparkles" className="h-4 w-4" />
            <span>Enhance with AI</span>
          </Button>
        )}
        {showPdfExport && onExportPdf && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting || viewMode === 'raw' || viewMode === 'editor'}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span>Export PDF</span>
              </>
            )}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value === 'editor' || value === 'preview' || value === 'raw') {
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
          {showEditor && (
            <ToggleGroupItem 
              value="editor" 
              aria-label="Editor" 
              className="gap-2 rounded-none border-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 data-[state=on]:bg-violet-200 dark:data-[state=on]:bg-violet-900 data-[state=on]:text-violet-800 dark:data-[state=on]:text-violet-200"
            >
              <Pencil className="h-4 w-4" />
              <span>Editor</span>
            </ToggleGroupItem>
          )}
          <ToggleGroupItem 
            value="raw" 
            aria-label="Raw" 
            className={`gap-2 ${showEditor ? 'rounded-r-md rounded-l-none' : 'rounded-r-md rounded-l-none'} border-0 bg-white dark:bg-gray-800 data-[state=on]:bg-violet-200 dark:data-[state=on]:bg-violet-900 data-[state=on]:text-violet-800 dark:data-[state=on]:text-violet-200`}
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

