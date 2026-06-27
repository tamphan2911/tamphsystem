import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../../auth";

function scopedGuideTaskWhere(userId: string) {
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;
  const guide = await prisma.taskGuide.findUnique({
    where: { id },
    select: {
      supportFileName: true,
      supportFileType: true,
      supportFileData: true,
      tasks: {
        where: scopedGuideTaskWhere(userId),
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!guide?.supportFileData || !guide.supportFileName) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const canAccess =
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    guide.tasks.length > 0;
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytes = new Uint8Array(guide.supportFileData);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": guide.supportFileType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${guide.supportFileName.replaceAll('"', "")}"`,
    },
  });
}
