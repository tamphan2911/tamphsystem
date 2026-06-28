import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../../auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const canView =
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.ASSISTANT);
  if (!canView) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const guide = await prisma.assistantWorkflowGuide.findUnique({
    where: { id },
    select: {
      supportFileName: true,
      supportFileType: true,
      supportFileData: true,
    },
  });

  if (!guide?.supportFileData || !guide.supportFileName) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const body = new Uint8Array(guide.supportFileData);
  return new NextResponse(body, {
    headers: {
      "Content-Type": guide.supportFileType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        guide.supportFileName,
      )}"`,
    },
  });
}
