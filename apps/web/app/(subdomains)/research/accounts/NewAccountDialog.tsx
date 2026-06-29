"use client";

import { useState, useTransition } from "react";
import {
  AtSign,
  KeyRound,
  Link2,
  Loader2,
  Mail,
  PlusCircle,
} from "lucide-react";
import { createPublisherAccount } from "../actions";
import { useRouter } from "next/navigation";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import type { PublisherPickerItem } from "@/sites/research/components/PublisherPicker";
import {
  AccountScopeFields,
  type AccountJournalOption,
} from "./AccountScopeFields";

export function NewAccountDialog({
  journals,
  publishers,
  initialJournal = null,
  triggerLabel = "New Account",
}: {
  journals: AccountJournalOption[];
  publishers: PublisherPickerItem[];
  initialJournal?: AccountJournalOption | null;
  triggerLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useResearchToast();
  function closeDialog() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-amber-200 bg-amber-100/80 px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm shadow-amber-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:shadow-amber-900/10 focus:outline-none focus:ring-4 focus:ring-amber-200/70 dark:border-amber-700/60 dark:bg-amber-900/35 dark:text-amber-100 dark:hover:border-amber-500/70 dark:hover:bg-amber-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-amber-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        {triggerLabel}
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
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const loginId =
              typeof formData.get("publisherAccountLoginId") === "string"
                ? String(formData.get("publisherAccountLoginId")).trim()
                : "";
            startTransition(async () => {
              try {
                await createPublisherAccount(formData);
                closeDialog();
                router.refresh();
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
            <label className="block">
              <span className="sr-only">Account login ID or username</span>
              <span className="research-auth-input-shell">
                <input
                  name="publisherAccountLoginId"
                  required
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  placeholder="Enter the journal login ID or username"
                />
                <AtSign aria-hidden="true" />
              </span>
            </label>
            <label className="block">
              <span className="sr-only">Account password</span>
              <span className="research-auth-input-shell">
                <input
                  name="publisherAccountSecret"
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  placeholder="Enter the password, if you want to store it"
                />
                <KeyRound aria-hidden="true" />
              </span>
            </label>
            <label className="block md:col-span-2">
              <span className="sr-only">Recovery email</span>
              <span className="research-auth-input-shell">
                <input
                  name="publisherAccountRecoveryEmail"
                  type="email"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  placeholder="Enter the recovery email linked to this account"
                />
                <Mail aria-hidden="true" />
              </span>
            </label>
            <div className="md:col-span-2">
              <AccountScopeFields
                journals={journals}
                publishers={publishers}
                initialJournal={initialJournal}
              />
            </div>
            <label className="block md:col-span-2">
              <span className="sr-only">Account notes</span>
              <span className="research-auth-input-shell">
                <input
                  name="publisherAccountNote"
                  autoComplete="off"
                  placeholder="Add login URL, recovery note, or account scope"
                />
                <Link2 aria-hidden="true" />
              </span>
            </label>
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
