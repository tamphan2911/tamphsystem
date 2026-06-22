"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe2,
  Loader2,
  Pencil,
  PlusCircle,
  Save,
} from "lucide-react";
import { countryOptions } from "@/sites/research/lib/countries";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  ResearchIconButton,
  researchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type PublisherFormValues = {
  publisherCode?: string;
  name?: string;
  alias?: string;
  country?: string;
  website?: string;
  note?: string;
};

export function PublisherDialog({
  mode,
  submitAction,
  initialValues,
}: {
  mode: "create" | "edit";
  submitAction: (formData: FormData) => Promise<void>;
  initialValues?: PublisherFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  const router = useRouter();
  const isEdit = mode === "edit";

  return (
    <>
      {isEdit ? (
        <ResearchIconButton
          type="button"
          label="Edit publisher"
          tone="blue"
          onClick={() => setOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </ResearchIconButton>
      ) : (
        <ResearchButton type="button" onClick={() => setOpen(true)}>
          <PlusCircle className="h-4 w-4" />
          New Publisher
        </ResearchButton>
      )}

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={isEdit ? "Edit Publisher" : "New Publisher"}
        icon={<Building2 className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton form="publisher-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEdit ? (
              <Save className="h-4 w-4" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            {isPending
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Add Publisher"}
          </ResearchButton>
        }
      >
        <form
          id="publisher-form"
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                await submitAction(formData);
                setOpen(false);
                router.refresh();
                toast.showSuccess({
                  title: isEdit ? "Publisher updated" : "Publisher added",
                  detail: isEdit
                    ? "The publisher information and linked journal names were updated."
                    : "The publisher is ready to be selected in journal forms.",
                });
              } catch (error) {
                toast.showError({
                  title: "Publisher could not be saved",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "Check the publisher information and try again.",
                });
              }
            });
          }}
        >
          {isEdit && initialValues?.publisherCode ? (
            <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
              <span className="text-xs uppercase text-[#B0B0B0]">
                Publisher ID
              </span>
              <input
                value={initialValues.publisherCode}
                readOnly
                className={`${researchFieldClass} cursor-not-allowed opacity-70`}
              />
            </label>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
              <span className="text-xs uppercase text-[#B0B0B0]">
                Publisher name{" "}
                <span className="research-required-mark">(*)</span>
              </span>
              <input
                name="name"
                defaultValue={initialValues?.name}
                required
                placeholder="Official publisher name"
                className={researchFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
              <span className="text-xs uppercase text-[#B0B0B0]">Alias</span>
              <input
                name="alias"
                defaultValue={initialValues?.alias}
                placeholder="Short or commonly used publisher name"
                className={researchFieldClass}
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ResearchFormSelect
              name="country"
              defaultValue={initialValues?.country ?? ""}
              ariaLabel="Publisher country"
              options={[
                { value: "", label: "Choose publisher country" },
                ...countryOptions.map((country) => ({
                  value: country.name,
                  label: country.name,
                })),
              ]}
            />
            <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
              <span className="text-xs uppercase text-[#B0B0B0]">Website</span>
              <span className="relative">
                <input
                  name="website"
                  defaultValue={initialValues?.website}
                  placeholder="Official publisher website URL"
                  className={`${researchFieldClass} pr-10`}
                />
                <Globe2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-600 dark:text-cyan-300" />
              </span>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="text-xs uppercase text-[#B0B0B0]">Note</span>
            <textarea
              name="note"
              defaultValue={initialValues?.note}
              placeholder="Internal notes about this publisher"
              className={`${researchTextareaClass} min-h-28`}
            />
          </label>
        </form>
      </ResearchModal>
    </>
  );
}
