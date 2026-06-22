"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";

export function TaskGuideButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ResearchIconButton
        type="button"
        label="Open task guide"
        tone="violet"
        className="!h-6 !w-6"
        onClick={() => setOpen(true)}
      >
        <BookOpenText className="h-4 w-4" />
      </ResearchIconButton>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Task Guide"
        icon={<BookOpenText className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
          No task guide has been assigned to this task yet.
        </p>
      </ResearchModal>
    </>
  );
}
