"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleHelp,
  Clock3,
  SearchCheck,
  Trash2,
} from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { researchLinkClass } from "@/sites/research/components/ResearchPrimitives";
import { TableSkeletonRows } from "@/sites/research/components/ResearchSkeleton";
import {
  ResearchEmptyState,
  ResearchErrorState,
} from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

type TaskAssignment = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRoles: string[];
  finishedAt: string | null;
};

type TaskRow = {
  id: string;
  taskCode: string | null;
  title: string;
  description: string;
  category: string;
  taskType: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignments: TaskAssignment[];
};

function formatDate(value: string | null) {
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

function displayTaskId(task: TaskRow) {
  return (
    task.taskCode || task.id.replaceAll("-", "").slice(0, 10).toUpperCase()
  );
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function taskTypeLines(task: TaskRow) {
  const type = task.taskType;
  if (!type) {
    return {
      typeLabel: task.category ? titleCase(task.category) : "Task",
      subtypeLabel: "",
    };
  }

  if (type === "SUBMIT_RESEARCH" || type === "SUBMIT_CONFERENCE") {
    return {
      typeLabel: "Submit",
      subtypeLabel: type === "SUBMIT_CONFERENCE" ? "Conference" : "Journal",
    };
  }
  if (type === "PROJECT_PRODUCTION" || type === "PROJECT_RESEARCH_ASSOCIATED") {
    return { typeLabel: "Project", subtypeLabel: "" };
  }

  return { typeLabel: titleCase(type), subtypeLabel: "" };
}

function statusMeta(task: TaskRow) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const completed = task.completedAt ? new Date(task.completedAt) : null;
  const now = new Date();
  const remainingMs = due ? due.getTime() - now.getTime() : null;

  if (task.status === "REVOKED") {
    return {
      label: "Revoked",
      detail: "",
      dateLines: [
        `revoked: ${formatDate(task.revokedAt ?? task.updatedAt)}`,
        `due: ${formatDate(task.dueDate)}`,
        `assigned: ${formatDate(task.createdAt)}`,
      ],
      className:
        "border-slate-200 bg-slate-50 text-slate-600 dark:border-[#555555] dark:bg-[#333333] dark:text-[#B0B0B0]",
      detailClassName: "text-[#B0B0B0]",
    };
  }

  if (task.status === "COMPLETED") {
    if (!due || !completed) {
      return {
        label: "Complete",
        detail: "Finished",
        dateLines: completed
          ? [`finished: ${formatDate(task.completedAt)}`]
          : [],
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-950/25 dark:text-emerald-300",
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    if (completed <= due) {
      return {
        label: "Complete",
        detail: `${durationText(due.getTime() - completed.getTime())} early`,
        dateLines: [`finished: ${formatDate(task.completedAt)}`],
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-950/25 dark:text-emerald-300",
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    return {
      label: "Overdue",
      detail: `${durationText(completed.getTime() - due.getTime())} late`,
      dateLines: [`finished: ${formatDate(task.completedAt)}`],
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/40 dark:bg-rose-950/25 dark:text-rose-300",
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  if (task.status === "CHECKING") {
    return {
      label: "Checking",
      detail: "Waiting assigner check",
      dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
      className:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-300/40 dark:bg-violet-950/25 dark:text-violet-300",
      detailClassName: "text-violet-600 dark:text-violet-300",
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      label: "Need clarify",
      detail: "Waiting assigner answer",
      dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/40 dark:bg-amber-950/25 dark:text-amber-200",
      detailClassName: "text-amber-700 dark:text-amber-300",
    };
  }

  if (due && now > due) {
    return {
      label: "Overdue",
      detail: `${durationText(now.getTime() - due.getTime())} late`,
      dateLines: [],
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/40 dark:bg-rose-950/25 dark:text-rose-300",
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  return {
    label: "In progress",
    detail: due
      ? `${durationText(remainingMs ?? 0)} left`
      : "No due date",
    dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-[#A8DADC]/40 dark:bg-[#A8DADC]/10 dark:text-[#A8DADC]",
    detailClassName:
      remainingMs !== null && remainingMs < 24 * 60 * 60 * 1000
        ? "font-semibold text-[#B64F48] dark:text-[#FFB4A2]"
        : "text-[#B0B0B0]",
  };
}

function statusIconMeta(task: TaskRow): {
  icon: LucideIcon;
  className: string;
} {
  const status = statusMeta(task);

  if (task.status === "REVOKED") {
    return {
      icon: Ban,
      className:
        "text-slate-500 hover:text-slate-700 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]",
    };
  }

  if (task.status === "COMPLETED") {
    return {
      icon: CheckCircle2,
      className:
        "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
    };
  }

  if (task.status === "CHECKING") {
    return {
      icon: SearchCheck,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      icon: CircleHelp,
      className:
        "text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200",
    };
  }

  if (status.label === "Overdue") {
    return {
      icon: AlertTriangle,
      className:
        "text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200",
    };
  }

  return {
    icon: Clock3,
    className:
      "text-indigo-700 hover:text-indigo-800 dark:text-violet-300 dark:hover:text-violet-200",
  };
}

function derivedStatus(task: TaskRow) {
  if (task.status === "CHECKING" || task.status === "NEED_CLARIFY") {
    return task.status;
  }
  const label = statusMeta(task).label;
  if (label === "Complete") return "COMPLETED";
  if (label === "Revoked") return "REVOKED";
  return label.toUpperCase().replace(" ", "_");
}

function DeleteTaskButton({
  task,
  deleteAction,
  onDeleted,
}: {
  task: TaskRow;
  deleteAction: (taskId: string) => Promise<void>;
  onDeleted: (taskId: string) => void;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label="Delete task">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent text-rose-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={open}
        title="Delete this task?"
        description="This will remove the task record, assignees, clarification history, and any uploaded report file."
        confirmLabel={isDeleting ? "Deleting..." : "Delete task"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteAction(task.id);
            onDeleted(task.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Task deleted",
              detail: "The task has been removed from the task list.",
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete task",
              detail:
                error instanceof Error
                  ? error.message
                  : "The task was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          Task:{" "}
          <span className="font-semibold text-[#E4E4E4]">{task.title}</span>
        </p>
        <p className="text-[#B0B0B0]">Task ID: {displayTaskId(task)}</p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function TasksClient({
  isAdmin,
  canDelete,
  deleteAction,
  action,
}: {
  isAdmin: boolean;
  canDelete: boolean;
  deleteAction: (taskId: string) => Promise<void>;
  action?: ReactNode;
}) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [query, setQuery] = usePersistentTableValue("tasks:q", "");
  const [status, setStatus] = usePersistentTableValue("tasks:status", "ALL");
  const [assignee, setAssignee] = usePersistentTableValue(
    "tasks:assignee",
    "ALL",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/research/tasks", {
        cache: "no-store",
      });
      if (!response.ok) {
        setLoadError(true);
        setIsLoading(false);
        return;
      }
      const payload = (await response.json()) as { tasks: TaskRow[] };
      setTasks(payload.tasks);
      setLoadError(false);
      setIsLoading(false);
    } catch {
      setLoadError(true);
      setIsLoading(false);
    }
  }, []);

  const removeTaskFromList = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }, []);

  useEffect(() => {
    let active = true;
    async function start() {
      await loadTasks();
      if (isAdmin) {
        await fetch("/api/research/tasks/viewed", { method: "POST" });
        if (active) await loadTasks();
      }
    }

    start();
    const interval = window.setInterval(() => {
      loadTasks();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAdmin, loadTasks]);

  const assigneeOptions = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach((task) =>
      task.assignments.forEach((assignment) => names.add(assignment.userName)),
    );
    return ["ALL", ...Array.from(names).sort()];
  }, [tasks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = status === "ALL" || derivedStatus(task) === status;
      const matchesAssignee =
        assignee === "ALL" ||
        task.assignments.some((item) => item.userName === assignee);
      const haystack = [
        displayTaskId(task),
        task.title,
        task.description,
        task.taskType,
        task.category,
        statusMeta(task).label,
        task.createdBy,
        ...task.assignments.flatMap((item) => [
          item.userName,
          item.userEmail,
          ...item.userRoles,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesStatus &&
        matchesAssignee &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [assignee, query, status, tasks]);
  const pagination = useTablePagination(filtered, 10, 1, "tasks");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    pagination.setPage(1);
  }

  function updateAssignee(value: string) {
    setAssignee(value);
    pagination.setPage(1);
  }

  const stats = [
    {
      label: "Tasks",
      value: tasks.length,
    },
    {
      label: "Active",
      value: tasks.filter(
        (task) => task.status !== "COMPLETED" && task.status !== "REVOKED",
      ).length,
    },
    {
      label: "Done",
      value: tasks.filter((task) => task.status === "COMPLETED").length,
    },
    {
      label: "People",
      value: assigneeOptions.length - 1,
    },
  ];

  return (
    <div className="space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4] ${
                  index > 0 ? "border-l border-[#444444]" : ""
                }`}
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-none items-center">{action}</div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <TableSearchInput
            value={query}
            onChange={updateQuery}
            placeholder="Search task, assistant, category..."
          />
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
            <FilterSelect
              value={status}
              onChange={updateStatus}
              ariaLabel="Filter by task status"
              options={[
                { value: "ALL", label: "All status" },
                { value: "IN_PROGRESS", label: "In progress" },
                { value: "CHECKING", label: "Checking" },
                { value: "NEED_CLARIFY", label: "Need clarify" },
                { value: "OVERDUE", label: "Overdue" },
                { value: "COMPLETED", label: "Completed" },
                { value: "REVOKED", label: "Revoked" },
              ]}
            />
            {isAdmin && (
              <FilterSelect
                value={assignee}
                onChange={updateAssignee}
                ariaLabel="Filter by assignee"
                options={assigneeOptions.map((item) => ({
                  value: item,
                  label: item === "ALL" ? "All assignees" : item,
                }))}
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left">
            <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
              <tr>
                <th className="w-[6rem] px-3 py-3">Task ID</th>
                <th className="px-3 py-3">Task</th>
                <th className="w-[7rem] px-3 py-3">Status</th>
                <th className="w-[9.5rem] px-3 py-3">Assignees</th>
                <th className="w-[11rem] px-3 py-3">Time</th>
                {canDelete && (
                  <th className="w-12 px-2 py-3 text-center">
                    <span className="sr-only">Delete</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#444444]">
              {pagination.pagedRows.map((task) => {
                const status = statusMeta(task);
                const statusIcon = statusIconMeta(task);
                const StatusIcon = statusIcon.icon;
                const typeLines = taskTypeLines(task);
                return (
                  <tr
                    key={task.id}
                    className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                  >
                    <td className="px-3 py-3 align-top">
                      <span className="font-mono text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
                        {displayTaskId(task)}
                      </span>
                      <p className="mt-1 text-[11px] font-normal leading-4 text-[#B0B0B0]">
                        {typeLines.typeLabel}
                      </p>
                      {typeLines.subtypeLabel && (
                        <p className="text-[11px] leading-4 text-[#777777]">
                          {typeLines.subtypeLabel}
                        </p>
                      )}
                    </td>
                    <td className="min-w-0 px-3 py-3 align-top">
                      <Link
                        href={`/tasks/${task.id}`}
                        className={`research-allow-transform text-sm font-normal leading-5 ${researchLinkClass}`}
                      >
                        {task.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs font-normal leading-5 text-[#B0B0B0]">
                        {task.description || "No description"}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <IconHint label={status.label}>
                        <span
                          className={`research-allow-transform inline-flex cursor-default items-center justify-center border-0 bg-transparent p-0 shadow-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none ${statusIcon.className}`}
                        >
                          <StatusIcon className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{status.label}</span>
                        </span>
                      </IconHint>
                    </td>
                    <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                      {task.assignments.length > 0 ? (
                        task.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="font-normal"
                            title={displayResearchEmail(assignment.userEmail)}
                          >
                            {displayResearchPersonName({
                              name: assignment.userName,
                              email: assignment.userEmail,
                            })}
                          </div>
                        ))
                      ) : (
                        <div className="text-[#777777]">Unassigned</div>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {status.dateLines.map((line) => (
                        <p
                          key={line}
                          className="break-words text-xs font-normal leading-5 text-[#B0B0B0]"
                        >
                          {line}
                        </p>
                      ))}
                      {status.detail && (
                        <p
                          className={`max-w-full break-words text-xs font-normal leading-5 ${status.detailClassName}`}
                        >
                          {status.detail}
                        </p>
                      )}
                    </td>
                    {canDelete && (
                      <td className="px-2 py-3 text-center align-top">
                        <DeleteTaskButton
                          task={task}
                          deleteAction={deleteAction}
                          onDeleted={removeTaskFromList}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
              {isLoading && pagination.total === 0 ? (
                <TableSkeletonRows rows={7} columns={canDelete ? 6 : 5} />
              ) : loadError && pagination.total === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="px-4 py-2">
                    <ResearchErrorState
                      title="Tasks could not load"
                      detail="Refresh the page or try again in a moment."
                    />
                  </td>
                </tr>
              ) : pagination.total === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="px-4 py-2">
                    <ResearchEmptyState
                      title="No tasks match the current filters."
                      detail={
                        tasks.length === 0
                          ? "Create a task to start tracking assigned work."
                          : "Try another keyword, status, or assignee."
                      }
                    />
                  </td>
                </tr>
              ) : null}
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
    </div>
  );
}
