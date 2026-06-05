"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  CalendarClock,
  Check,
  ClipboardList,
  FileText,
  PlusCircle,
  Search,
  Send,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { createResearchTask } from "../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";

export type TaskAssigneeOption = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export type TaskResearchOption = {
  id: string;
  title: string;
  code: string;
  stage: string;
};

export type TaskVenueOption = {
  kind: "journal" | "conference";
  id: string;
  name: string;
  meta: string;
};

export type TaskAccountOption = {
  id: string;
  journalId: string;
  username: string;
  email: string;
};

export type TaskReviewOption = {
  id: string;
  title: string;
  journal: string;
  status: string;
};

export type TaskOrganizedProjectOption = {
  id: string;
  title: string;
  code: string;
  status: string;
};

type TaskMode = "submit" | "production" | "review" | "project" | "other";
type ProjectTaskSubtype = "PROJECT_PRODUCTION" | "PROJECT_RESEARCH_ASSOCIATED";
type SearchPanelItem = {
  id: string;
  title: string;
  meta: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
};

const inputClass = researchFieldClass;
const finishedResearchStages = new Set(["ACCEPTED", "PUBLISHED"]);
const closedReviewStatuses = new Set(["SUBMITTED", "DECLINED", "CANCELLED"]);
const closedProjectStatuses = new Set(["COMPLETED"]);

function modeLabel(mode: TaskMode) {
  if (mode === "submit") return "Submit";
  if (mode === "production") return "Production";
  if (mode === "review") return "Review";
  if (mode === "project") return "Project";
  return "Other";
}

function researchMatchesMode(project: TaskResearchOption, mode: TaskMode) {
  if (mode === "submit") return !finishedResearchStages.has(project.stage);
  if (mode === "production") return project.stage === "PRODUCTION";
  return true;
}

export function NewTaskDialog({
  assignees,
  researchOptions,
  venueOptions,
  accountOptions,
  reviewOptions,
  organizedProjectOptions,
}: {
  assignees: TaskAssigneeOption[];
  researchOptions: TaskResearchOption[];
  venueOptions: TaskVenueOption[];
  accountOptions: TaskAccountOption[];
  reviewOptions: TaskReviewOption[];
  organizedProjectOptions: TaskOrganizedProjectOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TaskMode>("submit");
  const [projectSubtype, setProjectSubtype] =
    useState<ProjectTaskSubtype>("PROJECT_PRODUCTION");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [organizedProjectQuery, setOrganizedProjectQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedResearch, setSelectedResearch] =
    useState<TaskResearchOption | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<TaskVenueOption | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedReview, setSelectedReview] = useState<TaskReviewOption | null>(
    null,
  );
  const [selectedOrganizedProject, setSelectedOrganizedProject] =
    useState<TaskOrganizedProjectOption | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showSuccess, showError } = useResearchToast();

  const filteredAssignees = useMemo(() => {
    const needle = assigneeQuery.trim().toLowerCase();
    if (!needle) return [];
    return assignees
      .filter((user) => {
        return [user.name, user.email, user.id, ...user.roles]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 12);
  }, [assigneeQuery, assignees]);

  const filteredResearch = useMemo(() => {
    const needle = researchQuery.trim().toLowerCase();
    if (!needle) return [];
    return researchOptions
      .filter((project) => {
        if (!researchMatchesMode(project, mode)) return false;
        return [project.title, project.code, project.stage, project.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [mode, researchOptions, researchQuery]);

  const filteredVenues = useMemo(() => {
    const needle = venueQuery.trim().toLowerCase();
    if (!needle) return [];
    return venueOptions
      .filter((venue) => {
        return [venue.name, venue.meta, venue.kind, venue.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [venueOptions, venueQuery]);

  const journalAccounts = useMemo(() => {
    if (selectedVenue?.kind !== "journal") return [];
    return accountOptions.filter(
      (account) => account.journalId === selectedVenue.id,
    );
  }, [accountOptions, selectedVenue]);

  const filteredAccounts = useMemo(() => {
    const needle = accountQuery.trim().toLowerCase();
    if (!needle) return [];
    return journalAccounts
      .filter((account) =>
        [account.username, account.email, account.id]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 10);
  }, [accountQuery, journalAccounts]);

  const selectedAccount =
    selectedVenue?.kind === "journal"
      ? journalAccounts.find((account) => account.id === selectedAccountId)
      : null;

  useEffect(() => {
    if (selectedVenue?.kind !== "journal") {
      setSelectedAccountId("");
      setAccountQuery("");
      return;
    }
    const onlyAccount = journalAccounts[0];
    if (journalAccounts.length === 1 && onlyAccount) {
      setSelectedAccountId(onlyAccount.id);
      setAccountQuery("");
      return;
    }
    if (
      selectedAccountId &&
      !journalAccounts.some((account) => account.id === selectedAccountId)
    ) {
      setSelectedAccountId("");
      setAccountQuery("");
    }
  }, [journalAccounts, selectedAccountId, selectedVenue]);

  const filteredReviews = useMemo(() => {
    const needle = reviewQuery.trim().toLowerCase();
    if (!needle) return [];
    return reviewOptions
      .filter((review) => {
        if (closedReviewStatuses.has(review.status)) return false;
        return [review.title, review.journal, review.status, review.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [reviewOptions, reviewQuery]);

  const filteredOrganizedProjects = useMemo(() => {
    const needle = organizedProjectQuery.trim().toLowerCase();
    if (!needle) return [];
    return organizedProjectOptions
      .filter((project) => {
        if (closedProjectStatuses.has(project.status)) return false;
        return [project.title, project.code, project.status, project.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [organizedProjectOptions, organizedProjectQuery]);

  function reset() {
    setMode("submit");
    setProjectSubtype("PROJECT_PRODUCTION");
    setAssigneeQuery("");
    setResearchQuery("");
    setVenueQuery("");
    setAccountQuery("");
    setReviewQuery("");
    setOrganizedProjectQuery("");
    setSelectedIds([]);
    setSelectedResearch(null);
    setSelectedVenue(null);
    setSelectedAccountId("");
    setSelectedReview(null);
    setSelectedOrganizedProject(null);
  }

  function toggleAssignee(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setAssigneeQuery("");
  }

  function selectResearch(project: TaskResearchOption) {
    setSelectedResearch(project);
    setResearchQuery("");
  }

  function selectVenue(venue: TaskVenueOption) {
    setSelectedVenue(venue);
    setVenueQuery("");
    setSelectedAccountId("");
    setAccountQuery("");
  }

  function selectReview(review: TaskReviewOption) {
    setSelectedReview(review);
    setReviewQuery("");
  }

  function selectOrganizedProject(project: TaskOrganizedProjectOption) {
    setSelectedOrganizedProject(project);
    setOrganizedProjectQuery("");
  }

  function selectAccount(account: TaskAccountOption) {
    setSelectedAccountId(account.id);
    setAccountQuery("");
  }

  function submitTask(formData: FormData) {
    startTransition(async () => {
      const result = await createResearchTask(formData);
      if (!result?.ok) {
        showError({
          title: "Task was not created",
          detail:
            result?.reason === "PRODUCTION_INCOMPLETE"
              ? "Complete the production timeline before assigning a submission task."
              : result?.reason === "MISSING_ASSOCIATION"
                ? "Choose the required research, venue, review, or project before creating this task."
                : result?.reason === "RESEARCH_ALREADY_FINISHED"
                  ? "Choose research that is not accepted or published yet."
                  : result?.reason === "RESEARCH_PRODUCTION_COMPLETE"
                    ? "Choose research that has not finished the production timeline."
                    : result?.reason === "REVIEW_CLOSED"
                      ? "Choose a review that is not submitted, declined, or cancelled."
                      : result?.reason === "PROJECT_CLOSED"
                        ? "Choose a project that is not completed."
                        : result?.reason === "INACTIVE_RESEARCH_ASSIGNEE"
                          ? "Choose only users who have activated their research-site account."
                          : result?.reason === "ACTIVE_SUBMISSION_TASK_EXISTS"
                            ? "An active submission task already exists for this research and venue."
                            : result?.reason === "ACCOUNT_NOT_FOR_JOURNAL"
                              ? "Choose an account that belongs to the selected journal."
                              : "Please check the task details and try again.",
        });
        return;
      }
      showSuccess({
        title: "Task created",
        detail: `${modeLabel(mode)} task assigned to ${selectedIds.length} user${selectedIds.length === 1 ? "" : "s"}.`,
      });
      reset();
      setIsOpen(false);
    });
  }

  const needsResearch = mode === "submit" || mode === "production";
  const selectedResearchMatchesMode =
    !needsResearch ||
    (selectedResearch ? researchMatchesMode(selectedResearch, mode) : false);
  const needsVenue = mode === "submit";
  const needsJournalAccount = selectedVenue?.kind === "journal";
  const needsReview = mode === "review";
  const selectedReviewIsOpen =
    !needsReview ||
    (selectedReview ? !closedReviewStatuses.has(selectedReview.status) : false);
  const needsOrganizedProject = mode === "project";
  const selectedOrganizedProjectIsOpen =
    !needsOrganizedProject ||
    (selectedOrganizedProject
      ? !closedProjectStatuses.has(selectedOrganizedProject.status)
      : false);
  const canSubmit =
    selectedIds.length > 0 &&
    selectedResearchMatchesMode &&
    (!needsVenue || Boolean(selectedVenue)) &&
    (!needsJournalAccount || Boolean(selectedAccountId)) &&
    selectedReviewIsOpen &&
    selectedOrganizedProjectIsOpen;
  const selectedAssigneeItems: SearchPanelItem[] = assignees
    .filter((user) => selectedIds.includes(user.id))
    .map((user) => ({
      id: user.id,
      title: user.name || user.email,
      meta: `${user.email} - ${user.roles.join(", ")}`,
      icon: <UserRound className="h-4 w-4" />,
      selected: true,
      onClick: () => toggleAssignee(user.id),
    }));

  return (
    <>
      <ResearchButton type="button" onClick={() => setIsOpen(true)}>
        <PlusCircle className="h-4 w-4" />
        New Task
      </ResearchButton>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Assign Task"
        description="Create submit, production, review, or general research work."
        icon={<ClipboardList className="h-5 w-5" />}
        maxWidth="max-w-5xl"
      >
        <form action={submitTask} className="grid gap-5">
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="assigneeIds" value={id} />
          ))}
          {selectedResearch && (
            <input type="hidden" name="projectId" value={selectedResearch.id} />
          )}
          {selectedVenue?.kind === "journal" && (
            <>
              <input type="hidden" name="taskType" value="SUBMIT_RESEARCH" />
              <input type="hidden" name="journalId" value={selectedVenue.id} />
              {selectedAccountId && (
                <input
                  type="hidden"
                  name="accountId"
                  value={selectedAccountId}
                />
              )}
              <input type="hidden" name="category" value="Submit research" />
            </>
          )}
          {selectedVenue?.kind === "conference" && (
            <>
              <input type="hidden" name="taskType" value="SUBMIT_CONFERENCE" />
              <input
                type="hidden"
                name="conferenceId"
                value={selectedVenue.id}
              />
              <input type="hidden" name="category" value="Submit research" />
            </>
          )}
          {mode === "production" && (
            <>
              <input type="hidden" name="taskType" value="PRODUCTION" />
              <input type="hidden" name="category" value="Production" />
            </>
          )}
          {mode === "review" && selectedReview && (
            <>
              <input type="hidden" name="taskType" value="REVIEW" />
              <input type="hidden" name="reviewId" value={selectedReview.id} />
            </>
          )}
          {mode === "project" && selectedOrganizedProject && (
            <>
              <input type="hidden" name="taskType" value={projectSubtype} />
              <input
                type="hidden"
                name="organizedProjectId"
                value={selectedOrganizedProject.id}
              />
              <input
                type="hidden"
                name="category"
                value={
                  projectSubtype === "PROJECT_PRODUCTION"
                    ? "Production"
                    : "Research production"
                }
              />
            </>
          )}
          {mode === "other" && (
            <input type="hidden" name="taskType" value="OTHER" />
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Task title
              </span>
              <input
                name="title"
                required
                placeholder="Task title"
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Due date
              </span>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="dueDate"
                  type="date"
                  className={`${inputClass} w-full pl-9`}
                />
              </div>
            </label>
          </div>

          <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
            {(
              ["submit", "production", "review", "project", "other"] as const
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${
                  mode === item
                    ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {modeLabel(item)}
              </button>
            ))}
          </div>

          {needsResearch && (
            <SearchPanel
              title="Research"
              query={researchQuery}
              setQuery={setResearchQuery}
              placeholder="Search research by title, ID, or stage..."
              selectedItems={
                selectedResearch
                  ? [
                      {
                        id: selectedResearch.id,
                        title: selectedResearch.title,
                        meta: [selectedResearch.code, selectedResearch.stage]
                          .filter(Boolean)
                          .join(" - "),
                        icon: <FileText className="h-4 w-4" />,
                        selected: true,
                        onClick: () => {
                          setSelectedResearch(null);
                          setResearchQuery("");
                        },
                      },
                    ]
                  : []
              }
              items={filteredResearch.map((project) => ({
                id: project.id,
                title: project.title,
                meta: [project.code, project.stage].filter(Boolean).join(" - "),
                icon: <FileText className="h-4 w-4" />,
                selected: selectedResearch?.id === project.id,
                onClick: () => selectResearch(project),
              }))}
            />
          )}

          {needsVenue && (
            <SearchPanel
              title="Journal or conference"
              query={venueQuery}
              setQuery={setVenueQuery}
              placeholder="Search journal or conference..."
              selectedItems={
                selectedVenue
                  ? [
                      {
                        id: `${selectedVenue.kind}-${selectedVenue.id}`,
                        title: selectedVenue.name,
                        meta: `${selectedVenue.kind} - ${selectedVenue.meta}`,
                        icon: <Send className="h-4 w-4" />,
                        selected: true,
                        onClick: () => {
                          setSelectedVenue(null);
                          setVenueQuery("");
                          setSelectedAccountId("");
                          setAccountQuery("");
                        },
                      },
                    ]
                  : []
              }
              items={filteredVenues.map((venue) => ({
                id: `${venue.kind}-${venue.id}`,
                title: venue.name,
                meta: `${venue.kind} - ${venue.meta}`,
                icon: <Send className="h-4 w-4" />,
                selected:
                  selectedVenue?.kind === venue.kind &&
                  selectedVenue?.id === venue.id,
                onClick: () => selectVenue(venue),
              }))}
            />
          )}

          {selectedVenue?.kind === "journal" && (
            <JournalAccountField
              accounts={journalAccounts}
              query={accountQuery}
              setQuery={setAccountQuery}
              selectedAccount={selectedAccount}
              filteredAccounts={filteredAccounts}
              selectAccount={selectAccount}
              clearAccount={() => {
                setSelectedAccountId("");
                setAccountQuery("");
              }}
            />
          )}

          {needsReview && (
            <SearchPanel
              title="Academic review"
              query={reviewQuery}
              setQuery={setReviewQuery}
              placeholder="Search review by manuscript, journal, or status..."
              selectedItems={
                selectedReview
                  ? [
                      {
                        id: selectedReview.id,
                        title: selectedReview.title,
                        meta: `${selectedReview.journal} - ${selectedReview.status}`,
                        icon: <Star className="h-4 w-4" />,
                        selected: true,
                        onClick: () => {
                          setSelectedReview(null);
                          setReviewQuery("");
                        },
                      },
                    ]
                  : []
              }
              items={filteredReviews.map((review) => ({
                id: review.id,
                title: review.title,
                meta: `${review.journal} - ${review.status}`,
                icon: <Star className="h-4 w-4" />,
                selected: selectedReview?.id === review.id,
                onClick: () => selectReview(review),
              }))}
            />
          )}

          {needsOrganizedProject && (
            <div className="grid gap-4">
              <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {(
                  [
                    ["PROJECT_PRODUCTION", "Project Production"],
                    ["PROJECT_RESEARCH_ASSOCIATED", "Research Associated"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProjectSubtype(value)}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${
                      projectSubtype === value
                        ? "bg-white text-violet-700 shadow-sm dark:bg-slate-800 dark:text-violet-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SearchPanel
                title="Project"
                query={organizedProjectQuery}
                setQuery={setOrganizedProjectQuery}
                placeholder="Search project by title, ID, or status..."
                selectedItems={
                  selectedOrganizedProject
                    ? [
                        {
                          id: selectedOrganizedProject.id,
                          title: selectedOrganizedProject.title,
                          meta: [
                            selectedOrganizedProject.code,
                            selectedOrganizedProject.status,
                          ]
                            .filter(Boolean)
                            .join(" - "),
                          icon: <FileText className="h-4 w-4" />,
                          selected: true,
                          onClick: () => {
                            setSelectedOrganizedProject(null);
                            setOrganizedProjectQuery("");
                          },
                        },
                      ]
                    : []
                }
                items={filteredOrganizedProjects.map((project) => ({
                  id: project.id,
                  title: project.title,
                  meta: [project.code, project.status]
                    .filter(Boolean)
                    .join(" - "),
                  icon: <FileText className="h-4 w-4" />,
                  selected: selectedOrganizedProject?.id === project.id,
                  onClick: () => selectOrganizedProject(project),
                }))}
              />
            </div>
          )}

          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              placeholder="Add instructions, expected output, files, or notes..."
              className={researchTextareaClass}
            />
          </label>

          <SearchPanel
            title="Assign to"
            query={assigneeQuery}
            setQuery={setAssigneeQuery}
            placeholder="Search active research users by name, email, ID, or role..."
            selectedItems={selectedAssigneeItems}
            items={filteredAssignees.map((user) => ({
              id: user.id,
              title: user.name || user.email,
              meta: `${user.email} - ${user.roles.join(", ")}`,
              icon: <UserRound className="h-4 w-4" />,
              selected: selectedIds.includes(user.id),
              onClick: () => toggleAssignee(user.id),
            }))}
          />

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <ResearchButton
              type="button"
              onClick={() => setIsOpen(false)}
              tone="secondary"
            >
              Cancel
            </ResearchButton>
            <ResearchButton disabled={!canSubmit || isPending}>
              <PlusCircle className="h-4 w-4" />
              Assign Task
            </ResearchButton>
          </div>
        </form>
      </ResearchModal>
    </>
  );
}

function JournalAccountField({
  accounts,
  query,
  setQuery,
  selectedAccount,
  filteredAccounts,
  selectAccount,
  clearAccount,
}: {
  accounts: TaskAccountOption[];
  query: string;
  setQuery: (value: string) => void;
  selectedAccount: TaskAccountOption | null | undefined;
  filteredAccounts: TaskAccountOption[];
  selectAccount: (account: TaskAccountOption) => void;
  clearAccount: () => void;
}) {
  if (accounts.length === 0) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
        No account is linked to this journal yet. Add a journal account before
        assigning a journal submission task.
      </section>
    );
  }

  const onlyAccount = accounts[0];
  if (accounts.length === 1 && onlyAccount) {
    const account = onlyAccount;
    return (
      <section className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
        <span className="text-xs font-bold uppercase tracking-wide">
          Account to submit
        </span>
        <span className="font-semibold">
          {account.username}
          {account.email ? ` - ${account.email}` : ""}
        </span>
      </section>
    );
  }

  return (
    <SearchPanel
      title="Account to submit"
      query={query}
      setQuery={setQuery}
      placeholder="Search accounts for this journal..."
      selectedItems={
        selectedAccount
          ? [
              {
                id: selectedAccount.id,
                title: selectedAccount.username,
                meta: selectedAccount.email || "No email",
                icon: <Send className="h-4 w-4" />,
                selected: true,
                onClick: clearAccount,
              },
            ]
          : []
      }
      items={filteredAccounts.map((account) => ({
        id: account.id,
        title: account.username,
        meta: account.email || "No email",
        icon: <Send className="h-4 w-4" />,
        selected: selectedAccount?.id === account.id,
        onClick: () => selectAccount(account),
      }))}
    />
  );
}

function SearchPanel({
  title,
  query,
  setQuery,
  placeholder,
  selectedItems = [],
  items,
}: {
  title: string;
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  selectedItems?: SearchPanelItem[];
  items: SearchPanelItem[];
}) {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const showDropdown = focused && query.trim().length > 0;
  return (
    <section className="grid gap-3">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </span>
      {selectedItems.length > 0 && (
        <div className="grid gap-2">
          {selectedItems.map((item) => (
            <SelectedSearchItem key={item.id} item={item} />
          ))}
        </div>
      )}
      <div ref={wrapperRef} className="relative z-30">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          className={`${inputClass} w-full pl-9`}
        />

        <FloatingDropdownPortal
          anchorRef={wrapperRef}
          open={showDropdown}
          maxWidth={640}
        >
          <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto rounded-none border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/35">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={item.onClick}
                className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                  item.selected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex-none text-slate-400">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-5">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.meta}
                    </span>
                  </span>
                </span>
                {item.selected && (
                  <Check className="mt-0.5 h-4 w-4 flex-none" />
                )}
              </button>
            ))}
            {items.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No result matches this search.
              </div>
            )}
          </div>
        </FloatingDropdownPortal>
      </div>
    </section>
  );
}

function SelectedSearchItem({ item }: { item: SearchPanelItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex-none text-emerald-500">{item.icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-5">
            {item.title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-emerald-700/80 dark:text-emerald-200/80">
            {item.meta}
          </span>
        </span>
      </span>
      <X className="mt-0.5 h-4 w-4 flex-none" />
    </button>
  );
}
