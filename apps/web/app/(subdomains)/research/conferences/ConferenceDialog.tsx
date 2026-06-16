"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2, Pencil, Save } from "lucide-react";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchNumberInput } from "@/sites/research/components/ResearchNumberInput";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { currencyOptions } from "@/sites/research/lib/currency";

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
  "h-12 border border-[#444444] bg-[#2C2C2C] px-3 text-sm font-normal text-[#E4E4E4] outline-none transition placeholder:text-[#5A5A5A] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838]";
const areaClass =
  "min-h-24 border border-[#444444] bg-[#2C2C2C] px-3 py-2.5 text-sm font-normal text-[#E4E4E4] outline-none transition placeholder:text-[#5A5A5A] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838]";
const labelClass = "grid gap-1 text-sm font-semibold text-[#E4E4E4]";

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
            ? "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-none border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200"
            : "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-none border border-[#B39CD0] bg-[#B39CD0] px-4 text-sm font-normal text-[#2C2C2C] shadow-sm outline-none transition duration-150 ease-out hover:border-[#C8B6E2] hover:bg-[#C8B6E2] hover:text-[#2C2C2C] hover:shadow-md focus:ring-2 focus:ring-[#B39CD0]/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm"
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
        headerActions={
          <ResearchButton form="conference-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? "Save conference" : "Add conference"}
          </ResearchButton>
        }
      >
        <form
          id="conference-form"
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
              <div className="rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-bold">Conference needs attention</p>
                <p className="mt-0.5">{warning}</p>
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
              <label className={labelClass}>
                Conference name{" "}
                <span className="research-required-mark">(*)</span>
                <input
                  name="name"
                  defaultValue={initialValues?.name ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Type <span className="research-required-mark">(*)</span>
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
                <ResearchDatePicker
                  name="startDate"
                  defaultValue={initialValues?.startDate ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                End date
                <ResearchDatePicker
                  name="endDate"
                  defaultValue={initialValues?.endDate ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Close date
                <ResearchDatePicker
                  name="closeDate"
                  defaultValue={initialValues?.closeDate ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Submission deadline{" "}
                <span className="research-required-mark">(*)</span>
                <ResearchDatePicker
                  name="submissionDeadline"
                  required
                  defaultValue={initialValues?.submissionDeadline ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Acceptance notification{" "}
                <span className="research-required-mark">(*)</span>
                <ResearchDatePicker
                  name="acceptanceNotification"
                  required
                  defaultValue={initialValues?.acceptanceNotification ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Location <span className="research-required-mark">(*)</span>
                <input
                  name="location"
                  defaultValue={initialValues?.location ?? ""}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Organizer <span className="research-required-mark">(*)</span>
                <input
                  name="organizer"
                  defaultValue={initialValues?.organizer ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                ISBN <span className="research-required-mark">(*)</span>
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
                <ResearchNumberInput
                  name="submissionFee"
                  defaultValue={initialValues?.submissionFee ?? ""}
                  className={fieldClass}
                  placeholder="Submission fee"
                  min={0}
                />
              </label>
              <label className={labelClass}>
                Fee currency
                <ResearchFormSelect
                  name="submissionFeeCurrency"
                  defaultValue={initialValues?.submissionFeeCurrency ?? "USD"}
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
        </form>
      </ResearchModal>
    </>
  );
}
