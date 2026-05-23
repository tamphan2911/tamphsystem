"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect, TablePagination, TableSearchInput, useTablePagination } from "../components/TableControls";

export type ConferenceRow = {
  id: string;
  name: string;
  type: string;
  time: string;
  location: string;
  organizer: string;
  theme: string;
  isbn: string;
};

const conferenceTypes = ["ALL", "International", "National"];

export function ConferencesTable({ rows }: { rows: ConferenceRow[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesType = type === "ALL" || row.type === type;
      const haystack = [row.name, row.type, row.time, row.location, row.organizer, row.theme, row.isbn].join(" ").toLowerCase();
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [query, rows, type]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput value={query} onChange={setQuery} placeholder="Search conference, organizer, theme, ISBN..." />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={type}
            onChange={setType}
            ariaLabel="Filter by conference type"
            options={conferenceTypes.map((item) => ({ value: item, label: item === "ALL" ? "All types" : item }))}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 w-[28rem] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">Conference</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Themes</th>
              <th className="px-4 py-3">ISBN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((conference) => (
              <tr key={conference.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                  <Link href={`/conferences/${conference.id}`} className="text-base font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300">
                    {conference.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {[conference.time, conference.location].filter(Boolean).join(" - ") || "Time/location not set"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Organizer: {conference.organizer || "Not set"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    {conference.type || "-"}
                  </span>
                </td>
                <td className="max-w-sm px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{conference.theme || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{conference.isbn || "-"}</td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  No conferences match the current search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination page={pagination.page} pageCount={pagination.pageCount} total={pagination.total} pageSize={pagination.pageSize} onPageChange={pagination.setPage} />
    </div>
  );
}

