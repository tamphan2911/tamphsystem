import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteResearchUploadedFile } from "../actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  TaskReportsTable,
  type UploadedFileRow,
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

  const [tasks, proposals, articleSubmissions] = await Promise.all([
    prisma.researchTask.findMany({
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
        updatedAt: true,
        createdBy: { select: { name: true, email: true } },
        project: { select: { id: true, researchCode: true, title: true } },
        organizedProject: {
          select: { id: true, referenceCode: true, title: true },
        },
      },
      orderBy: [{ reportUploadedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.proposal.findMany({
      where: {
        supportFileName: { not: null },
        supportFileData: { not: null },
      },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        supportFileName: true,
        supportFileType: true,
        supportFileSize: true,
        createdAt: true,
        updatedAt: true,
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.researchSubmission.findMany({
      where: {
        articleFileName: { not: null },
        articleFileData: { not: null },
      },
      select: {
        id: true,
        submissionCode: true,
        status: true,
        articleFileName: true,
        articleFileType: true,
        articleFileSize: true,
        publishedAt: true,
        updatedAt: true,
        project: { select: { id: true, researchCode: true, title: true } },
        journal: { select: { id: true, name: true, publisher: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

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

  const taskRows: UploadedFileRow[] = tasks.map((task) => {
    const uploader = task.reportUploadedById
      ? uploaderById.get(task.reportUploadedById)
      : null;
    return {
      id: `task-report:${task.id}`,
      ownerId: task.id,
      kind: "task-report",
      source: "Task report",
      sourceStatus: task.status,
      sourceHref: `/tasks/${task.id}`,
      sourceCode:
        task.taskCode ?? task.id.replaceAll("-", "").slice(0, 10).toUpperCase(),
      sourceTitle: task.title,
      sourceMeta: `${task.taskType ?? task.category ?? "OTHER"} - Assigned by ${
        task.createdBy.name || task.createdBy.email
      }`,
      fileName: task.reportFileName ?? "Report file",
      fileType: task.reportFileType ?? "",
      fileSize: task.reportFileSize ?? 0,
      uploadedAt: task.reportUploadedAt?.toISOString() ?? null,
      uploaderName: uploader?.name || uploader?.email || "Unknown user",
      uploaderEmail: uploader?.email ?? "",
      downloadHref: `/api/research/tasks/${task.id}/report`,
      context: task.project
        ? {
            type: "Research",
            id: task.project.id,
            code: task.project.researchCode ?? "",
            title: task.project.title,
            href: `/projects/${task.project.id}`,
          }
        : task.organizedProject
          ? {
              type: "Project",
              id: task.organizedProject.id,
              code: task.organizedProject.referenceCode ?? "",
              title: task.organizedProject.title,
              href: `/organized-projects/${task.organizedProject.id}`,
            }
          : null,
    };
  });
  const proposalRows: UploadedFileRow[] = proposals.map((proposal) => ({
    id: `proposal-support:${proposal.id}`,
    ownerId: proposal.id,
    kind: "proposal-support",
    source: "Proposal support",
    sourceStatus: proposal.status,
    sourceHref: `/proposals/${proposal.id}`,
    sourceCode: proposal.type,
    sourceTitle: proposal.title,
    sourceMeta: "Support file attached to proposal",
    fileName: proposal.supportFileName ?? "Support file",
    fileType: proposal.supportFileType ?? "",
    fileSize: proposal.supportFileSize ?? 0,
    uploadedAt: proposal.updatedAt.toISOString(),
    uploaderName:
      proposal.submittedBy.name || proposal.submittedBy.email || "Unknown user",
    uploaderEmail: proposal.submittedBy.email ?? "",
    downloadHref: `/api/research/proposals/${proposal.id}/file`,
    context: null,
  }));
  const articleRows: UploadedFileRow[] = articleSubmissions.map(
    (submission) => ({
      id: `published-article:${submission.id}`,
      ownerId: submission.id,
      kind: "published-article",
      source: "Published article",
      sourceStatus: submission.status,
      sourceHref: `/submissions/${submission.id}`,
      sourceCode:
        submission.submissionCode ??
        submission.id.replaceAll("-", "").slice(0, 10).toUpperCase(),
      sourceTitle: submission.articleFileName ?? "Published article",
      sourceMeta: `${submission.journal.name}${
        submission.journal.publisher ? ` - ${submission.journal.publisher}` : ""
      }`,
      fileName: submission.articleFileName ?? "Published article",
      fileType: submission.articleFileType ?? "",
      fileSize: submission.articleFileSize ?? 0,
      uploadedAt:
        submission.publishedAt?.toISOString() ?? submission.updatedAt.toISOString(),
      uploaderName: "Admin",
      uploaderEmail: "",
      downloadHref: `/api/research/submissions/${submission.id}/article`,
      context: {
        type: "Research",
        id: submission.project.id,
        code: submission.project.researchCode ?? "",
        title: submission.project.title,
        href: `/projects/${submission.project.id}`,
      },
    }),
  );
  const rows = [...taskRows, ...proposalRows, ...articleRows].sort(
    (a, b) =>
      new Date(b.uploadedAt ?? 0).getTime() -
      new Date(a.uploadedAt ?? 0).getTime(),
  );
  const usedStorage = rows.reduce((total, row) => total + row.fileSize, 0);
  const totalStorage = configuredStorageVolume();
  const remainingStorage = Math.max(totalStorage - usedStorage, 0);
  const stats = [
    { label: "Files", value: rows.length.toString() },
    { label: "Server volume", value: formatStorage(totalStorage) },
    { label: "Used", value: formatStorage(usedStorage) },
    { label: "Remaining", value: formatStorage(remainingStorage) },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#d9d0c3] bg-[#f8f5f0] sm:grid-cols-4 dark:border-[#444444] dark:bg-[#2C2C2C]">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`whitespace-nowrap px-3 py-2 text-sm text-[#243047] dark:text-[#E4E4E4] ${
                  index > 0
                    ? "border-l border-[#d9d0c3] dark:border-[#444444]"
                    : ""
                }`}
              >
                <span className="font-normal text-[#6C778D] dark:text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#243047] dark:text-[#E4E4E4]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <TaskReportsTable rows={rows} deleteAction={deleteResearchUploadedFile} />
    </div>
  );
}

function configuredStorageVolume() {
  const raw =
    process.env.RESEARCH_FILE_STORAGE_BYTES ??
    process.env.RESEARCH_STORAGE_VOLUME_BYTES;
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5 * 1024 * 1024 * 1024;
}

function formatStorage(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
