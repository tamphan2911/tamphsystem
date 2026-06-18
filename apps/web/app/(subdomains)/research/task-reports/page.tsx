import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteResearchTaskReport } from "../actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  TaskReportsTable,
  type TaskReportRow,
} from "./TaskReportsTable";

export const dynamic = "force-dynamic";

export default async function TaskReportsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  if (!currentUser?.roles.includes(Role.ADMIN)) redirect("/401");

  const tasks = await prisma.researchTask.findMany({
    where: {
      reportFileName: { not: null },
      reportFileData: { not: null },
    },
    select: {
      id: true,
      taskCode: true,
      title: true,
      taskType: true,
      category: true,
      status: true,
      reportFileName: true,
      reportFileType: true,
      reportFileSize: true,
      reportUploadedAt: true,
      reportUploadedById: true,
      createdBy: { select: { name: true, email: true } },
      project: { select: { id: true, researchCode: true, title: true } },
      organizedProject: {
        select: { id: true, referenceCode: true, title: true },
      },
    },
    orderBy: [{ reportUploadedAt: "desc" }, { updatedAt: "desc" }],
  });

  const uploaderIds = Array.from(
    new Set(
      tasks
        .map((task) => task.reportUploadedById)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const uploaders = await prisma.user.findMany({
    where: { id: { in: uploaderIds } },
    select: { id: true, name: true, email: true },
  });
  const uploaderById = new Map(uploaders.map((user) => [user.id, user]));

  const rows: TaskReportRow[] = tasks.map((task) => {
    const uploader = task.reportUploadedById
      ? uploaderById.get(task.reportUploadedById)
      : null;
    return {
      taskId: task.id,
      taskCode: task.taskCode ?? "",
      taskTitle: task.title,
      taskType: task.taskType ?? task.category ?? "OTHER",
      taskStatus: task.status,
      fileName: task.reportFileName ?? "Report file",
      fileType: task.reportFileType ?? "",
      fileSize: task.reportFileSize ?? 0,
      uploadedAt: task.reportUploadedAt?.toISOString() ?? null,
      uploaderName: uploader?.name || uploader?.email || "Unknown user",
      uploaderEmail: uploader?.email ?? "",
      assignerName: task.createdBy.name || task.createdBy.email,
      assignerEmail: task.createdBy.email,
      research: task.project
        ? {
            id: task.project.id,
            code: task.project.researchCode ?? "",
            title: task.project.title,
          }
        : null,
      project: task.organizedProject
        ? {
            id: task.organizedProject.id,
            code: task.organizedProject.referenceCode ?? "",
            title: task.organizedProject.title,
          }
        : null,
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 grid-cols-2 border border-[#444444] bg-[#2C2C2C]">
            <div className="whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4]">
              <span className="text-[#B0B0B0]">Reports: </span>
              {rows.length}
            </div>
            <div className="whitespace-nowrap border-l border-[#444444] px-3 py-2 text-sm text-[#E4E4E4]">
              <span className="text-[#B0B0B0]">Storage: </span>
              {formatStorage(rows.reduce((total, row) => total + row.fileSize, 0))}
            </div>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <TaskReportsTable rows={rows} deleteAction={deleteResearchTaskReport} />
    </div>
  );
}

function formatStorage(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
