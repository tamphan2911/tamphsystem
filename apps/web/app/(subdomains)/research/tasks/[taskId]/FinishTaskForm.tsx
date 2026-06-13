"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";

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
  const formId = isReadyMode ? "ready-task-form" : "approve-task-form";
  const buttonLabel = isReadyMode ? "Ready for check" : "Approve complete";
  const title = isReadyMode
    ? "Mark work ready for check?"
    : "Approve task completion?";
  const description = isReadyMode
    ? "This tells the assigner that your work is ready for review. The task will move to Checking, but it will not be completed yet."
    : "This approves the work as complete. Related submission records will be created only after this approval when applicable.";

  return (
    <>
      <form
        id={formId}
        ref={formRef}
        action={action}
        className="flex justify-end"
      >
        {accountId ? (
          <input type="hidden" name="accountId" value={accountId} />
        ) : null}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-none px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            isReadyMode
              ? "bg-sky-600 hover:bg-sky-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          <Icon className="h-4 w-4" />
          {buttonLabel}
        </button>
      </form>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        icon={<Icon className="h-5 w-5" />}
        maxWidth="max-w-xl"
        bodyClassName="px-5 py-4"
        headerActions={
          <ResearchButton
            type="button"
            disabled={isPending}
            tone={isReadyMode ? "primary" : "success"}
            onClick={() => {
              startTransition(() => {
                formRef.current?.requestSubmit();
              });
            }}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            Confirm
          </ResearchButton>
        }
      >
        <div className="grid gap-4">
          {requiresSubmissionDate ? (
            <p className="rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium leading-5 text-slate-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Choose the actual submission date carefully. This date is
              permanent after the submission is created.
            </p>
          ) : null}
          {requiresSubmissionDate ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Submission date
                <span className="research-required-mark">(*)</span>
              </span>
              <ResearchDatePicker
                name="submissionDate"
                form={formId}
                value={submissionDate}
                onChange={setSubmissionDate}
                required
              />
            </label>
          ) : null}
        </div>
      </ResearchModal>
    </>
  );
}
