import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { displayResearchPersonName } from "@/sites/research/lib/display";
import { createTaskGuide, deleteTaskGuide, updateTaskGuide } from "./actions";
import { TaskGuideDialog } from "./TaskGuideDialog";
import { TaskGuidesTable, type TaskGuideRow } from "./TaskGuidesTable";

export const dynamic = "force-dynamic";

function fileSizeLabel(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TaskGuidesPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");
  const guides = await prisma.taskGuide.findMany({
    select: {
      id: true,
      guideCode: true,
      title: true,
      content: true,
      importantNote: true,
      supportFileName: true,
      supportFileSize: true,
      updatedAt: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { guideCode: "asc" }],
  });
  const rows: TaskGuideRow[] = guides.map((guide) => ({
    id: guide.id,
    guideCode: guide.guideCode,
    title: guide.title,
    content: guide.content,
    importantNote: guide.importantNote ?? "",
    supportFileName: guide.supportFileName ?? "",
    supportFileSize: fileSizeLabel(guide.supportFileSize),
    updatedAt: researchDateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(guide.updatedAt),
    createdBy: guide.createdBy
      ? displayResearchPersonName(guide.createdBy)
      : "Unknown user",
  }));
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full items-center justify-between gap-4">
          <p className="text-sm font-normal uppercase text-slate-700 dark:text-[#E4E4E4]">
            Task Guide List
          </p>
          <TaskGuideDialog mode="create" action={createTaskGuide} />
        </div>
      </ResearchPageHeaderPortal>
      <TaskGuidesTable
        rows={rows}
        updateAction={updateTaskGuide}
        deleteAction={deleteTaskGuide}
      />
    </div>
  );
}
