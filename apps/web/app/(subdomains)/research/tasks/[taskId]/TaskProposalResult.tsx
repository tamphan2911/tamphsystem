"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
import { submitProposal, updateProposalTaskAssociation } from "../../actions";
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

export type ProposalResultAssociation = {
  type: "research" | "project";
  id: string;
  title: string;
  meta: string;
};

const maxFileSize = 2 * 1024 * 1024;
const allowedExtensions = [".doc", ".docx", ".pdf"];

function associationMeta(option: {
  code: string;
  stage?: string;
  status?: string;
}) {
  return [option.code, option.stage ?? option.status]
    .filter(Boolean)
    .join(" - ");
}

function statusClass(status: string) {
  if (status === "ACCEPTED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-950/25 dark:text-emerald-300";
  }
  if (status === "DECLINED") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/40 dark:bg-rose-950/25 dark:text-rose-300";
  }
  if (status === "REVIEWING") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/40 dark:bg-sky-950/25 dark:text-sky-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/40 dark:bg-amber-950/25 dark:text-amber-300";
}

function statusIcon(status: string) {
  if (status === "ACCEPTED") return CheckCircle2;
  if (status === "DECLINED") return XCircle;
  return FolderGit2;
}

function fileSizeLabel(value: string) {
  return value ? ` - ${value}` : "";
}

export function TaskProposalResult({
  taskId,
  proposal,
  proposalType,
  canCreate,
  canManageAssociation,
  currentAssociation,
  researchOptions,
  projectOptions,
}: {
  taskId: string;
  proposal: TaskProposalResultItem | null;
  proposalType: "RESEARCH" | "PROJECT";
  canCreate: boolean;
  canManageAssociation: boolean;
  currentAssociation: ProposalResultAssociation | null;
  researchOptions: ProposalResultResearchOption[];
  projectOptions: ProposalResultProjectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLinkPending, startLinkTransition] = useTransition();
  const [linkQuery, setLinkQuery] = useState("");
  const [selectedAssociation, setSelectedAssociation] =
    useState<ProposalResultAssociation | null>(currentAssociation);
  const formRef = useRef<HTMLFormElement>(null);
  const linkSearchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useResearchToast();
  const StatusIcon = proposal ? statusIcon(proposal.status) : FolderGit2;
  const typeLabel =
    proposalType === "PROJECT" ? "Project proposal" : "Research proposal";
  const associationType = proposalType === "PROJECT" ? "project" : "research";
  const associationLabel = proposalType === "PROJECT" ? "project" : "research";
  const associationResults = useMemo(() => {
    const needle = linkQuery.trim().toLowerCase();
    if (!needle) return [];
    if (proposalType === "PROJECT") {
      return projectOptions
        .filter((option) =>
          [option.title, option.code, option.status, option.id]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
        .slice(0, 8)
        .map((option) => ({
          type: "project" as const,
          id: option.id,
          title: option.title,
          meta: associationMeta(option),
        }));
    }
    return researchOptions
      .filter((option) =>
        [option.title, option.code, option.stage, option.id]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8)
      .map((option) => ({
        type: "research" as const,
        id: option.id,
        title: option.title,
        meta: associationMeta(option),
      }));
  }, [linkQuery, projectOptions, proposalType, researchOptions]);

  function openLinkPicker() {
    if (!canManageAssociation) return;
    setSelectedAssociation(currentAssociation);
    setLinkQuery("");
    setLinkOpen(true);
  }

  function saveAssociation() {
    if (!selectedAssociation || isLinkPending) return;
    const formData = new FormData();
    formData.set("associationType", associationType);
    formData.set("associationId", selectedAssociation.id);
    startLinkTransition(async () => {
      const result = await updateProposalTaskAssociation(taskId, formData);
      if (!result?.ok) {
        toast.showError({
          title: "Linked item was not updated",
          detail:
            result?.reason === "ASSOCIATION_NOT_FOUND"
              ? `The selected ${associationLabel} could not be found.`
              : `Choose one ${associationLabel} and try again.`,
        });
        return;
      }
      setLinkOpen(false);
      toast.showSuccess({
        title: "Linked item updated",
        detail: `This proposal task is now connected to the selected ${associationLabel}.`,
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

  return (
    <section className="border-t border-[#D8D0C2] p-5 dark:border-[#444444]">
      <div className="mb-4 flex items-center gap-2">
        <FolderGit2 className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
        <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
          Proposal result
        </h2>
      </div>

      {proposal ? (
        <article
          role={canManageAssociation ? "button" : undefined}
          tabIndex={canManageAssociation ? 0 : undefined}
          onClick={openLinkPicker}
          onKeyDown={(event) => {
            if (
              canManageAssociation &&
              (event.key === "Enter" || event.key === " ")
            ) {
              event.preventDefault();
              openLinkPicker();
            }
          }}
          className={`border border-[#D8D0C2] bg-[#FBF9F4] p-4 text-[#243047] dark:border-[#444444] dark:bg-[#262626] dark:text-[#E4E4E4] ${
            canManageAssociation
              ? "cursor-pointer transition duration-180 hover:-translate-y-0.5 hover:border-[#7FBFC5] hover:bg-[#F3F8F6] dark:hover:border-[#A8DADC] dark:hover:bg-[#303838]"
              : ""
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
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
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs ${statusClass(
                proposal.status,
              )}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {proposal.status}
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
      ) : (
        <button
          type="button"
          onClick={() => {
            if (canManageAssociation) {
              openLinkPicker();
              return;
            }
            if (canCreate) setOpen(true);
          }}
          className={`group min-h-44 w-full border border-dashed border-[#CFC6B8] bg-[#FBF9F4] p-4 text-left transition-[border-color,background-color,transform] duration-180 hover:border-[#7FBFC5] hover:bg-[#F3F8F6] dark:border-[#4A4A4A] dark:bg-[#262626] dark:hover:border-[#A8DADC] dark:hover:bg-[#303838] ${
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
                ? currentAssociation
                  ? `Change linked ${associationLabel}`
                  : `Link ${associationLabel} to this task`
                : canCreate
                  ? `Create ${typeLabel}`
                  : "Proposal not created yet"}
            </span>
            <span className="max-w-md text-xs leading-5 text-[#667085] dark:text-[#9CA3AF]">
              {canManageAssociation
                ? `Admin can connect this ${typeLabel.toLowerCase()} task to one ${associationLabel}.`
                : canCreate
                  ? "Create the proposal from this task. The proposal will be linked here after submission."
                  : "The assignee can create the proposal from this task."}
            </span>
            {currentAssociation ? (
              <span className="max-w-md truncate text-xs text-[#1F7180] dark:text-[#A8DADC]">
                {currentAssociation.title}
              </span>
            ) : null}
          </div>
        </button>
      )}

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
        title={
          currentAssociation
            ? `Change linked ${associationLabel}`
            : `Link ${associationLabel}`
        }
        icon={<Link2 className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        headerActions={
          <ResearchButton
            type="button"
            onClick={saveAssociation}
            disabled={!selectedAssociation || isLinkPending}
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
          {selectedAssociation ? (
            <div className="flex max-w-full items-center justify-between gap-3 overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-2 dark:border-[#444444] dark:bg-[#202020]">
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-sm text-[#243047] dark:text-[#E4E4E4]">
                  {selectedAssociation.title}
                </span>
                <span className="block truncate text-xs text-[#667085] dark:text-[#B0B0B0]">
                  {selectedAssociation.meta}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedAssociation(null)}
                className="research-clickable-icon flex-none text-[#667085] hover:text-[#B33E5C] dark:text-[#B0B0B0] dark:hover:text-[#FF9DAE]"
                aria-label={`Clear selected ${associationLabel}`}
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
              placeholder={
                proposalType === "PROJECT"
                  ? "Search project by title, ID, or status..."
                  : "Search research by title, ID, or stage..."
              }
              className={`${researchSearchFieldClass} pl-9`}
            />
            <FloatingDropdownPortal
              anchorRef={linkSearchRef}
              open={linkQuery.trim().length > 0}
              maxPanelHeight={224}
            >
              <div className={researchDropdownPanelClass}>
                <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                  {associationResults.length > 0 ? (
                    associationResults.map((item) => {
                      const Icon =
                        item.type === "research" ? FileText : FolderGit2;
                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedAssociation(item);
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
                              {item.meta}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                      No matching {associationLabel} found.
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
