"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type Toast = {
  id: number;
  title: string;
  detail: string;
};

type ToastContextValue = {
  showSuccess: (message?: string | { title: string; detail?: string }) => void;
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
            ? { title: message, detail: "The update is saved and visible in the current research workspace." }
            : { title: message.title, detail: message.detail ?? "The update is saved and visible in the current research workspace." };
        setToasts((current) => [...current, { id, ...toast }]);
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
      <div className="pointer-events-none fixed left-1/2 top-5 z-[120] flex w-[min(calc(100vw-2rem),38rem)] -translate-x-1/2 flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex animate-[toastIn_260ms_cubic-bezier(0.16,1,0.3,1)] items-start gap-4 rounded-2xl border border-emerald-300 bg-white px-5 py-4 text-slate-800 shadow-2xl shadow-emerald-900/20 ring-1 ring-emerald-100 backdrop-blur dark:border-emerald-700/80 dark:bg-slate-900 dark:text-slate-100 dark:shadow-black/40 dark:ring-emerald-900/50"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black tracking-tight text-slate-950 dark:text-white">{toast.title}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">{toast.detail}</span>
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
    throw new Error("useResearchToast must be used inside ResearchToastProvider");
  }
  return context;
}
