'use client';

import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import type { ColorFormat } from 'react-countdown-circle-timer';
import { cn } from '@/lib/utils';

type HexColor = `#${string}`;
type ColorArray = [HexColor, HexColor, ...HexColor[]];

type CountdownColorProps =
  | { colors: ColorFormat; colorsTime?: never }
  | { colors: ColorArray; colorsTime: [number, number, ...number[]] };

// Tailwind color name to hex mapping (using 500 shade as default)
const TAILWIND_COLOR_MAP = {
  blue: '#3B82F6',
  red: '#EF4444',
  violet: '#8B5CF6',
  purple: '#A855F7',
  indigo: '#6366F1',
  green: '#22C55E',
  emerald: '#10B981',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  sky: '#0EA5E9',
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#EAB308',
  lime: '#84CC16',
  pink: '#EC4899',
  fuchsia: '#D946EF',
  rose: '#F43F5E',
  slate: '#64748B',
  gray: '#6B7280',
  zinc: '#71717A',
  neutral: '#737373',
  stone: '#78716C',
} as const satisfies Record<string, HexColor>;

const getColorHex = (colorName?: string): HexColor => {
  if (!colorName) return TAILWIND_COLOR_MAP.blue;
  
  // If already a hex color, return as is
  if (colorName.startsWith('#')) {
    return colorName as HexColor;
  }
  
  // Map Tailwind color name to hex
  return (
    TAILWIND_COLOR_MAP[colorName.toLowerCase() as keyof typeof TAILWIND_COLOR_MAP] ??
    TAILWIND_COLOR_MAP.blue
  );
};

export interface CircularProgressProps {
  // Progress mode (0-100)
  progress?: number;
  // Timer mode
  duration?: number; // Duration in seconds for timer mode
  isPlaying?: boolean; // For timer mode
  initialRemainingTime?: number; // For timer mode
  onComplete?: () => void; // For timer mode
  onUpdate?: (remaining: number) => void; // For timer mode
  isTimer?: boolean; // Explicitly mark as timer mode (shows remaining time)
  // Common props
  size?: number;
  strokeWidth?: number;
  color?: string | string[]; // Tailwind color name, hex, or array for timer
  className?: string;
  colorsTime?: [number, number, ...number[]]; // For timer mode with color transitions
}

export function CircularProgress({
  progress,
  duration,
  isPlaying = false,
  initialRemainingTime,
  onComplete,
  onUpdate,
  isTimer = false,
  size = 54,
  strokeWidth = 5,
  color,
  className,
  colorsTime,
}: CircularProgressProps) {
  const colorHex: ColorFormat = getColorHex(Array.isArray(color) ? color[0] : color);
  
  // Timer mode (shows remaining time - empty part fills as time passes)
  if (duration !== undefined || isTimer) {
    const countdownDuration = duration ?? 0;
    const timerColors = Array.isArray(color) && color.length > 0
      ? (color.map(c => getColorHex(c)) as ColorArray)
      : (colorHex as HexColor);
    
    const timerColorsTime = colorsTime || (Array.isArray(color) && color.length > 1 && typeof duration === 'number'
      ? (() => {
          const step = duration / (color.length - 1);
          return Array.from({ length: color.length }, (_, i) => 
            Math.max(Math.round(duration - step * i), 0)
          ) as [number, number, ...number[]];
        })()
      : undefined);

    const countdownColorProps: CountdownColorProps = Array.isArray(timerColors) && timerColorsTime
      ? { colors: timerColors as ColorArray, colorsTime: timerColorsTime }
      : { colors: timerColors as ColorFormat };

    return (
      <div className={cn('relative flex items-center justify-center', className)}>
        <CountdownCircleTimer
          isPlaying={isPlaying}
          duration={countdownDuration}
          initialRemainingTime={initialRemainingTime}
          size={size}
          strokeWidth={strokeWidth}
          {...countdownColorProps}
          onUpdate={onUpdate}
          onComplete={() => {
            onComplete?.();
            return { shouldRepeat: true, delay: 0 };
          }}
        >
          {({ remainingTime }) => (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {remainingTime}s
            </span>
          )}
        </CountdownCircleTimer>
      </div>
    );
  }

  // Progress mode (shows filled portion - progress fills as value increases)
  if (progress !== undefined && !isTimer) {
    const clampedProgress = Math.max(0, Math.min(100, progress));
    
    // CountdownCircleTimer shows: colored arc = remainingTime, trail = (duration - remainingTime)
    // For progress: we want the filled portion (completed) to be colored
    // The trail represents elapsed/completed, so we want trail to be the progress color
    // To show 75% progress: we want trail = 75% (colored), colored arc = 25% (grey)
    // So: remainingTime = 25 (colored arc = 25%), trail = 75% (this is what we want colored!)
    // But trailColor is just grey, so we need to swap: make colors = grey, trailColor = progress color
    // Actually, we can't swap trailColor with colors array. Instead:
    // Use remainingTime = (100 - progress) so colored arc = (100 - progress)%, trail = progress%
    // Then swap colors and trailColor values
    const remainingForDisplay = 100 - clampedProgress;

    return (
      <div className={cn('relative flex items-center justify-center', className)}>
        <CountdownCircleTimer
          isPlaying={false}
          duration={100}
          initialRemainingTime={remainingForDisplay}
          size={size}
          strokeWidth={strokeWidth}
          colors="#E5E7EB" // Grey for the "remaining" (empty) part
          trailColor={colorHex} // Progress color for the "elapsed" (filled) part
        >
          {() => (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </CountdownCircleTimer>
      </div>
    );
  }

  return null;
}

