"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  BookMarked,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  CircleOff,
  FileCheck2,
  FileClock,
  FileSearch,
  FlaskConical,
  Send,
  SendHorizontal,
  ShieldCheck,
  Trash2,
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
  researchMutedLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type ResearchProjectRow = {
  id: string;
  researchCode: string;
  title: string;
  abstract: string;
  stage: string;
  claimStatus: string;
  registerStatus: string;
  canViewRegistrationClaim?: boolean;
  coAuthors: string;
  universityRegistration: string;
  registerName: string;
  leadResearcher: string;
  submissions: number;
  publications: number;
  updatedAt: string;
  notSubmittedAnywhere: boolean;
  hasSubmittedSubmission: boolean;
  hasAcceptedSubmission: boolean;
};

const stages = [
  "ALL",
  "PRODUCTION",
  "NEED_SUBMIT",
  "SUBMITTED",
  "REVIEW",
  "ACCEPTED",
  "PUBLISHED",
];
const claims = [
  "ALL",
  "CANNOT_CLAIM",
  "WAITING_PUBLISH",
  "MAKING_DOCUMENT",
  "WAITING",
  "CLAIMED",
];

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    PRODUCTION: "Production",
    NEED_SUBMIT: "Need submit",
    SUBMITTED: "Submitted",
    SUBMITTING: "Submitted",
    REVIEW: "Review",
    ACCEPTED: "Accepted",
    PUBLISHED: "Published",
  };
  if (labels[stage]) return labels[stage];
  if (stage === "NEED_SUBMIT") return "Need submit";
  if (stage === "SUBMITTED" || stage === "SUBMITTING") return "Submitted";
  const normalized = stage.replaceAll("_", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function stageFilterKey(row: ResearchProjectRow) {
  if (row.stage === "SUBMITTING") {
    return row.hasSubmittedSubmission ? "SUBMITTED" : "NEED_SUBMIT";
  }
  return row.stage;
}

function statusClass(stage: string) {
  if (stage === "PUBLISHED" || stage === "ACCEPTED") return "text-[#A8DADC]";
  if (stage === "REVIEW" || stage === "SUBMITTING" || stage === "SUBMITTED")
    return "text-[#B39CD0]";
  return "text-[#FFC1CC]";
}

function stageStatusClass(row: ResearchProjectRow) {
  if (stageFilterKey(row) === "NEED_SUBMIT") {
    return "text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200";
  }
  return statusClass(stageFilterKey(row));
}

function stageTooltip(row: ResearchProjectRow) {
  if (stageFilterKey(row) === "NEED_SUBMIT") {
    return "Not submit anywhere";
  }
  return stageLabel(stageFilterKey(row));
}

function stageIcon(stage: string) {
  if (stage === "PUBLISHED") return BookOpenCheck;
  if (stage === "ACCEPTED") return BadgeCheck;
  if (stage === "REVIEW") return FileSearch;
  if (stage === "SUBMITTING" || stage === "SUBMITTED" || stage === "NEED_SUBMIT")
    return Send;
  return FlaskConical;
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
  if (claim === "WAITING") return "text-amber-700 dark:text-amber-300";
  if (claim === "WAITING_PUBLISH")
    return "text-violet-700 dark:text-violet-300";
  if (claim === "MAKING_DOCUMENT") return "text-[#B39CD0]";
  if (claim === "CANNOT_CLAIM") return "text-rose-300";
  return "text-[#FFC1CC]";
}

function claimIcon(claim: string) {
  if (claim === "CLAIMED") return CheckCircle2;
  if (claim === "WAITING") return FileClock;
  if (claim === "WAITING_PUBLISH") return BookMarked;
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
  if (status === "APPROVED" || status === "SUBMITTED")
    return status === "APPROVED" ? "text-[#A8DADC]" : "text-[#B39CD0]";
  if (status === "PREPARING") return "text-[#FFC1CC]";
  return "text-rose-300";
}

function registrationIcon(status: string) {
  if (status === "APPROVED") return ShieldCheck;
  if (status === "SUBMITTED") return SendHorizontal;
  if (status === "PREPARING") return CalendarCheck2;
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
        className={`inline-flex h-8 w-8 items-center justify-center rounded-none transition-colors duration-150 ${className}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function ClaimStatusChip({
  status,
}: {
  status: string;
}) {
  const Icon = claimIcon(status);
  const label = claimLabel(status);

  return (
    <IconHint label={label}>
      <span className="inline-flex min-w-16 flex-col items-center justify-start gap-1">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-none transition-colors duration-150 ${claimClass(status)}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="max-w-20 text-center text-[10px] font-normal uppercase leading-3 tracking-wide text-[#B0B0B0]">
          {label}
        </span>
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
    <div className="grid max-w-56 grid-cols-[2rem_minmax(0,1fr)] items-start gap-2">
      <IconHint label={registerLine}>
        <span
          className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-none transition-colors duration-150 ${registrationClass(status)}`}
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

function SubmitCount({ count }: { count: number }) {
  const isZero = count === 0;
  const isHigh = count > 10;
  const label = isZero
    ? "No submissions yet"
    : isHigh
      ? `${count} submissions, high submission count`
      : `${count} submissions`;
  const className = isZero
    ? "text-[#1F7180] dark:text-[#A8DADC]"
    : isHigh
      ? "text-[#1F2937] dark:text-[#E4E4E4]"
      : "text-[#667085] dark:text-[#B0B0B0]";

  return (
    <IconHint label={label}>
      <span
        className={`inline-flex h-8 min-w-8 items-center justify-center px-2 text-sm font-normal transition-colors duration-150 ${className}`}
      >
        {count}
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function DeleteResearchButton({
  row,
  deleteAction,
}: {
  row: ResearchProjectRow;
  deleteAction: (projectId: string) => Promise<void>;
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
        label={`Delete ${row.title}`}
        tone="rose"
        className="h-8 w-8"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

      <ResearchConfirmDialog
        open={open}
        title="Delete this research?"
        description="This will remove the research record, authors, submissions, suggested venues, publications, and related history."
        confirmLabel={isDeleting ? "Deleting..." : "Delete research"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteAction(row.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Research deleted",
              detail: "The research record has been removed from the list.",
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete research",
              detail:
                error instanceof Error
                  ? error.message
                  : "The research was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          Research:{" "}
          <span className="font-semibold text-[#E4E4E4]">{row.title}</span>
        </p>
        <p className="text-[#B0B0B0]">
          Research ID: {row.researchCode || row.id.slice(0, 8)}
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function ResearchProjectsTable({
  rows,
  isAdmin = false,
  deleteAction,
  showClaimRegistration = true,
  emptyMessage = "No research matches the current search.",
}: {
  rows: ResearchProjectRow[];
  isAdmin?: boolean;
  deleteAction?: (projectId: string) => Promise<void>;
  showClaimRegistration?: boolean;
  emptyMessage?: string;
}) {
  const [query, setQuery] = usePersistentTableValue("projects:q", "");
  const [stage, setStage] = usePersistentTableValue("projects:stage", "ALL");
  const [claim, setClaim] = usePersistentTableValue("projects:claim", "ALL");
  const showRegistrationClaim = rows.some(
    (row) => showClaimRegistration && row.canViewRegistrationClaim,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStage = stage === "ALL" || stageFilterKey(row) === stage;
      const matchesClaim =
        !showRegistrationClaim || claim === "ALL" || row.claimStatus === claim;
      const haystack = [
        row.title,
        row.researchCode,
        row.abstract,
        row.coAuthors,
        row.leadResearcher,
        row.stage,
        row.canViewRegistrationClaim ? row.universityRegistration : "",
        row.canViewRegistrationClaim ? row.registerName : "",
        row.canViewRegistrationClaim ? row.claimStatus : "",
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesStage && matchesClaim && (!needle || haystack.includes(needle))
      );
    });
  }, [claim, query, rows, showRegistrationClaim, stage]);

  const pagination = useTablePagination(filtered, 10, 1, "projects");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStage(value: string) {
    setStage(value);
    pagination.setPage(1);
  }

  function updateClaim(value: string) {
    setClaim(value);
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C]">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder={
            showRegistrationClaim
              ? "Search research, authors, registration..."
              : "Search research, authors..."
          }
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={stage}
            onChange={updateStage}
            ariaLabel="Filter by stage"
            options={stages.map((item) => ({
              value: item,
              label: item === "ALL" ? "All stages" : stageLabel(item),
            }))}
          />
          {showRegistrationClaim && (
            <FilterSelect
              value={claim}
              onChange={updateClaim}
              ariaLabel="Filter by claim"
              options={claims.map((item) => ({
                value: item,
                label: item === "ALL" ? "All claims" : claimLabel(item),
              }))}
            />
          )}
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[5.75rem] px-3 py-3">ID</th>
              <th className="px-3 py-3">Research</th>
              <th className="w-[4.5rem] px-3 py-3">Stage</th>
              {showRegistrationClaim && (
                <>
                  <th className="w-[4.5rem] px-3 py-3">Claim</th>
                  <th className="w-[12rem] px-3 py-3">Registration</th>
                </>
              )}
              <th className="w-[5rem] px-3 py-3 text-center">Submit</th>
              {isAdmin && deleteAction && (
                <th className="w-14 px-3 py-3 text-center">
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
                <td className="px-3 py-3 align-top">
                  <Link href={`/projects/${row.id}`}>
                    <span
                      className={`font-mono text-xs ${researchMutedLinkClass}`}
                    >
                      {row.researchCode || "-"}
                    </span>
                  </Link>
                </td>
                <td className="min-w-0 px-3 py-3 align-top">
                  <Link href={`/projects/${row.id}`} className="group">
                    <p
                      className={`line-clamp-2 text-base group-hover:text-[#A8DADC] ${researchLinkClass}`}
                    >
                      {row.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-[#B0B0B0]">
                      {row.coAuthors || "No authors recorded"}
                    </p>
                    {row.abstract.trim() ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8F98A8] dark:text-[#8F98A8]">
                        {row.abstract}
                      </p>
                    ) : null}
                  </Link>
                </td>
                <td className="px-3 py-3 align-top">
                  <StatusIconChip
                    icon={stageIcon(row.stage)}
                    label={stageTooltip(row)}
                    className={stageStatusClass(row)}
                  />
                </td>
                {showRegistrationClaim && (
                  <>
                    <td className="px-3 py-3 align-top">
                      {row.canViewRegistrationClaim ? (
                        <ClaimStatusChip status={row.claimStatus} />
                      ) : (
                        <span className="text-sm text-[#8b8392]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.canViewRegistrationClaim ? (
                        <RegistrationCell
                          status={row.registerStatus}
                          registration={row.universityRegistration}
                          registerName={row.registerName}
                        />
                      ) : (
                        <span className="text-sm text-[#8b8392]">-</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-3 py-3 text-center align-top">
                  <SubmitCount count={row.submissions} />
                </td>
                {isAdmin && deleteAction && (
                  <td className="px-3 py-3 text-center align-top">
                    <DeleteResearchButton
                      row={row}
                      deleteAction={deleteAction}
                    />
                  </td>
                )}
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={
                    (showRegistrationClaim ? 6 : 4) +
                    (isAdmin && deleteAction ? 1 : 0)
                  }
                  className="px-4 py-2"
                >
                  <ResearchEmptyState
                    title={
                      rows.length === 0
                        ? emptyMessage
                        : "No research matches the current search."
                    }
                    detail={
                      rows.length === 0
                        ? "Create a new research record or adjust access filters when relevant."
                        : "Try another keyword, stage, or claim filter."
                    }
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
