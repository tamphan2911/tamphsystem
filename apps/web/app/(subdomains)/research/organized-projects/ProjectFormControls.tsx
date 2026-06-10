"use client";

import { useMemo, useRef, useState } from "react";
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
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSearchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import type { AuthorOption } from "../projects/[id]/AuthorsPicker";

export type FundingInstitutionOption = {
  id: string;
  name: string;
  shortName: string;
  country: string;
};

export type ResearchResultOption = {
  id: string;
  researchCode?: string;
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
  disabled = false,
}: {
  institutions: FundingInstitutionOption[];
  defaultInstitution?: FundingInstitutionOption | null;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<FundingInstitutionOption | null>(
    defaultInstitution ?? null,
  );
  const [query, setQuery] = useState("");

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

  const options = useMemo<
    ResearchSearchPickerOption<FundingInstitutionOption>[]
  >(
    () =>
      results.map((institution) => ({
        id: institution.id,
        label: institution.name,
        description: [institution.shortName, institution.country]
          .filter(Boolean)
          .join(" - "),
        data: institution,
      })),
    [results],
  );

  function chooseInstitution(institution: FundingInstitutionOption) {
    setSelected(institution);
    setQuery("");
  }

  return (
    <ResearchSearchPicker
      label="Funder"
      name="fundingInstitutionId"
      selected={
        selected
          ? {
              id: selected.id,
              label: selected.name,
              description: [selected.shortName, selected.country]
                .filter(Boolean)
                .join(" - "),
              data: selected,
            }
          : null
      }
      query={query}
      onQueryChange={(value) => setQuery(value)}
      onSelect={(option) =>
        chooseInstitution(option.data as FundingInstitutionOption)
      }
      onClear={() => {
        setSelected(null);
        setQuery("");
      }}
      options={options}
      placeholder="Search funding institution..."
      emptyText="No funding institution matches this search."
      disabled={disabled}
      renderSelected={(option) => {
        const institution = option.data as FundingInstitutionOption;
        return (
          <>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-none bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#E4E4E4]">
                {institution.name}
              </span>
              <span className="block truncate text-xs font-medium text-[#777777]">
                {[institution.shortName, institution.country]
                  .filter(Boolean)
                  .join(" - ")}
              </span>
            </span>
          </>
        );
      }}
      renderOption={(option) => (
        <>
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-none bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {option.label}
            </span>
            <span className="block truncate text-xs font-medium opacity-70">
              {option.description}
            </span>
          </span>
        </>
      )}
    />
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
  const [members, setMembers] =
    useState<SelectedProjectMember[]>(defaultMembers);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
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
      const removedTeamLead = current.find(
        (member) => member.id === userId,
      )?.isTeamLead;
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
    <div className="grid gap-2 text-sm font-semibold text-[#E4E4E4]">
      <span>Members</span>
      {localWarning && (
        <div className="flex items-start gap-2 rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
          <span>{localWarning}</span>
        </div>
      )}
      {members.map((member) => (
        <input
          key={member.id}
          type="hidden"
          name="memberUserIds"
          value={member.id}
        />
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
      <div className="border border-[#444444] bg-[#242424] p-3 shadow-none">
        <div ref={searchRef} className="relative">
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
            className={`${researchSearchFieldClass} pl-9`}
          />

          <FloatingDropdownPortal
            anchorRef={searchRef}
            open={focused && query.trim().length > 0}
            maxWidth={640}
          >
            <div className={researchDropdownPanelClass}>
              <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                {results.length > 0 ? (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addMember(user)}
                      className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
                    >
                      <span className="ml-3 inline-flex h-8 w-8 flex-none items-center justify-center rounded-none text-[#B0B0B0]">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-normal text-[#E4E4E4]">
                          {userName(user)}
                        </span>
                        <span className="block truncate text-xs font-medium text-[#777777]">
                          {user.role} - {user.email} - {user.id.slice(0, 8)}
                        </span>
                      </span>
                      <Check className="mr-3 h-4 w-4 flex-none text-[#A8DADC]" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm font-medium text-slate-400">
                    No users match this search.
                  </div>
                )}
              </div>
            </div>
          </FloatingDropdownPortal>
        </div>

        <div className="mt-3 grid gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 border border-[#444444] bg-[#2C2C2C] px-3 py-2 shadow-none transition hover:border-[#5A5A5A] hover:bg-[#303030]"
            >
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-none border border-[#3A3A3A] bg-[#202020] text-[#A8DADC]">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-[#E4E4E4]">
                    {userName(member)}
                  </p>
                  {member.isTeamLead && (
                    <span className="rounded-none border border-[#F4D47A]/35 bg-[#3A3322] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#F4D47A]">
                      Team lead
                    </span>
                  )}
                  {member.isInstructor && (
                    <span className="rounded-none border border-[#B39CD0]/35 bg-[#332B3F] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#C8B6E2]">
                      Instructor
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-[#777777]">
                  <Mail className="h-3 w-3 flex-none" aria-hidden="true" />
                  {member.email}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Set ${userName(member)} as team lead`}
                title="Set as team lead"
                onClick={() => setTeamLead(member.id)}
                className={`rounded-none p-2 transition ${
                  member.isTeamLead
                    ? "border border-[#F4D47A]/35 bg-[#3A3322] text-[#F4D47A]"
                    : "border border-transparent text-[#777777] hover:border-[#F4D47A]/35 hover:bg-[#3A3322] hover:text-[#F4D47A]"
                }`}
              >
                <Star className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Toggle instructor for ${userName(member)}`}
                title="Toggle instructor"
                onClick={() => toggleInstructor(member.id)}
                className={`rounded-none p-2 transition ${
                  member.isInstructor
                    ? "border border-[#B39CD0]/35 bg-[#332B3F] text-[#C8B6E2]"
                    : "border border-transparent text-[#777777] hover:border-[#B39CD0]/35 hover:bg-[#332B3F] hover:text-[#C8B6E2]"
                }`}
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${userName(member)}`}
                onClick={() => removeMember(member.id)}
                className="rounded-none border border-transparent p-2 text-[#777777] transition hover:border-rose-300/35 hover:bg-[#3A252A] hover:text-rose-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {members.length === 0 && (
            <div className="rounded-none border border-dashed border-[#444444] bg-[#242424] px-3 py-5 text-center text-sm font-normal text-[#777777]">
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
  const [selected, setSelected] =
    useState<ResearchResultOption[]>(defaultResearch);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const researchSearchRef = useRef<HTMLDivElement>(null);
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
        [research.id, research.researchCode, research.title, research.stage]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, researchOptions, selectedIds]);

  return (
    <div className="grid gap-2 text-sm font-semibold text-[#E4E4E4]">
      Research used as project results
      {selected.map((research) => (
        <input
          key={research.id}
          type="hidden"
          name="researchProjectIds"
          value={research.id}
        />
      ))}
      <div className="border border-[#444444] bg-[#2C2C2C] p-3 shadow-none">
        <div ref={researchSearchRef} className="relative">
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
            className={`${researchSearchFieldClass} pl-9`}
          />

          <FloatingDropdownPortal
            anchorRef={researchSearchRef}
            open={focused && query.trim().length > 0}
            maxWidth={720}
          >
            <div className={researchDropdownPanelClass}>
              <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
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
                      className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
                    >
                      <span className="min-w-0 flex-1 px-3">
                        <span className="block truncate text-sm font-normal text-[#E4E4E4]">
                          {research.title}
                        </span>
                        <span className="block truncate text-xs font-medium text-[#777777]">
                          {[research.researchCode, research.stage]
                            .filter(Boolean)
                            .join(" - ")}
                        </span>
                      </span>
                      <Check className="mr-3 h-4 w-4 flex-none text-[#A8DADC]" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm font-medium text-slate-400">
                    No research records match this search.
                  </div>
                )}
              </div>
            </div>
          </FloatingDropdownPortal>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((research) => (
            <span
              key={research.id}
              className="inline-flex max-w-full items-center gap-2 border border-[#444444] bg-[#2C2C2C] px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <span className="truncate">
                {research.researchCode ? `${research.researchCode} - ` : ""}
                {research.title}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    current.filter((item) => item.id !== research.id),
                  )
                }
                className="rounded-none p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                aria-label={`Remove ${research.title}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          {selected.length === 0 && (
            <span className="inline-flex items-center gap-2 rounded-none border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400 dark:border-slate-700">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              No research selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
