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

function parseManualDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const compactMatch = /^(\d{2})(\d{2})(\d{2}|\d{4})$/.exec(trimmed);
  const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(trimmed);
  const displayMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/.exec(
    trimmed,
  );
  const match = isoMatch ?? displayMatch ?? compactMatch;
  if (!match) return null;
  const yearPart = match[1] ?? "";
  const monthPart = match[2] ?? "";
  const dayOrYearPart = match[3] ?? "";

  const year = isoMatch
    ? Number(yearPart)
    : Number(dayOrYearPart.length === 2 ? `20${dayOrYearPart}` : dayOrYearPart);
  const month = Number(monthPart) - 1;
  const day = Number(isoMatch ? dayOrYearPart : yearPart);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return toDateValue(date);
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
  form,
  defaultValue,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "DD/MM/YY or YYYY-MM-DD",
  className,
}: {
  name: string;
  form?: string;
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
  const [manualText, setManualText] = useState(() =>
    selectedDate ? shortDateFormatter.format(selectedDate) : "",
  );

  useEffect(() => {
    if (open) {
      setVisibleMonth(
        startOfMonth(parseDateValue(selectedValue) ?? new Date()),
      );
    }
  }, [open, selectedValue]);

  useEffect(() => {
    if (selectedDate) {
      setManualText(shortDateFormatter.format(selectedDate));
    } else if (!selectedValue) {
      setManualText("");
    }
  }, [selectedDate, selectedValue]);

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

  function commitManualDate(nextText = manualText) {
    const parsed = parseManualDateValue(nextText);
    if (parsed === "") {
      setDateValue("");
      setManualText("");
      return;
    }
    if (!parsed) {
      setManualText(
        selectedDate ? shortDateFormatter.format(selectedDate) : "",
      );
      return;
    }
    setDateValue(parsed);
    const parsedDate = parseDateValue(parsed);
    setManualText(parsedDate ? shortDateFormatter.format(parsedDate) : "");
  }

  return (
    <div ref={anchorRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} form={form} />
      <div
        data-research-date-field="true"
        className={cx(
          researchFieldClass,
          className,
          "box-border flex h-12 min-h-12 w-full items-center justify-between gap-2 p-0 disabled:cursor-not-allowed",
          open &&
            "border-[#7FBFC5] bg-[#F8F6EF] dark:border-[#A8DADC] dark:bg-[#383838]",
        )}
      >
        <label className="flex min-w-0 flex-1 items-center gap-2 pl-3">
          <CalendarDays className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            value={manualText}
            disabled={disabled}
            required={required}
            onChange={(event) => {
              setManualText(event.target.value);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => commitManualDate()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitManualDate();
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            aria-label={`${placeholder}. You can type a date or choose from the calendar.`}
            className="h-10 min-w-0 flex-1 appearance-none bg-transparent text-sm font-normal text-[#1F2937] outline-none placeholder:text-[#8C95A4] disabled:cursor-not-allowed dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A]"
          />
        </label>
        {selectedValue && !required && !disabled ? (
          <button
            type="button"
            aria-label="Clear date"
            onClick={(event) => {
              event.stopPropagation();
              setDateValue("");
              setManualText("");
            }}
            className="inline-flex h-10 w-8 flex-none cursor-pointer items-center justify-center text-[#8C95A4] transition hover:text-[#1F2937] dark:text-[#777777] dark:hover:text-[#E4E4E4]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-10 w-8 flex-none" aria-hidden="true" />
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          aria-label="Open date picker"
          className="inline-flex h-10 w-9 flex-none cursor-pointer items-center justify-center text-[#667085] transition hover:text-[#1F7180] disabled:cursor-not-allowed dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
        >
          <ChevronDownIcon open={open} />
        </button>
      </div>

      <FloatingDropdownPortal
        anchorRef={anchorRef}
        open={open && !disabled}
        maxWidth={320}
        matchAnchorWidth={false}
        maxPanelHeight={360}
      >
        <div
          className={cx(
            researchDropdownPanelClass,
            "research-date-picker-panel w-[18rem] p-2",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-[#D8D0C2] bg-[#FFFDF8] text-[#667085] transition hover:border-[#7FBFC5] hover:bg-[#E6F4F2] hover:text-[#1F7180] dark:border-[#444444] dark:bg-[#242424] dark:text-[#B0B0B0] dark:hover:border-[#A8DADC] dark:hover:bg-[#383838] dark:hover:text-[#A8DADC]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-normal text-[#1F2937] dark:text-[#E4E4E4]">
                {monthLabelFormatter.format(visibleMonth)}
              </p>
              <button
                type="button"
                onClick={() => chooseDate(new Date())}
                className="mt-0.5 text-[11px] font-normal text-[#1F7180] transition hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
              >
                Today
              </button>
            </div>
            <button
              type="button"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center border border-[#D8D0C2] bg-[#FFFDF8] text-[#667085] transition hover:border-[#7FBFC5] hover:bg-[#E6F4F2] hover:text-[#1F7180] dark:border-[#444444] dark:bg-[#242424] dark:text-[#B0B0B0] dark:hover:border-[#A8DADC] dark:hover:bg-[#383838] dark:hover:text-[#A8DADC]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdayLabels.map((label) => (
              <span
                key={label}
                className="py-1 text-[11px] font-normal uppercase text-[#8C95A4] dark:text-[#777777]"
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
                    "relative flex h-8 cursor-pointer items-center justify-center border text-xs font-normal transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out hover:border-[#7FBFC5] hover:bg-[#E6F4F2] hover:text-[#1F2937] active:translate-y-0 motion-reduce:transition-none dark:hover:border-[#A8DADC] dark:hover:bg-[#303F3F] dark:hover:text-[#E4E4E4]",
                    inMonth
                      ? "border-[#E2D9CC] bg-[#FFFDF8] text-[#1F2937] dark:border-[#3A3A3A] dark:bg-[#242424] dark:text-[#E4E4E4]"
                      : "border-transparent bg-transparent text-[#A0A8B5] dark:text-[#666666]",
                    isToday &&
                      "border-[#7FBFC5] bg-[#E6F4F2] text-[#155864] shadow-[inset_0_0_0_1px_rgba(31,113,128,0.18),0_0_0_2px_rgba(127,191,197,0.16)] dark:border-[#A8DADC]/80 dark:bg-[#263636] dark:text-[#C9F0F2] dark:shadow-[inset_0_0_0_1px_rgba(168,218,220,0.22),0_0_0_2px_rgba(168,218,220,0.12)]",
                    selected &&
                      "border-[#B39CD0] bg-[#B39CD0] text-[#1F2937] shadow-lg shadow-[#B39CD0]/15 hover:border-[#A58BC8] hover:bg-[#C8B6E2] hover:text-[#1F2937] dark:text-[#242424] dark:hover:text-[#242424]",
                    selected &&
                      isToday &&
                      "ring-2 ring-[#1F7180]/20 dark:ring-[#A8DADC]/25",
                  )}
                >
                  <span className="relative z-10">{date.getDate()}</span>
                  {isToday && (
                    <span
                      className={cx(
                        "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 bg-[#1F7180] dark:bg-[#A8DADC]",
                        selected && "bg-[#1F2937] dark:bg-[#242424]",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </FloatingDropdownPortal>
    </div>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <ChevronRight
      className={cx(
        "h-4 w-4 rotate-90 transition duration-150",
        open && "-rotate-90 text-[#1F7180] dark:text-[#A8DADC]",
      )}
    />
  );
}
