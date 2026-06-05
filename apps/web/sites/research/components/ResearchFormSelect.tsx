"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { researchFieldClass } from "./ResearchPrimitives";
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
        className={`group inline-flex justify-between gap-3 text-left font-semibold ${researchFieldClass}`}
      >
        <span className="min-w-0 truncate text-left">{selected?.label}</span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-[#B0B0B0] transition duration-200 ease-out group-hover:text-[#E4E4E4] motion-reduce:transition-none ${open ? "rotate-180 text-[#E4E4E4]" : ""}`}
          aria-hidden="true"
        />
      </button>

      <FloatingDropdownPortal anchorRef={wrapperRef} open={open} maxWidth={480}>
        <div className="research-dropdown-panel w-max min-w-full overflow-hidden rounded-none border border-[#5A5A5A] bg-[#2C2C2C] shadow-2xl shadow-black/35">
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
                  className={`flex w-full items-start justify-between gap-3 rounded-none border-y px-3 py-2.5 text-left text-sm leading-5 transition duration-150 ease-out motion-reduce:transition-none ${
                    isSelected
                      ? "border-[#5A5A5A] bg-[#383838] font-normal text-[#E4E4E4]"
                      : "border-transparent text-[#B0B0B0] hover:border-[#5A5A5A] hover:bg-[#444444] hover:text-white"
                  }`}
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words">
                    {option.label}
                  </span>
                  {isSelected && (
                    <Check
                      className="mt-0.5 h-4 w-4 flex-none"
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
