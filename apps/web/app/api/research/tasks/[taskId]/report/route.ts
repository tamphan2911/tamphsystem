import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../../auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
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
  if (!roles.includes(Role.ADMIN) && task.createdById !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(new Uint8Array(task.reportFileData), {
    headers: {
      "Content-Type": task.reportFileType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${task.reportFileName.replaceAll('"', "")}"`,
    },
  });
}
