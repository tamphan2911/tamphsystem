"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, Search, UserRound, X } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import {
  researchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

export type RevokeTaskAssigneeOption = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export function RevokeTaskForm({
  action,
  assigneeOptions = [],
  currentAssigneeIds = [],
}: {
  action: (formData: FormData) => void | Promise<void>;
  assigneeOptions?: RevokeTaskAssigneeOption[];
  currentAssigneeIds?: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [transferTask, setTransferTask] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const currentAssigneeIdSet = useMemo(
    () => new Set(currentAssigneeIds),
    [currentAssigneeIds],
  );
  const selectableAssignees = useMemo(
    () =>
      assigneeOptions.filter(
        (assignee) => !currentAssigneeIdSet.has(assignee.id),
      ),
    [assigneeOptions, currentAssigneeIdSet],
  );
  const selectedAssignees = selectedAssigneeIds.flatMap((id) => {
    const assignee = selectableAssignees.find((item) => item.id === id);
    return assignee ? [assignee] : [];
  });
  const assigneeResults = useMemo(() => {
    const needle = assigneeQuery.trim().toLowerCase();
    return selectableAssignees
      .filter((assignee) => !selectedAssigneeIds.includes(assignee.id))
      .filter((assignee) => {
        if (!needle) return true;
        return [
          displayResearchPersonName(assignee),
          displayResearchEmail(assignee.email),
          assignee.id,
          ...assignee.roles,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .slice(0, 8);
  }, [assigneeQuery, selectableAssignees, selectedAssigneeIds]);

  function toggleAssignee(id: string) {
    setSelectedAssigneeIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
    setAssigneeQuery("");
  }

  return (
    <>
      <form ref={formRef} action={action} className="flex justify-end">
        <input type="hidden" name="reason" value={reason} />
        <input
          type="hidden"
          name="transferTask"
          value={transferTask ? "true" : "false"}
        />
        {selectedAssigneeIds.map((id) => (
          <input key={id} type="hidden" name="transferAssigneeIds" value={id} />
        ))}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-none bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md"
        >
          <RotateCcw className="h-4 w-4" />
          Revoke task
        </button>
      </form>

      <ResearchConfirmDialog
        open={isOpen}
        title="Revoke this task?"
        description="This closes the current submission task so a new assignee can be assigned for the same research and venue."
        confirmLabel={isPending ? "Revoking..." : "Revoke"}
        isConfirming={isPending}
        icon={<RotateCcw className="h-5 w-5" />}
        confirmIcon={
          isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )
        }
        onCancel={() => setIsOpen(false)}
        onConfirm={() => {
          if (transferTask && selectedAssigneeIds.length === 0) return;
          startTransition(() => {
            formRef.current?.requestSubmit();
          });
        }}
      >
        <p>
          This closes the current task. Add a short note so assignees understand
          why it was revoked.
        </p>
        <label className="grid gap-1.5">
          <span className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            Revoke reason
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this task is being revoked..."
            rows={5}
            className={researchTextareaClass}
            disabled={isPending}
          />
        </label>
        <label className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-[#444444] dark:bg-[#242424] dark:text-[#E4E4E4] dark:hover:bg-[#303030]">
          <input
            type="checkbox"
            checked={transferTask}
            onChange={(event) => {
              setTransferTask(event.target.checked);
              if (!event.target.checked) {
                setSelectedAssigneeIds([]);
                setAssigneeQuery("");
              }
            }}
            className="mt-0.5 h-4 w-4 accent-[#1F7180] dark:accent-[#A8DADC]"
            disabled={isPending}
          />
          <span>
            <span className="block text-sm font-normal text-slate-800 dark:text-[#E4E4E4]">
              Transfer this task to new assignees
            </span>
            <span className="mt-1 block text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
              This revokes the current task and creates a new task with the same
              details for the selected assignee.
            </span>
          </span>
        </label>
        {transferTask ? (
          <div className="grid gap-2">
            <span className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              New assignees
            </span>
            {selectedAssignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedAssignees.map((assignee) => (
                  <button
                    key={assignee.id}
                    type="button"
                    onClick={() => toggleAssignee(assignee.id)}
                    className="research-allow-transform inline-flex cursor-pointer items-center gap-2 border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs text-cyan-800 transition hover:-translate-y-0.5 dark:border-cyan-800/70 dark:bg-cyan-950/35 dark:text-cyan-200"
                    disabled={isPending}
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    {displayResearchPersonName(assignee)}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F7180] dark:text-[#A8DADC]" />
              <input
                value={assigneeQuery}
                onChange={(event) => setAssigneeQuery(event.target.value)}
                className={`${researchFieldClass} pl-10`}
                placeholder="Search new assignees"
                disabled={isPending}
              />
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-200 bg-white dark:border-[#444444] dark:bg-[#242424]">
              {assigneeResults.length > 0 ? (
                assigneeResults.map((assignee) => (
                  <button
                    key={assignee.id}
                    type="button"
                    onClick={() => toggleAssignee(assignee.id)}
                    className="flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:border-[#383838] dark:hover:bg-[#303030]"
                    disabled={isPending}
                  >
                    <UserRound className="mt-0.5 h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-800 dark:text-[#E4E4E4]">
                        {displayResearchPersonName(assignee)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                        {displayResearchEmail(assignee.email)}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-[#667085] dark:text-[#B0B0B0]">
                  No available assignee matches this search.
                </div>
              )}
            </div>
            {transferTask && selectedAssigneeIds.length === 0 ? (
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Choose at least one new assignee before confirming revoke.
              </p>
            ) : null}
          </div>
        ) : null}
        {transferTask && selectedAssignees.length > 0 ? (
          <div className="border-t border-slate-200 pt-4 dark:border-[#444444]">
            <p className="text-xs font-normal uppercase tracking-wide text-slate-500 dark:text-[#B0B0B0]">
              Will be created after confirm
            </p>
            <div className="mt-2 border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:border-[#444444] dark:bg-[#242424] dark:text-[#B0B0B0]">
              <p className="text-sm font-normal text-slate-900 dark:text-[#E4E4E4]">
                New transferred task with the same title and task content
              </p>
              <p className="mt-1">
                Assign to:{" "}
                {selectedAssignees
                  .map((assignee) => displayResearchPersonName(assignee))
                  .join(", ")}
              </p>
              <p>
                Due date: same as the revoked task
                <span className="px-2 text-slate-400 dark:text-[#777777]">
                  |
                </span>
                Same research, venue, guides, checker, files, and task settings
              </p>
            </div>
          </div>
        ) : null}
      </ResearchConfirmDialog>
    </>
  );
}
