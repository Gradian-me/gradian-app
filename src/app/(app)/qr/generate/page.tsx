'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { Textarea } from '@/gradian-ui/form-builder/form-elements/components/Textarea';
import { Select } from '@/gradian-ui/form-builder/form-elements/components/Select';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';

// Dynamically import QRCodeDialog to avoid SSR issues with HTMLCanvasElement
const QRCodeDialog = dynamic(
  () => import('@/gradian-ui/layout/components/QRCodeDialog').then(mod => ({ default: mod.QRCodeDialog })),
  { ssr: false }
);

export default function QRGeneratePage() {
  const [value, setValue] = useState('');
  const [variant, setVariant] = useState('gravity');
  const [colorEyes, setColorEyes] = useState('#7f22fe');
  const [colorBody, setColorBody] = useState('#141414');
  const [size, setSize] = useState('500');
  const [padding, setPadding] = useState('16');
  const [margin, setMargin] = useState('8');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const variantOptions = [
    { id: 'standard', label: 'Standard' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'dots', label: 'Dots' },
    { id: 'circle', label: 'Circle' },
    { id: 'fluid', label: 'Fluid' },
    { id: 'reverse', label: 'Reverse' },
    { id: 'shower', label: 'Shower' },
    { id: 'gravity', label: 'Gravity' },
    { id: 'morse', label: 'Morse' },
    { id: 'italic', label: 'Italic' },
    { id: 'inclined', label: 'Inclined' },
  ];

  const sizeOptions = [
    { id: '200', label: '200px' },
    { id: '250', label: '250px' },
    { id: '300', label: '300px' },
    { id: '400', label: '400px' },
    { id: '500', label: '500px' },
    { id: '600', label: '600px' },
  ];

  const handleGenerate = () => {
    if (value.trim()) {
      setIsDialogOpen(true);
    }
  };

  useSetLayoutProps({
    title: 'QR Code Generator',
    subtitle: 'Generate custom QR codes with various styles and configurations',
    icon: 'QrCode',
  });

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            QR Code Content
          </h2>
          <Textarea
            config={{
              name: 'qr-value',
              label: 'Enter text or URL',
              placeholder: 'Enter the content for your QR code (text, URL, etc.)',
            }}
            value={value}
            onChange={(newValue) => setValue(newValue)}
            rows={4}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            QR Code Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              config={{
                name: 'variant',
                label: 'Variant',
              }}
              options={variantOptions}
              value={variant}
              onValueChange={(newValue) => setVariant(newValue)}
            />

            <Select
              config={{
                name: 'size',
                label: 'Size',
              }}
              options={sizeOptions}
              value={size}
              onValueChange={(newValue) => setSize(newValue)}
            />

            <div>
              <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Eye Color
              </label>
              <input
                type="color"
                value={colorEyes}
                onChange={(e) => setColorEyes(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Body Color
              </label>
              <input
                type="color"
                value={colorBody}
                onChange={(e) => setColorBody(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Padding
              </label>
              <input
                type="number"
                value={padding}
                onChange={(e) => setPadding(e.target.value)}
                min="0"
                max="50"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Margin
              </label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                min="0"
                max="50"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={!value.trim()}
            size="lg"
            className="px-8"
          >
            <QrCode className="h-5 w-5 me-2" />
            Generate QR Code
          </Button>
        </div>

        <QRCodeDialog
          value={value}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          showGoToUrl={true}
          qrConfig={{
            variant: {
              eyes: variant as any,
              body: variant as any,
            },
            color: {
              eyes: colorEyes,
              body: colorBody,
            },
            size: parseInt(size),
            padding: parseInt(padding),
            margin: parseInt(margin),
          }}
        />
      </div>
  );
}

