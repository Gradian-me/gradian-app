// CTA Button Component

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../../shared/utils';

export interface CTAButtonProps {
  /**
   * Button text
   */
  label: string;
  
  /**
   * Click handler
   */
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  
  /**
   * Button color (hex color or Tailwind color name)
   * @default "violet"
   */
  color?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Icon to show before the text
   */
  icon?: React.ReactNode;
  
  /**
   * Show arrow icon on the right side
   * @default true
   */
  showArrow?: boolean;
}

// Helper to get button color classes from Tailwind color name
const getButtonColorClasses = (color: string): { bg: string; hover: string; text: string } => {
  const colorMap: Record<string, { bg: string; hover: string; text: string }> = {
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-500/15',
      hover: 'hover:bg-violet-600 dark:hover:bg-violet-600',
      text: 'text-violet-700 dark:text-violet-100',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/15',
      hover: 'hover:bg-emerald-600 dark:hover:bg-emerald-600',
      text: 'text-emerald-700 dark:text-emerald-100',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/15',
      hover: 'hover:bg-indigo-600 dark:hover:bg-indigo-600',
      text: 'text-indigo-700 dark:text-indigo-100',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-500/15',
      hover: 'hover:bg-blue-600 dark:hover:bg-blue-600',
      text: 'text-blue-700 dark:text-blue-100',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-500/15',
      hover: 'hover:bg-green-600 dark:hover:bg-green-600',
      text: 'text-green-700 dark:text-green-100',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-500/15',
      hover: 'hover:bg-red-600 dark:hover:bg-red-600',
      text: 'text-red-700 dark:text-red-100',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-500/15',
      hover: 'hover:bg-orange-600 dark:hover:bg-orange-600',
      text: 'text-orange-700 dark:text-orange-100',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/15',
      hover: 'hover:bg-amber-600 dark:hover:bg-amber-600',
      text: 'text-amber-700 dark:text-amber-100',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/15',
      hover: 'hover:bg-yellow-600 dark:hover:bg-yellow-600',
      text: 'text-yellow-700 dark:text-yellow-100',
    },
    pink: {
      bg: 'bg-pink-50 dark:bg-pink-500/15',
      hover: 'hover:bg-pink-600 dark:hover:bg-pink-600',
      text: 'text-pink-700 dark:text-pink-100',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-500/15',
      hover: 'hover:bg-purple-600 dark:hover:bg-purple-600',
      text: 'text-purple-700 dark:text-purple-100',
    },
  };
  
  return colorMap[color.toLowerCase()] || colorMap.violet;
};

export const CTAButton: React.FC<CTAButtonProps> = ({
  label,
  onClick,
  color = 'violet',
  className,
  disabled = false,
  icon,
  showArrow = true,
}) => {
  const isHexColor = color.startsWith('#');
  
  // Get Tailwind color classes if not hex
  const colorClasses = !isHexColor ? getButtonColorClasses(color) : null;

  const buttonClasses = cn(
    'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm group',
    !isHexColor && colorClasses && `${colorClasses.bg} ${colorClasses.hover} ${colorClasses.text} hover:text-white`,
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  const defaultStyle: React.CSSProperties = isHexColor ? {
    backgroundColor: `${color}10`,
    color: color,
  } : {};

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (isHexColor) {
      e.currentTarget.style.backgroundColor = color;
      e.currentTarget.style.color = 'white';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (isHexColor) {
      e.currentTarget.style.backgroundColor = `${color}10`;
      e.currentTarget.style.color = color;
    }
  };

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      style={isHexColor ? defaultStyle : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon && (
        <span className="inline-flex items-center shrink-0">
          {icon}
        </span>
      )}
      <span>{label}</span>
      {showArrow && (
        <span className="inline-flex items-center transition-transform group-hover:translate-x-0.5 shrink-0">
          <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </button>
  );
};

CTAButton.displayName = 'CTAButton';

