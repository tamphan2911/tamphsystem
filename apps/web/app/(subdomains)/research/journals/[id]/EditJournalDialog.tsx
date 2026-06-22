"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateJournal } from "../../actions";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import {
  JournalDialogForm,
  type JournalFormValues,
} from "../JournalDialogForm";
import type { PublisherPickerItem } from "@/sites/research/components/PublisherPicker";

export function EditJournalDialog({
  journalId,
  journal,
  publishers,
}: {
  journalId: string;
  journal: JournalFormValues;
  publishers: PublisherPickerItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconHint label="Edit journal details" position="bottom">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="research-clickable-icon research-allow-transform inline-flex h-8 w-8 items-center justify-center rounded-none border-0 bg-transparent text-[#2F6FAE] shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:bg-transparent hover:text-[#1F5B91] hover:shadow-none focus-visible:ring-0 dark:text-[#93C5FD] dark:hover:text-[#B7D6FF]"
          aria-label="Edit journal details"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </IconHint>

      <JournalDialogForm
        mode="edit"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        initialValues={journal}
        submitAction={(formData) => updateJournal(journalId, formData)}
        publishers={publishers}
      />
    </>
  );
}
