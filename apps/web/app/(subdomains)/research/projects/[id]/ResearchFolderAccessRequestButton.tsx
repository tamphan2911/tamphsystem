"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Send, ShieldAlert } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { requestResearchFolderAccess } from "../../actions";

export function ResearchFolderAccessRequestButton({
  projectId,
  researchTitle,
}: {
  projectId: string;
  researchTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();

  function submitRequest() {
    startTransition(async () => {
      try {
        const result = await requestResearchFolderAccess(projectId);
        router.refresh();
        setOpen(false);
        if (result?.status === "already-requested") {
          toast.showSuccess(
            "Request already sent. Admin can review it from this research.",
          );
          return;
        }
        if (result?.status === "already-shared") {
          toast.showSuccess("This folder is already marked as shared with you.");
          return;
        }
        toast.showSuccess("Shared folder access request sent to admin.");
      } catch {
        toast.showError("Could not send the shared folder access request.");
      }
    });
  }

  return (
    <>
      <IconHint label="Request research folder access" position="bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform research-title-icon-button research-folder-link-button"
          aria-label="Request research folder access"
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
        </button>
      </IconHint>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Request shared folder access"
        icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex justify-end">
            <ResearchButton
              type="button"
              onClick={submitRequest}
              disabled={isPending}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send request
            </ResearchButton>
          </div>
        }
      >
        <div className="space-y-4 text-sm leading-6 text-slate-600 dark:text-[#B0B0B0]">
          <p>
            The Google Drive shared folder for this research is not marked as
            shared with you yet.
          </p>
          <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 dark:border-[#444444] dark:bg-[#252525] dark:text-[#E4E4E4]">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-[#B0B0B0]">
              Research
            </p>
            <p className="mt-1 break-words text-base font-normal text-slate-950 dark:text-[#E4E4E4]">
              {researchTitle}
            </p>
          </div>
          <p>
            Send a request and admin will review whether this folder should be
            shared with your Google account.
          </p>
        </div>
      </ResearchModal>
    </>
  );
}
