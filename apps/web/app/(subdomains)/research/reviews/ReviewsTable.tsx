"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Mail,
  PencilLine,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { ResearchConfirmDialog } from "../components/ResearchConfirmDialog";
import { useResearchToast } from "../components/ResearchToast";

export type ReviewRow = {
  id: string;
  journalId: string;
  journalName: string;
  publisher: string;
  manuscriptTitle: string;
  manuscriptId: string;
  status: string;
  recommendation: string;
  requestedAt: string;
  dueDate: string;
  completedAt: string;
  editorName: string;
  reviewRound: string;
  note: string;
};

const statuses = ["ALL", "ACCEPTED", "IN_PROGRESS", "SUBMITTED", "CANCELLED"];

function statusLabel(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  return status
    .toLowerCase()
    .replace("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (status === "SUBMITTED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (status === "IN_PROGRESS")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (status === "ACCEPTED")
    return "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900";
  if (status === "CANCELLED")
    return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function statusIcon(status: string) {
  if (status === "ACCEPTED") return CheckCircle2;
  if (status === "IN_PROGRESS") return PencilLine;
  if (status === "SUBMITTED") return Send;
  if (status === "CANCELLED") return XCircle;
  return Mail;
}

function StatusIconChip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <IconHint label={label}>
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function DeleteReviewButton({
  review,
  deleteAction,
}: {
  review: ReviewRow;
  deleteAction: (reviewId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label="Delete review">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete review for ${review.manuscriptTitle}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={open}
        title="Delete this review?"
        description="This will remove the academic review record from the system."
        confirmLabel={isDeleting ? "Deleting..." : "Delete review"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteAction(review.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Review deleted",
              detail: "The academic review has been removed.",
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete review",
              detail:
                error instanceof Error
                  ? error.message
                  : "The review was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          Manuscript:{" "}
          <span className="font-semibold text-slate-950 dark:text-white">
            {review.manuscriptTitle}
          </span>
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          Linked tasks will stay in the system, but they will no longer point to
          this review.
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function ReviewsTable({
  rows,
  isAdmin,
  deleteAction,
}: {
  rows: ReviewRow[];
  isAdmin: boolean;
  deleteAction: (reviewId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [journal, setJournal] = useState("ALL");

  const journalOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(rows.map((row) => row.journalName).filter(Boolean)),
      ).sort(),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;
      const matchesJournal = journal === "ALL" || row.journalName === journal;
      const haystack = [
        row.journalName,
        row.publisher,
        row.manuscriptTitle,
        row.manuscriptId,
        row.status,
        row.recommendation,
        row.editorName,
        row.reviewRound,
        row.note,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesStatus &&
        matchesJournal &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [journal, query, rows, status]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search reviews, journal, manuscript..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={status}
            onChange={setStatus}
            ariaLabel="Filter by status"
            options={statuses.map((item) => ({
              value: item,
              label: item === "ALL" ? "All statuses" : statusLabel(item),
            }))}
          />
          <FilterSelect
            value={journal}
            onChange={setJournal}
            ariaLabel="Filter by journal"
            options={journalOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All journals" : item,
            }))}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-3 py-3">Manuscript</th>
              <th className="w-48 px-3 py-3">Journal</th>
              <th className="w-16 px-2 py-3 text-center">Status</th>
              <th className="w-24 px-3 py-3">Due</th>
              <th className="w-32 px-3 py-3">Recommendation</th>
              <th className="w-40 px-3 py-3">Note</th>
              {isAdmin && (
                <th className="w-14 px-2 py-3 text-center">Delete</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((row) => (
              <tr
                key={row.id}
                className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-3 py-3">
                  <div className="flex items-start gap-3">
                    <IconHint label="Academic review">
                      <ClipboardCheck
                        className="mt-0.5 h-4 w-4 flex-none text-slate-400"
                        aria-hidden="true"
                      />
                    </IconHint>
                    <div>
                      <Link
                        href={`/reviews/${row.id}`}
                        className="text-sm font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                      >
                        {row.manuscriptTitle}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.manuscriptId ||
                          row.reviewRound ||
                          "No tracking code"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <Link
                    href={`/journals/${row.journalId}`}
                    className="line-clamp-2 font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                  >
                    {row.journalName}
                  </Link>
                  <p className="mt-1 text-xs text-slate-400">
                    {row.publisher || "-"}
                  </p>
                </td>
                <td className="px-2 py-3 text-center">
                  <StatusIconChip
                    icon={statusIcon(row.status)}
                    label={statusLabel(row.status)}
                    className={statusClass(row.status)}
                  />
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {row.dueDate || "-"}
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {row.recommendation || "-"}
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="line-clamp-2">{row.note || "-"}</span>
                </td>
                {isAdmin && (
                  <td className="px-2 py-3 text-center">
                    <DeleteReviewButton
                      review={row}
                      deleteAction={deleteAction}
                    />
                  </td>
                )}
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No academic reviews match the current filters.
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
