"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileArchive, Trash2 } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  usePersistentTableValue,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type TaskReportRow = {
  taskId: string;
  taskCode: string;
  taskTitle: string;
  taskType: string;
  taskStatus: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string | null;
  uploaderName: string;
  uploaderEmail: string;
  assignerName: string;
  assignerEmail: string;
  research: { id: string; code: string; title: string } | null;
  project: { id: string; code: string; title: string } | null;
};

function displayTaskId(row: TaskReportRow) {
  return row.taskCode || row.taskId.replaceAll("-", "").slice(0, 10).toUpperCase();
}

function sentenceCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function fileExtension(fileName: string) {
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName ? extension.toUpperCase() : "FILE";
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dateTime(value: string | null) {
  if (!value) return "Unknown time";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TaskReportsTable({
  rows,
  deleteAction,
}: {
  rows: TaskReportRow[];
  deleteAction: (taskId: string) => Promise<void>;
}) {
  const [query, setQuery] = usePersistentTableValue("task-reports:q", "");
  const [type, setType] = usePersistentTableValue("task-reports:type", "ALL");
  const [deleting, setDeleting] = useState<TaskReportRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const toast = useResearchToast();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const extension = fileExtension(row.fileName);
      const matchesType = type === "ALL" || extension === type;
      const haystack = [
        displayTaskId(row),
        row.taskTitle,
        row.taskType,
        row.taskStatus,
        row.fileName,
        row.fileType,
        row.uploaderName,
        row.uploaderEmail,
        row.assignerName,
        row.assignerEmail,
        row.research?.code,
        row.research?.title,
        row.project?.code,
        row.project?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [query, rows, type]);
  const pagination = useTablePagination(filtered, 10, 1, "task-reports");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateType(value: string) {
    setType(value);
    pagination.setPage(1);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await deleteAction(deleting.taskId);
      setDeleting(null);
      toast.showSuccess({
        title: "Report file deleted",
        detail: `The report for task "${deleting.taskTitle}" was removed. The task was kept.`,
      });
      router.refresh();
    } catch (error) {
      toast.showError({
        title: "Report file not deleted",
        detail:
          error instanceof Error
            ? error.message
            : "The file could not be removed. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <TableSearchInput
            value={query}
            onChange={updateQuery}
            placeholder="Search file, task, uploader, research..."
          />
          <FilterSelect
            value={type}
            onChange={updateType}
            ariaLabel="Filter reports by file type"
            options={[
              { value: "ALL", label: "All file types" },
              { value: "PDF", label: "PDF" },
              { value: "DOC", label: "DOC" },
              { value: "DOCX", label: "DOCX" },
              { value: "XLSX", label: "XLSX" },
            ]}
          />
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
              <tr>
                <th className="w-[7rem] px-3 py-3">Task ID</th>
                <th className="px-3 py-3">Task</th>
                <th className="w-[18rem] px-3 py-3">File</th>
                <th className="w-[13rem] px-3 py-3">Uploaded by</th>
                <th className="w-12 px-2 py-3 text-center">
                  <span className="sr-only">Download</span>
                </th>
                <th className="w-12 px-2 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#444444]">
              {pagination.pagedRows.map((row) => (
                <tr
                  key={row.taskId}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-3 py-3 align-top">
                    <span className="font-mono text-xs uppercase tracking-wide text-[#B0B0B0]">
                      {displayTaskId(row)}
                    </span>
                    <p className="mt-1 text-[11px] text-[#777777]">
                      {sentenceCase(row.taskStatus)}
                    </p>
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <Link
                      href={`/tasks/${row.taskId}`}
                      className="research-journal-name-link text-sm font-normal text-[#1F7180] dark:text-[#A8DADC]"
                    >
                      {row.taskTitle}
                    </Link>
                    <p className="mt-1 text-xs text-[#B0B0B0]">
                      {sentenceCase(row.taskType)} · Assigned by {row.assignerName}
                    </p>
                    {row.research ? (
                      <p className="mt-1 line-clamp-1 text-xs text-[#777777]">
                        Research: {row.research.code ? `${row.research.code} · ` : ""}
                        {row.research.title}
                      </p>
                    ) : row.project ? (
                      <p className="mt-1 line-clamp-1 text-xs text-[#777777]">
                        Project: {row.project.code ? `${row.project.code} · ` : ""}
                        {row.project.title}
                      </p>
                    ) : null}
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <div className="flex min-w-0 items-start gap-2">
                      <FileArchive className="mt-0.5 h-4 w-4 flex-none text-[#B39CD0]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#E4E4E4]" title={row.fileName}>
                          {row.fileName}
                        </p>
                        <p className="mt-1 text-xs text-[#B0B0B0]">
                          {fileExtension(row.fileName)} · {fileSize(row.fileSize)}
                        </p>
                        <p className="mt-1 text-xs text-[#777777]">
                          {dateTime(row.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-sm text-[#E4E4E4]">{row.uploaderName}</p>
                    {row.uploaderEmail ? (
                      <p className="mt-1 break-all text-xs text-[#B0B0B0]">
                        {row.uploaderEmail}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label="Download report">
                      <a
                        href={`/api/research/tasks/${row.taskId}/report`}
                        className="research-task-icon-motion inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                        aria-label={`Download ${row.fileName}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </IconHint>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label="Delete report file">
                      <button
                        type="button"
                        onClick={() => setDeleting(row)}
                        className="research-task-icon-motion inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-rose-700 shadow-none outline-none hover:bg-transparent hover:text-rose-800 hover:shadow-none focus-visible:ring-0 dark:text-rose-300 dark:hover:text-rose-200"
                        aria-label={`Delete ${row.fileName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </IconHint>
                  </td>
                </tr>
              ))}
              {pagination.total === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-14 text-center text-sm text-[#B0B0B0]">
                    {rows.length === 0
                      ? "No assignee report files have been uploaded."
                      : "No report files match the current filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
        />
      </div>

      <ResearchConfirmDialog
        open={Boolean(deleting)}
        title="Delete this report file?"
        description="The uploaded file and its upload metadata will be removed. The task itself will remain available."
        confirmLabel={isDeleting ? "Deleting..." : "Delete report"}
        isConfirming={isDeleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      >
        {deleting ? (
          <div className="space-y-2 text-sm text-[#B0B0B0]">
            <p>
              File: <span className="text-[#E4E4E4]">{deleting.fileName}</span>
            </p>
            <p>
              Task: <span className="text-[#E4E4E4]">{deleting.taskTitle}</span>
            </p>
            <p className="text-rose-700 dark:text-rose-300">
              This file cannot be restored from this page.
            </p>
          </div>
        ) : null}
      </ResearchConfirmDialog>
    </>
  );
}
