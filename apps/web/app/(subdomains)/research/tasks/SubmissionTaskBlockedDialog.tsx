"use client";

import { AlertTriangle, X } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";

const submissionBlockingReasons = new Set([
  "ACTIVE_PUBLISHER_SUBMISSION_EXISTS",
  "PUBLISHER_TARGET_SLOTS_FULL",
]);

export function isSubmissionTaskBlockingReason(reason?: string | null) {
  return Boolean(reason && submissionBlockingReasons.has(reason));
}

export function defaultSubmissionTaskBlockedDetail(reason?: string | null) {
  if (reason === "PUBLISHER_TARGET_SLOTS_FULL") {
    return "This research already has 2 active target journal slots for this publisher. Choose a journal from another publisher.";
  }

  return "This research already has an active submission workflow for this publisher. Choose a journal from another publisher.";
}

export function SubmissionTaskBlockedDialog({
  open,
  detail,
  onClose,
}: {
  open: boolean;
  detail: string;
  onClose: () => void;
}) {
  return (
    <ResearchModal
      open={open}
      onClose={onClose}
      title="Submission task blocked"
      icon={<AlertTriangle className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      bodyClassName="px-4 py-4 sm:px-6 sm:py-5"
      footer={
        <div className="flex justify-end">
          <ResearchButton type="button" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </ResearchButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-[#E4E4E4]">
          <p className="font-normal text-amber-800 dark:text-amber-200">
            This submit task cannot be created because it would break the active
            publisher submission rule.
          </p>
          <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-[#B0B0B0]">
            {detail}
          </p>
        </div>
        <p className="text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          Pick another journal from a different publisher, or wait until the
          existing active submission workflow for this publisher is completed or
          revoked.
        </p>
      </div>
    </ResearchModal>
  );
}
