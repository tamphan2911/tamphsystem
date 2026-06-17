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
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import {
  ResearchIconButton,
  researchLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
  if (status === "SUBMITTED") return "text-[#A8DADC]";
  if (status === "IN_PROGRESS") return "text-[#B39CD0]";
  if (status === "ACCEPTED") return "text-[#FFC1CC]";
  if (status === "CANCELLED") return "text-rose-300";
  return "text-[#FFC1CC]";
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
        className={`inline-flex h-8 w-8 items-center justify-center transition-colors duration-150 ${className}`}
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
      <ResearchIconButton
        type="button"
        onClick={() => setOpen(true)}
        label={`Delete review for ${review.manuscriptTitle}`}
        tone="rose"
        className="h-8 w-8"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

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
          <span className="font-semibold text-[#E4E4E4]">
            {review.manuscriptTitle}
          </span>
        </p>
        <p className="text-[#B0B0B0]">
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
  const [query, setQuery] = usePersistentTableValue("reviews:q", "");
  const [status, setStatus] = usePersistentTableValue("reviews:status", "ALL");
  const [journal, setJournal] = usePersistentTableValue("reviews:journal", "ALL");

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

  const pagination = useTablePagination(filtered, 10, 1, "reviews");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    pagination.setPage(1);
  }

  function updateJournal(value: string) {
    setJournal(value);
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search reviews, journal, manuscript..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={status}
            onChange={updateStatus}
            ariaLabel="Filter by status"
            options={statuses.map((item) => ({
              value: item,
              label: item === "ALL" ? "All statuses" : statusLabel(item),
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
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="px-3 py-3">Manuscript</th>
              <th className="w-48 px-3 py-3">Journal</th>
              <th className="w-16 px-2 py-3 text-center">Status</th>
              <th className="w-24 px-3 py-3">Due</th>
              <th className="w-32 px-3 py-3">Recommendation</th>
              <th className="w-40 px-3 py-3">Note</th>
              {isAdmin && (
                <th className="w-14 px-2 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((row) => (
              <tr
                key={row.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
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
                        className={`text-sm ${researchLinkClass}`}
                      >
                        {row.manuscriptTitle}
                      </Link>
                      <p className="mt-1 text-xs text-[#B0B0B0]">
                        {row.manuscriptId ||
                          row.reviewRound ||
                          "No tracking code"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                  <Link
                    href={`/journals/${row.journalId}`}
                    className={`line-clamp-2 ${researchLinkClass}`}
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
                <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                  {row.dueDate || "-"}
                </td>
                <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                  {row.recommendation || "-"}
                </td>
                <td className="px-3 py-3 text-sm text-[#B0B0B0]">
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
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No academic reviews match the current filters."
                    detail="Try another manuscript, journal, status, or date filter."
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
