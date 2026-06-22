"use client";

import { useState } from "react";
import { BookOpenText } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";
import { taskGuideTypeLabel } from "@/sites/research/lib/task-guide";

export function TaskGuideButton({
  taskType,
  guide,
}: {
  taskType: string;
  guide: { title: string; content: string } | null;
}) {
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
        title={guide?.title ?? "Task Guide"}
        description={taskGuideTypeLabel(taskType)}
        icon={<BookOpenText className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        {guide ? (
          <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-[#D0D0D0]">
            {guide.content}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-[#B0B0B0]">
            No guide has been created for this task type yet.
          </p>
        )}
      </ResearchModal>
    </>
  );
}
