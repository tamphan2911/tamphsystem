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
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";

export type RelatedResearchTaskRow = {
  id: string;
  taskCode: string | null;
  title: string;
  description: string;
  status: string;
  clarifyDirection: "ASSIGNEE_TO_MANAGER" | "MANAGER_TO_ASSIGNEE" | null;
  taskType: string;
  dueDate: string | null;
  completedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  checker: string;
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

function durationText(ms: number) {
  const absolute = Math.abs(ms);
  const hours = Math.max(1, Math.round(absolute / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}

function activeDueMeta(due: Date | null, remainingMs: number | null) {
  if (!due || remainingMs === null) {
    return {
      detail: "No due date",
      detailClassName: "text-[#B0B0B0]",
    };
  }

  if (remainingMs < 0) {
    return {
      detail: `${durationText(remainingMs)} late`,
      detailClassName: "font-semibold text-rose-600 dark:text-rose-300",
    };
  }

  return {
    detail: `${durationText(remainingMs)} left`,
    detailClassName:
      remainingMs < 24 * 60 * 60 * 1000
        ? "font-semibold text-[#B64F48] dark:text-[#FFB4A2]"
        : "text-yellow-700 dark:text-yellow-300",
  };
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

function taskTypeLines(row: RelatedResearchTaskRow) {
  const type = row.taskType;
  if (type === "SUBMIT_RESEARCH" || type === "SUBMIT_CONFERENCE") {
    return {
      typeLabel: "Submit",
      subtypeLabel: type === "SUBMIT_CONFERENCE" ? "Conference" : "Journal",
    };
  }
  if (type === "SUGGEST_VENUE") {
    return {
      typeLabel: "Suggest venue",
      subtypeLabel: "Research",
    };
  }
  if (type === "ADD_JOURNAL") {
    return { typeLabel: "Add journal", subtypeLabel: "" };
  }
  if (type === "PROPOSAL") {
    return { typeLabel: "Proposal", subtypeLabel: "" };
  }
  if (type === "PRODUCTION") {
    return { typeLabel: "Production", subtypeLabel: "" };
  }
  if (type === "PROJECT_PRODUCTION" || type === "PROJECT_RESEARCH_ASSOCIATED") {
    return { typeLabel: "Project", subtypeLabel: "" };
  }
  return { typeLabel: sentenceCase(type || "Task"), subtypeLabel: "" };
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
      label:
        row.clarifyDirection === "MANAGER_TO_ASSIGNEE"
          ? "Need clarify: waiting assignee answer"
          : "Need clarify: waiting task manager answer",
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
      "text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200",
  };
}

function statusActionText(row: RelatedResearchTaskRow) {
  if (row.status === "CHECKING") {
    return {
      text: "Ready to check",
      className: "text-violet-700 dark:text-violet-300",
    };
  }
  if (row.status === "REVISION_REQUESTED") {
    return {
      text: "Waiting revision",
      className: "text-orange-700 dark:text-orange-300",
    };
  }
  if (row.status === "NEED_CLARIFY") {
    return {
      text:
        row.clarifyDirection === "MANAGER_TO_ASSIGNEE"
          ? "Waiting assignee"
          : "Waiting manager",
      className: "text-cyan-700 dark:text-cyan-300",
    };
  }
  return null;
}

function clarificationStatusDetail(
  direction?: RelatedResearchTaskRow["clarifyDirection"] | null,
) {
  return direction === "MANAGER_TO_ASSIGNEE"
    ? "Waiting for assignee answer"
    : "Waiting for task manager answer";
}

function timeMeta(row: RelatedResearchTaskRow) {
  const due = row.dueDate ? new Date(row.dueDate) : null;
  const completed = row.completedAt ? new Date(row.completedAt) : null;
  const now = new Date();
  const remainingMs = due ? due.getTime() - now.getTime() : null;

  if (row.status === "REVOKED") {
    return {
      detail: "",
      dateLines: [
        `revoked: ${shortDate(row.revokedAt ?? row.updatedAt)}`,
        `Due: ${shortDate(row.dueDate)}`,
        `assigned: ${shortDate(row.createdAt)}`,
      ],
      detailClassName: "text-[#B0B0B0]",
    };
  }

  if (row.status === "COMPLETED") {
    if (!due || !completed) {
      return {
        detail: "Finished",
        dateLines: completed ? [`finished: ${shortDate(row.completedAt)}`] : [],
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    if (completed <= due) {
      return {
        detail: `${durationText(due.getTime() - completed.getTime())} early`,
        dateLines: [`finished: ${shortDate(row.completedAt)}`],
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    return {
      detail: `${durationText(completed.getTime() - due.getTime())} late`,
      dateLines: [`finished: ${shortDate(row.completedAt)}`],
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  if (row.status === "CHECKING") {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${shortDate(row.dueDate)}`] : [],
      secondaryDetail: "Waiting assigner check",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-violet-600 dark:text-violet-300",
    };
  }

  if (row.status === "REVISION_REQUESTED") {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${shortDate(row.dueDate)}`] : [],
      secondaryDetail: "Waiting assignee revision",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-orange-700 dark:text-orange-300",
    };
  }

  if (row.status === "NEED_CLARIFY") {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${shortDate(row.dueDate)}`] : [],
      secondaryDetail: clarificationStatusDetail(row.clarifyDirection),
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-cyan-700 dark:text-cyan-300",
    };
  }

  if (due && now > due) {
    return {
      detail: `${durationText(now.getTime() - due.getTime())} late`,
      dateLines: [],
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  return {
    detail: due ? `${durationText(remainingMs ?? 0)} left` : "No due date",
    dateLines: due ? [`Due: ${shortDate(row.dueDate)}`] : [],
    detailClassName:
      remainingMs !== null && remainingMs < 24 * 60 * 60 * 1000
        ? "font-semibold text-[#B64F48] dark:text-[#FFB4A2]"
        : "text-yellow-700 dark:text-yellow-300",
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
  if (value === "CHECKING") return "Ready to check";
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
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
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

      <div className="overflow-x-auto">
        <table className="research-related-tasks-table w-full min-w-[60rem] table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[6rem] px-3 py-3">Task ID</th>
              <th className="px-3 py-3">Task</th>
              <th className="w-[7rem] px-3 py-3">Status</th>
              <th className="w-[14rem] px-3 py-3">Assignees</th>
              <th className="w-[12.5rem] px-3 py-3 lg:w-[14rem] xl:w-[15rem]">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((row) => {
              const meta = statusMeta(row);
              const actionText = statusActionText(row);
              const time = timeMeta(row);
              const StatusIcon = meta.icon;
              const typeLines = taskTypeLines(row);
              return (
                <tr
                  key={row.id}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-3 py-3 align-top">
                    <span className="font-mono text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
                      {taskId(row)}
                    </span>
                    <p className="mt-1 text-[11px] font-normal leading-4 text-[#B0B0B0]">
                      {typeLines.typeLabel}
                    </p>
                    {typeLines.subtypeLabel ? (
                      <p className="text-[11px] leading-4 text-[#777777]">
                        {typeLines.subtypeLabel}
                      </p>
                    ) : null}
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <Link
                      href={`/tasks/${row.id}`}
                      className={`research-allow-transform text-sm font-normal leading-5 ${researchLinkClass}`}
                    >
                      {row.title}
                    </Link>
                    <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-xs font-normal leading-5 text-[#B0B0B0]">
                      {row.description || "No description"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center text-[11px] font-normal leading-4 text-[#1F7180] dark:text-[#A8DADC]">
                      Related to this research
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <IconHint
                      label={
                        actionText
                          ? `${meta.label}: ${actionText.text}`
                          : meta.label
                      }
                    >
                      <span className="inline-flex flex-col items-start gap-1">
                        <span
                          className={`research-allow-transform inline-flex cursor-default items-center justify-center border-0 bg-transparent p-0 shadow-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none ${meta.className}`}
                        >
                          <StatusIcon className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{meta.label}</span>
                        </span>
                        {actionText ? (
                          <span
                            className={`max-w-[6.25rem] text-[11px] font-semibold leading-4 ${actionText.className}`}
                          >
                            {actionText.text}
                          </span>
                        ) : null}
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                    {row.assignments.length > 0 ? (
                      <div
                        className={
                          row.assignments.length > 1
                            ? "divide-y divide-[#D8D0C2] dark:divide-[#444444]"
                            : ""
                        }
                      >
                        {row.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className={`space-y-0.5 font-normal ${
                              row.assignments.length > 1
                                ? "py-2 first:pt-0 last:pb-0"
                                : ""
                            }`}
                            title={assignment.email}
                          >
                            <div className="min-w-0 break-words text-[#E4E4E4]">
                              {assignment.name || assignment.email}
                            </div>
                            <div className="break-all text-[11px] leading-4 text-[#667085] dark:text-[#8F98A8]">
                              {assignment.email}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#777777]">Unassigned</div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {time.dateLines.map((line) => (
                      <p
                        key={line}
                        className="break-words text-xs font-normal leading-5 text-[#B0B0B0]"
                      >
                        {line}
                      </p>
                    ))}
                    {time.detail ? (
                      <p
                        className={`max-w-full break-words text-xs font-normal leading-5 ${time.detailClassName}`}
                      >
                        {time.detail}
                      </p>
                    ) : null}
                    {"secondaryDetail" in time && time.secondaryDetail ? (
                      <p
                        className={`max-w-full break-words text-xs font-normal leading-5 ${time.secondaryDetailClassName}`}
                      >
                        {time.secondaryDetail}
                      </p>
                    ) : null}
                    <div className="mt-2 border-t border-slate-200 pt-2 dark:border-[#555555]">
                      <p
                        className="max-w-full truncate whitespace-nowrap text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]"
                        title={`Checker: ${row.checker}`}
                      >
                        Checker: {row.checker}
                      </p>
                      <p
                        className="max-w-full truncate whitespace-nowrap text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]"
                        title={`Assigner: ${row.createdBy}`}
                      >
                        Assigner: {row.createdBy}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-2">
                  <ResearchEmptyState
                    title={
                      rows.length === 0
                        ? "No tasks are related to this research."
                        : "No related tasks match the current filters."
                    }
                    detail={
                      rows.length === 0
                        ? "Create or assign a task to connect work with this research."
                        : "Try another keyword or status."
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
