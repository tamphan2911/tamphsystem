"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  FolderCheck,
  GraduationCap,
  Mail,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  IconHint,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchSearchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import type { AuthorOption } from "../projects/[id]/AuthorsPicker";
import { ContactEmailChoiceButton } from "../projects/[id]/AuthorsPicker";

export type FundingInstitutionOption = {
  id: string;
  name: string;
  shortName: string;
  country: string;
};

export type AssistantTeamOption = {
  id: string;
  name: string;
  leaderName: string;
  leaderEmail: string;
  memberCount: number;
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
  folderShared?: boolean;
};

function userName(user: AuthorOption) {
  return displayResearchPersonName(user);
}

export function ProjectRequiredProductsEditor({
  defaultProducts = [],
}: {
  defaultProducts?: string[];
}) {
  const [products, setProducts] = useState(() =>
    defaultProducts.length > 0 ? defaultProducts : [""],
  );

  function updateProduct(index: number, value: string) {
    setProducts((current) =>
      current.map((product, productIndex) =>
        productIndex === index ? value : product,
      ),
    );
  }

  function addProduct() {
    setProducts((current) => [...current, ""]);
  }

  function removeProduct(index: number) {
    setProducts((current) => {
      const next = current.filter((_, productIndex) => productIndex !== index);
      return next.length > 0 ? next : [""];
    });
  }

  function moveProduct(index: number, direction: -1 | 1) {
    setProducts((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [product] = next.splice(index, 1);
      if (product === undefined) return current;
      next.splice(target, 0, product);
      return next;
    });
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-[#1f2937] dark:text-[#E4E4E4]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Required products</span>
        <button
          type="button"
          onClick={addProduct}
          className="research-allow-transform inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-xs font-normal text-[#1F7180] transition hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Add product
        </button>
      </div>
      <div className="divide-y divide-[#D8D0C2] border-y border-[#D8D0C2] bg-[#FFFDF8] dark:divide-[#444444] dark:border-[#444444] dark:bg-[#2C2C2C]">
        {products.map((product, index) => (
          <div
            key={index}
            className="grid gap-3 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto]"
          >
            <div className="flex items-center px-2 md:flex-col md:px-0">
              <button
                type="button"
                aria-label="Move product up"
                disabled={index === 0}
                onClick={() => moveProduct(index, -1)}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent text-[#667085] transition hover:text-[#1F7180] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Move product down"
                disabled={index === products.length - 1}
                onClick={() => moveProduct(index, 1)}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent text-[#667085] transition hover:text-[#1F7180] disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <input
              name="requiredProductTitles"
              value={product}
              onChange={(event) => updateProduct(index, event.target.value)}
              placeholder={`Required product ${index + 1}`}
              className={researchSearchFieldClass}
            />
            <button
              type="button"
              aria-label="Remove required product"
              onClick={() => removeProduct(index)}
              className="research-allow-transform mx-2 inline-flex h-10 w-10 cursor-pointer items-center justify-center self-center border-0 bg-transparent text-[#667085] transition hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-600 active:translate-y-0 active:scale-95 dark:text-[#B0B0B0] dark:hover:text-rose-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs font-normal leading-5 text-[#667085] dark:text-[#B0B0B0]">
        Add each expected output as a separate line item. You can link a finished
        research record to each product later from the project detail page.
      </p>
    </div>
  );
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
            <span className="inline-flex h-4 w-4 flex-none items-center justify-center text-[#A8DADC]">
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
          <span className="ml-3 inline-flex h-4 w-4 flex-none items-center justify-center text-[#A8DADC]">
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

export function AssistantTeamPicker({
  teams,
  defaultTeam,
  disabled = false,
}: {
  teams: AssistantTeamOption[];
  defaultTeam?: AssistantTeamOption | null;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<AssistantTeamOption | null>(
    defaultTeam ?? null,
  );
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return teams
      .filter((team) => team.id !== selected?.id)
      .filter((team) =>
        [team.id, team.name, team.leaderName, team.leaderEmail]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, selected?.id, teams]);

  const options = useMemo<ResearchSearchPickerOption<AssistantTeamOption>[]>(
    () =>
      results.map((team) => ({
        id: team.id,
        label: team.name,
        description: [team.leaderName || team.leaderEmail, team.leaderEmail]
          .filter(Boolean)
          .join(" - "),
        data: team,
      })),
    [results],
  );

  return (
    <ResearchSearchPicker
      label="Assistant team"
      name="assistantTeamId"
      selected={
        selected
          ? {
              id: selected.id,
              label: selected.name,
              description: [
                selected.leaderName || selected.leaderEmail,
                selected.leaderEmail,
              ]
                .filter(Boolean)
                .join(" - "),
              data: selected,
            }
          : null
      }
      query={query}
      onQueryChange={(value) => setQuery(value)}
      onSelect={(option) => {
        setSelected(option.data as AssistantTeamOption);
        setQuery("");
      }}
      onClear={() => {
        setSelected(null);
        setQuery("");
      }}
      options={options}
      placeholder="Search assistant team..."
      emptyText="No assistant team matches this search."
      disabled={disabled}
      renderSelected={(option) => {
        const team = option.data as AssistantTeamOption;
        return (
          <>
            <span className="inline-flex h-4 w-4 flex-none items-center justify-center text-[#1F7180] dark:text-[#A8DADC]">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-900 dark:text-[#E4E4E4]">
                {team.name}
              </span>
              <span className="block truncate text-xs font-medium text-slate-500 dark:text-[#777777]">
                {team.leaderName || team.leaderEmail} - {team.memberCount}{" "}
                members
              </span>
            </span>
          </>
        );
      }}
      renderOption={(option) => {
        const team = option.data as AssistantTeamOption;
        return (
          <>
            <span className="ml-3 inline-flex h-4 w-4 flex-none items-center justify-center text-[#1F7180] dark:text-[#A8DADC]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">
                {team.name}
              </span>
              <span className="block truncate text-xs font-medium opacity-70">
                {team.leaderName || team.leaderEmail} - {team.memberCount}{" "}
                members
              </span>
            </span>
          </>
        );
      }}
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
  const [members, setMembers] = useState<SelectedProjectMember[]>(
    defaultMembers.map((member) => ({
      ...member,
      selectedEmail: member.selectedEmail || member.email,
    })),
  );
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
        selectedEmail: user.selectedEmail || user.email,
        isTeamLead: current.length === 0,
        isInstructor: false,
        folderShared: false,
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

  function toggleFolderShared(userId: string) {
    setMembers((current) =>
      current.map((member) =>
        member.id === userId
          ? { ...member, folderShared: !member.folderShared }
          : member,
      ),
    );
  }

  function setSelectedEmail(userId: string, email: string) {
    setMembers((current) =>
      current.map((member) =>
        member.id === userId ? { ...member, selectedEmail: email } : member,
      ),
    );
  }

  function moveMember(userId: string, direction: -1 | 1) {
    setMembers((current) => {
      const index = current.findIndex((member) => member.id === userId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [member] = next.splice(index, 1);
      if (!member) return current;
      next.splice(target, 0, member);
      return next;
    });
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
      {members.map((member) => (
        <input
          key={`selected-email-${member.id}`}
          type="hidden"
          name="selectedContactEmails"
          value={`${member.id}\t${member.selectedEmail || member.email}`}
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
      {members
        .filter((member) => member.folderShared)
        .map((member) => (
          <input
            key={`folder-shared-${member.id}`}
            type="hidden"
            name="folderSharedMemberIds"
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
                          {[
                            user.role,
                            displayResearchEmail(user.email),
                            user.id.slice(0, 8),
                          ]
                            .filter(Boolean)
                            .join(" - ")}
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

        <div className="mt-3 divide-y divide-[#444444] border-y border-[#444444]">
          {members.map((member, index) => (
            <div
              key={member.id}
              className="flex items-center gap-3 py-3 transition hover:bg-[#303030]"
            >
              <span className="inline-flex w-8 flex-none justify-center font-mono text-sm font-normal text-[#A8DADC]">
                {index + 1}
              </span>
              <div className="flex flex-none flex-col">
                <button
                  type="button"
                  aria-label={`Move ${userName(member)} up`}
                  disabled={index === 0}
                  onClick={() => moveMember(member.id, -1)}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition hover:text-[#A8DADC] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${userName(member)} down`}
                  disabled={index === members.length - 1}
                  onClick={() => moveMember(member.id, 1)}
                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition hover:text-[#A8DADC] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-[#E4E4E4]">
                    {userName(member)}
                  </p>
                  {member.isTeamLead && (
                    <span className="border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E4E4E4]">
                      Team lead
                    </span>
                  )}
                  {member.isInstructor && (
                    <span className="border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#A8DADC]">
                      Instructor
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-[#777777]">
                  <Mail
                    className="h-3 w-3 flex-none text-[#A8DADC]"
                    aria-hidden="true"
                  />
                  {displayResearchEmail(member.selectedEmail || member.email)}
                  <ContactEmailChoiceButton
                    person={member}
                    onChange={(email) => setSelectedEmail(member.id, email)}
                  />
                </p>
              </div>
              <IconHint
                label={
                  member.folderShared
                    ? "Project folder shared"
                    : "Mark project folder as shared"
                }
                position="bottom"
              >
                <button
                  type="button"
                  aria-label={
                    member.folderShared
                      ? `${userName(member)} has access to the project folder`
                      : `Mark project folder shared with ${userName(member)}`
                  }
                  onClick={() => toggleFolderShared(member.id)}
                  className={`research-allow-transform cursor-pointer border-0 bg-transparent p-2 transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent active:translate-y-0 active:scale-95 ${
                    member.folderShared
                      ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                      : "text-[#777777] hover:text-emerald-700 dark:hover:text-emerald-300"
                  }`}
                >
                  <FolderCheck className="h-4 w-4" aria-hidden="true" />
                </button>
              </IconHint>
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
            <div className="px-3 py-5 text-center text-sm font-normal text-[#777777]">
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
      <div className="border border-[#D8D0C2] bg-[#FFFDF8] p-3 shadow-none dark:border-[#444444] dark:bg-[#2C2C2C]">
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
                        <span className="block truncate text-sm font-normal text-[#1F2937] dark:text-[#E4E4E4]">
                          {research.title}
                        </span>
                        <span className="block truncate text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
                          {[research.researchCode, research.stage]
                            .filter(Boolean)
                            .join(" - ")}
                        </span>
                      </span>
                      <Check className="mr-3 h-4 w-4 flex-none text-[#A8DADC]" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm font-normal text-slate-500 dark:text-[#B0B0B0]">
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
              className="inline-flex max-w-full items-center gap-2 border border-[#D8D0C2] bg-[#F8F6EF] px-2.5 py-1.5 text-xs font-normal text-[#1F2937] shadow-none dark:border-[#444444] dark:bg-[#242424] dark:text-[#E4E4E4]"
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
                className="research-allow-transform border-0 bg-transparent p-0.5 text-[#667085] transition hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-600 active:translate-y-0 active:scale-95 dark:text-[#B0B0B0] dark:hover:text-rose-300"
                aria-label={`Remove ${research.title}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          {selected.length === 0 && (
            <span className="inline-flex items-center gap-2 rounded-none border border-dashed border-[#D8D0C2] px-3 py-2 text-xs font-normal text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0]">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              No research selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
