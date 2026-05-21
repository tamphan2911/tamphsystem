"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, Search, UserRound } from "lucide-react";

export type SubmissionRow = {
  id: string;
  journalId: string;
  journalName: string;
  publisher: string;
  rank: string;
  apc: string;
  account: string;
  status: string;
  submittedAt: string;
};

function badgeClass(value: string) {
  if (value === "ACCEPTED") return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (value === "REVISION") return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (value === "REJECTED" || value === "WITHDRAWN") return "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [rank, setRank] = useState("ALL");

  const rankOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((row) => row.rank).filter(Boolean))).sort()], [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;
      const matchesRank = rank === "ALL" || row.rank === rank;
      const haystack = [row.journalName, row.publisher, row.rank, row.apc, row.account, row.status].join(" ").toLowerCase();
      return matchesStatus && matchesRank && (!needle || haystack.includes(needle));
    });
  }, [query, rank, rows, status]);

  const selectClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search journal, publisher, account..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass} aria-label="Filter submissions by status">
            <option value="ALL">All status</option>
            <option value="PENDING">Pending</option>
            <option value="REVISION">Revision</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
          <select value={rank} onChange={(event) => setRank(event.target.value)} className={selectClass} aria-label="Filter submissions by rank">
            {rankOptions.map((item) => (
              <option key={item} value={item}>{item === "ALL" ? "All ranks" : item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">Journal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Publisher</th>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">APC</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3 text-right">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((row) => (
              <tr key={row.id} className="group transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                  <Link href={`/journals/${row.journalId}`} className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover:text-blue-600" />
                    <span>
                      <span className="block font-semibold text-slate-950 group-hover:text-blue-600 dark:text-white">{row.journalName}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Journal detail</span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${badgeClass(row.status)}`}>{row.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.publisher || "-"}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{row.rank || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.apc || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-slate-400" />
                    {row.account || "Not recorded"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.submittedAt}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/journals/${row.journalId}`} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300" title="Open journal">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  No submissions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
