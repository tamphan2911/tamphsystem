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

export default async function TaskGuidesPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");
  const guides = await prisma.taskGuide.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: [{ updatedAt: "desc" }, { taskType: "asc" }],
  });
  const rows: TaskGuideRow[] = guides.map((guide) => ({
    id: guide.id,
    taskType: guide.taskType,
    title: guide.title,
    content: guide.content,
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
