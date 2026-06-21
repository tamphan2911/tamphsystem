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
  ClipboardPlus,
  Database,
  FileUp,
  FileText,
  PlusCircle,
  Search,
  Send,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { createResearchTask } from "../actions";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { defaultSubmitTaskDescription } from "@/sites/research/lib/task-description";
import { defaultResearchTaskDueDate } from "@/sites/research/lib/task-date";

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

export type TaskSubmissionOption = {
  id: string;
  kind: "journal" | "conference";
  researchId: string;
  venueId: string;
  code: string;
  researchTitle: string;
  venueName: string;
  status: string;
};

export type TaskMode = "submit" | "production" | "review" | "project" | "other";
type TaskTriggerVariant = "default" | "other" | "production";
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
  return true;
}

export function NewTaskDialog({
  assignees,
  researchOptions,
  venueOptions,
  accountOptions,
  reviewOptions,
  organizedProjectOptions,
  submissionOptions = [],
  initialMode = "submit",
  initialResearch = null,
  initialTitle = "",
  triggerVariant = "default",
}: {
  assignees: TaskAssigneeOption[];
  researchOptions: TaskResearchOption[];
  venueOptions: TaskVenueOption[];
  accountOptions: TaskAccountOption[];
  reviewOptions: TaskReviewOption[];
  organizedProjectOptions: TaskOrganizedProjectOption[];
  submissionOptions?: TaskSubmissionOption[];
  initialMode?: TaskMode;
  initialResearch?: TaskResearchOption | null;
  initialTitle?: string;
  triggerVariant?: TaskTriggerVariant;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TaskMode>(initialMode);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [organizedProjectQuery, setOrganizedProjectQuery] = useState("");
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [dueDate, setDueDate] = useState(defaultResearchTaskDueDate);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedResearch, setSelectedResearch] =
    useState<TaskResearchOption | null>(initialResearch);
  const [selectedVenue, setSelectedVenue] = useState<TaskVenueOption | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedReview, setSelectedReview] = useState<TaskReviewOption | null>(
    null,
  );
  const [selectedOrganizedProject, setSelectedOrganizedProject] =
    useState<TaskOrganizedProjectOption | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<TaskSubmissionOption | null>(null);
  const [allowReportUpload, setAllowReportUpload] = useState(false);
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
        if (mode === "other" && venue.kind !== "journal") return false;
        return [venue.name, venue.meta, venue.kind, venue.id]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 10);
  }, [mode, venueOptions, venueQuery]);

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
  const submitAccountRequired =
    mode === "submit" &&
    selectedVenue?.kind === "journal" &&
    journalAccounts.length > 1;

  useEffect(() => {
    if (selectedVenue?.kind !== "journal") {
      setSelectedAccountId("");
      setAccountQuery("");
      return;
    }
    if (journalAccounts.length === 1) {
      setSelectedAccountId(journalAccounts[0]?.id ?? "");
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

  const filteredSubmissions = useMemo(() => {
    const needle = submissionQuery.trim().toLowerCase();
    if (!needle) return [];
    return submissionOptions
      .filter((submission) =>
        [
          submission.code,
          submission.researchTitle,
          submission.venueName,
          submission.status,
          submission.kind,
          submission.id,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 10);
  }, [submissionOptions, submissionQuery]);

  function reset() {
    setMode(initialMode);
    setAssigneeQuery("");
    setResearchQuery("");
    setVenueQuery("");
    setAccountQuery("");
    setReviewQuery("");
    setOrganizedProjectQuery("");
    setSubmissionQuery("");
    setDueDate(defaultResearchTaskDueDate());
    setSelectedIds([]);
    setSelectedResearch(initialResearch);
    setSelectedVenue(null);
    setSelectedAccountId("");
    setSelectedReview(null);
    setSelectedOrganizedProject(null);
    setSelectedSubmission(null);
    setAllowReportUpload(false);
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
    if (selectedSubmission?.researchId !== project.id) {
      setSelectedSubmission(null);
      setSubmissionQuery("");
    }
  }

  function selectVenue(venue: TaskVenueOption) {
    const venueAccounts =
      venue.kind === "journal"
        ? accountOptions.filter((account) => account.journalId === venue.id)
        : [];
    const singleAccount = venueAccounts.length === 1 ? venueAccounts[0] : null;
    setSelectedVenue(venue);
    setVenueQuery("");
    setSelectedAccountId(singleAccount?.id ?? "");
    setAccountQuery("");
    if (
      selectedSubmission &&
      (selectedSubmission.kind !== venue.kind ||
        selectedSubmission.venueId !== venue.id)
    ) {
      setSelectedSubmission(null);
      setSubmissionQuery("");
    }
  }

  function changeMode(nextMode: TaskMode) {
    setMode(nextMode);
    if (nextMode === "other" && selectedVenue?.kind === "conference") {
      setSelectedVenue(null);
      setVenueQuery("");
      setSelectedAccountId("");
      setAccountQuery("");
    }
    if (nextMode !== "other") {
      setSelectedSubmission(null);
      setSubmissionQuery("");
    }
  }

  function selectSubmission(submission: TaskSubmissionOption) {
    setSelectedSubmission(submission);
    setSubmissionQuery("");
    setSelectedResearch(
      researchOptions.find((option) => option.id === submission.researchId) ??
        null,
    );
    setResearchQuery("");
    setSelectedVenue(
      venueOptions.find(
        (option) =>
          option.kind === submission.kind && option.id === submission.venueId,
      ) ?? null,
    );
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
                              : result?.reason === "ACCOUNT_REQUIRED"
                                ? "Choose the journal account for this submission task."
                                : result?.reason === "TASK_FILE_TOO_LARGE"
                                  ? "Task file must be 2 MB or smaller."
                                  : result?.reason === "TASK_FILE_REJECTED"
                                    ? "Upload the task file as PDF, DOC, DOCX, or XLSX."
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
  const showsResearch = needsResearch || mode === "other";
  const fixedResearch = triggerVariant !== "default" && initialResearch;
  const selectedResearchMatchesMode =
    !needsResearch ||
    (selectedResearch ? researchMatchesMode(selectedResearch, mode) : false);
  const showsVenue =
    mode === "submit" || (mode === "other" && triggerVariant === "default");
  const needsVenue = mode === "submit";
  const selectedVenueMatchesMode = !needsVenue || Boolean(selectedVenue);
  const needsReview = mode === "review";
  const selectedReviewIsOpen =
    !needsReview ||
    (selectedReview ? !closedReviewStatuses.has(selectedReview.status) : false);
  const showsOrganizedProject = mode === "project";
  const selectedOrganizedProjectIsOpen =
    !showsOrganizedProject ||
    !selectedOrganizedProject ||
    (selectedOrganizedProject
      ? !closedProjectStatuses.has(selectedOrganizedProject.status)
      : false);
  const canSubmit =
    selectedIds.length > 0 &&
    selectedResearchMatchesMode &&
    selectedVenueMatchesMode &&
    (!submitAccountRequired || Boolean(selectedAccountId)) &&
    selectedReviewIsOpen &&
    selectedOrganizedProjectIsOpen;
  const selectedAssigneeItems: SearchPanelItem[] = assignees
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
    }));

  return (
    <>
      {triggerVariant === "default" ? (
        <ResearchButton type="button" onClick={() => setIsOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          New Task
        </ResearchButton>
      ) : (
        <IconHint
          label={
            triggerVariant === "production"
              ? "Create production task"
              : "Create other task"
          }
          position="bottom"
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`research-allow-transform inline-flex h-5 w-5 flex-none cursor-pointer items-center justify-center border-0 bg-transparent shadow-none transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 active:translate-y-0 active:scale-90 ${
              triggerVariant === "production"
                ? "text-[#B85C78] hover:text-[#8F3E59] dark:text-[#FFC1CC] dark:hover:text-[#FFD7DF]"
                : "text-[#70549B] hover:text-[#563B7E] dark:text-[#B39CD0] dark:hover:text-[#D0BCE5]"
            }`}
            aria-label={
              triggerVariant === "production"
                ? "Create production task"
                : "Create other task"
            }
          >
            <ClipboardPlus className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </IconHint>
      )}

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          triggerVariant === "production"
            ? "Create Production Task"
            : triggerVariant === "other"
              ? "Create Other Task"
              : "Assign Task"
        }
        icon={<ClipboardList className="h-5 w-5" />}
        maxWidth="max-w-5xl"
        headerActions={
          <ResearchButton
            form="new-task-form"
            disabled={!canSubmit || isPending}
          >
            <PlusCircle className="h-4 w-4" />
            {triggerVariant === "default" ? "Assign Task" : "Create Task"}
          </ResearchButton>
        }
      >
        <form id="new-task-form" action={submitTask} className="grid gap-5">
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="assigneeIds" value={id} />
          ))}
          <input
            type="hidden"
            name="allowAssigneeReportUpload"
            value={allowReportUpload ? "true" : "false"}
          />
          {selectedResearch && (
            <input type="hidden" name="projectId" value={selectedResearch.id} />
          )}
          {mode === "submit" && selectedVenue?.kind === "journal" && (
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
          {mode === "submit" && selectedVenue?.kind === "conference" && (
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
          {mode === "project" && (
            <>
              <input type="hidden" name="taskType" value="PROJECT_PRODUCTION" />
              {selectedOrganizedProject && (
                <input
                  type="hidden"
                  name="organizedProjectId"
                  value={selectedOrganizedProject.id}
                />
              )}
              <input type="hidden" name="category" value="Production" />
            </>
          )}
          {mode === "other" && (
            <>
              <input type="hidden" name="taskType" value="OTHER" />
              {selectedVenue?.kind === "journal" ? (
                <input
                  type="hidden"
                  name="journalId"
                  value={selectedVenue.id}
                />
              ) : null}
              {selectedVenue?.kind === "conference" ? (
                <input
                  type="hidden"
                  name="conferenceId"
                  value={selectedVenue.id}
                />
              ) : null}
            </>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <label className="grid gap-1.5">
              <input
                name="title"
                required
                defaultValue={initialTitle}
                aria-label="Task title"
                placeholder="Task title (*)"
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5">
              <ResearchDatePicker
                name="dueDate"
                value={dueDate}
                onChange={setDueDate}
                placeholder="Due date"
                className={inputClass}
              />
            </label>
          </div>

          {triggerVariant === "default" && (
            <div
              data-research-toggle-tabs="true"
              className="grid w-full grid-cols-2 border border-[#444444] bg-[#202020] sm:grid-cols-5"
            >
              {(
                ["submit", "production", "review", "project", "other"] as const
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeMode(item)}
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
          )}

          {fixedResearch ? (
            <section className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Associated research
              </span>
              <div className="flex min-w-0 items-center gap-3 border border-[#d9d0c3] bg-[#f8f5f0] px-4 py-3 text-[#243047] dark:border-[#444444] dark:bg-[#252525] dark:text-[#E4E4E4]">
                <FileText className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {fixedResearch.title}
                </span>
                {fixedResearch.code ? (
                  <span className="flex-none text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                    {fixedResearch.code}
                  </span>
                ) : null}
              </div>
            </section>
          ) : null}

          {showsResearch && !fixedResearch && (
            <SearchPanel
              query={researchQuery}
              setQuery={setResearchQuery}
              placeholder={`Search research by title, ID, or stage${needsResearch ? " (*)" : " (optional)"}`}
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
                          setSelectedSubmission(null);
                          setSubmissionQuery("");
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

          {mode === "other" && (
            <SearchPanel
              title="Associated submission"
              query={submissionQuery}
              setQuery={setSubmissionQuery}
              placeholder="Search submission by ID, research, venue, or status (optional)"
              selectedItems={
                selectedSubmission
                  ? [
                      {
                        id: selectedSubmission.id,
                        title: `${selectedSubmission.code} - ${selectedSubmission.researchTitle}`,
                        meta: `${selectedSubmission.venueName} - ${selectedSubmission.status}`,
                        icon: <Database className="h-4 w-4" />,
                        selected: true,
                        onClick: () => {
                          setSelectedSubmission(null);
                          setSubmissionQuery("");
                        },
                      },
                    ]
                  : []
              }
              items={filteredSubmissions.map((submission) => ({
                id: submission.id,
                title: `${submission.code} - ${submission.researchTitle}`,
                meta: `${submission.venueName} - ${submission.status}`,
                icon: <Database className="h-4 w-4" />,
                selected: selectedSubmission?.id === submission.id,
                onClick: () => selectSubmission(submission),
              }))}
            />
          )}

          {showsVenue && (
            <SearchPanel
              query={venueQuery}
              setQuery={setVenueQuery}
              placeholder={
                mode === "other"
                  ? "Search journal (optional)"
                  : "Search journal or conference (*)"
              }
              selectedItems={
                selectedVenue &&
                (mode !== "other" || selectedVenue.kind === "journal")
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
                          setSelectedSubmission(null);
                          setSubmissionQuery("");
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

          {mode === "submit" && selectedVenue?.kind === "journal" && (
            <JournalAccountField
              accounts={journalAccounts}
              query={accountQuery}
              setQuery={setAccountQuery}
              selectedAccount={selectedAccount}
              filteredAccounts={filteredAccounts}
              selectAccount={selectAccount}
              required={submitAccountRequired}
              clearAccount={() => {
                setSelectedAccountId("");
                setAccountQuery("");
              }}
            />
          )}

          {needsReview && (
            <SearchPanel
              query={reviewQuery}
              setQuery={setReviewQuery}
              placeholder="Search review by manuscript, journal, or status (*)"
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

          {showsOrganizedProject && (
            <div className="grid gap-4">
              <SearchPanel
                query={organizedProjectQuery}
                setQuery={setOrganizedProjectQuery}
                placeholder="Search project by title, ID, or status (optional)"
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
            <textarea
              key={mode}
              name="description"
              rows={3}
              aria-label="Description"
              placeholder="Description, expected output, files, or notes"
              defaultValue={
                mode === "submit" ? defaultSubmitTaskDescription : ""
              }
              className={researchTextareaClass}
            />
          </label>

          <TaskAttachmentField />

          <SearchPanel
            query={assigneeQuery}
            setQuery={setAssigneeQuery}
            placeholder="Search active research users by name, email, ID, or role (*)"
            selectedItems={selectedAssigneeItems}
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
            sideControl={
              <ReportUploadPermissionField
                checked={allowReportUpload}
                onChange={setAllowReportUpload}
              />
            }
          />
        </form>
      </ResearchModal>
    </>
  );
}

function ReportUploadPermissionField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center gap-3 border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#243047] transition hover:border-[#A8DADC] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 flex-none accent-[#1F7180]"
      />
      <span className="min-w-0 leading-5">
        Allow assignee to upload task report
      </span>
    </label>
  );
}

function TaskAttachmentField() {
  return (
    <label className="grid gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#6C778D] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
      <span className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#6C778D] dark:text-[#B0B0B0]">
        <FileUp className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
        Task file (optional)
      </span>
      <input
        name="taskFile"
        type="file"
        accept=".pdf,.doc,.docx,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="block w-full cursor-pointer text-sm text-[#243047] file:mr-4 file:cursor-pointer file:border file:border-[#D8D0C2] file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-normal file:text-[#1F7180] hover:file:border-[#A8DADC] dark:text-[#E4E4E4] dark:file:border-[#444444] dark:file:text-[#A8DADC] dark:hover:file:border-[#A8DADC]"
      />
      <span className="text-xs text-[#7C8798] dark:text-[#9CA3AF]">
        PDF, DOC, DOCX, or XLSX. Maximum 2 MB.
      </span>
    </label>
  );
}

function JournalAccountField({
  accounts,
  query,
  setQuery,
  selectedAccount,
  filteredAccounts,
  selectAccount,
  required,
  clearAccount,
}: {
  accounts: TaskAccountOption[];
  query: string;
  setQuery: (value: string) => void;
  selectedAccount: TaskAccountOption | null | undefined;
  filteredAccounts: TaskAccountOption[];
  selectAccount: (account: TaskAccountOption) => void;
  required: boolean;
  clearAccount: () => void;
}) {
  if (accounts.length === 0) {
    return (
      <section className="rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
        No account is linked to this journal yet. You can still assign this
        submission task and add the account later.
      </section>
    );
  }

  return (
    <SearchPanel
      query={query}
      setQuery={setQuery}
      placeholder={
        required
          ? "Search and choose the journal account (*)"
          : "Account selected automatically"
      }
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
  sideControl,
}: {
  title?: string;
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  selectedItems?: SearchPanelItem[];
  items: SearchPanelItem[];
  sideControl?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const showDropdown = focused && query.trim().length > 0;
  return (
    <section className="grid gap-3">
      {title ? (
        <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
          {title}
        </span>
      ) : null}
      {selectedItems.length > 0 && (
        <div className="grid gap-2">
          {selectedItems.map((item) => (
            <SelectedSearchItem key={item.id} item={item} />
          ))}
        </div>
      )}
      <div
        className={
          sideControl
            ? "grid items-start gap-4 lg:grid-cols-[1fr_18rem]"
            : undefined
        }
      >
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
        {sideControl}
      </div>
    </section>
  );
}

function SelectedSearchItem({ item }: { item: SearchPanelItem }) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className="group flex cursor-pointer items-start justify-between gap-3 rounded-none border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-2 text-left text-[#1F2937] transition hover:border-[#7FBFC5] hover:bg-[#F3FAF9] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#303030]"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex-none text-[#1F7180] dark:text-[#A8DADC]">
          {item.icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-normal leading-5 text-[#1F2937] dark:text-[#E4E4E4]">
            {item.title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            {item.meta}
          </span>
        </span>
      </span>
      <X className="mt-0.5 h-4 w-4 flex-none text-[#667085] transition group-hover:text-[#1F7180] dark:text-[#B0B0B0] dark:group-hover:text-[#A8DADC]" />
    </button>
  );
}
