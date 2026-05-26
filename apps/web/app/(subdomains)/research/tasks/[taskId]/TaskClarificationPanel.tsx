"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { HelpCircle, Loader2, MessageSquareText, Send, X } from "lucide-react";

export type TaskClarificationItem = {
  id: string;
  question: string;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
  requestedBy: {
    name: string;
    email: string;
  };
  answeredBy: {
    name: string;
    email: string;
  } | null;
};

function personName(person: { name: string; email: string }) {
  return person.name || person.email;
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TaskClarificationPanel({
  clarifications,
  canAnswer,
  answerAction,
}: {
  clarifications: TaskClarificationItem[];
  canAnswer: boolean;
  answerAction: (formData: FormData) => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const latest = clarifications[0] ?? null;
  const timeline = useMemo(
    () => [...clarifications].reverse(),
    [clarifications],
  );

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
            <HelpCircle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Request and feedback
            </h2>
            {latest ? (
              <>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Latest request from {personName(latest.requestedBy)} ·{" "}
                  {formatDateTime(latest.createdAt)}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {latest.question}
                </p>
                {latest.answer ? (
                  <p className="mt-2 line-clamp-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-slate-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-slate-200">
                    {latest.answer}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Waiting for assigner feedback.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                No request has been sent for this task yet.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
          aria-label="Open request and feedback history"
        >
          <MessageSquareText className="h-4 w-4" />
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="flex max-h-[86vh] w-full max-w-3xl animate-[modalPanelIn_220ms_ease-out] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
                  <MessageSquareText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    Request and feedback history
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    Track each assignee request and assigner feedback in order.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close request history"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {timeline.length > 0 ? (
                <div className="space-y-5">
                  {timeline.map((item) => (
                    <div key={item.id} className="space-y-3">
                      <ChatBubble
                        align="left"
                        label={personName(item.requestedBy)}
                        time={formatDateTime(item.createdAt)}
                        content={item.question}
                      />
                      {item.answer ? (
                        <ChatBubble
                          align="right"
                          label={
                            item.answeredBy
                              ? personName(item.answeredBy)
                              : "Assigner"
                          }
                          time={formatDateTime(item.answeredAt)}
                          content={item.answer}
                        />
                      ) : (
                        <div className="ml-auto max-w-[88%] rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30 sm:max-w-[76%]">
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                            Pending feedback
                          </p>
                          {canAnswer ? (
                            <AnswerForm
                              clarificationId={item.id}
                              action={answerAction}
                            />
                          ) : (
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              The assigner has not replied to this request yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <HelpCircle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No request history yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatBubble({
  align,
  label,
  time,
  content,
}: {
  align: "left" | "right";
  label: string;
  time: string;
  content: string;
}) {
  const isRight = align === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-xl px-4 py-3 sm:max-w-[76%] ${
          isRight
            ? "bg-blue-600 text-white shadow-sm"
            : "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide ${
            isRight ? "text-blue-100" : "text-slate-400"
          }`}
        >
          <span>{label}</span>
          {time ? <span>{time}</span> : null}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{content}</p>
      </div>
    </div>
  );
}

function AnswerForm({
  clarificationId,
  action,
}: {
  clarificationId: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={action} className="mt-3 grid gap-3">
      <input type="hidden" name="clarificationId" value={clarificationId} />
      <textarea
        name="answer"
        required
        rows={4}
        placeholder="Write feedback for this request."
        className="w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-amber-900/70 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              formRef.current?.requestSubmit();
            });
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send feedback
        </button>
      </div>
    </form>
  );
}
