"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Edit3, FileText, Loader2, Save, UserRound } from "lucide-react";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  FundingInstitutionPicker,
  type FundingInstitutionOption,
} from "../../organized-projects/ProjectFormControls";
import { RegisterUserPicker } from "../RegisterUserPicker";
import {
  AuthorsPicker,
  type AuthorOption,
  type SelectedAuthor,
} from "./AuthorsPicker";

type ResearchBasicValues = {
  title: string;
  abstract: string;
  universityRegistration: string;
  registrationName: string;
  registerStatus: string;
  claimStatus: string;
  registrationUser: AuthorOption | null;
  fundingInstitution: FundingInstitutionOption | null;
};

const inputClass =
  "h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-400";
const textareaClass =
  "min-h-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-400";
const labelClass =
  "grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200";

function DialogShell({
  open,
  onClose,
  icon,
  title,
  detail,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open) return null;

  const dialog = (
    <ResearchModal
      open={open}
      onClose={onClose}
      title={title}
      description={detail}
      icon={icon}
      maxWidth="max-w-5xl"
      bodyClassName="p-0"
    >
      {children}
    </ResearchModal>
  );

  return mounted ? createPortal(dialog, document.body) : dialog;
}

function EditIconButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <span className="group/icon relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-200"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 opacity-0 shadow-lg shadow-slate-900/10 transition duration-200 ease-out group-hover/icon:translate-y-0 group-hover/icon:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
        {label}
      </span>
    </span>
  );
}

function SubmitButton({
  isPending,
  label,
}: {
  isPending: boolean;
  label: string;
}) {
  return (
    <button
      disabled={isPending}
      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/50"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function HiddenAuthors({ authors }: { authors: SelectedAuthor[] }) {
  const correspondingId =
    authors.find((author) => author.isCorresponding)?.id ??
    authors[0]?.id ??
    "";
  return (
    <>
      {authors.map((author) => (
        <input
          key={author.id}
          type="hidden"
          name="authorUserIds"
          value={author.id}
        />
      ))}
      <input
        type="hidden"
        name="correspondingAuthorId"
        value={correspondingId}
      />
    </>
  );
}

function HiddenBasic({ values }: { values: ResearchBasicValues }) {
  return (
    <>
      <input type="hidden" name="title" value={values.title} />
      <input type="hidden" name="abstract" value={values.abstract} />
      <input
        type="hidden"
        name="universityRegistration"
        value={values.universityRegistration}
      />
      <input
        type="hidden"
        name="registrationUserId"
        value={values.registrationUser?.id ?? ""}
      />
      <input
        type="hidden"
        name="fundingInstitutionId"
        value={values.fundingInstitution?.id ?? ""}
      />
      {!values.registrationUser && values.registrationName && (
        <input
          type="hidden"
          name="registrationName"
          value={values.registrationName}
        />
      )}
      <input
        type="hidden"
        name="registerStatus"
        value={values.registerStatus}
      />
      <input type="hidden" name="claimStatus" value={values.claimStatus} />
    </>
  );
}

function HiddenProduction({ steps }: { steps: string[] }) {
  return (
    <>
      {steps.map((step) => (
        <input
          key={step}
          type="hidden"
          name="completedProductionSteps"
          value={step}
        />
      ))}
    </>
  );
}

export function ResearchBasicEditDialog({
  action,
  values,
  authors,
  completedProductionSteps,
  users,
  fundingInstitutions,
  registerOptions,
  claimOptions,
  canEditRegistrationClaim,
  disabled = false,
}: {
  action: (formData: FormData) => Promise<void>;
  values: ResearchBasicValues;
  authors: SelectedAuthor[];
  completedProductionSteps: string[];
  users: AuthorOption[];
  fundingInstitutions: FundingInstitutionOption[];
  registerOptions: { value: string; label: string }[];
  claimOptions: { value: string; label: string }[];
  canEditRegistrationClaim: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <EditIconButton
        label="Edit research information"
        onClick={() => setOpen(true)}
        disabled={disabled}
      />
      <DialogShell
        open={open}
        onClose={() => setOpen(false)}
        icon={<FileText className="h-5 w-5" />}
        title="Edit research information"
        detail="Update title, notes, registration, and claim information."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await action(formData);
              setOpen(false);
              toast.showSuccess({
                title: "Research information saved",
                detail:
                  "Title, notes, registration, and claim information are now updated.",
              });
            });
          }}
          className="max-h-[calc(96vh-6rem)] overflow-y-auto px-6 pb-32 pt-5"
        >
          <input type="hidden" name="updateScope" value="basic" />
          <HiddenAuthors authors={authors} />
          <HiddenProduction steps={completedProductionSteps} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <label className={labelClass}>
              Title
              <input
                name="title"
                required
                defaultValue={values.title}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Registration period
              <input
                name="universityRegistration"
                defaultValue={values.universityRegistration}
                placeholder="Q1 2026"
                disabled={!canEditRegistrationClaim}
                className={inputClass}
              />
            </label>
          </div>

          <label className={`${labelClass} mt-4`}>
            Note
            <textarea
              name="abstract"
              defaultValue={values.abstract}
              className={textareaClass}
            />
          </label>

          <div className="mt-4 grid gap-4">
            <RegisterUserPicker
              users={users}
              defaultUser={values.registrationUser}
              disabled={!canEditRegistrationClaim}
            />
            {!values.registrationUser && values.registrationName && (
              <input
                type="hidden"
                name="registrationName"
                value={values.registrationName}
              />
            )}
            <div className="grid items-end gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Register
                <ResearchFormSelect
                  name="registerStatus"
                  defaultValue={values.registerStatus}
                  options={registerOptions}
                  ariaLabel="Registration status"
                  disabled={!canEditRegistrationClaim}
                />
              </label>
              <label className={labelClass}>
                Claim status
                <ResearchFormSelect
                  name="claimStatus"
                  defaultValue={values.claimStatus}
                  options={claimOptions}
                  ariaLabel="Claim status"
                  disabled={!canEditRegistrationClaim}
                />
              </label>
            </div>
            <FundingInstitutionPicker
              institutions={fundingInstitutions}
              defaultInstitution={values.fundingInstitution}
              disabled={!canEditRegistrationClaim}
            />
          </div>

          <div className="mt-5 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
            <SubmitButton isPending={isPending} label="Save information" />
          </div>
        </form>
      </DialogShell>
    </>
  );
}

export function ResearchAuthorsEditDialog({
  action,
  values,
  authors,
  completedProductionSteps,
  users,
  headerActions,
  disabled = false,
}: {
  action: (formData: FormData) => Promise<void>;
  values: ResearchBasicValues;
  authors: SelectedAuthor[];
  completedProductionSteps: string[];
  users: AuthorOption[];
  headerActions?: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <EditIconButton
        label={
          disabled
            ? "Authors are locked after accepted or published submission"
            : "Edit authors"
        }
        onClick={() => setOpen(true)}
        disabled={disabled}
      />
      <DialogShell
        open={open}
        onClose={() => setOpen(false)}
        icon={<UserRound className="h-5 w-5" />}
        title="Edit authors"
        detail="Search users, order authors, and choose the corresponding author."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await action(formData);
              setOpen(false);
              toast.showSuccess({
                title: "Authors saved",
                detail:
                  "Author order and corresponding author information are now updated.",
              });
            });
          }}
          className="max-h-[calc(90vh-6rem)] overflow-y-auto px-6 py-5"
        >
          <input type="hidden" name="updateScope" value="authors" />
          <HiddenBasic values={values} />
          <HiddenProduction steps={completedProductionSteps} />
          <AuthorsPicker
            users={users}
            defaultAuthors={authors}
            headerActions={headerActions}
          />
          <div className="mt-5 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
            <SubmitButton isPending={isPending} label="Save authors" />
          </div>
        </form>
      </DialogShell>
    </>
  );
}
