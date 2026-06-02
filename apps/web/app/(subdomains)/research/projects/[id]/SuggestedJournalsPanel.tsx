"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  ClipboardList,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  addSuggestedConference,
  addSuggestedJournal,
  createResearchTask,
  deleteSuggestedConference,
  deleteSuggestedJournal,
} from "../../actions";
import { ResearchConfirmDialog } from "../../components/ResearchConfirmDialog";
import { ResearchDetailSection } from "../../components/ResearchDetailSection";
import { ResearchModal } from "../../components/ResearchModal";
import {
  ResearchButton,
  ResearchIconButton,
  researchFieldClass,
  researchTextareaClass,
} from "../../components/ResearchPrimitives";
import { useResearchToast } from "../../components/ResearchToast";

export type SuggestedJournalOption = {
  id: string;
  name: string;
  issn: string;
  field: string;
  rank: string;
  publisher: string;
  apc: string;
  suggestedByName?: string;
  suggestedByRole?: string;
  venueState?: SuggestedVenueState;
};

export type SuggestedConferenceOption = {
  id: string;
  name: string;
  type: string;
  theme: string;
  location: string;
  organizer: string;
  isbn?: string;
  time: string;
  suggestedByName?: string;
  suggestedByRole?: string;
  venueState?: SuggestedVenueState;
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
    | "blocked";
  publishedAt?: string;
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
  assistants,
  isAdmin,
  canSuggestVenue,
  disabled = false,
  productionComplete = true,
}: {
  projectId: string;
  projectTitle: string;
  journals: SuggestedJournalOption[];
  suggested: SuggestedJournalOption[];
  conferences: SuggestedConferenceOption[];
  suggestedConferences: SuggestedConferenceOption[];
  assistants: TaskAssigneeOption[];
  isAdmin: boolean;
  canSuggestVenue: boolean;
  disabled?: boolean;
  productionComplete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAddTab, setActiveAddTab] = useState<"journal" | "conference">(
    "journal",
  );
  const [addOpen, setAddOpen] = useState(false);
  const [assignVenue, setAssignVenue] = useState<Venue | null>(null);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);
  const [journalQuery, setJournalQuery] = useState("");
  const [conferenceQuery, setConferenceQuery] = useState("");
  const [assistantQuery, setAssistantQuery] = useState("");
  const [selectedAssistantIds, setSelectedAssistantIds] = useState<string[]>(
    [],
  );
  const [taskMode, setTaskMode] = useState<"submit" | "other">("submit");
  const { showSuccess } = useResearchToast();

  function showProductionIncomplete() {
    showSuccess({
      title: "Research is still in production",
      detail:
        "Complete every production timeline checkbox before submitting this research anywhere.",
    });
  }

  const suggestedJournalIds = useMemo(
    () => new Set(suggested.map((journal) => journal.id)),
    [suggested],
  );
  const suggestedConferenceIds = useMemo(
    () => new Set(suggestedConferences.map((conference) => conference.id)),
    [suggestedConferences],
  );

  const journalResults = useMemo(() => {
    const needle = journalQuery.trim().toLowerCase();
    return journals
      .filter((journal) => !suggestedJournalIds.has(journal.id))
      .filter((journal) => {
        if (!needle) return true;
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
    return conferences
      .filter((conference) => !suggestedConferenceIds.has(conference.id))
      .filter((conference) => {
        if (!needle) return true;
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

  function toggleAssistant(id: string) {
    setSelectedAssistantIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function addJournal(journalId: string) {
    if (disabled) return;
    const formData = new FormData();
    formData.set("journalId", journalId);
    startTransition(async () => {
      await addSuggestedJournal(projectId, formData);
      setAddOpen(false);
      setJournalQuery("");
      router.refresh();
    });
  }

  function addConference(conferenceId: string) {
    if (disabled) return;
    const formData = new FormData();
    formData.set("conferenceId", conferenceId);
    startTransition(async () => {
      await addSuggestedConference(projectId, formData);
      setAddOpen(false);
      setConferenceQuery("");
      router.refresh();
    });
  }

  function removeVenue() {
    if (disabled) return;
    if (!deleteVenue) return;
    startTransition(async () => {
      if (deleteVenue.kind === "journal") {
        await deleteSuggestedJournal(projectId, deleteVenue.item.id);
      } else {
        await deleteSuggestedConference(projectId, deleteVenue.item.id);
      }
      setDeleteVenue(null);
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
      setTaskMode("submit");
      router.refresh();
    });
  }

  function openSubmitTask(venue: Venue) {
    if (disabled) return;
    if (!productionComplete) {
      showProductionIncomplete();
      return;
    }
    setTaskMode("submit");
    setAssignVenue(venue);
  }

  const assignName = assignVenue?.item.name ?? "";
  const assignKind = assignVenue?.kind ?? "journal";

  return (
    <ResearchDetailSection>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Suggested venues
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
              disabled={disabled}
              productionComplete={productionComplete}
              onAssign={() =>
                openSubmitTask({ kind: "journal", item: journal })
              }
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
              disabled={disabled}
              productionComplete={productionComplete}
              onAssign={() =>
                openSubmitTask({ kind: "conference", item: conference })
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
          onClose={() => setAddOpen(false)}
          title="Add suggested venue"
          description="Choose a journal or conference target for this research."
          icon={<Plus className="h-5 w-5" />}
          maxWidth="max-w-3xl"
          bodyClassName="px-5 py-4"
        >
            <div className="grid gap-4">
              <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {(["journal", "conference"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveAddTab(tab)}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${
                      activeAddTab === tab
                        ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
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
                    onChange={setJournalQuery}
                    placeholder="Search journal name, ISSN, field, rank, publisher..."
                  />
                  <ResultList emptyText="No journal matches this search.">
                    {journalResults.map((journal) => (
                      <button
                        key={journal.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => addJournal(journal.id)}
                        className={resultButtonClass}
                      >
                        <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                          {journal.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
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
                    onChange={setConferenceQuery}
                    placeholder="Search conference, organizer, theme, location..."
                  />
                  <ResultList emptyText="No conference matches this search.">
                    {conferenceResults.map((conference) => (
                      <button
                        key={conference.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => addConference(conference.id)}
                        className={resultButtonClass}
                      >
                        <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                          {conference.name}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
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

      {deleteVenue && (
        <ResearchConfirmDialog
          open={Boolean(deleteVenue)}
          title="Remove suggestion?"
          description={`Remove ${deleteVenue.item.name} from suggested venues for this research?`}
          confirmLabel="Remove suggestion"
          isConfirming={isPending}
          onCancel={() => setDeleteVenue(null)}
          onConfirm={removeVenue}
        />
      )}

      {assignVenue && (
        <ResearchModal
          open={Boolean(assignVenue)}
          onClose={() => setAssignVenue(null)}
          title="Assign task"
          description={`Create a task for ${assignName}.`}
          icon={<ClipboardList className="h-5 w-5" />}
          maxWidth="max-w-4xl"
          bodyClassName="px-0 py-0"
        >
            <form
              action={assignTask}
              className="grid gap-5 px-6 py-5"
            >
              {selectedAssistantIds.map((id) => (
                <input key={id} type="hidden" name="assigneeIds" value={id} />
              ))}
              <input type="hidden" name="projectId" value={projectId} />
              {assignKind === "journal" ? (
                <input
                  type="hidden"
                  name="journalId"
                  value={assignVenue.item.id}
                />
              ) : (
                <input
                  type="hidden"
                  name="conferenceId"
                  value={assignVenue.item.id}
                />
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

              <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {(["submit", "other"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTaskMode(mode)}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${
                      taskMode === mode
                        ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                    }`}
                  >
                    {mode === "submit"
                      ? `Submit to ${assignKind}`
                      : "Other task"}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Task title
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
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Due date
                  </span>
                  <div className="relative">
                    <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      name="dueDate"
                      type="date"
                      className={`${researchFieldClass} pl-9`}
                    />
                  </div>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Research" value={projectTitle} />
                <ReadOnlyField
                  label={assignKind === "journal" ? "Journal" : "Conference"}
                  value={assignName}
                />
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Note
                </span>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={
                    taskMode === "submit"
                      ? `Prepare and submit this manuscript to ${assignName}.`
                      : ""
                  }
                  className={researchTextareaClass}
                />
              </label>

              <div className="grid gap-3">
                <SearchBox
                  value={assistantQuery}
                  onChange={setAssistantQuery}
                  placeholder="Search assistants or admin by name, email, ID, or role..."
                />
                <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
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
                  {assistantResults.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      No user matches this search.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <ResearchButton
                  type="button"
                  onClick={() => setAssignVenue(null)}
                  tone="secondary"
                >
                  Cancel
                </ResearchButton>
                <ResearchButton
                  disabled={selectedAssistantIds.length === 0 || isPending}
                >
                  <Plus className="h-4 w-4" />
                  Assign Task
                </ResearchButton>
              </div>
            </form>
        </ResearchModal>
      )}
    </ResearchDetailSection>
  );
}

const resultButtonClass =
  "cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm disabled:cursor-wait dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:bg-blue-950/30";

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
      <h3 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">
        {title}
      </h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

function JournalCard({
  journal,
  isAdmin,
  disabled,
  productionComplete,
  onAssign,
  onDelete,
}: {
  journal: SuggestedJournalOption;
  isAdmin: boolean;
  disabled: boolean;
  productionComplete: boolean;
  onAssign: () => void;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      disabled={disabled}
      productionComplete={productionComplete}
      state={journal.venueState ?? { state: "idle" }}
      onAssign={onAssign}
      onDelete={onDelete}
      assignLabel="Assign journal submission task"
      deleteLabel="Delete suggested journal"
    >
      <p className="pr-16 font-semibold text-slate-950 dark:text-white">
        {journal.name}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {journal.field || "No field"} - {journal.rank || "No rank"} -{" "}
        {journal.publisher || "No publisher"}
      </p>
      {journal.apc && (
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          APC: {journal.apc}
        </p>
      )}
      <SuggestedByLine
        name={journal.suggestedByName}
        role={journal.suggestedByRole}
      />
    </VenueCard>
  );
}

function ConferenceCard({
  conference,
  isAdmin,
  disabled,
  productionComplete,
  onAssign,
  onDelete,
}: {
  conference: SuggestedConferenceOption;
  isAdmin: boolean;
  disabled: boolean;
  productionComplete: boolean;
  onAssign: () => void;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      disabled={disabled}
      productionComplete={productionComplete}
      state={conference.venueState ?? { state: "idle" }}
      onAssign={onAssign}
      onDelete={onDelete}
      assignLabel="Assign conference submission task"
      deleteLabel="Delete suggested conference"
    >
      <p className="pr-16 font-semibold text-slate-950 dark:text-white">
        {conference.name}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {conference.type || "No type"} - {conference.theme || "No theme"}
      </p>
      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {[conference.time, conference.location].filter(Boolean).join(" - ") ||
          "Time/location not set"}
      </p>
      <SuggestedByLine
        name={conference.suggestedByName}
        role={conference.suggestedByRole}
      />
    </VenueCard>
  );
}

function SuggestedByLine({ name, role }: { name?: string; role?: string }) {
  return (
    <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      Suggested by{" "}
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {name || "Unknown user"}
      </span>
      <span className="text-slate-400 dark:text-slate-500">
        {" "}
        · {role || "Unknown role"}
      </span>
    </p>
  );
}

function VenueCard({
  isAdmin,
  disabled,
  productionComplete,
  state,
  onAssign,
  onDelete,
  assignLabel,
  deleteLabel,
  children,
}: {
  isAdmin: boolean;
  disabled: boolean;
  productionComplete: boolean;
  state: SuggestedVenueState;
  onAssign: () => void;
  onDelete: () => void;
  assignLabel: string;
  deleteLabel: string;
  children: ReactNode;
}) {
  const meta = venueStateMeta(state);
  const canAssign =
    isAdmin &&
    !disabled &&
    (state.state === "idle" ||
      state.state === "rejected" ||
      state.state === "withdrawn");
  const canDelete = isAdmin && !disabled && state.state === "idle";
  const showActions = canAssign || canDelete;

  return (
    <div
      className={`group relative cursor-default rounded-lg border p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      {meta.tooltip && (
        <span className="pointer-events-none absolute left-4 top-full z-40 mt-2 max-w-72 translate-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700 opacity-0 shadow-xl shadow-slate-900/10 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
          {meta.tooltip}
        </span>
      )}
      {showActions ? (
        <div className="absolute right-2 top-2 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          {canAssign && (
            <ResearchIconButton
              type="button"
              onClick={onAssign}
              title={
                productionComplete
                  ? assignLabel
                  : "Research is still in production"
              }
              label={assignLabel}
              tone="blue"
              className="h-8 w-8"
            >
              <Send className="h-4 w-4" />
            </ResearchIconButton>
          )}
          {canDelete && (
            <ResearchIconButton
              type="button"
              onClick={onDelete}
              label={deleteLabel}
              tone="rose"
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </ResearchIconButton>
          )}
        </div>
      ) : meta.badge ? (
        <div className="absolute right-2 top-2">
          <span
            className={`inline-flex flex-col rounded-lg px-2.5 py-1 text-center text-[11px] font-black uppercase tracking-wide ring-1 ${meta.badgeClass}`}
          >
            {meta.badge}
            {state.state === "published" && state.publishedAt ? (
              <span className="mt-0.5 text-[10px] font-semibold normal-case tracking-normal">
                {shortDate(state.publishedAt)}
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function venueStateMeta(state: SuggestedVenueState) {
  if (state.state === "published") {
    return {
      cardClass:
        "border-blue-200 bg-blue-50/80 dark:border-blue-900/70 dark:bg-blue-950/30",
      badge: "Published",
      badgeClass:
        "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/70 dark:text-blue-200 dark:ring-blue-800",
      tooltip: "This venue has a published submission. Congratulations.",
    };
  }
  if (state.state === "accepted") {
    return {
      cardClass:
        "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/70 dark:bg-emerald-950/30",
      badge: "Accepted",
      badgeClass:
        "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-200 dark:ring-emerald-800",
      tooltip: "This venue has an accepted submission. Congratulations.",
    };
  }
  if (state.state === "reviewing") {
    return {
      cardClass:
        "border-amber-200 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/25",
      badge: "Reviewing",
      badgeClass:
        "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800",
      tooltip: "This venue has a submission in reviewing process, let wait.",
    };
  }
  if (state.state === "submitted") {
    return {
      cardClass:
        "border-amber-200 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/25",
      badge: "Submitted",
      badgeClass:
        "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800",
      tooltip: "This venue already has a submission, please wait.",
    };
  }
  if (state.state === "assigned") {
    return {
      cardClass:
        "border-amber-200 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/25",
      badge: "Assigned",
      badgeClass:
        "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800",
      tooltip:
        "This venue already has an assigned task to submit, please wait.",
    };
  }
  if (state.state === "rejected") {
    return {
      cardClass:
        "border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/50",
      badge: null,
      badgeClass: "",
      tooltip:
        "The submission to this venue is rejected. You could reassign another task to resubmit it.",
    };
  }
  if (state.state === "withdrawn") {
    return {
      cardClass:
        "border-rose-200 bg-rose-50/80 dark:border-rose-900/70 dark:bg-rose-950/25",
      badge: "Withdraw",
      badgeClass:
        "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-200 dark:ring-rose-800",
      tooltip:
        "The submission to this venue was withdrawn. You could assign another venue or create a new submission path.",
    };
  }
  if (state.state === "blocked") {
    return {
      cardClass:
        "border-slate-200 bg-slate-100/80 dark:border-slate-700 dark:bg-slate-800/50",
      badge: null,
      badgeClass: "",
      tooltip:
        "This research already has an accepted or published journal submission.",
    };
  }
  return {
    cardClass:
      "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    badge: null,
    badgeClass: "",
    tooltip: "",
  };
}

function ResultList({
  emptyText,
  children,
}: {
  emptyText: string;
  children: ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <div className="grid max-h-96 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-800">
      {hasChildren ? (
        children
      ) : (
        <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyText}
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
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${researchFieldClass} pl-9`}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <input
        readOnly
        value={value}
        className={`${researchFieldClass} bg-slate-100 text-slate-600 dark:text-slate-300`}
      />
    </label>
  );
}
