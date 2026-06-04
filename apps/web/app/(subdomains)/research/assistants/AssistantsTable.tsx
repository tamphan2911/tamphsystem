"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  assignResearchAssistant,
  removeResearchAssistantRole,
} from "../actions";
import {
  FilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

export type AssistantRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  assistantRole: string;
};

export function AssistantsTable({
  rows,
  canManage,
}: {
  rows: AssistantRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { showSuccess } = useResearchToast();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [editing, setEditing] = useState<AssistantRow | null>(null);
  const [deleting, setDeleting] = useState<AssistantRow | null>(null);
  const [editRole, setEditRole] = useState("ASSISTANT");
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const passwordTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    return () => {
      Object.values(passwordTimers.current).forEach(clearTimeout);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesRole = role === "ALL" || row.assistantRole === role;
      const haystack = [row.name, row.email, row.assistantRole]
        .join(" ")
        .toLowerCase();
      return matchesRole && (!needle || haystack.includes(needle));
    });
  }, [query, role, rows]);

  const pagination = useTablePagination(filtered, 10);

  function togglePassword(userId: string) {
    setVisiblePasswords((current) => {
      const willShow = !current[userId];
      if (passwordTimers.current[userId]) {
        clearTimeout(passwordTimers.current[userId]);
        delete passwordTimers.current[userId];
      }
      if (willShow) {
        passwordTimers.current[userId] = setTimeout(() => {
          setVisiblePasswords((latest) => ({ ...latest, [userId]: false }));
          delete passwordTimers.current[userId];
        }, 5000);
      }
      return { ...current, [userId]: willShow };
    });
  }

  function openEdit(row: AssistantRow) {
    setEditing(row);
    setEditRole(row.assistantRole);
  }

  function submitEdit(formData: FormData) {
    const assistant = editing;
    const passwordChanged = Boolean(
      String(formData.get("password") ?? "").trim(),
    );
    startTransition(async () => {
      await assignResearchAssistant(formData);
      setEditing(null);
      showSuccess({
        title: passwordChanged
          ? "Assistant account updated"
          : "Assistant role updated",
        detail: passwordChanged
          ? `${assistant?.name || assistant?.email || "Assistant"} has a new login password and ${editRole === "CHIEF_ASSISTANT" ? "chief assistant" : "assistant"} access.`
          : `${assistant?.name || assistant?.email || "Assistant"} is now set as ${editRole === "CHIEF_ASSISTANT" ? "chief assistant" : "assistant"}.`,
      });
      router.refresh();
    });
  }

  function confirmDelete(formData: FormData) {
    const assistant = deleting;
    startTransition(async () => {
      await removeResearchAssistantRole(formData);
      setDeleting(null);
      showSuccess({
        title: "Assistant role removed",
        detail: `${assistant?.name || assistant?.email || "Selected user"} no longer has assistant access in the research site.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search assistant, email, role..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={role}
            onChange={setRole}
            ariaLabel="Filter by assistant role"
            options={[
              { value: "ALL", label: "All roles" },
              { value: "ASSISTANT", label: "Assistant" },
              { value: "CHIEF_ASSISTANT", label: "Chief assistant" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="w-[32%] px-4 py-3">Assistant</th>
              <th className="w-[28%] px-3 py-3">Email</th>
              <th className="w-[20%] px-3 py-3">Password</th>
              <th className="w-[12%] px-3 py-3">Role</th>
              {canManage && (
                <th className="w-[8%] px-2 py-3 text-right">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((user) => (
              <tr
                key={user.id}
                className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50 text-purple-600 shadow-sm dark:border-purple-900/70 dark:bg-purple-950/40 dark:text-purple-300">
                      <UserRound className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                      {user.name || "Unnamed user"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="block truncate">{user.email}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <KeyRound className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {visiblePasswords[user.id]
                        ? user.password || "Not stored"
                        : user.password
                          ? "••••••••"
                          : "••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePassword(user.id)}
                      className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-blue-600 dark:hover:bg-slate-900 dark:hover:text-blue-300"
                      aria-label={
                        visiblePasswords[user.id]
                          ? "Hide assistant password"
                          : "Show assistant password"
                      }
                    >
                      {visiblePasswords[user.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <RolePill role={user.assistantRole} />
                </td>
                {canManage && (
                  <td className="px-2 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        aria-label="Edit assistant role"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(user)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                        aria-label="Remove assistant role"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No assistants match the current search."
                    detail="Try another name, email, role, or active-site filter."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        total={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
      />

      {editing && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Edit assistant role"
              onClose={() => setEditing(null)}
            />
            <form action={submitEdit} className="grid gap-5 px-5 py-5">
              <input type="hidden" name="userId" value={editing.id} />
              <input type="hidden" name="assistantRole" value={editRole} />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  {editing.name || "Unnamed user"}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {editing.email}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <RoleChoice
                  active={editRole === "ASSISTANT"}
                  title="Assistant"
                  icon={<ShieldCheck className="h-5 w-5" />}
                  onClick={() => setEditRole("ASSISTANT")}
                />
                <RoleChoice
                  active={editRole === "CHIEF_ASSISTANT"}
                  title="Chief Assistant"
                  icon={<Crown className="h-5 w-5" />}
                  onClick={() => setEditRole("CHIEF_ASSISTANT")}
                />
              </div>
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Login password
                </span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    name="password"
                    type="text"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <span className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Set a new value here to update the assistant login password
                  and the password shown in this table.
                </span>
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
                >
                  Save change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-[80] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <DialogHeader
              title="Remove assistant role"
              onClose={() => setDeleting(null)}
            />
            <form action={confirmDelete} className="space-y-4 px-5 py-5">
              <input type="hidden" name="userId" value={deleting.id} />
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Remove the assistant role from{" "}
                <span className="font-semibold text-slate-950 dark:text-white">
                  {deleting.name || deleting.email}
                </span>
                ? This does not delete the user account.
              </p>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
                >
                  Remove role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const chief = role === "CHIEF_ASSISTANT";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ${
        chief
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
          : "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900"
      }`}
    >
      {chief ? "Chief Assistant" : "Assistant"}
    </span>
  );
}

function RoleChoice({
  active,
  title,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        active
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
      }`}
    >
      {icon}
      <span className="text-sm font-bold">{title}</span>
    </button>
  );
}

function DialogHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <h3 className="text-base font-bold text-slate-950 dark:text-white">
        {title}
      </h3>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
