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
        className="research-clickable-icon research-allow-transform group/edit relative inline-flex h-8 w-8 items-center justify-center rounded-none border-0 bg-transparent text-[#2F6FAE] shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:bg-transparent hover:text-[#1F5B91] hover:shadow-none focus-visible:ring-0 dark:text-[#93C5FD] dark:hover:text-[#B7D6FF]"
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
