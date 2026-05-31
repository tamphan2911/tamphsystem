"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  Clock3,
  ClipboardList,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { ResearchConfirmDialog } from "../components/ResearchConfirmDialog";
import { TableSkeletonRows } from "../components/ResearchSkeleton";
import {
  ResearchEmptyState,
  ResearchErrorState,
} from "../components/ResearchState";
import { useResearchToast } from "../components/ResearchToast";

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
  return new Intl.DateTimeFormat("en-GB", {
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
  if (type === "PROJECT_PRODUCTION") {
    return { typeLabel: "Project", subtypeLabel: "Production" };
  }
  if (type === "PROJECT_RESEARCH_ASSOCIATED") {
    return { typeLabel: "Project", subtypeLabel: "Research Associated" };
  }

  return { typeLabel: titleCase(type), subtypeLabel: "" };
}

function statusMeta(task: TaskRow) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const completed = task.completedAt ? new Date(task.completedAt) : null;
  const now = new Date();

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
        "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
      detailClassName: "text-slate-500 dark:text-slate-400",
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
          "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    if (completed <= due) {
      return {
        label: "Complete",
        detail: `${durationText(due.getTime() - completed.getTime())} early`,
        dateLines: [`finished: ${formatDate(task.completedAt)}`],
        className:
          "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    return {
      label: "Overdue",
      detail: `${durationText(completed.getTime() - due.getTime())} late`,
      dateLines: [`finished: ${formatDate(task.completedAt)}`],
      className:
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  if (task.status === "CHECKING") {
    return {
      label: "Checking",
      detail: "Waiting assigner check",
      dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
      className:
        "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
      detailClassName: "text-violet-600 dark:text-violet-300",
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      label: "Need clarify",
      detail: "Waiting assigner answer",
      dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
      className:
        "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900",
      detailClassName: "text-amber-700 dark:text-amber-300",
    };
  }

  if (due && now > due) {
    return {
      label: "Overdue",
      detail: `${durationText(now.getTime() - due.getTime())} late`,
      dateLines: [],
      className:
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  return {
    label: "In progress",
    detail: due
      ? `${durationText(due.getTime() - now.getTime())} left`
      : "No due date",
    dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
    className:
      "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
    detailClassName: "text-slate-500 dark:text-slate-400",
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
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
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
          <span className="font-semibold text-slate-950 dark:text-white">
            {task.title}
          </span>
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          Task ID: {displayTaskId(task)}
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function TasksClient({
  isAdmin,
  deleteAction,
  action,
}: {
  isAdmin: boolean;
  deleteAction: (taskId: string) => Promise<void>;
  action?: ReactNode;
}) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
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
  const pagination = useTablePagination(filtered, 10);

  const stats = [
    {
      label: "Tasks",
      value: tasks.length,
      icon: ClipboardList,
      color: "text-slate-600 dark:text-slate-300",
    },
    {
      label: "Active",
      value: tasks.filter(
        (task) => task.status !== "COMPLETED" && task.status !== "REVOKED",
      ).length,
      icon: Clock3,
      color: "text-blue-600",
    },
    {
      label: "Done",
      value: tasks.filter((task) => task.status === "COMPLETED").length,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      label: "People",
      value: assigneeOptions.length - 1,
      icon: UsersRound,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div
              key={item.label}
              className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="text-base font-black text-slate-950 dark:text-white">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {action}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <TableSearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search task, assistant, category..."
          />
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
            <FilterSelect
              value={status}
              onChange={setStatus}
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
                onChange={setAssignee}
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
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-[6rem] px-3 py-3">Task ID</th>
                <th className="px-3 py-3">Task</th>
                <th className="w-[7rem] px-3 py-3">Status</th>
                <th className="w-[9.5rem] px-3 py-3">Assignees</th>
                <th className="w-[11rem] px-3 py-3">Time</th>
                {isAdmin && (
                  <th className="w-12 px-2 py-3 text-center">Delete</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagination.pagedRows.map((task) => {
                const status = statusMeta(task);
                return (
                  <tr
                    key={task.id}
                    className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-3 align-top">
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {displayTaskId(task)}
                      </span>
                      <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-400">
                        {taskTypeLines(task).typeLabel}
                      </p>
                      {taskTypeLines(task).subtypeLabel && (
                        <p className="text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                          {taskTypeLines(task).subtypeLabel}
                        </p>
                      )}
                    </td>
                    <td className="min-w-0 px-3 py-3 align-top">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-base font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                      >
                        {task.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {task.description || "No description"}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {task.assignments.map((assignment, index) => (
                        <div key={assignment.id} title={assignment.userEmail}>
                          {assignment.userName}
                          {index < task.assignments.length - 1 ? "," : ""}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {status.dateLines.map((line) => (
                        <p
                          key={line}
                          className="break-words text-xs font-medium leading-5 text-slate-500 dark:text-slate-400"
                        >
                          {line}
                        </p>
                      ))}
                      {status.detail && (
                        <p
                          className={`max-w-full break-words text-xs font-semibold leading-5 ${status.detailClassName}`}
                        >
                          {status.detail}
                        </p>
                      )}
                    </td>
                    {isAdmin && (
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
                <TableSkeletonRows rows={7} columns={isAdmin ? 6 : 5} />
              ) : loadError && pagination.total === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-2">
                    <ResearchErrorState
                      title="Tasks could not load"
                      detail="Refresh the page or try again in a moment."
                    />
                  </td>
                </tr>
              ) : pagination.total === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-4 py-2"
                  >
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
