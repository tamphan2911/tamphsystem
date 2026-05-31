"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2, Pencil, Save } from "lucide-react";
import { ResearchFormSelect } from "../components/ResearchFormSelect";
import { ResearchModal } from "../components/ResearchModal";
import { useResearchToast } from "../components/ResearchToast";
import { currencyOptions } from "../lib/currency";

export type ConferenceFormValues = {
  name?: string;
  type?: string | null;
  themes?: string | null;
  targetTheme?: string | null;
  isbn?: string | null;
  organizer?: string | null;
  location?: string | null;
  startDate?: string;
  endDate?: string;
  submissionDeadline?: string;
  acceptanceNotification?: string;
  closeDate?: string;
  submissionFee?: string | null;
  submissionFeeCurrency?: string;
  website?: string | null;
  note?: string | null;
};

const fieldClass =
  "h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const areaClass =
  "min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const labelClass =
  "grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200";

export function ConferenceDialog({
  mode,
  action,
  initialValues,
}: {
  mode: "create" | "edit";
  action: (
    formData: FormData,
  ) => Promise<void | { ok: boolean; reason?: string; message?: string }>;
  initialValues?: ConferenceFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  const isEdit = mode === "edit";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setWarning("");
          setOpen(true);
        }}
        className={
          isEdit
            ? "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200"
            : "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-100 hover:shadow-md dark:border-cyan-800/70 dark:bg-cyan-950/40 dark:text-cyan-200"
        }
        aria-label={isEdit ? "Edit conference" : "Add conference"}
      >
        {isEdit ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <>
            <CalendarPlus className="h-4 w-4" />
            New conference
          </>
        )}
      </button>

      <ResearchModal
        open={open}
        onClose={() => {
          setWarning("");
          setOpen(false);
        }}
        title={isEdit ? "Edit conference" : "Add conference"}
        description="Track conference schedule, ISBN, submission fee, deadlines, and submission notes."
        icon={
          isEdit ? (
            <Pencil className="h-5 w-5" />
          ) : (
            <CalendarPlus className="h-5 w-5" />
          )
        }
        maxWidth="max-w-5xl"
      >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setWarning("");
                const formData = new FormData(event.currentTarget);
                startTransition(async () => {
                  const result = await action(formData);
                  if (result && "ok" in result && !result.ok) {
                    const detail =
                      result.message ??
                      (result.reason === "LOCKED"
                        ? "This conference is closed. Unlock it before editing."
                        : "Please check the required conference information and try again.");
                    setWarning(detail);
                    toast.showError({
                      title: "Conference was not saved",
                      detail,
                    });
                    return;
                  }
                  setOpen(false);
                  toast.showSuccess({
                    title: isEdit ? "Conference updated" : "Conference added",
                    detail: isEdit
                      ? "Conference information was saved and the record is locked again if it was closed."
                      : "The conference is now available for submissions and research planning.",
                  });
                });
              }}
              className="grid gap-4"
            >
              <div className="grid gap-4">
                {warning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-bold">Conference needs attention</p>
                    <p className="mt-0.5">{warning}</p>
                  </div>
                )}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                  <label className={labelClass}>
                    Conference name *
                    <input
                      name="name"
                      defaultValue={initialValues?.name ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Type *
                    <ResearchFormSelect
                      name="type"
                      defaultValue={initialValues?.type ?? "INTERNATIONAL"}
                      ariaLabel="Conference type"
                      options={[
                        { value: "INTERNATIONAL", label: "International" },
                        { value: "NATIONAL", label: "National" },
                      ]}
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className={labelClass}>
                    Start date
                    <input
                      name="startDate"
                      type="date"
                      defaultValue={initialValues?.startDate ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    End date
                    <input
                      name="endDate"
                      type="date"
                      defaultValue={initialValues?.endDate ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Close date
                    <input
                      name="closeDate"
                      type="date"
                      defaultValue={initialValues?.closeDate ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Submission deadline *
                    <input
                      name="submissionDeadline"
                      type="date"
                      defaultValue={initialValues?.submissionDeadline ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Acceptance notification *
                    <input
                      name="acceptanceNotification"
                      type="date"
                      defaultValue={initialValues?.acceptanceNotification ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Location *
                    <input
                      name="location"
                      defaultValue={initialValues?.location ?? ""}
                      className={fieldClass}
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    Organizer *
                    <input
                      name="organizer"
                      defaultValue={initialValues?.organizer ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    ISBN *
                    <input
                      name="isbn"
                      defaultValue={initialValues?.isbn ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Main theme
                    <input
                      name="targetTheme"
                      defaultValue={initialValues?.targetTheme ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Homepage
                    <input
                      name="website"
                      defaultValue={initialValues?.website ?? ""}
                      className={fieldClass}
                    />
                  </label>
                </div>

                <label className={labelClass}>
                  Themes
                  <textarea
                    name="themes"
                    defaultValue={initialValues?.themes ?? ""}
                    className={areaClass}
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className={labelClass}>
                    Submission fee
                    <input
                      name="submissionFee"
                      defaultValue={initialValues?.submissionFee ?? ""}
                      className={fieldClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Fee currency
                    <ResearchFormSelect
                      name="submissionFeeCurrency"
                      defaultValue={
                        initialValues?.submissionFeeCurrency ?? "USD"
                      }
                      ariaLabel="Submission fee currency"
                      options={currencyOptions}
                    />
                  </label>
                </div>

                <label className={labelClass}>
                  Notes
                  <textarea
                    name="note"
                    defaultValue={initialValues?.note ?? ""}
                    className={areaClass}
                  />
                </label>
              </div>
              <div className="mt-5 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  disabled={isPending}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-800/70 dark:bg-cyan-950/40 dark:text-cyan-200"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isEdit ? "Save conference" : "Add conference"}
                </button>
              </div>
            </form>
      </ResearchModal>
    </>
  );
}
