// QRCodeCanvas Component
// QR Code generator component using react-qrcode-pretty

import React from 'react';
import { QrcodeCanvas, useQrcodeDownload } from 'react-qrcode-pretty';
import { cn } from '../../../shared/utils';

// Default values with proper types
const DEFAULT_COLOR = {
  eyes: '#7f22fe',
  body: '#141414'
};

const DEFAULT_COLOR_EFFECT = {
  eyes: 'none',
  body: 'none'
} as { eyes: 'none'; body: 'none' };

const DEFAULT_VARIANT = {
  eyes: 'gravity',
  body: 'gravity'
} as { eyes: 'gravity'; body: 'gravity' };

export interface QRCodeCanvasProps {
  value: string;
  size?: number;
  color?: string | { eyes: string; body: string };
  colorEffect?: 'gradient-dark-vertical' | 'gradient-dark-horizontal' | 'gradient-dark-diagonal' | 'gradient-light-vertical' | 'gradient-light-horizontal' | 'gradient-light-diagonal' | 'colored' | 'shades' | 'none' | { eyes: string; body: string };
  mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji';
  level?: 'L' | 'M' | 'Q' | 'H';
  modules?: number;
  image?: string | { src: string; width?: number; height?: number; positionX?: number; positionY?: number; overlap?: boolean };
  margin?: number;
  padding?: number;
  variant?: 'standard' | 'rounded' | 'dots' | 'circle' | 'fluid' | 'reverse' | 'shower' | 'gravity' | 'morse' | 'italic' | 'inclined' | { eyes: string; body: string };
  divider?: boolean;
  bgColor?: string;
  bgRounded?: boolean;
  className?: string;
  showDownloadButton?: boolean;
  downloadFileName?: string;
  onReady?: (element: HTMLCanvasElement) => void;
}

export const QRCodeCanvas: React.FC<QRCodeCanvasProps> = ({
  value,
  size = 400,
  color = DEFAULT_COLOR,
  colorEffect = DEFAULT_COLOR_EFFECT,
  mode = 'Byte',
  level = 'M',
  modules,
  image,
  margin = 8,
  padding = 16,
  variant = DEFAULT_VARIANT,
  divider = false,
  bgColor = '#ffffff',
  bgRounded = true,
  className,
  showDownloadButton = false,
  downloadFileName = 'qrcode',
  onReady,
}) => {
  // Always call the hook (React hooks rules), but only use it if showDownloadButton is true
  const [setQrcode, download, isReady] = useQrcodeDownload();

  const handleReady = (element: HTMLCanvasElement) => {
    if (showDownloadButton) {
      setQrcode(element);
    }
    onReady?.(element);
  };

  return (
    <div className={cn('flex flex-col items-center gap-4 w-full', className)}>
      <div className="w-full max-w-[400px]">
        <div className="w-full qr-canvas-container">
          <QrcodeCanvas
            value={value}
            size={size}
            color={color as any}
            colorEffect={colorEffect as any}
            mode={mode}
            level={level}
            modules={modules as any}
            image={image}
            margin={margin}
            padding={padding}
            variant={variant as any}
            divider={divider}
            bgColor={bgColor}
            bgRounded={bgRounded}
            onReady={handleReady}
          />
          <style jsx global>{`
            .qr-canvas-container canvas {
              max-width: 100% !important;
              height: auto !important;
            }
          `}</style>
        </div>
      </div>
      {showDownloadButton && download && (
        <button
          onClick={() => download(downloadFileName)}
          disabled={!isReady}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Download QR Code
        </button>
      )}
    </div>
  );
};

QRCodeCanvas.displayName = 'QRCodeCanvas';

