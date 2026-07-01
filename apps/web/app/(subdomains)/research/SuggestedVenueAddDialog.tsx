"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Building2, Plus, Search, X } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  cx,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import {
  PublisherPicker,
  type PublisherPickerItem,
} from "@/sites/research/components/PublisherPicker";

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
  publisherSlot?: SuggestedVenuePublisherSlotNotice;
} | void;

export type SuggestedVenuePublisherSlot = {
  kind: "suggestedVenue" | "submission";
  journalName: string;
  status: string;
  dateLabel: string;
  dateValue: string;
};

export type SuggestedVenuePublisherSlotNotice = {
  mode: "confirm" | "blocked";
  publisherName: string;
  slotCount: number;
  slots: SuggestedVenuePublisherSlot[];
};

export function SuggestedVenueAddDialog({
  open,
  onClose,
  journals,
  conferences,
  publishers,
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
  publishers: PublisherPickerItem[];
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
  const [manualJournalEntry, setManualJournalEntry] = useState(false);
  const [selectedPublisher, setSelectedPublisher] =
    useState<PublisherPickerItem | null>(null);
  const [publisherSlotNotice, setPublisherSlotNotice] =
    useState<SuggestedVenuePublisherSlotNotice | null>(null);
  const pendingPublisherSlotFormRef = useRef<FormData | null>(null);
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
    setManualJournalEntry(false);
    setSelectedPublisher(null);
    setPublisherSlotNotice(null);
    pendingPublisherSlotFormRef.current = null;
  }

  function clearManualVenueFields() {
    setFreeVenueName("");
    setFreeVenueLink("");
    setFreeJournalApc("");
    setFreeJournalSubmissionFee("");
    setSelectedPublisher(null);
  }

  function setManualJournalMode(checked: boolean) {
    setManualJournalEntry(checked);
    setSelectedVenue(null);
    setJournalQuery("");
    if (!checked) clearManualVenueFields();
  }

  function closeDialog() {
    reset();
    onClose();
  }

  function sendVenueFormData(formData: FormData) {
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result?.publisherSlot) {
        pendingPublisherSlotFormRef.current =
          result.publisherSlot.mode === "confirm" ? formData : null;
        setPublisherSlotNotice(result.publisherSlot);
        return;
      }
      if (result?.ok === false) {
        onError?.(result);
        return;
      }
      onSuccess?.(formData);
      closeDialog();
    });
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
      if (activeTab === "journal" && selectedPublisher) {
        formData.set("publisherId", selectedPublisher.id);
      }
    }
    if (freeVenueNote.trim()) formData.set("note", freeVenueNote.trim());

    sendVenueFormData(formData);
  }

  function confirmPublisherSlotWarning() {
    const formData = pendingPublisherSlotFormRef.current;
    if (!formData || isPending) return;
    formData.set("publisherSlotConfirmed", "true");
    pendingPublisherSlotFormRef.current = null;
    setPublisherSlotNotice(null);
    sendVenueFormData(formData);
  }

  const canSubmit = Boolean(
    selectedVenue ||
      (activeTab === "journal"
        ? manualJournalEntry &&
          (freeVenueName.trim() || freeVenueLink.trim())
        : freeVenueName.trim() || freeVenueLink.trim()),
  );

  return (
    <>
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
            className="suggested-venue-kind-tabs grid w-full grid-cols-2 gap-1 border border-slate-200 bg-slate-50/80 p-1 dark:border-[#444444] dark:bg-[#202020]"
          >
            {(["journal", "conference"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  if (activeTab === tab) return;
                  setActiveTab(tab);
                  setSelectedVenue(null);
                  setJournalQuery("");
                  setConferenceQuery("");
                  setManualJournalEntry(false);
                  clearManualVenueFields();
                }}
                data-research-toggle-tab="true"
                data-active={activeTab === tab}
                className={cx(
                  "suggested-venue-kind-tab cursor-pointer border px-3 py-2 text-sm font-normal transition duration-150 ease-out",
                  activeTab === tab
                    ? "border-sky-200 bg-sky-50/80 text-[#1F7180] dark:border-[#444444] dark:bg-[#383838] dark:text-[#A8DADC]"
                    : "border-transparent text-[#667085] hover:border-slate-200 hover:bg-white hover:text-slate-900 dark:text-[#B0B0B0] dark:hover:border-[#444444] dark:hover:bg-[#303030] dark:hover:text-[#E4E4E4]",
                )}
              >
                {tab === "journal" ? "Journals" : "Conferences"}
              </button>
            ))}
          </div>

        {activeTab === "journal" ? (
          <>
            {!manualJournalEntry ? (
              <div className="animate-[modalPanelIn_180ms_ease-out]">
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
              </div>
            ) : null}
            <ManualVenueToggle
              checked={manualJournalEntry}
              onChange={setManualJournalMode}
            />
            {manualJournalEntry ? (
              <FreeVenueFields
                name={freeVenueName}
                link={freeVenueLink}
                apc={freeJournalApc}
                submissionFee={freeJournalSubmissionFee}
                publishers={publishers}
                selectedPublisher={selectedPublisher}
                onNameChange={setFreeVenueName}
                onLinkChange={setFreeVenueLink}
                onApcChange={setFreeJournalApc}
                onSubmissionFeeChange={setFreeJournalSubmissionFee}
                onPublisherChange={setSelectedPublisher}
                kind="journal"
              />
            ) : null}
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

      <PublisherSlotNoticeModal
        notice={publisherSlotNotice}
        isPending={isPending}
        onClose={() => {
          pendingPublisherSlotFormRef.current = null;
          setPublisherSlotNotice(null);
        }}
        onConfirm={confirmPublisherSlotWarning}
      />
    </>
  );
}

function PublisherSlotNoticeModal({
  notice,
  isPending,
  onClose,
  onConfirm,
}: {
  notice: SuggestedVenuePublisherSlotNotice | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!notice) return null;

  const blocked = notice.mode === "blocked";
  const title = blocked
    ? "Publisher target limit reached"
    : "Confirm publisher target";
  const slotWord = notice.slotCount === 1 ? "slot" : "slots";
  const associatedWord =
    notice.slotCount === 1 ? "target journal" : "target journals";

  return (
    <ResearchModal
      open={Boolean(notice)}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      bodyClassName="px-5 py-4"
      headerActions={
        !blocked ? (
          <ResearchButton
            type="button"
            tone="secondary"
            onClick={onConfirm}
            disabled={isPending}
          >
            Confirm suggestion
          </ResearchButton>
        ) : null
      }
      footer={
        <div className="flex justify-end">
          <ResearchButton type="button" tone="quiet" onClick={onClose}>
            Close
          </ResearchButton>
        </div>
      }
    >
      <div className="grid gap-4 text-sm leading-6">
        <p className="text-slate-700 dark:text-[#D0D0D0]">
          {blocked
            ? `This research already has ${notice.slotCount} active ${associatedWord} from ${notice.publisherName}. A research can have at most 2 active journal targets from the same publisher at the same time.`
            : `Careful, this publisher already has ${notice.slotCount} active ${associatedWord} associated with this research.`}
        </p>

        <ol className="grid gap-2">
          {notice.slots.map((slot, index) => (
            <li
              key={`${slot.kind}-${slot.journalName}-${index}`}
              className="border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#D0D0D0]"
            >
              <span className="font-normal text-slate-950 dark:text-[#E4E4E4]">
                {index + 1}.{" "}
                {slot.kind === "suggestedVenue"
                  ? "Suggested venue"
                  : "Submission"}
                :
              </span>{" "}
              {slot.journalName} | {slot.status} | {slot.dateLabel}:{" "}
              {slot.dateValue}
            </li>
          ))}
        </ol>

        <p
          className={`border px-3 py-2 text-sm ${
            blocked
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-200"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200"
          }`}
        >
          {blocked
            ? `${notice.slotCount} ${slotWord} for target journals from ${notice.publisherName} are taken. Please suggest a journal from another publisher, or wait until one ongoing suggested venue/submission from this publisher is finished.`
            : `If you suggest this venue, the research will use another publisher slot for ${notice.publisherName}. You may need to wait until the ongoing suggested venue or submission finishes before proceeding with additional journals from this publisher.`}
        </p>
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

function ManualVenueToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm transition duration-150 ease-out hover:border-slate-300 hover:bg-white dark:border-[#444444] dark:bg-[#202020] dark:hover:border-[#5A5A5A] dark:hover:bg-[#2C2C2C]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-[#1F7180] transition duration-150 ease-out dark:accent-[#A8DADC]"
      />
      <span className="grid gap-1">
        <span className="font-normal text-slate-800 transition group-hover:text-slate-950 dark:text-[#E4E4E4] dark:group-hover:text-white">
          I cannot find this journal on the site, so I want to enter a new
          journal suggestion manually.
        </span>
        <span className="text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          Leave this unchecked to search and choose an existing on-site journal.
        </span>
      </span>
    </label>
  );
}

function FreeVenueFields({
  name,
  link,
  apc,
  submissionFee,
  publishers = [],
  selectedPublisher,
  onNameChange,
  onLinkChange,
  onApcChange,
  onSubmissionFeeChange,
  onPublisherChange,
  kind,
}: {
  name: string;
  link: string;
  apc?: string;
  submissionFee?: string;
  publishers?: PublisherPickerItem[];
  selectedPublisher?: PublisherPickerItem | null;
  onNameChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onApcChange?: (value: string) => void;
  onSubmissionFeeChange?: (value: string) => void;
  onPublisherChange?: (value: PublisherPickerItem | null) => void;
  kind: "journal" | "conference";
}) {
  return (
    <div className="grid gap-3 border border-slate-200 bg-slate-50/70 p-3 animate-[modalPanelIn_220ms_ease-out] sm:grid-cols-2 dark:border-[#444444] dark:bg-[#202020]">
      {kind === "journal" ? (
        <div className="grid gap-1.5 sm:col-span-2">
          <PublisherPicker
            key={selectedPublisher?.id ?? "empty-suggested-publisher"}
            publishers={publishers}
            initialPublisherId={selectedPublisher?.id}
            initialPublisherName={selectedPublisher?.name}
            required={false}
            showLabel={false}
            placeholder="Search publisher on the site..."
            onSelectionChange={onPublisherChange}
          />
          <p className="flex items-start gap-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            <Building2 className="mt-0.5 h-3.5 w-3.5 flex-none text-violet-600 dark:text-violet-300" />
            <span>
              Search for the publisher of the new journal first. If the
              publisher is not on the site yet, leave this empty.
            </span>
          </p>
        </div>
      ) : null}
      <label className="grid gap-1.5 sm:col-span-2">
        <span className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
          {kind === "journal" ? "Journal name" : "Conference name"}
        </span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Venue name"
          className={researchFieldClass}
        />
      </label>
      <label className="grid gap-1.5 sm:col-span-2">
        <span className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
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
            <span className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
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
            <span className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
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
