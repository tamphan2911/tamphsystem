"use client";

import { useState, useTransition } from "react";
import { BookOpenText, Loader2, Pencil, PlusCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  ResearchIconButton,
  researchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type TaskGuideFormValues = {
  guideCode: string;
  title: string;
  content: string;
};

export function TaskGuideDialog({
  mode,
  action,
  initialValues,
}: {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<void>;
  initialValues?: TaskGuideFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  const isEdit = mode === "edit";

  return (
    <>
      {isEdit ? (
        <ResearchIconButton
          type="button"
          label="Edit task guide"
          tone="blue"
          className="!h-6 !w-6"
          onClick={() => setOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </ResearchIconButton>
      ) : (
        <ResearchButton type="button" onClick={() => setOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          New Guide
        </ResearchButton>
      )}

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? "Edit Task Guide" : "New Task Guide"}
        icon={<BookOpenText className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton form="task-guide-form" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Create guide"}
          </ResearchButton>
        }
      >
        <form
          id="task-guide-form"
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                await action(formData);
                setOpen(false);
                router.refresh();
                toast.showSuccess({
                  title: isEdit ? "Task guide updated" : "Task guide created",
                  detail: "The guide content is ready to be assigned later.",
                });
              } catch (error) {
                toast.showError({
                  title: "Task guide was not saved",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "Check the guide information and try again.",
                });
              }
            });
          }}
        >
          {isEdit ? (
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
                Guide ID
              </span>
              <input
                value={initialValues?.guideCode ?? ""}
                readOnly
                aria-label="Guide ID"
                className={`${researchFieldClass} font-mono`}
              />
            </label>
          ) : null}
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Guide title
            </span>
            <input
              name="title"
              required
              defaultValue={initialValues?.title}
              placeholder="Short title shown in the task popup"
              className={researchFieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Guide content
            </span>
            <textarea
              name="content"
              required
              rows={12}
              defaultValue={initialValues?.content}
              placeholder="Write the instructions, checks, links, and notes for this guide."
              className={`${researchTextareaClass} min-h-72 whitespace-pre-wrap`}
            />
          </label>
        </form>
      </ResearchModal>
    </>
  );
}
