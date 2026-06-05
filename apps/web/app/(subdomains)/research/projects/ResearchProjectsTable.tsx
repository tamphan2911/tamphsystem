"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
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
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";
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
};

const stages = [
  "ALL",
  "PRODUCTION",
  "SUBMITTING",
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
  if (stage === "SUBMITTING") return "SUBMITTED";
  if (stage === "REVIEW") return "REVIEW";
  return stage;
}

function statusClass(stage: string) {
  if (stage === "PUBLISHED" || stage === "ACCEPTED") return "text-[#A8DADC]";
  if (stage === "REVIEW" || stage === "SUBMITTING") return "text-[#B39CD0]";
  return "text-[#FFC1CC]";
}

function stageIcon(stage: string) {
  if (stage === "PUBLISHED") return BookOpenCheck;
  if (stage === "ACCEPTED") return BadgeCheck;
  if (stage === "REVIEW") return FileSearch;
  if (stage === "SUBMITTING") return Send;
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
    ? "bg-[#383838] text-[#A8DADC] ring-[#444444]"
    : isHigh
      ? "bg-[#3A3A3A] text-[#E4E4E4] ring-[#A8DADC]"
      : "bg-[#202020] text-[#E4E4E4] ring-[#666666]";

  return (
    <IconHint label={label}>
      <span
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-none px-2 text-sm font-normal ring-1 transition-colors duration-150 ${className}`}
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
        className="h-8 w-8 rounded-[2px]"
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
          <span className="font-semibold text-slate-950 dark:text-white">
            {row.title}
          </span>
        </p>
        <p className="text-slate-500 dark:text-slate-400">
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
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("ALL");
  const [claim, setClaim] = useState("ALL");
  const showRegistrationClaim = rows.some(
    (row) => showClaimRegistration && row.canViewRegistrationClaim,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStage = stage === "ALL" || row.stage === stage;
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

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C]">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder={
            showRegistrationClaim
              ? "Search research, authors, registration..."
              : "Search research, authors..."
          }
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={stage}
            onChange={setStage}
            ariaLabel="Filter by stage"
            options={stages.map((item) => ({
              value: item,
              label: item === "ALL" ? "All stages" : stageLabel(item),
            }))}
          />
          {showRegistrationClaim && (
            <FilterSelect
              value={claim}
              onChange={setClaim}
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
                    <span className="font-mono text-xs font-normal text-[#B0B0B0] transition hover:text-[#E4E4E4]">
                      {row.researchCode || "-"}
                    </span>
                  </Link>
                </td>
                <td className="min-w-0 px-3 py-3 align-top">
                  <Link href={`/projects/${row.id}`} className="group">
                    <p className="line-clamp-2 text-base font-normal text-[#E4E4E4] transition group-hover:text-white">
                      {row.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-[#B0B0B0]">
                      {row.coAuthors || row.abstract || "No notes"}
                    </p>
                  </Link>
                </td>
                <td className="px-3 py-3 align-top">
                  <StatusIconChip
                    icon={stageIcon(row.stage)}
                    label={stageLabel(row.stage)}
                    className={statusClass(row.stage)}
                  />
                </td>
                {showRegistrationClaim && (
                  <>
                    <td className="px-3 py-3 align-top">
                      {row.canViewRegistrationClaim ? (
                        <StatusIconChip
                          icon={claimIcon(row.claimStatus)}
                          label={claimLabel(row.claimStatus)}
                          className={claimClass(row.claimStatus)}
                        />
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
