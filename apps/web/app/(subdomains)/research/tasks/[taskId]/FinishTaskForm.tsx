"use client";

import { useRef, useState, useTransition } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

export function FinishTaskForm({
  action,
  accountId,
  requiresSubmissionDate = false,
  mode = "approve",
}: {
  action: (formData: FormData) => void | Promise<void>;
  accountId?: string | null;
  requiresSubmissionDate?: boolean;
  mode?: "ready" | "approve";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submissionDate, setSubmissionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isReadyMode = mode === "ready";
  const Icon = isReadyMode ? CheckCircle2 : ShieldCheck;
  const buttonLabel = isReadyMode ? "Ready for check" : "Approve complete";
  const title = isReadyMode
    ? "Mark work ready for check?"
    : "Approve task completion?";
  const description = isReadyMode
    ? "This tells the assigner that your work is ready for review. The task will move to Checking, but it will not be completed yet."
    : "This approves the work as complete. Related submission records will be created only after this approval when applicable.";

  return (
    <>
      <form ref={formRef} action={action} className="flex justify-end">
        {accountId ? (
          <input type="hidden" name="accountId" value={accountId} />
        ) : null}
        {requiresSubmissionDate ? (
          <input type="hidden" name="submissionDate" value={submissionDate} />
        ) : null}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            isReadyMode
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          <Icon className="h-4 w-4" />
          {buttonLabel}
        </button>
      </form>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                  {requiresSubmissionDate ? (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                      Choose the actual submission date carefully. This date is
                      permanent after the submission is created.
                    </p>
                  ) : null}
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

            <div className="grid gap-4 px-5 py-4">
              {requiresSubmissionDate ? (
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Submission date
                  </span>
                  <div className="group/date relative rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/70 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-800/80 dark:hover:bg-slate-900 dark:focus-within:border-blue-600 dark:focus-within:bg-slate-900 dark:focus-within:ring-blue-500/15">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-hover/date:text-blue-500 group-focus-within/date:text-blue-600 dark:text-slate-500 dark:group-hover/date:text-blue-300 dark:group-focus-within/date:text-blue-300" />
                    <input
                      type="date"
                      required
                      value={submissionDate}
                      onChange={(event) =>
                        setSubmissionDate(event.target.value)
                      }
                      className="w-full cursor-pointer rounded-lg border border-transparent bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition [color-scheme:light] hover:border-blue-100 hover:bg-white focus:border-blue-200 dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark] dark:hover:border-blue-900/70 dark:hover:bg-slate-950 dark:focus:border-blue-800"
                    />
                  </div>
                </label>
              ) : null}
              <div className="flex items-center justify-end gap-3">
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
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none ${
                    isReadyMode
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
