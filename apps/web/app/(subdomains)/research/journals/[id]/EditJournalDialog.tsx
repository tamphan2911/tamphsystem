"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateJournal } from "../../actions";
import {
  JournalDialogForm,
  type JournalFormValues,
} from "../JournalDialogForm";

export function EditJournalDialog({
  journalId,
  journal,
}: {
  journalId: string;
  journal: JournalFormValues;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group/edit relative inline-flex h-8 w-8 items-center justify-center rounded-none border border-amber-100 bg-amber-50 text-amber-600 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-100 hover:text-amber-700 hover:shadow-md dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
        aria-label="Edit journal details"
      >
        <Pencil className="h-4 w-4" />
        <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap border border-[#444444] bg-[#2C2C2C] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 opacity-0 shadow-lg shadow-slate-900/10 transition duration-200 ease-out group-hover/edit:translate-y-0 group-hover/edit:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
          Edit journal details
        </span>
      </button>

      <JournalDialogForm
        mode="edit"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialValues={journal}
        submitAction={(formData) => updateJournal(journalId, formData)}
      />
    </>
  );
}
