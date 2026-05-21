"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type Toast = {
  id: number;
  message: string;
};

type ToastContextValue = {
  showSuccess: (message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ResearchToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess(message = "Changes saved") {
        const id = Date.now();
        setToasts((current) => [...current, { id, message }]);
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
      <div className="pointer-events-none fixed bottom-6 right-6 z-[120] flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex animate-[toastIn_220ms_ease-out] items-center gap-3 rounded-xl border border-emerald-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl shadow-emerald-900/10 backdrop-blur dark:border-emerald-900/60 dark:bg-slate-900/95 dark:text-slate-100 dark:shadow-black/30"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            {toast.message}
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

