"use client";

import { useState, useTransition } from "react";
import { Check, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { setResearchContentLock } from "../../actions";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
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
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={
          locked
            ? "Unlock research content for editing"
            : "Lock research content again"
        }
        aria-label={
          locked
            ? "Unlock research content for editing"
            : "Lock research content again"
        }
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-blue-600 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:text-blue-300"
      >
        <Icon className="h-4 w-4" />
      </button>

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
