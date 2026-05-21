"use client";

import { useState } from "react";
import { ClipboardCheck, PlusCircle, X } from "lucide-react";
import { createAcademicReview } from "../actions";

type JournalOption = {
  id: string;
  name: string;
  publisher: string;
};

const inputClass = "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const labelClass = "grid gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200";
const helperClass = "text-xs font-normal leading-5 text-slate-500 dark:text-slate-400";

export function NewReviewDialog({ journals }: { journals: JournalOption[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
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
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">Add Academic Review</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Track peer-review invitations, deadlines, submitted recommendations, and private notes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              </div>
            </div>

            <form action={createAcademicReview} className="grid max-h-[calc(90vh-6rem)] gap-5 overflow-y-auto px-6 py-5">
              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">Journal and Manuscript</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Identify which journal invited the review and which manuscript you are reviewing.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    Journal
                    <select name="journalId" required className={inputClass}>
                      <option value="">Select journal</option>
                      {journals.map((journal) => (
                        <option key={journal.id} value={journal.id}>
                          {journal.publisher ? `${journal.publisher} - ` : ""}{journal.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    Manuscript title
                    <input name="manuscriptTitle" required placeholder="Title from the journal system" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Manuscript ID / tracking code
                    <input name="manuscriptId" placeholder="Example: JBR-2026-0142" className={inputClass} />
                    <span className={helperClass}>The code shown in the journal submission portal or email.</span>
                  </label>
                  <label className={labelClass}>
                    Review round
                    <input name="reviewRound" placeholder="Example: Round 1, R2, revision review" className={inputClass} />
                    <span className={helperClass}>Use this when the same manuscript returns for another review cycle.</span>
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">Timeline and Status</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Track invitation date, deadline, completion date, and current state.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    Current status
                    <select name="status" defaultValue="INVITED" className={inputClass}>
                      <option value="INVITED">Invited - not accepted yet</option>
                      <option value="ACCEPTED">Accepted - agreed to review</option>
                      <option value="IN_PROGRESS">In progress - reading/writing review</option>
                      <option value="SUBMITTED">Submitted - review sent to journal</option>
                      <option value="DECLINED">Declined - refused the invitation</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Requested date
                    <input name="requestedAt" type="date" className={inputClass} />
                    <span className={helperClass}>Date the editor or journal invited you to review.</span>
                  </label>
                  <label className={labelClass}>
                    Due date
                    <input name="dueDate" type="date" className={inputClass} />
                    <span className={helperClass}>The deadline for submitting your review.</span>
                  </label>
                  <label className={labelClass}>
                    Completed date
                    <input name="completedAt" type="date" className={inputClass} />
                    <span className={helperClass}>Fill this after you submit the review to the journal.</span>
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">Review Outcome and Notes</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Record your recommendation, editor contact, portal reminders, and private notes.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    Recommendation
                    <input name="recommendation" placeholder="Example: accept, minor revision, reject" className={inputClass} />
                    <span className={helperClass}>Your final recommendation to the editor, if already submitted.</span>
                  </label>
                  <label className={labelClass}>
                    Editor name
                    <input name="editorName" placeholder="Handling editor or contact person" className={inputClass} />
                  </label>
                  <label className={`${labelClass} md:col-span-2`}>
                    Private note
                    <textarea name="note" rows={3} placeholder="Portal URL, login reminder, special instructions, conflicts, follow-up notes..." className={inputClass} />
                  </label>
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-400">
                  <PlusCircle className="h-4 w-4" />
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
