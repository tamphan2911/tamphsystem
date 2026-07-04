"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  Mail,
  PlusCircle,
  Search,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { createResearchProject } from "../actions";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  ResearchButton,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchLabelClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  AssistantTeamPicker,
  type AssistantTeamOption,
  FundingInstitutionPicker,
  type FundingInstitutionOption,
} from "../organized-projects/ProjectFormControls";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import type { AuthorOption } from "./[id]/AuthorsPicker";
import { RegisterUserPicker } from "./RegisterUserPicker";

function authorName(author: AuthorOption) {
  return displayResearchPersonName(author);
}

function NewResearchAuthorsPicker({
  users,
  selectedAuthors,
  onChange,
}: {
  users: AuthorOption[];
  selectedAuthors: AuthorOption[];
  onChange: (authors: AuthorOption[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const selectedIds = useMemo(
    () => new Set(selectedAuthors.map((author) => author.id)),
    [selectedAuthors],
  );

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

  function addAuthor(user: AuthorOption) {
    onChange([...selectedAuthors, user]);
    setQuery("");
    setFocused(false);
  }

  function removeAuthor(userId: string) {
    onChange(selectedAuthors.filter((author) => author.id !== userId));
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-[#E4E4E4]">
      <span>
        Authors
        <span className="research-required-mark">(*)</span>
      </span>
      {selectedAuthors.map((author) => (
        <input
          key={author.id}
          type="hidden"
          name="authorUserIds"
          value={author.id}
        />
      ))}
      <input
        type="hidden"
        name="correspondingAuthorId"
        value={selectedAuthors[0]?.id ?? ""}
      />
      <div className="border border-[#444444] bg-[#2C2C2C] p-3 shadow-none">
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
                      onClick={() => addAuthor(user)}
                      className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
                    >
                      <span className="ml-3 inline-flex h-8 w-8 flex-none items-center justify-center rounded-none text-[#B0B0B0]">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-normal text-[#E4E4E4]">
                          {authorName(user)}
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
                      <Check
                        className="mr-3 h-4 w-4 flex-none text-[#A8DADC]"
                        aria-hidden="true"
                      />
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

        <div className="mt-3 divide-y divide-[#e2d9cc] border-y border-[#e2d9cc] dark:divide-[#444444] dark:border-[#444444]">
          {selectedAuthors.map((author, index) => (
            <div key={author.id} className="flex items-center gap-4 py-3">
              <span className="inline-flex h-10 w-8 flex-none items-center justify-center text-[#A8DADC]">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-normal text-[#E4E4E4]">
                    {authorName(author)}
                    {index === 0 ? "*" : ""}
                  </p>
                  <span className="border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#B0B0B0]">
                    {index === 0 ? "First author" : "Author"}
                  </span>
                </div>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-normal text-[#B0B0B0]">
                  <Mail
                    className="h-3 w-3 flex-none text-[#A8DADC]"
                    aria-hidden="true"
                  />
                  {displayResearchEmail(author.email)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAuthor(author.id)}
                aria-label={`Remove ${authorName(author)}`}
                className="cursor-pointer border-0 bg-transparent p-2 text-[#B0B0B0] transition hover:text-rose-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {selectedAuthors.length === 0 && (
            <div className="px-3 py-5 text-center text-sm font-normal text-[#B0B0B0]">
              Search and choose at least one author.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PriorityResearchCheckbox({
  defaultChecked = false,
}: {
  defaultChecked?: boolean;
}) {
  return (
    <label className="group flex h-12 cursor-pointer items-center gap-3 border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 transition duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:translate-y-0 active:scale-[0.985] dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white">
      <input
        type="checkbox"
        name="isPriority"
        value="true"
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="flex h-5 w-5 flex-none items-center justify-center border border-slate-300 bg-white text-transparent transition peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700 group-hover:border-slate-400 dark:border-[#666666] dark:bg-[#202020] dark:peer-checked:border-amber-300 dark:peer-checked:bg-amber-950/35 dark:peer-checked:text-amber-300">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <Star
        className="h-4 w-4 flex-none text-slate-400 transition peer-checked:text-amber-700 dark:text-[#777777] dark:peer-checked:text-amber-300"
        aria-hidden="true"
      />
      <span className="whitespace-nowrap text-slate-700 transition group-hover:text-slate-950 peer-checked:text-amber-800 dark:text-[#E4E4E4] dark:group-hover:text-white dark:peer-checked:text-amber-200">
        Priority
      </span>
    </label>
  );
}

export function NewResearchDialog({
  users,
  isAdmin,
  fundingInstitutions,
  assistantTeams = [],
}: {
  users: AuthorOption[];
  isAdmin: boolean;
  fundingInstitutions: FundingInstitutionOption[];
  assistantTeams?: AssistantTeamOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [registerStatus, setRegisterStatus] = useState("NOT_REGISTERED");
  const [selectedAuthors, setSelectedAuthors] = useState<AuthorOption[]>([]);
  const [warning, setWarning] = useState("");
  const warningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!warning) return;
    window.setTimeout(() => {
      warningRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }, [warning]);

  function closeDialog() {
    setIsOpen(false);
    setRegisterStatus("NOT_REGISTERED");
    setSelectedAuthors([]);
    setWarning("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      event.preventDefault();
      setWarning("Research title is required.");
      return;
    }

    if (selectedAuthors.length === 0) {
      event.preventDefault();
      setWarning("Choose at least one author before creating research.");
      return;
    }

    setWarning("");
  }

  return (
    <>
      <ResearchButton
        type="button"
        onClick={() => setIsOpen(true)}
        className="research-new-button"
      >
        <PlusCircle className="h-4 w-4" />
        New Research
      </ResearchButton>

      <ResearchModal
        open={isOpen}
        onClose={closeDialog}
        title="Add New Research"
        icon={<PlusCircle className="h-5 w-5" />}
        headerActions={
          <ResearchButton form="new-research-form">
            <PlusCircle className="h-4 w-4" />
            Add Research
          </ResearchButton>
        }
      >
        <form
          id="new-research-form"
          action={createResearchProject}
          onSubmit={handleSubmit}
          className="grid gap-5"
        >
          {warning && (
            <div
              ref={warningRef}
              className="flex items-start gap-3 rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
              {warning}
            </div>
          )}

          <section className="grid gap-4">
            <label className={researchLabelClass}>
              <span>
                Title
                <span className="research-required-mark">(*)</span>
              </span>
              <input
                name="title"
                placeholder="Research title"
                className={researchFieldClass}
              />
            </label>
            <label className={researchLabelClass}>
              Shared research folder
              <input
                name="sharedFolderUrl"
                type="url"
                placeholder="Paste the shared Google Drive folder link..."
                className={researchFieldClass}
              />
            </label>
            <NewResearchAuthorsPicker
              users={users}
              selectedAuthors={selectedAuthors}
              onChange={(authors) => {
                setSelectedAuthors(authors);
                if (authors.length > 0 && warning.includes("author")) {
                  setWarning("");
                }
              }}
            />
          </section>

          {isAdmin && (
            <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
              <h3 className="mb-4 text-base font-bold text-[#E4E4E4]">
                Registration
              </h3>
              <div className="grid items-end gap-4 lg:grid-cols-3">
                <label className={researchLabelClass}>
                  Register
                  <ResearchFormSelect
                    name="registerStatus"
                    defaultValue={registerStatus}
                    onValueChange={setRegisterStatus}
                    ariaLabel="Registration status"
                    triggerClassName="dark:!border-[#5A5A5A] dark:hover:!border-[#6A6A6A] dark:focus:!border-[#A8DADC]"
                    options={[
                      { value: "NOT_REGISTERED", label: "Not registered" },
                      { value: "PREPARING", label: "Plan" },
                      { value: "SUBMITTED", label: "Submitted" },
                      { value: "APPROVED", label: "Approved" },
                    ]}
                  />
                </label>
                {registerStatus !== "NOT_REGISTERED" && (
                  <>
                    <label className={researchLabelClass}>
                      Registration period
                      <input
                        name="universityRegistration"
                        placeholder="Q2 2026"
                        className={researchSearchFieldClass}
                      />
                    </label>
                    <RegisterUserPicker users={users} />
                  </>
                )}
              </div>
              <div className="mt-4 grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
                <FundingInstitutionPicker
                  institutions={fundingInstitutions}
                  defaultInstitution={null}
                />
                <PriorityResearchCheckbox />
              </div>
              <div className="mt-4">
                <AssistantTeamPicker
                  teams={assistantTeams}
                  defaultTeam={null}
                />
              </div>
            </section>
          )}

          <label className={researchLabelClass}>
            Notes
            <textarea
              name="abstract"
              placeholder="Idea, data, model, writing, humanizing, references..."
              className={researchTextareaClass}
            />
          </label>
        </form>
      </ResearchModal>
    </>
  );
}
