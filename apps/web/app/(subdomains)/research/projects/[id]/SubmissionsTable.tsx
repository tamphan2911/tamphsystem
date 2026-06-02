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
  Ban,
  CalendarCheck2,
  CheckCircle2,
  CircleOff,
  FileCheck2,
  FileClock,
  FileSearch,
  Landmark,
  Send,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { deleteSubmission, updateSubmissionStatus } from "../../actions";
import { ResearchFormSelect } from "../../components/ResearchFormSelect";
import { ResearchConfirmDialog } from "../../components/ResearchConfirmDialog";
import { ResearchModal } from "../../components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
} from "../../components/ResearchPrimitives";
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
  accountId?: string;
  account: string;
  accountEmail?: string;
  submittedByName?: string;
  submittedById?: string;
  submittedByEmail?: string;
  status: string;
  submittedAt: string;
  acceptedAt: string;
  rejectedAt: string;
  withdrawnAt: string;
  publishedAt: string;
  projectId?: string;
  projectTitle?: string;
  projectAuthors?: string;
  projectStage?: string;
  projectClaimStatus?: string;
  projectRegisterStatus?: string;
  projectRegistration?: string;
  projectRegisterName?: string;
  canViewRegistrationClaim?: boolean;
};

const statusOptions = [
  { value: "PENDING", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Reviewing" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "WITHDRAWN", label: "Withdraw" },
  { value: "PUBLISHED", label: "Published" },
];

const conferenceStatusOptions = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "REVIEWING", label: "Reviewing" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "WITHDRAWN", label: "Withdraw" },
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
  if (normalized === "WITHDRAWN") return "Withdraw";
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
  if (normalized === "WITHDRAWN")
    return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
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
  if (normalized === "WITHDRAWN")
    return "bg-rose-50/65 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30";
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

  if (normalized === "WITHDRAWN") {
    return options.filter(
      (option) => normalizedStatus(option.value) === "WITHDRAWN",
    );
  }

  if (normalized === "PUBLISHED") {
    return options.filter(
      (option) =>
        normalizedStatus(option.value) === "PUBLISHED" ||
        normalizedStatus(option.value) === "WITHDRAWN",
    );
  }

  if (normalized === "ACCEPTED") {
    return options.filter((option) =>
      ["ACCEPTED", "PUBLISHED", "WITHDRAWN"].includes(
        normalizedStatus(option.value),
      ),
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
  if (normalized === "WITHDRAWN") return row.withdrawnAt || row.submittedAt;
  return row.submittedAt;
}

function canEditWhenResearchLocked(row: SubmissionRow) {
  const normalized = normalizedStatus(row.status);
  return normalized === "ACCEPTED" || normalized === "PUBLISHED";
}

function isWithdrawn(row: SubmissionRow) {
  return normalizedStatus(row.status) === "WITHDRAWN";
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

function claimLabel(claim: string) {
  if (claim === "CANNOT_CLAIM") return "Cannot claim";
  if (claim === "WAITING_PUBLISH") return "Waiting publish";
  if (claim === "MAKING_DOCUMENT") return "Making document";
  if (claim === "WAITING") return "Waiting";
  if (claim === "CLAIMED") return "Claimed";
  return claim.replace("_", " ");
}

function claimClass(claim: string) {
  if (claim === "CLAIMED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (claim === "WAITING")
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  if (claim === "WAITING_PUBLISH")
    return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
  if (claim === "MAKING_DOCUMENT")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  return "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function claimIcon(claim: string) {
  if (claim === "CLAIMED") return CheckCircle2;
  if (claim === "WAITING") return FileClock;
  if (claim === "WAITING_PUBLISH") return FileSearch;
  if (claim === "MAKING_DOCUMENT") return FileCheck2;
  if (claim === "CANNOT_CLAIM") return Ban;
  return CircleDollarSign;
}

function registrationLabel(status: string) {
  if (status === "APPROVED") return "Approved";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "PREPARING") return "Plan";
  return "Not registered";
}

function registrationClass(status: string) {
  if (status === "APPROVED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (status === "SUBMITTED")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (status === "PREPARING")
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  return "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:ring-rose-900/70";
}

function registrationIcon(status: string) {
  if (status === "APPROVED") return CalendarCheck2;
  if (status === "SUBMITTED") return Send;
  if (status === "PREPARING") return FileClock;
  return CircleOff;
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

function RegistrationCell({
  status,
  registration,
  registerName,
}: {
  status: string;
  registration: string;
  registerName: string;
}) {
  const Icon = registrationIcon(status);
  const label = registrationLabel(status);
  const detail = registration.trim();
  const showDetail = detail.length > 0;
  const registerLine =
    status !== "NOT_REGISTERED" && registerName.trim()
      ? `${label} - ${registerName.trim()}`
      : label;

  return (
    <div className="flex max-w-60 items-center gap-2">
      <IconHint label={registerLine}>
        <span
          className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${registrationClass(status)}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </IconHint>
      <div
        className={`min-w-0 ${showDetail ? "" : "flex min-h-8 items-center"}`}
      >
        {showDetail && (
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {detail}
          </p>
        )}
        <p
          className={`${showDetail ? "mt-0.5" : ""} text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500`}
        >
          {registerLine}
        </p>
      </div>
    </div>
  );
}

export function SubmissionsTable({
  rows,
  isAdmin,
  disabled = false,
  actionMode = isAdmin ? "edit" : "none",
  view = "venue",
  linkVenue = true,
  showSubmitter = false,
}: {
  rows: SubmissionRow[];
  isAdmin: boolean;
  disabled?: boolean;
  actionMode?: "none" | "edit" | "delete";
  view?: "venue" | "research";
  linkVenue?: boolean;
  showSubmitter?: boolean;
}) {
  const router = useRouter();
  const hasAction = isAdmin && actionMode !== "none";
  const isResearchView = view === "research";
  const showRegistrationClaim =
    !isResearchView || rows.some((row) => row.canViewRegistrationClaim);
  const showStatusEdit = isAdmin && actionMode === "edit";
  const showDelete = isAdmin && actionMode === "delete";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [kind, setKind] = useState("ALL");
  const [editing, setEditing] = useState<SubmissionRow | null>(null);
  const [deleting, setDeleting] = useState<SubmissionRow | null>(null);
  const [acceptanceConfirmation, setAcceptanceConfirmation] =
    useState<FormData | null>(null);
  const [withdrawalConfirmation, setWithdrawalConfirmation] =
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
        row.projectTitle,
        row.projectAuthors,
        row.projectStage,
        row.canViewRegistrationClaim ? row.projectClaimStatus : "",
        row.canViewRegistrationClaim ? row.projectRegisterStatus : "",
        row.canViewRegistrationClaim ? row.projectRegistration : "",
        row.canViewRegistrationClaim ? row.projectRegisterName : "",
        row.code,
        row.metaLine,
        row.apc,
        row.submissionFee,
        row.account,
        row.accountEmail,
        row.submittedByName,
        row.submittedByEmail,
        row.submittedById,
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

  function persistStatus(
    formData: FormData,
    tone: "default" | "accepted" | "withdrawn" = "default",
  ) {
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
      setWithdrawalConfirmation(null);
      showSuccess({
        title:
          tone === "accepted"
            ? "Submission accepted"
            : tone === "withdrawn"
              ? "Submission withdrawn"
              : "Submission status updated",
        detail:
          tone === "accepted"
            ? "The research content is now locked to protect title, authors, and project details."
            : tone === "withdrawn"
              ? "This submission is now locked and its status cannot be changed again."
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
    const movesToWithdrawn =
      normalizedStatus(nextStatus) === "WITHDRAWN" &&
      normalizedStatus(editing.status) !== "WITHDRAWN";

    if (movesToAccepted) {
      setAcceptanceConfirmation(formData);
      return;
    }

    if (movesToWithdrawn) {
      setWithdrawalConfirmation(formData);
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
            placeholder={
              isResearchView
                ? "Search research, authors, status..."
                : "Search journal, conference, publisher, account..."
            }
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
                { value: "WITHDRAWN", label: "Withdraw" },
                { value: "PUBLISHED", label: "Published" },
              ]}
            />
            {!isResearchView && (
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
            )}
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th
                  className={`${isResearchView ? "w-[8%]" : "w-[6%]"} px-4 py-3`}
                >
                  ID
                </th>
                <th
                  className={`${isResearchView ? "w-[42%]" : showSubmitter ? "w-[31%]" : hasAction ? "w-[29%]" : "w-[33%]"} px-4 py-3`}
                >
                  {isResearchView
                    ? "Research Associated"
                    : "Journal / Conference"}
                </th>
                <th
                  className={`${isResearchView ? "w-[15%]" : "w-[13%]"} px-4 py-3`}
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
                {isResearchView ? (
                  <>
                    {showRegistrationClaim && (
                      <>
                        <th className="w-[10%] px-4 py-3">Research claim</th>
                        <th className="w-[18%] px-4 py-3">Registration</th>
                      </>
                    )}
                    <th className="w-[12%] px-4 py-3">Account</th>
                  </>
                ) : (
                  <>
                    {showSubmitter && (
                      <th className="w-[13%] px-4 py-3">Submitted by</th>
                    )}
                    <th className="w-[8%] px-4 py-3">APC</th>
                    <th className="w-[8%] px-4 py-3">Fee</th>
                    <th
                      className={`${hasAction ? "w-[12%]" : "w-[14%]"} px-4 py-3`}
                    >
                      Account
                    </th>
                  </>
                )}
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
                  <td className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {row.code}
                  </td>
                  <td className="px-4 py-3">
                    {linkVenue ? (
                      <Link
                        href={
                          isResearchView
                            ? `/projects/${row.projectId}`
                            : row.kind === "journal"
                              ? `/journals/${row.venueId}`
                              : `/conferences/${row.venueId}`
                        }
                        className="group/link flex min-w-0 items-start gap-3"
                      >
                        {!isResearchView && (
                          <IconHint
                            label={
                              row.kind === "journal" ? "Journal" : "Conference"
                            }
                          >
                            {row.kind === "journal" ? (
                              <BookOpen className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover/link:text-blue-600" />
                            ) : (
                              <Landmark className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover/link:text-blue-600" />
                            )}
                          </IconHint>
                        )}
                        <span className="min-w-0">
                          <span
                            className={`${isResearchView ? "text-lg" : "text-base"} block truncate font-normal text-slate-700 transition group-hover/link:text-blue-600 dark:text-slate-100 dark:group-hover/link:text-blue-300`}
                          >
                            {isResearchView ? row.projectTitle : row.venueName}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {isResearchView
                              ? row.projectAuthors || "-"
                              : row.metaLine || "-"}
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 items-start gap-3">
                        {!isResearchView && (
                          <IconHint
                            label={
                              row.kind === "journal" ? "Journal" : "Conference"
                            }
                          >
                            {row.kind === "journal" ? (
                              <BookOpen className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover/link:text-blue-600" />
                            ) : (
                              <Landmark className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover/link:text-blue-600" />
                            )}
                          </IconHint>
                        )}
                        <span className="min-w-0">
                          <span
                            className={`${isResearchView ? "text-lg" : "text-base"} block truncate font-normal text-slate-700 transition group-hover/link:text-blue-600 dark:text-slate-100 dark:group-hover/link:text-blue-300`}
                          >
                            {isResearchView ? row.projectTitle : row.venueName}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {isResearchView
                              ? row.projectAuthors || "-"
                              : row.metaLine || "-"}
                          </span>
                        </span>
                      </div>
                    )}
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
                      {normalizedStatus(row.status) === "WITHDRAWN" && (
                        <span className="text-[11px] font-medium text-rose-700/80 dark:text-rose-200/80">
                          withdrawn: {shortDate(row.withdrawnAt) || "-"}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        submitted: {shortDate(row.submittedAt) || "-"}
                      </span>
                    </div>
                  </td>
                  {isResearchView ? (
                    <>
                      {showRegistrationClaim && (
                        <>
                          <td className="px-4 py-3">
                            {row.canViewRegistrationClaim ? (
                              <StatusIconChip
                                icon={claimIcon(row.projectClaimStatus || "")}
                                label={claimLabel(row.projectClaimStatus || "")}
                                className={claimClass(
                                  row.projectClaimStatus || "",
                                )}
                              />
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.canViewRegistrationClaim ? (
                              <RegistrationCell
                                status={
                                  row.projectRegisterStatus || "NOT_REGISTERED"
                                }
                                registration={row.projectRegistration || ""}
                                registerName={row.projectRegisterName || ""}
                              />
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {row.accountId ? (
                          <Link
                            href={`/accounts/${row.accountId}`}
                            className="group/account block min-w-0"
                          >
                            <span className="block truncate font-semibold text-slate-700 transition group-hover/account:text-blue-600 dark:text-slate-200 dark:group-hover/account:text-blue-300">
                              {row.account || "No login ID"}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                              {row.accountEmail || "No email"}
                            </span>
                          </Link>
                        ) : (
                          "Not recorded"
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      {showSubmitter && (
                        <td className="px-4 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          <p className="truncate text-slate-700 dark:text-slate-200">
                            {row.submittedByName || "Not recorded"}
                          </p>
                          <p className="truncate font-mono">
                            {row.submittedById || "-"}
                          </p>
                          <p className="truncate">
                            {row.submittedByEmail || "-"}
                          </p>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        <MoneyCell
                          amount={row.apc}
                          currency={row.apcCurrency}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        <MoneyCell
                          amount={row.submissionFee}
                          currency={row.submissionFeeCurrency}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {row.kind === "conference" ? (
                          "Email / website"
                        ) : row.accountId ? (
                          <Link
                            href={`/accounts/${row.accountId}`}
                            className="group/account block min-w-0"
                          >
                            <span className="block truncate text-slate-700 transition group-hover/account:text-blue-600 dark:text-slate-200 dark:group-hover/account:text-blue-300">
                              {row.account || "No login ID"}
                            </span>
                            <span className="mt-0.5 block truncate">
                              {row.accountEmail || "No email"}
                            </span>
                          </Link>
                        ) : (
                          "Not recorded"
                        )}
                      </td>
                    </>
                  )}
                  {hasAction && (
                    <td className="px-4 py-3 text-right">
                      {showStatusEdit &&
                        (() => {
                          const withdrawn = isWithdrawn(row);
                          const editDisabled =
                            withdrawn ||
                            (disabled && !canEditWhenResearchLocked(row));
                          return (
                            <button
                              type="button"
                              disabled={editDisabled}
                              title={
                                withdrawn
                                  ? "Withdrawn submissions are locked and cannot be changed."
                                  : editDisabled
                                    ? "Research is locked. Only accepted or published submissions can still be updated."
                                    : "Edit submission status"
                              }
                              onClick={() => setEditing(row)}
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500 disabled:hover:shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/40"
                              aria-label={`Edit status for ${row.venueName}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          );
                        })()}
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
                    colSpan={
                      isResearchView
                        ? (showRegistrationClaim ? 6 : 4) + (hasAction ? 1 : 0)
                        : hasAction
                          ? 7 + (showSubmitter ? 1 : 0)
                          : 6 + (showSubmitter ? 1 : 0)
                    }
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
        <ResearchModal
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          title="Edit submission status"
          description={editing.venueName}
          icon={<Edit3 className="h-5 w-5" />}
          maxWidth="max-w-lg"
          bodyClassName="px-5 py-4"
        >
          <form onSubmit={submitStatus} className="grid gap-4">
            <input type="hidden" name="submissionId" value={editing.id} />
            <input type="hidden" name="submissionKind" value={editing.kind} />
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Status
              </span>
              <ResearchFormSelect
                name="status"
                defaultValue={
                  editing.kind === "conference" && editing.status === "PLANNED"
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
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  name="statusDate"
                  type="date"
                  defaultValue={dateInputValue(statusDate(editing))}
                  className={`${researchFieldClass} cursor-pointer pl-9 [color-scheme:light] dark:[color-scheme:dark]`}
                />
              </div>
            </label>
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <ResearchButton
                type="button"
                onClick={() => setEditing(null)}
                tone="secondary"
              >
                Cancel
              </ResearchButton>
              <ResearchButton disabled={isPending}>
                <Check className="h-4 w-4" />
                Save status
              </ResearchButton>
            </div>
          </form>
        </ResearchModal>
      )}

      {acceptanceConfirmation && editing && (
        <ResearchConfirmDialog
          open={Boolean(acceptanceConfirmation)}
          title="Accept this submission?"
          description="Accepting this journal submission will lock the research title, authors, and project details."
          tone="warning"
          confirmLabel="Accept and lock"
          confirmIcon={<Check className="h-4 w-4" />}
          isConfirming={isPending}
          onCancel={() => setAcceptanceConfirmation(null)}
          onConfirm={() => persistStatus(acceptanceConfirmation, "accepted")}
        >
          <p>
            After the status becomes accepted, it cannot be changed back to
            submitted, reviewing, or rejected.
          </p>
          <p>
            You can unlock the research content later from the lock icon in the
            accepted/published information box.
          </p>
        </ResearchConfirmDialog>
      )}

      {withdrawalConfirmation && editing && (
        <ResearchConfirmDialog
          open={Boolean(withdrawalConfirmation)}
          title="Withdraw this submission?"
          description="Withdrawing this submission will permanently lock this submission status."
          confirmLabel="Withdraw and lock"
          confirmIcon={<TriangleAlert className="h-4 w-4" />}
          isConfirming={isPending}
          onCancel={() => setWithdrawalConfirmation(null)}
          onConfirm={() =>
            persistStatus(withdrawalConfirmation, "withdrawn")
          }
        >
          <p>
            Use this only when the journal or conference submission has been
            formally withdrawn.
          </p>
          <p>
            After the status becomes Withdraw, admins cannot change this
            submission to another status from this screen.
          </p>
        </ResearchConfirmDialog>
      )}

      {deleting && (
        <ResearchConfirmDialog
          open={Boolean(deleting)}
          title="Delete this submission?"
          description={`This will remove the submission record for ${deleting.venueName}.`}
          confirmLabel="Delete submission"
          isConfirming={isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        >
          <p>
            The submission ID, status history dates, and venue connection will
            be deleted from the system.
          </p>
          <p>This action cannot be undone from this screen.</p>
        </ResearchConfirmDialog>
      )}
    </>
  );
}
