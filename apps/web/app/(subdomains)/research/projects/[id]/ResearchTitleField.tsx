"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";

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
      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="flex items-center justify-between gap-3">
          <span>Title</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="View notes"
            className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
            aria-label="View notes"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-52 translate-y-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 opacity-0 shadow-xl shadow-slate-900/10 ring-1 ring-slate-100 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800 dark:shadow-black/30">
              View notes
            </span>
          </button>
        </span>
        <input
          name="title"
          defaultValue={defaultValue}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>

      {open && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Notes
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Read-only preview from this research record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close notes preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                {notes.trim().length > 0 ? (
                  <p className="whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-slate-400 dark:text-slate-500">
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
