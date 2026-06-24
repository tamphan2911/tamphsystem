"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

import Link from "next/link";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleHelp,
  Clock3,
  RotateCcw,
  SearchCheck,
} from "lucide-react";
import {
  IconHint,
  MultiFilterSelect,
  TablePagination,
  TableSearchInput,
  parseMultiFilterValue,
  usePersistentTableValue,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { researchLinkClass } from "@/sites/research/components/ResearchPrimitives";

export type RelatedResearchTaskRow = {
  id: string;
  taskCode: string | null;
  title: string;
  description: string;
  status: string;
  taskType: string;
  dueDate: string | null;
  createdAt: string;
  assignments: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

function shortDate(value: string | null) {
  if (!value) return "-";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function taskId(row: RelatedResearchTaskRow) {
  return row.taskCode || row.id.replaceAll("-", "").slice(0, 10).toUpperCase();
}

function sentenceCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusMeta(row: RelatedResearchTaskRow): {
  value: string;
  label: string;
  icon: LucideIcon;
  className: string;
} {
  const overdue = Boolean(row.dueDate && new Date(row.dueDate) < new Date());

  if (row.status === "COMPLETED") {
    return {
      value: "COMPLETED",
      label: "Completed",
      icon: CheckCircle2,
      className:
        "text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200",
    };
  }
  if (row.status === "REVOKED") {
    return {
      value: "REVOKED",
      label: "Revoked",
      icon: Ban,
      className:
        "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200",
    };
  }

  if (row.status === "CHECKING") {
    return {
      value: "CHECKING",
      label: "Checking",
      icon: SearchCheck,
      className:
        "text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200",
    };
  }
  if (row.status === "REVISION_REQUESTED") {
    return {
      value: "REVISION_REQUESTED",
      label: "Revision requested",
      icon: RotateCcw,
      className:
        "text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200",
    };
  }
  if (row.status === "NEED_CLARIFY") {
    return {
      value: "NEED_CLARIFY",
      label: "Need clarify",
      icon: CircleHelp,
      className:
        "text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200",
    };
  }
  if (overdue) {
    return {
      value: "OVERDUE",
      label: "Overdue",
      icon: AlertTriangle,
      className:
        "text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200",
    };
  }
  return {
    value: "IN_PROGRESS",
    label: "In progress",
    icon: Clock3,
    className:
      "text-sky-700 dark:text-[#A8DADC] hover:text-sky-800 dark:hover:text-[#C7ECEE]",
  };
}

const relatedTaskStatusOptions = [
  "ALL",
  "IN_PROGRESS",
  "REVISION_REQUESTED",
  "OVERDUE",
  "CHECKING",
  "NEED_CLARIFY",
  "COMPLETED",
  "REVOKED",
];

const unfinishedRelatedTaskStatuses = relatedTaskStatusOptions.filter(
  (value) => value !== "ALL" && value !== "COMPLETED" && value !== "REVOKED",
);

function statusFilterLabel(value: string) {
  if (value === "ALL") return "All statuses";
  if (value === "CHECKING") return "Checking";
  if (value === "NEED_CLARIFY") return "Need clarify";
  if (value === "REVISION_REQUESTED") return "Revision requested";
  return sentenceCase(value);
}

export function RelatedResearchTasksTable({
  projectId,
  rows,
}: {
  projectId: string;
  rows: RelatedResearchTaskRow[];
}) {
  const storageKey = `research-related-tasks:${projectId}`;
  const [query, setQuery] = usePersistentTableValue(`${storageKey}:q`, "");
  const [statusValue, setStatusValue] = usePersistentTableValue(
    `${storageKey}:status`,
    unfinishedRelatedTaskStatuses.join(","),
  );
  const statuses = useMemo(
    () => parseMultiFilterValue(statusValue, relatedTaskStatusOptions),
    [statusValue],
  );
  const effectiveStatuses = useMemo(
    () => (statusValue === "ALL" ? [] : statuses),
    [statusValue, statuses],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const meta = statusMeta(row);
      const matchesStatus =
        effectiveStatuses.length === 0 ||
        effectiveStatuses.includes(meta.value);
      const haystack = [
        taskId(row),
        row.title,
        row.description,
        row.taskType,
        meta.label,
        ...row.assignments.flatMap((assignment) => [
          assignment.name,
          assignment.email,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [effectiveStatuses, query, rows]);
  const pagination = useTablePagination(filtered, 10, 1, storageKey);

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStatuses(values: string[]) {
    setStatusValue(values.length > 0 ? values.join(",") : "ALL");
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C]">
      <div className="research-related-tasks-toolbar flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search task, assignee, status..."
        />
        <MultiFilterSelect
          values={statuses}
          onChange={updateStatuses}
          ariaLabel="Filter related tasks by status"
          options={relatedTaskStatusOptions.map((value) => ({
            value,
            label: statusFilterLabel(value),
          }))}
        />
      </div>

      <div className="overflow-hidden">
        <table className="research-related-tasks-table w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[8rem] px-3 py-3">Task ID</th>
              <th className="px-3 py-3">Task</th>
              <th className="w-[7rem] px-3 py-3">Status</th>
              <th className="w-[16rem] px-3 py-3">Assignees</th>
              <th className="w-[7rem] px-3 py-3">Due date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((row) => {
              const meta = statusMeta(row);
              const StatusIcon = meta.icon;
              return (
                <tr
                  key={row.id}
                  className="align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-3 py-3 align-top">
                    <span className="font-mono text-xs uppercase tracking-wide text-[#B0B0B0]">
                      {taskId(row)}
                    </span>
                    <p className="mt-1 text-[11px] leading-4 text-[#777777]">
                      {sentenceCase(row.taskType || "Task")}
                    </p>
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <Link
                      href={`/tasks/${row.id}`}
                      className={`text-sm font-normal leading-5 ${researchLinkClass}`}
                    >
                      {row.title}
                    </Link>
                    <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-xs font-normal leading-5 text-[#B0B0B0]">
                      {row.description || "No description"}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <IconHint label={meta.label}>
                      <span
                        className={`research-allow-transform inline-flex border-0 bg-transparent p-0 shadow-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none ${meta.className}`}
                      >
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{meta.label}</span>
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                    {row.assignments.length > 0
                      ? row.assignments.map((assignment) => (
                          <div key={assignment.id} className="mb-2 last:mb-0">
                            <div className="text-[#E4E4E4]">
                              {assignment.name || assignment.email}
                            </div>
                            <div className="break-all text-[#B0B0B0]">
                              {assignment.email}
                            </div>
                          </div>
                        ))
                      : "Unassigned"}
                  </td>
                  <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                    {shortDate(row.dueDate)}
                  </td>
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-14 text-center text-sm text-[#B0B0B0]"
                >
                  {rows.length === 0
                    ? "No tasks are related to this research."
                    : "No related tasks match the current filters."}
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
