import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../../shared/utils';

export interface RatingProps {
  value: number | string | any;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const normalizeRatingValue = (rawValue: any): number => {
  if (rawValue === null || rawValue === undefined) {
    return 0;
  }

  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue) ? rawValue : 0;
  }

  if (Array.isArray(rawValue)) {
    return normalizeRatingValue(rawValue[0]);
  }

  if (typeof rawValue === 'object') {
    if ('value' in rawValue) {
      return normalizeRatingValue((rawValue as any).value);
    }
    if ('rating' in rawValue) {
      return normalizeRatingValue((rawValue as any).rating);
    }
    if ('score' in rawValue) {
      return normalizeRatingValue((rawValue as any).score);
    }
    if ('label' in rawValue) {
      return normalizeRatingValue((rawValue as any).label);
    }
    if ('id' in rawValue) {
      return normalizeRatingValue((rawValue as any).id);
    }
  }

  const parsed = Number.parseFloat(String(rawValue));
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const Rating: React.FC<RatingProps> = ({
  value = 0,
  maxValue = 5,
  size = 'md',
  showValue = false,
  className
}) => {
  const safeValue = normalizeRatingValue(value);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const fullStars = Math.floor(safeValue);
  const hasHalfStar = safeValue % 1 >= 0.5;

  return (
    <div className={cn("flex items-center gap-0.2 flex-nowrap whitespace-nowrap", className)}>
      {Array.from({ length: maxValue }, (_, i) => {
        if (i < fullStars) {
          return (
            <Star
              key={i}
              className={cn(
                sizeClasses[size],
                "fill-yellow-400 text-yellow-400"
              )}
            />
          );
        } else if (i === fullStars && hasHalfStar) {
          return (
            <Star
              key={i}
              className={cn(
                sizeClasses[size],
                "fill-yellow-400/50 text-yellow-400"
              )}
            />
          );
        } else {
          return (
            <Star
              key={i}
              className={cn(
                sizeClasses[size],
                "text-gray-300"
              )}
            />
          );
        }
      })}
      {showValue && (
        <span className={cn("ml-1 text-gray-500 whitespace-nowrap", textSizeClasses[size])}>
          {safeValue.toFixed(1)}
        </span>
      )}
    </div>
  );
};

