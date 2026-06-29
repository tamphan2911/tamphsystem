"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Plus, Search, X } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";

export type SuggestedVenueAddJournalOption = {
  id: string;
  venueId: string;
  name: string;
  venueLink: string;
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
};

export type SuggestedVenueAddConferenceOption = {
  id: string;
  venueId: string;
  name: string;
  venueLink: string;
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
};

type AddVenue =
  | { kind: "journal"; item: SuggestedVenueAddJournalOption }
  | { kind: "conference"; item: SuggestedVenueAddConferenceOption };

export type SuggestedVenueAddResult = {
  ok?: boolean;
  message?: string;
} | void;

export function SuggestedVenueAddDialog({
  open,
  onClose,
  journals,
  conferences,
  excludedJournalIds = [],
  excludedConferenceIds = [],
  onSubmit,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  journals: SuggestedVenueAddJournalOption[];
  conferences: SuggestedVenueAddConferenceOption[];
  excludedJournalIds?: string[];
  excludedConferenceIds?: string[];
  onSubmit: (formData: FormData) => Promise<SuggestedVenueAddResult>;
  onSuccess?: (formData: FormData) => void;
  onError?: (result: Exclude<SuggestedVenueAddResult, void>) => void;
}) {
  const [activeTab, setActiveTab] = useState<"journal" | "conference">(
    "journal",
  );
  const [selectedVenue, setSelectedVenue] = useState<AddVenue | null>(null);
  const [journalQuery, setJournalQuery] = useState("");
  const [conferenceQuery, setConferenceQuery] = useState("");
  const [freeVenueName, setFreeVenueName] = useState("");
  const [freeVenueLink, setFreeVenueLink] = useState("");
  const [freeJournalApc, setFreeJournalApc] = useState("");
  const [freeJournalSubmissionFee, setFreeJournalSubmissionFee] = useState("");
  const [freeVenueNote, setFreeVenueNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const excludedJournalIdSet = useMemo(
    () => new Set(excludedJournalIds),
    [excludedJournalIds],
  );
  const excludedConferenceIdSet = useMemo(
    () => new Set(excludedConferenceIds),
    [excludedConferenceIds],
  );

  const journalResults = useMemo(() => {
    const needle = journalQuery.trim().toLowerCase();
    if (!needle) return [];
    return journals
      .filter((journal) => !excludedJournalIdSet.has(journal.venueId))
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
      .slice(0, 12);
  }, [excludedJournalIdSet, journalQuery, journals]);

  const conferenceResults = useMemo(() => {
    const needle = conferenceQuery.trim().toLowerCase();
    if (!needle) return [];
    return conferences
      .filter((conference) => !excludedConferenceIdSet.has(conference.venueId))
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
      .slice(0, 12);
  }, [conferenceQuery, conferences, excludedConferenceIdSet]);

  function reset() {
    setActiveTab("journal");
    setSelectedVenue(null);
    setJournalQuery("");
    setConferenceQuery("");
    setFreeVenueName("");
    setFreeVenueLink("");
    setFreeJournalApc("");
    setFreeJournalSubmissionFee("");
    setFreeVenueNote("");
  }

  function closeDialog() {
    reset();
    onClose();
  }

  function submitVenue() {
    if (isPending) return;
    const formData = new FormData();
    formData.set("venueKind", activeTab);
    if (selectedVenue?.kind === "journal") {
      formData.set("journalId", selectedVenue.item.venueId);
    } else if (selectedVenue?.kind === "conference") {
      formData.set("conferenceId", selectedVenue.item.venueId);
    } else {
      if (freeVenueName.trim()) {
        formData.set("venueName", freeVenueName.trim());
      }
      if (freeVenueLink.trim()) {
        formData.set("venueLink", freeVenueLink.trim());
      }
      if (activeTab === "journal" && freeJournalApc.trim()) {
        formData.set("apc", freeJournalApc.trim());
      }
      if (activeTab === "journal" && freeJournalSubmissionFee.trim()) {
        formData.set("submissionFee", freeJournalSubmissionFee.trim());
      }
    }
    if (freeVenueNote.trim()) formData.set("note", freeVenueNote.trim());

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result?.ok === false) {
        onError?.(result);
        return;
      }
      onSuccess?.(formData);
      closeDialog();
    });
  }

  const canSubmit = Boolean(
    selectedVenue || freeVenueName.trim() || freeVenueLink.trim(),
  );

  return (
    <ResearchModal
      open={open}
      onClose={closeDialog}
      title="Add suggested venue"
      icon={<Plus className="h-5 w-5" />}
      maxWidth="max-w-3xl"
      bodyClassName="min-h-[25rem] px-5 py-4"
      headerActions={
        <ResearchButton
          type="button"
          onClick={submitVenue}
          disabled={isPending || !canSubmit}
        >
          <Plus className="h-4 w-4" />
          Add venue
        </ResearchButton>
      }
    >
      <div className="grid gap-4">
        <div
          data-research-toggle-tabs="true"
          className="suggested-venue-kind-tabs grid w-full grid-cols-2 border border-[#444444] bg-[#202020]"
        >
          {(["journal", "conference"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSelectedVenue(null);
                setJournalQuery("");
                setConferenceQuery("");
              }}
              data-research-toggle-tab="true"
              data-active={activeTab === tab}
              className={`suggested-venue-kind-tab cursor-pointer border-r border-[#303030] px-3 py-2 text-sm font-normal transition last:border-r-0 hover:border-[#444444] ${
                activeTab === tab
                  ? "border-[#444444] bg-[#383838] text-[#A8DADC] shadow-none"
                  : "text-[#B0B0B0] hover:bg-[#303030] hover:text-[#E4E4E4]"
              }`}
            >
              {tab === "journal" ? "Journals" : "Conferences"}
            </button>
          ))}
        </div>

        {activeTab === "journal" ? (
          <>
            <AddVenuePicker
              kind="journal"
              query={journalQuery}
              selectedVenue={
                selectedVenue?.kind === "journal" ? selectedVenue : null
              }
              journals={journalResults}
              conferences={[]}
              placeholder="Search journal name, ISSN, field, rank, publisher..."
              onQueryChange={(value) => {
                setJournalQuery(value);
                setSelectedVenue(null);
              }}
              onSelect={(venue) => {
                setSelectedVenue(venue);
                setJournalQuery("");
              }}
              onClear={() => {
                setSelectedVenue(null);
                setJournalQuery("");
              }}
            />
            {!selectedVenue && (
              <p className="text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                Search the journal list first and pick the journal if it is
                already on the site. If it is not available, enter the journal
                name, link, and fee information below so the suggestion can be
                reviewed and linked later.
              </p>
            )}
            {!selectedVenue && (
              <FreeVenueFields
                name={freeVenueName}
                link={freeVenueLink}
                apc={freeJournalApc}
                submissionFee={freeJournalSubmissionFee}
                onNameChange={setFreeVenueName}
                onLinkChange={setFreeVenueLink}
                onApcChange={setFreeJournalApc}
                onSubmissionFeeChange={setFreeJournalSubmissionFee}
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
          </>
        ) : (
          <>
            <AddVenuePicker
              kind="conference"
              query={conferenceQuery}
              selectedVenue={
                selectedVenue?.kind === "conference" ? selectedVenue : null
              }
              journals={[]}
              conferences={conferenceResults}
              placeholder="Search conference, organizer, theme, location..."
              onQueryChange={(value) => {
                setConferenceQuery(value);
                setSelectedVenue(null);
              }}
              onSelect={(venue) => {
                setSelectedVenue(venue);
                setConferenceQuery("");
              }}
              onClear={() => {
                setSelectedVenue(null);
                setConferenceQuery("");
              }}
            />
            {!selectedVenue && (
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
          </>
        )}
      </div>
    </ResearchModal>
  );
}

function AddVenuePicker({
  kind,
  query,
  selectedVenue,
  journals,
  conferences,
  placeholder,
  onQueryChange,
  onSelect,
  onClear,
}: {
  kind: "journal" | "conference";
  query: string;
  selectedVenue: AddVenue | null;
  journals: SuggestedVenueAddJournalOption[];
  conferences: SuggestedVenueAddConferenceOption[];
  placeholder?: string;
  onQueryChange: (value: string) => void;
  onSelect: (venue: AddVenue) => void;
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
          placeholder ??
          (kind === "journal"
            ? "Search journal to link..."
            : "Search conference to link...")
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
                onClick={() => onSelect({ kind, item } as AddVenue)}
                className={`${researchDropdownItemClass} cursor-pointer ${researchDropdownItemIdleClass}`}
              >
                <span className="min-w-0 px-3">
                  <span className="block truncate text-sm font-normal">
                    {item.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                    {kind === "journal"
                      ? `${(item as SuggestedVenueAddJournalOption).issn || "No ISSN"} | ${
                          (item as SuggestedVenueAddJournalOption).publisher ||
                          "No publisher"
                        }`
                      : `${
                          (item as SuggestedVenueAddConferenceOption)
                            .organizer || "No organizer"
                        } | ${
                          (item as SuggestedVenueAddConferenceOption)
                            .location || "No location"
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

function FreeVenueFields({
  name,
  link,
  apc,
  submissionFee,
  onNameChange,
  onLinkChange,
  onApcChange,
  onSubmissionFeeChange,
  kind,
}: {
  name: string;
  link: string;
  apc?: string;
  submissionFee?: string;
  onNameChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onApcChange?: (value: string) => void;
  onSubmissionFeeChange?: (value: string) => void;
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
      {kind === "journal" ? (
        <>
          <label className="grid gap-1.5">
            <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              APC
            </span>
            <input
              value={apc ?? ""}
              onChange={(event) => onApcChange?.(event.target.value)}
              placeholder="Example: free, USD 500, waived"
              className={researchFieldClass}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              Submission fee
            </span>
            <input
              value={submissionFee ?? ""}
              onChange={(event) => onSubmissionFeeChange?.(event.target.value)}
              placeholder="Example: no fee, USD 50"
              className={researchFieldClass}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
