"use client";

import { useState, useTransition } from "react";
import { BookOpen, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JournalDialogForm } from "../../journals/JournalDialogForm";
import type { PublisherPickerItem } from "@/sites/research/components/PublisherPicker";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  currencySymbol,
  formatResearchNumber,
} from "@/sites/research/lib/currency";
import { approveTaskJournal, createJournalForTaskSlot } from "../../actions";

export type TaskJournalResult = {
  id: string;
  resultPosition: number;
  name: string;
  issn: string;
  publisher: string;
  rank: string;
  fields: string[];
  country: string;
  apc: string;
  apcCurrency: string;
  submissionFee: string;
  submissionFeeCurrency: string;
  note: string;
  approvalStatus: string;
  publisherApprovalStatus?: string;
  createdBy: string;
};

export function TaskJournalResults({
  taskId,
  targetCount,
  journals,
  publishers,
  canAdd,
  canApprove,
}: {
  taskId: string;
  targetCount: number;
  journals: TaskJournalResult[];
  publishers: PublisherPickerItem[];
  canAdd: boolean;
  canApprove: boolean;
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [approvalJournal, setApprovalJournal] =
    useState<TaskJournalResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  const journalsByPosition = new Map(
    journals.map((journal) => [journal.resultPosition, journal]),
  );

  return (
    <section className="border-t border-[#D8D0C2] p-5 dark:border-[#444444]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            Journal results
          </h2>
          <p className="mt-1 text-xs text-[#667085] dark:text-[#8F8F8F]">
            {journals.length} of {targetCount} journals added
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: targetCount }, (_, position) => {
          const journal = journalsByPosition.get(position);
          return journal ? (
            <JournalResultCard
              key={position}
              journal={journal}
              canApprove={
                canApprove && journal.approvalStatus === "PENDING_APPROVAL"
              }
              onApprove={() => setApprovalJournal(journal)}
            />
          ) : (
            <EmptyJournalSlot
              key={position}
              position={position}
              canAdd={canAdd}
              onAdd={() => setActiveSlot(position)}
            />
          );
        })}
      </div>

      <JournalDialogForm
        mode="create"
        isOpen={activeSlot !== null}
        onClose={() => setActiveSlot(null)}
        submitAction={async (formData) => {
          if (activeSlot === null) return;
          const result = await createJournalForTaskSlot(
            taskId,
            activeSlot,
            formData,
          );
          router.refresh();
          return result;
        }}
        publishers={publishers}
      />

      <ResearchConfirmDialog
        open={Boolean(approvalJournal)}
        title="Approve this journal?"
        description={
          approvalJournal
            ? `${approvalJournal.name} will become available across the research site.`
            : undefined
        }
        confirmLabel={isPending ? "Approving..." : "Approve journal"}
        isConfirming={isPending}
        onCancel={() => setApprovalJournal(null)}
        onConfirm={() => {
          if (!approvalJournal) return;
          startTransition(async () => {
            try {
              await approveTaskJournal(taskId, approvalJournal.id);
              toast.showSuccess({
                title: "Journal approved",
                detail: `${approvalJournal.name} is now approved and available.`,
              });
              setApprovalJournal(null);
              router.refresh();
            } catch (error) {
              toast.showError({
                title: "Journal could not be approved",
                detail:
                  error instanceof Error
                    ? error.message
                    : "Approve the linked publisher first, then try again.",
              });
            }
          });
        }}
      />
    </section>
  );
}

function EmptyJournalSlot({
  position,
  canAdd,
  onAdd,
}: {
  position: number;
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!canAdd}
      onClick={onAdd}
      className="group grid min-h-56 grid-rows-[auto_1fr_auto] border border-dashed border-[#CFC6B8] bg-[#FBF9F4] p-4 text-left transition-[border-color,background-color,transform] duration-180 hover:-translate-y-0.5 hover:border-[#7FBFC5] hover:bg-[#F3F8F6] active:translate-y-0 active:scale-[0.99] disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:border-[#CFC6B8] disabled:hover:bg-[#FBF9F4] dark:border-[#4A4A4A] dark:bg-[#262626] dark:hover:border-[#A8DADC] dark:hover:bg-[#303838] dark:disabled:hover:border-[#4A4A4A] dark:disabled:hover:bg-[#262626]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase text-[#8C95A4] dark:text-[#777777]">
          Journal {position + 1}
        </span>
        <BookOpen className="h-4 w-4 text-[#A9B1BE] transition group-hover:text-[#1F7180] dark:text-[#666666] dark:group-hover:text-[#A8DADC]" />
      </div>
      <div className="flex flex-col justify-center gap-3 py-5">
        <span className="h-3 w-3/4 bg-[#E7E2D8] dark:bg-[#353535]" />
        <span className="h-2 w-full bg-[#EEE9E0] dark:bg-[#323232]" />
        <span className="h-2 w-5/6 bg-[#EEE9E0] dark:bg-[#323232]" />
        <span className="h-2 w-2/3 bg-[#EEE9E0] dark:bg-[#323232]" />
      </div>
      <span className="flex items-center gap-2 text-xs text-[#667085] group-hover:text-[#1F7180] dark:text-[#8F8F8F] dark:group-hover:text-[#A8DADC]">
        <Plus className="h-3.5 w-3.5" />
        {canAdd ? "Add journal" : "Waiting for assignee"}
      </span>
    </button>
  );
}

function JournalResultCard({
  journal,
  canApprove,
  onApprove,
}: {
  journal: TaskJournalResult;
  canApprove: boolean;
  onApprove: () => void;
}) {
  const approved = journal.approvalStatus === "APPROVED";
  const publisherPending =
    journal.publisherApprovalStatus === "PENDING_APPROVAL";
  return (
    <article className="relative min-h-56 border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#262626]">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex border px-2 py-1 text-[10px] uppercase ${
            approved
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200"
          }`}
        >
          {approved ? "Approved" : "Pending approval"}
        </span>
        {canApprove && !publisherPending ? (
          <IconHint label="Approve journal">
            <button
              type="button"
              onClick={onApprove}
              className="research-allow-transform inline-flex h-7 w-7 items-center justify-center border-0 bg-transparent text-emerald-600 transition-[color,transform] hover:-translate-y-0.5 hover:text-emerald-800 active:translate-y-0 active:scale-90 dark:text-emerald-300 dark:hover:text-emerald-200"
              aria-label="Approve journal"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          </IconHint>
        ) : canApprove && publisherPending ? (
          <IconHint label="Approve publisher before approving this journal">
            <span className="inline-flex h-7 w-7 items-center justify-center text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </IconHint>
        ) : null}
      </div>
      <Link
        href={`/journals/${journal.id}`}
        className="mt-3 block break-words text-sm leading-5 text-[#1F2937] transition-colors hover:text-[#1F7180] active:opacity-70 dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
      >
        {journal.name}
      </Link>
      <p className="mt-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
        {[
          journal.issn || "No ISSN",
          journal.publisher,
          journal.rank,
          journal.country,
        ]
          .filter(Boolean)
          .join(" - ")}
      </p>
      {journal.fields.length ? (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          {journal.fields.join("; ")}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-[#667085] dark:text-[#B0B0B0]">
        APC: {currencySymbol(journal.apcCurrency)}{" "}
        {formatResearchNumber(journal.apc) || "0"}
        {journal.submissionFee ? (
          <>
            {" | "}Fee: {currencySymbol(journal.submissionFeeCurrency)}{" "}
            {formatResearchNumber(journal.submissionFee)}
          </>
        ) : null}
      </p>
      {publisherPending ? (
        <p className="mt-2 border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs leading-5 text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-200">
          Publisher pending approval. Approve the publisher before approving
          this journal.
        </p>
      ) : null}
      {journal.note ? (
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          Note: {journal.note}
        </p>
      ) : null}
      <p className="mt-3 border-t border-[#E5DED2] pt-2 text-[11px] text-[#8C95A4] dark:border-[#444444] dark:text-[#777777]">
        Added by {journal.createdBy}
      </p>
    </article>
  );
}
