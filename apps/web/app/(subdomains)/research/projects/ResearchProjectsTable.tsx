"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  CircleOff,
  ClipboardList,
  FileCheck2,
  FileClock,
  FileSearch,
  FileText,
  FlaskConical,
  Send,
  SendHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";

export type ResearchProjectRow = {
  id: string;
  title: string;
  abstract: string;
  stage: string;
  claimStatus: string;
  registerStatus: string;
  coAuthors: string;
  universityRegistration: string;
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
const claims = ["ALL", "CANNOT_CLAIM", "MAKING_DOCUMENT", "WAITING", "CLAIMED"];

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
  if (claim === "MAKING_DOCUMENT")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  return "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function claimIcon(claim: string) {
  if (claim === "CLAIMED") return CheckCircle2;
  if (claim === "WAITING") return FileClock;
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
  if (status === "SUBMITTED") return SendHorizontal;
  if (status === "PREPARING") return ClipboardList;
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
    <div className="inline-flex min-w-14 flex-col items-center gap-1">
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
      <span className="max-w-20 truncate text-center text-[10px] font-semibold uppercase leading-none tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </span>
    </div>
  );
}

function RegistrationCell({
  status,
  registration,
}: {
  status: string;
  registration: string;
}) {
  const Icon = registrationIcon(status);
  const label = registrationLabel(status);
  const detail = registration || "No registration record";

  return (
    <div className="flex max-w-56 items-center gap-2">
      <IconHint label={label}>
        <span
          className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${registrationClass(status)}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </IconHint>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
          {detail}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
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

export function ResearchProjectsTable({
  rows,
}: {
  rows: ResearchProjectRow[];
}) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("ALL");
  const [claim, setClaim] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStage = stage === "ALL" || row.stage === stage;
      const matchesClaim = claim === "ALL" || row.claimStatus === claim;
      const haystack = [
        row.title,
        row.abstract,
        row.coAuthors,
        row.universityRegistration,
        row.leadResearcher,
        row.claimStatus,
        row.stage,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesStage && matchesClaim && (!needle || haystack.includes(needle))
      );
    });
  }, [claim, query, rows, stage]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search research, authors, registration..."
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
          <FilterSelect
            value={claim}
            onChange={setClaim}
            ariaLabel="Filter by claim"
            options={claims.map((item) => ({
              value: item,
              label: item === "ALL" ? "All claims" : claimLabel(item),
            }))}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[50rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">
                Research
              </th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Claim</th>
              <th className="px-4 py-3">Registration</th>
              <th className="px-4 py-3 text-center">Submit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((row) => (
              <tr
                key={row.id}
                className="group transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
                  <Link href={`/projects/${row.id}`} className="group">
                    <div className="flex items-start gap-3">
                      <IconHint label="Research project">
                        <FileText
                          className="mt-0.5 h-4 w-4 flex-none text-slate-400 group-hover:text-blue-600"
                          aria-hidden="true"
                        />
                      </IconHint>
                      <div>
                        <p className="text-sm font-normal text-slate-700 group-hover:text-blue-600 dark:text-slate-200">
                          {row.title}
                        </p>
                        <p className="mt-1 line-clamp-1 max-w-lg text-xs text-slate-500 dark:text-slate-400">
                          {row.coAuthors || row.abstract || "No notes"}
                        </p>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusIconChip
                    icon={stageIcon(row.stage)}
                    label={stageLabel(row.stage)}
                    className={statusClass(row.stage)}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusIconChip
                    icon={claimIcon(row.claimStatus)}
                    label={claimLabel(row.claimStatus)}
                    className={claimClass(row.claimStatus)}
                  />
                </td>
                <td className="px-4 py-3">
                  <RegistrationCell
                    status={row.registerStatus}
                    registration={row.universityRegistration}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <SubmitCount count={row.submissions} />
                </td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No research matches the current search.
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
