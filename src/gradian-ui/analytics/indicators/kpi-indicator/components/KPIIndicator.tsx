// KPI Indicator Component

import React from 'react';
import { KPIIndicatorProps } from '../types';
import { KPITrend } from './KPITrend';
import { KPIProgress } from './KPIProgress';
import { cn, formatNumber, formatCurrency } from '@/gradian-ui/shared/utils';

export const KPIIndicator: React.FC<KPIIndicatorProps> = ({
  config,
  value,
  previousValue,
  target,
  onValueChange,
  className,
  ...props
}) => {
  const {
    title,
    description,
    unit = '',
    format = 'number',
    precision = 0,
    color = '#3B82F6',
    icon,
    trend = { enabled: true },
    target: targetConfig = { enabled: false },
    styling = { variant: 'default', size: 'md' },
    animation = { enabled: true },
  } = config;

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return `${val.toFixed(precision)}%`;
      case 'decimal':
        return val.toFixed(precision);
      default:
        return formatNumber(val, { minimumFractionDigits: precision });
    }
  };

  const getClampStyles = () => {
    const sizeMap = {
      sm: { min: 1.25, max: 1.75 }, // 1.25rem - 1.75rem (20px - 28px)
      md: { min: 1.5, max: 2.25 },  // 1.5rem - 2.25rem (24px - 36px)
      lg: { min: 2, max: 3 },       // 2rem - 3rem (32px - 48px)
      xl: { min: 2.5, max: 4 },     // 2.5rem - 4rem (40px - 64px)
    };
    const baseSize = sizeMap[styling.size || 'md'];

    // Use container query units (cqw) for truly container-based clamping
    // cqw = container query width (1 cqw = 1% of container width)
    // This ensures the font scales based on the card's actual width, not the viewport
    // Formula: clamp(min, percentage-of-container, max)
    // The middle value uses cqw to scale font based on container width
    const containerBasedValue = `clamp(${baseSize.min}rem, ${baseSize.max * 0.75}cqw, ${baseSize.max}rem)`;
    
    return {
      fontSize: containerBasedValue,
    };
  };

  const getCardClasses = () => {
    switch (styling.variant) {
      case 'minimal':
        return 'bg-transparent border-none shadow-none';
      case 'card':
        return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm';
      case 'compact':
        return 'p-3';
      default:
        return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm';
    }
  };

  const indicatorClasses = cn(
    'kpi-indicator p-6 rounded-xl',
    getCardClasses(),
    styling.rounded && 'rounded-xl',
    className
  );

  const valueClasses = cn('font-bold text-gray-900 dark:text-gray-200');

  return (
    <div
      className={indicatorClasses}
      style={{ 
        borderLeftColor: color, 
        borderLeftWidth: '4px',
        containerType: 'inline-size'
      }}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-200">{title}</h3>
          </div>
          
          <div className="flex items-baseline space-x-2">
            <span className={valueClasses} style={{ color, ...getClampStyles() }}>
              {formatValue(value)}
            </span>
            {unit && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
            )}
          </div>
          
          {description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
          
          <div className="mt-3 space-y-2">
            {trend.enabled && previousValue !== undefined && (
              <KPITrend
                current={value}
                previous={previousValue}
                period={trend.period}
                showPercentage={trend.showPercentage}
                showArrow={trend.showArrow}
              />
            )}
            
            {targetConfig.enabled && target !== undefined && (
              <KPIProgress
                current={value}
                target={target}
                showPercentage={targetConfig.showPercentage}
                color={color}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

KPIIndicator.displayName = 'KPIIndicator';
