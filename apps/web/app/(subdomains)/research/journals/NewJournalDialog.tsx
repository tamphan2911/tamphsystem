"use client";

import { useState } from "react";
import { BookOpen, Coins, Link2, PlusCircle, X } from "lucide-react";
import { createJournal } from "../actions";

const inputClass = "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const labelClass = "grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400";

export function NewJournalDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
      >
        <PlusCircle className="h-4 w-4" />
        New Journal
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">New Journal</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add basic identity, fees, and source links.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form action={createJournal} className="grid max-h-[calc(90vh-6rem)] gap-5 overflow-y-auto px-6 py-5">
              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">Basic Information</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className={`${labelClass} md:col-span-3`}>
                    Journal name
                    <input name="name" required placeholder="Journal name" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    ISSN
                    <input name="issn" placeholder="ISSN" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Field
                    <input name="field" placeholder="Field" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Rank
                    <select name="rank" className={inputClass}>
                      <option value="">Rank</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                      <option value="Scopus">Scopus</option>
                      <option value="ISI">ISI</option>
                    </select>
                  </label>
                  <label className={`${labelClass} md:col-span-3`}>
                    Publisher
                    <input name="publisher" placeholder="Publisher" className={inputClass} />
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Coins className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">Fees</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    APC
                    <input name="apc" placeholder="APC" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Submission fee
                    <input name="submissionFee" placeholder="Submission fee" className={inputClass} />
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">Links and Notes</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className={labelClass}>
                    Homepage
                    <input name="homepageLink" placeholder="Journal homepage" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Scimago
                    <input name="scimagoLink" placeholder="Scimago link" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Scopus
                    <input name="scopusLink" placeholder="Scopus link" className={inputClass} />
                  </label>
                  <label className={`${labelClass} md:col-span-3`}>
                    Note
                    <input name="note" placeholder="Submission link, fit notes, login notes" className={inputClass} />
                  </label>
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md">
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
