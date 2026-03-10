/**
 * Professional Writing Modal Component
 * Modal for enhancing text with professional writing AI
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Textarea } from '@/gradian-ui/form-builder/form-elements/components/Textarea';
import { LanguageSelector } from '@/gradian-ui/form-builder/form-elements/components/LanguageSelector';
import { MarkdownViewer } from '@/gradian-ui/data-display/markdown/components/MarkdownViewer';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card';
import { useProfessionalWriting } from '../hooks/useProfessionalWriting';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import type { WritingStyle } from '../types';
import { Loader2, Sparkles, ArrowUp, Maximize2, Minimize2, Square } from 'lucide-react';

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
  const [writingStyle, setWritingStyle] = useState<WritingStyle>('extended');
  const [isMaximized, setIsMaximized] = useState(false);
  const [customStyle, setCustomStyle] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const enhancedTextContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Keep the dialog body pinned near the bottom while streaming,
  // but only if the user hasn't scrolled up (i.e. they're near the bottom).
  useEffect(() => {
    if (!isLoading) return;

    const body = modalBodyRef.current;
    if (!body) return;
    const distanceFromBottom =
      body.scrollHeight - body.clientHeight - body.scrollTop;
    if (distanceFromBottom < 80) {
      body.scrollTop = body.scrollHeight;
    }
  }, [enhancedText, isLoading]);

  // When enhanced text first appears (or is regenerated), scroll the dialog body to bottom once.
  useEffect(() => {
    if (!enhancedText) return;
    const body = modalBodyRef.current;
    if (!body) return;
    body.scrollTop = body.scrollHeight;
  }, [enhancedText]);

  const handleGenerate = () => {
    generateEnhancedText({
      text: inputText,
      style: writingStyle,
      targetLanguage: writingStyle === 'translate' ? targetLanguage : undefined,
      // For custom style, the hook will treat text as already including style instructions,
      // so we just pass the text through and let the request.style === 'custom' branch handle it.
      customStyle,
    } as any);
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
          iconColor: 'cyan' as const,
        },
        {
          id: 'cost',
          label: 'Cost',
          value: tokenUsage.pricing.total_cost,
          format: 'currency' as const,
          precision: 6,
          icon: 'DollarSign',
          iconColor: 'pink' as const,
        },
      ]
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          (isMaximized
            ? 'w-[96vw] max-w-[96vw]'
            : 'w-[80vw] max-w-2xl sm:max-w-3xl') +
          ' bg-gray-200 dark:bg-gray-800 p-2 overflow-hidden max-h-[90vh] flex flex-col z-[120]'
        }
        overlayClassName="z-[115]"
      >
        <DialogHeader className="p-2 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Professional Writing Assistant
              </DialogTitle>
              <DialogDescription>
                Enhance your text with professional tone, grammar correction, or translation
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMaximized((prev) => !prev)}
              aria-label={isMaximized ? 'Restore dialog size' : 'Maximize dialog'}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div
          ref={modalBodyRef}
          className="flex flex-col items-center space-y-6 px-6 pb-6 overflow-y-auto flex-1 min-h-0"
        >
          {/* Style Selector */}
          <div className="w-full">
            <Select
              config={{
                name: 'writing-style',
                label: 'Writing Style',
              }}
              value={writingStyle}
              onValueChange={(value) => {
                setWritingStyle(value as WritingStyle);
                if (value !== 'translate') {
                  setTargetLanguage('');
                }
                if (value !== 'custom') {
                  setCustomStyle('');
                }
                clearResponse();
              }}
              options={[
                { id: 'extended', value: 'extended', label: 'Extended' },
                { id: 'professional', value: 'professional', label: 'Professional' },
                { id: 'casual', value: 'casual', label: 'Casual' },
                { id: 'translate', value: 'translate', label: 'Translate' },
                { id: 'summarizer', value: 'summarizer', label: 'Summarizer' },
                { id: 'solution-advisor', value: 'solution-advisor', label: 'Solution Advisor' },
                { id: 'email-writer', value: 'email-writer', label: 'Email Writer' },
                { id: 'custom', value: 'custom', label: 'Custom' },
              ]}
            />
          </div>

          {/* Language Selector (conditional) */}
          {writingStyle === 'translate' && (
            <div className="w-full">
              <LanguageSelector
                config={{
                  name: 'target-language',
                  label: 'Target Language',
                  placeholder: 'Select a language',
                }}
                value={targetLanguage || 'fa'}
                onChange={(value) => {
                  setTargetLanguage(value);
                  clearResponse();
                }}
              />
            </div>
          )}

          {/* Custom style description (conditional) */}
          {writingStyle === 'custom' && (
            <div className="w-full">
              <Textarea
                config={{
                  name: 'custom-style',
                  label: 'Custom style instructions',
                  placeholder:
                    'Describe the exact writing style you want (tone, length, structure, audience, etc.)...',
                }}
                value={customStyle}
                onChange={(value) => {
                  setCustomStyle(value);
                  clearResponse();
                }}
                rows={2}
                resize="none"
              />
            </div>
          )}

          {/* Input Textarea */}
          <div className="w-full">
            <Textarea
              config={{
                name: 'input-text',
                label: 'Input Text',
                placeholder: writingStyle === 'solution-advisor' 
                  ? 'Enter your question or problem to get comprehensive solutions with best practices...'
                  : 'Enter text to enhance...',
              }}
              value={inputText}
              onChange={(value) => {
                setInputText(value);
                clearResponse();
              }}
              rows={8}
              resize="none"
              canCopy={true}
            />
          </div>

          {/* Generate / Stop Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleGenerate}
              disabled={
                !inputText.trim() ||
                isLoading ||
                (writingStyle === 'translate' && !targetLanguage)
              }
              className="w-full sm:flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="me-2 h-4 w-4" />
                  Generate Enhanced Text
                </>
              )}
            </Button>
            {isLoading && (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={stopGeneration}
              >
                <Square className="me-2 h-4 w-4" />
                Stop
              </Button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Output MarkdownViewer */}
          {enhancedText && (
            <div className="w-full space-y-2">
              <div className="w-full">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <label className="block text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    Enhanced Text
                    <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                      Powered By Gradian AI
                    </span>
                  </label>
                  <div className="flex items-center gap-1">
                    <CopyContent content={enhancedText} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInputText(enhancedText);
                        clearResponse();
                      }}
                      className="h-7 px-2 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900 dark:hover:text-violet-200"
                      title="Replace input text with enhanced text"
                      aria-label="Replace input text"
                    >
                      <ArrowUp className="h-3.5 w-3.5 me-1" />
                      Replace
                    </Button>
                  </div>
                </div>
                <div
                  ref={enhancedTextContainerRef}
                  className="w-full rounded-xl border border-violet-100/70 dark:border-violet-500/40 bg-gradient-to-br from-white via-violet-50/60 to-indigo-50/60 dark:from-gray-900 dark:via-violet-950/40 dark:to-slate-900/60 p-4 overflow-x-hidden shadow-sm"
                >
                  <MarkdownViewer
                    content={enhancedText}
                    showToggle={false}
                    isEditable={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* MetricCard for Token Usage */}
          {tokenUsage && metrics.length > 0 && (
            <div className="w-full mt-4">
              <MetricCard
                metrics={metrics}
                gradient="indigo"
                layout="grid"
                columns={2}
              />
            </div>
          )}

        </div>

        <DialogFooter className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-2 mt-auto">
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

