import { ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ResearchShell } from "./ResearchShell";

export default async function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  let canSeeAccounts = roles.includes(Role.ADMIN);
  if (userId) {
    const sitePathname = (await headers()).get("x-site-pathname") ?? "";
    const [user, unfinishedAccountTaskCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { activeSites: true },
      }),
      roles.includes(Role.ADMIN)
        ? Promise.resolve(0)
        : prisma.researchTask.count({
            where: {
              accountId: { not: null },
              status: {
                notIn: [
                  ResearchTaskStatus.COMPLETED,
                  ResearchTaskStatus.REVOKED,
                ],
              },
              assignments: { some: { userId } },
            },
          }),
    ]);
    if (
      !user?.activeSites.includes("research") &&
      sitePathname !== "/activate"
    ) {
      redirect("/activate");
    }
    canSeeAccounts =
      roles.includes(Role.ADMIN) || unfinishedAccountTaskCount > 0;
  }

  return (
    <ResearchShell
      email={session?.user?.email}
      name={session?.user?.name}
      isAdmin={roles.includes(Role.ADMIN)}
      isAssistant={
        roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT)
      }
      canSeeAccounts={canSeeAccounts}
    >
      {children}
    </ResearchShell>
  );
}
