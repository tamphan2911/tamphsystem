"use client";

import { useState, useTransition } from "react";
import {
  BadgeCheck,
  Check,
  Flag,
  FilePlus2,
  MailCheck,
  Rocket,
  X,
} from "lucide-react";
import {
  sendResearchAuthorNotification,
  type ResearchAuthorEmailResult,
} from "../../actions";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";

type NotificationType =
  | "CREATED"
  | "PRODUCTION_FINISHED"
  | "ACCEPTED"
  | "PUBLISHED";

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
    className: "text-[#B0B0B0] hover:text-[#A8DADC]",
    sentClassName: "text-[#666666]",
  },
  {
    type: "PRODUCTION_FINISHED",
    label: "Notify authors that production is finished",
    sentLabel: "Production notification already sent",
    sentTooltip: "Production finished email already sent",
    icon: Flag,
    className: "text-[#B0B0B0] hover:text-[#A8DADC]",
    sentClassName: "text-[#666666]",
  },
  {
    type: "ACCEPTED",
    label: "Notify authors that research is accepted",
    sentLabel: "Accepted notification already sent",
    sentTooltip: "Accepted email already sent",
    icon: BadgeCheck,
    className: "text-[#B0B0B0] hover:text-emerald-300",
    sentClassName: "text-[#666666]",
  },
  {
    type: "PUBLISHED",
    label: "Notify authors that research is published",
    sentLabel: "Published notification already sent",
    sentTooltip: "Published email already sent",
    icon: Rocket,
    className: "text-[#B0B0B0] hover:text-[#B39CD0]",
    sentClassName: "text-[#666666]",
  },
];

export function AuthorNotificationActions({
  projectId,
  sentTypes,
  types = ["CREATED", "ACCEPTED", "PUBLISHED"],
}: {
  projectId: string;
  sentTypes: string[];
  types?: NotificationType[];
}) {
  const [confirmType, setConfirmType] = useState<NotificationType | null>(null);
  const [localSent, setLocalSent] = useState(new Set(sentTypes));
  const [results, setResults] = useState<{
    title: string;
    detail: string;
    rows: ResearchAuthorEmailResult[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleActions = actions.filter((action) =>
    types.includes(action.type),
  );
  const selected = visibleActions.find((action) => action.type === confirmType);

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
      <span className="inline-flex items-center gap-1">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          const sent = localSent.has(action.type);
          const tooltip = sent ? action.sentTooltip : action.label;
          return (
            <IconHint key={action.type} label={tooltip}>
              <button
                type="button"
                disabled={sent || isPending}
                aria-label={sent ? action.sentLabel : action.label}
                onClick={() => setConfirmType(action.type)}
                className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent outline-none transition focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35 disabled:cursor-not-allowed disabled:opacity-80 ${sent ? action.sentClassName : action.className}`}
              >
                <Icon className="h-4 w-4" />
              </button>
            </IconHint>
          );
        })}
      </span>

      {selected && (
        <div
          data-research-modal-overlay="true"
          className="fixed inset-0 z-[1010] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
        >
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-none border border-[#444444] bg-[#2C2C2C] shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-[#444444] px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-6 items-center justify-center text-[#A8DADC]">
                  <MailCheck className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-normal text-[#E4E4E4]">
                    Send author notification?
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-[#B0B0B0]">
                    {selected.label}. If any author fails, the next try will
                    only send to authors who have not received this email yet.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => send(selected.type)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-[#A8DADC] bg-[#263636] px-4 py-2 text-sm font-normal text-[#A8DADC] transition hover:bg-[#303F3F] disabled:cursor-wait disabled:opacity-70"
                >
                  <Check className="h-4 w-4" />
                  Send email
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmType(null)}
                  className="cursor-pointer border-0 bg-transparent p-2 text-[#B0B0B0] transition hover:text-[#E4E4E4]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div
          data-research-modal-overlay="true"
          className="fixed inset-0 z-[1010] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-none border border-[#444444] bg-[#2C2C2C] shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4 border-b border-[#444444] px-5 py-4">
              <div>
                <h3 className="text-base font-normal text-[#E4E4E4]">
                  {results.title}
                </h3>
                <p className="mt-1 text-sm text-[#B0B0B0]">{results.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => setResults(null)}
                className="cursor-pointer border-0 bg-transparent p-2 text-[#B0B0B0] transition hover:text-[#E4E4E4]"
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
                      className="rounded-none border border-[#444444] bg-[#303030] p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-normal text-[#E4E4E4]">
                          {row.authorName}
                        </span>
                        <span
                          className={`rounded-none border px-2 py-1 text-xs font-normal uppercase ${
                            row.status === "sent"
                              ? "border-[#5A5A5A] bg-[#263636] text-[#A8DADC]"
                              : row.status === "skipped"
                                ? "border-amber-900 bg-amber-950/35 text-amber-300"
                                : "border-rose-900 bg-rose-950/35 text-rose-300"
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[#B0B0B0]">{row.email}</p>
                      {row.reason && (
                        <p className="mt-1 text-xs font-normal text-[#B0B0B0]">
                          {row.reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="rounded-none border border-[#444444] bg-[#303030] p-4 text-sm text-[#B0B0B0]">
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
