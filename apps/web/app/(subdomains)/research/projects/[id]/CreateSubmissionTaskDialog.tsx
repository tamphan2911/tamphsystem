"use client";

import { useMemo, useState, useTransition } from "react";
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
  X,
} from "lucide-react";
import { createPublisherAccount, createResearchTask } from "../../actions";
import { useResearchToast } from "../../components/ResearchToast";

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

const inputClass =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showSuccess } = useResearchToast();

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
        if (result?.reason === "RESEARCH_LOCKED") {
          showSuccess({
            title: "Research is locked",
            detail:
              "Unlock the research before creating submission tasks from this page.",
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
      <button
        type="button"
        disabled={disabled}
        title={
          disabled
            ? "Research is locked. Unlock it before creating a task."
            : "Create task"
        }
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm shadow-indigo-900/5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-900/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:from-slate-50 disabled:via-slate-50 disabled:to-slate-50 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:border-indigo-900/60 dark:from-indigo-950/60 dark:via-sky-950/50 dark:to-emerald-950/40 dark:text-indigo-200 dark:disabled:border-slate-800 dark:disabled:from-slate-900 dark:disabled:via-slate-900 dark:disabled:to-slate-900 dark:disabled:text-slate-500"
      >
        <ClipboardPlus className="h-4 w-4" />
        Create task
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <ClipboardPlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Create submission task
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Submission task is selected automatically for this research.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={submitTask}
              className="grid max-h-[calc(92vh-6rem)] gap-5 overflow-y-auto px-6 py-5"
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
                <input
                  type="hidden"
                  name="journalId"
                  value={selectedVenue.id}
                />
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

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                  Research
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {projectTitle}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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

              <section className="grid gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                  {venueResults.map((venue) => {
                    const selected =
                      selectedVenue?.kind === venue.kind &&
                      selectedVenue.id === venue.id;
                    return (
                      <button
                        key={`${venue.kind}-${venue.id}`}
                        type="button"
                        onClick={() => selectVenue(venue)}
                        className={`cursor-pointer rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                          selected
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-blue-950/30"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block text-sm font-bold">
                              {venue.name}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                              {venue.kind === "journal"
                                ? `${venue.issn || "No ISSN"} - ${venue.publisher || "No publisher"} - ${venue.rank || "No rank"}`
                                : `${venue.isbn || "No ISBN"} - ${venue.organizer || "No organizer"} - ${venue.type || "No type"}`}
                            </span>
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {venue.kind}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {venueResults.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      No venue matches this search.
                    </p>
                  )}
                </div>
              </section>

              {selectedVenue?.kind === "journal" && (
                <section className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Account to submit
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddAccountOpen(true)}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                      aria-label="Add account"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                  </div>
                  {selectedVenue.accounts.length > 0 ? (
                    <div className="relative">
                      <input
                        type="hidden"
                        name="accountId"
                        value={selectedAccountId}
                      />
                      <button
                        type="button"
                        onClick={() => setAccountOpen((current) => !current)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-800 transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <span className="min-w-0 truncate">
                          {selectedAccount
                            ? `${selectedAccount.username}${selectedAccount.email ? ` - ${selectedAccount.email}` : ""}`
                            : "Choose an account"}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 flex-none text-slate-400 transition ${accountOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {accountOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950">
                          {selectedVenue.accounts.map((account) => (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => {
                                setSelectedAccountId(account.id);
                                setAccountOpen(false);
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <span>
                                <span className="block font-semibold">
                                  {account.username}
                                </span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400">
                                  {account.email || "No email"}
                                </span>
                              </span>
                              {selectedAccountId === account.id && (
                                <Check className="h-4 w-4 text-emerald-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      This journal does not have any account yet.
                    </p>
                  )}
                </section>
              )}

              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                  className={inputClass}
                />
              </label>

              <section className="grid gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
                <div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                  {assistantResults.map((assistant) => {
                    const selected = selectedAssistantIds.includes(
                      assistant.id,
                    );
                    return (
                      <button
                        key={assistant.id}
                        type="button"
                        onClick={() => toggleAssistant(assistant.id)}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                          selected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <UserRound className="h-4 w-4 flex-none text-slate-400" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {assistant.name || assistant.email}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
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
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setIsOpen(false);
                  }}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={
                    !selectedVenue ||
                    selectedAssistantIds.length === 0 ||
                    isPending
                  }
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <Plus className="h-4 w-4" />
                  Create task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {addAccountOpen && selectedVenue?.kind === "journal" && (
        <div className="fixed inset-0 z-[100] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <KeyRound className="h-5 w-5" />
                </span>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  Add account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddAccountOpen(false)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={submitAccount} className="grid gap-4 px-5 py-4">
              <input type="hidden" name="journalId" value={selectedVenue.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Journal
                </span>
                <input
                  readOnly
                  value={selectedVenue.name}
                  className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Username
                </span>
                <input name="username" required className={inputClass} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Password
                </span>
                <input name="password" className={inputClass} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Email
                </span>
                <input name="email" type="email" className={inputClass} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Note
                </span>
                <input name="note" className={inputClass} />
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddAccountOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                  Add account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
