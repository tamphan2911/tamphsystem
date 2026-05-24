"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, LockOpen, Save, TriangleAlert, X } from "lucide-react";
import { unlockProductionTimeline } from "../../actions";
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
        <ConfirmDialog
          title="Finish production?"
          detail="All production timeline items are checked. If you save this, the production process will be marked done, the timeline will be locked, and the research will move to submitting stage."
          confirmLabel="Save and lock"
          onCancel={() => setConfirmComplete(false)}
          onConfirm={() => {
            setConfirmComplete(false);
            submitTimeline();
          }}
        />
      )}

      {confirmUnlock && (
        <ConfirmDialog
          title="Unlock production timeline?"
          detail="This will make the production checklist editable again. Save the timeline after making changes."
          confirmLabel="Unlock timeline"
          onCancel={() => setConfirmUnlock(false)}
          onConfirm={unlockTimeline}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  title,
  detail,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  detail: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-amber-200 bg-white shadow-2xl dark:border-amber-900/70 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900">
              <TriangleAlert className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white">
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {detail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close confirmation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
