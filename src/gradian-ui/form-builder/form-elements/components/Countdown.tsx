// Countdown Component with Odometer

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Clock, AlertCircle, Calendar } from 'lucide-react';
import { formatDate } from '../../../shared/utils';

const Odometer = dynamic(() => import('react-odometerjs'), {
  ssr: false,
  loading: () => <span>00:00:00</span>
});

export interface CountdownProps {
  startDate?: Date | string;
  expireDate: Date | string;
  includeTime?: boolean;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fieldLabel?: string;
  countUp?: boolean; // If true, counts up from startDate to now instead of down to expireDate
}

export const Countdown: React.FC<CountdownProps> = ({
  startDate,
  expireDate,
  includeTime = true,
  className = '',
  showIcon = true,
  size = 'md',
  fieldLabel,
  countUp = false,
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      
      if (countUp && startDate) {
        // Count up mode: calculate time from startDate to now
        const start = new Date(startDate);
        const difference = now.getTime() - start.getTime();

        if (difference < 0) {
          setIsExpired(false);
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          return;
        }

        setIsExpired(false);
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        // Count down mode: calculate time from now to expireDate
        const expiry = new Date(expireDate);
        const difference = expiry.getTime() - now.getTime();

        if (difference <= 0) {
          setIsExpired(true);
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          return;
        }

        setIsExpired(false);
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expireDate, startDate, countUp]);

  if (!mounted) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (isExpired && !countUp) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          {showIcon && <AlertCircle className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />}
          <span className={`font-medium ${sizeClasses[size]}`}>
            Expired on: {formatDate(new Date(expireDate), { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
              ...(includeTime && { hour: '2-digit', minute: '2-digit' })
            })}
          </span>
        </div>
      </div>
    );
  }

  const tooltipLabel = fieldLabel?.trim() ? fieldLabel : undefined;

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      title={tooltipLabel}
      aria-label={tooltipLabel}
    >
      <div className="flex items-center gap-2">
        {showIcon && <Clock className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} text-red-500`} />}
        <div className="flex items-center gap-1 border border-red-200 rounded-md px-2 py-1 bg-red-50">
          {timeLeft.days > 0 && (
            <>
              <div className="inline-block relative text-gray-900">
                <Odometer 
                  value={100 + timeLeft.days} 
                  theme="minimal"
                />
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-red-50"></div>
              </div>
              <span className={`text-gray-500 ${sizeClasses[size]}`}>d</span>
            </>
          )}
          
          {(timeLeft.days > 0 || timeLeft.hours > 0) && (
            <>
              <div className="inline-block relative text-gray-900">
                <Odometer 
                  value={100 + timeLeft.hours} 
                  theme="minimal"
                />
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-red-50"></div>
              </div>
              <span className={`text-gray-500 ${sizeClasses[size]}`}>h</span>
            </>
          )}
          
          {(timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0) && (
            <>
              <div className="inline-block relative text-gray-900">
                <Odometer 
                  value={100 + timeLeft.minutes} 
                  theme="minimal"
                />
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-red-50"></div>
              </div>
              <span className={`text-gray-500 ${sizeClasses[size]}`}>m</span>
            </>
          )}
          
          {includeTime && (
            <React.Fragment>
              <div className="inline-block relative text-gray-900">
                <Odometer 
                  value={100 + timeLeft.seconds} 
                  theme="minimal"
                />
                <div className="absolute left-0 top-0 bottom-0 w-1/3 bg-red-50"></div>
              </div>
              <span className={`text-gray-500 ${sizeClasses[size]}`}>s</span>
            </React.Fragment>
          )}
        </div>
      </div>
      
      {/* Expiration date display (only for count down) or start date display (for count up) */}
      {!countUp && (
        <div className="flex items-end gap-1.5 text-gray-500">
          <Calendar className="h-3 w-3" />
          <span className={`${sizeClasses[size]}`}>
            Expires: {formatDate(new Date(expireDate), { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
              ...(includeTime && { hour: '2-digit', minute: '2-digit' })
            })}
          </span>
        </div>
      )}
      {countUp && startDate && (
        <div className="flex items-end gap-1.5 text-gray-500">
          <Calendar className="h-3 w-3" />
          <span className={`${sizeClasses[size]}`}>
            Started: {formatDate(new Date(startDate), { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
              ...(includeTime && { hour: '2-digit', minute: '2-digit' })
            })}
          </span>
        </div>
      )}
    </div>
  );
};

Countdown.displayName = 'Countdown';

