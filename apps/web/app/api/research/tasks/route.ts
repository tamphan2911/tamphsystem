import { NextResponse } from "next/server";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../auth";

function scopedTaskWhere(userId: string) {
  return {
    OR: [
      { createdById: userId },
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

  const where = isRootAdmin
    ? {}
    : isChiefAssistant
      ? scopedTaskWhere(userId)
      : {
          assignments: {
            some: { userId },
          },
        };

  const [tasks, notificationCount] = await Promise.all([
    prisma.researchTask.findMany({
      where,
      include: {
        createdBy: { select: { name: true, email: true } },
        checker: { select: { name: true, email: true } },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, roles: true },
            },
          },
          orderBy: { createdAt: "asc" },
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
    tasks: tasks.map((task) => ({
      id: task.id,
      taskCode: task.taskCode,
      title: task.title,
      description: task.description ?? "",
      category: task.category ?? "",
      taskType: task.taskType ?? "",
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      revokedAt: task.revokedAt?.toISOString() ?? null,
      adminViewedAt: task.adminViewedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      createdBy: task.createdBy.name || task.createdBy.email,
      checker:
        task.checker?.name ||
        task.checker?.email ||
        task.createdBy.name ||
        task.createdBy.email,
      assignments: task.assignments.map((assignment) => ({
        id: assignment.id,
        userId: assignment.userId,
        userName: assignment.user.name || assignment.user.email,
        userEmail: assignment.user.email,
        userRoles: assignment.user.roles,
        finishedAt: assignment.finishedAt?.toISOString() ?? null,
      })),
    })),
  });
}
