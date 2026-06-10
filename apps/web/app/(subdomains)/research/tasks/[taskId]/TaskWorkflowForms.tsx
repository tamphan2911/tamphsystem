"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  HelpCircle,
  Loader2,
  MessageSquareReply,
  RotateCcw,
} from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { researchTextareaClass } from "@/sites/research/components/ResearchPrimitives";

type TextModalFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  title: string;
  description: string;
  fieldName: string;
  fieldLabel: string;
  placeholder: string;
  confirmLabel: string;
  tone: "amber" | "rose" | "blue";
  helperText?: string;
};

const toneClasses = {
  amber: {
    button: "bg-amber-500 hover:bg-amber-600",
    icon: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  },
  rose: {
    button: "bg-rose-600 hover:bg-rose-700",
    icon: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
  },
  blue: {
    button: "bg-sky-600 hover:bg-sky-500",
    icon: "bg-sky-500/10 text-sky-300 ring-sky-500/20",
  },
};

function iconForTone(tone: TextModalFormProps["tone"]) {
  if (tone === "rose") return RotateCcw;
  if (tone === "blue") return MessageSquareReply;
  return HelpCircle;
}

function TextModalForm({
  action,
  buttonLabel,
  title,
  description,
  fieldName,
  fieldLabel,
  placeholder,
  confirmLabel,
  tone,
  helperText,
}: TextModalFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const router = useRouter();
  const toast = useResearchToast();
  const Icon = iconForTone(tone);
  const colors = toneClasses[tone];

  function closeDialog(force = false) {
    if (isPending && !force) return;
    setIsOpen(false);
    setContent("");
  }

  function successMessage() {
    if (tone === "amber") {
      return {
        title: "Clarification request sent",
        detail:
          "The assigner has been notified and the request is now in this task conversation.",
      };
    }
    if (tone === "blue") {
      return {
        title: "Feedback sent",
        detail: "The assignees have been notified and can continue the task.",
      };
    }
    return {
      title: "Redo request sent",
      detail:
        "The revision note has been added to the task conversation and shared with assignees.",
    };
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-none px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${colors.button}`}
        >
          <Icon className="h-4 w-4" />
          {buttonLabel}
        </button>
      </div>

      <ResearchModal
        open={isOpen}
        onClose={() => closeDialog()}
        title={title}
        description={description}
        icon={<Icon className="h-5 w-5" />}
        maxWidth="max-w-lg"
        headerActions={
          <ResearchButton
            type="button"
            disabled={isPending || content.trim().length === 0}
            tone={tone === "rose" ? "danger" : tone === "amber" ? "secondary" : "primary"}
            onClick={() => {
              startTransition(() => {
                formRef.current?.requestSubmit();
              });
            }}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {confirmLabel}
          </ResearchButton>
        }
      >
        <form
          ref={formRef}
          action={async (formData) => {
            const value = String(formData.get(fieldName) ?? "").trim();
            if (!value) {
              toast.showError({
                title: "Message required",
                detail:
                  "Please write the request or feedback content before sending.",
              });
              return;
            }
            await action(formData);
            closeDialog(true);
            toast.showSuccess(successMessage());
            router.refresh();
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
              {fieldLabel}
            </span>
            <textarea
              name={fieldName}
              required
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              placeholder={placeholder}
              className={`${researchTextareaClass} resize-none`}
            />
          </label>
          {helperText ? (
            <p className="rounded-none border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
              {helperText}
            </p>
          ) : null}
        </form>
      </ResearchModal>
    </>
  );
}

export function RedoTaskForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <TextModalForm
      action={action}
      buttonLabel="Request redo"
      title="Send task back for revision?"
      description="The task will return to In progress and assignees will be notified with your revision note."
      fieldName="reason"
      fieldLabel="Revision note"
      placeholder="Explain what needs to be corrected before this task can be approved."
      confirmLabel="Send redo request"
      tone="rose"
    />
  );
}

export function ClarificationRequestForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <TextModalForm
      action={action}
      buttonLabel="Need clarify"
      title="Request clarification?"
      description="The task will move to Need clarify until the assigner answers your request."
      fieldName="question"
      fieldLabel="Question or instruction request"
      placeholder="Write what you need clarified, including any specific issue blocking the work."
      confirmLabel="Send request"
      tone="amber"
      helperText="After sending this request, the task will pause in Need clarify. Please wait for the assigner to give feedback before continuing the task."
    />
  );
}

export function ClarificationAnswerForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <TextModalForm
      action={action}
      buttonLabel="Answer"
      title="Answer clarification request?"
      description="The assignees will receive your answer and the task will return to In progress."
      fieldName="answer"
      fieldLabel="Answer"
      placeholder="Give clear instruction so the assignees can continue the task."
      confirmLabel="Send answer"
      tone="blue"
    />
  );
}
