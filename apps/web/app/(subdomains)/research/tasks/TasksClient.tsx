"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlarmClockCheck,
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpDown,
  ArrowUpZA,
  Ban,
  CheckCircle2,
  CircleHelp,
  Clock3,
  RotateCcw,
  SearchCheck,
  Trash2,
} from "lucide-react";
import {
  IconHint,
  MultiFilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentMultiFilter,
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
  productionSubtype: string | null;
  proposalScope: "research" | "project" | null;
  status: string;
  clarifyDirection: "ASSIGNEE_TO_MANAGER" | "MANAGER_TO_ASSIGNEE" | null;
  isUrgent: boolean;
  dueDate: string | null;
  completedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  checkerId: string;
  checker: string;
  checkerEmail: string;
  scope: {
    assignedToMe: boolean;
    relatedToMyItems: boolean;
    checkerForMe: boolean;
    assignerForMe?: boolean;
    adminAccess?: boolean;
    relatedToResearch?: boolean;
    relatedToOrganizedProject?: boolean;
  };
  assignments: TaskAssignment[];
};

const taskStatusValues = [
  "ALL",
  "IN_PROGRESS",
  "REVISION_REQUESTED",
  "CHECKING",
  "NEED_CLARIFY",
  "OVERDUE",
  "COMPLETED",
  "REVOKED",
];

const unfinishedTaskStatusValues = taskStatusValues.filter(
  (value) => value !== "ALL" && value !== "COMPLETED" && value !== "REVOKED",
);

const adminNeedActionStatusValues = ["NEED_CLARIFY", "CHECKING"];

const taskTypeFilterValues = [
  "ALL",
  "SUBMIT",
  "PRODUCTION",
  "SUGGEST_VENUE",
  "ADD_JOURNAL",
  "PROPOSAL_RESEARCH",
  "PROPOSAL_PROJECT",
  "REVIEW",
  "PROJECT",
  "OTHER",
];

type TaskScopeTab = "assigned" | "related" | "checker";
type TaskHeaderTab = TaskScopeTab | "all" | "need_action";
type TimeSortDirection = "none" | "asc" | "desc";

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

function productionSubtypeLabel(subtype: string | null) {
  if (subtype === "IDEA_FORMING") return "Idea forming";
  if (subtype === "DATA_COLLECTION") return "Data collection";
  if (subtype === "MODELING") return "Modeling";
  if (subtype === "WRITING") return "Writing";
  if (subtype === "HUMANIZING") return "Humanizing";
  if (subtype === "REFERENCES") return "References";
  return "";
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
    return {
      typeLabel:
        task.proposalScope === "project"
          ? "Project proposal"
          : "Research proposal",
      subtypeLabel: "",
    };
  }
  if (type === "PRODUCTION") {
    return {
      typeLabel: "Production",
      subtypeLabel: productionSubtypeLabel(task.productionSubtype),
    };
  }
  if (type === "PROJECT_PRODUCTION" || type === "PROJECT_RESEARCH_ASSOCIATED") {
    return { typeLabel: "Project", subtypeLabel: "" };
  }

  return { typeLabel: titleCase(type), subtypeLabel: "" };
}

function taskTypeFilterValue(task: TaskRow) {
  if (
    task.taskType === "SUBMIT_RESEARCH" ||
    task.taskType === "SUBMIT_CONFERENCE"
  ) {
    return "SUBMIT";
  }
  if (
    task.taskType === "PROJECT_PRODUCTION" ||
    task.taskType === "PROJECT_RESEARCH_ASSOCIATED"
  ) {
    return "PROJECT";
  }
  if (task.taskType === "PRODUCTION") return "PRODUCTION";
  if (task.taskType === "SUGGEST_VENUE") return "SUGGEST_VENUE";
  if (task.taskType === "ADD_JOURNAL") return "ADD_JOURNAL";
  if (task.taskType === "PROPOSAL") {
    return task.proposalScope === "project"
      ? "PROPOSAL_PROJECT"
      : "PROPOSAL_RESEARCH";
  }
  if (task.taskType === "REVIEW") return "REVIEW";
  return "OTHER";
}

function taskTypeFilterLabel(value: string) {
  if (value === "ALL") return "All types";
  if (value === "PROPOSAL_RESEARCH") return "Research proposal";
  if (value === "PROPOSAL_PROJECT") return "Project proposal";
  return titleCase(value);
}

function clarificationStatusDetail(
  direction?: TaskRow["clarifyDirection"] | null,
) {
  return direction === "MANAGER_TO_ASSIGNEE"
    ? "Waiting for assignee answer"
    : "Waiting for task manager answer";
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
      label: "Completed overdue",
      detail: `${durationText(completed.getTime() - due.getTime())} late`,
      dateLines: [`finished: ${formatDate(task.completedAt)}`],
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/40 dark:bg-amber-950/25 dark:text-amber-200",
      detailClassName: "text-[#A06716] dark:text-[#F4D47A]",
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

  if (task.status === "REVISION_REQUESTED") {
    return {
      label: "Revision requested",
      detail: "Waiting assignee revision",
      dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/40 dark:bg-orange-950/25 dark:text-orange-300",
      detailClassName: "text-orange-700 dark:text-orange-300",
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      label: "Need clarify",
      detail: clarificationStatusDetail(task.clarifyDirection),
      dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
      className:
        "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-300/40 dark:bg-cyan-950/25 dark:text-cyan-200",
      detailClassName: "text-cyan-700 dark:text-cyan-300",
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
    detail: due ? `${durationText(remainingMs ?? 0)} left` : "No due date",
    dateLines: due ? [`due: ${formatDate(task.dueDate)}`] : [],
    className:
      "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-300/40 dark:bg-yellow-950/25 dark:text-yellow-200",
    detailClassName:
      remainingMs !== null && remainingMs < 24 * 60 * 60 * 1000
        ? "font-semibold text-[#B64F48] dark:text-[#FFB4A2]"
        : "text-yellow-700 dark:text-yellow-300",
  };
}

function taskTimeLeftSortValue(task: TaskRow, nowMs: number) {
  const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
  if (!due || Number.isNaN(due)) return null;

  if (task.status === "REVOKED") return null;

  if (task.status === "COMPLETED") {
    const completed = task.completedAt
      ? new Date(task.completedAt).getTime()
      : null;
    return completed && !Number.isNaN(completed) ? due - completed : null;
  }

  return due - nowMs;
}

function taskRelationshipLabels(task: TaskRow) {
  const labels: string[] = [];
  if (task.scope.assignedToMe) labels.push("Assigned to me");
  if (task.scope.checkerForMe) labels.push("Me as checker");
  if (task.scope.assignerForMe) labels.push("Me as assigner");
  if (task.scope.relatedToResearch) labels.push("Related to my research");
  if (task.scope.relatedToOrganizedProject)
    labels.push("Related to my project");
  if (task.scope.adminAccess) labels.push("Admin access");
  if (labels.length === 0 && task.scope.relatedToMyItems) {
    labels.push("Related to me");
  }
  return labels;
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
    const due = task.dueDate ? new Date(task.dueDate) : null;
    const completed = task.completedAt ? new Date(task.completedAt) : null;
    if (due && completed && completed > due) {
      return {
        icon: AlarmClockCheck,
        className:
          "text-[#A06716] hover:text-[#7A4D10] dark:text-[#F4D47A] dark:hover:text-amber-200",
      };
    }
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

  if (task.status === "REVISION_REQUESTED") {
    return {
      icon: RotateCcw,
      className:
        "text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200",
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      icon: CircleHelp,
      className:
        "text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200",
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
      "text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200",
  };
}

function derivedStatus(task: TaskRow) {
  if (
    task.status === "CHECKING" ||
    task.status === "NEED_CLARIFY" ||
    task.status === "REVISION_REQUESTED"
  ) {
    return task.status;
  }
  const label = statusMeta(task).label;
  if (label === "Complete" || label === "Completed overdue") {
    return "COMPLETED";
  }
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
  isChiefAssistant,
  canDelete,
  deleteAction,
  action,
}: {
  isAdmin: boolean;
  isChiefAssistant: boolean;
  canDelete: boolean;
  deleteAction: (taskId: string) => Promise<void>;
  action?: ReactNode;
}) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [query, setQuery] = usePersistentTableValue("tasks:q", "");
  const scopeStorageKey = isAdmin
    ? "tasks:scope:admin"
    : isChiefAssistant
      ? "tasks:scope:chief-assistant"
      : "tasks:scope:user";
  const defaultScopeTab: TaskHeaderTab = isAdmin ? "all" : "assigned";
  const [scopeTab, setScopeTab] = usePersistentTableValue<TaskHeaderTab>(
    scopeStorageKey,
    defaultScopeTab,
  );
  const [statuses, setStatuses] = usePersistentMultiFilter(
    "tasks:status",
    taskStatusValues,
  );
  const hasStoredTaskStatus =
    typeof window !== "undefined" &&
    window.sessionStorage.getItem("research:/tasks:tasks:status") !== null;
  const [unfinishedOnlyValue, setUnfinishedOnlyValue] = usePersistentTableValue(
    "tasks:unfinished",
    isAdmin && !hasStoredTaskStatus ? "true" : "false",
    { persistDefaultValue: true },
  );
  const [timeSort, setTimeSort] = usePersistentTableValue<TimeSortDirection>(
    "tasks:timeSort",
    "none",
  );
  const unfinishedOnly = unfinishedOnlyValue === "true";
  const [statusBeforeUnfinished, setStatusBeforeUnfinished] = useState<
    string[] | null
  >(null);
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

  const [taskTypes, setTaskTypes] = usePersistentMultiFilter(
    "tasks:type",
    taskTypeFilterValues,
  );
  const checkerFilterValues = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(tasks.map((task) => task.checkerId))).filter(
        Boolean,
      ),
    ],
    [tasks],
  );
  const [checkerIds, setCheckerIds] = usePersistentMultiFilter(
    "tasks:checker",
    checkerFilterValues,
  );

  const activeHeaderTab: TaskHeaderTab = isAdmin
    ? scopeTab === "need_action"
      ? "need_action"
      : "all"
    : scopeTab === "checker" && !isChiefAssistant
      ? "assigned"
      : scopeTab === "related" || scopeTab === "checker"
        ? scopeTab
        : "assigned";
  const previousAdminTabRef = useRef<TaskHeaderTab | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const hasTaskPrefill =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("research:/tasks:tasks:prefill") ===
        "person-unfinished";
    if (hasTaskPrefill) {
      window.sessionStorage.removeItem("research:/tasks:tasks:prefill");
      setUnfinishedOnlyValue("true");
      setStatuses(unfinishedTaskStatusValues);
      setCheckerIds([]);
      return;
    }

    const previousAdminTab = previousAdminTabRef.current;
    previousAdminTabRef.current = activeHeaderTab;
    const enteredNeedActionTab =
      activeHeaderTab === "need_action" && previousAdminTab !== "need_action";

    if (enteredNeedActionTab) {
      setUnfinishedOnlyValue("false");
      setStatuses(adminNeedActionStatusValues);
      return;
    }

    if (
      activeHeaderTab !== "need_action" &&
      unfinishedOnly &&
      statuses.length === 0
    ) {
      setStatuses(unfinishedTaskStatusValues);
    }
  }, [
    activeHeaderTab,
    isAdmin,
    setCheckerIds,
    setStatuses,
    setUnfinishedOnlyValue,
    statuses.length,
    unfinishedOnly,
  ]);
  const initializedNonAdminTabRef = useRef(false);
  useEffect(() => {
    if (isAdmin || initializedNonAdminTabRef.current) return;
    initializedNonAdminTabRef.current = true;
    const allowedScopeTabs: TaskHeaderTab[] = isChiefAssistant
      ? ["assigned", "checker", "related"]
      : ["assigned", "related"];
    if (!allowedScopeTabs.includes(scopeTab as TaskHeaderTab)) {
      setScopeTab("assigned");
    }
  }, [isAdmin, isChiefAssistant, scopeTab, setScopeTab]);

  const previousNonAdminTabRef = useRef<TaskHeaderTab | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    const previousTab = previousNonAdminTabRef.current;
    previousNonAdminTabRef.current = activeHeaderTab;
    if (
      previousTab === null ||
      activeHeaderTab !== "related" ||
      previousTab === "related"
    ) {
      return;
    }

    setUnfinishedOnlyValue("false");
    setStatusBeforeUnfinished(null);
    setStatuses([]);
  }, [activeHeaderTab, isAdmin, setStatuses, setUnfinishedOnlyValue]);

  const scopeTabs: Array<{
    value: TaskHeaderTab;
    label: string;
    count: number;
  }> = isAdmin
    ? [
        {
          value: "all",
          label: "All tasks",
          count: tasks.length,
        },
        {
          value: "need_action",
          label: "Need actions",
          count: tasks.filter((task) => {
            const taskStatus = derivedStatus(task);
            return (
              taskStatus === "CHECKING" ||
              (taskStatus === "NEED_CLARIFY" &&
                task.clarifyDirection !== "MANAGER_TO_ASSIGNEE")
            );
          }).length,
        },
      ]
    : [
        {
          value: "assigned",
          label: "Assigned to me",
          count: tasks.filter((task) => task.scope.assignedToMe).length,
        },
        ...(isChiefAssistant
          ? [
              {
                value: "checker" as const,
                label: "As checker",
                count: tasks.filter((task) => task.scope.checkerForMe).length,
              },
            ]
          : []),
        {
          value: "related",
          label: "Related to me",
          count: tasks.filter((task) => task.scope.relatedToMyItems).length,
        },
      ];

  const checkerOptions = useMemo(() => {
    const byId = new Map<string, { value: string; label: string }>();
    tasks.forEach((task) => {
      if (!task.checkerId) return;
      byId.set(task.checkerId, {
        value: task.checkerId,
        label: task.checkerEmail
          ? `${task.checker} - ${displayResearchEmail(task.checkerEmail)}`
          : task.checker,
      });
    });
    return [
      { value: "ALL", label: "All checkers" },
      ...Array.from(byId.values()).sort((left, right) =>
        left.label.localeCompare(right.label, undefined, {
          sensitivity: "base",
        }),
      ),
    ];
  }, [tasks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const taskStatus = derivedStatus(task);
      const matchesScope = isAdmin
        ? activeHeaderTab === "need_action"
          ? taskStatus === "CHECKING" ||
            (taskStatus === "NEED_CLARIFY" &&
              task.clarifyDirection !== "MANAGER_TO_ASSIGNEE")
          : true
        : activeHeaderTab === "assigned"
          ? task.scope.assignedToMe
          : activeHeaderTab === "related"
            ? task.scope.relatedToMyItems
            : task.scope.checkerForMe;
      const matchesStatus =
        statuses.length === 0 || statuses.includes(taskStatus);
      const matchesType =
        taskTypes.length === 0 || taskTypes.includes(taskTypeFilterValue(task));
      const matchesChecker =
        !isAdmin ||
        checkerIds.length === 0 ||
        checkerIds.includes(task.checkerId);
      const haystack = [
        displayTaskId(task),
        task.title,
        task.description,
        task.taskType,
        productionSubtypeLabel(task.productionSubtype),
        task.category,
        statusMeta(task).label,
        task.createdBy,
        task.checker,
        ...task.assignments.flatMap((item) => [
          item.userName,
          item.userEmail,
          ...item.userRoles,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesScope &&
        matchesStatus &&
        matchesType &&
        matchesChecker &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [activeHeaderTab, checkerIds, isAdmin, query, statuses, taskTypes, tasks]);
  const sortedRows = useMemo(() => {
    if (timeSort === "none") return filtered;
    const nowMs = Date.now();

    return filtered
      .map((task, index) => ({ task, index }))
      .sort((left, right) => {
        const leftTime = taskTimeLeftSortValue(left.task, nowMs);
        const rightTime = taskTimeLeftSortValue(right.task, nowMs);
        const leftHasTimeLeft = leftTime !== null;
        const rightHasTimeLeft = rightTime !== null;
        if (leftHasTimeLeft !== rightHasTimeLeft)
          return leftHasTimeLeft ? -1 : 1;
        if (leftTime === null || rightTime === null) {
          return left.index - right.index;
        }
        const byTimeLeft =
          timeSort === "asc" ? leftTime - rightTime : rightTime - leftTime;
        if (byTimeLeft !== 0) return byTimeLeft;
        const byUpdated =
          new Date(right.task.updatedAt).getTime() -
          new Date(left.task.updatedAt).getTime();
        return byUpdated || left.index - right.index;
      })
      .map((item) => item.task);
  }, [filtered, timeSort]);
  const pagination = useTablePagination(sortedRows, 10, 1, "tasks", {
    preservePageWhenEmpty: true,
  });

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateScopeTab(value: TaskHeaderTab) {
    if (value === activeHeaderTab) return;

    setScopeTab(value);
    pagination.setPage(1);

    if (!isAdmin) {
      if (value === "related") {
        setUnfinishedOnlyValue("false");
        setStatusBeforeUnfinished(null);
        setStatuses([]);
      }
      return;
    }

    setQuery("");
    setTaskTypes([]);
    setCheckerIds([]);
    setStatusBeforeUnfinished(null);

    if (value === "need_action") {
      setUnfinishedOnlyValue("false");
      setStatuses(adminNeedActionStatusValues);
      return;
    }

    setUnfinishedOnlyValue("true");
    setStatusBeforeUnfinished([]);
    setStatuses(unfinishedTaskStatusValues);
  }

  function updateStatuses(values: string[]) {
    if (unfinishedOnly) {
      setUnfinishedOnlyValue("false");
      setStatusBeforeUnfinished(null);
    }
    setStatuses(values);
    pagination.setPage(1);
  }

  function toggleUnfinishedOnly(checked: boolean) {
    setUnfinishedOnlyValue(checked ? "true" : "false");
    if (checked) {
      setStatusBeforeUnfinished(statuses);
      setStatuses(unfinishedTaskStatusValues);
    } else {
      setStatuses(statusBeforeUnfinished ?? []);
      setStatusBeforeUnfinished(null);
    }
    pagination.setPage(1);
  }

  function updateTaskTypes(values: string[]) {
    setTaskTypes(values);
    pagination.setPage(1);
  }

  function updateCheckers(values: string[]) {
    setCheckerIds(values);
    pagination.setPage(1);
  }

  function toggleTimeSort() {
    setTimeSort((current) =>
      current === "none" ? "asc" : current === "asc" ? "desc" : "none",
    );
    pagination.setPage(1);
  }

  const adminFilterWidth = isAdmin ? "sm:w-40 lg:w-44" : undefined;
  const TimeSortIcon =
    timeSort === "asc"
      ? ArrowDownAZ
      : timeSort === "desc"
        ? ArrowUpZA
        : ArrowUpDown;
  const timeSortLabel =
    timeSort === "asc"
      ? "Sort time left from longest to shortest"
      : timeSort === "desc"
        ? "Clear time sorting"
        : "Sort time left from shortest to longest";

  return (
    <div className="space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div
            className={`journal-detail-tabs grid min-w-0 flex-1 grid-cols-2 border border-[#444444] bg-[#242424] p-1 text-center lg:max-w-2xl ${
              scopeTabs.length > 2 ? "lg:grid-cols-3" : "lg:grid-cols-2"
            }`}
          >
            {scopeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                data-active={activeHeaderTab === tab.value}
                aria-pressed={activeHeaderTab === tab.value}
                onClick={() => updateScopeTab(tab.value)}
                className="journal-detail-tab-button cursor-pointer rounded-none px-4 py-3 text-left"
              >
                <span className="relative z-10 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-normal uppercase tracking-wide">
                    {tab.label}
                  </span>
                  <span className="text-base font-normal">{tab.count}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-none items-center">{action}</div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center">
            <TableSearchInput
              value={query}
              onChange={updateQuery}
              placeholder="Search task, assistant, category..."
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
            <label className="inline-flex h-10 w-full cursor-pointer items-center gap-2 border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 sm:w-auto dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white">
              <input
                type="checkbox"
                checked={unfinishedOnly}
                onChange={(event) =>
                  toggleUnfinishedOnly(event.currentTarget.checked)
                }
                className="h-4 w-4 cursor-pointer rounded-none border-slate-300 text-sky-700 accent-[#1F7180] dark:border-[#666666] dark:accent-[#A8DADC]"
              />
              <IconHint label="Selects every status except completed and revoked. Turn it off to restore your previous status filter.">
                <span className="whitespace-nowrap text-left">Unfinished</span>
              </IconHint>
            </label>
            {isAdmin ? (
              <MultiFilterSelect
                className={adminFilterWidth}
                values={checkerIds}
                onChange={updateCheckers}
                ariaLabel="Filter by checker"
                options={checkerOptions}
              />
            ) : null}
            <MultiFilterSelect
              className={adminFilterWidth}
              values={taskTypes}
              onChange={updateTaskTypes}
              ariaLabel="Filter by task type"
              options={taskTypeFilterValues.map((value) => ({
                value,
                label: taskTypeFilterLabel(value),
              }))}
            />
            <MultiFilterSelect
              className={adminFilterWidth}
              values={statuses}
              onChange={updateStatuses}
              ariaLabel="Filter by task status"
              options={taskStatusValues.map((value) => ({
                value,
                label:
                  value === "ALL"
                    ? "All status"
                    : value === "CHECKING"
                      ? "Ready to check"
                      : value === "REVISION_REQUESTED"
                        ? "Revision requested"
                        : value
                            .toLowerCase()
                            .replaceAll("_", " ")
                            .replace(/^\w/, (letter) => letter.toUpperCase()),
              }))}
            />
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
                <th className="w-[11rem] px-3 py-3">
                  <span className="flex items-center gap-1.5">
                    <span>Time</span>
                    <IconHint label={timeSortLabel}>
                      <button
                        type="button"
                        onClick={toggleTimeSort}
                        aria-label={timeSortLabel}
                        aria-pressed={timeSort !== "none"}
                        className={`research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 shadow-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none ${
                          timeSort === "none"
                            ? "text-[#8F98A8] hover:text-[#A8DADC]"
                            : "text-[#A8DADC]"
                        }`}
                      >
                        <TimeSortIcon className="h-3.5 w-3.5" />
                      </button>
                    </IconHint>
                  </span>
                </th>
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
                const relationshipLabels = taskRelationshipLabels(task);
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
                      <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-xs font-normal leading-5 text-[#B0B0B0]">
                        {task.description || "No description"}
                      </p>
                      {relationshipLabels.length > 0 ? (
                        <p className="mt-1 flex flex-wrap items-center text-[11px] font-normal leading-4 text-[#1F7180] dark:text-[#A8DADC]">
                          {relationshipLabels.map((relationship, index) => (
                            <span
                              key={relationship}
                              className="inline-flex items-center"
                            >
                              {index > 0 ? (
                                <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">
                                  |
                                </span>
                              ) : null}
                              <span>{relationship}</span>
                            </span>
                          ))}
                        </p>
                      ) : null}
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
                            className="space-y-0.5 font-normal"
                            title={displayResearchEmail(assignment.userEmail)}
                          >
                            <div>
                              {displayResearchPersonName({
                                name: assignment.userName,
                                email: assignment.userEmail,
                              })}
                            </div>
                            <div className="break-all text-[11px] leading-4 text-[#667085] dark:text-[#8F98A8]">
                              {displayResearchEmail(assignment.userEmail)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-[#777777]">Unassigned</div>
                      )}
                      {task.isUrgent ? (
                        <p className="mt-1 text-[11px] font-normal uppercase tracking-wide text-[#B33E5C] dark:text-[#FF9DAE]">
                          Urgent
                        </p>
                      ) : null}
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
                      <p className="max-w-full break-words text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]">
                        checker: {task.checker}
                      </p>
                      <p className="max-w-full break-words text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]">
                        Assigner: {task.createdBy}
                      </p>
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
                          : "Try another keyword, status, or task type."
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
