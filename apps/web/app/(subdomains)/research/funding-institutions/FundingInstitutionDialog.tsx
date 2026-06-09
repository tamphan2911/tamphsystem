"use client";

import { useState, useTransition } from "react";
import { Landmark, Loader2, Pencil, Plus, Save } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type FundingInstitutionValues = {
  funderCode?: string | null;
  name?: string;
  shortName?: string | null;
  country?: string | null;
  website?: string | null;
  note?: string | null;
};

const inputClass =
  "w-full border border-[#444444] bg-[#2C2C2C] px-3.5 py-3 text-sm text-[#E4E4E4] outline-none transition placeholder:text-[#5A5A5A] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838]";
const labelClass =
  "grid gap-1.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-300";

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
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Edit funder"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-[#444444] bg-[#2C2C2C] text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/60"
        >
          <Plus className="h-4 w-4" />
          New Funder
        </button>
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
            <label className={labelClass}>
              Funder name
              <input
                name="name"
                defaultValue={initialValues?.name ?? ""}
                placeholder="Funding institution name"
                required
                className={inputClass}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelClass}>
                Funder ID
                <input
                  value={
                    isEdit
                      ? initialValues?.funderCode || "Missing ID"
                      : "Generated after saving"
                  }
                  readOnly
                  className={`${inputClass} cursor-not-allowed bg-slate-100 font-mono text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400`}
                />
              </label>
              <label className={labelClass}>
                Alias
                <input
                  name="shortName"
                  defaultValue={initialValues?.shortName ?? ""}
                  placeholder="UEH, IDPA..."
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Country
                <input
                  name="country"
                  defaultValue={initialValues?.country ?? ""}
                  placeholder="Vietnam"
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800" />

          <div className="grid gap-4">
            <label className={labelClass}>
              Website
              <input
                name="website"
                defaultValue={initialValues?.website ?? ""}
                placeholder="https://..."
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Note
              <textarea
                name="note"
                defaultValue={initialValues?.note ?? ""}
                placeholder="Funding scope, rules, contact notes..."
                className={`${inputClass} min-h-32 resize-y`}
              />
            </label>
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
