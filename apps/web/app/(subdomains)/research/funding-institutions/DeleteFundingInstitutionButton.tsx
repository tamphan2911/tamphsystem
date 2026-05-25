"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { IconHint } from "../components/TableControls";
import { useResearchToast } from "../components/ResearchToast";

export type DeleteFundingInstitutionRow = {
  id: string;
  name: string;
  organizedProjects: number;
  researchProjects: number;
};

export function DeleteFundingInstitutionButton({
  funder,
  deleteAction,
}: {
  funder: DeleteFundingInstitutionRow;
  deleteAction: (funderId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const linkedCount = funder.organizedProjects + funder.researchProjects;

  return (
    <>
      <IconHint label="Delete funder">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${funder.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      {open && (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900/70 dark:bg-slate-900">
            <div className="border-b border-rose-100 bg-rose-50/80 px-6 py-5 dark:border-rose-900/60 dark:bg-rose-950/25">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-800">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                      Delete this funder?
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      This will remove {funder.name} from the funder list.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>
                {linkedCount > 0
                  ? `This funder is linked to ${linkedCount} record${linkedCount === 1 ? "" : "s"}. Those projects and research records will stay in the system, but their funder field will be cleared.`
                  : "No project or research record is currently linked to this funder."}
              </p>
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                This action cannot be undone from this screen.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isDeleting}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteAction(funder.id);
                    setOpen(false);
                    router.refresh();
                    toast.showSuccess({
                      title: "Funder deleted",
                      detail: `${funder.name} has been removed from the funder list.`,
                    });
                  } catch (error) {
                    toast.showError({
                      title: "Could not delete funder",
                      detail:
                        error instanceof Error
                          ? error.message
                          : "The funder was not removed. Please refresh the page and try again.",
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-rose-600"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete funder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
