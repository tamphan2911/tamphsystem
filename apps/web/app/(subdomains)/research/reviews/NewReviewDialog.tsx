"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  ClipboardCheck,
  Loader2,
  PlusCircle,
  Search,
  X,
} from "lucide-react";
import { createAcademicReview } from "../actions";
import { ResearchFormSelect } from "../components/ResearchFormSelect";
import { useResearchToast } from "../components/ResearchToast";

type JournalOption = {
  id: string;
  name: string;
  publisher: string;
};

const inputClass =
  "h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const labelClass =
  "grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200";
const helperClass =
  "text-xs font-normal leading-5 text-slate-500 dark:text-slate-400";
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
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className={`${labelClass} relative`}>
      Journal
      <input type="hidden" name="journalId" value={value} />
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950">
        {selectedJournal ? (
          <div className="flex min-h-8 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {selectedJournal.name}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setQuery("");
                setIsOpen(true);
              }}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Clear journal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="flex min-h-8 items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onFocus={() => setIsOpen(true)}
              onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search journal"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </span>
        )}
      </div>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/30">
          {filteredJournals.map((journal) => (
            <button
              key={journal.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(journal.id);
                setQuery("");
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
            >
              <span className="min-w-0">
                <span className="block truncate">{journal.name}</span>
                <span className="mt-0.5 block truncate text-xs font-normal text-slate-400">
                  {journal.publisher || "No publisher"}
                </span>
              </span>
              {journal.id === value && (
                <Check className="h-4 w-4 flex-none" aria-hidden="true" />
              )}
            </button>
          ))}
          {filteredJournals.length === 0 && (
            <p className="px-3 py-3 text-sm font-medium text-slate-400 dark:text-slate-500">
              No journal matches this search.
            </p>
          )}
        </div>
      )}
    </div>
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
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-100/80 px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm shadow-emerald-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md hover:shadow-emerald-900/10 focus:outline-none focus:ring-4 focus:ring-emerald-200/70 dark:border-emerald-700/60 dark:bg-emerald-900/35 dark:text-emerald-100 dark:hover:border-emerald-500/70 dark:hover:bg-emerald-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-emerald-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        New Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                      Add academic review
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Track review invitations, deadlines, and private notes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
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
              className="grid max-h-[calc(90vh-6rem)] gap-5 overflow-y-auto px-6 py-5"
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
                    Manuscript title
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
                      Use this when the same manuscript returns for another
                      review cycle.
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
                  <label className={labelClass}>
                    Requested date
                    <input
                      name="requestedAt"
                      type="date"
                      className={inputClass}
                    />
                    <span className={helperClass}>
                      Date the editor or journal invited you to review.
                    </span>
                  </label>
                  <label className={labelClass}>
                    Due date
                    <input name="dueDate" type="date" className={inputClass} />
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

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isPending}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="h-4 w-4" />
                  )}
                  Add Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
