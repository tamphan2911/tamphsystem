"use client";

import { useState, useTransition } from "react";
import { Check, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { setResearchContentLock } from "../../actions";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export function ResearchContentLockButton({
  projectId,
  locked,
}: {
  projectId: string;
  locked: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showSuccess } = useResearchToast();
  const Icon = locked ? UnlockKeyhole : LockKeyhole;
  const nextLocked = !locked;
  const label = locked
    ? "Unlock research content for editing"
    : "Lock research content again";

  function submitChange() {
    startTransition(async () => {
      await setResearchContentLock(projectId, nextLocked);
      setConfirming(false);
      showSuccess({
        title: nextLocked ? "Research locked" : "Research unlocked",
        detail: nextLocked
          ? "Research title, authors, and project details are protected again."
          : "Research title, authors, and project details can be edited again.",
      });
    });
  }

  return (
    <>
      <IconHint label={label} position="bottom">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={label}
          className="research-allow-transform inline-flex h-5 w-5 shrink-0 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={confirming}
        tone="info"
        title={
          nextLocked ? "Lock research content?" : "Unlock research content?"
        }
        confirmLabel={nextLocked ? "Lock" : "Unlock"}
        isConfirming={isPending}
        icon={<Icon className="h-5 w-5" />}
        confirmIcon={<Check className="h-4 w-4" />}
        onCancel={() => setConfirming(false)}
        onConfirm={submitChange}
      >
        <p>
          {nextLocked
            ? "This will protect the title, authors, and project fields from accidental edits."
            : "This will allow the title, authors, and project fields to be changed again."}
        </p>
      </ResearchConfirmDialog>
    </>
  );
}
