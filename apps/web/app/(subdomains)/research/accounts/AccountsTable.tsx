"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, KeyRound, Send, Trash2, X } from "lucide-react";
import { FilterSelect, IconHint, TablePagination, TableSearchInput, useTablePagination } from "../components/TableControls";
import { useResearchToast } from "../components/ResearchToast";

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

function SubmitCount({ count }: { count: number }) {
  const isZero = count === 0;
  const isHigh = count > 10;
  const label = isZero
    ? "No submissions yet"
    : isHigh
      ? `${count} submissions, high submission count`
      : `${count} submissions`;
  const className = isZero
    ? "bg-rose-50 text-rose-500 ring-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:ring-rose-900/70"
    : isHigh
      ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
      : "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";

  return (
    <IconHint label={label}>
      <span
        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-semibold ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
      >
        {count}
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function DeleteAccountButton({
  account,
  deleteAction,
}: {
  account: AccountRow;
  deleteAction: (accountId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label="Delete account">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${account.username}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      {open && (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900/70 dark:bg-slate-900">
            <div className="border-b border-rose-100 bg-rose-50/80 px-6 py-5 dark:border-rose-900/60 dark:bg-rose-950/25">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-800">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                      Delete this account?
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      This will remove the publisher login record from Accounts.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>
                Account:{" "}
                <span className="font-semibold text-slate-950 dark:text-white">
                  {account.username}
                </span>
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Existing submissions and tasks will stay in the system, but
                they will no longer point to this account.
              </p>
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                This action cannot be undone from this screen.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isDeleting}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteAction(account.id);
                    setOpen(false);
                    router.refresh();
                    toast.showSuccess({
                      title: "Account deleted",
                      detail: "The publisher account has been removed.",
                    });
                  } catch (error) {
                    toast.showError({
                      title: "Could not delete account",
                      detail:
                        error instanceof Error
                          ? error.message
                          : "The account was not removed. Please refresh the page and try again.",
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-rose-600"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AccountsTable({
  rows,
  isAdmin,
  deleteAction,
}: {
  rows: AccountRow[];
  isAdmin: boolean;
  deleteAction: (accountId: string) => Promise<void>;
}) {
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

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="w-40 px-3 py-3">Login ID</th>
              <th className="w-28 px-3 py-3">Password</th>
              <th className="w-40 px-3 py-3">Email</th>
              <th className="px-3 py-3">Journal</th>
              <th className="w-32 px-3 py-3">Publisher</th>
              <th className="w-12 px-2 py-3 text-center">
                <IconHint label="Submissions">
                  <Send className="mx-auto h-4 w-4 text-emerald-500" />
                </IconHint>
              </th>
              <th className="w-36 px-3 py-3">Note</th>
              {isAdmin && (
                <th className="w-12 px-2 py-3 text-center">Delete</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((account) => (
              <tr key={account.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-normal text-slate-700 dark:text-slate-200">
                    <IconHint label="Account credential"><KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" /></IconHint>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="truncate whitespace-nowrap font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                    >
                      {account.username}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-sm text-slate-600 dark:text-slate-300"><span className="block truncate">{account.password || "-"}</span></td>
                <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300"><span className="block truncate">{account.email || "-"}</span></td>
                <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">
                  {account.journalId ? (
                    <Link href={`/journals/${account.journalId}`} className="line-clamp-2 font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300">
                      {account.journalName}
                    </Link>
                  ) : (
                    "Publisher-wide"
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300"><span className="block truncate">{account.publisher || "-"}</span></td>
                <td className="px-2 py-3 text-center">
                  <SubmitCount count={account.submissions} />
                </td>
                <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300"><span className="line-clamp-2">{account.note || "-"}</span></td>
                {isAdmin && (
                  <td className="px-2 py-3 text-center">
                    <DeleteAccountButton
                      account={account}
                      deleteAction={deleteAction}
                    />
                  </td>
                )}
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
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
