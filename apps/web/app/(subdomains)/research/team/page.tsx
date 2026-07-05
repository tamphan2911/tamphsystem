import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { prisma, Role, ResearchTaskStatus } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { TeamWorkspaceClient, type TeamWorkspace } from "./TeamWorkspaceClient";
import { updateResearchTeamParticipants } from "../teams/actions";

export const dynamic = "force-dynamic";

type TeamWithPeople = {
  id: string;
  name: string;
  description: string | null;
  leader: TeamPerson;
  members: { user: TeamPerson }[];
};

type TeamPerson = {
  id: string;
  name: string | null;
  email: string;
  affiliation: string | null;
  orcid: string | null;
  roles: Role[];
};

function canUseTeamFeature(roles: Role[]) {
  return (
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.ASSISTANT)
  );
}

function personName(person: { name: string | null; email: string }) {
  return displayResearchPersonName({
    name: person.name ?? "",
    email: person.email,
  });
}

function uniqueTeams(teams: TeamWithPeople[]) {
  const seen = new Set<string>();
  return teams.filter((team) => {
    if (seen.has(team.id)) return false;
    seen.add(team.id);
    return true;
  });
}

function roleLabel(roles: Role[]) {
  if (roles.includes(Role.CHIEF_ASSISTANT)) return "Chief assistant";
  if (roles.includes(Role.ASSISTANT)) return "Assistant";
  if (roles.includes(Role.ADMIN)) return "Admin";
  return "Member";
}

function taskStatusLabel(status: ResearchTaskStatus) {
  if (
    status === ResearchTaskStatus.OPEN ||
    status === ResearchTaskStatus.IN_PROGRESS
  ) {
    return "In progress";
  }
  if (status === ResearchTaskStatus.REVISION_REQUESTED) {
    return "Revision requested";
  }
  if (status === ResearchTaskStatus.CHECKING) return "Ready to check";
  if (status === ResearchTaskStatus.NEED_CLARIFY) return "Need clarify";
  if (status === ResearchTaskStatus.COMPLETED) return "Completed";
  if (status === ResearchTaskStatus.REVOKED) return "Revoked";
  return String(status)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function makeMemberList(team: TeamWithPeople) {
  const people = new Map<
    string,
    TeamWorkspace["members"][number] & { sortName: string }
  >();

  people.set(team.leader.id, {
    id: team.leader.id,
    name: personName(team.leader) || team.leader.email,
    email: displayResearchEmail(team.leader.email),
    affiliation: team.leader.affiliation || "",
    orcid: team.leader.orcid || "",
    badge: "Leader",
    role: roleLabel(team.leader.roles),
    teamResearchOngoing: 0,
    otherOngoing: 0,
    sortName: personName(team.leader) || team.leader.email,
  });

  for (const member of team.members) {
    if (people.has(member.user.id)) continue;
    people.set(member.user.id, {
      id: member.user.id,
      name: personName(member.user) || member.user.email,
      email: displayResearchEmail(member.user.email),
      affiliation: member.user.affiliation || "",
      orcid: member.user.orcid || "",
      badge: "Member",
      role: roleLabel(member.user.roles),
      teamResearchOngoing: 0,
      otherOngoing: 0,
      sortName: personName(member.user) || member.user.email,
    });
  }

  return [...people.values()].sort((left, right) => {
    if (left.badge !== right.badge) return left.badge === "Leader" ? -1 : 1;
    return left.sortName.localeCompare(right.sortName);
  });
}

function publicMember(
  member: TeamWorkspace["members"][number] & { sortName: string },
) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    affiliation: member.affiliation,
    orcid: member.orcid,
    badge: member.badge,
    role: member.role,
    teamResearchOngoing: member.teamResearchOngoing,
    otherOngoing: member.otherOngoing,
  };
}

export default async function ResearchTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const linkedTeamId = (await searchParams).teamId?.trim() ?? "";

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roles: true, name: true, email: true },
  });
  if (!currentUser || !canUseTeamFeature(currentUser.roles)) redirect("/401");

  const personSelect = {
    id: true,
    name: true,
    email: true,
    affiliation: true,
    orcid: true,
    roles: true,
  } satisfies Record<keyof TeamPerson, true>;

  const [memberships, ledTeams] = await Promise.all([
    prisma.researchAssistantTeamMember.findMany({
      where: currentUser.roles.includes(Role.ADMIN) ? {} : { userId },
      include: {
        team: {
          include: {
            leader: { select: personSelect },
            members: {
              include: { user: { select: personSelect } },
              orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
            },
          },
        },
      },
      orderBy: [{ team: { name: "asc" } }],
    }),
    prisma.researchAssistantTeam.findMany({
      where: currentUser.roles.includes(Role.ADMIN) ? {} : { leaderId: userId },
      include: {
        leader: { select: personSelect },
        members: {
          include: { user: { select: personSelect } },
          orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
        },
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const rawTeams = uniqueTeams([
    ...memberships.map((membership) => membership.team),
    ...ledTeams,
  ]);
  const teamIds = rawTeams.map((team) => team.id);

  const memberIds = Array.from(
    new Set(
      rawTeams.flatMap((team) => [
        team.leader.id,
        ...team.members.map((member) => member.user.id),
      ]),
    ),
  );

  const [researchProjects, memberTasks] = await Promise.all([
    prisma.researchProject.findMany({
      where: { assistantTeamId: { in: teamIds } },
      include: {
        authorEntries: {
          include: { user: { select: personSelect } },
          orderBy: { position: "asc" },
        },
        authors: { select: personSelect },
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true,
            assignments: {
              include: { user: { select: personSelect } },
            },
          },
        },
        teamParticipants: {
          include: { user: { select: personSelect } },
          orderBy: [{ user: { name: "asc" } }, { user: { email: "asc" } }],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    }),
    prisma.researchTask.findMany({
      where: { assignments: { some: { userId: { in: memberIds } } } },
      include: {
        project: {
          select: {
            id: true,
            assistantTeamId: true,
            title: true,
            researchCode: true,
          },
        },
        assignments: {
          include: { user: { select: personSelect } },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const teams: TeamWorkspace[] = rawTeams.map((team) => {
    const members = makeMemberList(team);
    const memberIdSet = new Set(members.map((member) => member.id));
    const teamResearchIds = new Set(
      researchProjects
        .filter((project) => project.assistantTeamId === team.id)
        .map((project) => project.id),
    );

    for (const task of memberTasks) {
      const isUnfinished =
        task.status !== ResearchTaskStatus.COMPLETED &&
        task.status !== ResearchTaskStatus.REVOKED;
      if (!isUnfinished) continue;
      const isTeamResearchTask = Boolean(
        task.projectId && teamResearchIds.has(task.projectId),
      );
      for (const assignment of task.assignments) {
        const member = members.find((item) => item.id === assignment.userId);
        if (!member) continue;
        if (isTeamResearchTask) member.teamResearchOngoing += 1;
        else member.otherOngoing += 1;
      }
    }

    const research = researchProjects
      .filter((project) => project.assistantTeamId === team.id)
      .map((project) => {
        const associations = new Map<
          string,
          { name: string; email: string; relationships: Set<string> }
        >();

        const addAssociation = (
          person: { id: string; name: string | null; email: string },
          relationship: string,
        ) => {
          if (!memberIdSet.has(person.id)) return;
          const current =
            associations.get(person.id) ??
            ({
              name: personName(person) || person.email,
              email: displayResearchEmail(person.email),
              relationships: new Set<string>(),
            } satisfies {
              name: string;
              email: string;
              relationships: Set<string>;
            });
          current.relationships.add(relationship);
          associations.set(person.id, current);
        };

        for (const entry of project.authorEntries) {
          addAssociation(entry.user, "Author");
        }
        for (const author of project.authors) {
          addAssociation(author, "Author");
        }
        for (const task of project.tasks) {
          for (const assignment of task.assignments) {
            addAssociation(assignment.user, "Assistant");
          }
        }
        for (const participant of project.teamParticipants) {
          addAssociation(participant.user, "Participating");
        }
        const currentUserHasProjectTask = project.tasks.some((task) =>
          task.assignments.some((assignment) => assignment.userId === userId),
        );
        const currentUserIsParticipant = project.teamParticipants.some(
          (participant) =>
            participant.teamId === team.id && participant.userId === userId,
        );
        const activeTasks = project.tasks.filter(
          (task) =>
            task.status !== ResearchTaskStatus.COMPLETED &&
            task.status !== ResearchTaskStatus.REVOKED,
        );
        const now = new Date();

        return {
          id: project.id,
          code: project.researchCode || "",
          title: project.title,
          stage: project.stage,
          updatedAt: project.updatedAt.toISOString(),
          hasSubmittedSubmission: false,
          activeTasks: activeTasks.length,
          overdueTasks: activeTasks.filter(
            (task) => task.dueDate && task.dueDate < now,
          ).length,
          canViewTaskCounts:
            currentUser.roles.includes(Role.ADMIN) || team.leader.id === userId,
          canOpenResearch:
            currentUser.roles.includes(Role.ADMIN) ||
            team.leader.id === userId ||
            currentUserHasProjectTask ||
            currentUserIsParticipant,
          canManageParticipants:
            currentUser.roles.includes(Role.ADMIN) || team.leader.id === userId,
          participantIds: project.teamParticipants
            .filter((participant) => participant.teamId === team.id)
            .map((participant) => participant.userId),
          associatedMembers: [...associations.values()]
            .map((item) => ({
              name: item.name,
              email: item.email,
              relationships: [...item.relationships].sort(),
            }))
            .sort((left, right) => left.name.localeCompare(right.name)),
        };
      });

    const performanceTasks = memberTasks
      .filter((task) =>
        task.assignments.some((assignment) =>
          memberIdSet.has(assignment.userId),
        ),
      )
      .flatMap((task) =>
        task.assignments
          .filter((assignment) => memberIdSet.has(assignment.userId))
          .map((assignment) => ({
            id: `${task.id}:${assignment.userId}`,
            taskId: task.id,
            title: task.title,
            assigneeId: assignment.userId,
            assigneeName: personName(assignment.user) || assignment.user.email,
            status: task.status,
            statusLabel: taskStatusLabel(task.status),
            dueDate:
              assignment.dueDate?.toISOString() ||
              task.dueDate?.toISOString() ||
              null,
            completedAt:
              assignment.completedAt?.toISOString() ||
              task.completedAt?.toISOString() ||
              null,
            updatedAt: task.updatedAt.toISOString(),
            isTeamResearchTask: Boolean(
              task.projectId && teamResearchIds.has(task.projectId),
            ),
          })),
      );

    return {
      id: team.id,
      name: team.name,
      description: team.description || "",
      leaderId: team.leader.id,
      leaderName: personName(team.leader) || team.leader.email,
      members: members.map(publicMember),
      research,
      performanceTasks,
    };
  });

  const firstTeam = teams[0] ?? null;
  const headerTitle =
    teams.length === 0
      ? "No assistant team assigned"
      : teams.length === 1
        ? firstTeam?.name || "Assistant team"
        : `${firstTeam?.name || "Assistant team"} + ${teams.length - 1} more`;

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <p className="min-w-0 truncate text-base font-normal text-slate-900 dark:text-[#E4E4E4]">
            {headerTitle}
          </p>
          {currentUser.roles.includes(Role.ADMIN) ? (
            <Link
              href="/teams"
              className="research-allow-transform inline-flex h-10 items-center justify-center gap-2 border border-[#1F7180] bg-transparent px-4 text-sm font-normal text-[#1F7180] shadow-sm transition hover:-translate-y-0.5 hover:border-[#155864] hover:bg-[#E9F8FA] hover:text-[#155864] active:translate-y-0 active:scale-[0.98] dark:border-[#A8DADC] dark:text-[#A8DADC] dark:hover:border-[#C9F0F2] dark:hover:bg-[#303030] dark:hover:text-[#C9F0F2]"
            >
              <UsersRound className="h-4 w-4" />
              Manage teams
            </Link>
          ) : null}
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-4">
        {teams.length > 0 ? (
          <TeamWorkspaceClient
            teams={teams}
            canOpenMemberProfiles={currentUser.roles.includes(Role.ADMIN)}
            currentUserId={currentUser.id}
            initialTeamId={linkedTeamId}
            updateParticipantsAction={updateResearchTeamParticipants}
          />
        ) : (
          <section className="border border-[#E2D9CC] bg-[#FFFDF8] p-5 dark:border-[#444444] dark:bg-[#2C2C2C]">
            <p className="text-sm leading-6 text-[#667085] dark:text-[#B0B0B0]">
              You are not in any assistant team yet. When admin adds you to a
              team, your members, assigned research, and team performance will
              appear here.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
