'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/gradian-ui/shared/utils';

export interface PingOnChangeProps {
  /**
   * The value to monitor for changes
   */
  value: any;
  
  /**
   * Child elements to wrap with ping effect
   */
  children: React.ReactNode;
  
  /**
   * CSS class name for the wrapper
   */
  className?: string;
  
  /**
   * Color of the ping effect
   * @default "blue"
   */
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'gray';
  
  /**
   * Duration of the ping animation in milliseconds
   * @default 1500
   */
  duration?: number;
  
  /**
   * Whether to enable the ping effect
   * @default true
   */
  enabled?: boolean;
}

const colorClasses = {
  blue: {
    ping: 'bg-blue-400',
    pulse: 'bg-blue-300',
  },
  green: {
    ping: 'bg-green-400',
    pulse: 'bg-green-300',
  },
  red: {
    ping: 'bg-red-400',
    pulse: 'bg-red-300',
  },
  yellow: {
    ping: 'bg-yellow-400',
    pulse: 'bg-yellow-300',
  },
  purple: {
    ping: 'bg-purple-400',
    pulse: 'bg-purple-300',
  },
  orange: {
    ping: 'bg-orange-400',
    pulse: 'bg-orange-300',
  },
  gray: {
    ping: 'bg-gray-400',
    pulse: 'bg-gray-300',
  },
};

/**
 * PingOnChange - Component that shows a ping animation when a value changes
 * 
 * @example
 * ```tsx
 * <PingOnChange value={status} color="green">
 *   <Badge>{status}</Badge>
 * </PingOnChange>
 * ```
 */
export const PingOnChange: React.FC<PingOnChangeProps> = ({
  value,
  children,
  className = '',
  color = 'blue',
  duration = 1500,
  enabled = true,
}) => {
  const prevValueRef = useRef(value);
  const [shouldPing, setShouldPing] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    
    // Use Object.is for comparison to properly handle 0, NaN, and other edge cases
    // Only trigger ping if value actually changed and we have a previous value to compare
    if (!Object.is(prevValueRef.current, value) && prevValueRef.current !== undefined) {
      setShouldPing(true);
      const timer = setTimeout(() => setShouldPing(false), duration);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value, duration, enabled]);

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={cn('relative', className)}>
      {shouldPing && (
        <span className="absolute -inset-1 flex pointer-events-none">
          <span className={cn('absolute inset-0 rounded-lg opacity-50 animate-ping', colors.ping)}></span>
          <span className={cn('absolute inset-0 rounded-lg opacity-30 animate-pulse', colors.pulse)}></span>
        </span>
      )}
      <div className={shouldPing ? 'relative z-10' : ''}>
        {children}
      </div>
    </div>
  );
};

PingOnChange.displayName = 'PingOnChange';

