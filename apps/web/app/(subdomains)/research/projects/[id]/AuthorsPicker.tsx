"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  MailCheck,
  LockKeyhole,
  Mail,
  Search,
  ShieldAlert,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  IconHint,
  ResearchButton,
  researchSearchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

export type AuthorOption = {
  id: string;
  name: string;
  email: string;
  additionalEmails?: string[];
  selectedEmail?: string;
  affiliation?: string;
  role: string;
};

export type SelectedAuthor = AuthorOption & {
  isCorresponding: boolean;
};

function authorName(author: AuthorOption) {
  return displayResearchPersonName(author);
}

function contactEmailOptions(user: AuthorOption) {
  return Array.from(
    new Map(
      [user.email, ...(user.additionalEmails ?? [])]
        .filter(Boolean)
        .map((email) => [email.trim().toLowerCase(), email.trim()]),
    ).values(),
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function ContactEmailChoiceButton({
  person,
  disabled = false,
  allowPendingEmail = false,
  onChange,
}: {
  person: AuthorOption;
  disabled?: boolean;
  allowPendingEmail?: boolean;
  onChange: (email: string) => void;
}) {
  const emails = contactEmailOptions(person);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(person.selectedEmail || person.email);
  const toast = useResearchToast();
  const normalizedDraft = draft.trim().toLowerCase();
  const draftMatchesSavedEmail = emails.some(
    (email) => email.trim().toLowerCase() === normalizedDraft,
  );
  const pendingOption =
    allowPendingEmail && isValidEmail(draft) && !draftMatchesSavedEmail
      ? draft.trim()
      : "";
  const options = pendingOption ? [...emails, pendingOption] : emails;
  const canUseDraft = draftMatchesSavedEmail || Boolean(pendingOption);

  if (emails.length <= 1 && !allowPendingEmail) return null;

  return (
    <>
      <IconHint label="Choose contact email" position="bottom">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDraft(person.selectedEmail || person.email);
            setOpen(true);
          }}
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#B39CD0] shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#D8C8EF] focus-visible:ring-0 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:active:scale-100"
          aria-label={`Choose contact email for ${authorName(person)}`}
        >
          <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </IconHint>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Choose contact email"
        icon={<MailCheck className="h-5 w-5" />}
        maxWidth="max-w-xl"
        headerActions={
          <ResearchButton
            type="button"
            disabled={!canUseDraft}
            onClick={() => {
              onChange(draft);
              setOpen(false);
              toast.showSuccess({
                title: "Contact email updated",
                detail: `${authorName(person)} will use ${displayResearchEmail(draft)} for this record.`,
              });
            }}
          >
            <Check className="h-4 w-4" />
            Use email
          </ResearchButton>
        }
      >
        <div className="grid gap-4">
          <p className="text-sm font-normal text-[#B0B0B0]">
            Select which email this person should use for this research or
            project record.
          </p>
          <ResearchFormSelect
            name="contactEmailDraft"
            defaultValue={draft}
            ariaLabel="Contact email"
            onValueChange={setDraft}
            options={options.map((email) => ({
              value: email,
              label:
                email.trim().toLowerCase() === person.email.trim().toLowerCase()
                  ? `${displayResearchEmail(email)} (main)`
                  : email.trim().toLowerCase() ===
                      pendingOption.trim().toLowerCase()
                    ? `${displayResearchEmail(email)} (pending)`
                    : displayResearchEmail(email),
            }))}
          />
          {allowPendingEmail && (
            <label className="grid gap-2">
              <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
                Pending email
              </span>
              <input
                type="email"
                value={draftMatchesSavedEmail ? "" : draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Enter pending email for this author"
                className={researchSearchFieldClass}
              />
              <span className="text-xs text-[#777777]">
                Admin only. This email is saved for this research record, not as
                the user&apos;s login email.
              </span>
            </label>
          )}
        </div>
      </ResearchModal>
    </>
  );
}

export function AuthorsPicker({
  users,
  defaultAuthors,
  disabled = false,
  allowPendingEmail = false,
}: {
  users: AuthorOption[];
  defaultAuthors: SelectedAuthor[];
  disabled?: boolean;
  allowPendingEmail?: boolean;
}) {
  const initialAuthors =
    defaultAuthors.length > 0
      ? defaultAuthors.map((author) => ({
          ...author,
          selectedEmail: author.selectedEmail || author.email,
        }))
      : users.slice(0, 1).map((user) => ({
          ...user,
          selectedEmail: user.selectedEmail || user.email,
          isCorresponding: true,
        }));
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [authors, setAuthors] = useState<SelectedAuthor[]>(initialAuthors);
  const [dirty, setDirty] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  const selectedIds = useMemo(
    () => new Set(authors.map((author) => author.id)),
    [authors],
  );
  const correspondingId =
    authors.find((author) => author.isCorresponding)?.id ??
    authors[0]?.id ??
    "";

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return users
      .filter((user) => !selectedIds.has(user.id))
      .filter((user) =>
        [user.id, user.name, user.email, user.role]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, selectedIds, users]);

  function addAuthor(user: AuthorOption) {
    if (disabled) return;
    setAuthors((current) => [
      ...current.map((author, index) => ({
        ...author,
        isCorresponding:
          index === 0 ? author.isCorresponding : author.isCorresponding,
      })),
      {
        ...user,
        selectedEmail: user.selectedEmail || user.email,
        isCorresponding: current.length === 0,
      },
    ]);
    setDirty(true);
    setQuery("");
    setFocused(false);
  }

  function removeAuthor(userId: string) {
    if (disabled) return;
    if (authors.length <= 1) {
      setWarningOpen(true);
      return;
    }
    setAuthors((current) => {
      const next = current.filter((author) => author.id !== userId);
      if (next.length > 0 && !next.some((author) => author.isCorresponding)) {
        const firstAuthor = next[0];
        if (firstAuthor) {
          next[0] = { ...firstAuthor, isCorresponding: true };
        }
      }
      return next;
    });
    setDirty(true);
  }

  function moveAuthor(userId: string, direction: -1 | 1) {
    if (disabled) return;
    setAuthors((current) => {
      const index = current.findIndex((author) => author.id === userId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length)
        return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(nextIndex, 0, item);
      return next;
    });
    setDirty(true);
  }

  function setCorresponding(userId: string) {
    if (disabled) return;
    setAuthors((current) =>
      current.map((author) => ({
        ...author,
        isCorresponding: author.id === userId,
      })),
    );
    setDirty(true);
  }

  function setSelectedEmail(userId: string, email: string) {
    if (disabled) return;
    setAuthors((current) =>
      current.map((author) =>
        author.id === userId ? { ...author, selectedEmail: email } : author,
      ),
    );
    setDirty(true);
  }

  return (
    <>
      <div className="grid gap-2 text-sm font-normal text-[#E4E4E4]">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            Authors
            {disabled && (
              <span className="inline-flex items-center gap-1 border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#B0B0B0]">
                <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                Locked
              </span>
            )}
          </span>
        </span>
        {authors.map((author) => (
          <input
            key={author.id}
            type="hidden"
            name="authorUserIds"
            value={author.id}
          />
        ))}
        <input
          type="hidden"
          name="correspondingAuthorId"
          value={correspondingId}
        />
        {authors.map((author) => (
          <input
            key={`selected-email-${author.id}`}
            type="hidden"
            name="selectedContactEmails"
            value={`${author.id}\t${author.selectedEmail || author.email}`}
          />
        ))}

        <div className="border border-[#444444] bg-[#2C2C2C] p-3">
          <div ref={searchRef} className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B0B0B0]"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              placeholder="Search user by name, ID, or email..."
              disabled={disabled}
              className={`${researchSearchFieldClass} h-10 pl-9`}
            />

            <FloatingDropdownPortal
              anchorRef={searchRef}
              open={!disabled && focused && query.trim().length > 0}
              maxWidth={640}
            >
              <div className="overflow-hidden rounded-none border border-[#5A5A5A] bg-[#2C2C2C] shadow-xl shadow-black/35">
                <div className="max-h-[var(--research-dropdown-max-height)] overflow-y-auto">
                  {results.length > 0 ? (
                    results.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addAuthor(user)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-none border-y border-transparent px-3 py-2 text-left transition first:border-t-transparent last:border-b-transparent hover:border-[#5A5A5A] first:hover:border-t-transparent last:hover:border-b-transparent hover:bg-[#383838]"
                      >
                        <span className="inline-flex h-9 w-9 flex-none items-center justify-center border border-[#444444] bg-[#202020] text-[#A8DADC]">
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-normal text-[#E4E4E4]">
                            {authorName(user)}
                          </span>
                          <span className="block truncate text-xs font-normal text-[#B0B0B0]">
                            {[
                              user.role,
                              displayResearchEmail(user.email),
                              user.id.slice(0, 8),
                            ]
                              .filter(Boolean)
                              .join(" - ")}
                          </span>
                        </span>
                        <Check
                          className="h-4 w-4 flex-none text-[#A8DADC]"
                          aria-hidden="true"
                        />
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center text-sm font-normal text-[#B0B0B0]">
                      No users match this search.
                    </div>
                  )}
                </div>
              </div>
            </FloatingDropdownPortal>
          </div>

          <div className="mt-3 divide-y divide-[#d8d0c3] border-y border-[#d8d0c3] dark:divide-[#444444] dark:border-[#444444]">
            {authors.map((author, index) => {
              const roleLabel = index === 0 ? "First author" : "Author";
              const corresponding = author.isCorresponding;

              return (
                <div key={author.id} className="flex items-center gap-4 py-3">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${authorName(author)} up`}
                      disabled={disabled || index === 0}
                      onClick={() => moveAuthor(author.id, -1)}
                      className="cursor-pointer border-0 bg-transparent p-1 text-[#B0B0B0] transition hover:text-[#A8DADC] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${authorName(author)} down`}
                      disabled={disabled || index === authors.length - 1}
                      onClick={() => moveAuthor(author.id, 1)}
                      className="cursor-pointer border-0 bg-transparent p-1 text-[#B0B0B0] transition hover:text-[#A8DADC] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <span className="inline-flex h-10 w-8 flex-none items-center justify-center text-[#A8DADC]">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-normal text-[#E4E4E4]">
                        {authorName(author)}
                        {corresponding ? "*" : ""}
                      </p>
                      <span className="border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#B0B0B0]">
                        {roleLabel}
                      </span>
                      {corresponding && (
                        <span className="border border-[#5A5A5A] bg-[#263636] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#A8DADC]">
                          Corresponding
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-normal text-[#B0B0B0]">
                      <Mail
                        className="h-3 w-3 flex-none text-[#A8DADC]"
                        aria-hidden="true"
                      />
                      {displayResearchEmail(
                        author.selectedEmail || author.email,
                      )}
                      <ContactEmailChoiceButton
                        person={author}
                        disabled={disabled}
                        allowPendingEmail={allowPendingEmail}
                        onChange={(email) => setSelectedEmail(author.id, email)}
                      />
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`Set ${authorName(author)} as corresponding author`}
                    disabled={disabled}
                    onClick={() => setCorresponding(author.id)}
                    className={`cursor-pointer border-0 bg-transparent p-2 transition ${
                      corresponding
                        ? "text-[#A8DADC]"
                        : "text-[#B0B0B0] hover:text-[#A8DADC]"
                    }`}
                  >
                    <Star className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${authorName(author)}`}
                    disabled={disabled}
                    onClick={() => removeAuthor(author.id)}
                    className="cursor-pointer border-0 bg-transparent p-2 text-[#B0B0B0] transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {dirty && !disabled && (
          <p className="text-xs font-normal text-amber-300">
            Author changes are not saved yet. Click Save changes to keep the
            updated author list.
          </p>
        )}
      </div>

      <ResearchConfirmDialog
        open={warningOpen}
        tone="warning"
        title="At least one author is required"
        confirmLabel="Got it"
        icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        onCancel={() => setWarningOpen(false)}
        onConfirm={() => setWarningOpen(false)}
      >
        <p>
          This research must keep one author in the author list. Add another
          author before removing this one.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}
