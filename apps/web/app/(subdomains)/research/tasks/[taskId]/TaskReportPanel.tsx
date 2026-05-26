"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileUp, Loader2, UploadCloud } from "lucide-react";
import { uploadResearchTaskReport } from "../../actions";
import { useResearchToast } from "../../components/ResearchToast";

const maxFileSize = 2 * 1024 * 1024;
const allowedExtensions = [".doc", ".docx", ".xlsx", ".pdf"];

function fileSizeLabel(value: number | null) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskReportPanel({
  taskId,
  canUpload,
  canDownload,
  fileName,
  fileSize,
  uploadedAt,
}: {
  taskId: string;
  canUpload: boolean;
  canDownload: boolean;
  fileName: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedName, setSelectedName] = useState("");
  const { showSuccess, showError } = useResearchToast();

  function submitReport(formData: FormData) {
    const file = formData.get("reportFile");
    if (!(file instanceof File) || file.size === 0) {
      showError({
        title: "Report file required",
        detail: "Choose one report file before uploading.",
      });
      return;
    }
    const extension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      showError({
        title: "Report file rejected",
        detail: "Upload only .doc, .docx, .xlsx, or .pdf files.",
      });
      return;
    }
    if (file.size > maxFileSize) {
      showError({
        title: "Report file is too large",
        detail: "The report file must be 2 MB or smaller.",
      });
      return;
    }

    startTransition(async () => {
      const result = await uploadResearchTaskReport(taskId, formData);
      if (!result?.ok) {
        showError({
          title: result?.title ?? "Report was not uploaded",
          detail: result?.detail ?? "Please check the file and try again.",
        });
        return;
      }
      showSuccess({
        title: result.title,
        detail: result.detail,
      });
      setSelectedName("");
      formRef.current?.reset();
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            Assignee report
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            One report file, up to 2 MB. Accepted formats: DOC, DOCX, XLSX, PDF.
          </p>
        </div>
        {canDownload && fileName && (
          <a
            href={`/api/research/tasks/${taskId}/report`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/50"
          >
            <Download className="h-4 w-4" />
            Download report
          </a>
        )}
      </div>

      {fileName ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <FileUp className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {fileName}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {[fileSizeLabel(fileSize), uploadedAt ? `Uploaded ${uploadedAt}` : ""]
                .filter(Boolean)
                .join(" - ")}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          No report uploaded yet.
        </p>
      )}

      {canUpload && (
        <form ref={formRef} action={submitReport} className="mt-4 grid gap-3">
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-900/70 dark:hover:bg-blue-950/30">
            <UploadCloud className="h-4 w-4 flex-none text-blue-500" />
            <span className="min-w-0 flex-1 truncate">
              {selectedName || "Choose report file"}
            </span>
            <input
              name="reportFile"
              type="file"
              accept=".doc,.docx,.xlsx,.pdf"
              className="sr-only"
              onChange={(event) =>
                setSelectedName(event.currentTarget.files?.[0]?.name ?? "")
              }
            />
          </label>
          <button
            disabled={isPending}
            className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {isPending ? "Uploading..." : "Upload report"}
          </button>
        </form>
      )}
    </section>
  );
}
