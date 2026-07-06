"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import { researchFieldClass } from "@/sites/research/components/ResearchPrimitives";

export function ResearchTitleField({
  defaultValue,
  notes,
}: {
  defaultValue: string;
  notes: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <label className="grid gap-1 text-sm font-semibold text-[#E4E4E4]">
        <span className="flex items-center justify-between gap-3">
          <span>Title</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="View notes"
            className="group relative inline-flex h-8 w-8 items-center justify-center border border-[#444444] bg-[#2C2C2C] text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            aria-label="View notes"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-52 translate-y-1 border border-[#444444] bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 opacity-0 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800 dark:shadow-black/30">
              View notes
            </span>
          </button>
        </span>
        <input
          name="title"
          defaultValue={defaultValue}
          className={researchFieldClass}
        />
      </label>

      {open && (
        <div
          data-research-modal-overlay="true"
          className="fixed inset-0 z-[1000] flex overflow-y-auto animate-[modalOverlayIn_140ms_ease-out] items-center justify-center bg-slate-950/62 px-4 py-8"
        >
          <div className="w-full max-w-2xl animate-[modalPanelIn_160ms_ease-out] overflow-hidden border border-[#444444] bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-[#E4E4E4]">Notes</h2>
                <p className="mt-1 text-sm text-[#B0B0B0]">
                  Read-only preview from this research record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-none p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close notes preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              <div className="border border-[#444444] bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                {notes.trim().length > 0 ? (
                  <p className="whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-[#777777]">
                    No notes have been added yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
