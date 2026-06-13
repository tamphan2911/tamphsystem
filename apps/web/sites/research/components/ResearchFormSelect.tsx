"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  cx,
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSelectTriggerClass,
} from "./ResearchPrimitives";
import { FloatingDropdownPortal } from "./FloatingDropdownPortal";

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
  triggerClassName,
}: {
  name: string;
  defaultValue: string;
  options: readonly ResearchFormSelectOption[];
  ariaLabel: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  triggerClassName?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const isPlaceholder = !selected?.value;

  useEffect(() => {
    setValue(defaultValue);
    onValueChange?.(defaultValue);
  }, [defaultValue, onValueChange]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Element;
      if (
        !wrapperRef.current?.contains(event.target as Node) &&
        !target.closest(".research-dropdown-floating-panel")
      ) {
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
        className={cx(
          "group inline-flex cursor-pointer items-center justify-between gap-3 text-left",
          researchSelectTriggerClass,
          triggerClassName,
          open &&
            "border-sky-400 bg-white dark:border-[#5A5A5A] dark:bg-[#383838]",
        )}
      >
        <span
          className={`min-w-0 truncate text-left ${
            isPlaceholder
              ? "text-slate-400 dark:text-[#5A5A5A]"
              : "text-slate-800 dark:text-[#E4E4E4]"
          }`}
        >
          {selected?.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-slate-500 transition duration-200 ease-out group-hover:text-sky-700 motion-reduce:transition-none dark:text-[#B0B0B0] dark:group-hover:text-[#A8DADC] ${open ? "rotate-180 text-sky-700 dark:text-[#A8DADC]" : ""}`}
          aria-hidden="true"
        />
      </button>

      <FloatingDropdownPortal anchorRef={wrapperRef} open={open} maxWidth={480}>
        <div className={`${researchDropdownPanelClass} w-max min-w-full`}>
          <div
            className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto"
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
                  className={`${researchDropdownItemClass} ${
                    isSelected
                      ? researchDropdownItemActiveClass
                      : researchDropdownItemIdleClass
                  }`}
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words px-3">
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check
                      className="mr-3 mt-0.5 h-4 w-4 flex-none"
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
