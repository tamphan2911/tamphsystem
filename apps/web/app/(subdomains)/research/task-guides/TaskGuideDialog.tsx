"use client";

import { useState, useTransition } from "react";
import {
  BookOpenText,
  FileText,
  Loader2,
  Pencil,
  PlusCircle,
  Save,
} from "lucide-react";
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
  importantNote: string;
  supportFileName?: string;
  supportFileSize?: string;
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
  const hasUnlimitedSupportFileSize = initialValues?.guideCode === "G006";
  const acceptedSupportFileText = hasUnlimitedSupportFileSize
    ? ".doc, .docx, .pdf, .rar"
    : ".doc, .docx, .pdf";
  const supportFileAccept = hasUnlimitedSupportFileSize
    ? ".doc,.docx,.pdf,.rar,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.rar,application/x-rar-compressed"
    : ".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf";

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
            const form = event.currentTarget;
            const supportFileInput = form.elements.namedItem(
              "supportFile",
            ) as HTMLInputElement | null;
            const file = supportFileInput?.files?.[0];
            if (
              file &&
              !hasUnlimitedSupportFileSize &&
              file.size > 2 * 1024 * 1024
            ) {
              toast.showError({
                title: "Support file is too large",
                detail: "Upload a Word or PDF file that is 2 MB or smaller.",
              });
              return;
            }
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
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Important note
            </span>
            <textarea
              name="importantNote"
              rows={4}
              defaultValue={initialValues?.importantNote}
              placeholder="Optional. Add a short warning, priority, or point that should stand out when the guide is opened."
              className={`${researchTextareaClass} min-h-28 whitespace-pre-wrap border-amber-200 bg-amber-50/60 text-amber-950 placeholder:text-amber-700/50 focus:border-amber-400 dark:border-amber-300/30 dark:bg-amber-950/20 dark:text-amber-100 dark:placeholder:text-amber-200/35`}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Support file
            </span>
            <span className="flex min-h-12 items-center gap-3 border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-[#444444] dark:bg-[#202020] dark:text-[#E4E4E4]">
              <FileText className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
              <input
                name="supportFile"
                type="file"
                accept={supportFileAccept}
                className="min-w-0 flex-1 cursor-pointer text-sm file:mr-3 file:border-0 file:bg-[#1F7180] file:px-3 file:py-1.5 file:text-sm file:font-normal file:text-white hover:file:bg-[#155864] dark:file:bg-[#A8DADC] dark:file:text-[#1F2937]"
              />
            </span>
            <span className="text-xs leading-5 text-slate-500 dark:text-[#B0B0B0]">
              {initialValues?.supportFileName
                ? `Current: ${initialValues.supportFileName}${
                    initialValues.supportFileSize
                      ? ` (${initialValues.supportFileSize})`
                      : ""
                  }. Optional replacement${
                    hasUnlimitedSupportFileSize ? "" : ", maximum 2 MB"
                  }.`
                : `Optional. Accepted formats: ${acceptedSupportFileText}.${
                    hasUnlimitedSupportFileSize ? "" : " Maximum 2 MB."
                  }`}
            </span>
          </label>
        </form>
      </ResearchModal>
    </>
  );
}
