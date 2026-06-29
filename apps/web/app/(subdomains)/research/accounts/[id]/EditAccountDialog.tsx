"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, Link2, Loader2, Mail, Pencil } from "lucide-react";
import { updatePublisherAccount } from "../../actions";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import type { PublisherPickerItem } from "@/sites/research/components/PublisherPicker";
import {
  AccountScopeFields,
  type AccountJournalOption,
} from "../AccountScopeFields";

type AccountValues = {
  id: string;
  username: string;
  password: string;
  email: string;
  note: string;
  accountType: "JOURNAL" | "PUBLISHER";
  journal: AccountJournalOption | null;
  publisherId: string;
  publisherName: string;
};

export function EditAccountDialog({
  account,
  journals,
  publishers,
}: {
  account: AccountValues;
  journals: AccountJournalOption[];
  publishers: PublisherPickerItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useResearchToast();
  function closeDialog() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit account"
        className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border border-transparent bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:scale-110 hover:border-transparent hover:bg-transparent hover:text-[#0D5D68] hover:shadow-none active:scale-95 focus-visible:ring-0 dark:text-[#A8DADC] dark:hover:text-[#D7F5F6]"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <ResearchModal
        open={open}
        onClose={closeDialog}
        title="Edit Account"
        icon={<KeyRound className="h-5 w-5" />}
        maxWidth="max-w-4xl"
        headerActions={
          <ResearchButton form="edit-account-form" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
            Save Account
          </ResearchButton>
        }
      >
        <form
          id="edit-account-form"
          autoComplete="off"
          action={(formData) => {
            startTransition(async () => {
              try {
                await updatePublisherAccount(account.id, formData);
                setOpen(false);
                router.refresh();
                toast.showSuccess({
                  title: "Account updated",
                  detail: "The publisher account information has been saved.",
                });
              } catch (error) {
                toast.showError({
                  title: "Could not update account",
                  detail:
                    error instanceof Error
                      ? error.message
                      : "The account was not updated. Please check the details and try again.",
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
                  defaultValue={account.username}
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
                  defaultValue={account.password}
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  placeholder="Enter the password, if stored"
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
                  defaultValue={account.email}
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
                initialPublisherAccount={account.accountType === "PUBLISHER"}
                initialJournal={account.journal}
                initialPublisherId={account.publisherId}
                initialPublisherName={account.publisherName}
              />
            </div>
            <label className="block md:col-span-2">
              <span className="sr-only">Account notes</span>
              <span className="research-auth-input-shell">
                <input
                  name="publisherAccountNote"
                  defaultValue={account.note}
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
