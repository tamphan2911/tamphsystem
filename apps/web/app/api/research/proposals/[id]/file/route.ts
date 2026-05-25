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
  if (!roles.includes(Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: {
      supportFileName: true,
      supportFileType: true,
      supportFileData: true,
    },
  });

  if (!proposal?.supportFileData || !proposal.supportFileName) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const bytes = new Uint8Array(proposal.supportFileData);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": proposal.supportFileType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${proposal.supportFileName.replaceAll('"', "")}"`,
    },
  });
}
