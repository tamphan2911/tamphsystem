"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Crown,
  Pencil,
  PlusCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  IconHint,
  ResearchButton,
  researchFieldClass,
  researchLabelClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { TableSearchInput } from "@/sites/research/components/TableControls";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

export type TeamPerson = {
  id: string;
  name: string;
  email: string;
};

export type TeamMemberOption = TeamPerson & {
  currentTeamId: string;
  currentTeamName: string;
};

export type ResearchAssistantTeamRow = {
  id: string;
  name: string;
  description: string;
  leader: TeamPerson;
  members: TeamPerson[];
  updatedAt: string;
};

function personLabel(person: TeamPerson) {
  return displayResearchPersonName(person) || person.email;
}

function personSubtext(person: TeamPerson) {
  return displayResearchEmail(person.email);
}

function TeamForm({
  id,
  team,
  leaders,
  assistants,
  onSubmit,
}: {
  id: string;
  team?: ResearchAssistantTeamRow | null;
  leaders: TeamPerson[];
  assistants: TeamMemberOption[];
  onSubmit: (formData: FormData) => void;
}) {
  const selectedMemberIds = new Set(team?.members.map((member) => member.id));
  const leaderDefault = team?.leader.id ?? leaders[0]?.id ?? "";

  return (
    <form id={id} action={onSubmit} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)]">
        <label className={researchLabelClass}>
          <span>
            Team name
            <span className="research-required-mark">(*)</span>
          </span>
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={team?.name ?? ""}
            placeholder="Venue support team"
            className={researchFieldClass}
          />
        </label>
        <label className={researchLabelClass}>
          <span>
            Leader
            <span className="research-required-mark">(*)</span>
          </span>
          <select
            name="leaderId"
            required
            defaultValue={leaderDefault}
            className={researchFieldClass}
          >
            <option value="" disabled>
              Choose chief assistant
            </option>
            {leaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {personLabel(leader)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={researchLabelClass}>
        Description
        <textarea
          name="description"
          maxLength={800}
          defaultValue={team?.description ?? ""}
          placeholder="Optional note about team focus, support area, or handoff rules."
          className={researchTextareaClass}
        />
      </label>

      <section className="border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#2C2C2C]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-[#444444]">
          <div>
            <h3 className="text-xs font-normal uppercase text-slate-500 dark:text-[#B0B0B0]">
              Members
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-[#8F8F8F]">
              Each assistant can belong to only one team.
            </p>
          </div>
          <UsersRound className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {assistants.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {assistants.map((assistant) => {
                const checked = selectedMemberIds.has(assistant.id);
                const assignedElsewhere =
                  assistant.currentTeamId &&
                  assistant.currentTeamId !== team?.id;
                return (
                  <label
                    key={assistant.id}
                    className={`flex min-h-16 items-start gap-3 border px-3 py-2.5 text-sm transition ${
                      assignedElsewhere
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-[#3A3A3A] dark:bg-[#242424] dark:text-[#777777]"
                        : "cursor-pointer border-slate-200 bg-[#FFFDF8] text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#262626] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#303030]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="memberIds"
                      value={assistant.id}
                      defaultChecked={checked}
                      disabled={Boolean(assignedElsewhere)}
                      className="mt-1 h-4 w-4 rounded-none border-slate-300 text-[#1F7180] focus:ring-[#A8DADC] dark:border-[#5A5A5A] dark:bg-[#2C2C2C]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate">
                        {personLabel(assistant)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs opacity-75">
                        {personSubtext(assistant)}
                      </span>
                      {assignedElsewhere ? (
                        <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                          Already in {assistant.currentTeamName}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <ResearchEmptyState
              title="No assistants available"
              detail="Add assistant accounts before assigning team members."
            />
          )}
        </div>
      </section>
    </form>
  );
}

export function TeamsClient({
  teams,
  leaders,
  assistants,
  createAction,
  updateAction,
}: {
  teams: ResearchAssistantTeamRow[];
  leaders: TeamPerson[];
  assistants: TeamMemberOption[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (teamId: string, formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchAssistantTeamRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredTeams = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return teams;
    return teams.filter((team) =>
      [
        team.name,
        team.description,
        personLabel(team.leader),
        team.leader.email,
        ...team.members.flatMap((member) => [
          personLabel(member),
          member.email,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, teams]);

  function submitCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createAction(formData);
        setCreateOpen(false);
        router.refresh();
        toast.showSuccess({
          title: "Team created",
          detail: "The assistant team is now available.",
        });
      } catch (error) {
        toast.showError({
          title: "Team could not be created",
          detail:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        });
      }
    });
  }

  function submitEdit(team: ResearchAssistantTeamRow, formData: FormData) {
    startTransition(async () => {
      try {
        await updateAction(team.id, formData);
        setEditing(null);
        router.refresh();
        toast.showSuccess({
          title: "Team updated",
          detail: `${team.name} has been updated.`,
        });
      } catch (error) {
        toast.showError({
          title: "Team could not be updated",
          detail:
            error instanceof Error
              ? error.message
              : "Please refresh and try again.",
        });
      }
    });
  }

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <p className="truncate text-sm font-normal uppercase text-slate-700 dark:text-[#E4E4E4]">
            Team Management
          </p>
          <ResearchButton
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={leaders.length === 0}
          >
            <PlusCircle className="h-4 w-4" />
            Create team
          </ResearchButton>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-4">
        <section className="border border-slate-200 bg-white p-4 dark:border-[#444444] dark:bg-[#2C2C2C]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-sm font-normal uppercase text-slate-700 dark:text-[#E4E4E4]">
                Assistant teams
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-[#B0B0B0]">
                Admins assign assistants to one team led by a chief assistant.
              </p>
            </div>
            <div className="w-full max-w-md">
              <TableSearchInput
                value={query}
                onChange={setQuery}
                placeholder="Search team, leader, member..."
              />
            </div>
          </div>
        </section>

        {leaders.length === 0 ? (
          <ResearchEmptyState
            title="No chief assistants available"
            detail="Create or promote a chief assistant before creating assistant teams."
          />
        ) : filteredTeams.length === 0 ? (
          <ResearchEmptyState
            title={teams.length === 0 ? "No teams yet" : "No teams found"}
            detail={
              teams.length === 0
                ? "Create the first assistant team to start assigning members."
                : "Try another team, leader, or member search."
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredTeams.map((team) => (
              <article
                key={team.id}
                className="border border-slate-200 bg-white p-4 dark:border-[#444444] dark:bg-[#262626]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-normal text-slate-900 dark:text-[#E4E4E4]">
                      {team.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-[#8F8F8F]">
                      Updated {team.updatedAt}
                    </p>
                  </div>
                  <IconHint label={`Edit ${team.name}`}>
                    <button
                      type="button"
                      onClick={() => setEditing(team)}
                      className="research-allow-transform inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent text-[#1F7180] transition-[color,transform] hover:-translate-y-0.5 hover:text-[#155864] active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
                      aria-label={`Edit ${team.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </IconHint>
                </div>

                {team.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
                    {team.description}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-3">
                  <div className="border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-sm dark:border-cyan-400/20 dark:bg-cyan-950/25">
                    <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-200">
                      <Crown className="h-4 w-4" />
                      <span className="text-xs uppercase">Leader</span>
                    </div>
                    <p className="mt-1 text-slate-900 dark:text-[#E4E4E4]">
                      {personLabel(team.leader)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#B0B0B0]">
                      {personSubtext(team.leader)}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
                      <UsersRound className="h-4 w-4" />
                      <span>{team.members.length} members</span>
                    </div>
                    {team.members.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {team.members.map((member) => (
                          <span
                            key={member.id}
                            className="inline-flex max-w-full items-center gap-2 border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-[#444444] dark:bg-[#303030] dark:text-[#E4E4E4]"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                            <span className="truncate">
                              {personLabel(member)}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-[#8F8F8F]">
                        No assistants assigned yet.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ResearchModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create assistant team"
        icon={<UsersRound className="h-5 w-5" />}
        maxWidth="max-w-5xl"
        headerActions={
          <ResearchButton
            form="create-assistant-team-form"
            disabled={isPending}
          >
            <PlusCircle className="h-4 w-4" />
            Create team
          </ResearchButton>
        }
      >
        <TeamForm
          id="create-assistant-team-form"
          leaders={leaders}
          assistants={assistants}
          onSubmit={submitCreate}
        />
      </ResearchModal>

      <ResearchModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit assistant team"
        icon={<UsersRound className="h-5 w-5" />}
        maxWidth="max-w-5xl"
        headerActions={
          <ResearchButton form="edit-assistant-team-form" disabled={isPending}>
            Save team
          </ResearchButton>
        }
      >
        {editing ? (
          <TeamForm
            id="edit-assistant-team-form"
            team={editing}
            leaders={leaders}
            assistants={assistants}
            onSubmit={(formData) => submitEdit(editing, formData)}
          />
        ) : null}
      </ResearchModal>
    </>
  );
}
