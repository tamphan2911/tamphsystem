import { NextResponse } from "next/server";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../auth";

function isResearchAdmin(roles: Role[]) {
  return roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
}

function scopedTaskWhere(userId: string) {
  return {
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
          OR: [
            { createdById: userId },
            { members: { some: { userId } } },
          ],
        },
      },
    ],
  };
}

export async function POST() {
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

  if (!isResearchAdmin(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.researchTask.updateMany({
    where: {
      AND: [
        roles.includes(Role.ADMIN) ? {} : scopedTaskWhere(userId),
        {
          status: ResearchTaskStatus.COMPLETED,
          adminViewedAt: null,
        },
      ],
    },
    data: {
      adminViewedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
