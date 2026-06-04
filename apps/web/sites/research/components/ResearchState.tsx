import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";

export function ResearchEmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
        <SearchX className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
        {title}
      </p>
      {detail && (
        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
          {detail}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ResearchErrorState({
  title = "This content could not load",
  detail = "Refresh the page or try again in a moment.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
        {title}
      </p>
      <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
        {detail}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
