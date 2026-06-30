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

  const finishedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.researchTaskAssignment.update({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
      data: {
        finishedAt,
        redoRequestedAt: null,
        redoRequestedById: null,
        redoReason: null,
      },
    });

    const assignments = await tx.researchTaskAssignment.findMany({
      where: { taskId },
      select: { finishedAt: true, completedAt: true, redoRequestedAt: true },
    });
    const allReady =
      assignments.length > 0 &&
      assignments.every((item) => item.completedAt || item.finishedAt);
    const anyRedo = assignments.some(
      (item) => item.redoRequestedAt && !item.completedAt,
    );

    await tx.researchTask.update({
      where: { id: taskId },
      data: {
        status: allReady
          ? ResearchTaskStatus.CHECKING
          : anyRedo
            ? ResearchTaskStatus.REVISION_REQUESTED
            : ResearchTaskStatus.IN_PROGRESS,
        completedAt: null,
        revokedAt: null,
        adminViewedAt: null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
