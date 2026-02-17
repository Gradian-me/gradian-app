"use client";

import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { DayPicker as PersianDayPicker } from "react-day-picker/persian";
import type { DayButtonProps } from "react-day-picker";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

const defaultClassNames = getDefaultClassNames();

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
};

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: DayButtonProps) {
  const isSelectedSingle =
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle;
  const isToday = modifiers.today ?? false;
  const showTodayStyle = isToday && !isSelectedSingle && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle;

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      data-day={day.date.toISOString()}
      data-selected-single={isSelectedSingle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "aspect-square size-auto w-full min-w-0 font-normal text-sm rounded-md",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        "focus:!ring-0 focus:!border-0 focus-visible:!ring-0 focus-visible:!border-0",
        "data-[selected-single=true]:!rounded-md data-[selected-single=true]:!bg-violet-400 data-[selected-single=true]:text-white data-[selected-single=true]:!ring-0 data-[selected-single=true]:!border-0",
        "data-[selected-single=true]:hover:!bg-violet-500 data-[selected-single=true]:dark:!bg-violet-400 data-[selected-single=true]:dark:text-white data-[selected-single=true]:dark:hover:!bg-violet-500",
        "data-[range-middle=true]:bg-violet-50 data-[range-middle=true]:text-violet-900 dark:data-[range-middle=true]:bg-violet-900/30 dark:data-[range-middle=true]:text-violet-100",
        "data-[range-start=true]:!rounded-l-md data-[range-start=true]:!rounded-r-none data-[range-start=true]:!rounded-tl-md data-[range-start=true]:!rounded-bl-md data-[range-start=true]:!rounded-tr-none data-[range-start=true]:!rounded-br-none data-[range-start=true]:!bg-violet-400 data-[range-start=true]:text-white data-[range-start=true]:!ring-0 data-[range-start=true]:!border-0",
        "data-[range-start=true]:hover:!bg-violet-500 data-[range-start=true]:dark:!bg-violet-400 data-[range-start=true]:dark:text-white data-[range-start=true]:dark:hover:!bg-violet-500",
        "data-[range-end=true]:!rounded-r-md data-[range-end=true]:!rounded-l-none data-[range-end=true]:!rounded-tr-md data-[range-end=true]:!rounded-br-md data-[range-end=true]:!rounded-tl-none data-[range-end=true]:!rounded-bl-none data-[range-end=true]:!bg-violet-400 data-[range-end=true]:text-white data-[range-end=true]:!ring-0 data-[range-end=true]:!border-0",
        "data-[range-end=true]:hover:!bg-violet-500 data-[range-end=true]:dark:!bg-violet-400 data-[range-end=true]:dark:text-white data-[range-end=true]:dark:hover:!bg-violet-500",
        "data-[range-middle=true]:rounded-none",
        showTodayStyle &&
          "!rounded-md font-semibold text-violet-700 dark:text-violet-300 ring-2 ring-violet-300 dark:ring-violet-500 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/40",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  locale,
  dir,
  numberOfMonths = 1,
  dateLib,
  ...props
}: CalendarProps) {
  const isMultiMonth = numberOfMonths >= 2;
  const Picker = dateLib ? (PersianDayPicker as typeof DayPicker) : DayPicker;
  return (
    <Picker
      showOutsideDays={showOutsideDays}
      dir={dir}
      locale={locale}
      numberOfMonths={numberOfMonths}
      {...(dateLib && { dateLib, numerals: props.numerals ?? "arabext" })}
      className={cn(
        "rounded-lg !bg-white dark:!bg-gray-800 p-2 [--rdp-day-width:2.25rem] [--rdp-day-height:2.25rem] [--rdp-day_button-width:2.25rem] [--rdp-day_button-height:2.25rem] [--rdp-day_button-border-radius:0.375rem] [--rdp-selected-border:2px_solid_transparent]",
        "rtl:[.rdp-button_next>svg]:rotate-180",
        "rtl:[.rdp-button_previous>svg]:rotate-180",
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date, dateLibArg) =>
          dateLibArg
            ? dateLibArg.format(date, "LLLL", dateLibArg.options)
            : date.toLocaleString(locale?.code ?? "default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit !bg-white dark:!bg-gray-800 [--rdp-day_button-border-radius:0.375rem]", defaultClassNames.root),
        months: cn(
          "flex gap-1.5 relative",
          isMultiMonth ? "flex-row flex-nowrap" : "flex-col sm:flex-row",
          defaultClassNames.months
        ),
        month: cn(
          "flex flex-col gap-1",
          isMultiMonth ? "min-w-[12rem] flex-1" : "w-full",
          defaultClassNames.month
        ),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          defaultClassNames.button_previous,
          "relative z-10 size-7 rounded p-0 aria-disabled:opacity-50"
        ),
        button_next: cn(
          defaultClassNames.button_next,
          "relative z-10 size-7 rounded p-0 aria-disabled:opacity-50"
        ),
        month_caption: cn(
          "flex items-center justify-center h-8 w-full px-3 gap-2",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center justify-center gap-2 flex-wrap",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          defaultClassNames.dropdown_root,
          // Ensure strong contrast and readable text in both light and dark modes
          "relative flex items-center justify-between gap-1.5 min-h-8 min-w-[4.5rem] px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 shadow-sm cursor-pointer text-sm transition-colors hover:border-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus-within:outline-none focus-within:ring-0 focus-within:ring-offset-0 focus-within:border-violet-400 dark:focus-within:border-violet-500"
        ),
        dropdown: cn("absolute inset-0 opacity-0 cursor-pointer w-full", defaultClassNames.dropdown),
        caption_label: cn(
          defaultClassNames.caption_label,
          // Match dropdown trigger text for better readability in dark mode
          "select-none justify-between w-full font-medium text-sm text-gray-900 dark:text-gray-50 pointer-events-none"
        ),
        chevron: cn(
          defaultClassNames.chevron,
          "size-4 shrink-0 fill-transparent text-gray-500 dark:text-gray-400 pointer-events-none"
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded flex-1 font-normal text-xs select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-0.5", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-5",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-xs select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center aspect-square select-none",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md rounded-r-none bg-violet-400 text-white dark:bg-violet-400 dark:text-white !ring-0 !border-0",
          defaultClassNames.range_start
        ),
        range_middle: cn(
          "rounded-none bg-violet-50 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100",
          defaultClassNames.range_middle
        ),
        range_end: cn(
          "rounded-r-md rounded-l-none bg-violet-400 text-white dark:bg-violet-400 dark:text-white !ring-0 !border-0",
          defaultClassNames.range_end
        ),
        today: cn("rounded-md", defaultClassNames.today),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground opacity-75",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...rest }) => {
          const iconClass = cn("size-4 fill-transparent", chevronClassName);
          if (orientation === "left") {
            return <ChevronLeftIcon className={iconClass} {...rest} />;
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={iconClass} {...rest} />;
          }
          if (orientation === "down") {
            return <ChevronDownIcon className={iconClass} {...rest} />;
          }
          return (
            <ChevronDownIcon
              className={cn("size-4 rotate-180 fill-transparent", chevronClassName)}
              {...rest}
            />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...rest }) => (
          <td {...rest}>
            <div className="flex size-8 items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
