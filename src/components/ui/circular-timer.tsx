import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import type { ColorFormat } from 'react-countdown-circle-timer';
import { cn } from '@/lib/utils';

type ColorArray = [`#${string}`, `#${string}`, ...`#${string}`[]];
type ColorsTimeArray = [number, number, ...number[]];

type CountdownColorProps =
  | { colors: ColorFormat; colorsTime?: never }
  | { colors: ColorArray; colorsTime: ColorsTimeArray };

export type CircularTimerProps = {
  duration: number;
  isPlaying?: boolean;
  size?: number;
  strokeWidth?: number;
  className?: string;
  onComplete?: () => void;
  onUpdate?: (remaining: number) => void;
  colors?: ColorFormat | ColorArray;
  colorsTime?: ColorsTimeArray;
};

const DEFAULT_COLORS: ColorArray = ['#7C3AED', '#F97316', '#FACC15', '#EF4444'];

const createDefaultColorsTime = (duration: number, segments: number): ColorsTimeArray => {
  const safeSegments = Math.max(2, segments);
  const step = duration / (safeSegments - 1 || 1);
  const values = Array.from({ length: safeSegments }, (_, index) =>
    Math.max(Math.round(duration - step * index), 0),
  );
  values[values.length - 1] = 0;
  return values as ColorsTimeArray;
};

export function CircularTimer({
  duration,
  isPlaying = false,
  size = 54,
  strokeWidth = 5,
  className,
  onComplete,
  onUpdate,
  colors = DEFAULT_COLORS,
  colorsTime,
}: CircularTimerProps) {
  const resolvedColors = colors ?? DEFAULT_COLORS;
  const resolvedColorsTime =
    Array.isArray(resolvedColors) && resolvedColors.length >= 2
      ? colorsTime ?? createDefaultColorsTime(duration, resolvedColors.length)
      : undefined;
  const countdownColorProps: CountdownColorProps = Array.isArray(resolvedColors)
    ? { colors: resolvedColors, colorsTime: resolvedColorsTime as ColorsTimeArray }
    : { colors: resolvedColors };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <CountdownCircleTimer
        isPlaying={isPlaying}
        duration={duration}
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
