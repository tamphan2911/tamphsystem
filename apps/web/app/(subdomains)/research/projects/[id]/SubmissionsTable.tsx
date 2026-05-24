"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Check,
  CircleDollarSign,
  Edit3,
  Landmark,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { deleteSubmission, updateSubmissionStatus } from "../../actions";
import { ResearchFormSelect } from "../../components/ResearchFormSelect";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../../components/TableControls";
import { useResearchToast } from "../../components/ResearchToast";
import { currencySymbol } from "../../lib/currency";

export type SubmissionRow = {
  id: string;
  code: string;
  kind: "journal" | "conference";
  venueId: string;
  venueName: string;
  metaLine: string;
  apc: string;
  apcCurrency: string;
  submissionFee: string;
  submissionFeeCurrency: string;
  account: string;
  status: string;
  submittedAt: string;
  acceptedAt: string;
  rejectedAt: string;
  publishedAt: string;
};

const statusOptions = [
  { value: "PENDING", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Reviewing" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PUBLISHED", label: "Published" },
];

const conferenceStatusOptions = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "PUBLISHED", label: "Published" },
];

function normalizedStatus(value: string) {
  if (value === "PENDING" || value === "SUBMITTED") return "SUBMITTED";
  if (value === "UNDER_REVIEW" || value === "REVISION" || value === "REVIEWING")
    return "REVIEWING";
  return value;
}

function statusLabel(value: string) {
  const normalized = normalizedStatus(value);
  if (normalized === "SUBMITTED") return "Submitted";
  if (normalized === "REVIEWING") return "Reviewing";
  return normalized
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badgeClass(value: string) {
  const normalized = normalizedStatus(value);
  if (normalized === "ACCEPTED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (normalized === "PUBLISHED")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (normalized === "REJECTED")
    return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  if (normalized === "REVIEWING")
    return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
  return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

function rowClass(value: string) {
  const normalized = normalizedStatus(value);
  if (normalized === "REJECTED")
    return "bg-slate-200/95 hover:bg-slate-200 dark:bg-slate-700/70 dark:hover:bg-slate-700/80";
  if (normalized === "ACCEPTED")
    return "bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30";
  if (normalized === "PUBLISHED")
    return "bg-blue-50/70 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30";
  return "hover:bg-slate-50 dark:hover:bg-slate-800/40";
}

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function dateInputValue(value: string) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function editableStatusOptions(row: SubmissionRow) {
  const options =
    row.kind === "journal" ? statusOptions : conferenceStatusOptions;
  const normalized = normalizedStatus(row.status);

  if (normalized === "PUBLISHED") {
    return options.filter(
      (option) => normalizedStatus(option.value) === "PUBLISHED",
    );
  }

  if (normalized === "ACCEPTED") {
    return options.filter((option) =>
      ["ACCEPTED", "PUBLISHED"].includes(normalizedStatus(option.value)),
    );
  }

  return options.filter(
    (option) => normalizedStatus(option.value) !== "PUBLISHED",
  );
}

function statusDate(row: SubmissionRow) {
  const normalized = normalizedStatus(row.status);
  if (normalized === "PUBLISHED")
    return row.publishedAt || row.acceptedAt || row.submittedAt;
  if (normalized === "ACCEPTED") return row.acceptedAt || row.submittedAt;
  if (normalized === "REJECTED") return row.rejectedAt || row.submittedAt;
  return row.submittedAt;
}

function MoneyCell({ amount, currency }: { amount: string; currency: string }) {
  if (!amount) return <span>-</span>;
  if (currency === "USD") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CircleDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
        {amount}
      </span>
    );
  }
  return (
    <span>
      {currencySymbol(currency)} {amount}
    </span>
  );
}

export function SubmissionsTable({
  rows,
  isAdmin,
  disabled = false,
  actionMode = isAdmin ? "edit" : "none",
}: {
  rows: SubmissionRow[];
  isAdmin: boolean;
  disabled?: boolean;
  actionMode?: "none" | "edit" | "delete";
}) {
  const router = useRouter();
  const hasAction = isAdmin && actionMode !== "none";
  const showStatusEdit = isAdmin && actionMode === "edit";
  const showDelete = isAdmin && actionMode === "delete";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [kind, setKind] = useState("ALL");
  const [editing, setEditing] = useState<SubmissionRow | null>(null);
  const [deleting, setDeleting] = useState<SubmissionRow | null>(null);
  const [acceptanceConfirmation, setAcceptanceConfirmation] =
    useState<FormData | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showSuccess, showError } = useResearchToast();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus =
        status === "ALL" || normalizedStatus(row.status) === status;
      const matchesKind = kind === "ALL" || row.kind === kind;
      const haystack = [
        row.venueName,
        row.code,
        row.metaLine,
        row.apc,
        row.submissionFee,
        row.account,
        row.status,
        row.kind,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesStatus && matchesKind && (!needle || haystack.includes(needle))
      );
    });
  }, [kind, query, rows, status]);

  const pagination = useTablePagination(filtered, 10);

  function persistStatus(formData: FormData, accepted = false) {
    startTransition(async () => {
      const result = await updateSubmissionStatus(formData);
      if (result && !result.ok) {
        showError({
          title: "Status not updated",
          detail: result.message,
        });
        return;
      }
      setEditing(null);
      setAcceptanceConfirmation(null);
      showSuccess({
        title: accepted ? "Submission accepted" : "Submission status updated",
        detail: accepted
          ? "The research content is now locked to protect title, authors, and project details."
          : "The status date and research stage signals have been refreshed.",
      });
      router.refresh();
    });
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const formData = new FormData(event.currentTarget);
    const nextStatus = String(formData.get("status") ?? "");
    const movesToAccepted =
      editing.kind === "journal" &&
      normalizedStatus(nextStatus) === "ACCEPTED" &&
      normalizedStatus(editing.status) !== "ACCEPTED" &&
      normalizedStatus(editing.status) !== "PUBLISHED";

    if (movesToAccepted) {
      setAcceptanceConfirmation(formData);
      return;
    }

    persistStatus(formData);
  }

  function confirmDelete() {
    if (!deleting) return;

    const formData = new FormData();
    formData.set("submissionId", deleting.id);
    formData.set("submissionKind", deleting.kind);

    startTransition(async () => {
      const result = await deleteSubmission(formData);
      if (result && !result.ok) {
        showError({
          title: "Submission not deleted",
          detail: result.message,
        });
        return;
      }
      setDeleting(null);
      showSuccess({
        title: "Submission deleted",
        detail:
          "The submission list and related research records have been refreshed.",
      });
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <TableSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search journal, conference, publisher, account..."
          />
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
            <FilterSelect
              value={status}
              onChange={setStatus}
              ariaLabel="Filter submissions by status"
              options={[
                { value: "ALL", label: "All status" },
                { value: "SUBMITTED", label: "Submitted" },
                { value: "REVIEWING", label: "Reviewing" },
                { value: "ACCEPTED", label: "Accepted" },
                { value: "REJECTED", label: "Rejected" },
                { value: "PUBLISHED", label: "Published" },
              ]}
            />
            <FilterSelect
              value={kind}
              onChange={setKind}
              ariaLabel="Filter by venue type"
              options={[
                { value: "ALL", label: "All venues" },
                { value: "journal", label: "Journals" },
                { value: "conference", label: "Conferences" },
              ]}
            />
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-[7%] px-4 py-3">ID</th>
                <th
                  className={`${hasAction ? "w-[29%]" : "w-[33%]"} px-4 py-3`}
                >
                  Journal / Conference
                </th>
                <th
                  className={`${hasAction ? "w-[18%]" : "w-[20%]"} px-4 py-3`}
                >
                  <span className="inline-flex items-center gap-2">
                    Status
                    {showStatusEdit && (
                      <IconHint label="Edit status from a row">
                        <Edit3
                          className="h-3.5 w-3.5 text-slate-400"
                          aria-hidden="true"
                        />
                      </IconHint>
                    )}
                  </span>
                </th>
                <th className="w-[11%] px-4 py-3">APC</th>
                <th className="w-[12%] px-4 py-3">Submission fee</th>
                <th
                  className={`${hasAction ? "w-[16%]" : "w-[17%]"} px-4 py-3`}
                >
                  Account
                </th>
                {hasAction && (
                  <th className="w-[7%] px-4 py-3 text-right">
                    {showDelete ? "Delete" : "Edit"}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagination.pagedRows.map((row) => (
                <tr
                  key={row.id}
                  className={`group align-top transition duration-200 ease-out ${rowClass(row.status)}`}
                >
                  <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {row.code}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={
                        row.kind === "journal"
                          ? `/journals/${row.venueId}`
                          : `/conferences/${row.venueId}`
                      }
                      className="flex min-w-0 items-start gap-3"
                    >
                      <IconHint
                        label={
                          row.kind === "journal" ? "Journal" : "Conference"
                        }
                      >
                        {row.kind === "journal" ? (
                          <BookOpen className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover:text-blue-600" />
                        ) : (
                          <Landmark className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover:text-blue-600" />
                        )}
                      </IconHint>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-700 group-hover:text-blue-600 dark:text-slate-100">
                          {row.venueName}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {row.metaLine || "-"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="grid gap-1.5">
                      <span
                        className={`w-fit rounded-full px-2 py-1 text-xs font-bold ring-1 ${badgeClass(row.status)}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                      {normalizedStatus(row.status) === "PUBLISHED" && (
                        <span className="text-[11px] font-medium text-blue-700/80 dark:text-blue-200/80">
                          published: {shortDate(row.publishedAt) || "-"}
                        </span>
                      )}
                      {(normalizedStatus(row.status) === "PUBLISHED" ||
                        normalizedStatus(row.status) === "ACCEPTED") && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          accepted: {shortDate(row.acceptedAt) || "-"}
                        </span>
                      )}
                      {normalizedStatus(row.status) === "REJECTED" &&
                        row.rejectedAt && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            rejected: {shortDate(row.rejectedAt)}
                          </span>
                        )}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        submitted: {shortDate(row.submittedAt) || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <MoneyCell amount={row.apc} currency={row.apcCurrency} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <MoneyCell
                      amount={row.submissionFee}
                      currency={row.submissionFeeCurrency}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {row.kind === "conference"
                      ? "Email / website"
                      : row.account || "Not recorded"}
                  </td>
                  {hasAction && (
                    <td className="px-4 py-3 text-right">
                      {showStatusEdit && (
                        <button
                          type="button"
                          disabled={disabled}
                          title={
                            disabled
                              ? "Research is locked. Unlock it before editing submission status."
                              : "Edit submission status"
                          }
                          onClick={() => setEditing(row)}
                          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:hover:shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/40"
                          aria-label={`Edit status for ${row.venueName}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      {showDelete && (
                        <button
                          type="button"
                          disabled={disabled}
                          title="Delete submission"
                          onClick={() => setDeleting(row)}
                          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
                          aria-label={`Delete submission for ${row.venueName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {pagination.total === 0 && (
                <tr>
                  <td
                    colSpan={hasAction ? 7 : 6}
                    className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No submissions match the current filters.
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

      {editing && (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <Edit3 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">
                    Edit submission status
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {editing.venueName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitStatus} className="grid gap-4 px-5 py-4">
              <input type="hidden" name="submissionId" value={editing.id} />
              <input type="hidden" name="submissionKind" value={editing.kind} />
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status
                </span>
                <ResearchFormSelect
                  name="status"
                  defaultValue={
                    editing.kind === "conference" &&
                    editing.status === "PLANNED"
                      ? "SUBMITTED"
                      : editing.status
                  }
                  options={editableStatusOptions(editing)}
                  ariaLabel="Submission status"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status date
                </span>
                <div className="group/date relative rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-slate-50 to-emerald-50 p-1.5 shadow-sm transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-blue-900/60 dark:from-blue-950/30 dark:via-slate-950 dark:to-emerald-950/20">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500 transition group-focus-within/date:text-blue-600 dark:text-blue-300" />
                  <input
                    name="statusDate"
                    type="date"
                    defaultValue={dateInputValue(statusDate(editing))}
                    className="w-full cursor-pointer rounded-lg border border-white/80 bg-white/85 py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition [color-scheme:light] hover:bg-white dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:[color-scheme:dark]"
                  />
                </div>
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                >
                  <Check className="h-4 w-4" />
                  Save status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {acceptanceConfirmation && editing && (
        <div className="fixed inset-0 z-[120] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/65 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl dark:border-amber-900/70 dark:bg-slate-900">
            <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-4 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">
                    Accept this submission?
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-amber-900 dark:text-amber-100">
                    Accepting this journal submission will lock the research
                    title, authors, and project details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAcceptanceConfirmation(null)}
                  className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-white/70 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close confirmation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 px-5 py-4 text-sm leading-5 text-slate-600 dark:text-slate-300">
              <p>
                After the status becomes accepted, it cannot be changed back to
                submitted, reviewing, or rejected.
              </p>
              <p>
                You can unlock the research content later from the lock icon in
                the accepted/published information box.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAcceptanceConfirmation(null)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => persistStatus(acceptanceConfirmation, true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-amber-700 disabled:cursor-wait disabled:opacity-70"
              >
                <Check className="h-4 w-4" />
                Accept and lock
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900/70 dark:bg-slate-900">
            <div className="border-b border-rose-100 bg-rose-50/70 px-5 py-4 dark:border-rose-900/60 dark:bg-rose-950/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-200">
                    <TriangleAlert className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-950 dark:text-white">
                      Delete this submission?
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-rose-900 dark:text-rose-100">
                      This will remove the submission record for{" "}
                      {deleting.venueName}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-white/80 hover:text-rose-700 hover:shadow-sm dark:text-rose-100 dark:hover:bg-rose-900/45 dark:hover:text-white dark:hover:ring-1 dark:hover:ring-rose-700/60"
                  aria-label="Close confirmation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid gap-2 px-5 py-4 text-sm leading-5 text-slate-600 dark:text-slate-300">
              <p>
                The submission ID, status history dates, and venue connection
                will be deleted from the system.
              </p>
              <p>This action cannot be undone from this screen.</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={confirmDelete}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70"
              >
                <Trash2 className="h-4 w-4" />
                Delete submission
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
