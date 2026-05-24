"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { FilterSelect, IconHint, TablePagination, TableSearchInput, useTablePagination } from "../components/TableControls";

export type AccountRow = {
  id: string;
  username: string;
  password: string;
  email: string;
  note: string;
  journalId: string;
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
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput value={query} onChange={setQuery} placeholder="Search accounts, email, journal..." />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect value={scope} onChange={setScope} ariaLabel="Filter by scope" options={scopes.map((item) => ({ value: item, label: item === "ALL" ? "All scopes" : item === "PUBLISHER" ? "Publisher-wide" : "Journal-specific" }))} />
          <FilterSelect value={journal} onChange={setJournal} ariaLabel="Filter by journal" options={journalOptions.map((item) => ({ value: item, label: item === "ALL" ? "All journals" : item }))} />
          <FilterSelect value={publisher} onChange={setPublisher} ariaLabel="Filter by publisher" options={publisherOptions.map((item) => ({ value: item, label: item === "ALL" ? "All publishers" : item }))} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[72rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">Account login ID</th>
              <th className="px-4 py-3">Password</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Journal</th>
              <th className="px-4 py-3">Publisher</th>
              <th className="px-4 py-3">Submissions</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((account) => (
              <tr key={account.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                  <div className="flex items-center gap-2 text-sm font-normal text-slate-700 dark:text-slate-200">
                    <IconHint label="Account credential"><KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" /></IconHint>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                    >
                      {account.username}
                    </Link>
                  </div>
                  <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {account.id.slice(0, 8)}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-300">{account.password || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{account.email || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {account.journalId ? (
                    <Link href={`/journals/${account.journalId}`} className="font-medium text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300">
                      {account.journalName}
                    </Link>
                  ) : (
                    "Publisher-wide"
                  )}
                </td>
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
