import { ProposalStatus, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ResearchShell } from "./ResearchShell";
import { displayResearchEmail } from "@/sites/research/lib/display";
import { ResearchDesktopOnly } from "@/sites/research/components/ResearchDesktopOnly";
import { canManageAllResearchAccounts } from "@/sites/research/lib/accountAccess";
import {
  canAccessAllResearchProposals,
  relatedResearchProposalWhere,
} from "@/sites/research/lib/proposalAccess";
import {
  normalizedResearchThemePreference,
  researchThemeKey,
  researchThemePreferenceKey,
  themeForPreference,
  type ResearchTheme,
  type ResearchThemePreference,
} from "@/sites/research/lib/theme";

function ResearchThemePrepaintScript({
  preference,
  theme,
}: {
  preference: ResearchThemePreference;
  theme: ResearchTheme;
}) {
  const script = `
    (function () {
      try {
        var theme = ${JSON.stringify(theme)};
        var preference = ${JSON.stringify(preference)};
        var root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.dataset.researchTheme = theme;
        root.style.colorScheme = theme;
        try {
          window.localStorage.setItem(${JSON.stringify(researchThemeKey)}, theme);
          window.localStorage.setItem(${JSON.stringify(researchThemePreferenceKey)}, preference);
          window.localStorage.setItem("theme", theme);
        } catch (storageError) {}
      } catch (error) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

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
  let userEmail = session?.user?.email ?? null;
  let userActiveSites: string[] | null = null;
  let researchThemePreference = "system";
  if (userId) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: true,
        email: true,
        activeSites: true,
        researchThemePreference: true,
      },
    });
    if (currentUser) {
      roles = currentUser.roles;
      userEmail = currentUser.email;
      userActiveSites = currentUser.activeSites;
      researchThemePreference = currentUser.researchThemePreference;
    }
  }
  const isRootAdmin = roles.includes(Role.ADMIN);
  const isResearchAdmin = isRootAdmin || roles.includes(Role.CHIEF_ASSISTANT);
  const canManageAccounts = canManageAllResearchAccounts({
    roles,
    email: userEmail,
  });
  let canSeeAccounts = canManageAccounts;
  let canSeeReviews = isResearchAdmin;
  let canSeeTasks = isResearchAdmin;
  let canSeePublishers = isRootAdmin;
  let canSeeProposals = canAccessAllResearchProposals(roles);
  let unopenedProposalCount = 0;
  if (userId) {
    const [
      assignedTaskCount,
      unfinishedAccountTaskCount,
      assignedReviewTaskCount,
      checkedPublisherCount,
      relatedProposalCount,
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
      canAccessAllResearchProposals(roles)
        ? Promise.resolve(0)
        : prisma.proposal.count({
            where: relatedResearchProposalWhere({ userId, roles }),
          }),
    ]);
    if (
      !userActiveSites?.includes("research") &&
      sitePathname !== "/activate"
    ) {
      redirect("/activate");
    }
    canSeeAccounts = canManageAccounts || unfinishedAccountTaskCount > 0;
    canSeeReviews = isRootAdmin || assignedReviewTaskCount > 0;
    canSeeTasks = isResearchAdmin || assignedTaskCount > 0;
    canSeePublishers = isRootAdmin || checkedPublisherCount > 0;
    canSeeProposals =
      canAccessAllResearchProposals(roles) || relatedProposalCount > 0;
    if (canAccessAllResearchProposals(roles)) {
      unopenedProposalCount = await prisma.proposal.count({
        where: { status: ProposalStatus.NEW },
      });
    }
  }

  const normalizedThemePreference = normalizedResearchThemePreference(
    researchThemePreference,
  );
  const initialResearchTheme = themeForPreference(normalizedThemePreference);

  return (
    <>
      <ResearchThemePrepaintScript
        preference={normalizedThemePreference}
        theme={initialResearchTheme}
      />
      <ResearchDesktopOnly>
        <ResearchShell
          email={displayResearchEmail(session?.user?.email)}
          name={session?.user?.name}
          isAdmin={isResearchAdmin}
          isRootAdmin={isRootAdmin}
          isAssistant={
            roles.includes(Role.ASSISTANT) ||
            roles.includes(Role.CHIEF_ASSISTANT)
          }
          canSeeTasks={canSeeTasks}
          canSeeAccounts={canSeeAccounts}
          canSeeReviews={canSeeReviews}
          canSeePublishers={canSeePublishers}
          canSeeProposals={canSeeProposals}
          unopenedProposalCount={unopenedProposalCount}
          themePreference={researchThemePreference}
        >
          {children}
        </ResearchShell>
      </ResearchDesktopOnly>
    </>
  );
}
