/**
 * Professional Writing Modal Component
 * Modal for enhancing text with professional writing AI
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { useProfessionalWriting } from '../hooks/useProfessionalWriting';
import type { WritingStyle } from '../types';
import { SUPPORTED_LANGUAGES as LANGUAGES } from '../types';
import { Loader2, Sparkles, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfessionalWritingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
  onApply: (enhancedText: string) => void;
}

export function ProfessionalWritingModal({
  isOpen,
  onOpenChange,
  initialText,
  onApply,
}: ProfessionalWritingModalProps) {
  const [inputText, setInputText] = useState(initialText);
  const [writingStyle, setWritingStyle] = useState<WritingStyle>('professional');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  
  const {
    enhancedText,
    tokenUsage,
    isLoading,
    error,
    generateEnhancedText,
    stopGeneration,
    clearResponse,
    clearError,
  } = useProfessionalWriting();

  // Update input text when initialText changes
  useEffect(() => {
    if (isOpen) {
      setInputText(initialText);
      clearResponse();
      clearError();
    }
  }, [initialText, isOpen, clearResponse, clearError]);

  const handleGenerate = () => {
    generateEnhancedText({
      text: inputText,
      style: writingStyle,
      targetLanguage: writingStyle === 'translate' ? targetLanguage : undefined,
    });
  };

  const handleApply = () => {
    if (enhancedText) {
      onApply(enhancedText);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    clearResponse();
    clearError();
  };

  // Prepare metrics for MetricCard
  const metrics = tokenUsage?.pricing
    ? [
        {
          id: 'tokens',
          label: 'Tokens',
          value: tokenUsage.total_tokens,
          format: 'number' as const,
          icon: 'Hash',
          iconColor: 'violet' as const,
        },
        {
          id: 'cost',
          label: 'Cost',
          value: tokenUsage.pricing.total_cost,
          format: 'currency' as const,
          precision: 6,
          icon: 'DollarSign',
          iconColor: 'green' as const,
        },
      ]
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full lg:max-w-3xl lg:max-h-[90vh] flex flex-col rounded-2xl p-0 [&>button]:z-20">
        <DialogHeader className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Professional Writing Assistant
          </DialogTitle>
          <DialogDescription>
            Enhance your text with professional tone, grammar correction, or translation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 px-6 overflow-y-auto flex-1 min-h-0">
          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Writing Style
            </label>
            <Select
              value={writingStyle}
              onValueChange={(value) => {
                setWritingStyle(value as WritingStyle);
                if (value !== 'translate') {
                  setTargetLanguage('');
                }
                clearResponse();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="translate">Translate</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language Selector (conditional) */}
          {writingStyle === 'translate' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Target Language
              </label>
              <Select
                value={targetLanguage}
                onValueChange={(value) => {
                  setTargetLanguage(value);
                  clearResponse();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Input Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Input Text
            </label>
            <Textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                clearResponse();
              }}
              placeholder="Enter text to enhance..."
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!inputText.trim() || isLoading || (writingStyle === 'translate' && !targetLanguage)}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Enhanced Text
              </>
            )}
          </Button>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Output Textarea */}
          {enhancedText && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enhanced Text
              </label>
              <div className="relative">
                <Textarea
                  value={enhancedText}
                  readOnly
                  rows={6}
                  className={cn(
                    "direction-auto resize-none bg-gray-50 dark:bg-gray-800 pr-20"
                  )}
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInputText(enhancedText);
                      clearResponse();
                    }}
                    className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900 dark:hover:text-violet-400"
                    title="Replace input text with enhanced text"
                    aria-label="Replace input text"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <CopyContent content={enhancedText} />
                </div>
              </div>
            </div>
          )}

          {/* MetricCard for Token Usage */}
          {tokenUsage && metrics.length > 0 && (
            <div className="mt-4">
              <MetricCard
                metrics={metrics}
                gradient="violet"
                layout="grid"
                columns={2}
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 mt-auto">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!enhancedText || isLoading}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

