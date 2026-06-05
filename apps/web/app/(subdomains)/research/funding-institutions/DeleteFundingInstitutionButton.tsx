"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { IconHint } from "@/sites/research/components/TableControls";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-none border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${funder.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={open}
        title="Delete this funder?"
        description={`This will remove ${funder.name} from the funder list.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete funder"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
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
      >
        <p>
          {linkedCount > 0
            ? `This funder is linked to ${linkedCount} record${linkedCount === 1 ? "" : "s"}. Those projects and research records will stay in the system, but their funder field will be cleared.`
            : "No project or research record is currently linked to this funder."}
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}
