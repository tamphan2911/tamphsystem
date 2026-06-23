import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { displayResearchPersonName } from "@/sites/research/lib/display";
import {
  createSuggestedReviewer,
  deleteSuggestedReviewer,
  updateSuggestedReviewer,
} from "./actions";
import { SuggestedReviewerDialog } from "./SuggestedReviewerDialog";
import {
  SuggestedReviewersTable,
  type SuggestedReviewerRow,
} from "./SuggestedReviewersTable";

export const dynamic = "force-dynamic";

export default async function SuggestedReviewersPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

  const reviewers = await prisma.suggestedReviewer.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  const rows: SuggestedReviewerRow[] = reviewers.map((reviewer) => ({
    id: reviewer.id,
    name: reviewer.name,
    email: reviewer.email,
    institution: reviewer.institution ?? "",
    bio: reviewer.bio ?? "",
    updatedAt: researchDateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(reviewer.updatedAt),
    createdBy: reviewer.createdBy
      ? displayResearchPersonName(reviewer.createdBy)
      : "Unknown user",
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full items-center justify-between gap-4">
          <p className="text-sm font-normal uppercase text-slate-700 dark:text-[#E4E4E4]">
            Suggested Reviewers
          </p>
          <SuggestedReviewerDialog
            mode="create"
            action={createSuggestedReviewer}
          />
        </div>
      </ResearchPageHeaderPortal>
      <SuggestedReviewersTable
        rows={rows}
        updateAction={updateSuggestedReviewer}
        deleteAction={deleteSuggestedReviewer}
      />
    </div>
  );
}
