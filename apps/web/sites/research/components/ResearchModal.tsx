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
    <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-[#090611]/70 px-4 py-8 backdrop-blur-sm">
      <div
        className={`flex max-h-[90vh] w-full ${maxWidth} animate-[modalPanelIn_220ms_ease-out] flex-col overflow-hidden rounded-lg border border-[#ded8cf] bg-[#fbfaf7] shadow-2xl dark:border-[#403849] dark:bg-[#14101d]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#ded8cf] px-6 py-5 dark:border-[#332c3d]">
          <div className="flex min-w-0 items-start gap-3 text-left">
            {icon && (
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[#fff1e9] text-[#ff6d3a] ring-1 ring-[#ffceb5] dark:bg-[#2a1812] dark:text-[#ffb38a] dark:ring-[#7a3c25]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-black text-[#17131d] dark:text-white">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm leading-5 text-[#655d6d] dark:text-[#aaa4b5]">
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
          <div className="border-t border-[#ded8cf] px-6 py-4 dark:border-[#332c3d]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
