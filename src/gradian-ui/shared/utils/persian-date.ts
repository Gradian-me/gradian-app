/**
 * Persian (Jalali) calendar date view.
 * Extends Date so it can be used like a normal Date; overrides getDay/getDate/getMonth/getYear
 * and toLocaleDateString to return Jalali values. Use for correct date display in the picker
 * and elsewhere when calendarLocale is fa-IR.
 *
 * Usage: same as Date. All standard Date capabilities (getHours, getMinutes, setTime, etc.) work.
 * For Jalali parts use: getYear(), getMonth(), getDate(), getMonthName(), getDayName().
 */

export class PersianDate extends Date {
  constructor(...args: ConstructorParameters<typeof Date>) {
    super(...args);
  }

  override toLocaleDateString(_locales?: string | string[], _options?: Intl.DateTimeFormatOptions): string {
    return super.toLocaleDateString('fa-IR-u-nu-latn');
  }

  /** Splits the Persian date string (e.g. "1399/2/23") into [year, month, day]. */
  getParts(): [string, string, string] {
    const parts = this.toLocaleDateString().split('/');
    return [parts[0] ?? '0', parts[1] ?? '0', parts[2] ?? '0'];
  }

  /** Weekday: 0 = Saturday (first day in Persian week), 1 = Sunday, ... 6 = Friday. */
  override getDay(): number {
    const js = super.getDay();
    return js === 6 ? 0 : js + 1;
  }

  /** Day of month in Jalali (1–31). */
  override getDate(): number {
    return Number(this.getParts()[2]) || 0;
  }

  /** Month in Jalali, 0-based (0 = Farvardin, 11 = Esfand). */
  override getMonth(): number {
    return (Number(this.getParts()[1]) || 1) - 1;
  }

  /** Year in Jalali (e.g. 1399). */
  override getFullYear(): number {
    return Number(this.getParts()[0]) || 0;
  }

  /** Alias for getFullYear() for clarity when using as Jalali. */
  getYear(): number {
    return this.getFullYear();
  }

  /** Full month name in Persian (e.g. "اردیبهشت"). */
  getMonthName(): string {
    return super.toLocaleDateString('fa-IR', { month: 'long' });
  }

  /** Full weekday name in Persian (e.g. "شنبه"). */
  getDayName(): string {
    return super.toLocaleDateString('fa-IR', { weekday: 'long' });
  }
}

/**
 * Returns a calendar-aware view of the date for the given locale.
 * When calendarLocale is 'fa-IR' (Jalali), returns a PersianDate so getYear/getMonth/getDate
 * and toLocaleDateString reflect the Persian calendar. Otherwise returns the same Date.
 * Use when displaying date parts or formatted strings so the picker shows correct dates for all locales.
 */
export function getDateForCalendar(date: Date, calendarLocale?: string | null): Date {
  if (!date || !(date instanceof Date)) return date;
  const locale = calendarLocale?.toLowerCase();
  if (locale === 'fa-ir' || locale === 'fa') return new PersianDate(date.getTime());
  return date;
}
