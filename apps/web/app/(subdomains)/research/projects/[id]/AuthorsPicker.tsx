"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  LockKeyhole,
  Mail,
  Search,
  ShieldAlert,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";

export type AuthorOption = {
  id: string;
  name: string;
  email: string;
  affiliation?: string;
  role: string;
};

export type SelectedAuthor = AuthorOption & {
  isCorresponding: boolean;
};

function authorName(author: AuthorOption) {
  return author.name || author.email;
}

export function AuthorsPicker({
  users,
  defaultAuthors,
  disabled = false,
  headerActions,
}: {
  users: AuthorOption[];
  defaultAuthors: SelectedAuthor[];
  disabled?: boolean;
  headerActions?: ReactNode;
}) {
  const initialAuthors =
    defaultAuthors.length > 0
      ? defaultAuthors
      : users.slice(0, 1).map((user) => ({ ...user, isCorresponding: true }));
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
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
      { ...user, isCorresponding: current.length === 0 },
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

  return (
    <>
      <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            Authors
            {disabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                Locked
              </span>
            )}
          </span>
          {headerActions}
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

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-950">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              placeholder="Search user by name, ID, or email..."
              disabled={disabled}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
            />

            {!disabled && focused && query.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/12 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/35">
                <div className="max-h-72 overflow-y-auto">
                  {results.length > 0 ? (
                    results.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addAuthor(user)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                            {authorName(user)}
                          </span>
                          <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                            {user.role} - {user.email} - {user.id.slice(0, 8)}
                          </span>
                        </span>
                        <Check
                          className="h-4 w-4 flex-none text-blue-500"
                          aria-hidden="true"
                        />
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center text-sm font-medium text-slate-400">
                      No users match this search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-2">
            {authors.map((author, index) => {
              const roleLabel = index === 0 ? "First author" : "Author";
              const corresponding = author.isCorresponding;

              return (
                <div
                  key={author.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-900/[0.02] transition dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${authorName(author)} up`}
                      disabled={disabled || index === 0}
                      onClick={() => moveAuthor(author.id, -1)}
                      className="cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${authorName(author)} down`}
                      disabled={disabled || index === authors.length - 1}
                      onClick={() => moveAuthor(author.id, 1)}
                      className="cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                        {authorName(author)}
                        {corresponding ? "*" : ""}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {roleLabel}
                      </span>
                      {corresponding && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                          Corresponding
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                      <Mail className="h-3 w-3 flex-none" aria-hidden="true" />
                      {author.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`Set ${authorName(author)} as corresponding author`}
                    disabled={disabled}
                    onClick={() => setCorresponding(author.id)}
                    className={`cursor-pointer rounded-lg p-2 transition ${
                      corresponding
                        ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                        : "text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Star className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${authorName(author)}`}
                    disabled={disabled}
                    onClick={() => removeAuthor(author.id)}
                    className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        {dirty && !disabled && (
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-300">
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
