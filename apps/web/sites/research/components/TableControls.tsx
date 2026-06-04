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
          "group inline-flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-none border px-3 text-sm font-semibold outline-none transition-colors duration-150 focus:ring-2 motion-reduce:transition-none",
          open
            ? "border-[#ff8a3d] bg-[#fff1e9] text-[#8f350f] ring-[#ff8a3d]/20 dark:border-[#ff9f63] dark:bg-[#2a1812] dark:text-[#ffd3bb] dark:ring-[#ff8a3d]/20"
            : "border-[#d7d2ca] bg-[#fbfaf7] text-[#423b49] hover:border-[#ff8a3d] hover:bg-[#fff1e9] hover:text-[#8f350f] focus:border-[#ff8a3d] focus:ring-[#ff8a3d]/20 dark:border-[#3d3648] dark:bg-[#14101d] dark:text-[#eee8f5] dark:hover:border-[#ff9f63] dark:hover:bg-[#2a1812] dark:hover:text-[#ffd3bb] dark:focus:border-[#ff9f63] dark:focus:ring-[#ff8a3d]/20",
        )}
      >
        <span className="min-w-0 truncate text-left leading-5">
          {selected?.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-[#8b8392] transition duration-200 ease-out group-hover:text-[#ff8a3d] motion-reduce:transition-none dark:group-hover:text-[#ffd3bb] ${open ? "rotate-180 text-[#ff8a3d] dark:text-[#ffd3bb]" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="research-dropdown-panel absolute right-0 top-full z-50 mt-1.5 w-max min-w-full max-w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-none border border-[#ff8a3d] bg-[#fbfaf7] p-1 shadow-xl shadow-[#201c25]/14 dark:border-[#ff8a3d]/70 dark:bg-[#14101d] dark:shadow-black/40">
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
                  className={`flex w-full items-start justify-between gap-3 rounded-none px-3 py-2.5 text-left text-sm leading-5 transition-colors duration-150 motion-reduce:transition-none ${
                    isSelected
                      ? "bg-[#fff1e9] font-semibold text-[#8f350f] ring-1 ring-[#ffb38a] dark:bg-[#2a1812] dark:text-[#ffd3bb] dark:ring-[#ff8a3d]/50"
                      : "text-[#423b49] hover:bg-[#ff8a3d] hover:text-white dark:text-[#d7d1df] dark:hover:bg-[#ff8a3d] dark:hover:text-[#120b08]"
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
        className={`${researchFieldClass} h-10 !rounded-none py-2 pl-10`}
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
      <div className="flex overflow-hidden border border-[#d8d1c8] bg-white dark:border-[#403849] dark:bg-[#17131d]">
        <ResearchIconButton
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          label="Previous page"
          tone="slate"
          className="!rounded-none border-0 shadow-none hover:translate-y-0 hover:shadow-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </ResearchIconButton>
        <span className="border-x border-[#d8d1c8] px-3 py-2 text-xs font-black text-[#423b49] dark:border-[#403849] dark:text-[#d7d1df]">
          {page} / {pageCount}
        </span>
        <ResearchIconButton
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          label="Next page"
          tone="slate"
          className="!rounded-none border-0 shadow-none hover:translate-y-0 hover:shadow-none"
        >
          <ChevronRight className="h-4 w-4" />
        </ResearchIconButton>
      </div>
    </div>
  );
}
