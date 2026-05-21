"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ClipboardList, UsersRound } from "lucide-react";
import { FilterSelect, TablePagination, TableSearchInput, useTablePagination } from "../components/TableControls";

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
  title: string;
  description: string;
  category: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignments: TaskAssignment[];
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function durationText(ms: number) {
  const absolute = Math.abs(ms);
  const hours = Math.max(1, Math.round(absolute / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}

function statusMeta(task: TaskRow) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const completed = task.completedAt ? new Date(task.completedAt) : null;
  const now = new Date();

  if (task.status === "COMPLETED") {
    if (!due || !completed) {
      return {
        label: "Complete",
        detail: "Finished",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    if (completed <= due) {
      return {
        label: "Complete",
        detail: `${durationText(due.getTime() - completed.getTime())} before due`,
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    return {
      label: "Overdue",
      detail: `${durationText(completed.getTime() - due.getTime())} late finish`,
      className: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  if (due && now > due) {
    return {
      label: "Overdue",
      detail: `${durationText(now.getTime() - due.getTime())} overdue`,
      className: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }

  return {
    label: task.status === "IN_PROGRESS" ? "In progress" : "Open",
    detail: due ? `${durationText(due.getTime() - now.getTime())} remaining` : "No due date",
    className:
      task.status === "IN_PROGRESS"
        ? "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900"
        : "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    detailClassName: "text-slate-500 dark:text-slate-400",
  };
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
    tasks.forEach((task) => task.assignments.forEach((assignment) => names.add(assignment.userName)));
    return ["ALL", ...Array.from(names).sort()];
  }, [tasks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = status === "ALL" || task.status === status;
      const matchesAssignee = assignee === "ALL" || task.assignments.some((item) => item.userName === assignee);
      const haystack = [
        task.title,
        task.description,
        task.category,
        task.status,
        task.createdBy,
        ...task.assignments.flatMap((item) => [item.userName, item.userEmail, ...item.userRoles]),
      ].join(" ").toLowerCase();
      return matchesStatus && matchesAssignee && (!needle || haystack.includes(needle));
    });
  }, [assignee, query, status, tasks]);
  const pagination = useTablePagination(filtered, 10);

  const stats = [
    { label: "Tasks", value: tasks.length, icon: ClipboardList, color: "text-slate-600 dark:text-slate-300" },
    { label: "Open", value: tasks.filter((task) => task.status !== "COMPLETED").length, icon: Clock3, color: "text-blue-600" },
    { label: "Done", value: tasks.filter((task) => task.status === "COMPLETED").length, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "People", value: assigneeOptions.length - 1, icon: UsersRound, color: "text-purple-600" },
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="text-base font-black text-slate-950 dark:text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <TableSearchInput value={query} onChange={setQuery} placeholder="Search task, assistant, category..." />
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={status}
              onChange={setStatus}
              ariaLabel="Filter by task status"
              options={[
                { value: "ALL", label: "All status" },
                { value: "OPEN", label: "Open" },
                { value: "IN_PROGRESS", label: "In progress" },
                { value: "COMPLETED", label: "Completed" },
              ]}
            />
            {isAdmin && (
              <FilterSelect
                value={assignee}
                onChange={setAssignee}
                ariaLabel="Filter by assignee"
                options={assigneeOptions.map((item) => ({ value: item, label: item === "ALL" ? "All assignees" : item }))}
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left ${isAdmin ? "min-w-[58rem]" : "min-w-[42rem]"}`}>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">Task</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3">Assignees</th>}
                <th className="px-4 py-3">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagination.pagedRows.map((task) => {
                const status = statusMeta(task);
                return (
                  <tr key={task.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="sticky left-0 z-10 max-w-md bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                      <Link href={`/tasks/${task.id}`} className="text-sm font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300">
                        {task.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{task.description || "No description"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ${status.className}`}>{status.label}</span>
                      <p className={`mt-1 text-xs font-semibold ${status.detailClassName}`}>{status.detail}</p>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {task.assignments.map((assignment) => (
                            <span
                              key={assignment.id}
                              className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${
                                assignment.finishedAt
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                                  : "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                              }`}
                              title={assignment.userEmail}
                            >
                              {assignment.userName}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(task.dueDate)}</td>
                  </tr>
                );
              })}
              {pagination.total === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
                    {isLoading ? "Loading tasks..." : "No tasks match the current filters."}
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
