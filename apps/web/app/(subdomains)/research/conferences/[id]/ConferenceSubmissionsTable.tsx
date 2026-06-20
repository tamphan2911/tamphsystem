"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Ban,
  BookOpen,
  CheckCircle2,
  FileClock,
  FileSearch,
  Send,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  usePersistentTableValue,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

export type ConferenceSubmissionRow = {
  id: string;
  code: string;
  projectId: string;
  projectTitle: string;
  projectAuthors: string;
  status: string;
  submittedAt: string;
  acceptedAt: string;
  rejectedAt: string;
  withdrawnAt: string;
  publishedAt: string;
};

function statusMeta(value: string): {
  label: string;
  icon: LucideIcon;
  className: string;
} {
  if (value === "PUBLISHED") {
    return {
      label: "Published",
      icon: BookOpen,
      className: "text-blue-700 dark:text-blue-300",
    };
  }
  if (value === "ACCEPTED") {
    return {
      label: "Accepted",
      icon: CheckCircle2,
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (value === "REVIEWING") {
    return {
      label: "Reviewing",
      icon: FileSearch,
      className: "text-violet-700 dark:text-violet-300",
    };
  }
  if (value === "REJECTED") {
    return {
      label: "Rejected",
      icon: Ban,
      className: "text-rose-700 dark:text-rose-300",
    };
  }
  if (value === "WITHDRAWN") {
    return {
      label: "Withdrawn",
      icon: TriangleAlert,
      className: "text-amber-700 dark:text-amber-300",
    };
  }
  if (value === "PLANNED") {
    return {
      label: "Planned",
      icon: FileClock,
      className: "text-slate-600 dark:text-[#B0B0B0]",
    };
  }
  return {
    label: "Submitted",
    icon: Send,
    className: "text-sky-700 dark:text-sky-300",
  };
}

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

export function ConferenceSubmissionsTable({
  rows,
}: {
  rows: ConferenceSubmissionRow[];
}) {
  const [query, setQuery] = usePersistentTableValue(
    "conference-detail-submissions:q",
    "",
  );
  const [status, setStatus] = usePersistentTableValue(
    "conference-detail-submissions:status",
    "ALL",
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;
      const haystack = [
        row.code,
        row.projectTitle,
        row.projectAuthors,
        row.status,
        row.submittedAt,
        row.acceptedAt,
        row.rejectedAt,
        row.withdrawnAt,
        row.publishedAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [query, rows, status]);
  const pagination = useTablePagination(
    filtered,
    10,
    1,
    "conference-detail-submissions",
  );

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    pagination.setPage(1);
  }

  return (
    <section className="space-y-3">
      <div className="journal-detail-tabs grid w-full grid-cols-1 border border-[#444444] bg-[#242424] p-1 text-center">
        <div
          className="journal-detail-tab-button px-4 py-3 text-left"
          data-active="true"
        >
          <span className="relative z-10 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[11px] font-normal uppercase tracking-wide">
              <Send className="research-task-icon-motion h-3.5 w-3.5" />
              Submissions
            </span>
            <span className="text-base font-normal">{rows.length}</span>
          </span>
        </div>
      </div>

      <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <TableSearchInput
            value={query}
            onChange={updateQuery}
            placeholder="Search submission ID, research, author..."
          />
          <FilterSelect
            value={status}
            onChange={updateStatus}
            ariaLabel="Filter conference submissions by status"
            options={[
              { value: "ALL", label: "All status" },
              { value: "PLANNED", label: "Planned" },
              { value: "SUBMITTED", label: "Submitted" },
              { value: "REVIEWING", label: "Reviewing" },
              { value: "ACCEPTED", label: "Accepted" },
              { value: "REJECTED", label: "Rejected" },
              { value: "WITHDRAWN", label: "Withdrawn" },
              { value: "PUBLISHED", label: "Published" },
            ]}
          />
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
              <tr>
                <th className="w-[7rem] px-3 py-3">Submission ID</th>
                <th className="px-3 py-3">Submission</th>
                <th className="w-[8rem] px-3 py-3">Status</th>
                <th className="w-[15rem] px-3 py-3">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#444444]">
              {pagination.pagedRows.map((row) => {
                const meta = statusMeta(row.status);
                const StatusIcon = meta.icon;
                const timeline = [
                  row.submittedAt
                    ? `Submitted: ${shortDate(row.submittedAt)}`
                    : "",
                  row.acceptedAt
                    ? `Accepted: ${shortDate(row.acceptedAt)}`
                    : "",
                  row.rejectedAt
                    ? `Rejected: ${shortDate(row.rejectedAt)}`
                    : "",
                  row.withdrawnAt
                    ? `Withdrawn: ${shortDate(row.withdrawnAt)}`
                    : "",
                  row.publishedAt
                    ? `Published: ${shortDate(row.publishedAt)}`
                    : "",
                ].filter(Boolean);

                return (
                  <tr
                    key={row.id}
                    className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                  >
                    <td className="px-3 py-3 align-top">
                      <Link
                        href={`/submissions/${row.id}`}
                        className="research-journal-name-link font-mono text-xs uppercase tracking-wide text-[#1F7180] dark:text-[#A8DADC]"
                      >
                        {row.code}
                      </Link>
                    </td>
                    <td className="min-w-0 px-3 py-3 align-top">
                      <Link
                        href={`/projects/${row.projectId}`}
                        className="research-journal-name-link block whitespace-normal break-words text-[15px] font-normal leading-6 text-[#1F7180] dark:text-[#A8DADC]"
                      >
                        {row.projectTitle || "Untitled research"}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                        {row.projectAuthors || "No author information"}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <IconHint label={meta.label}>
                        <span
                          className={`research-task-icon-motion inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent p-0 shadow-none ${meta.className}`}
                        >
                          <StatusIcon className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{meta.label}</span>
                        </span>
                      </IconHint>
                    </td>
                    <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                      {timeline.length > 0
                        ? timeline.map((item) => <p key={item}>{item}</p>)
                        : "No timeline recorded"}
                    </td>
                  </tr>
                );
              })}
              {pagination.total === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-14 text-center text-sm text-[#B0B0B0]"
                  >
                    {rows.length === 0
                      ? "No submissions have been recorded for this conference."
                      : "No submissions match the current filters."}
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
    </section>
  );
}
