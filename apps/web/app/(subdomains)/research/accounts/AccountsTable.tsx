"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KeyRound, Send, Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { researchLinkClass } from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-none px-2 text-xs font-semibold ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
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
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-rose-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
          aria-label={`Delete ${account.username}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={open}
        title="Delete this account?"
        description="This will remove the publisher login record from Accounts."
        confirmLabel={isDeleting ? "Deleting..." : "Delete account"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
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
      >
        <p>
          Account:{" "}
          <span className="font-semibold text-[#E4E4E4]">
            {account.username}
          </span>
        </p>
        <p className="text-[#B0B0B0]">
          Existing submissions and tasks will stay in the system, but they will
          no longer point to this account.
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
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
  const [query, setQuery] = usePersistentTableValue("accounts:q", "");
  const [scope, setScope] = usePersistentTableValue("accounts:scope", "ALL");
  const [journal, setJournal] = usePersistentTableValue(
    "accounts:journal",
    "ALL",
  );
  const [publisher, setPublisher] = usePersistentTableValue(
    "accounts:publisher",
    "ALL",
  );

  const journalOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(rows.map((row) => row.journalName).filter(Boolean)),
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
      const rowScope = row.journalName ? "JOURNAL" : "PUBLISHER";
      const matchesScope = scope === "ALL" || rowScope === scope;
      const matchesJournal = journal === "ALL" || row.journalName === journal;
      const matchesPublisher =
        publisher === "ALL" || row.publisher === publisher;
      const haystack = [
        row.username,
        row.email,
        row.journalName,
        row.publisher,
        row.note,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesScope &&
        matchesJournal &&
        matchesPublisher &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [journal, publisher, query, rows, scope]);

  const pagination = useTablePagination(filtered, 10, 1, "accounts");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateScope(value: string) {
    setScope(value);
    pagination.setPage(1);
  }

  function updateJournal(value: string) {
    setJournal(value);
    pagination.setPage(1);
  }

  function updatePublisher(value: string) {
    setPublisher(value);
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search accounts, email, journal..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={scope}
            onChange={updateScope}
            ariaLabel="Filter by scope"
            options={scopes.map((item) => ({
              value: item,
              label:
                item === "ALL"
                  ? "All scopes"
                  : item === "PUBLISHER"
                    ? "Publisher-wide"
                    : "Journal-specific",
            }))}
          />
          <FilterSelect
            value={journal}
            onChange={updateJournal}
            ariaLabel="Filter by journal"
            options={journalOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All journals" : item,
            }))}
          />
          <FilterSelect
            value={publisher}
            onChange={updatePublisher}
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
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-40 px-3 py-3">Login ID</th>
              <th className="w-28 px-3 py-3">Password</th>
              <th className="w-40 px-3 py-3">Email</th>
              <th className="px-3 py-3">Journal</th>
              <th className="w-32 px-3 py-3">Publisher</th>
              <th className="w-12 px-2 py-3 text-center">
                <IconHint label="Submissions">
                  <Send className="mx-auto h-4 w-4 text-[#1F7180] dark:text-emerald-300" />
                </IconHint>
              </th>
              <th className="w-36 px-3 py-3">Note</th>
              {isAdmin && (
                <th className="w-12 px-2 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((account) => (
              <tr
                key={account.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
              >
                <td className="px-3 py-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-normal text-[#E4E4E4]">
                    <IconHint label="Account credential">
                      <KeyRound
                        className="h-4 w-4 text-slate-400"
                        aria-hidden="true"
                      />
                    </IconHint>
                    <Link
                      href={`/accounts/${account.id}`}
                      className={`truncate whitespace-nowrap ${researchLinkClass}`}
                    >
                      {account.username}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-sm text-[#B0B0B0]">
                  <span className="block truncate">
                    {account.password || "-"}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-[#B0B0B0]">
                  <span className="block truncate">{account.email || "-"}</span>
                </td>
                <td className="px-3 py-3 text-xs text-[#B0B0B0]">
                  {account.journalId ? (
                    <Link
                      href={`/journals/${account.journalId}`}
                      className={`line-clamp-2 ${researchLinkClass}`}
                    >
                      {account.journalName}
                    </Link>
                  ) : (
                    "Publisher-wide"
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-[#B0B0B0]">
                  <span className="block truncate">
                    {account.publisher || "-"}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <SubmitCount count={account.submissions} />
                </td>
                <td className="px-3 py-3 text-xs text-[#B0B0B0]">
                  <span className="line-clamp-2">{account.note || "-"}</span>
                </td>
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
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No accounts match the current search."
                    detail="Try another login ID, email, or journal keyword."
                  />
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
