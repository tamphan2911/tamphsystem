import { NextResponse } from "next/server";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../../auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !roles.includes(Role.ASSISTANT) &&
    !roles.includes(Role.CHIEF_ASSISTANT) &&
    !roles.includes(Role.ADMIN)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { taskId } = await params;

  const assignment = await prisma.researchTaskAssignment.findUnique({
    where: {
      taskId_userId: {
        taskId,
        userId,
      },
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 },
    );
  }

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: { status: true },
  });

  if (
    !task ||
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return NextResponse.json({ error: "Task is closed" }, { status: 409 });
  }

  const completedAt = new Date();

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.COMPLETED,
      completedAt,
      revokedAt: null,
      adminViewedAt: null,
      assignments: {
        updateMany: {
          where: { finishedAt: null },
          data: { finishedAt: completedAt },
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
