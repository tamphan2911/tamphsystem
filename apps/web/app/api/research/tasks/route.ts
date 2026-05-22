import { NextResponse } from "next/server";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../auth";

function taskNotificationWhere(isAdmin: boolean, userId: string) {
  if (isAdmin) {
    return {
      status: ResearchTaskStatus.COMPLETED,
      adminViewedAt: null,
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
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[];

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = roles.includes(Role.ADMIN);
  const isAssistant = roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT);

  if (!isAdmin && !isAssistant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const where = isAdmin
    ? {}
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
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, roles: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.researchTask.count({
      where: taskNotificationWhere(isAdmin, userId),
    }),
  ]);

  return NextResponse.json({
    notificationCount,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      category: task.category ?? "",
      status: task.status,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      adminViewedAt: task.adminViewedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      createdBy: task.createdBy.name || task.createdBy.email,
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
