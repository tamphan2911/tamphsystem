"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";
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
      <ResearchIconButton
        type="button"
        onClick={() => setOpen(true)}
        label={`Delete ${funder.name}`}
        tone="rose"
        className="h-5 w-5 border-0 bg-transparent shadow-none hover:border-transparent hover:bg-transparent hover:shadow-none"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

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
