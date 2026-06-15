"use client";

import { useMemo, useState, useTransition } from "react";
import { ClipboardCheck, Loader2, PlusCircle } from "lucide-react";
import { createAcademicReview } from "../actions";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

type JournalOption = {
  id: string;
  name: string;
  publisher: string;
};

const inputClass =
  "h-12 border border-[#444444] bg-[#2C2C2C] px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-[#A8B2C2] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838] dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A]";
const dateInputClass = researchFieldClass;
const labelClass = "grid gap-1.5 text-sm font-semibold text-[#E4E4E4]";
const helperClass = "text-xs font-normal leading-5 text-[#B0B0B0]";
const reviewStatusOptions = [
  { value: "ACCEPTED", label: "Accepted - agreed to review" },
  { value: "IN_PROGRESS", label: "In progress - reading/writing review" },
  { value: "SUBMITTED", label: "Submitted - review sent to journal" },
  { value: "CANCELLED", label: "Cancelled - journal cancelled the request" },
];

function JournalPicker({
  journals,
  value,
  onChange,
}: {
  journals: JournalOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedJournal = journals.find((journal) => journal.id === value);
  const filteredJournals = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const options = journals;
    if (!needle) return options.slice(0, 8);
    return options
      .filter((journal) =>
        [journal.name, journal.publisher]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [journals, query]);
  const options = useMemo<ResearchSearchPickerOption<JournalOption>[]>(
    () =>
      filteredJournals.map((journal) => ({
        id: journal.id,
        label: journal.name,
        description: journal.publisher || "No publisher",
        data: journal,
      })),
    [filteredJournals],
  );

  return (
    <ResearchSearchPicker
      label="Journal"
      required
      name="journalId"
      selected={
        selectedJournal
          ? {
              id: selectedJournal.id,
              label: selectedJournal.name,
              description: selectedJournal.publisher || "No publisher",
              data: selectedJournal,
            }
          : null
      }
      query={query}
      onQueryChange={(nextQuery) => {
        setQuery(nextQuery);
        onChange("");
      }}
      onSelect={(option) => {
        onChange(option.id);
        setQuery("");
      }}
      onClear={() => {
        onChange("");
        setQuery("");
      }}
      options={options}
      placeholder="Search journal"
      emptyText="No journal matches this search."
    />
  );
}

export function NewReviewDialog({ journals }: { journals: JournalOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedJournalId, setSelectedJournalId] = useState("");
  const toast = useResearchToast();

  const closeDialog = () => {
    setSelectedJournalId("");
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-emerald-200 bg-emerald-100/80 px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm shadow-emerald-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md hover:shadow-emerald-900/10 focus:outline-none focus:ring-4 focus:ring-emerald-200/70 dark:border-emerald-700/60 dark:bg-emerald-900/35 dark:text-emerald-100 dark:hover:border-emerald-500/70 dark:hover:bg-emerald-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-emerald-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        New Review
      </button>

      <ResearchModal
        open={isOpen}
        onClose={closeDialog}
        title="Add academic review"
        description="Track review invitations, deadlines, and private notes."
        icon={<ClipboardCheck className="h-5 w-5" />}
        headerActions={
          <ResearchButton form="new-review-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Add Review
          </ResearchButton>
        }
      >
        <form
          id="new-review-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await createAcademicReview(formData);
              closeDialog();
              toast.showSuccess({
                title: "Review added",
                detail: "The academic review record is ready to track.",
              });
            });
          }}
          className="grid gap-5"
        >
          <section className="grid gap-4">
            <JournalPicker
              journals={journals}
              value={selectedJournalId}
              onChange={setSelectedJournalId}
            />
            <input
              tabIndex={-1}
              aria-hidden="true"
              required
              readOnly
              value={selectedJournalId}
              className="pointer-events-none absolute h-px w-px opacity-0"
            />
            <div className="grid gap-4">
              <label className={labelClass}>
                <span>
                  Manuscript title
                  <span className="research-required-mark">(*)</span>
                </span>
                <input
                  name="manuscriptTitle"
                  required
                  placeholder="Title from the journal system"
                  className={inputClass}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Manuscript ID / tracking code
                <input
                  name="manuscriptId"
                  placeholder="Example: JBR-2026-0142"
                  className={inputClass}
                />
                <span className={helperClass}>
                  The code shown in the journal submission portal or email.
                </span>
              </label>
              <label className={labelClass}>
                Review round
                <input
                  name="reviewRound"
                  placeholder="Example: Round 1, R2, revision review"
                  className={inputClass}
                />
                <span className={helperClass}>
                  Use this when the same manuscript returns for another review
                  cycle.
                </span>
              </label>
            </div>
          </section>

          <section className="grid gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="grid items-start gap-4 md:grid-cols-3">
              <label className={labelClass}>
                Current status
                <ResearchFormSelect
                  name="status"
                  defaultValue="ACCEPTED"
                  ariaLabel="Review status"
                  options={reviewStatusOptions}
                />
                <span className={helperClass}>
                  New review records start as accepted by default.
                </span>
              </label>
            </div>
            <div className="grid items-start gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Requested date
                <ResearchDatePicker
                  name="requestedAt"
                  className={dateInputClass}
                />
                <span className={helperClass}>
                  Date the editor or journal invited you to review.
                </span>
              </label>
              <label className={labelClass}>
                Due date
                <ResearchDatePicker name="dueDate" className={dateInputClass} />
                <span className={helperClass}>
                  The deadline for submitting your review.
                </span>
              </label>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="grid gap-4">
              <label className={labelClass}>
                Private note
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Portal URL, login reminder, special instructions, conflicts, follow-up notes..."
                  className={`${inputClass} h-auto min-h-28 resize-y`}
                />
              </label>
            </div>
          </section>
        </form>
      </ResearchModal>
    </>
  );
}
