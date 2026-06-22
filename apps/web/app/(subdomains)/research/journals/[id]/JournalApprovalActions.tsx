"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Save, UserRound } from "lucide-react";
import {
  approveJournal,
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
          await approveJournal(journalId);
          toast.showSuccess({
            title: "Journal approved",
            detail: `${journalName} is now available across the research site.`,
          });
          router.refresh();
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
