"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { useResearchToast } from "../components/ResearchToast";

export type FundingInstitutionValues = {
  funderCode?: string | null;
  name?: string;
  shortName?: string | null;
  country?: string | null;
  website?: string | null;
  note?: string | null;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-900";
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
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/60"
        >
          <Plus className="h-4 w-4" />
          New funder
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="text-left">
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    {isEdit ? "Edit funder" : "Add funder"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {isEdit
                      ? "Update funder identity and reference details."
                      : "Create a funding institution with an automatic immutable funder ID."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="cursor-pointer rounded-xl p-2 text-slate-400 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-700 hover:shadow-sm dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
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
              className="max-h-[calc(90vh-7rem)] space-y-5 overflow-y-auto px-6 py-5"
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

              <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-w-40 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 shadow-sm shadow-emerald-900/5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md disabled:cursor-wait disabled:opacity-70 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEdit ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isEdit ? "Save changes" : "Add funder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
