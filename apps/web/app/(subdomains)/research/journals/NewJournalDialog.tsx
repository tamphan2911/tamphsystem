"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { createJournal } from "../actions";
import { JournalDialogForm } from "./JournalDialogForm";

export function NewJournalDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-100 via-indigo-100 to-rose-100 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm shadow-sky-900/5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-900/10 dark:border-sky-900/60 dark:from-sky-950/70 dark:via-indigo-950/60 dark:to-rose-950/50 dark:text-sky-100 dark:shadow-black/20 dark:hover:border-sky-700"
      >
        <PlusCircle className="h-4 w-4" />
        New Journal
      </button>

      <JournalDialogForm
        mode="create"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        submitAction={createJournal}
      />
    </>
  );
}
