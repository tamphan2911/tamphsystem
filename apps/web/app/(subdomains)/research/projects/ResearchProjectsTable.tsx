"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
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
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { useResearchToast } from "../components/ResearchToast";

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
  if (stage === "PUBLISHED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (stage === "ACCEPTED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (stage === "REVIEW")
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  if (stage === "SUBMITTING")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
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
    <div className="grid max-w-56 grid-cols-[2rem_minmax(0,1fr)] items-start gap-2">
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
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
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
      <IconHint label="Delete research">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${row.title}`}
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
                      Delete this research?
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      This will remove the research record, authors,
                      submissions, suggested venues, publications, and related
                      history.
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
                    await deleteAction(row.id);
                    setOpen(false);
                    router.refresh();
                    toast.showSuccess({
                      title: "Research deleted",
                      detail:
                        "The research record has been removed from the list.",
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
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-rose-600"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete research"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
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
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
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
                <th className="w-12 px-2 py-3 text-center">Delete</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((row) => (
              <tr
                key={row.id}
                className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-3 py-3 align-top">
                  <Link href={`/projects/${row.id}`}>
                    <span className="font-mono text-xs font-bold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300">
                      {row.researchCode || "-"}
                    </span>
                  </Link>
                </td>
                <td className="min-w-0 px-3 py-3 align-top">
                  <Link href={`/projects/${row.id}`} className="group">
                    <p className="line-clamp-2 text-base font-normal text-slate-700 transition group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-300">
                      {row.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
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
                        <span className="text-sm text-slate-400">-</span>
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
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-3 py-3 text-center align-top">
                  <SubmitCount count={row.submissions} />
                </td>
                {isAdmin && deleteAction && (
                  <td className="px-2 py-3 text-center align-top">
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
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {rows.length === 0
                    ? emptyMessage
                    : "No research matches the current search."}
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
