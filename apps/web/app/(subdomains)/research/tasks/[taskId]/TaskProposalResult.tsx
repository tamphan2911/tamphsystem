"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  FolderGit2,
  Loader2,
  Plus,
  Send,
  XCircle,
} from "lucide-react";
import { submitProposal } from "../../actions";
import { ResearchFileUpload } from "@/sites/research/components/ResearchFileUpload";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
  researchLabelClass,
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

const maxFileSize = 2 * 1024 * 1024;
const allowedExtensions = [".doc", ".docx", ".pdf"];

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
}: {
  taskId: string;
  proposal: TaskProposalResultItem | null;
  proposalType: "RESEARCH" | "PROJECT";
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const toast = useResearchToast();
  const StatusIcon = proposal ? statusIcon(proposal.status) : FolderGit2;
  const typeLabel =
    proposalType === "PROJECT" ? "Project proposal" : "Research proposal";

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
        <article className="border border-[#D8D0C2] bg-[#FBF9F4] p-4 text-[#243047] dark:border-[#444444] dark:bg-[#262626] dark:text-[#E4E4E4]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/proposals/${proposal.id}`}
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
          </div>
        </article>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (canCreate) setOpen(true);
          }}
          className={`group min-h-44 w-full border border-dashed border-[#CFC6B8] bg-[#FBF9F4] p-4 text-left transition-[border-color,background-color,transform] duration-180 hover:border-[#7FBFC5] hover:bg-[#F3F8F6] dark:border-[#4A4A4A] dark:bg-[#262626] dark:hover:border-[#A8DADC] dark:hover:bg-[#303838] ${
            canCreate
              ? "cursor-pointer hover:-translate-y-0.5"
              : "cursor-default"
          }`}
        >
          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center border border-[#D8D0C2] bg-[#FFFDF8] text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#A8DADC]">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-sm font-normal text-[#243047] dark:text-[#E4E4E4]">
              {canCreate ? `Create ${typeLabel}` : "Proposal not created yet"}
            </span>
            <span className="max-w-md text-xs leading-5 text-[#667085] dark:text-[#9CA3AF]">
              {canCreate
                ? "Create the proposal from this task. The proposal will be linked here after submission."
                : "The assignee can create the proposal from this task."}
            </span>
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
    </section>
  );
}
