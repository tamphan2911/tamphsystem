"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { ResearchButton, ResearchIconButton } from "./ResearchPrimitives";

type ConfirmTone = "danger" | "warning" | "info";

function toneClasses(tone: ConfirmTone) {
  if (tone === "warning") {
    return {
      icon: "bg-[#383838] text-amber-300 ring-[#5A5A5A]",
      confirm:
        "border-amber-600 bg-amber-600 text-white hover:border-amber-500 hover:bg-amber-500 disabled:hover:bg-amber-600",
    };
  }

  if (tone === "info") {
    return {
      icon: "bg-[#383838] text-[#A8DADC] ring-[#5A5A5A]",
      confirm:
        "border-blue-600 bg-blue-600 text-white hover:border-blue-500 hover:bg-blue-500 disabled:hover:bg-blue-600",
    };
  }

  return {
    icon: "bg-[#383838] text-rose-300 ring-[#5A5A5A]",
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
    <div
      data-research-modal-overlay="true"
      className="fixed inset-0 z-[1010] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-none border border-[#444444] bg-[#2C2C2C] text-[#E4E4E4] shadow-2xl">
        <div className="border-b border-[#444444] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-11 w-11 flex-none items-center justify-center rounded-none ring-1 ${classes.icon}`}
              >
                {icon ?? <AlertTriangle className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-lg font-normal text-[#E4E4E4]">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm leading-5 text-[#B0B0B0]">
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
          <div className="space-y-3 px-6 py-5 text-sm leading-6 text-[#B0B0B0]">
            {children}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-[#444444] px-6 py-4">
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
    </div>
  );
}
