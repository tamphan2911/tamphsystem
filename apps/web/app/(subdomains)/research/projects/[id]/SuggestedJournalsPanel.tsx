"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ClipboardList,
  Plus,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  addSuggestedConference,
  addSuggestedJournal,
  createResearchTask,
  deleteSuggestedConference,
  deleteSuggestedJournal,
} from "../../actions";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchDetailSection } from "@/sites/research/components/ResearchDetailSection";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  researchFieldClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
  canAssignTask,
  canSuggestVenue,
  disabled = false,
}: {
  projectId: string;
  projectTitle: string;
  journals: SuggestedJournalOption[];
  suggested: SuggestedJournalOption[];
  conferences: SuggestedConferenceOption[];
  suggestedConferences: SuggestedConferenceOption[];
  assistants: TaskAssigneeOption[];
  isAdmin: boolean;
  canAssignTask: boolean;
  canSuggestVenue: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAddTab, setActiveAddTab] = useState<"journal" | "conference">(
    "journal",
  );
  const [addOpen, setAddOpen] = useState(false);
  const [assignVenue, setAssignVenue] = useState<Venue | null>(null);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);
  const [selectedAddVenue, setSelectedAddVenue] = useState<Venue | null>(null);
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

  const assistantResults = useMemo(() => {
    const needle = assistantQuery.trim().toLowerCase();
    if (!needle) return [];
    return assistants
      .filter((assistant) => {
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

  function closeAddVenue() {
    setAddOpen(false);
    setJournalQuery("");
    setConferenceQuery("");
    setSelectedAddVenue(null);
  }

  function addJournal(journalId: string) {
    if (disabled) return;
    const formData = new FormData();
    formData.set("journalId", journalId);
    startTransition(async () => {
      await addSuggestedJournal(projectId, formData);
      closeAddVenue();
      showSuccess({
        title: "Suggested venue added",
        detail: "The journal was added to this research suggested venues.",
      });
      router.refresh();
    });
  }

  function addConference(conferenceId: string) {
    if (disabled) return;
    const formData = new FormData();
    formData.set("conferenceId", conferenceId);
    startTransition(async () => {
      await addSuggestedConference(projectId, formData);
      closeAddVenue();
      showSuccess({
        title: "Suggested venue added",
        detail: "The conference was added to this research suggested venues.",
      });
      router.refresh();
    });
  }

  function addSelectedVenue() {
    if (!selectedAddVenue || isPending) return;
    if (selectedAddVenue.kind === "journal") {
      addJournal(selectedAddVenue.item.id);
    } else {
      addConference(selectedAddVenue.item.id);
    }
  }

  function removeVenue() {
    if (disabled) return;
    if (!deleteVenue) return;
    const removedVenueName = deleteVenue.item.name;
    startTransition(async () => {
      if (deleteVenue.kind === "journal") {
        await deleteSuggestedJournal(projectId, deleteVenue.item.id);
      } else {
        await deleteSuggestedConference(projectId, deleteVenue.item.id);
      }
      setDeleteVenue(null);
      showSuccess({
        title: "Suggested venue removed",
        detail: `${removedVenueName} was removed from this research suggested venues.`,
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
    setTaskMode("submit");
    setAssignVenue(venue);
  }

  const assignName = assignVenue?.item.name ?? "";
  const assignKind = assignVenue?.kind ?? "journal";

  return (
    <ResearchDetailSection>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
            Suggested venues
          </h2>
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
              disabled={disabled}
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
              canAssignTask={canAssignTask}
              disabled={disabled}
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
          onClose={closeAddVenue}
          title="Add suggested venue"
          icon={<Plus className="h-5 w-5" />}
          maxWidth="max-w-3xl"
          bodyClassName="min-h-[25rem] px-5 py-4"
          headerActions={
            <ResearchButton
              type="button"
              onClick={addSelectedVenue}
              disabled={!selectedAddVenue || isPending}
            >
              <Plus className="h-4 w-4" />
              Add venue
            </ResearchButton>
          }
        >
          <div className="grid gap-4">
            <div className="inline-flex w-fit border border-[#444444] bg-[#202020]">
              {(["journal", "conference"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveAddTab(tab);
                    setSelectedAddVenue(null);
                  }}
                  className={`cursor-pointer border-r border-[#303030] px-3 py-2 text-xs font-normal transition last:border-r-0 hover:border-[#444444] ${
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
                      onClick={() =>
                        setSelectedAddVenue({ kind: "journal", item: journal })
                      }
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
                      onClick={() =>
                        setSelectedAddVenue({
                          kind: "conference",
                          item: conference,
                        })
                      }
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
          headerActions={
            <ResearchButton
              form="suggested-venue-task-form"
              disabled={selectedAssistantIds.length === 0 || isPending}
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

            <div className="inline-flex w-fit border border-[#444444] bg-[#202020]">
              {(["submit", "other"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTaskMode(mode)}
                  className={`cursor-pointer border-r border-[#303030] px-3 py-2 text-xs font-normal transition last:border-r-0 hover:border-[#444444] ${
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
                <ResearchDatePicker name="dueDate" />
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
              <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
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
              <div className="grid max-h-72 overflow-y-auto border border-[#444444]">
                {assistantResults.map((assistant) => {
                  const selected = selectedAssistantIds.includes(assistant.id);
                  return (
                    <button
                      key={assistant.id}
                      type="button"
                      onClick={() => toggleAssistant(assistant.id)}
                      className={`flex cursor-pointer items-center justify-between gap-3 border-y px-3 py-2 text-left transition first:border-t-transparent last:border-b-transparent first:hover:border-t-transparent last:hover:border-b-transparent ${
                        selected
                          ? "border-[#444444] bg-[#303030] text-[#A8DADC]"
                          : "border-transparent bg-[#202020] text-[#E4E4E4] hover:border-[#444444] hover:bg-[#303030]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <UserRound className="h-4 w-4 flex-none text-[#B0B0B0]" />
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
                {assistantResults.length === 0 && (
                  <div className="py-10 text-center text-sm text-[#B0B0B0]">
                    {assistantQuery.trim()
                      ? "No user matches this search."
                      : "Search and choose assignees."}
                  </div>
                )}
              </div>
            </div>
          </form>
        </ResearchModal>
      )}
    </ResearchDetailSection>
  );
}

function resultButtonClass(selected: boolean) {
  return `cursor-pointer border-t px-3 py-2 text-left transition first:border-t-transparent first:hover:border-t-transparent disabled:cursor-wait ${
    selected
      ? "border-[#444444] bg-[#303030]"
      : "border-transparent bg-[#202020] hover:border-[#444444] hover:bg-[#303030]"
  }`;
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

function JournalCard({
  journal,
  isAdmin,
  canAssignTask,
  disabled,
  onAssign,
  onDelete,
}: {
  journal: SuggestedJournalOption;
  isAdmin: boolean;
  canAssignTask: boolean;
  disabled: boolean;
  onAssign: () => void;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      canAssignTask={canAssignTask}
      disabled={disabled}
      state={journal.venueState ?? { state: "idle" }}
      onAssign={onAssign}
      onDelete={onDelete}
      assignLabel="Assign journal submission task"
      deleteLabel="Delete suggested journal"
    >
      <p className="pr-16 font-normal text-[#E4E4E4]">{journal.name}</p>
      <p className="mt-1 text-xs text-[#B0B0B0]">
        {journal.field || "No field"} - {journal.rank || "No rank"} -{" "}
        {journal.publisher || "No publisher"}
      </p>
      {journal.apc && (
        <p className="mt-2 text-xs font-normal text-[#B0B0B0]">
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
  canAssignTask,
  disabled,
  onAssign,
  onDelete,
}: {
  conference: SuggestedConferenceOption;
  isAdmin: boolean;
  canAssignTask: boolean;
  disabled: boolean;
  onAssign: () => void;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      canAssignTask={canAssignTask}
      disabled={disabled}
      state={conference.venueState ?? { state: "idle" }}
      onAssign={onAssign}
      onDelete={onDelete}
      assignLabel="Assign conference submission task"
      deleteLabel="Delete suggested conference"
    >
      <p className="pr-16 font-normal text-[#E4E4E4]">{conference.name}</p>
      <p className="mt-1 text-xs text-[#B0B0B0]">
        {conference.type || "No type"} - {conference.theme || "No theme"}
      </p>
      <p className="mt-2 text-xs font-normal text-[#B0B0B0]">
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
    <p className="mt-3 border-t border-[#444444] pt-2 text-xs text-[#B0B0B0]">
      Suggested by{" "}
      <span className="font-normal text-[#E4E4E4]">
        {name || "Unknown user"}
      </span>
      <span className="text-[#B0B0B0]"> · {role || "Unknown role"}</span>
    </p>
  );
}

function VenueCard({
  isAdmin,
  canAssignTask,
  disabled,
  state,
  onAssign,
  onDelete,
  assignLabel,
  deleteLabel,
  children,
}: {
  isAdmin: boolean;
  canAssignTask: boolean;
  disabled: boolean;
  state: SuggestedVenueState;
  onAssign: () => void;
  onDelete: () => void;
  assignLabel: string;
  deleteLabel: string;
  children: ReactNode;
}) {
  const meta = venueStateMeta(state);
  const canAssign =
    canAssignTask &&
    !disabled &&
    (state.state === "idle" ||
      state.state === "rejected" ||
      state.state === "withdrawn");
  const canDelete = isAdmin && !disabled && state.state === "idle";
  const showActions = canAssign || canDelete;

  return (
    <div
      className={`group relative cursor-default border p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      {meta.tooltip && (
        <span className="pointer-events-none absolute left-4 top-full z-40 mt-2 max-w-72 translate-y-1 border border-[#444444] bg-[#202020] px-3 py-2 text-xs font-normal leading-5 text-[#E4E4E4] opacity-0 shadow-xl shadow-black/30 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          {meta.tooltip}
        </span>
      )}
      {showActions ? (
        <div className="absolute right-2 top-2 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          {canAssign && (
            <IconHint label={assignLabel}>
              <button
                type="button"
                onClick={onAssign}
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
                onClick={onDelete}
                aria-label={deleteLabel}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-rose-300 focus-visible:ring-2 focus-visible:ring-rose-300/35"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </IconHint>
          )}
        </div>
      ) : meta.badge ? (
        <div className="absolute right-2 top-2">
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
      cardClass: "border-[#444444] bg-[#303030]",
      badge: "Published",
      badgeClass: "border-[#444444] bg-[#202020] text-[#A8DADC]",
      tooltip: "This venue has a published submission. Congratulations.",
    };
  }
  if (state.state === "accepted") {
    return {
      cardClass: "border-[#444444] bg-[#303030]",
      badge: "Accepted",
      badgeClass: "border-[#444444] bg-[#202020] text-[#A8DADC]",
      tooltip: "This venue has an accepted submission. Congratulations.",
    };
  }
  if (state.state === "reviewing") {
    return {
      cardClass: "border-[#444444] bg-[#303030]",
      badge: "Reviewing",
      badgeClass: "border-[#444444] bg-[#202020] text-[#B39CD0]",
      tooltip: "This venue has a submission in reviewing process, let wait.",
    };
  }
  if (state.state === "submitted") {
    return {
      cardClass: "border-[#444444] bg-[#303030]",
      badge: "Submitted",
      badgeClass: "border-[#444444] bg-[#202020] text-[#FFC1CC]",
      tooltip: "This venue already has a submission, please wait.",
    };
  }
  if (state.state === "assigned") {
    return {
      cardClass: "border-[#444444] bg-[#303030]",
      badge: "Assigned",
      badgeClass: "border-[#444444] bg-[#202020] text-[#FFC1CC]",
      tooltip:
        "This venue already has an assigned task to submit, please wait.",
    };
  }
  if (state.state === "rejected") {
    return {
      cardClass: "border-[#444444] bg-[#303030]",
      badge: null,
      badgeClass: "",
      tooltip:
        "The submission to this venue is rejected. You could reassign another task to resubmit it.",
    };
  }
  if (state.state === "withdrawn") {
    return {
      cardClass: "border-[#444444] bg-[#303030]",
      badge: "Withdraw",
      badgeClass: "border-[#444444] bg-[#202020] text-rose-300",
      tooltip:
        "The submission to this venue was withdrawn. You could assign another venue or create a new submission path.",
    };
  }
  if (state.state === "blocked") {
    return {
      cardClass: "border-[#444444] bg-[#303030]",
      badge: null,
      badgeClass: "",
      tooltip:
        "This research already has an accepted or published journal submission.",
    };
  }
  return {
    cardClass: "border-[#444444] bg-[#2C2C2C] hover:bg-[#383838]",
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

  return (
    <div className="grid max-h-56 overflow-y-auto border border-[#444444]">
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
