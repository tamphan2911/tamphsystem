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
    <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div
        className={`flex max-h-[90vh] w-full ${maxWidth} animate-[modalPanelIn_220ms_ease-out] flex-col overflow-hidden rounded-none border border-[#444444] bg-[#2C2C2C] shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#444444] px-6 py-5">
          <div className="flex min-w-0 items-start gap-3 text-left">
            {icon && (
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-none bg-[#383838] text-[#B39CD0] ring-1 ring-[#444444]">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-normal text-[#E4E4E4]">
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-sm leading-5 text-[#B0B0B0]">
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
          <div className="border-t border-[#444444] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
