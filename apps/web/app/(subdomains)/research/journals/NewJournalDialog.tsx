"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { createJournal } from "../actions";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { JournalDialogForm } from "./JournalDialogForm";
import type { PublisherPickerItem } from "@/sites/research/components/PublisherPicker";

export function NewJournalDialog({
  publishers,
  duplicateJournals = [],
}: {
  publishers: PublisherPickerItem[];
  duplicateJournals?: { id: string; name: string; issn?: string | null }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ResearchButton
        type="button"
        onClick={() => setIsOpen(true)}
        tone="primary"
      >
        <PlusCircle className="research-task-icon-motion h-4 w-4" />
        New Journal
      </ResearchButton>

      <JournalDialogForm
        mode="create"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        submitAction={createJournal}
        publishers={publishers}
        duplicateJournals={duplicateJournals}
      />
    </>
  );
}
