"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
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
      <IconHint label={`Delete ${funder.name}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Delete ${funder.name}`}
          className="inline-flex h-5 w-5 cursor-pointer items-start justify-center border border-transparent bg-transparent p-0 text-rose-600 shadow-none outline-none transition-[color,transform] duration-150 ease-out hover:border-transparent hover:bg-transparent hover:text-rose-700 hover:shadow-none active:scale-95 focus-visible:ring-0 dark:text-[#FFC1CC] dark:hover:text-rose-300"
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
