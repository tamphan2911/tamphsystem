"use client";

import { useState, useTransition } from "react";
import { LockKeyhole, Loader2, UnlockKeyhole, X } from "lucide-react";
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
      {open && (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-2xl dark:border-amber-900/70 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-amber-100 bg-amber-50/80 px-6 py-5 dark:border-amber-900/60 dark:bg-amber-950/25">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800">
                  <LockKeyhole className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Unlock closed conference?
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {conferenceName} is closed. Unlock it for one edit. Saving
                    changes will lock it again.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
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
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UnlockKeyhole className="h-4 w-4" />
                )}
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
