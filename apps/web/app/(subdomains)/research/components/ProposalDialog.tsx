"use client";

import { useRef, useState, useTransition } from "react";
import {
  BookOpen,
  CalendarDays,
  FileUp,
  Lightbulb,
  Loader2,
  MapPin,
  Rocket,
  Send,
  X,
} from "lucide-react";
import { submitProposal } from "../actions";
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

const fieldClass =
  "h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const areaClass =
  "min-h-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
const labelClass =
  "grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200";

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
  const accentClass = isProject
    ? "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-800/70 dark:bg-violet-950/40 dark:text-violet-200"
    : isConference
      ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200"
      : isJournal
        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200";
  const iconClass = isProject
    ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"
    : isConference
      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
      : isJournal
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200";

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
      <button
        type="button"
        onClick={openDialog}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accentClass}`}
      >
        <Icon className="h-4 w-4" />
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Send {typeLabel} proposal
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Share the details, support file, and best contact channel.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
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
                      successLines[
                        Math.floor(Math.random() * successLines.length)
                      ];
                    toast.showSuccess(message);
                  } finally {
                    setIsSubmitting(false);
                  }
                });
              }}
              className="max-h-[calc(90vh-6rem)] overflow-y-auto px-6 py-5"
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
                          <select
                            name="venueType"
                            className={`${fieldClass} cursor-pointer`}
                            defaultValue="INTERNATIONAL"
                          >
                            <option value="INTERNATIONAL">International</option>
                            <option value="NATIONAL">National</option>
                          </select>
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
                  <span className="flex h-12 items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20">
                    <FileUp className="h-4 w-4" />
                    <input
                      name="supportFile"
                      type="file"
                      accept=".doc,.docx,.pdf"
                      className="min-w-0 flex-1 cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
                  </span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    Optional. Max 2 MB. Accepted formats: .doc, .docx, .pdf.
                  </span>
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

              <div className="mt-5 flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  disabled={uploadDisabled}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${accentClass}`}
                >
                  {uploadDisabled ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {uploadDisabled ? "Uploading..." : "Send proposal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
