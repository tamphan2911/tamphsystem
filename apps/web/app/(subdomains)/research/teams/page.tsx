import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import {
  createResearchAssistantTeam,
  updateResearchAssistantTeam,
} from "./actions";
import {
  TeamsClient,
  type ResearchAssistantTeamRow,
  type TeamMemberOption,
  type TeamPerson,
} from "./TeamsClient";

export const dynamic = "force-dynamic";

function person(user: { id: string; name: string | null; email: string }) {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email,
  };
}

export default async function ResearchTeamsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  if (!currentUser?.roles.includes(Role.ADMIN)) redirect("/401");

  const [teams, leaders, assistants] = await Promise.all([
    prisma.researchAssistantTeam.findMany({
      include: {
        leader: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        activeSites: { has: "research" },
        roles: { has: Role.CHIEF_ASSISTANT },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        activeSites: { has: "research" },
        roles: { has: Role.ASSISTANT },
        NOT: { roles: { has: Role.CHIEF_ASSISTANT } },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        researchAssistantTeamMemberships: {
          select: { teamId: true, team: { select: { name: true } } },
          take: 1,
        },
      },
    }),
  ]);

  const dateFormat = researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  const rows: ResearchAssistantTeamRow[] = teams.map((team) => ({
    id: team.id,
    name: team.name,
    description: team.description ?? "",
    leader: person(team.leader),
    members: team.members.map((member) => person(member.user)),
    updatedAt: dateFormat.format(team.updatedAt),
  }));

  const leaderOptions: TeamPerson[] = leaders.map(person);
  const assistantOptions: TeamMemberOption[] = assistants.map((assistant) => {
    const membership = assistant.researchAssistantTeamMemberships[0];
    return {
      ...person(assistant),
      currentTeamId: membership?.teamId ?? "",
      currentTeamName: membership?.team.name ?? "",
    };
  });

  return (
    <TeamsClient
      teams={rows}
      leaders={leaderOptions}
      assistants={assistantOptions}
      createAction={createResearchAssistantTeam}
      updateAction={updateResearchAssistantTeam}
    />
  );
}
