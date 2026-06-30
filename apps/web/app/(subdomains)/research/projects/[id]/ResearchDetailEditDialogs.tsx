"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Edit3,
  FileText,
  Loader2,
  Save,
  Star,
  UserRound,
} from "lucide-react";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  FundingInstitutionPicker,
  type FundingInstitutionOption,
} from "../../organized-projects/ProjectFormControls";
import { RegisterUserPicker } from "../RegisterUserPicker";
import {
  IconHint,
  ResearchButton,
  researchFieldClass,
  researchLabelClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  AuthorsPicker,
  type AuthorOption,
  type SelectedAuthor,
} from "./AuthorsPicker";

type ResearchBasicValues = {
  title: string;
  sharedFolderUrl: string;
  abstract: string;
  universityRegistration: string;
  registrationName: string;
  registerStatus: string;
  claimStatus: string;
  isPriority: boolean;
  registrationUser: AuthorOption | null;
  fundingInstitution: FundingInstitutionOption | null;
};

const inputClass = researchFieldClass;
const textareaClass = researchTextareaClass;
const labelClass = researchLabelClass;

function DialogShell({
  open,
  onClose,
  icon,
  title,
  detail,
  headerActions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  detail: string;
  headerActions?: ReactNode;
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
      headerActions={headerActions}
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
    <IconHint label={label} position="bottom">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 !border-transparent !bg-transparent p-0 text-[#1F7180] shadow-none !shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:!bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:active:scale-100 dark:text-[#A8DADC] dark:hover:text-cyan-200"
      >
        <Edit3 className="h-4 w-4" />
      </button>
    </IconHint>
  );
}

function SubmitButton({
  isPending,
  label,
  form,
}: {
  isPending: boolean;
  label: string;
  form: string;
}) {
  return (
    <ResearchButton form={form} disabled={isPending}>
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {label}
    </ResearchButton>
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
      {authors.map((author) => (
        <input
          key={`selected-email-${author.id}`}
          type="hidden"
          name="selectedContactEmails"
          value={`${author.id}\t${author.selectedEmail || author.email}`}
        />
      ))}
    </>
  );
}

function HiddenBasic({ values }: { values: ResearchBasicValues }) {
  return (
    <>
      <input type="hidden" name="title" value={values.title} />
      <input
        type="hidden"
        name="sharedFolderUrl"
        value={values.sharedFolderUrl}
      />
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
      <input
        type="hidden"
        name="isPriority"
        value={values.isPriority ? "true" : "false"}
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

function PriorityResearchCheckbox({
  defaultChecked,
  disabled = false,
}: {
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={`group flex h-12 items-center gap-3 border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 transition duration-150 ease-out dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 active:translate-y-0 active:scale-[0.985] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white"
      }`}
    >
      <input
        type="checkbox"
        name="isPriority"
        value="true"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="flex h-5 w-5 flex-none items-center justify-center border border-slate-300 bg-white text-transparent transition peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700 dark:border-[#666666] dark:bg-[#202020] dark:peer-checked:border-amber-300 dark:peer-checked:bg-amber-950/35 dark:peer-checked:text-amber-300">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <Star
        className="h-4 w-4 flex-none text-slate-400 transition peer-checked:text-amber-700 dark:text-[#777777] dark:peer-checked:text-amber-300"
        aria-hidden="true"
      />
      <span className="whitespace-nowrap text-slate-700 transition group-hover:text-slate-950 peer-checked:text-amber-800 dark:text-[#E4E4E4] dark:group-hover:text-white dark:peer-checked:text-amber-200">
        Priority
      </span>
    </label>
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
  disabledReason,
  initialOpen = false,
  lockUntilSaved = false,
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
  disabledReason?: string;
  initialOpen?: boolean;
  lockUntilSaved?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <EditIconButton
        label={
          disabled && disabledReason
            ? disabledReason
            : "Edit research information"
        }
        onClick={() => setOpen(true)}
        disabled={disabled}
      />
      <DialogShell
        open={open}
        onClose={() => {
          if (!lockUntilSaved) setOpen(false);
        }}
        icon={<FileText className="h-5 w-5" />}
        title="Edit research information"
        detail="Update title, notes, registration, and claim information."
        headerActions={
          <SubmitButton
            form="research-basic-edit-form"
            isPending={isPending}
            label="Save information"
          />
        }
      >
        <form
          id="research-basic-edit-form"
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
              <span>
                Title
                <span className="research-required-mark">(*)</span>
              </span>
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
            Shared research folder
            <input
              name="sharedFolderUrl"
              type="url"
              defaultValue={values.sharedFolderUrl}
              placeholder="Paste the shared Google Drive folder link..."
              className={inputClass}
            />
          </label>

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
            <div className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
              <FundingInstitutionPicker
                institutions={fundingInstitutions}
                defaultInstitution={values.fundingInstitution}
                disabled={!canEditRegistrationClaim}
              />
              <PriorityResearchCheckbox
                defaultChecked={values.isPriority}
                disabled={!canEditRegistrationClaim}
              />
            </div>
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
  disabled = false,
  disabledReason,
  allowPendingEmail = false,
}: {
  action: (formData: FormData) => Promise<void>;
  values: ResearchBasicValues;
  authors: SelectedAuthor[];
  completedProductionSteps: string[];
  users: AuthorOption[];
  disabled?: boolean;
  disabledReason?: string;
  allowPendingEmail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <EditIconButton
        label={
          disabled
            ? disabledReason || "Author editing is unavailable"
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
        headerActions={
          <SubmitButton
            form="research-authors-edit-form"
            isPending={isPending}
            label="Save authors"
          />
        }
      >
        <form
          id="research-authors-edit-form"
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
            allowPendingEmail={allowPendingEmail}
          />
        </form>
      </DialogShell>
    </>
  );
}
