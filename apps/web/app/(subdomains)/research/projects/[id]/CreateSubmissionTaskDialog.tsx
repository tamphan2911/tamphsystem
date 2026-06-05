"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardPlus,
  KeyRound,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { createPublisherAccount, createResearchTask } from "../../actions";
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
  researchSelectTriggerClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";

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

const inputClass = researchFieldClass;

export function CreateSubmissionTaskDialog({
  projectId,
  projectTitle,
  venues,
  assistants,
  disabled = false,
}: {
  projectId: string;
  projectTitle: string;
  venues: SubmissionTaskVenueOption[];
  assistants: SubmissionTaskAssigneeOption[];
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [venueQuery, setVenueQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [selectedVenue, setSelectedVenue] =
    useState<SubmissionTaskVenueOption | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>(
    [],
  );
  const [accountOpen, setAccountOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showSuccess } = useResearchToast();

  function showProductionIncomplete() {
    showSuccess({
      title: "Research is still in production",
      detail:
        "Only admin, first author, or corresponding author can create submit tasks before production is complete.",
    });
  }

  const venueResults = useMemo(() => {
    const needle = venueQuery.trim().toLowerCase();
    return venues
      .filter((venue) => {
        if (!needle) return true;
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
    return assistants
      .filter((assistant) => {
        if (!needle) return true;
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
  }, [assistantQuery, assistants]);

  const selectedAccount =
    selectedVenue?.kind === "journal"
      ? selectedVenue.accounts.find(
          (account) => account.id === selectedAccountId,
        )
      : null;

  function reset() {
    setVenueQuery("");
    setAssistantQuery("");
    setSelectedVenue(null);
    setSelectedAccountId("");
    setSelectedAssistantIds([]);
    setAccountOpen(false);
    setAddAccountOpen(false);
  }

  function selectVenue(venue: SubmissionTaskVenueOption) {
    setSelectedVenue(venue);
    setVenueQuery(venue.name);
    setSelectedAccountId("");
  }

  function toggleAssistant(id: string) {
    setSelectedAssistantIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

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
        onClick={() => setIsOpen(true)}
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
        >
          <form action={submitTask} className="grid gap-5 px-6 py-5">
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

            <div className="rounded-none border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                Research
              </p>
              <p className="mt-1 text-sm font-semibold text-[#E4E4E4]">
                {projectTitle}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                  Task title
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
                <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
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

            <section className="grid gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Journal or conference
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={venueQuery}
                  onChange={(event) => {
                    setVenueQuery(event.target.value);
                    setSelectedVenue(null);
                  }}
                  placeholder="Search journal name, ISSN, conference name, ISBN..."
                  className={`${inputClass} w-full pl-9`}
                />
              </div>
              <div className={`${researchDropdownPanelClass} grid max-h-72 overflow-y-auto`}>
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
                {venueResults.length === 0 && (
                  <p className="py-10 text-center text-sm text-[#B0B0B0]">
                    No venue matches this search.
                  </p>
                )}
              </div>
            </section>

            {selectedVenue?.kind === "journal" && (
              <section className="grid gap-3 border border-[#444444] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                    Account to submit
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
                        accountOpen &&
                          "border-[#A8DADC] bg-[#383838] ring-1 ring-[#A8DADC]/25",
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {selectedAccount
                          ? `${selectedAccount.username}${selectedAccount.email ? ` - ${selectedAccount.email}` : ""}`
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
                      <div className={`${researchDropdownPanelClass} max-h-[var(--research-dropdown-max-height)] overflow-y-auto`}>
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
                    This journal does not have any account yet.
                  </p>
                )}
              </section>
            )}

            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Note
              </span>
              <textarea
                name="description"
                rows={3}
                defaultValue={
                  selectedVenue
                    ? `Prepare and submit this manuscript to ${selectedVenue.name}.`
                    : "Prepare and submit this manuscript."
                }
                className={researchTextareaClass}
              />
            </label>

            <section className="grid gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Assign to
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={assistantQuery}
                  onChange={(event) => setAssistantQuery(event.target.value)}
                  placeholder="Search assistant or admin..."
                  className={`${inputClass} w-full pl-9`}
                />
              </div>
              <div className={`${researchDropdownPanelClass} grid max-h-64 overflow-y-auto`}>
                {assistantResults.map((assistant) => {
                  const selected = selectedAssistantIds.includes(assistant.id);
                  return (
                    <button
                      key={assistant.id}
                      type="button"
                      onClick={() => toggleAssistant(assistant.id)}
                      className={`${researchDropdownItemClass} cursor-pointer ${
                        selected
                          ? researchDropdownItemActiveClass
                          : researchDropdownItemIdleClass
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3 px-3">
                        <UserRound className="h-4 w-4 flex-none text-slate-400" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-normal">
                            {assistant.name || assistant.email}
                          </span>
                          <span className="block truncate text-xs text-[#B0B0B0]">
                            {assistant.email}
                          </span>
                        </span>
                      </span>
                      {selected && <Check className="h-4 w-4 flex-none" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <ResearchButton
                type="button"
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                tone="secondary"
              >
                Cancel
              </ResearchButton>
              <ResearchButton
                disabled={
                  !selectedVenue ||
                  selectedAssistantIds.length === 0 ||
                  isPending
                }
              >
                <Plus className="h-4 w-4" />
                Create task
              </ResearchButton>
            </div>
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
        >
          <form action={submitAccount} className="grid gap-4">
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
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <ResearchButton
                type="button"
                onClick={() => setAddAccountOpen(false)}
                tone="secondary"
              >
                Cancel
              </ResearchButton>
              <ResearchButton disabled={isPending} tone="success">
                <Plus className="h-4 w-4" />
                Add account
              </ResearchButton>
            </div>
          </form>
        </ResearchModal>
      )}
    </>
  );
}
