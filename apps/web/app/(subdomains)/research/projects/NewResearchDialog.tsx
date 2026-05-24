"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  Mail,
  PlusCircle,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { createResearchProject } from "../actions";
import { ResearchFormSelect } from "../components/ResearchFormSelect";
import type { AuthorOption } from "./[id]/AuthorsPicker";
import { RegisterUserPicker } from "./RegisterUserPicker";

function authorName(author: AuthorOption) {
  return author.name || author.email;
}

function NewResearchAuthorsPicker({
  users,
  selectedAuthors,
  onChange,
}: {
  users: AuthorOption[];
  selectedAuthors: AuthorOption[];
  onChange: (authors: AuthorOption[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const selectedIds = useMemo(
    () => new Set(selectedAuthors.map((author) => author.id)),
    [selectedAuthors],
  );

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
    onChange([...selectedAuthors, user]);
    setQuery("");
    setFocused(false);
  }

  function removeAuthor(userId: string) {
    onChange(selectedAuthors.filter((author) => author.id !== userId));
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>Authors</span>
      {selectedAuthors.map((author) => (
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
        value={selectedAuthors[0]?.id ?? ""}
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
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />

          {focused && query.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-blue-100 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-blue-50 dark:border-blue-900/60 dark:bg-slate-950 dark:shadow-black/35 dark:ring-blue-950/50">
              <div className="max-h-72 overflow-y-auto">
                {results.length > 0 ? (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addAuthor(user)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-500 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
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
          {selectedAuthors.map((author, index) => (
            <div
              key={author.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {authorName(author)}
                    {index === 0 ? "*" : ""}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {index === 0 ? "First author" : "Author"}
                  </span>
                </div>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                  <Mail className="h-3 w-3 flex-none" aria-hidden="true" />
                  {author.email}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${authorName(author)}`}
                onClick={() => removeAuthor(author.id)}
                className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
          {selectedAuthors.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm font-medium text-slate-400 dark:border-slate-700">
              Search and choose at least one author.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewResearchDialog({
  users,
  isAdmin,
}: {
  users: AuthorOption[];
  isAdmin: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [registerStatus, setRegisterStatus] = useState("NOT_REGISTERED");
  const [selectedAuthors, setSelectedAuthors] = useState<AuthorOption[]>([]);
  const [warning, setWarning] = useState("");
  const warningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!warning) return;
    window.setTimeout(() => {
      warningRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }, [warning]);

  function closeDialog() {
    setIsOpen(false);
    setRegisterStatus("NOT_REGISTERED");
    setSelectedAuthors([]);
    setWarning("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      event.preventDefault();
      setWarning("Research title is required.");
      return;
    }

    if (selectedAuthors.length === 0) {
      event.preventDefault();
      setWarning("Choose at least one author before creating research.");
      return;
    }

    setWarning("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-100/80 px-4 py-2.5 text-sm font-bold text-sky-800 shadow-sm shadow-sky-900/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md hover:shadow-sky-900/10 focus:outline-none focus:ring-4 focus:ring-sky-200/70 dark:border-sky-700/60 dark:bg-sky-900/35 dark:text-sky-100 dark:hover:border-sky-500/70 dark:hover:bg-sky-800/55 dark:hover:text-white dark:hover:shadow-black/25 dark:focus:ring-sky-700/35"
      >
        <PlusCircle className="h-4 w-4" />
        New Research
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-4xl animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  Add New Research
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Create a research record and place it in the pipeline.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={createResearchProject}
              onSubmit={handleSubmit}
              className="grid max-h-[calc(90vh-6rem)] gap-5 overflow-y-auto px-6 py-5"
            >
              {warning && (
                <div
                  ref={warningRef}
                  className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  {warning}
                </div>
              )}

              <section className="grid gap-4">
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Title
                  <input
                    name="title"
                    placeholder="Research title"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <NewResearchAuthorsPicker
                  users={users}
                  selectedAuthors={selectedAuthors}
                  onChange={(authors) => {
                    setSelectedAuthors(authors);
                    if (authors.length > 0 && warning.includes("author")) {
                      setWarning("");
                    }
                  }}
                />
              </section>

              {isAdmin && (
                <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
                  <h3 className="mb-4 text-base font-bold text-slate-950 dark:text-white">
                    Registration
                  </h3>
                  <div className="grid items-end gap-4 lg:grid-cols-[14rem_1fr]">
                    <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Register
                      <ResearchFormSelect
                        name="registerStatus"
                        defaultValue={registerStatus}
                        onValueChange={setRegisterStatus}
                        ariaLabel="Registration status"
                        options={[
                          { value: "NOT_REGISTERED", label: "Not registered" },
                          { value: "PREPARING", label: "Plan" },
                          { value: "SUBMITTED", label: "Submitted" },
                          { value: "APPROVED", label: "Approved" },
                        ]}
                      />
                    </label>
                    <div
                      className={`grid items-end gap-4 transition-all duration-300 ease-out md:grid-cols-[minmax(12rem,0.8fr)_minmax(22rem,1.2fr)] ${
                        registerStatus === "NOT_REGISTERED"
                          ? "pointer-events-none max-h-0 -translate-y-1 overflow-hidden opacity-0"
                          : "max-h-40 translate-y-0 opacity-100"
                      }`}
                      aria-hidden={registerStatus === "NOT_REGISTERED"}
                    >
                      <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Registration period
                        <input
                          name="universityRegistration"
                          placeholder="Q2 2026"
                          disabled={registerStatus === "NOT_REGISTERED"}
                          className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900"
                        />
                      </label>
                      <RegisterUserPicker
                        users={users}
                        disabled={registerStatus === "NOT_REGISTERED"}
                      />
                    </div>
                  </div>
                </section>
              )}

              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Notes
                <textarea
                  name="abstract"
                  placeholder="Idea, data, model, writing, humanizing, references..."
                  className="min-h-28 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4" />
                  Add Research
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
