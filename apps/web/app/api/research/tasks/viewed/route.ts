import { NextResponse } from "next/server";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[];

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roles.includes(Role.ADMIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.researchTask.updateMany({
    where: {
      status: "COMPLETED",
      adminViewedAt: null,
    },
    data: {
      adminViewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
