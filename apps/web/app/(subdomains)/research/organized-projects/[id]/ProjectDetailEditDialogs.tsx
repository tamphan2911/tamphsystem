"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  FileText,
  Loader2,
  Pencil,
  PlusCircle,
  Save,
  UsersRound,
} from "lucide-react";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { currencyOptions } from "@/sites/research/lib/currency";
import { AuthorsPicker } from "../../projects/[id]/AuthorsPicker";
import type {
  FundingInstitutionOption,
  ResearchResultOption,
  SelectedProjectMember,
} from "../ProjectFormControls";
import {
  FundingInstitutionPicker,
  ProjectMembersPicker,
  ProjectResearchPicker,
} from "../ProjectFormControls";

type ProjectInfo = {
  title: string;
  referenceCode: string;
  fundingInstitution: FundingInstitutionOption | null;
  status: string;
  financialClaimStatus: string;
  fundingAmount: string;
  fundingCurrency: string;
  startDate: string;
  durationMonths: number;
  requiredProducts: string[];
  description: string;
  note: string;
};

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const fieldClass =
  "h-12 border border-[#444444] bg-[#2C2C2C] px-3 text-sm font-normal text-[#E4E4E4] outline-none transition placeholder:text-[#B0B0B0] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838]";
const textAreaClass =
  "min-h-24 border border-[#444444] bg-[#2C2C2C] px-3 py-2.5 text-sm font-normal text-[#E4E4E4] outline-none transition placeholder:text-[#B0B0B0] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838]";
const labelClass = "grid gap-1 text-sm font-semibold text-[#E4E4E4]";

function HiddenProjectInfo({ info }: { info: ProjectInfo }) {
  return (
    <>
      <input type="hidden" name="title" value={info.title} />
      <input type="hidden" name="referenceCode" value={info.referenceCode} />
      <input
        type="hidden"
        name="fundingInstitutionId"
        value={info.fundingInstitution?.id ?? ""}
      />
      <input type="hidden" name="status" value={info.status} />
      <input
        type="hidden"
        name="financialClaimStatus"
        value={info.financialClaimStatus}
      />
      <input type="hidden" name="fundingAmount" value={info.fundingAmount} />
      <input
        type="hidden"
        name="fundingCurrency"
        value={info.fundingCurrency}
      />
      <input type="hidden" name="startDate" value={info.startDate} />
      <input
        type="hidden"
        name="durationMonths"
        value={String(info.durationMonths || 1)}
      />
      <input
        type="hidden"
        name="requiredProducts"
        value={info.requiredProducts.join("\n")}
      />
      <input type="hidden" name="description" value={info.description} />
      <input type="hidden" name="note" value={info.note} />
    </>
  );
}

function HiddenMembers({ members }: { members: SelectedProjectMember[] }) {
  const teamLeadId =
    members.find((member) => member.isTeamLead)?.id ?? members[0]?.id ?? "";

  return (
    <>
      {members.map((member) => (
        <input
          key={member.id}
          type="hidden"
          name="memberUserIds"
          value={member.id}
        />
      ))}
      <input type="hidden" name="teamLeadUserId" value={teamLeadId} />
      {members
        .filter((member) => member.isInstructor)
        .map((member) => (
          <input
            key={`instructor-${member.id}`}
            type="hidden"
            name="instructorUserIds"
            value={member.id}
          />
        ))}
    </>
  );
}

function HiddenResearch({ research }: { research: ResearchResultOption[] }) {
  return (
    <>
      {research.map((item) => (
        <input
          key={item.id}
          type="hidden"
          name="researchProjectIds"
          value={item.id}
        />
      ))}
    </>
  );
}

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
  return (
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
}

function EditIconButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <span className="group/icon relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-[#444444] bg-[#2C2C2C] text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 ${className}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap border border-[#444444] bg-[#2C2C2C] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 opacity-0 shadow-lg shadow-slate-900/10 transition duration-200 ease-out group-hover/icon:translate-y-0 group-hover/icon:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
        {label}
      </span>
    </span>
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
    <ResearchButton
      form={form}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {label}
    </ResearchButton>
  );
}

export function ProjectInfoEditDialog({
  action,
  info,
  members,
  research,
  fundingInstitutions,
}: {
  action: (formData: FormData) => Promise<void>;
  info: ProjectInfo;
  members: SelectedProjectMember[];
  research: ResearchResultOption[];
  fundingInstitutions: FundingInstitutionOption[];
}) {
  const [open, setOpen] = useState(false);
  const [financial, setFinancial] = useState(info.financialClaimStatus);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <EditIconButton
        label="Edit project information"
        onClick={() => setOpen(true)}
      />
      <DialogShell
        open={open}
        onClose={() => setOpen(false)}
        icon={<Building2 className="h-5 w-5" />}
        title="Edit project information"
        detail="Update project identity, funding, duration, status, and internal notes."
        headerActions={
          <SubmitButton
            form="project-info-edit-form"
            isPending={isPending}
            label="Save information"
          />
        }
      >
        <form
          id="project-info-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await action(formData);
              setOpen(false);
              toast.showSuccess({
                title: "Project information saved",
                detail:
                  "Project title, status, claim, funding, duration, description, and notes are now updated.",
              });
            });
          }}
          className="max-h-[calc(90vh-6rem)] overflow-y-auto px-6 py-5"
        >
          <HiddenMembers members={members} />
          <HiddenResearch research={research} />
          <input type="hidden" name="updateScope" value="info" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <label className={labelClass}>
              Project name
              <input
                name="title"
                required
                defaultValue={info.title}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Project ID
              <input
                name="referenceCode"
                required
                defaultValue={info.referenceCode}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="mt-4">
            <FundingInstitutionPicker
              institutions={fundingInstitutions}
              defaultInstitution={info.fundingInstitution}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className={labelClass}>
              Status
              <ResearchFormSelect
                name="status"
                defaultValue={
                  info.status === "ARCHIVED" ? "PLANNED" : info.status
                }
                ariaLabel="Choose project status"
                options={[
                  { value: "PLANNED", label: "Planned" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "COMPLETED", label: "Completed" },
                ]}
              />
            </label>
            <label className={labelClass}>
              Financial
              <ResearchFormSelect
                name="financialClaimStatus"
                defaultValue={financial}
                ariaLabel="Choose financial status"
                onValueChange={setFinancial}
                options={[
                  { value: "NONE", label: "None" },
                  { value: "NOT_ADVANCED", label: "Not advanced" },
                  { value: "ADVANCED", label: "Advanced" },
                  { value: "SETTLED", label: "Settled" },
                  { value: "REFUND_ADVANCE", label: "Refund advance" },
                ]}
              />
            </label>
            <label className={labelClass}>
              Start date
              <input
                name="startDate"
                type="date"
                required
                defaultValue={info.startDate}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Duration months
              <input
                name="durationMonths"
                type="number"
                min="1"
                required
                defaultValue={info.durationMonths || 1}
                className={fieldClass}
              />
            </label>
          </div>

          {financial !== "NONE" && (
            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
              <label className={labelClass}>
                Funding amount
                <input
                  name="fundingAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={info.fundingAmount}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Currency
                <ResearchFormSelect
                  name="fundingCurrency"
                  defaultValue={info.fundingCurrency || "VND"}
                  ariaLabel="Funding currency"
                  options={currencyOptions}
                />
              </label>
            </div>
          )}

          <div className="mt-4 grid gap-4">
            <label className={labelClass}>
              Required products
              <textarea
                name="requiredProducts"
                defaultValue={info.requiredProducts.join("\n")}
                placeholder="One required project output per line..."
                className="min-h-20 border border-[#444444] bg-[#2C2C2C] px-3 py-2.5 text-sm font-normal text-[#E4E4E4] outline-none transition placeholder:text-[#B0B0B0] hover:border-[#5A5A5A] hover:bg-[#383838] focus:border-[#A8DADC] focus:bg-[#383838]"
              />
            </label>
            <label className={labelClass}>
              Description
              <textarea
                name="description"
                defaultValue={info.description}
                className={textAreaClass}
              />
            </label>
            <label className={labelClass}>
              Notes
              <textarea
                name="note"
                defaultValue={info.note}
                className={textAreaClass}
              />
            </label>
          </div>
        </form>
      </DialogShell>
    </>
  );
}

export function ProjectMembersEditDialog({
  action,
  info,
  members,
  research,
  users,
}: {
  action: (formData: FormData) => Promise<void>;
  info: ProjectInfo;
  members: SelectedProjectMember[];
  research: ResearchResultOption[];
  users: UserOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <EditIconButton label="Edit members" onClick={() => setOpen(true)} />
      <DialogShell
        open={open}
        onClose={() => setOpen(false)}
        icon={<UsersRound className="h-5 w-5" />}
        title="Edit members"
        detail="Update project members, choose team lead, and mark instructors."
        headerActions={
          <SubmitButton
            form="project-members-edit-form"
            isPending={isPending}
            label="Save members"
          />
        }
      >
        <form
          id="project-members-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await action(formData);
              setOpen(false);
              toast.showSuccess({
                title: "Project members saved",
                detail:
                  "Project membership, team lead, and instructor roles are now updated.",
              });
            });
          }}
          className="max-h-[calc(90vh-6rem)] overflow-y-auto px-6 py-5"
        >
          <HiddenProjectInfo info={info} />
          <HiddenResearch research={research} />
          <input type="hidden" name="updateScope" value="members" />
          <ProjectMembersPicker users={users} defaultMembers={members} />
        </form>
      </DialogShell>
    </>
  );
}

export function ProjectResearchEditDialog({
  action,
  info,
  members,
  research,
  researchOptions,
}: {
  action: (formData: FormData) => Promise<void>;
  info: ProjectInfo;
  members: SelectedProjectMember[];
  research: ResearchResultOption[];
  researchOptions: ResearchResultOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();

  return (
    <>
      <EditIconButton
        label="Edit associated research"
        onClick={() => setOpen(true)}
      />
      <DialogShell
        open={open}
        onClose={() => setOpen(false)}
        icon={<FileText className="h-5 w-5" />}
        title="Edit associated research"
        detail="Connect or remove research records associated with this project."
        headerActions={
          <SubmitButton
            form="project-research-edit-form"
            isPending={isPending}
            label="Save research"
          />
        }
      >
        <form
          id="project-research-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await action(formData);
              setOpen(false);
              toast.showSuccess({
                title: "Associated research saved",
                detail:
                  "The research records linked with this project are now updated.",
              });
            });
          }}
          className="max-h-[calc(90vh-6rem)] overflow-y-auto px-6 py-5"
        >
          <HiddenProjectInfo info={info} />
          <HiddenMembers members={members} />
          <input type="hidden" name="updateScope" value="research" />
          <ProjectResearchPicker
            researchOptions={researchOptions}
            defaultResearch={research}
          />
        </form>
      </DialogShell>
    </>
  );
}

export function CreateProjectResearchDialog({
  action,
  users,
  members,
}: {
  action: (formData: FormData) => Promise<{ ok: boolean; reason?: string }>;
  users: UserOption[];
  members: SelectedProjectMember[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  const defaultAuthors = members.map((member, index) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    isCorresponding: index === 0,
  }));

  return (
    <>
      <EditIconButton
        label="Add research associated"
        onClick={() => setOpen(true)}
        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200"
      />
      <DialogShell
        open={open}
        onClose={() => setOpen(false)}
        icon={<PlusCircle className="h-5 w-5" />}
        title="Add research associated"
        detail="Create a research record and link it to this project."
        headerActions={
          <SubmitButton
            form="project-create-research-form"
            isPending={isPending}
            label="Add research"
          />
        }
      >
        <form
          id="project-create-research-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await action(formData);
              if (!result?.ok) {
                toast.showError({
                  title: "Research was not added",
                  detail:
                    result?.reason === "UNAUTHORIZED"
                      ? "Only admin or the project team lead can add research here."
                      : "Add a title and at least one author, then try again.",
                });
                return;
              }
              setOpen(false);
              toast.showSuccess({
                title: "Research associated added",
                detail:
                  "The research record was created, linked with this project, and project members were notified.",
              });
            });
          }}
          className="max-h-[calc(90vh-6rem)] overflow-y-auto px-6 py-5"
        >
          <div className="grid gap-4">
            <label className={labelClass}>
              Title
              <input
                name="title"
                required
                placeholder="Research title"
                className={fieldClass}
              />
            </label>
            <AuthorsPicker users={users} defaultAuthors={defaultAuthors} />
            <label className={labelClass}>
              Note
              <textarea
                name="abstract"
                placeholder="Optional working note for this research..."
                className={textAreaClass}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelClass}>
                University registration
                <input
                  name="universityRegistration"
                  placeholder="Q1 2026"
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                Register
                <ResearchFormSelect
                  name="registerStatus"
                  defaultValue="NOT_REGISTERED"
                  ariaLabel="Choose registration status"
                  options={[
                    { value: "NOT_REGISTERED", label: "Not registered" },
                    { value: "PREPARING", label: "Plan" },
                    { value: "SUBMITTED", label: "Submitted" },
                    { value: "APPROVED", label: "Approved" },
                  ]}
                />
              </label>
              <label className={labelClass}>
                Claim status
                <ResearchFormSelect
                  name="claimStatus"
                  defaultValue="CANNOT_CLAIM"
                  ariaLabel="Choose claim status"
                  options={[
                    { value: "CANNOT_CLAIM", label: "Cannot claim" },
                    { value: "WAITING_PUBLISH", label: "Waiting publish" },
                    { value: "MAKING_DOCUMENT", label: "Making document" },
                    { value: "WAITING", label: "Waiting" },
                    { value: "CLAIMED", label: "Claimed" },
                  ]}
                />
              </label>
            </div>
          </div>
        </form>
      </DialogShell>
    </>
  );
}
