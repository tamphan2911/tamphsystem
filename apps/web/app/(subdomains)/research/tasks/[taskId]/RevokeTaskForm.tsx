"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, X } from "lucide-react";

export function RevokeTaskForm({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <form ref={formRef} action={action} className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md"
        >
          <RotateCcw className="h-4 w-4" />
          Revoke task
        </button>
      </form>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900">
                  <RotateCcw className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Revoke this task?
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    This closes the current submission task so a new assignee
                    can be assigned for the same research and venue.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    formRef.current?.requestSubmit();
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Revoke
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
