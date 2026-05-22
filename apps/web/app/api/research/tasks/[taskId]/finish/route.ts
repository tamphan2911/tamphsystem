import { NextResponse } from "next/server";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../../auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[];

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roles.includes(Role.ASSISTANT) && !roles.includes(Role.CHIEF_ASSISTANT) && !roles.includes(Role.ADMIN)) {
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
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.researchTaskAssignment.update({
    where: { id: assignment.id },
    data: { finishedAt: assignment.finishedAt ?? new Date() },
  });

  const assignments = await prisma.researchTaskAssignment.findMany({
    where: { taskId },
    select: { finishedAt: true },
  });

  const allFinished = assignments.length > 0 && assignments.every((item) => item.finishedAt);
  const anyFinished = assignments.some((item) => item.finishedAt);

  await prisma.researchTask.update({
    where: { id: taskId },
    data: allFinished
      ? { status: ResearchTaskStatus.COMPLETED, completedAt: new Date(), adminViewedAt: null }
      : { status: anyFinished ? ResearchTaskStatus.IN_PROGRESS : ResearchTaskStatus.OPEN },
  });

  return NextResponse.json({ ok: true });
}
