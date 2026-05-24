"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Building2, PlusCircle, X } from "lucide-react";
import { createOrganizedProject } from "../actions";
import { ResearchFormSelect } from "../components/ResearchFormSelect";
import type { AuthorOption } from "../projects/[id]/AuthorsPicker";
import {
  FundingInstitutionPicker,
  ProjectMembersPicker,
  ProjectResearchPicker,
  type FundingInstitutionOption,
  type ResearchResultOption,
} from "./ProjectFormControls";

export function NewOrganizedProjectDialog({
  researchOptions,
  users,
  fundingInstitutions,
}: {
  researchOptions: ResearchResultOption[];
  users: AuthorOption[];
  fundingInstitutions: FundingInstitutionOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [warning, setWarning] = useState("");
  const warningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!warning) return;
    window.setTimeout(() => {
      warningRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }, [warning]);

  function closeDialog() {
    setIsOpen(false);
    setWarning("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const referenceCode = String(formData.get("referenceCode") ?? "").trim();
    const startDate = String(formData.get("startDate") ?? "").trim();
    const durationMonths = String(formData.get("durationMonths") ?? "").trim();
    const members = formData.getAll("memberUserIds");
    const teamLead = String(formData.get("teamLeadUserId") ?? "").trim();

    if (!title) {
      event.preventDefault();
      setWarning("Project name is required.");
      return;
    }

    if (!referenceCode) {
      event.preventDefault();
      setWarning("Project ID is required. It does not need to be unique.");
      return;
    }

    if (!startDate || !durationMonths) {
      event.preventDefault();
      setWarning(
        "Start date and duration are required so the end date can be calculated.",
      );
      return;
    }

    if (members.length === 0 || !teamLead) {
      event.preventDefault();
      setWarning("Choose at least one member and set one team lead.");
      return;
    }

    setWarning("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-100/80 px-4 py-2.5 text-sm font-bold text-sky-800 shadow-sm shadow-sky-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md hover:shadow-sky-900/10 focus:outline-none focus:ring-4 focus:ring-sky-200/70 dark:border-sky-700/60 dark:bg-sky-900/35 dark:text-sky-100 dark:hover:border-sky-500/70 dark:hover:bg-sky-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-sky-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        Add Project
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    Add Project
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Track an institutional project and connect research outputs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={createOrganizedProject}
              onSubmit={handleSubmit}
              className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-5"
            >
              <div className="grid gap-5">
                {warning && (
                  <div
                    ref={warningRef}
                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <span>{warning}</span>
                  </div>
                )}

                <section className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    Basic information
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Project name
                      <input
                        name="title"
                        required
                        placeholder="Institutional project title"
                        className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Project ID
                      <input
                        name="referenceCode"
                        required
                        placeholder="UEH-DTI-2026"
                        className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                  </div>

                  <FundingInstitutionPicker
                    institutions={fundingInstitutions}
                    defaultInstitution={null}
                  />

                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Status
                      <ResearchFormSelect
                        name="status"
                        defaultValue="PLANNED"
                        ariaLabel="Choose project status"
                        options={[
                          { value: "PLANNED", label: "Planned" },
                          { value: "ACTIVE", label: "Active" },
                          { value: "COMPLETED", label: "Completed" },
                        ]}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Financial claim
                      <ResearchFormSelect
                        name="financialClaimStatus"
                        defaultValue="NOT_ADVANCED"
                        ariaLabel="Choose financial claim status"
                        options={[
                          { value: "NOT_ADVANCED", label: "Not advanced" },
                          { value: "ADVANCED", label: "Advanced" },
                          { value: "SETTLED", label: "Settled" },
                          { value: "REFUND_ADVANCE", label: "Refund advance" },
                        ]}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Start date
                      <input
                        name="startDate"
                        type="date"
                        required
                        className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Duration months
                      <input
                        name="durationMonths"
                        type="number"
                        min="1"
                        required
                        placeholder="9"
                        className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </label>
                  </div>

                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Required products
                    <textarea
                      name="requiredProducts"
                      placeholder="One required project output per line..."
                      className="min-h-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Description
                    <textarea
                      name="description"
                      placeholder="Scope, deliverables, funding notes, or institution requirements..."
                      className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                </section>

                <section className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    People and results
                  </h3>
                  <ProjectMembersPicker
                    users={users}
                    defaultMembers={[]}
                    onWarning={setWarning}
                  />
                  <ProjectResearchPicker
                    researchOptions={researchOptions}
                    defaultResearch={[]}
                  />
                </section>

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
                  onClick={closeDialog}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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
