"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { FloatingDropdownPortal } from "./FloatingDropdownPortal";
import {
  cx,
  researchDropdownPanelClass,
  researchFieldClass,
} from "./ResearchPrimitives";

const weekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

function parseDateValue(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function sameDay(left: Date | null, right: Date | null) {
  return Boolean(
    left &&
    right &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate(),
  );
}

function calendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstVisibleDay = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - mondayOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    return new Date(
      firstVisibleDay.getFullYear(),
      firstVisibleDay.getMonth(),
      firstVisibleDay.getDate() + index,
    );
  });
}

export function ResearchDatePicker({
  name,
  defaultValue,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Choose date",
  className,
}: {
  name: string;
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectedValue = controlled ? (value ?? "") : internalValue;
  const selectedDate = parseDateValue(selectedValue);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate ?? new Date()),
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (open) setVisibleMonth(startOfMonth(selectedDate ?? new Date()));
  }, [open, selectedValue]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (anchorRef.current?.contains(target)) return;
      if (target.closest(".research-dropdown-floating-panel")) return;
      setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnOutsideClick);
    };
  }, []);

  function setDateValue(nextValue: string) {
    if (!controlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  function chooseDate(date: Date) {
    setDateValue(toDateValue(date));
    setOpen(false);
  }

  return (
    <div ref={anchorRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label={placeholder}
        className={cx(
          researchFieldClass,
          "flex cursor-pointer items-center justify-between gap-3 text-left disabled:cursor-not-allowed",
          open && "border-[#A8DADC] bg-[#383838]",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-4 w-4 flex-none text-[#A8DADC]" />
          <span
            className={cx(
              "truncate",
              selectedDate ? "text-[#E4E4E4]" : "text-[#777777]",
            )}
          >
            {selectedDate
              ? shortDateFormatter.format(selectedDate)
              : placeholder}
          </span>
        </span>
        {selectedValue && !required && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(event) => {
              event.stopPropagation();
              setDateValue("");
            }}
            className="inline-flex h-7 w-7 flex-none items-center justify-center text-[#777777] transition hover:text-[#E4E4E4]"
          >
            <X className="h-4 w-4" />
          </span>
        ) : null}
      </button>

      <FloatingDropdownPortal
        anchorRef={anchorRef}
        open={open && !disabled}
        maxWidth={320}
        matchAnchorWidth={false}
        maxPanelHeight={420}
      >
        <div className={cx(researchDropdownPanelClass, "w-[20rem] p-3")}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-[#444444] bg-[#242424] text-[#B0B0B0] transition hover:border-[#A8DADC] hover:bg-[#383838] hover:text-[#A8DADC]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-semibold text-[#E4E4E4]">
                {monthLabelFormatter.format(visibleMonth)}
              </p>
              <button
                type="button"
                onClick={() => chooseDate(new Date())}
                className="mt-0.5 text-xs font-normal text-[#A8DADC] transition hover:text-[#C9F0F2]"
              >
                Today
              </button>
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-[#444444] bg-[#242424] text-[#B0B0B0] transition hover:border-[#A8DADC] hover:bg-[#383838] hover:text-[#A8DADC]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdayLabels.map((label) => (
              <span
                key={label}
                className="py-1 text-[11px] font-semibold uppercase text-[#777777]"
              >
                {label}
              </span>
            ))}
            {days.map((date) => {
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              const selected = sameDay(date, selectedDate);
              const isToday = sameDay(date, today);
              return (
                <button
                  key={toDateValue(date)}
                  type="button"
                  onClick={() => chooseDate(date)}
                  className={cx(
                    "flex h-9 cursor-pointer items-center justify-center border text-sm font-normal transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-[#A8DADC] hover:bg-[#303F3F] hover:text-[#E4E4E4] active:translate-y-0 motion-reduce:transition-none",
                    inMonth
                      ? "border-[#3A3A3A] bg-[#242424] text-[#E4E4E4]"
                      : "border-transparent bg-transparent text-[#666666]",
                    isToday &&
                      "border-[#A8DADC]/70 text-[#A8DADC] shadow-[inset_0_0_0_1px_rgba(168,218,220,0.2)]",
                    selected &&
                      "border-[#B39CD0] bg-[#B39CD0] text-[#242424] shadow-lg shadow-[#B39CD0]/15 hover:border-[#C8B6E2] hover:bg-[#C8B6E2] hover:text-[#242424]",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </FloatingDropdownPortal>
    </div>
  );
}
