'use client';

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { ScanBarcode } from 'lucide-react';
import { ulid } from 'ulid';
import { Button } from '@/components/ui/button';
import { BarcodeScannerWrapper } from '@/gradian-ui/communication';
import type { ScannedBarcode as BarcodeValue, BarcodeFormat } from '@/gradian-ui/communication';
import { cn, validateField } from '../../../shared/utils';
import { getLabelClasses, errorTextClasses, baseInputClasses } from '../utils/field-styles';
import type { FormElementProps, FormElementRef } from '../types';
import { BadgeRenderer, type BadgeItem } from '../utils/badge-viewer';

export interface BarcodeScannerInputProps
  extends Omit<FormElementProps, 'value' | 'onChange' | 'config'> {
  config: any;
  value?: BarcodeValue[] | null;
  onChange?: (value: BarcodeValue[] | null) => void;
}

const buildSingleBarcode = (raw: string, format: string): BarcodeValue => {
  const now = new Date();
  return {
    id: ulid(),
    label: raw,
    format,
    createdAt: now.toISOString(),
    count: 1,
  };
};

export const BarcodeScannerInput = forwardRef<FormElementRef, BarcodeScannerInputProps>(
  (
    {
      config,
      value,
      onChange,
      onBlur,
      onFocus,
      error,
      disabled = false,
      required = false,
      className,
      ...rest
    },
    ref,
  ) => {
    const [scannerOpen, setScannerOpen] = useState(false);

    const items: BarcodeValue[] = Array.isArray(value) ? value : value ? [value].flat() as any : [];
    const hasValue = items.length > 0;

    const badgeItems: BadgeItem[] = hasValue
      ? items.map((item) => ({
          id: item.id,
          label: item.label ?? item.id,
        }))
      : [];

    const fieldName = (config as any)?.name || 'barcode-scanner';
    const fieldLabel = (config as any)?.label;
    const placeholder =
      (config as any)?.placeholder ||
      'Scan barcodes';

    const allowedFormats = (config as any)?.allowedFormats as BarcodeFormat[] | undefined;
    const enableBeep = (config as any)?.enableBeep ?? true;
    const enableMultipleScan = (config as any)?.enableMultipleScan ?? true;
    const enableJSONResult = (config as any)?.enableJSONResult ?? false;
    const enableChangeCount = (config as any)?.enableChangeCount ?? false;

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (!disabled) {
          setScannerOpen(true);
        }
      },
      blur: () => {
        // no-op: no direct input element focus
      },
      validate: () => {
        if (!config?.validation) return true;
        const result = validateField(items, config.validation);
        return result.isValid;
      },
      reset: () => onChange?.(null),
      getValue: () => value,
      setValue: (next) => onChange?.(next),
    }));

    const handleOpenScanner = () => {
      if (disabled) return;
      setScannerOpen(true);
      onFocus?.();
    };

    const handleCloseScanner = (nextOpen: boolean) => {
      setScannerOpen(nextOpen);
      if (!nextOpen) {
        onBlur?.();
      }
    };

    const handleSingleScan = (raw: string, format: string) => {
      const next = [buildSingleBarcode(raw, format)];
      onChange?.(next);
    };

    const handleMultiScan = (barcodes: BarcodeValue[]) => {
      onChange?.(barcodes);
    };

    const inputClasses = cn(
      baseInputClasses,
      'flex items-center min-h-10 text-xs',
      error
        ? 'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500'
        : '',
      disabled && 'opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900',
      'pr-11',
      className,
    );

    return (
      <div className="w-full" {...rest}>
        {fieldLabel && (
          <label
            htmlFor={fieldName}
            className={getLabelClasses({ error: Boolean(error), required })}
          >
            {fieldLabel}
          </label>
        )}

        <div className="relative">
          <div
            id={fieldName}
            className={inputClasses}
          >
            {hasValue ? (
              <BadgeRenderer
                items={badgeItems}
                maxBadges={4}
                badgeVariant="outline"
                className="flex-1"
              />
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500 select-none">
                {placeholder}
              </span>
            )}
          </div>

          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenScanner}
              disabled={disabled}
              className="h-7 w-7 p-0 hover:bg-violet-100 hover:text-violet-600"
              title="Open barcode scanner"
              aria-label="Open barcode scanner"
              tabIndex={-1}
            >
              <ScanBarcode className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <p className={errorTextClasses} role="alert">
            {error}
          </p>
        )}

        <BarcodeScannerWrapper
          allowedFormats={allowedFormats}
          enableBeep={enableBeep}
          enableMultipleScan={enableMultipleScan}
          enableChangeCount={enableChangeCount}
          enableJSONResult={enableJSONResult}
          open={scannerOpen}
          onOpenChange={handleCloseScanner}
          title={fieldLabel || 'Barcode Scanner'}
          onScan={!enableMultipleScan ? handleSingleScan : undefined}
          onMultiScan={enableMultipleScan ? handleMultiScan : undefined}
          initialBarcodes={enableMultipleScan ? items : undefined}
        />
      </div>
    );
  },
);

BarcodeScannerInput.displayName = 'BarcodeScannerInput';

