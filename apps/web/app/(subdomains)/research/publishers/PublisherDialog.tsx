"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Building2,
  Check,
  FileText,
  Globe2,
  Loader2,
  LockKeyhole,
  Mail,
  Pencil,
  PlusCircle,
  Save,
} from "lucide-react";
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
  website?: string;
  note?: string;
  usesSingleAccount?: boolean;
  publisherAccount?: {
    id: string;
    username: string;
    password: string;
    email: string;
    note: string;
  } | null;
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
  const [usesSingleAccount, setUsesSingleAccount] = useState(
    Boolean(initialValues?.usesSingleAccount),
  );

  return (
    <>
      {isEdit ? (
        <ResearchIconButton
          type="button"
          label="Edit publisher"
          tone="blue"
          className="!h-5 !w-5 items-start"
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
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
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
            <label className="flex cursor-pointer items-center gap-3 self-end border border-[#444444] px-3 py-3 text-sm text-[#E4E4E4]">
              <input
                name="usesSingleAccount"
                type="checkbox"
                checked={usesSingleAccount}
                onChange={(event) => setUsesSingleAccount(event.target.checked)}
                className="peer sr-only"
              />
              <span className="inline-flex h-5 w-5 flex-none items-center justify-center border border-[#666666] text-transparent transition-colors peer-checked:border-violet-500 peer-checked:bg-violet-500 peer-checked:text-white dark:peer-checked:border-violet-300 dark:peer-checked:bg-violet-300 dark:peer-checked:text-[#202020]">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="leading-5">One account for all journals</span>
            </label>
          </div>
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

          {usesSingleAccount ? (
            <section className="research-dropdown-panel grid gap-4 border-t border-[#444444] pt-5">
              {initialValues?.publisherAccount?.id ? (
                <input
                  type="hidden"
                  name="publisherAccountId"
                  value={initialValues.publisherAccount.id}
                />
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="sr-only">Publisher account login ID</span>
                  <span className="research-auth-input-shell">
                    <input
                      name="accountUsername"
                      required
                      defaultValue={initialValues?.publisherAccount?.username}
                      placeholder="Publisher account login ID (*)"
                    />
                    <AtSign aria-hidden="true" />
                  </span>
                </label>
                <label className="block">
                  <span className="sr-only">Publisher account password</span>
                  <span className="research-auth-input-shell">
                    <input
                      name="accountPassword"
                      required
                      defaultValue={initialValues?.publisherAccount?.password}
                      placeholder="Publisher account password (*)"
                    />
                    <LockKeyhole aria-hidden="true" />
                  </span>
                </label>
                <label className="block">
                  <span className="sr-only">Publisher account email</span>
                  <span className="research-auth-input-shell">
                    <input
                      name="accountEmail"
                      type="email"
                      defaultValue={initialValues?.publisherAccount?.email}
                      placeholder="Optional email used for this account"
                    />
                    <Mail aria-hidden="true" />
                  </span>
                </label>
                <label className="block">
                  <span className="sr-only">Publisher account note</span>
                  <span className="research-auth-input-shell">
                    <input
                      name="accountNote"
                      defaultValue={initialValues?.publisherAccount?.note}
                      placeholder="Optional recovery note or login URL"
                    />
                    <FileText aria-hidden="true" />
                  </span>
                </label>
              </div>
            </section>
          ) : null}
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
