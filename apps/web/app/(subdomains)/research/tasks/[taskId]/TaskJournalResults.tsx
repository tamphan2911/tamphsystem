"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  GitBranch,
  LinkIcon,
  Loader2,
  MessageSquareWarning,
  Plus,
  SearchCheck,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JournalDialogForm } from "../../journals/JournalDialogForm";
import type { PublisherPickerItem } from "@/sites/research/components/PublisherPicker";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  IconHint,
  ResearchButton,
} from "@/sites/research/components/ResearchPrimitives";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  currencySymbol,
  formatResearchNumber,
  isFreeResearchAmount,
  normalizeResearchNumberInput,
} from "@/sites/research/lib/currency";
import {
  approvePublisher,
  approveTaskJournal,
  createJournalForTaskSlot,
  linkJournalToTaskSlot,
  requestTaskJournalCorrection,
} from "../../actions";

const journalResultPlainLinkClass =
  "research-allow-transform border-0 bg-transparent p-0 shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:border-0 hover:bg-transparent hover:shadow-none hover:[text-shadow:none] focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent active:shadow-none active:[transform:scale(0.985)]";

export type TaskJournalResult = {
  id: string;
  resultPosition: number;
  name: string;
  issn: string;
  publisher: string;
  rank: string;
  type: string;
  localRank: string;
  issuesPerYear: number | null;
  isFavorite: boolean;
  isInterest: boolean;
  publisherId: string;
  fields: string[];
  country: string;
  apc: string;
  apcCurrency: string;
  hasApcOption: boolean;
  submissionFee: string;
  submissionFeeCurrency: string;
  homepageLink: string;
  submissionLink: string;
  scimagoLink: string;
  scopusLink: string;
  note: string;
  approvalStatus: string;
  resultApprovalNote: string;
  resultApprovedAt: string;
  resultApprovedBy: string;
  resultCorrectionNote: string;
  resultCorrectionRequestedAt: string;
  resultCorrectionRequestedBy: string;
  resultCorrectionResolvedAt: string;
  publisherApprovalStatus?: string;
  createdBy: string;
};

export type LinkableTaskJournal = {
  id: string;
  name: string;
  issn: string;
  publisher: string;
  rank: string;
  fields: string[];
  country: string;
  approvalStatus: string;
};

export function TaskJournalResults({
  taskId,
  targetCount,
  journals,
  publishers,
  linkableJournals,
  duplicateJournals,
  canAdd,
  canApprove,
  canLinkExisting,
}: {
  taskId: string;
  targetCount: number;
  journals: TaskJournalResult[];
  publishers: PublisherPickerItem[];
  linkableJournals: LinkableTaskJournal[];
  duplicateJournals: { id: string; name: string; issn?: string | null }[];
  canAdd: boolean;
  canApprove: boolean;
  canLinkExisting: boolean;
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [linkSlot, setLinkSlot] = useState<number | null>(null);
  const [approvalJournal, setApprovalJournal] =
    useState<TaskJournalResult | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [publisherApprovalJournal, setPublisherApprovalJournal] =
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
              canEdit={canLinkExisting}
              onRelink={() => setLinkSlot(position)}
              onApprove={() => setApprovalJournal(journal)}
              onApprovePublisher={() => setPublisherApprovalJournal(journal)}
            />
          ) : (
            <EmptyJournalSlot
              key={position}
              position={position}
              canAdd={canAdd}
              canLinkExisting={canLinkExisting}
              onAdd={() => setActiveSlot(position)}
              onLink={() => setLinkSlot(position)}
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
        duplicateJournals={duplicateJournals}
      />

      <LinkExistingJournalDialog
        taskId={taskId}
        slot={linkSlot}
        journals={linkableJournals}
        onClose={() => setLinkSlot(null)}
      />

      <ResearchModal
        open={Boolean(approvalJournal)}
        onClose={() => {
          setApprovalJournal(null);
          setReviewNote("");
        }}
        title="Review journal result"
        maxWidth="max-w-xl"
        bodyClassName="px-5 py-4"
      >
        {approvalJournal ? (
          <div className="grid gap-4">
            <div className="border border-[#D8D0C2] bg-[#FFFDF8] px-3 py-3 dark:border-[#444444] dark:bg-[#202020]">
              <p className="text-sm font-normal text-[#243047] dark:text-[#E4E4E4]">
                {approvalJournal.name}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                {[approvalJournal.issn || "No ISSN", approvalJournal.publisher]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
            </div>
            <label className="grid gap-1.5">
              <span className="text-xs font-normal uppercase text-[#667085] dark:text-[#B0B0B0]">
                Note
              </span>
              <textarea
                rows={4}
                maxLength={2000}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Optional note for approval or correction request."
                className="min-h-28 w-full rounded-none border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-slate-300 hover:bg-slate-50 focus:border-sky-500 focus:bg-white dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:placeholder:text-[#5A5A5A] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:focus:border-[#A8DADC]"
              />
              <span className="text-xs leading-5 text-[#7C8798] dark:text-[#9CA3AF]">
                This note is included in the notification to the assignee.
              </span>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <ResearchButton
                type="button"
                tone="quiet"
                disabled={isPending}
                className="border-orange-200 bg-orange-50 text-orange-700 shadow-orange-900/5 hover:border-orange-300 hover:bg-orange-100 hover:text-orange-800 focus:ring-orange-500/15 dark:border-orange-300/35 dark:bg-orange-950/25 dark:text-orange-200 dark:hover:border-orange-300/55 dark:hover:bg-orange-900/35 dark:hover:text-orange-100 dark:focus:ring-orange-500/20"
                onClick={() => {
                  const formData = new FormData();
                  formData.set("note", reviewNote);
                  startTransition(async () => {
                    try {
                      await requestTaskJournalCorrection(
                        taskId,
                        approvalJournal.id,
                        formData,
                      );
                      toast.showSuccess({
                        title: "Correction requested",
                        detail: `${approvalJournal.name} was sent back for correction.`,
                      });
                      setApprovalJournal(null);
                      setReviewNote("");
                      router.refresh();
                    } catch (error) {
                      toast.showError({
                        title: "Correction could not be requested",
                        detail:
                          error instanceof Error
                            ? error.message
                            : "Please refresh and try again.",
                      });
                    }
                  });
                }}
              >
                <MessageSquareWarning className="h-4 w-4" aria-hidden />
                {isPending ? "Sending..." : "Ask for correction"}
              </ResearchButton>
              <ResearchButton
                type="button"
                tone="success"
                disabled={isPending}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("note", reviewNote);
                  startTransition(async () => {
                    try {
                      await approveTaskJournal(
                        taskId,
                        approvalJournal.id,
                        formData,
                      );
                      toast.showSuccess({
                        title: "Journal approved",
                        detail: `${approvalJournal.name} is now approved and available.`,
                      });
                      setApprovalJournal(null);
                      setReviewNote("");
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
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {isPending ? "Approving..." : "Approve"}
              </ResearchButton>
            </div>
          </div>
        ) : null}
      </ResearchModal>

      <ResearchConfirmDialog
        open={Boolean(publisherApprovalJournal)}
        title="Approve this publisher?"
        description={
          publisherApprovalJournal
            ? `${publisherApprovalJournal.publisher || "This publisher"} will be approved so ${publisherApprovalJournal.name} can be approved next.`
            : undefined
        }
        confirmLabel={isPending ? "Approving..." : "Approve publisher"}
        isConfirming={isPending}
        onCancel={() => setPublisherApprovalJournal(null)}
        onConfirm={() => {
          if (!publisherApprovalJournal?.publisherId) return;
          startTransition(async () => {
            try {
              await approvePublisher(publisherApprovalJournal.publisherId);
              toast.showSuccess({
                title: "Publisher approved",
                detail: `${publisherApprovalJournal.publisher || "Publisher"} is now approved.`,
              });
              setPublisherApprovalJournal(null);
              router.refresh();
            } catch (error) {
              toast.showError({
                title: "Publisher could not be approved",
                detail:
                  error instanceof Error
                    ? error.message
                    : "Please refresh and try again.",
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
  canLinkExisting,
  onAdd,
  onLink,
}: {
  position: number;
  canAdd: boolean;
  canLinkExisting: boolean;
  onAdd: () => void;
  onLink: () => void;
}) {
  const canOpenSlot = canLinkExisting || canAdd;
  const openSlot = () => {
    if (canLinkExisting) {
      onLink();
      return;
    }
    if (canAdd) onAdd();
  };

  return (
    <article
      className={`group relative min-h-56 border border-dashed border-[#CFC6B8] bg-[#FBF9F4] p-4 text-left transition-[border-color,background-color,transform] duration-180 hover:-translate-y-0.5 hover:border-[#7FBFC5] hover:bg-[#F3F8F6] dark:border-[#4A4A4A] dark:bg-[#262626] dark:hover:border-[#A8DADC] dark:hover:bg-[#303838] ${
        canOpenSlot ? "cursor-pointer" : ""
      }`}
      role={canOpenSlot ? "button" : undefined}
      tabIndex={canOpenSlot ? 0 : undefined}
      onClick={canOpenSlot ? openSlot : undefined}
      onKeyDown={
        canOpenSlot
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openSlot();
              }
            }
          : undefined
      }
      aria-label={
        canLinkExisting
          ? `Link existing journal to journal ${position + 1}`
          : canAdd
            ? `Add journal ${position + 1}`
            : undefined
      }
    >
      {canLinkExisting ? (
        <IconHint label="Link existing journal to this slot">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onLink();
            }}
            className="research-allow-transform absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent text-cyan-700 opacity-0 outline-none transition-[color,opacity,transform] duration-180 hover:-translate-y-0.5 hover:bg-transparent hover:text-cyan-800 group-hover:opacity-100 focus-visible:opacity-100 active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-100"
            aria-label="Link existing journal to this slot"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </IconHint>
      ) : null}
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
        {canAdd ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAdd();
            }}
            className="cursor-pointer border-0 bg-transparent p-0 text-left text-inherit outline-none transition-colors hover:text-[#1F7180] focus-visible:text-[#1F7180] dark:hover:text-[#A8DADC] dark:focus-visible:text-[#A8DADC]"
          >
            Add journal
          </button>
        ) : canLinkExisting ? (
          "Ready for admin link"
        ) : (
          "Waiting for assignee"
        )}
      </span>
    </article>
  );
}

function LinkExistingJournalDialog({
  taskId,
  slot,
  journals,
  onClose,
}: {
  taskId: string;
  slot: number | null;
  journals: LinkableTaskJournal[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedJournal, setSelectedJournal] =
    useState<LinkableTaskJournal | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  const filteredJournals = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return journals.slice(0, 8);
    return journals
      .filter((journal) =>
        [
          journal.name,
          journal.issn,
          journal.publisher,
          journal.rank,
          journal.country,
          ...journal.fields,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [journals, query]);
  const options = useMemo<ResearchSearchPickerOption<LinkableTaskJournal>[]>(
    () =>
      filteredJournals.map((journal) => ({
        id: journal.id,
        label: journal.name,
        description: [
          journal.issn || "No ISSN",
          journal.publisher,
          journal.rank,
          journal.country,
        ]
          .filter(Boolean)
          .join(" | "),
        data: journal,
      })),
    [filteredJournals],
  );
  const open = slot !== null;
  const closeDialog = () => {
    setSelectedJournal(null);
    setQuery("");
    onClose();
  };

  return (
    <ResearchModal
      open={open}
      onClose={closeDialog}
      title="Link journal result"
      icon={<SearchCheck className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      headerActions={
        <ResearchButton
          type="button"
          disabled={isPending || !selectedJournal || slot === null}
          onClick={() => {
            if (!selectedJournal || slot === null) return;
            startTransition(async () => {
              try {
                const result = await linkJournalToTaskSlot(
                  taskId,
                  slot,
                  selectedJournal.id,
                );
                toast.showSuccess({
                  title: "Journal linked",
                  detail: `${result.journalName} is now linked to journal ${slot + 1}.`,
                });
                closeDialog();
                router.refresh();
              } catch (error) {
                toast.showError({
                  title: "Journal could not be linked",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "Choose another journal and try again.",
                });
              }
            });
          }}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
          Link journal
        </ResearchButton>
      }
    >
      <div className="grid gap-5">
        <ResearchSearchPicker
          label="Journal"
          required
          selected={
            selectedJournal
              ? {
                  id: selectedJournal.id,
                  label: selectedJournal.name,
                  description: [
                    selectedJournal.issn || "No ISSN",
                    selectedJournal.publisher,
                    selectedJournal.rank,
                  ]
                    .filter(Boolean)
                    .join(" | "),
                  data: selectedJournal,
                }
              : null
          }
          query={query}
          onQueryChange={(nextQuery) => {
            setQuery(nextQuery);
            setSelectedJournal(null);
          }}
          onSelect={(option) => {
            setSelectedJournal(option.data ?? null);
            setQuery("");
          }}
          onClear={() => {
            setSelectedJournal(null);
            setQuery("");
          }}
          options={options}
          placeholder="Search journal by name, ISSN, publisher, rank, or field..."
          emptyText="No journal on the site matches this search."
        />
        {selectedJournal ? (
          <section className="border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#262626]">
            <p className="break-words text-sm font-normal leading-5 text-[#1F2937] dark:text-[#E4E4E4]">
              {selectedJournal.name}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
              {[
                selectedJournal.issn || "No ISSN",
                selectedJournal.publisher,
                selectedJournal.rank,
                selectedJournal.country,
              ]
                .filter(Boolean)
                .join(" | ")}
            </p>
            {selectedJournal.fields.length ? (
              <p className="mt-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                {selectedJournal.fields.join("; ")}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </ResearchModal>
  );
}

function JournalResultCard({
  journal,
  canEdit,
  canApprove,
  onRelink,
  onApprove,
  onApprovePublisher,
}: {
  journal: TaskJournalResult;
  canEdit: boolean;
  canApprove: boolean;
  onRelink: () => void;
  onApprove: () => void;
  onApprovePublisher: () => void;
}) {
  const approved = journal.approvalStatus === "APPROVED";
  const publisherPending =
    journal.publisherApprovalStatus === "PENDING_APPROVAL";
  const correctionRequested =
    !approved &&
    Boolean(journal.resultCorrectionRequestedAt) &&
    !journal.resultCorrectionResolvedAt;
  const correctionUpdated =
    !approved &&
    Boolean(journal.resultCorrectionRequestedAt) &&
    Boolean(journal.resultCorrectionResolvedAt);
  const apc = journalMoneyMeta(journal.apc, journal.apcCurrency, "apc");
  const fee = journalMoneyMeta(
    journal.submissionFee,
    journal.submissionFeeCurrency,
    "fee",
  );
  const showApcOption = !apc.isFree;
  const metaItems = [
    journal.issn || "No ISSN",
    journal.publisher,
    journal.rank,
    journal.country,
  ].filter(Boolean);
  const addedByParts = journal.createdBy
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const correctionRequestLabel = approved
    ? "Correction request"
    : correctionRequested
      ? "Correction requested"
      : "Correction updated";

  return (
    <article
      id={`task-journal-result-${journal.id}`}
      className="relative min-h-56 scroll-mt-28 border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#262626]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex border px-2 py-1 text-[10px] uppercase ${
            approved
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-200"
              : correctionRequested
                ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-300/35 dark:bg-orange-950/30 dark:text-orange-200"
                : correctionUpdated
                  ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/35 dark:bg-sky-950/30 dark:text-sky-200"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200"
          }`}
        >
          {approved
            ? "Approved"
            : correctionRequested
              ? "Correction requested"
              : correctionUpdated
                ? "Correction updated"
                : "Pending approval"}
        </span>
        <div className="flex flex-none items-center gap-1">
          {canEdit ? (
            <IconHint label="Choose a different linked journal">
              <button
                type="button"
                onClick={onRelink}
                className="research-allow-transform inline-flex h-7 w-7 items-center justify-center border-0 bg-transparent text-violet-600 transition-[color,transform] hover:-translate-y-0.5 hover:text-violet-800 active:translate-y-0 active:scale-90 dark:text-violet-300 dark:hover:text-violet-200"
                aria-label="Choose a different linked journal"
              >
                <GitBranch className="h-4 w-4" />
              </button>
            </IconHint>
          ) : null}
          {canApprove && !publisherPending ? (
            <IconHint label="Review journal result: approve or ask for correction">
              <button
                type="button"
                onClick={onApprove}
                className="research-allow-transform inline-flex h-7 w-7 items-center justify-center border-0 bg-transparent text-sky-700 transition-[color,filter,transform] hover:-translate-y-0.5 hover:text-sky-800 hover:drop-shadow-[0_0_0.45rem_rgba(31,113,128,0.22)] active:translate-y-0 active:scale-90 dark:text-[#A8DADC] dark:hover:text-cyan-100 dark:hover:drop-shadow-[0_0_0.55rem_rgba(168,218,220,0.28)]"
                aria-label="Review journal result: approve or ask for correction"
              >
                <ClipboardCheck className="h-4 w-4" />
              </button>
            </IconHint>
          ) : canApprove && publisherPending ? (
            <IconHint label="Approve publisher before approving this journal">
              <button
                type="button"
                onClick={onApprovePublisher}
                className="research-allow-transform inline-flex h-7 w-7 items-center justify-center border-0 bg-transparent text-amber-700 transition-[color,transform] hover:-translate-y-0.5 hover:text-amber-900 active:translate-y-0 active:scale-90 dark:text-amber-300 dark:hover:text-amber-100"
                aria-label="Approve publisher before approving this journal"
              >
                <ShieldAlert className="h-4 w-4" />
              </button>
            </IconHint>
          ) : null}
        </div>
      </div>
      <Link
        href={`/journals/${journal.id}`}
        className={`${journalResultPlainLinkClass} mt-3 block break-words text-sm leading-5 text-[#1F2937] hover:text-[#1F7180] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]`}
      >
        {journal.name}
      </Link>
      <p className="mt-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
        {metaItems.map((item, index) => (
          <span key={`${item}-${index}`} className="inline-flex items-center">
            {index > 0 ? <JournalResultSeparator /> : null}
            <span>{item}</span>
          </span>
        ))}
      </p>
      {journal.fields.length ? (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          {journal.fields.join("; ")}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-[#667085] dark:text-[#B0B0B0]">
        <span>APC: </span>
        <span className={apc.className}>{apc.label}</span>
        {showApcOption ? (
          <span
            className={`ml-1 font-medium ${
              journal.hasApcOption
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300"
            }`}
          >
            {journal.hasApcOption ? "(Option)" : "(No Option)"}
          </span>
        ) : null}
        <JournalResultSeparator />
        <span>Fee: </span>
        <span className={fee.className}>{fee.label}</span>
      </p>
      {publisherPending ? (
        <p className="mt-2 border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs leading-5 text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-200">
          Publisher pending approval. Approve the publisher before approving
          this journal.
        </p>
      ) : null}
      {journal.resultCorrectionRequestedAt ? (
        <div
          className={`mt-2 border px-2 py-1.5 text-xs leading-5 ${
            correctionRequested
              ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-300/30 dark:bg-orange-950/25 dark:text-orange-200"
              : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-300/30 dark:bg-sky-950/25 dark:text-sky-200"
          }`}
        >
          <p>
            {correctionRequestLabel} by{" "}
            {journal.resultCorrectionRequestedBy || "task manager"}.
            {approved && journal.resultCorrectionResolvedAt
              ? " Corrected before approval."
              : null}
          </p>
          {journal.resultCorrectionNote ? (
            <p className="mt-1 whitespace-pre-wrap break-words">
              Note: {journal.resultCorrectionNote}
            </p>
          ) : null}
        </div>
      ) : null}
      {approved && journal.resultApprovedAt ? (
        <div className="mt-2 border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs leading-5 text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-950/25 dark:text-emerald-200">
          <p>Approved by {journal.resultApprovedBy || "task manager"}.</p>
          {journal.resultApprovalNote ? (
            <p className="mt-1 whitespace-pre-wrap break-words">
              Note: {journal.resultApprovalNote}
            </p>
          ) : null}
        </div>
      ) : null}
      {journal.note ? (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          Note: {journal.note}
        </p>
      ) : null}
      <p className="mt-3 border-t border-[#E5DED2] pt-2 text-[11px] text-[#8C95A4] dark:border-[#444444] dark:text-[#777777]">
        Added by{" "}
        {addedByParts.length > 1
          ? addedByParts.map((part, index) => (
              <span
                key={`${part}-${index}`}
                className="inline-flex items-center"
              >
                {index > 0 ? <JournalResultSeparator /> : null}
                <span>{part}</span>
              </span>
            ))
          : journal.createdBy}
      </p>
    </article>
  );
}

function journalMoneyMeta(
  amount: string,
  currency: string,
  kind: "apc" | "fee",
) {
  const normalized = normalizeResearchNumberInput(amount);
  const value = Number(normalized || 0);
  const isFree = isFreeResearchAmount(amount);
  const isHigh = value > 1000;
  if (isFree) {
    return {
      label: "free",
      isFree: true,
      className: "font-normal text-emerald-700 dark:text-emerald-300",
    };
  }
  return {
    label: `${currencySymbol(currency)} ${formatResearchNumber(amount)}`,
    isFree: false,
    className:
      kind === "fee" || isHigh
        ? "font-normal text-rose-700 dark:text-rose-300"
        : "font-normal text-[#344054] dark:text-[#E4E4E4]",
  };
}

function JournalResultSeparator() {
  return (
    <span className="px-1.5 text-[#98A2B3] dark:text-[#777777]" aria-hidden>
      |
    </span>
  );
}
