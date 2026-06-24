import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../../auth";
import { canAccessAllResearchProposals } from "@/sites/research/lib/proposalAccess";

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
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: {
      submittedById: true,
      supportFileName: true,
      supportFileType: true,
      supportFileData: true,
      task: {
        select: {
          createdById: true,
          checkerId: true,
          assignments: { select: { userId: true } },
        },
      },
    },
  });

  if (!proposal?.supportFileData || !proposal.supportFileName) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  const canAccess =
    canAccessAllResearchProposals(roles) ||
    proposal.submittedById === userId ||
    proposal.task?.createdById === userId ||
    proposal.task?.checkerId === userId ||
    Boolean(
      proposal.task?.assignments.some(
        (assignment) => assignment.userId === userId,
      ),
    );
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bytes = new Uint8Array(proposal.supportFileData);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": proposal.supportFileType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${proposal.supportFileName.replaceAll('"', "")}"`,
    },
  });
}
