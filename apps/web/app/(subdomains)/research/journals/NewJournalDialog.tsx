"use client";

import { useState } from "react";
import { BookOpen, PlusCircle, X } from "lucide-react";
import { createJournal } from "../actions";

export function NewJournalDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
      >
        <PlusCircle className="h-4 w-4" />
        New Journal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">Add Journal</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Store rank, fees, publisher, and submission notes.</p>
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

            <form action={createJournal} className="grid gap-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                <input name="name" required placeholder="Journal name" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <input name="issn" placeholder="ISSN" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <input name="field" placeholder="Field" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <select name="rank" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                  <option value="">Rank</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                  <option value="Scopus">Scopus</option>
                  <option value="ISI">ISI</option>
                </select>
                <input name="publisher" placeholder="Publisher" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <input name="apc" placeholder="APC" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <input name="submissionFee" placeholder="Submission fee" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <input name="note" placeholder="Submission link, Scimago/Scopus notes, fit notes" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:col-span-2" />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md">
                  <PlusCircle className="h-4 w-4" />
                  Add Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
