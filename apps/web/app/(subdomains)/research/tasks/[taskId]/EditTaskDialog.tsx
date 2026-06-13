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
  Check,
  ClipboardList,
  Edit3,
  FileText,
  Save,
  Search,
  Send,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { updateResearchTask } from "../../actions";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  ResearchButton,
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchSearchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import type {
  TaskAssigneeOption,
  TaskAccountOption,
  TaskOrganizedProjectOption,
  TaskResearchOption,
  TaskReviewOption,
  TaskVenueOption,
} from "../NewTaskDialog";

type TaskMode = "submit" | "production" | "review" | "project" | "other";
type ProjectTaskSubtype = "PROJECT_PRODUCTION" | "PROJECT_RESEARCH_ASSOCIATED";

type EditableTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  taskType: string;
  projectId: string;
  journalId: string;
  conferenceId: string;
  reviewId: string;
  organizedProjectId: string;
  accountId: string;
  assigneeIds: string[];
};

type SearchPanelItem = {
  id: string;
  title: string;
  meta: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
};

const inputClass =
  "border border-[#444444] bg-[#2C2C2C] px-3 py-2.5 text-sm text-[#E4E4E4] outline-none transition placeholder:text-[#5A5A5A] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838]";
const dateInputClass = researchFieldClass;
const finishedResearchStages = new Set(["ACCEPTED", "PUBLISHED"]);
const closedReviewStatuses = new Set(["SUBMITTED", "DECLINED", "CANCELLED"]);
const closedProjectStatuses = new Set(["COMPLETED"]);

function modeFromTaskType(taskType: string): TaskMode {
  if (taskType === "SUBMIT_RESEARCH" || taskType === "SUBMIT_CONFERENCE") {
    return "submit";
  }
  if (taskType === "PRODUCTION") return "production";
  if (taskType === "REVIEW") return "review";
  if (
    taskType === "PROJECT_PRODUCTION" ||
    taskType === "PROJECT_RESEARCH_ASSOCIATED"
  ) {
    return "project";
  }
  return "other";
}

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

function detailForFailure(reason?: string) {
  if (reason === "PRODUCTION_INCOMPLETE") {
    return "Complete the production timeline before assigning a submission task.";
  }
  if (reason === "MISSING_ASSOCIATION") {
    return "Choose the required research, venue, review, or project before saving this task.";
  }
  if (reason === "RESEARCH_ALREADY_FINISHED") {
    return "Choose research that is not accepted or published yet.";
  }
  if (reason === "RESEARCH_PRODUCTION_COMPLETE") {
    return "Choose research that has not finished the production timeline.";
  }
  if (reason === "REVIEW_CLOSED") {
    return "Choose a review that is not submitted, declined, or cancelled.";
  }
  if (reason === "PROJECT_CLOSED") {
    return "Choose a project that is not completed.";
  }
  if (reason === "INACTIVE_RESEARCH_ASSIGNEE") {
    return "Choose only users who have activated their research-site account.";
  }
  if (reason === "ACTIVE_SUBMISSION_TASK_EXISTS") {
    return "An active submission task already exists for this research and venue.";
  }
  if (reason === "ACCOUNT_NOT_FOR_JOURNAL") {
    return "Choose an account that belongs to the selected journal.";
  }
  if (reason === "TASK_CLOSED") {
    return "Completed or revoked tasks cannot be edited.";
  }
  return "Please check the task details and try again.";
}

export function EditTaskDialog({
  task,
  assignees,
  researchOptions,
  venueOptions,
  accountOptions,
  reviewOptions,
  organizedProjectOptions,
}: {
  task: EditableTask;
  assignees: TaskAssigneeOption[];
  researchOptions: TaskResearchOption[];
  venueOptions: TaskVenueOption[];
  accountOptions: TaskAccountOption[];
  reviewOptions: TaskReviewOption[];
  organizedProjectOptions: TaskOrganizedProjectOption[];
}) {
  const initialMode = modeFromTaskType(task.taskType);
  const initialResearch =
    researchOptions.find((option) => option.id === task.projectId) ?? null;
  const initialVenue =
    venueOptions.find(
      (option) =>
        (option.kind === "journal" && option.id === task.journalId) ||
        (option.kind === "conference" && option.id === task.conferenceId),
    ) ?? null;
  const initialReview =
    reviewOptions.find((option) => option.id === task.reviewId) ?? null;
  const initialOrganizedProject =
    organizedProjectOptions.find(
      (option) => option.id === task.organizedProjectId,
    ) ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TaskMode>(initialMode);
  const [projectSubtype, setProjectSubtype] = useState<ProjectTaskSubtype>(
    task.taskType === "PROJECT_RESEARCH_ASSOCIATED"
      ? "PROJECT_RESEARCH_ASSOCIATED"
      : "PROJECT_PRODUCTION",
  );
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [organizedProjectQuery, setOrganizedProjectQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(task.assigneeIds);
  const [selectedResearch, setSelectedResearch] =
    useState<TaskResearchOption | null>(initialResearch);
  const [selectedVenue, setSelectedVenue] = useState<TaskVenueOption | null>(
    initialVenue,
  );
  const [selectedAccountId, setSelectedAccountId] = useState(task.accountId);
  const [selectedReview, setSelectedReview] = useState<TaskReviewOption | null>(
    initialReview,
  );
  const [selectedOrganizedProject, setSelectedOrganizedProject] =
    useState<TaskOrganizedProjectOption | null>(initialOrganizedProject);
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
    if (
      selectedAccountId &&
      !journalAccounts.some((account) => account.id === selectedAccountId)
    ) {
      setSelectedAccountId("");
      setAccountQuery("");
    }
  }, [journalAccounts, selectedAccountId, selectedVenue]);

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
      const result = await updateResearchTask(task.id, formData);
      if (!result?.ok) {
        showError({
          title: "Task was not saved",
          detail: detailForFailure(result?.reason),
        });
        return;
      }

      showSuccess({
        title: "Task updated",
        detail: "Task details and assignments were saved successfully.",
      });
      setIsOpen(false);
    });
  }

  const needsResearch = mode === "submit" || mode === "production";
  const selectedResearchMatchesMode =
    !needsResearch ||
    (selectedResearch ? researchMatchesMode(selectedResearch, mode) : false);
  const needsVenue = mode === "submit";
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
    selectedReviewIsOpen &&
    selectedOrganizedProjectIsOpen;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative inline-flex h-5 w-5 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] shadow-none transition hover:-translate-y-0.5 hover:text-[#A8DADC]"
        aria-label="Edit task"
      >
        <Edit3 className="h-4 w-4" />
        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap border border-[#555555] bg-[#202020] px-2.5 py-1.5 text-[11px] font-normal text-[#E4E4E4] opacity-0 shadow-xl shadow-black/30 transition group-hover:opacity-100">
          Edit task
        </span>
      </button>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit task"
        description="Update task details, association, due date, and assignees."
        icon={<ClipboardList className="h-5 w-5" />}
        maxWidth="max-w-5xl"
        headerActions={
          <ResearchButton
            form="edit-task-form"
            disabled={!canSubmit || isPending}
          >
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save changes"}
          </ResearchButton>
        }
      >
        <form id="edit-task-form" action={submitTask} className="grid gap-5">
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
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Task title
                <span className="research-required-mark">(*)</span>
              </span>
              <input
                name="title"
                required
                defaultValue={task.title}
                placeholder="Task title"
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Due date
              </span>
              <ResearchDatePicker
                name="dueDate"
                defaultValue={task.dueDate}
                className={dateInputClass}
              />
            </label>
          </div>

          <div
            data-research-toggle-tabs="true"
            className="grid w-full grid-cols-5 border border-[#444444] bg-[#202020]"
          >
            {(
              ["submit", "production", "review", "project", "other"] as const
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                data-research-toggle-tab="true"
                data-active={mode === item}
                className={`cursor-pointer border-r border-[#303030] px-3 py-2 text-sm font-normal transition last:border-r-0 hover:border-[#444444] ${
                  mode === item
                    ? "border-[#444444] bg-[#383838] text-[#A8DADC] shadow-none"
                    : "text-[#B0B0B0] hover:bg-[#303030] hover:text-[#E4E4E4]"
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
              <div
                data-research-toggle-tabs="true"
                className="grid w-full grid-cols-2 border border-[#444444] bg-[#202020]"
              >
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
                    data-research-toggle-tab="true"
                    data-active={projectSubtype === value}
                    className={`cursor-pointer border-r border-[#303030] px-3 py-2 text-sm font-normal transition last:border-r-0 hover:border-[#444444] ${
                      projectSubtype === value
                        ? "border-[#444444] bg-[#383838] text-[#A8DADC] shadow-none"
                        : "text-[#B0B0B0] hover:bg-[#303030] hover:text-[#E4E4E4]"
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
            <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={task.description}
              placeholder="Add instructions, expected output, files, or notes..."
              className={inputClass}
            />
          </label>

          <SearchPanel
            title="Assign to"
            query={assigneeQuery}
            setQuery={setAssigneeQuery}
            placeholder="Search active research users by name, email, ID, or role..."
            selectedItems={assignees
              .filter((user) => selectedIds.includes(user.id))
              .map((user) => ({
                id: user.id,
                title: displayResearchPersonName(user),
                meta: [displayResearchEmail(user.email), user.roles.join(", ")]
                  .filter(Boolean)
                  .join(" - "),
                icon: <UserRound className="h-4 w-4" />,
                selected: true,
                onClick: () => toggleAssignee(user.id),
              }))}
            items={filteredAssignees.map((user) => ({
              id: user.id,
              title: displayResearchPersonName(user),
              meta: [displayResearchEmail(user.email), user.roles.join(", ")]
                .filter(Boolean)
                .join(" - "),
              icon: <UserRound className="h-4 w-4" />,
              selected: selectedIds.includes(user.id),
              onClick: () => toggleAssignee(user.id),
            }))}
          />
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
      <section className="rounded-none border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        No account is linked to this journal yet. You can still keep this
        submission task assigned and add the account later.
      </section>
    );
  }

  return (
    <SearchPanel
      title="Account to submit (optional)"
      query={query}
      setQuery={setQuery}
      placeholder="Search accounts for this journal, or leave empty..."
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
      <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
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
          className={`${researchSearchFieldClass} pl-9`}
        />

        <FloatingDropdownPortal
          anchorRef={wrapperRef}
          open={showDropdown}
          maxWidth={640}
        >
          <div
            className={`${researchDropdownPanelClass} max-h-[var(--research-dropdown-max-height)] overflow-y-auto`}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={item.onClick}
                className={`${researchDropdownItemClass} cursor-pointer ${
                  item.selected
                    ? researchDropdownItemActiveClass
                    : researchDropdownItemIdleClass
                }`}
              >
                <span className="flex min-w-0 items-start gap-3 px-3">
                  <span className="mt-0.5 flex-none text-slate-400">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-normal leading-5">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-[#B0B0B0]">
                      {item.meta}
                    </span>
                  </span>
                </span>
                {item.selected && (
                  <Check className="mr-3 mt-0.5 h-4 w-4 flex-none" />
                )}
              </button>
            ))}
            {items.length === 0 && (
              <div className="py-8 text-center text-sm text-[#B0B0B0]">
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
      className="flex cursor-pointer items-start justify-between gap-3 rounded-none border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
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
