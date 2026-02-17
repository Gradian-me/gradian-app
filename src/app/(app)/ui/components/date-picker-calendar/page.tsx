'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { DatePickerCalendar } from '@/gradian-ui/form-builder/form-elements';
import type { DateRange } from 'react-day-picker';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

/** Build the payload that would be sent in a POST request for each demo. */
function buildPostPayload(
  value: Date | DateRange | undefined,
  type: 'single' | 'single_time' | 'single_start_end' | 'range' | 'range_time'
): Record<string, unknown> {
  if (value == null) return { _note: 'No selection yet' };
  if (type === 'single' && value instanceof Date) {
    return { date: format(value, 'yyyy-MM-dd') };
  }
  if (type === 'single_time' && value instanceof Date) {
    return { dateTime: value.toISOString() };
  }
  if (type === 'single_start_end' && value instanceof Date) {
    return {
      date: format(value, 'yyyy-MM-dd'),
      timeStart: format(value, 'HH:mm'),
      timeEnd: format(value, 'HH:mm'),
    };
  }
  if (type === 'range' && value && typeof value === 'object' && 'from' in value) {
    const r = value as DateRange;
    return {
      from: r.from ? format(r.from, 'yyyy-MM-dd') : null,
      to: r.to ? format(r.to, 'yyyy-MM-dd') : null,
    };
  }
  if (type === 'range_time' && value && typeof value === 'object' && 'from' in value) {
    const r = value as DateRange;
    return {
      from: r.from ? r.from.toISOString() : null,
      to: r.to ? r.to.toISOString() : null,
    };
  }
  return { _note: 'Unexpected value' };
}
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { enUS } from 'react-day-picker/locale';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';

function PostPayloadBlock({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div dir="ltr" className="rounded-lg border border-gray-200 dark:border-gray-600 p-2.5 bg-gray-50/80 dark:bg-gray-900/40">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">POST body</p>
      <pre className="text-xs overflow-x-auto p-2 rounded bg-gray-100 dark:bg-gray-800 font-mono">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}

export default function DatePickerCalendarDemoPage() {
  useSetLayoutProps({
    title: 'DatePickerCalendar',
    subtitle: 'Shadcn-style date picker with single/range, time, presets, and more',
    icon: 'Calendar',
  });

  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [singleNoApply, setSingleNoApply] = useState<Date | undefined>(undefined);
  const [rangeValue, setRangeValue] = useState<DateRange | undefined>(undefined);
  const [singleWithTime, setSingleWithTime] = useState<Date | undefined>(undefined);
  const [singleWithStartEnd, setSingleWithStartEnd] = useState<Date | undefined>(undefined);
  const [rangeWithTime, setRangeWithTime] = useState<DateRange | undefined>(undefined);
  const [singleWithPresets, setSingleWithPresets] = useState<Date | undefined>(undefined);
  const [singleDisabledDays, setSingleDisabledDays] = useState<Date | undefined>(undefined);
  const [singleWeekNumbers, setSingleWeekNumbers] = useState<Date | undefined>(undefined);
  const [singleNoSelectors, setSingleNoSelectors] = useState<Date | undefined>(undefined);
  const [singleWithError, setSingleWithError] = useState<Date | undefined>(undefined);
  const [singleRequired, setSingleRequired] = useState<Date | undefined>(undefined);
  const [singleDisabled, setSingleDisabled] = useState<Date | undefined>(new Date());
  const [singleWeekdayHolidays, setSingleWeekdayHolidays] = useState<Date | undefined>(undefined);
  const [singleCustomHolidays, setSingleCustomHolidays] = useState<Date | undefined>(undefined);
  const [singleFirstDaySun, setSingleFirstDaySun] = useState<Date | undefined>(undefined);
  const [singleFirstDayMon, setSingleFirstDayMon] = useState<Date | undefined>(undefined);
  const [singleHolidaysOnly, setSingleHolidaysOnly] = useState<Date | undefined>(undefined);
  const [singleAllHolidays, setSingleAllHolidays] = useState<Date | undefined>(undefined);
  const [singleAllowChangeCalendar, setSingleAllowChangeCalendar] = useState<Date | undefined>(undefined);
  const [singleMinMax, setSingleMinMax] = useState<Date | undefined>(undefined);

  const tomorrow = addDays(new Date(), 1);
  const startOfCurrentMonth = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), []);
  const endOfCurrentYear = useMemo(() => new Date(new Date().getFullYear(), 11, 31), []);
  const disabledSampleDays = [tomorrow, addDays(new Date(), 3), addDays(new Date(), 5)];
  const customHolidayDates = useMemo(
    () => [addDays(new Date(), 5), addDays(new Date(), 12), addDays(new Date(), 20)],
    []
  );
  const fixedCustomHolidays = useMemo(
    () => [new Date(new Date().getFullYear(), 0, 1), new Date(new Date().getFullYear(), 11, 25)],
    []
  );

  const rangePresets = [
    { label: 'Today', translationKey: TRANSLATION_KEYS.DATE_PICKER_PRESET_TODAY, getValue: () => ({ from: new Date(), to: new Date() }) },
    { label: 'This week', translationKey: TRANSLATION_KEYS.DATE_PICKER_RANGE_PRESET_THIS_WEEK, getValue: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: 'Next 7 days', translationKey: TRANSLATION_KEYS.DATE_PICKER_RANGE_PRESET_NEXT_7_DAYS, getValue: () => ({ from: new Date(), to: addDays(new Date(), 6) }) },
  ];

  const onSingleChange = (setter: (d: Date | undefined) => void) => (value: Date | DateRange | undefined) =>
    setter(value instanceof Date ? value : undefined);
  const onRangeChange = (setter: (r: DateRange | undefined) => void) => (value: Date | DateRange | undefined) =>
    setter(value && typeof value === 'object' && 'from' in value ? value : undefined);

  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">DatePickerCalendar</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Calendar picker with single/range mode, optional Apply button, time inputs, presets, and disabled days.
          </p>
        </div>
        <Link
          href="/ui/components"
          className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <IconRenderer iconName="Layers" className="h-4 w-4" />
          All components
        </Link>
      </header>

      {/* 1. Single date, default (with Apply) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Single date (with Apply)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>mode="single"</code>, <code>showApply=true</code>. User selects a date and clicks Apply to confirm.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            dir="ltr"
            mode="single"
            showApply
            showSelectors
            value={singleDate}
            onChange={onSingleChange(setSingleDate)}
            placeholder="Pick a date"
            label="Select date"
          />
        </div>
        {singleDate && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleDate, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleDate, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  locale={enUS}
  dir="ltr"
  mode="single"
  showApply
  showSelectors
  value={singleDate}
  onChange={onSingleChange(setSingleDate)}
  placeholder="Pick a date"
  label="Select date"
/>`}
        />
      </section>

      {/* 2. Single date, no Apply (instant select) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Single date (no Apply – instant select)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>showApply=false</code>. Selecting a date applies immediately and closes the popover.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            showSelectors
            value={singleNoApply}
            onChange={onSingleChange(setSingleNoApply)}
            placeholder="Click to pick (no Apply)"
            label="Instant select"
          />
        </div>
        {singleNoApply && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleNoApply, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleNoApply, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="single"
  showApply={false}
  value={singleNoApply}
  onChange={onSingleChange(setSingleNoApply)}
  placeholder="Click to pick (no Apply)"
/>`}
        />
      </section>

      {/* 3. Range */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Date range</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>mode="range"</code>. Select from and to date. Two months on larger screens.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="range"
            showApply
            showSelectors
            value={rangeValue}
            onChange={onRangeChange(setRangeValue)}
            placeholder="Pick a range"
            label="Date range"
          />
        </div>
        {rangeValue?.from && (
          <p className="text-xs text-gray-500">
            From: <strong>{format(rangeValue.from, 'yyyy-MM-dd')}</strong>
            {rangeValue.to && (
              <>
                {' '}
                – To: <strong>{format(rangeValue.to, 'yyyy-MM-dd')}</strong>
              </>
            )}
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(rangeValue, 'range')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="range"
  showApply
  value={rangeValue}
  onChange={onRangeChange(setRangeValue)}
  placeholder="Pick a range"
  label="Date range"
/>`}
        />
      </section>

      {/* 3b. Allow change calendar (Gregorian / Persian) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Switch calendar (Gregorian / Persian)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>allowChangeCalendar=true</code>. A select at the top of the popover lets the user switch between Gregorian and Persian (Jalali) calendar.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply
            showSelectors
            allowChangeCalendar
            value={singleAllowChangeCalendar}
            onChange={onSingleChange(setSingleAllowChangeCalendar)}
            placeholder="Pick a date"
            label="Calendar (switchable)"
          />
        </div>
        {singleAllowChangeCalendar && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleAllowChangeCalendar, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleAllowChangeCalendar, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="single"
  showApply
  allowChangeCalendar
  value={singleAllowChangeCalendar}
  onChange={onSingleChange(setSingleAllowChangeCalendar)}
  placeholder="Pick a date"
  label="Calendar (switchable)"
/>`}
        />
      </section>

      {/* 3c. minDate / maxDate */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Min and max date</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>minDate</code> and <code>maxDate</code> limit navigation to that range, restrict the month/year dropdown, and disable days outside the range (e.g. days from adjacent months that appear in the grid).
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply
            showSelectors
            minDate={startOfCurrentMonth}
            maxDate={endOfCurrentYear}
            value={singleMinMax}
            onChange={onSingleChange(setSingleMinMax)}
            placeholder="Pick a date (this month – end of year)"
            label="minDate / maxDate"
          />
        </div>
        {singleMinMax && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleMinMax, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleMinMax, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const endOfCurrentYear = new Date(new Date().getFullYear(), 11, 31);

<DatePickerCalendar
  mode="single"
  showApply
  minDate={startOfCurrentMonth}
  maxDate={endOfCurrentYear}
  value={singleMinMax}
  onChange={onSingleChange(setSingleMinMax)}
  placeholder="Pick a date"
  label="minDate / maxDate"
/>`}
        />
      </section>

      {/* 4. Single with time */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Single date with time</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>timeInput=true</code>. One time input in the popover.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply
            timeInput={true}
            value={singleWithTime}
            onChange={onSingleChange(setSingleWithTime)}
            placeholder="Pick date and time"
            label="Date & time"
          />
        </div>
        {singleWithTime && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{singleWithTime.toLocaleString()}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleWithTime, 'single_time')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="single"
  showApply
  timeInput={true}
  value={singleWithTime}
  onChange={onSingleChange(setSingleWithTime)}
  placeholder="Pick date and time"
/>`}
        />
      </section>

      {/* 5. Single with start and end time */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Single with start and end</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>mode="single"</code> + <code>timeInput="startEnd"</code>. One date with start and end time inputs.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply
            timeInput="startEnd"
            value={singleWithStartEnd}
            onChange={onSingleChange(setSingleWithStartEnd)}
            placeholder="Pick date with start and end time"
            label="Single with start and end"
          />
        </div>
        {singleWithStartEnd && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{singleWithStartEnd.toLocaleString()}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleWithStartEnd, 'single_start_end')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="single"
  showApply
  timeInput="startEnd"
  value={singleWithStartEnd}
  onChange={onSingleChange(setSingleWithStartEnd)}
  placeholder="Pick date with start and end time"
  label="Single with start and end"
/>`}
        />
      </section>

      {/* 6. With presets */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">With presets</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>showPresets=true</code>. Quick options: Today, Tomorrow, In 3 days, etc.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply
            showPresets
            value={singleWithPresets}
            onChange={onSingleChange(setSingleWithPresets)}
            placeholder="Pick or use preset"
            label="With presets"
          />
        </div>
        {singleWithPresets && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleWithPresets, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleWithPresets, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="single"
  showApply
  showPresets
  value={singleWithPresets}
  onChange={onSingleChange(setSingleWithPresets)}
  placeholder="Pick or use preset"
/>`}
        />
      </section>

      {/* 7. Disabled days */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Disabled days</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>disabledDays=[...]</code>. Tomorrow and two other dates are disabled.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            disabledDays={disabledSampleDays}
            value={singleDisabledDays}
            onChange={onSingleChange(setSingleDisabledDays)}
            placeholder="Some dates disabled"
            label="Disabled days"
          />
        </div>
        <PostPayloadBlock payload={buildPostPayload(singleDisabledDays, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`const disabledSampleDays = [tomorrow, addDays(new Date(), 3), addDays(new Date(), 5)];

<DatePickerCalendar
  mode="single"
  showApply={false}
  disabledDays={disabledSampleDays}
  value={singleDisabledDays}
  onChange={onSingleChange(setSingleDisabledDays)}
/>`}
        />
      </section>

      {/* 8. Week numbers */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Week numbers</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>showWeekNumber=true</code>. Displays week number column.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            showWeekNumber
            value={singleWeekNumbers}
            onChange={onSingleChange(setSingleWeekNumbers)}
            placeholder="Calendar with week numbers"
            label="Week numbers"
          />
        </div>
        <PostPayloadBlock payload={buildPostPayload(singleWeekNumbers, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="single"
  showWeekNumber
  value={singleWeekNumbers}
  onChange={onSingleChange(setSingleWeekNumbers)}
/>`}
        />
      </section>

      {/* 9. No month/year selectors */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Without month/year selectors</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>showSelectors=false</code>. Only previous/next month arrows.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            showSelectors={false}
            value={singleNoSelectors}
            onChange={onSingleChange(setSingleNoSelectors)}
            placeholder="Arrow navigation only"
            label="No dropdowns"
          />
        </div>
        <PostPayloadBlock payload={buildPostPayload(singleNoSelectors, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  mode="single"
  showSelectors={false}
  value={singleNoSelectors}
  onChange={onSingleChange(setSingleNoSelectors)}
/>`}
        />
      </section>

      {/* 10. With error state */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Error state</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>error="Please select a date"</code>. Red border and message.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            value={singleWithError}
            onChange={onSingleChange(setSingleWithError)}
            placeholder="Shows error"
            label="Required field"
            error="Please select a date"
          />
        </div>
        <PostPayloadBlock payload={buildPostPayload(singleWithError, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  value={singleWithError}
  onChange={onSingleChange(setSingleWithError)}
  label="Required field"
  error="Please select a date"
/>`}
        />
      </section>

      {/* 11. Required */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Required</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>required=true</code>. Asterisk on label.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            value={singleRequired}
            onChange={onSingleChange(setSingleRequired)}
            placeholder="Required"
            label="Required date"
            required
          />
        </div>
        <PostPayloadBlock payload={buildPostPayload(singleRequired, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  value={singleRequired}
  onChange={onSingleChange(setSingleRequired)}
  label="Required date"
  required
/>`}
        />
      </section>

      {/* 12. Disabled */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Disabled</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>disabled=true</code>. Trigger is not clickable.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            value={singleDisabled}
            onChange={onSingleChange(setSingleDisabled)}
            placeholder="Disabled"
            label="Disabled picker"
            disabled
          />
        </div>
        <PostPayloadBlock payload={buildPostPayload(singleDisabled, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  value={singleDisabled}
  onChange={onSingleChange(setSingleDisabled)}
  label="Disabled picker"
  disabled
/>`}
        />
      </section>

      {/* 13. First day of week – Sunday vs Monday */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">First day of week</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>firstWeekDay</code> sets which weekday is the first column. Compare Sunday (<code>"sun"</code>) and Monday (<code>"mon"</code>) vs default Saturday (<code>"sat"</code>).
        </p>
        <div className="flex flex-wrap items-end gap-6">
          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Sunday first</span>
            <DatePickerCalendar
              locale={enUS}
              mode="single"
              showApply={false}
              firstWeekDay="sun"
              value={singleFirstDaySun}
              onChange={onSingleChange(setSingleFirstDaySun)}
              placeholder="Week starts Sun"
              label='firstWeekDay="sun"'
            />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Monday first</span>
            <DatePickerCalendar
              locale={enUS}
              mode="single"
              showApply={false}
              firstWeekDay="mon"
              value={singleFirstDayMon}
              onChange={onSingleChange(setSingleFirstDayMon)}
              placeholder="Week starts Mon"
              label='firstWeekDay="mon"'
            />
          </div>
        </div>
        <PostPayloadBlock
          payload={{
            'Sunday first': buildPostPayload(singleFirstDaySun, 'single'),
            'Monday first': buildPostPayload(singleFirstDayMon, 'single'),
          }}
        />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar firstWeekDay="sun" ... />
<DatePickerCalendar firstWeekDay="mon" ... />
// Also: "tue" | "wed" | "thu" | "fri" | "sat" (default)`}
        />
      </section>

      {/* 14. Weekday holidays only (Thu & Fri lighter) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Weekday holidays</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>showHolidays=true</code> and <code>holidayDays={['thu', 'fri']}</code>. Every Thursday and Friday are shown with lighter text (e.g. weekend in some regions).
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            showHolidays
            holidayDays={['thu', 'fri']}
            value={singleHolidaysOnly}
            onChange={onSingleChange(setSingleHolidaysOnly)}
            placeholder="Thu/Fri as holidays"
            label="Weekday holidays only"
          />
        </div>
        {singleHolidaysOnly && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleHolidaysOnly, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleHolidaysOnly, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  showHolidays
  holidayDays={['thu', 'fri']}
  value={singleHolidaysOnly}
  onChange={onSingleChange(setSingleHolidaysOnly)}
  placeholder="Thu/Fri as holidays"
/>`}
        />
      </section>

      {/* 15. First week day + holidays (Sat first, Thu/Fri lighter) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">First week day & weekday holidays</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>firstWeekDay="sat"</code> (default) with <code>showHolidays</code> and <code>holidayDays={['thu', 'fri']}</code>. Week starts on Saturday; Thu/Fri appear with lighter text.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            firstWeekDay="sat"
            showHolidays
            holidayDays={['thu', 'fri']}
            value={singleWeekdayHolidays}
            onChange={onSingleChange(setSingleWeekdayHolidays)}
            placeholder="Sat first, Thu/Fri holidays"
            label="Week & holidays"
          />
        </div>
        {singleWeekdayHolidays && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleWeekdayHolidays, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleWeekdayHolidays, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`<DatePickerCalendar
  firstWeekDay="sat"
  showHolidays
  holidayDays={['thu', 'fri']}
  value={singleWeekdayHolidays}
  onChange={onSingleChange(setSingleWeekdayHolidays)}
  placeholder="Sat first, Thu/Fri holidays"
/>`}
        />
      </section>

      {/* 16. Custom holiday dates (specific dates) */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Custom holiday dates</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>showHolidays=true</code> and <code>customHolidays</code> as an array of <code>Date</code> objects. Specific dates are shown with lighter text (e.g. in 5, 12, 20 days from today).
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            showHolidays
            customHolidays={customHolidayDates}
            value={singleCustomHolidays}
            onChange={onSingleChange(setSingleCustomHolidays)}
            placeholder="Some dates as custom holidays"
            label="Custom holidays"
          />
        </div>
        {singleCustomHolidays && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleCustomHolidays, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleCustomHolidays, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`const customHolidayDates = [addDays(new Date(), 5), addDays(new Date(), 12), addDays(new Date(), 20)];

<DatePickerCalendar
  showHolidays
  customHolidays={customHolidayDates}
  value={singleCustomHolidays}
  onChange={onSingleChange(setSingleCustomHolidays)}
  placeholder="Some dates as custom holidays"
/>`}
        />
      </section>

      {/* 17. All holiday options combined */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">All holiday options combined</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>firstWeekDay="sat"</code> + <code>showHolidays</code> + <code>holidayDays={['thu','fri']}</code> + <code>customHolidays</code> (e.g. New Year, Christmas). Weekday and fixed dates both show with lighter text.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="single"
            showApply={false}
            firstWeekDay="sat"
            showHolidays
            holidayDays={['thu', 'fri']}
            customHolidays={fixedCustomHolidays}
            value={singleAllHolidays}
            onChange={onSingleChange(setSingleAllHolidays)}
            placeholder="Sat + Thu/Fri + fixed dates"
            label="First day + weekday + custom holidays"
          />
        </div>
        {singleAllHolidays && (
          <p className="text-xs text-gray-500">
            Selected: <strong>{format(singleAllHolidays, 'yyyy-MM-dd')}</strong>
          </p>
        )}
        <PostPayloadBlock payload={buildPostPayload(singleAllHolidays, 'single')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`const fixedCustomHolidays = [
  new Date(new Date().getFullYear(), 0, 1),   // Jan 1
  new Date(new Date().getFullYear(), 11, 25), // Dec 25
];

<DatePickerCalendar
  firstWeekDay="sat"
  showHolidays
  holidayDays={['thu', 'fri']}
  customHolidays={fixedCustomHolidays}
  value={singleAllHolidays}
  onChange={onSingleChange(setSingleAllHolidays)}
  placeholder="Sat + Thu/Fri + fixed dates"
/>`}
        />
      </section>

      {/* 18. Range with custom presets */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Range with custom presets</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <code>mode="range"</code> + <code>showPresets</code> + custom <code>presets</code> (This week, Next 7 days).
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <DatePickerCalendar
            locale={enUS}
            mode="range"
            showApply
            showPresets
            presets={rangePresets}
            value={rangeValue}
            onChange={onRangeChange(setRangeValue)}
            placeholder="Range with presets"
            label="Custom range presets"
          />
        </div>
        <PostPayloadBlock payload={buildPostPayload(rangeValue, 'range')} />
        <CodeViewer
          title="Usage"
          programmingLanguage="tsx"
          code={`const rangePresets = [
  { label: 'This week', getValue: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
  { label: 'Next 7 days', getValue: () => ({ from: new Date(), to: addDays(new Date(), 6) }) },
];

<DatePickerCalendar
  mode="range"
  showApply
  showPresets
  presets={rangePresets}
  value={rangeValue}
  onChange={onRangeChange(setRangeValue)}
/>`}
        />
      </section>
    </div>
  );
}
