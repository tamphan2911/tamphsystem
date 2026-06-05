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
        className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-rose-200 bg-rose-100/80 px-4 py-2.5 text-sm font-bold text-rose-800 shadow-sm shadow-rose-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50 hover:shadow-md hover:shadow-rose-900/10 focus:outline-none focus:ring-4 focus:ring-rose-200/70 dark:border-rose-700/60 dark:bg-rose-900/35 dark:text-rose-100 dark:hover:border-rose-500/70 dark:hover:bg-rose-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-rose-700/35"
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
