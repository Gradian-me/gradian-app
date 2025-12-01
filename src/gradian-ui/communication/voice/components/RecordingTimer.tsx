"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface RecordingTimerProps {
  isRecording: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  minimal?: boolean;
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const RecordingTimer: React.FC<RecordingTimerProps> = ({
  isRecording,
  className,
  size = 'md',
  showIcon = true,
  minimal = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 100); // Update every 100ms for smooth display
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedTime(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording && !minimal) {
    return null;
  }

  if (minimal) {
    return (
      <span className={cn('font-mono font-semibold text-violet-600 dark:text-violet-400', sizeClasses[size], className)}>
        {formatTime(elapsedTime)}
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && (
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      <span className={cn('font-mono font-semibold text-gray-700 dark:text-gray-300', sizeClasses[size])}>
        {formatTime(elapsedTime)}
      </span>
    </div>
  );
};

