"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowDownNarrowWide,
  ArrowDownUp,
  ArrowUpNarrowWide,
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

type SortDirection = "asc" | "desc";

export function parseMultiFilterValue(
  value: string,
  options: readonly string[],
) {
  if (!value || value === "ALL") return [];
  const valid = new Set(options.filter((option) => option !== "ALL"));
  return value.split(",").filter((option) => valid.has(option));
}

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

export function ResearchSortHeaderButton<TColumn extends string>({
  column,
  activeColumn,
  direction,
  onChange,
  hint,
  alphabetical = false,
}: {
  column: TColumn;
  activeColumn: TColumn | null;
  direction: SortDirection | null;
  onChange: (column: TColumn) => void;
  hint: string;
  alphabetical?: boolean;
}) {
  const active = activeColumn === column;
  const Icon =
    active && direction === "desc"
      ? ArrowDownNarrowWide
      : active && direction === "asc"
        ? alphabetical
          ? ArrowDownAZ
          : ArrowUpNarrowWide
        : ArrowDownUp;

  return (
    <IconHint label={hint}>
      <button
        type="button"
        aria-label={hint}
        aria-pressed={active}
        onClick={() => onChange(column)}
        className={`research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition-[color,filter,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${
          active
            ? "text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
            : "text-slate-500 hover:text-slate-900 dark:text-[#8F98A8] dark:hover:text-[#E4E4E4]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </IconHint>
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
    <div
      ref={wrapperRef}
      className="research-filter-select relative w-full sm:w-52 lg:w-56"
    >
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

export function MultiFilterSelect({
  values,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: FilterOption[];
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const specificOptions = options.filter((option) => option.value !== "ALL");
  const selectedLabels = specificOptions
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);
  const allLabel =
    options.find((option) => option.value === "ALL")?.label ?? "All";
  const triggerLabel =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

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
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggleValue(value: string) {
    if (value === "ALL") {
      onChange([]);
      return;
    }
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={cx(
        "research-filter-select relative w-full sm:w-52 lg:w-56",
        className,
      )}
    >
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
          {triggerLabel}
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
            aria-multiselectable="true"
          >
            {options.map((option) => {
              const selected =
                option.value === "ALL"
                  ? values.length === 0
                  : values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggleValue(option.value)}
                  className={`${researchDropdownItemClass} ${
                    selected
                      ? researchDropdownItemActiveClass
                      : researchDropdownItemIdleClass
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5 px-3">
                    <span
                      className={`inline-flex h-4 w-4 flex-none items-center justify-center border transition-colors ${
                        selected
                          ? "border-sky-600 bg-sky-600 text-white dark:border-[#A8DADC] dark:bg-[#A8DADC] dark:text-[#202020]"
                          : "border-slate-300 bg-white text-transparent dark:border-[#666666] dark:bg-[#202020]"
                      }`}
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="whitespace-normal break-words">
                      {option.label}
                    </span>
                  </span>
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
  storageKey?: string,
  options?: { preservePageWhenEmpty?: boolean },
) {
  const pathname = usePathname();
  const resolvedStorageKey = storageKey
    ? `research:${pathname}:${storageKey}:page`
    : `research:${pathname}:table:${pageSize}:page`;
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return initialPage;
    const stored = window.sessionStorage.getItem(resolvedStorageKey);
    const parsed = stored ? Number.parseInt(stored, 10) : initialPage;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : initialPage;
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    if (options?.preservePageWhenEmpty && rows.length === 0) return;
    setPage((current) => Math.min(current, pageCount));
  }, [options?.preservePageWhenEmpty, pageCount, rows.length]);

  useEffect(() => {
    window.sessionStorage.setItem(resolvedStorageKey, String(page));
  }, [page, resolvedStorageKey]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  return { page, setPage, pageCount, pagedRows, total: rows.length, pageSize };
}

export function usePersistentTableValue(
  key: string,
  defaultValue: string,
  options?: { persistDefaultValue?: boolean },
): readonly [string, Dispatch<SetStateAction<string>>];
export function usePersistentTableValue<T extends string>(
  key: string,
  defaultValue: T,
  options?: { persistDefaultValue?: boolean },
): readonly [T, Dispatch<SetStateAction<T>>];
export function usePersistentTableValue(
  key: string,
  defaultValue: string,
  options?: { persistDefaultValue?: boolean },
) {
  const pathname = usePathname();
  const storageKey = `research:${pathname}:${key}`;
  const [value, setValue] = useState<string>(() => {
    if (typeof window === "undefined") return defaultValue;
    return window.sessionStorage.getItem(storageKey) ?? defaultValue;
  });

  useEffect(() => {
    if (value === defaultValue) {
      if (options?.persistDefaultValue) {
        window.sessionStorage.setItem(storageKey, value);
        return;
      }
      window.sessionStorage.removeItem(storageKey);
      return;
    }
    window.sessionStorage.setItem(storageKey, value);
  }, [defaultValue, options?.persistDefaultValue, storageKey, value]);

  return [value, setValue] as const;
}

export function usePersistentMultiFilter(
  key: string,
  options: readonly string[],
) {
  const [storedValue, setStoredValue] = usePersistentTableValue(key, "ALL");
  const values = useMemo(
    () => parseMultiFilterValue(storedValue, options),
    [options, storedValue],
  );
  const setValues = useCallback(
    (nextValues: string[]) => {
      setStoredValue(nextValues.length > 0 ? nextValues.join(",") : "ALL");
    },
    [setStoredValue],
  );
  return [values, setValues] as const;
}

function paginationItems(page: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", pageCount] as const;
  }

  if (page >= pageCount - 3) {
    return [
      1,
      "ellipsis-left",
      pageCount - 4,
      pageCount - 3,
      pageCount - 2,
      pageCount - 1,
      pageCount,
    ] as const;
  }

  return [
    1,
    "ellipsis-left",
    page - 1,
    page,
    page + 1,
    "ellipsis-right",
    pageCount,
  ] as const;
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
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  if (pageCount <= 1) return null;

  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(total, currentPage * pageSize);
  const items = paginationItems(currentPage, pageCount);
  const pageButtonClass =
    "research-allow-transform inline-flex h-8 min-w-8 flex-none cursor-pointer items-center justify-center border-0 px-2.5 text-xs font-normal outline-none transition duration-180 ease-out focus-visible:relative focus-visible:z-10 focus-visible:ring-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100 motion-reduce:transition-none";
  const idlePageButtonClass =
    "bg-[#FFFDF8] text-[#596579] hover:bg-[#F2EEE6] hover:text-[#1F7180] focus-visible:ring-[#1F7180]/20 dark:bg-[#242424] dark:text-[#B0B0B0] dark:hover:bg-[#303030] dark:hover:text-[#A8DADC] dark:focus-visible:ring-[#A8DADC]/22";
  const activePageButtonClass =
    "bg-[#E5F3F4] text-[#155967] focus-visible:ring-[#1F7180]/24 dark:bg-[#17383E] dark:text-[#D8FBFF] dark:focus-visible:ring-[#A8DADC]/22";
  const edgeButtonClass =
    "research-allow-transform !h-8 !w-8 !rounded-none border-0 bg-[#FFFDF8] text-[#667085] shadow-none transition duration-180 ease-out hover:translate-y-0 hover:bg-[#F2EEE6] hover:text-[#1F7180] hover:shadow-none active:scale-95 disabled:active:scale-100 dark:bg-[#242424] dark:text-[#B0B0B0] dark:hover:bg-[#303030] dark:hover:text-[#A8DADC]";

  return (
    <div className="flex flex-col gap-3 border-t border-[#D8D0C2] bg-[#F8F6EF] px-3 py-3 transition lg:flex-row lg:items-center lg:justify-between dark:border-[#333333] dark:bg-[#242424]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-[#667085] dark:text-[#A0A0A0]">
        <p>
          Showing{" "}
          <span className="font-normal text-[#253047] dark:text-[#E4E4E4]">
            {start}-{end}
          </span>{" "}
          of{" "}
          <span className="font-normal text-[#253047] dark:text-[#E4E4E4]">
            {total}
          </span>
        </p>
        <span className="hidden h-3 w-px bg-[#D8D0C2] sm:inline-block dark:bg-[#444444]" />
        <p>
          Page{" "}
          <span className="font-normal text-[#253047] dark:text-[#E4E4E4]">
            {currentPage}
          </span>{" "}
          of{" "}
          <span className="font-normal text-[#253047] dark:text-[#E4E4E4]">
            {pageCount}
          </span>
        </p>
      </div>
      <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav
          aria-label="Table pagination"
          className="inline-flex min-w-max items-center gap-px border border-[#D8D0C2] bg-[#D8D0C2] p-px dark:border-[#444444] dark:bg-[#444444]"
        >
          <ResearchIconButton
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            label="Previous page"
            tone="slate"
            className={edgeButtonClass}
          >
            <ChevronLeft className="h-4 w-4" />
          </ResearchIconButton>
          {items.map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                aria-label={`Go to page ${item}`}
                aria-current={item === currentPage ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={cx(
                  pageButtonClass,
                  item === currentPage
                    ? activePageButtonClass
                    : idlePageButtonClass,
                )}
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                aria-hidden="true"
                className={cx(
                  "inline-flex h-8 min-w-8 flex-none items-center justify-center border-0 bg-[#FFFDF8] px-2 text-xs text-[#9AA3B2] dark:bg-[#242424] dark:text-[#777777]",
                )}
              >
                ...
              </span>
            ),
          )}
          <ResearchIconButton
            type="button"
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            label="Next page"
            tone="slate"
            className={edgeButtonClass}
          >
            <ChevronRight className="h-4 w-4" />
          </ResearchIconButton>
        </nav>
      </div>
    </div>
  );
}
