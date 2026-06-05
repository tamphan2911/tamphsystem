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
          "group inline-flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-none border px-3 text-sm font-semibold outline-none transition-colors duration-150 motion-reduce:transition-none",
          open
            ? "border-[#5A5A5A] bg-[#383838] text-[#E4E4E4]"
            : "border-[#444444] bg-[#2C2C2C] text-[#E4E4E4] hover:border-[#5A5A5A] hover:bg-[#383838] hover:text-white focus:border-[#5A5A5A]",
        )}
      >
        <span className="min-w-0 truncate text-left leading-5">
          {selected?.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-[#B0B0B0] transition duration-200 ease-out group-hover:text-[#A8DADC] motion-reduce:transition-none ${open ? "rotate-180 text-[#A8DADC]" : ""}`}
          aria-hidden="true"
        />
      </button>

      <FloatingDropdownPortal anchorRef={wrapperRef} open={open} maxWidth={576}>
        <div className="research-dropdown-panel w-max min-w-full overflow-hidden rounded-none border border-[#5A5A5A] bg-[#2C2C2C] p-1 shadow-xl shadow-black/40">
          <div
            className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto pr-0.5"
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
                      ? "bg-[#383838] font-normal text-[#E4E4E4] ring-1 ring-[#5A5A5A]"
                      : "text-[#B0B0B0] hover:bg-[#444444] hover:text-white"
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
    <div className="flex flex-col gap-3 border-t border-[#444444] bg-[#2C2C2C] px-0 py-3 transition sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-normal text-[#B0B0B0]">
        Showing{" "}
        <span className="text-[#E4E4E4]">
          {start}-{end}
        </span>{" "}
        of <span className="text-[#E4E4E4]">{total}</span>
      </p>
      <div className="flex overflow-hidden border border-[#444444] bg-[#2C2C2C]">
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
        <span className="border-x border-[#444444] px-3 py-2 text-xs font-normal text-[#E4E4E4]">
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
