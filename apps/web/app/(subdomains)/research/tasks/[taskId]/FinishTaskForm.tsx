"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { researchDateValue } from "@/sites/research/lib/date-time";

export function FinishTaskForm({
  action,
  accountId,
  assignmentId,
  requiresSubmissionDate = false,
  mode = "approve",
  nextProductionTaskLabel = "",
}: {
  action: (formData: FormData) => void | Promise<void>;
  accountId?: string | null;
  assignmentId?: string | null;
  requiresSubmissionDate?: boolean;
  mode?: "ready" | "approve";
  nextProductionTaskLabel?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submissionDate, setSubmissionDate] = useState(researchDateValue);
  const [completionMessage, setCompletionMessage] = useState("");
  const [createNextProductionTask, setCreateNextProductionTask] =
    useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isReadyMode = mode === "ready";
  const Icon = isReadyMode ? CheckCircle2 : ShieldCheck;
  const formId = `${isReadyMode ? "ready-task-form" : "approve-task-form"}-${
    assignmentId ?? "task"
  }`;
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
        {assignmentId ? (
          <input type="hidden" name="assignmentId" value={assignmentId} />
        ) : null}
        {!isReadyMode && nextProductionTaskLabel ? (
          <input
            type="hidden"
            name="createNextProductionTask"
            value={createNextProductionTask ? "true" : "false"}
          />
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
        onClose={() => {
          setIsOpen(false);
          setCompletionMessage("");
          setCreateNextProductionTask(false);
        }}
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
            <p className="rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-normal leading-5 text-slate-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
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
          {!isReadyMode ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-[#B0B0B0]">
                Message to assignees
              </span>
              <textarea
                name="completionMessage"
                form={formId}
                rows={4}
                maxLength={2000}
                value={completionMessage}
                onChange={(event) => setCompletionMessage(event.target.value)}
                placeholder="Add a note about the approved work or next steps."
                className={researchTextareaClass}
              />
              <span className="text-xs text-slate-400 dark:text-[#777777]">
                This note will be included in the task-completed notification.
              </span>
            </label>
          ) : null}
          {!isReadyMode && nextProductionTaskLabel ? (
            <label className="flex cursor-pointer items-start gap-3 border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-5 text-[#7A4D10] transition hover:border-[#D8A23A] dark:border-amber-300/30 dark:bg-amber-950/25 dark:text-[#F4D47A]">
              <input
                type="checkbox"
                checked={createNextProductionTask}
                onChange={(event) =>
                  setCreateNextProductionTask(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 flex-none accent-[#A06716]"
              />
              <span>
                After approval, assign the next task automatically:{" "}
                <span className="font-semibold">{nextProductionTaskLabel}</span>
              </span>
            </label>
          ) : null}
        </div>
      </ResearchModal>
    </>
  );
}
