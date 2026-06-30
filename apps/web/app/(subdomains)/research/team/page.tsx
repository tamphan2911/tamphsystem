import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Hammer, ShieldCheck, UsersRound } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { displayResearchPersonName } from "@/sites/research/lib/display";

export const dynamic = "force-dynamic";

function canUseTeamFeature(roles: Role[]) {
  return (
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.ASSISTANT)
  );
}

function personLabel(person: { name: string | null; email: string }) {
  return displayResearchPersonName({
    name: person.name ?? "",
    email: person.email,
  });
}

export default async function ResearchTeamPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true, name: true, email: true },
  });
  if (!currentUser || !canUseTeamFeature(currentUser.roles)) redirect("/401");

  const [membership, ledTeams, allTeamCount] = await Promise.all([
    prisma.researchAssistantTeamMember.findUnique({
      where: { userId },
      include: {
        team: {
          include: {
            leader: { select: { name: true, email: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
              orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
            },
          },
        },
      },
    }),
    prisma.researchAssistantTeam.findMany({
      where: { leaderId: userId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
        },
      },
      orderBy: [{ name: "asc" }],
    }),
    currentUser.roles.includes(Role.ADMIN)
      ? prisma.researchAssistantTeam.count()
      : Promise.resolve(0),
  ]);

  const ledTeam = ledTeams[0] ?? null;
  const team = membership?.team
    ? {
        name: membership.team.name,
        description: membership.team.description,
        leader: membership.team.leader,
        members: membership.team.members,
      }
    : ledTeam
      ? {
          name: ledTeam.name,
          description: ledTeam.description,
          leader: currentUser,
          members: ledTeam.members,
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full items-center justify-between gap-4">
          <p className="truncate text-sm font-normal uppercase text-slate-700 dark:text-[#E4E4E4]">
            Team
          </p>
          {currentUser.roles.includes(Role.ADMIN) ? (
            <Link
              href="/teams"
              className="inline-flex h-10 items-center justify-center gap-2 border border-[#B39CD0] bg-[#B39CD0] px-4 text-sm font-normal text-[#2C2C2C] shadow-sm transition hover:border-[#C8B6E2] hover:bg-[#C8B6E2]"
            >
              <UsersRound className="h-4 w-4" />
              Manage teams
            </Link>
          ) : null}
        </div>
      </ResearchPageHeaderPortal>

      <section className="border border-slate-200 bg-white p-5 dark:border-[#444444] dark:bg-[#2C2C2C]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-normal uppercase text-[#1F7180] dark:text-[#A8DADC]">
              <Hammer className="h-4 w-4" />
              <span>Team (under construction)</span>
            </div>
            <h1 className="mt-3 text-2xl font-normal text-slate-900 dark:text-[#E4E4E4]">
              Assistant team workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
              This page is open for admin, chief assistant, and assistant
              testing. The management setup is ready; the working team tools can
              be added here next.
            </p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-[#444444] dark:bg-[#303030] dark:text-[#B0B0B0]">
            Signed in as {personLabel(currentUser) || currentUser.email}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.45fr)]">
        <article className="border border-slate-200 bg-white p-5 dark:border-[#444444] dark:bg-[#262626]">
          <div className="flex items-center gap-2 text-xs font-normal uppercase text-slate-500 dark:text-[#B0B0B0]">
            <UsersRound className="h-4 w-4" />
            <span>Current team</span>
          </div>
          {team ? (
            <div className="mt-4">
              <h2 className="text-xl font-normal text-slate-900 dark:text-[#E4E4E4]">
                {team.name}
              </h2>
              {team.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
                  {team.description}
                </p>
              ) : null}
              <div className="mt-4 border border-cyan-100 bg-cyan-50 px-3 py-2.5 dark:border-cyan-400/20 dark:bg-cyan-950/25">
                <div className="flex items-center gap-2 text-xs uppercase text-cyan-800 dark:text-cyan-200">
                  <Crown className="h-4 w-4" />
                  <span>Leader</span>
                </div>
                <p className="mt-1 text-sm text-slate-900 dark:text-[#E4E4E4]">
                  {personLabel(team.leader) || team.leader.email}
                </p>
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
                  Members
                </p>
                {team.members.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {team.members.map((member) => (
                      <span
                        key={member.user.id}
                        className="inline-flex max-w-full items-center gap-2 border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-[#444444] dark:bg-[#303030] dark:text-[#E4E4E4]"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                        <span className="truncate">
                          {personLabel(member.user) || member.user.email}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-[#8F8F8F]">
                    No assistant members assigned yet.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
              You are not assigned to a team yet.
            </p>
          )}
        </article>

        <aside className="border border-slate-200 bg-white p-5 dark:border-[#444444] dark:bg-[#262626]">
          <p className="text-xs font-normal uppercase text-slate-500 dark:text-[#B0B0B0]">
            Access
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500 dark:text-[#8F8F8F]">Role</dt>
              <dd className="mt-1 text-slate-900 dark:text-[#E4E4E4]">
                {currentUser.roles.includes(Role.ADMIN)
                  ? "Admin"
                  : currentUser.roles.includes(Role.CHIEF_ASSISTANT)
                    ? "Chief assistant"
                    : "Assistant"}
              </dd>
            </div>
            {currentUser.roles.includes(Role.ADMIN) ? (
              <div>
                <dt className="text-slate-500 dark:text-[#8F8F8F]">
                  Total teams
                </dt>
                <dd className="mt-1 text-slate-900 dark:text-[#E4E4E4]">
                  {allTeamCount}
                </dd>
              </div>
            ) : null}
            {ledTeams.length > 0 ? (
              <div>
                <dt className="text-slate-500 dark:text-[#8F8F8F]">
                  Teams led
                </dt>
                <dd className="mt-1 text-slate-900 dark:text-[#E4E4E4]">
                  {ledTeams.length}
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </section>
    </div>
  );
}
