"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { ResearchIconButton, researchFieldClass } from "./ResearchPrimitives";

export type ResearchSearchPickerOption<T = unknown> = {
  id: string;
  label: string;
  description?: string;
  meta?: string;
  icon?: ReactNode;
  disabled?: boolean;
  data?: T;
};

export function ResearchSearchPicker<T = unknown>({
  label,
  name,
  selected,
  query,
  onQueryChange,
  onSelect,
  onClear,
  options,
  placeholder,
  emptyText = "No results match this search.",
  disabled = false,
  renderOption,
  renderSelected,
}: {
  label?: string;
  name?: string;
  selected: ResearchSearchPickerOption<T> | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (option: ResearchSearchPickerOption<T>) => void;
  onClear: () => void;
  options: ResearchSearchPickerOption<T>[];
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
  renderOption?: (
    option: ResearchSearchPickerOption<T>,
    isActive: boolean,
  ) => ReactNode;
  renderSelected?: (option: ResearchSearchPickerOption<T>) => ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const showDropdown = focused && query.trim().length > 0 && !disabled;

  const enabledOptions = useMemo(
    () => options.filter((option) => !option.disabled),
    [options],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, options.length]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFocused(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function choose(option: ResearchSearchPickerOption<T>) {
    if (option.disabled) return;
    onSelect(option);
    setFocused(false);
  }

  return (
    <div
      ref={wrapperRef}
      className="grid gap-1.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-200"
    >
      {label}
      {name && <input type="hidden" name={name} value={selected?.id ?? ""} />}
      <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-1 transition duration-200 ease-out focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:focus-within:bg-slate-900">
        {selected ? (
          <div className="flex min-h-10 items-center gap-2 rounded-lg bg-white px-2.5 shadow-sm shadow-slate-900/[0.02] dark:bg-slate-900">
            {renderSelected ? (
              renderSelected(selected)
            ) : (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {selected.label}
                </span>
                {(selected.description || selected.meta) && (
                  <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                    {selected.description || selected.meta}
                  </span>
                )}
              </span>
            )}
            {!disabled && (
              <ResearchIconButton
                type="button"
                onClick={onClear}
                label={`Remove ${label ?? "selection"}`}
                tone="rose"
                className="h-8 w-8 flex-none"
              >
                <X className="h-4 w-4" />
              </ResearchIconButton>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <input
              value={query}
              disabled={disabled}
              onChange={(event) => onQueryChange(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              onKeyDown={(event) => {
                if (!showDropdown) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((current) =>
                    Math.min(current + 1, Math.max(enabledOptions.length - 1, 0)),
                  );
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((current) => Math.max(current - 1, 0));
                }
                if (event.key === "Enter") {
                  const option = enabledOptions[activeIndex];
                  if (option) {
                    event.preventDefault();
                    choose(option);
                  }
                }
              }}
              placeholder={placeholder}
              className={`${researchFieldClass} h-10 border-transparent bg-white pl-9 dark:bg-slate-900`}
            />
          </div>
        )}

        {showDropdown && (
          <div className="research-dropdown-panel absolute left-0 right-0 top-full z-[160] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/[0.03] dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/35 dark:ring-white/[0.04]">
            <div className="max-h-72 overflow-y-auto pr-0.5" role="listbox">
              {options.length > 0 ? (
                options.map((option, index) => {
                  const isActive = index === activeIndex;
                  const isSelected = option.id === selected?.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(option)}
                      className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
                        isActive || isSelected
                          ? "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/45 dark:text-blue-200"
                          : "border-transparent text-slate-700 hover:translate-x-0.5 hover:bg-slate-50 hover:text-blue-700 motion-reduce:hover:translate-x-0 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-blue-200"
                      }`}
                    >
                      {renderOption ? (
                        renderOption(option, isActive)
                      ) : (
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {option.label}
                          </span>
                          {(option.description || option.meta) && (
                            <span className="block truncate text-xs font-medium opacity-70">
                              {option.description || option.meta}
                            </span>
                          )}
                        </span>
                      )}
                      {(isActive || isSelected) && (
                        <Check className="mt-0.5 h-4 w-4 flex-none" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
