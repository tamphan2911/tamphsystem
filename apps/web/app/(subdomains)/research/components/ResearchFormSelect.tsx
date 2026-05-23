"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type ResearchFormSelectOption = {
  value: string;
  label: string;
};

export function ResearchFormSelect({
  name,
  defaultValue,
  options,
  ariaLabel,
  disabled = false,
  onValueChange,
}: {
  name: string;
  defaultValue: string;
  options: readonly ResearchFormSelectOption[];
  ariaLabel: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="group inline-flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 shadow-sm shadow-slate-900/[0.03] outline-none transition hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:shadow-black/10 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
      >
        <span className="min-w-0 truncate text-left">{selected?.label}</span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-slate-400 transition group-hover:text-slate-600 dark:group-hover:text-slate-300 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-48 overflow-hidden rounded-xl border border-blue-100 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-blue-50 dark:border-blue-900/60 dark:bg-slate-950 dark:shadow-black/35 dark:ring-blue-950/50">
          <div
            className="max-h-64 overflow-y-auto"
            role="listbox"
            aria-label={ariaLabel}
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setValue(option.value);
                    onValueChange?.(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "bg-blue-50 font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 flex-none" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
