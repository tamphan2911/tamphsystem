"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ClipboardList, Search, UsersRound } from "lucide-react";
import { FilterSelect, TablePagination, useTablePagination } from "../components/TableControls";

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

function statusClass(status: string) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (status === "IN_PROGRESS") return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

export function TasksClient({ isAdmin, userId }: { isAdmin: boolean; userId: string }) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [finishingId, setFinishingId] = useState<string | null>(null);

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

  async function markFinished(taskId: string) {
    setFinishingId(taskId);
    await fetch(`/api/research/tasks/${taskId}/finish`, { method: "POST" });
    await loadTasks();
    setFinishingId(null);
  }

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
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search task, assistant, category..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
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
            <FilterSelect
              value={assignee}
              onChange={setAssignee}
              ariaLabel="Filter by assignee"
              options={assigneeOptions.map((item) => ({ value: item, label: item === "ALL" ? "All assignees" : item }))}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[76rem] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">Task</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Assignees</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagination.pagedRows.map((task) => {
                const myAssignment = task.assignments.find((assignment) => assignment.userId === userId);
                const canFinish = !isAdmin && myAssignment && !myAssignment.finishedAt;
                return (
                  <tr key={task.id} className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="sticky left-0 z-10 max-w-md bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                      <p className="font-semibold text-slate-950 dark:text-white">{task.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{task.description || "No description"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${statusClass(task.status)}`}>{task.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{task.category || "-"}</td>
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
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(task.dueDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(task.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {canFinish ? (
                        <button
                          type="button"
                          onClick={() => markFinished(task.id)}
                          disabled={finishingId === task.id}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Finish
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">{task.status === "COMPLETED" ? "Done" : isAdmin ? "Tracking" : "Waiting"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pagination.total === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400">
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
