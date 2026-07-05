"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  BookOpen,
  CheckSquare,
  CheckCircle2,
  ClipboardList,
  Hash,
  Mail,
  Route,
  Square,
  UsersRound,
} from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { usePersistentTableValue } from "@/sites/research/components/TableControls";
import {
  IconHint,
  ResearchButton,
} from "@/sites/research/components/ResearchPrimitives";
import {
  researchStartOfDay,
  researchStartOfMonth,
  researchWeekday,
} from "@/sites/research/lib/date-time";

type TeamTab = "members" | "research" | "performance";
type PeriodKey =
  | "all"
  | "currentWeek"
  | "lastWeek"
  | "currentMonth"
  | "lastMonth";

export type TeamWorkspace = {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  members: {
    id: string;
    name: string;
    email: string;
    affiliation: string;
    orcid: string;
    badge: "Leader" | "Member";
    role: string;
    teamResearchOngoing: number;
    otherOngoing: number;
  }[];
  research: {
    id: string;
    code: string;
    title: string;
    stage: string;
    updatedAt: string;
    canOpenResearch: boolean;
    canManageParticipants: boolean;
    participantIds: string[];
    associatedMembers: {
      name: string;
      email: string;
      relationships: string[];
    }[];
  }[];
  performanceTasks: {
    id: string;
    taskId: string;
    title: string;
    assigneeId: string;
    assigneeName: string;
    status: string;
    statusLabel: string;
    dueDate: string | null;
    completedAt: string | null;
    updatedAt: string;
    isTeamResearchTask: boolean;
  }[];
};

function isFinished(status: string) {
  return status === "COMPLETED" || status === "REVOKED";
}

function isOverdue(task: TeamWorkspace["performanceTasks"][number]) {
  if (
    !task.dueDate ||
    task.status === "COMPLETED" ||
    task.status === "REVOKED"
  ) {
    return false;
  }
  return new Date(task.dueDate).getTime() < Date.now();
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function periodLabel(period: PeriodKey) {
  if (period === "currentWeek") return "This week";
  if (period === "lastWeek") return "Last week";
  if (period === "currentMonth") return "This month";
  if (period === "lastMonth") return "Last month";
  return "All time";
}

function periodStart(period: PeriodKey) {
  const currentDay = researchWeekday();
  const weekOffset = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = researchStartOfDay(new Date(), -weekOffset);

  if (period === "currentWeek") return startOfCurrentWeek;
  if (period === "lastWeek")
    return researchStartOfDay(new Date(), -weekOffset - 7);
  if (period === "currentMonth") return researchStartOfMonth();
  if (period === "lastMonth") return researchStartOfMonth(new Date(), -1);
  return null;
}

function periodEnd(period: PeriodKey) {
  const currentDay = researchWeekday();
  const weekOffset = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = researchStartOfDay(new Date(), -weekOffset);

  if (period === "lastWeek") return startOfCurrentWeek;
  if (period === "currentWeek")
    return researchStartOfDay(new Date(), 7 - weekOffset);
  if (period === "lastMonth") return researchStartOfMonth();
  if (period === "currentMonth") return researchStartOfMonth(new Date(), 1);
  return null;
}

function isTaskInPeriod(
  task: TeamWorkspace["performanceTasks"][number],
  period: PeriodKey,
) {
  const start = periodStart(period);
  const end = periodEnd(period);
  if (!start) return true;
  const date = new Date(task.completedAt ?? task.updatedAt);
  if (date < start) return false;
  if (end && date >= end) return false;
  return true;
}

function stageLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function TeamWorkspaceClient({
  teams,
  canOpenMemberProfiles,
  currentUserId,
  initialTeamId,
  updateParticipantsAction,
}: {
  teams: TeamWorkspace[];
  canOpenMemberProfiles: boolean;
  currentUserId: string;
  initialTeamId?: string;
  updateParticipantsAction: (
    projectId: string,
    formData: FormData,
  ) => Promise<unknown>;
}) {
  const [activeTeamId, setActiveTeamId] = usePersistentTableValue(
    "team-workspace:team",
    initialTeamId || teams[0]?.id || "",
    { persistDefaultValue: true },
  );
  const [activeTab, setActiveTab] = usePersistentTableValue<TeamTab>(
    "team-workspace:tab",
    "members",
  );
  const [performanceScope, setPerformanceScope] = usePersistentTableValue(
    "team-workspace:performance-scope",
    "team",
    { persistDefaultValue: true },
  );
  const [performancePeriod, setPerformancePeriod] =
    usePersistentTableValue<PeriodKey>(
      "team-workspace:performance-period",
      "all",
    );

  const activeTeam =
    teams.find((team) => team.id === activeTeamId) ?? teams[0] ?? null;
  const activeTeamCanOpenProfiles =
    canOpenMemberProfiles || activeTeam?.leaderId === currentUserId;

  useEffect(() => {
    if (!initialTeamId) return;
    if (teams.some((team) => team.id === initialTeamId)) {
      setActiveTeamId(initialTeamId);
    }
  }, [initialTeamId, setActiveTeamId, teams]);

  const performanceTasks = useMemo(() => {
    if (!activeTeam) return [];
    return activeTeam.performanceTasks
      .filter((task) =>
        performanceScope === "team" ? task.isTeamResearchTask : true,
      )
      .filter((task) => isTaskInPeriod(task, performancePeriod));
  }, [activeTeam, performancePeriod, performanceScope]);

  const performanceRows = useMemo(() => {
    if (!activeTeam) return [];
    return activeTeam.members.map((member) => {
      const tasks = performanceTasks.filter(
        (task) => task.assigneeId === member.id,
      );
      const completed = tasks.filter(
        (task) => task.status === "COMPLETED",
      ).length;
      const revoked = tasks.filter((task) => task.status === "REVOKED").length;
      const active = tasks.filter((task) => !isFinished(task.status)).length;
      const overdue = tasks.filter(isOverdue).length;
      const completionRate =
        tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
      return {
        ...member,
        total: tasks.length,
        active,
        completed,
        revoked,
        overdue,
        completionRate,
      };
    });
  }, [activeTeam, performanceTasks]);

  if (!activeTeam) return null;

  const tabs: {
    key: TeamTab;
    label: string;
    value: number;
    icon: typeof UsersRound;
  }[] = [
    {
      key: "members",
      label: "Members",
      value: activeTeam.members.length,
      icon: UsersRound,
    },
    {
      key: "research",
      label: "Research Assigned",
      value: activeTeam.research.length,
      icon: BookOpen,
    },
    {
      key: "performance",
      label: "Performance",
      value: performanceTasks.length,
      icon: ClipboardList,
    },
  ];

  return (
    <section className="space-y-4">
      {teams.length > 1 ? (
        <div className="journal-detail-tabs grid w-full border border-[#E2D9CC] bg-[#F5F2EC] p-1 text-center dark:border-[#444444] dark:bg-[#242424] sm:grid-cols-3">
          {teams.map((team) => (
            <button
              key={team.id}
              type="button"
              data-active={activeTeam.id === team.id}
              aria-pressed={activeTeam.id === team.id}
              onClick={() => setActiveTeamId(team.id)}
              className="journal-detail-tab-button cursor-pointer rounded-none px-4 py-3 text-left"
            >
              <span className="relative z-10 flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-[11px] font-normal uppercase tracking-wide">
                  {team.name}
                </span>
                <span className="text-sm font-normal">
                  {team.members.length}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-b border-[#E2D9CC] bg-[#F8F6EF] pb-3 dark:border-[#444444] dark:bg-transparent">
        <p className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
          Team leader
        </p>
        <p className="mt-1 text-base font-normal text-[#1F2937] dark:text-[#E4E4E4]">
          {activeTeam.leaderName}
        </p>
        {activeTeam.description ? (
          <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-[#667085] dark:text-[#B0B0B0]">
            {activeTeam.description}
          </p>
        ) : null}
      </div>

      <div className="journal-detail-tabs grid w-full grid-cols-3 border border-[#E2D9CC] bg-[#F5F2EC] p-1 text-center dark:border-[#444444] dark:bg-[#242424]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-active={activeTab === tab.key}
            aria-pressed={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="journal-detail-tab-button cursor-pointer rounded-none px-4 py-3 text-left"
          >
            <span className="relative z-10 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-normal uppercase tracking-wide">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
              <span className="text-base font-normal">{tab.value}</span>
            </span>
          </button>
        ))}
      </div>

      {activeTab === "members" ? (
        <MembersTable
          team={activeTeam}
          canOpenMemberProfiles={activeTeamCanOpenProfiles}
        />
      ) : null}
      {activeTab === "research" ? (
        <ResearchTable
          team={activeTeam}
          updateParticipantsAction={updateParticipantsAction}
        />
      ) : null}
      {activeTab === "performance" ? (
        <PerformanceTable
          rows={performanceRows}
          teamOnly={performanceScope === "team"}
          period={performancePeriod}
          onPeriodChange={setPerformancePeriod}
          onToggle={() =>
            setPerformanceScope((value) => (value === "team" ? "all" : "team"))
          }
        />
      ) : null}
    </section>
  );
}

function MembersTable({
  team,
  canOpenMemberProfiles,
}: {
  team: TeamWorkspace;
  canOpenMemberProfiles: boolean;
}) {
  return (
    <div className="overflow-hidden border border-[#E2D9CC] dark:border-[#444444]">
      <table className="w-full table-fixed text-left">
        <thead className="border-b border-[#E2D9CC] bg-[#EBE4D7] text-xs uppercase tracking-wide text-[#667085] dark:border-[#444444] dark:bg-[#1B1B1B] dark:text-[#B0B0B0]">
          <tr>
            <th className="w-[48%] px-4 py-3">Member</th>
            <th className="px-4 py-3">Affiliation</th>
            <th className="w-[14rem] px-4 py-3">Ongoing Tasks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2D9CC] dark:divide-[#444444]">
          {team.members.map((member) => (
            <tr
              key={member.id}
              className="align-top odd:bg-[#FFFDF8] even:bg-[#F7F4ED] hover:bg-[#F2EEE6] dark:odd:bg-[#2C2C2C] dark:even:bg-[#262626] dark:hover:bg-[#303030]"
            >
              <td className="px-4 py-4 align-top">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {canOpenMemberProfiles ? (
                      <Link
                        href={`/profile?userId=${encodeURIComponent(member.id)}`}
                        className="research-allow-transform min-w-0 whitespace-normal break-words text-sm font-normal text-[#1F2937] transition-colors hover:text-[#1F7180] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
                      >
                        {member.name}
                      </Link>
                    ) : (
                      <p className="min-w-0 whitespace-normal break-words text-sm font-normal text-[#1F2937] dark:text-[#E4E4E4]">
                        {member.name}
                      </p>
                    )}
                    <span className="border border-[#D8CEBF] bg-[#F5F2EC] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#667085] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
                      {member.badge}
                    </span>
                    <span className="border border-[#D8CEBF] bg-[#F5F2EC] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#A8DADC]">
                      {member.role}
                    </span>
                  </div>
                  <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
                    <Mail className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                    <span className="min-w-0 break-all">{member.email}</span>
                  </p>
                  {member.orcid ? (
                    <a
                      href={member.orcid}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex min-w-0 items-center gap-1 text-xs text-[#1F7180] transition-colors hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-cyan-100"
                    >
                      <Hash className="h-3.5 w-3.5 flex-none" />
                      <span className="break-all">{member.orcid}</span>
                    </a>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-4 align-top text-sm leading-6 text-[#667085] dark:text-[#B0B0B0]">
                {member.affiliation || "No affiliation recorded"}
              </td>
              <td className="px-4 py-4 align-top text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                <span className="block">
                  Research assigned:{" "}
                  <span className="text-[#1F2937] dark:text-[#E4E4E4]">
                    {member.teamResearchOngoing}
                  </span>
                </span>
                <span className="block">
                  Others:{" "}
                  <span className="text-[#1F2937] dark:text-[#E4E4E4]">
                    {member.otherOngoing}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResearchTable({
  team,
  updateParticipantsAction,
}: {
  team: TeamWorkspace;
  updateParticipantsAction: (
    projectId: string,
    formData: FormData,
  ) => Promise<unknown>;
}) {
  const [blockedResearch, setBlockedResearch] = useState<
    TeamWorkspace["research"][number] | null
  >(null);

  return (
    <>
      <div className="overflow-hidden border border-[#E2D9CC] dark:border-[#444444]">
        <table className="w-full table-fixed text-left">
        <thead className="border-b border-[#E2D9CC] bg-[#EBE4D7] text-xs uppercase tracking-wide text-[#667085] dark:border-[#444444] dark:bg-[#1B1B1B] dark:text-[#B0B0B0]">
          <tr>
            <th className="w-[8rem] px-4 py-3">ID</th>
            <th className="px-4 py-3">Research</th>
            <th className="w-[14rem] px-4 py-3">Stage</th>
            <th className="w-[4rem] px-4 py-3 text-center">Edit</th>
            <th className="w-[36%] px-4 py-3">Team Association</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2D9CC] dark:divide-[#444444]">
          {team.research.length > 0 ? (
            team.research.map((research) => (
              <tr
                key={research.id}
                className="align-top odd:bg-[#FFFDF8] even:bg-[#F7F4ED] hover:bg-[#F2EEE6] dark:odd:bg-[#2C2C2C] dark:even:bg-[#262626] dark:hover:bg-[#303030]"
              >
                <td className="px-4 py-4 align-top font-mono text-xs text-[#667085] dark:text-[#B0B0B0]">
                  {research.code || research.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="px-4 py-4 align-top">
                  {research.canOpenResearch ? (
                    <Link
                      href={`/projects/${research.id}`}
                      className="research-allow-transform block text-sm font-normal leading-5 text-[#1F2937] transition hover:-translate-y-0.5 hover:text-[#1F7180] active:translate-y-0 active:scale-[0.99] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
                    >
                      {research.title}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBlockedResearch(research)}
                      className="research-allow-transform block cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-normal leading-5 text-[#1F2937] transition hover:-translate-y-0.5 hover:text-[#1F7180] focus-visible:outline-none focus-visible:ring-0 active:translate-y-0 active:scale-[0.99] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
                    >
                      {research.title}
                    </button>
                  )}
                  <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
                    Updated {formatDate(research.updatedAt)}
                  </p>
                </td>
                <td className="px-4 py-4 align-top text-sm text-[#1F2937] dark:text-[#E4E4E4]">
                  {stageLabel(research.stage)}
                </td>
                <td className="px-4 py-4 text-center align-top">
                  {research.canManageParticipants ? (
                    <ResearchParticipantsDialog
                      team={team}
                      research={research}
                      action={updateParticipantsAction}
                    />
                  ) : null}
                </td>
                <td className="px-4 py-4 align-top">
                  {research.associatedMembers.length > 0 ? (
                    <div className="space-y-2">
                      {research.associatedMembers.map((member) => (
                        <div key={`${research.id}:${member.name}`}>
                          <p className="text-sm text-[#1F2937] dark:text-[#E4E4E4]">
                            {member.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[#667085] dark:text-[#B0B0B0]">
                            {member.relationships.join(", ")}
                            {member.email ? ` | ${member.email}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#667085] dark:text-[#B0B0B0]">
                      No team member linked yet.
                    </p>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr className="bg-[#FFFDF8] dark:bg-[#2C2C2C]">
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-[#667085] dark:text-[#B0B0B0]"
              >
                No research is assigned to this team yet.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
      <ResearchModal
        open={Boolean(blockedResearch)}
        onClose={() => setBlockedResearch(null)}
        title="Research access is limited"
        description="This research is assigned to your team, so it stays visible in the team workspace. You can open its detail page after you are linked as a participant or assigned a task for it."
        icon={<Route className="h-5 w-5" aria-hidden="true" />}
        maxWidth="max-w-xl"
      >
        <div className="space-y-3 px-6 py-5">
          <div className="border border-[#E2D9CC] bg-[#FFFDF8] p-3 dark:border-[#444444] dark:bg-[#202020]">
            <p className="text-sm text-[#1F2937] dark:text-[#E4E4E4]">
              {blockedResearch?.title}
            </p>
            <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
              Ask your team leader to link you as a participant or assign you a
              task related to this research.
            </p>
          </div>
          <div className="flex justify-end">
            <ResearchButton
              type="button"
              onClick={() => setBlockedResearch(null)}
            >
              I understand
            </ResearchButton>
          </div>
        </div>
      </ResearchModal>
    </>
  );
}

function ResearchParticipantsDialog({
  team,
  research,
  action,
}: {
  team: TeamWorkspace;
  research: TeamWorkspace["research"][number];
  action: (projectId: string, formData: FormData) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  const selectableMembers = team.members.filter(
    (member) => member.badge === "Member",
  );

  return (
    <>
      <IconHint label="Edit participating team members" position="bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#1F7180] transition duration-180 ease-out hover:-translate-y-0.5 hover:text-[#155864] active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
          aria-label="Edit participating team members"
        >
          <UsersRound className="h-4 w-4" aria-hidden="true" />
        </button>
      </IconHint>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Research team participation"
        description="Tick the team members who participated in this research."
        icon={<UsersRound className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        headerActions={
          <ResearchButton
            form={`team-participants-${research.id}`}
            disabled={isPending}
          >
            <CheckCircle2 className="h-4 w-4" />
            Save members
          </ResearchButton>
        }
      >
        <form
          id={`team-participants-${research.id}`}
          className="space-y-4 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await action(research.id, formData);
              setOpen(false);
              toast.showSuccess({
                title: "Team participation saved",
                detail:
                  "Participating members for this research are now updated.",
              });
            });
          }}
        >
          <div className="border border-[#E2D9CC] bg-[#FFFDF8] p-3 dark:border-[#444444] dark:bg-[#202020]">
            <p className="text-sm text-[#1F2937] dark:text-[#E4E4E4]">
              {research.title}
            </p>
            <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
              Team: {team.name}
            </p>
          </div>
          {selectableMembers.length > 0 ? (
            <div className="divide-y divide-[#E2D9CC] border-y border-[#E2D9CC] dark:divide-[#444444] dark:border-[#444444]">
              {selectableMembers.map((member) => (
                <label
                  key={member.id}
                  className="group flex cursor-pointer items-start gap-3 py-3 transition hover:bg-[#F7F4ED] dark:hover:bg-[#303030]"
                >
                  <input
                    type="checkbox"
                    name="participantIds"
                    value={member.id}
                    defaultChecked={research.participantIds.includes(member.id)}
                    className="mt-1 h-4 w-4 rounded-none border-[#D8D0C2] text-[#1F7180] focus:ring-[#1F7180]/20 dark:border-[#444444] dark:bg-[#202020] dark:text-[#A8DADC]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-[#1F2937] dark:text-[#E4E4E4]">
                      {member.name}
                    </span>
                    <span className="mt-0.5 block break-all text-xs text-[#667085] dark:text-[#B0B0B0]">
                      {member.email}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[#667085] dark:text-[#B0B0B0]">
              This team has no assistant members to mark as participating.
            </p>
          )}
        </form>
      </ResearchModal>
    </>
  );
}

function PerformanceTable({
  rows,
  teamOnly,
  period,
  onPeriodChange,
  onToggle,
}: {
  rows: TeamPerformanceRow[];
  teamOnly: boolean;
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  onToggle: () => void;
}) {
  const totalTasks = rows.reduce((sum, row) => sum + row.total, 0);
  const activeTasks = rows.reduce((sum, row) => sum + row.active, 0);
  const completedTasks = rows.reduce((sum, row) => sum + row.completed, 0);
  const completionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="border border-[#E2D9CC] bg-[#FFFDF8] dark:border-[#444444] dark:bg-[#2C2C2C]">
      <div className="flex flex-col gap-3 border-b border-[#E2D9CC] px-4 py-3 dark:border-[#444444] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            Team Performance
          </p>
          <p className="mt-1 text-sm text-[#1F2937] dark:text-[#E4E4E4]">
            {totalTasks} tasks tracked - {completionRate}% completion rate
          </p>
          <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
            {teamOnly
              ? "Showing only tasks linked to research assigned to this team."
              : "Showing all tasks assigned to this team's members."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 border border-[#D8D0C2] bg-[#F8F6EF] p-1 md:grid-cols-5 dark:border-[#444444] dark:bg-[#242424]">
            {(
              [
                "all",
                "currentWeek",
                "lastWeek",
                "currentMonth",
                "lastMonth",
              ] as PeriodKey[]
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPeriodChange(item)}
                className={`cursor-pointer px-3 py-2 text-xs font-normal uppercase tracking-wide transition duration-200 ease-out ${
                  period === item
                    ? "bg-[#F2EEE6] text-[#1F2937] dark:bg-[#383838] dark:text-[#E4E4E4]"
                    : "text-[#667085] hover:bg-[#F2EEE6] hover:text-[#1F2937] dark:text-[#B0B0B0] dark:hover:bg-[#383838] dark:hover:text-[#E4E4E4]"
                } active:scale-[0.97]`}
              >
                {periodLabel(item)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={teamOnly}
            className="inline-flex h-10 items-center justify-center gap-2 border border-[#D8D0C2] bg-[#F8F6EF] px-3 text-xs font-normal uppercase tracking-wide text-[#667085] transition-colors hover:border-[#1F7180]/40 hover:bg-[#F2EEE6] hover:text-[#1F2937] dark:border-[#444444] dark:bg-[#242424] dark:text-[#B0B0B0] dark:hover:bg-[#303030] dark:hover:text-[#E4E4E4]"
          >
            {teamOnly ? (
              <CheckSquare className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Research assigned
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-[#E2D9CC] text-sm dark:border-[#444444] md:grid-cols-4">
        <Metric label="Tasks" value={totalTasks} icon={ClipboardList} />
        <Metric label="Active" value={activeTasks} icon={Route} />
        <Metric label="Done" value={completedTasks} icon={BadgeCheck} />
        <Metric label="Rate" value={`${completionRate}%`} icon={CheckCircle2} />
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#E2D9CC] bg-[#EBE4D7] text-xs uppercase tracking-wide text-[#667085] dark:border-[#444444] dark:bg-[#1B1B1B] dark:text-[#B0B0B0]">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="w-[8rem] px-4 py-3">Tasks</th>
              <th className="w-[8rem] px-4 py-3">Active</th>
              <th className="w-[8rem] px-4 py-3">Completed</th>
              <th className="w-[8rem] px-4 py-3">Overdue</th>
              <th className="w-[9rem] px-4 py-3">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2D9CC] dark:divide-[#444444]">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="align-top odd:bg-[#FFFDF8] even:bg-[#F7F4ED] hover:bg-[#F2EEE6] dark:odd:bg-[#2C2C2C] dark:even:bg-[#262626] dark:hover:bg-[#303030]"
              >
                <td className="px-4 py-4 align-top">
                  <p className="text-sm text-[#1F2937] dark:text-[#E4E4E4]">
                    {row.name}
                  </p>
                  <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
                    {row.role}
                  </p>
                </td>
                <td className="px-4 py-4 align-top text-sm text-[#1F2937] dark:text-[#E4E4E4]">
                  {row.total}
                </td>
                <td className="px-4 py-4 align-top text-sm text-amber-700 dark:text-amber-300">
                  {row.active}
                </td>
                <td className="px-4 py-4 align-top text-sm text-emerald-700 dark:text-emerald-300">
                  {row.completed}
                </td>
                <td className="px-4 py-4 align-top text-sm text-rose-700 dark:text-rose-300">
                  {row.overdue}
                </td>
                <td className="px-4 py-4 align-top text-sm text-[#1F2937] dark:text-[#E4E4E4]">
                  {row.completionRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type TeamPerformanceRow = TeamWorkspace["members"][number] & {
  total: number;
  active: number;
  completed: number;
  revoked: number;
  overdue: number;
  completionRate: number;
};

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof ClipboardList;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-r border-[#E2D9CC] px-4 py-3 last:border-r-0 dark:border-[#444444]">
      <div>
        <p className="text-[11px] font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
          {label}
        </p>
        <p className="mt-1 text-xl font-normal text-[#1F2937] dark:text-[#E4E4E4]">
          {value}
        </p>
      </div>
      <Icon className="h-5 w-5 text-[#1F7180] dark:text-[#A8DADC]" />
    </div>
  );
}
