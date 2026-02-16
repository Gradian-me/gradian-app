import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../../shared/utils';
import { getLabelClasses } from '../utils/field-styles';

export interface RatingProps {
  value: number | string | any;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
  onChange?: (value: number) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  error?: string;
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
  className,
  onChange,
  disabled = false,
  label,
  required = false,
  error
}) => {
  const safeValue = normalizeRatingValue(value);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isEditable = !disabled && !!onChange;

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

  const displayValue = hoverValue !== null ? hoverValue : safeValue;
  const fullStars = Math.floor(displayValue);
  const hasHalfStar = displayValue % 1 >= 0.5;

  const handleStarClick = (starIndex: number) => {
    if (isEditable) {
      const newValue = starIndex + 1;
      onChange?.(newValue);
    }
  };

  const handleStarHover = (starIndex: number) => {
    if (isEditable) {
      setHoverValue(starIndex + 1);
    }
  };

  const handleMouseLeave = () => {
    if (isEditable) {
      setHoverValue(null);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className={getLabelClasses({ error: Boolean(error), required })}>
          {label}
        </label>
      )}
      <div 
        className={cn(
          "flex items-center gap-0.5 flex-nowrap whitespace-nowrap",
          isEditable ? "cursor-pointer" : "cursor-default"
        )}
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: maxValue }, (_, i) => {
          const isFilled = i < fullStars;
          const isHalfFilled = i === fullStars && hasHalfStar;
          const isHovered = hoverValue !== null && i < hoverValue;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleStarClick(i)}
              onMouseEnter={() => handleStarHover(i)}
              disabled={!isEditable}
              className={cn(
                "transition-all duration-150",
                isEditable && "hover:scale-110 focus:outline-none rounded",
                !isEditable && "cursor-default"
              )}
              aria-label={`Rate ${i + 1} out of ${maxValue}`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  isFilled || isHovered
                    ? "fill-yellow-400 text-yellow-400"
                    : isHalfFilled
                    ? "fill-yellow-400/50 text-yellow-400"
                    : "text-gray-300 dark:text-gray-600",
                  isEditable && "hover:fill-yellow-300 hover:text-yellow-300"
                )}
              />
            </button>
          );
        })}
        {showValue && (
          <span className={cn(
            "ms-2 whitespace-nowrap",
            textSizeClasses[size],
            isEditable 
              ? "font-medium text-gray-700 dark:text-gray-300" 
              : "text-gray-500 dark:text-gray-400"
          )}>
            {isEditable ? `${safeValue.toFixed(1)} / ${maxValue}` : safeValue.toFixed(1)}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

