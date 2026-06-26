import bcrypt from "bcrypt";
import {
  ConferenceSubmissionStatus,
  prisma,
  ResearchStage,
  ResearchTaskStatus,
  Role,
  SubmissionStatus,
} from "@repo/db";
import { assertResearchManager } from "../actions";
import type { AssistantRow } from "./AssistantsTable";
import {
  AddAssistantDialog,
  type AssistantCandidate,
} from "./AddAssistantDialog";
import {
  AssistantsClient,
  type AssistantPerformanceRow,
} from "./AssistantsClient";

export const dynamic = "force-dynamic";

async function ensureAssistantResearchAccess() {
  const assistantUsers = await prisma.user.findMany({
    where: { roles: { hasSome: [Role.ASSISTANT, Role.CHIEF_ASSISTANT] } },
    select: { id: true, activeSites: true },
  });
  const updates = assistantUsers
    .filter((user) => !user.activeSites.includes("research"))
    .map((user) =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          activeSites: {
            set: Array.from(new Set([...user.activeSites, "research"])),
          },
        },
      }),
    );

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

export default async function AssistantsPage() {
  const currentUser = await assertResearchManager();
  const canAssignAssistants = currentUser.roles.includes(Role.ADMIN);

  await ensureAssistantResearchAccess();

  const users = await prisma.user.findMany({
    where: { activeSites: { has: "research" } },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  const assistantUsers = users.filter(
    (user) =>
      user.roles.includes(Role.ASSISTANT) ||
      user.roles.includes(Role.CHIEF_ASSISTANT),
  );
  const assistantUserIds = assistantUsers.map((user) => user.id);

  const [taskAssignments, checkerTasks, associatedResearchProjects] =
    await Promise.all([
      prisma.researchTaskAssignment.findMany({
        where: {
          userId: { in: assistantUserIds },
        },
        select: {
          userId: true,
          task: {
            select: {
              id: true,
              status: true,
              taskType: true,
              category: true,
              dueDate: true,
              completedAt: true,
              revokedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.researchTask.findMany({
        where: {
          checkerId: { in: assistantUserIds },
        },
        select: {
          checkerId: true,
          id: true,
          status: true,
          taskType: true,
          category: true,
          dueDate: true,
          completedAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.researchProject.findMany({
        where: {
          OR: [
            { authors: { some: { id: { in: assistantUserIds } } } },
            { authorEntries: { some: { userId: { in: assistantUserIds } } } },
            {
              tasks: {
                some: {
                  OR: [
                    { checkerId: { in: assistantUserIds } },
                    {
                      assignments: {
                        some: { userId: { in: assistantUserIds } },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          stage: true,
          authors: { select: { id: true } },
          authorEntries: { select: { userId: true } },
          submissions: { select: { status: true } },
          conferenceSubmissions: { select: { status: true } },
          tasks: {
            select: {
              checkerId: true,
              assignments: { select: { userId: true } },
            },
          },
        },
      }),
    ]);

  function performanceTaskFromTask(task: {
    id: string;
    status: ResearchTaskStatus;
    taskType: string | null;
    category: string | null;
    dueDate: Date | null;
    completedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: task.id,
      status: task.status,
      taskType: task.taskType ?? "",
      category: task.category ?? "",
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      revokedAt: task.revokedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  const taskBreakdowns = new Map<string, Map<ResearchTaskStatus, number>>();
  taskAssignments
    .filter(
      (assignment) =>
        assignment.task.status !== ResearchTaskStatus.COMPLETED &&
        assignment.task.status !== ResearchTaskStatus.REVOKED,
    )
    .forEach((assignment) => {
      const breakdown =
        taskBreakdowns.get(assignment.userId) ??
        new Map<ResearchTaskStatus, number>();
      breakdown.set(
        assignment.task.status,
        (breakdown.get(assignment.task.status) ?? 0) + 1,
      );
      taskBreakdowns.set(assignment.userId, breakdown);
    });

  const performanceTasksByUserId = new Map<
    string,
    AssistantPerformanceRow["tasks"]
  >();
  taskAssignments.forEach((assignment) => {
    const tasks = performanceTasksByUserId.get(assignment.userId) ?? [];
    tasks.push(performanceTaskFromTask(assignment.task));
    performanceTasksByUserId.set(assignment.userId, tasks);
  });

  const checkerTasksByUserId = new Map<
    string,
    AssistantPerformanceRow["tasks"]
  >();
  checkerTasks.forEach((task) => {
    if (!task.checkerId) return;
    const tasks = checkerTasksByUserId.get(task.checkerId) ?? [];
    tasks.push(performanceTaskFromTask(task));
    checkerTasksByUserId.set(task.checkerId, tasks);
  });

  const researchAssociationByUserId = new Map<
    string,
    { total: number; acceptedOrPublished: number }
  >();
  associatedResearchProjects.forEach((project) => {
    const associatedIds = new Set<string>();
    project.authors.forEach((author) => associatedIds.add(author.id));
    project.authorEntries.forEach((entry) => associatedIds.add(entry.userId));
    project.tasks.forEach((task) => {
      if (task.checkerId) associatedIds.add(task.checkerId);
      task.assignments.forEach((assignment) =>
        associatedIds.add(assignment.userId),
      );
    });
    const acceptedOrPublished =
      project.stage === ResearchStage.ACCEPTED ||
      project.stage === ResearchStage.PUBLISHED ||
      project.submissions.some(
        (submission) =>
          submission.status === SubmissionStatus.ACCEPTED ||
          submission.status === SubmissionStatus.PUBLISHED,
      ) ||
      project.conferenceSubmissions.some(
        (submission) =>
          submission.status === ConferenceSubmissionStatus.ACCEPTED ||
          submission.status === ConferenceSubmissionStatus.PUBLISHED,
      );

    associatedIds.forEach((userId) => {
      if (!assistantUserIds.includes(userId)) return;
      const current = researchAssociationByUserId.get(userId) ?? {
        total: 0,
        acceptedOrPublished: 0,
      };
      current.total += 1;
      if (acceptedOrPublished) current.acceptedOrPublished += 1;
      researchAssociationByUserId.set(userId, current);
    });
  });

  const visiblePasswords = await Promise.all(
    assistantUsers.map(async (user) => {
      if (!user.adminVisiblePassword) return [user.id, ""] as const;
      const matches = await bcrypt.compare(
        user.adminVisiblePassword,
        user.passwordHash,
      );
      return [user.id, matches ? user.adminVisiblePassword : ""] as const;
    }),
  );
  const visiblePasswordByUserId = new Map(visiblePasswords);

  const rows: AssistantRow[] = assistantUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    password: visiblePasswordByUserId.get(user.id) ?? "",
    assistantRole: user.roles.includes(Role.CHIEF_ASSISTANT)
      ? Role.CHIEF_ASSISTANT
      : Role.ASSISTANT,
    canManageResearchVenues: user.canManageResearchVenues,
    unfinishedTasks: Array.from(taskBreakdowns.get(user.id) ?? []).map(
      ([status, count]) => ({
        status,
        count,
      }),
    ),
  }));

  const candidates: AssistantCandidate[] = users.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    roles: user.roles,
    canManageResearchVenues: user.canManageResearchVenues,
  }));
  const performanceRows: AssistantPerformanceRow[] = assistantUsers.map(
    (user) => ({
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      assistantRole: user.roles.includes(Role.CHIEF_ASSISTANT)
        ? Role.CHIEF_ASSISTANT
        : Role.ASSISTANT,
      canManageResearchVenues: user.canManageResearchVenues,
      tasks: performanceTasksByUserId.get(user.id) ?? [],
      associatedResearchTotal:
        researchAssociationByUserId.get(user.id)?.total ?? 0,
      associatedResearchAcceptedOrPublished:
        researchAssociationByUserId.get(user.id)?.acceptedOrPublished ?? 0,
    }),
  );
  const checkerRows: AssistantPerformanceRow[] = assistantUsers
    .map((user) => ({
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      assistantRole: user.roles.includes(Role.CHIEF_ASSISTANT)
        ? Role.CHIEF_ASSISTANT
        : Role.ASSISTANT,
      canManageResearchVenues: user.canManageResearchVenues,
      tasks: checkerTasksByUserId.get(user.id) ?? [],
      associatedResearchTotal:
        researchAssociationByUserId.get(user.id)?.total ?? 0,
      associatedResearchAcceptedOrPublished:
        researchAssociationByUserId.get(user.id)?.acceptedOrPublished ?? 0,
    }))
    .filter((row) => row.tasks.length > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <AssistantsClient
        rows={rows}
        performanceRows={performanceRows}
        checkerRows={checkerRows}
        canManage={canAssignAssistants}
        action={
          canAssignAssistants ? <AddAssistantDialog users={candidates} /> : null
        }
      />
    </div>
  );
}
