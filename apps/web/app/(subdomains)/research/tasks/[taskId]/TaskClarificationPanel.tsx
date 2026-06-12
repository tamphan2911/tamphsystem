"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { HelpCircle, Loader2, MessageSquareText, Send } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { researchTextareaClass } from "@/sites/research/components/ResearchPrimitives";
import { displayResearchPersonName } from "@/sites/research/lib/display";

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
  return displayResearchPersonName(person);
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
  className = "border-t border-[#444444] pt-5",
}: {
  clarifications: TaskClarificationItem[];
  canAnswer: boolean;
  answerAction: (formData: FormData) => void | Promise<void>;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const latest = clarifications[0] ?? null;
  const timeline = useMemo(
    () => [...clarifications].reverse(),
    [clarifications],
  );

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const scrollContainer = historyScrollRef.current;
      if (!scrollContainer) return;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, timeline.length]);

  return (
    <section className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
              Request and feedback
            </h2>
            {latest ? (
              <>
                <p className="mt-2 text-xs font-normal leading-5 text-[#B0B0B0]">
                  Latest update from {personName(latest.requestedBy)} -{" "}
                  {formatDateTime(latest.createdAt)}
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-normal leading-6 text-[#E4E4E4]">
                  {latest.question}
                </p>
                {latest.answer ? (
                  <p className="mt-2 line-clamp-2 border-l border-[#A8DADC] pl-3 text-sm leading-6 text-[#B0B0B0]">
                    {latest.answer}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-normal text-amber-300">
                    Waiting for assigner or admin feedback.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm leading-6 text-[#B0B0B0]">
                No request has been sent for this task yet.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] shadow-none transition hover:-translate-y-0.5 hover:text-[#A8DADC]"
          aria-label="Open request and feedback history"
        >
          <MessageSquareText className="h-4 w-4" />
        </button>
      </div>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Request and feedback history"
        description="Track each assignee request and assigner or admin feedback in order."
        icon={<MessageSquareText className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        bodyClassName="px-5 py-5"
      >
        <div ref={historyScrollRef} className="max-h-[62vh] overflow-y-auto">
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
                    <div className="ml-auto max-w-[88%] rounded-none border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:max-w-[76%]">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-300">
                        Pending feedback
                      </p>
                      {canAnswer ? (
                        <AnswerForm
                          clarificationId={item.id}
                          action={answerAction}
                        />
                      ) : (
                        <p className="mt-1 text-sm leading-6 text-[#B0B0B0]">
                          The assigner or an admin has not replied to this
                          request yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-none border border-dashed border-[#555555] p-8 text-center">
              <HelpCircle className="mx-auto h-8 w-8 text-[#777777]" />
              <p className="mt-3 text-sm font-semibold text-[#B0B0B0]">
                No request history yet.
              </p>
            </div>
          )}
        </div>
      </ResearchModal>
    </section>
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
        className={`max-w-[88%] border px-4 py-3 sm:max-w-[76%] ${
          isRight
            ? "border-[#A8DADC]/40 bg-[#A8DADC]/10 text-[#E4E4E4]"
            : "border border-[#444444] bg-[#202020] text-[#E4E4E4]"
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-normal uppercase tracking-wide ${
            isRight ? "text-[#A8DADC]" : "text-[#B0B0B0]"
          }`}
        >
          <span>{label}</span>
          {time ? (
            <span className="text-[10px] font-semibold normal-case tracking-normal opacity-80">
              ({time})
            </span>
          ) : null}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm font-normal leading-6">
          {content}
        </p>
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
  const [answer, setAnswer] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        const value = String(formData.get("answer") ?? "").trim();
        if (!value) {
          toast.showError({
            title: "Feedback required",
            detail: "Please write feedback before sending it to assignees.",
          });
          return;
        }
        await action(formData);
        setAnswer("");
        toast.showSuccess({
          title: "Feedback sent",
          detail: "The task conversation has been updated.",
        });
        router.refresh();
      }}
      className="mt-3 grid gap-3"
    >
      <input type="hidden" name="clarificationId" value={clarificationId} />
      <textarea
        name="answer"
        required
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        rows={4}
        placeholder="Write feedback for this request."
        className={`${researchTextareaClass} resize-none`}
      />
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isPending || answer.trim().length === 0}
          onClick={() => {
            startTransition(() => {
              formRef.current?.requestSubmit();
            });
          }}
          className="inline-flex items-center gap-2 rounded-none bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md hover:shadow-black/20 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none"
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
