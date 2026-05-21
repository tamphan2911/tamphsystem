"use client";

import { useState } from "react";
import { PlusCircle, X } from "lucide-react";
import { createResearchProject } from "../actions";

export function NewResearchDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        <PlusCircle className="h-4 w-4" />
        New Research
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Add New Research</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a research record and place it in the pipeline.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form action={createResearchProject} className="grid gap-4 px-6 py-5">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Research title
                <input
                  name="title"
                  required
                  placeholder="Research title"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Stage
                  <select
                    name="stage"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="PRODUCTION">Production</option>
                    <option value="SUBMITTING">Submitting</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Claim status
                  <select
                    name="claimStatus"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="CANNOT_CLAIM">Cannot claim</option>
                    <option value="MAKING_DOCUMENT">Making document</option>
                    <option value="WAITING">Waiting response</option>
                    <option value="CLAIMED">Claimed</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Co-authors
                  <input
                    name="coAuthors"
                    placeholder="Names separated by comma"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  University registration
                  <input
                    name="universityRegistration"
                    placeholder="Q2 2026"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Abstract and working notes
                <textarea
                  name="abstract"
                  placeholder="Idea, data, model, writing, humanizing, references..."
                  className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4" />
                  Add Research
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
