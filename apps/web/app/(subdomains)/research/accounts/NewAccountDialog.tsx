"use client";

import { useMemo, useState } from "react";
import { Check, KeyRound, PlusCircle, Search, X } from "lucide-react";
import { createPublisherAccount } from "../actions";

type JournalOption = {
  id: string;
  name: string;
  publisher: string;
};

export function NewAccountDialog({ journals }: { journals: JournalOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [journalQuery, setJournalQuery] = useState("");
  const [selectedJournal, setSelectedJournal] = useState<JournalOption | null>(
    null,
  );
  const [journalFocused, setJournalFocused] = useState(false);

  const journalResults = useMemo(() => {
    const needle = journalQuery.trim().toLowerCase();
    if (!needle) return [];
    return journals
      .filter((journal) => journal.name.toLowerCase().includes(needle))
      .slice(0, 20);
  }, [journalQuery, journals]);

  function closeDialog() {
    setIsOpen(false);
    setJournalFocused(false);
    setJournalQuery("");
    setSelectedJournal(null);
  }

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
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Add Account
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Track credentials and link them to a journal when needed.
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

            <form
              action={createPublisherAccount}
              className="grid gap-4 px-6 py-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="username"
                  required
                  placeholder="ID / username"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  name="password"
                  placeholder="Password"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  name="email"
                  placeholder="Email"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <div className="relative z-40">
                  <input
                    type="hidden"
                    name="journalId"
                    value={selectedJournal?.id ?? ""}
                  />
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={journalQuery}
                    onChange={(event) => {
                      setJournalQuery(event.target.value);
                      setSelectedJournal(null);
                    }}
                    onFocus={() => setJournalFocused(true)}
                    onBlur={() =>
                      window.setTimeout(() => setJournalFocused(false), 140)
                    }
                    placeholder="Search journal"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  />
                  {(selectedJournal || journalQuery) && (
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSelectedJournal(null);
                        setJournalQuery("");
                      }}
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Clear selected journal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {journalFocused && journalQuery.trim().length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-[160] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/[0.03] dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/35 dark:ring-white/[0.04]">
                      <div className="max-h-72 overflow-y-auto pr-0.5">
                        {journalResults.map((journal) => (
                          <button
                            key={journal.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSelectedJournal(journal);
                              setJournalQuery(journal.name);
                              setJournalFocused(false);
                            }}
                            className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                              selectedJournal?.id === journal.id
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-800 dark:hover:bg-slate-900"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-bold leading-5">
                                {journal.name}
                              </span>
                            </span>
                            {selectedJournal?.id === journal.id && (
                              <Check className="mt-0.5 h-4 w-4 flex-none" />
                            )}
                          </button>
                        ))}
                        {journalResults.length === 0 && (
                          <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            No journal matches this search.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  name="note"
                  placeholder="Login URL, recovery note, account scope"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:col-span-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200"
                >
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
