"use client";

import { useState, useTransition } from "react";
import { Check, LockKeyhole, UnlockKeyhole, X } from "lucide-react";
import { setResearchContentLock } from "../../actions";
import { useResearchToast } from "../../components/ResearchToast";

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

      {confirming && (
        <div className="fixed inset-0 z-[110] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">
                    {nextLocked
                      ? "Lock research content?"
                      : "Unlock research content?"}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    {nextLocked
                      ? "This will protect the title, authors, and project fields from accidental edits."
                      : "This will allow the title, authors, and project fields to be changed again."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={submitChange}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
              >
                <Check className="h-4 w-4" />
                {nextLocked ? "Lock" : "Unlock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
