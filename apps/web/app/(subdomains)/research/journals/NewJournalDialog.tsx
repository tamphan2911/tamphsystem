"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { createJournal } from "../actions";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { JournalDialogForm } from "./JournalDialogForm";

export function NewJournalDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ResearchButton
        type="button"
        onClick={() => setIsOpen(true)}
        tone="primary"
      >
        <PlusCircle className="h-4 w-4" />
        New Journal
      </ResearchButton>

      <JournalDialogForm
        mode="create"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        submitAction={createJournal}
      />
    </>
  );
}
