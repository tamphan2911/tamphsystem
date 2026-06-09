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
  bodyClassName = "px-6 py-5",
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
      className="fixed inset-0 z-[1000] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
    >
      <div
        className={`flex max-h-[90vh] w-full ${maxWidth} animate-[modalPanelIn_220ms_ease-out] flex-col overflow-visible rounded-none border border-[#444444] bg-[#2C2C2C] shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#444444] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3 text-left">
            {icon && (
              <div className="flex h-6 w-6 flex-none items-center justify-center text-[#B39CD0]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-normal text-[#E4E4E4]">{title}</h2>
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition hover:text-[#E4E4E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-[#444444] px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
