import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../../auth";
import { researchDownloadResponse } from "@/sites/research/lib/file-download";

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
    roles.includes(Role.ADMIN) ||
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

  return (
    researchDownloadResponse({
      data: submission.articleFileData,
      filename: submission.articleFileName,
      contentType: submission.articleFileType,
    }) ?? NextResponse.json({ error: "File not found" }, { status: 404 })
  );
}
