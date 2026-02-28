'use client';

import React, { useState } from 'react';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { SignaturePad, type SignaturePadValue } from '@/gradian-ui/form-builder/form-elements';
import { Button } from '@/components/ui/button';

export default function SignaturePadPage() {
  useSetLayoutProps({
    title: 'Signature Pad',
    subtitle: 'Canvas signature capture with lock, undo/redo, color, eraser, background, shapes, annotations, and PNG export',
    icon: 'PenLine',
  });

  const [value, setValue] = useState<string | null>(null);
  const [valueMinimal, setValueMinimal] = useState<string | null>(null);
  const [valueFullDemo, setValueFullDemo] = useState<string | SignaturePadValue | null>(null);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Full options
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Lock, undo/redo, color picker, eraser, and export PNG enabled.
        </p>
        <SignaturePad
          config={{
            name: 'signature-full',
            label: 'Sign here',
            enableLock: true,
            enableExportPng: true,
            enableChangeColor: true,
            enableEraser: true,
            enableRawData: true,
          }}
          value={value}
          onChange={(v) => setValue(v == null || typeof v === 'string' ? v : null)}
          enableLock
          enableExportPng
          enableChangeColor
          enableEraser
        />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Value:
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {value ? `PNG data URL (${value.length} chars)` : 'Empty'}
          </span>
          {value && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setValue(null)}
              className="ml-2"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Minimal (no toolbar options)
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Default signature pad; value still captured.
        </p>
        <SignaturePad
          config={{
            name: 'signature-minimal',
            label: 'Signature',
          }}
          value={valueMinimal}
          onChange={(v) => setValueMinimal(v == null || typeof v === 'string' ? v : null)}
        />
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
          {valueMinimal ? 'Has signature' : 'Empty'}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Full demo: background, annotations, shapes
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Background image (resize to 1920px), annotations list, shapes (circle, square, rectangle, triangle, hexagon, octagon) with select, move, color, and annotations bound to shapes. More height for testing.
        </p>
        <div className="min-h-[520px]">
          <SignaturePad
            config={{
              name: 'signature-full-demo',
              label: 'Sign here',
              enableLock: true,
              enableExportPng: true,
              enableChangeColor: true,
              enableEraser: true,
              enableBackgroundImage: true,
              enableAnnotations: true,
              enableShapes: true,
              exportWithBackground: true,
            }}
            value={valueFullDemo}
            onChange={setValueFullDemo}
            enableLock
            enableExportPng
            enableChangeColor
            enableEraser
            enableBackgroundImage
            enableAnnotations
            enableShapes
            exportWithBackground
          />
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Value:</span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {valueFullDemo == null
              ? 'Empty'
              : typeof valueFullDemo === 'string'
                ? `PNG (${valueFullDemo.length} chars)`
                : `Extended (signature: ${valueFullDemo.signatureDataUrl ? 'yes' : 'no'}, bg: ${valueFullDemo.backgroundDataUrl ? 'yes' : 'no'}, shapes: ${valueFullDemo.shapes?.length ?? 0}, annotations: ${valueFullDemo.annotations?.length ?? 0})`}
          </span>
          {valueFullDemo != null && (
            <Button variant="outline" size="sm" onClick={() => setValueFullDemo(null)} className="ml-2">
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
