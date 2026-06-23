"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  GitBranch,
  LinkIcon,
  Loader2,
  Plus,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
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
  normalizeResearchNumberInput,
} from "@/sites/research/lib/currency";
import {
  approveTaskJournal,
  createJournalForTaskSlot,
  linkJournalToTaskSlot,
} from "../../actions";

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
  canAdd,
  canApprove,
  canLinkExisting,
}: {
  taskId: string;
  targetCount: number;
  journals: TaskJournalResult[];
  publishers: PublisherPickerItem[];
  linkableJournals: LinkableTaskJournal[];
  canAdd: boolean;
  canApprove: boolean;
  canLinkExisting: boolean;
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [linkSlot, setLinkSlot] = useState<number | null>(null);
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
              canEdit={canLinkExisting}
              onRelink={() => setLinkSlot(position)}
              onApprove={() => setApprovalJournal(journal)}
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
      />

      <LinkExistingJournalDialog
        taskId={taskId}
        slot={linkSlot}
        journals={linkableJournals}
        onClose={() => setLinkSlot(null)}
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
          emptyText="No unlinked journal matches this search."
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
}: {
  journal: TaskJournalResult;
  canEdit: boolean;
  canApprove: boolean;
  onRelink: () => void;
  onApprove: () => void;
}) {
  const approved = journal.approvalStatus === "APPROVED";
  const publisherPending =
    journal.publisherApprovalStatus === "PENDING_APPROVAL";
  const apc = journalMoneyMeta(journal.apc, journal.apcCurrency, "apc");
  const fee = journalMoneyMeta(
    journal.submissionFee,
    journal.submissionFeeCurrency,
    "fee",
  );
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
      </div>
      <Link
        href={`/journals/${journal.id}`}
        className="mt-3 block break-words text-sm leading-5 text-[#1F2937] transition-colors hover:text-[#1F7180] active:opacity-70 dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
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
  const isFree = !Number.isFinite(value) || value <= 0;
  const isHigh = value > 1000;
  if (isFree) {
    return {
      label: "free",
      className: "font-normal text-emerald-700 dark:text-emerald-300",
    };
  }
  return {
    label: `${currencySymbol(currency)} ${formatResearchNumber(amount)}`,
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
