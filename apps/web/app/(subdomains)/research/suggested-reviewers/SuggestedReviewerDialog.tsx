"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Pencil,
  PlusCircle,
  Save,
  UserRoundSearch,
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

export type SuggestedReviewerFormValues = {
  name: string;
  email: string;
  institution: string;
  bio: string;
};

export function SuggestedReviewerDialog({
  mode,
  action,
  initialValues,
}: {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<void>;
  initialValues?: SuggestedReviewerFormValues;
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
          label="Edit suggested reviewer"
          tone="blue"
          className="!h-6 !w-6"
          onClick={() => setOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </ResearchIconButton>
      ) : (
        <ResearchButton type="button" onClick={() => setOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          New Reviewer
        </ResearchButton>
      )}

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? "Edit Suggested Reviewer" : "New Suggested Reviewer"}
        icon={<UserRoundSearch className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton form="suggested-reviewer-form" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Create reviewer"}
          </ResearchButton>
        }
      >
        <form
          id="suggested-reviewer-form"
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
                  title: isEdit
                    ? "Suggested reviewer updated"
                    : "Suggested reviewer created",
                  detail: "The reviewer is ready to be added to submissions.",
                });
              } catch (error) {
                toast.showError({
                  title: "Suggested reviewer was not saved",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "Check the reviewer information and try again.",
                });
              }
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
                Name <span className="research-required-mark">(*)</span>
              </span>
              <input
                name="name"
                required
                defaultValue={initialValues?.name}
                placeholder="Reviewer full name"
                className={researchFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
                Email <span className="research-required-mark">(*)</span>
              </span>
              <input
                name="email"
                type="email"
                required
                defaultValue={initialValues?.email}
                placeholder="reviewer@example.com"
                className={researchFieldClass}
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Institution
            </span>
            <input
              name="institution"
              defaultValue={initialValues?.institution}
              placeholder="University, institute, company..."
              className={researchFieldClass}
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="text-xs uppercase text-slate-500 dark:text-[#B0B0B0]">
              Bio
            </span>
            <textarea
              name="bio"
              rows={8}
              defaultValue={initialValues?.bio}
              placeholder="Research field, expertise, notes, links..."
              className={researchTextareaClass}
            />
          </label>
        </form>
      </ResearchModal>
    </>
  );
}
