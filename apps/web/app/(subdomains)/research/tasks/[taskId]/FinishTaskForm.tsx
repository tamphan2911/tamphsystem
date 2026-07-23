"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchSelectTriggerClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { researchDateValue } from "@/sites/research/lib/date-time";

type FinishTaskActionResult =
  | void
  | { ok: true }
  | {
      ok: false;
      reason?: string;
      title?: string;
      detail?: string;
      message?: string;
    };

type SubmissionAccountOption = {
  id: string;
  username: string;
  email?: string | null;
};

function isFailureResult(
  result: FinishTaskActionResult,
): result is Exclude<FinishTaskActionResult, void | { ok: true }> {
  return Boolean(result && typeof result === "object" && result.ok === false);
}

function approvalFailureDetail(
  result: Exclude<FinishTaskActionResult, void | { ok: true }>,
) {
  if (result.detail) return result.detail;
  if (result.message) return result.message;
  if (result.reason === "SUBMISSION_DATE_REQUIRED") {
    return "Choose the actual submission date before approving this submit task.";
  }
  if (result.reason === "ACCOUNT_REQUIRED") {
    return "Choose the journal account used for submission before approving this submit task.";
  }
  if (result.reason === "ACCOUNT_NOT_FOR_JOURNAL") {
    return "The selected submission account does not belong to this journal. Edit the task and choose a valid journal account before approval.";
  }
  if (result.reason === "MISSING_SUBMISSION_TARGET") {
    return "This submit task is missing its linked research or venue. Edit the task before approval.";
  }
  if (result.reason === "AUTOMATED_JOURNAL_NOT_READY") {
    return "This automated Add Journal task is not ready for approval yet.";
  }
  if (result.reason === "TASK_CLOSED") {
    return "This task is already closed. Refresh the page to see the latest status.";
  }
  if (result.reason === "TASK_NOT_READY_FOR_APPROVAL") {
    return "This task is not waiting for approval yet. Ask the assignee to mark the work ready for check first.";
  }
  if (result.reason === "ASSIGNMENT_NOT_READY") {
    return "This assignee is not ready for approval. Refresh the page and check the assignee status.";
  }
  return "The task could not be approved. Refresh the page and try again.";
}

export function FinishTaskForm({
  action,
  accountId,
  accountOptions = [],
  assignmentId,
  requiresSubmissionDate = false,
  requiresJournalAccount = false,
  mode = "approve",
  nextProductionTaskLabel = "",
  referenceFollowUpTaskLabel = "",
  suggestVenueTaskLabel = "",
}: {
  action: (
    formData: FormData,
  ) => FinishTaskActionResult | Promise<FinishTaskActionResult>;
  accountId?: string | null;
  accountOptions?: SubmissionAccountOption[];
  assignmentId?: string | null;
  requiresSubmissionDate?: boolean;
  requiresJournalAccount?: boolean;
  mode?: "ready" | "approve";
  nextProductionTaskLabel?: string;
  referenceFollowUpTaskLabel?: string;
  suggestVenueTaskLabel?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submissionDate, setSubmissionDate] = useState(researchDateValue);
  const [completionMessage, setCompletionMessage] = useState("");
  const accountIdIsSelectable = accountId
    ? accountOptions.length === 0 ||
      accountOptions.some((account) => account.id === accountId)
    : false;
  const defaultAccountId =
    accountId && accountIdIsSelectable
      ? accountId
      : accountOptions.length === 1
        ? accountOptions[0]?.id
        : "";
  const [selectedAccountId, setSelectedAccountId] = useState(
    defaultAccountId ?? "",
  );
  const [createNextProductionTask, setCreateNextProductionTask] = useState(
    Boolean(nextProductionTaskLabel),
  );
  const [createReferenceFollowUpTask, setCreateReferenceFollowUpTask] =
    useState(Boolean(referenceFollowUpTaskLabel));
  const [createSuggestVenueTask, setCreateSuggestVenueTask] = useState(
    Boolean(suggestVenueTaskLabel),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
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

  useEffect(() => {
    if (isOpen && !isReadyMode) {
      setCreateNextProductionTask(Boolean(nextProductionTaskLabel));
      setCreateReferenceFollowUpTask(Boolean(referenceFollowUpTaskLabel));
      setCreateSuggestVenueTask(Boolean(suggestVenueTaskLabel));
      setSelectedAccountId(defaultAccountId ?? "");
    }
  }, [
    defaultAccountId,
    isOpen,
    isReadyMode,
    nextProductionTaskLabel,
    referenceFollowUpTaskLabel,
    suggestVenueTaskLabel,
  ]);

  function resetDialog() {
    setCompletionMessage("");
    setCreateNextProductionTask(Boolean(nextProductionTaskLabel));
    setCreateReferenceFollowUpTask(Boolean(referenceFollowUpTaskLabel));
    setCreateSuggestVenueTask(Boolean(suggestVenueTaskLabel));
    setSelectedAccountId(defaultAccountId ?? "");
  }

  function submitTask() {
    if (requiresSubmissionDate && !submissionDate) {
      toast.showError({
        title: "Submission date required",
        detail:
          "Choose the actual submission date before approving this submit task.",
      });
      return;
    }
    if (
      !isReadyMode &&
      requiresJournalAccount &&
      accountOptions.length > 0 &&
      !selectedAccountId
    ) {
      toast.showError({
        title: "Submission account required",
        detail:
          "Choose the journal account used for this submission before approving the task.",
      });
      return;
    }

    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);

    startTransition(async () => {
      let result: FinishTaskActionResult;
      try {
        result = await action(formData);
      } catch (error) {
        console.error("[research task] approval failed", error);
        toast.showError({
          title: isReadyMode ? "Task was not updated" : "Task was not approved",
          detail:
            "The server could not finish this task action. Refresh the page and try again.",
        });
        return;
      }

      if (isFailureResult(result)) {
        toast.showError({
          title:
            result.title ??
            (isReadyMode ? "Task was not updated" : "Task was not approved"),
          detail: approvalFailureDetail(result),
        });
        return;
      }

      toast.showSuccess({
        title: isReadyMode ? "Task marked ready" : "Task approved",
        detail: isReadyMode
          ? "The task was sent for checking."
          : "The task completion was approved successfully.",
      });
      setIsOpen(false);
      resetDialog();
      router.refresh();
    });
  }
  const showAccountPicker =
    !isReadyMode && requiresJournalAccount && accountOptions.length > 0;

  return (
    <>
      <form id={formId} ref={formRef} className="flex justify-end">
        {accountId && !showAccountPicker ? (
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
        {!isReadyMode && referenceFollowUpTaskLabel ? (
          <input
            type="hidden"
            name="createReferenceFollowUpTask"
            value={createReferenceFollowUpTask ? "true" : "false"}
          />
        ) : null}
        {!isReadyMode && suggestVenueTaskLabel ? (
          <input
            type="hidden"
            name="createSuggestVenueTask"
            value={createSuggestVenueTask ? "true" : "false"}
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
          resetDialog();
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
            onClick={submitTask}
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
          {showAccountPicker ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-[#B0B0B0]">
                Submission account
                <span className="research-required-mark">(*)</span>
              </span>
              <select
                name="accountId"
                form={formId}
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                required
                className={researchSelectTriggerClass}
              >
                {accountOptions.length === 1 ? null : (
                  <option value="">Choose account</option>
                )}
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username}
                    {account.email ? ` | ${account.email}` : ""}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400 dark:text-[#777777]">
                This account will be recorded on the submission after approval.
              </span>
            </label>
          ) : requiresJournalAccount && !accountId ? (
            <p className="rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              No journal account is available for this task yet. Add or link the
              submission account before approving.
            </p>
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
          {!isReadyMode && referenceFollowUpTaskLabel ? (
            <label className="flex cursor-pointer items-start gap-3 border border-sky-200 bg-sky-50 px-3 py-3 text-sm leading-5 text-slate-700 transition hover:border-sky-400 dark:border-[#A8DADC]/30 dark:bg-[#A8DADC]/10 dark:text-[#D6F5F8]">
              <input
                type="checkbox"
                checked={createReferenceFollowUpTask}
                onChange={(event) =>
                  setCreateReferenceFollowUpTask(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 flex-none accent-[#1F7180]"
              />
              <span>
                After approving references, create final research follow-up
                task due in 2 days:{" "}
                <span className="font-semibold">
                  {referenceFollowUpTaskLabel}
                </span>
              </span>
            </label>
          ) : null}
          {!isReadyMode && suggestVenueTaskLabel ? (
            <label className="flex cursor-pointer items-start gap-3 border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm leading-5 text-emerald-800 transition hover:border-emerald-400 dark:border-emerald-300/30 dark:bg-emerald-950/25 dark:text-emerald-200">
              <input
                type="checkbox"
                checked={createSuggestVenueTask}
                onChange={(event) =>
                  setCreateSuggestVenueTask(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 flex-none accent-emerald-600"
              />
              <span>
                After approving final research follow-up, create suggest venue
                task due in 4 days:{" "}
                <span className="font-semibold">{suggestVenueTaskLabel}</span>
              </span>
            </label>
          ) : null}
        </div>
      </ResearchModal>
    </>
  );
}
