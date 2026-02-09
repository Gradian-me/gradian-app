/**
 * TranslationDialog – separate component for editing per-language values.
 * Used by TextInput and Textarea when allowTranslation is true.
 * Grid: Language (from SUPPORTED_LOCALES) | Value (text input or textarea).
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SUPPORTED_LOCALES } from '@/gradian-ui/shared/utils/date-utils';
import {
  getDefaultLanguage,
  translationArrayToRecord,
  recordToTranslationArray,
  isTranslationArray,
  getT,
} from '@/gradian-ui/shared/utils/translation-utils';
import { useLanguageStore } from '@/stores/language.store';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { Languages } from 'lucide-react';
import { baseInputClasses } from '../utils/field-styles';
import { cn } from '@/gradian-ui/shared/utils';

export type TranslationValue = string | Array<Record<string, string>>;

export interface TranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: TranslationValue;
  onChange?: (value: Array<Record<string, string>>) => void;
  isTextarea?: boolean;
  title?: string;
  defaultLanguage?: string;
  /** When true, show read-only grid and only a Close button (e.g. for table view). */
  viewMode?: boolean;
}

export function TranslationDialog({
  open,
  onOpenChange,
  value,
  onChange,
  isTextarea = false,
  title,
  defaultLanguage,
  viewMode = false,
}: TranslationDialogProps) {
  const language = useLanguageStore((s) => s.language) || getDefaultLanguage();
  const defaultLang = defaultLanguage ?? getDefaultLanguage();

  const [record, setRecord] = useState<Record<string, string>>({});

  const initRecord = useCallback(() => {
    if (typeof value === 'string') {
      const lang = defaultLang || 'en';
      const next: Record<string, string> = {};
      SUPPORTED_LOCALES.forEach(({ code }) => {
        next[code] = code === lang && value.trim() ? value : '';
      });
      setRecord(next);
    } else if (isTranslationArray(value)) {
      const flat = translationArrayToRecord(value);
      const next: Record<string, string> = {};
      SUPPORTED_LOCALES.forEach(({ code }) => {
        next[code] = flat[code] ?? '';
      });
      setRecord(next);
    } else {
      const next: Record<string, string> = {};
      SUPPORTED_LOCALES.forEach(({ code }) => {
        next[code] = '';
      });
      setRecord(next);
    }
  }, [value, defaultLang]);

  useEffect(() => {
    if (open) initRecord();
  }, [open, initRecord]);

  const handleLangChange = (code: string, text: string) => {
    setRecord((prev) => ({ ...prev, [code]: text }));
  };

  const handleSave = () => {
    if (!onChange) return;
    const arr = recordToTranslationArray(record);
    onChange(arr);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const saveLabel = getT(TRANSLATION_KEYS.BUTTON_SAVE, language, defaultLang);
  const cancelLabel = getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang);
  const closeLabel = getT(TRANSLATION_KEYS.BUTTON_CLOSE, language, defaultLang);
  const labelLanguage = getT(TRANSLATION_KEYS.LABEL_LANGUAGE, language, defaultLang);
  const labelValue = getT(TRANSLATION_KEYS.LABEL_VALUE, language, defaultLang);
  const titleTranslations = getT(TRANSLATION_KEYS.TITLE_TRANSLATIONS, language, defaultLang);

  const inputClasses = cn(
    baseInputClasses,
    isTextarea ? 'min-h-[80px] resize-y' : 'min-h-10'
  );

  // In view mode only show languages that have a value
  const localesToShow = viewMode
    ? SUPPORTED_LOCALES.filter(({ code }) => (record[code] ?? '').trim() !== '')
    : SUPPORTED_LOCALES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full h-full lg:max-w-2xl lg:max-h-[65vh] lg:h-auto  flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400" />
            <span>{title ?? titleTranslations}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="grid gap-0" style={{ gridTemplateColumns: 'auto 1fr' }}>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 px-1 pb-2 border-b border-gray-200 dark:border-gray-700 text-center">{labelLanguage}</div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 px-1 pb-2 border-b border-gray-200 dark:border-gray-700 text-center">{labelValue}</div>
            {localesToShow.map(({ code, label }) => (
              <React.Fragment key={code}>
                <label
                  className={cn(
                    'text-xs text-gray-700 dark:text-gray-300 p-2 flex items-center',
                    viewMode && 'border-t border-gray-200 dark:border-gray-700'
                  )}
                >
                  {label}
                </label>
                {viewMode ? (
                  <div
                    className={cn(
                      'min-h-10 p-2 text-xs text-gray-900 dark:text-gray-100 bg-transparent border-t border-gray-200 dark:border-gray-700',
                      isTextarea && 'min-h-[80px] whitespace-pre-wrap'
                    )}
                    dir="auto"
                  >
                    {(record[code] ?? '').trim()}
                  </div>
                ) : isTextarea ? (
                  <div className="p-1">
                    <textarea
                      className={inputClasses}
                      value={record[code] ?? ''}
                      onChange={(e) => handleLangChange(code, e.target.value)}
                      rows={3}
                    />
                  </div>
                ) : (
                  <div className="p-1">
                    <input
                      type="text"
                      className={inputClasses}
                      value={record[code] ?? ''}
                      onChange={(e) => handleLangChange(code, e.target.value)}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>
            {viewMode ? closeLabel : cancelLabel}
          </Button>
          {!viewMode && <Button onClick={handleSave}>{saveLabel}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

TranslationDialog.displayName = 'TranslationDialog';
