"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Building2, PlusCircle } from "lucide-react";
import { createOrganizedProject } from "../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import {
  ResearchButton,
  researchFieldClass,
  researchLabelClass,
  researchSearchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { currencyOptions } from "@/sites/research/lib/currency";
import type { AuthorOption } from "../projects/[id]/AuthorsPicker";
import {
  FundingInstitutionPicker,
  ProjectMembersPicker,
  ProjectResearchPicker,
  type FundingInstitutionOption,
  type ResearchResultOption,
} from "./ProjectFormControls";

const projectTypeOptions = [
  { value: "STUDENT", label: "student" },
  { value: "FACULTY", label: "faculty" },
  { value: "UNIVERSITY", label: "university" },
  { value: "VNU", label: "VNU" },
  { value: "NATIONAL", label: "national" },
] as const;

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
  const [financial, setFinancial] = useState("NONE");
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
    setFinancial("NONE");
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
      <ResearchButton type="button" onClick={() => setIsOpen(true)}>
        <PlusCircle className="h-4 w-4" />
        Add Project
      </ResearchButton>

      <ResearchModal
        open={isOpen}
        onClose={closeDialog}
        title="Add Project"
        icon={<Building2 className="h-5 w-5" />}
        maxWidth="max-w-6xl"
        headerActions={
          <ResearchButton form="new-organized-project-form">
            <PlusCircle className="h-4 w-4" />
            Add Project
          </ResearchButton>
        }
      >
        <form
          id="new-organized-project-form"
          action={createOrganizedProject}
          onSubmit={handleSubmit}
          className="grid gap-5"
        >
          <div className="grid gap-5">
            {warning && (
              <div
                ref={warningRef}
                className="flex items-start gap-2 rounded-none border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{warning}</span>
              </div>
            )}

            <section className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
                <label className={researchLabelClass}>
                  Project name
                  <input
                    name="title"
                    required
                    placeholder="Institutional project title"
                    className={researchFieldClass}
                  />
                </label>
                <label className={researchLabelClass}>
                  Project ID
                  <input
                    name="referenceCode"
                    required
                    placeholder="UEH-DTI-2026"
                    className={researchFieldClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <FundingInstitutionPicker
                  institutions={fundingInstitutions}
                  defaultInstitution={null}
                />
                <label className={researchLabelClass}>
                  Project type
                  <ResearchFormSelect
                    name="projectType"
                    defaultValue="STUDENT"
                    ariaLabel="Choose project type"
                    options={projectTypeOptions}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <label className={researchLabelClass}>
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
                <label className={researchLabelClass}>
                  Financial
                  <ResearchFormSelect
                    name="financialClaimStatus"
                    defaultValue="NONE"
                    ariaLabel="Choose financial status"
                    onValueChange={setFinancial}
                    options={[
                      { value: "NONE", label: "None" },
                      { value: "NOT_ADVANCED", label: "Not advanced" },
                      { value: "ADVANCED", label: "Advanced" },
                      { value: "SETTLED", label: "Settled" },
                      { value: "REFUND_ADVANCE", label: "Refund advance" },
                    ]}
                  />
                </label>
                <label className={researchLabelClass}>
                  Start date
                  <input
                    name="startDate"
                    type="date"
                    required
                    className={researchSearchFieldClass}
                  />
                </label>
                <label className={researchLabelClass}>
                  Duration months
                  <input
                    name="durationMonths"
                    type="number"
                    min="1"
                    required
                    placeholder="9"
                    className={researchSearchFieldClass}
                  />
                </label>
              </div>

              {financial !== "NONE" && (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
                  <label className={researchLabelClass}>
                    Funding amount
                    <input
                      name="fundingAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="20000000"
                      className={researchFieldClass}
                    />
                  </label>
                  <label className={researchLabelClass}>
                    Currency
                    <ResearchFormSelect
                      name="fundingCurrency"
                      defaultValue="VND"
                      ariaLabel="Funding currency"
                      options={currencyOptions}
                    />
                  </label>
                </div>
              )}

              <label className={researchLabelClass}>
                Required products
                <textarea
                  name="requiredProducts"
                  placeholder="One required project output per line..."
                  className={researchTextareaClass}
                />
              </label>

              <label className={researchLabelClass}>
                Description
                <textarea
                  name="description"
                  placeholder="Scope, deliverables, funding notes, or institution requirements..."
                  className={researchTextareaClass}
                />
              </label>
            </section>

            <section className="grid gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
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

            <label className={researchLabelClass}>
              Notes
              <textarea
                name="note"
                placeholder="Internal follow-up notes..."
                className={researchTextareaClass}
              />
            </label>
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
