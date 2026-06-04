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
  researchFieldClass,
} from "./ResearchPrimitives";

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
    <div ref={wrapperRef} className="relative w-full sm:w-52 lg:w-56">
      <span className="sr-only">{label ?? ariaLabel}</span>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cx(
          "group inline-flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-[2px] border px-3 text-sm font-semibold outline-none transition-colors duration-150 focus:ring-2 motion-reduce:transition-none",
          open
            ? "border-[#11604f] bg-[#eaf8f3] text-[#11604f] ring-[#89c7b7]/25 dark:border-[#4fb59d] dark:bg-[#12241f] dark:text-[#b7f3e2] dark:ring-[#4fb59d]/20"
            : "border-[#d7d2ca] bg-[#fbfaf7] text-[#423b49] hover:border-[#a9bfb6] hover:bg-[#f4f0e8] hover:text-[#11604f] focus:border-[#89c7b7] focus:ring-[#89c7b7]/20 dark:border-[#3d3648] dark:bg-[#14101d] dark:text-[#eee8f5] dark:hover:border-[#4fb59d] dark:hover:bg-[#1b1724] dark:hover:text-[#b7f3e2] dark:focus:border-[#4fb59d] dark:focus:ring-[#4fb59d]/18",
        )}
      >
        <span className="min-w-0 truncate text-left leading-5">
          {selected?.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-[#8b8392] transition duration-200 ease-out group-hover:text-[#2e9b83] motion-reduce:transition-none dark:group-hover:text-[#b7f3e2] ${open ? "rotate-180 text-[#2e9b83] dark:text-[#b7f3e2]" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="research-dropdown-panel absolute right-0 top-full z-50 mt-1.5 w-max min-w-full max-w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-[2px] border border-[#d7d2ca] bg-[#fbfaf7] p-1 shadow-xl shadow-[#201c25]/14 dark:border-[#3d3648] dark:bg-[#14101d] dark:shadow-black/40">
          <div
            className="max-h-80 overflow-y-auto pr-0.5"
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
                  className={`flex w-full items-start justify-between gap-3 rounded-[2px] px-3 py-2.5 text-left text-sm leading-5 transition-colors duration-150 motion-reduce:transition-none ${
                    isSelected
                      ? "bg-[#eaf8f3] font-semibold text-[#11604f] ring-1 ring-[#b9d5cb] dark:bg-[#12241f] dark:text-[#b7f3e2] dark:ring-[#2f6e60]"
                      : "text-[#423b49] hover:bg-[#f4f0e8] hover:text-[#11604f] dark:text-[#d7d1df] dark:hover:bg-[#211c2d] dark:hover:text-[#b7f3e2]"
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
      )}
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
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8392] dark:text-[#766f80]"
        aria-hidden="true"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${researchFieldClass} h-10 rounded-[2px] py-2 pl-10`}
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
    <div className="flex flex-col gap-3 border-t border-[#d7d2ca] bg-[#f1eee8] px-4 py-3 transition dark:border-[#3d3648] dark:bg-[#0d0915] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-[#655d6d] dark:text-[#aaa4b5]">
        Showing{" "}
        <span className="text-[#201c25] dark:text-white">
          {start}-{end}
        </span>{" "}
        of <span className="text-[#201c25] dark:text-white">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <ResearchIconButton
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          label="Previous page"
          tone="slate"
        >
          <ChevronLeft className="h-4 w-4" />
        </ResearchIconButton>
        <span className="rounded-[2px] border border-[#d8d1c8] bg-white px-3 py-2 text-xs font-black text-[#423b49] dark:border-[#403849] dark:bg-[#17131d] dark:text-[#d7d1df]">
          {page} / {pageCount}
        </span>
        <ResearchIconButton
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          label="Next page"
          tone="slate"
        >
          <ChevronRight className="h-4 w-4" />
        </ResearchIconButton>
      </div>
    </div>
  );
}
