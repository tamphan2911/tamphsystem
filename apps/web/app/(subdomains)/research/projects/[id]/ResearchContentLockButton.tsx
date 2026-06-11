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
          className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-[#A8DADC] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
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
