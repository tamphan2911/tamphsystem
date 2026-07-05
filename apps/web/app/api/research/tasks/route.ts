import { NextResponse } from "next/server";
import {
  JournalApprovalStatus,
  prisma,
  ResearchTaskStatus,
  ResearchTaskType,
  Role,
  SuggestedVenueStatus,
} from "@repo/db";
import { auth } from "../../../../auth";

function scopedTaskWhere(userId: string) {
  return {
    OR: [
      { createdById: userId },
      { checkerId: userId },
      { checkerReferralTargetIds: { has: userId } },
      { assignments: { some: { userId } } },
      {
        project: {
          OR: [
            { leadResearcherId: userId },
            { authors: { some: { id: userId } } },
            { authorEntries: { some: { userId } } },
            { registrationUserId: userId },
            {
              organizedProjectLinks: {
                some: {
                  organizedProject: {
                    OR: [
                      { createdById: userId },
                      { members: { some: { userId } } },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      {
        organizedProject: {
          OR: [{ createdById: userId }, { members: { some: { userId } } }],
        },
      },
    ],
  };
}

const taskListPageSize = 10;
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
const managerActionSlaMs = 24 * 60 * 60 * 1000;

function parseListParam(value: string | null, allowed: readonly string[]) {
  if (!value || value === "ALL") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item && item !== "ALL" && allowed.includes(item));
}

function displayTaskId(task: Record<string, any>) {
  return (
    task.taskCode ||
    String(task.id ?? "")
      .replaceAll("-", "")
      .slice(0, 10)
      .toUpperCase()
  );
}

function productionSubtypeLabel(subtype: string | null | undefined) {
  if (subtype === "IDEA_FORMING") return "Idea forming";
  if (subtype === "DATA_COLLECTION") return "Data collection";
  if (subtype === "MODELING") return "Modeling";
  if (subtype === "WRITING") return "Writing";
  if (subtype === "HUMANIZING") return "Humanizing";
  if (subtype === "REFERENCES") return "References";
  return "";
}

function taskTypeFilterValue(task: Record<string, any>) {
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

function pendingReadyAssignmentText(task: Record<string, any>) {
  const count = (task.assignments ?? []).filter(
    (assignment: Record<string, any>) =>
      assignment.finishedAt && !assignment.completedAt,
  ).length;
  if (count === 0 || task.status !== "IN_PROGRESS") return null;
  return count === 1 ? "1 assignee ready" : `${count} assignees ready`;
}

function activeManagerAction(task: Record<string, any>) {
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

function taskNeedsManagerAction(task: Record<string, any>) {
  return Boolean(
    activeManagerAction(task) ||
    pendingReadyAssignmentText(task) ||
    task.status === "CHECKING" ||
    (task.status === "NEED_CLARIFY" &&
      task.clarifyDirection !== "MANAGER_TO_ASSIGNEE"),
  );
}

function derivedStatus(task: Record<string, any>, activeTab: string) {
  if (
    activeTab === "assigned" &&
    task.scope?.assignedToMe &&
    task.assignments?.length > 1 &&
    task.currentUserAssignmentId &&
    task.status !== "REVOKED"
  ) {
    const assignment = task.assignments.find(
      (item: Record<string, any>) => item.id === task.currentUserAssignmentId,
    );
    if (assignment?.completedAt) return "COMPLETED";
    if (assignment?.redoRequestedAt) return "REVISION_REQUESTED";
    if (assignment?.finishedAt) return "CHECKING";
    return "IN_PROGRESS";
  }

  if (task.waitingForJournalCreation && task.status === "IN_PROGRESS") {
    return "IN_PROGRESS";
  }
  if (task.addJournalCorrection && task.status === "REVISION_REQUESTED") {
    return "REVISION_REQUESTED";
  }
  if (task.addJournalReview && task.status === "CHECKING") return "CHECKING";
  if (
    task.status === "CHECKING" ||
    task.status === "NEED_CLARIFY" ||
    task.status === "REVISION_REQUESTED" ||
    task.status === "COMPLETED" ||
    task.status === "REVOKED"
  ) {
    return task.status;
  }
  if (task.dueDate && new Date(task.dueDate).getTime() < Date.now()) {
    return "OVERDUE";
  }
  return "IN_PROGRESS";
}

function taskTimeLeftSortValue(task: Record<string, any>, nowMs: number) {
  if (task.status === "COMPLETED" || task.status === "REVOKED") return null;
  const managerAction = activeManagerAction(task);
  if (managerAction) {
    const startedAt = new Date(managerAction.startedAt).getTime();
    if (!Number.isNaN(startedAt)) {
      return startedAt + managerActionSlaMs - nowMs;
    }
  }
  const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
  if (!due || Number.isNaN(due)) return null;
  return due - nowMs;
}

function taskNotificationWhere({
  isRootAdmin,
  isChiefAssistant,
  userId,
}: {
  isRootAdmin: boolean;
  isChiefAssistant: boolean;
  userId: string;
}) {
  if (isRootAdmin) {
    return {
      status: ResearchTaskStatus.COMPLETED,
      adminViewedAt: null,
    };
  }

  if (isChiefAssistant) {
    return {
      AND: [
        scopedTaskWhere(userId),
        {
          status: ResearchTaskStatus.COMPLETED,
          adminViewedAt: null,
        },
      ],
    };
  }

  return {
    assignments: {
      some: {
        userId,
        finishedAt: null,
      },
    },
  };
}

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  const roles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);
  const isRootAdmin = roles.includes(Role.ADMIN);
  const isChiefAssistant = roles.includes(Role.CHIEF_ASSISTANT);
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const requestedScope = url.searchParams.get("scope") ?? "";
  const activeTab = isRootAdmin
    ? requestedScope === "need_action"
      ? "need_action"
      : "all"
    : isChiefAssistant &&
        (requestedScope === "checker" || requestedScope === "related")
      ? requestedScope
      : requestedScope === "related"
        ? "related"
        : "assigned";
  const statuses = parseListParam(
    url.searchParams.get("status"),
    taskStatusValues,
  );
  const taskTypes = parseListParam(
    url.searchParams.get("type"),
    taskTypeFilterValues,
  );
  const checkerIds = parseListParam(url.searchParams.get("checker"), []).length
    ? []
    : (url.searchParams.get("checker") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && item !== "ALL" && item !== "__DEFAULT__");
  const checkerNeedsActionOnly =
    url.searchParams.get("checkerNeedsAction") === "1";
  const timeSort = url.searchParams.get("timeSort");
  const requestedPage = Number(url.searchParams.get("page") ?? "1");
  const pageSize = taskListPageSize;
  await prisma.researchTask.updateMany({
    where: { status: ResearchTaskStatus.OPEN },
    data: { status: ResearchTaskStatus.IN_PROGRESS },
  });

  const relatedTaskWhere = scopedTaskWhere(userId);
  const where = isRootAdmin ? {} : relatedTaskWhere;

  const [tasks, notificationCount] = await Promise.all([
    prisma.researchTask.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, roles: true },
        },
        checker: { select: { id: true, name: true, email: true, roles: true } },
        project: {
          select: {
            leadResearcherId: true,
            registrationUserId: true,
            authors: { select: { id: true } },
            authorEntries: { select: { userId: true } },
            organizedProjectLinks: {
              select: {
                organizedProject: {
                  select: {
                    createdById: true,
                    members: { select: { userId: true } },
                  },
                },
              },
            },
          },
        },
        organizedProject: {
          select: {
            createdById: true,
            members: { select: { userId: true } },
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, roles: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        clarifications: {
          select: {
            requestedById: true,
            answer: true,
            answeredAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        suggestedJournals: {
          select: {
            status: true,
            journalCreationTask: {
              select: { status: true },
            },
          },
        },
        addedJournals: {
          select: {
            approvalStatus: true,
            resultPosition: true,
            resultCorrectionRequestedAt: true,
            resultCorrectionResolvedAt: true,
            createdAt: true,
            updatedAt: true,
            publisherRecord: { select: { approvalStatus: true } },
          },
          orderBy: { resultPosition: "asc" },
        },
      },
      orderBy: [
        { dueDate: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    }),
    prisma.researchTask.count({
      where: taskNotificationWhere({ isRootAdmin, isChiefAssistant, userId }),
    }),
  ]);

  const taskRows = tasks.map((task) => {
    const assignedToMe = task.assignments.some(
      (assignment) => assignment.userId === userId,
    );
    const currentUserAssignment =
      task.assignments.find((assignment) => assignment.userId === userId) ??
      null;
    const checkerForMe = task.checkerId === userId;
    const relatedToResearch =
      task.project?.leadResearcherId === userId ||
      task.project?.registrationUserId === userId ||
      task.project?.authors.some((author) => author.id === userId) ||
      task.project?.authorEntries.some((entry) => entry.userId === userId) ||
      task.project?.organizedProjectLinks.some(
        ({ organizedProject }) =>
          organizedProject.createdById === userId ||
          organizedProject.members.some((member) => member.userId === userId),
      );
    const relatedToOrganizedProject =
      task.organizedProject?.createdById === userId ||
      task.organizedProject?.members.some((member) => member.userId === userId);
    const createdByMe = task.createdById === userId;
    const openClarification =
      task.clarifications.find((clarification) => !clarification.answer) ??
      null;
    const clarifyDirection = openClarification
      ? task.assignments.some(
          (assignment) => assignment.userId === openClarification.requestedById,
        )
        ? "ASSIGNEE_TO_MANAGER"
        : "MANAGER_TO_ASSIGNEE"
      : null;
    const checkerReferralAction =
      task.status === ResearchTaskStatus.CHECKING
        ? "CHECKING_REVIEW"
        : task.status === ResearchTaskStatus.NEED_CLARIFY &&
            clarifyDirection === "ASSIGNEE_TO_MANAGER"
          ? "ANSWER_ASSIGNEE_CLARIFICATION"
          : null;
    const referredCheckerActionForMe =
      Boolean(checkerReferralAction) &&
      task.checkerReferralAction === checkerReferralAction &&
      task.checkerReferralTargetIds.includes(userId);
    const latestFinishedAt = task.assignments.reduce<Date | null>(
      (latest, assignment) => {
        if (!assignment.finishedAt) return latest;
        return !latest || assignment.finishedAt > latest
          ? assignment.finishedAt
          : latest;
      },
      null,
    );
    const readyAssignmentsWaitingForReview = task.assignments.filter(
      (assignment) => assignment.finishedAt && !assignment.completedAt,
    );
    const earliestReadyAssignmentAt =
      readyAssignmentsWaitingForReview.reduce<Date | null>(
        (earliest, assignment) => {
          if (!assignment.finishedAt) return earliest;
          return !earliest || assignment.finishedAt < earliest
            ? assignment.finishedAt
            : earliest;
        },
        null,
      );
    const latestManagerClarificationAnswer = task.clarifications
      .filter(
        (clarification) =>
          clarification.answer &&
          clarification.answeredAt &&
          !task.assignments.some(
            (assignment) => assignment.userId === clarification.requestedById,
          ),
      )
      .sort(
        (left, right) =>
          (right.answeredAt?.getTime() ?? 0) -
          (left.answeredAt?.getTime() ?? 0),
      )[0];
    const waitingForJournalCreation =
      task.taskType === "SUGGEST_VENUE" &&
      task.status === ResearchTaskStatus.IN_PROGRESS &&
      task.suggestedJournals.some(
        (suggestion) =>
          suggestion.status !== SuggestedVenueStatus.DECLINED &&
          suggestion.journalCreationTask &&
          suggestion.journalCreationTask.status !==
            ResearchTaskStatus.COMPLETED &&
          suggestion.journalCreationTask.status !== ResearchTaskStatus.REVOKED,
      );
    const addedJournalResults =
      task.taskType === ResearchTaskType.ADD_JOURNAL
        ? task.addedJournals.filter(
            (journal) => journal.resultPosition !== null,
          )
        : [];
    const journalTargetCount = Math.max(1, task.journalTargetCount ?? 1);
    const addJournalFilled = addedJournalResults.length >= journalTargetCount;
    const pendingPublisherCount = addedJournalResults.filter(
      (journal) =>
        (journal.publisherRecord?.approvalStatus ??
          JournalApprovalStatus.APPROVED) !== JournalApprovalStatus.APPROVED,
    ).length;
    const pendingJournalCount = addedJournalResults.filter(
      (journal) => journal.approvalStatus !== JournalApprovalStatus.APPROVED,
    ).length;
    const correctionRequestedCount = addedJournalResults.filter(
      (journal) =>
        journal.approvalStatus !== JournalApprovalStatus.APPROVED &&
        journal.resultCorrectionRequestedAt &&
        !journal.resultCorrectionResolvedAt,
    ).length;
    const addJournalCorrection =
      task.taskType === ResearchTaskType.ADD_JOURNAL &&
      task.status === ResearchTaskStatus.REVISION_REQUESTED &&
      correctionRequestedCount > 0;
    const addJournalNeedsReview =
      task.taskType === ResearchTaskType.ADD_JOURNAL &&
      task.status === ResearchTaskStatus.CHECKING &&
      !addJournalCorrection &&
      addJournalFilled;
    const latestAddedJournalUpdate = addedJournalResults.reduce<Date | null>(
      (latest, journal) => {
        const updatedAt = journal.updatedAt ?? journal.createdAt;
        return !latest || updatedAt > latest ? updatedAt : latest;
      },
      null,
    );
    const addJournalReviewDetail = pendingPublisherCount
      ? "Waiting publisher approval before journal approval"
      : pendingJournalCount
        ? "Waiting journal approval"
        : "Waiting added journal review";
    const addJournalReviewLabel = pendingPublisherCount
      ? "Approve publisher"
      : pendingJournalCount
        ? "Approve journal"
        : "Review journal";
    const managerActionStartedAt = waitingForJournalCreation
      ? null
      : referredCheckerActionForMe
        ? (task.checkerReferralAt ?? task.updatedAt)
        : addJournalNeedsReview
          ? (latestAddedJournalUpdate ?? task.updatedAt)
          : readyAssignmentsWaitingForReview.length > 0 &&
              task.status === ResearchTaskStatus.IN_PROGRESS
            ? (earliestReadyAssignmentAt ?? task.updatedAt)
            : task.status === ResearchTaskStatus.CHECKING
              ? ([
                  latestFinishedAt,
                  latestManagerClarificationAnswer?.answeredAt ?? null,
                ].reduce<Date | null>((latest, value) => {
                  if (!value) return latest;
                  return !latest || value > latest ? value : latest;
                }, null) ?? task.updatedAt)
              : task.status === ResearchTaskStatus.NEED_CLARIFY &&
                  clarifyDirection === "ASSIGNEE_TO_MANAGER"
                ? (openClarification?.createdAt ?? task.updatedAt)
                : null;

    return {
      id: task.id,
      taskCode: task.taskCode,
      title: task.title,
      description: task.description ?? "",
      category: task.category ?? "",
      taskType: task.taskType ?? "",
      productionSubtype: task.productionSubtype ?? null,
      proposalScope:
        task.taskType === "PROPOSAL"
          ? task.organizedProjectId && !task.projectId
            ? "project"
            : "research"
          : null,
      status: task.status,
      currentUserAssignmentId: currentUserAssignment?.id ?? null,
      clarifyDirection,
      isUrgent: task.isUrgent,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      revokedAt: task.revokedAt?.toISOString() ?? null,
      adminViewedAt: task.adminViewedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      createdBy: task.createdBy.name || task.createdBy.email,
      checkerId: task.checker?.id ?? task.createdBy.id,
      checker:
        task.checker?.name ||
        task.checker?.email ||
        task.createdBy.name ||
        task.createdBy.email,
      checkerEmail: task.checker?.email ?? task.createdBy.email,
      checkerRoles: task.checker?.roles ?? task.createdBy.roles,
      managerAction: managerActionStartedAt
        ? {
            label: referredCheckerActionForMe
              ? "Referred checker help"
              : addJournalNeedsReview
                ? addJournalReviewLabel
                : readyAssignmentsWaitingForReview.length > 0 &&
                    task.status === ResearchTaskStatus.IN_PROGRESS
                  ? readyAssignmentsWaitingForReview.length === 1
                    ? "Review 1 assignee"
                    : `Review ${readyAssignmentsWaitingForReview.length} assignees`
                  : task.status === ResearchTaskStatus.CHECKING
                    ? "Check/review"
                    : "Answer clarification",
            startedAt: managerActionStartedAt.toISOString(),
          }
        : null,
      waitingForJournalCreation,
      addJournalCorrection: addJournalCorrection
        ? {
            detail:
              correctionRequestedCount === 1
                ? "Waiting assignee journal correction"
                : `Waiting assignee corrections for ${correctionRequestedCount} journals`,
            count: correctionRequestedCount,
          }
        : null,
      addJournalReview: addJournalNeedsReview
        ? {
            detail: addJournalReviewDetail,
            pendingPublisherCount,
            pendingJournalCount,
            addedCount: addedJournalResults.length,
            targetCount: journalTargetCount,
          }
        : null,
      scope: {
        assignedToMe,
        checkerForMe: checkerForMe || referredCheckerActionForMe,
        assignerForMe: createdByMe,
        adminAccess: isRootAdmin,
        relatedToResearch,
        relatedToOrganizedProject,
        relatedToMyItems:
          Boolean(
            isRootAdmin ||
            createdByMe ||
            relatedToResearch ||
            relatedToOrganizedProject,
          ) &&
          !assignedToMe &&
          !checkerForMe,
      },
      assignments: task.assignments.map((assignment) => ({
        id: assignment.id,
        userId: assignment.userId,
        userName: assignment.user.name || assignment.user.email,
        userEmail: assignment.user.email,
        userRoles: assignment.user.roles,
        dueDate: assignment.dueDate?.toISOString() ?? null,
        finishedAt: assignment.finishedAt?.toISOString() ?? null,
        completedAt: assignment.completedAt?.toISOString() ?? null,
        redoRequestedAt: assignment.redoRequestedAt?.toISOString() ?? null,
        redoReason: assignment.redoReason ?? null,
      })),
    };
  });

  const adminCheckerIds = Array.from(
    new Set(
      taskRows
        .filter((task) => task.checkerRoles.includes("ADMIN"))
        .map((task) => task.checkerId)
        .filter(Boolean),
    ),
  );
  const selectedAdminChecker =
    isRootAdmin &&
    checkerIds.length > 0 &&
    adminCheckerIds.some((checkerId) => checkerIds.includes(checkerId));
  const needle = query.toLowerCase();
  const filteredTasks = taskRows.filter((task) => {
    const taskStatus = derivedStatus(task, activeTab);
    const matchesScope = isRootAdmin
      ? activeTab === "need_action"
        ? taskNeedsManagerAction(task)
        : true
      : activeTab === "assigned"
        ? task.scope.assignedToMe
        : activeTab === "related"
          ? task.scope.relatedToMyItems
          : task.scope.checkerForMe;
    const matchesStatus =
      statuses.length === 0 || statuses.includes(taskStatus);
    const matchesType =
      taskTypes.length === 0 || taskTypes.includes(taskTypeFilterValue(task));
    const referredToAdminForHelp =
      activeManagerAction(task)?.label === "Referred checker help";
    const matchesChecker =
      !isRootAdmin ||
      checkerIds.length === 0 ||
      checkerIds.includes(task.checkerId) ||
      (selectedAdminChecker && referredToAdminForHelp);
    const matchesCheckerNeedsAction =
      !checkerNeedsActionOnly ||
      !isChiefAssistant ||
      activeTab !== "checker" ||
      taskNeedsManagerAction(task);
    const haystack = [
      displayTaskId(task),
      task.title,
      task.description,
      task.taskType,
      productionSubtypeLabel(task.productionSubtype),
      task.category,
      task.status,
      task.createdBy,
      task.checker,
      task.managerAction?.label ?? "",
      task.addJournalCorrection?.detail ?? "",
      task.addJournalReview?.detail ?? "",
      ...(task.assignments ?? []).flatMap((item: Record<string, any>) => [
        item.userName,
        item.userEmail,
        ...(item.userRoles ?? []),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    return (
      matchesScope &&
      matchesStatus &&
      matchesType &&
      matchesChecker &&
      matchesCheckerNeedsAction &&
      (!needle || haystack.includes(needle))
    );
  });
  const sortedTasks =
    timeSort === "asc" || timeSort === "desc"
      ? filteredTasks
          .map((task, index) => ({ task, index }))
          .sort((left, right) => {
            const nowMs = Date.now();
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
            return (
              new Date(right.task.updatedAt).getTime() -
                new Date(left.task.updatedAt).getTime() ||
              left.index - right.index
            );
          })
          .map(({ task }) => task)
      : filteredTasks;
  const total = sortedTasks.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    pageCount,
  );
  const checkerOptions = Array.from(
    taskRows
      .reduce((map, task) => {
        if (!task.checkerId) return map;
        map.set(task.checkerId, {
          value: task.checkerId,
          label: task.checkerEmail
            ? `${task.checker} - ${task.checkerEmail}`
            : task.checker,
          isAdminChecker: task.checkerRoles.includes("ADMIN"),
        });
        return map;
      }, new Map<string, { value: string; label: string; isAdminChecker: boolean }>())
      .values(),
  ).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
  );
  const adminNeedActionDefaultCheckerIds = Array.from(
    new Set([
      ...adminCheckerIds,
      ...taskRows
        .filter(
          (task) =>
            activeManagerAction(task)?.label === "Referred checker help" &&
            task.checkerId,
        )
        .map((task) => task.checkerId),
    ]),
  );

  return NextResponse.json({
    notificationCount,
    tasks: sortedTasks.slice((page - 1) * pageSize, page * pageSize),
    meta: {
      page,
      pageSize,
      total,
      scopeCounts: {
        all: taskRows.length,
        need_action: taskRows.filter(taskNeedsManagerAction).length,
        assigned: taskRows.filter((task) => task.scope.assignedToMe).length,
        checker: taskRows.filter((task) => task.scope.checkerForMe).length,
        related: taskRows.filter((task) => task.scope.relatedToMyItems).length,
      },
      checkerOptions,
      adminNeedActionDefaultCheckerIds,
    },
  });
}
