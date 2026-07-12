"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SearchCheck, X } from "lucide-react";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { FinishTaskForm } from "./FinishTaskForm";
import { RedoTaskForm } from "./TaskWorkflowForms";

type TaskAction = (formData: FormData) => void | Promise<void>;

export function AssigneeReviewActions({
  assignmentId,
  finishAction,
  redoAction,
  accountId,
  requiresSubmissionDate = false,
  nextProductionTaskLabel = "",
  referenceFollowUpTaskLabel = "",
  iconClassName,
  label,
  detail,
}: {
  assignmentId: string;
  finishAction: TaskAction;
  redoAction: TaskAction;
  accountId?: string | null;
  requiresSubmissionDate?: boolean;
  nextProductionTaskLabel?: string;
  referenceFollowUpTaskLabel?: string;
  iconClassName: string;
  label: string;
  detail: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const panelWidth = Math.min(260, window.innerWidth - viewportPadding * 2);
      const left = Math.min(
        Math.max(rect.right - panelWidth, viewportPadding),
        window.innerWidth - panelWidth - viewportPadding,
      );
      const preferredTop = rect.bottom + 8;
      const panelHeight = panelRef.current?.offsetHeight ?? 176;
      const top =
        preferredTop + panelHeight + viewportPadding > window.innerHeight
          ? Math.max(viewportPadding, rect.top - panelHeight - 8)
          : preferredTop;

      setCoords({
        left: Math.round(left),
        top: Math.round(top),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest('[data-research-modal-overlay="true"]')) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <IconHint label="Review this assignee">
        <button
          ref={triggerRef}
          type="button"
          aria-label="Review this assignee"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`research-allow-transform inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none focus-visible:ring-2 focus-visible:ring-sky-500/25 dark:focus-visible:ring-[#A8DADC]/35 ${iconClassName}`}
        >
          <SearchCheck className="h-4 w-4" aria-hidden="true" />
        </button>
      </IconHint>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Assignee review actions"
              style={{
                left: coords.left,
                top: coords.top,
                width: "min(260px, calc(100vw - 24px))",
              }}
              className="fixed z-[9998] animate-[modalPanelIn_180ms_ease-out] border border-slate-200 bg-white p-3 text-slate-800 shadow-xl shadow-slate-950/14 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:shadow-black/40"
            >
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-2 dark:border-[#444444]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-[#E4E4E4]">
                    {label}
                  </p>
                  <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-[#B0B0B0]">
                    {detail}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close assignee review actions"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-slate-500 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4] dark:focus-visible:ring-[#A8DADC]/35"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="grid gap-2">
                <FinishTaskForm
                  action={finishAction}
                  accountId={accountId}
                  assignmentId={assignmentId}
                  requiresSubmissionDate={requiresSubmissionDate}
                  mode="approve"
                  nextProductionTaskLabel={nextProductionTaskLabel}
                  referenceFollowUpTaskLabel={referenceFollowUpTaskLabel}
                />
                <RedoTaskForm action={redoAction} assignmentId={assignmentId} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
