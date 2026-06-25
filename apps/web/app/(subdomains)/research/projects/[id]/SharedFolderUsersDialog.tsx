"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderCheck, Search, UserPlus, X } from "lucide-react";
import { FloatingDropdownPortal } from "@/sites/research/components/FloatingDropdownPortal";
import { ResearchButton } from "@/sites/research/components/ResearchPrimitives";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type FolderSharedUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function userLabel(user: FolderSharedUserOption) {
  return user.name || user.email;
}

export function SharedFolderUsersDialog({
  action,
  users,
  selectedUsers,
}: {
  action: (formData: FormData) => Promise<
    | {
        ok: boolean;
        savedCount?: number;
        requestedCount?: number;
      }
    | void
  >;
  users: FolderSharedUserOption[];
  selectedUsers: FolderSharedUserOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(selectedUsers.map((user) => user.id)),
  );
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLDivElement>(null);
  const toast = useResearchToast();
  const usersById = useMemo(() => {
    const map = new Map(users.map((user) => [user.id, user]));
    selectedUsers.forEach((user) => map.set(user.id, user));
    return map;
  }, [selectedUsers, users]);
  const selected = useMemo(
    () =>
      Array.from(selectedIds)
        .map((id) => usersById.get(id))
        .filter((user): user is FolderSharedUserOption => Boolean(user)),
    [selectedIds, usersById],
  );
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return users
      .filter((user) => !selectedIds.has(user.id))
      .filter((user) =>
        [userLabel(user), user.email, user.role]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 8);
  }, [query, selectedIds, users]);

  function addUser(user: FolderSharedUserOption) {
    setSelectedIds((current) => new Set([...current, user.id]));
    setQuery("");
    setFocused(false);
  }

  function removeUser(userId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(userId);
      return next;
    });
  }

  return (
    <>
      <ResearchButton
        type="button"
        onClick={() => setOpen(true)}
        className="research-allow-transform !h-8 !px-3 !py-1.5 text-xs"
      >
        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Shared users
      </ResearchButton>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Research folder shared users"
        icon={<FolderCheck className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        headerActions={
          <ResearchButton
            type="submit"
            form="research-folder-shared-users-form"
            disabled={isPending}
          >
            <FolderCheck className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Saving..." : "Save shared users"}
          </ResearchButton>
        }
      >
        <form
          id="research-folder-shared-users-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                const result = await action(formData);
                if (result && !result.ok) {
                  toast.showError({
                    title: "Shared users not saved",
                    detail:
                      "The selected users are not eligible for this research folder.",
                  });
                  return;
                }
                router.refresh();
                setOpen(false);
                toast.showSuccess({
                  title: "Shared users saved",
                  detail: "Research folder shared-user markers are updated.",
                });
              } catch {
                toast.showError({
                  title: "Shared users not saved",
                  detail:
                    "The shared users could not be updated. Please refresh and try again.",
                });
              }
            });
          }}
          className="space-y-5 px-5 py-5"
        >
          {selected.map((user) => (
            <input
              key={user.id}
              type="hidden"
              name="folderSharedUserIds"
              value={user.id}
            />
          ))}

          <div ref={searchRef} className="relative">
            <label className="mb-2 block text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              Add chief assistant or task assistant
            </label>
            <div className="flex h-11 items-center gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-[#243047] focus-within:border-[#1F7180] dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4]">
              <Search className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
              <input
                type="search"
                value={query}
                onFocus={() => setFocused(true)}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                  setFocused(true);
                }}
                placeholder="Search name, email, role..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-[#777777]"
              />
            </div>
            <FloatingDropdownPortal
              anchorRef={searchRef}
              open={focused && query.trim().length > 0}
              maxWidth={640}
            >
              <div className="research-dropdown-panel max-h-72 overflow-y-auto border border-[#D8D0C2] bg-[#FFFDF8] shadow-xl dark:border-[#444444] dark:bg-[#202020]">
                {results.length > 0 ? (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addUser(user)}
                      className="flex w-full cursor-pointer flex-col gap-1 border-b border-[#E8E0D4] px-3 py-3 text-left text-sm text-[#243047] transition last:border-b-0 hover:bg-[#F3EFE6] dark:border-[#333333] dark:text-[#E4E4E4] dark:hover:bg-[#2C2C2C]"
                    >
                      <span className="font-normal">{userLabel(user)}</span>
                      <span className="break-all text-xs text-[#667085] dark:text-[#B0B0B0]">
                        {user.email} | {user.role}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-sm text-[#667085] dark:text-[#B0B0B0]">
                    No eligible users match this search.
                  </div>
                )}
              </div>
            </FloatingDropdownPortal>
          </div>

          <div className="divide-y divide-[#E1D8CA] border-y border-[#E1D8CA] dark:divide-[#444444] dark:border-[#444444]">
            {selected.length > 0 ? (
              selected.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-normal text-[#243047] dark:text-[#E4E4E4]">
                      {userLabel(user)}
                    </p>
                    <p className="break-all text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                      {user.email} | {user.role}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUser(user.id)}
                    className="research-allow-transform inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-rose-700 transition hover:-translate-y-0.5 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200"
                    aria-label={`Remove ${userLabel(user)}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 text-sm text-[#667085] dark:text-[#B0B0B0]">
                No non-author users marked as shared yet.
              </div>
            )}
          </div>
        </form>
      </ResearchModal>
    </>
  );
}
