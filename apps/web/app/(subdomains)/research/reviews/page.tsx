import { BookOpen, CalendarClock, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { prisma } from "@repo/db";
import { NewReviewDialog } from "./NewReviewDialog";
import { ReviewsTable, type ReviewRow } from "./ReviewsTable";

export const dynamic = "force-dynamic";

function dateText(value: Date | null) {
  return value ? value.toLocaleDateString() : "";
}

export default async function AcademicReviewsPage() {
  const [reviews, journals] = await Promise.all([
    prisma.academicReview.findMany({
      include: { journal: true },
      orderBy: [{ dueDate: "asc" }, { requestedAt: "desc" }],
    }),
    prisma.journal.findMany({
      orderBy: [{ publisher: "asc" }, { name: "asc" }],
    }),
  ]);

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
    (review) => !["SUBMITTED", "DECLINED", "CANCELLED"].includes(review.status),
  ).length;
  const completed = reviews.filter((review) => review.status === "SUBMITTED").length;
  const journalsReviewed = new Set(reviews.map((review) => review.journalId)).size;

  const stats = [
    { label: "Reviews", value: reviews.length, icon: ClipboardCheck, color: "text-emerald-600" },
    { label: "Active", value: active, icon: CalendarClock, color: "text-blue-600" },
    { label: "Submitted", value: completed, icon: CheckCircle2, color: "text-purple-600" },
    { label: "Journals", value: journalsReviewed, icon: BookOpen, color: "text-amber-600" },
  ];

  const journalOptions = journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    publisher: journal.publisher ?? "",
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div key={item.label} className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="text-base font-black text-slate-950 dark:text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <NewReviewDialog journals={journalOptions} />
      </div>

      <ReviewsTable rows={rows} />
    </div>
  );
}
