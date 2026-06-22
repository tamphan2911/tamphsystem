"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ClipboardPlus,
  FileUp,
  KeyRound,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { createPublisherAccount, createResearchTask } from "../../actions";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  ResearchIconButton,
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
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { defaultSubmitTaskDescription } from "@/sites/research/lib/task-description";
import { defaultResearchTaskDueDate } from "@/sites/research/lib/task-date";

export type SubmissionTaskAccountOption = {
  id: string;
  journalId: string;
  username: string;
  email: string;
};

export type SubmissionTaskVenueOption =
  | {
      kind: "journal";
      id: string;
      name: string;
      issn: string;
      publisher: string;
      rank: string;
      accounts: SubmissionTaskAccountOption[];
    }
  | {
      kind: "conference";
      id: string;
      name: string;
      isbn: string;
      organizer: string;
      type: string;
      location: string;
      time: string;
    };

export type SubmissionTaskAssigneeOption = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

const defaultSubmissionTaskAssigneeEmail = "tamphan.ntc@gmail.com";

const inputClass = researchFieldClass;

export function CreateSubmissionTaskDialog({
  projectId,
  projectTitle,
  venues,
  assistants,
  checkers = [],
  canChooseChecker = false,
  disabled = false,
}: {
  projectId: string;
  projectTitle: string;
  venues: SubmissionTaskVenueOption[];
  assistants: SubmissionTaskAssigneeOption[];
  checkers?: SubmissionTaskAssigneeOption[];
  canChooseChecker?: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dueDate, setDueDate] = useState(defaultResearchTaskDueDate);
  const [venueQuery, setVenueQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [checkerQuery, setCheckerQuery] = useState("");
  const [selectedVenue, setSelectedVenue] =
    useState<SubmissionTaskVenueOption | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>(
    [],
  );
  const [selectedCheckerId, setSelectedCheckerId] = useState("");
  const [allowReportUpload, setAllowReportUpload] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const venueDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const assistantDropdownRef = useRef<HTMLDivElement>(null);
  const checkerDropdownRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showSuccess } = useResearchToast();
  const defaultAssistantId = useMemo(
    () =>
      assistants.find(
        (assistant) =>
          assistant.email.toLowerCase() === defaultSubmissionTaskAssigneeEmail,
      )?.id ?? "",
    [assistants],
  );

  function showProductionIncomplete() {
    showSuccess({
      title: "Research is still in production",
      detail:
        "Only admin, first author, or corresponding author can create submit tasks before production is complete.",
    });
  }

  const venueResults = useMemo(() => {
    const needle = venueQuery.trim().toLowerCase();
    if (!needle) return [];
    return venues
      .filter((venue) => {
        const haystack =
          venue.kind === "journal"
            ? [
                venue.name,
                venue.issn,
                venue.publisher,
                venue.rank,
                "journal",
              ].join(" ")
            : [
                venue.name,
                venue.isbn,
                venue.organizer,
                venue.type,
                venue.location,
                "conference",
              ].join(" ");
        return haystack.toLowerCase().includes(needle);
      })
      .slice(0, 12);
  }, [venueQuery, venues]);

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

  const selectedAccount =
    selectedVenue?.kind === "journal"
      ? selectedVenue.accounts.find(
          (account) => account.id === selectedAccountId,
        )
      : null;
  const accountRequired =
    selectedVenue?.kind === "journal" && selectedVenue.accounts.length > 1;

  function reset() {
    setVenueQuery("");
    setAssistantQuery("");
    setCheckerQuery("");
    setSelectedVenue(null);
    setSelectedAccountId("");
    setSelectedAssistantIds(defaultAssistantId ? [defaultAssistantId] : []);
    setSelectedCheckerId("");
    setAccountOpen(false);
    setAddAccountOpen(false);
    setAllowReportUpload(false);
    setSelectedCheckerId("");
    setCheckerQuery("");
    setDueDate(defaultResearchTaskDueDate());
  }

  function openDialog() {
    setSelectedAssistantIds(defaultAssistantId ? [defaultAssistantId] : []);
    setAllowReportUpload(false);
    setDueDate(defaultResearchTaskDueDate());
    setIsOpen(true);
  }

  function selectVenue(venue: SubmissionTaskVenueOption) {
    const singleAccount =
      venue.kind === "journal" && venue.accounts.length === 1
        ? venue.accounts.at(0)
        : null;
    setSelectedVenue(venue);
    setVenueQuery("");
    setSelectedAccountId(singleAccount?.id ?? "");
  }

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

  useEffect(() => {
    if (
      selectedVenue?.kind === "journal" &&
      selectedVenue.accounts.length === 1
    ) {
      setSelectedAccountId(selectedVenue.accounts.at(0)?.id ?? "");
    }
  }, [selectedVenue]);

  function submitTask(formData: FormData) {
    if (!selectedVenue) return;
    startTransition(async () => {
      const result = await createResearchTask(formData);
      if (!result?.ok) {
        if (result?.reason === "PRODUCTION_INCOMPLETE") {
          showProductionIncomplete();
          setIsOpen(false);
          return;
        }
        if (result?.reason === "RESEARCH_LOCKED") {
          showSuccess({
            title: "Research is locked",
            detail:
              "Unlock the research before creating submission tasks from this page.",
          });
          setIsOpen(false);
          return;
        }
        if (result?.reason === "UNAUTHORIZED") {
          showSuccess({
            title: "Task was not created",
            detail:
              "Only admin, first author, or corresponding author can create this task for the research.",
          });
          setIsOpen(false);
          return;
        }
        if (result?.reason === "ACCOUNT_REQUIRED") {
          showSuccess({
            title: "Account is required",
            detail:
              "This journal has multiple accounts. Choose the account for this submission task.",
          });
          return;
        }
        if (result?.reason === "TASK_FILE_TOO_LARGE") {
          showSuccess({
            title: "Task file is too large",
            detail: "Task file must be 2 MB or smaller.",
          });
          return;
        }
        if (result?.reason === "TASK_FILE_REJECTED") {
          showSuccess({
            title: "Task file was not uploaded",
            detail: "Upload the task file as PDF, DOC, DOCX, or XLSX.",
          });
          return;
        }
        showSuccess({
          title: "Submission task already exists",
          detail:
            "Revoke the unfinished task for this research and venue before assigning a new one.",
        });
        setIsOpen(false);
        return;
      }
      showSuccess({
        title: "Submission task created",
        detail:
          "The assigned user must finish this task before the submission entry is created.",
      });
      reset();
      setIsOpen(false);
    });
  }

  function submitAccount(formData: FormData) {
    startTransition(async () => {
      await createPublisherAccount(formData);
      showSuccess({
        title: "Account added",
        detail:
          "The account is linked to the selected journal. Refreshing keeps it available for future tasks.",
      });
      setAddAccountOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <ResearchButton
        type="button"
        disabled={disabled}
        title={
          disabled
            ? "Research is locked. Unlock it before creating a task."
            : "Create task"
        }
        onClick={openDialog}
      >
        <ClipboardPlus className="h-4 w-4" />
        Create task
      </ResearchButton>

      {isOpen && (
        <ResearchModal
          open={isOpen}
          onClose={() => {
            reset();
            setIsOpen(false);
          }}
          title="Create submission task"
          description="Submission task is selected automatically for this research."
          icon={<ClipboardPlus className="h-5 w-5" />}
          maxWidth="max-w-5xl"
          bodyClassName="px-0 py-0"
          headerActions={
            <ResearchButton
              form="create-submission-task-form"
              disabled={
                !selectedVenue ||
                (accountRequired && !selectedAccountId) ||
                selectedAssistantIds.length === 0 ||
                isPending
              }
            >
              <Plus className="h-4 w-4" />
              Create task
            </ResearchButton>
          }
        >
          <form
            id="create-submission-task-form"
            action={submitTask}
            className="grid gap-5 px-6 py-5"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="category" value="Submitting" />
            <input
              type="hidden"
              name="taskType"
              value={
                selectedVenue?.kind === "conference"
                  ? "SUBMIT_CONFERENCE"
                  : "SUBMIT_RESEARCH"
              }
            />
            {selectedVenue?.kind === "journal" && (
              <input type="hidden" name="journalId" value={selectedVenue.id} />
            )}
            {selectedVenue?.kind === "conference" && (
              <input
                type="hidden"
                name="conferenceId"
                value={selectedVenue.id}
              />
            )}
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

            <div className="rounded-none border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
              <p className="text-xs font-bold text-indigo-500 dark:text-indigo-300">
                Research
              </p>
              <p className="mt-1 text-sm font-semibold text-[#E4E4E4]">
                {projectTitle}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#B0B0B0]">
                  Task title
                  <span className="research-required-mark">(*)</span>
                </span>
                <input
                  name="title"
                  required
                  value={
                    selectedVenue
                      ? `Submit "${projectTitle}" to ${selectedVenue.name}`
                      : `Submit "${projectTitle}"`
                  }
                  onChange={() => undefined}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#B0B0B0]">
                  Due date
                </span>
                <ResearchDatePicker
                  name="dueDate"
                  value={dueDate}
                  onChange={setDueDate}
                />
              </label>
            </div>

            <section className="grid gap-3">
              <span className="text-xs font-bold text-[#B0B0B0]">
                Journal or conference
              </span>
              <div ref={venueDropdownRef} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={venueQuery}
                  onChange={(event) => {
                    setVenueQuery(event.target.value);
                    setSelectedVenue(null);
                  }}
                  placeholder="Search journal name, ISSN, conference name, ISBN..."
                  className={`${researchSearchFieldClass} pl-9`}
                />
              </div>
              {selectedVenue && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVenue(null);
                    setSelectedAccountId("");
                  }}
                  className="inline-flex w-fit cursor-pointer items-center gap-2 border border-[#444444] bg-[#202020] px-2.5 py-1.5 text-xs text-[#E4E4E4] transition hover:border-[#A8DADC] hover:bg-[#303030]"
                >
                  {selectedVenue.name}
                  <span className="text-[#B0B0B0]" aria-hidden="true">
                    ×
                  </span>
                </button>
              )}
              <FloatingDropdownPortal
                anchorRef={venueDropdownRef}
                open={Boolean(venueQuery.trim())}
                maxWidth={820}
                maxPanelHeight={272}
              >
                <div className={`${researchDropdownPanelClass} grid`}>
                  <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                    {venueResults.map((venue) => {
                      const selected =
                        selectedVenue?.kind === venue.kind &&
                        selectedVenue.id === venue.id;
                      return (
                        <button
                          key={`${venue.kind}-${venue.id}`}
                          type="button"
                          onClick={() => selectVenue(venue)}
                          className={`${researchDropdownItemClass} cursor-pointer ${
                            selected
                              ? researchDropdownItemActiveClass
                              : researchDropdownItemIdleClass
                          }`}
                        >
                          <span className="flex min-w-0 flex-1 items-start justify-between gap-3 px-3">
                            <span>
                              <span className="block text-sm font-normal">
                                {venue.name}
                              </span>
                              <span className="mt-1 block text-xs text-[#B0B0B0]">
                                {venue.kind === "journal"
                                  ? `${venue.issn || "No ISSN"} - ${venue.publisher || "No publisher"} - ${venue.rank || "No rank"}`
                                  : `${venue.isbn || "No ISBN"} - ${venue.organizer || "No organizer"} - ${venue.type || "No type"}`}
                              </span>
                            </span>
                            <span className="rounded-none bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              {venue.kind}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    {venueQuery.trim() && venueResults.length === 0 && (
                      <p className="py-10 text-center text-sm text-[#B0B0B0]">
                        No venue matches this search.
                      </p>
                    )}
                  </div>
                </div>
              </FloatingDropdownPortal>
            </section>

            {selectedVenue?.kind === "journal" && (
              <section className="grid gap-3 border border-[#444444] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-[#B0B0B0]">
                    Account to submit
                    {accountRequired ? (
                      <span className="research-required-mark">(*)</span>
                    ) : null}
                  </span>
                  <ResearchIconButton
                    type="button"
                    onClick={() => setAddAccountOpen(true)}
                    label="Add account"
                    tone="emerald"
                  >
                    <KeyRound className="h-4 w-4" />
                  </ResearchIconButton>
                </div>
                {selectedVenue.accounts.length > 0 ? (
                  <div ref={accountDropdownRef} className="relative">
                    <input
                      type="hidden"
                      name="accountId"
                      value={selectedAccountId}
                    />
                    <button
                      type="button"
                      onClick={() => setAccountOpen((current) => !current)}
                      className={cx(
                        "flex cursor-pointer items-center justify-between gap-3 text-left",
                        researchSelectTriggerClass,
                        accountOpen && "border-[#A8DADC] bg-[#383838]",
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
                        className={`h-4 w-4 flex-none text-[#B0B0B0] transition ${accountOpen ? "rotate-180 text-[#A8DADC]" : ""}`}
                      />
                    </button>
                    <FloatingDropdownPortal
                      anchorRef={accountDropdownRef}
                      open={accountOpen}
                      maxWidth={560}
                    >
                      <div
                        className={`${researchDropdownPanelClass} max-h-[var(--research-dropdown-max-height)] overflow-y-auto`}
                      >
                        {selectedVenue.accounts.map((account) => (
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
                              <span className="block text-xs text-[#B0B0B0]">
                                {account.email || "No email"}
                              </span>
                            </span>
                            {selectedAccountId === account.id && (
                              <Check className="mr-3 h-4 w-4 text-[#A8DADC]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </FloatingDropdownPortal>
                  </div>
                ) : (
                  <p className="rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    This journal does not have any account yet. You can assign
                    this task now and add the account later.
                  </p>
                )}
              </section>
            )}

            <section className="grid gap-3">
              <span className="text-xs font-bold text-[#B0B0B0]">
                Assign to
              </span>
              {selectedAssistants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAssistants.map((assistant) => (
                    <button
                      key={assistant.id}
                      type="button"
                      onClick={() => toggleAssistant(assistant.id)}
                      className="inline-flex cursor-pointer items-center gap-2 border border-[#d9d0c3] bg-[#f8f5f0] px-2.5 py-1.5 text-xs text-[#243047] transition hover:border-[#A8DADC] hover:text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4] dark:hover:border-[#A8DADC] dark:hover:bg-[#303030]"
                    >
                      {displayResearchPersonName(assistant)}
                      <X className="h-3.5 w-3.5 text-[#6C778D] dark:text-[#B0B0B0]" />
                    </button>
                  ))}
                </div>
              )}
              <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
                <div className="grid gap-4">
                  <div ref={assistantDropdownRef} className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                    maxPanelHeight={272}
                  >
                    <div className={`${researchDropdownPanelClass} grid`}>
                      <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                        {assistantResults.map((assistant) => {
                          return (
                            <button
                              key={assistant.id}
                              type="button"
                              onClick={() => toggleAssistant(assistant.id)}
                              className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
                            >
                              <span className="flex min-w-0 items-center gap-3 px-3">
                                <UserRound className="h-4 w-4 flex-none text-slate-400" />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-normal">
                                    {displayResearchPersonName(assistant)}
                                  </span>
                                  <span className="block truncate text-xs text-[#B0B0B0]">
                                    {displayResearchEmail(assistant.email)}
                                  </span>
                                </span>
                              </span>
                            </button>
                          );
                        })}
                        {assistantQuery.trim() &&
                          assistantResults.length === 0 && (
                            <p className="py-10 text-center text-sm text-[#B0B0B0]">
                              No user matches this search.
                            </p>
                          )}
                      </div>
                    </div>
                  </FloatingDropdownPortal>
                  {canChooseChecker && (
                    <section className="grid gap-3">
                      {selectedChecker ? (
                        <button
                          type="button"
                          onClick={() => selectChecker("")}
                          className="inline-flex w-fit cursor-pointer items-center gap-2 border border-[#d9d0c3] bg-[#f8f5f0] px-2.5 py-1.5 text-xs text-[#243047] transition hover:border-[#A8DADC] hover:text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4] dark:hover:border-[#A8DADC] dark:hover:bg-[#303030]"
                        >
                          {displayResearchPersonName(selectedChecker)}
                          <span className="text-[#6C778D] dark:text-[#B0B0B0]">
                            Chief assistant checker
                          </span>
                          <X className="h-3.5 w-3.5 text-[#6C778D] dark:text-[#B0B0B0]" />
                        </button>
                      ) : null}
                      <div ref={checkerDropdownRef} className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                        maxPanelHeight={272}
                      >
                        <div className={`${researchDropdownPanelClass} grid`}>
                          <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                            {checkerResults.map((checker) => (
                              <button
                                key={checker.id}
                                type="button"
                                onClick={() => selectChecker(checker.id)}
                                className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
                              >
                                <span className="flex min-w-0 items-center gap-3 px-3">
                                  <UserRound className="h-4 w-4 flex-none text-slate-400" />
                                  <span className="min-w-0">
                                    <span className="block truncate text-sm font-normal">
                                      {displayResearchPersonName(checker)}
                                    </span>
                                    <span className="block truncate text-xs text-[#B0B0B0]">
                                      {displayResearchEmail(checker.email)}
                                    </span>
                                  </span>
                                </span>
                              </button>
                            ))}
                            {checkerQuery.trim() &&
                              checkerResults.length === 0 && (
                                <p className="py-10 text-center text-sm text-[#B0B0B0]">
                                  No chief assistant matches this search.
                                </p>
                              )}
                          </div>
                        </div>
                      </FloatingDropdownPortal>
                    </section>
                  )}
                </div>
                <div className="lg:pt-0">
                  <ReportUploadPermissionField
                    checked={allowReportUpload}
                    onChange={setAllowReportUpload}
                  />
                </div>
              </div>
            </section>

            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-[#B0B0B0]">Note</span>
              <textarea
                name="description"
                rows={3}
                defaultValue={defaultSubmitTaskDescription}
                className={researchTextareaClass}
              />
            </label>

            <TaskAttachmentField />
          </form>
        </ResearchModal>
      )}

      {addAccountOpen && selectedVenue?.kind === "journal" && (
        <ResearchModal
          open={addAccountOpen}
          onClose={() => setAddAccountOpen(false)}
          title="Add account"
          description="Create a journal login account for this submission path."
          icon={<KeyRound className="h-5 w-5" />}
          maxWidth="max-w-lg"
          bodyClassName="px-5 py-4"
          headerActions={
            <ResearchButton form="submission-account-form" disabled={isPending}>
              <Plus className="h-4 w-4" />
              Add account
            </ResearchButton>
          }
        >
          <form
            id="submission-account-form"
            action={submitAccount}
            className="grid gap-4"
          >
            <input type="hidden" name="journalId" value={selectedVenue.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Journal
              </span>
              <input
                readOnly
                value={selectedVenue.name}
                className={`${inputClass} bg-slate-100 text-[#B0B0B0]`}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Username
                <span className="research-required-mark">(*)</span>
              </span>
              <input name="username" required className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Password
              </span>
              <input name="password" className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Email
              </span>
              <input name="email" type="email" className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Note
              </span>
              <input name="note" className={inputClass} />
            </label>
          </form>
        </ResearchModal>
      )}
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
