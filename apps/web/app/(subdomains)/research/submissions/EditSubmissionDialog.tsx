"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit3 } from "lucide-react";
import { updateSubmissionDetails } from "../actions";
import type { SubmissionRow } from "../projects/[id]/SubmissionsTable";
import { ResearchDatePicker } from "@/sites/research/components/ResearchDatePicker";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { researchDateValue } from "@/sites/research/lib/date-time";

export type SubmissionEditOptions = {
  projects: Array<{ id: string; label: string }>;
  journals: Array<{
    id: string;
    label: string;
    accounts: Array<{ id: string; label: string }>;
  }>;
  conferences: Array<{ id: string; label: string }>;
};

function inputDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? researchDateValue()
    : researchDateValue(date);
}

export function EditSubmissionDialog({
  submission,
  options,
  onClose,
}: {
  submission: SubmissionRow;
  options: SubmissionEditOptions;
  onClose: () => void;
}) {
  const router = useRouter();
  const { showError, showSuccess } = useResearchToast();
  const [venueId, setVenueId] = useState(submission.venueId);
  const [accountId, setAccountId] = useState(submission.accountId ?? "");
  const [isPending, startTransition] = useTransition();
  const venueOptions =
    submission.kind === "journal" ? options.journals : options.conferences;
  const accountOptions = useMemo(
    () =>
      submission.kind === "journal"
        ? (options.journals.find((journal) => journal.id === venueId)
            ?.accounts ?? [])
        : [],
    [options.journals, submission.kind, venueId],
  );

  function changeVenue(nextVenueId: string) {
    setVenueId(nextVenueId);
    const accounts =
      options.journals.find((journal) => journal.id === nextVenueId)
        ?.accounts ?? [];
    if (!accounts.some((account) => account.id === accountId)) setAccountId("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateSubmissionDetails(formData);
        if (!result.ok) {
          showError({
            title: "Submission not updated",
            detail: result.message,
          });
          return;
        }
        showSuccess({
          title: "Submission updated",
          detail: "The submission details and related records were refreshed.",
        });
        onClose();
        router.refresh();
      } catch (error) {
        showError({
          title: "Submission not updated",
          detail:
            error instanceof Error
              ? error.message
              : "The update failed before the server returned a response.",
        });
      }
    });
  }

  return (
    <ResearchModal
      open
      onClose={onClose}
      title="Edit submission"
      description={`${submission.code} - ${submission.venueName}`}
      icon={<Edit3 className="h-5 w-5" />}
      maxWidth="max-w-3xl"
      bodyClassName="px-5 py-4"
      headerActions={
        <ResearchButton
          type="submit"
          form="edit-submission-form"
          disabled={isPending}
        >
          <Check className="h-4 w-4" />
          Save submission
        </ResearchButton>
      }
    >
      <form id="edit-submission-form" onSubmit={submit} className="grid gap-4">
        <input type="hidden" name="submissionId" value={submission.id} />
        <input type="hidden" name="submissionKind" value={submission.kind} />

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-[#B0B0B0]">
            Research <span className="research-required-mark">(*)</span>
          </span>
          <ResearchFormSelect
            name="researchProjectId"
            defaultValue={submission.projectId ?? ""}
            options={options.projects.map((project) => ({
              value: project.id,
              label: project.label,
            }))}
            ariaLabel="Associated research"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#B0B0B0]">
              {submission.kind === "journal" ? "Journal" : "Conference"}{" "}
              <span className="research-required-mark">(*)</span>
            </span>
            <ResearchFormSelect
              name="venueId"
              defaultValue={venueId}
              options={venueOptions.map((venue) => ({
                value: venue.id,
                label: venue.label,
              }))}
              ariaLabel={
                submission.kind === "journal" ? "Journal" : "Conference"
              }
              onValueChange={changeVenue}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#B0B0B0]">
              Submission date{" "}
              <span className="research-required-mark">(*)</span>
            </span>
            <ResearchDatePicker
              name="submittedAt"
              defaultValue={inputDate(submission.submittedAt)}
              required
            />
          </label>
        </div>

        {submission.kind === "journal" ? (
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#B0B0B0]">
              Submission account
            </span>
            <ResearchFormSelect
              name="accountId"
              defaultValue={accountId}
              options={[
                { value: "", label: "No account" },
                ...accountOptions.map((account) => ({
                  value: account.id,
                  label: account.label,
                })),
              ]}
              ariaLabel="Submission account"
              onValueChange={setAccountId}
            />
          </label>
        ) : (
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-[#B0B0B0]">Note</span>
            <textarea
              name="note"
              defaultValue={submission.note ?? ""}
              placeholder="Submission notes, contact details, or follow-up information"
              className={researchTextareaClass}
            />
          </label>
        )}
      </form>
    </ResearchModal>
  );
}
