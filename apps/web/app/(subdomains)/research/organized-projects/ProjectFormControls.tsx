"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  GraduationCap,
  Mail,
  Search,
  Star,
  UserRound,
  X,
} from "lucide-react";
import type { AuthorOption } from "../projects/[id]/AuthorsPicker";

export type FundingInstitutionOption = {
  id: string;
  name: string;
  shortName: string;
  country: string;
};

export type ResearchResultOption = {
  id: string;
  title: string;
  stage: string;
};

export type SelectedProjectMember = AuthorOption & {
  isTeamLead: boolean;
  isInstructor: boolean;
};

function userName(user: AuthorOption) {
  return user.name || user.email;
}

export function FundingInstitutionPicker({
  institutions,
  defaultInstitution,
}: {
  institutions: FundingInstitutionOption[];
  defaultInstitution?: FundingInstitutionOption | null;
}) {
  const [selected, setSelected] = useState<FundingInstitutionOption | null>(
    defaultInstitution ?? null,
  );
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return institutions
      .filter((institution) => institution.id !== selected?.id)
      .filter((institution) =>
        [
          institution.id,
          institution.name,
          institution.shortName,
          institution.country,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [institutions, query, selected?.id]);

  function chooseInstitution(institution: FundingInstitutionOption) {
    setSelected(institution);
    setQuery("");
    setFocused(false);
  }

  return (
    <div className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
      Funding institution
      <input type="hidden" name="fundingInstitutionId" value={selected?.id ?? ""} />
      <div className="min-h-12 rounded-lg border border-slate-200 bg-slate-50 p-1 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950">
        {selected ? (
          <div className="flex min-h-10 items-center gap-2 rounded-md bg-white px-2.5 shadow-sm shadow-slate-900/[0.02] dark:bg-slate-900">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {selected.name}
              </span>
              <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                {[selected.shortName, selected.country].filter(Boolean).join(" - ")}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              aria-label="Remove funding institution"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              placeholder="Search funding institution..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />

            {focused && query.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-blue-100 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-blue-50 dark:border-blue-900/60 dark:bg-slate-950 dark:shadow-black/35 dark:ring-blue-950/50">
                {results.length > 0 ? (
                  results.map((institution) => (
                    <button
                      key={institution.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseInstitution(institution)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900">
                        <GraduationCap className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {institution.name}
                        </span>
                        <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                          {[institution.shortName, institution.country]
                            .filter(Boolean)
                            .join(" - ")}
                        </span>
                      </span>
                      <Check className="h-4 w-4 flex-none text-blue-500" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm font-medium text-slate-400">
                    No funding institution matches this search.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectMembersPicker({
  users,
  defaultMembers,
  onWarning,
}: {
  users: AuthorOption[];
  defaultMembers: SelectedProjectMember[];
  onWarning?: (message: string) => void;
}) {
  const [members, setMembers] = useState<SelectedProjectMember[]>(
    defaultMembers,
  );
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [localWarning, setLocalWarning] = useState("");
  const selectedIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members],
  );
  const teamLeadId =
    members.find((member) => member.isTeamLead)?.id ?? members[0]?.id ?? "";

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return users
      .filter((user) => !selectedIds.has(user.id))
      .filter((user) =>
        [user.id, user.name, user.email, user.role]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, selectedIds, users]);

  function addMember(user: AuthorOption) {
    setLocalWarning("");
    setMembers((current) => [
      ...current,
      {
        ...user,
        isTeamLead: current.length === 0,
        isInstructor: false,
      },
    ]);
    setQuery("");
    setFocused(false);
  }

  function removeMember(userId: string) {
    if (members.length <= 1) {
      const message =
        "A project must keep at least one member. Choose another member before removing this one.";
      setLocalWarning(message);
      onWarning?.(message);
      return;
    }

    setLocalWarning("");
    setMembers((current) => {
      const removedTeamLead = current.find((member) => member.id === userId)?.isTeamLead;
      const next = current.filter((member) => member.id !== userId);
      if (removedTeamLead && next[0]) {
        next[0] = { ...next[0], isTeamLead: true };
      }
      return next;
    });
  }

  function setTeamLead(userId: string) {
    setMembers((current) =>
      current.map((member) => ({
        ...member,
        isTeamLead: member.id === userId,
      })),
    );
  }

  function toggleInstructor(userId: string) {
    setMembers((current) =>
      current.map((member) =>
        member.id === userId
          ? { ...member, isInstructor: !member.isInstructor }
          : member,
      ),
    );
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>Members</span>
      {localWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span>{localWarning}</span>
        </div>
      )}
      {members.map((member) => (
        <input key={member.id} type="hidden" name="memberUserIds" value={member.id} />
      ))}
      <input type="hidden" name="teamLeadUserId" value={teamLeadId} />
      {members
        .filter((member) => member.isInstructor)
        .map((member) => (
          <input
            key={`instructor-${member.id}`}
            type="hidden"
            name="instructorUserIds"
            value={member.id}
          />
        ))}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-950">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            placeholder="Search user by name, ID, or email..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />

          {focused && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/12 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/35">
              <div className="max-h-72 overflow-y-auto">
                {results.length > 0 ? (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addMember(user)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {userName(user)}
                        </span>
                        <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                          {user.role} - {user.email} - {user.id.slice(0, 8)}
                        </span>
                      </span>
                      <Check className="h-4 w-4 flex-none text-blue-500" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm font-medium text-slate-400">
                    No users match this search.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {userName(member)}
                  </p>
                  {member.isTeamLead && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
                      Team lead
                    </span>
                  )}
                  {member.isInstructor && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900">
                      Instructor
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                  <Mail className="h-3 w-3 flex-none" aria-hidden="true" />
                  {member.email}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Set ${userName(member)} as team lead`}
                title="Set as team lead"
                onClick={() => setTeamLead(member.id)}
                className={`rounded-lg p-2 transition ${
                  member.isTeamLead
                    ? "bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
                    : "text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-200"
                }`}
              >
                <Star className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Toggle instructor for ${userName(member)}`}
                title="Toggle instructor"
                onClick={() => toggleInstructor(member.id)}
                className={`rounded-lg p-2 transition ${
                  member.isInstructor
                    ? "bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900"
                    : "text-slate-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/40 dark:hover:text-violet-200"
                }`}
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${userName(member)}`}
                onClick={() => removeMember(member.id)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm font-medium text-slate-400 dark:border-slate-700">
              Search and choose at least one member.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectResearchPicker({
  researchOptions,
  defaultResearch,
}: {
  researchOptions: ResearchResultOption[];
  defaultResearch: ResearchResultOption[];
}) {
  const [selected, setSelected] = useState<ResearchResultOption[]>(defaultResearch);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const selectedIds = useMemo(
    () => new Set(selected.map((research) => research.id)),
    [selected],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return researchOptions
      .filter((research) => !selectedIds.has(research.id))
      .filter((research) =>
        [research.id, research.title, research.stage]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, researchOptions, selectedIds]);

  return (
    <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      Research used as project results
      {selected.map((research) => (
        <input
          key={research.id}
          type="hidden"
          name="researchProjectIds"
          value={research.id}
        />
      ))}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-950">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            placeholder="Search research title, ID, or stage..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />

          {focused && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/12 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/35">
              <div className="max-h-72 overflow-y-auto">
                {results.length > 0 ? (
                  results.map((research) => (
                    <button
                      key={research.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSelected((current) => [...current, research]);
                        setQuery("");
                        setFocused(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {research.title}
                        </span>
                        <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                          {research.stage}
                        </span>
                      </span>
                      <Check className="h-4 w-4 flex-none text-blue-500" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm font-medium text-slate-400">
                    No research records match this search.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((research) => (
            <span
              key={research.id}
              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <span className="truncate">{research.title}</span>
              <button
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    current.filter((item) => item.id !== research.id),
                  )
                }
                className="rounded-md p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                aria-label={`Remove ${research.title}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          {selected.length === 0 && (
            <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400 dark:border-slate-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              No research selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
