"use client";

import { useState, useTransition } from "react";
import { Check, LockKeyhole, UnlockKeyhole } from "lucide-react";
import { setResearchAuthorsLock } from "../../actions";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export function ResearchAuthorsLockButton({
  projectId,
  locked,
}: {
  projectId: string;
  locked: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showSuccess } = useResearchToast();
  const Icon = locked ? LockKeyhole : UnlockKeyhole;
  const nextLocked = !locked;
  const label = locked ? "Unlock author editing" : "Lock author editing";

  function submitChange() {
    startTransition(async () => {
      await setResearchAuthorsLock(projectId, nextLocked);
      setConfirming(false);
      showSuccess({
        title: nextLocked ? "Authors locked" : "Authors unlocked",
        detail: nextLocked
          ? "The author list is protected from edits."
          : "The author edit icon is available again for authorized users.",
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
          className={`research-allow-transform inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition-[color,filter,transform] duration-180 ease-out hover:-translate-y-0.5 hover:scale-110 hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:scale-95 ${
            locked
              ? "text-amber-700 hover:text-amber-800 dark:text-[#F4D47A] dark:hover:text-amber-200"
              : "text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-cyan-200"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={confirming}
        tone="info"
        title={nextLocked ? "Lock author section?" : "Unlock author section?"}
        confirmLabel={nextLocked ? "Lock authors" : "Unlock authors"}
        isConfirming={isPending}
        icon={<Icon className="h-5 w-5" />}
        confirmIcon={<Check className="h-4 w-4" />}
        onCancel={() => setConfirming(false)}
        onConfirm={submitChange}
      >
        <p>
          {nextLocked
            ? "This will disable author editing until an admin unlocks the section again."
            : "This will enable the author edit icon for users who already have author-edit permission."}
        </p>
      </ResearchConfirmDialog>
    </>
  );
}
