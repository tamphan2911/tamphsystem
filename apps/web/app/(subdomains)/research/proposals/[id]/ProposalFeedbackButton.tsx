"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MessageSquareText,
  X,
  XCircle,
} from "lucide-react";
import { reviewProposal } from "../../actions";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { researchTextareaClass } from "@/sites/research/components/ResearchPrimitives";

export function ProposalFeedbackButton({
  proposalId,
  proposalTitle,
  disabled = false,
}: {
  proposalId: string;
  proposalTitle: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"ACCEPTED" | "DECLINED">("ACCEPTED");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex h-5 w-5 cursor-pointer items-center justify-center border border-transparent bg-transparent text-blue-700 shadow-none outline-none transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:border-transparent hover:bg-transparent hover:text-blue-800 hover:drop-shadow-[0_0_0.45rem_rgba(31,113,128,0.24)] active:scale-95 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:drop-shadow-none dark:text-blue-300 dark:hover:text-blue-200 dark:disabled:text-slate-600"
        aria-label="Send proposal feedback"
        title={
          disabled
            ? "This proposal already has a final decision"
            : "Send proposal feedback"
        }
      >
        <MessageSquareText className="h-4 w-4" />
      </button>

      {open && (
        <div
          data-research-modal-overlay="true"
          className="fixed inset-0 z-[1010] flex overflow-y-auto animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
        >
          <form
            action={async (formData) => {
              setIsSaving(true);
              try {
                await reviewProposal(formData);
                setOpen(false);
                router.refresh();
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
            className="w-full max-w-xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden border border-[#444444] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <input type="hidden" name="proposalId" value={proposalId} />
            <input type="hidden" name="status" value={decision} />
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-normal text-[#E4E4E4]">
                    Proposal feedback
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={isSaving}
                    className={`inline-flex h-10 min-w-32 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-none border px-4 text-sm font-normal shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                      decision === "ACCEPTED"
                        ? "border-[#A8E6CF] bg-[#A8E6CF] text-[#173B2F] hover:bg-[#C7F2DF]"
                        : "border-[#FFC1CC] bg-[#FFC1CC] text-[#4A1F28] hover:bg-[#FFD8DF]"
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {isSaving ? "Sending..." : "Send feedback"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="cursor-pointer rounded-none p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <p className="text-sm font-semibold text-[#E4E4E4]">
                {proposalTitle}
              </p>
              <div
                data-research-toggle-tabs="true"
                className="grid grid-cols-2 gap-2 border border-[#444444] bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950"
              >
                <button
                  type="button"
                  onClick={() => setDecision("ACCEPTED")}
                  data-research-toggle-tab="true"
                  data-active={decision === "ACCEPTED"}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border px-3 py-2 text-sm font-normal transition ${
                    decision === "ACCEPTED"
                      ? "border-[#A8E6CF] bg-[#A8E6CF] text-[#173B2F] shadow-sm"
                      : "border-transparent text-[#B0B0B0] hover:border-[#A8E6CF]/60 hover:bg-[#24342F] hover:text-[#A8E6CF]"
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
                      : "border-transparent text-[#B0B0B0] hover:border-[#FFC1CC]/60 hover:bg-[#3A272D] hover:text-[#FFC1CC]"
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </button>
              </div>

              <label className="grid gap-1 text-sm font-semibold text-[#E4E4E4]">
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
            </div>
          </form>
        </div>
      )}
    </>
  );
}
