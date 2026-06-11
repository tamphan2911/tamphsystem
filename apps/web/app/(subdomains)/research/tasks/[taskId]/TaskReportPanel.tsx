"use client";

import { useRef, useTransition } from "react";
import { Download, FileUp, Loader2, UploadCloud } from "lucide-react";
import { uploadResearchTaskReport } from "../../actions";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { ResearchFileUpload } from "@/sites/research/components/ResearchFileUpload";

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
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
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
      formRef.current?.reset();
    });
  }

  return (
    <section className="mt-6 border border-[#444444] bg-[#242424] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#E4E4E4]">Assignee report</h2>
          <p className="mt-1 text-xs leading-5 text-[#B0B0B0]">
            One report file, up to 2 MB. Accepted formats: DOC, DOCX, XLSX, PDF.
          </p>
        </div>
        {canDownload && fileName && (
          <a
            href={`/api/research/tasks/${taskId}/report`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-none border border-sky-500/30 bg-sky-500/10 px-3 text-sm font-semibold text-sky-200 transition hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-sky-500/15 hover:shadow-md hover:shadow-black/20"
          >
            <Download className="h-4 w-4" />
            Download report
          </a>
        )}
      </div>

      {fileName ? (
        <div className="mt-4 flex items-start gap-3 border border-[#444444] bg-[#202020] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
          <FileUp className="mt-0.5 h-4 w-4 flex-none text-emerald-500" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#E4E4E4]">
              {fileName}
            </p>
            <p className="mt-0.5 text-xs text-[#B0B0B0]">
              {[
                fileSizeLabel(fileSize),
                uploadedAt ? `Uploaded ${uploadedAt}` : "",
              ]
                .filter(Boolean)
                .join(" - ")}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-none border border-dashed border-[#555555] px-3 py-4 text-sm text-[#B0B0B0]">
          No report uploaded yet.
        </p>
      )}

      {canUpload && (
        <form ref={formRef} action={submitReport} className="mt-4 grid gap-3">
          <ResearchFileUpload
            name="reportFile"
            accept=".doc,.docx,.xlsx,.pdf"
            label="Choose report file"
            helper="Accepted formats: .doc, .docx, .xlsx, .pdf. Max 2 MB."
            disabled={isPending}
          />
          <button
            disabled={isPending}
            className="inline-flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-none bg-sky-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-500 hover:shadow-md hover:shadow-black/20 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-70"
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
