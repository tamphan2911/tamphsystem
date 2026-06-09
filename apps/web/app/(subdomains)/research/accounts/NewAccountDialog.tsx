"use client";

import { useMemo, useState, useTransition } from "react";
import { KeyRound, Loader2, PlusCircle } from "lucide-react";
import { createPublisherAccount } from "../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import {
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";

type JournalOption = {
  id: string;
  name: string;
  publisher: string;
};

export function NewAccountDialog({ journals }: { journals: JournalOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  const [journalQuery, setJournalQuery] = useState("");
  const [selectedJournal, setSelectedJournal] = useState<JournalOption | null>(
    null,
  );

  const journalResults = useMemo(() => {
    const needle = journalQuery.trim().toLowerCase();
    if (!needle) return [];
    return journals
      .filter((journal) => journal.name.toLowerCase().includes(needle))
      .slice(0, 20);
  }, [journalQuery, journals]);

  const journalOptions = useMemo<ResearchSearchPickerOption<JournalOption>[]>(
    () =>
      journalResults.map((journal) => ({
        id: journal.id,
        label: journal.name,
        description: journal.publisher,
        data: journal,
      })),
    [journalResults],
  );

  function closeDialog() {
    setIsOpen(false);
    setJournalQuery("");
    setSelectedJournal(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-amber-200 bg-amber-100/80 px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm shadow-amber-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:shadow-amber-900/10 focus:outline-none focus:ring-4 focus:ring-amber-200/70 dark:border-amber-700/60 dark:bg-amber-900/35 dark:text-amber-100 dark:hover:border-amber-500/70 dark:hover:bg-amber-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-amber-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        New Account
      </button>

      <ResearchModal
        open={isOpen}
        onClose={closeDialog}
        title="Add Account"
        icon={<KeyRound className="h-5 w-5" />}
        maxWidth="max-w-4xl"
        headerActions={
          <ResearchButton form="new-account-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Add Account
          </ResearchButton>
        }
      >
        <form
          id="new-account-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const loginId =
              typeof formData.get("username") === "string"
                ? String(formData.get("username")).trim()
                : "";
            startTransition(async () => {
              try {
                await createPublisherAccount(formData);
                closeDialog();
                toast.showSuccess({
                  title: "Account added",
                  detail: loginId
                    ? `${loginId} is saved and ready for journal submissions.`
                    : "The publisher account is saved and ready for journal submissions.",
                });
              } catch (error) {
                toast.showError({
                  title: "Could not add account",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "The account was not saved. Please check the details and try again.",
                });
              }
            });
          }}
          className="grid gap-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="username"
              required
              placeholder="ID / username"
              className={researchFieldClass}
            />
            <input
              name="password"
              placeholder="Password"
              className={researchFieldClass}
            />
            <input
              name="email"
              placeholder="Email"
              className={`${researchFieldClass} md:col-span-2`}
            />
            <div className="md:col-span-2">
              <ResearchSearchPicker
                name="journalId"
                selected={
                  selectedJournal
                    ? {
                        id: selectedJournal.id,
                        label: selectedJournal.name,
                        description: selectedJournal.publisher,
                        data: selectedJournal,
                      }
                    : null
                }
                query={journalQuery}
                onQueryChange={(value) => {
                  setJournalQuery(value);
                  setSelectedJournal(null);
                }}
                onSelect={(option) => {
                  const journal = option.data as JournalOption;
                  setSelectedJournal(journal);
                  setJournalQuery("");
                }}
                onClear={() => {
                  setSelectedJournal(null);
                  setJournalQuery("");
                }}
                options={journalOptions}
                placeholder="Search journal"
                emptyText="No journal matches this search."
              />
            </div>
            <input
              name="note"
              placeholder="Login URL, recovery note, account scope"
              className={`${researchFieldClass} md:col-span-2`}
            />
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
