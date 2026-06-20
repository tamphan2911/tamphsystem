"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

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

export type UploadedFileKind =
  | "task-report"
  | "proposal-support"
  | "published-article";

export type UploadedFileRow = {
  id: string;
  ownerId: string;
  kind: UploadedFileKind;
  source: string;
  sourceStatus: string;
  sourceHref: string;
  sourceCode: string;
  sourceTitle: string;
  sourceMeta: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string | null;
  uploaderName: string;
  uploaderEmail: string;
  downloadHref: string;
  context: {
    type: string;
    id: string;
    code: string;
    title: string;
    href: string;
  } | null;
};

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
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function dateTime(value: string | null) {
  if (!value) return "Unknown time";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const fileKindOptions = [
  { value: "ALL", label: "All files" },
  { value: "task-report", label: "Task reports" },
  { value: "proposal-support", label: "Proposal support" },
  { value: "published-article", label: "Published articles" },
];

export function TaskReportsTable({
  rows,
  deleteAction,
}: {
  rows: UploadedFileRow[];
  deleteAction: (fileKind: UploadedFileKind, ownerId: string) => Promise<void>;
}) {
  const [query, setQuery] = usePersistentTableValue("uploaded-files:q", "");
  const [kind, setKind] = usePersistentTableValue("uploaded-files:kind", "ALL");
  const [type, setType] = usePersistentTableValue("uploaded-files:type", "ALL");
  const [deleting, setDeleting] = useState<UploadedFileRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const toast = useResearchToast();

  const fileTypeOptions = useMemo(() => {
    const extensions = Array.from(
      new Set(rows.map((row) => fileExtension(row.fileName))),
    ).sort();
    return [
      { value: "ALL", label: "All types" },
      ...extensions.map((extension) => ({
        value: extension,
        label: extension,
      })),
    ];
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const extension = fileExtension(row.fileName);
      const matchesKind = kind === "ALL" || row.kind === kind;
      const matchesType = type === "ALL" || extension === type;
      const haystack = [
        row.source,
        row.sourceStatus,
        row.sourceCode,
        row.sourceTitle,
        row.sourceMeta,
        row.fileName,
        row.fileType,
        extension,
        row.uploaderName,
        row.uploaderEmail,
        row.context?.type,
        row.context?.code,
        row.context?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesKind && matchesType && (!needle || haystack.includes(needle));
    });
  }, [kind, query, rows, type]);
  const pagination = useTablePagination(filtered, 10, 1, "uploaded-files");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateKind(value: string) {
    setKind(value);
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
      await deleteAction(deleting.kind, deleting.ownerId);
      setDeleting(null);
      toast.showSuccess({
        title: "File deleted",
        detail: `${deleting.fileName} was removed. The related record was kept.`,
      });
      router.refresh();
    } catch (error) {
      toast.showError({
        title: "File not deleted",
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
      <div className="overflow-hidden border border-[#d9d0c3] bg-[#f8f6ef] shadow-none dark:border-[#444444] dark:bg-[#2C2C2C]">
        <div className="flex flex-col gap-3 border-b border-[#d9d0c3] bg-[#f5f2ec] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4 dark:border-[#444444] dark:bg-[#2C2C2C]">
          <TableSearchInput
            value={query}
            onChange={updateQuery}
            placeholder="Search file, source, uploader, research..."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[34rem]">
            <FilterSelect
              value={kind}
              onChange={updateKind}
              ariaLabel="Filter files by source"
              options={fileKindOptions}
            />
            <FilterSelect
              value={type}
              onChange={updateType}
              ariaLabel="Filter files by type"
              options={fileTypeOptions}
            />
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <thead className="border-b border-[#d9d0c3] bg-[#e8e1d4] text-xs uppercase tracking-wide text-[#6C778D] dark:border-[#444444] dark:bg-[#383838] dark:text-[#B0B0B0]">
              <tr>
                <th className="w-[9rem] px-3 py-3">Source</th>
                <th className="px-3 py-3">File</th>
                <th className="w-[7rem] px-3 py-3 text-right">Volume</th>
                <th className="w-[15rem] px-3 py-3">Uploaded by</th>
                <th className="w-[9rem] px-3 py-3">Time</th>
                <th className="w-12 px-2 py-3 text-center">
                  <span className="sr-only">Download</span>
                </th>
                <th className="w-12 px-2 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d9d0c3] dark:divide-[#444444]">
              {pagination.pagedRows.map((row) => (
                <tr
                  key={row.id}
                  className="group align-top transition-colors duration-150 odd:bg-[#f8f6ef] even:bg-[#f2eee6] hover:bg-[#e9e2d6] dark:odd:bg-[#2C2C2C] dark:even:bg-[#303030] dark:hover:bg-[#383838]"
                >
                  <td className="px-3 py-3 align-top">
                    <span className="block text-sm text-[#243047] dark:text-[#E4E4E4]">
                      {row.source}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] uppercase tracking-wide text-[#6C778D] dark:text-[#B0B0B0]">
                      {row.sourceCode}
                    </span>
                    <span className="mt-1 block text-[11px] text-[#6C778D] dark:text-[#777777]">
                      {sentenceCase(row.sourceStatus)}
                    </span>
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <div className="flex min-w-0 items-start gap-2">
                      <FileArchive className="mt-0.5 h-4 w-4 flex-none text-[#7C5EA8] dark:text-[#B39CD0]" />
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm text-[#243047] dark:text-[#E4E4E4]"
                          title={row.fileName}
                        >
                          {row.fileName}
                        </p>
                        <Link
                          href={row.sourceHref}
                          className="research-journal-name-link mt-1 block truncate text-xs text-[#1F7180] dark:text-[#A8DADC]"
                        >
                          {row.sourceTitle}
                        </Link>
                        <p className="mt-1 line-clamp-1 text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                          {row.sourceMeta}
                        </p>
                        {row.context ? (
                          <Link
                            href={row.context.href}
                            className="research-journal-name-link mt-1 block truncate text-xs text-[#6C778D] dark:text-[#777777]"
                          >
                            {row.context.type}:{" "}
                            {row.context.code ? `${row.context.code} - ` : ""}
                            {row.context.title}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    <span className="text-sm text-[#243047] dark:text-[#E4E4E4]">
                      {fileSize(row.fileSize)}
                    </span>
                    <span className="mt-1 block text-[11px] uppercase tracking-wide text-[#6C778D] dark:text-[#B0B0B0]">
                      {fileExtension(row.fileName)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-sm text-[#243047] dark:text-[#E4E4E4]">
                      {row.uploaderName}
                    </p>
                    {row.uploaderEmail ? (
                      <p className="mt-1 break-all text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                        {row.uploaderEmail}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                    {dateTime(row.uploadedAt)}
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label="Download file">
                      <a
                        href={row.downloadHref}
                        className="research-task-icon-motion inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                        aria-label={`Download ${row.fileName}`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </IconHint>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label="Delete file">
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
                  <td
                    colSpan={7}
                    className="px-3 py-14 text-center text-sm text-[#6C778D] dark:text-[#B0B0B0]"
                  >
                    {rows.length === 0
                      ? "No uploaded files are stored on the research site yet."
                      : "No uploaded files match the current filters."}
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
        title="Delete this file?"
        description="The uploaded file and its storage metadata will be removed. The related task, proposal, or submission will remain available."
        confirmLabel={isDeleting ? "Deleting..." : "Delete file"}
        isConfirming={isDeleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      >
        {deleting ? (
          <div className="space-y-2 text-sm text-[#6C778D] dark:text-[#B0B0B0]">
            <p>
              File:{" "}
              <span className="text-[#243047] dark:text-[#E4E4E4]">
                {deleting.fileName}
              </span>
            </p>
            <p>
              Source:{" "}
              <span className="text-[#243047] dark:text-[#E4E4E4]">
                {deleting.source} - {deleting.sourceTitle}
              </span>
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
