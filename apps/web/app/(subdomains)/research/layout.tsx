import { ProposalStatus, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ResearchShell } from "./ResearchShell";
import { displayResearchEmail } from "@/sites/research/lib/display";

export default async function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sitePathname = (await headers()).get("x-site-pathname") ?? "";
  if (
    sitePathname === "/" ||
    sitePathname === "/learn" ||
    sitePathname === "/portfolio"
  ) {
    return <>{children}</>;
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  let canSeeAccounts = roles.includes(Role.ADMIN);
  let canSeeReviews = roles.includes(Role.ADMIN);
  let canSeeTasks = roles.includes(Role.ADMIN);
  let unopenedProposalCount = 0;
  if (userId) {
    const [
      user,
      assignedTaskCount,
      unfinishedAccountTaskCount,
      unfinishedReviewTaskCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { activeSites: true },
      }),
      roles.includes(Role.ADMIN)
        ? Promise.resolve(0)
        : prisma.researchTask.count({
            where: { assignments: { some: { userId } } },
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
      roles.includes(Role.ADMIN)
        ? Promise.resolve(0)
        : prisma.researchTask.count({
            where: {
              reviewId: { not: null },
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
    canSeeReviews = roles.includes(Role.ADMIN) || unfinishedReviewTaskCount > 0;
    canSeeTasks = roles.includes(Role.ADMIN) || assignedTaskCount > 0;
    if (roles.includes(Role.ADMIN)) {
      unopenedProposalCount = await prisma.proposal.count({
        where: { status: ProposalStatus.NEW },
      });
    }
  }

  return (
    <ResearchShell
      email={displayResearchEmail(session?.user?.email)}
      name={session?.user?.name}
      isAdmin={roles.includes(Role.ADMIN)}
      isAssistant={
        roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT)
      }
      canSeeTasks={canSeeTasks}
      canSeeAccounts={canSeeAccounts}
      canSeeReviews={canSeeReviews}
      unopenedProposalCount={unopenedProposalCount}
    >
      {children}
    </ResearchShell>
  );
}
