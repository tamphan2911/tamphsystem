"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { ResearchButton, ResearchIconButton } from "./ResearchPrimitives";

type ConfirmTone = "danger" | "warning" | "info";

function toneClasses(tone: ConfirmTone) {
  if (tone === "warning") {
    return {
      panel:
        "border-amber-200 dark:border-amber-900/70 dark:bg-slate-900",
      header:
        "border-amber-100 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/25",
      icon:
        "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:ring-amber-800",
      confirm:
        "border-amber-600 bg-amber-600 text-white hover:border-amber-500 hover:bg-amber-500 disabled:hover:bg-amber-600",
    };
  }

  if (tone === "info") {
    return {
      panel: "border-blue-200 dark:border-blue-900/70 dark:bg-slate-900",
      header:
        "border-blue-100 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/25",
      icon:
        "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:ring-blue-800",
      confirm:
        "border-blue-600 bg-blue-600 text-white hover:border-blue-500 hover:bg-blue-500 disabled:hover:bg-blue-600",
    };
  }

  return {
    panel: "border-rose-200 dark:border-rose-900/70 dark:bg-slate-900",
    header:
      "border-rose-100 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/25",
    icon:
      "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-800",
    confirm:
      "border-rose-600 bg-rose-600 text-white hover:border-rose-500 hover:bg-rose-500 disabled:hover:bg-rose-600",
  };
}

export function ResearchConfirmDialog({
  open,
  title,
  description,
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
  if (!open) return null;

  const classes = toneClasses(tone);

  return (
    <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border bg-white shadow-2xl ${classes.panel}`}
      >
        <div className={`border-b px-6 py-5 ${classes.header}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ring-1 ${classes.icon}`}
              >
                {icon ?? <AlertTriangle className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <ResearchIconButton
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              label="Close"
              tone="slate"
            >
              <X className="h-5 w-5" />
            </ResearchIconButton>
          </div>
        </div>

        {children && (
          <div className="space-y-3 px-6 py-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {children}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
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
            tone={tone === "danger" ? "danger" : tone === "warning" ? "secondary" : "primary"}
            className={classes.confirm}
          >
            {confirmIcon ??
              (tone === "danger" ? <Trash2 className="h-4 w-4" /> : null)}
            {confirmLabel}
          </ResearchButton>
        </div>
      </div>
    </div>
  );
}
