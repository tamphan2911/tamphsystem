"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Send, Star } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { formatMoney } from "../lib/currency";

export type JournalRow = {
  id: string;
  name: string;
  issn: string;
  fields: string[];
  rank: string;
  publisher: string;
  apc: string;
  apcCurrency: string;
  submissionFee: string;
  submissionFeeCurrency: string;
  note: string;
  ongoingSubmissions: number;
  publishedSubmissions: number;
  reviews: number;
};

export function JournalsTable({ rows }: { rows: JournalRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [field, setField] = useState(() => searchParams.get("field") ?? "ALL");
  const [publisher, setPublisher] = useState(
    () => searchParams.get("publisher") ?? "ALL",
  );

  const fieldOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(rows.flatMap((row) => row.fields).filter(Boolean)),
      ).sort(),
    ],
    [rows],
  );
  const publisherOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(rows.map((row) => row.publisher).filter(Boolean)),
      ).sort(),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesField = field === "ALL" || row.fields.includes(field);
      const matchesPublisher =
        publisher === "ALL" || row.publisher === publisher;
      const haystack = [
        row.name,
        row.issn,
        row.fields.join(" "),
        row.rank,
        row.publisher,
        row.apc,
        row.submissionFee,
        row.note,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesField &&
        matchesPublisher &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [field, publisher, query, rows]);

  const initialPage = Number(searchParams.get("page") ?? "1");
  const pagination = useTablePagination(
    filtered,
    10,
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1,
  );
  const currentListPath = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (field !== "ALL") params.set("field", field);
    if (publisher !== "ALL") params.set("publisher", publisher);
    if (pagination.page > 1) params.set("page", String(pagination.page));
    return params.toString() ? `${pathname}?${params.toString()}` : pathname;
  }, [field, pagination.page, pathname, publisher, query]);

  useEffect(() => {
    router.replace(currentListPath, { scroll: false });
  }, [currentListPath, router]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search journals, ISSN, publisher..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={field}
            onChange={setField}
            ariaLabel="Filter by field"
            options={fieldOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All fields" : item,
            }))}
          />
          <FilterSelect
            value={publisher}
            onChange={setPublisher}
            ariaLabel="Filter by publisher"
            options={publisherOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All publishers" : item,
            }))}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="w-[38%] px-4 py-3">Journal</th>
              <th className="w-[22%] px-4 py-3">Field</th>
              <th className="w-[11%] px-4 py-3">APC</th>
              <th className="w-[11%] px-4 py-3">Fee</th>
              <th className="w-[6%] px-2 py-3 text-center">
                <IconHint label="Ongoing submissions">
                  <Send className="mx-auto h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                </IconHint>
              </th>
              <th className="w-[6%] px-2 py-3 text-center">
                <IconHint label="Accepted and published submissions">
                  <BadgeCheck className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                </IconHint>
              </th>
              <th className="w-[6%] px-2 py-3 text-center">
                <IconHint label="Reviews">
                  <Star className="mx-auto h-4 w-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                </IconHint>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((journal) => (
              <tr
                key={journal.id}
                className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/journals/${journal.id}?back=${encodeURIComponent(currentListPath)}`}
                    className="text-base font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                  >
                    {journal.name}
                  </Link>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {[
                      journal.publisher || "No publisher",
                      journal.issn ? `ISSN ${journal.issn}` : "No ISSN",
                      journal.rank || "No rank",
                    ].join(" - ")}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {journal.fields.length > 0 ? journal.fields.join("; ") : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {formatMoney(journal.apc, journal.apcCurrency)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {formatMoney(
                    journal.submissionFee,
                    journal.submissionFeeCurrency,
                  )}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {journal.ongoingSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {journal.publishedSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {journal.reviews}
                </td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No journals match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        total={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
      />
    </div>
  );
}
