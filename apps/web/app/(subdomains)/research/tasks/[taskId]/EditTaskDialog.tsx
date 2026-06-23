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
  Database,
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
  researchTextareaClass,
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
  TaskSubmissionOption,
  TaskVenueOption,
} from "../NewTaskDialog";

type TaskMode = "submit" | "production" | "review" | "project" | "other";

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
  checkerId: string;
  allowAssigneeReportUpload: boolean;
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

const inputClass = researchFieldClass;
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

function researchMatchesMode(project: TaskResearchOption, mode: TaskMode) {
  if (mode === "submit") return !finishedResearchStages.has(project.stage);
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
  if (reason === "INVALID_CHECKER") {
    return "Choose a chief assistant as checker, or leave checker empty.";
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
  submissionOptions = [],
  checkerOptions = [],
  canChooseChecker = false,
}: {
  task: EditableTask;
  assignees: TaskAssigneeOption[];
  researchOptions: TaskResearchOption[];
  venueOptions: TaskVenueOption[];
  accountOptions: TaskAccountOption[];
  reviewOptions: TaskReviewOption[];
  organizedProjectOptions: TaskOrganizedProjectOption[];
  submissionOptions?: TaskSubmissionOption[];
  checkerOptions?: TaskAssigneeOption[];
  canChooseChecker?: boolean;
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
  const initialSubmission =
    initialMode === "other"
      ? (submissionOptions.find(
          (option) =>
            option.researchId === task.projectId &&
            ((option.kind === "journal" && option.venueId === task.journalId) ||
              (option.kind === "conference" &&
                option.venueId === task.conferenceId)),
        ) ?? null)
      : null;

  const [isOpen, setIsOpen] = useState(false);
  const mode = initialMode;
  const projectTaskType =
    task.taskType === "PROJECT_RESEARCH_ASSOCIATED"
      ? "PROJECT_RESEARCH_ASSOCIATED"
      : "PROJECT_PRODUCTION";
  const projectCategory =
    task.taskType === "PROJECT_RESEARCH_ASSOCIATED"
      ? "Research production"
      : "Production";
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [checkerQuery, setCheckerQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [organizedProjectQuery, setOrganizedProjectQuery] = useState("");
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(task.assigneeIds);
  const [selectedCheckerId, setSelectedCheckerId] = useState(task.checkerId);
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
  const [selectedSubmission, setSelectedSubmission] =
    useState<TaskSubmissionOption | null>(initialSubmission);
  const [allowReportUpload, setAllowReportUpload] = useState(
    task.allowAssigneeReportUpload,
  );
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

  const filteredCheckers = useMemo(() => {
    const needle = checkerQuery.trim().toLowerCase();
    if (!needle || !canChooseChecker) return [];
    return checkerOptions
      .filter((user) => user.id !== selectedCheckerId)
      .filter((user) =>
        [user.name, user.email, user.id, ...user.roles]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 10);
  }, [canChooseChecker, checkerOptions, checkerQuery, selectedCheckerId]);

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

  function selectChecker(id: string) {
    setSelectedCheckerId(id);
    setCheckerQuery("");
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
    setSelectedVenue(venue);
    setVenueQuery("");
    setSelectedAccountId("");
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

  function openDialog() {
    setAssigneeQuery("");
    setCheckerQuery("");
    setResearchQuery("");
    setVenueQuery("");
    setAccountQuery("");
    setReviewQuery("");
    setOrganizedProjectQuery("");
    setSubmissionQuery("");
    setSelectedIds(task.assigneeIds);
    setSelectedCheckerId(task.checkerId);
    setSelectedResearch(initialResearch);
    setSelectedVenue(initialVenue);
    setSelectedAccountId(task.accountId);
    setSelectedReview(initialReview);
    setSelectedOrganizedProject(initialOrganizedProject);
    setSelectedSubmission(initialSubmission);
    setAllowReportUpload(task.allowAssigneeReportUpload);
    setIsOpen(true);
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
  const showsResearch = needsResearch || mode === "other";
  const selectedResearchMatchesMode =
    !needsResearch ||
    (selectedResearch ? researchMatchesMode(selectedResearch, mode) : false);
  const showsVenue = mode === "submit" || mode === "other";
  const needsVenue = mode === "submit";
  const selectedVenueMatchesMode = !needsVenue || Boolean(selectedVenue);
  const needsReview = mode === "review";
  const selectedReviewIsOpen =
    !needsReview ||
    (selectedReview ? !closedReviewStatuses.has(selectedReview.status) : false);
  const showsOrganizedProject = mode === "project";
  const requiresOrganizedProject =
    task.taskType === "PROJECT_RESEARCH_ASSOCIATED";
  const selectedOrganizedProjectIsOpen =
    !showsOrganizedProject ||
    (selectedOrganizedProject
      ? !closedProjectStatuses.has(selectedOrganizedProject.status)
      : !requiresOrganizedProject);
  const canSubmit =
    selectedIds.length > 0 &&
    selectedResearchMatchesMode &&
    selectedVenueMatchesMode &&
    selectedReviewIsOpen &&
    selectedOrganizedProjectIsOpen;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
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
          {canChooseChecker && (
            <input type="hidden" name="checkerId" value={selectedCheckerId} />
          )}
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
              <input type="hidden" name="taskType" value={projectTaskType} />
              {selectedOrganizedProject && (
                <input
                  type="hidden"
                  name="organizedProjectId"
                  value={selectedOrganizedProject.id}
                />
              )}
              <input type="hidden" name="category" value={projectCategory} />
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
                defaultValue={task.title}
                aria-label="Task title"
                placeholder="Task title (*)"
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5">
              <ResearchDatePicker
                name="dueDate"
                defaultValue={task.dueDate}
                placeholder="Due date"
                className={dateInputClass}
              />
            </label>
          </div>

          {showsResearch && (
            <SearchPanel
              selectionMode="single"
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
              selectionMode="single"
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
              selectionMode="single"
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
              clearAccount={() => {
                setSelectedAccountId("");
                setAccountQuery("");
              }}
            />
          )}

          {needsReview && (
            <SearchPanel
              selectionMode="single"
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
                selectionMode="single"
                query={organizedProjectQuery}
                setQuery={setOrganizedProjectQuery}
                placeholder={
                  requiresOrganizedProject
                    ? "Search project by title, ID, or status (*)"
                    : "Search project by title, ID, or status (optional)"
                }
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
              name="description"
              rows={3}
              defaultValue={task.description}
              aria-label="Description"
              placeholder="Description, expected output, files, or notes"
              className={researchTextareaClass}
            />
          </label>

          <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
            <div className="grid gap-4">
              <SearchPanel
                query={assigneeQuery}
                setQuery={setAssigneeQuery}
                placeholder="Search task assignees by name, email, ID, or role (*)"
                selectedItems={assignees
                  .filter((user) => selectedIds.includes(user.id))
                  .map((user) => ({
                    id: user.id,
                    title: displayResearchPersonName(user),
                    meta: [
                      displayResearchEmail(user.email),
                      user.roles.join(", "),
                    ]
                      .filter(Boolean)
                      .join(" - "),
                    icon: <UserRound className="h-4 w-4" />,
                    selected: true,
                    onClick: () => toggleAssignee(user.id),
                  }))}
                items={filteredAssignees.map((user) => ({
                  id: user.id,
                  title: displayResearchPersonName(user),
                  meta: [
                    displayResearchEmail(user.email),
                    user.roles.join(", "),
                  ]
                    .filter(Boolean)
                    .join(" - "),
                  icon: <UserRound className="h-4 w-4" />,
                  selected: selectedIds.includes(user.id),
                  onClick: () => toggleAssignee(user.id),
                }))}
              />
              {canChooseChecker && (
                <SearchPanel
                  selectionMode="single"
                  query={checkerQuery}
                  setQuery={setCheckerQuery}
                  placeholder="Search chief assistant checker by name, email, or ID (optional)"
                  selectedItems={checkerOptions
                    .filter((user) => user.id === selectedCheckerId)
                    .map((user) => ({
                      id: user.id,
                      title: displayResearchPersonName(user),
                      meta: [
                        displayResearchEmail(user.email),
                        "Chief assistant checker",
                      ]
                        .filter(Boolean)
                        .join(" - "),
                      icon: <UserRound className="h-4 w-4" />,
                      selected: true,
                      onClick: () => selectChecker(""),
                    }))}
                  items={filteredCheckers.map((user) => ({
                    id: user.id,
                    title: displayResearchPersonName(user),
                    meta: [
                      displayResearchEmail(user.email),
                      "Chief assistant checker",
                    ]
                      .filter(Boolean)
                      .join(" - "),
                    icon: <UserRound className="h-4 w-4" />,
                    selected: selectedCheckerId === user.id,
                    onClick: () => selectChecker(user.id),
                  }))}
                />
              )}
            </div>
            <div className="lg:pt-0">
              <ReportUploadPermissionField
                checked={allowReportUpload}
                onChange={setAllowReportUpload}
              />
            </div>
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
      <section className="rounded-none border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        No account is linked to this journal yet. You can still keep this
        submission task assigned and add the account later.
      </section>
    );
  }

  return (
    <SearchPanel
      selectionMode="single"
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

function SearchPanel({
  title,
  selectionMode = "multi",
  query,
  setQuery,
  placeholder,
  selectedItems = [],
  items,
}: {
  title?: string;
  selectionMode?: "single" | "multi";
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  selectedItems?: SearchPanelItem[];
  items: SearchPanelItem[];
}) {
  const [focused, setFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const singleSelectedItem =
    selectionMode === "single" ? selectedItems[0] : undefined;
  const showDropdown =
    !singleSelectedItem && focused && query.trim().length > 0;
  return (
    <section className="grid gap-3">
      {title ? (
        <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
          {title}
        </span>
      ) : null}
      {selectionMode === "multi" && selectedItems.length > 0 && (
        <div className="grid gap-2">
          {selectedItems.map((item) => (
            <SelectedSearchItem key={item.id} item={item} />
          ))}
        </div>
      )}
      <div ref={wrapperRef} className="relative z-30">
        {singleSelectedItem ? (
          <SelectedSearchField item={singleSelectedItem} />
        ) : (
          <div
            className={`${researchSearchFieldClass} flex items-center gap-3 px-3`}
          >
            <Search className="h-4 w-4 flex-none text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              placeholder={placeholder}
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#243047] placeholder:text-[#9AA3B4] outline-none dark:text-[#E4E4E4] dark:placeholder:text-[#6F6F6F]"
            />
          </div>
        )}

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

function SelectedSearchField({ item }: { item: SearchPanelItem }) {
  return (
    <div
      className={`${researchSearchFieldClass} flex h-auto min-h-[3rem] items-center gap-3 px-3 py-2`}
    >
      <span className="flex-none text-[#1F7180] dark:text-[#A8DADC]">
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-normal leading-5 text-[#1F2937] dark:text-[#E4E4E4]">
          {item.title}
        </span>
        {item.meta ? (
          <span className="mt-0.5 block truncate text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            {item.meta}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={item.onClick}
        aria-label={`Clear ${item.title}`}
        className="group/icon -mr-1 flex h-8 w-8 flex-none items-center justify-center text-[#667085] transition hover:scale-105 hover:text-[#1F7180] active:scale-95 dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
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
