"use client";

import { useMemo, useState } from "react";
import { Mail, UserRound } from "lucide-react";
import {
  ResearchSearchPicker,
  type ResearchSearchPickerOption,
} from "../components/ResearchSearchPicker";
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

  const options = useMemo<ResearchSearchPickerOption<AuthorOption>[]>(
    () =>
      results.map((user) => ({
        id: user.id,
        label: displayName(user),
        description: `${user.role} - ${user.email} - ${user.id.slice(0, 8)}`,
        data: user,
      })),
    [results],
  );

  function chooseUser(user: AuthorOption) {
    if (disabled) return;
    setSelectedUser(user);
    setQuery("");
  }

  return (
    <ResearchSearchPicker
      label="Register name"
      name="registrationUserId"
      selected={
        disabled || !selectedUser
          ? null
          : {
              id: selectedUser.id,
              label: displayName(selectedUser),
              description: `${selectedUser.email} - ${selectedUser.id.slice(0, 8)}`,
              data: selectedUser,
            }
      }
      query={query}
      onQueryChange={setQuery}
      onSelect={(option) => chooseUser(option.data as AuthorOption)}
      onClear={() => setSelectedUser(null)}
      options={options}
      placeholder="Search name, email, or ID..."
      emptyText="No users match this search."
      disabled={disabled}
      renderSelected={(option) => {
        const user = option.data as AuthorOption;
        return (
          <>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {displayName(user)}
              </span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-medium text-slate-400 dark:text-slate-500">
                <Mail className="h-3 w-3 flex-none" aria-hidden="true" />
                {user.email} - {user.id.slice(0, 8)}
              </span>
            </span>
          </>
        );
      }}
      renderOption={(option) => (
        <>
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-500 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {option.label}
            </span>
            <span className="block truncate text-xs font-medium opacity-70">
              {option.description}
            </span>
          </span>
        </>
      )}
    />
  );
}
