"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  XCircle,
} from "lucide-react";
import { reviewProposal } from "../../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  IconHint,
  ResearchButton,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";

export function ProposalFeedbackButton({
  proposalId,
  proposalTitle,
  proposalType,
  disabled = false,
}: {
  proposalId: string;
  proposalTitle: string;
  proposalType: "RESEARCH" | "PROJECT" | "CONFERENCE" | "JOURNAL";
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"ACCEPTED" | "DECLINED">("ACCEPTED");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <>
      <IconHint
        label={
          disabled
            ? "This proposal already has a final decision"
            : "Send proposal feedback"
        }
        position="bottom"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="inline-flex h-5 w-5 cursor-pointer items-center justify-center border border-transparent bg-transparent text-blue-700 shadow-none outline-none transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:border-transparent hover:bg-transparent hover:text-blue-800 hover:drop-shadow-[0_0_0.45rem_rgba(31,113,128,0.24)] active:scale-95 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:drop-shadow-none dark:text-blue-300 dark:hover:text-blue-200 dark:disabled:text-slate-600"
          aria-label="Send proposal feedback"
        >
          <MessageSquareText className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Proposal feedback"
        icon={<MessageSquareText className="h-5 w-5" />}
        maxWidth="max-w-xl"
        bodyClassName="px-5 py-4 sm:px-6 sm:py-5"
        headerActions={
          <ResearchButton
            type="submit"
            form="proposal-feedback-form"
            disabled={isSaving}
            tone={decision === "ACCEPTED" ? "success" : "danger"}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Sending..." : "Send feedback"}
          </ResearchButton>
        }
      >
        <form
          id="proposal-feedback-form"
          action={async (formData) => {
            setIsSaving(true);
            try {
              const result = await reviewProposal(formData);
              setOpen(false);
              if (decision === "ACCEPTED" && result?.href) {
                router.push(result.href);
              } else {
                router.refresh();
              }
              toast.showSuccess({
                title:
                  decision === "ACCEPTED"
                    ? "Proposal accepted"
                    : "Proposal declined",
                detail:
                  "The proposer has been notified in Research Hub and by email.",
              });
            } catch (error) {
              toast.showError({
                title: "Could not send feedback",
                detail:
                  error instanceof Error
                    ? error.message
                    : "Please refresh the page and try again.",
              });
            } finally {
              setIsSaving(false);
            }
          }}
          className="space-y-5"
        >
          <input type="hidden" name="proposalId" value={proposalId} />
          <input type="hidden" name="status" value={decision} />

          <p className="text-sm font-semibold text-slate-900 dark:text-[#E4E4E4]">
            {proposalTitle}
          </p>
          <div
            data-research-toggle-tabs="true"
            className="grid grid-cols-2 gap-2 border border-slate-200 bg-slate-50 p-1 dark:border-[#444444] dark:bg-[#202020]"
          >
            <button
              type="button"
              onClick={() => setDecision("ACCEPTED")}
              data-research-toggle-tab="true"
              data-active={decision === "ACCEPTED"}
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border px-3 py-2 text-sm font-normal transition ${
                decision === "ACCEPTED"
                  ? "border-[#A8E6CF] bg-[#A8E6CF] text-[#173B2F] shadow-sm"
                  : "border-transparent text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:text-[#B0B0B0] dark:hover:border-[#A8E6CF]/60 dark:hover:bg-[#24342F] dark:hover:text-[#A8E6CF]"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </button>
            <button
              type="button"
              onClick={() => setDecision("DECLINED")}
              data-research-toggle-tab="true"
              data-active={decision === "DECLINED"}
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border px-3 py-2 text-sm font-normal transition ${
                decision === "DECLINED"
                  ? "border-[#FFC1CC] bg-[#FFC1CC] text-[#4A1F28] shadow-sm"
                  : "border-transparent text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 dark:text-[#B0B0B0] dark:hover:border-[#FFC1CC]/60 dark:hover:bg-[#3A272D] dark:hover:text-[#FFC1CC]"
              }`}
            >
              <XCircle className="h-4 w-4" />
              Decline
            </button>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-900 dark:text-[#E4E4E4]">
            <span>
              Note to proposer
              <span className="research-required-mark">(*)</span>
            </span>
            <textarea
              name="comment"
              required
              className={`${researchTextareaClass} min-h-32`}
              placeholder={
                decision === "ACCEPTED"
                  ? "Example: Approved. Thank you for the complete venue information; it is now available for the research team."
                  : "Example: Declined because this venue is already listed, or because required information is missing."
              }
            />
          </label>
          {decision === "ACCEPTED" ? (
            <div className="border-t border-slate-200 pt-4 dark:border-[#444444]">
              <p className="text-xs font-normal uppercase tracking-wide text-slate-500 dark:text-[#B0B0B0]">
                Will be created after confirm
              </p>
              <div className="mt-2 border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:border-[#444444] dark:bg-[#242424] dark:text-[#B0B0B0]">
                <p className="text-sm font-normal text-slate-900 dark:text-[#E4E4E4]">
                  {proposalType === "PROJECT"
                    ? "Project record"
                    : proposalType === "RESEARCH"
                      ? "Research record"
                      : proposalType === "CONFERENCE"
                        ? "Conference venue record"
                        : "Journal venue record"}
                  : {proposalTitle}
                </p>
                <p className="mt-1">
                  Source: accepted proposal
                  <span className="px-2 text-slate-400 dark:text-[#777777]">
                    |
                  </span>
                  Status will be initialized from the proposal workflow
                </p>
                <p>
                  The new record will be linked back to this proposal for
                  tracking.
                </p>
              </div>
            </div>
          ) : null}
        </form>
      </ResearchModal>
    </>
  );
}
