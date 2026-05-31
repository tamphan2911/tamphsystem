"use client";

import { useState, useTransition } from "react";
import { LockKeyhole, Loader2, UnlockKeyhole } from "lucide-react";
import { ResearchConfirmDialog } from "../../components/ResearchConfirmDialog";
import { useResearchToast } from "../../components/ResearchToast";

export function ConferenceUnlockButton({
  conferenceName,
  action,
}: {
  conferenceName: string;
  action: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200"
        aria-label="Unlock conference editing"
      >
        <UnlockKeyhole className="h-4 w-4" />
      </button>
      <ResearchConfirmDialog
        open={open}
        tone="warning"
        title="Unlock closed conference?"
        description={`${conferenceName} is closed. Unlock it for one edit. Saving changes will lock it again.`}
        confirmLabel={isPending ? "Unlocking..." : "Unlock"}
        isConfirming={isPending}
        icon={<LockKeyhole className="h-5 w-5" />}
        confirmIcon={
          isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UnlockKeyhole className="h-4 w-4" />
          )
        }
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await action();
            setOpen(false);
            toast.showSuccess({
              title: "Conference unlocked",
              detail:
                "You can edit this closed conference now. It will lock again after saving.",
            });
          })
        }
      />
    </>
  );
}
