"use client";

import { useState, useTransition } from "react";
import { LockKeyhole, Loader2, UnlockKeyhole } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-none border border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400/50 hover:bg-amber-500/15 hover:shadow-md hover:shadow-black/20"
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
