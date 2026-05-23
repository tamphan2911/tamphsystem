"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  addSuggestedConference,
  addSuggestedJournal,
  deleteSuggestedConference,
  deleteSuggestedJournal,
} from "../../actions";

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
  journals,
  suggested,
  conferences,
  suggestedConferences,
  isAdmin,
  disabled = false,
}: {
  projectId: string;
  journals: SuggestedJournalOption[];
  suggested: SuggestedJournalOption[];
  conferences: SuggestedConferenceOption[];
  suggestedConferences: SuggestedConferenceOption[];
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAddTab, setActiveAddTab] = useState<"journal" | "conference">(
    "journal",
  );
  const [addOpen, setAddOpen] = useState(false);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);
  const [journalQuery, setJournalQuery] = useState("");
  const [conferenceQuery, setConferenceQuery] = useState("");

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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-white">
            Suggested venues
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track journal and conference targets for this research.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            disabled={disabled}
            title={
              disabled
                ? "Research is locked. Unlock it before adding suggested venues."
                : "Add suggested venue"
            }
            onClick={() => setAddOpen(true)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:bg-slate-100 disabled:hover:shadow-none dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
          >
            <Plus className="h-4 w-4" />
            Add suggested venue
          </button>
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
              onDelete={() =>
                setDeleteVenue({ kind: "conference", item: conference })
              }
            />
          ))}
        </VenueSection>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Add suggested venue"
              icon={<Plus className="h-5 w-5" />}
              onClose={() => setAddOpen(false)}
            />
            <div className="grid gap-4 px-5 py-4">
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
          </div>
        </div>
      )}

      {deleteVenue && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Remove suggestion"
              icon={<Trash2 className="h-5 w-5" />}
              onClose={() => setDeleteVenue(null)}
            />
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Remove {deleteVenue.item.name} from suggested venues for this
                research?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteVenue(null)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={removeVenue}
                  className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
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
  onDelete,
}: {
  journal: SuggestedJournalOption;
  isAdmin: boolean;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      disabled={disabled}
      state={journal.venueState ?? { state: "idle" }}
      onDelete={onDelete}
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
  onDelete,
}: {
  conference: SuggestedConferenceOption;
  isAdmin: boolean;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <VenueCard
      isAdmin={isAdmin}
      disabled={disabled}
      state={conference.venueState ?? { state: "idle" }}
      onDelete={onDelete}
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
  state,
  onDelete,
  deleteLabel,
  children,
}: {
  isAdmin: boolean;
  disabled: boolean;
  state: SuggestedVenueState;
  onDelete: () => void;
  deleteLabel: string;
  children: ReactNode;
}) {
  const meta = venueStateMeta(state);
  const canDelete = isAdmin && !disabled && state.state === "idle";

  return (
    <div
      className={`group relative cursor-default rounded-lg border p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClass}`}
    >
      {meta.tooltip && (
        <span className="pointer-events-none absolute left-4 top-full z-40 mt-2 max-w-72 translate-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-700 opacity-0 shadow-xl shadow-slate-900/10 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
          {meta.tooltip}
        </span>
      )}
      {canDelete ? (
        <div className="absolute right-2 top-2 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
            aria-label={deleteLabel}
          >
            <Trash2 className="h-4 w-4" />
          </button>
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

function DialogHeader({
  title,
  icon,
  onClose,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
          {icon}
        </span>
        <h3 className="text-base font-bold text-slate-950 dark:text-white">
          {title}
        </h3>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
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
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </div>
  );
}
