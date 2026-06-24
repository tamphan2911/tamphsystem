import { ProposalStatus, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ResearchShell } from "./ResearchShell";
import { displayResearchEmail } from "@/sites/research/lib/display";
import { ResearchDesktopOnly } from "@/sites/research/components/ResearchDesktopOnly";

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
    return <ResearchDesktopOnly>{children}</ResearchDesktopOnly>;
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  let roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  let userActiveSites: string[] | null = null;
  let researchThemePreference = "system";
  if (userId) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true, activeSites: true, researchThemePreference: true },
    });
    if (currentUser) {
      roles = currentUser.roles;
      userActiveSites = currentUser.activeSites;
      researchThemePreference = currentUser.researchThemePreference;
    }
  }
  const isRootAdmin = roles.includes(Role.ADMIN);
  const isResearchAdmin = isRootAdmin || roles.includes(Role.CHIEF_ASSISTANT);
  let canSeeAccounts = isResearchAdmin;
  let canSeeReviews = isResearchAdmin;
  let canSeeTasks = isResearchAdmin;
  let canSeePublishers = isRootAdmin;
  let unopenedProposalCount = 0;
  if (userId) {
    const [
      assignedTaskCount,
      unfinishedAccountTaskCount,
      assignedReviewTaskCount,
      checkedPublisherCount,
    ] = await Promise.all([
      isResearchAdmin
        ? Promise.resolve(0)
        : prisma.researchTask.count({
            where: { assignments: { some: { userId } } },
          }),
      isResearchAdmin
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
      isRootAdmin
        ? Promise.resolve(0)
        : prisma.researchTask.count({
            where: {
              reviewId: { not: null },
              assignments: { some: { userId } },
            },
          }),
      isRootAdmin
        ? Promise.resolve(0)
        : prisma.publisher.count({
            where: {
              journals: { some: { resultTask: { checkerId: userId } } },
            },
          }),
    ]);
    if (
      !userActiveSites?.includes("research") &&
      sitePathname !== "/activate"
    ) {
      redirect("/activate");
    }
    canSeeAccounts = isResearchAdmin || unfinishedAccountTaskCount > 0;
    canSeeReviews = isRootAdmin || assignedReviewTaskCount > 0;
    canSeeTasks = isResearchAdmin || assignedTaskCount > 0;
    canSeePublishers = isRootAdmin || checkedPublisherCount > 0;
    if (isResearchAdmin) {
      unopenedProposalCount = await prisma.proposal.count({
        where: { status: ProposalStatus.NEW },
      });
    }
  }

  return (
    <ResearchDesktopOnly>
      <ResearchShell
        email={displayResearchEmail(session?.user?.email)}
        name={session?.user?.name}
        isAdmin={isResearchAdmin}
        isRootAdmin={isRootAdmin}
        isAssistant={
          roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT)
        }
        canSeeTasks={canSeeTasks}
        canSeeAccounts={canSeeAccounts}
        canSeeReviews={canSeeReviews}
        canSeePublishers={canSeePublishers}
        unopenedProposalCount={unopenedProposalCount}
        themePreference={researchThemePreference}
      >
        {children}
      </ResearchShell>
    </ResearchDesktopOnly>
  );
}
