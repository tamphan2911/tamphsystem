"use client";

import { useRef, useState, useTransition } from "react";
import {
  BookOpen,
  CalendarDays,
  Lightbulb,
  Loader2,
  MapPin,
  Rocket,
  Send,
} from "lucide-react";
import { submitProposal } from "../../../app/(subdomains)/research/actions";
import { ResearchModal } from "./ResearchModal";
import { ResearchFileUpload } from "./ResearchFileUpload";
import { ResearchFormSelect } from "./ResearchFormSelect";
import {
  ResearchButton,
  researchFieldClass,
  researchLabelClass,
  researchTextareaClass,
} from "./ResearchPrimitives";
import { useResearchToast } from "./ResearchToast";

type ProposalKind = "RESEARCH" | "PROJECT" | "CONFERENCE" | "JOURNAL";

const maxFileSize = 2 * 1024 * 1024;
const allowedExtensions = [".doc", ".docx", ".pdf"];

const successLines = [
  {
    title: "Proposal landed clean",
    detail: "Respect. Your idea is in the house, and I’ll get in touch soon.",
  },
  {
    title: "Fresh proposal received",
    detail: "You dropped the plan. I’ll review it and circle back soon.",
  },
  {
    title: "Idea locked in",
    detail:
      "Your proposal is on my radar now. Keep your phone/email close, I’ll reach out soon.",
  },
  {
    title: "That pitch made it through",
    detail:
      "Thanks for sending it. I’ll check the details and get back to you soon.",
  },
];

const fieldClass = researchFieldClass;
const areaClass = researchTextareaClass;
const labelClass = researchLabelClass;

export function ProposalDialog({
  type,
  isLoggedIn,
  hasVerifiedEmail,
}: {
  type: ProposalKind;
  isLoggedIn: boolean;
  hasVerifiedEmail: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useResearchToast();
  const isProject = type === "PROJECT";
  const isConference = type === "CONFERENCE";
  const isJournal = type === "JOURNAL";
  const isVenue = isConference || isJournal;
  const uploadDisabled = isPending || isSubmitting;
  const typeLabel = isProject
    ? "project"
    : isConference
      ? "conference"
      : isJournal
        ? "journal"
        : "research";
  const buttonLabel = `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)} proposal`;
  const Icon = isProject
    ? Rocket
    : isConference
      ? CalendarDays
      : isJournal
        ? BookOpen
        : Lightbulb;
  const openDialog = () => {
    if (!isLoggedIn) {
      toast.showError({
        title: "Login required",
        detail: "Please log in before sending a proposal.",
      });
      return;
    }
    if (!hasVerifiedEmail) {
      toast.showError({
        title: "Verify your email first",
        detail:
          "Your email must be verified before you can send a proposal to Research Hub.",
      });
      return;
    }
    setWarning("");
    setOpen(true);
  };

  return (
    <>
      <ResearchButton type="button" onClick={openDialog}>
        <Icon className="h-4 w-4" />
        {buttonLabel}
      </ResearchButton>

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Send ${typeLabel} proposal`}
        description="Share the details, support file, and best contact channel."
        icon={<Icon className="h-5 w-5" />}
        maxWidth="max-w-3xl"
        headerActions={
          <ResearchButton form="proposal-form" disabled={uploadDisabled}>
            {uploadDisabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {uploadDisabled ? "Uploading..." : "Send proposal"}
          </ResearchButton>
        }
      >
        <form
          id="proposal-form"
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            if (uploadDisabled) return;
            setWarning("");
            const form = event.currentTarget;
            const file = form.supportFile.files?.[0] as File | undefined;
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

            const formData = new FormData(form);
            formData.set("type", type);
            setIsSubmitting(true);
            startTransition(async () => {
              try {
                const result = await submitProposal(formData);
                if (!result.ok) {
                  const detail =
                    result.detail ??
                    "Please check the proposal information and try again.";
                  setWarning(detail);
                  toast.showError({
                    title: result.title ?? "Proposal was not sent",
                    detail,
                  });
                  return;
                }
                formRef.current?.reset();
                setOpen(false);
                const message =
                  successLines[Math.floor(Math.random() * successLines.length)];
                toast.showSuccess(message);
              } finally {
                setIsSubmitting(false);
              }
            });
          }}
          className="grid gap-4"
        >
          {warning && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
              {warning}
            </div>
          )}

          <div className="grid gap-4">
            <label className={labelClass}>
              Title
              <input name="title" required className={fieldClass} />
            </label>

            {isVenue && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  {isConference ? "ISBN" : "ISSN"}
                  <input
                    name="identifier"
                    required
                    className={fieldClass}
                    placeholder={
                      isConference ? "Conference ISBN" : "Journal ISSN"
                    }
                  />
                </label>
                <label className={labelClass}>
                  {isConference ? "Organizer" : "Publisher"}
                  <input name="organization" className={fieldClass} />
                </label>
                {isConference && (
                  <>
                    <label className={labelClass}>
                      Type
                      <ResearchFormSelect
                        name="venueType"
                        defaultValue="INTERNATIONAL"
                        ariaLabel="Conference type"
                        options={[
                          { value: "INTERNATIONAL", label: "International" },
                          { value: "NATIONAL", label: "National" },
                        ]}
                      />
                    </label>
                    <label className={labelClass}>
                      Location
                      <span className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          name="location"
                          className={`${fieldClass} w-full pl-9`}
                        />
                      </span>
                    </label>
                  </>
                )}
                <label className={`${labelClass} md:col-span-2`}>
                  Website
                  <input
                    name="website"
                    type="url"
                    className={fieldClass}
                    placeholder="https://"
                  />
                </label>
              </div>
            )}

            <label className={labelClass}>
              Proposal description
              <textarea
                name="description"
                required
                className={areaClass}
                placeholder={
                  isProject
                    ? "Describe the project purpose, expected outputs, team, timeline, or funding context..."
                    : isConference
                      ? "Describe the conference scope, important dates, theme, submission fee, or why it should be added..."
                      : isJournal
                        ? "Describe the journal scope, field, rank, fees, or why it should be added..."
                        : "Describe the research question, data, methods, target outputs, or support you need..."
                }
              />
            </label>

            <label className={labelClass}>
              Support file
              <ResearchFileUpload
                name="supportFile"
                accept=".doc,.docx,.pdf"
                label="Choose support file"
                helper="Optional. Max 2 MB. Accepted formats: .doc, .docx, .pdf."
              />
            </label>

            <label className={labelClass}>
              Contact information
              <input
                name="contactInfo"
                className={fieldClass}
                placeholder="Email, phone number, or the best way to reach you"
              />
            </label>

            <label className={labelClass}>
              Notes
              <textarea
                name="notes"
                className={areaClass}
                placeholder="Anything else I should know before I contact you"
              />
            </label>
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
