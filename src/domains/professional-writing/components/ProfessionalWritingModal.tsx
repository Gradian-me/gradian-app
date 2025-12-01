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
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Textarea } from '@/gradian-ui/form-builder/form-elements/components/Textarea';
import { LanguageSelector } from '@/gradian-ui/form-builder/form-elements/components/LanguageSelector';
import { MetricCard } from '@/gradian-ui/analytics/indicators/metric-card';
import { useProfessionalWriting } from '../hooks/useProfessionalWriting';
import type { WritingStyle } from '../types';
import { Loader2, Sparkles, ArrowUp } from 'lucide-react';

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
      <DialogContent className="w-[80vw] max-w-2xl sm:max-w-3xl p-2 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Professional Writing Assistant
          </DialogTitle>
          <DialogDescription>
            Enhance your text with professional tone, grammar correction, or translation
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 px-6 pb-6 overflow-y-auto flex-1 min-h-0">
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
                clearResponse();
              }}
              options={[
                { id: 'professional', value: 'professional', label: 'Professional' },
                { id: 'casual', value: 'casual', label: 'Casual' },
                { id: 'translate', value: 'translate', label: 'Translate' },
                { id: 'extended', value: 'extended', label: 'Extended' },
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
                value={targetLanguage}
                onChange={(value) => {
                  setTargetLanguage(value);
                  clearResponse();
                }}
              />
            </div>
          )}

          {/* Input Textarea */}
          <div className="w-full">
            <Textarea
              config={{
                name: 'input-text',
                label: 'Input Text',
                placeholder: 'Enter text to enhance...',
              }}
              value={inputText}
              onChange={(value) => {
                setInputText(value);
                clearResponse();
              }}
              rows={6}
              resize="none"
              canCopy={true}
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
            <div className="w-full p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Output Textarea */}
          {enhancedText && (
            <div className="w-full space-y-2">
              <Textarea
                config={{
                  name: 'enhanced-text',
                  label: 'Enhanced Text',
                }}
                value={enhancedText}
                onChange={() => {}}
                rows={6}
                resize="none"
                canCopy={true}
                disabled={true}
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInputText(enhancedText);
                    clearResponse();
                  }}
                  className="h-8 px-3 hover:bg-violet-100 hover:text-violet-600 dark:hover:bg-violet-900 dark:hover:text-violet-400"
                  title="Replace input text with enhanced text"
                  aria-label="Replace input text"
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Replace Input Text
                </Button>
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

        <DialogFooter className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-2 mt-auto">
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

