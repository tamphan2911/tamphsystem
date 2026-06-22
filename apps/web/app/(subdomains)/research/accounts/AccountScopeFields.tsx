"use client";

import { useMemo, useState } from "react";
import { Building2, Check, BookOpen } from "lucide-react";
import {
  PublisherPicker,
  type PublisherPickerItem,
} from "@/sites/research/components/PublisherPicker";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "@/sites/research/components/ResearchSearchPicker";

export type AccountJournalOption = {
  id: string;
  name: string;
  publisher: string;
};

export function AccountScopeFields({
  journals,
  publishers,
  initialPublisherAccount = false,
  initialJournal = null,
  initialPublisherId,
  initialPublisherName,
}: {
  journals: AccountJournalOption[];
  publishers: PublisherPickerItem[];
  initialPublisherAccount?: boolean;
  initialJournal?: AccountJournalOption | null;
  initialPublisherId?: string | null;
  initialPublisherName?: string | null;
}) {
  const [isPublisherAccount, setIsPublisherAccount] = useState(
    initialPublisherAccount,
  );
  const [journalQuery, setJournalQuery] = useState("");
  const [selectedJournal, setSelectedJournal] =
    useState<AccountJournalOption | null>(initialJournal);

  const journalOptions = useMemo<
    ResearchSearchPickerOption<AccountJournalOption>[]
  >(() => {
    const needle = journalQuery.trim().toLowerCase();
    if (!needle) return [];
    return journals
      .filter((journal) =>
        [journal.name, journal.publisher]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 4)
      .map((journal) => ({
        id: journal.id,
        label: journal.name,
        description: journal.publisher,
        data: journal,
      }));
  }, [journalQuery, journals]);

  return (
    <>
      <label className="flex cursor-pointer items-center gap-3 border-y border-[#444444] py-3 text-sm text-[#E4E4E4]">
        <input
          name="isPublisherAccount"
          type="checkbox"
          checked={isPublisherAccount}
          onChange={(event) => setIsPublisherAccount(event.target.checked)}
          className="peer sr-only"
        />
        <span className="inline-flex h-5 w-5 flex-none items-center justify-center border border-[#666666] bg-transparent text-transparent transition-colors duration-150 peer-checked:border-violet-500 peer-checked:bg-violet-500 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#A8DADC] dark:peer-checked:border-violet-300 dark:peer-checked:bg-violet-300 dark:peer-checked:text-[#202020]">
          <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-normal">
            <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            Publisher-wide account
          </span>
          <span className="mt-0.5 block text-xs text-[#B0B0B0]">
            Use these credentials for every journal managed by one publisher.
          </span>
        </span>
      </label>

      <div className="research-dropdown-panel">
        {isPublisherAccount ? (
          <PublisherPicker
            publishers={publishers}
            initialPublisherId={initialPublisherId}
            initialPublisherName={initialPublisherName}
          />
        ) : (
          <ResearchSearchPicker
            name="journalId"
            label="Journal"
            required
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
              setSelectedJournal(option.data as AccountJournalOption);
              setJournalQuery("");
            }}
            onClear={() => {
              setSelectedJournal(null);
              setJournalQuery("");
            }}
            options={journalOptions}
            placeholder="Search and choose the journal that uses this account..."
            emptyText="No journal matches this search."
            renderOption={(option) => (
              <span className="flex min-w-0 flex-1 items-start gap-3 px-3 py-0.5">
                <BookOpen className="mt-0.5 h-4 w-4 flex-none text-cyan-700 dark:text-cyan-300" />
                <span className="min-w-0">
                  <span className="block whitespace-normal text-sm font-normal">
                    {option.label}
                  </span>
                  <span className="block text-xs opacity-70">
                    {option.description}
                  </span>
                </span>
              </span>
            )}
          />
        )}
      </div>
    </>
  );
}
