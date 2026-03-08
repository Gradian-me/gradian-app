'use client';

import React, { useState } from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Button } from '@/components/ui/button';
import {
  BarcodeScannerWrapper,
} from '@/gradian-ui/communication';
import type {
  ScannedBarcode,
  BarcodeFormat,
} from '@/gradian-ui/communication';
import { BarcodeScannerInput } from '@/gradian-ui/form-builder/form-elements';

export default function BarcodeScannerPage() {
  useSetLayoutProps({
    title: 'Barcode Scanner',
    subtitle:
      'Camera-based barcode and QR scanner with single and multi-scan modes, JSON export, and quantity editing.',
    icon: 'ScanBarcode',
  });

  const [singleOpen, setSingleOpen] = useState(false);
  const [singleValue, setSingleValue] = useState<string | null>(null);
  const [singleFormat, setSingleFormat] = useState<string | null>(null);

  const [multiOpen, setMultiOpen] = useState(false);
  const [multiValues, setMultiValues] = useState<ScannedBarcode[]>([]);

  const [restrictedOpen, setRestrictedOpen] = useState(false);
  const [restrictedValues, setRestrictedValues] = useState<ScannedBarcode[]>([]);

  // Demo state for form-based BarcodeScannerInput
  const [inputValues, setInputValues] = useState<ScannedBarcode[] | null>(null);

  const restrictedFormats: BarcodeFormat[] = ['QR'];

  return (
    <div className="space-y-8">
      {/* Single scan demo */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Single scan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scan a single barcode or QR code. The drawer closes automatically after a successful scan.
            </p>
          </div>
          <Button onClick={() => setSingleOpen(true)}>
            Open single scanner
          </Button>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="font-medium mb-1">Last result</div>
          {singleValue ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 space-y-1">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {singleFormat}
              </div>
              <div className="font-mono break-all text-xs" dir="auto">
                {singleValue}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Nothing scanned yet.
            </div>
          )}
        </div>
      </section>

      {/* Multi scan demo */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Multi-scan with counts & JSON
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scan multiple barcodes, adjust quantities per item, and export the result as JSON.
            </p>
          </div>
          <Button onClick={() => setMultiOpen(true)}>
            Open multi-scan
          </Button>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <div className="font-medium">Scanned items</div>
          {multiValues.length === 0 ? (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              No items scanned yet.
            </div>
          ) : (
            <ul className="text-xs space-y-1">
              {multiValues.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="font-mono break-all min-w-0 flex-1" dir="auto">
                    {item.label}
                  </span>
                  {item.count != null && (
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400">
                      × {item.count}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Restricted formats demo */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              QR-only scanner
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scanner restricted to QR codes only using the <code>allowedFormats</code> prop.
            </p>
          </div>
          <Button onClick={() => setRestrictedOpen(true)}>
            Open QR scanner
          </Button>
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <div className="font-medium">Scanned QR codes</div>
          {restrictedValues.length === 0 ? (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              No QR codes scanned yet.
            </div>
          ) : (
            <ul className="text-xs space-y-1">
              {restrictedValues.map((item) => (
                <li key={item.id} className="font-mono break-all" dir="auto">
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Form element demo (BarcodeScannerInput) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Form element: BarcodeScannerInput
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Uses the reusable form element with persistent value. When you reopen the scanner, previously
            scanned items are reloaded via <code>initialBarcodes</code>.
          </p>
        </div>

        <div className="space-y-3">
          <BarcodeScannerInput
            config={{
              name: 'demo-barcode-input',
              label: 'Demo barcode scanner input',
              enableMultipleScan: true,
              enableChangeCount: true,
              enableJSONResult: true,
            }}
            value={inputValues}
            onChange={setInputValues}
          />

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {inputValues && inputValues.length > 0
              ? `Saved items: ${inputValues.length}`
              : 'No saved items yet. Scan some barcodes, close the scanner, then reopen to see them reloaded.'}
          </div>
        </div>
      </section>

      {/* Drawers */}
      <BarcodeScannerWrapper
        open={singleOpen}
        onOpenChange={setSingleOpen}
        allowedFormats={['Code128', 'QR', 'DataMatrix', 'EAN']}
        enableBeep
        enableMultipleScan={false}
        enableChangeCount={false}
        enableMockData
        onScan={(val, fmt) => {
          setSingleValue(val);
          setSingleFormat(fmt);
        }}
        title="Single barcode scanner"
      />

      <BarcodeScannerWrapper
        open={multiOpen}
        onOpenChange={setMultiOpen}
        enableBeep
        enableMultipleScan
        enableChangeCount
        enableJSONResult
        enableMockData
        onMultiScan={(items) => setMultiValues(items)}
        initialBarcodes={multiValues}
        title="Multi-scan with counts"
      />

      <BarcodeScannerWrapper
        open={restrictedOpen}
        onOpenChange={setRestrictedOpen}
        enableBeep
        enableMultipleScan
        allowedFormats={restrictedFormats}
        enableMockData
        onMultiScan={(items) => setRestrictedValues(items)}
        initialBarcodes={restrictedValues}
        title="QR-only scanner"
      />
    </div>
  );
}

