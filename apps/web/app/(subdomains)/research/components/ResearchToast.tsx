"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

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
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3000);
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
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3000);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-6 z-[120] flex w-[min(calc(100vw-2rem),26rem)] flex-col-reverse gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex animate-[toastIn_260ms_cubic-bezier(0.16,1,0.3,1)] items-start gap-4 rounded-2xl border bg-white px-5 py-4 text-slate-800 shadow-2xl ring-1 backdrop-blur dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/40 ${
              toast.tone === "error"
                ? "border-rose-300 shadow-rose-900/20 ring-rose-100 dark:border-rose-700/80 dark:ring-rose-900/50"
                : "border-emerald-300 shadow-emerald-900/20 ring-emerald-100 dark:border-emerald-700/80 dark:ring-emerald-900/50"
            }`}
          >
            <span
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ring-1 ${
                toast.tone === "error"
                  ? "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-800"
                  : "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-800"
              }`}
            >
              {toast.tone === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black tracking-tight text-slate-950 dark:text-white">
                {toast.title}
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                {toast.detail}
              </span>
            </span>
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
