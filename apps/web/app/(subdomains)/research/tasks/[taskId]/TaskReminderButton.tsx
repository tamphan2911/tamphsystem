"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

type ReminderAssignee = {
  id: string;
  name: string;
  email: string;
};

type ReminderBlock = {
  title: string;
  detail: string;
} | null;

export function TaskReminderButton({
  taskTitle,
  assignees,
  action,
  block,
}: {
  taskTitle: string;
  assignees: ReminderAssignee[];
  action: (formData: FormData) => Promise<{
    ok: boolean;
    title: string;
    detail: string;
  }>;
  block: ReminderBlock;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() =>
    assignees.map((assignee) => assignee.id),
  );
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  const selectedCount = selectedIds.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleAssignee(assigneeId: string) {
    setSelectedIds((current) =>
      current.includes(assigneeId)
        ? current.filter((id) => id !== assigneeId)
        : [...current, assigneeId],
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group relative inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-none border transition hover:-translate-y-0.5 hover:shadow-sm ${
          block
            ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400/50 hover:bg-amber-500/15"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400/50 hover:bg-emerald-500/15"
        }`}
        aria-label="Send task reminder"
      >
        <BellRing className="h-4 w-4" />
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap border border-[#555555] bg-[#202020] px-2.5 py-1.5 text-xs font-semibold text-[#E4E4E4] opacity-0 shadow-xl shadow-black/30 transition group-hover:opacity-100">
          Send reminder
        </span>
      </button>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={block ? block.title : "Send task reminder"}
        description={
          block
            ? block.detail
            : `Choose assignees who should receive a professional reminder to finish "${taskTitle}".`
        }
        icon={
          block ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <BellRing className="h-5 w-5" />
          )
        }
        maxWidth="max-w-xl"
        bodyClassName="px-5 py-5"
        headerActions={
          block ? null : (
            <ResearchButton
              form="task-reminder-form"
              disabled={isPending || selectedCount === 0}
              tone="success"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              Send email
            </ResearchButton>
          )
        }
      >
        {block ? (
          <div>
            <div className="rounded-none border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
              This reminder button stays available so you can see why it is not
              active for the current task state.
            </div>
          </div>
        ) : (
          <form
            id="task-reminder-form"
            action={(formData) => {
              startTransition(async () => {
                const result = await action(formData);
                if (!result.ok) {
                  toast.showError({
                    title: result.title,
                    detail: result.detail,
                  });
                  return;
                }
                setIsOpen(false);
                toast.showSuccess({
                  title: result.title,
                  detail: result.detail,
                });
              });
            }}
            className="grid gap-4"
          >
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="assigneeIds" value={id} />
            ))}
            <div className="border border-[#444444] bg-[#202020] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                  Recipients
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      selectedCount === assignees.length
                        ? []
                        : assignees.map((assignee) => assignee.id),
                    )
                  }
                  className="text-xs font-bold text-sky-300 transition hover:text-sky-200"
                >
                  {selectedCount === assignees.length
                    ? "Clear all"
                    : "Select all"}
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {assignees.map((assignee) => {
                  const selected = selectedSet.has(assignee.id);
                  return (
                    <label
                      key={assignee.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-none border px-3 py-2.5 transition ${
                        selected
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-[#444444] bg-[#2C2C2C] hover:border-[#5a5a5a] hover:bg-[#333333]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleAssignee(assignee.id)}
                        className="mt-1 h-4 w-4 rounded border-[#555555] bg-[#202020] text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#E4E4E4]">
                          {assignee.name || assignee.email}
                        </span>
                        <span className="block text-xs text-[#B0B0B0]">
                          {assignee.email}
                        </span>
                      </span>
                      {selected && (
                        <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 flex-none text-emerald-300" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        )}
      </ResearchModal>
    </>
  );
}
