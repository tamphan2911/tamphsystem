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
  const canReadAsChiefAssistant =
    roles.includes(Role.CHIEF_ASSISTANT) &&
    !roles.includes(Role.ADMIN) &&
    (await prisma.researchTask.count({
      where: scopedTaskWhere(taskId, userId),
    })) > 0;
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      createdById: true,
      reportFileName: true,
      reportFileType: true,
      reportFileData: true,
    },
  });

  if (!task?.reportFileData || !task.reportFileName) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (
    !roles.includes(Role.ADMIN) &&
    !canReadAsChiefAssistant &&
    task.createdById !== userId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return (
    researchDownloadResponse({
      data: task.reportFileData,
      filename: task.reportFileName,
      contentType: task.reportFileType,
    }) ?? NextResponse.json({ error: "File not found" }, { status: 404 })
  );
}
