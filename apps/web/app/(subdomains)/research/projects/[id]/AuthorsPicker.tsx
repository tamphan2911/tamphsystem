"use client";

import { useMemo, useState } from "react";
import { Check, Search, UserRound, X } from "lucide-react";

export type AuthorOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function AuthorsPicker({
  users,
  defaultAuthorIds,
}: {
  users: AuthorOption[];
  defaultAuthorIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(defaultAuthorIds));

  const selectedAuthors = users.filter((user) => selectedIds.has(user.id));
  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;

    return users.filter((user) =>
      [user.name, user.email, user.role].join(" ").toLowerCase().includes(needle),
    );
  }, [query, users]);

  function toggleAuthor(userId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>Authors</span>
      {[...selectedIds].map((id) => (
        <input key={id} type="hidden" name="authorIds" value={id} />
      ))}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          {selectedAuthors.length > 0 ? (
            selectedAuthors.map((author) => (
              <span
                key={author.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900"
              >
                <UserRound className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                <span className="truncate">{author.name || author.email}</span>
                <button
                  type="button"
                  aria-label={`Remove ${author.name || author.email}`}
                  onClick={() => toggleAuthor(author.id)}
                  className="cursor-pointer rounded-full p-0.5 text-blue-400 transition hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))
          ) : (
            <span className="px-1 text-xs font-medium text-slate-400">Choose at least one author account</span>
          )}
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search user account..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredUsers.map((user) => {
            const selected = selectedIds.has(user.id);

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleAuthor(user.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm ${
                  selected
                    ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
                }`}
              >
                <span
                  className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg ring-1 ${
                    selected
                      ? "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:ring-blue-800"
                      : "bg-slate-50 text-slate-400 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800"
                  }`}
                >
                  {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{user.name || user.email}</span>
                  <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                    {user.role} - {user.email}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
