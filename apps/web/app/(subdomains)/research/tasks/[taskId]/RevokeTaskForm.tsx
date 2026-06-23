"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { researchTextareaClass } from "@/sites/research/components/ResearchPrimitives";

export function RevokeTaskForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <form ref={formRef} action={action} className="flex justify-end">
        <input type="hidden" name="reason" value={reason} />
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
      </ResearchConfirmDialog>
    </>
  );
}
