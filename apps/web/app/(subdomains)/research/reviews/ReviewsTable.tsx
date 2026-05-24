"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  PauseCircle,
  PencilLine,
  Send,
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

const statuses = [
  "ALL",
  "INVITED",
  "ACCEPTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "SUBMITTED",
  "DECLINED",
  "CANCELLED",
];

function statusLabel(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "ON_HOLD") return "On hold";
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
  if (status === "ON_HOLD")
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  if (status === "DECLINED")
    return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  if (status === "CANCELLED")
    return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function statusIcon(status: string) {
  if (status === "ACCEPTED") return CheckCircle2;
  if (status === "IN_PROGRESS") return PencilLine;
  if (status === "ON_HOLD") return PauseCircle;
  if (status === "SUBMITTED") return Send;
  if (status === "DECLINED") return Ban;
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

export function ReviewsTable({ rows }: { rows: ReviewRow[] }) {
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
      ].join(" ").toLowerCase();
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[70rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">
                Manuscript
              </th>
              <th className="px-4 py-3">Journal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Recommendation</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((row) => (
              <tr
                key={row.id}
                className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800">
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
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <Link
                    href={`/journals/${row.journalId}`}
                    className="font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                  >
                    {row.journalName}
                  </Link>
                  <p className="mt-1 text-xs text-slate-400">
                    {row.publisher || "-"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusIconChip
                    icon={statusIcon(row.status)}
                    label={statusLabel(row.status)}
                    className={statusClass(row.status)}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {row.dueDate || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {row.recommendation || "-"}
                </td>
                <td className="max-w-sm px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {row.note || "-"}
                </td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={6}
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
