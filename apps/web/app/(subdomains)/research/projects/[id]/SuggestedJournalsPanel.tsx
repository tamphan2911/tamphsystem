"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

import { useMemo, useRef, useState, useTransition } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  ChevronDown,
  ClipboardList,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
  Info,
  Pencil,
  Save,
} from "lucide-react";
import {
  addSuggestedConference,
  addSuggestedJournal,
  approveSuggestedConference,
  approveSuggestedJournal,
  createResearchTask,
  declineSuggestedConference,
  declineSuggestedJournal,
  deleteSuggestedConference,
  deleteSuggestedJournal,
  updateSuggestedConference,
  updateSuggestedJournal,
} from "../../actions";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchDetailSection } from "@/sites/research/components/ResearchDetailSection";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  cx,
  researchDropdownItemActiveClass,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchSearchFieldClass,
  researchSelectTriggerClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { defaultResearchTaskDueDate } from "@/sites/research/lib/task-date";
import {
  TaskGuidePicker,
  type TaskGuideOption,
} from "../../tasks/TaskGuidePicker";
import {
  currencySymbol,
  formatResearchNumber,
  normalizeResearchNumberInput,
} from "@/sites/research/lib/currency";

export type SuggestedJournalOption = {
  id: string;
  venueId: string;
  name: string;
  venueLink: string;
  status: string;
  issn: string;
  field: string;
  rank: string;
  publisher: string;
  apc: string;
  apcCurrency: string;
  hasApcOption: boolean;
  submissionFee: string;
  submissionFeeCurrency: string;
  note: string;
  venueNote: string;
  accounts: SuggestedJournalAccountOption[];
  suggestedByName?: string;
  suggestedByEmail?: string;
  requiresApproval?: boolean;
  approvedByName?: string;
  approvedByEmail?: string;
  approvalNote?: string;
  declineReason?: string;
  journalCreationPending?: boolean;
  taskId?: string;
  linkedTask?: SuggestedVenueTaskOption;
  venueState?: SuggestedVenueState;
};

type SuggestedJournalAccountOption = {
  id: string;
  journalId: string;
  username: string;
  email: string;
};

export type SuggestedConferenceOption = {
  id: string;
  venueId: string;
  name: string;
  venueLink: string;
  status: string;
  type: string;
  theme: string;
  location: string;
  organizer: string;
  isbn?: string;
  time: string;
  apc: string;
  apcCurrency: string;
  submissionFee: string;
  submissionFeeCurrency: string;
  note: string;
  venueNote: string;
  suggestedByName?: string;
  suggestedByEmail?: string;
  requiresApproval?: boolean;
  approvedByName?: string;
  approvedByEmail?: string;
  approvalNote?: string;
  declineReason?: string;
  taskId?: string;
  linkedTask?: SuggestedVenueTaskOption;
  venueState?: SuggestedVenueState;
};

export type SuggestedVenueTaskOption = {
  id: string;
  taskCode: string;
  title: string;
  status: string;
  assignees: string;
};

export type SuggestedVenueState = {
  state:
    | "idle"
    | "assigned"
    | "submitted"
    | "reviewing"
    | "rejected"
    | "withdrawn"
    | "accepted"
    | "published"
    | "pendingApproval"
    | "addingJournal"
    | "declined"
    | "blocked";
  publishedAt?: string;
  declineReason?: string;
};

export type TaskAssigneeOption = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

type Venue =
  | { kind: "journal"; item: SuggestedJournalOption }
  | { kind: "conference"; item: SuggestedConferenceOption };

export function SuggestedJournalsPanel({
  projectId,
  projectTitle,
  journals,
  suggested,
  conferences,
  suggestedConferences,
  taskOptions,
  assistants,
  checkers = [],
  taskGuideOptions = [],
  canChooseChecker = false,
  isAdmin,
  canAssignTask,
  canApproveSuggestion,
  canSuggestVenue,
  taskAction,
  disabled = false,
}: {
  projectId: string;
  projectTitle: string;
  journals: SuggestedJournalOption[];
  suggested: SuggestedJournalOption[];
  conferences: SuggestedConferenceOption[];
  suggestedConferences: SuggestedConferenceOption[];
  taskOptions: SuggestedVenueTaskOption[];
  assistants: TaskAssigneeOption[];
  checkers?: TaskAssigneeOption[];
  taskGuideOptions?: TaskGuideOption[];
  canChooseChecker?: boolean;
  isAdmin: boolean;
  canAssignTask: boolean;
  canApproveSuggestion: boolean;
  canSuggestVenue: boolean;
  taskAction?: ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAddTab, setActiveAddTab] = useState<"journal" | "conference">(
    "journal",
  );
  const [addOpen, setAddOpen] = useState(false);
  const [assignVenue, setAssignVenue] = useState<Venue | null>(null);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [selectedEditVenue, setSelectedEditVenue] = useState<Venue | null>(
    null,
  );
  const [editVenueName, setEditVenueName] = useState("");
  const [editVenueLink, setEditVenueLink] = useState("");
  const [editVenueNote, setEditVenueNote] = useState("");
  const [editVenueQuery, setEditVenueQuery] = useState("");
  const [editTaskQuery, setEditTaskQuery] = useState("");
  const editTaskSearchRef = useRef<HTMLDivElement>(null);
  const [selectedEditTask, setSelectedEditTask] =
    useState<SuggestedVenueTaskOption | null>(null);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);
  const [approveVenue, setApproveVenue] = useState<Venue | null>(null);
  const [declineConfirmOpen, setDeclineConfirmOpen] = useState(false);
  const [journalTaskConfirmOpen, setJournalTaskConfirmOpen] = useState(false);
  const [autoCreateJournalTask, setAutoCreateJournalTask] = useState(true);
  const [autoCreateSubmitTask, setAutoCreateSubmitTask] = useState(true);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedAddVenue, setSelectedAddVenue] = useState<Venue | null>(null);
  const [approvalVenue, setApprovalVenue] = useState<Venue | null>(null);
  const [freeVenueName, setFreeVenueName] = useState("");
  const [freeVenueLink, setFreeVenueLink] = useState("");
  const [freeVenueNote, setFreeVenueNote] = useState("");
  const [journalQuery, setJournalQuery] = useState("");
  const [conferenceQuery, setConferenceQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [checkerQuery, setCheckerQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>(
    [],
  );
  const [selectedCheckerId, setSelectedCheckerId] = useState("");
  const [selectedTaskGuideIds, setSelectedTaskGuideIds] = useState<string[]>(
    [],
  );
  const [allowReportUpload, setAllowReportUpload] = useState(false);
  const [taskMode, setTaskMode] = useState<"submit" | "other">("submit");
  const { showError, showSuccess } = useResearchToast();
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const assistantDropdownRef = useRef<HTMLDivElement>(null);
  const checkerDropdownRef = useRef<HTMLDivElement>(null);

  function showProductionIncomplete() {
    showSuccess({
      title: "Research is still in production",
      detail:
        "Complete every production timeline checkbox before submitting this research anywhere.",
    });
  }

  const suggestedJournalIds = useMemo(
    () => new Set(suggested.map((journal) => journal.venueId).filter(Boolean)),
    [suggested],
  );
  const suggestedConferenceIds = useMemo(
    () =>
      new Set(
        suggestedConferences
          .map((conference) => conference.venueId)
          .filter(Boolean),
      ),
    [suggestedConferences],
  );

  const journalResults = useMemo(() => {
    const needle = journalQuery.trim().toLowerCase();
    if (!needle) return [];
    return journals
      .filter((journal) => !suggestedJournalIds.has(journal.id))
      .filter((journal) => {
        return [
          journal.name,
          journal.issn,
          journal.field,
          journal.rank,
          journal.publisher,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 12);
  }, [journalQuery, journals, suggestedJournalIds]);

  const conferenceResults = useMemo(() => {
    const needle = conferenceQuery.trim().toLowerCase();
    if (!needle) return [];
    return conferences
      .filter((conference) => !suggestedConferenceIds.has(conference.id))
      .filter((conference) => {
        return [
          conference.name,
          conference.type,
          conference.theme,
          conference.location,
          conference.organizer,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 12);
  }, [conferenceQuery, conferences, suggestedConferenceIds]);

  const editVenueResults = useMemo(() => {
    if (!editVenue) return [];
    const needle = editVenueQuery.trim().toLowerCase();
    if (!needle) return [];
    if (editVenue.kind === "journal") {
      return journals
        .filter(
          (journal) =>
            journal.id === editVenue.item.venueId ||
            !suggestedJournalIds.has(journal.id),
        )
        .filter((journal) =>
          [
            journal.name,
            journal.issn,
            journal.field,
            journal.rank,
            journal.publisher,
          ]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
        .slice(0, 12)
        .map((item) => ({ kind: "journal" as const, item }));
    }
    return conferences
      .filter(
        (conference) =>
          conference.id === editVenue.item.venueId ||
          !suggestedConferenceIds.has(conference.id),
      )
      .filter((conference) =>
        [
          conference.name,
          conference.type,
          conference.theme,
          conference.location,
          conference.organizer,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 12)
      .map((item) => ({ kind: "conference" as const, item }));
  }, [
    conferences,
    editVenue,
    editVenueQuery,
    journals,
    suggestedConferenceIds,
    suggestedJournalIds,
  ]);

  const editTaskResults = useMemo(() => {
    if (!editVenue) return [];
    const needle = editTaskQuery.trim().toLowerCase();
    if (!needle) return [];
    return taskOptions
      .filter((task) => task.id !== selectedEditTask?.id)
      .filter((task) =>
        [task.taskCode, task.title, task.status, task.assignees, task.id]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 12);
  }, [editTaskQuery, editVenue, selectedEditTask?.id, taskOptions]);

  const assistantResults = useMemo(() => {
    const needle = assistantQuery.trim().toLowerCase();
    if (!needle) return [];
    return assistants
      .filter((assistant) => {
        if (selectedAssistantIds.includes(assistant.id)) return false;
        return [
          assistant.name,
          assistant.email,
          assistant.id,
          ...assistant.roles,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 12);
  }, [assistantQuery, assistants, selectedAssistantIds]);

  const checkerResults = useMemo(() => {
    const needle = checkerQuery.trim().toLowerCase();
    if (!needle || !canChooseChecker) return [];
    return checkers
      .filter((checker) => checker.id !== selectedCheckerId)
      .filter((checker) =>
        [checker.name, checker.email, checker.id, ...checker.roles]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 12);
  }, [canChooseChecker, checkerQuery, checkers, selectedCheckerId]);

  const selectedAssistants = useMemo(
    () =>
      selectedAssistantIds.flatMap((id) => {
        const assistant = assistants.find((item) => item.id === id);
        return assistant ? [assistant] : [];
      }),
    [assistants, selectedAssistantIds],
  );
  const selectedChecker = useMemo(
    () => checkers.find((checker) => checker.id === selectedCheckerId) ?? null,
    [checkers, selectedCheckerId],
  );
  const editVenueHasSystemLink = Boolean(editVenue?.item.venueId);
  const editTaskLocked = selectedEditTask?.status === "COMPLETED";

  const assignJournalAccounts =
    assignVenue?.kind === "journal" ? assignVenue.item.accounts : [];
  const selectedAccount =
    assignVenue?.kind === "journal"
      ? assignJournalAccounts.find(
          (account) => account.id === selectedAccountId,
        )
      : null;
  const accountRequired =
    taskMode === "submit" &&
    assignVenue?.kind === "journal" &&
    assignJournalAccounts.length > 1;
  const isUnlinkedJournalApproval = Boolean(
    approveVenue?.kind === "journal" && !approveVenue.item.venueId,
  );
  const approvalUsesJournalTask =
    isUnlinkedJournalApproval && autoCreateJournalTask;
  const approvalCanCreateSubmitTask = Boolean(approveVenue?.item.venueId);

  function toggleAssistant(id: string) {
    setSelectedAssistantIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setAssistantQuery("");
  }

  function selectChecker(id: string) {
    setSelectedCheckerId(id);
    setCheckerQuery("");
  }

  function closeAddVenue() {
    setAddOpen(false);
    setJournalQuery("");
    setConferenceQuery("");
    setSelectedAddVenue(null);
    setFreeVenueName("");
    setFreeVenueLink("");
    setFreeVenueNote("");
  }

  function openEditVenue(venue: Venue) {
    const linkedVenue =
      venue.kind === "journal"
        ? journals.find((item) => item.id === venue.item.venueId)
        : conferences.find((item) => item.id === venue.item.venueId);
    setEditVenue(venue);
    setSelectedEditVenue(
      linkedVenue
        ? venue.kind === "journal"
          ? {
              kind: "journal",
              item: linkedVenue as SuggestedJournalOption,
            }
          : {
              kind: "conference",
              item: linkedVenue as SuggestedConferenceOption,
            }
        : null,
    );
    setEditVenueName(venue.item.name);
    setEditVenueLink(venue.item.venueLink);
    setEditVenueNote(venue.item.venueNote);
    setEditVenueQuery("");
    setSelectedEditTask(venue.item.linkedTask ?? null);
    setEditTaskQuery("");
  }

  function closeEditVenue() {
    setEditVenue(null);
    setSelectedEditVenue(null);
    setEditVenueName("");
    setEditVenueLink("");
    setEditVenueNote("");
    setEditVenueQuery("");
    setSelectedEditTask(null);
    setEditTaskQuery("");
  }

  function saveEditedVenue() {
    if (!editVenue) return;
    const formData = new FormData();
    if (!editVenue.item.venueId) {
      formData.set("venueName", editVenueName.trim());
      formData.set("venueLink", editVenueLink.trim());
      if (
        editVenue.kind === "journal" &&
        selectedEditVenue?.kind === "journal"
      ) {
        formData.set("journalId", selectedEditVenue.item.venueId);
      }
      if (
        editVenue.kind === "conference" &&
        selectedEditVenue?.kind === "conference"
      ) {
        formData.set("conferenceId", selectedEditVenue.item.venueId);
      }
    }
    formData.set("note", editVenueNote.trim());
    formData.set("taskId", selectedEditTask?.id ?? "");

    startTransition(async () => {
      const result =
        editVenue.kind === "journal"
          ? await updateSuggestedJournal(projectId, editVenue.item.id, formData)
          : await updateSuggestedConference(
              projectId,
              editVenue.item.id,
              formData,
            );
      if (!result?.ok) {
        showError({
          title: "Suggested venue was not updated",
          detail: result?.message ?? "Check the venue details and try again.",
        });
        return;
      }
      const venueName = editVenueName.trim() || editVenue.item.name;
      closeEditVenue();
      showSuccess({
        title: "Suggested venue updated",
        detail: `${venueName} was updated successfully.`,
      });
      router.refresh();
    });
  }

  function addJournal(journalId?: string) {
    if (disabled) return;
    const formData = new FormData();
    if (journalId) formData.set("journalId", journalId);
    if (freeVenueName.trim()) formData.set("venueName", freeVenueName.trim());
    if (freeVenueLink.trim()) formData.set("venueLink", freeVenueLink.trim());
    if (freeVenueNote.trim()) formData.set("note", freeVenueNote.trim());
    startTransition(async () => {
      await addSuggestedJournal(projectId, formData);
      closeAddVenue();
      showSuccess({
        title: "Suggested venue added",
        detail: journalId
          ? "The journal was added to this research suggested venues."
          : "The journal suggestion is waiting for admin approval and linking.",
      });
      router.refresh();
    });
  }

  function addConference(conferenceId?: string) {
    if (disabled) return;
    const formData = new FormData();
    if (conferenceId) formData.set("conferenceId", conferenceId);
    if (freeVenueName.trim()) formData.set("venueName", freeVenueName.trim());
    if (freeVenueLink.trim()) formData.set("venueLink", freeVenueLink.trim());
    if (freeVenueNote.trim()) formData.set("note", freeVenueNote.trim());
    startTransition(async () => {
      await addSuggestedConference(projectId, formData);
      closeAddVenue();
      showSuccess({
        title: "Suggested venue added",
        detail: conferenceId
          ? "The conference was added to this research suggested venues."
          : "The conference suggestion is waiting for admin approval and linking.",
      });
      router.refresh();
    });
  }

  function addSelectedVenue() {
    if (isPending) return;
    if (selectedAddVenue?.kind === "journal") {
      addJournal(selectedAddVenue.item.venueId);
    } else if (selectedAddVenue?.kind === "conference") {
      addConference(selectedAddVenue.item.venueId);
    } else if (activeAddTab === "journal") {
      addJournal();
    } else {
      addConference();
    }
  }

  function removeVenue() {
    if (disabled) return;
    if (!deleteVenue) return;
    const removedVenueName = deleteVenue.item.name;
    startTransition(async () => {
      const result =
        deleteVenue.kind === "journal"
          ? await deleteSuggestedJournal(projectId, deleteVenue.item.id)
          : await deleteSuggestedConference(projectId, deleteVenue.item.id);
      if (!result?.ok) {
        showError({
          title: "Suggested venue was not removed",
          detail:
            result?.message ||
            "Please refresh the page and check linked submissions before trying again.",
        });
        return;
      }
      setDeleteVenue(null);
      showSuccess({
        title: "Suggested venue removed",
        detail: `${removedVenueName} and its linked draft submission/task records were removed where possible.`,
      });
      router.refresh();
    });
  }

  function approveSuggestion(formData: FormData) {
    if (!approveVenue) return;
    startTransition(async () => {
      let taskCreated = false;
      let submitTaskCreated = false;
      let submitTaskLinked = false;
      if (approvalCanCreateSubmitTask && autoCreateSubmitTask) {
        formData.set("createSubmitTask", "true");
      }
      if (approveVenue.kind === "journal") {
        if (approvalVenue?.kind === "journal") {
          formData.set("journalId", approvalVenue.item.venueId);
        }
        const result = await approveSuggestedJournal(
          projectId,
          approveVenue.item.id,
          formData,
        );
        taskCreated = Boolean(result?.taskCreated);
        submitTaskCreated = Boolean(result?.submitTaskCreated);
        submitTaskLinked = Boolean(result?.submitTaskLinked);
      } else {
        if (approvalVenue?.kind === "conference") {
          formData.set("conferenceId", approvalVenue.item.venueId);
        }
        const result = await approveSuggestedConference(
          projectId,
          approveVenue.item.id,
          formData,
        );
        submitTaskCreated = Boolean(result?.submitTaskCreated);
        submitTaskLinked = Boolean(result?.submitTaskLinked);
      }
      setApproveVenue(null);
      setApprovalVenue(null);
      setJournalQuery("");
      setConferenceQuery("");
      setJournalTaskConfirmOpen(false);
      setAutoCreateJournalTask(true);
      setAutoCreateSubmitTask(true);
      showSuccess({
        title: taskCreated
          ? "Journal task assigned"
          : submitTaskCreated
            ? "Venue approved and submit task assigned"
            : submitTaskLinked
              ? "Venue approved and linked to submit task"
              : "Venue suggestion approved",
        detail: taskCreated
          ? `An Add Journal task was assigned for ${approveVenue.item.name}. The suggestion remains pending until the journal is approved.`
          : submitTaskCreated
            ? `A submit task was assigned to the user who suggested ${approveVenue.item.name}.`
            : submitTaskLinked
              ? `${approveVenue.item.name} is linked to the existing unfinished submit task.`
              : `${approveVenue.item.name} can now be used for submission tasks.`,
      });
      router.refresh();
    });
  }

  function openVenueApproval(venue: Venue) {
    setApproveVenue(venue);
    setApprovalVenue(null);
    setJournalQuery("");
    setConferenceQuery("");
    setAutoCreateJournalTask(venue.kind === "journal" && !venue.item.venueId);
    setAutoCreateSubmitTask(true);
    setJournalTaskConfirmOpen(false);
  }

  function confirmJournalTaskApproval() {
    if (!approveVenue || approveVenue.kind !== "journal") return;
    const formData = new FormData();
    formData.set("createJournalTask", "true");
    setJournalTaskConfirmOpen(false);
    approveSuggestion(formData);
  }

  function declineSuggestion() {
    if (!approveVenue) return;
    const reason = declineReason.trim();
    if (!reason) {
      showError({
        title: "Decline reason required",
        detail: "Enter the reason before confirming this decision.",
      });
      return;
    }

    const venue = approveVenue;
    startTransition(async () => {
      const result =
        venue.kind === "journal"
          ? await declineSuggestedJournal(projectId, venue.item.id, reason)
          : await declineSuggestedConference(projectId, venue.item.id, reason);
      if (!result.ok) {
        showError({
          title: "Suggestion was not declined",
          detail: result.message || "Please refresh the page and try again.",
        });
        return;
      }

      setDeclineConfirmOpen(false);
      setDeclineReason("");
      setApproveVenue(null);
      setApprovalVenue(null);
      setJournalQuery("");
      setConferenceQuery("");
      showSuccess({
        title: "Venue suggestion declined",
        detail: `${venue.item.name} remains listed with its declined status. The suggester has been notified.`,
      });
      router.refresh();
    });
  }

  function assignTask(formData: FormData) {
    if (disabled) return;
    startTransition(async () => {
      const result = await createResearchTask(formData);
      if (!result?.ok) {
        if (result?.reason === "PRODUCTION_INCOMPLETE") {
          showProductionIncomplete();
        } else if (result?.reason === "RESEARCH_LOCKED") {
          showSuccess({
            title: "Research is locked",
            detail:
              "Unlock the research before creating submission tasks from this page.",
          });
        } else if (result?.reason === "UNAUTHORIZED") {
          showSuccess({
            title: "Task was not created",
            detail:
              "Only admin, first author, or corresponding author can create this task for the research.",
          });
        } else if (result?.reason === "ACCOUNT_REQUIRED") {
          showSuccess({
            title: "Account is required",
            detail:
              "This journal has multiple accounts. Choose the account for this submission task.",
          });
          return;
        } else {
          showSuccess({
            title: "Submission task already exists",
            detail:
              "Revoke the unfinished task for this research and venue before assigning a new one.",
          });
        }
        setAssignVenue(null);
        return;
      }
      setAssignVenue(null);
      setSelectedAssistantIds([]);
      setAssistantQuery("");
      setSelectedCheckerId("");
      setCheckerQuery("");
      setSelectedAccountId("");
      setAccountOpen(false);
      setTaskMode("submit");
      setAllowReportUpload(false);
      router.refresh();
    });
  }

  function openSubmitTask(venue: Venue) {
    if (disabled) return;
    setTaskMode("submit");
    setSelectedAccountId(
      venue.kind === "journal" && venue.item.accounts.length === 1
        ? (venue.item.accounts[0]?.id ?? "")
        : "",
    );
    setAccountOpen(false);
    setAssistantQuery("");
    setAllowReportUpload(false);
    setSelectedCheckerId("");
    setCheckerQuery("");
    setAssignVenue(venue);
  }

  const assignName = assignVenue?.item.name ?? "";
  const assignKind = assignVenue?.kind ?? "journal";

  return (
    <ResearchDetailSection>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
              Suggested venues
            </h2>
            {taskAction}
          </div>
          <p className="mt-1 text-xs text-[#B0B0B0]">
            Track journal and conference targets for this research.
          </p>
        </div>
        {canSuggestVenue && (
          <ResearchButton
            type="button"
            disabled={disabled}
            title={
              disabled
                ? "Research is locked. Unlock it before adding suggested venues."
                : "Add suggested venue"
            }
            onClick={() => setAddOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add suggested venue
          </ResearchButton>
        )}
      </div>

      <div className="grid gap-5">
        <VenueSection title="Journals">
          {suggested.map((journal) => (
            <JournalCard
              key={journal.id}
              journal={journal}
              isAdmin={isAdmin}
              canAssignTask={canAssignTask}
              canApproveSuggestion={canApproveSuggestion}
              canEditVenue={canApproveSuggestion}
              disabled={disabled}
              onAssign={() =>
                openSubmitTask({ kind: "journal", item: journal })
              }
              onApprove={() =>
                openVenueApproval({ kind: "journal", item: journal })
              }
              onEdit={() => openEditVenue({ kind: "journal", item: journal })}
              onDelete={() =>
                setDeleteVenue({ kind: "journal", item: journal })
              }
            />
          ))}
        </VenueSection>

        <VenueSection title="Conferences">
          {suggestedConferences.map((conference) => (
            <ConferenceCard
              key={conference.id}
              conference={conference}
              isAdmin={isAdmin}
              canAssignTask={canAssignTask}
              canApproveSuggestion={canApproveSuggestion}
              canEditVenue={canApproveSuggestion}
              disabled={disabled}
              onAssign={() =>
                openSubmitTask({ kind: "conference", item: conference })
              }
              onApprove={() =>
                openVenueApproval({ kind: "conference", item: conference })
              }
              onEdit={() =>
                openEditVenue({ kind: "conference", item: conference })
              }
              onDelete={() =>
                setDeleteVenue({ kind: "conference", item: conference })
              }
            />
          ))}
        </VenueSection>
      </div>

      {addOpen && (
        <ResearchModal
          open={addOpen}
          onClose={closeAddVenue}
          title="Add suggested venue"
          icon={<Plus className="h-5 w-5" />}
          maxWidth="max-w-3xl"
          bodyClassName="min-h-[25rem] px-5 py-4"
          headerActions={
            <ResearchButton
              type="button"
              onClick={addSelectedVenue}
              disabled={
                isPending ||
                (!selectedAddVenue &&
                  !freeVenueName.trim() &&
                  !freeVenueLink.trim())
              }
            >
              <Plus className="h-4 w-4" />
              Add venue
            </ResearchButton>
          }
        >
          <div className="grid gap-4">
            <div
              data-research-toggle-tabs="true"
              className="grid w-full grid-cols-2 border border-[#444444] bg-[#202020]"
            >
              {(["journal", "conference"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveAddTab(tab);
                    setSelectedAddVenue(null);
                  }}
                  data-research-toggle-tab="true"
                  data-active={activeAddTab === tab}
                  className={`cursor-pointer border-r border-[#303030] px-3 py-2 text-sm font-normal transition last:border-r-0 hover:border-[#444444] ${
                    activeAddTab === tab
                      ? "border-[#444444] bg-[#383838] text-[#A8DADC] shadow-none"
                      : "text-[#B0B0B0] hover:bg-[#303030] hover:text-[#E4E4E4]"
                  }`}
                >
                  {tab === "journal" ? "Journals" : "Conferences"}
                </button>
              ))}
            </div>

            {activeAddTab === "journal" ? (
              <>
                <SearchBox
                  value={journalQuery}
                  onChange={(value) => {
                    setJournalQuery(value);
                    setSelectedAddVenue(null);
                  }}
                  placeholder="Search journal name, ISSN, field, rank, publisher..."
                />
                <SelectedVenuePill
                  venue={selectedAddVenue}
                  onClear={() => setSelectedAddVenue(null)}
                />
                {!selectedAddVenue && (
                  <FreeVenueFields
                    name={freeVenueName}
                    link={freeVenueLink}
                    onNameChange={setFreeVenueName}
                    onLinkChange={setFreeVenueLink}
                    kind="journal"
                  />
                )}
                <textarea
                  value={freeVenueNote}
                  onChange={(event) => setFreeVenueNote(event.target.value)}
                  placeholder="Note for this suggested venue, for example why it fits this research, submission timing, or special reminder..."
                  aria-label="Suggested venue note"
                  className={`${researchTextareaClass} min-h-24`}
                />
                <ResultList
                  query={journalQuery}
                  idleText="Search and select one journal."
                  emptyText="No journal matches this search."
                >
                  {journalResults.map((journal) => (
                    <button
                      key={journal.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setSelectedAddVenue({ kind: "journal", item: journal });
                        setJournalQuery("");
                      }}
                      className={resultButtonClass(
                        selectedAddVenue?.kind === "journal" &&
                          selectedAddVenue.item.id === journal.id,
                      )}
                    >
                      <span className="block text-sm font-normal text-[#E4E4E4]">
                        {journal.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#B0B0B0]">
                        {journal.issn || "No ISSN"} -{" "}
                        {journal.field || "No field"} -{" "}
                        {journal.rank || "No rank"} -{" "}
                        {journal.publisher || "No publisher"}
                      </span>
                    </button>
                  ))}
                </ResultList>
              </>
            ) : (
              <>
                <SearchBox
                  value={conferenceQuery}
                  onChange={(value) => {
                    setConferenceQuery(value);
                    setSelectedAddVenue(null);
                  }}
                  placeholder="Search conference, organizer, theme, location..."
                />
                <SelectedVenuePill
                  venue={selectedAddVenue}
                  onClear={() => setSelectedAddVenue(null)}
                />
                {!selectedAddVenue && (
                  <FreeVenueFields
                    name={freeVenueName}
                    link={freeVenueLink}
                    onNameChange={setFreeVenueName}
                    onLinkChange={setFreeVenueLink}
                    kind="conference"
                  />
                )}
                <textarea
                  value={freeVenueNote}
                  onChange={(event) => setFreeVenueNote(event.target.value)}
                  placeholder="Note for this suggested venue, for example why it fits this research, deadline timing, or special reminder..."
                  aria-label="Suggested venue note"
                  className={`${researchTextareaClass} min-h-24`}
                />
                <ResultList
                  query={conferenceQuery}
                  idleText="Search and select one conference."
                  emptyText="No conference matches this search."
                >
                  {conferenceResults.map((conference) => (
                    <button
                      key={conference.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setSelectedAddVenue({
                          kind: "conference",
                          item: conference,
                        });
                        setConferenceQuery("");
                      }}
                      className={resultButtonClass(
                        selectedAddVenue?.kind === "conference" &&
                          selectedAddVenue.item.id === conference.id,
                      )}
                    >
                      <span className="block text-sm font-normal text-[#E4E4E4]">
                        {conference.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#B0B0B0]">
                        {conference.type || "No type"} -{" "}
                        {conference.theme || "No theme"} -{" "}
                        {conference.location || "No location"}
                      </span>
                    </button>
                  ))}
                </ResultList>
              </>
            )}
          </div>
        </ResearchModal>
      )}

      {editVenue && (
        <ResearchModal
          open={Boolean(editVenue)}
          onClose={closeEditVenue}
          title="Edit suggested venue"
          description={`Update the ${editVenue.kind} suggestion for this research.`}
          icon={<Pencil className="h-5 w-5" />}
          maxWidth="max-w-2xl"
          bodyClassName="min-h-[22rem] px-5 py-4"
          headerActions={
            <ResearchButton
              type="button"
              onClick={saveEditedVenue}
              disabled={
                isPending ||
                (!selectedEditTask &&
                  !selectedEditVenue &&
                  !editVenueName.trim() &&
                  !editVenueLink.trim())
              }
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving..." : "Save changes"}
            </ResearchButton>
          }
        >
          <div className="grid gap-4">
            {editVenueHasSystemLink ? (
              <FixedVenueSummary venue={editVenue} />
            ) : (
              <>
                <SearchBox
                  value={editVenueQuery}
                  onChange={setEditVenueQuery}
                  placeholder={
                    editVenue.kind === "journal"
                      ? "Search journal name, ISSN, rank, or publisher..."
                      : "Search conference, organizer, theme, or location..."
                  }
                />
                <SelectedVenuePill
                  venue={selectedEditVenue}
                  onClear={() => setSelectedEditVenue(null)}
                />
                <ResultList
                  query={editVenueQuery}
                  idleText={`Search to link another ${editVenue.kind}, or edit the information below.`}
                  emptyText={`No ${editVenue.kind} matches this search.`}
                >
                  {editVenueResults.map((venue) => (
                    <button
                      key={venue.item.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setSelectedEditVenue(venue);
                        setEditVenueName(venue.item.name);
                        setEditVenueLink(venue.item.venueLink);
                        setEditVenueQuery("");
                      }}
                      className={resultButtonClass(false)}
                    >
                      <span className="block text-sm font-normal text-[#E4E4E4]">
                        {venue.item.name}
                      </span>
                      <span className="mt-1 block text-xs text-[#B0B0B0]">
                        {venue.kind === "journal"
                          ? [
                              venue.item.issn || "No ISSN",
                              venue.item.rank || "No rank",
                              venue.item.publisher || "No publisher",
                            ].join(" - ")
                          : [
                              venue.item.type || "No type",
                              venue.item.theme || "No theme",
                              venue.item.location || "No location",
                            ].join(" - ")}
                      </span>
                    </button>
                  ))}
                </ResultList>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={editVenueName}
                    onChange={(event) => setEditVenueName(event.target.value)}
                    placeholder={`${editVenue.kind === "journal" ? "Journal" : "Conference"} name`}
                    aria-label="Suggested venue name"
                    className={researchFieldClass}
                  />
                  <input
                    value={editVenueLink}
                    onChange={(event) => setEditVenueLink(event.target.value)}
                    placeholder="Venue URL"
                    aria-label="Suggested venue URL"
                    className={researchFieldClass}
                  />
                </div>
              </>
            )}

            <textarea
              value={editVenueNote}
              onChange={(event) => setEditVenueNote(event.target.value)}
              placeholder="Note for this suggested venue..."
              aria-label="Suggested venue note"
              className={`${researchTextareaClass} min-h-24`}
            />

            <section className="grid gap-2 border-t border-[#D8D0C2] pt-4 dark:border-[#444444]">
              <span className="text-xs font-normal uppercase tracking-wide text-[#6C778D] dark:text-[#B0B0B0]">
                Suggest venue task
              </span>
              <SelectedTaskPill
                task={selectedEditTask}
                locked={editTaskLocked}
                onClear={() => setSelectedEditTask(null)}
              />
              {!editTaskLocked ? (
                <>
                  <div ref={editTaskSearchRef} className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C95A4] dark:text-[#B0B0B0]" />
                    <input
                      value={editTaskQuery}
                      onChange={(event) => setEditTaskQuery(event.target.value)}
                      placeholder="Search suggest venue task by title, ID, assignee, or status..."
                      className={`${researchSearchFieldClass} pl-9`}
                    />
                    <FloatingDropdownPortal
                      anchorRef={editTaskSearchRef}
                      open={editTaskQuery.trim().length > 0}
                      maxPanelHeight={224}
                    >
                      <div className={researchDropdownPanelClass}>
                        <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                          {editTaskResults.length > 0 ? (
                            editTaskResults.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setSelectedEditTask(task);
                                  setEditTaskQuery("");
                                }}
                                className={`${researchDropdownItemClass} ${researchDropdownItemIdleClass} justify-start px-3`}
                              >
                                <ClipboardList className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm">
                                    {task.title}
                                  </span>
                                  <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                                    {task.taskCode} -{" "}
                                    {task.status.replaceAll("_", " ")}
                                    {task.assignees
                                      ? ` - ${task.assignees}`
                                      : ""}
                                  </span>
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                              No suggest venue task matches this search.
                            </div>
                          )}
                        </div>
                      </div>
                    </FloatingDropdownPortal>
                  </div>
                </>
              ) : (
                <p className="text-xs leading-5 text-[#6C778D] dark:text-[#B0B0B0]">
                  This linked task is complete, so the task connection cannot be
                  changed.
                </p>
              )}
            </section>
          </div>
        </ResearchModal>
      )}

      {deleteVenue && (
        <ResearchConfirmDialog
          open={Boolean(deleteVenue)}
          title="Remove suggestion?"
          description={`Remove ${deleteVenue.item.name} from suggested venues for this research? Linked submit tasks and draft submissions created from this suggestion will also be removed. Accepted or published submissions will block deletion.`}
          confirmLabel="Remove suggestion"
          isConfirming={isPending}
          onCancel={() => setDeleteVenue(null)}
          onConfirm={removeVenue}
        />
      )}

      {approveVenue && (
        <ResearchModal
          open={Boolean(approveVenue)}
          onClose={() => {
            setApproveVenue(null);
            setApprovalVenue(null);
            setDeclineConfirmOpen(false);
            setJournalTaskConfirmOpen(false);
            setAutoCreateJournalTask(true);
            setAutoCreateSubmitTask(true);
            setDeclineReason("");
            setJournalQuery("");
            setConferenceQuery("");
          }}
          title="Approve venue suggestion"
          icon={<Check className="h-5 w-5" />}
          maxWidth="max-w-2xl"
          bodyClassName="px-5 py-4"
          headerActions={
            <div className="flex items-center gap-2">
              <ResearchButton
                type="button"
                tone="danger"
                onClick={() => setDeclineConfirmOpen(true)}
              >
                <Ban className="h-4 w-4" />
                Decline
              </ResearchButton>
              <ResearchButton
                type={approvalUsesJournalTask ? "button" : "submit"}
                form={
                  approvalUsesJournalTask
                    ? undefined
                    : "approve-suggested-venue-form"
                }
                onClick={
                  approvalUsesJournalTask
                    ? () => setJournalTaskConfirmOpen(true)
                    : undefined
                }
                disabled={
                  isPending ||
                  (isUnlinkedJournalApproval &&
                    !autoCreateJournalTask &&
                    approvalVenue?.kind !== "journal") ||
                  (!approveVenue.item.venueId &&
                    approveVenue.kind === "conference" &&
                    approvalVenue?.kind !== "conference")
                }
              >
                <Check className="h-4 w-4" />
                Approve
              </ResearchButton>
            </div>
          }
        >
          <form
            id="approve-suggested-venue-form"
            action={approveSuggestion}
            className="grid gap-4"
          >
            <div className="border border-[#444444] bg-[#202020] px-3 py-2 text-sm text-[#B0B0B0]">
              <p className="font-normal text-[#E4E4E4]">
                {approveVenue.item.name}
              </p>
              {approveVenue.item.venueLink && (
                <a
                  href={approveVenue.item.venueLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs text-[#A8DADC] transition hover:text-[#C9F0F2]"
                >
                  {approveVenue.item.venueLink}
                </a>
              )}
            </div>
            {!approveVenue.item.venueId && (
              <>
                {approveVenue.kind === "journal" ? (
                  <label className="flex cursor-pointer items-start gap-3 border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-slate-700 transition hover:border-sky-300 dark:border-sky-800/60 dark:bg-sky-950/20 dark:text-[#D0D0D0] dark:hover:border-sky-700">
                    <input
                      type="checkbox"
                      checked={autoCreateJournalTask}
                      onChange={(event) => {
                        setAutoCreateJournalTask(event.target.checked);
                        if (event.target.checked) {
                          setApprovalVenue(null);
                          setJournalQuery("");
                        }
                      }}
                      className="mt-0.5 h-4 w-4 flex-none accent-[#1F7180]"
                    />
                    <span className="min-w-0">
                      <span className="block font-normal text-slate-900 dark:text-[#E4E4E4]">
                        Assign an Add Journal task automatically
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-[#B0B0B0]">
                        The suggestion stays pending until the assistant adds
                        the journal and that journal is approved.
                      </span>
                    </span>
                  </label>
                ) : null}

                {!autoCreateJournalTask ||
                approveVenue.kind === "conference" ? (
                  <>
                    <p className="text-sm text-[#B0B0B0]">
                      Link this suggestion to an existing {approveVenue.kind}
                      before approving it.
                    </p>
                    <ApprovalVenuePicker
                      kind={approveVenue.kind}
                      query={
                        approveVenue.kind === "journal"
                          ? journalQuery
                          : conferenceQuery
                      }
                      selectedVenue={approvalVenue}
                      journals={journalResults}
                      conferences={conferenceResults}
                      onQueryChange={(value) => {
                        if (approveVenue.kind === "journal")
                          setJournalQuery(value);
                        else setConferenceQuery(value);
                        setApprovalVenue(null);
                      }}
                      onSelect={(venue) => {
                        setApprovalVenue(venue);
                        setAutoCreateJournalTask(false);
                        if (venue.kind === "journal")
                          setJournalQuery(venue.item.name);
                        else setConferenceQuery(venue.item.name);
                      }}
                      onClear={() => {
                        setApprovalVenue(null);
                        if (approveVenue.kind === "journal")
                          setJournalQuery("");
                        else setConferenceQuery("");
                      }}
                    />
                  </>
                ) : (
                  <p className="text-xs leading-5 text-sky-700 dark:text-sky-200">
                    Approval will create a one-journal task due tomorrow and
                    assign it to the venue suggester using guide G003.
                  </p>
                )}
              </>
            )}
            {approvalCanCreateSubmitTask ? (
              <label className="flex cursor-pointer items-start gap-3 border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 text-sm text-[#475467] transition hover:border-[#1F7180]/45 hover:bg-[#F8FBFA] dark:border-[#444444] dark:bg-[#202020] dark:text-[#D0D0D0] dark:hover:border-[#A8DADC]/45 dark:hover:bg-[#262626]">
                <input
                  type="checkbox"
                  checked={autoCreateSubmitTask}
                  onChange={(event) =>
                    setAutoCreateSubmitTask(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 flex-none accent-[#1F7180]"
                />
                <span className="min-w-0">
                  <span className="block font-normal text-slate-900 dark:text-[#E4E4E4]">
                    Assign submit task automatically
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-[#B0B0B0]">
                    The task will be assigned to the suggester, with the same
                    assigner and checker as the suggested-venue task.
                  </span>
                </span>
              </label>
            ) : null}
            {!approvalUsesJournalTask ? (
              <label className="grid gap-1.5">
                <span className="text-xs font-normal uppercase tracking-wide text-slate-600 dark:text-[#B0B0B0]">
                  Approval note
                </span>
                <textarea
                  name="approvalNote"
                  rows={3}
                  placeholder="Optional note about this approval, for example why this venue fits the research or what to watch during submission."
                  className={researchTextareaClass}
                />
              </label>
            ) : null}
          </form>
        </ResearchModal>
      )}

      {approveVenue && (
        <ResearchConfirmDialog
          open={journalTaskConfirmOpen}
          title="Assign an Add Journal task?"
          confirmLabel={isPending ? "Assigning..." : "Assign task"}
          confirmIcon={<Check className="h-4 w-4" />}
          isConfirming={isPending}
          onCancel={() => setJournalTaskConfirmOpen(false)}
          onConfirm={confirmJournalTaskApproval}
        >
          <p>
            This will assign a one-day Add Journal task to the assistant who
            suggested{" "}
            <span className="font-normal text-slate-950 dark:text-[#E4E4E4]">
              {approveVenue.item.name}
            </span>
            .
          </p>
          <p className="text-xs leading-5 text-slate-500 dark:text-[#8F98A8]">
            Guide G003 will be attached. The venue suggestion remains pending
            until the journal is added and approved.
          </p>
        </ResearchConfirmDialog>
      )}

      {approveVenue && (
        <ResearchConfirmDialog
          open={declineConfirmOpen}
          title="Decline venue suggestion?"
          confirmLabel={isPending ? "Declining..." : "Confirm decline"}
          confirmIcon={<Ban className="h-4 w-4" />}
          isConfirming={isPending}
          confirmDisabled={!declineReason.trim()}
          tone="danger"
          onCancel={() => {
            setDeclineConfirmOpen(false);
            setDeclineReason("");
          }}
          onConfirm={declineSuggestion}
        >
          <p>
            Decline{" "}
            <span className="font-normal text-slate-950 dark:text-[#E4E4E4]">
              {approveVenue.item.name}
            </span>
            ? The suggestion will remain visible with a declined badge.
          </p>
          <label className="grid gap-1.5">
            <span className="text-xs font-normal uppercase tracking-wide text-slate-600 dark:text-[#B0B0B0]">
              Decline note
            </span>
            <textarea
              autoFocus
              required
              rows={4}
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              placeholder="Explain why this venue is not suitable for the research."
              className={researchTextareaClass}
            />
          </label>
          <p className="text-xs text-slate-500 dark:text-[#8F98A8]">
            This reason will be included in the notification sent to the person
            who suggested the venue.
          </p>
        </ResearchConfirmDialog>
      )}

      {assignVenue && (
        <ResearchModal
          open={Boolean(assignVenue)}
          onClose={() => {
            setAssignVenue(null);
            setSelectedAssistantIds([]);
            setAssistantQuery("");
            setSelectedCheckerId("");
            setCheckerQuery("");
            setSelectedAccountId("");
            setAccountOpen(false);
            setTaskMode("submit");
            setAllowReportUpload(false);
          }}
          title="Assign task"
          description={`Create a task for ${assignName}.`}
          icon={<ClipboardList className="h-5 w-5" />}
          maxWidth="max-w-4xl"
          bodyClassName="px-0 py-0"
          headerActions={
            <ResearchButton
              form="suggested-venue-task-form"
              disabled={
                selectedAssistantIds.length === 0 ||
                (accountRequired && !selectedAccountId) ||
                isPending
              }
            >
              <Plus className="h-4 w-4" />
              Assign Task
            </ResearchButton>
          }
        >
          <form
            id="suggested-venue-task-form"
            action={assignTask}
            className="grid gap-5 px-6 py-5"
          >
            {selectedAssistantIds.map((id) => (
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
            <input type="hidden" name="projectId" value={projectId} />
            {assignKind === "journal" ? (
              <>
                <input
                  type="hidden"
                  name="journalId"
                  value={assignVenue.item.venueId}
                />
                {selectedAccountId ? (
                  <input
                    type="hidden"
                    name="accountId"
                    value={selectedAccountId}
                  />
                ) : null}
                <input
                  type="hidden"
                  name="suggestedJournalId"
                  value={assignVenue.item.id}
                />
              </>
            ) : (
              <>
                <input
                  type="hidden"
                  name="conferenceId"
                  value={assignVenue.item.venueId}
                />
                <input
                  type="hidden"
                  name="suggestedConferenceId"
                  value={assignVenue.item.id}
                />
              </>
            )}
            <input
              type="hidden"
              name="taskType"
              value={
                taskMode === "submit"
                  ? assignKind === "journal"
                    ? "SUBMIT_RESEARCH"
                    : "SUBMIT_CONFERENCE"
                  : "OTHER"
              }
            />
            <input
              type="hidden"
              name="category"
              value={taskMode === "submit" ? "Submitting" : "Production"}
            />

            <div
              data-research-toggle-tabs="true"
              className="grid w-full grid-cols-2 border border-[#444444] bg-[#202020]"
            >
              {(["submit", "other"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTaskMode(mode)}
                  data-research-toggle-tab="true"
                  data-active={taskMode === mode}
                  className={`cursor-pointer border-r border-[#303030] px-3 py-2 text-sm font-normal transition last:border-r-0 hover:border-[#444444] ${
                    taskMode === mode
                      ? "border-[#444444] bg-[#383838] text-[#A8DADC] shadow-none"
                      : "text-[#B0B0B0] hover:bg-[#303030] hover:text-[#E4E4E4]"
                  }`}
                >
                  {mode === "submit" ? `Submit to ${assignKind}` : "Other task"}
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <label className="grid gap-1.5">
                <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
                  Task title
                  <span className="research-required-mark">(*)</span>
                </span>
                <input
                  name="title"
                  required
                  defaultValue={
                    taskMode === "submit"
                      ? `Submit "${projectTitle}" to ${assignName}`
                      : `Task for "${projectTitle}"`
                  }
                  className={researchFieldClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
                  Due date
                </span>
                <ResearchDatePicker
                  name="dueDate"
                  defaultValue={defaultResearchTaskDueDate()}
                />
              </label>
            </div>

            <div className="grid gap-4">
              <ReadOnlyField label="Research" value={projectTitle} />
              <ReadOnlyField
                label={assignKind === "journal" ? "Journal" : "Conference"}
                value={assignName}
              />
            </div>

            {taskMode === "submit" && assignVenue.kind === "journal" ? (
              <section className="grid gap-3 border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#202020]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-normal uppercase tracking-wide text-[#6C778D] dark:text-[#B0B0B0]">
                    Account to submit
                    {accountRequired ? (
                      <span className="research-required-mark">(*)</span>
                    ) : null}
                  </span>
                </div>
                {assignJournalAccounts.length > 0 ? (
                  <div ref={accountDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setAccountOpen((current) => !current)}
                      className={cx(
                        "flex cursor-pointer items-center justify-between gap-3 text-left",
                        researchSelectTriggerClass,
                        accountOpen &&
                          "border-[#A8DADC] bg-[#f8f6ef] dark:bg-[#383838]",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {selectedAccount
                          ? `${selectedAccount.username}${selectedAccount.email ? ` - ${selectedAccount.email}` : ""}`
                          : accountRequired
                            ? "Choose the account for this task"
                            : "Choose an account"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 flex-none text-[#6C778D] transition dark:text-[#B0B0B0] ${accountOpen ? "rotate-180 text-[#1F7180] dark:text-[#A8DADC]" : ""}`}
                      />
                    </button>
                    <FloatingDropdownPortal
                      anchorRef={accountDropdownRef}
                      open={accountOpen}
                      maxWidth={640}
                      maxPanelHeight={232}
                    >
                      <div className={researchDropdownPanelClass}>
                        <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                          {assignJournalAccounts.map((account) => (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => {
                                setSelectedAccountId(account.id);
                                setAccountOpen(false);
                              }}
                              className={`${researchDropdownItemClass} ${
                                selectedAccountId === account.id
                                  ? researchDropdownItemActiveClass
                                  : researchDropdownItemIdleClass
                              }`}
                            >
                              <span className="min-w-0 px-3">
                                <span className="block truncate font-normal">
                                  {account.username}
                                </span>
                                <span className="block text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                                  {account.email || "No email"}
                                </span>
                              </span>
                              {selectedAccountId === account.id ? (
                                <Check className="mr-3 h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    </FloatingDropdownPortal>
                  </div>
                ) : (
                  <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    This journal does not have any account yet. You can assign
                    this task now and add the account later.
                  </p>
                )}
              </section>
            ) : null}

            <label className="grid gap-1.5">
              <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
                Note
              </span>
              <textarea
                key={taskMode}
                name="description"
                rows={3}
                placeholder="Description, expected output, files, or notes"
                className={researchTextareaClass}
              />
            </label>

            <TaskGuidePicker
              guides={taskGuideOptions}
              selectedIds={selectedTaskGuideIds}
              onChange={setSelectedTaskGuideIds}
            />

            <section className="grid gap-3">
              {selectedAssistants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedAssistants.map((assistant) => (
                    <button
                      key={assistant.id}
                      type="button"
                      onClick={() => toggleAssistant(assistant.id)}
                      className="inline-flex cursor-pointer items-center gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-2.5 py-1.5 text-xs text-[#243047] transition hover:border-[#A8DADC] hover:text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4] dark:hover:border-[#A8DADC]"
                    >
                      {displayResearchPersonName(assistant)}
                      <X className="h-3.5 w-3.5 text-[#6C778D] dark:text-[#B0B0B0]" />
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
                <div className="grid gap-4">
                  <div ref={assistantDropdownRef} className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6C778D] dark:text-[#B0B0B0]" />
                    <input
                      value={assistantQuery}
                      onChange={(event) =>
                        setAssistantQuery(event.target.value)
                      }
                      placeholder="Search task assignees by name, email, ID, or role (*)"
                      className={`${researchSearchFieldClass} pl-9`}
                    />
                  </div>
                  <FloatingDropdownPortal
                    anchorRef={assistantDropdownRef}
                    open={Boolean(assistantQuery.trim())}
                    maxWidth={820}
                    maxPanelHeight={232}
                  >
                    <div className={researchDropdownPanelClass}>
                      <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                        {assistantResults.map((assistant) => (
                          <button
                            key={assistant.id}
                            type="button"
                            onClick={() => toggleAssistant(assistant.id)}
                            className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
                          >
                            <span className="flex min-w-0 items-center gap-3 px-3">
                              <UserRound className="h-4 w-4 flex-none text-[#6C778D] dark:text-[#B0B0B0]" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-normal">
                                  {displayResearchPersonName(assistant)}
                                </span>
                                <span className="block truncate text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                                  {displayResearchEmail(assistant.email)}
                                </span>
                              </span>
                            </span>
                          </button>
                        ))}
                        {assistantQuery.trim() &&
                        assistantResults.length === 0 ? (
                          <p className="py-10 text-center text-sm text-[#6C778D] dark:text-[#B0B0B0]">
                            No user matches this search.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </FloatingDropdownPortal>
                  {canChooseChecker ? (
                    <section className="grid gap-3">
                      {selectedChecker ? (
                        <button
                          type="button"
                          onClick={() => selectChecker("")}
                          className="inline-flex w-fit cursor-pointer items-center gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-2.5 py-1.5 text-xs text-[#243047] transition hover:border-[#A8DADC] hover:text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4] dark:hover:border-[#A8DADC]"
                        >
                          {displayResearchPersonName(selectedChecker)}
                          <span className="text-[#6C778D] dark:text-[#B0B0B0]">
                            Chief assistant checker
                          </span>
                          <X className="h-3.5 w-3.5 text-[#6C778D] dark:text-[#B0B0B0]" />
                        </button>
                      ) : null}
                      <div ref={checkerDropdownRef} className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6C778D] dark:text-[#B0B0B0]" />
                        <input
                          value={checkerQuery}
                          onChange={(event) =>
                            setCheckerQuery(event.target.value)
                          }
                          placeholder="Search chief assistant checker (optional)"
                          className={`${researchSearchFieldClass} pl-9`}
                        />
                      </div>
                      <FloatingDropdownPortal
                        anchorRef={checkerDropdownRef}
                        open={Boolean(checkerQuery.trim())}
                        maxWidth={820}
                        maxPanelHeight={232}
                      >
                        <div className={researchDropdownPanelClass}>
                          <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                            {checkerResults.map((checker) => (
                              <button
                                key={checker.id}
                                type="button"
                                onClick={() => selectChecker(checker.id)}
                                className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
                              >
                                <span className="flex min-w-0 items-center gap-3 px-3">
                                  <UserRound className="h-4 w-4 flex-none text-[#6C778D] dark:text-[#B0B0B0]" />
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-normal">
                                      {displayResearchPersonName(checker)}
                                    </span>
                                    <span className="block truncate text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                                      {displayResearchEmail(checker.email)}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            ))}
                            {checkerQuery.trim() &&
                            checkerResults.length === 0 ? (
                              <p className="py-10 text-center text-sm text-[#6C778D] dark:text-[#B0B0B0]">
                                No chief assistant matches this search.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </FloatingDropdownPortal>
                    </section>
                  ) : null}
                </div>
                <div className="lg:pt-0">
                  <ReportUploadPermissionField
                    checked={allowReportUpload}
                    onChange={setAllowReportUpload}
                  />
                </div>
              </div>
            </section>
          </form>
        </ResearchModal>
      )}
    </ResearchDetailSection>
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

function resultButtonClass(selected: boolean) {
  return `cursor-pointer border-t px-3 py-2 text-left transition first:border-t-transparent first:hover:border-t-transparent disabled:cursor-wait ${
    selected
      ? "border-[#444444] bg-[#303030]"
      : "border-transparent bg-[#202020] hover:border-[#444444] hover:bg-[#303030]"
  }`;
}

function ApprovalVenuePicker({
  kind,
  query,
  selectedVenue,
  journals,
  conferences,
  onQueryChange,
  onSelect,
  onClear,
}: {
  kind: "journal" | "conference";
  query: string;
  selectedVenue: Venue | null;
  journals: SuggestedJournalOption[];
  conferences: SuggestedConferenceOption[];
  onQueryChange: (value: string) => void;
  onSelect: (venue: Venue) => void;
  onClear: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const results = kind === "journal" ? journals : conferences;
  const showDropdown = !selectedVenue && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className="relative z-30">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6C778D] dark:text-[#B0B0B0]" />
      <input
        value={selectedVenue ? selectedVenue.item.name : query}
        onChange={(event) => onQueryChange(event.target.value)}
        readOnly={Boolean(selectedVenue)}
        placeholder={
          kind === "journal"
            ? "Search journal to link..."
            : "Search conference to link..."
        }
        className={`${researchSearchFieldClass} pr-10 pl-9`}
      />
      {selectedVenue ? (
        <IconHint label="Clear selection" position="bottom">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selected venue"
            className="research-clickable-icon research-allow-transform absolute right-3 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#6C778D] shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:bg-transparent hover:text-[#1F7180] hover:shadow-none focus-visible:ring-0 active:scale-95 dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
          >
            <X className="h-4 w-4" />
          </button>
        </IconHint>
      ) : null}
      <FloatingDropdownPortal
        anchorRef={wrapperRef}
        open={showDropdown}
        maxWidth={760}
        maxPanelHeight={232}
      >
        <div className={researchDropdownPanelClass}>
          <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect({ kind, item } as Venue)}
                className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
              >
                <span className="min-w-0 px-3">
                  <span className="block truncate text-sm font-normal">
                    {item.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                    {kind === "journal"
                      ? `${(item as SuggestedJournalOption).issn || "No ISSN"} | ${
                          (item as SuggestedJournalOption).publisher ||
                          "No publisher"
                        }`
                      : `${
                          (item as SuggestedConferenceOption).organizer ||
                          "No organizer"
                        } | ${
                          (item as SuggestedConferenceOption).location ||
                          "No location"
                        }`}
                  </span>
                </span>
              </button>
            ))}
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#6C778D] dark:text-[#B0B0B0]">
                No {kind} matches this search.
              </p>
            ) : null}
          </div>
        </div>
      </FloatingDropdownPortal>
    </div>
  );
}

function SelectedVenuePill({
  venue,
  onClear,
}: {
  venue: Venue | null;
  onClear: () => void;
}) {
  if (!venue) return null;

  return (
    <div className="flex items-center justify-between gap-3 border border-[#444444] bg-[#202020] px-3 py-2">
      <span className="min-w-0">
        <span className="block truncate text-sm font-normal text-[#E4E4E4]">
          {venue.item.name}
        </span>
        <span className="block truncate text-xs text-[#B0B0B0]">
          Selected {venue.kind}
        </span>
      </span>
      <IconHint label="Clear selection">
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selected venue"
          className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition hover:text-[#A8DADC]"
        >
          <X className="h-4 w-4" />
        </button>
      </IconHint>
    </div>
  );
}

function FixedVenueSummary({ venue }: { venue: Venue }) {
  const details =
    venue.kind === "journal"
      ? [
          venue.item.issn || "No ISSN",
          venue.item.field || "No field",
          venue.item.publisher || "No publisher",
          venue.item.rank || "No rank",
        ]
      : [
          venue.item.type || "No type",
          venue.item.theme || "No theme",
          venue.item.location || "No location",
          venue.item.organizer || "No organizer",
        ];

  return (
    <div className="border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 text-sm dark:border-[#444444] dark:bg-[#202020]">
      <span className="text-xs font-normal uppercase tracking-wide text-[#6C778D] dark:text-[#B0B0B0]">
        Linked {venue.kind}
      </span>
      <p className="mt-1 break-words text-sm font-normal text-[#243047] dark:text-[#E4E4E4]">
        {venue.item.name}
      </p>
      <p className="mt-1 break-words text-xs leading-5 text-[#6C778D] dark:text-[#B0B0B0]">
        {details.join(" - ")}
      </p>
    </div>
  );
}

function SelectedTaskPill({
  task,
  locked,
  onClear,
}: {
  task: SuggestedVenueTaskOption | null;
  locked: boolean;
  onClear: () => void;
}) {
  if (!task) {
    return (
      <div className="border border-dashed border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 text-sm text-[#6C778D] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
        No suggest venue task connected.
      </div>
    );
  }

  return (
    <div className="flex max-w-full items-center justify-between gap-3 overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-2 dark:border-[#444444] dark:bg-[#202020]">
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-sm font-normal text-[#243047] dark:text-[#E4E4E4]">
          {task.title}
        </span>
        <span className="block truncate text-xs text-[#6C778D] dark:text-[#B0B0B0]">
          {task.taskCode} - {task.status.replaceAll("_", " ")}
          {task.assignees ? ` - ${task.assignees}` : ""}
        </span>
      </span>
      {!locked ? (
        <IconHint label="Clear task connection">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selected task"
            className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[#6C778D] transition hover:text-[#1F7180] dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
          >
            <X className="h-4 w-4" />
          </button>
        </IconHint>
      ) : null}
    </div>
  );
}

function FreeVenueFields({
  name,
  link,
  onNameChange,
  onLinkChange,
  kind,
}: {
  name: string;
  link: string;
  onNameChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  kind: "journal" | "conference";
}) {
  return (
    <div className="grid gap-3 border border-[#444444] bg-[#202020] p-3 animate-[modalPanelIn_220ms_ease-out] sm:grid-cols-2">
      <label className="grid gap-1.5">
        <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
          {kind === "journal" ? "Journal name" : "Conference name"}
        </span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Venue name"
          className={researchFieldClass}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
          Link
        </span>
        <input
          value={link}
          onChange={(event) => onLinkChange(event.target.value)}
          placeholder="Homepage or submission link"
          className={researchFieldClass}
        />
      </label>
    </div>
  );
}

function VenueSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  if (!hasChildren) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
        {title}
      </h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function JournalCard({
  journal,
  isAdmin,
  canAssignTask,
  canApproveSuggestion,
  canEditVenue,
  disabled,
  onAssign,
  onApprove,
  onEdit,
  onDelete,
}: {
  journal: SuggestedJournalOption;
  isAdmin: boolean;
  canAssignTask: boolean;
  canApproveSuggestion: boolean;
  canEditVenue: boolean;
  disabled: boolean;
  onAssign: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      canAssignTask={canAssignTask}
      canApproveSuggestion={canApproveSuggestion}
      canEditVenue={canEditVenue}
      disabled={disabled}
      state={journal.venueState ?? { state: "idle" }}
      onAssign={onAssign}
      onApprove={onApprove}
      onEdit={onEdit}
      onDelete={onDelete}
      assignLabel="Assign journal submission task"
      deleteLabel="Delete suggested journal"
      title={
        <p className="font-normal text-slate-900 dark:text-[#E4E4E4]">
          {journal.name}
        </p>
      }
    >
      {journal.venueId ? (
        <>
          <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            {journal.field || "No field"}
          </p>
          <p className="mt-1 flex flex-wrap items-center text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            <span>{journal.publisher || "No publisher"}</span>
            <span
              className="px-2 text-[#98A2B3] dark:text-[#777777]"
              aria-hidden="true"
            >
              |
            </span>
            <span>{journal.rank || "No rank"}</span>
          </p>
          <VenueFees
            apc={journal.apc}
            apcCurrency={journal.apcCurrency}
            hasApcOption={journal.hasApcOption}
            submissionFee={journal.submissionFee}
            submissionFeeCurrency={journal.submissionFeeCurrency}
          />
          {journal.note.trim() ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
              <span className="font-normal text-[#344054] dark:text-[#E4E4E4]">
                Journal note:
              </span>{" "}
              {journal.note}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs font-normal text-amber-700 dark:text-[#E8C47A]">
          Journal not in system
        </p>
      )}
      <VenueAttribution
        name={journal.suggestedByName}
        email={journal.suggestedByEmail}
        showApproval={
          Boolean(journal.requiresApproval) && journal.status === "APPROVED"
        }
        approvedByName={journal.approvedByName}
        approvedByEmail={journal.approvedByEmail}
      />
      <VenueDecisionNote
        status={journal.status}
        approvalNote={journal.approvalNote}
        declineReason={journal.declineReason}
      />
      {journal.venueNote.trim() ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          <span className="font-normal text-[#344054] dark:text-[#E4E4E4]">
            Note:
          </span>{" "}
          {journal.venueNote}
        </p>
      ) : null}
    </VenueCard>
  );
}

function ConferenceCard({
  conference,
  isAdmin,
  canAssignTask,
  canApproveSuggestion,
  canEditVenue,
  disabled,
  onAssign,
  onApprove,
  onEdit,
  onDelete,
}: {
  conference: SuggestedConferenceOption;
  isAdmin: boolean;
  canAssignTask: boolean;
  canApproveSuggestion: boolean;
  canEditVenue: boolean;
  disabled: boolean;
  onAssign: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      canAssignTask={canAssignTask}
      canApproveSuggestion={canApproveSuggestion}
      canEditVenue={canEditVenue}
      disabled={disabled}
      state={conference.venueState ?? { state: "idle" }}
      onAssign={onAssign}
      onApprove={onApprove}
      onEdit={onEdit}
      onDelete={onDelete}
      assignLabel="Assign conference submission task"
      deleteLabel="Delete suggested conference"
      title={
        <p className="font-normal text-slate-900 dark:text-[#E4E4E4]">
          {conference.name}
        </p>
      }
    >
      <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
        {conference.type || "No type"} - {conference.theme || "No theme"}
      </p>
      <p className="mt-2 text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
        {[conference.time, conference.location].filter(Boolean).join(" - ") ||
          "Time/location not set"}
      </p>
      <VenueFees
        apc={conference.apc}
        apcCurrency={conference.apcCurrency}
        submissionFee={conference.submissionFee}
        submissionFeeCurrency={conference.submissionFeeCurrency}
      />
      {conference.note.trim() ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          <span className="font-normal text-[#344054] dark:text-[#E4E4E4]">
            Conference note:
          </span>{" "}
          {conference.note}
        </p>
      ) : null}
      <VenueAttribution
        name={conference.suggestedByName}
        email={conference.suggestedByEmail}
        showApproval={
          Boolean(conference.requiresApproval) &&
          conference.status === "APPROVED"
        }
        approvedByName={conference.approvedByName}
        approvedByEmail={conference.approvedByEmail}
      />
      <VenueDecisionNote
        status={conference.status}
        approvalNote={conference.approvalNote}
        declineReason={conference.declineReason}
      />
      {conference.venueNote.trim() ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          <span className="font-normal text-[#344054] dark:text-[#E4E4E4]">
            Note:
          </span>{" "}
          {conference.venueNote}
        </p>
      ) : null}
    </VenueCard>
  );
}

function VenueFees({
  apc,
  apcCurrency,
  hasApcOption = false,
  submissionFee,
  submissionFeeCurrency,
}: {
  apc: string;
  apcCurrency: string;
  hasApcOption?: boolean;
  submissionFee: string;
  submissionFeeCurrency: string;
}) {
  const normalizedApc = normalizeResearchNumberInput(apc);
  const apcValue = Number(normalizedApc || 0);
  const apcIsFree = !Number.isFinite(apcValue) || apcValue <= 0;
  const apcIsHigh = apcValue > 1000;
  const normalizedFee = normalizeResearchNumberInput(submissionFee);
  const feeValue = Number(normalizedFee || 0);
  const feeIsFree = !Number.isFinite(feeValue) || feeValue <= 0;
  const feeIsHigh = feeValue > 1000;

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1 text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
      <span>APC:</span>
      <span
        className={
          apcIsFree
            ? "font-normal text-emerald-700 dark:text-emerald-300"
            : apcIsHigh
              ? "font-normal text-rose-700 dark:text-rose-300"
              : "font-normal text-[#344054] dark:text-[#E4E4E4]"
        }
      >
        {apcIsFree
          ? "free"
          : `${currencySymbol(apcCurrency)} ${formatResearchNumber(apc)}`}
      </span>
      {hasApcOption ? <span>- Option</span> : null}
      <span className="mx-1 text-[#98A2B3] dark:text-[#777777]">|</span>
      <span>Fee:</span>
      <span
        className={
          feeIsFree
            ? "font-normal text-emerald-700 dark:text-emerald-300"
            : feeIsHigh
              ? "font-normal text-rose-700 dark:text-rose-300"
              : "font-normal text-[#344054] dark:text-[#E4E4E4]"
        }
      >
        {feeIsFree
          ? "free"
          : `${currencySymbol(submissionFeeCurrency)} ${formatResearchNumber(
              submissionFee,
            )}`}
      </span>
    </p>
  );
}

function VenueAttribution({
  name,
  email,
  showApproval,
  approvedByName,
  approvedByEmail,
}: {
  name?: string;
  email?: string;
  showApproval: boolean;
  approvedByName?: string;
  approvedByEmail?: string;
}) {
  return (
    <div className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-xs leading-5 text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0]">
      <p className="whitespace-normal break-words">
        Suggested by{" "}
        <span className="font-normal text-slate-900 dark:text-[#E4E4E4]">
          {name || "Unknown user"}
          <AttributionSeparator />
          {email || "Unknown email"}
        </span>
      </p>
      {showApproval && approvedByName && approvedByEmail ? (
        <p className="whitespace-normal break-words">
          Approved by{" "}
          <span className="font-normal text-slate-900 dark:text-[#E4E4E4]">
            {approvedByName}
            <AttributionSeparator />
            {approvedByEmail}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function VenueDecisionNote({
  status,
  approvalNote,
  declineReason,
}: {
  status: string;
  approvalNote?: string;
  declineReason?: string;
}) {
  const note =
    status === "APPROVED"
      ? approvalNote?.trim()
      : status === "DECLINED"
        ? declineReason?.trim()
        : "";
  if (!note) return null;

  return (
    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
      <span className="font-normal text-[#344054] dark:text-[#E4E4E4]">
        {status === "APPROVED" ? "Approval note:" : "Decline note:"}
      </span>{" "}
      {note}
    </p>
  );
}

function AttributionSeparator() {
  return (
    <span className="px-1.5 text-[#98A2B3] dark:text-[#777777]" aria-hidden>
      |
    </span>
  );
}

function VenueCard({
  isAdmin,
  canAssignTask,
  canApproveSuggestion,
  canEditVenue,
  disabled,
  state,
  onAssign,
  onApprove,
  onEdit,
  onDelete,
  assignLabel,
  deleteLabel,
  title,
  children,
}: {
  isAdmin: boolean;
  canAssignTask: boolean;
  canApproveSuggestion: boolean;
  canEditVenue: boolean;
  disabled: boolean;
  state: SuggestedVenueState;
  onAssign: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onDelete: () => void;
  assignLabel: string;
  deleteLabel: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const meta = venueStateMeta(state);
  const canAssign =
    canAssignTask &&
    !disabled &&
    (state.state === "idle" ||
      state.state === "rejected" ||
      state.state === "withdrawn");
  const canApprove =
    canApproveSuggestion && !disabled && state.state === "pendingApproval";
  const canEdit =
    canEditVenue &&
    !disabled &&
    ["idle", "pendingApproval", "declined", "rejected", "withdrawn"].includes(
      state.state,
    );
  const canDelete = isAdmin && !disabled;
  const showActions = canEdit || canAssign || canDelete;

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!canApprove || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onApprove();
  }

  return (
    <div
      role={canApprove ? "button" : undefined}
      tabIndex={canApprove ? 0 : undefined}
      aria-label={
        canApprove ? "Review venue suggestion for approval" : undefined
      }
      onClick={canApprove ? onApprove : undefined}
      onKeyDown={handleCardKeyDown}
      className={`group relative border p-3 text-sm transition duration-180 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 ${canApprove ? "cursor-pointer active:translate-y-0 active:scale-[0.99]" : "cursor-default"} ${meta.cardClass}`}
    >
      {showActions ? (
        <div className="absolute right-2 top-2 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          {canEdit && (
            <IconHint label="Edit suggested venue">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                aria-label="Edit suggested venue"
                className="research-allow-transform inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-violet-500 outline-none transition-[color,transform] duration-180 hover:-translate-y-0.5 hover:text-violet-700 active:translate-y-0 active:scale-90 focus-visible:ring-2 focus-visible:ring-violet-400/35 dark:text-violet-300 dark:hover:text-violet-200"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </IconHint>
          )}
          {canAssign && (
            <IconHint label={assignLabel}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onAssign();
                }}
                aria-label={assignLabel}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-[#A8DADC] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
              >
                <Send className="h-4 w-4" />
              </button>
            </IconHint>
          )}
          {canDelete && (
            <IconHint label={deleteLabel}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                aria-label={deleteLabel}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-rose-300 focus-visible:ring-2 focus-visible:ring-rose-300/35"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </IconHint>
          )}
        </div>
      ) : null}
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div
          className={`min-w-0 flex-1 ${showActions && !meta.badge ? "pr-28" : ""}`}
        >
          {title}
        </div>
        {meta.badge ? (
          <div
            className={`flex-none transition ${showActions ? "group-hover:opacity-0" : ""}`}
          >
            <IconHint label={meta.tooltip || meta.badge} position="bottom">
              <span
                className={`inline-flex flex-col border px-2.5 py-1 text-center text-[11px] font-normal uppercase tracking-wide ring-0 ${meta.badgeClass}`}
              >
                {meta.badge}
                {state.state === "published" && state.publishedAt ? (
                  <span className="mt-0.5 text-[10px] font-semibold normal-case tracking-normal">
                    {shortDate(state.publishedAt)}
                  </span>
                ) : null}
              </span>
            </IconHint>
          </div>
        ) : meta.tooltip ? (
          <div className="flex-none">
            <IconHint label={meta.tooltip} position="bottom">
              <span className="inline-flex h-6 w-6 items-center justify-center text-[#B0B0B0] transition hover:text-[#A8DADC]">
                <Info className="h-4 w-4" aria-hidden="true" />
              </span>
            </IconHint>
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function venueStateMeta(state: SuggestedVenueState) {
  if (state.state === "addingJournal") {
    return {
      cardClass:
        "border-sky-200 bg-sky-50/55 hover:border-sky-300 hover:bg-sky-50 dark:border-sky-800/60 dark:bg-sky-950/20 dark:hover:border-sky-700 dark:hover:bg-sky-950/30",
      badge: "Pending journal adding",
      badgeClass:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/70 dark:bg-sky-950/35 dark:text-sky-200",
      tooltip:
        "An Add Journal task is in progress. This suggestion will be approved automatically after the new journal is approved.",
    };
  }
  if (state.state === "pendingApproval") {
    return {
      cardClass:
        "border-amber-200 bg-amber-50/45 hover:border-amber-300 hover:bg-amber-50 dark:border-[#5A4A2C] dark:bg-[#2F2B24] dark:hover:border-[#806A3D] dark:hover:bg-[#383225]",
      badge: "Waiting approval",
      badgeClass:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-[#7A6338] dark:bg-[#242118] dark:text-[#FFD68A]",
      tooltip:
        "This venue suggestion is waiting for approval before a submission task can be assigned.",
    };
  }
  if (state.state === "declined") {
    return {
      cardClass:
        "border-rose-200 bg-rose-50/45 hover:border-rose-300 hover:bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20 dark:hover:border-rose-800 dark:hover:bg-rose-950/30",
      badge: "Declined",
      badgeClass:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/35 dark:text-rose-300",
      tooltip: state.declineReason
        ? `This venue suggestion was declined. Reason: ${state.declineReason}`
        : "This venue suggestion was declined.",
    };
  }
  if (state.state === "published") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: "Published",
      badgeClass:
        "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#A8DADC]",
      tooltip: "This venue has a published submission. Congratulations.",
    };
  }
  if (state.state === "accepted") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: "Accepted",
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#A8DADC]",
      tooltip: "This venue has an accepted submission. Congratulations.",
    };
  }
  if (state.state === "reviewing") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: "Reviewing",
      badgeClass:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#B39CD0]",
      tooltip: "This venue has a submission in reviewing process, let wait.",
    };
  }
  if (state.state === "submitted") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: "Submitted",
      badgeClass:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#FFC1CC]",
      tooltip: "This venue already has a submission, please wait.",
    };
  }
  if (state.state === "assigned") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: "Assigned",
      badgeClass:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#FFC1CC]",
      tooltip:
        "This venue already has an assigned task to submit, please wait.",
    };
  }
  if (state.state === "rejected") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: null,
      badgeClass: "",
      tooltip:
        "The submission to this venue is rejected. You could reassign another task to resubmit it.",
    };
  }
  if (state.state === "withdrawn") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: "Withdraw",
      badgeClass:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-[#444444] dark:bg-[#202020] dark:text-rose-300",
      tooltip:
        "The submission to this venue was withdrawn. You could assign another venue or create a new submission path.",
    };
  }
  if (state.state === "blocked") {
    return {
      cardClass:
        "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#303030] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
      badge: null,
      badgeClass: "",
      tooltip:
        "This research already has an accepted or published journal submission.",
    };
  }
  return {
    cardClass:
      "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#2C2C2C] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]",
    badge: null,
    badgeClass: "",
    tooltip: "",
  };
}

function ResultList({
  query,
  idleText,
  emptyText,
  children,
}: {
  query: string;
  idleText: string;
  emptyText: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  const isSearching = query.trim().length > 0;

  if (!isSearching && !hasChildren) return null;

  return (
    <div className="grid max-h-[18rem] min-h-[18rem] overflow-y-auto border border-[#444444]">
      {hasChildren ? (
        children
      ) : (
        <div className="py-10 text-center text-sm text-[#B0B0B0]">
          {isSearching ? emptyText : idleText}
        </div>
      )}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B0B0B0]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${researchSearchFieldClass} pl-9`}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
        {label}
      </span>
      <input
        readOnly
        value={value}
        className={`${researchFieldClass} bg-[#202020] text-[#B0B0B0]`}
      />
    </label>
  );
}
