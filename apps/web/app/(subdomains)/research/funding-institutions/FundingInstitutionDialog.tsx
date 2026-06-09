"use client";

import { useState, useTransition } from "react";
import { Landmark, Loader2, Pencil, Plus, Save } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  ResearchIconButton,
  researchFieldClass,
  researchLabelClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type FundingInstitutionValues = {
  funderCode?: string | null;
  name?: string;
  shortName?: string | null;
  country?: string | null;
  website?: string | null;
  note?: string | null;
};

export function FundingInstitutionDialog({
  mode,
  submitAction,
  initialValues,
}: {
  mode: "create" | "edit";
  submitAction: (formData: FormData) => Promise<void> | void;
  initialValues?: FundingInstitutionValues;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  const isEdit = mode === "edit";

  function closeDialog() {
    setOpen(false);
  }

  return (
    <>
      {isEdit ? (
        <ResearchIconButton
          type="button"
          onClick={() => setOpen(true)}
          label="Edit funder"
          tone="slate"
          className="h-8 w-8 border-0 bg-transparent text-[#B0B0B0] shadow-none hover:border-transparent hover:bg-transparent hover:text-[#A8DADC] hover:shadow-none"
        >
          <Pencil className="h-4 w-4" />
        </ResearchIconButton>
      ) : (
        <ResearchButton
          type="button"
          onClick={() => setOpen(true)}
          tone="primary"
        >
          <Plus className="h-4 w-4" />
          New Funder
        </ResearchButton>
      )}

      <ResearchModal
        open={open}
        onClose={closeDialog}
        title={isEdit ? "Edit funder" : "Add funder"}
        description={
          isEdit
            ? "Update funder identity and reference details."
            : "Create a funding institution with an automatic immutable funder ID."
        }
        icon={<Landmark className="h-5 w-5" />}
        headerActions={
          <ResearchButton form="funder-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {isEdit ? "Save changes" : "Add funder"}
          </ResearchButton>
        }
      >
        <form
          id="funder-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await submitAction(formData);
              closeDialog();
              toast.showSuccess({
                title: isEdit ? "Funder updated" : "Funder added",
                detail: isEdit
                  ? "Funding institution details were saved and updated across organized projects."
                  : "Funding institution created with an automatic Funder ID and ready to link with projects.",
              });
            });
          }}
          className="space-y-5"
        >
          <div className="grid gap-4">
            <label className={researchLabelClass}>
              Funder name
              <input
                name="name"
                defaultValue={initialValues?.name ?? ""}
                placeholder="Funding institution name"
                required
                className={researchFieldClass}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className={researchLabelClass}>
                Funder ID
                <input
                  value={
                    isEdit
                      ? initialValues?.funderCode || "Missing ID"
                      : "Generated after saving"
                  }
                  readOnly
                  className={`${researchFieldClass} cursor-not-allowed font-mono text-xs uppercase tracking-wide`}
                />
              </label>
              <label className={researchLabelClass}>
                Alias
                <input
                  name="shortName"
                  defaultValue={initialValues?.shortName ?? ""}
                  placeholder="UEH, IDPA..."
                  className={researchFieldClass}
                />
              </label>
              <label className={researchLabelClass}>
                Country
                <input
                  name="country"
                  defaultValue={initialValues?.country ?? ""}
                  placeholder="Vietnam"
                  className={researchFieldClass}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          <div className="grid gap-4">
            <label className={researchLabelClass}>
              Website
              <input
                name="website"
                defaultValue={initialValues?.website ?? ""}
                placeholder="https://..."
                className={researchFieldClass}
              />
            </label>
            <label className={researchLabelClass}>
              Note
              <textarea
                name="note"
                defaultValue={initialValues?.note ?? ""}
                placeholder="Funding scope, rules, contact notes..."
                className={`${researchTextareaClass} min-h-32 resize-y`}
              />
            </label>
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
