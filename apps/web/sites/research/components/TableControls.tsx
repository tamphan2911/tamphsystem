"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  IconHint as PrimitiveIconHint,
  ResearchIconButton,
  cx,
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSearchFieldClass,
} from "./ResearchPrimitives";
import { FloatingDropdownPortal } from "./FloatingDropdownPortal";

export type FilterOption = {
  value: string;
  label: string;
};

export function IconHint({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <PrimitiveIconHint label={label} position="bottom">
      <span
        className={`inline-flex items-center justify-center align-middle ${className}`}
      >
        {children}
      </span>
    </PrimitiveIconHint>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label?: string;
  ariaLabel: string;
}) {
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
    <div ref={wrapperRef} className="relative w-full sm:w-52 lg:w-56">
      <span className="sr-only">{label ?? ariaLabel}</span>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cx(
          "research-filter-select-trigger group inline-flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-none border px-3 text-sm font-normal outline-none transition-colors duration-150 motion-reduce:transition-none",
          open
            ? "border-sky-200 bg-white text-slate-950 dark:border-[#5A5A5A] dark:bg-[#383838] dark:text-[#E4E4E4]"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:border-sky-400 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white dark:focus:border-[#5A5A5A]",
        )}
      >
        <span className="min-w-0 truncate text-left leading-5">
          {selected?.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-slate-500 transition duration-200 ease-out group-hover:text-sky-700 motion-reduce:transition-none dark:text-[#B0B0B0] dark:group-hover:text-[#A8DADC] ${open ? "rotate-180 text-sky-700 dark:text-[#A8DADC]" : ""}`}
          aria-hidden="true"
        />
      </button>

      <FloatingDropdownPortal anchorRef={wrapperRef} open={open} maxWidth={576}>
        <div className={`${researchDropdownPanelClass} w-full`}>
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
                    onChange(option.value);
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

export function TableSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full min-w-0 flex-1 lg:max-w-md">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-[#766f80]"
        aria-hidden="true"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${researchSearchFieldClass} h-10 py-2 pl-10`}
      />
    </div>
  );
}

export function useTablePagination<T>(
  rows: T[],
  pageSize = 10,
  initialPage = 1,
) {
  const [page, setPage] = useState(initialPage);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  return { page, setPage, pageCount, pagedRows, total: rows.length, pageSize };
}

export function TablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-transparent px-0 py-3 transition sm:flex-row sm:items-center sm:justify-between dark:border-[#333333] dark:bg-[#242424]">
      <p className="text-xs font-normal text-slate-500 dark:text-[#B0B0B0]">
        Showing{" "}
        <span className="text-slate-800 dark:text-[#E4E4E4]">
          {start}-{end}
        </span>{" "}
        of <span className="text-slate-800 dark:text-[#E4E4E4]">{total}</span>
      </p>
      <div className="flex overflow-hidden border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#2C2C2C]">
        <ResearchIconButton
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          label="Previous page"
          tone="slate"
          className="research-allow-transform !rounded-none border-0 shadow-none transition duration-180 ease-out hover:translate-y-0 hover:bg-transparent hover:text-[#1F7180] hover:shadow-none active:scale-95 disabled:active:scale-100 dark:hover:text-[#A8DADC]"
        >
          <ChevronLeft className="h-4 w-4" />
        </ResearchIconButton>
        <span className="border-x border-slate-200 px-3 py-2 text-xs font-normal text-slate-800 dark:border-[#444444] dark:text-[#E4E4E4]">
          {page} / {pageCount}
        </span>
        <ResearchIconButton
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          label="Next page"
          tone="slate"
          className="research-allow-transform !rounded-none border-0 shadow-none transition duration-180 ease-out hover:translate-y-0 hover:bg-transparent hover:text-[#1F7180] hover:shadow-none active:scale-95 disabled:active:scale-100 dark:hover:text-[#A8DADC]"
        >
          <ChevronRight className="h-4 w-4" />
        </ResearchIconButton>
      </div>
    </div>
  );
}
