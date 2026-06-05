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
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { currencySymbol } from "@/sites/research/lib/currency";

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
  if (normalized === "ACCEPTED") return "text-[#A8DADC]";
  if (normalized === "PUBLISHED") return "text-[#A8DADC]";
  if (normalized === "REJECTED") return "text-[#B0B0B0]";
  if (normalized === "WITHDRAWN") return "text-rose-300";
  if (normalized === "REVIEWING") return "text-[#B39CD0]";
  return "text-[#FFC1CC]";
}

function statusIcon(value: string) {
  const normalized = normalizedStatus(value);
  if (normalized === "ACCEPTED") return CheckCircle2;
  if (normalized === "PUBLISHED") return BookOpen;
  if (normalized === "REJECTED") return Ban;
  if (normalized === "WITHDRAWN") return TriangleAlert;
  if (normalized === "REVIEWING") return FileSearch;
  return Send;
}

function rowClass() {
  return "odd:bg-[#2C2C2C] even:bg-[#303030] hover:bg-[#383838]";
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
  if (!amount) return <span className="text-[#B0B0B0]">-</span>;
  if (currency === "USD") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CircleDollarSign className="h-4 w-4 text-[#A8DADC]" />
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
  if (claim === "CLAIMED") return "text-[#A8DADC]";
  if (claim === "WAITING" || claim === "WAITING_PUBLISH")
    return "text-[#FFC1CC]";
  if (claim === "MAKING_DOCUMENT") return "text-[#B39CD0]";
  if (claim === "CANNOT_CLAIM") return "text-rose-300";
  return "text-[#FFC1CC]";
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
  if (status === "APPROVED") return "text-[#A8DADC]";
  if (status === "SUBMITTED") return "text-[#B39CD0]";
  if (status === "PREPARING") return "text-[#FFC1CC]";
  return "text-rose-300";
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
        className={`inline-flex h-8 w-8 items-center justify-center border border-[#444444] bg-[#202020] transition-colors duration-150 group-hover:border-[#666666] ${className}`}
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
    <div className="grid max-w-60 grid-cols-[2rem_minmax(0,1fr)] items-center gap-2">
      <IconHint label={registerLine}>
        <span
          className={`inline-flex h-8 w-8 flex-none items-center justify-center border border-[#444444] bg-[#202020] transition-colors duration-150 group-hover:border-[#666666] ${registrationClass(status)}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </IconHint>
      <div
        className={`min-w-0 ${showDetail ? "" : "flex min-h-8 items-center"}`}
      >
        {showDetail && (
          <p className="truncate text-sm font-normal text-[#E4E4E4]">
            {detail}
          </p>
        )}
        <p
          className={`${showDetail ? "mt-0.5" : ""} text-[11px] font-normal uppercase tracking-wide text-[#B0B0B0]`}
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
  flushControls = false,
}: {
  rows: SubmissionRow[];
  isAdmin: boolean;
  disabled?: boolean;
  actionMode?: "none" | "edit" | "delete";
  view?: "venue" | "research";
  linkVenue?: boolean;
  showSubmitter?: boolean;
  flushControls?: boolean;
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
      <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C]">
        <div
          className={`flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 ${
            flushControls ? "px-0" : "px-3"
          }`}
        >
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
            <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
              <tr>
                <th
                  className={`${isResearchView ? "w-[8%]" : "w-[6%]"} px-3 py-3`}
                >
                  ID
                </th>
                <th
                  className={`${isResearchView ? "w-[42%]" : showSubmitter ? "w-[31%]" : hasAction ? "w-[29%]" : "w-[33%]"} px-3 py-3`}
                >
                  {isResearchView
                    ? "Research Associated"
                    : "Journal / Conference"}
                </th>
                <th
                  className={`${isResearchView ? "w-[15%]" : "w-[13%]"} px-3 py-3`}
                >
                  <span className="inline-flex items-center gap-2">
                    Status
                    {showStatusEdit && (
                      <IconHint label="Edit status from a row">
                        <Edit3
                          className="h-3.5 w-3.5 text-[#B0B0B0]"
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
                        <th className="w-[10%] px-3 py-3">Research claim</th>
                        <th className="w-[18%] px-3 py-3">Registration</th>
                      </>
                    )}
                    <th className="w-[12%] px-3 py-3">Account</th>
                  </>
                ) : (
                  <>
                    {showSubmitter && (
                      <th className="w-[13%] px-3 py-3">Submitted by</th>
                    )}
                    <th className="w-[8%] px-3 py-3">APC</th>
                    <th className="w-[8%] px-3 py-3">Fee</th>
                    <th
                      className={`${hasAction ? "w-[12%]" : "w-[14%]"} px-3 py-3`}
                    >
                      Account
                    </th>
                  </>
                )}
                {hasAction && (
                  <th className="w-[7%] px-3 py-3 text-right">
                    <span className="sr-only">
                      {showDelete ? "Delete" : "Edit"}
                    </span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#444444]">
              {pagination.pagedRows.map((row) => (
                <tr
                  key={row.id}
                  className={`group align-top transition duration-200 ease-out ${rowClass()}`}
                >
                  <td className="px-3 py-3 text-[11px] font-normal uppercase tracking-wide text-[#B0B0B0]">
                    {row.code}
                  </td>
                  <td className="px-3 py-3">
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
                              <BookOpen className="mt-0.5 h-4 w-4 flex-none text-[#B0B0B0] group-hover/link:text-[#A8DADC]" />
                            ) : (
                              <Landmark className="mt-0.5 h-4 w-4 flex-none text-[#B0B0B0] group-hover/link:text-[#A8DADC]" />
                            )}
                          </IconHint>
                        )}
                        <span className="min-w-0">
                          <span
                            className={`${isResearchView ? "text-sm" : "text-sm"} block truncate font-normal text-[#E4E4E4] transition group-hover/link:text-[#A8DADC]`}
                          >
                            {isResearchView ? row.projectTitle : row.venueName}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
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
                              <BookOpen className="mt-0.5 h-4 w-4 flex-none text-[#B0B0B0] group-hover/link:text-[#A8DADC]" />
                            ) : (
                              <Landmark className="mt-0.5 h-4 w-4 flex-none text-[#B0B0B0] group-hover/link:text-[#A8DADC]" />
                            )}
                          </IconHint>
                        )}
                        <span className="min-w-0">
                          <span
                            className={`${isResearchView ? "text-sm" : "text-sm"} block truncate font-normal text-[#E4E4E4] transition group-hover/link:text-[#A8DADC]`}
                          >
                            {isResearchView ? row.projectTitle : row.venueName}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                            {isResearchView
                              ? row.projectAuthors || "-"
                              : row.metaLine || "-"}
                          </span>
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="grid gap-1.5">
                      <StatusIconChip
                        icon={statusIcon(row.status)}
                        label={statusLabel(row.status)}
                        className={badgeClass(row.status)}
                      />
                      {normalizedStatus(row.status) === "PUBLISHED" && (
                        <span className="text-[11px] font-normal text-[#B0B0B0]">
                          published: {shortDate(row.publishedAt) || "-"}
                        </span>
                      )}
                      {(normalizedStatus(row.status) === "PUBLISHED" ||
                        normalizedStatus(row.status) === "ACCEPTED") && (
                        <span className="text-[11px] font-normal text-[#B0B0B0]">
                          accepted: {shortDate(row.acceptedAt) || "-"}
                        </span>
                      )}
                      {normalizedStatus(row.status) === "REJECTED" &&
                        row.rejectedAt && (
                          <span className="text-[11px] font-normal text-[#B0B0B0]">
                            rejected: {shortDate(row.rejectedAt)}
                          </span>
                        )}
                      {normalizedStatus(row.status) === "WITHDRAWN" && (
                        <span className="text-[11px] font-normal text-rose-300">
                          withdrawn: {shortDate(row.withdrawnAt) || "-"}
                        </span>
                      )}
                      <span className="text-[11px] font-normal text-[#B0B0B0]">
                        submitted: {shortDate(row.submittedAt) || "-"}
                      </span>
                    </div>
                  </td>
                  {isResearchView ? (
                    <>
                      {showRegistrationClaim && (
                        <>
                          <td className="px-3 py-3">
                            {row.canViewRegistrationClaim ? (
                              <StatusIconChip
                                icon={claimIcon(row.projectClaimStatus || "")}
                                label={claimLabel(row.projectClaimStatus || "")}
                                className={claimClass(
                                  row.projectClaimStatus || "",
                                )}
                              />
                            ) : (
                              <span className="text-sm text-[#B0B0B0]">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {row.canViewRegistrationClaim ? (
                              <RegistrationCell
                                status={
                                  row.projectRegisterStatus || "NOT_REGISTERED"
                                }
                                registration={row.projectRegistration || ""}
                                registerName={row.projectRegisterName || ""}
                              />
                            ) : (
                              <span className="text-sm text-[#B0B0B0]">-</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-3 py-3 text-sm text-[#E4E4E4]">
                        {row.accountId ? (
                          <Link
                            href={`/accounts/${row.accountId}`}
                            className="group/account block min-w-0"
                          >
                            <span className="block truncate font-normal text-[#E4E4E4] transition group-hover/account:text-[#A8DADC]">
                              {row.account || "No login ID"}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#B0B0B0]">
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
                        <td className="px-3 py-3 text-xs leading-5 text-[#B0B0B0]">
                          <p className="truncate text-[#E4E4E4]">
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
                      <td className="px-3 py-3 text-sm text-[#E4E4E4]">
                        <MoneyCell
                          amount={row.apc}
                          currency={row.apcCurrency}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-[#E4E4E4]">
                        <MoneyCell
                          amount={row.submissionFee}
                          currency={row.submissionFeeCurrency}
                        />
                      </td>
                      <td className="px-3 py-3 text-xs leading-5 text-[#B0B0B0]">
                        {row.kind === "conference" ? (
                          "Email / website"
                        ) : row.accountId ? (
                          <Link
                            href={`/accounts/${row.accountId}`}
                            className="group/account block min-w-0"
                          >
                            <span className="block truncate text-[#E4E4E4] transition group-hover/account:text-[#A8DADC]">
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
                    <td className="px-3 py-3 text-right">
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
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-[#444444] bg-[#202020] text-[#B0B0B0] transition hover:-translate-y-0.5 hover:border-[#A8DADC] hover:text-[#A8DADC] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-[#444444] disabled:hover:text-[#B0B0B0] disabled:hover:shadow-none"
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
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-[#444444] bg-[#202020] text-rose-300 transition hover:-translate-y-0.5 hover:border-rose-300 hover:text-rose-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
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
                    className="px-3 py-14 text-center text-sm text-[#B0B0B0]"
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
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
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
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Status date
              </span>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777777]" />
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
          onConfirm={() => persistStatus(withdrawalConfirmation, "withdrawn")}
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
