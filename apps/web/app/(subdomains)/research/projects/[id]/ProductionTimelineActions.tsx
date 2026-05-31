"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, LockOpen, Save } from "lucide-react";
import { unlockProductionTimeline } from "../../actions";
import { ResearchConfirmDialog } from "../../components/ResearchConfirmDialog";
import { useResearchToast } from "../../components/ResearchToast";

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
          <button
            type="button"
            onClick={() => setConfirmUnlock(true)}
            disabled={disabled || isPending}
            title="Unlock production timeline"
            aria-label="Unlock production timeline"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-sm shadow-amber-900/5 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:border-amber-600 dark:hover:bg-amber-900/60"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LockOpen className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={disabled || locked}
          title={
            locked
              ? "Unlock the production timeline before editing"
              : disabled
                ? "Research content is locked after journal acceptance or publication"
                : "Save production timeline"
          }
          aria-label="Save production timeline"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-900/5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:shadow-black/20 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/60 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
        >
          <Save className="h-4 w-4" />
        </button>
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
