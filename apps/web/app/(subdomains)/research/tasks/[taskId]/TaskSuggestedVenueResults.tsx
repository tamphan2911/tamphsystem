"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { addTaskSuggestedVenue } from "../../actions";
import {
  SuggestedVenueAddDialog,
  type SuggestedVenueAddConferenceOption,
  type SuggestedVenueAddJournalOption,
} from "../../SuggestedVenueAddDialog";

export type TaskSuggestedVenueResult = {
  id: string;
  kind: "journal" | "conference";
  journalId: string | null;
  conferenceId: string | null;
  isOnSite: boolean;
  name: string;
  status: string;
  meta: string;
  apc: string | null;
  apcCurrency: string;
  hasApcOption?: boolean | null;
  submissionFee: string | null;
  submissionFeeCurrency: string;
  useRawFeeText?: boolean;
  journalNote: string | null;
  venueNote: string | null;
  suggestedByName: string | null;
  suggestedByEmail: string | null;
  approvedByName: string | null;
  approvedByEmail: string | null;
  declinedByName: string | null;
  declinedByEmail: string | null;
  approvalNote: string | null;
  declineReason: string | null;
  venueLink: string | null;
  journalCreationTaskId?: string | null;
  journalCreationTaskStatus?: string | null;
  createdAt: string;
};

function statusClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-300/35 dark:bg-emerald-950/35 dark:text-emerald-200";
  }
  if (status === "DECLINED") {
    return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-300/35 dark:bg-rose-950/35 dark:text-rose-200";
  }
  return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-300/35 dark:bg-amber-950/35 dark:text-amber-200";
}

function sitePresenceClass(isOnSite: boolean) {
  if (isOnSite) {
    return "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-300/35 dark:bg-cyan-950/35 dark:text-cyan-200";
  }
  return "border-[#C9BEAD] bg-[#F3EDE3] text-[#625341] dark:border-[#555555] dark:bg-[#333333] dark:text-[#D0D0D0]";
}

function sitePresenceLabel(venue: TaskSuggestedVenueResult) {
  const label = venue.kind === "journal" ? "Journal" : "Conference";
  return venue.isOnSite ? `${label} on site already` : `${label} not on site`;
}

function moneyText(value: string | null, currency: string) {
  if (!value?.trim()) return "Not provided";
  if (/^(free|no fee|none|waived|0)$/i.test(value.trim())) return "Free";
  return `${currency} ${value}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function DecisionSeparator() {
  return (
    <span className="px-1.5 text-[#98A2B3] dark:text-[#777777]" aria-hidden>
      |
    </span>
  );
}

function personLine(name: string | null, email: string | null) {
  return (
    <span className="font-normal text-slate-900 dark:text-[#E4E4E4]">
      {name || "Unknown user"}
      <DecisionSeparator />
      {email || "Unknown email"}
    </span>
  );
}

export function TaskSuggestedVenueResults({
  taskId,
  targetCount,
  venues,
  canCreate,
  journals,
  conferences,
}: {
  taskId: string;
  targetCount: number;
  venues: TaskSuggestedVenueResult[];
  canCreate: boolean;
  journals: SuggestedVenueAddJournalOption[];
  conferences: SuggestedVenueAddConferenceOption[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();
  const toast = useResearchToast();
  const activeVenueCount = useMemo(
    () => venues.filter((venue) => venue.status !== "DECLINED").length,
    [venues],
  );
  const excludedJournalIds = useMemo(
    () =>
      venues.flatMap((venue) =>
        venue.status !== "DECLINED" &&
        venue.kind === "journal" &&
        venue.journalId
          ? [venue.journalId]
          : [],
      ),
    [venues],
  );
  const excludedConferenceIds = useMemo(
    () =>
      venues.flatMap((venue) =>
        venue.status !== "DECLINED" &&
        venue.kind === "conference" &&
        venue.conferenceId
          ? [venue.conferenceId]
          : [],
      ),
    [venues],
  );
  const emptySlotCount = Math.max(0, targetCount - activeVenueCount);

  return (
    <section className="border-t border-[#D8D0C2] p-5 dark:border-[#444444]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            Suggested venue results
          </h2>
          <p className="mt-1 text-xs text-[#667085] dark:text-[#8F8F8F]">
            {activeVenueCount} of {targetCount} active venues submitted
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {venues.map((venue) => (
          <SuggestedVenueCard key={`${venue.kind}-${venue.id}`} venue={venue} />
        ))}
        {Array.from({ length: emptySlotCount }, (_, index) => (
          <button
            key={`empty-${index}`}
            type="button"
            disabled={!canCreate}
            onClick={() => setDialogOpen(true)}
            className="research-allow-transform group min-h-52 cursor-pointer border border-dashed border-[#C9BEAD] bg-[#FFFDF8] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#1F7180] hover:bg-[#F8F3EA] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#555555] dark:bg-[#242424] dark:hover:border-[#A8DADC] dark:hover:bg-[#2B2B2B]"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1">
                <span className="block h-3 w-16 bg-[#E5DED2] dark:bg-[#3A3A3A]" />
                <span className="mt-3 block h-4 w-4/5 bg-[#D8D0C2] transition group-hover:bg-[#C9BEAD] dark:bg-[#444444] dark:group-hover:bg-[#555555]" />
              </span>
              <span className="h-6 w-20 flex-none border border-[#E5DED2] bg-[#F3EDE3] dark:border-[#444444] dark:bg-[#333333]" />
            </span>
            <span className="mt-4 block h-3 w-full bg-[#EDE6DA] dark:bg-[#333333]" />
            <span className="mt-2 block h-3 w-2/3 bg-[#EDE6DA] dark:bg-[#333333]" />
            <span className="mt-5 grid gap-2">
              <span className="block h-3 w-28 bg-[#E5DED2] dark:bg-[#3A3A3A]" />
              <span className="block h-3 w-36 bg-[#E5DED2] dark:bg-[#3A3A3A]" />
              <span className="block h-3 w-32 bg-[#E5DED2] dark:bg-[#3A3A3A]" />
            </span>
            <span className="mt-5 inline-flex items-center gap-2 text-xs text-[#1F7180] transition group-hover:text-[#155967] dark:text-[#A8DADC] dark:group-hover:text-[#C9F0F2]">
              <span className="flex h-7 w-7 items-center justify-center border border-[#D8D0C2] bg-white dark:border-[#444444] dark:bg-[#202020]">
                <Plus className="h-4 w-4" />
              </span>
              <span>Add suggested venue</span>
              <span className="text-[#667085] dark:text-[#8F8F8F]">
                Slot {activeVenueCount + index + 1}
              </span>
            </span>
          </button>
        ))}
      </div>

      <SuggestedVenueAddDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        journals={journals}
        conferences={conferences}
        excludedJournalIds={excludedJournalIds}
        excludedConferenceIds={excludedConferenceIds}
        onSubmit={(formData) => addTaskSuggestedVenue(taskId, formData)}
        onError={(result) =>
          toast.showError({
            title: "Venue was not added",
            detail: result.message ?? "Check the venue details and try again.",
          })
        }
        onSuccess={() => {
          toast.showSuccess({
            title: "Venue submitted",
            detail: "The suggestion is ready for checker review.",
          });
          router.refresh();
        }}
      />
    </section>
  );
}

function SuggestedVenueCard({ venue }: { venue: TaskSuggestedVenueResult }) {
  const waitingForJournalCreation =
    venue.kind === "journal" &&
    venue.status !== "DECLINED" &&
    venue.journalCreationTaskId &&
    venue.journalCreationTaskStatus !== "COMPLETED" &&
    venue.journalCreationTaskStatus !== "REVOKED";
  const decisionNote =
    venue.status === "APPROVED"
      ? venue.approvalNote?.trim()
      : venue.status === "DECLINED"
        ? venue.declineReason?.trim()
        : "";
  const decisionPerson =
    venue.status === "APPROVED"
      ? personLine(venue.approvedByName, venue.approvedByEmail)
      : venue.status === "DECLINED"
        ? personLine(venue.declinedByName, venue.declinedByEmail)
        : null;
  const decisionLabel =
    venue.status === "APPROVED" ? "Approved by" : "Declined by";

  return (
    <article className="min-h-52 border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#262626]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase text-[#667085] dark:text-[#8F8F8F]">
            {venue.kind}
          </p>
          {venue.kind === "journal" && venue.journalId ? (
            <Link
              href={`/journals/${venue.journalId}`}
              className="research-allow-transform mt-1 block break-words text-sm leading-5 text-[#1F2937] transition hover:-translate-y-0.5 hover:text-[#1F7180] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
            >
              {venue.name}
            </Link>
          ) : venue.venueLink ? (
            <a
              href={venue.venueLink}
              target="_blank"
              rel="noreferrer"
              className="research-allow-transform mt-1 block break-words text-sm leading-5 text-[#1F2937] transition hover:-translate-y-0.5 hover:text-[#1F7180] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
            >
              {venue.name}
            </a>
          ) : (
            <p className="mt-1 break-words text-sm leading-5 text-[#1F2937] dark:text-[#E4E4E4]">
              {venue.name}
            </p>
          )}
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <span
            className={`border px-2 py-1 text-[10px] uppercase leading-none ${sitePresenceClass(
              venue.isOnSite,
            )}`}
          >
            {sitePresenceLabel(venue)}
          </span>
          <span
            className={`border px-2 py-1 text-[10px] uppercase leading-none ${statusClass(
              venue.status,
            )}`}
          >
            {venue.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>
      {venue.meta ? (
        <p className="mt-2 break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          {venue.meta}
        </p>
      ) : null}
      <div className="mt-3 grid gap-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
        <span>
          APC: {moneyText(venue.apc, venue.apcCurrency)}
          {venue.kind === "journal" ? (
            <span className="ml-1 text-[#344054] dark:text-[#E4E4E4]">
              ({venue.hasApcOption ? "Option" : "No Option"})
            </span>
          ) : null}
        </span>
        <span>
          Fee: {moneyText(venue.submissionFee, venue.submissionFeeCurrency)}
        </span>
        <span>Suggested: {formatDate(venue.createdAt)}</span>
      </div>
      {venue.venueLink ? (
        <a
          href={venue.venueLink}
          target="_blank"
          rel="noreferrer"
          className="research-allow-transform mt-3 inline-flex items-center gap-1.5 text-xs text-[#1F7180] transition hover:-translate-y-0.5 hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
        >
          Open venue <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {waitingForJournalCreation ? (
        <Link
          href={`/tasks/${venue.journalCreationTaskId}`}
          className="research-allow-transform mt-3 inline-flex items-center gap-1.5 text-xs font-normal text-[#1F7180] transition hover:-translate-y-0.5 hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
        >
          Waiting for assignee to add journal
        </Link>
      ) : null}
      {venue.journalNote ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          Venue record note: {venue.journalNote}
        </p>
      ) : null}
      <div className="mt-3 space-y-2 border-t border-[#D8D0C2] pt-2 text-xs leading-5 text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0]">
        <p className="whitespace-normal break-words">
          Suggested by{" "}
          {personLine(venue.suggestedByName, venue.suggestedByEmail)}
        </p>
        {venue.venueNote ? (
          <p className="whitespace-pre-wrap break-words">
            <span className="font-normal text-[#344054] dark:text-[#E4E4E4]">
              Suggestion note:
            </span>{" "}
            {venue.venueNote}
          </p>
        ) : null}
        {decisionPerson || decisionNote ? (
          <div className="space-y-2 border-t border-[#D8D0C2] pt-2 dark:border-[#444444]">
            {decisionPerson ? (
              <p className="whitespace-normal break-words">
                {decisionLabel} {decisionPerson}
              </p>
            ) : null}
            {decisionNote ? (
              <p
                className={`whitespace-pre-wrap break-words ${
                  venue.status === "APPROVED"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-rose-700 dark:text-rose-300"
                }`}
              >
                <span className="font-normal">
                  {venue.status === "APPROVED"
                    ? "Approval note:"
                    : "Decline note:"}
                </span>{" "}
                {decisionNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
