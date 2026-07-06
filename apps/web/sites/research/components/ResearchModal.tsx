"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

export function ResearchModal({
  open,
  onClose,
  title,
  icon,
  headerActions,
  children,
  footer,
  maxWidth = "max-w-4xl",
  bodyClassName = "px-4 py-4 sm:px-6 sm:py-5",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  bodyClassName?: string;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-research-modal-overlay="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-950/45 px-2 py-3 animate-[modalOverlayIn_140ms_ease-out] sm:px-4 sm:py-8 dark:bg-black/68"
    >
      <div
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full ${maxWidth} animate-[modalPanelIn_160ms_ease-out] flex-col overflow-visible rounded-none border border-slate-200 bg-white text-slate-800 shadow-xl shadow-slate-950/14 sm:max-h-[90vh] dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:shadow-black/35`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 dark:border-[#444444]">
          <div className="flex min-w-0 items-center gap-3 text-left">
            {icon && (
              <div className="flex h-6 w-6 flex-none items-center justify-center text-sky-700 dark:text-[#B39CD0]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="break-words text-base font-normal text-slate-950 sm:text-lg dark:text-[#E4E4E4]">
                {title}
              </h2>
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-slate-500 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4] dark:focus-visible:ring-[#A8DADC]/35"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-[#444444]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
