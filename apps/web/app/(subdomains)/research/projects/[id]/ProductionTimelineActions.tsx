"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, LockOpen, Save } from "lucide-react";
import { unlockProductionTimeline } from "../../actions";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";

export function ProductionTimelineActions({
  projectId,
  locked,
  disabled,
  totalSteps,
}: {
  projectId: string;
  locked: boolean;
  disabled: boolean;
  totalSteps: number;
}) {
  const submitRef = useRef<HTMLButtonElement>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showSuccess } = useResearchToast();

  function checkedCount() {
    const form = submitRef.current?.form;
    if (!form) return 0;
    return Array.from(
      form.querySelectorAll<HTMLInputElement>(
        'input[name="completedProductionSteps"]',
      ),
    ).filter((input) => input.checked).length;
  }

  function submitTimeline() {
    const complete = checkedCount() === totalSteps;
    if (submitRef.current) {
      submitRef.current.dataset.successTitle = complete
        ? "Production finished"
        : "Production timeline saved";
      submitRef.current.dataset.successDetail = complete
        ? "The production process is marked done, the timeline is locked, and this research is moved to submitting."
        : "The production checklist is now updated for this research.";
    }
    submitRef.current?.form?.requestSubmit(submitRef.current);
  }

  function handleSaveClick() {
    if (disabled || locked) return;
    if (checkedCount() === totalSteps) {
      setConfirmComplete(true);
      return;
    }
    submitTimeline();
  }

  function unlockTimeline() {
    startTransition(async () => {
      await unlockProductionTimeline(projectId);
      setConfirmUnlock(false);
      showSuccess({
        title: "Production timeline unlocked",
        detail:
          "The production checklist is editable again. Save it after changing the timeline.",
      });
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {locked && (
          <IconHint label="Unlock production timeline">
            <button
              type="button"
              onClick={() => setConfirmUnlock(true)}
              disabled={disabled || isPending}
              aria-label="Unlock production timeline"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-[#A8DADC] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35 disabled:cursor-not-allowed disabled:text-[#666666]"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockOpen className="h-4 w-4" />
              )}
            </button>
          </IconHint>
        )}
        <IconHint
          label={
            locked
              ? "Unlock the production timeline before editing"
              : disabled
                ? "Research content is locked after journal acceptance or publication"
                : "Save production timeline"
          }
        >
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={disabled || locked}
            aria-label="Save production timeline"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-[#A8DADC] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35 disabled:cursor-not-allowed disabled:text-[#666666]"
          >
            <Save className="h-4 w-4" />
          </button>
        </IconHint>
        <button
          ref={submitRef}
          type="submit"
          name="updateScope"
          value="production"
          data-success-title="Production timeline saved"
          data-success-detail="The production checklist is now updated for this research."
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {confirmComplete && (
        <ResearchConfirmDialog
          open
          tone="warning"
          title="Finish production?"
          confirmLabel="Save and lock"
          onCancel={() => setConfirmComplete(false)}
          onConfirm={() => {
            setConfirmComplete(false);
            submitTimeline();
          }}
        >
          <p>
            All production timeline items are checked. If you save this, the
            production process will be marked done, the timeline will be locked,
            and the research will move to submitting stage.
          </p>
        </ResearchConfirmDialog>
      )}

      {confirmUnlock && (
        <ResearchConfirmDialog
          open
          tone="warning"
          title="Unlock production timeline?"
          confirmLabel="Unlock timeline"
          isConfirming={isPending}
          onCancel={() => setConfirmUnlock(false)}
          onConfirm={unlockTimeline}
        >
          <p>
            This will make the production checklist editable again. Save the
            timeline after making changes.
          </p>
        </ResearchConfirmDialog>
      )}
    </>
  );
}
