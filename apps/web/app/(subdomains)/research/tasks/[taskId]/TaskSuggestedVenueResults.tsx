"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Loader2, Plus, SearchCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { addTaskSuggestedVenue } from "../../actions";

export type TaskSuggestedVenueResult = {
  id: string;
  kind: "journal" | "conference";
  journalId: string | null;
  name: string;
  status: string;
  meta: string;
  apc: string | null;
  apcCurrency: string;
  submissionFee: string | null;
  submissionFeeCurrency: string;
  useRawFeeText?: boolean;
  journalNote: string | null;
  venueNote: string | null;
  declineReason: string | null;
  venueLink: string | null;
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

export function TaskSuggestedVenueResults({
  taskId,
  targetCount,
  venues,
  canCreate,
}: {
  taskId: string;
  targetCount: number;
  venues: TaskSuggestedVenueResult[];
  canCreate: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [venueKind, setVenueKind] = useState<"journal" | "conference">(
    "journal",
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  const activeVenueCount = useMemo(
    () => venues.filter((venue) => venue.status !== "DECLINED").length,
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

      <ResearchModal
        open={dialogOpen}
        title="Add suggested venue"
        onClose={() => setDialogOpen(false)}
      >
        <form
          className="grid gap-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await addTaskSuggestedVenue(taskId, formData);
              if (result?.ok === false) {
                toast.showError({
                  title: "Venue was not added",
                  detail: result.message,
                });
                return;
              }
              toast.showSuccess({
                title: "Venue submitted",
                detail: "The suggestion is ready for checker review.",
              });
              setDialogOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="venueKind" value={venueKind} />
          <div className="grid grid-cols-2 border border-[#D8D0C2] dark:border-[#444444]">
            {(["journal", "conference"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setVenueKind(kind)}
                className={`px-3 py-2 text-sm capitalize transition ${
                  venueKind === kind
                    ? "bg-[#1F7180] text-white dark:bg-[#A8DADC] dark:text-[#101818]"
                    : "text-[#667085] hover:bg-[#F8F3EA] dark:text-[#B0B0B0] dark:hover:bg-[#303030]"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>
          <input
            name="venueName"
            className={researchFieldClass}
            placeholder="Venue name"
          />
          <input
            name="venueLink"
            className={researchFieldClass}
            placeholder="Venue link"
          />
          {venueKind === "journal" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="apc"
                className={researchFieldClass}
                placeholder="APC"
              />
              <input
                name="submissionFee"
                className={researchFieldClass}
                placeholder="Submission fee"
              />
            </div>
          ) : null}
          <textarea
            name="note"
            className={`${researchFieldClass} min-h-28 resize-y`}
            placeholder="Note"
          />
          <div className="flex justify-end gap-2">
            <ResearchButton
              type="button"
              tone="secondary"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </ResearchButton>
            <ResearchButton type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SearchCheck className="h-4 w-4" />
              )}
              Submit venue
            </ResearchButton>
          </div>
        </form>
      </ResearchModal>
    </section>
  );
}

function SuggestedVenueCard({ venue }: { venue: TaskSuggestedVenueResult }) {
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
        <span
          className={`flex-none border px-2 py-1 text-[10px] uppercase ${statusClass(
            venue.status,
          )}`}
        >
          {venue.status.replaceAll("_", " ")}
        </span>
      </div>
      {venue.meta ? (
        <p className="mt-2 break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          {venue.meta}
        </p>
      ) : null}
      <div className="mt-3 grid gap-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
        <span>APC: {moneyText(venue.apc, venue.apcCurrency)}</span>
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
      {venue.journalNote ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          Venue record note: {venue.journalNote}
        </p>
      ) : null}
      {venue.venueNote ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          Suggestion note: {venue.venueNote}
        </p>
      ) : null}
      {venue.declineReason ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-rose-700 dark:text-rose-300">
          Decline reason: {venue.declineReason}
        </p>
      ) : null}
    </article>
  );
}
