"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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
import {
  defaultResearchTaskDueDate,
  urgentResearchTaskDueDate,
} from "@/sites/research/lib/task-date";
import { TaskGuidePicker, type TaskGuideOption } from "./TaskGuidePicker";
import {
  defaultSubmissionTaskBlockedDetail,
  isSubmissionTaskBlockingReason,
  SubmissionTaskBlockedDialog,
} from "./SubmissionTaskBlockedDialog";

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

export type TaskMode =
  | "submit"
  | "production"
  | "suggestVenue"
  | "addJournal"
  | "proposal"
  | "review"
  | "project"
  | "other";
type TaskTriggerVariant = "default" | "other" | "production" | "suggestVenue";
type ProposalScope = "research" | "project";
type TaskModeChoice =
  | Exclude<TaskMode, "proposal">
  | "researchProposal"
  | "projectProposal";
type ProductionSubtype =
  | "IDEA_FORMING"
  | "DATA_COLLECTION"
  | "MODELING"
  | "WRITING"
  | "HUMANIZING"
  | "REFERENCES";
type SearchPanelItem = {
  id: string;
  title: string;
  meta: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
};

const inputClass = researchFieldClass;
const defaultTaskDescription = "Read the guide by click on icons right above.";
const writingProductionTaskDescription = `Read the guide by click on icons right above

- The sequence to write the manuscript must start from Chapter 2. Literature Review.
- Next: Chapter 3. Methodology
- Next: Chapter 4. Results
- Next: Chapter 1. Introduction (now the objective must be aligned with the results that we already wrote, but not too much to raise supicous)
- Next: Chapter 5. Conclusions & Recommendation
- Next: Abstract, keywords, JEL codes, and refine the title.

Paste the full references of citations that you used after each part, we will use them to make references later.`;
const suggestVenueTaskDescription =
  "Read the general guide by click on icons right above.\nSuggest 2 venues.";
const finishedResearchStages = new Set(["ACCEPTED", "PUBLISHED"]);
const closedReviewStatuses = new Set(["SUBMITTED", "DECLINED", "CANCELLED"]);
const closedProjectStatuses = new Set(["COMPLETED"]);
const productionSubtypeOptions: Array<{
  value: ProductionSubtype;
  label: string;
  guideCodes: string[];
}> = [
  {
    value: "IDEA_FORMING",
    label: "Idea forming",
    guideCodes: ["G016", "G014", "G015"],
  },
  {
    value: "DATA_COLLECTION",
    label: "Data collection",
    guideCodes: ["G017", "G014", "G015"],
  },
  {
    value: "MODELING",
    label: "Modeling",
    guideCodes: ["G018", "G014", "G015"],
  },
  {
    value: "WRITING",
    label: "Writing",
    guideCodes: [
      "G007",
      "G009",
      "G011",
      "G008",
      "G010",
      "G024",
      "G014",
      "G015",
    ],
  },
  {
    value: "HUMANIZING",
    label: "Humanizing",
    guideCodes: ["G020", "G014", "G015"],
  },
  {
    value: "REFERENCES",
    label: "References",
    guideCodes: ["G006", "G014", "G015"],
  },
];

function guideIdsForCode(guides: TaskGuideOption[], guideCode: string) {
  const guide = guides.find((item) => item.guideCode === guideCode);
  return guide ? [guide.id] : [];
}

function guideIdsForCodes(guides: TaskGuideOption[], guideCodes: string[]) {
  return guideCodes
    .map((guideCode) => guides.find((item) => item.guideCode === guideCode)?.id)
    .filter((id): id is string => Boolean(id));
}

function modeLabel(mode: TaskMode) {
  if (mode === "submit") return "Submit";
  if (mode === "production") return "Production";
  if (mode === "suggestVenue") return "Suggest venue";
  if (mode === "addJournal") return "Add journal";
  if (mode === "proposal") return "Proposal";
  if (mode === "review") return "Review";
  if (mode === "project") return "Project";
  return "Other";
}

function taskChoiceLabel(choice: TaskModeChoice) {
  if (choice === "researchProposal") return "Research proposal";
  if (choice === "projectProposal") return "Project proposal";
  return modeLabel(choice);
}

function productionSubtypeLabel(subtype: ProductionSubtype) {
  return (
    productionSubtypeOptions.find((option) => option.value === subtype)
      ?.label ?? "Production"
  );
}

function defaultTaskTitleForDialog({
  triggerVariant,
  mode,
  productionSubtype,
  research,
  initialTitle,
}: {
  triggerVariant: TaskTriggerVariant;
  mode: TaskMode;
  productionSubtype: ProductionSubtype;
  research: TaskResearchOption | null;
  initialTitle: string;
}) {
  if (initialTitle.trim()) return initialTitle;
  if (triggerVariant === "production" && mode === "production" && research) {
    return `${productionSubtypeLabel(productionSubtype)} task for ${research.title}`;
  }
  return "";
}

function createTaskErrorDetail(reason?: string) {
  if (reason === "PRODUCTION_INCOMPLETE")
    return "Complete the production timeline before assigning a submission task.";
  if (reason === "MISSING_ASSOCIATION")
    return "Choose the required research, venue, review, or project before creating this task.";
  if (reason === "RESEARCH_ALREADY_FINISHED")
    return "Choose research that is not accepted or published yet.";
  if (reason === "RESEARCH_PRODUCTION_COMPLETE")
    return "Choose research that has not finished the production timeline.";
  if (reason === "REVIEW_CLOSED")
    return "Choose a review that is not submitted, declined, or cancelled.";
  if (reason === "PROJECT_CLOSED")
    return "Choose a project that is not completed.";
  if (reason === "INACTIVE_RESEARCH_ASSIGNEE")
    return "Choose only users who have activated their research-site account.";
  if (reason === "TEAM_MEMBER_REQUIRED")
    return "Team leaders can assign this research only to their team members or to themselves.";
  if (reason === "INVALID_CHECKER")
    return "Choose a chief assistant as checker, or leave checker empty.";
  if (reason === "ACTIVE_SUBMISSION_TASK_EXISTS")
    return "An active submission task already exists for this research and venue.";
  if (reason === "ACTIVE_PUBLISHER_SUBMISSION_EXISTS")
    return "This research already has an active submission workflow for this publisher. Choose a journal from another publisher.";
  if (reason === "PUBLISHER_TARGET_SLOTS_FULL")
    return "This publisher already has 2 active target journal slots for this research. Choose a journal from another publisher.";
  if (reason === "ACCOUNT_NOT_FOR_JOURNAL")
    return "Choose an account that belongs to the selected journal.";
  if (reason === "ACCOUNT_REQUIRED")
    return "Choose the journal account for this submission task.";
  if (reason === "INVALID_JOURNAL_TARGET_COUNT")
    return "Enter a journal target between 1 and 30.";
  if (reason === "INVALID_SUGGESTED_VENUE_TARGET_COUNT")
    return "Enter a suggested venue target between 1 and 30.";
  if (reason === "TASK_FILE_TOO_LARGE")
    return "Task file must be 2 MB or smaller.";
  if (reason === "TASK_FILE_REJECTED")
    return "Upload the task file as PDF, DOC, DOCX, or XLSX.";
  if (reason === "RESEARCH_LOCKED")
    return "This research is locked because it has been accepted or published.";
  if (reason === "UNAUTHORIZED")
    return "Your account is not allowed to create this task for the selected research.";
  if (reason === "NO_ASSIGNEE") return "Choose at least one task assignee.";
  return "Please check the task details and try again.";
}

function researchMatchesMode(project: TaskResearchOption, mode: TaskMode) {
  if (mode === "submit") return !finishedResearchStages.has(project.stage);
  return true;
}

function defaultTaskGuideIdsForMode(
  mode: TaskMode,
  guides: TaskGuideOption[],
  proposalScope: ProposalScope = "research",
  productionSubtype: ProductionSubtype = "IDEA_FORMING",
) {
  if (mode === "production") {
    return guideIdsForCodes(
      guides,
      productionSubtypeOptions.find((item) => item.value === productionSubtype)
        ?.guideCodes ?? ["G016", "G014", "G015"],
    );
  }
  if (mode === "suggestVenue")
    return guideIdsForCodes(guides, ["G001", "G023", "G015"]);
  const guideCode =
    mode === "submit"
      ? ["G002", "G015"]
      : mode === "addJournal"
        ? "G003"
        : mode === "proposal"
          ? proposalScope === "project"
            ? "G005"
            : "G004"
          : mode === "review"
            ? ["G013", "G015"]
            : null;
  if (!guideCode) return [];
  return Array.isArray(guideCode)
    ? guideIdsForCodes(guides, guideCode)
    : guideIdsForCode(guides, guideCode);
}

export function NewTaskDialog({
  assignees,
  researchOptions,
  venueOptions,
  accountOptions,
  reviewOptions,
  organizedProjectOptions,
  submissionOptions = [],
  checkerOptions = [],
  taskGuideOptions = [],
  canChooseChecker = false,
  initialMode = "submit",
  initialResearch = null,
  initialTitle = "",
  triggerVariant = "default",
  triggerDisabled = false,
  triggerDisabledReason,
}: {
  assignees: TaskAssigneeOption[];
  researchOptions: TaskResearchOption[];
  venueOptions: TaskVenueOption[];
  accountOptions: TaskAccountOption[];
  reviewOptions: TaskReviewOption[];
  organizedProjectOptions: TaskOrganizedProjectOption[];
  submissionOptions?: TaskSubmissionOption[];
  checkerOptions?: TaskAssigneeOption[];
  taskGuideOptions?: TaskGuideOption[];
  canChooseChecker?: boolean;
  initialMode?: TaskMode;
  initialResearch?: TaskResearchOption | null;
  initialTitle?: string;
  triggerVariant?: TaskTriggerVariant;
  triggerDisabled?: boolean;
  triggerDisabledReason?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TaskMode>(initialMode);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [checkerQuery, setCheckerQuery] = useState("");
  const [researchQuery, setResearchQuery] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [organizedProjectQuery, setOrganizedProjectQuery] = useState("");
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [dueDate, setDueDate] = useState(defaultResearchTaskDueDate);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCheckerId, setSelectedCheckerId] = useState("");
  const [selectedTaskGuideIds, setSelectedTaskGuideIds] = useState<string[]>(
    () => defaultTaskGuideIdsForMode(initialMode, taskGuideOptions),
  );
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
  const [proposalScope, setProposalScope] = useState<ProposalScope>("research");
  const [productionSubtype, setProductionSubtype] =
    useState<ProductionSubtype>("IDEA_FORMING");
  const [taskTitle, setTaskTitle] = useState(() =>
    defaultTaskTitleForDialog({
      triggerVariant,
      mode: initialMode,
      productionSubtype: "IDEA_FORMING",
      research: initialResearch,
      initialTitle,
    }),
  );
  const [taskTitleTouched, setTaskTitleTouched] = useState(
    Boolean(initialTitle.trim()),
  );
  const [allowReportUpload, setAllowReportUpload] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [submissionBlockedDetail, setSubmissionBlockedDetail] = useState("");
  const [taskCreateErrorDetail, setTaskCreateErrorDetail] = useState("");
  const [journalTargetCount, setJournalTargetCount] = useState("1");
  const [suggestedVenueTargetCount, setSuggestedVenueTargetCount] =
    useState("2");
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

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTaskGuideIds((current) =>
      current.length > 0
        ? current
        : defaultTaskGuideIdsForMode(
            mode,
            taskGuideOptions,
            proposalScope,
            productionSubtype,
          ),
    );
  }, [isOpen, mode, productionSubtype, proposalScope, taskGuideOptions]);

  useEffect(() => {
    if (taskTitleTouched) return;
    setTaskTitle(
      defaultTaskTitleForDialog({
        triggerVariant,
        mode,
        productionSubtype,
        research: selectedResearch,
        initialTitle,
      }),
    );
  }, [
    initialTitle,
    mode,
    productionSubtype,
    selectedResearch,
    taskTitleTouched,
    triggerVariant,
  ]);

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
    setCheckerQuery("");
    setResearchQuery("");
    setVenueQuery("");
    setAccountQuery("");
    setReviewQuery("");
    setOrganizedProjectQuery("");
    setSubmissionQuery("");
    setDueDate(defaultResearchTaskDueDate());
    setSelectedIds([]);
    setSelectedCheckerId("");
    setSelectedTaskGuideIds(
      defaultTaskGuideIdsForMode(initialMode, taskGuideOptions),
    );
    const defaultProductionSubtype = "IDEA_FORMING";
    setTaskTitle(
      defaultTaskTitleForDialog({
        triggerVariant,
        mode: initialMode,
        productionSubtype: defaultProductionSubtype,
        research: initialResearch,
        initialTitle,
      }),
    );
    setTaskTitleTouched(Boolean(initialTitle.trim()));
    setSelectedResearch(initialResearch);
    setSelectedVenue(null);
    setSelectedAccountId("");
    setSelectedReview(null);
    setSelectedOrganizedProject(null);
    setSelectedSubmission(null);
    setProposalScope("research");
    setProductionSubtype(defaultProductionSubtype);
    setIsUrgent(false);
    setAllowReportUpload(false);
    setJournalTargetCount("1");
  }

  function toggleUrgentTask(checked: boolean) {
    setIsUrgent(checked);
    setDueDate(
      checked ? urgentResearchTaskDueDate() : defaultResearchTaskDueDate(),
    );
  }

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

  function changeMode(nextMode: TaskMode, nextProposalScope = proposalScope) {
    setMode(nextMode);
    setSelectedTaskGuideIds(
      defaultTaskGuideIdsForMode(
        nextMode,
        taskGuideOptions,
        nextProposalScope,
        productionSubtype,
      ),
    );
    if (
      (nextMode === "other" && selectedVenue?.kind === "conference") ||
      (nextMode !== "submit" && nextMode !== "other")
    ) {
      setSelectedVenue(null);
      setVenueQuery("");
      setSelectedAccountId("");
      setAccountQuery("");
    }
    if (nextMode !== "other") {
      setSelectedSubmission(null);
      setSubmissionQuery("");
    }
    if (nextMode !== "proposal") {
      setProposalScope("research");
    }
    if (nextMode === "proposal") {
      setSelectedVenue(null);
      setVenueQuery("");
      setSelectedAccountId("");
      setAccountQuery("");
      setSelectedReview(null);
      setReviewQuery("");
    }
  }

  function changeProductionSubtype(nextSubtype: ProductionSubtype) {
    setProductionSubtype(nextSubtype);
    setSelectedTaskGuideIds(
      defaultTaskGuideIdsForMode(
        "production",
        taskGuideOptions,
        proposalScope,
        nextSubtype,
      ),
    );
  }

  function changeTaskChoice(choice: TaskModeChoice) {
    if (choice === "researchProposal") {
      changeMode("proposal", "research");
      changeProposalScope("research");
      return;
    }
    if (choice === "projectProposal") {
      changeMode("proposal", "project");
      changeProposalScope("project");
      return;
    }
    changeMode(choice);
  }

  function taskChoiceIsActive(choice: TaskModeChoice) {
    if (choice === "researchProposal") {
      return mode === "proposal" && proposalScope === "research";
    }
    if (choice === "projectProposal") {
      return mode === "proposal" && proposalScope === "project";
    }
    return mode === choice;
  }

  function changeProposalScope(nextScope: ProposalScope) {
    setProposalScope(nextScope);
    if (mode === "proposal") {
      setSelectedTaskGuideIds(
        defaultTaskGuideIdsForMode("proposal", taskGuideOptions, nextScope),
      );
    }
    if (nextScope === "research") {
      setSelectedOrganizedProject(null);
      setOrganizedProjectQuery("");
    } else {
      setSelectedResearch(null);
      setResearchQuery("");
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
      let result: Awaited<ReturnType<typeof createResearchTask>>;
      try {
        result = await createResearchTask(formData);
      } catch (error) {
        console.error("[research tasks] create failed", error);
        showError({
          title: "Task was not created",
          detail:
            "The server could not finish creating this task. Please try again.",
        });
        setTaskCreateErrorDetail(
          "The server could not finish creating this task. Please try again.",
        );
        return;
      }
      if (!result?.ok) {
        if (isSubmissionTaskBlockingReason(result?.reason)) {
          setSubmissionBlockedDetail(
            result && "message" in result && result.message
              ? result.message
              : defaultSubmissionTaskBlockedDetail(result?.reason),
          );
          return;
        }
        const detail =
          result && "message" in result && result.message
            ? result.message
            : createTaskErrorDetail(result?.reason);
        showError({ title: "Task was not created", detail });
        setTaskCreateErrorDetail(detail);
        return;
      }
      showSuccess({
        title: "Task created",
        detail: `${modeLabel(mode)} task assigned to ${selectedIds.length} user${selectedIds.length === 1 ? "" : "s"}.`,
      });
      reset();
      setIsOpen(false);
      router.refresh();
    });
  }

  function handleTaskFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    submitTask(new FormData(event.currentTarget));
  }

  const needsResearch =
    mode === "submit" || mode === "production" || mode === "suggestVenue";
  const showsResearch =
    needsResearch ||
    mode === "other" ||
    (mode === "proposal" && proposalScope === "research");
  const fixedResearch = triggerVariant !== "default" && initialResearch;
  const selectedResearchMatchesMode = selectedResearch
    ? researchMatchesMode(selectedResearch, mode)
    : !needsResearch;
  const showsVenue =
    mode === "submit" || (mode === "other" && triggerVariant === "default");
  const needsVenue = mode === "submit";
  const selectedVenueMatchesMode = !needsVenue || Boolean(selectedVenue);
  const needsReview = mode === "review";
  const selectedReviewIsOpen =
    !needsReview ||
    (selectedReview ? !closedReviewStatuses.has(selectedReview.status) : false);
  const showsOrganizedProject =
    mode === "project" || (mode === "proposal" && proposalScope === "project");
  const selectedOrganizedProjectIsOpen =
    !showsOrganizedProject ||
    !selectedOrganizedProject ||
    (selectedOrganizedProject
      ? !closedProjectStatuses.has(selectedOrganizedProject.status)
      : false);
  const canSubmit =
    selectedIds.length > 0 &&
    (mode !== "addJournal" ||
      (Number(journalTargetCount) >= 1 && Number(journalTargetCount) <= 30)) &&
    (mode !== "suggestVenue" ||
      (Number(suggestedVenueTargetCount) >= 1 &&
        Number(suggestedVenueTargetCount) <= 30)) &&
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
        <ResearchButton
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={triggerDisabled}
        >
          <PlusCircle className="h-4 w-4" />
          New Task
        </ResearchButton>
      ) : (
        <IconHint
          label={
            triggerDisabled && triggerDisabledReason
              ? triggerDisabledReason
              : triggerVariant === "production"
                ? "Create production task"
                : triggerVariant === "suggestVenue"
                  ? "Create suggest venue task"
                  : "Create other task"
          }
          position="bottom"
        >
          <button
            type="button"
            onClick={() => {
              if (!triggerDisabled) setIsOpen(true);
            }}
            disabled={triggerDisabled}
            className={`research-allow-transform inline-flex h-5 w-5 flex-none cursor-pointer items-center justify-center border-0 bg-transparent shadow-none transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 active:translate-y-0 active:scale-90 ${
              triggerDisabled
                ? "cursor-not-allowed text-[#98A2B3] opacity-60 hover:translate-y-0 hover:scale-100 hover:text-[#98A2B3] active:scale-100 dark:text-[#777777] dark:hover:text-[#777777]"
                : triggerVariant === "production"
                  ? "text-[#B85C78] hover:text-[#8F3E59] dark:text-[#FFC1CC] dark:hover:text-[#FFD7DF]"
                  : triggerVariant === "suggestVenue"
                    ? "text-[#1F7180] hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#D6F5F8]"
                    : "text-[#70549B] hover:text-[#563B7E] dark:text-[#B39CD0] dark:hover:text-[#D0BCE5]"
            }`}
            aria-label={
              triggerVariant === "production"
                ? "Create production task"
                : triggerVariant === "suggestVenue"
                  ? "Create suggest venue task"
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
            : triggerVariant === "suggestVenue"
              ? "Create Suggest Venue Task"
              : triggerVariant === "other"
                ? "Create Other Task"
                : "Assign Task"
        }
        icon={<ClipboardList className="h-5 w-5" />}
        maxWidth="max-w-5xl"
        headerActions={
          <ResearchButton
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={!canSubmit || isPending}
          >
            <PlusCircle className="h-4 w-4" />
            {triggerVariant === "default" ? "Assign Task" : "Create Task"}
          </ResearchButton>
        }
      >
        <form
          ref={formRef}
          id={formId}
          onSubmit={handleTaskFormSubmit}
          className="grid gap-5"
        >
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
          <input
            type="hidden"
            name="isUrgent"
            value={isUrgent ? "true" : "false"}
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
              <input
                type="hidden"
                name="productionSubtype"
                value={productionSubtype}
              />
              <input type="hidden" name="category" value="Production" />
            </>
          )}
          {mode === "suggestVenue" && (
            <>
              <input type="hidden" name="taskType" value="SUGGEST_VENUE" />
              <input
                type="hidden"
                name="suggestedVenueTargetCount"
                value={suggestedVenueTargetCount}
              />
            </>
          )}
          {mode === "addJournal" && (
            <>
              <input type="hidden" name="taskType" value="ADD_JOURNAL" />
              <input
                type="hidden"
                name="journalTargetCount"
                value={journalTargetCount}
              />
            </>
          )}
          {mode === "proposal" && (
            <>
              <input type="hidden" name="taskType" value="PROPOSAL" />
              <input
                type="hidden"
                name="proposalScope"
                value={proposalScope === "project" ? "PROJECT" : "RESEARCH"}
              />
              {proposalScope === "project" && selectedOrganizedProject ? (
                <input
                  type="hidden"
                  name="organizedProjectId"
                  value={selectedOrganizedProject.id}
                />
              ) : null}
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
                value={taskTitle}
                onChange={(event) => {
                  setTaskTitle(event.target.value);
                  setTaskTitleTouched(true);
                }}
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
              className="grid w-full grid-cols-2 border border-[#444444] bg-[#202020] sm:grid-cols-3 lg:grid-cols-9"
            >
              {(
                [
                  "submit",
                  "production",
                  "suggestVenue",
                  "addJournal",
                  "researchProposal",
                  "projectProposal",
                  "review",
                  "project",
                  "other",
                ] as const
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => changeTaskChoice(item)}
                  data-research-toggle-tab="true"
                  data-active={taskChoiceIsActive(item)}
                  className={`cursor-pointer border-r border-[#303030] px-3 py-2 text-sm font-normal transition last:border-r-0 hover:border-[#444444] ${
                    taskChoiceIsActive(item)
                      ? "border-[#444444] bg-[#383838] text-[#A8DADC] shadow-none"
                      : "text-[#B0B0B0] hover:bg-[#303030] hover:text-[#E4E4E4]"
                  }`}
                >
                  {taskChoiceLabel(item)}
                </button>
              ))}
            </div>
          )}

          {mode === "addJournal" ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-normal uppercase text-[#667085] dark:text-[#B0B0B0]">
                Journals to add
              </span>
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={journalTargetCount}
                onChange={(event) => setJournalTargetCount(event.target.value)}
                placeholder="Number of journals"
                className={inputClass}
              />
            </label>
          ) : null}

          {mode === "suggestVenue" ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-normal uppercase text-[#667085] dark:text-[#B0B0B0]">
                Venues to suggest
              </span>
              <input
                type="number"
                min="1"
                max="30"
                step="1"
                value={suggestedVenueTargetCount}
                onChange={(event) =>
                  setSuggestedVenueTargetCount(event.target.value)
                }
                placeholder="Number of venues"
                className={inputClass}
              />
            </label>
          ) : null}

          {mode === "production" ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-normal uppercase text-[#667085] dark:text-[#B0B0B0]">
                Production subtype
                <span className="research-required-mark">(*)</span>
              </span>
              <select
                value={productionSubtype}
                onChange={(event) =>
                  changeProductionSubtype(
                    event.target.value as ProductionSubtype,
                  )
                }
                className={inputClass}
              >
                {productionSubtypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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
              required={submitAccountRequired}
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
                  mode === "proposal" && proposalScope === "project"
                    ? "Search project by title, ID, or status (optional)"
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
              key={`${mode}-${productionSubtype}`}
              name="description"
              rows={3}
              aria-label="Description"
              placeholder="Description, expected output, files, or notes"
              defaultValue={
                mode === "suggestVenue"
                  ? suggestVenueTaskDescription
                  : mode === "production" && productionSubtype === "WRITING"
                    ? writingProductionTaskDescription
                    : defaultTaskDescription
              }
              className={researchTextareaClass}
            />
          </label>

          <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
            <TaskGuidePicker
              guides={taskGuideOptions}
              selectedIds={selectedTaskGuideIds}
              onChange={setSelectedTaskGuideIds}
            />
            <UrgentTaskField checked={isUrgent} onChange={toggleUrgentTask} />
          </div>

          <TaskAttachmentField unlimitedSize={canChooseChecker} />

          <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
            <div className="grid gap-4">
              <SearchPanel
                query={assigneeQuery}
                setQuery={setAssigneeQuery}
                placeholder="Search task assignees by name, email, ID, or role (*)"
                selectedItems={selectedAssigneeItems}
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
      <SubmissionTaskBlockedDialog
        open={Boolean(submissionBlockedDetail)}
        detail={submissionBlockedDetail}
        onClose={() => setSubmissionBlockedDetail("")}
      />
      <TaskCreateErrorDialog
        open={Boolean(taskCreateErrorDetail)}
        detail={taskCreateErrorDetail}
        onClose={() => setTaskCreateErrorDetail("")}
      />
    </>
  );
}

function TaskCreateErrorDialog({
  open,
  detail,
  onClose,
}: {
  open: boolean;
  detail: string;
  onClose: () => void;
}) {
  return (
    <ResearchModal
      open={open}
      onClose={onClose}
      title="Task was not created"
      icon={<ClipboardList className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end">
          <ResearchButton type="button" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </ResearchButton>
        </div>
      }
    >
      <div className="border border-rose-200 bg-rose-50/75 px-4 py-3 text-sm leading-6 text-rose-900 dark:border-rose-300/30 dark:bg-rose-300/10 dark:text-rose-100">
        <p className="whitespace-pre-line">{detail}</p>
      </div>
    </ResearchModal>
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

function UrgentTaskField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center gap-3 border border-[#D8D0C2] bg-[#FFFDF8] px-4 py-3 text-sm text-[#243047] transition hover:border-[#E88DA0] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4] dark:hover:border-[#FF9DAE]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 flex-none accent-[#B33E5C]"
      />
      <span className="min-w-0 leading-5">Mark this task as urgent</span>
    </label>
  );
}

function TaskAttachmentField({
  unlimitedSize = false,
}: {
  unlimitedSize?: boolean;
}) {
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
        {unlimitedSize
          ? "PDF, DOC, DOCX, or XLSX."
          : "PDF, DOC, DOCX, or XLSX. Maximum 2 MB."}
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
      selectionMode="single"
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
  selectionMode = "multi",
  query,
  setQuery,
  placeholder,
  selectedItems = [],
  items,
  sideControl,
}: {
  title?: string;
  selectionMode?: "single" | "multi";
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  selectedItems?: SearchPanelItem[];
  items: SearchPanelItem[];
  sideControl?: ReactNode;
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
      <div
        className={
          sideControl
            ? "grid items-start gap-4 lg:grid-cols-[1fr_18rem]"
            : undefined
        }
      >
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
        {sideControl}
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
