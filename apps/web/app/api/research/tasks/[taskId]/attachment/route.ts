import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../../auth";
import { researchDownloadResponse } from "@/sites/research/lib/file-download";

function scopedTaskWhere(taskId: string, userId: string) {
  return {
    id: taskId,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
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

  const { taskId } = await params;
  const canAccess =
    roles.includes(Role.ADMIN) ||
    (await prisma.researchTask.count({
      where: scopedTaskWhere(taskId, userId),
    })) > 0;

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      taskFileName: true,
      taskFileType: true,
      taskFileData: true,
    },
  });

  if (!task?.taskFileData || !task.taskFileName) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return (
    researchDownloadResponse({
      data: task.taskFileData,
      filename: task.taskFileName,
      contentType: task.taskFileType,
    }) ?? NextResponse.json({ error: "File not found" }, { status: 404 })
  );
}
