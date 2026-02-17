'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { Locale as DayPickerLocale } from 'react-day-picker';
import { type DateRange } from 'react-day-picker';
import { format, addDays, isSameDay, setHours, setMinutes, setSeconds } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/gradian-ui/shared/utils';
import { baseInputClasses, getLabelClasses, errorTextClasses } from '../utils/field-styles';
import { getLocale } from '@/gradian-ui/shared/utils/date-utils';
import { getDayPickerLocaleAndDir } from '@/gradian-ui/shared/utils/date-picker-locale';
import { getDateForCalendar, PersianDate } from '@/gradian-ui/shared/utils/persian-date';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';
import { useLanguageStore } from '@/stores/language.store';

export type DatePickerCalendarMode = 'single' | 'range';
export type DatePickerCalendarTimeInput = false | true | 'startEnd';

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

const WEEKDAY_TO_NUM: Record<WeekdayKey, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export interface DatePickerCalendarPreset {
  label: string;
  /** When set, label is translated using this key; otherwise label is shown as-is. */
  translationKey?: string;
  getValue: () => Date | DateRange;
}

const DEFAULT_PRESETS: DatePickerCalendarPreset[] = [
  { label: 'Today', translationKey: TRANSLATION_KEYS.DATE_PICKER_PRESET_TODAY, getValue: () => new Date() },
  { label: 'Tomorrow', translationKey: TRANSLATION_KEYS.DATE_PICKER_PRESET_TOMORROW, getValue: () => addDays(new Date(), 1) },
  { label: 'In 3 days', translationKey: TRANSLATION_KEYS.DATE_PICKER_PRESET_IN_3_DAYS, getValue: () => addDays(new Date(), 3) },
  { label: 'In a week', translationKey: TRANSLATION_KEYS.DATE_PICKER_PRESET_IN_A_WEEK, getValue: () => addDays(new Date(), 7) },
  { label: 'In 2 weeks', translationKey: TRANSLATION_KEYS.DATE_PICKER_PRESET_IN_2_WEEKS, getValue: () => addDays(new Date(), 14) },
];

export interface DatePickerCalendarProps {
  /** Locale from app (react-day-picker locale or code) */
  locale?: DayPickerLocale;
  /** Text direction from app */
  dir?: 'ltr' | 'rtl';
  /** Selection mode */
  mode?: DatePickerCalendarMode;
  /** When true, show Apply button to confirm; when false, selection applies immediately */
  showApply?: boolean;
  /** Show month/year dropdowns */
  showSelectors?: boolean;
  /** Show week number column */
  showWeekNumber?: boolean;
  /** Time input: false, single time (true), or start/end (single date or range) */
  timeInput?: DatePickerCalendarTimeInput;
  /** Show preset buttons (e.g. Today, Tomorrow) */
  showPresets?: boolean;
  /** Custom presets when showPresets is true */
  presets?: DatePickerCalendarPreset[];
  /** Dates that cannot be selected */
  disabledDays?: Date[];
  /** Controlled value: single date or range */
  value?: Date | DateRange | undefined;
  /** Change handler */
  onChange?: (value: Date | DateRange | undefined) => void;
  /** Placeholder for the trigger input */
  placeholder?: string;
  /** Label above the input */
  label?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required marker */
  required?: boolean;
  /** id for the trigger (accessibility) */
  id?: string;
  /** Additional class for the trigger */
  className?: string;
  /** Date format for display (default PP for single, PP–PP for range) */
  displayFormat?: string;
  /** First day of week (column). Default Saturday. */
  firstWeekDay?: WeekdayKey;
  /** When true, days in holidayDays are shown with lighter text. */
  showHolidays?: boolean;
  /** Day-of-week keys to show as holidays (lighter) when showHolidays is true. E.g. ['thu', 'fri']. */
  holidayDays?: WeekdayKey[];
  /** Specific dates to show as holidays (lighter) when showHolidays is true. E.g. [new Date('2025-01-01'), ...]. */
  customHolidays?: Date[];
  /** When true, show a select in the popover to switch between Gregorian and Persian (Jalali) calendar. */
  allowChangeCalendar?: boolean;
  /** When true, show a "Today" button that jumps to the current month and selects today. */
  showToday?: boolean;
  /** Minimum selectable date; calendar navigation and month/year selector are limited to this range. */
  minDate?: Date;
  /** Maximum selectable date; calendar navigation and month/year selector are limited to this range. */
  maxDate?: Date;
}

function formatDateForDisplay(
  value: Date | DateRange | undefined,
  mode: DatePickerCalendarMode,
  localeCode?: string,
  displayFormat?: string
): string {
  if (!value) return '';
  const df = displayFormat ?? (mode === 'range' ? 'PP' : 'PP');
  const locale = getLocale(localeCode);
  if (mode === 'single' && value instanceof Date) {
    return format(value, df, { locale });
  }
  if (mode === 'range' && typeof value === 'object' && 'from' in value) {
    const r = value as DateRange;
    if (r.from && r.to) {
      return `${format(r.from, df, { locale })} – ${format(r.to, df, { locale })}`;
    }
    if (r.from) return format(r.from, df, { locale });
  }
  return '';
}

function applyTimeToDate(date: Date, timeStr: string): Date {
  const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
  let d = setSeconds(setMinutes(setHours(date, h), m), s);
  return d;
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getMonthFromSelection(selection: Date | DateRange | undefined): Date | undefined {
  if (!selection) return undefined;
  if (selection instanceof Date) return getStartOfMonth(selection);
  const r = selection as DateRange;
  return r.from ? getStartOfMonth(r.from) : undefined;
}

export function DatePickerCalendar({
  locale,
  dir,
  mode = 'single',
  showApply = true,
  showSelectors = true,
  showWeekNumber = false,
  timeInput = false,
  showPresets = false,
  presets = DEFAULT_PRESETS,
  disabledDays = [],
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  required = false,
  id,
  className,
  displayFormat,
  firstWeekDay = 'sat',
  showHolidays = false,
  holidayDays = [],
  customHolidays = [],
  allowChangeCalendar = false,
  showToday = false,
  minDate,
  maxDate,
}: DatePickerCalendarProps) {
  const storeLanguage = useLanguageStore((s) => s.language);
  const appLanguage = storeLanguage ?? useLanguageStore.getState().getLanguage();
  const defaultLang = getDefaultLanguage();
  const appLocaleOptions = getDayPickerLocaleAndDir(appLanguage);
  const { locale: appDayPickerLocale, dir: appDir, dateLib: appDateLib, numerals: appNumerals } = appLocaleOptions;

  const jalaliOptions = useMemo(() => getDayPickerLocaleAndDir('fa'), []);

  const [calendarType, setCalendarType] = useState<'gregorian' | 'persian'>(() =>
    allowChangeCalendar ? (appDateLib ? 'persian' : 'gregorian') : 'gregorian'
  );

  const resolvedLocale =
    allowChangeCalendar && calendarType === 'persian'
      ? jalaliOptions.locale
      : (locale ?? appDayPickerLocale);
  const resolvedDir =
    allowChangeCalendar && calendarType === 'persian' ? jalaliOptions.dir : (dir ?? appDir);
  const resolvedDateLib =
    allowChangeCalendar && calendarType === 'persian'
      ? jalaliOptions.dateLib
      : locale == null
        ? appDateLib
        : undefined;
  const resolvedNumerals =
    allowChangeCalendar && calendarType === 'persian'
      ? jalaliOptions.numerals
      : locale == null
        ? appNumerals
        : undefined;

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Date | DateRange | undefined>(value);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(() =>
    getMonthFromSelection(value)
  );
  const [timeStart, setTimeStart] = useState<string>(() => {
    if (timeInput === true || timeInput === 'startEnd') return '';
    if (mode === 'single' && value instanceof Date) {
      return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
    }
    if (mode === 'range' && value && typeof value === 'object' && 'from' in value) {
      const from = (value as DateRange).from;
      if (from) return `${String(from.getHours()).padStart(2, '0')}:${String(from.getMinutes()).padStart(2, '0')}`;
    }
    return '00:00';
  });
  const [timeEnd, setTimeEnd] = useState<string>(() => {
    if (timeInput === 'startEnd') return '';
    if (mode === 'range' && value && typeof value === 'object' && 'to' in value) {
      const to = (value as DateRange).to;
      if (to) return `${String(to.getHours()).padStart(2, '0')}:${String(to.getMinutes()).padStart(2, '0')}`;
    }
    return '23:59';
  });
  const [timeError, setTimeError] = useState<string | undefined>(undefined);

  const [isSmOrNarrower, setIsSmOrNarrower] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsSmOrNarrower(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const popoverBg = isDark ? 'rgb(31 41 55)' : '#ffffff';
  const popoverContentStyle = useMemo(
    () => ({ backgroundColor: popoverBg }),
    [popoverBg]
  );

  const localeCode = resolvedLocale?.code ?? appLanguage;
  const resolvedPlaceholder = placeholder ?? getT(TRANSLATION_KEYS.DATE_PICKER_PLACEHOLDER, appLanguage, defaultLang);
  const displayValue = useMemo(() => {
    const df = displayFormat ?? (mode === 'range' ? 'PP' : 'PP');
    const useShamsi = allowChangeCalendar && calendarType === 'persian';
    const formatShamsi = (d: Date): string => {
      const p = getDateForCalendar(d, 'fa-IR');
      return p instanceof PersianDate ? `${p.getDate()} ${p.getMonthName()} ${p.getYear()}` : (jalaliOptions.dateLib?.format(d, df) ?? '');
    };
    let base: string;
    if (useShamsi) {
      if (mode === 'single' && value instanceof Date) {
        base = formatShamsi(value);
      } else if (mode === 'range' && value && typeof value === 'object' && 'from' in value) {
        const r = value as DateRange;
        if (r.from && r.to) {
          base = `${formatShamsi(r.from)} – ${formatShamsi(r.to)}`;
        } else if (r.from) {
          base = formatShamsi(r.from);
        } else {
          base = '';
        }
      } else {
        base = '';
      }
    } else {
      base = formatDateForDisplay(value, mode, localeCode, displayFormat);
    }
    if (mode === 'single' && timeInput === 'startEnd' && base && timeStart.trim() && timeEnd.trim()) {
      return `${base} ${timeStart} – ${timeEnd}`;
    }
    return base;
  }, [
    value,
    mode,
    localeCode,
    displayFormat,
    timeInput,
    timeStart,
    timeEnd,
    allowChangeCalendar,
    calendarType,
    jalaliOptions.dateLib,
  ]);

  const startMonth = useMemo(() => {
    if (!minDate) return undefined;
    return resolvedDateLib ? resolvedDateLib.startOfMonth(minDate) : getStartOfMonth(minDate);
  }, [minDate, resolvedDateLib]);
  const endMonth = useMemo(() => {
    if (!maxDate) return undefined;
    return resolvedDateLib ? resolvedDateLib.endOfMonth(maxDate) : getEndOfMonth(maxDate);
  }, [maxDate, resolvedDateLib]);

  const startOfDayLocal = useCallback((d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()), []);
  const disabledMatcher = useMemo(() => {
    const minMaxMatcher =
      minDate != null || maxDate != null
        ? (date: Date) => {
            const day = startOfDayLocal(date);
            if (minDate != null && day < startOfDayLocal(minDate)) return true;
            if (maxDate != null && day > startOfDayLocal(maxDate)) return true;
            return false;
          }
        : undefined;
    const daysMatcher =
      disabledDays.length > 0 ? (date: Date) => disabledDays.some((d) => isSameDay(d, date)) : undefined;
    if (!minMaxMatcher && !daysMatcher) return undefined;
    return (date: Date) => (minMaxMatcher?.(date) ?? false) || (daysMatcher?.(date) ?? false);
  }, [minDate, maxDate, disabledDays, startOfDayLocal]);

  const weekStartsOn = WEEKDAY_TO_NUM[firstWeekDay] ?? 6;

  const holidayModifiers = useMemo(() => {
    if (!showHolidays) return undefined;
    const weekdayNums = holidayDays.map((d) => WEEKDAY_TO_NUM[d]).filter((n) => n !== undefined);
    const hasWeekdayHolidays = weekdayNums.length > 0;
    const hasCustomHolidays = customHolidays.length > 0;
    if (!hasWeekdayHolidays && !hasCustomHolidays) return undefined;
    const matcher = (date: Date) => {
      if (hasWeekdayHolidays && weekdayNums.includes(date.getDay())) return true;
      if (hasCustomHolidays && customHolidays.some((d) => isSameDay(d, date))) return true;
      return false;
    };
    return { holiday: matcher };
  }, [showHolidays, holidayDays, customHolidays]);

  const holidayModifiersClassNames = useMemo(
    () =>
      showHolidays && (holidayDays.length > 0 || customHolidays.length > 0)
        ? { holiday: '!text-gray-400 dark:!text-gray-500 opacity-80' }
        : undefined,
    [showHolidays, holidayDays, customHolidays]
  );

  const handleSelect = useCallback(
    (selected: Date | DateRange | undefined) => {
      if (showApply) {
        setPending(selected);
        setTimeError(undefined);
        const month = getMonthFromSelection(selected);
        if (month) setCalendarMonth(month);
        return;
      }
      if (timeInput === 'startEnd' && (timeStart.trim() === '' || timeEnd.trim() === '')) {
        setTimeError(getT(TRANSLATION_KEYS.DATE_PICKER_ERROR_START_END_TIME_REQUIRED, appLanguage, defaultLang));
        return;
      }
      if (mode === 'single' && selected instanceof Date) {
        let final = selected;
        if (timeInput === true) {
          final = applyTimeToDate(selected, timeStart);
        } else if (timeInput === 'startEnd') {
          final = applyTimeToDate(selected, timeStart);
        }
        onChange?.(final);
        setOpen(false);
        return;
      }
      if (mode === 'range' && selected && typeof selected === 'object') {
        let from = (selected as DateRange).from;
        let to = (selected as DateRange).to;
        if (timeInput === 'startEnd' && from) {
          from = applyTimeToDate(from, timeStart);
          if (to) to = applyTimeToDate(to, timeEnd);
        }
        onChange?.({ from, to });
        setOpen(false);
        return;
      }
      onChange?.(selected);
      setOpen(false);
    },
    [showApply, mode, timeInput, timeStart, timeEnd, onChange, appLanguage, defaultLang]
  );

  const handleApply = useCallback(() => {
    if (pending === undefined) {
      setOpen(false);
      return;
    }
    if (timeInput === true) {
      if (timeStart.trim() === '') {
        setTimeError(getT(TRANSLATION_KEYS.DATE_PICKER_ERROR_TIME_REQUIRED, appLanguage, defaultLang));
        return;
      }
    } else if (timeInput === 'startEnd') {
      if (timeStart.trim() === '' || timeEnd.trim() === '') {
        setTimeError(getT(TRANSLATION_KEYS.DATE_PICKER_ERROR_START_END_TIME_REQUIRED, appLanguage, defaultLang));
        return;
      }
    }
    setTimeError(undefined);
    if (mode === 'single' && pending instanceof Date) {
      let final = pending;
      if (timeInput === true) final = applyTimeToDate(pending, timeStart);
      else if (timeInput === 'startEnd') final = applyTimeToDate(pending, timeStart);
      onChange?.(final);
    } else if (mode === 'range' && typeof pending === 'object') {
      let from = (pending as DateRange).from;
      let to = (pending as DateRange).to;
      if (timeInput === 'startEnd') {
        if (from) from = applyTimeToDate(from, timeStart);
        if (to) to = applyTimeToDate(to, timeEnd);
      }
      onChange?.({ from, to });
    } else {
      onChange?.(pending);
    }
    setOpen(false);
  }, [pending, mode, timeInput, timeStart, timeEnd, onChange, appLanguage, defaultLang]);

  const handlePresetClick = useCallback(
    (preset: DatePickerCalendarPreset) => {
      let v: Date | DateRange | undefined = preset.getValue();
      if (mode === 'range' && v instanceof Date) {
        v = { from: v, to: v };
      }
      const month = getMonthFromSelection(v);
      if (month) setCalendarMonth(month);
      if (showApply) {
        setPending(v);
        return;
      }
      onChange?.(v);
      setOpen(false);
    },
    [showApply, onChange, mode]
  );

  const handleTodayClick = useCallback(() => {
    const today = new Date();
    const startOfTodayMonth = resolvedDateLib
      ? resolvedDateLib.startOfMonth(today)
      : getStartOfMonth(today);
    setCalendarMonth(startOfTodayMonth);
    if (mode === 'single') {
      setPending(today);
      if (!showApply) {
        onChange?.(today);
        setOpen(false);
      }
    } else {
      setPending({ from: today, to: today });
      if (!showApply) {
        onChange?.({ from: today, to: today });
        setOpen(false);
      }
    }
  }, [mode, showApply, onChange, resolvedDateLib]);

  React.useEffect(() => {
    setPending(value);
  }, [value]);

  React.useEffect(() => {
    if (open) {
      const month = getMonthFromSelection(pending ?? value);
      if (month) setCalendarMonth(month);
    }
  }, [open]);

  const selectedSingle =
    mode === 'single'
      ? (showApply ? (pending ?? value) : value) as Date | undefined
      : undefined;
  const selectedRange =
    mode === 'range'
      ? (showApply ? (pending ?? value) : value) as DateRange | undefined
      : undefined;

  const defaultCalendarMonth =
    selectedSingle ??
    (selectedRange && typeof selectedRange === 'object' && 'from' in selectedRange
      ? selectedRange.from
      : undefined) ??
    new Date();
  const displayedMonth = calendarMonth ?? defaultCalendarMonth;
  const handleMonthChange = useCallback(
    (date: Date) => {
      const normalized =
        resolvedDateLib != null
          ? resolvedDateLib.startOfMonth(date)
          : getStartOfMonth(date);
      setCalendarMonth(normalized);
    },
    [resolvedDateLib]
  );
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;
    const target = getMonthFromSelection(
      mode === 'single' ? selectedSingle : (selectedRange as DateRange)?.from
    ) ?? (resolvedDateLib != null ? resolvedDateLib.startOfMonth(new Date()) : getStartOfMonth(new Date()));
    const clamped =
      startMonth != null && target < startMonth
        ? startMonth
        : endMonth != null && target > endMonth
          ? endMonth
          : target;
    setCalendarMonth(clamped);
  }, [open, mode, selectedSingle, selectedRange, startMonth, endMonth, resolvedDateLib]);
  const displayedMonthClamped =
    startMonth != null && displayedMonth < startMonth
      ? startMonth
      : endMonth != null && displayedMonth > endMonth
        ? endMonth
        : displayedMonth;

  const triggerClasses = cn(
    baseInputClasses,
    'flex items-center gap-2 text-start cursor-pointer disabled:cursor-default',
    error &&
      'border-red-500 focus-visible:ring-red-300 focus-visible:border-red-500 dark:border-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:border-red-500',
    className
  );

  const triggerButton = (
    <button
      type="button"
      id={id}
      disabled={disabled}
      className={triggerClasses}
            aria-label={resolvedPlaceholder}
      aria-expanded={open}
    >
      <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" />
            <span className={displayValue ? undefined : 'text-gray-400 dark:text-gray-500'}>
              {displayValue || resolvedPlaceholder}
            </span>
    </button>
  );

  const calendarContent = (
    <>
      {allowChangeCalendar && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2" style={{ backgroundColor: popoverBg }}>
              <label htmlFor="date-picker-calendar-type" className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {getT(TRANSLATION_KEYS.DATE_PICKER_LABEL_CALENDAR, appLanguage, defaultLang)}
              </label>
              <select
                id="date-picker-calendar-type"
                value={calendarType}
                onChange={(e) => setCalendarType(e.target.value as 'gregorian' | 'persian')}
                className={cn(baseInputClasses, 'min-h-8 flex-1 min-w-0 text-sm')}
                aria-label={getT(TRANSLATION_KEYS.DATE_PICKER_LABEL_CALENDAR, appLanguage, defaultLang)}
              >
                <option value="gregorian">{getT(TRANSLATION_KEYS.DATE_PICKER_CALENDAR_GREGORIAN, appLanguage, defaultLang)}</option>
                <option value="persian">{getT(TRANSLATION_KEYS.DATE_PICKER_CALENDAR_PERSIAN, appLanguage, defaultLang)}</option>
              </select>
            </div>
          )}
          {showToday && (
            <div className="px-3 pt-2 pb-0 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: popoverBg }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                onClick={handleTodayClick}
              >
                {getT(TRANSLATION_KEYS.DATE_PICKER_TODAY, appLanguage, defaultLang)}
              </Button>
            </div>
          )}
          <div data-date-picker-calendar-row className={cn('w-fit flex gap-2 rounded-xl', mode === 'range' ? 'flex-row' : 'flex-col sm:flex-row')} style={{ backgroundColor: popoverBg }}>
            <div className={cn('p-1.5 rounded-t-xl sm:rounded-l-xl', mode === 'range' && 'overflow-x-auto min-w-0')} style={{ backgroundColor: popoverBg }}>
              {mode === 'single' ? (
                <Calendar
                  mode="single"
                  locale={resolvedLocale}
                  dir={resolvedDir}
                  {...(resolvedDateLib && { dateLib: resolvedDateLib })}
                  {...(resolvedNumerals && { numerals: resolvedNumerals })}
                  selected={selectedSingle}
                  onSelect={handleSelect}
                  month={
                    resolvedDateLib
                      ? resolvedDateLib.startOfMonth(displayedMonthClamped)
                      : getStartOfMonth(displayedMonthClamped)
                  }
                  onMonthChange={handleMonthChange}
                  defaultMonth={selectedSingle}
                  captionLayout={showSelectors ? 'dropdown' : 'label'}
                  showWeekNumber={showWeekNumber}
                  startMonth={startMonth}
                  endMonth={endMonth}
                  disabled={disabledMatcher}
                  numberOfMonths={1}
                  weekStartsOn={weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6}
                  modifiers={holidayModifiers}
                  modifiersClassNames={holidayModifiersClassNames}
                  className="rounded-lg border-0 [--cell-size:1.35rem]"
                />
              ) : (
                <Calendar
                  mode="range"
                  required={false}
                  locale={resolvedLocale}
                  dir={resolvedDir}
                  {...(resolvedDateLib && { dateLib: resolvedDateLib })}
                  {...(resolvedNumerals && { numerals: resolvedNumerals })}
                  selected={selectedRange}
                  onSelect={handleSelect}
                  month={
                    resolvedDateLib
                      ? resolvedDateLib.startOfMonth(displayedMonthClamped)
                      : getStartOfMonth(displayedMonthClamped)
                  }
                  onMonthChange={handleMonthChange}
                  defaultMonth={(selectedRange as DateRange)?.from}
                  captionLayout="label"
                  showWeekNumber={showWeekNumber}
                  startMonth={startMonth}
                  endMonth={endMonth}
                  disabled={disabledMatcher}
                  numberOfMonths={2}
                  weekStartsOn={weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6}
                  modifiers={holidayModifiers}
                  modifiersClassNames={holidayModifiersClassNames}
                  className={cn('rounded-lg border-0 [--cell-size:1.35rem]', 'inline-flex')}
                />
              )}
            </div>
            {(timeInput === true || timeInput === 'startEnd') && (
              <div className="flex flex-col gap-2 p-3 border-t sm:border-t-0 sm:border-s border-gray-200 dark:border-gray-700 min-w-[140px]" style={{ backgroundColor: popoverBg }}>
                {timeInput === 'startEnd' ? (
                  <>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {getT(TRANSLATION_KEYS.DATE_PICKER_LABEL_START, appLanguage, defaultLang)}
                    </label>
                    <input
                      type="time"
                      value={timeStart}
                      onChange={(e) => { setTimeStart(e.target.value); setTimeError(undefined); }}
                      className={cn(baseInputClasses, 'min-h-9')}
                    />
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {getT(TRANSLATION_KEYS.DATE_PICKER_LABEL_END, appLanguage, defaultLang)}
                    </label>
                    <input
                      type="time"
                      value={timeEnd}
                      onChange={(e) => { setTimeEnd(e.target.value); setTimeError(undefined); }}
                      className={cn(baseInputClasses, 'min-h-9')}
                    />
                  </>
                ) : (
                  <>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {getT(TRANSLATION_KEYS.DATE_PICKER_LABEL_TIME, appLanguage, defaultLang)}
                    </label>
                    <input
                      type="time"
                      value={timeStart}
                      onChange={(e) => { setTimeStart(e.target.value); setTimeError(undefined); }}
                      className={cn(baseInputClasses, 'min-h-9')}
                    />
                  </>
                )}
                {timeError && (
                  <p className={errorTextClasses} role="alert">
                    {timeError}
                  </p>
                )}
              </div>
            )}
            {showPresets && (
              <div className="flex flex-col gap-2 p-3 border-t sm:border-t-0 sm:border-s border-gray-200 dark:border-gray-700 min-w-[120px]" style={{ backgroundColor: popoverBg }}>
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.translationKey ? getT(preset.translationKey, appLanguage, defaultLang) : preset.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {showApply && (
            <div className="flex justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700 rounded-b-xl" style={{ backgroundColor: popoverBg }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                {getT(TRANSLATION_KEYS.BUTTON_CANCEL, appLanguage, defaultLang)}
              </Button>
              <Button type="button" size="sm" onClick={handleApply}>
                {getT(TRANSLATION_KEYS.BUTTON_APPLY, appLanguage, defaultLang)}
              </Button>
            </div>
          )}
    </>
  );

  return (
    <div className="w-full" dir={resolvedDir}>
      {label && (
        <label
          htmlFor={id}
          className={getLabelClasses({ error: Boolean(error), required, disabled })}
        >
          {label}
        </label>
      )}
      {isSmOrNarrower ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
          <DrawerContent
            className="w-full max-w-full p-0 border-0 border-t rounded-t-xl shadow-lg border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90dvh] flex flex-col [&_[data-date-picker-calendar-row]]:self-center"
            dir={resolvedDir}
            style={{ backgroundColor: popoverBg }}
          >
            <DrawerTitle className="sr-only">
              {resolvedPlaceholder}
            </DrawerTitle>
            <div className="w-full flex flex-col overflow-hidden">
              {calendarContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent
            dir={resolvedDir}
            className="w-auto p-0 border rounded-xl shadow-lg border-gray-200 dark:border-gray-700 overflow-hidden"
            style={popoverContentStyle}
            align="start"
            sideOffset={4}
          >
            {calendarContent}
          </PopoverContent>
        </Popover>
      )}
      {error && (
        <p className={errorTextClasses} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

DatePickerCalendar.displayName = 'DatePickerCalendar';
