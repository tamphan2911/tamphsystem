import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../../auth";

function isResearchAdmin(roles: Role[]) {
  return roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
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
  const submission = await prisma.researchSubmission.findUnique({
    where: { id },
    select: {
      articleFileData: true,
      articleFileName: true,
      articleFileType: true,
      project: {
        select: {
          leadResearcherId: true,
          authorEntries: { select: { userId: true } },
          tasks: {
            select: {
              createdById: true,
              assignments: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!submission?.articleFileData || !submission.articleFileName) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const canAccess =
    isResearchAdmin(roles) ||
    submission.project.leadResearcherId === userId ||
    submission.project.authorEntries.some((entry) => entry.userId === userId) ||
    submission.project.tasks.some(
      (task) =>
        task.createdById === userId ||
        task.assignments.some((assignment) => assignment.userId === userId),
    );

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(new Uint8Array(submission.articleFileData), {
    headers: {
      "Content-Type": submission.articleFileType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${submission.articleFileName.replaceAll('"', "")}"`,
    },
  });
}
