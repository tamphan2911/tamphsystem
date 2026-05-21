"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, BookOpen, Building2, Hash, ReceiptText, Search, StickyNote, Users } from "lucide-react";
import { FilterSelect, TablePagination, useTablePagination } from "../components/TableControls";

export type JournalRow = {
  id: string;
  name: string;
  issn: string;
  field: string;
  rank: string;
  publisher: string;
  apc: string;
  submissionFee: string;
  note: string;
  submissions: number;
  accounts: number;
  reviews: number;
};

const ranks = ["ALL", "Q1", "Q2", "Q3", "Q4", "Scopus", "ISI", "UNRANKED"];

function rankBadge(rank: string) {
  if (rank === "Q1") return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (rank === "Q2") return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (rank === "Q3") return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  if (rank === "Q4") return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  if (rank) return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700";
}

export function JournalsTable({ rows }: { rows: JournalRow[] }) {
  const [query, setQuery] = useState("");
  const [rank, setRank] = useState("ALL");
  const [field, setField] = useState("ALL");
  const [publisher, setPublisher] = useState("ALL");

  const fieldOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((row) => row.field).filter(Boolean))).sort()], [rows]);
  const publisherOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((row) => row.publisher).filter(Boolean))).sort()], [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowRank = row.rank || "UNRANKED";
      const matchesRank = rank === "ALL" || rowRank === rank;
      const matchesField = field === "ALL" || row.field === field;
      const matchesPublisher = publisher === "ALL" || row.publisher === publisher;
      const haystack = [row.name, row.issn, row.field, row.rank, row.publisher, row.apc, row.submissionFee, row.note]
        .join(" ")
        .toLowerCase();
      return matchesRank && matchesField && matchesPublisher && (!needle || haystack.includes(needle));
    });
  }, [field, publisher, query, rank, rows]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search journals, ISSN, publisher..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 dark:border-slate-700 dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={rank} onChange={setRank} ariaLabel="Filter by rank" options={ranks.map((item) => ({ value: item, label: item === "UNRANKED" ? "No rank" : item === "ALL" ? "All ranks" : item }))} />
          <FilterSelect value={field} onChange={setField} ariaLabel="Filter by field" options={fieldOptions.map((item) => ({ value: item, label: item === "ALL" ? "All fields" : item }))} />
          <FilterSelect value={publisher} onChange={setPublisher} ariaLabel="Filter by publisher" options={publisherOptions.map((item) => ({ value: item, label: item === "ALL" ? "All publishers" : item }))} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[78rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]"><BookOpen className="h-4 w-4" aria-label="Journal" /></th>
              <th className="px-4 py-3"><Hash className="h-4 w-4" aria-label="ISSN" /></th>
              <th className="px-4 py-3">Field</th>
              <th className="px-4 py-3"><BadgeCheck className="h-4 w-4" aria-label="Rank" /></th>
              <th className="px-4 py-3"><Building2 className="h-4 w-4" aria-label="Publisher" /></th>
              <th className="px-4 py-3"><ReceiptText className="h-4 w-4" aria-label="APC" /></th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3"><Users className="h-4 w-4" aria-label="Usage" /></th>
              <th className="px-4 py-3">Reviews</th>
              <th className="px-4 py-3"><StickyNote className="h-4 w-4" aria-label="Note" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((journal) => (
              <tr key={journal.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-slate-950 dark:text-white shadow-[1px_0_0_0_rgb(226,232,240)] dark:shadow-[1px_0_0_0_rgb(30,41,59)] transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                  <Link href={`/journals/${journal.id}`} className="hover:text-blue-600 dark:hover:text-blue-300">
                    {journal.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{journal.issn || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{journal.field || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${rankBadge(journal.rank)}`}>
                    {journal.rank || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{journal.publisher || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{journal.apc || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{journal.submissionFee || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{journal.submissions} / {journal.accounts}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{journal.reviews}</td>
                <td className="max-w-xs px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{journal.note || "-"}</td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  No journals match the current search.
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
