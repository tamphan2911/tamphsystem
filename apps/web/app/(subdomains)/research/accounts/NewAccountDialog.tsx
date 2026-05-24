"use client";

import { useState } from "react";
import { KeyRound, PlusCircle, X } from "lucide-react";
import { createPublisherAccount } from "../actions";

type JournalOption = {
  id: string;
  name: string;
  publisher: string;
};

export function NewAccountDialog({ journals }: { journals: JournalOption[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-200 bg-amber-100/80 px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm shadow-amber-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:shadow-amber-900/10 focus:outline-none focus:ring-4 focus:ring-amber-200/70 dark:border-amber-700/60 dark:bg-amber-900/35 dark:text-amber-100 dark:hover:border-amber-500/70 dark:hover:bg-amber-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-amber-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        New Account
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">Add Publisher Account</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track publisher-wide or journal-specific credentials.</p>
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

            <form action={createPublisherAccount} className="grid gap-4 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <input name="username" required placeholder="ID / username" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <input name="password" placeholder="Password" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <input name="email" placeholder="Email" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                <select name="journalId" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
                  <option value="">Publisher-wide / not journal-specific</option>
                  {journals.map((journal) => (
                    <option key={journal.id} value={journal.id}>
                      {journal.publisher ? `${journal.publisher} - ` : ""}{journal.name}
                    </option>
                  ))}
                </select>
                <input name="note" placeholder="Login URL, recovery note, account scope" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:col-span-2" />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md">
                  <PlusCircle className="h-4 w-4" />
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
