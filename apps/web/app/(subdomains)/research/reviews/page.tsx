import { redirect } from "next/navigation";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { deleteAcademicReview } from "../actions";
import { NewReviewDialog } from "./NewReviewDialog";
import { ReviewsTable, type ReviewRow } from "./ReviewsTable";

export const dynamic = "force-dynamic";

function dateText(value: Date | null) {
  return value ? value.toLocaleDateString() : "";
}

export default async function AcademicReviewsPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin =
    roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
  if (!userId) redirect("/login");

  const [reviews, journals] = await Promise.all([
    prisma.academicReview.findMany({
      where: isAdmin
        ? {}
        : {
            tasks: {
              some: {
                status: {
                  notIn: [
                    ResearchTaskStatus.COMPLETED,
                    ResearchTaskStatus.REVOKED,
                  ],
                },
                assignments: { some: { userId } },
              },
            },
          },
      include: { journal: true },
      orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
    }),
    prisma.journal.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
  ]);
  if (!isAdmin && reviews.length === 0) redirect("/401");

  const rows: ReviewRow[] = reviews.map((review) => ({
    id: review.id,
    journalId: review.journalId,
    journalName: review.journal.name,
    publisher: review.journal.publisher ?? "",
    manuscriptTitle: review.manuscriptTitle,
    manuscriptId: review.manuscriptId ?? "",
    status: review.status,
    recommendation: review.recommendation ?? "",
    requestedAt: dateText(review.requestedAt),
    dueDate: dateText(review.dueDate),
    completedAt: dateText(review.completedAt),
    editorName: review.editorName ?? "",
    reviewRound: review.reviewRound ?? "",
    note: review.note ?? "",
  }));

  const active = reviews.filter(
    (review) => !["SUBMITTED", "CANCELLED"].includes(review.status),
  ).length;
  const completed = reviews.filter(
    (review) => review.status === "SUBMITTED",
  ).length;
  const journalsReviewed = new Set(reviews.map((review) => review.journalId))
    .size;

  const stats = [
    {
      label: "Reviews",
      value: reviews.length,
    },
    {
      label: "Active",
      value: active,
    },
    {
      label: "Submitted",
      value: completed,
    },
    {
      label: "Journals",
      value: journalsReviewed,
    },
  ];

  const journalOptions = journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    publisher: journal.publisher ?? "",
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4] ${
                  index > 0 ? "border-l border-[#444444]" : ""
                }`}
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-none items-center">
            {isAdmin && <NewReviewDialog journals={journalOptions} />}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <ReviewsTable
        rows={rows}
        isAdmin={isAdmin}
        deleteAction={deleteAcademicReview}
      />
    </div>
  );
}
