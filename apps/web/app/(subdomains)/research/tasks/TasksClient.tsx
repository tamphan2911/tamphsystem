"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlarmClockCheck,
  AlertTriangle,
  ArrowUpDown,
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
  parseMultiFilterValue,
  TablePagination,
  TableSearchInput,
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
  dueDate: string | null;
  finishedAt: string | null;
  completedAt: string | null;
  redoRequestedAt: string | null;
  redoReason: string | null;
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
  currentUserAssignmentId: string | null;
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
  checkerRoles: string[];
  managerAction: {
    label: string;
    startedAt: string;
  } | null;
  waitingForJournalCreation: boolean;
  addJournalCorrection: {
    detail: string;
    count: number;
  } | null;
  addJournalReview: {
    detail: string;
    pendingPublisherCount: number;
    pendingJournalCount: number;
    addedCount: number;
    targetCount: number;
  } | null;
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
type TaskListMeta = {
  page: number;
  pageSize: number;
  total: number;
  scopeCounts: Record<TaskHeaderTab, number>;
  checkerOptions: Array<{
    value: string;
    label: string;
    isAdminChecker: boolean;
  }>;
  adminNeedActionDefaultCheckerIds: string[];
};
type TaskTabFilterState = {
  statuses: string[];
  setStatuses: (values: string[]) => void;
  unfinishedOnlyValue: string;
  setUnfinishedOnlyValue: Dispatch<SetStateAction<string>>;
};
const managerActionSlaMs = 24 * 60 * 60 * 1000;

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

function assignmentTimingMeta({
  dueDate,
  finishedAt,
  completedAt,
}: {
  dueDate: string | null;
  finishedAt: string | null;
  completedAt: string | null;
}) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const finishDate = completedAt
    ? new Date(completedAt)
    : finishedAt
      ? new Date(finishedAt)
      : null;

  if (finishDate) {
    const diff = due.getTime() - finishDate.getTime();
    return diff >= 0
      ? {
          label: `Finished ${durationText(diff)} early`,
          className: "font-medium text-emerald-700 dark:text-emerald-300",
        }
      : {
          label: `Finished ${durationText(diff)} late`,
          className: "font-medium text-rose-700 dark:text-rose-300",
        };
  }

  const remainingMs = due.getTime() - Date.now();
  return remainingMs >= 0
    ? {
        label: `${durationText(remainingMs)} left`,
        className:
          remainingMs < 24 * 60 * 60 * 1000
            ? "font-semibold text-[#B64F48] dark:text-[#FFB4A2]"
            : "font-medium text-sky-700 dark:text-[#A8DADC]",
      }
    : {
        label: `${durationText(remainingMs)} overdue`,
        className: "font-semibold text-rose-700 dark:text-rose-300",
      };
}

function assignmentWorkflowMeta(assignment: TaskAssignment): {
  label: string;
  detail: string;
  icon: LucideIcon;
  className: string;
} {
  if (assignment.completedAt) {
    return {
      label: "Complete",
      detail: `This assignee was approved complete on ${formatDate(assignment.completedAt)}.`,
      icon: CheckCircle2,
      className:
        "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
    };
  }
  if (assignment.redoRequestedAt) {
    return {
      label: "Redo",
      detail: assignment.redoReason
        ? `Redo requested: ${assignment.redoReason}`
        : "Redo requested for this assignee.",
      icon: RotateCcw,
      className:
        "text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200",
    };
  }
  if (assignment.finishedAt) {
    return {
      label: "Ready",
      detail: `Ready for check since ${formatDate(assignment.finishedAt)}.`,
      icon: SearchCheck,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
    };
  }
  return {
    label: "In progress",
    detail: "This assignee has not marked their work ready for check yet.",
    icon: Clock3,
    className:
      "text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200",
  };
}

function currentUserAssignment(task: TaskRow) {
  if (!task.currentUserAssignmentId) return null;
  return (
    task.assignments.find(
      (assignment) => assignment.id === task.currentUserAssignmentId,
    ) ?? null
  );
}

function shouldUseAssigneeStatus(task: TaskRow, activeTab: TaskHeaderTab) {
  return (
    activeTab === "assigned" &&
    task.scope.assignedToMe &&
    task.assignments.length > 1 &&
    Boolean(currentUserAssignment(task))
  );
}

function assigneeTableStatusMeta(task: TaskRow, activeTab: TaskHeaderTab) {
  if (!shouldUseAssigneeStatus(task, activeTab)) return null;
  if (task.status === "REVOKED") return null;

  const assignment = currentUserAssignment(task);
  if (!assignment) return null;

  if (assignment.completedAt) {
    return {
      label: "Your part complete",
      text: "Your part complete",
      icon: CheckCircle2,
      className:
        "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
      textClassName: "text-emerald-700 dark:text-emerald-300",
    };
  }

  if (assignment.redoRequestedAt) {
    return {
      label: "Redo requested for your part",
      text: "Redo requested",
      icon: RotateCcw,
      className:
        "text-orange-700 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200",
      textClassName: "text-orange-700 dark:text-orange-300",
    };
  }

  if (assignment.finishedAt) {
    return {
      label: "Your part is ready for check",
      text: "Ready for check",
      icon: SearchCheck,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
      textClassName: "text-violet-700 dark:text-violet-300",
    };
  }

  return {
    label: "Your part is in progress",
    text: "In progress",
    icon: Clock3,
    className:
      "text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200",
    textClassName: "text-yellow-700 dark:text-yellow-300",
  };
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

function pendingReadyAssignmentCount(task: TaskRow) {
  return task.assignments.filter(
    (assignment) => assignment.finishedAt && !assignment.completedAt,
  ).length;
}

function pendingReadyAssignmentText(task: TaskRow) {
  const count = pendingReadyAssignmentCount(task);
  if (count === 0 || task.status !== "IN_PROGRESS") {
    return null;
  }

  return count === 1 ? "1 assignee ready" : `${count} assignees ready`;
}

function activeWaitingForJournalCreation(task: TaskRow) {
  return task.waitingForJournalCreation && task.status === "IN_PROGRESS";
}

function activeAddJournalCorrection(task: TaskRow): task is TaskRow & {
  addJournalCorrection: NonNullable<TaskRow["addJournalCorrection"]>;
} {
  return (
    Boolean(task.addJournalCorrection) && task.status === "REVISION_REQUESTED"
  );
}

function activeAddJournalReview(task: TaskRow): task is TaskRow & {
  addJournalReview: NonNullable<TaskRow["addJournalReview"]>;
} {
  return Boolean(task.addJournalReview) && task.status === "CHECKING";
}

function activeManagerAction(task: TaskRow) {
  if (!task.managerAction) return null;
  if (
    task.status === "COMPLETED" ||
    task.status === "REVOKED" ||
    task.status === "REVISION_REQUESTED"
  ) {
    return null;
  }
  if (task.status === "IN_PROGRESS") {
    return pendingReadyAssignmentText(task) ? task.managerAction : null;
  }
  if (task.status === "CHECKING") return task.managerAction;
  if (task.status === "NEED_CLARIFY") {
    return task.clarifyDirection === "ASSIGNEE_TO_MANAGER"
      ? task.managerAction
      : null;
  }
  return null;
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
        `Due: ${formatDate(task.dueDate)}`,
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

  if (activeWaitingForJournalCreation(task)) {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      label: "In progress",
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${formatDate(task.dueDate)}`] : [],
      secondaryDetail: "Waiting for assignee to add journal",
      className:
        "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-300/40 dark:bg-yellow-950/25 dark:text-yellow-200",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-[#1F7180] dark:text-[#A8DADC]",
    };
  }

  if (activeAddJournalCorrection(task)) {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      label: "Correction requested",
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${formatDate(task.dueDate)}`] : [],
      secondaryDetail: task.addJournalCorrection.detail,
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/40 dark:bg-orange-950/25 dark:text-orange-300",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-orange-700 dark:text-orange-300",
    };
  }

  if (activeAddJournalReview(task)) {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      label: "Checking",
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${formatDate(task.dueDate)}`] : [],
      secondaryDetail: task.addJournalReview.detail,
      className:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-300/40 dark:bg-violet-950/25 dark:text-violet-300",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-violet-600 dark:text-violet-300",
    };
  }

  if (task.status === "CHECKING") {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      label: "Checking",
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${formatDate(task.dueDate)}`] : [],
      secondaryDetail: "Waiting assigner check",
      className:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-300/40 dark:bg-violet-950/25 dark:text-violet-300",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-violet-600 dark:text-violet-300",
    };
  }

  if (task.status === "REVISION_REQUESTED") {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      label: "Revision requested",
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${formatDate(task.dueDate)}`] : [],
      secondaryDetail: "Waiting assignee revision",
      className:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/40 dark:bg-orange-950/25 dark:text-orange-300",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-orange-700 dark:text-orange-300",
    };
  }

  if (task.status === "NEED_CLARIFY") {
    const activeDue = activeDueMeta(due, remainingMs);
    return {
      label: "Need clarify",
      detail: activeDue.detail,
      dateLines: due ? [`Due: ${formatDate(task.dueDate)}`] : [],
      secondaryDetail: clarificationStatusDetail(task.clarifyDirection),
      className:
        "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-300/40 dark:bg-cyan-950/25 dark:text-cyan-200",
      detailClassName: activeDue.detailClassName,
      secondaryDetailClassName: "text-cyan-700 dark:text-cyan-300",
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
    dateLines: due ? [`Due: ${formatDate(task.dueDate)}`] : [],
    className:
      "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-300/40 dark:bg-yellow-950/25 dark:text-yellow-200",
    detailClassName:
      remainingMs !== null && remainingMs < 24 * 60 * 60 * 1000
        ? "font-semibold text-[#B64F48] dark:text-[#FFB4A2]"
        : "text-yellow-700 dark:text-yellow-300",
  };
}

function managerActionMeta(task: TaskRow, nowMs: number) {
  const managerAction = activeManagerAction(task);
  if (!managerAction) return null;

  const startedAt = new Date(managerAction.startedAt).getTime();
  if (Number.isNaN(startedAt)) return null;

  const remainingMs = startedAt + managerActionSlaMs - nowMs;
  const isOverdue = remainingMs < 0;

  return {
    label: managerAction.label,
    text: isOverdue
      ? `${durationText(remainingMs)} overdue`
      : `${durationText(remainingMs)} left`,
    className: isOverdue
      ? "text-[#B42318] dark:text-[#FFB4A2]"
      : "text-[#A06716] dark:text-[#F4D47A]",
  };
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
  if (pendingReadyAssignmentText(task)) {
    return {
      icon: SearchCheck,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
    };
  }

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

  if (task.status === "CHECKING" || activeAddJournalReview(task)) {
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
  const activeHeaderTab: TaskHeaderTab = isAdmin
    ? scopeTab === "need_action"
      ? "need_action"
      : "all"
    : scopeTab === "checker" && !isChiefAssistant
      ? "assigned"
      : scopeTab === "related" || scopeTab === "checker"
        ? scopeTab
        : "assigned";
  const [userStatuses, setUserStatuses] = usePersistentMultiFilter(
    "tasks:status",
    taskStatusValues,
  );
  const [adminAllStatuses, setAdminAllStatuses] = usePersistentMultiFilter(
    "tasks:status:admin:all",
    taskStatusValues,
  );
  const [adminNeedActionStatuses, setAdminNeedActionStatuses] =
    usePersistentMultiFilter(
      "tasks:status:admin:need-action",
      taskStatusValues,
    );
  const [chiefAssignedStatuses, setChiefAssignedStatuses] =
    usePersistentMultiFilter("tasks:status:chief:assigned", taskStatusValues);
  const [chiefCheckerStatuses, setChiefCheckerStatuses] =
    usePersistentMultiFilter("tasks:status:chief:checker", taskStatusValues);
  const [chiefRelatedStatuses, setChiefRelatedStatuses] =
    usePersistentMultiFilter("tasks:status:chief:related", taskStatusValues);
  const legacyUnfinishedOnlyValue =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("research:/tasks:tasks:unfinished")
      : null;
  const [userUnfinishedOnlyValue, setUserUnfinishedOnlyValue] =
    usePersistentTableValue(
      "tasks:unfinished",
      !isAdmin && !isChiefAssistant
        ? (legacyUnfinishedOnlyValue ?? "false")
        : "false",
    );
  const [adminAllUnfinishedOnlyValue, setAdminAllUnfinishedOnlyValue] =
    usePersistentTableValue("tasks:unfinished:admin:all", "true");
  const [
    adminNeedActionUnfinishedOnlyValue,
    setAdminNeedActionUnfinishedOnlyValue,
  ] = usePersistentTableValue("tasks:unfinished:admin:need-action", "false");
  const [
    chiefAssignedUnfinishedOnlyValue,
    setChiefAssignedUnfinishedOnlyValue,
  ] = usePersistentTableValue("tasks:unfinished:chief:assigned", "false");
  const [chiefCheckerUnfinishedOnlyValue, setChiefCheckerUnfinishedOnlyValue] =
    usePersistentTableValue("tasks:unfinished:chief:checker", "false");
  const [chiefRelatedUnfinishedOnlyValue, setChiefRelatedUnfinishedOnlyValue] =
    usePersistentTableValue("tasks:unfinished:chief:related", "false");
  const currentTabFilter: TaskTabFilterState = isAdmin
    ? activeHeaderTab === "need_action"
      ? {
          statuses: adminNeedActionStatuses,
          setStatuses: setAdminNeedActionStatuses,
          unfinishedOnlyValue: adminNeedActionUnfinishedOnlyValue,
          setUnfinishedOnlyValue: setAdminNeedActionUnfinishedOnlyValue,
        }
      : {
          statuses: adminAllStatuses,
          setStatuses: setAdminAllStatuses,
          unfinishedOnlyValue: adminAllUnfinishedOnlyValue,
          setUnfinishedOnlyValue: setAdminAllUnfinishedOnlyValue,
        }
    : isChiefAssistant
      ? activeHeaderTab === "checker"
        ? {
            statuses: chiefCheckerStatuses,
            setStatuses: setChiefCheckerStatuses,
            unfinishedOnlyValue: chiefCheckerUnfinishedOnlyValue,
            setUnfinishedOnlyValue: setChiefCheckerUnfinishedOnlyValue,
          }
        : activeHeaderTab === "related"
          ? {
              statuses: chiefRelatedStatuses,
              setStatuses: setChiefRelatedStatuses,
              unfinishedOnlyValue: chiefRelatedUnfinishedOnlyValue,
              setUnfinishedOnlyValue: setChiefRelatedUnfinishedOnlyValue,
            }
          : {
              statuses: chiefAssignedStatuses,
              setStatuses: setChiefAssignedStatuses,
              unfinishedOnlyValue: chiefAssignedUnfinishedOnlyValue,
              setUnfinishedOnlyValue: setChiefAssignedUnfinishedOnlyValue,
            }
      : {
          statuses: userStatuses,
          setStatuses: setUserStatuses,
          unfinishedOnlyValue: userUnfinishedOnlyValue,
          setUnfinishedOnlyValue: setUserUnfinishedOnlyValue,
        };
  const { statuses, setStatuses, unfinishedOnlyValue, setUnfinishedOnlyValue } =
    currentTabFilter;
  const [timeSort, setTimeSort] = usePersistentTableValue<TimeSortDirection>(
    "tasks:timeSort",
    "none",
  );
  const [checkerNeedsActionOnlyValue, setCheckerNeedsActionOnlyValue] =
    usePersistentTableValue("tasks:checkerNeedsActionOnly", "false", {
      persistDefaultValue: true,
    });
  const [pageValue, setPageValue] = usePersistentTableValue("tasks:page", "1");
  const unfinishedOnly = unfinishedOnlyValue === "true";
  const checkerNeedsActionOnly = checkerNeedsActionOnlyValue === "true";
  const [statusBeforeUnfinishedByTab, setStatusBeforeUnfinishedByTab] =
    useState<Partial<Record<TaskHeaderTab, string[] | null>>>({});
  const statusBeforeUnfinished =
    statusBeforeUnfinishedByTab[activeHeaderTab] ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [listMeta, setListMeta] = useState<TaskListMeta>({
    page: 1,
    pageSize: 10,
    total: 0,
    scopeCounts: {
      all: 0,
      need_action: 0,
      assigned: 0,
      checker: 0,
      related: 0,
    },
    checkerOptions: [],
    adminNeedActionDefaultCheckerIds: [],
  });
  const page = Math.max(Number.parseInt(pageValue, 10) || 1, 1);
  const pageCount = Math.max(1, Math.ceil(listMeta.total / listMeta.pageSize));
  const loadRequestIdRef = useRef(0);

  const removeTaskFromList = useCallback((taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }, []);

  const [taskTypes, setTaskTypes] = usePersistentMultiFilter(
    "tasks:type",
    taskTypeFilterValues,
  );
  const checkerFilterValues = useMemo(
    () => ["ALL", ...listMeta.checkerOptions.map((option) => option.value)],
    [listMeta.checkerOptions],
  );
  const adminNeedActionDefaultCheckerIds = useMemo(
    () => listMeta.adminNeedActionDefaultCheckerIds,
    [listMeta.adminNeedActionDefaultCheckerIds],
  );
  const [adminAllCheckerStoredValue, setAdminAllCheckerStoredValue] =
    usePersistentTableValue("tasks:checker:admin:all", "ALL", {
      persistDefaultValue: true,
    });
  const [
    adminNeedActionCheckerStoredValue,
    setAdminNeedActionCheckerStoredValue,
  ] = usePersistentTableValue(
    "tasks:checker:admin:need-action",
    "__DEFAULT__",
    {
      persistDefaultValue: true,
    },
  );
  const [userCheckerStoredValue, setUserCheckerStoredValue] =
    usePersistentTableValue("tasks:checker", "ALL");
  const activeCheckerStoredValue = isAdmin
    ? activeHeaderTab === "need_action"
      ? adminNeedActionCheckerStoredValue
      : adminAllCheckerStoredValue
    : userCheckerStoredValue;
  const checkerIds = useMemo(() => {
    if (
      isAdmin &&
      activeHeaderTab === "need_action" &&
      adminNeedActionCheckerStoredValue === "__DEFAULT__"
    ) {
      return adminNeedActionDefaultCheckerIds;
    }

    return parseMultiFilterValue(activeCheckerStoredValue, checkerFilterValues);
  }, [
    activeCheckerStoredValue,
    activeHeaderTab,
    adminNeedActionDefaultCheckerIds,
    adminNeedActionCheckerStoredValue,
    checkerFilterValues,
    isAdmin,
  ]);
  const loadTasks = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      if (options?.showLoading) {
        setIsLoading(true);
        setLoadError(false);
      }
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        params.set("scope", activeHeaderTab);
        if (statuses.length > 0) params.set("status", statuses.join(","));
        if (taskTypes.length > 0) params.set("type", taskTypes.join(","));
        if (checkerIds.length > 0) params.set("checker", checkerIds.join(","));
        if (checkerNeedsActionOnly) params.set("checkerNeedsAction", "1");
        if (timeSort !== "none") params.set("timeSort", timeSort);
        if (page > 1) params.set("page", String(page));
        const response = await fetch(
          `/api/research/tasks?${params.toString()}`,
          {
            cache: "no-store",
          },
        );
        if (requestId !== loadRequestIdRef.current) return;
        if (!response.ok) {
          setLoadError(true);
          setIsLoading(false);
          return;
        }
        const payload = (await response.json()) as {
          tasks: TaskRow[];
          meta?: TaskListMeta;
        };
        if (requestId !== loadRequestIdRef.current) return;
        setTasks(payload.tasks);
        if (payload.meta) {
          setListMeta(payload.meta);
          if (payload.meta.page !== page) {
            setPageValue(String(payload.meta.page));
          }
        }
        setLoadError(false);
        setIsLoading(false);
      } catch {
        if (requestId !== loadRequestIdRef.current) return;
        setLoadError(true);
        setIsLoading(false);
      }
    },
    [
      activeHeaderTab,
      checkerIds,
      checkerNeedsActionOnly,
      page,
      query,
      setPageValue,
      statuses,
      taskTypes,
      timeSort,
    ],
  );

  useEffect(() => {
    let active = true;
    async function start() {
      await loadTasks({ showLoading: true });
      if (isAdmin) {
        await fetch("/api/research/tasks/viewed", { method: "POST" });
        if (active) await loadTasks();
      }
    }

    start();
    const interval = window.setInterval(() => {
      loadTasks();
    }, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isAdmin, loadTasks]);
  const setCheckerIds = useCallback(
    (values: string[]) => {
      const nextValue = values.length > 0 ? values.join(",") : "ALL";
      if (!isAdmin) {
        setUserCheckerStoredValue(nextValue);
        return;
      }
      if (activeHeaderTab === "need_action") {
        setAdminNeedActionCheckerStoredValue(nextValue);
        return;
      }
      setAdminAllCheckerStoredValue(nextValue);
    },
    [
      activeHeaderTab,
      isAdmin,
      setAdminAllCheckerStoredValue,
      setAdminNeedActionCheckerStoredValue,
      setUserCheckerStoredValue,
    ],
  );

  useEffect(() => {
    if (!isAdmin) return;
    const hasTaskPrefill =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("research:/tasks:tasks:prefill") ===
        "person-unfinished";
    if (hasTaskPrefill) {
      window.sessionStorage.removeItem("research:/tasks:tasks:prefill");
      setScopeTab("all");
      setUnfinishedOnlyValue("true");
      setStatuses(unfinishedTaskStatusValues);
      setCheckerIds([]);
      return;
    }

    if (unfinishedOnly && statuses.length === 0) {
      setStatuses(unfinishedTaskStatusValues);
    }
  }, [
    isAdmin,
    setScopeTab,
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

  useEffect(() => {
    if (isAdmin) return;
    if (unfinishedOnly && statuses.length === 0) {
      setStatuses(unfinishedTaskStatusValues);
    }
  }, [isAdmin, setStatuses, statuses.length, unfinishedOnly]);

  const scopeTabs: Array<{
    value: TaskHeaderTab;
    label: string;
    count: number;
  }> = isAdmin
    ? [
        {
          value: "all",
          label: "All tasks",
          count: listMeta.scopeCounts.all,
        },
        {
          value: "need_action",
          label: "Need actions",
          count: listMeta.scopeCounts.need_action,
        },
      ]
    : [
        {
          value: "assigned",
          label: "Assigned to me",
          count: listMeta.scopeCounts.assigned,
        },
        ...(isChiefAssistant
          ? [
              {
                value: "checker" as const,
                label: "As checker",
                count: listMeta.scopeCounts.checker,
              },
            ]
          : []),
        {
          value: "related",
          label: "Related to me",
          count: listMeta.scopeCounts.related,
        },
      ];

  const checkerOptions = useMemo(() => {
    return [
      { value: "ALL", label: "All checkers" },
      ...listMeta.checkerOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ];
  }, [listMeta.checkerOptions]);

  function updateQuery(value: string) {
    setQuery(value);
    setPageValue("1");
  }

  function setStatusBeforeUnfinishedForTab(value: string[] | null) {
    setStatusBeforeUnfinishedByTab((current) => ({
      ...current,
      [activeHeaderTab]: value,
    }));
  }

  function updateScopeTab(value: TaskHeaderTab) {
    if (value === activeHeaderTab) return;

    setScopeTab(value);
    setPageValue("1");

    if (!isAdmin) {
      return;
    }

    setQuery("");
    setTaskTypes([]);
  }

  function updateStatuses(values: string[]) {
    if (unfinishedOnly) {
      setUnfinishedOnlyValue("false");
      setStatusBeforeUnfinishedForTab(null);
    }
    setStatuses(values);
    setPageValue("1");
  }

  function toggleUnfinishedOnly(checked: boolean) {
    setUnfinishedOnlyValue(checked ? "true" : "false");
    if (checked) {
      setStatusBeforeUnfinishedForTab(statuses);
      setStatuses(unfinishedTaskStatusValues);
    } else {
      setStatuses(statusBeforeUnfinished ?? []);
      setStatusBeforeUnfinishedForTab(null);
    }
    setPageValue("1");
  }

  function toggleCheckerNeedsActionOnly(checked: boolean) {
    setCheckerNeedsActionOnlyValue(checked ? "true" : "false");
    setPageValue("1");
  }

  function updateTaskTypes(values: string[]) {
    setTaskTypes(values);
    setPageValue("1");
  }

  function updateCheckers(values: string[]) {
    setCheckerIds(values);
    setPageValue("1");
  }

  function toggleTimeSort() {
    setTimeSort((current) =>
      current === "none" ? "asc" : current === "asc" ? "desc" : "none",
    );
    setPageValue("1");
  }

  const adminFilterWidth = isAdmin ? "sm:w-40 lg:w-44" : undefined;
  const TimeSortIcon = ArrowUpDown;
  const timeSortLabel =
    timeSort === "asc"
      ? "Sort time left from longest to shortest. Overdue time is negative, and completed or revoked tasks stay at the bottom."
      : timeSort === "desc"
        ? "Clear time sorting"
        : "Sort time left from shortest to longest. Overdue time is negative, and completed or revoked tasks stay at the bottom.";

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
            {!isAdmin && isChiefAssistant && activeHeaderTab === "checker" ? (
              <label className="inline-flex h-10 w-full cursor-pointer items-center gap-2 border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 sm:w-auto dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white">
                <input
                  type="checkbox"
                  checked={checkerNeedsActionOnly}
                  onChange={(event) =>
                    toggleCheckerNeedsActionOnly(event.currentTarget.checked)
                  }
                  className="h-4 w-4 cursor-pointer rounded-none border-slate-300 text-sky-700 accent-[#1F7180] dark:border-[#666666] dark:accent-[#A8DADC]"
                />
                <IconHint label="Shows only tasks waiting for checker, assigner, or task manager action.">
                  <span className="whitespace-nowrap text-left">
                    Need checker action
                  </span>
                </IconHint>
              </label>
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
                <th className="w-[12.5rem] px-3 py-3 lg:w-[14rem] xl:w-[15rem]">
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
              {!isLoading && tasks.map((task) => {
                const status = statusMeta(task);
                const assigneeStatus = assigneeTableStatusMeta(
                  task,
                  activeHeaderTab,
                );
                const statusIcon = assigneeStatus ?? statusIconMeta(task);
                const StatusIcon = statusIcon.icon;
                const statusLabel = assigneeStatus?.label ?? status.label;
                const statusActionText =
                  assigneeStatus?.text ?? pendingReadyAssignmentText(task);
                const statusActionClassName =
                  assigneeStatus?.textClassName ??
                  "text-violet-700 dark:text-violet-300";
                const typeLines = taskTypeLines(task);
                const relationshipLabels = taskRelationshipLabels(task);
                const managerAction = managerActionMeta(task, Date.now());
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
                      <IconHint
                        label={
                          statusActionText
                            ? `${statusLabel}: ${statusActionText}`
                            : statusLabel
                        }
                      >
                        <span className="inline-flex flex-col items-start gap-1">
                          <span
                            className={`research-allow-transform inline-flex cursor-default items-center justify-center border-0 bg-transparent p-0 shadow-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none ${statusIcon.className}`}
                          >
                            <StatusIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            <span className="sr-only">{statusLabel}</span>
                          </span>
                          {statusActionText ? (
                            <span
                              className={`max-w-[6.25rem] text-[11px] font-semibold leading-4 ${statusActionClassName}`}
                            >
                              {statusActionText}
                            </span>
                          ) : null}
                        </span>
                      </IconHint>
                    </td>
                    <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                      {task.assignments.length > 0 ? (
                        <div
                          className={
                            task.assignments.length > 1
                              ? "divide-y divide-[#D8D0C2] dark:divide-[#444444]"
                              : ""
                          }
                        >
                          {task.assignments.map((assignment) => {
                            const assignmentWorkflow =
                              assignmentWorkflowMeta(assignment);
                            const AssignmentIcon = assignmentWorkflow.icon;
                            const showEmail = task.assignments.length === 1;
                            const showAssignmentIcon =
                              task.assignments.length > 1;
                            const assignmentTiming = assignmentTimingMeta({
                              dueDate: assignment.dueDate ?? task.dueDate,
                              finishedAt: assignment.finishedAt,
                              completedAt: assignment.completedAt,
                            });
                            return (
                              <div
                                key={assignment.id}
                                className={`space-y-0.5 font-normal ${
                                  task.assignments.length > 1
                                    ? "py-2 first:pt-0 last:pb-0"
                                    : ""
                                }`}
                                title={displayResearchEmail(
                                  assignment.userEmail,
                                )}
                              >
                                <div className="flex items-start gap-1.5">
                                  <span className="min-w-0 break-words">
                                    {displayResearchPersonName({
                                      name: assignment.userName,
                                      email: assignment.userEmail,
                                    })}
                                  </span>
                                  {showAssignmentIcon ? (
                                    <IconHint label={assignmentWorkflow.detail}>
                                      <span
                                        className={`research-allow-transform mt-0.5 inline-flex h-4 w-4 flex-none cursor-default items-center justify-center border-0 bg-transparent p-0 shadow-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none ${assignmentWorkflow.className}`}
                                      >
                                        <AssignmentIcon
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        <span className="sr-only">
                                          {assignmentWorkflow.label}
                                        </span>
                                      </span>
                                    </IconHint>
                                  ) : null}
                                </div>
                                {showEmail ? (
                                  <div className="break-all text-[11px] leading-4 text-[#667085] dark:text-[#8F98A8]">
                                    {displayResearchEmail(assignment.userEmail)}
                                  </div>
                                ) : null}
                                {task.assignments.length > 1 &&
                                assignmentTiming ? (
                                  <div
                                    className={`text-[11px] leading-4 ${assignmentTiming.className}`}
                                  >
                                    {assignmentTiming.label}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
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
                      {"secondaryDetail" in status && status.secondaryDetail ? (
                        <p
                          className={`max-w-full break-words text-xs font-normal leading-5 ${status.secondaryDetailClassName}`}
                        >
                          {status.secondaryDetail}
                        </p>
                      ) : null}
                      <div className="mt-2 border-t border-slate-200 pt-2 dark:border-[#555555]">
                        <p
                          className="max-w-full truncate whitespace-nowrap text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]"
                          title={`Checker: ${task.checker}`}
                        >
                          Checker: {task.checker}
                        </p>
                        <p
                          className="max-w-full truncate whitespace-nowrap text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]"
                          title={`Assigner: ${task.createdBy}`}
                        >
                          Assigner: {task.createdBy}
                        </p>
                        {managerAction ? (
                          <p
                            className={`max-w-full break-words text-xs font-semibold leading-5 ${managerAction.className}`}
                          >
                            {managerAction.label}: {managerAction.text}
                          </p>
                        ) : null}
                      </div>
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
              {isLoading ? (
                <TableSkeletonRows
                  rows={Math.min(Math.max(listMeta.pageSize || 7, 5), 10)}
                  columns={canDelete ? 6 : 5}
                />
              ) : loadError && listMeta.total === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 6 : 5} className="px-4 py-2">
                    <ResearchErrorState
                      title="Tasks could not load"
                      detail="Refresh the page or try again in a moment."
                    />
                  </td>
                </tr>
              ) : listMeta.total === 0 ? (
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
          page={page}
          pageCount={pageCount}
          total={listMeta.total}
          pageSize={listMeta.pageSize}
          onPageChange={(nextPage) => setPageValue(String(nextPage))}
        />
      </div>
    </div>
  );
}
