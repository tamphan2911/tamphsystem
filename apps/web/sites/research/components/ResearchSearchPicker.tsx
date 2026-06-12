"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  IconHint,
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSearchFieldClass,
} from "./ResearchPrimitives";
import { FloatingDropdownPortal } from "./FloatingDropdownPortal";

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
  required = false,
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
  required?: boolean;
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
      {label ? (
        <span>
          {label}
          {required ? (
            <span className="research-required-mark">(*)</span>
          ) : null}
        </span>
      ) : null}
      {name && <input type="hidden" name={name} value={selected?.id ?? ""} />}
      <div className="relative">
        {selected ? (
          <div
            className={`${researchSearchFieldClass} flex h-auto min-h-12 items-center gap-2 px-2.5 py-1.5`}
          >
            {renderSelected ? (
              renderSelected(selected)
            ) : (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[#E4E4E4]">
                  {selected.label}
                </span>
                {(selected.description || selected.meta) && (
                  <span className="block truncate text-xs font-medium text-[#B0B0B0]">
                    {selected.description || selected.meta}
                  </span>
                )}
              </span>
            )}
            {!disabled && (
              <IconHint label={`Remove ${label ?? "selection"}`}>
                <button
                  type="button"
                  onClick={onClear}
                  aria-label={`Remove ${label ?? "selection"}`}
                  className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition duration-150 ease-out hover:text-[#A8DADC] focus-visible:text-[#A8DADC] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </IconHint>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition duration-200 ease-out ${
                focused || query.trim() ? "text-[#A8DADC]" : "text-[#5A5A5A]"
              }`}
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
                    Math.min(
                      current + 1,
                      Math.max(enabledOptions.length - 1, 0),
                    ),
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
              className={`${researchSearchFieldClass} h-12 pl-9`}
            />
          </div>
        )}

        <FloatingDropdownPortal
          anchorRef={wrapperRef}
          open={showDropdown}
          maxWidth={640}
          maxPanelHeight={240}
        >
          <div className={researchDropdownPanelClass}>
            <div
              className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto"
              role="listbox"
            >
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
                      className={`${researchDropdownItemClass} disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive || isSelected
                          ? researchDropdownItemActiveClass
                          : researchDropdownItemIdleClass
                      }`}
                    >
                      {renderOption ? (
                        renderOption(option, isActive)
                      ) : (
                        <span className="min-w-0 flex-1 px-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-normal">
                              {option.label}
                            </span>
                            {(option.description || option.meta) && (
                              <span className="block truncate text-xs font-medium opacity-70">
                                {option.description || option.meta}
                              </span>
                            )}
                          </span>
                        </span>
                      )}
                      {(isActive || isSelected) && (
                        <Check className="mr-3 mt-0.5 h-4 w-4 flex-none" />
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
        </FloatingDropdownPortal>
      </div>
    </div>
  );
}
