"use client";

import { useState, useTransition } from "react";
import {
  BadgeCheck,
  Check,
  FilePlus2,
  MailCheck,
  Rocket,
  X,
} from "lucide-react";
import {
  sendResearchAuthorNotification,
  type ResearchAuthorEmailResult,
} from "../../actions";

type NotificationType = "CREATED" | "ACCEPTED" | "PUBLISHED";

const actions: {
  type: NotificationType;
  label: string;
  sentLabel: string;
  sentTooltip: string;
  icon: typeof FilePlus2;
  className: string;
  sentClassName: string;
}[] = [
  {
    type: "CREATED",
    label: "Notify authors that research is created",
    sentLabel: "Created notification already sent",
    sentTooltip: "Created email already sent",
    icon: FilePlus2,
    className:
      "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    sentClassName:
      "border-sky-100 bg-sky-50/60 text-sky-400 dark:border-sky-950 dark:bg-sky-950/20 dark:text-sky-600",
  },
  {
    type: "ACCEPTED",
    label: "Notify authors that research is accepted",
    sentLabel: "Accepted notification already sent",
    sentTooltip: "Accepted email already sent",
    icon: BadgeCheck,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    sentClassName:
      "border-emerald-100 bg-emerald-50/60 text-emerald-400 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-600",
  },
  {
    type: "PUBLISHED",
    label: "Notify authors that research is published",
    sentLabel: "Published notification already sent",
    sentTooltip: "Published email already sent",
    icon: Rocket,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    sentClassName:
      "border-blue-100 bg-blue-50/60 text-blue-400 dark:border-blue-950 dark:bg-blue-950/20 dark:text-blue-600",
  },
];

export function AuthorNotificationActions({
  projectId,
  sentTypes,
}: {
  projectId: string;
  sentTypes: string[];
}) {
  const [confirmType, setConfirmType] = useState<NotificationType | null>(null);
  const [localSent, setLocalSent] = useState(new Set(sentTypes));
  const [results, setResults] = useState<{
    title: string;
    detail: string;
    rows: ResearchAuthorEmailResult[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selected = actions.find((action) => action.type === confirmType);

  function send(type: NotificationType) {
    startTransition(async () => {
      const result = await sendResearchAuthorNotification(projectId, type);
      if (result.ok && result.complete) {
        setLocalSent((current) => new Set([...current, type]));
      }
      setConfirmType(null);
      setResults({
        title: result.ok
          ? "Notification email processed"
          : "Notification not sent",
        detail: result.message,
        rows: result.results,
      });
    });
  }

  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        {actions.map((action) => {
          const Icon = action.icon;
          const sent = localSent.has(action.type);
          const tooltip = sent ? action.sentTooltip : action.label;
          return (
            <button
              key={action.type}
              type="button"
              disabled={sent || isPending}
              aria-label={sent ? action.sentLabel : action.label}
              onClick={() => setConfirmType(action.type)}
              className={`group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${sent ? action.sentClassName : action.className}`}
            >
              <Icon className="h-4 w-4" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-56 -translate-x-1/2 translate-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 opacity-0 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800 dark:shadow-black/30">
                {tooltip}
              </span>
            </button>
          );
        })}
      </span>

      {selected && (
        <div className="fixed inset-0 z-[110] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <MailCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">
                    Send author notification?
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    {selected.label}. If any author fails, the next try will
                    only send to authors who have not received this email yet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmType(null)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirmType(null)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => send(selected.type)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
              >
                <Check className="h-4 w-4" />
                Send email
              </button>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="fixed inset-0 z-[120] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  {results.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {results.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResults(null)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close result"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              <div className="grid gap-2">
                {results.rows.length > 0 ? (
                  results.rows.map((row) => (
                    <div
                      key={`${row.email}-${row.status}`}
                      className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {row.authorName}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold uppercase ring-1 ${
                            row.status === "sent"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                              : row.status === "skipped"
                                ? "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
                                : "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900"
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                        {row.email}
                      </p>
                      {row.reason && (
                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {row.reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    No author email was processed.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
