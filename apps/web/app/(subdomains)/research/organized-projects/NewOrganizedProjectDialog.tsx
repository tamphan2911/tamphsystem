"use client";

import { useState } from "react";
import { Building2, PlusCircle, X } from "lucide-react";
import { createOrganizedProject } from "../actions";

type ResearchOption = {
  id: string;
  title: string;
  stage: string;
};

export function NewOrganizedProjectDialog({
  researchOptions,
}: {
  researchOptions: ResearchOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
      >
        <PlusCircle className="h-4 w-4" />
        New Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Add Organized Project
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Track an institutional project and connect research outputs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={createOrganizedProject}
              className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-5"
            >
              <div className="grid gap-4">
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Project title
                  <input
                    name="title"
                    required
                    placeholder="Institutional project title"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Organizer
                    <input
                      name="organizer"
                      placeholder="University or institution"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Reference code
                    <input
                      name="referenceCode"
                      placeholder="Grant, contract, or internal code"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Status
                    <select
                      name="status"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Required research
                    <input
                      name="requiredResearchCount"
                      type="number"
                      min="0"
                      placeholder="0"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Start
                      <input
                        name="startDate"
                        type="date"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      End
                      <input
                        name="endDate"
                        type="date"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                  </div>
                </div>

                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Description
                  <textarea
                    name="description"
                    placeholder="Scope, deliverables, funding notes, or organizer requirements..."
                    className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Research used as project results
                    </p>
                  </div>
                  <div className="max-h-56 overflow-y-auto p-3">
                    {researchOptions.map((research) => (
                      <label
                        key={research.id}
                        className="flex gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <input
                          name="researchProjectIds"
                          value={research.id}
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-800 dark:text-slate-100">
                            {research.title}
                          </span>
                          <span className="text-xs uppercase text-slate-400">
                            {research.stage}
                          </span>
                        </span>
                      </label>
                    ))}
                    {researchOptions.length === 0 && (
                      <p className="px-2 py-8 text-center text-sm text-slate-500">
                        No research records are available yet.
                      </p>
                    )}
                  </div>
                </div>

                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Notes
                  <textarea
                    name="note"
                    placeholder="Internal follow-up notes..."
                    className="min-h-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4" />
                  Add Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
