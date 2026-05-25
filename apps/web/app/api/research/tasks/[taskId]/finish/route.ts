import { NextResponse } from "next/server";
import { prisma, ResearchTaskStatus } from "@repo/db";
import { auth } from "../../../../../../auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    select: { status: true, createdById: true },
  });

  if (
    !task ||
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return NextResponse.json({ error: "Task is closed" }, { status: 409 });
  }

  if (task.createdById === userId) {
    return NextResponse.json(
      { error: "Self-assigned tasks should be approved directly" },
      { status: 409 },
    );
  }

  const completedAt = new Date();

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.CHECKING,
      completedAt: null,
      revokedAt: null,
      adminViewedAt: null,
      assignments: {
        updateMany: { where: { userId }, data: { finishedAt: completedAt } },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
