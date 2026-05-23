"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ClipboardList, UsersRound } from "lucide-react";
import {
  FilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";

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
  const label = statusMeta(task).label;
  if (label === "Complete") return "COMPLETED";
  if (label === "Revoked") return "REVOKED";
  return label.toUpperCase().replace(" ", "_");
}

export function TasksClient({ isAdmin }: { isAdmin: boolean }) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    const response = await fetch("/api/research/tasks", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { tasks: TaskRow[] };
    setTasks(payload.tasks);
    setIsLoading(false);
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

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-[6.5rem] px-3 py-3">Task ID</th>
                <th className="px-3 py-3">Task</th>
                <th className="w-[7.5rem] px-3 py-3">Status</th>
                <th className="w-[10rem] px-3 py-3">Assignees</th>
                <th className="w-[8.5rem] px-3 py-3">Time</th>
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
                          className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400"
                        >
                          {line}
                        </p>
                      ))}
                      {status.detail && (
                        <p
                          className={`whitespace-nowrap text-xs font-semibold ${status.detailClassName}`}
                        >
                          {status.detail}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pagination.total === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {isLoading
                      ? "Loading tasks..."
                      : "No tasks match the current filters."}
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
    </div>
  );
}
