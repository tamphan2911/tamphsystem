"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Pencil, Save } from "lucide-react";
import { updateProposal } from "../../actions";
import { ResearchFileUpload } from "@/sites/research/components/ResearchFileUpload";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
  researchFieldClass,
  researchLabelClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

type ProposalEditData = {
  id: string;
  type: "RESEARCH" | "PROJECT" | "CONFERENCE" | "JOURNAL";
  title: string;
  description: string;
  contactInfo: string;
  notes: string;
  identifier: string;
  organization: string;
  location: string;
  website: string;
  venueType: string;
  supportFileName: string;
  supportFileSize: string;
};

const maxFileSize = 2 * 1024 * 1024;
const allowedExtensions = [".doc", ".docx", ".pdf"];

function proposalTypeLabel(type: ProposalEditData["type"]) {
  if (type === "PROJECT") return "project";
  if (type === "CONFERENCE") return "conference";
  if (type === "JOURNAL") return "journal";
  return "research";
}

export function ProposalEditButton({
  proposal,
}: {
  proposal: ProposalEditData;
}) {
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const toast = useResearchToast();
  const isConference = proposal.type === "CONFERENCE";
  const isJournal = proposal.type === "JOURNAL";
  const isVenue = isConference || isJournal;
  const isSaving = isSubmitting || isPending;
  const typeLabel = proposalTypeLabel(proposal.type);

  return (
    <>
      <IconHint label="Edit proposal information">
        <button
          type="button"
          onClick={() => {
            setWarning("");
            setOpen(true);
          }}
          aria-label="Edit proposal information"
          className="research-clickable-icon research-allow-transform inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition-[color,transform,filter] duration-200 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155967] hover:shadow-none hover:drop-shadow-[0_0_0.45rem_rgba(31,113,128,0.18)] focus-visible:ring-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-[#D6F5F8]"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </IconHint>

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${typeLabel} proposal`}
        description="Update proposal information while it is still open for review."
        icon={<Pencil className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton form="proposal-edit-form" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save proposal"}
          </ResearchButton>
        }
      >
        <form
          id="proposal-edit-form"
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            if (isSaving) return;
            setWarning("");
            const form = event.currentTarget;
            const file = form.supportFile?.files?.[0] as File | undefined;
            if (file) {
              const extension = file.name
                .slice(file.name.lastIndexOf("."))
                .toLowerCase();
              if (!allowedExtensions.includes(extension)) {
                setWarning(
                  "Support file must be .doc, .docx, or .pdf. Please replace the selected file.",
                );
                return;
              }
              if (file.size > maxFileSize) {
                setWarning(
                  "Support file must be 2 MB or smaller. Please compress it or upload a shorter document.",
                );
                return;
              }
            }

            setIsSubmitting(true);
            startTransition(async () => {
              try {
                const result = await updateProposal(new FormData(form));
                if (!result.ok) {
                  const detail =
                    result.detail ??
                    "Please check the proposal information and try again.";
                  setWarning(detail);
                  toast.showError({
                    title: result.title ?? "Proposal was not saved",
                    detail,
                  });
                  return;
                }
                setOpen(false);
                toast.showSuccess({
                  title: "Proposal updated",
                  detail: "The proposal information has been saved.",
                });
                router.refresh();
              } finally {
                setIsSubmitting(false);
              }
            });
          }}
          className="grid gap-4"
        >
          <input type="hidden" name="proposalId" value={proposal.id} />
          {warning ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-normal text-amber-800 dark:border-amber-300/30 dark:bg-amber-950/25 dark:text-amber-200">
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
              defaultValue={proposal.title}
              className={researchFieldClass}
            />
          </label>

          {isVenue ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className={researchLabelClass}>
                <span>
                  {isConference ? "ISBN" : "ISSN"}
                  <span className="research-required-mark">(*)</span>
                </span>
                <input
                  name="identifier"
                  required
                  defaultValue={proposal.identifier}
                  className={researchFieldClass}
                />
              </label>
              <label className={researchLabelClass}>
                {isConference ? "Organizer" : "Publisher"}
                <input
                  name="organization"
                  defaultValue={proposal.organization}
                  className={researchFieldClass}
                />
              </label>
              {isConference ? (
                <>
                  <label className={researchLabelClass}>
                    Type
                    <ResearchFormSelect
                      name="venueType"
                      defaultValue={proposal.venueType || "INTERNATIONAL"}
                      ariaLabel="Conference type"
                      options={[
                        { value: "INTERNATIONAL", label: "International" },
                        { value: "NATIONAL", label: "National" },
                      ]}
                    />
                  </label>
                  <label className={researchLabelClass}>
                    Location
                    <input
                      name="location"
                      defaultValue={proposal.location}
                      className={researchFieldClass}
                    />
                  </label>
                </>
              ) : null}
              <label className={`${researchLabelClass} md:col-span-2`}>
                Website
                <input
                  name="website"
                  type="url"
                  defaultValue={proposal.website}
                  className={researchFieldClass}
                  placeholder="https://"
                />
              </label>
            </div>
          ) : null}

          {!isJournal ? (
            <>
              <label className={researchLabelClass}>
                <span>
                  Proposal description
                  <span className="research-required-mark">(*)</span>
                </span>
                <textarea
                  name="description"
                  required
                  defaultValue={proposal.description}
                  className={researchTextareaClass}
                />
              </label>
              <label className={researchLabelClass}>
                Support file
                <ResearchFileUpload
                  name="supportFile"
                  accept=".doc,.docx,.pdf"
                  label={
                    proposal.supportFileName
                      ? "Replace support file"
                      : "Choose support file"
                  }
                  helper={
                    proposal.supportFileName
                      ? `Current: ${proposal.supportFileName}${proposal.supportFileSize ? ` (${proposal.supportFileSize})` : ""}. Optional replacement, max 2 MB.`
                      : "Optional. Max 2 MB. Accepted formats: .doc, .docx, .pdf."
                  }
                />
              </label>
            </>
          ) : null}

          <label className={researchLabelClass}>
            Contact information
            <input
              name="contactInfo"
              defaultValue={proposal.contactInfo}
              className={researchFieldClass}
            />
          </label>

          <label className={researchLabelClass}>
            Notes
            <textarea
              name="notes"
              defaultValue={proposal.notes}
              className={researchTextareaClass}
            />
          </label>
        </form>
      </ResearchModal>
    </>
  );
}
