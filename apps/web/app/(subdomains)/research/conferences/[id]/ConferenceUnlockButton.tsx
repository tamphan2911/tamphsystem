"use client";

import { useState, useTransition } from "react";
import { LockKeyhole, Loader2, UnlockKeyhole } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
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
      <IconHint label="Unlock conference editing" position="bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-clickable-icon research-allow-transform inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-amber-700 shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:bg-transparent hover:text-amber-800 hover:shadow-none focus-visible:ring-0 dark:text-amber-300 dark:hover:text-amber-200"
          aria-label="Unlock conference editing"
        >
          <UnlockKeyhole className="h-4 w-4" />
        </button>
      </IconHint>
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
