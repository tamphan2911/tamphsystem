"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FolderClock, XCircle } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchIconButton,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { decideResearchFolderAccessRequest } from "../../actions";

export type ResearchFolderAccessRequestRow = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  note: string;
  createdAt: string;
  decidedAt: string;
};

type Decision = "APPROVED" | "DECLINED";

export function ResearchFolderAccessRequestsDialog({
  requests,
}: {
  requests: ResearchFolderAccessRequestRow[];
}) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<{
    request: ResearchFolderAccessRequestRow;
    value: Decision;
  } | null>(null);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "PENDING").length,
    [requests],
  );

  function closeDecision() {
    if (isPending) return;
    setDecision(null);
    setNote("");
  }

  function submitDecision() {
    if (!decision) return;
    const formData = new FormData();
    formData.set("note", note);
    startTransition(async () => {
      try {
        await decideResearchFolderAccessRequest(
          decision.request.id,
          decision.value,
          formData,
        );
        router.refresh();
        toast.showSuccess(
          decision.value === "APPROVED"
            ? "Shared folder access approved."
            : "Shared folder access declined.",
        );
        setDecision(null);
        setNote("");
      } catch {
        toast.showError("Could not update this shared folder request.");
      }
    });
  }

  return (
    <>
      <IconHint
        label={`${pendingCount} shared folder access request${pendingCount === 1 ? "" : "s"}`}
        position="bottom"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform research-title-icon-button text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
          aria-label="Review shared folder access requests"
        >
          <FolderClock className="h-4 w-4" aria-hidden="true" />
        </button>
      </IconHint>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Shared folder requests"
        icon={<FolderClock className="h-5 w-5" aria-hidden="true" />}
        maxWidth="max-w-5xl"
      >
        <div className="overflow-hidden border border-slate-200 dark:border-[#444444]">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-[#444444] dark:bg-[#383838] dark:text-[#B0B0B0]">
              <tr>
                <th className="px-3 py-3">Requester</th>
                <th className="w-[13rem] px-3 py-3">Role</th>
                <th className="w-[9rem] px-3 py-3">Status</th>
                <th className="w-[8rem] px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#444444]">
              {requests.map((request) => (
                <tr key={request.id} className="align-top">
                  <td className="px-3 py-3">
                    <p className="break-words text-slate-950 dark:text-[#E4E4E4]">
                      {request.requesterName}
                    </p>
                    <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-[#B0B0B0]">
                      {request.requesterEmail}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-[#8F98A8]">
                      Requested: {request.createdAt}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-[#B0B0B0]">
                    {request.requesterRole || "Related user"}
                  </td>
                  <td className="px-3 py-3">
                    <RequestStatus status={request.status} />
                    {request.decidedAt ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-[#8F98A8]">
                        {request.decidedAt}
                      </p>
                    ) : null}
                    {request.note ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-[#B0B0B0]">
                        {request.note}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {request.status === "PENDING" ? (
                      <div className="flex items-start justify-center gap-1">
                        <ResearchIconButton
                          type="button"
                          label="Approve request"
                          tone="emerald"
                          onClick={() => {
                            setNote("");
                            setDecision({ request, value: "APPROVED" });
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </ResearchIconButton>
                        <ResearchIconButton
                          type="button"
                          label="Decline request"
                          tone="rose"
                          onClick={() => {
                            setNote("");
                            setDecision({ request, value: "DECLINED" });
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </ResearchIconButton>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-[#B0B0B0]">
                        Answered
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResearchModal>
      <ResearchConfirmDialog
        open={Boolean(decision)}
        title={
          decision?.value === "APPROVED"
            ? "Approve folder access?"
            : "Decline folder access?"
        }
        confirmLabel={decision?.value === "APPROVED" ? "Approve" : "Decline"}
        tone={decision?.value === "APPROVED" ? "info" : "danger"}
        isConfirming={isPending}
        confirmIcon={
          decision?.value === "APPROVED" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )
        }
        onCancel={closeDecision}
        onConfirm={submitDecision}
      >
        <div className="space-y-3">
          <p>
            This will notify {decision?.request.requesterName || "the user"} by
            site notification and email.
          </p>
          <label className="grid gap-1.5 text-sm font-normal text-slate-800 dark:text-[#E4E4E4]">
            Note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={researchTextareaClass}
              placeholder="Optional note for the requester"
            />
          </label>
        </div>
      </ResearchConfirmDialog>
    </>
  );
}

function RequestStatus({
  status,
}: {
  status: ResearchFolderAccessRequestRow["status"];
}) {
  if (status === "APPROVED") {
    return (
      <span className="text-sm text-emerald-700 dark:text-emerald-300">
        Approved
      </span>
    );
  }
  if (status === "DECLINED") {
    return (
      <span className="text-sm text-rose-700 dark:text-rose-300">
        Declined
      </span>
    );
  }
  return (
    <span className="text-sm text-amber-700 dark:text-amber-300">Pending</span>
  );
}
