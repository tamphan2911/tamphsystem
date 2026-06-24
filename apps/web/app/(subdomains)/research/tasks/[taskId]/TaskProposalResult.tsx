"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  FileText,
  FolderGit2,
  Link2,
  Loader2,
  Plus,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { linkProposalToTask, submitProposal } from "../../actions";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import { ResearchFileUpload } from "@/sites/research/components/ResearchFileUpload";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchDropdownItemClass,
  researchDropdownItemIdleClass,
  researchDropdownPanelClass,
  researchFieldClass,
  researchLabelClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type TaskProposalResultItem = {
  id: string;
  type: "RESEARCH" | "PROJECT";
  status: string;
  title: string;
  description: string;
  contactInfo: string;
  notes: string;
  fileName: string;
  fileSize: string;
  decisionComment: string;
  createdAt: string;
  submittedBy: string;
  submittedByEmail: string;
  createdResearch: {
    id: string;
    title: string;
    code: string;
    stage: string;
    authors: string;
    updatedAt: string;
  } | null;
  createdProject: {
    id: string;
    title: string;
    code: string;
    status: string;
    projectType: string;
    organizer: string;
    owner: string;
    members: string;
    updatedAt: string;
  } | null;
};

export type ProposalResultResearchOption = {
  id: string;
  title: string;
  code: string;
  stage: string;
};

export type ProposalResultProjectOption = {
  id: string;
  title: string;
  code: string;
  status: string;
};

export type ProposalResultProposalOption = {
  id: string;
  title: string;
  status: string;
  submittedBy: string;
  submittedByEmail: string;
  createdAt: string;
};

export type ProposalResultAssociation = {
  type: "research" | "project";
  id: string;
  title: string;
  meta: string;
};

const maxFileSize = 2 * 1024 * 1024;
const allowedExtensions = [".doc", ".docx", ".pdf"];

function statusClass(status: string) {
  if (status === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  if (status === "DECLINED") {
    return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  }
  if (status === "REVIEWING") {
    return "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900";
  }
  return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

function statusIcon(status: string) {
  if (status === "ACCEPTED") return CheckCircle2;
  if (status === "DECLINED") return XCircle;
  return FolderGit2;
}

function fileSizeLabel(value: string) {
  return value ? ` - ${value}` : "";
}

function researchStageClass(stage: string) {
  if (stage === "ACCEPTED" || stage === "PUBLISHED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  if (stage === "PENDING") {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }
  if (stage === "REVIEW") {
    return "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900";
  }
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900/45 dark:text-slate-300 dark:ring-slate-700";
}

function projectStatusClass(status: string) {
  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  if (status === "ACTIVE") {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  if (status === "PENDING") {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }
  return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function TaskProposalResult({
  taskId,
  proposals,
  proposalType,
  canCreate,
  canManageAssociation,
  currentAssociation,
  proposalOptions,
}: {
  taskId: string;
  proposals: TaskProposalResultItem[];
  proposalType: "RESEARCH" | "PROJECT";
  canCreate: boolean;
  canManageAssociation: boolean;
  currentAssociation: ProposalResultAssociation | null;
  proposalOptions: ProposalResultProposalOption[];
}) {
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLinkPending, startLinkTransition] = useTransition();
  const [linkQuery, setLinkQuery] = useState("");
  const [selectedProposal, setSelectedProposal] =
    useState<ProposalResultProposalOption | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const linkSearchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useResearchToast();
  const typeLabel =
    proposalType === "PROJECT" ? "Project proposal" : "Research proposal";
  const associationLabel = proposalType === "PROJECT" ? "project" : "research";
  const canAddAnotherProposal =
    proposals.length === 0 ||
    proposals.every((proposal) => proposal.status === "DECLINED");
  const showProposalSlot =
    canAddAnotherProposal && (canCreate || canManageAssociation);
  const hasCreatedResult = proposals.some(
    (proposal) => proposal.createdResearch || proposal.createdProject,
  );
  const proposalResults = useMemo(() => {
    const needle = linkQuery.trim().toLowerCase();
    if (!needle) return [];
    return proposalOptions
      .filter((option) =>
        [
          option.title,
          option.status,
          option.id,
          option.submittedBy,
          option.submittedByEmail,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [linkQuery, proposalOptions]);

  function openLinkPicker() {
    if (!canManageAssociation) return;
    setSelectedProposal(null);
    setLinkQuery("");
    setLinkOpen(true);
  }

  function saveProposalLink() {
    if (!selectedProposal || isLinkPending) return;
    const formData = new FormData();
    formData.set("proposalId", selectedProposal.id);
    startLinkTransition(async () => {
      const result = await linkProposalToTask(taskId, formData);
      if (!result?.ok) {
        const detail =
          result?.reason === "PROPOSAL_ALREADY_LINKED"
            ? "That proposal is already linked to another task."
            : result?.reason === "TASK_TYPE_MISMATCH"
              ? `Choose a ${typeLabel.toLowerCase()} for this task.`
              : result?.reason === "TASK_ALREADY_FILLED"
                ? "This task already has a proposal that is waiting for review or approved."
                : "Choose one available proposal and try again.";
        toast.showError({
          title: "Proposal was not linked",
          detail,
        });
        return;
      }
      setLinkOpen(false);
      toast.showSuccess({
        title: "Proposal linked",
        detail: "The selected proposal is now shown in this task.",
      });
      router.refresh();
    });
  }

  function createProposal(formData: FormData) {
    if (isPending) return;
    setWarning("");
    const fileInput = formRef.current?.elements.namedItem(
      "supportFile",
    ) as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (file) {
      const extension = file.name
        .slice(file.name.lastIndexOf("."))
        .toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        setWarning("Support file must be .doc, .docx, or .pdf.");
        return;
      }
      if (file.size > maxFileSize) {
        setWarning("Support file must be 2 MB or smaller.");
        return;
      }
    }

    formData.set("taskId", taskId);
    formData.set("type", proposalType);
    startTransition(async () => {
      const result = await submitProposal(formData);
      if (!result.ok) {
        const detail =
          result.detail ?? "Please check the proposal details and try again.";
        setWarning(detail);
        toast.showError({
          title: result.title ?? "Proposal was not created",
          detail,
        });
        return;
      }
      formRef.current?.reset();
      setOpen(false);
      toast.showSuccess({
        title: "Proposal created",
        detail: "The proposal is linked to this task and waiting for review.",
      });
      router.refresh();
    });
  }

  function emptyProposalSlot(fullWidth: boolean) {
    return (
      <button
        type="button"
        onClick={() => {
          if (canManageAssociation) {
            openLinkPicker();
            return;
          }
          if (canCreate) setOpen(true);
        }}
        className={`group min-h-44 border border-dashed border-[#CFC6B8] bg-[#FBF9F4] p-4 text-left transition-[border-color,background-color,transform] duration-180 hover:border-[#7FBFC5] hover:bg-[#F3F8F6] dark:border-[#4A4A4A] dark:bg-[#262626] dark:hover:border-[#A8DADC] dark:hover:bg-[#303838] ${
          fullWidth ? "w-full md:col-span-3" : "w-full"
        } ${
          canCreate || canManageAssociation
            ? "cursor-pointer hover:-translate-y-0.5"
            : "cursor-default"
        }`}
      >
        <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center border border-[#D8D0C2] bg-[#FFFDF8] text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#A8DADC]">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-normal text-[#243047] dark:text-[#E4E4E4]">
            {canManageAssociation
              ? `Link existing ${typeLabel}`
              : canCreate
                ? proposals.length > 0
                  ? `Create another ${typeLabel}`
                  : `Create ${typeLabel}`
                : "Proposal not created yet"}
          </span>
          <span className="max-w-md text-xs leading-5 text-[#667085] dark:text-[#9CA3AF]">
            {canManageAssociation
              ? `Admin can connect this task to an existing ${typeLabel.toLowerCase()}.`
              : canCreate
                ? proposals.length > 0
                  ? "The previous proposal was declined. Create the next attempt from this task."
                  : "Create the proposal from this task. The proposal will be linked here after submission."
                : "The assignee can create the proposal from this task."}
          </span>
          {currentAssociation ? (
            <span className="max-w-md truncate text-xs text-[#1F7180] dark:text-[#A8DADC]">
              {currentAssociation.title}
            </span>
          ) : null}
        </div>
      </button>
    );
  }

  function proposalAttemptCard(proposal: TaskProposalResultItem) {
    const StatusIcon = statusIcon(proposal.status);
    return (
      <article
        key={proposal.id}
        className="border border-[#D8D0C2] bg-[#FBF9F4] p-4 text-[#243047] dark:border-[#444444] dark:bg-[#262626] dark:text-[#E4E4E4]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-[#667085] dark:text-[#8F8F8F]">
              {typeLabel}
            </p>
            <Link
              href={`/proposals/${proposal.id}`}
              onClick={(event) => event.stopPropagation()}
              className="block text-sm font-normal leading-6 text-[#1F7180] transition hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#D6F5F8]"
            >
              {proposal.title}
            </Link>
            <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
              {proposal.submittedBy}
              {proposal.submittedByEmail
                ? ` | ${proposal.submittedByEmail}`
                : ""}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs ring-1 ${statusClass(
              proposal.status,
            )}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {label(proposal.status)}
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#475467] dark:text-[#B0B0B0]">
          {proposal.description || "No proposal description."}
        </p>
        <div className="mt-3 grid gap-2 text-xs text-[#667085] dark:text-[#B0B0B0]">
          <span>{proposal.createdAt}</span>
          {proposal.fileName ? (
            <a
              href={`/api/research/proposals/${proposal.id}/file`}
              className="inline-flex w-fit items-center gap-2 text-[#1F7180] transition hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#D6F5F8]"
            >
              <FileText className="h-3.5 w-3.5" />
              {proposal.fileName}
              {fileSizeLabel(proposal.fileSize)}
            </a>
          ) : (
            <span>No support file.</span>
          )}
          {proposal.decisionComment ? (
            <span className="whitespace-pre-wrap">
              Decision note: {proposal.decisionComment}
            </span>
          ) : null}
          <span>
            Linked {associationLabel}:{" "}
            {currentAssociation ? (
              <span className="text-[#1F7180] dark:text-[#A8DADC]">
                {currentAssociation.title}
              </span>
            ) : (
              "Not linked"
            )}
          </span>
        </div>
      </article>
    );
  }

  function createdResearchCard(proposal: TaskProposalResultItem) {
    if (!proposal.createdResearch) return null;
    return (
      <article
        key={`${proposal.id}-research`}
        className="border border-[#D8D0C2] bg-[#FBF9F4] p-4 text-[#243047] dark:border-[#444444] dark:bg-[#262626] dark:text-[#E4E4E4]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-[#667085] dark:text-[#8F8F8F]">
              Research result
            </p>
            <Link
              href={`/projects/${proposal.createdResearch.id}`}
              className="block break-words text-sm font-normal leading-6 text-[#1F7180] transition hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#D6F5F8]"
            >
              {proposal.createdResearch.title}
            </Link>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs ring-1 ${researchStageClass(
              proposal.createdResearch.stage,
            )}`}
          >
            <Link2 className="h-3.5 w-3.5" />
            {label(proposal.createdResearch.stage)}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          <span>
            Research ID:{" "}
            <span className="font-mono text-[#344054] dark:text-[#E4E4E4]">
              {proposal.createdResearch.code || "Not assigned"}
            </span>
          </span>
          <span className="break-words">
            Authors: {proposal.createdResearch.authors || "-"}
          </span>
          <span>Updated: {proposal.createdResearch.updatedAt}</span>
        </div>
      </article>
    );
  }

  function createdProjectCard(proposal: TaskProposalResultItem) {
    if (!proposal.createdProject) return null;
    return (
      <article
        key={`${proposal.id}-project`}
        className="border border-[#D8D0C2] bg-[#FBF9F4] p-4 text-[#243047] dark:border-[#444444] dark:bg-[#262626] dark:text-[#E4E4E4]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-[#667085] dark:text-[#8F8F8F]">
              Project result
            </p>
            <Link
              href={`/organized-projects/${proposal.createdProject.id}`}
              className="block break-words text-sm font-normal leading-6 text-[#1F7180] transition hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#D6F5F8]"
            >
              {proposal.createdProject.title}
            </Link>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs ring-1 ${projectStatusClass(
              proposal.createdProject.status,
            )}`}
          >
            <Building2 className="h-3.5 w-3.5" />
            {label(proposal.createdProject.status)}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          <span>
            Project ID:{" "}
            <span className="font-mono text-[#344054] dark:text-[#E4E4E4]">
              {proposal.createdProject.code || "Not assigned"}
            </span>
          </span>
          <span>Type: {label(proposal.createdProject.projectType)}</span>
          <span className="break-words">
            Funder: {proposal.createdProject.organizer || "-"}
          </span>
          <span className="break-words">
            Members:{" "}
            {proposal.createdProject.members ||
              proposal.createdProject.owner ||
              "-"}
          </span>
          <span>Updated: {proposal.createdProject.updatedAt}</span>
        </div>
      </article>
    );
  }

  function linkedAssociationCard() {
    if (!currentAssociation || hasCreatedResult) return null;
    const href =
      currentAssociation.type === "research"
        ? `/projects/${currentAssociation.id}`
        : `/organized-projects/${currentAssociation.id}`;
    const Icon = currentAssociation.type === "research" ? FileText : Building2;
    const title =
      currentAssociation.type === "research"
        ? "Linked research"
        : "Linked project";
    const idLabel =
      currentAssociation.type === "research" ? "Research ID" : "Project ID";

    return (
      <article className="border border-[#D8D0C2] bg-[#FBF9F4] p-4 text-[#243047] dark:border-[#444444] dark:bg-[#262626] dark:text-[#E4E4E4]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-[#667085] dark:text-[#8F8F8F]">
              {title}
            </p>
            <Link
              href={href}
              className="block break-words text-sm font-normal leading-6 text-[#1F7180] transition hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#D6F5F8]"
            >
              {currentAssociation.title}
            </Link>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#1F7180] ring-1 ring-[#B9D7D8] dark:text-[#A8DADC] dark:ring-[#365A60]">
            <Icon className="h-3.5 w-3.5" />
            Linked
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          <span>
            {idLabel}:{" "}
            <span className="font-mono text-[#344054] dark:text-[#E4E4E4]">
              {currentAssociation.meta || "Not assigned"}
            </span>
          </span>
          <span>Updated after proposal approval or manual link changes.</span>
        </div>
      </article>
    );
  }

  return (
    <section className="border-t border-[#D8D0C2] p-5 dark:border-[#444444]">
      <div className="mb-4 flex items-center gap-2">
        <FolderGit2 className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
        <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
          Proposal result
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {proposals.length > 0 ? (
          <>
            {proposals.map((proposal, index) => (
              <div key={proposal.id} className="contents">
                {proposalAttemptCard(proposal)}
                {createdResearchCard(proposal)}
                {createdProjectCard(proposal)}
              </div>
            ))}
            {linkedAssociationCard()}
            {showProposalSlot ? emptyProposalSlot(false) : null}
          </>
        ) : (
          emptyProposalSlot(false)
        )}
      </div>

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Create ${typeLabel.toLowerCase()}`}
        icon={<FolderGit2 className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton form="task-proposal-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isPending ? "Creating..." : "Create proposal"}
          </ResearchButton>
        }
      >
        <form
          id="task-proposal-form"
          ref={formRef}
          action={createProposal}
          className="grid gap-4"
        >
          {warning ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
              {warning}
            </div>
          ) : null}
          <label className={researchLabelClass}>
            <span>
              Title
              <span className="research-required-mark">(*)</span>
            </span>
            <input
              name="title"
              required
              className={researchFieldClass}
              placeholder={
                proposalType === "PROJECT"
                  ? "Project proposal title (*)"
                  : "Research proposal title (*)"
              }
            />
          </label>
          <label className={researchLabelClass}>
            <span>
              Proposal description
              <span className="research-required-mark">(*)</span>
            </span>
            <textarea
              name="description"
              required
              className={researchTextareaClass}
              placeholder={
                proposalType === "PROJECT"
                  ? "Describe the project purpose, expected outputs, team, timeline, or funding context..."
                  : "Describe the research question, data, methods, target outputs, or support you need..."
              }
            />
          </label>
          <label className={researchLabelClass}>
            Support file
            <ResearchFileUpload
              name="supportFile"
              accept=".doc,.docx,.pdf"
              label="Choose support file"
              helper="Optional. Max 2 MB. Accepted formats: .doc, .docx, .pdf."
            />
          </label>
          <label className={researchLabelClass}>
            Contact information
            <input
              name="contactInfo"
              className={researchFieldClass}
              placeholder="Email, phone number, or the best way to reach you"
            />
          </label>
          <label className={researchLabelClass}>
            Notes
            <textarea
              name="notes"
              className={researchTextareaClass}
              placeholder="Anything else I should know before review"
            />
          </label>
        </form>
      </ResearchModal>

      <ResearchModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title={`Link existing ${typeLabel.toLowerCase()}`}
        icon={<Link2 className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        headerActions={
          <ResearchButton
            type="button"
            onClick={saveProposalLink}
            disabled={!selectedProposal || isLinkPending}
          >
            {isLinkPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {isLinkPending ? "Saving..." : "Save link"}
          </ResearchButton>
        }
      >
        <div className="grid gap-4">
          {selectedProposal ? (
            <div className="flex max-w-full items-center justify-between gap-3 overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-2 dark:border-[#444444] dark:bg-[#202020]">
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-sm text-[#243047] dark:text-[#E4E4E4]">
                  {selectedProposal.title}
                </span>
                <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                  {label(selectedProposal.status)}
                  {selectedProposal.submittedBy
                    ? ` | ${selectedProposal.submittedBy}`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="research-clickable-icon flex-none text-[#667085] hover:text-[#B33E5C] dark:text-[#B0B0B0] dark:hover:text-[#FF9DAE]"
                aria-label="Clear selected proposal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div ref={linkSearchRef} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C95A4] dark:text-[#B0B0B0]" />
            <input
              value={linkQuery}
              onChange={(event) => setLinkQuery(event.target.value)}
              placeholder={`Search ${typeLabel.toLowerCase()} by title, status, proposer, or ID...`}
              className={`${researchSearchFieldClass} pl-9`}
            />
            <FloatingDropdownPortal
              anchorRef={linkSearchRef}
              open={linkQuery.trim().length > 0}
              maxPanelHeight={224}
            >
              <div className={researchDropdownPanelClass}>
                <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                  {proposalResults.length > 0 ? (
                    proposalResults.map((item) => {
                      const Icon =
                        proposalType === "PROJECT" ? Building2 : FileText;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedProposal(item);
                            setLinkQuery("");
                          }}
                          className={`${researchDropdownItemClass} ${researchDropdownItemIdleClass} justify-start px-3`}
                        >
                          <Icon className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                              {label(item.status)}
                              {item.submittedBy ? ` | ${item.submittedBy}` : ""}
                              {item.createdAt ? ` | ${item.createdAt}` : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                      No available {typeLabel.toLowerCase()} found.
                    </div>
                  )}
                </div>
              </div>
            </FloatingDropdownPortal>
          </div>
        </div>
      </ResearchModal>
    </section>
  );
}
