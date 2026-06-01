"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { ResearchIconButton } from "./ResearchPrimitives";

export function ResearchModal({
  open,
  onClose,
  title,
  description,
  icon,
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
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  bodyClassName?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
      <div
        className={`flex max-h-[90vh] w-full ${maxWidth} animate-[modalPanelIn_220ms_ease-out] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex min-w-0 items-start gap-3 text-left">
            {icon && (
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/45 dark:text-blue-200 dark:ring-blue-900">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
          </div>
          <ResearchIconButton
            type="button"
            onClick={onClose}
            label="Close"
            tone="slate"
            className="flex-none"
          >
            <X className="h-5 w-5" />
          </ResearchIconButton>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
