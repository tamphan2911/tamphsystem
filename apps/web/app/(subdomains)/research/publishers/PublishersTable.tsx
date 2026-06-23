"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, ExternalLink, Loader2, Trash2 } from "lucide-react";
import {
  IconHint,
  TablePagination,
  TableSearchInput,
  usePersistentTableValue,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { PublisherDialog } from "./PublisherDialog";

export type PublisherRow = {
  id: string;
  publisherCode: string;
  name: string;
  alias: string;
  country: string;
  website: string;
  note: string;
  usesSingleAccount: boolean;
  approvalStatus: string;
  publisherAccount: {
    id: string;
    username: string;
    password: string;
    email: string;
    note: string;
  } | null;
  journals: number;
  submissions: number;
  accounts: number;
};

function DeletePublisherButton({
  publisher,
  deleteAction,
}: {
  publisher: PublisherRow;
  deleteAction: (publisherId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useResearchToast();
  const router = useRouter();

  return (
    <>
      <IconHint label={`Delete ${publisher.name}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent text-rose-700 transition hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-800 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
          aria-label={`Delete ${publisher.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>
      <ResearchConfirmDialog
        open={open}
        title="Delete this publisher?"
        description={
          publisher.journals > 0 || publisher.accounts > 0
            ? `${publisher.name} is still connected to journals or publisher accounts.`
            : `This will remove ${publisher.name} from the publisher list.`
        }
        confirmLabel={deleting ? "Deleting..." : "Delete publisher"}
        isConfirming={deleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          if (publisher.journals > 0 || publisher.accounts > 0) {
            setOpen(false);
            toast.showError({
              title: "Publisher is still in use",
              detail:
                "Move or delete the associated journals and publisher accounts before deleting this publisher.",
            });
            return;
          }
          setDeleting(true);
          try {
            await deleteAction(publisher.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Publisher deleted",
              detail: `${publisher.name} was removed from the publisher list.`,
            });
          } catch (error) {
            toast.showError({
              title: "Publisher could not be deleted",
              detail:
                error instanceof Error
                  ? error.message
                  : "Remove associated journals before trying again.",
            });
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}

function ApprovePublisherButton({
  publisher,
  approveAction,
}: {
  publisher: PublisherRow;
  approveAction: (publisherId: string) => Promise<void>;
}) {
  const [approving, setApproving] = useState(false);
  const toast = useResearchToast();
  const router = useRouter();

  if (publisher.approvalStatus === "APPROVED") {
    return (
      <span className="inline-flex border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] uppercase text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-200">
        Approved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase text-amber-700 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-200">
        Pending
      </span>
      <IconHint label={`Approve ${publisher.name}`}>
        <button
          type="button"
          disabled={approving}
          onClick={async () => {
            setApproving(true);
            try {
              await approveAction(publisher.id);
              toast.showSuccess({
                title: "Publisher approved",
                detail: `${publisher.name} can now be used by approved journals.`,
              });
              router.refresh();
            } catch (error) {
              toast.showError({
                title: "Publisher could not be approved",
                detail:
                  error instanceof Error
                    ? error.message
                    : "Try again after checking the publisher details.",
              });
            } finally {
              setApproving(false);
            }
          }}
          className="research-allow-transform inline-flex h-5 w-5 items-center justify-center border-0 bg-transparent text-emerald-700 transition hover:-translate-y-0.5 hover:bg-transparent hover:text-emerald-800 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-300 dark:hover:text-emerald-200"
          aria-label={`Approve ${publisher.name}`}
        >
          {approving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </button>
      </IconHint>
    </span>
  );
}

export function PublishersTable({
  rows,
  approveAction,
  updateAction,
  deleteAction,
}: {
  rows: PublisherRow[];
  approveAction: (publisherId: string) => Promise<void>;
  updateAction: (publisherId: string, formData: FormData) => Promise<void>;
  deleteAction: (publisherId: string) => Promise<void>;
}) {
  const [query, setQuery] = usePersistentTableValue("publishers:q", "");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.publisherCode, row.name, row.website, row.note]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, rows]);
  const pagination = useTablePagination(filtered, 10, 1, "publishers");

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C]">
      <div className="border-b border-[#444444] py-3">
        <TableSearchInput
          value={query}
          onChange={(value) => {
            setQuery(value);
            pagination.setPage(1);
          }}
          placeholder="Search publisher, ID, website, or note..."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase text-[#B0B0B0]">
            <tr>
              <th className="w-[11%] px-4 py-3">Publisher ID</th>
              <th className="px-4 py-3">Publisher</th>
              <th className="w-[15%] px-3 py-3">Account policy</th>
              <th className="w-[11%] px-3 py-3 text-center">Status</th>
              <th className="w-[9%] px-3 py-3 text-center">Journals</th>
              <th className="w-[9%] px-3 py-3 text-center">Submits</th>
              <th className="w-[9%] px-3 py-3 text-center">Accounts</th>
              <th className="w-[6%] px-2 py-3 text-center">Web</th>
              <th className="w-[6%] px-2 py-3 text-center">Edit</th>
              <th className="w-[6%] px-2 py-3 text-center">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((publisher) => (
              <tr
                key={publisher.id}
                className="align-top transition-colors hover:bg-[#383838]"
              >
                <td className="px-4 py-3 font-mono text-xs text-[#777777]">
                  {publisher.publisherCode}
                </td>
                <td className="px-4 py-3">
                  <p className="whitespace-normal break-words text-base font-normal text-[#E4E4E4]">
                    {publisher.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#B0B0B0]">
                    {publisher.note || "No note"}
                  </p>
                </td>
                <td className="px-3 py-3 align-top text-xs text-[#B0B0B0]">
                  {publisher.usesSingleAccount
                    ? "One publisher account"
                    : "Separate journal accounts"}
                </td>
                <td className="px-3 py-3 text-center align-top">
                  <ApprovePublisherButton
                    publisher={publisher}
                    approveAction={approveAction}
                  />
                </td>
                <td className="px-3 py-3 text-center text-sm text-[#E4E4E4]">
                  <Link
                    href={`/journals?q=${encodeURIComponent(publisher.name)}`}
                    className="research-allow-transform inline-flex text-cyan-700 transition-[color,transform] hover:-translate-y-0.5 hover:text-cyan-800 active:translate-y-0 active:scale-95 dark:text-cyan-300 dark:hover:text-cyan-200"
                  >
                    {publisher.journals}
                  </Link>
                </td>
                <td className="px-3 py-3 text-center text-sm text-[#E4E4E4]">
                  {publisher.submissions}
                </td>
                <td className="px-3 py-3 text-center text-sm text-[#E4E4E4]">
                  <Link
                    href={`/accounts?q=${encodeURIComponent(publisher.name)}&scope=${publisher.usesSingleAccount ? "PUBLISHER" : "JOURNAL"}`}
                    className="research-allow-transform inline-flex text-violet-700 transition-[color,transform] hover:-translate-y-0.5 hover:text-violet-800 active:translate-y-0 active:scale-95 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    {publisher.accounts}
                  </Link>
                </td>
                <td className="px-2 py-3 text-center align-top">
                  {publisher.website ? (
                    <IconHint label="Open publisher website">
                      <Link
                        href={publisher.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center text-cyan-700 transition hover:-translate-y-0.5 hover:text-cyan-800 active:translate-y-0 active:scale-95 dark:text-cyan-300 dark:hover:text-cyan-200"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </IconHint>
                  ) : (
                    <Building2 className="mx-auto h-4 w-4 text-[#666666]" />
                  )}
                </td>
                <td className="px-2 py-3 text-center align-top">
                  <div className="flex items-start justify-center">
                    <PublisherDialog
                      mode="edit"
                      submitAction={updateAction.bind(null, publisher.id)}
                      initialValues={publisher}
                    />
                  </div>
                </td>
                <td className="px-2 py-3 text-center align-top">
                  <div className="flex items-start justify-center">
                    <DeletePublisherButton
                      publisher={publisher}
                      deleteAction={deleteAction}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {pagination.total === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No publishers match the current search."
                    detail="Try another publisher name, ID, website, or note."
                  />
                </td>
              </tr>
            ) : null}
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
