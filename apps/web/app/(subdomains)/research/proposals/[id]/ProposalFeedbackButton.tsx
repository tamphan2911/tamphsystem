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
import { useResearchToast } from "../../components/ResearchToast";

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
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
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
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
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
            className="w-full max-w-xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <input type="hidden" name="proposalId" value={proposalId} />
            <input type="hidden" name="status" value={decision} />
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Proposal feedback
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                    Accept or decline this proposal and include a clear note for
                    the proposer.
                  </p>
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
            </div>

            <div className="space-y-5 px-6 py-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {proposalTitle}
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setDecision("ACCEPTED")}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition ${
                    decision === "ACCEPTED"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setDecision("DECLINED")}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition ${
                    decision === "DECLINED"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </button>
              </div>

              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Note to proposer
                <textarea
                  name="comment"
                  required
                  className="min-h-32 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder={
                    decision === "ACCEPTED"
                      ? "Example: Approved. Thank you for the complete venue information; it is now available for the research team."
                      : "Example: Declined because this venue is already listed, or because required information is missing."
                  }
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSaving}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={isSaving}
                className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                  decision === "ACCEPTED"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSaving ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
