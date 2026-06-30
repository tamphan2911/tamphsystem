"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Loader2,
  Pencil,
  Save,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { JournalApprovalStatus } from "@repo/db";
import {
  approveJournal,
  updateJournalApprovalStatus,
  updateJournalCreator,
} from "../../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  IconHint,
  ResearchButton,
} from "@/sites/research/components/ResearchPrimitives";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";

export type JournalCreatorOption = {
  id: string;
  name: string;
  email: string;
};

export function ApproveJournalButton({
  journalId,
  journalName,
}: {
  journalId: string;
  journalName: string;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isPending, startTransition] = useTransition();

  return (
    <ResearchButton
      type="button"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await approveJournal(journalId);
            toast.showSuccess({
              title: "Journal approved",
              detail: `${journalName} is now available across the research site.`,
            });
            router.refresh();
          } catch (error) {
            toast.showError({
              title: "Journal could not be approved",
              detail:
                error instanceof Error
                  ? error.message
                  : "Check the linked publisher and try again.",
            });
          }
        });
      }}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      Approve journal
    </ResearchButton>
  );
}

export function JournalApprovalToggleButton({
  journalId,
  journalName,
  approvalStatus,
  returnHref,
}: {
  journalId: string;
  journalName: string;
  approvalStatus: JournalApprovalStatus;
  returnHref?: string | null;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isApproved = approvalStatus === JournalApprovalStatus.APPROVED;
  const nextStatus = isApproved
    ? JournalApprovalStatus.PENDING_APPROVAL
    : JournalApprovalStatus.APPROVED;
  const Icon = isApproved ? ShieldAlert : CheckCircle2;
  const label = isApproved ? "Mark journal unapproved" : "Approve journal";

  function submit() {
    startTransition(async () => {
      try {
        await updateJournalApprovalStatus(journalId, nextStatus);
        setIsOpen(false);
        toast.showSuccess({
          title: isApproved ? "Journal marked unapproved" : "Journal approved",
          detail: isApproved
            ? `${journalName} is now waiting for admin approval and will not appear in journal pickers.`
            : `${journalName} is now approved and available across the research site.`,
        });
        if (!isApproved && returnHref) {
          router.push(returnHref);
        } else {
          router.refresh();
        }
      } catch (error) {
        toast.showError({
          title: "Journal could not be approved",
          detail:
            error instanceof Error
              ? error.message
              : "Check the linked publisher and try again.",
        });
      }
    });
  }

  return (
    <>
      <IconHint label={label} position="bottom">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`research-clickable-icon research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${
            isApproved
              ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
              : "text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
          }`}
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={isApproved ? "Mark journal unapproved?" : "Approve journal?"}
        description={
          isApproved
            ? "This journal will be moved back to waiting approval and hidden from journal search fields used in tasks, submissions, reviews, and accounts."
            : "This journal will become available in journal search fields across the research site."
        }
        icon={
          isApproved ? (
            <ShieldAlert className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )
        }
        maxWidth="max-w-lg"
        bodyClassName="px-5 py-5"
        headerActions={
          <ResearchButton type="button" onClick={submit} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isApproved ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isApproved ? "Mark unapproved" : "Approve journal"}
          </ResearchButton>
        }
      >
        <p className="text-sm leading-6 text-[#475467] dark:text-[#B0B0B0]">
          {isApproved
            ? `Confirm moving "${journalName}" back to waiting approval. Existing records remain, but this journal will stop appearing as a selectable venue until approved again.`
            : `Confirm approving "${journalName}". It will be ready for tasks, submissions, accounts, and review workflows.`}
        </p>
      </ResearchModal>
    </>
  );
}

export function EditJournalCreatorButton({
  journalId,
  users,
  currentCreatorId,
}: {
  journalId: string;
  users: JournalCreatorOption[];
  currentCreatorId: string;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] =
    useState<ResearchSearchPickerOption<JournalCreatorOption> | null>(null);
  const [isPending, startTransition] = useTransition();
  const options = useMemo<ResearchSearchPickerOption<JournalCreatorOption>[]>(
    () =>
      users.map((user) => ({
        id: user.id,
        label: user.name || user.email,
        description: user.email,
        data: user,
      })),
    [users],
  );
  const currentOption = useMemo(
    () => options.find((option) => option.id === currentCreatorId) ?? null,
    [currentCreatorId, options],
  );
  return (
    <>
      <IconHint label="Edit who added this journal" position="bottom">
        <button
          type="button"
          onClick={() => {
            setSelected(currentOption);
            setQuery("");
            setIsOpen(true);
          }}
          className="research-clickable-icon research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
          aria-label="Edit who added this journal"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit journal creator"
        description="Choose the research user recorded as the person who added this journal."
        icon={<UserRound className="h-5 w-5" />}
        maxWidth="max-w-xl"
        bodyClassName="px-5 py-5"
        headerActions={
          <ResearchButton
            form="journal-creator-form"
            disabled={isPending || !selected}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save creator
          </ResearchButton>
        }
      >
        <form
          id="journal-creator-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await updateJournalCreator(journalId, formData);
              setIsOpen(false);
              toast.showSuccess({
                title: "Journal creator updated",
                detail: "The Added by information is now updated.",
              });
              router.refresh();
            });
          }}
        >
          <ResearchSearchPicker
            name="createdById"
            selected={selected}
            query={query}
            onQueryChange={setQuery}
            onSelect={(option) => {
              setSelected(option);
              setQuery("");
            }}
            onClear={() => setSelected(null)}
            options={options.filter((option) =>
              [option.label, option.description]
                .join(" ")
                .toLowerCase()
                .includes(query.trim().toLowerCase()),
            )}
            placeholder="Search by name or main email..."
            emptyText="No research user matches this search."
          />
        </form>
      </ResearchModal>
    </>
  );
}
