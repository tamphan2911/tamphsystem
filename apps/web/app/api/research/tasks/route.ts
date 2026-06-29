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

export async function GET() {
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
        createdBy: { select: { id: true, name: true, email: true } },
        checker: { select: { id: true, name: true, email: true } },
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

  return NextResponse.json({
    notificationCount,
    tasks: tasks.map((task) => {
      const assignedToMe = task.assignments.some(
        (assignment) => assignment.userId === userId,
      );
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
        task.organizedProject?.members.some(
          (member) => member.userId === userId,
        );
      const createdByMe = task.createdById === userId;
      const openClarification =
        task.clarifications.find((clarification) => !clarification.answer) ??
        null;
      const clarifyDirection = openClarification
        ? task.assignments.some(
            (assignment) =>
              assignment.userId === openClarification.requestedById,
          )
          ? "ASSIGNEE_TO_MANAGER"
          : "MANAGER_TO_ASSIGNEE"
        : null;
      const latestFinishedAt = task.assignments.reduce<Date | null>(
        (latest, assignment) => {
          if (!assignment.finishedAt) return latest;
          return !latest || assignment.finishedAt > latest
            ? assignment.finishedAt
            : latest;
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
        task.suggestedJournals.some(
          (suggestion) =>
            suggestion.status !== SuggestedVenueStatus.DECLINED &&
            suggestion.journalCreationTask &&
            suggestion.journalCreationTask.status !==
              ResearchTaskStatus.COMPLETED &&
            suggestion.journalCreationTask.status !==
              ResearchTaskStatus.REVOKED,
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
      const addJournalNeedsReview =
        task.taskType === ResearchTaskType.ADD_JOURNAL &&
        task.status !== ResearchTaskStatus.COMPLETED &&
        task.status !== ResearchTaskStatus.REVOKED &&
        addJournalFilled &&
        (pendingPublisherCount > 0 ||
          pendingJournalCount > 0 ||
          task.status === ResearchTaskStatus.CHECKING);
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
        : addJournalNeedsReview
          ? (latestAddedJournalUpdate ?? task.updatedAt)
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
        managerAction: managerActionStartedAt
          ? {
              label: addJournalNeedsReview
                ? addJournalReviewLabel
                : task.status === ResearchTaskStatus.CHECKING
                  ? "Check/review"
                  : "Answer clarification",
              startedAt: managerActionStartedAt.toISOString(),
            }
          : null,
        waitingForJournalCreation,
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
          checkerForMe,
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
          finishedAt: assignment.finishedAt?.toISOString() ?? null,
        })),
      };
    }),
  });
}
