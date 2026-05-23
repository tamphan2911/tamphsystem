"use client";

import { useMemo, useState } from "react";
import { Check, Mail, Search, UserRound, X } from "lucide-react";
import type { AuthorOption } from "./[id]/AuthorsPicker";

function displayName(user: AuthorOption) {
  return user.name || user.email;
}

export function RegisterUserPicker({
  users,
  defaultUser,
  disabled = false,
}: {
  users: AuthorOption[];
  defaultUser?: AuthorOption | null;
  disabled?: boolean;
}) {
  const [selectedUser, setSelectedUser] = useState<AuthorOption | null>(
    defaultUser ?? null,
  );
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return users
      .filter((user) => user.id !== selectedUser?.id)
      .filter((user) =>
        [user.id, user.name, user.email, user.role]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, selectedUser?.id, users]);

  function chooseUser(user: AuthorOption) {
    if (disabled) return;
    setSelectedUser(user);
    setQuery("");
    setFocused(false);
  }

  return (
    <div className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
      Register name
      <input
        type="hidden"
        name="registrationUserId"
        value={disabled ? "" : (selectedUser?.id ?? "")}
      />
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950">
        {selectedUser ? (
          <div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 shadow-sm shadow-slate-900/[0.02] dark:bg-slate-900">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {displayName(selectedUser)}
              </span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                <Mail className="h-3 w-3 flex-none" aria-hidden="true" />
                {selectedUser.email} - {selectedUser.id.slice(0, 8)}
              </span>
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                aria-label="Remove register name"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={query}
              disabled={disabled}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 120)}
              placeholder="Search name, email, or ID..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-900/60"
            />

            {focused && query.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/30">
                {results.length > 0 ? (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseUser(user)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {displayName(user)}
                        </span>
                        <span className="block truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                          {user.role} - {user.email} - {user.id.slice(0, 8)}
                        </span>
                      </span>
                      <Check className="h-4 w-4 flex-none text-blue-500" />
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm font-medium text-slate-400">
                    No users match this search.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
