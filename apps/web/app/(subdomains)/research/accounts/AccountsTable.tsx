"use client";

import { useMemo, useState } from "react";
import { AtSign, BookOpen, Building2, KeyRound, LockKeyhole, Search, Send, StickyNote, UserRound } from "lucide-react";
import { FilterSelect, TablePagination, useTablePagination } from "../components/TableControls";

export type AccountRow = {
  id: string;
  username: string;
  password: string;
  email: string;
  note: string;
  journalName: string;
  publisher: string;
  submissions: number;
};

const scopes = ["ALL", "PUBLISHER", "JOURNAL"];

export function AccountsTable({ rows }: { rows: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("ALL");
  const [journal, setJournal] = useState("ALL");
  const [publisher, setPublisher] = useState("ALL");

  const journalOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((row) => row.journalName).filter(Boolean))).sort()], [rows]);
  const publisherOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((row) => row.publisher).filter(Boolean))).sort()], [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const rowScope = row.journalName ? "JOURNAL" : "PUBLISHER";
      const matchesScope = scope === "ALL" || rowScope === scope;
      const matchesJournal = journal === "ALL" || row.journalName === journal;
      const matchesPublisher = publisher === "ALL" || row.publisher === publisher;
      const haystack = [row.username, row.email, row.journalName, row.publisher, row.note].join(" ").toLowerCase();
      return matchesScope && matchesJournal && matchesPublisher && (!needle || haystack.includes(needle));
    });
  }, [journal, publisher, query, rows, scope]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search accounts, email, journal..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 dark:border-slate-700 dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect value={scope} onChange={setScope} ariaLabel="Filter by scope" options={scopes.map((item) => ({ value: item, label: item === "ALL" ? "All scopes" : item === "PUBLISHER" ? "Publisher-wide" : "Journal-specific" }))} />
          <FilterSelect value={journal} onChange={setJournal} ariaLabel="Filter by journal" options={journalOptions.map((item) => ({ value: item, label: item === "ALL" ? "All journals" : item }))} />
          <FilterSelect value={publisher} onChange={setPublisher} ariaLabel="Filter by publisher" options={publisherOptions.map((item) => ({ value: item, label: item === "ALL" ? "All publishers" : item }))} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]"><UserRound className="h-4 w-4" aria-label="ID" /></th>
              <th className="px-4 py-3"><LockKeyhole className="h-4 w-4" aria-label="Password" /></th>
              <th className="px-4 py-3"><AtSign className="h-4 w-4" aria-label="Email" /></th>
              <th className="px-4 py-3"><BookOpen className="h-4 w-4" aria-label="Journal" /></th>
              <th className="px-4 py-3"><Building2 className="h-4 w-4" aria-label="Publisher" /></th>
              <th className="px-4 py-3"><Send className="h-4 w-4" aria-label="Submissions" /></th>
              <th className="px-4 py-3"><StickyNote className="h-4 w-4" aria-label="Note" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((account) => (
              <tr key={account.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                  <div className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                    <KeyRound className="h-4 w-4 text-slate-400" />
                    {account.username}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-300">{account.password || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{account.email || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{account.journalName || "Publisher-wide"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{account.publisher || "-"}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{account.submissions}</td>
                <td className="max-w-sm px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{account.note || "-"}</td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                  No accounts match the current search.
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
