"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { ResearchButton } from "./ResearchPrimitives";

type ConfirmTone = "danger" | "warning" | "info";

function toneClasses(tone: ConfirmTone) {
  if (tone === "warning") {
    return {
      icon: "text-amber-300",
      confirm:
        "border-amber-600 bg-amber-600 text-white hover:border-amber-500 hover:bg-amber-500 disabled:hover:bg-amber-600",
    };
  }

  if (tone === "info") {
    return {
      icon: "text-[#A8DADC]",
      confirm:
        "border-blue-600 bg-blue-600 text-white hover:border-blue-500 hover:bg-blue-500 disabled:hover:bg-blue-600",
    };
  }

  return {
    icon: "text-rose-300",
    confirm:
      "border-rose-600 bg-rose-600 text-white hover:border-rose-500 hover:bg-rose-500 disabled:hover:bg-rose-600",
  };
}

export function ResearchConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  isConfirming = false,
  tone = "danger",
  icon,
  confirmIcon,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  tone?: ConfirmTone;
  icon?: ReactNode;
  confirmIcon?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open || typeof document === "undefined") return null;

  const classes = toneClasses(tone);

  return createPortal(
    <div
      data-research-modal-overlay="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isConfirming) onCancel();
      }}
      className="fixed inset-0 z-[1100] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/38 px-4 py-8 backdrop-blur-sm dark:bg-black/60"
    >
      <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-none border border-slate-200 bg-white text-slate-800 shadow-2xl shadow-slate-950/16 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:shadow-black/40">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-[#444444]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center ${classes.icon}`}
              >
                {icon ?? <AlertTriangle className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-lg font-normal text-slate-950 dark:text-[#E4E4E4]">
                  {title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              aria-label="Close"
              className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-slate-500 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4] dark:focus-visible:ring-[#A8DADC]/35"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {children && (
          <div className="space-y-3 px-6 py-5 text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
            {children}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-[#444444]">
          <ResearchButton
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            tone="secondary"
          >
            {cancelLabel}
          </ResearchButton>
          <ResearchButton
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            tone={
              tone === "danger"
                ? "danger"
                : tone === "warning"
                  ? "secondary"
                  : "primary"
            }
            className={classes.confirm}
          >
            {confirmIcon ??
              (tone === "danger" ? <Trash2 className="h-4 w-4" /> : null)}
            {confirmLabel}
          </ResearchButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
