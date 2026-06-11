"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type Toast = {
  id: number;
  title: string;
  detail: string;
  tone: "success" | "error";
};

type ToastContextValue = {
  showSuccess: (message?: string | { title: string; detail?: string }) => void;
  showError: (message?: string | { title: string; detail?: string }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ResearchToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess(message = "Changes saved") {
        const id = Date.now();
        const toast =
          typeof message === "string"
            ? {
                title: message,
                detail:
                  "The update is saved and visible in the current research workspace.",
              }
            : {
                title: message.title,
                detail:
                  message.detail ??
                  "The update is saved and visible in the current research workspace.",
              };
        setToasts((current) => [...current, { id, tone: "success", ...toast }]);
        window.setTimeout(() => dismissToast(id), 6000);
      },
      showError(message = "Update failed") {
        const id = Date.now();
        const toast =
          typeof message === "string"
            ? {
                title: message,
                detail: "Please check the information and try again.",
              }
            : {
                title: message.title,
                detail:
                  message.detail ??
                  "Please check the information and try again.",
              };
        setToasts((current) => [...current, { id, tone: "error", ...toast }]);
        window.setTimeout(() => dismissToast(id), 6000);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="research-toast-container pointer-events-none fixed bottom-24 right-6 z-[120] flex w-[min(calc(100vw-2rem),25rem)] flex-col-reverse gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex animate-[toastIn_220ms_cubic-bezier(0.16,1,0.3,1)] items-start gap-3 border bg-[#F7F7F5] px-4 py-3 text-[#252525] shadow-[0_16px_36px_rgba(0,0,0,0.24)] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] ${
              toast.tone === "error"
                ? "border-rose-300/70 dark:border-rose-400/50"
                : "border-[#A8DADC]/70 dark:border-[#A8DADC]/50"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center ${
                toast.tone === "error"
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-emerald-700 dark:text-[#A8DADC]"
              }`}
            >
              {toast.tone === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#252525] dark:text-[#E4E4E4]">
                {toast.title}
              </span>
              <span className="mt-1 block text-sm leading-5 text-[#666666] dark:text-[#B0B0B0]">
                {toast.detail}
              </span>
            </span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center border border-transparent text-[#777777] transition duration-200 ease-out hover:text-[#252525] dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useResearchToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(
      "useResearchToast must be used inside ResearchToastProvider",
    );
  }
  return context;
}
