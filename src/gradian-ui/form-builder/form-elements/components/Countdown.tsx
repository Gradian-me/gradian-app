// Countdown Component with Odometer

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Clock, AlertCircle, Calendar } from 'lucide-react';
import { formatDate, formatShortDate } from '@/gradian-ui/shared/utils/date-utils';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { useLanguageStore } from '@/stores/language.store';

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
  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Helper function to normalize date-only values to end of day (23:59:59.999)
  const normalizeToEndOfDay = (dateInput: Date | string): Date => {
    let isDateOnly = false;
    
    if (typeof dateInput === 'string') {
      // Check if the date string is date-only (no time component)
      // Patterns: "YYYY-MM-DD", "YYYY/MM/DD", etc.
      // Exclude strings with ISO time separator 'T', time separator ':', or space before time
      const trimmedInput = dateInput.trim();
      isDateOnly = !trimmedInput.includes('T') && 
                   !trimmedInput.includes(':') && 
                   (trimmedInput.length <= 10 || !trimmedInput.includes(' '));
    } else {
      // For Date objects, check if time is at midnight (00:00:00.000)
      // This indicates it was likely created from a date-only string
      isDateOnly = dateInput.getHours() === 0 && 
                   dateInput.getMinutes() === 0 && 
                   dateInput.getSeconds() === 0 && 
                   dateInput.getMilliseconds() === 0;
    }
    
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isDateOnly) {
      // Set to end of day (23:59:59.999)
      const normalized = new Date(date);
      normalized.setHours(23, 59, 59, 999);
      return normalized;
    }
    
    return date;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      
      if (countUp && startDate) {
        // Count up mode: calculate time from startDate to now
        const start = normalizeToEndOfDay(startDate);
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
        // Normalize date-only values to end of day (23:59:59.999)
        const expiry = normalizeToEndOfDay(expireDate);
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

  // Normalize expireDate for display
  const normalizedExpireDate = normalizeToEndOfDay(expireDate);
  const normalizedStartDate = startDate ? normalizeToEndOfDay(startDate) : null;

  const expiredOnLabel = getT(TRANSLATION_KEYS.COUNTDOWN_EXPIRED_ON, language, defaultLang) || 'Expired on';
  const expiresLabel = getT(TRANSLATION_KEYS.COUNTDOWN_EXPIRES, language, defaultLang) || 'Expires';
  const startedLabel = getT(TRANSLATION_KEYS.COUNTDOWN_STARTED, language, defaultLang) || 'Started';

  const formatCountdownDate = (date: Date) =>
    includeTime ? formatShortDate(date, language) : formatDate(date, language);

  if (isExpired && !countUp) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          {showIcon && <AlertCircle className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'}`} />}
          <span className={`font-medium ${sizeClasses[size]}`}>
            {expiredOnLabel}: {formatCountdownDate(normalizedExpireDate)}
          </span>
        </div>
      </div>
    );
  }

  const tooltipLabel = fieldLabel?.trim() ? fieldLabel : undefined;

  return (
    <div
      dir="ltr"
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
            {expiresLabel}: {formatCountdownDate(normalizedExpireDate)}
          </span>
        </div>
      )}
      {countUp && normalizedStartDate && (
        <div className="flex items-end gap-1.5 text-gray-500">
          <Calendar className="h-3 w-3" />
          <span className={`${sizeClasses[size]}`}>
            {startedLabel}: {formatCountdownDate(normalizedStartDate)}
          </span>
        </div>
      )}
    </div>
  );
};

Countdown.displayName = 'Countdown';

